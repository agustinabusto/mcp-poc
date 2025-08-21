import { OCRService } from './ocr-service.js';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import sharp from 'sharp';

export class MLEnhancedOCRService extends OCRService {
    constructor(config, logger) {
        super(config, logger);
        this.dbPath = config.database?.path || 'data/afip_monitor.db';
        this.db = null;
        
        // ML Configuration
        this.minPatternsForTemplate = 3; // Minimum documents to create a template
        this.defaultConfidenceThreshold = 0.8;
        this.maxPatternAge = 90 * 24 * 60 * 60 * 1000; // 90 days in milliseconds
        
        // Pattern cache for performance
        this.patternCache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    }

    async initialize() {
        await super.initialize();
        
        try {
            this.db = await open({
                filename: this.dbPath,
                driver: sqlite3.Database
            });
            
            this.logger.info('MLEnhancedOCRService initialized with database connection');
        } catch (error) {
            this.logger.error('Error initializing ML database:', error);
            throw error;
        }
    }

    /**
     * Aprende de correcciones manuales para mejorar accuracy
     * @param {string} documentId - ID del documento corregido
     * @param {Object} correctedData - Datos corregidos por el usuario
     * @param {Object} originalData - Datos extraídos originalmente
     */
    async learnFromCorrection(documentId, correctedData, originalData) {
        try {
            this.logger.info(`Learning from correction for document: ${documentId}`);
            
            // Validar entrada
            if (!documentId || !correctedData || !originalData) {
                throw new Error('Invalid parameters for learning from correction');
            }

            // Extraer CUIT del emisor para crear patrones por proveedor
            const cuit = correctedData.structured?.emisor?.cuit || 
                        originalData.structured?.emisor?.cuit;
            
            if (!cuit) {
                this.logger.warn(`No CUIT found for document ${documentId}, skipping ML learning`);
                return null;
            }

            // Determinar tipo de documento
            const documentType = correctedData.type || originalData.type || 'invoice';
            
            // Registrar corrección en la base de datos
            const corrections = [];
            
            // Comparar datos originales vs corregidos
            for (const [field, correctedValue] of Object.entries(correctedData.structured || {})) {
                const originalValue = originalData.structured?.[field];
                
                if (originalValue !== correctedValue) {
                    corrections.push({
                        field_name: field,
                        original_value: JSON.stringify(originalValue),
                        corrected_value: JSON.stringify(correctedValue),
                        confidence_original: originalData.confidence || 0
                    });
                }
            }

            // Insertar correcciones
            let correctionIds = [];
            for (const correction of corrections) {
                const result = await this.db.run(`
                    INSERT INTO ml_corrections 
                    (document_id, field_name, original_value, corrected_value, confidence_original)
                    VALUES (?, ?, ?, ?, ?)
                `, [documentId, correction.field_name, correction.original_value, 
                    correction.corrected_value, correction.confidence_original]);
                
                correctionIds.push(result.lastID);
            }

            // Actualizar o crear patrón para este proveedor
            const pattern = await this.updateProviderPattern(cuit, documentType, correctedData);
            
            // Actualizar referencias de corrección al patrón
            if (pattern && pattern.id) {
                await Promise.all(correctionIds.map(id => 
                    this.db.run('UPDATE ml_corrections SET pattern_id = ? WHERE id = ?', 
                               [pattern.id, id])
                ));
            }

            // Limpiar cache para forzar recarga
            this.clearPatternCache(cuit, documentType);
            
            this.logger.info(`Learning completed: ${corrections.length} corrections processed for CUIT ${cuit}`);
            
            return {
                correctionCount: corrections.length,
                patternId: pattern?.id,
                cuit,
                documentType
            };

        } catch (error) {
            this.logger.error('Error learning from correction:', error);
            throw error;
        }
    }

