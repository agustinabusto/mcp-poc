// src/client/services/userService.js
import { apiClient } from './apiClient';

export class UserService {
    static async getUsers(params = {}) {
        const response = await apiClient.get('/users', { params });
        return response.data;
    }

    static async getUser(id) {
        const response = await apiClient.get(`/users/${id}`);
        return response.data;
    }

    static async createUser(userData) {
        const response = await apiClient.post('/users', userData);
        return response.data;
    }

    static async updateUser(id, userData) {
        const response = await apiClient.put(`/users/${id}`, userData);
        return response.data;
    }

    static async deleteUser(id) {
        const response = await apiClient.delete(`/users/${id}`);
        return response.data;
    }

    static async resetPassword(id) {
        const response = await apiClient.post(`/users/${id}/reset-password`);
        return response.data;
    }

    static async changePassword(id, currentPassword, newPassword) {
        const response = await apiClient.put(`/users/${id}/password`, {
            currentPassword,
            newPassword
        });
        return response.data;
    }
}