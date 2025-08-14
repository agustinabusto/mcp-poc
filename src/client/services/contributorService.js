// src/client/services/contributorService.js
import { apiClient } from './apiClient.js';

export class ContributorService {
    static async getContributors(params = {}) {
        const response = await apiClient.get('/contributors', { params });
        return response.data;
    }

    static async getContributor(id) {
        const response = await apiClient.get(`/contributors/${id}`);
        return response.data;
    }

    static async createContributor(contributorData) {
        const response = await apiClient.post('/contributors', contributorData);
        return response.data;
    }

    static async updateContributor(id, contributorData) {
        const response = await apiClient.put(`/contributors/${id}`, contributorData);
        return response.data;
    }

    static async deleteContributor(id) {
        const response = await apiClient.delete(`/contributors/${id}`);
        return response.data;
    }

    static async validateCuit(cuit) {
        const response = await apiClient.post('/contributors/validate-cuit', { cuit });
        return response.data;
    }

    static async bulkImport(contributorsData) {
        const response = await apiClient.post('/contributors/bulk-import', contributorsData);
        return response.data;
    }

    static async exportContributors(format = 'csv', filters = {}) {
        const response = await apiClient.get('/contributors/export', { 
            params: { format, ...filters },
            responseType: 'blob'
        });
        return response.data;
    }
}