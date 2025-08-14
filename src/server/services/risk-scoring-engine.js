import { LoggerService } from './logger-service.js';

export class RiskScoringEngine {
    constructor(database, afipClient) {
        this.database = database;
        this.afipClient = afipClient;
        this.logger = LoggerService.createLogger('RiskScoringEngine');
        
        // Pesos para el cálculo de riesgo según la épica
        this.weights = {
            historicCompliance: 0.40,   // 40% - Histórico de compliance
            currentAfipStatus: 0.35,    // 35% - Estado actual AFIP
            predictivePatterns: 0.25    // 25% - Patrones predictivos
        };
        
        // Factores de ajuste
        this.adjustmentFactors = {
            industry: {
                'Comercio': 1.0,
                'Servicios': 1.1,
                'Industria': 0.9,
                'Construcción': 1.2,
                'Agropecuario': 1.0,
                'default': 1.0
            },
            size: {
                'small': 1.1,
                'medium': 1.0,
                'large': 0.9
            }
        };
    }

    /**
     * Calcula el risk score para un CUIT
     * Implementa el algoritmo descrito en la épica
     */
    async calculateRiskScore(cuit, currentData = null) {
        try {
            this.logger.debug(`Calculando risk score para ${cuit}`);
            
            // Obtener datos actuales si no se proporcionaron
            if (!currentData) {
                currentData = await this.getCurrentComplianceData(cuit);
            }
            
            // Calcular componentes del score
            const historicScore = await this.calculateHistoricCompliance(cuit);
            const currentScore = await this.calculateCurrentAfipStatus(cuit, currentData);
            const predictiveScore = await this.calculatePredictivePatterns(cuit);
            
            // Calcular score base según la fórmula de la épica
            const baseScore = (
                historicScore * this.weights.historicCompliance +
                currentScore * this.weights.currentAfipStatus +
                predictiveScore * this.weights.predictivePatterns
            );
            
            // Aplicar factores de ajuste
            const adjustmentFactor = await this.calculateAdjustmentFactors(cuit);
            const finalScore = Math.min(1.0, Math.max(0.0, baseScore * adjustmentFactor));
            
            // Guardar factores de riesgo en BD
            await this.saveRiskFactors(cuit, {
                historic_compliance: historicScore,
                current_afip_status: currentScore,
                predictive_patterns: predictiveScore,
                adjustment_factor: adjustmentFactor,
                final_score: finalScore
            });
            
            this.logger.debug(`Risk score calculado para ${cuit}: ${finalScore.toFixed(3)}`, {
                historic: historicScore,
                current: currentScore,
                predictive: predictiveScore,
                adjustment: adjustmentFactor
            });
            
            return finalScore;
            
        } catch (error) {
            this.logger.error(`Error calculando risk score para ${cuit}:`, error);
            // Retornar score neutro en caso de error
            return 0.50;
        }
    }

    /**
     * Calcula el componente de compliance histórico (40%)
     */
    async calculateHistoricCompliance(cuit) {
        try {
            // Obtener historial de compliance de los últimos 12 meses
            const history = await this.database.all(`
                SELECT overall_status, score, check_date,
                       json_extract(data, '$.alerts') as alerts_data
                FROM compliance_results 
                WHERE cuit = ? 
                AND check_date >= datetime('now', '-12 months')
                ORDER BY check_date DESC
            `, [cuit]);

            if (history.length === 0) {
                // No hay historial, asumir score neutro
                return 0.50;
            }

            // Calcular métricas históricas
            let totalScore = 0;
            let vencimientosPerdidos = 0;
            let correctivesCount = 0;
            let tiempoResolucion = [];

            for (const record of history) {
                // Score promedio
                totalScore += record.score || 0;
                
                // Contar vencimientos perdidos y correcciones
                if (record.alerts_data) {
                    try {
                        const alerts = JSON.parse(record.alerts_data);
                        vencimientosPerdidos += alerts.filter(a => 
                            a.type === 'missing_vat_declarations' || 
                            a.type === 'missing_income_tax_declarations'
                        ).length;
                        
                        correctivesCount += alerts.filter(a => 
                            a.type === 'late_tax_returns'
                        ).length;
                    } catch (e) {
                        // Ignorar errores de parsing
                    }
                }
            }

            const avgScore = totalScore / history.length;
            const vencimientosRate = vencimientosPerdidos / history.length;
            const correctivesRate = correctivesCount / history.length;

            // Calcular score histórico
            let historicScore = avgScore / 100; // Normalizar a 0-1
            
            // Penalizar por vencimientos perdidos
            historicScore -= vencimientosRate * 0.3;
            
            // Penalizar por correcciones frecuentes
            historicScore -= correctivesRate * 0.2;
            
            // Asegurar que esté en rango válido
            return Math.min(1.0, Math.max(0.0, historicScore));
            
        } catch (error) {
            this.logger.error(`Error calculando compliance histórico para ${cuit}:`, error);
            return 0.50;
        }
    }

