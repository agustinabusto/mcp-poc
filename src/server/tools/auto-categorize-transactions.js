import { BaseTool } from './base-tool.js';
import OpenAI from 'openai';

export class AutoCategorizeTransactionsTool extends BaseTool {
    constructor(services) {
        const inputSchema = {
            type: 'object',
            properties: {
                transactions: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            id: { type: 'string' },
                            description: { type: 'string' },
                            amount: { type: 'number' },
                            date: { type: 'string' },
                            type: { type: 'string', enum: ['income', 'expense'] },
                            vendor: { type: 'string' },
                            accountNumber: { type: 'string' }
                        },
                        required: ['description', 'amount']
                    }
                },
                clientId: {
                    type: 'string',
                    description: 'ID del cliente para aplicar reglas personalizadas'
                },
                chartOfAccounts: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            code: { type: 'string' },
                            name: { type: 'string' },
                            type: { type: 'string' },
                            parent: { type: 'string' }
                        }
                    },
                    description: 'Plan de cuentas del cliente (opcional, se usará el estándar si no se provee)'
                },
                options: {
                    type: 'object',
                    properties: {
                        useAI: {
                            type: 'boolean',
                            default: true,
                            description: 'Usar IA para categorización inteligente'
                        },
                        confidenceThreshold: {
                            type: 'number',
                            minimum: 0,
                            maximum: 100,
                            default: 75,
                            description: 'Umbral de confianza para auto-categorización'
                        },
                        learnFromHistory: {
                            type: 'boolean',
                            default: true,
                            description: 'Aprender de categorizaciones previas del cliente'
                        },
                        applyRules: {
                            type: 'boolean',
                            default: true,
                            description: 'Aplicar reglas predefinidas antes de la IA'
                        }
                    }
                }
            },
            required: ['transactions']
        };

        super(
            'auto_categorize_transactions',
            'Categoriza automáticamente transacciones contables usando IA y reglas predefinidas',
            inputSchema,
            services
        );

        // Configurar OpenAI o Groq según configuración
        const useGroq = process.env.USE_GROQ_FOR_CATEGORIZATION === 'true';

        if (useGroq && services.groq) {
            this.aiClient = services.groq;
            this.aiModel = process.env.GROQ_CATEGORIZATION_MODEL || 'llama3-70b-8192';
            this.aiProvider = 'groq';
        } else {
            this.openai = new OpenAI({
                apiKey: services.config?.openai?.apiKey || process.env.OPENAI_API_KEY
            });
            this.aiModel = 'gpt-4';
            this.aiProvider = 'openai';
        }

        this.database = services.database;

        // Plan de cuentas estándar completo para Argentina
        this.standardChartOfAccounts = {
            // ACTIVOS
            '1.1.01': { name: 'Caja', type: 'asset', parent: '1.1' },
            '1.1.02': { name: 'Banco Cuenta Corriente', type: 'asset', parent: '1.1' },
            '1.1.03': { name: 'Banco Caja de Ahorro', type: 'asset', parent: '1.1' },
            '1.1.04': { name: 'Banco Moneda Extranjera', type: 'asset', parent: '1.1' },
            '1.1.05': { name: 'Fondo Fijo', type: 'asset', parent: '1.1' },
            '1.2.01': { name: 'Deudores por Ventas', type: 'asset', parent: '1.2' },
            '1.2.02': { name: 'Documentos a Cobrar', type: 'asset', parent: '1.2' },
            '1.2.03': { name: 'Deudores Varios', type: 'asset', parent: '1.2' },
            '1.2.04': { name: 'IVA Crédito Fiscal', type: 'asset', parent: '1.2' },
            '1.2.05': { name: 'Anticipos a Proveedores', type: 'asset', parent: '1.2' },
            '1.2.06': { name: 'Gastos Pagados por Adelantado', type: 'asset', parent: '1.2' },
            '1.3.01': { name: 'Mercaderías', type: 'asset', parent: '1.3' },
            '1.3.02': { name: 'Materias Primas', type: 'asset', parent: '1.3' },
            '1.3.03': { name: 'Productos en Proceso', type: 'asset', parent: '1.3' },
            '1.3.04': { name: 'Productos Terminados', type: 'asset', parent: '1.3' },
            '1.4.01': { name: 'Rodados', type: 'asset', parent: '1.4' },
            '1.4.02': { name: 'Muebles y Útiles', type: 'asset', parent: '1.4' },
            '1.4.03': { name: 'Inmuebles', type: 'asset', parent: '1.4' },
            '1.4.04': { name: 'Equipos de Computación', type: 'asset', parent: '1.4' },
            '1.4.05': { name: 'Maquinarias', type: 'asset', parent: '1.4' },
            '1.4.06': { name: 'Instalaciones', type: 'asset', parent: '1.4' },

            // PASIVOS
            '2.1.01': { name: 'Proveedores', type: 'liability', parent: '2.1' },
            '2.1.02': { name: 'Documentos a Pagar', type: 'liability', parent: '2.1' },
            '2.1.03': { name: 'Acreedores Varios', type: 'liability', parent: '2.1' },
            '2.2.01': { name: 'IVA Débito Fiscal', type: 'liability', parent: '2.2' },
            '2.2.02': { name: 'Retenciones AFIP por Pagar', type: 'liability', parent: '2.2' },
            '2.2.03': { name: 'Cargas Sociales a Pagar', type: 'liability', parent: '2.2' },
            '2.2.04': { name: 'Sueldos a Pagar', type: 'liability', parent: '2.2' },
            '2.2.05': { name: 'Vacaciones a Pagar', type: 'liability', parent: '2.2' },
            '2.2.06': { name: 'SAC a Pagar', type: 'liability', parent: '2.2' },
            '2.2.07': { name: 'Impuesto a las Ganancias', type: 'liability', parent: '2.2' },
            '2.2.08': { name: 'Ingresos Brutos', type: 'liability', parent: '2.2' },
            '2.2.09': { name: 'Tasas Municipales', type: 'liability', parent: '2.2' },
            '2.3.01': { name: 'Préstamos Bancarios', type: 'liability', parent: '2.3' },
            '2.3.02': { name: 'Obligaciones Negociables', type: 'liability', parent: '2.3' },

            // PATRIMONIO NETO
            '3.1.01': { name: 'Capital Social', type: 'equity', parent: '3.1' },
            '3.1.02': { name: 'Aportes Irrevocables', type: 'equity', parent: '3.1' },
            '3.2.01': { name: 'Reserva Legal', type: 'equity', parent: '3.2' },
            '3.2.02': { name: 'Reservas Facultativas', type: 'equity', parent: '3.2' },
            '3.3.01': { name: 'Resultado del Ejercicio', type: 'equity', parent: '3.3' },
            '3.3.02': { name: 'Resultados No Asignados', type: 'equity', parent: '3.3' },

            // INGRESOS
            '4.1.01': { name: 'Ventas', type: 'income', parent: '4.1' },
            '4.1.02': { name: 'Servicios', type: 'income', parent: '4.1' },
            '4.1.03': { name: 'Comisiones Ganadas', type: 'income', parent: '4.1' },
            '4.1.04': { name: 'Alquileres Ganados', type: 'income', parent: '4.1' },
            '4.2.01': { name: 'Ingresos Financieros', type: 'income', parent: '4.2' },
            '4.2.02': { name: 'Diferencias de Cambio Ganadas', type: 'income', parent: '4.2' },
            '4.2.03': { name: 'Descuentos Obtenidos', type: 'income', parent: '4.2' },
            '4.3.01': { name: 'Otros Ingresos', type: 'income', parent: '4.3' },
            '4.3.02': { name: 'Recupero de Gastos', type: 'income', parent: '4.3' },

            // EGRESOS
            '5.1.01': { name: 'Costo de Mercaderías Vendidas', type: 'expense', parent: '5.1' },
            '5.1.02': { name: 'Costo de Servicios Vendidos', type: 'expense', parent: '5.1' },
            '5.2.01': { name: 'Sueldos y Jornales', type: 'expense', parent: '5.2' },
            '5.2.02': { name: 'Cargas Sociales', type: 'expense', parent: '5.2' },
            '5.2.03': { name: 'Honorarios Profesionales', type: 'expense', parent: '5.2' },
            '5.2.04': { name: 'Honorarios Directorio', type: 'expense', parent: '5.2' },
            '5.2.05': { name: 'Comisiones Pagadas', type: 'expense', parent: '5.2' },
            '5.2.06': { name: 'Viáticos y Movilidad', type: 'expense', parent: '5.2' },
            '5.3.01': { name: 'Alquileres', type: 'expense', parent: '5.3' },
            '5.3.02': { name: 'Servicios Públicos', type: 'expense', parent: '5.3' },
            '5.3.03': { name: 'Combustibles', type: 'expense', parent: '5.3' },
            '5.3.04': { name: 'Mantenimiento y Reparaciones', type: 'expense', parent: '5.3' },
            '5.3.05': { name: 'Papelería y Útiles', type: 'expense', parent: '5.3' },
            '5.3.06': { name: 'Comunicaciones', type: 'expense', parent: '5.3' },
            '5.3.07': { name: 'Seguros', type: 'expense', parent: '5.3' },
            '5.3.08': { name: 'Publicidad y Propaganda', type: 'expense', parent: '5.3' },
            '5.3.09': { name: 'Gastos de Representación', type: 'expense', parent: '5.3' },
            '5.3.10': { name: 'Gastos de Limpieza', type: 'expense', parent: '5.3' },
            '5.3.11': { name: 'Gastos de Vigilancia', type: 'expense', parent: '5.3' },
            '5.4.01': { name: 'Gastos Bancarios', type: 'expense', parent: '5.4' },
            '5.4.02': { name: 'Intereses Perdidos', type: 'expense', parent: '5.4' },
            '5.4.03': { name: 'Diferencias de Cambio Perdidas', type: 'expense', parent: '5.4' },
            '5.4.04': { name: 'Descuentos Concedidos', type: 'expense', parent: '5.4' },
            '5.5.01': { name: 'Impuestos y Tasas', type: 'expense', parent: '5.5' },
            '5.5.02': { name: 'Ingresos Brutos', type: 'expense', parent: '5.5' },
            '5.5.03': { name: 'Impuesto a los Débitos y Créditos', type: 'expense', parent: '5.5' },
            '5.5.04': { name: 'Tasas Municipales', type: 'expense', parent: '5.5' },
            '5.6.01': { name: 'Amortizaciones', type: 'expense', parent: '5.6' },
            '5.6.02': { name: 'Depreciaciones', type: 'expense', parent: '5.6' },
            '5.7.01': { name: 'Gastos Extraordinarios', type: 'expense', parent: '5.7' },
            '5.7.02': { name: 'Multas y Recargos', type: 'expense', parent: '5.7' }
        };

        // Reglas de categorización predefinidas completas
        this.categorizationRules = [
            // INGRESOS
            {
                pattern: /^(venta|factura|ingreso|cobro|transferencia.*recibida)/i,
                category: '4.1.01',
                confidence: 85,
                type: 'income'
            },
            {
                pattern: /^(servicio|consultoria|honorario.*cobrado)/i,
                category: '4.1.02',
                confidence: 85,
                type: 'income'
            },
            {
                pattern: /^(comision.*ganada|comision.*cobrada)/i,
                category: '4.1.03',
                confidence: 85,
                type: 'income'
            },
            {
                pattern: /^(alquiler.*cobrado|renta.*cobrada)/i,
                category: '4.1.04',
                confidence: 85,
                type: 'income'
            },
            {
                pattern: /^(interes.*favor|renta.*financiera|rendimiento)/i,
                category: '4.2.01',
                confidence: 80,
                type: 'income'
            },

            // GASTOS OPERATIVOS - Personal
            {
                pattern: /^(sueldo|salario|jornal|remuneracion)/i,
                category: '5.2.01',
                confidence: 90,
                type: 'expense'
            },
            {
                pattern: /^(aporte|carga.*social|obra.*social|jubilacion)/i,
                category: '5.2.02',
                confidence: 90,
                type: 'expense'
            },
            {
                pattern: /^(honorario|consultoria|profesional|abogado|contador)/i,
                category: '5.2.03',
                confidence: 85,
                type: 'expense'
            },
            {
                pattern: /^(comision.*pagada|comision.*vendedor)/i,
                category: '5.2.05',
                confidence: 85,
                type: 'expense'
            },
            {
                pattern: /(viatico|movilidad|taxi|uber|cabify)/i,
                category: '5.2.06',
                confidence: 80,
                type: 'expense'
            },

            // GASTOS OPERATIVOS - Estructura
            {
                pattern: /^(alquiler|arrendamiento|renta)/i,
                category: '5.3.01',
                confidence: 90,
                type: 'expense'
            },

            // SERVICIOS PÚBLICOS - Específicos por empresa
            {
                pattern: /(edenor|edesur|luz|electricidad)/i,
                category: '5.3.02',
                confidence: 95,
                type: 'expense'
            },
            {
                pattern: /(metrogas|gas.*natural|garrafa)/i,
                category: '5.3.02',
                confidence: 95,
                type: 'expense'
            },
            {
                pattern: /(aysa|agua|cloacas)/i,
                category: '5.3.02',
                confidence: 95,
                type: 'expense'
            },
            {
                pattern: /(telefonica|movistar|claro|personal|internet|telefono)/i,
                category: '5.3.06',
                confidence: 90,
                type: 'expense'
            },

            // COMBUSTIBLES Y TRANSPORTE - Específicos por empresa
            {
                pattern: /(ypf|shell|axion|puma|nafta|gasoil|combustible)/i,
                category: '5.3.03',
                confidence: 95,
                type: 'expense'
            },
            {
                pattern: /(peaje|autopista|estacionamiento)/i,
                category: '5.3.03',
                confidence: 85,
                type: 'expense'
            },

            // MANTENIMIENTO
            {
                pattern: /(reparacion|mantenimiento|service|taller)/i,
                category: '5.3.04',
                confidence: 85,
                type: 'expense'
            },

            // OFICINA Y ADMINISTRACIÓN
            {
                pattern: /(papeleria|libreria|toner|papel|lapicera|resma)/i,
                category: '5.3.05',
                confidence: 90,
                type: 'expense'
            },
            {
                pattern: /(supermercado|almacen|comida|cafe|catering)/i,
                category: '5.3.05',
                confidence: 70,
                type: 'expense'
            },

            // SEGUROS
            {
                pattern: /(seguro|poliza|cobertura)/i,
                category: '5.3.07',
                confidence: 90,
                type: 'expense'
            },

            // MARKETING Y PUBLICIDAD
            {
                pattern: /(publicidad|propaganda|marketing|google.*ads|facebook.*ads)/i,
                category: '5.3.08',
                confidence: 85,
                type: 'expense'
            },

            // LIMPIEZA Y SERVICIOS
            {
                pattern: /(limpieza|productos.*limpieza|lavanderia)/i,
                category: '5.3.10',
                confidence: 85,
                type: 'expense'
            },
            {
                pattern: /(vigilancia|seguridad|alarma)/i,
                category: '5.3.11',
                confidence: 85,
                type: 'expense'
            },

            // GASTOS FINANCIEROS
            {
                pattern: /(comision.*banco|cargo.*banco|mantenimiento.*cuenta)/i,
                category: '5.4.01',
                confidence: 90,
                type: 'expense'
            },
            {
                pattern: /(interes.*prestamo|interes.*financiacion|financiacion)/i,
                category: '5.4.02',
                confidence: 85,
                type: 'expense'
            },

            // IMPUESTOS Y TASAS
            {
                pattern: /(afip|dgi|impuesto.*ganancias|monotributo)/i,
                category: '5.5.01',
                confidence: 85,
                type: 'expense'
            },
            {
                pattern: /(ingresos.*brutos|iibb)/i,
                category: '5.5.02',
                confidence: 90,
                type: 'expense'
            },
            {
                pattern: /(debito.*credito|impuesto.*cheque)/i,
                category: '5.5.03',
                confidence: 90,
                type: 'expense'
            },
            {
                pattern: /(municipal|tasa.*municipal|abm)/i,
                category: '5.5.04',
                confidence: 85,
                type: 'expense'
            },

            // MULTAS Y RECARGOS
            {
                pattern: /(multa|recargo|mora|penalidad)/i,
                category: '5.7.02',
                confidence: 90,
                type: 'expense'
            }
        ];
    }

    async customValidation(args) {
        const { transactions, clientId } = args;

        // Validar que hay transacciones
        if (!transactions || transactions.length === 0) {
            throw {
                code: 'NO_TRANSACTIONS',
                message: 'No se proporcionaron transacciones para categorizar',
                details: { count: transactions?.length || 0 }
            };
        }

        // Límite de transacciones por request
        if (transactions.length > 1000) {
            throw {
                code: 'TOO_MANY_TRANSACTIONS',
                message: 'Máximo 1000 transacciones por request',
                details: { provided: transactions.length, max: 1000 }
            };
        }

        // Rate limiting por cliente
        if (clientId) {
            await this.rateLimitCheck(clientId, 50, 3600000); // 50 requests por hora
        }

        return true;
    }

    async executeLogic(args) {
        const {
            transactions,
            clientId,
            chartOfAccounts,
            options = {}
        } = args;

        this.logger.info(`Iniciando categorización de ${transactions.length} transacciones`, {
            clientId,
            aiProvider: this.aiProvider,
            options
        });

        const results = [];
        const historicalPatterns = options.learnFromHistory
            ? await this.getHistoricalPatterns(clientId)
            : [];

        const activeChartOfAccounts = chartOfAccounts || this.standardChartOfAccounts;

        for (const transaction of transactions) {
            try {
                const categorization = await this.categorizeTransaction(
                    transaction,
                    activeChartOfAccounts,
                    historicalPatterns,
                    options
                );

                results.push({
                    transactionId: transaction.id,
                    originalDescription: transaction.description,
                    suggestedCategory: categorization.category,
                    categoryName: categorization.categoryName,
                    confidence: categorization.confidence,
                    method: categorization.method,
                    reasoning: categorization.reasoning,
                    needsReview: categorization.confidence < (options.confidenceThreshold || 75),
                    alternatives: categorization.alternatives || []
                });

                // Guardar para aprendizaje futuro si la confianza es alta
                if (categorization.confidence >= 85 && clientId) {
                    await this.saveCategorizationPattern(
                        clientId,
                        transaction.description,
                        categorization.category,
                        categorization.confidence
                    );
                }

            } catch (transactionError) {
                this.logger.error(`Error categorizando transacción ${transaction.id}:`, transactionError);
                results.push({
                    transactionId: transaction.id,
                    originalDescription: transaction.description,
                    error: this.formatError(transactionError),
                    needsReview: true
                });
            }
        }

        // Generar estadísticas
        const stats = this.generateStats(results);

        this.logger.info(`Categorización completada: ${stats.categorized}/${transactions.length} transacciones`);

        return {
            results,
            statistics: stats,
            chartOfAccountsUsed: Object.keys(activeChartOfAccounts).length,
            aiProvider: this.aiProvider,
            historicalPatternsUsed: historicalPatterns.length
        };
    }

    async categorizeTransaction(transaction, chartOfAccounts, historicalPatterns, options) {
        const description = transaction.description.toLowerCase().trim();

        // 1. Intentar con patrones históricos del cliente
        if (options.learnFromHistory && historicalPatterns.length > 0) {
            const historicalMatch = this.findHistoricalMatch(description, historicalPatterns);
            if (historicalMatch && historicalMatch.confidence >= 80) {
                return {
                    category: historicalMatch.category,
                    categoryName: chartOfAccounts[historicalMatch.category]?.name || 'Desconocida',
                    confidence: historicalMatch.confidence,
                    method: 'historical_pattern',
                    reasoning: `Coincide con patrón histórico: ${historicalMatch.pattern}`
                };
            }
        }

        // 2. Aplicar reglas predefinidas
        if (options.applyRules) {
            const ruleMatch = this.applyPredefinedRules(description, transaction);
            if (ruleMatch && ruleMatch.confidence >= 70) {
                return {
                    category: ruleMatch.category,
                    categoryName: chartOfAccounts[ruleMatch.category]?.name || 'Desconocida',
                    confidence: ruleMatch.confidence,
                    method: 'predefined_rule',
                    reasoning: `Regla aplicada: ${ruleMatch.rule}`
                };
            }
        }

        // 3. Usar IA para categorización inteligente
        if (options.useAI) {
            const aiCategorization = await this.categorizeWithAI(
                transaction,
                chartOfAccounts
            );
            if (aiCategorization) {
                return {
                    ...aiCategorization,
                    method: `ai_classification_${this.aiProvider}`
                };
            }
        }

        // 4. Fallback: categoría por defecto según tipo
        const fallbackCategory = transaction.type === 'income' ? '4.3.01' : '5.3.05';
        return {
            category: fallbackCategory,
            categoryName: chartOfAccounts[fallbackCategory]?.name || 'Otros',
            confidence: 30,
            method: 'fallback',
            reasoning: 'No se pudo determinar categoría específica'
        };
    }

    async categorizeWithAI(transaction, chartOfAccounts) {
        try {
            const accountsList = Object.entries(chartOfAccounts)
                .map(([code, account]) => `${code}: ${account.name} (${account.type})`)
                .join('\n');

            const prompt = `
Eres un experto contador argentino. Categoriza la siguiente transacción usando el plan de cuentas proporcionado.

TRANSACCIÓN:
Descripción: ${transaction.description}
Monto: ${transaction.amount}
Tipo: ${transaction.type || 'no especificado'}
Fecha: ${transaction.date || 'no especificada'}
Proveedor: ${transaction.vendor || 'no especificado'}

PLAN DE CUENTAS DISPONIBLE:
${accountsList}

Responde SOLO con un JSON válido en este formato:
{
  "category": "código_de_cuenta",
  "categoryName": "nombre_de_la_cuenta",
  "confidence": número_entre_0_y_100,
  "reasoning": "breve_explicación_de_la_categorización",
  "alternatives": [
    {
      "category": "código_alternativo",
      "categoryName": "nombre_alternativo",
      "confidence": número
    }
  ]
}

Considera:
- Normativa contable argentina
- Palabras clave en la descripción
- Tipo de transacción (ingreso/egreso)
- Monto de la transacción
- Contexto del proveedor si está disponible

Solo devuelve el JSON, sin explicaciones adicionales.`;

            let response;

            if (this.aiProvider === 'groq') {
                response = await this.aiClient.chat.completions.create({
                    model: this.aiModel,
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0.1,
                    max_tokens: 1000
                });
            } else {
                response = await this.openai.chat.completions.create({
                    model: this.aiModel,
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0.1,
                    max_tokens: 1000
                });
            }

            const jsonResponse = response.choices[0].message.content.trim();
            const parsed = JSON.parse(jsonResponse);

            // Validar que la categoría existe en el plan de cuentas
            if (!chartOfAccounts[parsed.category]) {
                this.logger.warn(`IA sugirió categoría inexistente: ${parsed.category}`);
                return null;
            }

            return parsed;

        } catch (error) {
            this.logger.error(`Error en categorización con IA (${this.aiProvider}):`, error);
            return null;
        }
    }

    findHistoricalMatch(description, patterns) {
        let bestMatch = null;
        let bestScore = 0;

        for (const pattern of patterns) {
            const similarity = this.calculateStringSimilarity(description, pattern.description);
            const score = similarity * (pattern.frequency / 100) * (pattern.accuracy / 100);

            if (score > bestScore && score > 0.6) {
                bestMatch = {
                    category: pattern.category,
                    confidence: Math.min(95, Math.round(score * 100)),
                    pattern: pattern.description
                };
                bestScore = score;
            }
        }

        return bestMatch;
    }

    applyPredefinedRules(description, transaction) {
        for (const rule of this.categorizationRules) {
            if (rule.pattern.test(description)) {
                // Verificar si el tipo coincide
                if (rule.type && transaction.type && rule.type !== transaction.type) {
                    continue;
                }

                return {
                    category: rule.category,
                    confidence: rule.confidence,
                    rule: rule.pattern.toString()
                };
            }
        }

        return null;
    }

    async getHistoricalPatterns(clientId) {
        if (!clientId) return [];

        try {
            // TODO: Implementar según tu DatabaseManager
            // const result = await this.database.query(`
            //   SELECT 
            //     description_pattern,
            //     category,
            //     COUNT(*) as frequency,
            //     AVG(confidence) as accuracy
            //   FROM categorization_history 
            //   WHERE client_id = ? 
            //     AND created_at > DATE_SUB(NOW(), INTERVAL 6 MONTH)
            //     AND confidence >= 80
            //   GROUP BY description_pattern, category
            //   HAVING frequency >= 3
            //   ORDER BY frequency DESC, accuracy DESC
            //   LIMIT 50
            // `, [clientId]);

            // return result.map(row => ({
            //   description: row.description_pattern,
            //   category: row.category,
            //   frequency: row.frequency,
            //   accuracy: row.accuracy
            // }));

            // Mock data por ahora
            return [];

        } catch (error) {
            this.logger.error('Error obteniendo patrones históricos:', error);
            return [];
        }
    }

    async saveCategorizationPattern(clientId, description, category, confidence) {
        if (!clientId) return;

        try {
            // Normalizar descripción para crear patrón
            const pattern = this.normalizeDescription(description);

            // TODO: Implementar según tu DatabaseManager
            // await this.database.query(`
            //   INSERT INTO categorization_history 
            //   (client_id, description_pattern, original_description, category, confidence, created_at)
            //   VALUES (?, ?, ?, ?, ?, NOW())
            // `, [clientId, pattern, description, category, confidence]);

        } catch (error) {
            this.logger.error('Error guardando patrón de categorización:', error);
        }
    }

    normalizeDescription(description) {
        return description
            .toLowerCase()
            .replace(/\d+/g, '') // Remover números
            .replace(/[^\w\s]/g, ' ') // Remover caracteres especiales
            .replace(/\s+/g, ' ') // Normalizar espacios
            .trim();
    }

    calculateStringSimilarity(str1, str2) {
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;

        if (longer.length === 0) return 1.0;

        const distance = this.levenshteinDistance(longer, shorter);
        return (longer.length - distance) / longer.length;
    }

    levenshteinDistance(str1, str2) {
        const matrix = [];
        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }
        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }
        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        return matrix[str2.length][str1.length];
    }

    generateStats(results) {
        const total = results.length;
        const categorized = results.filter(r => !r.error).length;
        const needsReview = results.filter(r => r.needsReview).length;
        const highConfidence = results.filter(r => r.confidence >= 85).length;

        const methodStats = {};
        results.forEach(r => {
            if (r.method) {
                methodStats[r.method] = (methodStats[r.method] || 0) + 1;
            }
        });

        const averageConfidence = total > 0
            ? results.reduce((sum, r) => sum + (r.confidence || 0), 0) / total
            : 0;

        return {
            total,
            categorized,
            needsReview,
            highConfidence,
            averageConfidence,
            methodDistribution: methodStats,
            successRate: total > 0 ? (categorized / total) * 100 : 0,
            reviewRate: total > 0 ? (needsReview / total) * 100 : 0,
            highConfidenceRate: categorized > 0 ? (highConfidence / categorized) * 100 : 0
        };
    }

    // Método auxiliar para análisis de categorías más utilizadas
    getCategoryDistribution(results) {
        const categoryCount = {};
        const categoryConfidence = {};

        results.forEach(result => {
            if (result.suggestedCategory && !result.error) {
                const category = result.suggestedCategory;
                categoryCount[category] = (categoryCount[category] || 0) + 1;

                if (!categoryConfidence[category]) {
                    categoryConfidence[category] = [];
                }
                categoryConfidence[category].push(result.confidence || 0);
            }
        });

        const distribution = Object.entries(categoryCount).map(([category, count]) => ({
            category,
            categoryName: this.standardChartOfAccounts[category]?.name || 'Desconocida',
            count,
            percentage: (count / results.length) * 100,
            averageConfidence: categoryConfidence[category].reduce((sum, conf) => sum + conf, 0) / categoryConfidence[category].length
        }));

        return distribution.sort((a, b) => b.count - a.count);
    }

    // Método auxiliar para detectar posibles mejoras
    generateImprovementSuggestions(results, stats) {
        const suggestions = [];

        // Sugerencia por baja confianza general
        if (stats.averageConfidence < 70) {
            suggestions.push({
                type: 'low_confidence',
                priority: 'high',
                message: 'Confianza promedio baja. Considerar mejorar descripciones de transacciones.',
                recommendation: 'Estandarizar la nomenclatura en las descripciones de movimientos.'
            });
        }

        // Sugerencia por alta tasa de revisión
        if (stats.reviewRate > 30) {
            suggestions.push({
                type: 'high_review_rate',
                priority: 'medium',
                message: 'Alta tasa de transacciones que requieren revisión manual.',
                recommendation: 'Crear reglas específicas para las categorías más problemáticas.'
            });
        }

        // Sugerencia por uso excesivo de fallback
        if (stats.methodDistribution.fallback && stats.methodDistribution.fallback > stats.total * 0.2) {
            suggestions.push({
                type: 'excessive_fallback',
                priority: 'medium',
                message: 'Muchas transacciones categorizadas por método fallback.',
                recommendation: 'Ampliar las reglas de categorización o entrenar el modelo con más datos.'
            });
        }

        // Detectar categorías problemáticas
        const categoryDist = this.getCategoryDistribution(results);
        const problematicCategories = categoryDist.filter(cat => cat.averageConfidence < 60);

        if (problematicCategories.length > 0) {
            suggestions.push({
                type: 'problematic_categories',
                priority: 'medium',
                message: `Categorías con baja confianza detectadas: ${problematicCategories.map(c => c.categoryName).join(', ')}`,
                recommendation: 'Revisar y crear reglas específicas para estas categorías.'
            });
        }

        return suggestions;
    }

    // Método para validar configuración del cliente
    async validateClientConfiguration(clientId, chartOfAccounts) {
        const issues = [];

        // Validar plan de cuentas
        if (chartOfAccounts && typeof chartOfAccounts === 'object') {
            const requiredTypes = ['asset', 'liability', 'equity', 'income', 'expense'];
            const availableTypes = new Set(Object.values(chartOfAccounts).map(account => account.type));

            for (const type of requiredTypes) {
                if (!availableTypes.has(type)) {
                    issues.push({
                        type: 'missing_account_type',
                        severity: 'warning',
                        message: `Plan de cuentas no incluye cuentas de tipo: ${type}`,
                        recommendation: `Agregar al menos una cuenta de tipo ${type} al plan de cuentas.`
                    });
                }
            }
        }

        // TODO: Validar otras configuraciones específicas del cliente

        return {
            isValid: issues.filter(i => i.severity === 'error').length === 0,
            issues,
            clientId
        };
    }

    // Método para obtener métricas avanzadas
    getAdvancedMetrics(results) {
        const metrics = this.generateStats(results);
        const categoryDistribution = this.getCategoryDistribution(results);
        const suggestions = this.generateImprovementSuggestions(results, metrics);

        // Calcular métricas adicionales
        const methodEfficiency = {};
        Object.entries(metrics.methodDistribution).forEach(([method, count]) => {
            const methodResults = results.filter(r => r.method === method);
            const avgConfidence = methodResults.reduce((sum, r) => sum + (r.confidence || 0), 0) / methodResults.length;

            methodEfficiency[method] = {
                count,
                percentage: (count / metrics.total) * 100,
                averageConfidence: avgConfidence,
                efficiency: avgConfidence > 80 ? 'high' : avgConfidence > 60 ? 'medium' : 'low'
            };
        });

        return {
            ...metrics,
            categoryDistribution,
            methodEfficiency,
            suggestions,
            timestamp: new Date().toISOString()
        };
    }
} import { BaseTool } from './base-tool.js';
import OpenAI from 'openai';

