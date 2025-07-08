import { BaseTool } from './base-tool.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class ExtractOCRDataTool extends BaseTool {
    constructor(services) {
        const inputSchema = {
            type: 'object',
            properties: {
                filePath: {
                    type: 'string',
                    description: 'Ruta del archivo de imagen a procesar'
                },
                documentType: {
                    type: 'string',
                    enum: ['auto', 'invoice', 'bank_statement', 'receipt', 'general'],
                    default: 'auto',
                    description: 'Tipo de documento a procesar (auto-detecta si no se especifica)'
                },
                clientId: {
                    type: 'string',
                    description: 'ID del cliente para tracking y auditoría'
                },
                extractionOptions: {
                    type: 'object',
                    properties: {
                        enhanceImage: {
                            type: 'boolean',
                            default: true,
                            description: 'Aplicar mejoras de imagen antes del OCR'
                        },
                        language: {
                            type: 'string',
                            enum: ['spa', 'eng', 'spa+eng'],
                            default: 'spa',
                            description: 'Idioma para el reconocimiento OCR'
                        },
                        confidenceThreshold: {
                            type: 'number',
                            minimum: 0,
                            maximum: 100,
                            default: 70,
                            description: 'Umbral mínimo de confianza para aceptar el resultado'
                        },
                        useAI: {
                            type: 'boolean',
                            default: true,
                            description: 'Usar IA para estructurar los datos extraídos'
                        }
                    }
                }
            },
            required: ['filePath']
        };

        super(
            'extract_ocr_data',
            'Extrae datos estructurados de documentos usando OCR y AI (facturas, extractos bancarios, recibos)',
            inputSchema,
            services
        );

        this.ocrService = services.ocr;
        this.database = services.database;
    }

    async customValidation(args) {
        const { filePath, clientId } = args;

        await this.validateFile(filePath);

        if (clientId) {
            await this.rateLimitCheck(clientId, 100, 3600000);
        }

        return true;
    }

    async executeLogic(args) {
        const {
            filePath,
            documentType = 'auto',
            clientId,
            extractionOptions = {}
        } = args;

        if (!this.ocrService) {
            throw {
                code: 'OCR_SERVICE_NOT_AVAILABLE',
                message: 'Servicio OCR no está disponible. Verificar configuración.',
                details: { service: 'ocr' }
            };
        }

        const processId = crypto.randomUUID();
        const processingRecord = await this.createProcessingRecord(processId, args);

        this.logger.info(`Iniciando extracción OCR - ProcessID: ${processId}`);

        try {
            const extractionResult = await this.ocrService.processDocument(
                filePath,
                documentType
            );

            await this.validateExtractionQuality(extractionResult, extractionOptions);

            if (extractionResult.structured && extractionResult.structured.items) {
                extractionResult.structured = await this.categorizeItems(extractionResult.structured);
            }

            const savedResult = await this.saveExtractionResult(
                processId,
                extractionResult,
                clientId
            );

            await this.updateProcessingRecord(processId, 'completed', savedResult);

            const result = {
                processId,
                documentType: extractionResult.detectedType || documentType,
                confidence: extractionResult.confidence,
                data: {
                    rawText: extractionResult.text,
                    structured: extractionResult.structured,
                    metadata: {
                        source: extractionResult.source,
                        extractedAt: extractionResult.extractedAt,
                        wordsCount: extractionResult.words?.length || 0,
                        linesCount: extractionResult.lines?.length || 0
                    }
                },
                suggestions: await this.generateSuggestions(extractionResult),
                auditTrail: {
                    processId,
                    timestamp: new Date().toISOString(),
                    clientId,
                    filePath: path.basename(filePath)
                }
            };

            return this.sanitizeOutput(result);

        } catch (processingError) {
            await this.updateProcessingRecord(processId, 'failed', null, processingError.message);
            throw processingError;
        }
    }

    async validateFile(filePath) {
        try {
            const stats = await fs.stat(filePath);

            if (!stats.isFile()) {
                throw {
                    code: 'INVALID_FILE_PATH',
                    message: `La ruta especificada no es un archivo: ${filePath}`,
                    details: { filePath }
                };
            }

            const ext = path.extname(filePath).toLowerCase();
            const supportedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.pdf'];

            if (!supportedExtensions.includes(ext)) {
                throw {
                    code: 'UNSUPPORTED_FILE_FORMAT',
                    message: `Formato de archivo no soportado: ${ext}`,
                    details: {
                        provided: ext,
                        supported: supportedExtensions
                    }
                };
            }

            const maxSize = 10 * 1024 * 1024;
            if (stats.size > maxSize) {
                throw {
                    code: 'FILE_TOO_LARGE',
                    message: `Archivo demasiado grande: ${(stats.size / 1024 / 1024).toFixed(2)}MB. Máximo: 10MB`,
                    details: {
                        fileSize: stats.size,
                        maxSize,
                        fileSizeMB: (stats.size / 1024 / 1024).toFixed(2)
                    }
                };
            }

            return true;
        } catch (error) {
            if (error.code === 'ENOENT') {
                throw {
                    code: 'FILE_NOT_FOUND',
                    message: `Archivo no encontrado: ${filePath}`,
                    details: { filePath }
                };
            }
            throw error;
        }
    }

    async validateExtractionQuality(extractionResult, options) {
        const minConfidence = options.confidenceThreshold || 70;

        if (extractionResult.confidence < minConfidence) {
            this.logger.warn(`Baja confianza en OCR: ${extractionResult.confidence}% (mínimo: ${minConfidence}%)`);

            extractionResult.qualityWarnings = [
                `Confianza del OCR inferior al umbral (${extractionResult.confidence}% < ${minConfidence}%)`
            ];
        }

        if (!extractionResult.text || extractionResult.text.trim().length < 10) {
            throw {
                code: 'INSUFFICIENT_TEXT_EXTRACTED',
                message: 'No se pudo extraer texto suficiente del documento',
                details: {
                    textLength: extractionResult.text?.length || 0,
                    confidence: extractionResult.confidence
                }
            };
        }

        return true;
    }

    async categorizeItems(structuredData) {
        if (!structuredData.items || !Array.isArray(structuredData.items)) {
            return structuredData;
        }

        const categoryRules = {
            'Servicios Públicos': ['luz', 'gas', 'agua', 'electricidad', 'telefono', 'internet'],
            'Combustibles': ['nafta', 'gasoil', 'combustible', 'ypf', 'shell', 'axion'],
            'Alimentos': ['supermercado', 'almacen', 'panaderia', 'carniceria'],
            'Oficina': ['papeleria', 'computacion', 'oficina', 'impresora'],
            'Transporte': ['taxi', 'uber', 'peaje', 'estacionamiento', 'autopista'],
            'Mantenimiento': ['reparacion', 'mantenimiento', 'limpieza', 'pintura'],
            'Profesionales': ['honorarios', 'consultoria', 'abogado', 'contador'],
            'Otros Gastos': []
        };

        for (const item of structuredData.items) {
            let category = 'Otros Gastos';
            const description = item.descripcion?.toLowerCase() || '';

            for (const [cat, keywords] of Object.entries(categoryRules)) {
                if (keywords.some(keyword => description.includes(keyword))) {
                    category = cat;
                    break;
                }
            }

            item.categoria = category;
        }

        return structuredData;
    }

    async createProcessingRecord(processId, args) {
        const record = {
            process_id: processId,
            file_path: args.filePath,
            document_type: args.documentType,
            client_id: args.clientId,
            status: 'processing',
            created_at: new Date(),
            extraction_options: JSON.stringify(args.extractionOptions || {})
        };

        // TODO: Implementar según tu DatabaseManager
        return record;
    }

    async updateProcessingRecord(processId, status, result = null, errorMessage = null) {
        const updateData = {
            status,
            updated_at: new Date(),
            result: result ? JSON.stringify(result) : null,
            error_message: errorMessage
        };

        // TODO: Implementar según tu DatabaseManager
    }

    async saveExtractionResult(processId, extractionResult, clientId) {
        const result = {
            id: crypto.randomUUID(),
            process_id: processId,
            client_id: clientId,
            document_type: extractionResult.detectedType || extractionResult.type,
            raw_text: extractionResult.text,
            structured_data: JSON.stringify(extractionResult.structured),
            confidence: extractionResult.confidence,
            metadata: JSON.stringify({
                source: extractionResult.source,
                extractedAt: extractionResult.extractedAt,
                wordsCount: extractionResult.words?.length || 0,
                linesCount: extractionResult.lines?.length || 0
            }),
            created_at: new Date()
        };

        // TODO: Implementar según tu DatabaseManager
        return result;
    }

    async generateSuggestions(extractionResult) {
        const suggestions = [];

        if (extractionResult.detectedType === 'invoice') {
            if (extractionResult.structured?.total > 50000) {
                suggestions.push({
                    type: 'tax_advice',
                    message: 'Factura de monto elevado. Verificar retenciones aplicables.',
                    priority: 'medium'
                });
            }

            if (!extractionResult.structured?.cae) {
                suggestions.push({
                    type: 'compliance_warning',
                    message: 'No se detectó CAE en la factura. Verificar validez.',
                    priority: 'high'
                });
            }
        }

        if (extractionResult.detectedType === 'bank_statement') {
            if (extractionResult.structured?.transacciones?.length > 50) {
                suggestions.push({
                    type: 'automation_tip',
                    message: 'Muchas transacciones detectadas. Considerar automatización de conciliación.',
                    priority: 'low'
                });
            }
        }

        if (extractionResult.confidence < 80) {
            suggestions.push({
                type: 'quality_improvement',
                message: 'Baja confianza en extracción. Revisar calidad de imagen o usar versión escaneada.',
                priority: 'medium'
            });
        }

        return suggestions;
    }
}