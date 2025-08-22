import Tesseract from 'tesseract.js';
import { createWorker } from 'tesseract.js';
import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import OpenAI from 'openai';
import pdf2pic from 'pdf2pic';
// Importar pdf-parse de manera condicional para evitar problemas

export class OCRService {
    constructor(config, logger) {
        this.config = config;
        this.logger = logger;
        this.openai = new OpenAI({
            apiKey: config.openai?.apiKey || process.env.OPENAI_API_KEY
        });
        this.workers = new Map();
        this.maxWorkers = config.ocr?.maxWorkers || 3;
        this.supportedLanguages = ['spa', 'eng'];
    }

    async initialize() {
        this.logger.info('Inicializando OCR Service...');

        // Pre-crear workers para mejor performance
        for (let i = 0; i < this.maxWorkers; i++) {
            await this.createWorker(`worker_${i}`);
        }

        this.logger.info(`OCR Service inicializado con ${this.maxWorkers} workers`);
    }

    async createWorker(workerId) {
        try {
            const worker = await createWorker(this.supportedLanguages);
            this.workers.set(workerId, {
                worker,
                busy: false,
                lastUsed: Date.now()
            });

            this.logger.debug(`Worker OCR ${workerId} creado exitosamente`);
            return workerId;
        } catch (error) {
            this.logger.error(`Error creando worker ${workerId}:`, error);
            throw error;
        }
    }

    async getAvailableWorker() {
        // Buscar worker disponible
        for (const [workerId, workerData] of this.workers) {
            if (!workerData.busy) {
                workerData.busy = true;
                workerData.lastUsed = Date.now();
                return { workerId, worker: workerData.worker };
            }
        }

        // Si no hay workers disponibles, esperar o crear uno nuevo
        this.logger.warn('No hay workers OCR disponibles, esperando...');
        await new Promise(resolve => setTimeout(resolve, 100));
        return this.getAvailableWorker();
    }

    releaseWorker(workerId) {
        const workerData = this.workers.get(workerId);
        if (workerData) {
            workerData.busy = false;
            workerData.lastUsed = Date.now();
        }
    }

    async extractTextFromPdf(pdfPath) {
        try {
            this.logger.info(`Extrayendo texto de PDF usando poppler: ${path.basename(pdfPath)}`);
            
            // Usar pdftoppm del sistema directamente
            const outputDir = path.join(path.dirname(pdfPath), 'temp_images');
            await fs.mkdir(outputDir, { recursive: true });
            
            const outputPrefix = path.join(outputDir, `${path.basename(pdfPath, '.pdf')}_page`);
            
            this.logger.info('Convirtiendo PDF a imágenes con pdftoppm...');
            
            // Ejecutar pdftoppm del sistema
            const { spawn } = await import('child_process');
            
            return new Promise((resolve, reject) => {
                const pdftoppm = spawn('pdftoppm', [
                    '-r', '300',        // DPI alta para mejor OCR
                    '-png',             // Formato PNG 
                    '-f', '1',          // Primera página
                    '-l', '1',          // Solo primera página
                    pdfPath,
                    outputPrefix
                ]);
                
                let stderr = '';
                
                pdftoppm.stderr.on('data', (data) => {
                    stderr += data.toString();
                });
                
                pdftoppm.on('close', async (code) => {
                    if (code !== 0) {
                        this.logger.error(`pdftoppm falló con código ${code}: ${stderr}`);
                        return reject(new Error(`pdftoppm falló: ${stderr}`));
                    }
                    
                    try {
                        // Buscar la imagen generada
                        const imageFiles = await fs.readdir(outputDir);
                        const pngFiles = imageFiles.filter(f => f.endsWith('.png'));
                        
                        if (pngFiles.length === 0) {
                            throw new Error('No se generaron imágenes PNG desde el PDF');
                        }
                        
                        const firstImagePath = path.join(outputDir, pngFiles[0]);
                        this.logger.info(`Procesando imagen generada: ${pngFiles[0]}`);
                        
                        // Obtener worker disponible para Tesseract
                        const { workerId, worker } = await this.getAvailableWorker();
                        
                        try {
                            const { data: { text, confidence } } = await worker.recognize(firstImagePath, {
                                // Configuración específica para facturas en español
                                oem: 1, // LSTM OCR Engine Mode
                                psm: 6  // Page Segmentation Mode: Uniform block of text
                            });
                            
                            this.logger.info(`OCR completado. Texto extraído: ${text.length} caracteres, confianza: ${confidence.toFixed(2)}%`);
                            
                            // Limpiar archivos temporales
                            await this.cleanupTempImages(outputDir);
                            
                            resolve({
                                text: text.trim(),
                                confidence: confidence,
                                pages: 1,
                                extractedAt: new Date().toISOString(),
                                source: path.basename(pdfPath),
                                method: 'pdftoppm + tesseract',
                                imageCount: pngFiles.length
                            });
                            
                        } finally {
                            this.releaseWorker(workerId);
                        }
                        
                    } catch (error) {
                        this.logger.error('Error procesando imagen extraída:', error);
                        reject(error);
                    }
                });
                
                pdftoppm.on('error', (error) => {
                    this.logger.error('Error ejecutando pdftoppm:', error);
                    reject(error);
                });
            });
            
        } catch (error) {
            this.logger.error('Error extrayendo texto de PDF:', error);
            throw error;
        }
    }

