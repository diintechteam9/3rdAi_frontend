import api from './api.js';

const prathanaService = {
  // Get all prathanas
  getAll: async () => {
    try {
      const response = await api.get('/prathanas');
      return response.data.data;
    } catch (error) {
      console.error('Error fetching prathanas:', error);
      throw error;
    }
  },

  // Get single prathana
  getById: async (id) => {
    try {
      const response = await api.get(`/prathanas/${id}`);
      return response.data.data;
    } catch (error) {
      console.error('Error fetching prathana:', error);
      throw error;
    }
  },

  // Create prathana with direct S3 URLs
  createDirect: async (prathanaData) => {
    try {
      const response = await api.post('/prathanas', {
        name: prathanaData.name,
        text: prathanaData.text,
        category: prathanaData.category,
        duration: prathanaData.duration,
        videoKey: prathanaData.videoKey,
        thumbnailKey: prathanaData.thumbnailKey,
        youtubeLink: prathanaData.youtubeLink
      });
      return response.data;
    } catch (error) {
      console.error('Error creating prathana:', error);
      throw error;
    }
  },

  // Update prathana with direct S3 URLs
  updateDirect: async (id, prathanaData) => {
    try {
      const response = await api.put(`/prathanas/${id}`, {
        name: prathanaData.name,
        text: prathanaData.text,
        category: prathanaData.category,
        duration: prathanaData.duration,
        videoKey: prathanaData.videoKey,
        thumbnailKey: prathanaData.thumbnailKey,
        youtubeLink: prathanaData.youtubeLink
      });
      return response.data;
    } catch (error) {
      console.error('Error updating prathana:', error);
      throw error;
    }
  },

  // Delete prathana
  delete: async (id) => {
    try {
      const response = await api.delete(`/prathanas/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting prathana:', error);
      throw error;
    }
  },

  // Toggle prathana status
  toggleStatus: async (id) => {
    try {
      const response = await api.patch(`/prathanas/${id}/toggle-status`);
      return response.data;
    } catch (error) {
      console.error('Error toggling prathana status:', error);
      throw error;
    }
  },

  // Get S3 upload URL
  getUploadUrl: async (fileName, contentType, uploadType = 'video') => {
    try {
      const response = await api.post('/prathanas/upload-url', {
        fileName,
        contentType,
        fileType: uploadType
      });
      return response.data.data;
    } catch (error) {
      console.error('Error getting upload URL:', error);
      throw error;
    }
  },

  // Upload file to S3
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
  }
};

export default prathanaService;