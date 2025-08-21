// src/server/routes/ocr-routes.js
import express from 'express';
import multer from 'multer';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Configuración de multer para uploads
const upload = multer({
    dest: 'data/uploads/',
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Tipo de archivo no permitido'), false);
        }
    }
});

// Middleware para logging de OCR
const ocrLogger = (req, res, next) => {
    const startTime = Date.now();

    res.on('finish', () => {
        const duration = Date.now() - startTime;
        console.log(`🔍 OCR ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
    });

    next();
};

router.use(ocrLogger);

// ==============================================
// ENDPOINT: Test de conectividad OCR
// ==============================================
router.get('/test', (req, res) => {
    console.log(`🧪 [OCR Test] Request from ${req.ip} - ${req.headers['user-agent']}`);
    res.json({
        success: true,
        message: 'OCR service is working',
        timestamp: new Date().toISOString(),
        server: 'healthy'
    });
});

// ==============================================
// ENDPOINT: Upload y procesamiento de documentos
// ==============================================
router.post('/upload', upload.single('document'), async (req, res) => {
    console.log(`📤 [OCR Upload] Request received from ${req.ip} - ${req.headers['user-agent']}`);
    console.log(`📤 [OCR Upload] Content-Type: ${req.headers['content-type']}`);
    console.log(`📤 [OCR Upload] File received:`, req.file ? `${req.file.originalname} (${req.file.size} bytes)` : 'No file');
    
    try {
        if (!req.file) {
            console.log(`❌ [OCR Upload] No file in request`);
            return res.status(400).json({
                success: false,
                error: 'No file uploaded',
                code: 'NO_FILE'
            });
        }

        const processId = crypto.randomUUID();
        const clientId = req.body.clientId || 'default';
        const documentType = req.body.documentType || 'auto';

        // Validar tamaño de archivo
        if (req.file.size > 10 * 1024 * 1024) {
            return res.status(400).json({
                success: false,
                error: 'File too large. Maximum size: 10MB',
                code: 'FILE_TOO_LARGE'
            });
        }

        // Simular procesamiento OCR con datos realistas
        const mockResult = await simulateOCRProcessing(req.file, documentType, clientId, processId);

        // Guardar en base de datos si está disponible
        try {
            const db = req.app.locals.database;
            if (db && db.isInitialized) {
                const connection = await db.getConnection();
                
                // Insertar en log de procesamiento
                await connection.run(`
                    INSERT INTO ocr_processing_log 
                    (process_id, file_path, document_type, client_id, status, result) 
                    VALUES (?, ?, ?, ?, 'completed', ?)
                `, [processId, req.file.path, documentType, clientId, JSON.stringify(mockResult)]);

                // Insertar en resultados de extracción
                await connection.run(`
                    INSERT INTO ocr_extraction_results 
                    (id, process_id, client_id, document_type, raw_text, structured_data, confidence, metadata) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    processId + '-result',
                    processId,
                    clientId,
                    mockResult.documentType,
                    mockResult.text,
                    JSON.stringify(mockResult.structured),
                    mockResult.confidence,
                    JSON.stringify(mockResult.metadata)
                ]);
            }
        } catch (dbError) {
            console.warn('No se pudo guardar en BD:', dbError.message);
        }

        console.log(`📄 OCR Upload procesado: ${req.file.originalname} (${(req.file.size / 1024).toFixed(2)} KB)`);
        console.log(`🔍 Tipo detectado: ${mockResult.structured.type} | Confianza: ${mockResult.confidence}%`);

        res.json({
            success: true,
            data: mockResult,
            processId: processId,
            message: 'Documento procesado exitosamente'
        });

    } catch (error) {
        console.error('❌ Error processing OCR upload:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            code: 'PROCESSING_ERROR'
        });
    }
});

// ==============================================
// ENDPOINT: Extraer datos de factura
// ==============================================
router.post('/extract-invoice', async (req, res) => {
    try {
        const { filePath, clientId } = req.body;

        if (!filePath) {
            return res.status(400).json({
                success: false,
                error: 'filePath is required',
                code: 'MISSING_FILEPATH'
            });
        }

        // Simular extracción de factura con datos AFIP realistas
        const mockInvoiceData = await simulateInvoiceExtraction(filePath, clientId);

        console.log(`🧾 Factura extraída: ${path.basename(filePath)} | CUIT: ${mockInvoiceData.extractedData.cuit}`);
        res.json(mockInvoiceData);

    } catch (error) {
        console.error('❌ Error extracting invoice data:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            code: 'EXTRACTION_ERROR'
        });
    }
});

