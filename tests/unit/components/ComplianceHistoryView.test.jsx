import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';
import '@testing-library/jest-dom';
import ComplianceHistoryView from '../../../src/client/components/compliance/ComplianceHistoryView.jsx';
import { complianceHistoryService } from '../../../src/client/services/complianceHistoryService.js';

// Mock del servicio
jest.mock('../../../src/client/services/complianceHistoryService.js', () => ({
    complianceHistoryService: {
        getComplianceHistory: jest.fn(),
        getComplianceTrends: jest.fn(),
        getCompliancePatterns: jest.fn(),
        formatComplianceEvents: jest.fn(events => events),
        getSeverityColor: jest.fn(() => 'text-gray-600 bg-gray-50 border-gray-200'),
        getEventTypeIcon: jest.fn(() => 'info-circle'),
        downloadCSV: jest.fn()
    }
}));

// Mock de Chart.js
jest.mock('chart.js', () => ({
    Chart: {
        register: jest.fn()
    },
    CategoryScale: {},
    LinearScale: {},
    PointElement: {},
    LineElement: {},
    BarElement: {},
    Title: {},
    Tooltip: {},
    Legend: {},
    ArcElement: {},
    TimeScale: {},
    RadialLinearScale: {}
}));

jest.mock('react-chartjs-2', () => ({
    Line: ({ data, options }) => <div data-testid="line-chart" data-chart-data={JSON.stringify(data)} />,
    Bar: ({ data, options }) => <div data-testid="bar-chart" data-chart-data={JSON.stringify(data)} />,
    Doughnut: ({ data, options }) => <div data-testid="doughnut-chart" data-chart-data={JSON.stringify(data)} />,
    Radar: ({ data, options }) => <div data-testid="radar-chart" data-chart-data={JSON.stringify(data)} />
}));

