// ===================================================
// src/server/services/contributors-service.js
// ===================================================
import { ContributorsModel } from '../models/contributors-model.js';
import { AfipService } from './afip-service.js';
import { ValidationService } from './validation-service.js';
import { LoggerService } from './logger-service.js';
import { CuitUtils } from '../utils/cuit-utils.js';

export class ContributorsService {
    static logger = LoggerService.createLogger('ContributorsService');

    /**
     * Obtener lista paginada de contribuyentes con filtros
     */
    static async getContributors(filters = {}, pagination = {}) {
        try {
            const {
                search,
                categoria,
                situacionAfip,
                activo = true
            } = filters;

            const {
                page = 1,
                limit = 20,
                sortBy = 'razonSocial',
                sortOrder = 'asc'
            } = pagination;

            const queryFilters = { activo };

            // Aplicar filtros de búsqueda
            if (search) {
                queryFilters.search = search.trim();
            }

            if (categoria) {
                queryFilters.categoria = categoria;
            }

            if (situacionAfip) {
                queryFilters.situacionAfip = situacionAfip;
            }

            const result = await ContributorsModel.findWithPagination(
                queryFilters,
                {
                    page: parseInt(page),
                    limit: Math.min(parseInt(limit), 100), // Max 100 items por página
                    sortBy,
                    sortOrder: sortOrder.toLowerCase()
                }
            );

            ContributorsService.logger.info(`Retrieved ${result.contributors.length} contributors`);

            return result;

        } catch (error) {
            ContributorsService.logger.error('Error getting contributors:', error);
            throw error;
        }
    }

    /**
     * Obtener contribuyente por CUIT
     */
    static async getContributorByCuit(cuit) {
        try {
            if (!CuitUtils.isValid(cuit)) {
                throw new Error('CUIT inválido');
            }

            const contributor = await ContributorsModel.findByCuit(cuit);

            if (contributor) {
                ContributorsService.logger.info(`Retrieved contributor: ${cuit}`);
            }

            return contributor;

        } catch (error) {
            ContributorsService.logger.error(`Error getting contributor ${cuit}:`, error);
            throw error;
        }
    }

    /**
     * Crear nuevo contribuyente
     */
    static async createContributor(contributorData) {
        try {
            // Validar CUIT
            if (!CuitUtils.isValid(contributorData.cuit)) {
                throw new Error('CUIT inválido');
            }

            // Enriquecer datos con información de AFIP si está disponible
            const enrichedData = await ContributorsService.enrichWithAfipData(contributorData);

            // Preparar datos para inserción
            const contributorToInsert = {
                ...enrichedData,
                fechaCreacion: new Date(),
                fechaModificacion: new Date(),
                activo: true
            };

            const newContributor = await ContributorsModel.create(contributorToInsert);

            ContributorsService.logger.info(`Created contributor: ${contributorData.cuit}`);

            return newContributor;

        } catch (error) {
            ContributorsService.logger.error('Error creating contributor:', error);
            throw error;
        }
    }

    /**
     * Actualizar contribuyente existente
     */
    static async updateContributor(cuit, updateData) {
        try {
            if (!CuitUtils.isValid(cuit)) {
                throw new Error('CUIT inválido');
            }

            // Preparar datos de actualización
            const dataToUpdate = {
                ...updateData,
                fechaModificacion: new Date()
            };

            // Remover campos que no deben actualizarse directamente
            delete dataToUpdate.cuit;
            delete dataToUpdate.fechaCreacion;
            delete dataToUpdate.id;

            const updatedContributor = await ContributorsModel.update(cuit, dataToUpdate);

            if (!updatedContributor) {
                throw new Error('Contribuyente no encontrado');
            }

            ContributorsService.logger.info(`Updated contributor: ${cuit}`);

            return updatedContributor;

        } catch (error) {
            ContributorsService.logger.error(`Error updating contributor ${cuit}:`, error);
            throw error;
        }
    }

    /**
     * Eliminar contribuyente (soft delete)
     */
    static async deleteContributor(cuit) {
        try {
            if (!CuitUtils.isValid(cuit)) {
                throw new Error('CUIT inválido');
            }

            const deleted = await ContributorsModel.softDelete(cuit);

            if (deleted) {
                ContributorsService.logger.info(`Deleted contributor: ${cuit}`);
            }

            return deleted;

        } catch (error) {
            ContributorsService.logger.error(`Error deleting contributor ${cuit}:`, error);
            throw error;
        }
    }

    /**
     * Importación masiva de contribuyentes
     */
    static async importContributors(contributors, options = {}) {
        const { overwriteExisting = false, validateAfip = false } = options;

        const results = {
            imported: 0,
            updated: 0,
            failed: 0,
            errors: []
        };

        try {
            ContributorsService.logger.info(`Starting import of ${contributors.length} contributors`);

            for (const contributorData of contributors) {
                try {
                    // Validar CUIT
                    if (!CuitUtils.isValid(contributorData.cuit)) {
                        results.failed++;
                        results.errors.push({
                            cuit: contributorData.cuit,
                            error: 'CUIT inválido'
                        });
                        continue;
                    }

                    // Verificar si existe
                    const existing = await ContributorsModel.findByCuit(contributorData.cuit);

                    if (existing) {
                        if (overwriteExisting) {
                            await ContributorsService.updateContributor(contributorData.cuit, contributorData);
                            results.updated++;
                        } else {
                            results.failed++;
                            results.errors.push({
                                cuit: contributorData.cuit,
                                error: 'Ya existe y overwriteExisting es false'
                            });
                        }
                    } else {
                        // Validar con AFIP si está habilitado
                        let enrichedData = contributorData;
                        if (validateAfip) {
                            enrichedData = await ContributorsService.enrichWithAfipData(contributorData);
                        }

                        await ContributorsService.createContributor(enrichedData);
                        results.imported++;
                    }

                } catch (error) {
                    results.failed++;
                    results.errors.push({
                        cuit: contributorData.cuit,
                        error: error.message
                    });
                    ContributorsService.logger.warn(`Failed to import contributor ${contributorData.cuit}:`, error.message);
                }
            }

            ContributorsService.logger.info(`Import completed: ${results.imported} imported, ${results.updated} updated, ${results.failed} failed`);

            return results;

        } catch (error) {
            ContributorsService.logger.error('Error in bulk import:', error);
            throw error;
        }
    }