// ==============================================
// ENDPOINT: Extraer datos de extracto bancario
// ==============================================
router.post('/extract-bank-statement', async (req, res) => {
    try {
        const { filePath, clientId } = req.body;

        if (!filePath) {
            return res.status(400).json({
                success: false,
                error: 'filePath is required',
                code: 'MISSING_FILEPATH'
            });
        }

        // Simular extracción de extracto bancario
        const mockBankData = await simulateBankStatementExtraction(filePath, clientId);

        console.log(`🏦 Extracto bancario extraído: ${path.basename(filePath)} | Movimientos: ${mockBankData.extractedData.movimientos.length}`);
        res.json(mockBankData);

    } catch (error) {
        console.error('❌ Error extracting bank statement data:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            code: 'EXTRACTION_ERROR'
        });
    }
});

// ==============================================
// ENDPOINT: Obtener historial OCR
// ==============================================
router.get('/history/:clientId', async (req, res) => {
    try {
        const { clientId } = req.params;
        const { page = 1, limit = 20, documentType, status } = req.query;

        // Validar parámetros
        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(100, Math.max(1, parseInt(limit)));

        try {
            // Intentar obtener datos reales de la base de datos
            const db = req.app.locals.database;
            if (db && db.isInitialized) {
                const connection = await db.getConnection();
                const offset = (pageNum - 1) * limitNum;

                // Construir filtros WHERE
                let whereConditions = ['opl.client_id = ?'];
                let params = [clientId];

                if (documentType && documentType !== 'all') {
                    whereConditions.push('opl.document_type = ?');
                    params.push(documentType);
                }

                if (status && status !== 'all') {
                    whereConditions.push('opl.status = ?');
                    params.push(status);
                }

                const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

                // Obtener total de documentos
                const countQuery = `
                    SELECT COUNT(*) as total
                    FROM ocr_processing_log opl
                    ${whereClause}
                `;
                const countResult = await connection.get(countQuery, params);
                const totalItems = countResult.total;
                const totalPages = Math.ceil(totalItems / limitNum);

                // Obtener documentos paginados
                const documentsQuery = `
                    SELECT 
                        opl.id,
                        opl.process_id,
                        CASE 
                            WHEN opl.file_path LIKE '%/%' THEN substr(opl.file_path, instr(opl.file_path, '/') + 1)
                            ELSE 'documento_' || opl.id || '.pdf'
                        END as fileName,
                        opl.document_type as documentType,
                        oer.confidence,
                        opl.status,
                        opl.created_at as processedAt,
                        1024 as fileSize,
                        oer.structured_data,
                        oer.raw_text
                    FROM ocr_processing_log opl
                    LEFT JOIN ocr_extraction_results oer ON opl.process_id = oer.process_id
                    ${whereClause}
                    ORDER BY opl.created_at DESC
                    LIMIT ? OFFSET ?
                `;

                const documents = await connection.all(documentsQuery, [...params, limitNum, offset]);
                
                // Parsear datos estructurados
                const processedDocuments = documents.map(doc => ({
                    ...doc,
                    extractedData: doc.structured_data ? JSON.parse(doc.structured_data) : null,
                    confidence: doc.confidence || Math.round(Math.random() * 15 + 80) // Fallback si no hay confianza
                }));

                const realHistory = {
                    success: true,
                    data: {
                        totalItems,
                        currentPage: pageNum,
                        totalPages,
                        itemsPerPage: limitNum,
                        items: processedDocuments
                    },
                    filters: {
                        clientId,
                        documentType: documentType || 'all',
                        status: status || 'all'
                    }
                };

                console.log(`📋 Historial OCR Real: Cliente ${clientId}, ${totalItems} documentos, Página ${pageNum}/${totalPages}`);
                res.json(realHistory);
                return;
            }
        } catch (dbError) {
            console.warn('❌ Error accediendo a BD, usando datos simulados:', dbError.message);
        }

        // Fallback: Simular historial con filtros
        const mockHistory = await generateMockHistory(clientId, pageNum, limitNum, documentType, status);

        console.log(`📋 Historial OCR Mock: Cliente ${clientId}, Página ${pageNum}/${mockHistory.data.totalPages}`);
        res.json(mockHistory);

    } catch (error) {
        console.error('❌ Error getting OCR history:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            code: 'HISTORY_ERROR'
        });
    }
});

