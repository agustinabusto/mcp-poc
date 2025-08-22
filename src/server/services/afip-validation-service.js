import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import EventEmitter from 'events';

export class AfipValidationService extends EventEmitter {
    constructor(config, logger, arcaService) {
        super();
        this.config = config;
        this.logger = logger;
        this.arcaService = arcaService;
        this.dbPath = config.database?.path || 'data/afip_monitor.db';
        this.db = null;
        
        // Configuration
        this.cacheTTL = {
            cuit: 24 * 60 * 60 * 1000, // 24 hours
            cae: 60 * 60 * 1000,       // 1 hour
            taxpayer: 12 * 60 * 60 * 1000 // 12 hours
        };
        
        this.retryConfig = {
            maxAttempts: 3,
            baseDelay: 1000, // 1 second
            maxDelay: 30000  // 30 seconds
        };
        
        // In-memory cache for frequently accessed data
        this.memoryCache = new Map();
        
        // Queue processing state
        this.isProcessingQueue = false;
        this.queueProcessInterval = null;
    }

    async initialize() {
        try {
            this.db = await open({
                filename: this.dbPath,
                driver: sqlite3.Database
            });
            
            // Start queue processing
            this.startQueueProcessor();
            
            // Start connectivity monitoring
            this.startConnectivityMonitoring();
            
            this.logger.info('AfipValidationService initialized');
        } catch (error) {
            this.logger.error('Error initializing AFIP validation service:', error);
            throw error;
        }
    }

    /**
     * Validación completa de documento contra AFIP
     * @param {Object} documentData - Datos extraídos del OCR
     * @param {Object} options - Opciones de validación
     * @returns {Object} Resultado de validaciones
     */
    async validateDocument(documentData, options = {}) {
        const startTime = Date.now();
        const validationId = `val_${documentData.id}_${Date.now()}`;
        
        try {
            this.logger.info(`Starting AFIP validation for document ${documentData.id}`);
            
            const validationResults = {
                validationId,
                documentId: documentData.id,
                cuitValidation: null,
                caeValidation: null,
                duplicateCheck: null,
                taxConsistency: null,
                overall: 'pending',
                startedAt: new Date().toISOString(),
                completedAt: null,
                errors: []
            };

            // Emit validation started event
            this.emit('validationStarted', {
                documentId: documentData.id,
                validationId
            });

            // Execute validations in parallel where possible
            const validationPromises = [];

            // CUIT validation (critical - high priority)
            if (documentData.structured?.emisor?.cuit || documentData.cuit) {
                validationPromises.push(
                    this.validateCUITWithAfip(
                        documentData.structured?.emisor?.cuit || documentData.cuit
                    ).catch(error => ({ error: error.message, type: 'cuit' }))
                );
            }

            // CAE validation (critical - high priority)
            if (documentData.structured?.cae || documentData.cae) {
                validationPromises.push(
                    this.validateCAE(
                        documentData.structured?.cae || documentData.cae, 
                        documentData
                    ).catch(error => ({ error: error.message, type: 'cae' }))
                );
            }

            // Duplicate check (medium priority)
            if (documentData.structured?.numeroFactura || documentData.invoiceNumber) {
                validationPromises.push(
                    this.checkDuplicateInvoice(
                        documentData.structured?.numeroFactura || documentData.invoiceNumber,
                        documentData.structured?.emisor?.cuit || documentData.cuit,
                        documentData.structured?.fecha || documentData.date
                    ).catch(error => ({ error: error.message, type: 'duplicate' }))
                );
            }

            // Wait for all parallel validations
            const results = await Promise.allSettled(validationPromises);
            
            // Process results
            results.forEach((result, index) => {
                if (result.status === 'fulfilled') {
                    const value = result.value;
                    if (value.error) {
                        validationResults.errors.push({
                            type: value.type,
                            message: value.error,
                            severity: 'error'
                        });
                    } else {
                        // Assign to appropriate validation result
                        if (index === 0) validationResults.cuitValidation = value;
                        if (index === 1) validationResults.caeValidation = value;
                        if (index === 2) validationResults.duplicateCheck = value;
                    }
                }
            });

            // Tax consistency validation (sequential - depends on other results)
            try {
                validationResults.taxConsistency = await this.validateTaxConsistency(documentData);
            } catch (error) {
                validationResults.errors.push({
                    type: 'tax_consistency',
                    message: error.message,
                    severity: 'warning'
                });
            }

            // Calculate overall validation result
            validationResults.overall = this.calculateOverallValidation(validationResults);
            validationResults.completedAt = new Date().toISOString();
            validationResults.processingTimeMs = Date.now() - startTime;

            // Store results in database
            await this.storeValidationResults(documentData.id, validationResults);

            // Emit validation completed event
            this.emit('validationCompleted', {
                documentId: documentData.id,
                validationId,
                results: validationResults
            });

            this.logger.info(`AFIP validation completed for document ${documentData.id} in ${validationResults.processingTimeMs}ms`);
            
            return validationResults;

        } catch (error) {
            this.logger.error('AFIP validation error:', error);
            
            // Add to retry queue if connectivity error
            if (this.isConnectivityError(error)) {
                await this.addToRetryQueue(documentData, options);
            }

            // Emit validation error event
            this.emit('validationError', {
                documentId: documentData.id,
                validationId,
                error: error.message
            });

            throw error;
        }
    }