describe('ComplianceHistoryView', () => {
    const defaultProps = {
        cuit: '20-12345678-9',
        businessName: 'Test Company',
        onClose: jest.fn()
    };

    const mockHistoryData = {
        data: {
            cuit: '20-12345678-9',
            totalEvents: 10,
            page: 1,
            pageSize: 50,
            events: [
                {
                    id: '1',
                    type: 'alert',
                    severity: 'high',
                    title: 'Test Alert',
                    timestamp: '2025-08-15T10:00:00Z',
                    details: {},
                    metadata: {
                        resolved: false,
                        acknowledged: false
                    }
                }
            ],
            summary: {
                currentRiskScore: 4.2,
                currentStatus: 'fair',
                avgRiskScore: 5.1,
                totalAlerts: 12,
                complianceRate: 94.5
            }
        }
    };

    const mockTrendsData = {
        data: {
            cuit: '20-12345678-9',
            timeRange: '30d',
            trends: {
                riskScoreEvolution: [
                    { date: '2025-08-01', avgScore: 4.2, minScore: 3.8, maxScore: 4.5 }
                ],
                complianceStatusTrend: [],
                alertFrequency: [],
                seasonalPatterns: []
            }
        }
    };

    const mockPatternsData = {
        data: {
            cuit: '20-12345678-9',
            patterns: {
                recurringIssues: [],
                performanceTrend: {
                    currentRiskScore: 4.2,
                    initialRiskScore: 3.8,
                    recent30DayAvg: 4.5,
                    previous60DayAvg: 4.0,
                    recentAlerts: 5,
                    previousAlerts: 8
                },
                trendAnalysis: {
                    riskScoreTrend: 0.4,
                    recent30DayTrend: 0.5,
                    alertTrend: -3,
                    overallTrend: 'improving'
                },
                predictiveInsights: []
            }
        }
    };

    beforeEach(() => {
        jest.clearAllMocks();
        complianceHistoryService.getComplianceHistory.mockResolvedValue(mockHistoryData);
        complianceHistoryService.getComplianceTrends.mockResolvedValue(mockTrendsData);
        complianceHistoryService.getCompliancePatterns.mockResolvedValue(mockPatternsData);
    });

    describe('Rendering', () => {
        it('should render modal with correct title', () => {
            render(<ComplianceHistoryView {...defaultProps} />);
            
            expect(screen.getByText('Historial de Compliance')).toBeInTheDocument();
            expect(screen.getByText(/CUIT: 20-12345678-9 - Test Company/)).toBeInTheDocument();
        });

        it('should render navigation tabs', () => {
            render(<ComplianceHistoryView {...defaultProps} />);
            
            expect(screen.getByRole('tab', { name: /Timeline de Eventos/ })).toBeInTheDocument();
            expect(screen.getByRole('tab', { name: /Análisis de Tendencias/ })).toBeInTheDocument();
            expect(screen.getByRole('tab', { name: /Patrones y Predicciones/ })).toBeInTheDocument();
        });

        it('should have timeline tab active by default', () => {
            render(<ComplianceHistoryView {...defaultProps} />);
            
            const timelineTab = screen.getByRole('tab', { name: /Timeline de Eventos/ });
            expect(timelineTab).toHaveAttribute('aria-selected', 'true');
        });

        it('should render close button with proper accessibility', () => {
            render(<ComplianceHistoryView {...defaultProps} />);
            
            const closeButton = screen.getByLabelText(/Cerrar ventana de historial de compliance/);
            expect(closeButton).toBeInTheDocument();
            expect(closeButton).toHaveClass('focus:outline-none', 'focus:ring-2', 'focus:ring-blue-500');
        });
    });

    describe('Tab Navigation', () => {
        it('should switch to trends tab when clicked', async () => {
            render(<ComplianceHistoryView {...defaultProps} />);
            
            const trendsTab = screen.getByRole('tab', { name: /Análisis de Tendencias/ });
            fireEvent.click(trendsTab);
            
            await waitFor(() => {
                expect(trendsTab).toHaveAttribute('aria-selected', 'true');
            });
            
            expect(complianceHistoryService.getComplianceTrends).toHaveBeenCalledWith('20-12345678-9', '30d');
        });

        it('should switch to patterns tab when clicked', async () => {
            render(<ComplianceHistoryView {...defaultProps} />);
            
            const patternsTab = screen.getByRole('tab', { name: /Patrones y Predicciones/ });
            fireEvent.click(patternsTab);
            
            await waitFor(() => {
                expect(patternsTab).toHaveAttribute('aria-selected', 'true');
            });
            
            expect(complianceHistoryService.getCompliancePatterns).toHaveBeenCalledWith('20-12345678-9');
        });

        it('should have proper tabpanel IDs and ARIA controls', () => {
            render(<ComplianceHistoryView {...defaultProps} />);
            
            const timelineTab = screen.getByRole('tab', { name: /Timeline de Eventos/ });
            const trendsTab = screen.getByRole('tab', { name: /Análisis de Tendencias/ });
            const patternsTab = screen.getByRole('tab', { name: /Patrones y Predicciones/ });
            
            expect(timelineTab).toHaveAttribute('aria-controls', 'panel-timeline');
            expect(trendsTab).toHaveAttribute('aria-controls', 'panel-trends');
            expect(patternsTab).toHaveAttribute('aria-controls', 'panel-patterns');
        });
    });

    describe('Loading States', () => {
        it('should show loading spinner while loading', () => {
            // Mock para que la promesa no se resuelva inmediatamente
            complianceHistoryService.getComplianceHistory.mockImplementation(() => new Promise(() => {}));
            
            render(<ComplianceHistoryView {...defaultProps} />);
            
            expect(screen.getByText('Cargando datos...')).toBeInTheDocument();
            expect(screen.getByRole('status')).toBeInTheDocument(); // spinner
        });
    });

    describe('Error Handling', () => {
        it('should display error message when API fails', async () => {
            const errorMessage = 'Failed to fetch data';
            complianceHistoryService.getComplianceHistory.mockRejectedValue(new Error(errorMessage));
            
            render(<ComplianceHistoryView {...defaultProps} />);
            
            await waitFor(() => {
                expect(screen.getByText(/Error cargando historial de compliance/)).toBeInTheDocument();
            });
        });

        it('should clear error when switching tabs', async () => {
            // Primera llamada falla
            complianceHistoryService.getComplianceHistory.mockRejectedValue(new Error('API Error'));
            // Segunda llamada (trends) funciona
            complianceHistoryService.getComplianceTrends.mockResolvedValue(mockTrendsData);
            
            render(<ComplianceHistoryView {...defaultProps} />);
            
            // Verificar que aparece el error
            await waitFor(() => {
                expect(screen.getByText(/Error cargando historial de compliance/)).toBeInTheDocument();
            });
            
            // Cambiar a trends tab
            const trendsTab = screen.getByRole('tab', { name: /Análisis de Tendencias/ });
            fireEvent.click(trendsTab);
            
            // El error debería desaparecer
            await waitFor(() => {
                expect(screen.queryByText(/Error cargando historial de compliance/)).not.toBeInTheDocument();
            });
        });
    });

    describe('Close Functionality', () => {
        it('should call onClose when close button is clicked', () => {
            render(<ComplianceHistoryView {...defaultProps} />);
            
            const closeButton = screen.getByLabelText(/Cerrar ventana de historial de compliance/);
            fireEvent.click(closeButton);
            
            expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
        });

        it('should call onClose when footer close button is clicked', async () => {
            render(<ComplianceHistoryView {...defaultProps} />);
            
            // Esperar a que los datos se carguen para que aparezca el footer
            await waitFor(() => {
                expect(complianceHistoryService.getComplianceHistory).toHaveBeenCalled();
            });
            
            const footerCloseButton = screen.getByRole('button', { name: /Cerrar$/i });
            fireEvent.click(footerCloseButton);
            
            expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
        });
    });

    describe('Accessibility', () => {
        it('should have proper ARIA attributes', () => {
            render(<ComplianceHistoryView {...defaultProps} />);
            
            // Verificar que los tabs tienen role="tab"
            const tabs = screen.getAllByRole('tab');
            expect(tabs).toHaveLength(3);
            
            tabs.forEach(tab => {
                expect(tab).toHaveAttribute('aria-selected');
                expect(tab).toHaveAttribute('aria-controls');
            });
        });

        it('should have focus management', () => {
            render(<ComplianceHistoryView {...defaultProps} />);
            
            const tabs = screen.getAllByRole('tab');
            tabs.forEach(tab => {
                expect(tab).toHaveClass('focus:outline-none', 'focus:ring-2');
            });
            
            const closeButton = screen.getByLabelText(/Cerrar ventana de historial de compliance/);
            expect(closeButton).toHaveClass('focus:outline-none', 'focus:ring-2');
        });

        it('should have proper emoji accessibility', () => {
            render(<ComplianceHistoryView {...defaultProps} />);
            
            // Verificar que los emojis tienen role="img" y aria-label
            const emojiElements = screen.getAllByRole('img');
            emojiElements.forEach(emoji => {
                expect(emoji).toHaveAttribute('aria-label');
            });
        });
    });

    describe('Data Loading', () => {
        it('should load history data on mount', async () => {
            render(<ComplianceHistoryView {...defaultProps} />);
            
            await waitFor(() => {
                expect(complianceHistoryService.getComplianceHistory).toHaveBeenCalledWith(
                    '20-12345678-9',
                    expect.objectContaining({
                        page: 1,
                        pageSize: 50
                    })
                );
            });
        });

        it('should display summary information when data loads', async () => {
            render(<ComplianceHistoryView {...defaultProps} />);
            
            await waitFor(() => {
                expect(screen.getByText('4.2')).toBeInTheDocument(); // currentRiskScore
                expect(screen.getByText('94.5%')).toBeInTheDocument(); // complianceRate
                expect(screen.getByText('12')).toBeInTheDocument(); // totalAlerts
                expect(screen.getByText('fair')).toBeInTheDocument(); // currentStatus
            });
        });
    });
});