    /**
     * Calcula el componente de estado actual AFIP (35%)
     */
    async calculateCurrentAfipStatus(cuit, currentData) {
        try {
            let currentScore = 0.0;
            let checks = 0;

            // Verificar estado fiscal
            if (currentData.checks?.fiscal_status) {
                const fiscal = currentData.checks.fiscal_status;
                if (fiscal.active) {
                    currentScore += 1.0;
                } else {
                    currentScore += 0.0; // Penalización máxima si está inactivo
                }
                checks++;
            }

            // Verificar estado IVA
            if (currentData.checks?.vat_registration) {
                const vat = currentData.checks.vat_registration;
                if (vat.registered) {
                    currentScore += 0.8; // Base por estar registrado
                    
                    // Bonus por categoría favorable
                    if (vat.category === 'responsable_inscripto') {
                        currentScore += 0.2;
                    }
                } else {
                    currentScore += 0.0;
                }
                checks++;
            }

            // Verificar información del contribuyente
            if (currentData.checks?.taxpayer_info) {
                const taxpayer = currentData.checks.taxpayer_info;
                
                // Verificar categorías activas
                if (taxpayer.categories && taxpayer.categories.length > 0) {
                    currentScore += 0.6;
                    
                    // Bonus por tener múltiples categorías bien configuradas
                    if (taxpayer.categories.length > 1) {
                        currentScore += 0.2;
                    }
                } else {
                    currentScore += 0.0;
                }
                checks++;
            }

            // Normalizar por número de checks realizados
            if (checks === 0) {
                return 0.50; // Score neutro si no hay datos
            }

            const normalizedScore = currentScore / checks;
            return Math.min(1.0, Math.max(0.0, normalizedScore));
            
        } catch (error) {
            this.logger.error(`Error calculando estado AFIP actual para ${cuit}:`, error);
            return 0.50;
        }
    }

    /**
     * Calcula el componente de patrones predictivos (25%)
     */
    async calculatePredictivePatterns(cuit) {
        try {
            // Obtener datos para análisis de patrones
            const recentChecks = await this.database.all(`
                SELECT check_date, score, overall_status
                FROM compliance_results 
                WHERE cuit = ? 
                AND check_date >= datetime('now', '-6 months')
                ORDER BY check_date ASC
            `, [cuit]);

            if (recentChecks.length < 2) {
                return 0.50; // No hay suficientes datos para patrones
            }

            // Analizar tendencias
            const trend = this.analyzeTrend(recentChecks);
            const seasonality = this.analyzeSeasonality(recentChecks);
            const proximity = await this.analyzeDeadlineProximity(cuit);

            // Calcular score predictivo
            let predictiveScore = 0.50; // Base neutro

            // Ajustar por tendencia
            if (trend.direction === 'improving') {
                predictiveScore += 0.2 * trend.strength;
            } else if (trend.direction === 'degrading') {
                predictiveScore -= 0.3 * trend.strength;
            }

            // Ajustar por estacionalidad
            predictiveScore += seasonality * 0.1;

            // Ajustar por proximidad a vencimientos
            predictiveScore -= proximity * 0.2;

            return Math.min(1.0, Math.max(0.0, predictiveScore));
            
        } catch (error) {
            this.logger.error(`Error calculando patrones predictivos para ${cuit}:`, error);
            return 0.50;
        }
    }

    /**
     * Analiza tendencias en los scores históricos
     */
    analyzeTrend(checks) {
        if (checks.length < 3) {
            return { direction: 'stable', strength: 0 };
        }

        const scores = checks.map(c => c.score || 0);
        const n = scores.length;
        
        // Calcular regresión lineal simple
        let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
        
        for (let i = 0; i < n; i++) {
            sumX += i;
            sumY += scores[i];
            sumXY += i * scores[i];
            sumXX += i * i;
        }
        
        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        const strength = Math.abs(slope) / 100; // Normalizar
        
        return {
            direction: slope > 1 ? 'improving' : slope < -1 ? 'degrading' : 'stable',
            strength: Math.min(1.0, strength)
        };
    }

