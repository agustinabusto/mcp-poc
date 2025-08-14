#!/usr/bin/env node

/**
 * Epic 3: Compliance Monitoring & Predictive Alerts System
 * Integration Test Suite
 * 
 * This script validates that all components of the Epic 3 implementation
 * are working correctly together.
 */

import { DatabaseService } from '../services/database-service.js';
import { ComplianceMonitor } from '../services/compliance-monitor.js';
import { RiskScoringEngine } from '../services/risk-scoring-engine.js';
import { AlertManager } from '../services/alert-manager.js';
import { EscalationEngine } from '../services/escalation-engine.js';
import { EmailService } from '../services/email-service.js';
import { NotificationService } from '../services/notification-service.js';
import { AfipClient } from '../services/afip-client.js';
import { LoggerService } from '../services/logger-service.js';
import dotenv from 'dotenv';

dotenv.config();

const logger = LoggerService.createLogger('Epic3IntegrationTest');

class Epic3IntegrationTest {
    constructor() {
        this.testResults = {
            passed: 0,
            failed: 0,
            tests: []
        };
    }

    async runTest(testName, testFunction) {
        try {
            logger.info(`Running: ${testName}`);
            await testFunction();
            this.testResults.passed++;
            this.testResults.tests.push({ name: testName, status: 'PASSED' });
            logger.info(`✅ ${testName} - PASSED`);
        } catch (error) {
            this.testResults.failed++;
            this.testResults.tests.push({ 
                name: testName, 
                status: 'FAILED', 
                error: error.message 
            });
            logger.error(`❌ ${testName} - FAILED: ${error.message}`);
        }
    }

    async setup() {
        logger.info('Setting up integration test environment...');
        
        // Set database path to main application database
        process.env.DATABASE_PATH = './data/afip_monitor.db';
        
        // Initialize database
        await DatabaseService.initialize();
        
        // Create test services
        const notificationConfig = {
            email: {
                enabled: false, // Disable for testing
                provider: 'smtp'
            }
        };

        const afipConfig = {
            baseURL: 'https://ws.afip.gov.ar',
            timeout: 30000,
            retryAttempts: 3,
            retryDelay: 1000,
            mockMode: true // Use mock mode for testing
        };

        this.notificationService = new NotificationService(notificationConfig);
        this.emailService = new EmailService(notificationConfig.email);
        this.afipClient = new AfipClient(afipConfig);
        this.riskScoringEngine = new RiskScoringEngine(DatabaseService.db, this.afipClient);
        this.alertManager = new AlertManager(DatabaseService.db, this.notificationService);
        this.escalationEngine = new EscalationEngine(DatabaseService.db, this.alertManager, this.emailService);
        this.complianceMonitor = new ComplianceMonitor(
            DatabaseService.db,
            this.afipClient, 
            this.riskScoringEngine, 
            this.alertManager
        );

        logger.info('Test environment setup completed');
    }

