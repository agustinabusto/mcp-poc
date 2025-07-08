import Tesseract from 'tesseract.js';
import { createWorker } from 'tesseract.js';
import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import OpenAI from 'openai';

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

    async preprocessImage(imagePath) {
        try {
            const processedPath = imagePath.replace(/\.(jpg|jpeg|png|gif)$/i, '_processed.png');

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
                logger: m => this.logger.debug(`OCR Progress: ${m.status} ${m.progress}`),
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
        // Extracción básica con regex como fallback
        const invoice = {
            numeroFactura: this.extractWithRegex(text, /(?:N[°º]|Nro|Número)[\s]*(\d{4}-\d{8})/i),
            fecha: this.extractDateWithRegex(text),
            emisor: { razonSocial: '', cuit: '', direccion: '' },
            receptor: { razonSocial: '', cuit: '', direccion: '' },
            items: [],
            subtotal: 0,
            iva: 0,
            total: this.extractAmountWithRegex(text, /total[\s]*\$?[\s]*(\d+(?:\.\d{3})*(?:,\d{2})?)/i),
            condicionPago: '',
            tipoFactura: this.extractWithRegex(text, /Factura\s+([ABC])/i),
            puntoVenta: '',
            cae: this.extractWithRegex(text, /CAE[\s]*(\d+)/i),
            vencimientoCae: null
        };

        return invoice;
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
        const dateRegex = /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/;
        const match = text.match(dateRegex);
        if (match) {
            const [, day, month, year] = match;
            return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
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

    async processDocument(filePath, documentType = 'auto') {
        try {
            this.logger.info(`Procesando documento: ${path.basename(filePath)}, tipo: ${documentType}`);

            let result;

            if (documentType === 'invoice' || documentType === 'auto') {
                result = await this.extractInvoiceData(filePath);
                if (documentType === 'auto' && result.structured.numeroFactura) {
                    result.detectedType = 'invoice';
                }
            }

            if ((documentType === 'bank_statement' || documentType === 'auto') &&
                (!result || !result.structured.numeroFactura)) {
                result = await this.extractBankStatementData(filePath);
                if (documentType === 'auto') {
                    result.detectedType = 'bank_statement';
                }
            }

            // Si no se detectó nada específico, hacer OCR general
            if (!result) {
                result = await this.extractTextFromImage(filePath);
                result.detectedType = 'general';
            }

            return result;
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