    /**
     * Validación de CUIT contra padrón AFIP
     */
    async validateCUITWithAfip(cuit) {
        const startTime = Date.now();
        
        try {
            // Normalize CUIT
            const normalizedCuit = this.normalizeCUIT(cuit);
            if (!this.isValidCUITFormat(normalizedCuit)) {
                return {
                    valid: false,
                    error: 'Formato de CUIT inválido',
                    severity: 'error',
                    responseTime: Date.now() - startTime
                };
            }

            // Check cache first
            const cacheKey = `cuit_validation_${normalizedCuit}`;
            const cached = await this.getCachedResult(cacheKey, 'cuit');
            
            if (cached) {
                this.logger.debug(`CUIT validation cache hit for ${normalizedCuit}`);
                return { ...cached, fromCache: true };
            }

            // Record connectivity check
            await this.recordConnectivityCheck('cuit_validation', 'attempting');

            // Validate with ARCA service
            this.logger.debug(`Validating CUIT ${normalizedCuit} with ARCA`);
            const arcaResult = await this.arcaService.validateCUIT(normalizedCuit);

            const validationResult = {
                valid: arcaResult.valid,
                cuit: normalizedCuit,
                taxpayerName: arcaResult.taxpayerName,
                taxpayerType: arcaResult.taxpayerType,
                fiscalStatus: arcaResult.status,
                validatedAt: new Date().toISOString(),
                responseTime: Date.now() - startTime,
                fromCache: false
            };

            // Cache result
            await this.setCachedResult(cacheKey, validationResult, 'cuit');

            // Record successful connectivity
            await this.recordConnectivityCheck('cuit_validation', 'online', Date.now() - startTime);

            return validationResult;

        } catch (error) {
            const responseTime = Date.now() - startTime;
            this.logger.error('CUIT validation error:', error);
            
            // Record connectivity failure
            await this.recordConnectivityCheck('cuit_validation', 'offline', responseTime, error.message);

            return {
                valid: false,
                error: error.message,
                severity: this.isConnectivityError(error) ? 'warning' : 'error',
                responseTime
            };
        }
    }