    async cleanupTempImages(outputDir) {
        try {
            const files = await fs.readdir(outputDir);
            for (const file of files) {
                if (file.endsWith('.jpeg') || file.endsWith('.jpg') || file.endsWith('.png')) {
                    await fs.unlink(path.join(outputDir, file));
                }
            }
            await fs.rmdir(outputDir);
            this.logger.debug('Archivos temporales de OCR limpiados');
        } catch (error) {
            this.logger.warn('Error limpiando archivos temporales:', error.message);
        }
    }

    async convertPdfToImage(pdfPath) {
        try {
            this.logger.info(`Convirtiendo PDF a imagen: ${path.basename(pdfPath)}`);
            
            // Configurar pdf2pic
            const convert = pdf2pic.fromPath(pdfPath, {
                density: 300,           // DPI alta para mejor OCR
                saveFilename: "page",
                savePath: path.dirname(pdfPath),
                format: "png",
                width: 2000,            // Ancho máximo
                height: 2800            // Alto máximo
            });

            // Convertir primera página
            const result = await convert(1, { responseType: "base64" });
            
            if (result && result.base64) {
                // Crear archivo temporal de imagen
                const imageBuffer = Buffer.from(result.base64, 'base64');
                const imagePath = pdfPath + '_converted.png';
                await fs.writeFile(imagePath, imageBuffer);
                
                this.logger.info(`PDF convertido exitosamente: ${path.basename(imagePath)}`);
                return imagePath;
            } else {
                throw new Error('No se pudo convertir el PDF');
            }
            
        } catch (error) {
            this.logger.error('Error convirtiendo PDF a imagen:', error);
            throw error;
        }
    }

    async preprocessImage(imagePath) {
        try {
            // Generar nombre único para archivo procesado
            const timestamp = Date.now();
            const processedPath = imagePath + `_processed_${timestamp}.png`;

            await sharp(imagePath)
                .resize(null, 1200, {
                    withoutEnlargement: true,
                    fit: 'inside'
                })
                .normalize()
                .sharpen()
                .png({ quality: 95 })
                .toFile(processedPath);

            return processedPath;
        } catch (error) {
            this.logger.error('Error preprocesando imagen:', error);
            return imagePath; // Usar imagen original si falla preprocesamiento
        }
    }

