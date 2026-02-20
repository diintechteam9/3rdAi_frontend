import api from './api';

const dreamRequestService = {
  // Get all dream requests
  getAll: async (params = {}) => {
    const response = await api.get('/dream-requests', { params });
    return response.data;
  },

  // Get single dream request
  getById: async (id) => {
    const response = await api.get(`/dream-requests/${id}`);
    return response.data;
  },

  // Create new dream request
  create: async (data) => {
    const response = await api.post('/dream-requests', data);
    return response.data;
  },

  // Update dream request status
  updateStatus: async (id, data) => {
    const response = await api.patch(`/dream-requests/${id}/status`, data);
    return response.data;
  },

  // Delete dream request
  delete: async (id) => {
    const response = await api.delete(`/dream-requests/${id}`);
    return response.data;
  },

  // Get statistics
  getStats: async (params = {}) => {
    const response = await api.get('/dream-requests/analytics/stats', { params });
    return response.data;
  }
};

export default dreamRequestService;
