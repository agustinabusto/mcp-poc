import { BaseTool } from './base-tool.js';
import crypto from 'crypto';

export class AutoBankReconciliationTool extends BaseTool {
    constructor(services) {
        const inputSchema = {
            type: 'object',
            properties: {
                bankStatements: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            id: { type: 'string' },
                            date: { type: 'string', format: 'date' },
                            description: { type: 'string' },
                            reference: { type: 'string' },
                            debit: { type: 'number', minimum: 0 },
                            credit: { type: 'number', minimum: 0 },
                            balance: { type: 'number' },
                            bankAccount: { type: 'string' }
                        },
                        required: ['date', 'description']
                    },
                    description: 'Movimientos del extracto bancario'
                },
                bookRecords: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            id: { type: 'string' },
                            date: { type: 'string', format: 'date' },
                            description: { type: 'string' },
                            account: { type: 'string' },
                            debit: { type: 'number', minimum: 0 },
                            credit: { type: 'number', minimum: 0 },
                            reference: { type: 'string' },
                            documentNumber: { type: 'string' }
                        },
                        required: ['date', 'description', 'account']
                    },
                    description: 'Registros contables del libro mayor'
                },
                reconciliationPeriod: {
                    type: 'object',
                    properties: {
                        startDate: { type: 'string', format: 'date' },
                        endDate: { type: 'string', format: 'date' }
                    },
                    required: ['startDate', 'endDate']
                },
                clientId: {
                    type: 'string',
                    description: 'ID del cliente'
                },
                options: {
                    type: 'object',
                    properties: {
                        toleranceAmount: {
                            type: 'number',
                            minimum: 0,
                            default: 0.01,
                            description: 'Tolerancia en monto para considerar coincidencias'
                        },
                        toleranceDays: {
                            type: 'integer',
                            minimum: 0,
                            maximum: 10,
                            default: 2,
                            description: 'Tolerancia en días para fechas'
                        },
                        autoMatch: {
                            type: 'boolean',
                            default: true,
                            description: 'Realizar matching automático'
                        },
                        createAdjustments: {
                            type: 'boolean',
                            default: false,
                            description: 'Crear asientos de ajuste automáticamente'
                        },
                        matchingAlgorithm: {
                            type: 'string',
                            enum: ['strict', 'fuzzy', 'ai_enhanced'],
                            default: 'fuzzy',
                            description: 'Algoritmo de matching a utilizar'
                        }
                    }
                }
            },
            required: ['bankStatements', 'bookRecords', 'reconciliationPeriod']
        };

        super(
            'auto_bank_reconciliation',
            'Realiza conciliación bancaria automática comparando extractos bancarios con registros contables',
            inputSchema,
            services
        );

        this.database = services.database;
    }

    async customValidation(args) {
        const { bankStatements, bookRecords, reconciliationPeriod, clientId } = args;

        if (!bankStatements || bankStatements.length === 0) {
            throw {
                code: 'NO_BANK_STATEMENTS',
                message: 'No se proporcionaron movimientos bancarios',
                details: { count: bankStatements?.length || 0 }
            };
        }

        if (!bookRecords || bookRecords.length === 0) {
            throw {
                code: 'NO_BOOK_RECORDS',
                message: 'No se proporcionaron registros contables',
                details: { count: bookRecords?.length || 0 }
            };
        }

        this.validateDateRange(reconciliationPeriod.startDate, reconciliationPeriod.endDate);

        if (clientId) {
            await this.rateLimitCheck(clientId, 20, 3600000);
        }

        return true;
    }

    async executeLogic(args) {
        const {
            bankStatements,
            bookRecords,
            reconciliationPeriod,
            clientId,
            options = {}
        } = args;

        this.logger.info(`Iniciando conciliación bancaria: ${bankStatements.length} movimientos bancarios vs ${bookRecords.length} registros contables`);

        const reconciliationId = crypto.randomUUID();

        const filteredBankStatements = this.filterByPeriod(bankStatements, reconciliationPeriod);
        const filteredBookRecords = this.filterByPeriod(bookRecords, reconciliationPeriod);

        const normalizedBankStatements = this.normalizeBankStatements(filteredBankStatements);
        const normalizedBookRecords = this.normalizeBookRecords(filteredBookRecords);

        const matchingResults = await this.performMatching(
            normalizedBankStatements,
            normalizedBookRecords,
            options
        );

        const discrepancies = this.identifyDiscrepancies(matchingResults, options);

        let adjustmentEntries = [];
        if (options.createAdjustments && discrepancies.length > 0) {
            adjustmentEntries = await this.createAdjustmentEntries(discrepancies, clientId);
        }

        const statistics = this.calculateStatistics(matchingResults, discrepancies);

        const reconciliationResult = await this.saveReconciliationResult({
            reconciliationId,
            clientId,
            period: reconciliationPeriod,
            bankStatements: normalizedBankStatements,
            bookRecords: normalizedBookRecords,
            matches: matchingResults.matches,
            discrepancies,
            statistics,
            adjustmentEntries,
            options
        });

        this.logger.info(`Conciliación completada: ${matchingResults.matches.length} coincidencias, ${discrepancies.length} discrepancias`);

        const result = {
            reconciliationId,
            period: reconciliationPeriod,
            summary: {
                bankMovements: normalizedBankStatements.length,
                bookRecords: normalizedBookRecords.length,
                matches: matchingResults.matches.length,
                discrepancies: discrepancies.length,
                matchingRate: (matchingResults.matches.length / Math.max(normalizedBankStatements.length, normalizedBookRecords.length)) * 100
            },
            matches: matchingResults.matches,
            discrepancies,
            statistics,
            adjustmentEntries,
            recommendations: this.generateRecommendations(matchingResults, discrepancies)
        };

        return this.sanitizeOutput(result);
    }

    filterByPeriod(records, period) {
        const startDate = new Date(period.startDate);
        const endDate = new Date(period.endDate);

        return records.filter(record => {
            const recordDate = new Date(record.date);
            return recordDate >= startDate && recordDate <= endDate;
        });
    }

    normalizeBankStatements(statements) {
        return statements.map((statement, index) => ({
            id: statement.id || `bank_${index}`,
            date: new Date(statement.date),
            description: this.normalizeDescription(statement.description),
            originalDescription: statement.description,
            reference: statement.reference || '',
            amount: (statement.debit || 0) - (statement.credit || 0),
            debit: statement.debit || 0,
            credit: statement.credit || 0,
            balance: statement.balance || 0,
            bankAccount: statement.bankAccount || '',
            type: 'bank',
            matched: false
        }));
    }

    normalizeBookRecords(records) {
        return records.map((record, index) => ({
            id: record.id || `book_${index}`,
            date: new Date(record.date),
            description: this.normalizeDescription(record.description),
            originalDescription: record.description,
            account: record.account,
            amount: (record.debit || 0) - (record.credit || 0),
            debit: record.debit || 0,
            credit: record.credit || 0,
            reference: record.reference || '',
            documentNumber: record.documentNumber || '',
            type: 'book',
            matched: false
        }));
    }

    normalizeDescription(description) {
        if (!description) return '';

        return description
            .toLowerCase()
            .replace(/\s+/g, ' ')
            .replace(/[^\w\s\-]/g, '')
            .trim();
    }

    async performMatching(bankStatements, bookRecords, options) {
        const matches = [];
        const algorithm = options.matchingAlgorithm || 'fuzzy';

        this.logger.info(`Realizando matching con algoritmo: ${algorithm}`);

        for (const bankStatement of bankStatements) {
            if (bankStatement.matched) continue;

            let bestMatch = null;
            let bestScore = 0;

            for (const bookRecord of bookRecords) {
                if (bookRecord.matched) continue;

                const score = this.calculateMatchScore(bankStatement, bookRecord, options, algorithm);

                if (score > bestScore && score >= this.getMinimumScore(algorithm)) {
                    bestMatch = bookRecord;
                    bestScore = score;
                }
            }

            if (bestMatch) {
                const match = {
                    id: crypto.randomUUID(),
                    bankStatement: bankStatement,
                    bookRecord: bestMatch,
                    score: bestScore,
                    matchType: this.determineMatchType(bestScore),
                    differences: this.calculateDifferences(bankStatement, bestMatch),
                    confidence: this.scoreToConfidence(bestScore)
                };

                matches.push(match);
                bankStatement.matched = true;
                bestMatch.matched = true;

                this.logger.debug(`Match encontrado: ${bankStatement.description} <-> ${bestMatch.description} (score: ${bestScore})`);
            }
        }

        return { matches, algorithm };
    }

    calculateMatchScore(bankStatement, bookRecord, options, algorithm) {
        let score = 0;
        const weights = this.getWeights(algorithm);

        const amountMatch = this.calculateAmountMatch(bankStatement.amount, bookRecord.amount, options.toleranceAmount);
        score += amountMatch * weights.amount;

        const dateMatch = this.calculateDateMatch(bankStatement.date, bookRecord.date, options.toleranceDays);
        score += dateMatch * weights.date;

        const descriptionMatch = this.calculateDescriptionMatch(bankStatement.description, bookRecord.description);
        score += descriptionMatch * weights.description;

        const referenceMatch = this.calculateReferenceMatch(bankStatement.reference, bookRecord.reference);
        score += referenceMatch * weights.reference;

        return Math.min(100, score);
    }

    getWeights(algorithm) {
        const weights = {
            'strict': {
                amount: 40,
                date: 30,
                description: 20,
                reference: 10
            },
            'fuzzy': {
                amount: 35,
                date: 25,
                description: 25,
                reference: 15
            },
            'ai_enhanced': {
                amount: 30,
                date: 20,
                description: 25,
                reference: 15
            }
        };

        return weights[algorithm] || weights['fuzzy'];
    }

    getMinimumScore(algorithm) {
        const minimumScores = {
            'strict': 85,
            'fuzzy': 70,
            'ai_enhanced': 65
        };

        return minimumScores[algorithm] || 70;
    }

    calculateAmountMatch(amount1, amount2, tolerance = 0.01) {
        const diff = Math.abs(amount1 - amount2);
        if (diff <= tolerance) return 100;
        if (diff <= tolerance * 10) return 80;
        if (diff <= tolerance * 50) return 60;
        if (diff <= tolerance * 100) return 40;
        return 0;
    }

    calculateDateMatch(date1, date2, toleranceDays = 2) {
        const diffDays = Math.abs((date1.getTime() - date2.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 100;
        if (diffDays <= toleranceDays) return 90;
        if (diffDays <= toleranceDays * 2) return 70;
        if (diffDays <= toleranceDays * 3) return 50;
        return 0;
    }

    calculateDescriptionMatch(desc1, desc2) {
        if (!desc1 || !desc2) return 0;

        if (desc1 === desc2) return 100;

        const similarity = this.calculateStringSimilarity(desc1, desc2);

        const words1 = desc1.split(' ').filter(w => w.length > 3);
        const words2 = desc2.split(' ').filter(w => w.length > 3);
        const commonWords = words1.filter(w => words2.includes(w));
        const keywordBonus = (commonWords.length / Math.max(words1.length, words2.length)) * 20;

        return Math.min(100, similarity * 80 + keywordBonus);
    }

    calculateReferenceMatch(ref1, ref2) {
        if (!ref1 || !ref2) return 0;
        if (ref1 === ref2) return 100;

        const numbers1 = ref1.match(/\d+/g) || [];
        const numbers2 = ref2.match(/\d+/g) || [];
        const commonNumbers = numbers1.filter(n => numbers2.includes(n));

        if (commonNumbers.length > 0) return 80;

        return this.calculateStringSimilarity(ref1, ref2) * 60;
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

    determineMatchType(score) {
        if (score >= 95) return 'exact';
        if (score >= 85) return 'high_confidence';
        if (score >= 70) return 'medium_confidence';
        return 'low_confidence';
    }

    scoreToConfidence(score) {
        return Math.round(score);
    }

    calculateDifferences(bankStatement, bookRecord) {
        const differences = [];

        if (Math.abs(bankStatement.amount - bookRecord.amount) > 0.01) {
            differences.push({
                type: 'amount',
                bank: bankStatement.amount,
                book: bookRecord.amount,
                difference: bankStatement.amount - bookRecord.amount
            });
        }

        const dateDiff = Math.abs((bankStatement.date.getTime() - bookRecord.date.getTime()) / (1000 * 60 * 60 * 24));
        if (dateDiff > 0) {
            differences.push({
                type: 'date',
                bank: bankStatement.date.toISOString().split('T')[0],
                book: bookRecord.date.toISOString().split('T')[0],
                daysDifference: Math.round(dateDiff)
            });
        }

        if (bankStatement.description !== bookRecord.description) {
            differences.push({
                type: 'description',
                bank: bankStatement.originalDescription,
                book: bookRecord.originalDescription
            });
        }

        return differences;
    }

    identifyDiscrepancies(matchingResults, options) {
        const discrepancies = [];

        const unmatchedBankStatements = matchingResults.matches
            .map(m => m.bankStatement)
            .filter(bs => !bs.matched);

        unmatchedBankStatements.forEach(statement => {
            discrepancies.push({
                id: crypto.randomUUID(),
                type: 'unmatched_bank',
                description: `Movimiento bancario sin registro contable`,
                bankStatement: statement,
                impact: Math.abs(statement.amount),
                severity: this.calculateSeverity(statement.amount),
                suggestedActions: this.suggestActions('unmatched_bank', statement)
            });
        });

        const unmatchedBookRecords = matchingResults.matches
            .map(m => m.bookRecord)
            .filter(br => !br.matched);

        unmatchedBookRecords.forEach(record => {
            discrepancies.push({
                id: crypto.randomUUID(),
                type: 'unmatched_book',
                description: `Registro contable sin movimiento bancario`,
                bookRecord: record,
                impact: Math.abs(record.amount),
                severity: this.calculateSeverity(record.amount),
                suggestedActions: this.suggestActions('unmatched_book', record)
            });
        });

        matchingResults.matches
            .filter(match => match.confidence < 80 || match.differences.length > 0)
            .forEach(match => {
                discrepancies.push({
                    id: crypto.randomUUID(),
                    type: 'low_confidence_match',
                    description: `Coincidencia con baja confianza o diferencias`,
                    match: match,
                    impact: Math.max(Math.abs(match.bankStatement.amount), Math.abs(match.bookRecord.amount)),
                    severity: match.confidence < 60 ? 'high' : 'medium',
                    suggestedActions: this.suggestActions('low_confidence_match', match)
                });
            });

        return discrepancies.sort((a, b) => b.impact - a.impact);
    }

    calculateSeverity(amount) {
        const absAmount = Math.abs(amount);
        if (absAmount > 100000) return 'high';
        if (absAmount > 10000) return 'medium';
        return 'low';
    }

    suggestActions(discrepancyType, data) {
        const actions = [];

        switch (discrepancyType) {
            case 'unmatched_bank':
                actions.push('Verificar si existe comprobante contable');
                actions.push('Crear asiento contable si corresponde');
                if (Math.abs(data.amount) > 1000) {
                    actions.push('Solicitar documentación de respaldo');
                }
                break;

            case 'unmatched_book':
                actions.push('Verificar si el movimiento está pendiente en el banco');
                actions.push('Confirmar fecha de valuación vs fecha de emisión');
                actions.push('Revisar si corresponde a período siguiente');
                break;

            case 'low_confidence_match':
                actions.push('Revisar manualmente la coincidencia');
                actions.push('Verificar documentación de respaldo');
                if (data.differences?.some(d => d.type === 'amount')) {
                    actions.push('Investigar diferencia de monto');
                }
                break;
        }

        return actions;
    }

    async createAdjustmentEntries(discrepancies, clientId) {
        const adjustmentEntries = [];

        for (const discrepancy of discrepancies) {
            if (discrepancy.type === 'unmatched_bank' && discrepancy.severity !== 'low') {
                const entry = await this.createBankAdjustmentEntry(discrepancy, clientId);
                if (entry) adjustmentEntries.push(entry);
            }
        }

        return adjustmentEntries;
    }

    async createBankAdjustmentEntry(discrepancy, clientId) {
        const bankStatement = discrepancy.bankStatement;
        const isDebit = bankStatement.amount > 0;

        const entry = {
            id: crypto.randomUUID(),
            clientId: clientId,
            date: bankStatement.date,
            description: `Ajuste conciliación: ${bankStatement.originalDescription}`,
            reference: `CONC-${discrepancy.id.substring(0, 8)}`,
            type: 'adjustment',
            movements: []
        };

        entry.movements.push({
            account: '1.1.02',
            description: entry.description,
            debit: isDebit ? Math.abs(bankStatement.amount) : 0,
            credit: isDebit ? 0 : Math.abs(bankStatement.amount)
        });

        const contraAccount = this.determineContraAccount(bankStatement);
        entry.movements.push({
            account: contraAccount,
            description: entry.description,
            debit: isDebit ? 0 : Math.abs(bankStatement.amount),
            credit: isDebit ? Math.abs(bankStatement.amount) : 0
        });

        return entry;
    }

    determineContraAccount(bankStatement) {
        const description = bankStatement.description.toLowerCase();

        if (description.includes('interes') || description.includes('rendimiento')) {
            return '4.2.01';
        }
        if (description.includes('comision') || description.includes('cargo')) {
            return '5.4.01';
        }
        if (description.includes('cheque') || description.includes('transferencia')) {
            return '1.2.01';
        }

        return '1.1.99';
    }

    calculateStatistics(matchingResults, discrepancies) {
        const totalBankMovements = matchingResults.matches.length +
            discrepancies.filter(d => d.type === 'unmatched_bank').length;

        const totalBookRecords = matchingResults.matches.length +
            discrepancies.filter(d => d.type === 'unmatched_book').length;

        const totalMatches = matchingResults.matches.length;
        const exactMatches = matchingResults.matches.filter(m => m.matchType === 'exact').length;
        const highConfidenceMatches = matchingResults.matches.filter(m => m.confidence >= 85).length;

        const totalDiscrepancyAmount = discrepancies.reduce((sum, d) => sum + d.impact, 0);
        const highSeverityDiscrepancies = discrepancies.filter(d => d.severity === 'high').length;

        return {
            totalBankMovements,
            totalBookRecords,
            totalMatches,
            exactMatches,
            highConfidenceMatches,
            matchingRate: totalMatches / Math.max(totalBankMovements, totalBookRecords) * 100,
            exactMatchRate: totalMatches > 0 ? exactMatches / totalMatches * 100 : 0,
            averageConfidence: totalMatches > 0 ? matchingResults.matches.reduce((sum, m) => sum + m.confidence, 0) / totalMatches : 0,
            totalDiscrepancies: discrepancies.length,
            totalDiscrepancyAmount,
            highSeverityDiscrepancies,
            reconciliationCompleteness: (totalMatches / (totalBankMovements + totalBookRecords)) * 100
        };
    }

    async saveReconciliationResult(data) {
        try {
            // TODO: Implementar según tu DatabaseManager
            return data.reconciliationId;

        } catch (error) {
            this.logger.error('Error guardando resultado de conciliación:', error);
            throw {
                code: 'SAVE_RECONCILIATION_ERROR',
                message: 'Error guardando resultado de conciliación',
                details: { originalError: error.message }
            };
        }
    }

    generateRecommendations(matchingResults, discrepancies) {
        const recommendations = [];

        const matchingRate = (matchingResults.matches.length /
            (matchingResults.matches.length + discrepancies.length)) * 100;

        if (matchingRate < 80) {
            recommendations.push({
                type: 'process_improvement',
                priority: 'high',
                message: 'La tasa de coincidencia es baja. Revisar procesos de registro contable y tiempos de valuación.',
                action: 'Implementar controles de calidad en el registro de operaciones'
            });
        }

        const highAmountDiscrepancies = discrepancies.filter(d => d.impact > 50000);
        if (highAmountDiscrepancies.length > 0) {
            recommendations.push({
                type: 'urgent_review',
                priority: 'high',
                message: `${highAmountDiscrepancies.length} discrepancias de montos elevados requieren atención inmediata.`,
                action: 'Revisar y documentar movimientos de montos superiores a $50,000'
            });
        }

        const lowConfidenceMatches = matchingResults.matches.filter(m => m.confidence < 70).length;
        if (lowConfidenceMatches > matchingResults.matches.length * 0.2) {
            recommendations.push({
                type: 'data_quality',
                priority: 'medium',
                message: 'Muchas coincidencias con baja confianza. Mejorar descripción de operaciones.',
                action: 'Estandarizar nomenclatura en descripciones contables'
            });
        }

        if (discrepancies.some(d => d.type === 'unmatched_bank' && d.impact > 10000)) {
            recommendations.push({
                type: 'compliance',
                priority: 'medium',
                message: 'Movimientos bancarios sin registro contable detectados.',
                action: 'Implementar controles diarios de movimientos bancarios'
            });
        }

        return recommendations;
    }
}