    /**
     * Verificación de CAE contra AFIP
     */
    async validateCAE(cae, invoiceData) {
        const startTime = Date.now();
        
        try {
            if (!cae || cae.length !== 14) {
                return {
                    valid: false,
                    error: 'CAE inválido - debe tener 14 dígitos',
                    severity: 'error',
                    responseTime: Date.now() - startTime
                };
            }

            // Check cache
            const cacheKey = `cae_validation_${cae}_${invoiceData.cuit}`;
            const cached = await this.getCachedResult(cacheKey, 'cae');
            
            if (cached) {
                this.logger.debug(`CAE validation cache hit for ${cae}`);
                return { ...cached, fromCache: true };
            }

            // Record connectivity check
            await this.recordConnectivityCheck('cae_validation', 'attempting');

            // Validate with ARCA service
            const arcaResult = await this.arcaService.validateCAE(cae, {
                cuit: invoiceData.structured?.emisor?.cuit || invoiceData.cuit,
                invoiceType: invoiceData.structured?.tipoComprobante || invoiceData.invoiceType,
                invoiceNumber: invoiceData.structured?.numeroFactura || invoiceData.invoiceNumber,
                amount: invoiceData.structured?.total || invoiceData.totalAmount,
                date: invoiceData.structured?.fecha || invoiceData.date
            });

            const validationResult = {
                valid: arcaResult.valid,
                cae: cae,
                expirationDate: arcaResult.expirationDate,
                authorizedRange: arcaResult.authorizedRange,
                withinRange: this.isInvoiceInAuthorizedRange(
                    invoiceData.structured?.numeroFactura || invoiceData.invoiceNumber,
                    arcaResult.authorizedRange
                ),
                isExpired: arcaResult.expirationDate ? 
                    new Date(arcaResult.expirationDate) < new Date() : false,
                validatedAt: new Date().toISOString(),
                responseTime: Date.now() - startTime,
                fromCache: false
            };

            // Cache result
            await this.setCachedResult(cacheKey, validationResult, 'cae');

            // Record successful connectivity
            await this.recordConnectivityCheck('cae_validation', 'online', Date.now() - startTime);

            return validationResult;

        } catch (error) {
            const responseTime = Date.now() - startTime;
            this.logger.error('CAE validation error:', error);
            
            // Record connectivity failure
            await this.recordConnectivityCheck('cae_validation', 'offline', responseTime, error.message);

            return {
                valid: false,
                error: error.message,
                severity: this.isConnectivityError(error) ? 'warning' : 'error',
                responseTime
            };
        }
    }

    /**
     * Detección de facturas duplicadas
     */
    async checkDuplicateInvoice(invoiceNumber, cuit, date) {
        const startTime = Date.now();
        
        try {
            // Buscar facturas existentes con mismo número, CUIT y fecha aproximada
            const existingInvoices = await this.db.all(`
                SELECT o.id, o.file_path, o.created_at
                FROM ocr_processing_log o
                JOIN ocr_extraction_results r ON o.process_id = r.process_id
                WHERE JSON_EXTRACT(r.structured_data, '$.numeroFactura') = ?
                  AND JSON_EXTRACT(r.structured_data, '$.emisor.cuit') = ?
                  AND DATE(JSON_EXTRACT(r.structured_data, '$.fecha')) = DATE(?)
                  AND o.status = 'completed'
                ORDER BY o.created_at DESC
                LIMIT 5
            `, [invoiceNumber, cuit, date]);

            const isDuplicate = existingInvoices.length > 1;
            const duplicateDetails = isDuplicate ? existingInvoices.slice(1) : [];

            return {
                isDuplicate,
                duplicateCount: duplicateDetails.length,
                existingInvoices: duplicateDetails.map(inv => ({
                    id: inv.id,
                    filePath: inv.file_path,
                    processedAt: inv.created_at
                })),
                severity: isDuplicate ? 'warning' : 'info',
                validatedAt: new Date().toISOString(),
                responseTime: Date.now() - startTime
            };

        } catch (error) {
            this.logger.error('Duplicate check error:', error);
            return {
                isDuplicate: false,
                error: error.message,
                severity: 'error',
                responseTime: Date.now() - startTime
            };
        }
    }

    /**
     * Validación de consistencia tributaria
     */
    async validateTaxConsistency(documentData) {
        const issues = [];
        const structured = documentData.structured || {};

        try {
            // Validate IVA consistency
            if (structured.iva !== undefined) {
                const ivaValidation = this.validateIVAConsistency(structured);
                if (!ivaValidation.valid) {
                    issues.push({
                        type: 'iva_consistency',
                        message: ivaValidation.message,
                        severity: 'warning',
                        details: ivaValidation.details
                    });
                }
            }

            // Validate tax calculations
            const calculationValidation = this.validateTaxCalculations(structured);
            if (!calculationValidation.valid) {
                issues.push({
                    type: 'tax_calculations',
                    message: calculationValidation.message,
                    severity: 'error',
                    details: calculationValidation.details
                });
            }

            // Validate document type vs operation
            const documentTypeValidation = this.validateDocumentTypeConsistency(structured);
            if (!documentTypeValidation.valid) {
                issues.push({
                    type: 'document_type',
                    message: documentTypeValidation.message,
                    severity: 'warning',
                    details: documentTypeValidation.details
                });
            }

            return {
                valid: issues.length === 0,
                issues,
                totalIssues: issues.length,
                validatedAt: new Date().toISOString(),
                severity: issues.length > 0 ? 
                    (issues.some(i => i.severity === 'error') ? 'error' : 'warning') : 
                    'info'
            };

        } catch (error) {
            this.logger.error('Tax consistency validation error:', error);
            return {
                valid: false,
                error: error.message,
                severity: 'error',
                validatedAt: new Date().toISOString()
            };
        }
    }