    /**
     * Actualiza patrón de proveedor basado en correcciones
     */
    async updateProviderPattern(cuit, documentType, correctedData) {
        try {
            // Verificar si ya existe un patrón para este proveedor
            let pattern = await this.db.get(`
                SELECT * FROM ml_document_patterns 
                WHERE cuit = ? AND document_type = ?
            `, [cuit, documentType]);

            const patternData = {
                layout: this.extractLayoutPattern(correctedData),
                fieldMappings: this.extractFieldMappings(correctedData),
                extractionRegions: this.extractRegionData(correctedData),
                lastUpdated: new Date().toISOString()
            };

            if (pattern) {
                // Actualizar patrón existente
                const newUsageCount = pattern.usage_count + 1;
                const newSuccessRate = this.calculateSuccessRate(pattern, correctedData);

                await this.db.run(`
                    UPDATE ml_document_patterns 
                    SET pattern_data = ?, usage_count = ?, success_rate = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                `, [JSON.stringify(patternData), newUsageCount, newSuccessRate, pattern.id]);

                pattern = { ...pattern, id: pattern.id, pattern_data: patternData };
            } else {
                // Crear nuevo patrón
                const result = await this.db.run(`
                    INSERT INTO ml_document_patterns 
                    (cuit, document_type, pattern_data, usage_count, success_rate)
                    VALUES (?, ?, ?, 1, 1.0)
                `, [cuit, documentType, JSON.stringify(patternData)]);

                pattern = { id: result.lastID, cuit, document_type: documentType, pattern_data: patternData };
            }

            this.logger.debug(`Pattern updated for CUIT ${cuit}, type ${documentType}`);
            return pattern;

        } catch (error) {
            this.logger.error('Error updating provider pattern:', error);
            throw error;
        }
    }

