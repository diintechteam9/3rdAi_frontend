import api from './api';

const chantingService = {
  // Get all chantings
  getAll: async () => {
    try {
      const response = await api.get('/chantings');
      // Handle both response structures: { data: { data: [...] } } or { data: [...] }
      const data = response.data?.data || response.data;
      return Array.isArray(data) ? data : [];
    } catch (error) {
      const errorMessage = error.message || (typeof error === 'string' ? error : 'Failed to load chantings');
      throw new Error(errorMessage);
    }
  },

  // Get single chanting
  getById: async (id) => {
    try {
      const response = await api.get(`/chantings/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Get presigned URL for direct S3 upload
  getUploadUrl: async (fileName, contentType, fileType) => {
    try {
      const response = await api.post('/chantings/upload-url', {
        fileName,
        contentType,
        fileType
      });
      return response.data.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Upload file directly to S3
  uploadToS3: async (uploadUrl, file, onProgress) => {
    try {
      const xhr = new XMLHttpRequest();
      
      return new Promise((resolve, reject) => {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable && onProgress) {
            const percentComplete = (e.loaded / e.total) * 100;
            onProgress(percentComplete);
          }
        });
        
        xhr.addEventListener('load', () => {
          if (xhr.status === 200) {
            resolve();
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        });
        
        xhr.addEventListener('error', () => {
          reject(new Error('Upload failed'));
        });
        
        xhr.open('PUT', uploadUrl);
        xhr.setRequestHeader('Content-Type', file.type);
        xhr.send(file);
      });
    } catch (error) {
      throw error;
    }
  },

  // Create chanting with direct S3 URLs
  createDirect: async (data) => {
    try {
      const response = await api.post('/chantings/direct', data);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Update chanting with direct S3 URLs
  updateDirect: async (id, data) => {
    try {
      const response = await api.put(`/chantings/${id}/direct`, data);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Delete chanting
  delete: async (id) => {
    try {
      const response = await api.delete(`/chantings/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Toggle status
  toggleStatus: async (id) => {
    try {
      const response = await api.patch(`/chantings/${id}/toggle-status`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  }
};

export default chantingService;