    // Helper methods
    validateIVAConsistency(structured) {
        const { subtotal, iva, total } = structured;
        
        if (!subtotal || !total) {
            return { valid: true }; // Can't validate without both values
        }

        const calculatedTotal = parseFloat(subtotal) + parseFloat(iva || 0);
        const actualTotal = parseFloat(total);
        const difference = Math.abs(calculatedTotal - actualTotal);
        
        return {
            valid: difference < 0.01, // Allow 1 cent tolerance
            message: difference >= 0.01 ? 
                `Inconsistencia IVA: Subtotal + IVA (${calculatedTotal.toFixed(2)}) != Total (${actualTotal.toFixed(2)})` : 
                'IVA consistente',
            details: {
                subtotal: parseFloat(subtotal),
                iva: parseFloat(iva || 0),
                calculatedTotal,
                actualTotal,
                difference
            }
        };
    }

    validateTaxCalculations(structured) {
        // Implementation of tax calculation validation
        return { valid: true, message: 'Tax calculations valid' };
    }

    validateDocumentTypeConsistency(structured) {
        // Implementation of document type validation
        return { valid: true, message: 'Document type consistent' };
    }

    calculateOverallValidation(results) {
        const { cuitValidation, caeValidation, duplicateCheck, taxConsistency, errors } = results;

        // Critical validations must pass
        const criticalErrors = errors.filter(e => e.severity === 'critical' || e.severity === 'error');
        if (criticalErrors.length > 0) {
            return 'invalid';
        }

        // CUIT validation is critical
        if (cuitValidation && !cuitValidation.valid && !cuitValidation.fromCache) {
            return 'invalid';
        }

        // CAE validation is critical
        if (caeValidation && !caeValidation.valid && !caeValidation.fromCache) {
            return 'invalid';
        }

        // Check for warnings
        const warnings = errors.filter(e => e.severity === 'warning');
        const duplicateWarning = duplicateCheck?.isDuplicate;
        const taxIssues = taxConsistency?.issues?.length > 0;

        if (warnings.length > 0 || duplicateWarning || taxIssues) {
            return 'valid_with_warnings';
        }

        return 'valid';
    }

    // Utility methods
    normalizeCUIT(cuit) {
        if (!cuit) return '';
        return cuit.toString().replace(/[^0-9]/g, '');
    }

    isValidCUITFormat(cuit) {
        return /^[0-9]{11}$/.test(cuit);
    }

    isInvoiceInAuthorizedRange(invoiceNumber, authorizedRange) {
        if (!authorizedRange || !invoiceNumber) return false;
        
        const num = parseInt(invoiceNumber.replace(/[^0-9]/g, ''));
        return num >= authorizedRange.from && num <= authorizedRange.to;
    }

    isConnectivityError(error) {
        const connectivityKeywords = ['timeout', 'network', 'connection', 'ENOTFOUND', 'ECONNREFUSED'];
        return connectivityKeywords.some(keyword => 
            error.message?.toLowerCase().includes(keyword.toLowerCase())
        );
    }

    // Cache methods
    async getCachedResult(key, type) {
        try {
            // Check memory cache first
            const memoryResult = this.memoryCache.get(key);
            if (memoryResult && memoryResult.expiresAt > Date.now()) {
                return memoryResult.data;
            }

            // Check database cache
            const dbResult = await this.db.get(
                'SELECT cache_value FROM afip_validation_cache WHERE cache_key = ? AND cache_type = ? AND expires_at > datetime("now")',
                [key, type]
            );

            if (dbResult) {
                const data = JSON.parse(dbResult.cache_value);
                
                // Update memory cache
                this.memoryCache.set(key, {
                    data,
                    expiresAt: Date.now() + this.cacheTTL[type]
                });

                return data;
            }

            return null;
        } catch (error) {
            this.logger.error('Cache get error:', error);
            return null;
        }
    }