    async extractTextFromImage(imagePath, options = {}) {
        const { workerId, worker } = await this.getAvailableWorker();

        try {
            this.logger.info(`Extrayendo texto de imagen: ${path.basename(imagePath)}`);

            // Preprocesar imagen para mejor OCR
            const processedImagePath = await this.preprocessImage(imagePath);

            const { data } = await worker.recognize(processedImagePath, {
                // Remover logger para evitar errores de clonación en workers
                // logger: m => console.log(`OCR Progress: ${m.status} ${m.progress}`),
                ...options
            });

            // Limpiar archivo procesado
            if (processedImagePath !== imagePath) {
                await fs.unlink(processedImagePath).catch(() => { });
            }

            const result = {
                text: data.text,
                confidence: data.confidence,
                words: data.words,
                lines: data.lines,
                paragraphs: data.paragraphs,
                blocks: data.blocks,
                extractedAt: new Date().toISOString(),
                source: path.basename(imagePath)
            };

            this.logger.info(`OCR completado con confianza: ${data.confidence.toFixed(2)}%`);
            return result;

        } catch (error) {
            this.logger.error('Error en extracción OCR:', error);
            throw error;
        } finally {
            this.releaseWorker(workerId);
        }
    }

    async extractInvoiceData(imagePath) {
        try {
            // Extraer texto básico
            const ocrResult = await this.extractTextFromImage(imagePath);

            // Usar IA para estructurar datos de factura
            const structuredData = await this.structureInvoiceData(ocrResult.text);

            return {
                ...ocrResult,
                structured: structuredData,
                type: 'invoice'
            };
        } catch (error) {
            this.logger.error('Error extrayendo datos de factura:', error);
            throw error;
        }
    }

    async extractBankStatementData(imagePath) {
        try {
            // Extraer texto básico
            const ocrResult = await this.extractTextFromImage(imagePath);

            // Usar IA para estructurar datos de extracto bancario
            const structuredData = await this.structureBankStatementData(ocrResult.text);

            return {
                ...ocrResult,
                structured: structuredData,
                type: 'bank_statement'
            };
        } catch (error) {
            this.logger.error('Error extrayendo datos de extracto bancario:', error);
            throw error;
        }
    }

    async structureInvoiceData(text) {
        const prompt = `
Analiza el siguiente texto extraído de una factura y extrae la información estructurada en formato JSON.

Texto de la factura:
${text}

Devuelve un JSON con la siguiente estructura:
{
  "numeroFactura": "string",
  "fecha": "YYYY-MM-DD",
  "emisor": {
    "razonSocial": "string",
    "cuit": "string",
    "direccion": "string"
  },
  "receptor": {
    "razonSocial": "string",
    "cuit": "string",
    "direccion": "string"
  },
  "items": [
    {
      "descripcion": "string",
      "cantidad": number,
      "precioUnitario": number,
      "total": number
    }
  ],
  "subtotal": number,
  "iva": number,
  "total": number,
  "condicionPago": "string",
  "tipoFactura": "A|B|C",
  "puntoVenta": "string",
  "cae": "string",
  "vencimientoCae": "YYYY-MM-DD"
}

Solo devuelve el JSON, sin explicaciones adicionales.
`;

        try {
            const response = await this.openai.chat.completions.create({
                model: 'gpt-4',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.1,
                max_tokens: 2000
            });

            const jsonText = response.choices[0].message.content.trim();
            return JSON.parse(jsonText);
        } catch (error) {
            this.logger.error('Error estructurando datos de factura:', error);
            return this.fallbackInvoiceExtraction(text);
        }
    }

