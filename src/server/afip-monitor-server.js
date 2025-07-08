import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import crypto from 'crypto';

// Tools
import { CheckComplianceTool } from './tools/check-compliance.js';
import { GetAlertsTool } from './tools/get-alerts.js';
import { ValidateFiscalTool } from './tools/validate-fiscal.js';
import { SetupMonitoringTool } from './tools/setup-monitoring.js';
import { GetUpdatesTool } from './tools/get-updates.js';

// Services
import { AfipClient } from './services/afip-client.js';
import { AlertManager } from './services/alert-manager.js';
import { ComplianceEngine } from './services/compliance-engine.js';
import { NotificationService } from './services/notification-service.js';
import { SchedulerService } from './services/scheduler-service.js';

// Additional tools for advanced features - OCR
import { OCRService } from './services/ocr-service.js';
import { ExtractOCRDataTool } from './tools/extract-ocr-data.js';
import { AutoCategorizeTransactionsTool } from './tools/auto-categorize-transactions.js';
import { AutoBankReconciliationTool } from './tools/auto-bank-reconciliation.js';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

export class AfipMonitorServer {
  constructor(config) {
    this.config = config;
    this.logger = config.logger;
    this.database = config.database;

    // Servidor MCP
    this.mcpServer = new Server(
      { name: 'afip-monitor', version: '1.0.0' },
      { capabilities: { tools: {}, resources: {}, prompts: {} } }
    );

    // Servidor HTTP para dashboard
    this.httpApp = express();
    this.httpServer = null;
    this.wsServer = null;

    // Services
    this.services = {};
    this.tools = {};

    this.setupServices();
    this.setupTools();
    this.setupHttpServer();
    this.setupMCPHandlers();
  }

  setupServices() {
    this.services = {
      afip: new AfipClient(this.config.afip, this.logger),
      alerts: new AlertManager(this.database, this.logger),
      compliance: new ComplianceEngine(this.config.compliance, this.logger),
      notifications: new NotificationService(this.config.notifications, this.logger),
      scheduler: new SchedulerService(this.logger),
      ocr: new OCRService(this.config, this.logger)
    };
  }

  setupTools() {
    const toolConfigs = {
      afipClient: this.services.afip,
      alertManager: this.services.alerts,
      complianceEngine: this.services.compliance,
      notificationService: this.services.notifications,
      database: this.database,
      logger: this.logger,
      ocr: this.services.ocr,
      database: this.database,
      logger: this.logger,
      config: this.config
    };

    this.tools = {
      checkCompliance: new CheckComplianceTool(toolConfigs),
      getAlerts: new GetAlertsTool(toolConfigs),
      validateFiscal: new ValidateFiscalTool(toolConfigs),
      setupMonitoring: new SetupMonitoringTool(toolConfigs),
      getUpdates: new GetUpdatesTool(toolConfigs),
      extractOCRData: new ExtractOCRDataTool(toolConfigs),
      autoCategorizeTransactions: new AutoCategorizeTransactionsTool(toolConfigs),
      autoBankReconciliation: new AutoBankReconciliationTool(toolConfigs)
    };

    // Registrar tools en el servidor MCP
    Object.values(this.tools).forEach(tool => {
      this.mcpServer.setRequestHandler('tools/call', async (request) => {
        if (request.params.name === tool.name) {
          return await tool.execute(request.params.arguments);
        }
      });
    });
  }