    /**
     * Analiza patrones estacionales
     */
    analyzeSeasonality(checks) {
        // Análisis simple: verificar si hay patrones por mes
        const currentMonth = new Date().getMonth();
        const monthlyScores = {};
        
        for (const check of checks) {
            const month = new Date(check.check_date).getMonth();
            if (!monthlyScores[month]) {
                monthlyScores[month] = [];
            }
            monthlyScores[month].push(check.score || 0);
        }
        
        // Calcular score promedio para el mes actual
        const currentMonthScores = monthlyScores[currentMonth];
        if (!currentMonthScores || currentMonthScores.length === 0) {
            return 0;
        }
        
        const currentMonthAvg = currentMonthScores.reduce((a, b) => a + b, 0) / currentMonthScores.length;
        const overallAvg = checks.reduce((sum, check) => sum + (check.score || 0), 0) / checks.length;
        
        // Retornar diferencia normalizada
        return (currentMonthAvg - overallAvg) / 100;
    }

    /**
     * Analiza proximidad a vencimientos
     */
    async analyzeDeadlineProximity(cuit) {
        try {
            // Obtener próximos vencimientos (simulado)
            const today = new Date();
            const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            
            // En un sistema real, esto consultaría vencimientos reales de AFIP
            const daysToNextDeadline = Math.floor((nextMonth - today) / (1000 * 60 * 60 * 24));
            
            // Calcular factor de proximidad (más cerca = mayor riesgo)
            if (daysToNextDeadline <= 5) return 0.9;  // Muy próximo
            if (daysToNextDeadline <= 10) return 0.6; // Próximo
            if (daysToNextDeadline <= 20) return 0.3; // Moderado
            return 0.1; // Lejano
            
        } catch (error) {
            this.logger.error(`Error analizando proximidad de vencimientos para ${cuit}:`, error);
            return 0.1;
        }
    }

    /**
     * Calcula factores de ajuste basados en industria y tamaño
     */
    async calculateAdjustmentFactors(cuit) {
        try {
            // Obtener información del contribuyente
            const contributor = await this.database.get(`
                SELECT category, business_name 
                FROM contributors 
                WHERE cuit = ? AND deleted_at IS NULL
            `, [cuit]);

            let adjustmentFactor = 1.0;

            // Ajuste por industria/categoría
            if (contributor?.category) {
                const industryFactor = this.adjustmentFactors.industry[contributor.category] || 
                                     this.adjustmentFactors.industry.default;
                adjustmentFactor *= industryFactor;
            }

            // Ajuste por tamaño (estimado por nombre de empresa)
            const sizeFactor = this.estimateCompanySize(contributor?.business_name || '');
            adjustmentFactor *= this.adjustmentFactors.size[sizeFactor];

            // Limitar factor de ajuste a un rango razonable
            return Math.min(1.3, Math.max(0.7, adjustmentFactor));
            
        } catch (error) {
            this.logger.error(`Error calculando factores de ajuste para ${cuit}:`, error);
            return 1.0;
        }
    }

    /**
     * Estima el tamaño de la empresa basado en el nombre
     */
    estimateCompanySize(businessName) {
        const name = businessName.toLowerCase();
        
        // Indicadores de empresa grande
        if (name.includes('s.a.') || name.includes('sociedad anonima') || 
            name.includes('corporation') || name.includes('group')) {
            return 'large';
        }
        
        // Indicadores de empresa mediana
        if (name.includes('s.r.l.') || name.includes('sociedad') || 
            name.includes('ltda') || name.includes('empresa')) {
            return 'medium';
        }
        
        // Por defecto, asumir pequeña
        return 'small';
    }

