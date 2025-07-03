import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';

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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
      scheduler: new SchedulerService(this.logger)
    };
  }

  setupTools() {
    const toolConfigs = {
      afipClient: this.services.afip,
      alertManager: this.services.alerts,
      complianceEngine: this.services.compliance,
      notificationService: this.services.notifications,
      database: this.database,
      logger: this.logger
    };

    this.tools = {
      checkCompliance: new CheckComplianceTool(toolConfigs),
      getAlerts: new GetAlertsTool(toolConfigs),
      validateFiscal: new ValidateFiscalTool(toolConfigs),
      setupMonitoring: new SetupMonitoringTool(toolConfigs),
      getUpdates: new GetUpdatesTool(toolConfigs)
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
        : true,
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

        default:
          throw new Error(`Recurso no encontrado: ${uri}`);
      }
    });
  }

  async start() {
    try {
      // Inicializar servicios
      await this.services.afip.initialize();
      await this.services.compliance.initialize();
      await this.services.notifications.initialize();

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