  setupHttpServer() {
    // Middleware
    this.httpApp.use(cors({
      origin: process.env.NODE_ENV === 'production'
        ? this.config.server.allowedOrigins
        : ['http://localhost:3000', 'http://localhost:3001'], // Agregar ambos puertos,
      credentials: true
    }));

    this.httpApp.use(express.json({ limit: '10mb' }));
    this.httpApp.use(express.static(path.join(__dirname, '../client/dist')));

    // Health check
    this.httpApp.get('/health', async (req, res) => {
      try {
        const status = await this.getHealthStatus();
        res.status(status.healthy ? 200 : 503).json(status);
      } catch (error) {
        this.logger.error('Health check error:', error);
        res.status(503).json({ healthy: false, error: error.message });
      }
    });

    // API endpoints
    this.httpApp.get('/api/status', async (req, res) => {
      try {
        const status = await this.getStatus();
        res.json(status);
      } catch (error) {
        this.logger.error('Status endpoint error:', error);
        res.status(500).json({ error: error.message });
      }
    });

    this.httpApp.get('/api/alerts', async (req, res) => {
      try {
        const alerts = await this.services.alerts.getRecentAlerts();
        res.json(alerts);
      } catch (error) {
        this.logger.error('Alerts endpoint error:', error);
        res.status(500).json({ error: error.message });
      }
    });

    this.httpApp.get('/api/compliance/:cuit', async (req, res) => {
      try {
        const { cuit } = req.params;
        const compliance = await this.services.compliance.checkCompliance(cuit);
        res.json(compliance);
      } catch (error) {
        this.logger.error('Compliance endpoint error:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Servir dashboard React
    this.httpApp.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, '../client/dist/index.html'));
    });

    // Upload y procesamiento de documentos
    this.httpApp.post('/api/ocr/upload', upload.single('document'), async (req, res) => {
      try {
        if (!req.file) {
          return res.status(400).json({ error: 'No file uploaded' });
        }

        const result = await this.services.ocr.processDocument(
          req.file.path,
          req.body.documentType || 'auto'
        );

        res.json({
          success: true,
          data: result,
          processId: crypto.randomUUID()
        });

      } catch (error) {
        this.logger.error('Error processing OCR upload:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Extraer datos de factura
    this.httpApp.post('/api/ocr/extract-invoice', async (req, res) => {
      try {
        const { filePath, clientId } = req.body;

        const result = await this.tools.extractOCRData.execute({
          filePath,
          documentType: 'invoice',
          clientId
        });

        res.json(result);
      } catch (error) {
        this.logger.error('Error extracting invoice data:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Extraer datos de extracto bancario
    this.httpApp.post('/api/ocr/extract-bank-statement', async (req, res) => {
      try {
        const { filePath, clientId } = req.body;

        const result = await this.tools.extractOCRData.execute({
          filePath,
          documentType: 'bank_statement',
          clientId
        });

        res.json(result);
      } catch (error) {
        this.logger.error('Error extracting bank statement data:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Categorización automática
    this.httpApp.post('/api/ocr/categorize-transactions', async (req, res) => {
      try {
        const { transactions, clientId, options } = req.body;

        const result = await this.tools.autoCategorizeTransactions.execute({
          transactions,
          clientId,
          options
        });

        res.json(result);
      } catch (error) {
        this.logger.error('Error categorizing transactions:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Conciliación bancaria automática
    this.httpApp.post('/api/ocr/bank-reconciliation', async (req, res) => {
      try {
        const {
          bankStatements,
          bookRecords,
          reconciliationPeriod,
          clientId,
          options
        } = req.body;

        const result = await this.tools.autoBankReconciliation.execute({
          bankStatements,
          bookRecords,
          reconciliationPeriod,
          clientId,
          options
        });

        res.json(result);
      } catch (error) {
        this.logger.error('Error in bank reconciliation:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Historial de procesamiento OCR
    this.httpApp.get('/api/ocr/history/:clientId', async (req, res) => {
      try {
        const { clientId } = req.params;
        const { page = 1, limit = 20, documentType } = req.query;

        let query = `
        SELECT * FROM ocr_processing_log 
        WHERE client_id = ?
      `;
        let params = [clientId];

        if (documentType) {
          query += ' AND document_type = ?';
          params.push(documentType);
        }

        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

        const results = await this.database.query(query, params);

        res.json({
          success: true,
          data: results,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: results.length
          }
        });

      } catch (error) {
        this.logger.error('Error fetching OCR history:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Estadísticas de OCR
    this.httpApp.get('/api/ocr/stats/:clientId', async (req, res) => {
      try {
        const { clientId } = req.params;
        const { period = '30' } = req.query; // días

        const stats = await this.database.query(`
        SELECT 
          document_type,
          status,
          COUNT(*) as count,
          AVG(JSON_EXTRACT(result, '$.confidence')) as avg_confidence
        FROM ocr_processing_log 
        WHERE client_id = ? 
          AND created_at > DATE_SUB(NOW(), INTERVAL ? DAY)
        GROUP BY document_type, status
      `, [clientId, parseInt(period)]);

        const totalProcessed = await this.database.query(`
        SELECT COUNT(*) as total 
        FROM ocr_processing_log 
        WHERE client_id = ? 
          AND created_at > DATE_SUB(NOW(), INTERVAL ? DAY)
      `, [clientId, parseInt(period)]);

        res.json({
          success: true,
          stats: {
            byType: stats,
            total: totalProcessed[0]?.total || 0,
            period: `${period} días`
          }
        });

      } catch (error) {
        this.logger.error('Error fetching OCR stats:', error);
        res.status(500).json({ error: error.message });
      }
    });
  }

  setupMCPHandlers() {
    // Handler para listar tools
    this.mcpServer.setRequestHandler('tools/list', async () => {
      return {
        tools: Object.values(this.tools).map(tool => ({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema
        }))
      };
    });

    // Handler para inicialización
    this.mcpServer.setRequestHandler('initialize', async (request) => {
      return {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {},
          resources: {},
          prompts: {}
        },
        serverInfo: {
          name: 'afip-monitor',
          version: '1.0.0'
        }
      };
    });

    // Handler para recursos
    this.mcpServer.setRequestHandler('resources/list', async () => {
      return {
        resources: [
          {
            uri: 'afip://compliance-status',
            name: 'Estado de Compliance AFIP',
            description: 'Estado actual del compliance fiscal',
            mimeType: 'application/json'
          },
          {
            uri: 'afip://active-alerts',
            name: 'Alertas Activas',
            description: 'Alertas activas de incumplimiento',
            mimeType: 'application/json'
          },
          {
            uri: 'ocr://processing-queue',
            name: 'Cola de Procesamiento OCR',
            description: 'Documentos en cola de procesamiento OCR',
            mimeType: 'application/json'
          },
          {
            uri: 'ocr://recent-extractions',
            name: 'Extracciones Recientes',
            description: 'Últimas extracciones de datos OCR realizadas',
            mimeType: 'application/json'
          },
          {
            uri: 'ocr://categorization-patterns',
            name: 'Patrones de Categorización',
            description: 'Patrones aprendidos para categorización automática',
            mimeType: 'application/json'
          },
          {
            uri: 'ocr://reconciliation-status',
            name: 'Estado de Conciliaciones',
            description: 'Estado de las conciliaciones bancarias automáticas',
            mimeType: 'application/json'
          }
        ]
      };
    });

    this.mcpServer.setRequestHandler('resources/read', async (request) => {
      const { uri } = request.params;

      switch (uri) {
        case 'afip://compliance-status':
          const status = await this.getComplianceStatus();
          return {
            contents: [{
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(status, null, 2)
            }]
          };

        case 'afip://active-alerts':
          const alerts = await this.services.alerts.getActiveAlerts();
          return {
            contents: [{
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(alerts, null, 2)
            }]
          };

        case 'ocr://processing-queue':
          const processingQueue = await this.getOCRProcessingQueue();
          return {
            contents: [{
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(processingQueue, null, 2)
            }]
          };

        case 'ocr://recent-extractions':
          const recentExtractions = await this.getRecentOCRExtractions();
          return {
            contents: [{
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(recentExtractions, null, 2)
            }]
          };

        case 'ocr://categorization-patterns':
          const patterns = await this.getCategorizationPatterns();
          return {
            contents: [{
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(patterns, null, 2)
            }]
          };

        case 'ocr://reconciliation-status':
          const reconciliationStatus = await this.getReconciliationStatus();
          return {
            contents: [{
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(reconciliationStatus, null, 2)
            }]
          };

        default:
          throw new Error(`Recurso no encontrado: ${uri}`);
      }
    });
  }

  async getOCRProcessingQueue() {
    try {
      const queue = await this.database.query(`
      SELECT 
        process_id,
        file_path,
        document_type,
        status,
        created_at,
        updated_at
      FROM ocr_processing_log 
      WHERE status IN ('processing', 'queued')
      ORDER BY created_at ASC
      LIMIT 50
    `);

      return {
        totalInQueue: queue.length,
        items: queue,
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error('Error getting OCR processing queue:', error);
      return { error: error.message };
    }
  }

  async getRecentOCRExtractions() {
    try {
      const extractions = await this.database.query(`
      SELECT 
        p.process_id,
        p.document_type,
        p.status,
        p.created_at,
        r.confidence,
        JSON_EXTRACT(r.metadata, '$.wordsCount') as words_count
      FROM ocr_processing_log p
      LEFT JOIN ocr_extraction_results r ON p.process_id = r.process_id
      WHERE p.created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)
        AND p.status = 'completed'
      ORDER BY p.created_at DESC
      LIMIT 20
    `);

      return {
        totalRecent: extractions.length,
        extractions,
        period: '24 horas',
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error('Error getting recent OCR extractions:', error);
      return { error: error.message };
    }
  }

  async getCategorizationPatterns() {
    try {
      const patterns = await this.database.query(`
      SELECT 
        description_pattern,
        category,
        COUNT(*) as frequency,
        AVG(confidence) as avg_confidence
      FROM categorization_history 
      WHERE created_at > DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY description_pattern, category
      ORDER BY frequency DESC, avg_confidence DESC
      LIMIT 50
    `);

      return {
        totalPatterns: patterns.length,
        patterns,
        period: '30 días',
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error('Error getting categorization patterns:', error);
      return { error: error.message };
    }
  }

  async getReconciliationStatus() {
    try {
      const reconciliations = await this.database.query(`
      SELECT 
        id,
        client_id,
        start_date,
        end_date,
        matching_rate,
        total_discrepancy_amount,
        created_at
      FROM bank_reconciliations 
      WHERE created_at > DATE_SUB(NOW(), INTERVAL 7 DAY)
      ORDER BY created_at DESC
      LIMIT 10
    `);

      const avgMatchingRate = reconciliations.length > 0
        ? reconciliations.reduce((sum, r) => sum + r.matching_rate, 0) / reconciliations.length
        : 0;

      return {
        recentReconciliations: reconciliations.length,
        averageMatchingRate: Math.round(avgMatchingRate * 100) / 100,
        reconciliations,
        period: '7 días',
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error('Error getting reconciliation status:', error);
      return { error: error.message };
    }
  }

  async start() {
    try {
      // Inicializar servicios
      await this.services.afip.initialize();
      await this.services.compliance.initialize();
      await this.services.notifications.initialize();
      await this.services.ocr.initialize();

      // Configurar monitoreo automático
      await this.setupAutomaticMonitoring();

      // Iniciar servidor HTTP
      this.httpServer = this.httpApp.listen(this.config.server.port, () => {
        this.logger.info(`HTTP Server listening on port ${this.config.server.port}`);
      });

      // Configurar WebSocket para tiempo real
      this.wsServer = new WebSocketServer({ server: this.httpServer });
      this.setupWebSocketHandlers();

      // Iniciar servidor MCP con STDIO
      const transport = new StdioServerTransport();
      await this.mcpServer.connect(transport);

      this.logger.info('AFIP Monitor MCP Server started successfully');

    } catch (error) {
      this.logger.error('Error starting server:', error);
      throw error;
    }
  }

  async stop() {
    this.logger.info('Stopping AFIP Monitor MCP Server...');

    try {
      // Cleanup OCR Service
      if (this.services.ocr) {
        await this.services.ocr.cleanup();
      }

      // Detener scheduler
      if (this.services.scheduler) {
        await this.services.scheduler.stop();
      }

      // Cerrar WebSocket
      if (this.wsServer) {
        this.wsServer.close();
      }

      // Cerrar servidor HTTP
      if (this.httpServer) {
        this.httpServer.close();
      }

      // Cerrar servidor MCP
      await this.mcpServer.close();

      this.logger.info('Server stopped successfully');
    } catch (error) {
      this.logger.error('Error stopping server:', error);
      throw error;
    }
  }

  setupWebSocketHandlers() {
    this.wsServer.on('connection', (ws) => {
      this.logger.info('WebSocket client connected');

      ws.on('message', async (data) => {
        try {
          const message = JSON.parse(data);
          await this.handleWebSocketMessage(ws, message);
        } catch (error) {
          this.logger.error('WebSocket message error:', error);
          ws.send(JSON.stringify({ error: error.message }));
        }
      });

      ws.on('close', () => {
        this.logger.info('WebSocket client disconnected');
      });

      // Enviar estado inicial
      this.sendWebSocketUpdate(ws, 'status', { connected: true });
    });
  }

  async handleWebSocketMessage(ws, message) {
    const { type, data } = message;

    switch (type) {
      case 'subscribe':
        // Implementar suscripción a actualizaciones
        break;
      case 'get_status':
        const status = await this.getStatus();
        this.sendWebSocketUpdate(ws, 'status', status);
        break;
      default:
        throw new Error(`Unknown message type: ${type}`);
    }
  }

  sendWebSocketUpdate(ws, type, data) {
    if (ws.readyState === 1) { // WebSocket.OPEN
      ws.send(JSON.stringify({ type, data, timestamp: Date.now() }));
    }
  }

  async setupAutomaticMonitoring() {
    // Configurar tareas programadas
    this.services.scheduler.schedule('compliance-check', '0 */6 * * *', async () => {
      await this.runComplianceCheck();
    });

    this.services.scheduler.schedule('alert-check', '*/15 * * * *', async () => {
      await this.checkForAlerts();
    });

    this.services.scheduler.schedule('status-update', '0 8 * * 1', async () => {
      await this.sendWeeklyReport();
    });
  }

  async runComplianceCheck() {
    try {
      this.logger.info('Running scheduled compliance check');
      // Implementar lógica de verificación automática
      const results = await this.services.compliance.runScheduledCheck();

      if (results.hasIssues) {
        await this.services.notifications.sendComplianceAlert(results);
      }
    } catch (error) {
      this.logger.error('Scheduled compliance check error:', error);
    }
  }

  async checkForAlerts() {
    try {
      const alerts = await this.services.alerts.checkForNewAlerts();

      if (alerts.length > 0) {
        // Broadcast via WebSocket
        this.wsServer.clients.forEach(client => {
          this.sendWebSocketUpdate(client, 'new_alerts', alerts);
        });
      }
    } catch (error) {
      this.logger.error('Alert check error:', error);
    }
  }

  async sendWeeklyReport() {
    try {
      const report = await this.generateWeeklyReport();
      await this.services.notifications.sendWeeklyReport(report);
    } catch (error) {
      this.logger.error('Weekly report error:', error);
    }
  }

  async getStatus() {
    return {
      server: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: '1.0.0'
      },
      services: {
        afip: await this.services.afip.getStatus(),
        compliance: await this.services.compliance.getStatus(),
        alerts: await this.services.alerts.getStatus()
      },
      monitoring: {
        activeMonitors: await this.services.alerts.getActiveMonitorCount(),
        lastCheck: await this.services.compliance.getLastCheckTime(),
        alertCount: await this.services.alerts.getActiveAlertCount()
      }
    };
  }

  async getHealthStatus() {
    const status = await this.getStatus();

    return {
      healthy: true,
      checks: {
        database: await this.database.healthCheck(),
        afip: await this.services.afip.healthCheck(),
        notifications: await this.services.notifications.healthCheck()
      },
      timestamp: new Date().toISOString()
    };
  }

  async getComplianceStatus() {
    return await this.services.compliance.getOverallStatus();
  }

  async generateWeeklyReport() {
    return {
      period: {
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        end: new Date()
      },
      compliance: await this.services.compliance.getWeeklyStats(),
      alerts: await this.services.alerts.getWeeklyStats(),
      recommendations: await this.services.compliance.getRecommendations()
    };
  }
}