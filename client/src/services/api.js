/**
 * API Client for Nudge Frontend
 * Axios instance with interceptors for error handling and auth (future).
 */

import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add auth token here when implemented
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // Server responded with error status
      const message = error.response.data?.message || error.message;
      return Promise.reject(new Error(message));
    } else if (error.request) {
      // Network error
      return Promise.reject(new Error('Network error - please check your connection'));
    } else {
      // Other error
      return Promise.reject(new Error(error.message));
    }
  }
);

/**
 * Reminder API endpoints
 */
export const remindersApi = {
  /**
   * List all reminders
   * @param {Object} params - Query parameters
   * @param {string} params.status - Filter by status
   * @param {string} params.category - Filter by category
   * @param {number} params.page - Page number
   * @param {number} params.limit - Items per page
   * @returns {Promise<Array>}
   */
  list: async (params = {}) => {
    const response = await api.get('/reminders', { params });
    return response.data.data || response.data;
  },

  /**
   * Get a single reminder by ID
   * @param {string} id - Reminder ID
   * @returns {Promise<Object>}
   */
  get: async (id) => {
    const response = await api.get(`/reminders/${id}`);
    return response.data.data || response.data;
  },

  /**
   * Create a new reminder
   * @param {Object} data - Reminder data
   * @returns {Promise<Object>}
   */
  create: async (data) => {
    const response = await api.post('/reminders', data);
    return response.data.data || response.data;
  },

  /**
   * Update a reminder (partial update)
   * @param {string} id - Reminder ID
   * @param {Object} data - Updated fields
   * @returns {Promise<Object>}
   */
  update: async (id, data) => {
    const response = await api.patch(`/reminders/${id}`, data);
    return response.data.data || response.data;
  },

  /**
   * Delete a reminder
   * @param {string} id - Reminder ID
   * @returns {Promise<void>}
   */
  delete: async (id) => {
    await api.delete(`/reminders/${id}`);
  },

  /**
   * Mark reminder as completed
   * @param {string} id - Reminder ID
   * @returns {Promise<Object>}
   */
  complete: async (id) => {
    const response = await api.patch(`/reminders/${id}/complete`);
    return response.data.data || response.data;
  }
};

/**
 * Notification API endpoints
 */
export const notificationsApi = {
  /**
   * List notification logs
   * @param {Object} params - Query parameters
   * @returns {Promise<Array>}
   */
  list: async (params = {}) => {
    const response = await api.get('/notifications', { params });
    return response.data.data || response.data;
  }
};

/**
 * Health check
 */
export const healthApi = {
  check: async () => {
    const response = await api.get('/health');
    return response.data;
  }
};

export default api;