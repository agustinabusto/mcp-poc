// src/client/services/apiClient.js
import { api } from '../config/api.js';

export const apiClient = {
    get: (url, options = {}) => api.get(url, options),
    post: (url, data, options = {}) => api.post(url, data, options),
    put: (url, data, options = {}) => api.put(url, data, options),
    delete: (url, options = {}) => api.delete(url, options),
    patch: (url, data, options = {}) => api.patch(url, data, options)
};

export default apiClient;