import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { setupComplianceHistoryRoutes } from '../../../src/server/routes/compliance-history.js';

// Mock de la base de datos
const mockDatabase = {
    all: jest.fn(),
    get: jest.fn(),
    run: jest.fn()
};

// Crear app de prueba
function createTestApp() {
    const app = express();
    app.use(express.json());
    
    const router = setupComplianceHistoryRoutes(mockDatabase);
    app.use('/api/compliance', router);
    
    return app;
}

describe('Compliance History Routes', () => {
    let app;
    
    beforeEach(() => {
        app = createTestApp();
        jest.clearAllMocks();
    });
    
    afterEach(() => {
        jest.resetAllMocks();
    });

    describe('GET /api/compliance/history/:cuit', () => {
        const validCuit = '20-12345678-9';
        const invalidCuit = '123456789';

        it('should return compliance history for valid CUIT', async () => {
            const mockEvents = [
                {
                    type: 'alert',
                    event_id: 1,
                    timestamp: '2025-08-15T10:00:00Z',
                    severity: 'high',
                    title: 'Vencimiento próximo',
                    subtype: 'deadline_approaching',
                    predicted_date: null,
                    confidence_level: null,
                    details: '{"alertType": "deadline", "daysUntilDue": 3}',
                    resolved: 0,
                    acknowledged: 0
                },
                {
                    type: 'status_change',
                    event_id: 2,
                    timestamp: '2025-08-14T15:30:00Z',
                    severity: 'medium',
                    title: 'Status de compliance actualizado a: fair',
                    subtype: 'fair',
                    predicted_date: null,
                    confidence_level: null,
                    details: '{"previous_status": "good", "new_status": "fair", "risk_score": 5.2}',
                    resolved: 0,
                    acknowledged: 0
                }
            ];

            const mockSummary = {
                currentRiskScore: 4.2,
                currentStatus: 'fair',
                avgRiskScore: 5.1,
                totalAlerts: 12,
                complianceRate: 94.5
            };

            mockDatabase.all.mockResolvedValueOnce(mockEvents);
            mockDatabase.get
                .mockResolvedValueOnce({ total: 50 }) // total count
                .mockResolvedValueOnce(mockSummary); // summary

            const response = await request(app)
                .get(`/api/compliance/history/${validCuit}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.cuit).toBe(validCuit);
            expect(response.body.data.totalEvents).toBe(50);
            expect(response.body.data.events).toHaveLength(2);
            expect(response.body.data.events[0]).toMatchObject({
                type: 'alert',
                severity: 'high',
                title: 'Vencimiento próximo',
                details: { alertType: 'deadline', daysUntilDue: 3 },
                metadata: {
                    eventType: 'alert',
                    severity: 'high',
                    resolved: false,
                    acknowledged: false
                }
            });
            expect(response.body.data.summary).toMatchObject(mockSummary);
        });

        it('should return 400 for invalid CUIT format', async () => {
            const response = await request(app)
                .get(`/api/compliance/history/${invalidCuit}`)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('Formato de CUIT inválido');
        });

        it('should handle pagination parameters', async () => {
            mockDatabase.all.mockResolvedValueOnce([]);
            mockDatabase.get
                .mockResolvedValueOnce({ total: 0 })
                .mockResolvedValueOnce({
                    currentRiskScore: 0,
                    currentStatus: 'unknown',
                    avgRiskScore: 0,
                    totalAlerts: 0,
                    complianceRate: 0
                });

            const response = await request(app)
                .get(`/api/compliance/history/${validCuit}`)
                .query({ page: 2, pageSize: 25 })
                .expect(200);

            expect(response.body.data.page).toBe(2);
            expect(response.body.data.pageSize).toBe(25);
        });

        it('should handle event type filtering', async () => {
            mockDatabase.all.mockResolvedValueOnce([]);
            mockDatabase.get
                .mockResolvedValueOnce({ total: 0 })
                .mockResolvedValueOnce({
                    currentRiskScore: 0,
                    currentStatus: 'unknown',
                    avgRiskScore: 0,
                    totalAlerts: 0,
                    complianceRate: 0
                });

            await request(app)
                .get(`/api/compliance/history/${validCuit}`)
                .query({ eventType: 'alert', severity: 'high' })
                .expect(200);

            // Verificar que se llamó con los parámetros correctos
            expect(mockDatabase.all).toHaveBeenCalled();
        });

        it('should handle database errors gracefully', async () => {
            mockDatabase.all.mockRejectedValueOnce(new Error('Database connection failed'));

            const response = await request(app)
                .get(`/api/compliance/history/${validCuit}`)
                .expect(500);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('Error interno del servidor');
        });
    });

    describe('GET /api/compliance/history/:cuit/trends', () => {
        const validCuit = '20-12345678-9';

        it('should return trend analysis for valid CUIT', async () => {
            const mockRiskScoreEvolution = [
                { date: '2025-08-01', avgScore: 4.2, minScore: 3.8, maxScore: 4.5, updateCount: 3 },
                { date: '2025-08-02', avgScore: 4.8, minScore: 4.1, maxScore: 5.2, updateCount: 2 }
            ];

            const mockComplianceStatusTrend = [
                { date: '2025-08-01', status: 'good', score: 85, checkCount: 1 },
                { date: '2025-08-02', status: 'fair', score: 75, checkCount: 1 }
            ];

            const mockAlertFrequency = [
                { alert_type: 'deadline_approaching', severity: 'high', count: 5, firstAlert: '2025-08-01', lastAlert: '2025-08-15' },
                { alert_type: 'missing_vat_declarations', severity: 'medium', count: 3, firstAlert: '2025-08-05', lastAlert: '2025-08-12' }
            ];

            const mockSeasonalPatterns = [
                { dayOfWeek: 'Lunes', alertCount: 8, avgSeverityScore: 2.5 },
                { dayOfWeek: 'Martes', alertCount: 12, avgSeverityScore: 3.1 }
            ];

            mockDatabase.all
                .mockResolvedValueOnce(mockRiskScoreEvolution)
                .mockResolvedValueOnce(mockComplianceStatusTrend)
                .mockResolvedValueOnce(mockAlertFrequency)
                .mockResolvedValueOnce(mockSeasonalPatterns);

            const response = await request(app)
                .get(`/api/compliance/history/${validCuit}/trends`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.cuit).toBe(validCuit);
            expect(response.body.data.timeRange).toBe('30d');
            expect(response.body.data.trends).toMatchObject({
                riskScoreEvolution: mockRiskScoreEvolution,
                complianceStatusTrend: mockComplianceStatusTrend,
                alertFrequency: mockAlertFrequency,
                seasonalPatterns: mockSeasonalPatterns
            });
        });

        it('should handle different time ranges', async () => {
            mockDatabase.all
                .mockResolvedValueOnce([])
                .mockResolvedValueOnce([])
                .mockResolvedValueOnce([])
                .mockResolvedValueOnce([]);

            const response = await request(app)
                .get(`/api/compliance/history/${validCuit}/trends`)
                .query({ timeRange: '7d' })
                .expect(200);

            expect(response.body.data.timeRange).toBe('7d');
        });

        it('should return 400 for invalid CUIT format', async () => {
            const response = await request(app)
                .get('/api/compliance/history/invalid-cuit/trends')
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('Formato de CUIT inválido');
        });
    });

    describe('GET /api/compliance/history/:cuit/patterns', () => {
        const validCuit = '20-12345678-9';

        it('should return pattern analysis for valid CUIT', async () => {
            const mockRecurringIssues = [
                {
                    alert_type: 'deadline_approaching',
                    occurrences: 8,
                    firstOccurrence: '2025-07-01T10:00:00Z',
                    lastOccurrence: '2025-08-15T10:00:00Z',
                    avgResolutionTime: 2.5,
                    resolvedCount: 6,
                    resolutionRate: 75.0
                }
            ];

            const mockPerformanceTrend = {
                currentRiskScore: 4.2,
                initialRiskScore: 3.8,
                recent30DayAvg: 4.5,
                previous60DayAvg: 4.0,
                recentAlerts: 5,
                previousAlerts: 8
            };

            const mockPredictiveInsights = [
                {
                    alert_type: 'deadline_approaching',
                    avgDaysBetweenOccurrences: 15.5,
                    lastOccurrence: '2025-08-15T10:00:00Z',
                    predictedNextOccurrence: '2025-08-30T10:00:00Z',
                    historicalOccurrences: 8
                }
            ];

            mockDatabase.all
                .mockResolvedValueOnce(mockRecurringIssues)
                .mockResolvedValueOnce(mockPredictiveInsights);
            
            mockDatabase.get.mockResolvedValueOnce(mockPerformanceTrend);

            const response = await request(app)
                .get(`/api/compliance/history/${validCuit}/patterns`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.cuit).toBe(validCuit);
            expect(response.body.data.patterns).toMatchObject({
                recurringIssues: mockRecurringIssues,
                performanceTrend: mockPerformanceTrend,
                trendAnalysis: expect.objectContaining({
                    riskScoreTrend: expect.any(Number),
                    recent30DayTrend: expect.any(Number),
                    alertTrend: expect.any(Number),
                    overallTrend: expect.stringMatching(/^(improving|deteriorating|stable)$/)
                }),
                predictiveInsights: expect.arrayContaining([
                    expect.objectContaining({
                        alert_type: 'deadline_approaching',
                        daysUntilNext: expect.any(Number)
                    })
                ])
            });
        });

        it('should calculate trend analysis correctly', async () => {
            const mockPerformanceTrend = {
                currentRiskScore: 6.0,
                initialRiskScore: 4.0,
                recent30DayAvg: 7.0,
                previous60DayAvg: 5.0,
                recentAlerts: 8,
                previousAlerts: 3
            };

            mockDatabase.all
                .mockResolvedValueOnce([]) // recurring issues
                .mockResolvedValueOnce([]); // predictive insights
            
            mockDatabase.get.mockResolvedValueOnce(mockPerformanceTrend);

            const response = await request(app)
                .get(`/api/compliance/history/${validCuit}/patterns`)
                .expect(200);

            expect(response.body.data.patterns.trendAnalysis.overallTrend).toBe('deteriorating');
            expect(response.body.data.patterns.trendAnalysis.riskScoreTrend).toBe(2.0);
            expect(response.body.data.patterns.trendAnalysis.recent30DayTrend).toBe(2.0);
            expect(response.body.data.patterns.trendAnalysis.alertTrend).toBe(5);
        });

        it('should return 400 for invalid CUIT format', async () => {
            const response = await request(app)
                .get('/api/compliance/history/invalid-cuit/patterns')
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('Formato de CUIT inválido');
        });

        it('should handle database errors gracefully', async () => {
            mockDatabase.all.mockRejectedValueOnce(new Error('Database error'));

            const response = await request(app)
                .get(`/api/compliance/history/${validCuit}/patterns`)
                .expect(500);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('Error interno del servidor');
        });
    });

    describe('Error Handling', () => {
        it('should handle JSON parsing errors in event details', async () => {
            const mockEventsWithInvalidJson = [
                {
                    type: 'alert',
                    event_id: 1,
                    timestamp: '2025-08-15T10:00:00Z',
                    severity: 'high',
                    title: 'Test alert',
                    subtype: 'test',
                    predicted_date: null,
                    confidence_level: null,
                    details: 'invalid json', // Invalid JSON
                    resolved: 0,
                    acknowledged: 0
                }
            ];

            mockDatabase.all.mockResolvedValueOnce(mockEventsWithInvalidJson);
            mockDatabase.get
                .mockResolvedValueOnce({ total: 1 })
                .mockResolvedValueOnce({
                    currentRiskScore: 0,
                    currentStatus: 'unknown',
                    avgRiskScore: 0,
                    totalAlerts: 0,
                    complianceRate: 0
                });

            const response = await request(app)
                .get('/api/compliance/history/20-12345678-9')
                .expect(200);

            // Should handle the invalid JSON gracefully
            expect(response.body.data.events[0].details).toEqual({});
        });

        it('should handle null database responses', async () => {
            mockDatabase.all.mockResolvedValueOnce([]);
            mockDatabase.get
                .mockResolvedValueOnce({ total: 0 })
                .mockResolvedValueOnce(null); // null summary

            const response = await request(app)
                .get('/api/compliance/history/20-12345678-9')
                .expect(200);

            expect(response.body.data.summary).toMatchObject({
                currentRiskScore: 0,
                currentStatus: 'unknown',
                avgRiskScore: 0,
                totalAlerts: 0,
                complianceRate: 0
            });
        });
    });
});