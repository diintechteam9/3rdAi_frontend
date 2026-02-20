import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const pujaPadhatiService = {
  // Get all pujas
  getAll: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      if (filters.clientId) params.append('clientId', filters.clientId);
      if (filters.status) params.append('status', filters.status);
      if (filters.category) params.append('category', filters.category);
      if (filters.subcategory) params.append('subcategory', filters.subcategory);
      
      const response = await axios.get(`${API_URL}/puja-padhati?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching pujas:', error);
      throw error;
    }
  },

  // Get single puja by ID
  getById: async (id) => {
    try {
      const response = await axios.get(`${API_URL}/puja-padhati/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching puja:', error);
      throw error;
    }
  },

  // Get presigned URL for S3 upload
  getUploadUrl: async (fileName, fileType) => {
    try {
      const response = await axios.post(`${API_URL}/puja-padhati/upload-url`, {
        fileName,
        fileType
      });
      return response.data;
    } catch (error) {
      console.error('Error getting upload URL:', error);
      throw error;
    }
  },

  // Upload file to S3
  uploadToS3: async (uploadUrl, file, onProgress) => {
    try {
      await axios.put(uploadUrl, file, {
        headers: {
          'Content-Type': file.type
        },
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const progress = Math.round((progressEvent.loaded / progressEvent.total) * 100);
            onProgress(progress);
          }
        }
      });
    } catch (error) {
      console.error('Error uploading to S3:', error);
      throw new Error('Failed to upload file to S3');
    }
  },

  // Create new puja
  create: async (data) => {
    try {
      const response = await axios.post(`${API_URL}/puja-padhati`, data);
      return response.data;
    } catch (error) {
      console.error('Error creating puja:', error);
      throw error;
    }
  },

  // Update puja
  update: async (id, data) => {
    try {
      const response = await axios.put(`${API_URL}/puja-padhati/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('Error updating puja:', error);
      throw error;
    }
  },

  // Toggle status
  toggleStatus: async (id) => {
    try {
      const response = await axios.patch(`${API_URL}/puja-padhati/${id}/toggle-status`);
      return response.data;
    } catch (error) {
      console.error('Error toggling status:', error);
      throw error;
    }
  },

  // Delete puja
  delete: async (id) => {
    try {
      const response = await axios.delete(`${API_URL}/puja-padhati/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting puja:', error);
      throw error;
    }
  }
};

export default pujaPadhatiService;