    /**
     * Guarda los factores de riesgo calculados en la base de datos
     */
    async saveRiskFactors(cuit, factors) {
        try {
            // Limpiar factores antiguos (mantener solo los últimos 30 días)
            await this.database.run(`
                DELETE FROM risk_factors 
                WHERE cuit = ? AND created_at < datetime('now', '-30 days')
            `, [cuit]);

            // Insertar nuevos factores
            const factorTypes = [
                { type: 'historical_compliance', value: factors.historic_compliance, weight: this.weights.historicCompliance },
                { type: 'current_afip_status', value: factors.current_afip_status, weight: this.weights.currentAfipStatus },
                { type: 'predictive_patterns', value: factors.predictive_patterns, weight: this.weights.predictivePatterns }
            ];

            for (const factor of factorTypes) {
                await this.database.run(`
                    INSERT INTO risk_factors (
                        cuit, factor_type, factor_value, weight, 
                        auto_calculated, calculation_source
                    ) VALUES (?, ?, ?, ?, 1, 'ml_engine')
                `, [
                    cuit,
                    factor.type,
                    JSON.stringify({
                        value: factor.value,
                        calculated_at: new Date().toISOString()
                    }),
                    factor.weight
                ]);
            }

            // Insertar factor de ajuste
            await this.database.run(`
                INSERT INTO risk_factors (
                    cuit, factor_type, factor_value, weight,
                    auto_calculated, calculation_source
                ) VALUES (?, 'adjustment_factor', ?, 1.0, 1, 'rule_based')
            `, [
                cuit,
                JSON.stringify({
                    value: factors.adjustment_factor,
                    final_score: factors.final_score,
                    calculated_at: new Date().toISOString()
                })
            ]);

        } catch (error) {
            this.logger.error(`Error guardando factores de riesgo para ${cuit}:`, error);
        }
    }

    /**
     * Obtiene el historial de risk scores para un CUIT
     */
    async getRiskScoreHistory(cuit, days = 30) {
        try {
            const history = await this.database.all(`
                SELECT 
                    rf.created_at,
                    rf.factor_value,
                    cm.risk_score,
                    cm.status
                FROM risk_factors rf
                LEFT JOIN compliance_monitoring cm ON rf.cuit = cm.cuit
                WHERE rf.cuit = ? 
                AND rf.factor_type = 'adjustment_factor'
                AND rf.created_at >= datetime('now', '-${days} days')
                ORDER BY rf.created_at DESC
            `, [cuit]);

            return history.map(record => {
                try {
                    const factorData = JSON.parse(record.factor_value);
                    return {
                        date: record.created_at,
                        risk_score: record.risk_score || factorData.final_score,
                        status: record.status
                    };
                } catch (e) {
                    return null;
                }
            }).filter(item => item !== null);

        } catch (error) {
            this.logger.error(`Error obteniendo historial de risk score para ${cuit}:`, error);
            return [];
        }
    }

    /**
     * Obtiene datos actuales de compliance
     */
    async getCurrentComplianceData(cuit) {
        // En un sistema real, esto haría llamadas a AFIP
        // Por ahora, simular datos básicos
        return {
            cuit,
            timestamp: new Date().toISOString(),
            checks: {
                fiscal_status: { active: true, category: 'responsable_inscripto' },
                vat_registration: { registered: true, category: 'responsable_inscripto' },
                taxpayer_info: { categories: ['iva', 'ganancias'] }
            }
        };
    }

    /**
     * Recalcula risk scores para todos los CUITs monitoreados
     */
    async recalculateAllRiskScores() {
        try {
            this.logger.info('Iniciando recálculo masivo de risk scores');
            
            const cuits = await this.database.all(`
                SELECT DISTINCT cuit 
                FROM compliance_monitoring 
                WHERE cuit IN (
                    SELECT cuit FROM compliance_monitoring_config 
                    WHERE enabled = 1
                )
            `);

            let processed = 0;
            let errors = 0;

            for (const { cuit } of cuits) {
                try {
                    const riskScore = await this.calculateRiskScore(cuit);
                    
                    await this.database.run(`
                        UPDATE compliance_monitoring 
                        SET risk_score = ?, updated_at = CURRENT_TIMESTAMP
                        WHERE cuit = ?
                    `, [riskScore, cuit]);
                    
                    processed++;
                } catch (error) {
                    this.logger.error(`Error recalculando risk score para ${cuit}:`, error);
                    errors++;
                }
            }

            this.logger.info(`Recálculo completado: ${processed} procesados, ${errors} errores`);
            
            return { processed, errors };

        } catch (error) {
            this.logger.error('Error en recálculo masivo de risk scores:', error);
            throw error;
        }
    }

    /**
     * Obtiene métricas del motor de scoring
     */
    getMetrics() {
        return {
            weights: this.weights,
            adjustmentFactors: this.adjustmentFactors
        };
    }
}