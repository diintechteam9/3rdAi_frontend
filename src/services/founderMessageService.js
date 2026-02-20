import api from './api.js';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://stage.brahmakosh.com/api';

// Helper to get client token for founder messages
const getClientToken = () => {
  const token = localStorage.getItem('token_client');
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.role === 'client') {
        return token;
      }
    } catch (e) {
      return token;
    }
  }
  return null;
};

const founderMessageService = {
  // Get all founder messages (temporary - no auth)
  async getAllMessages() {
    try {
      const response = await api.request('/founder-messages?includeInactive=true');
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Get single founder message
  async getMessage(id) {
    try {
      const response = await api.request(`/founder-messages/${id}`);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Create new founder message (without image)
  async createMessage(messageData) {
    try {
      const clientToken = localStorage.getItem('token_client');
      
      if (!clientToken) {
        return { 
          success: false, 
          error: 'You must be logged in as a client to create founder messages. Please login first.' 
        };
      }
      
      // Verify token role
      try {
        const payload = JSON.parse(atob(clientToken.split('.')[1]));
        
        if (payload.role !== 'client') {
          return { 
            success: false, 
            error: `Invalid token role: ${payload.role}. Expected 'client'. Please logout and login as a client.` 
          };
        }
      } catch (decodeError) {
        return { 
          success: false, 
          error: 'Invalid token format. Please logout and login again.' 
        };
      }
      
      const response = await api.request('/founder-messages', {
        method: 'POST',
        body: messageData
      });
      
      return { success: true, data: response.data };
    } catch (error) {
      return { 
        success: false, 
        error: error.message || 'Failed to create message' 
      };
    }
  },

  // Upload image for founder message
  async uploadImage(messageId, imageFile) {
    try {
      const formData = new FormData();
      formData.append('founderImage', imageFile);
      
      // Get client token for authenticated upload
      const token = getClientToken();
      
      const response = await fetch(`${API_BASE_URL}/founder-messages/${messageId}/upload-image`, {
        method: 'POST',
        headers: {
          ...(token && { Authorization: `Bearer ${token}` })
        },
        body: formData
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Image upload failed');
      }
      
      return { success: true, data: data.data || data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Update founder message
  async updateMessage(id, messageData) {
    try {
      // Get client token for authenticated update
      const token = getClientToken();
      
      // Always use FormData since backend uses multer's upload.single()
      const formData = new FormData();
      formData.append('founderName', messageData.founderName);
      formData.append('position', messageData.position);
      formData.append('content', messageData.content);
      
      // Only append status if it's defined
      if (messageData.status !== undefined && messageData.status !== null) {
        formData.append('status', messageData.status);
      }
      
      // Only append image if it's a File (new image selected)
      if (messageData.founderImage && messageData.founderImage instanceof File) {
        formData.append('founderImage', messageData.founderImage);
      }
      
      const response = await fetch(`${API_BASE_URL}/founder-messages/${id}`, {
        method: 'PUT',
        headers: {
          ...(token && { Authorization: `Bearer ${token}` })
          // Don't set Content-Type for FormData - browser sets it with boundary
        },
        body: formData
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Update failed');
      }
      
      return { success: true, data: data.data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Delete founder message
  async deleteMessage(id) {
    try {
      const response = await api.request(`/founder-messages/${id}`, {
        method: 'DELETE'
      });
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Toggle message status (publish/unpublish)
  async toggleStatus(id) {
    try {
      const response = await api.request(`/founder-messages/${id}/toggle`, {
        method: 'PATCH',
        body: {}
      });
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Increment views
  async incrementViews(id) {
    try {
      const response = await api.request(`/founder-messages/${id}/view`, {
        method: 'PATCH',
        body: {}
      });
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Get presigned URL for S3 image
  // Now supports both S3 keys and URLs
  async getPresignedImageUrl(imageUrl, imageKey = null) {
    if (!imageUrl && !imageKey) return null;
    
    // If we have a key, use it directly (preferred method)
    if (imageKey) {
      try {
        const response = await api.request(`/media/presigned-url?key=${encodeURIComponent(imageKey)}`, {
          method: 'GET'
        });
        
        if (response.success && response.data?.presignedUrl) {
          return response.data.presignedUrl;
        }
      } catch (error) {
        console.warn('Failed to get presigned URL from key:', error);
      }
    }
    
    // Fallback: Extract key from URL if no key provided
    if (imageUrl) {
      // Skip presigned URL for localhost/local URLs (these are old messages)
      if (imageUrl.includes('localhost') || imageUrl.includes('127.0.0.1') || imageUrl.startsWith('/uploads/')) {
        return imageUrl; // Return as-is for local URLs
      }
      
      // Check if it's an S3 URL
      const isS3Url = imageUrl.includes('s3.amazonaws.com') || imageUrl.includes('amazonaws.com');
      if (!isS3Url) {
        return imageUrl; // Return as-is for non-S3 URLs
      }
      
      try {
        // Extract key from S3 URL
        // Format: https://bucket.s3.region.amazonaws.com/key
        const url = new URL(imageUrl);
        const key = url.pathname.substring(1); // Remove leading slash
        
        // Get presigned URL from backend using new endpoint
        const response = await api.request(`/media/presigned-url?key=${encodeURIComponent(key)}`, {
          method: 'GET'
        });
        
        if (response.success && response.data?.presignedUrl) {
          return response.data.presignedUrl;
        }
      } catch (error) {
        console.warn('Failed to get presigned URL from URL:', error);
      }
    }
    
    // Fallback to original URL
    return imageUrl;
  }
};

export default founderMessageService;