// ==============================================
// ENDPOINT: Obtener estadísticas OCR
// ==============================================
router.get('/stats/:clientId', async (req, res) => {
    try {
        const { clientId } = req.params;
        const { period = '30d' } = req.query;

        // Generar estadísticas dinámicas
        const mockStats = await generateMockStats(clientId, period);

        console.log(`📊 Estadísticas OCR: Cliente ${clientId} (${period}) | Documentos: ${mockStats.stats.documentsProcessed}`);
        res.json(mockStats);

    } catch (error) {
        console.error('❌ Error getting OCR stats:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            code: 'STATS_ERROR'
        });
    }
});

// ==============================================
// ENDPOINT: Obtener estado de procesamiento
// ==============================================
router.get('/status/:processId', async (req, res) => {
    try {
        const { processId } = req.params;

        // Simular estado de procesamiento
        const mockStatus = {
            success: true,
            processId,
            status: 'completed', // 'queued', 'processing', 'completed', 'failed'
            progress: 100,
            startedAt: new Date(Date.now() - 30000).toISOString(),
            completedAt: new Date().toISOString(),
            result: {
                confidence: 94.2,
                documentType: 'invoice',
                pagesProcessed: 1
            }
        };

        res.json(mockStatus);

    } catch (error) {
        console.error('❌ Error getting process status:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            code: 'STATUS_ERROR'
        });
    }
});

// ==============================================
// FUNCIONES AUXILIARES PARA SIMULACIÓN
// ==============================================

async function simulateOCRProcessing(file, documentType, clientId, processId) {
    // Simular tiempo de procesamiento
    await new Promise(resolve => setTimeout(resolve, 100));

    const detectedType = detectDocumentType(file.originalname, documentType);
    const confidence = Math.random() * 10 + 85; // 85-95% confianza

    return {
        processId,
        documentType: detectedType,
        fileName: file.originalname,
        fileSize: file.size,
        filePath: file.path,
        confidence: Math.round(confidence * 10) / 10,
        text: generateMockText(detectedType),
        structured: generateStructuredData(detectedType),
        metadata: {
            uploadedAt: new Date().toISOString(),
            clientId,
            mimeType: file.mimetype,
            originalName: file.originalname
        }
    };
}

async function simulateInvoiceExtraction(filePath, clientId) {
    const invoiceNumber = `A-001-${String(Math.floor(Math.random() * 99999)).padStart(8, '0')}`;
    const cuit = generateRandomCUIT();

    return {
        success: true,
        documentType: 'invoice',
        confidence: Math.round((Math.random() * 8 + 87) * 10) / 10, // 87-95%
        extractedData: {
            numero: invoiceNumber,
            fecha: new Date().toISOString().split('T')[0],
            cuit,
            razonSocial: generateRandomCompanyName(),
            condicionIva: 'Responsable Inscripto',
            subtotal: Math.round(Math.random() * 50000 + 1000),
            iva: null, // Se calculará
            percepciones: 0,
            total: null, // Se calculará
            items: generateRandomInvoiceItems()
        },
        validation: {
            cuitValid: true,
            dateValid: true,
            amountsConsistent: true,
            formatValid: true
        },
        metadata: {
            processedAt: new Date().toISOString(),
            clientId: clientId || 'default',
            filePath,
            processingTime: Math.round(Math.random() * 3000 + 1000) // 1-4 segundos
        }
    };
}