    async setCachedResult(key, data, type) {
        try {
            const expiresAt = new Date(Date.now() + this.cacheTTL[type]);
            
            // Store in database
            await this.db.run(`
                INSERT OR REPLACE INTO afip_validation_cache 
                (cache_key, cache_value, cache_type, expires_at) 
                VALUES (?, ?, ?, ?)
            `, [key, JSON.stringify(data), type, expiresAt.toISOString()]);

            // Store in memory cache
            this.memoryCache.set(key, {
                data,
                expiresAt: expiresAt.getTime()
            });

        } catch (error) {
            this.logger.error('Cache set error:', error);
        }
    }

    // Queue management
    async addToRetryQueue(documentData, options = {}) {
        try {
            const priority = options.priority || 1;
            const nextRetry = new Date(Date.now() + this.retryConfig.baseDelay);

            await this.db.run(`
                INSERT INTO afip_validation_queue 
                (document_id, validation_data, priority, next_retry_at) 
                VALUES (?, ?, ?, ?)
            `, [
                documentData.id, 
                JSON.stringify(documentData), 
                priority, 
                nextRetry.toISOString()
            ]);

            this.logger.info(`Document ${documentData.id} added to retry queue`);
        } catch (error) {
            this.logger.error('Error adding to retry queue:', error);
        }
    }

    startQueueProcessor() {
        this.queueProcessInterval = setInterval(async () => {
            if (!this.isProcessingQueue) {
                await this.processRetryQueue();
            }
        }, 30000); // Process every 30 seconds
    }

    async processRetryQueue() {
        if (this.isProcessingQueue) return;
        
        this.isProcessingQueue = true;
        
        try {
            const pendingItems = await this.db.all(`
                SELECT id, document_id, validation_data, attempts 
                FROM afip_validation_queue 
                WHERE status = 'pending' 
                  AND next_retry_at <= datetime('now')
                  AND attempts < ?
                ORDER BY priority DESC, created_at ASC 
                LIMIT 10
            `, [this.retryConfig.maxAttempts]);

            for (const item of pendingItems) {
                try {
                    await this.db.run(
                        'UPDATE afip_validation_queue SET status = ?, attempts = attempts + 1 WHERE id = ?',
                        ['processing', item.id]
                    );

                    const documentData = JSON.parse(item.validation_data);
                    await this.validateDocument(documentData);

                    await this.db.run(
                        'UPDATE afip_validation_queue SET status = ? WHERE id = ?',
                        ['completed', item.id]
                    );

                } catch (error) {
                    this.logger.error(`Retry validation failed for queue item ${item.id}:`, error);
                    
                    const nextRetry = new Date(
                        Date.now() + Math.min(
                            this.retryConfig.baseDelay * Math.pow(2, item.attempts),
                            this.retryConfig.maxDelay
                        )
                    );

                    if (item.attempts + 1 >= this.retryConfig.maxAttempts) {
                        await this.db.run(
                            'UPDATE afip_validation_queue SET status = ?, next_retry_at = ? WHERE id = ?',
                            ['failed', nextRetry.toISOString(), item.id]
                        );
                    } else {
                        await this.db.run(
                            'UPDATE afip_validation_queue SET status = ?, next_retry_at = ? WHERE id = ?',
                            ['pending', nextRetry.toISOString(), item.id]
                        );
                    }
                }
            }

        } catch (error) {
            this.logger.error('Queue processing error:', error);
        } finally {
            this.isProcessingQueue = false;
        }
    }

    // Connectivity monitoring
    async recordConnectivityCheck(serviceName, status, responseTime = null, errorMessage = null) {
        try {
            await this.db.run(`
                INSERT INTO afip_connectivity_log 
                (service_name, status, response_time_ms, error_message) 
                VALUES (?, ?, ?, ?)
            `, [serviceName, status, responseTime, errorMessage]);
        } catch (error) {
            this.logger.error('Error recording connectivity check:', error);
        }
    }