    async structureBankStatementData(text) {
        const prompt = `
Analiza el siguiente texto extraído de un extracto bancario y extrae las transacciones en formato JSON.

Texto del extracto:
${text}

Devuelve un JSON con la siguiente estructura:
{
  "banco": "string",
  "numeroCuenta": "string",
  "periodo": {
    "desde": "YYYY-MM-DD",
    "hasta": "YYYY-MM-DD"
  },
  "saldoInicial": number,
  "saldoFinal": number,
  "transacciones": [
    {
      "fecha": "YYYY-MM-DD",
      "descripcion": "string",
      "referencia": "string",
      "debito": number,
      "credito": number,
      "saldo": number,
      "tipo": "transferencia|deposito|extraccion|pago|cargo|otros"
    }
  ]
}

Solo devuelve el JSON, sin explicaciones adicionales.
`;

        try {
            const response = await this.openai.chat.completions.create({
                model: 'gpt-4',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.1,
                max_tokens: 3000
            });

            const jsonText = response.choices[0].message.content.trim();
            return JSON.parse(jsonText);
        } catch (error) {
            this.logger.error('Error estructurando datos de extracto bancario:', error);
            return this.fallbackBankStatementExtraction(text);
        }
    }

    fallbackInvoiceExtraction(text) {
        this.logger.warn('Fallback: Extrayendo datos de factura con regex básico');
        
        // Intentar extracción básica con regex
        const fallbackData = {
            numeroFactura: this.extractWithRegex(text, /(?:Nº|N°|Numero|FACTURA)[:\s]*([A-Z0-9\-]+)/i) || 
                          this.extractWithRegex(text, /(\d{4}-\d{8})/),
            fecha: this.extractDateWithRegex(text),
            emisor: { 
                razonSocial: this.extractWithRegex(text, /(?:RAZON SOCIAL|EMPRESA)[:\s]*([^\\n]+)/i),
                cuit: this.extractWithRegex(text, /(?:CUIT|RUC)[:\s]*(\d{2}-?\d{8}-?\d{1})/i),
                direccion: ""
            },
            receptor: { 
                razonSocial: "",
                cuit: "",
                direccion: ""
            },
            items: [],
            subtotal: this.extractAmountWithRegex(text, /(?:SUBTOTAL|Sub Total)[:\s]*\$?\s*([\d.,]+)/i),
            iva: this.extractAmountWithRegex(text, /(?:IVA|I\.V\.A\.)[:\s]*\$?\s*([\d.,]+)/i),
            total: this.extractAmountWithRegex(text, /(?:TOTAL|Total)[:\s]*\$?\s*([\d.,]+)/i),
            condicionPago: this.extractWithRegex(text, /(?:CONDICION|FORMA)[^\\n]*PAGO[:\s]*([^\\n]+)/i),
            tipoFactura: this.extractWithRegex(text, /FACTURA\s+([ABC])/i),
            puntoVenta: this.extractWithRegex(text, /(\d{4})-\d{8}/),
            cae: this.extractWithRegex(text, /(?:CAE|C\.A\.E\.)[:\s]*(\d+)/i),
            vencimientoCae: null
        };

        // Log para debugging
        this.logger.info(`Fallback extraction completed. Extracted: ${Object.keys(fallbackData).filter(k => fallbackData[k]).length} fields`);
        
        return fallbackData;
    }

    fallbackBankStatementExtraction(text) {
        // Extracción básica con regex como fallback
        return {
            banco: '',
            numeroCuenta: this.extractWithRegex(text, /Cuenta[\s]*(\d+)/i),
            periodo: { desde: null, hasta: null },
            saldoInicial: 0,
            saldoFinal: 0,
            transacciones: []
        };
    }

    extractWithRegex(text, regex) {
        const match = text.match(regex);
        return match ? match[1] : '';
    }