    async testDatabaseSchema() {
        // Test that all required tables exist
        const requiredTables = [
            'compliance_monitoring',
            'compliance_alerts',
            'compliance_results',
            'compliance_metrics',
            'compliance_history',
            'compliance_monitoring_config',
            'risk_factors',
            'notification_settings'
        ];

        for (const table of requiredTables) {
            const result = await DatabaseService.db.get(
                `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
                [table]
            );
            
            if (!result) {
                throw new Error(`Required table '${table}' does not exist`);
            }
        }

        // Test that views exist
        const requiredViews = [
            'v_compliance_dashboard',
            'v_alerts_by_severity',
            'v_compliance_trends'
        ];

        for (const view of requiredViews) {
            const result = await DatabaseService.db.get(
                `SELECT name FROM sqlite_master WHERE type='view' AND name=?`,
                [view]
            );
            
            if (!result) {
                throw new Error(`Required view '${view}' does not exist`);
            }
        }
    }

    async testRiskScoringEngine() {
        const testCuit = '20-12345678-9';
        const mockData = {
            taxStatus: 'active',
            vatRegistered: true,
            income: 1000000,
            lastDeclarationDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000) // 45 days ago
        };

        const riskScore = await this.riskScoringEngine.calculateRiskScore(testCuit, mockData);
        
        if (typeof riskScore !== 'number' || riskScore < 0 || riskScore > 1) {
            throw new Error(`Invalid risk score: ${riskScore}`);
        }
    }

    async testAlertManager() {
        const testAlert = {
            cuit: '20-12345678-9',
            alert_type: 'missing_vat_declarations',
            severity: 'high',
            message: 'Test alert for integration testing',
            details: { test: true }
        };

        const alertId = await this.alertManager.createAlert(testAlert);
        
        if (!alertId || typeof alertId !== 'number') {
            throw new Error('Failed to create alert');
        }

        // Test acknowledging alert
        const acknowledged = await this.alertManager.acknowledgeAlert(alertId, 'test-user');
        if (!acknowledged) {
            throw new Error('Failed to acknowledge alert');
        }

        // Test resolving alert
        const resolved = await this.alertManager.resolveAlert(alertId, 'test-user', 'Test resolution');
        if (!resolved) {
            throw new Error('Failed to resolve alert');
        }
    }

    async testComplianceMonitor() {
        const testCuit = '20-12345678-9';
        
        // Insert test contributor if not exists
        await DatabaseService.db.run(`
            INSERT OR IGNORE INTO contributors (cuit, business_name, active, created_at)
            VALUES (?, ?, 1, datetime('now'))
        `, [testCuit, 'Test Company']);

        // Perform compliance check
        const result = await this.complianceMonitor.performComplianceCheck(testCuit, 'test');
        
        if (!result || !result.complianceScore || !result.riskLevel) {
            throw new Error('Compliance check did not return expected result structure');
        }

        // Verify data was stored
        const storedResult = await DatabaseService.db.get(`
            SELECT * FROM compliance_results 
            WHERE cuit = ? 
            ORDER BY check_date DESC 
            LIMIT 1
        `, [testCuit]);

        if (!storedResult) {
            throw new Error('Compliance check result was not stored in database');
        }
    }

    async testNotificationRoutes() {
        // Test notification configuration
        const testCuit = '20-12345678-9';
        const testConfig = {
            email_enabled: true,
            primary_email: 'test@example.com',
            critical_alerts: true,
            high_alerts: true
        };

        // Insert test notification config
        await DatabaseService.db.run(`
            INSERT OR REPLACE INTO notification_settings 
            (cuit, email_enabled, primary_email, critical_alerts, high_alerts, created_at)
            VALUES (?, ?, ?, ?, ?, datetime('now'))
        `, [testCuit, testConfig.email_enabled, testConfig.primary_email, 
            testConfig.critical_alerts, testConfig.high_alerts]);

        // Verify config was stored
        const storedConfig = await DatabaseService.db.get(`
            SELECT * FROM notification_settings WHERE cuit = ?
        `, [testCuit]);

        if (!storedConfig || storedConfig.primary_email !== testConfig.primary_email) {
            throw new Error('Notification configuration was not stored correctly');
        }
    }

    async testComplianceRoutes() {
        // Test that compliance monitoring can be configured
        const testCuit = '20-12345678-9';
        const monitoringConfig = {
            enabled: true,
            polling_interval: 'medium',
            alert_thresholds: { critical: 0.8, high: 0.6 }
        };

        // Insert test monitoring config
        await DatabaseService.db.run(`
            INSERT OR REPLACE INTO compliance_monitoring_config 
            (cuit, enabled, polling_interval, alert_thresholds, created_at)
            VALUES (?, ?, ?, ?, datetime('now'))
        `, [testCuit, monitoringConfig.enabled, monitoringConfig.polling_interval, 
            JSON.stringify(monitoringConfig.alert_thresholds)]);

        // Verify config was stored
        const storedConfig = await DatabaseService.db.get(`
            SELECT * FROM compliance_monitoring_config WHERE cuit = ?
        `, [testCuit]);

        if (!storedConfig || !storedConfig.enabled) {
            throw new Error('Compliance monitoring configuration was not stored correctly');
        }
    }

    async testDashboardViews() {
        // Test dashboard view returns data
        const dashboardData = await DatabaseService.db.all(`
            SELECT * FROM v_compliance_dashboard LIMIT 5
        `);

        // Should not throw error (empty result is ok for test)
        if (!Array.isArray(dashboardData)) {
            throw new Error('Dashboard view did not return array');
        }

        // Test alerts view
        const alertsData = await DatabaseService.db.all(`
            SELECT * FROM v_alerts_by_severity LIMIT 5
        `);

        if (!Array.isArray(alertsData)) {
            throw new Error('Alerts view did not return array');
        }
    }

    async testCompleteWorkflow() {
        const testCuit = '20-87654321-9';
        
        // Step 1: Setup contributor
        await DatabaseService.db.run(`
            INSERT OR REPLACE INTO contributors (cuit, business_name, active, created_at)
            VALUES (?, ?, 1, datetime('now'))
        `, [testCuit, 'Integration Test Company']);

        // Step 2: Configure monitoring
        await DatabaseService.db.run(`
            INSERT OR REPLACE INTO compliance_monitoring_config 
            (cuit, enabled, polling_interval, alert_thresholds, created_at)
            VALUES (?, 1, 'high', '{"critical": 0.8, "high": 0.6}', datetime('now'))
        `, [testCuit]);

        // Step 3: Configure notifications
        await DatabaseService.db.run(`
            INSERT OR REPLACE INTO notification_settings 
            (cuit, email_enabled, primary_email, critical_alerts, high_alerts, created_at)
            VALUES (?, 1, 'integration-test@example.com', 1, 1, datetime('now'))
        `, [testCuit]);

        // Step 4: Run compliance check
        const result = await this.complianceMonitor.performComplianceCheck(testCuit, 'integration-test');

        // Step 5: Verify all data was created correctly
        const complianceResult = await DatabaseService.db.get(`
            SELECT * FROM compliance_results WHERE cuit = ? ORDER BY check_date DESC LIMIT 1
        `, [testCuit]);

        if (!complianceResult) {
            throw new Error('Complete workflow failed - no compliance result found');
        }

        logger.info(`Complete workflow test successful for CUIT: ${testCuit}`);
    }

    async cleanup() {
        logger.info('Cleaning up test data...');
        
        // Clean up test data
        const testCuits = ['20-12345678-9', '20-87654321-9'];
        
        for (const cuit of testCuits) {
            await DatabaseService.db.run('DELETE FROM compliance_alerts WHERE cuit = ?', [cuit]);
            await DatabaseService.db.run('DELETE FROM compliance_results WHERE cuit = ?', [cuit]);
            await DatabaseService.db.run('DELETE FROM compliance_monitoring_config WHERE cuit = ?', [cuit]);
            await DatabaseService.db.run('DELETE FROM notification_settings WHERE cuit = ?', [cuit]);
            await DatabaseService.db.run('DELETE FROM contributors WHERE cuit = ?', [cuit]);
        }

        logger.info('Test cleanup completed');
    }

    async run() {
        logger.info('🧪 Starting Epic 3 Integration Test Suite...');
        
        try {
            await this.setup();

            // Run all integration tests
            await this.runTest('Database Schema Validation', () => this.testDatabaseSchema());
            await this.runTest('Risk Scoring Engine', () => this.testRiskScoringEngine());
            await this.runTest('Alert Manager', () => this.testAlertManager());
            await this.runTest('Compliance Monitor', () => this.testComplianceMonitor());
            await this.runTest('Notification Routes', () => this.testNotificationRoutes());
            await this.runTest('Compliance Routes', () => this.testComplianceRoutes());
            await this.runTest('Dashboard Views', () => this.testDashboardViews());
            await this.runTest('Complete Workflow', () => this.testCompleteWorkflow());

            await this.cleanup();

        } catch (error) {
            logger.error('Test setup/cleanup failed:', error);
            this.testResults.failed++;
        }

        // Print results
        logger.info('\n=================================');
        logger.info('Epic 3 Integration Test Results');
        logger.info('=================================');
        logger.info(`Total Tests: ${this.testResults.passed + this.testResults.failed}`);
        logger.info(`Passed: ${this.testResults.passed}`);
        logger.info(`Failed: ${this.testResults.failed}`);
        logger.info(`Success Rate: ${((this.testResults.passed / (this.testResults.passed + this.testResults.failed)) * 100).toFixed(1)}%`);

        if (this.testResults.failed > 0) {
            logger.info('\nFailed Tests:');
            this.testResults.tests
                .filter(t => t.status === 'FAILED')
                .forEach(t => {
                    logger.error(`  ❌ ${t.name}: ${t.error}`);
                });
        }

        logger.info('\n=================================');
        
        return this.testResults.failed === 0;
    }
}

// Run the integration test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const test = new Epic3IntegrationTest();
    test.run()
        .then(success => {
            if (success) {
                logger.info('🎉 All integration tests passed!');
                process.exit(0);
            } else {
                logger.error('💥 Some integration tests failed!');
                process.exit(1);
            }
        })
        .catch(error => {
            logger.error('Fatal error running integration tests:', error);
            process.exit(1);
        });
}