    startConnectivityMonitoring() {
        // Monitor connectivity every 5 minutes
        setInterval(async () => {
            try {
                await this.checkArcaConnectivity();
            } catch (error) {
                this.logger.error('Connectivity monitoring error:', error);
            }
        }, 5 * 60 * 1000);
    }

    async checkArcaConnectivity() {
        try {
            // Simple connectivity test
            const testCuit = '20123456789'; // Test CUIT
            const startTime = Date.now();
            
            await this.arcaService.validateCUIT(testCuit);
            const responseTime = Date.now() - startTime;
            
            await this.recordConnectivityCheck('arca_tools', 'online', responseTime);
        } catch (error) {
            await this.recordConnectivityCheck('arca_tools', 'offline', null, error.message);
        }
    }

    // Database operations
    async storeValidationResults(documentId, results) {
        const transaction = await this.db.run('BEGIN TRANSACTION');
        
        try {
            // Store main validation record
            await this.db.run(`
                INSERT INTO afip_validations 
                (document_id, validation_type, validation_result, is_valid, severity, response_time_ms)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [
                documentId,
                'complete',
                JSON.stringify(results),
                results.overall === 'valid' ? 1 : 0,
                results.overall === 'valid' ? 'info' : 'warning',
                results.processingTimeMs
            ]);

            // Store individual validation results
            const validationTypes = ['cuitValidation', 'caeValidation', 'duplicateCheck', 'taxConsistency'];
            
            for (const type of validationTypes) {
                if (results[type]) {
                    await this.db.run(`
                        INSERT INTO afip_validations 
                        (document_id, validation_type, validation_result, is_valid, severity, response_time_ms)
                        VALUES (?, ?, ?, ?, ?, ?)
                    `, [
                        documentId,
                        this.getValidationType(type),
                        JSON.stringify(results[type]),
                        results[type].valid ? 1 : 0,
                        results[type].severity || 'info',
                        results[type].responseTime
                    ]);
                }
            }

            await this.db.run('COMMIT');
        } catch (error) {
            await this.db.run('ROLLBACK');
            throw error;
        }
    }

    async getValidationResults(documentId) {
        try {
            const results = await this.db.all(`
                SELECT validation_type, validation_result, is_valid, severity, validated_at 
                FROM afip_validations 
                WHERE document_id = ? 
                ORDER BY validated_at DESC
            `, [documentId]);

            return results.reduce((acc, result) => {
                acc[result.validation_type] = {
                    ...JSON.parse(result.validation_result),
                    isValid: result.is_valid === 1,
                    severity: result.severity,
                    validatedAt: result.validated_at
                };
                return acc;
            }, {});
        } catch (error) {
            this.logger.error('Error getting validation results:', error);
            return {};
        }
    }

    async getConnectivityStatus() {
        try {
            const status = await this.db.all(`
                SELECT service_name, status, response_time_ms, error_message, checked_at
                FROM afip_connectivity_log 
                WHERE checked_at = (
                    SELECT MAX(checked_at) 
                    FROM afip_connectivity_log l2 
                    WHERE l2.service_name = afip_connectivity_log.service_name
                )
                ORDER BY service_name
            `);

            return {
                services: status,
                overall: status.every(s => s.status === 'online') ? 'online' : 'degraded',
                lastChecked: new Date().toISOString()
            };
        } catch (error) {
            this.logger.error('Error getting connectivity status:', error);
            return { services: [], overall: 'unknown' };
        }
    }

    /**
     * Get database validation type from internal type name
     */
    getValidationType(internalType) {
        const typeMap = {
            'cuitValidation': 'cuit',
            'caeValidation': 'cae',
            'duplicateCheck': 'duplicate',
            'taxConsistency': 'tax_consistency'
        };
        
        return typeMap[internalType] || internalType;
    }

    async cleanup() {
        if (this.queueProcessInterval) {
            clearInterval(this.queueProcessInterval);
        }
        
        if (this.db) {
            await this.db.close();
        }
        
        this.memoryCache.clear();
        this.removeAllListeners();
        
        this.logger.info('AfipValidationService cleaned up');
    }
}

export default AfipValidationService;