    /**
     * Obtener compliance de contribuyente
     */
    static async getContributorCompliance(cuit) {
        try {
            if (!CuitUtils.isValid(cuit)) {
                throw new Error('CUIT inválido');
            }

            const contributor = await ContributorsModel.findByCuit(cuit);
            if (!contributor) {
                throw new Error('Contribuyente no encontrado');
            }

            // Verificar compliance con AFIP
            const afipCompliance = await AfipService.checkCompliance(cuit);

            const compliance = {
                cuit: cuit,
                razonSocial: contributor.razonSocial,
                situacionAfip: contributor.situacionAfip,
                categoria: contributor.categoria,
                afipCompliance: afipCompliance,
                lastCheck: new Date(),
                issues: [],
                score: 100
            };

            // Calcular score de compliance
            if (afipCompliance && !afipCompliance.success) {
                compliance.score -= 30;
                compliance.issues.push('Error verificando datos con AFIP');
            }

            if (contributor.situacionAfip !== 'activo') {
                compliance.score -= 50;
                compliance.issues.push('Situación AFIP no activa');
            }

            if (!contributor.email) {
                compliance.score -= 10;
                compliance.issues.push('Email no registrado');
            }

            return compliance;

        } catch (error) {
            ContributorsService.logger.error(`Error getting compliance for ${cuit}:`, error);
            throw error;
        }
    }

    /**
     * Sincronizar con AFIP
     */
    static async syncWithAfip(cuit) {
        try {
            if (!CuitUtils.isValid(cuit)) {
                throw new Error('CUIT inválido');
            }

            const contributor = await ContributorsModel.findByCuit(cuit);
            if (!contributor) {
                throw new Error('Contribuyente no encontrado');
            }

            // Obtener datos actuales de AFIP
            const afipData = await AfipService.getContributorInfo(cuit);

            if (!afipData.success) {
                throw new Error('Error obteniendo datos de AFIP: ' + afipData.error);
            }

            // Actualizar con datos de AFIP
            const updateData = {
                razonSocial: afipData.data.razonSocial || contributor.razonSocial,
                situacionAfip: afipData.data.situacionAfip || contributor.situacionAfip,
                categoria: afipData.data.categoria || contributor.categoria,
                direccion: afipData.data.direccion || contributor.direccion,
                afipData: afipData.data,
                lastAfipSync: new Date()
            };

            const updatedContributor = await ContributorsService.updateContributor(cuit, updateData);

            ContributorsService.logger.info(`Synced contributor ${cuit} with AFIP`);

            return {
                contributor: updatedContributor,
                syncDate: new Date(),
                changes: ContributorsService.detectChanges(contributor, updateData)
            };

        } catch (error) {
            ContributorsService.logger.error(`Error syncing ${cuit} with AFIP:`, error);
            throw error;
        }
    }

    /**
     * Obtener estadísticas de contribuyentes
     */
    static async getContributorsStats() {
        try {
            const stats = await ContributorsModel.getStats();

            return {
                total: stats.total,
                activos: stats.activos,
                inactivos: stats.inactivos,
                porCategoria: stats.porCategoria,
                porSituacionAfip: stats.porSituacionAfip,
                creadosUltimos30Dias: stats.creadosUltimos30Dias,
                lastUpdate: new Date()
            };

        } catch (error) {
            ContributorsService.logger.error('Error getting contributors stats:', error);
            throw error;
        }
    }

    /**
     * Enriquecer datos del contribuyente con información de AFIP
     */
    static async enrichWithAfipData(contributorData) {
        try {
            const afipData = await AfipService.getContributorInfo(contributorData.cuit);

            if (afipData.success) {
                return {
                    ...contributorData,
                    razonSocial: afipData.data.razonSocial || contributorData.razonSocial,
                    situacionAfip: afipData.data.situacionAfip || contributorData.situacionAfip,
                    categoria: afipData.data.categoria || contributorData.categoria,
                    direccion: afipData.data.direccion || contributorData.direccion,
                    afipData: afipData.data,
                    lastAfipSync: new Date()
                };
            }

            return contributorData;

        } catch (error) {
            ContributorsService.logger.warn(`Failed to enrich with AFIP data for ${contributorData.cuit}:`, error.message);
            return contributorData;
        }
    }

    /**
     * Detectar cambios entre datos anteriores y nuevos
     */
    static detectChanges(oldData, newData) {
        const changes = [];
        const fieldsToCheck = ['razonSocial', 'situacionAfip', 'categoria', 'direccion', 'email', 'telefono'];

        fieldsToCheck.forEach(field => {
            if (oldData[field] !== newData[field]) {
                changes.push({
                    field,
                    oldValue: oldData[field],
                    newValue: newData[field]
                });
            }
        });

        return changes;
    }
}