async function simulateBankStatementExtraction(filePath, clientId) {
    const movements = generateRandomBankMovements();
    const initialBalance = Math.round(Math.random() * 100000 + 10000);

    return {
        success: true,
        documentType: 'bank_statement',
        confidence: Math.round((Math.random() * 6 + 85) * 10) / 10, // 85-91%
        extractedData: {
            banco: ['Banco Nación', 'Banco Santander', 'BBVA', 'Banco Galicia'][Math.floor(Math.random() * 4)],
            cuenta: `****-****-****-${String(Math.floor(Math.random() * 9999)).padStart(4, '0')}`,
            titular: generateRandomPersonName(),
            cbu: generateRandomCBU(),
            periodo: {
                desde: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                hasta: new Date().toISOString().split('T')[0]
            },
            saldoInicial: initialBalance,
            saldoFinal: calculateFinalBalance(initialBalance, movements),
            movimientos: movements
        },
        summary: {
            totalMovimientos: movements.length,
            totalDebitos: movements.filter(m => m.debito).length,
            totalCreditos: movements.filter(m => m.credito).length,
            montoDebitos: movements.reduce((sum, m) => sum + (m.debito || 0), 0),
            montoCreditos: movements.reduce((sum, m) => sum + (m.credito || 0), 0)
        },
        metadata: {
            processedAt: new Date().toISOString(),
            clientId: clientId || 'default',
            filePath,
            processingTime: Math.round(Math.random() * 4000 + 2000) // 2-6 segundos
        }
    };
}

async function generateMockHistory(clientId, page, limit, documentType, status) {
    const totalItems = Math.floor(Math.random() * 200 + 50);
    const totalPages = Math.ceil(totalItems / limit);

    const items = [];
    for (let i = 0; i < Math.min(limit, totalItems); i++) {
        const randomDate = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);
        const types = ['invoice', 'bank_statement', 'receipt', 'other'];
        const statuses = ['completed', 'processing', 'failed'];

        items.push({
            id: (page - 1) * limit + i + 1,
            processId: crypto.randomUUID(),
            documentType: documentType || types[Math.floor(Math.random() * types.length)],
            fileName: `documento_${String(i + 1).padStart(3, '0')}.pdf`,
            confidence: Math.round((Math.random() * 15 + 80) * 10) / 10,
            processedAt: randomDate.toISOString(),
            status: status || statuses[Math.floor(Math.random() * statuses.length)],
            fileSize: Math.floor(Math.random() * 5000000 + 100000) // 100KB - 5MB
        });
    }

    return {
        success: true,
        data: {
            totalItems,
            currentPage: page,
            totalPages,
            itemsPerPage: limit,
            items
        },
        filters: {
            clientId,
            documentType: documentType || 'all',
            status: status || 'all'
        }
    };
}

async function generateMockStats(clientId, period) {
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    const documentsProcessed = Math.floor(Math.random() * days * 5 + days);

    return {
        success: true,
        stats: {
            documentsProcessed,
            successRate: Math.round((Math.random() * 10 + 85) * 10) / 10,
            averageProcessingTime: Math.round((Math.random() * 2 + 1.5) * 10) / 10,
            totalInQueue: Math.floor(Math.random() * 10),
            lastProcessed: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
            byDocumentType: {
                invoice: Math.floor(documentsProcessed * 0.4),
                bank_statement: Math.floor(documentsProcessed * 0.3),
                receipt: Math.floor(documentsProcessed * 0.2),
                other: Math.floor(documentsProcessed * 0.1)
            },
            dailyTrend: generateDailyTrend(days),
            confidenceDistribution: {
                high: Math.floor(documentsProcessed * 0.7), // >90%
                medium: Math.floor(documentsProcessed * 0.25), // 70-90%
                low: Math.floor(documentsProcessed * 0.05) // <70%
            }
        },
        period,
        clientId
    };
}

// ==============================================
// FUNCIONES UTILITARIAS
// ==============================================

function detectDocumentType(filename, providedType) {
    if (providedType && providedType !== 'auto') {
        return providedType;
    }

    const name = filename.toLowerCase();
    if (name.includes('factura') || name.includes('invoice')) return 'invoice';
    if (name.includes('extracto') || name.includes('statement')) return 'bank_statement';
    if (name.includes('recibo') || name.includes('receipt')) return 'receipt';
    return 'other';
}

function generateMockText(documentType) {
    const texts = {
        invoice: 'FACTURA A\nEmpresa Ejemplo S.A.\nCUIT: 30-12345678-9\nFecha: 15/01/2024\nTotal: $1,210.00',
        bank_statement: 'EXTRACTO BANCARIO\nBanco Ejemplo\nCuenta: ****1234\nPeriodo: 01/01/2024 - 31/01/2024',
        receipt: 'RECIBO\nFecha: 15/01/2024\nConcepto: Pago de servicios\nMonto: $500.00',
        other: 'Documento procesado exitosamente'
    };
    return texts[documentType] || texts.other;
}