    extractDateWithRegex(text) {
        // Buscar fecha después de "Fecha:" primero
        let dateMatch = text.match(/Fecha[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/i);
        if (!dateMatch) {
            // Fallback: buscar cualquier fecha en formato DD/MM/YYYY o DD-MM-YYYY
            dateMatch = text.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
        }
        
        if (dateMatch) {
            const fullDateMatch = dateMatch[1] || dateMatch[0];
            const parts = fullDateMatch.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
            if (parts) {
                const [, day, month, year] = parts;
                return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            }
        }
        return null;
    }

    extractAmountWithRegex(text, regex) {
        const match = text.match(regex);
        if (match) {
            const amount = match[1].replace(/\./g, '').replace(',', '.');
            return parseFloat(amount) || 0;
        }
        return 0;
    }

    async processDocument(filePath, documentType = 'auto', options = {}) {
        try {
            this.logger.info(`Procesando documento: ${path.basename(filePath)}, tipo: ${documentType}`);

            // Verificar si es PDF usando originalName si está disponible, o el filePath
            const originalName = options.originalName || filePath;
            const mimeType = options.mimeType;
            
            // Detectar PDF por extensión del nombre original o MIME type
            const isPdf = originalName.toLowerCase().endsWith('.pdf') || mimeType === 'application/pdf';
            
            // Verificar si es PDF y convertir a imagen si es necesario
            let processedFilePath = filePath;
            let isPdfConverted = false;
            
            if (isPdf) {
                this.logger.info('Archivo PDF detectado, procesando con poppler + OCR...');
                // Extraer texto real del PDF usando poppler + Tesseract
                const pdfExtractionResult = await this.extractTextFromPdf(filePath);
                
                // Procesar el texto extraído según el tipo de documento
                if (documentType === 'invoice' || documentType === 'auto') {
                    const structuredData = await this.structureInvoiceData(pdfExtractionResult.text);
                    return {
                        ...pdfExtractionResult,
                        structured: structuredData,
                        type: 'invoice',
                        detectedType: 'invoice'
                    };
                } else if (documentType === 'bank_statement') {
                    const structuredData = await this.structureBankStatementData(pdfExtractionResult.text);
                    return {
                        ...pdfExtractionResult,
                        structured: structuredData,
                        type: 'bank_statement',
                        detectedType: 'bank_statement'
                    };
                }
                
                // Para documentos generales, devolver solo el texto extraído
                return {
                    ...pdfExtractionResult,
                    detectedType: 'general'
                };
            }

            let result;

            try {
                if (documentType === 'invoice' || documentType === 'auto') {
                    result = await this.extractInvoiceData(processedFilePath);
                    if (documentType === 'auto' && result.structured.numeroFactura) {
                        result.detectedType = 'invoice';
                    }
                }

                if ((documentType === 'bank_statement' || documentType === 'auto') &&
                    (!result || !result.structured.numeroFactura)) {
                    result = await this.extractBankStatementData(processedFilePath);
                    if (documentType === 'auto') {
                        result.detectedType = 'bank_statement';
                    }
                }

                // Si no se detectó nada específico, hacer OCR general
                if (!result) {
                    result = await this.extractTextFromImage(processedFilePath);
                    result.detectedType = 'general';
                }

                // Agregar metadata sobre conversión PDF si aplica
                if (isPdfConverted) {
                    result.metadata = result.metadata || {};
                    result.metadata.pdfConverted = true;
                    result.metadata.originalFilePath = filePath;
                    result.metadata.convertedFilePath = processedFilePath;
                }

                return result;

            } finally {
                // Limpiar archivo temporal de conversión PDF si se creó
                if (isPdfConverted && processedFilePath !== filePath) {
                    try {
                        await fs.unlink(processedFilePath);
                        this.logger.debug(`Archivo temporal de conversión PDF eliminado: ${path.basename(processedFilePath)}`);
                    } catch (cleanupError) {
                        this.logger.warn('Error eliminando archivo temporal:', cleanupError.message);
                    }
                }
            }

        } catch (error) {
            this.logger.error('Error procesando documento:', error);
            throw error;
        }
    }

    async cleanup() {
        this.logger.info('Limpiando workers OCR...');

        for (const [workerId, workerData] of this.workers) {
            try {
                await workerData.worker.terminate();
                this.logger.debug(`Worker ${workerId} terminado`);
            } catch (error) {
                this.logger.error(`Error terminando worker ${workerId}:`, error);
            }
        }

        this.workers.clear();
        this.logger.info('OCR Service cleanup completado');
    }
}