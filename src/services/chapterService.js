import api from './api.js';

const chapterService = {
  // Get all chapters
  getChapters: async (includeInactive = false) => {
    try {
      const params = new URLSearchParams();
      if (includeInactive) params.append('includeInactive', 'true');
      
      const response = await api.get(`/chapters?${params.toString()}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get chapter by ID
  getChapterById: async (id) => {
    try {
      const response = await api.get(`/chapters/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Create chapter
  createChapter: async (chapterData) => {
    try {
      const response = await api.post('/chapters', chapterData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Update chapter
  updateChapter: async (id, chapterData) => {
    try {
      const response = await api.put(`/chapters/${id}`, chapterData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Delete chapter
  deleteChapter: async (id) => {
    try {
      const response = await api.delete(`/chapters/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Toggle chapter status
  toggleStatus: async (id) => {
    try {
      const response = await api.patch(`/chapters/${id}/toggle-status`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Upload chapter image
  uploadChapterImage: async (id, file) => {
    try {
      const formData = new FormData();
      formData.append('image', file);
      
      const response = await api.post(`/chapters/${id}/upload-image`, formData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }
};

export { chapterService };