export class AutoCategorizeTransactionsTool extends BaseTool {
    constructor(services) {
        const inputSchema = {
            type: 'object',
            properties: {
                transactions: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            id: { type: 'string' },
                            description: { type: 'string' },
                            amount: { type: 'number' },
                            date: { type: 'string' },
                            type: { type: 'string', enum: ['income', 'expense'] },
                            vendor: { type: 'string' },
                            accountNumber: { type: 'string' }
                        },
                        required: ['description', 'amount']
                    }
                },
                clientId: {
                    type: 'string',
                    description: 'ID del cliente para aplicar reglas personalizadas'
                },
                chartOfAccounts: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            code: { type: 'string' },
                            name: { type: 'string' },
                            type: { type: 'string' },
                            parent: { type: 'string' }
                        }
                    },
                    description: 'Plan de cuentas del cliente (opcional, se usará el estándar si no se provee)'
                },
                options: {
                    type: 'object',
                    properties: {
                        useAI: {
                            type: 'boolean',
                            default: true,
                            description: 'Usar IA para categorización inteligente'
                        },
                        confidenceThreshold: {
                            type: 'number',
                            minimum: 0,
                            maximum: 100,
                            default: 75,
                            description: 'Umbral de confianza para auto-categorización'
                        },
                        learnFromHistory: {
                            type: 'boolean',
                            default: true,
                            description: 'Aprender de categorizaciones previas del cliente'
                        },
                        applyRules: {
                            type: 'boolean',
                            default: true,
                            description: 'Aplicar reglas predefinidas antes de la IA'
                        }
                    }
                }
            },
            required: ['transactions']
        };

        super(
            'auto_categorize_transactions',
            'Categoriza automáticamente transacciones contables usando IA y reglas predefinidas',
            inputSchema,
            services
        );

        const useGroq = process.env.USE_GROQ_FOR_CATEGORIZATION === 'true';

        if (useGroq && services.groq) {
            this.aiClient = services.groq;
            this.aiModel = process.env.GROQ_CATEGORIZATION_MODEL || 'llama3-70b-8192';
            this.aiProvider = 'groq';
        } else {
            this.openai = new OpenAI({
                apiKey: services.config?.openai?.apiKey || process.env.OPENAI_API_KEY
            });
            this.aiModel = 'gpt-4';
            this.aiProvider = 'openai';
        }

        this.database = services.database;

        this.standardChartOfAccounts = {
            '1.1.01': { name: 'Caja', type: 'asset', parent: '1.1' },
            '1.1.02': { name: 'Banco Cuenta Corriente', type: 'asset', parent: '1.1' },
            '1.1.03': { name: 'Banco Caja de Ahorro', type: 'asset', parent: '1.1' },
            '1.2.01': { name: 'Deudores por Ventas', type: 'asset', parent: '1.2' },
            '4.1.01': { name: 'Ventas', type: 'income', parent: '4.1' },
            '4.1.02': { name: 'Servicios', type: 'income', parent: '4.1' },
            '4.2.01': { name: 'Ingresos Financieros', type: 'income', parent: '4.2' },
            '5.2.01': { name: 'Sueldos y Jornales', type: 'expense', parent: '5.2' },
            '5.2.03': { name: 'Honorarios Profesionales', type: 'expense', parent: '5.2' },
            '5.3.01': { name: 'Alquileres', type: 'expense', parent: '5.3' },
            '5.3.02': { name: 'Servicios Públicos', type: 'expense', parent: '5.3' },
            '5.3.03': { name: 'Combustibles', type: 'expense', parent: '5.3' },
            '5.3.04': { name: 'Mantenimiento y Reparaciones', type: 'expense', parent: '5.3' },
            '5.3.05': { name: 'Papelería y Útiles', type: 'expense', parent: '5.3' },
            '5.3.06': { name: 'Comunicaciones', type: 'expense', parent: '5.3' },
            '5.4.01': { name: 'Gastos Bancarios', type: 'expense', parent: '5.4' },
            '5.5.01': { name: 'Impuestos y Tasas', type: 'expense', parent: '5.5' }
        };

        this.categorizationRules = [
            {
                pattern: /^(venta|factura|ingreso|cobro|transferencia.*recibida)/i,
                category: '4.1.01',
                confidence: 85,
                type: 'income'
            },
            {
                pattern: /(edenor|edesur|luz|electricidad)/i,
                category: '5.3.02',
                confidence: 95,
                type: 'expense'
            },
            {
                pattern: /(metrogas|gas.*natural)/i,
                category: '5.3.02',
                confidence: 95,
                type: 'expense'
            },
            {
                pattern: /(ypf|shell|axion|puma|nafta|gasoil|combustible)/i,
                category: '5.3.03',
                confidence: 95,
                type: 'expense'
            },
            {
                pattern: /^(sueldo|salario|jornal|remuneracion)/i,
                category: '5.2.01',
                confidence: 90,
                type: 'expense'
            },
            {
                pattern: /^(honorario|consultoria|profesional)/i,
                category: '5.2.03',
                confidence: 85,
                type: 'expense'
            }
        ];
    }

    async customValidation(args) {
        const { transactions, clientId } = args;

        if (!transactions || transactions.length === 0) {
            throw {
                code: 'NO_TRANSACTIONS',
                message: 'No se proporcionaron transacciones para categorizar',
                details: { count: transactions?.length || 0 }
            };
        }

        if (transactions.length > 1000) {
            throw {
                code: 'TOO_MANY_TRANSACTIONS',
                message: 'Máximo 1000 transacciones por request',
                details: { provided: transactions.length, max: 1000 }
            };
        }

        if (clientId) {
            await this.rateLimitCheck(clientId, 50, 3600000);
        }

        return true;
    }

    async executeLogic(args) {
        const { transactions, clientId, chartOfAccounts, options = {} } = args;

        this.logger.info(`Iniciando categorización de ${transactions.length} transacciones`);

        const results = [];
        const historicalPatterns = options.learnFromHistory
            ? await this.getHistoricalPatterns(clientId)
            : [];

        const activeChartOfAccounts = chartOfAccounts || this.standardChartOfAccounts;

        for (const transaction of transactions) {
            try {
                const categorization = await this.categorizeTransaction(
                    transaction,
                    activeChartOfAccounts,
                    historicalPatterns,
                    options
                );

                results.push({
                    transactionId: transaction.id,
                    originalDescription: transaction.description,
                    suggestedCategory: categorization.category,
                    categoryName: categorization.categoryName,
                    confidence: categorization.confidence,
                    method: categorization.method,
                    reasoning: categorization.reasoning,
                    needsReview: categorization.confidence < (options.confidenceThreshold || 75),
                    alternatives: categorization.alternatives || []
                });

                if (categorization.confidence >= 85 && clientId) {
                    await this.saveCategorizationPattern(
                        clientId,
                        transaction.description,
                        categorization.category,
                        categorization.confidence
                    );
                }

            } catch (transactionError) {
                this.logger.error(`Error categorizando transacción ${transaction.id}:`, transactionError);
                results.push({
                    transactionId: transaction.id,
                    originalDescription: transaction.description,
                    error: this.formatError(transactionError),
                    needsReview: true
                });
            }
        }

        const stats = this.generateStats(results);

        this.logger.info(`Categorización completada: ${stats.categorized}/${transactions.length} transacciones`);

        return {
            results,
            statistics: stats,
            chartOfAccountsUsed: Object.keys(activeChartOfAccounts).length,
            aiProvider: this.aiProvider,
            historicalPatternsUsed: historicalPatterns.length
        };
    }

    async categorizeTransaction(transaction, chartOfAccounts, historicalPatterns, options) {
        const description = transaction.description.toLowerCase().trim();

        if (options.learnFromHistory && historicalPatterns.length > 0) {
            const historicalMatch = this.findHistoricalMatch(description, historicalPatterns);
            if (historicalMatch && historicalMatch.confidence >= 80) {
                return {
                    category: historicalMatch.category,
                    categoryName: chartOfAccounts[historicalMatch.category]?.name || 'Desconocida',
                    confidence: historicalMatch.confidence,
                    method: 'historical_pattern',
                    reasoning: `Coincide con patrón histórico: ${historicalMatch.pattern}`
                };
            }
        }

        if (options.applyRules) {
            const ruleMatch = this.applyPredefinedRules(description, transaction);
            if (ruleMatch && ruleMatch.confidence >= 70) {
                return {
                    category: ruleMatch.category,
                    categoryName: chartOfAccounts[ruleMatch.category]?.name || 'Desconocida',
                    confidence: ruleMatch.confidence,
                    method: 'predefined_rule',
                    reasoning: `Regla aplicada: ${ruleMatch.rule}`
                };
            }
        }

        if (options.useAI) {
            const aiCategorization = await this.categorizeWithAI(transaction, chartOfAccounts);
            if (aiCategorization) {
                return {
                    ...aiCategorization,
                    method: `ai_classification_${this.aiProvider}`
                };
            }
        }

        const fallbackCategory = transaction.type === 'income' ? '4.1.01' : '5.3.05';
        return {
            category: fallbackCategory,
            categoryName: chartOfAccounts[fallbackCategory]?.name || 'Otros',
            confidence: 30,
            method: 'fallback',
            reasoning: 'No se pudo determinar categoría específica'
        };
    }

    async categorizeWithAI(transaction, chartOfAccounts) {
        try {
            const accountsList = Object.entries(chartOfAccounts)
                .map(([code, account]) => `${code}: ${account.name} (${account.type})`)
                .join('\n');

            const prompt = `Eres un experto contador argentino. Categoriza la siguiente transacción usando el plan de cuentas proporcionado.

TRANSACCIÓN:
Descripción: ${transaction.description}
Monto: $${transaction.amount}
Tipo: ${transaction.type || 'no especificado'}

PLAN DE CUENTAS DISPONIBLE:
${accountsList}

Responde SOLO con un JSON válido:
{
  "category": "código_de_cuenta",
  "categoryName": "nombre_de_la_cuenta",
  "confidence": número_entre_0_y_100,
  "reasoning": "breve_explicación"
}`;

            let response;

            if (this.aiProvider === 'groq') {
                response = await this.aiClient.chat.completions.create({
                    model: this.aiModel,
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0.1,
                    max_tokens: 1000
                });
            } else {
                response = await this.openai.chat.completions.create({
                    model: this.aiModel,
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0.1,
                    max_tokens: 1000
                });
            }

            const jsonResponse = response.choices[0].message.content.trim();
            const parsed = JSON.parse(jsonResponse);

            if (!chartOfAccounts[parsed.category]) {
                this.logger.warn(`IA sugirió categoría inexistente: ${parsed.category}`);
                return null;
            }

            return parsed;

        } catch (error) {
            this.logger.error(`Error en categorización con IA (${this.aiProvider}):`, error);
            return null;
        }
    }

    findHistoricalMatch(description, patterns) {
        let bestMatch = null;
        let bestScore = 0;

        for (const pattern of patterns) {
            const similarity = this.calculateStringSimilarity(description, pattern.description);
            const score = similarity * (pattern.frequency / 100) * (pattern.accuracy / 100);

            if (score > bestScore && score > 0.6) {
                bestMatch = {
                    category: pattern.category,
                    confidence: Math.min(95, Math.round(score * 100)),
                    pattern: pattern.description
                };
                bestScore = score;
            }
        }

        return bestMatch;
    }

    applyPredefinedRules(description, transaction) {
        for (const rule of this.categorizationRules) {
            if (rule.pattern.test(description)) {
                if (rule.type && transaction.type && rule.type !== transaction.type) {
                    continue;
                }

                return {
                    category: rule.category,
                    confidence: rule.confidence,
                    rule: rule.pattern.toString()
                };
            }
        }

        return null;
    }

    async getHistoricalPatterns(clientId) {
        if (!clientId) return [];

        try {
            return [];
        } catch (error) {
            this.logger.error('Error obteniendo patrones históricos:', error);
            return [];
        }
    }

    async saveCategorizationPattern(clientId, description, category, confidence) {
        if (!clientId) return;

        try {
            const pattern = this.normalizeDescription(description);
        } catch (error) {
            this.logger.error('Error guardando patrón de categorización:', error);
        }
    }

    normalizeDescription(description) {
        return description
            .toLowerCase()
            .replace(/\d+/g, '')
            .replace(/[^\w\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    calculateStringSimilarity(str1, str2) {
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;

        if (longer.length === 0) return 1.0;

        const distance = this.levenshteinDistance(longer, shorter);
        return (longer.length - distance) / longer.length;
    }

    levenshteinDistance(str1, str2) {
        const matrix = [];
        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }
        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }
        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        return matrix[str2.length][str1.length];
    }

    generateStats(results) {
        const total = results.length;
        const categorized = results.filter(r => !r.error).length;
        const needsReview = results.filter(r => r.needsReview).length;
        const highConfidence = results.filter(r => r.confidence >= 85).length;

        const methodStats = {};
        results.forEach(r => {
            if (r.method) {
                methodStats[r.method] = (methodStats[r.method] || 0) + 1;
            }
        });

        return {
            total,
            categorized,
            needsReview,
            highConfidence,
            averageConfidence: results.reduce((sum, r) => sum + (r.confidence || 0), 0) / total,
            methodDistribution: methodStats,
            successRate: (categorized / total) * 100
        };
    }
}