function generateStructuredData(documentType) {
    const baseData = {
        type: documentType,
        detectedFields: [],
        extractedData: {},
        confidence: Math.round((Math.random() * 10 + 85) * 10) / 10
    };

    switch (documentType) {
        case 'invoice':
            baseData.detectedFields = ['numero', 'fecha', 'cuit', 'total'];
            baseData.extractedData = {
                numero: `A-001-${String(Math.floor(Math.random() * 99999)).padStart(8, '0')}`,
                fecha: new Date().toISOString().split('T')[0],
                total: Math.round(Math.random() * 10000 + 500)
            };
            break;
        case 'bank_statement':
            baseData.detectedFields = ['banco', 'cuenta', 'periodo', 'movimientos'];
            baseData.extractedData = {
                banco: 'Banco Ejemplo',
                movimientos: Math.floor(Math.random() * 20 + 5)
            };
            break;
        default:
            baseData.detectedFields = ['fecha', 'descripcion'];
            baseData.extractedData = { fecha: new Date().toISOString().split('T')[0] };
    }

    return baseData;
}

function generateRandomCUIT() {
    const types = ['20', '23', '27', '30'];
    const type = types[Math.floor(Math.random() * types.length)];
    const middle = String(Math.floor(Math.random() * 99999999)).padStart(8, '0');
    const check = Math.floor(Math.random() * 10);
    return `${type}-${middle}-${check}`;
}

function generateRandomCompanyName() {
    const names = [
        'Servicios Integrales S.A.',
        'Consultora Profesional SRL',
        'Tecnología Avanzada S.A.',
        'Comercial del Sur SRL',
        'Industrias Modernas S.A.'
    ];
    return names[Math.floor(Math.random() * names.length)];
}

function generateRandomPersonName() {
    const names = ['Juan Pérez', 'María González', 'Carlos López', 'Ana Martínez', 'Roberto Silva'];
    return names[Math.floor(Math.random() * names.length)];
}

function generateRandomCBU() {
    return Array.from({ length: 22 }, () => Math.floor(Math.random() * 10)).join('');
}

function generateRandomInvoiceItems() {
    const items = [
        'Servicio de consultoría',
        'Desarrollo de software',
        'Mantenimiento técnico',
        'Capacitación especializada',
        'Soporte técnico'
    ];

    const numItems = Math.floor(Math.random() * 3) + 1;
    return Array.from({ length: numItems }, (_, i) => ({
        descripcion: items[Math.floor(Math.random() * items.length)],
        cantidad: Math.floor(Math.random() * 5) + 1,
        precio: Math.round(Math.random() * 5000 + 500),
        subtotal: null // Se calculará
    }));
}

function generateRandomBankMovements() {
    const numMovements = Math.floor(Math.random() * 15) + 5;
    const movements = [];
    let runningBalance = Math.round(Math.random() * 50000 + 10000);

    for (let i = 0; i < numMovements; i++) {
        const isCredit = Math.random() > 0.5;
        const amount = Math.round(Math.random() * 10000 + 100);
        const date = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);

        if (isCredit) {
            runningBalance += amount;
        } else {
            runningBalance -= amount;
        }

        movements.push({
            fecha: date.toISOString().split('T')[0],
            descripcion: isCredit ? 'Transferencia recibida' : 'Pago de servicios',
            debito: isCredit ? null : amount,
            credito: isCredit ? amount : null,
            saldo: runningBalance
        });
    }

    return movements.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
}

function calculateFinalBalance(initial, movements) {
    return movements.reduce((balance, mov) => {
        return balance + (mov.credito || 0) - (mov.debito || 0);
    }, initial);
}

function generateDailyTrend(days) {
    return Array.from({ length: days }, (_, i) => {
        const date = new Date(Date.now() - (days - i - 1) * 24 * 60 * 60 * 1000);
        return {
            date: date.toISOString().split('T')[0],
            count: Math.floor(Math.random() * 8 + 1)
        };
    });
}

export default router;