    /**
     * Recupera template aprendido para un proveedor específico
     * @param {string} cuit - CUIT del proveedor
     * @returns {Object} Template optimizado o null
     */
    async getProviderTemplate(cuit) {
        try {
            // Verificar cache primero
            const cacheKey = `template_${cuit}`;
            const cached = this.patternCache.get(cacheKey);
            
            if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
                return cached.data;
            }

            // Buscar patrones para este CUIT
            const patterns = await this.db.all(`
                SELECT * FROM ml_document_patterns 
                WHERE cuit = ? AND usage_count >= ?
                ORDER BY success_rate DESC, usage_count DESC
            `, [cuit, this.minPatternsForTemplate]);

            if (patterns.length === 0) {
                this.logger.debug(`No patterns found for CUIT ${cuit}`);
                return null;
            }

            // Seleccionar el mejor patrón
            const bestPattern = patterns[0];
            const template = {
                cuit,
                patternId: bestPattern.id,
                documentType: bestPattern.document_type,
                confidence: bestPattern.success_rate,
                usageCount: bestPattern.usage_count,
                pattern: JSON.parse(bestPattern.pattern_data),
                lastUpdated: bestPattern.updated_at
            };

            // Cache el resultado
            this.patternCache.set(cacheKey, {
                data: template,
                timestamp: Date.now()
            });

            this.logger.debug(`Template found for CUIT ${cuit}: success rate ${bestPattern.success_rate}`);
            return template;

        } catch (error) {
            this.logger.error('Error retrieving provider template:', error);
            return null;
        }
    }

    /**
     * Calcula confidence score dinámico
     * @param {Object} extractedData - Datos extraídos del OCR
     * @param {Object} providerHistory - Historial del proveedor
     * @returns {number} Confidence score (0-1)
     */
    async calculateDynamicConfidence(extractedData, providerHistory) {
        try {
            const baseConfidence = extractedData.confidence || 0;
            let adjustedConfidence = baseConfidence;

            // Factor histórico de éxito del proveedor
            if (providerHistory && providerHistory.success_rate) {
                const historyWeight = 0.3;
                const historyFactor = providerHistory.success_rate / 100;
                adjustedConfidence = (baseConfidence * (1 - historyWeight)) + 
                                   (historyFactor * historyWeight);
            }

            // Ajuste por campo extraído - campos críticos tienen mayor peso
            const criticalFields = ['total', 'cuit', 'fecha', 'numeroFactura'];
            let fieldAdjustment = 0;
            let criticalFieldsFound = 0;

            for (const field of criticalFields) {
                if (extractedData.structured && extractedData.structured[field]) {
                    criticalFieldsFound++;
                    // Bonus por tener campos críticos bien extraídos
                    fieldAdjustment += 0.05;
                }
            }

            adjustedConfidence = Math.min(1.0, adjustedConfidence + fieldAdjustment);

            // Penalización si faltan campos críticos
            const completenessRatio = criticalFieldsFound / criticalFields.length;
            if (completenessRatio < 0.5) {
                adjustedConfidence *= 0.8; // 20% penalty
            }

            return Math.max(0, Math.min(1, adjustedConfidence));

        } catch (error) {
            this.logger.error('Error calculating dynamic confidence:', error);
            return extractedData.confidence || 0;
        }
    }

    /**
     * Optimiza pre-procesamiento basado en tipo detectado
     * @param {Buffer} documentBuffer - Buffer del documento
     * @param {string} detectedType - Tipo de documento detectado
     * @returns {Buffer} Buffer optimizado para OCR
     */
    async intelligentPreProcessing(documentBuffer, detectedType) {
        try {
            // Optimizaciones específicas por tipo de documento
            let sharpInstance = sharp(documentBuffer);

            switch (detectedType) {
                case 'invoice':
                    // Facturas: aumentar contraste, mejorar texto pequeño
                    sharpInstance = sharpInstance
                        .resize(null, 1600, { withoutEnlargement: true, fit: 'inside' })
                        .normalize()
                        .sharpen({ sigma: 1.2 })
                        .modulate({ brightness: 1.1, contrast: 1.3 });
                    break;

                case 'bank_statement':
                    // Extractos bancarios: optimizar para tablas y números
                    sharpInstance = sharpInstance
                        .resize(null, 1400, { withoutEnlargement: true, fit: 'inside' })
                        .normalize()
                        .sharpen({ sigma: 0.8 })
                        .modulate({ brightness: 1.05, contrast: 1.2 });
                    break;

                case 'receipt':
                    // Recibos: menudo de baja calidad, más agresivo
                    sharpInstance = sharpInstance
                        .resize(null, 1800, { withoutEnlargement: true, fit: 'inside' })
                        .normalize()
                        .sharpen({ sigma: 1.5 })
                        .modulate({ brightness: 1.2, contrast: 1.4 });
                    break;

                default:
                    // Procesamiento estándar
                    sharpInstance = sharpInstance
                        .resize(null, 1200, { withoutEnlargement: true, fit: 'inside' })
                        .normalize()
                        .sharpen();
            }

            return await sharpInstance.png({ quality: 95 }).toBuffer();

        } catch (error) {
            this.logger.error('Error in intelligent preprocessing:', error);
            return documentBuffer; // Fallback al buffer original
        }
    }

    // Métodos auxiliares para extracción de patrones
    extractLayoutPattern(data) {
        return {
            structure: this.analyzeDocumentStructure(data),
            fieldPositions: this.extractFieldPositions(data),
            textDensity: this.calculateTextDensity(data)
        };
    }

    extractFieldMappings(data) {
        const mappings = {};
        if (data.structured) {
            for (const [field, value] of Object.entries(data.structured)) {
                mappings[field] = {
                    expectedType: typeof value,
                    patterns: this.extractValuePatterns(value),
                    confidence: 1.0
                };
            }
        }
        return mappings;
    }

    extractRegionData(data) {
        // Analizar regiones de extracción basadas en datos correctos
        return {
            headerRegion: { x: 0, y: 0, width: 1, height: 0.2 },
            bodyRegion: { x: 0, y: 0.2, width: 1, height: 0.6 },
            totalRegion: { x: 0, y: 0.8, width: 1, height: 0.2 }
        };
    }

    calculateSuccessRate(pattern, correctedData) {
        // Calcular nueva tasa de éxito basada en correcciones
        const currentRate = pattern.success_rate;
        const usageCount = pattern.usage_count;
        
        // Factor de mejora basado en la corrección exitosa
        const improvement = 0.05; // 5% de mejora por corrección
        return Math.min(1.0, currentRate + improvement);
    }

    analyzeDocumentStructure(data) {
        return {
            hasHeader: true,
            hasFooter: true,
            hasTable: Boolean(data.structured?.items),
            layout: 'standard'
        };
    }

    extractFieldPositions(data) {
        // Posiciones aproximadas basadas en estructura típica
        return {
            emisor: { region: 'header' },
            fecha: { region: 'header' },
            total: { region: 'footer' },
            items: { region: 'body' }
        };
    }

    calculateTextDensity(data) {
        return {
            overall: 0.7,
            byRegion: {
                header: 0.8,
                body: 0.6,
                footer: 0.9
            }
        };
    }

    extractValuePatterns(value) {
        if (typeof value === 'string') {
            return {
                length: value.length,
                hasNumbers: /\d/.test(value),
                hasLetters: /[a-zA-Z]/.test(value),
                pattern: value.replace(/\d/g, '0').replace(/[a-zA-Z]/g, 'A')
            };
        }
        return { type: typeof value };
    }

    clearPatternCache(cuit, documentType) {
        const keys = [`template_${cuit}`, `confidence_${cuit}_${documentType}`];
        keys.forEach(key => this.patternCache.delete(key));
    }

    async cleanup() {
        await super.cleanup();
        if (this.db) {
            await this.db.close();
            this.logger.info('ML database connection closed');
        }
    }
}