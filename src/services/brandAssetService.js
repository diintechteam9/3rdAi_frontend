import api from './api.js';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://stage.brahmakosh.com/api';

const brandAssetService = {
  // Get all brand assets for authenticated client
  getAllBrandAssets: async () => {
    try {
      const response = await api.request('/brand-assets?includeInactive=true');
      return {
        success: true,
        data: response
      };
    } catch (error) {
      console.error('Error fetching brand assets:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch brand assets'
      };
    }
  },

  // Get single brand asset by ID
  getBrandAsset: async (id) => {
    try {
      const response = await api.request(`/brand-assets/${id}`);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error fetching brand asset:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch brand asset'
      };
    }
  },

  // Create new brand asset
  createBrandAsset: async (brandAssetData) => {
    try {
      const response = await api.request('/brand-assets', {
        method: 'POST',
        body: brandAssetData
      });
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error creating brand asset:', error);
      return {
        success: false,
        error: error.message || 'Failed to create brand asset'
      };
    }
  },

  // Update brand asset
  updateBrandAsset: async (id, brandAssetData) => {
    try {
      const response = await api.request(`/brand-assets/${id}`, {
        method: 'PUT',
        body: brandAssetData
      });
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error updating brand asset:', error);
      return {
        success: false,
        error: error.message || 'Failed to update brand asset'
      };
    }
  },

  // Delete brand asset
  deleteBrandAsset: async (id) => {
    try {
      const response = await api.request(`/brand-assets/${id}`, {
        method: 'DELETE'
      });
      return {
        success: true,
        message: response.message
      };
    } catch (error) {
      console.error('Error deleting brand asset:', error);
      return {
        success: false,
        error: error.message || 'Failed to delete brand asset'
      };
    }
  },

  // Upload image for brand asset
  uploadImage: async (id, imageFile) => {
    try {
      const formData = new FormData();
      formData.append('brandLogoImage', imageFile);

      // Get client token for brand asset image upload
      const token = localStorage.getItem('token_client');

      const response = await fetch(`${API_BASE_URL}/brand-assets/${id}/upload-image`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      return {
        success: true,
        data: data.data
      };
    } catch (error) {
      console.error('Error uploading image:', error);
      return {
        success: false,
        error: error.message || 'Failed to upload image'
      };
    }
  },

  // Upload background image for brand asset
  uploadBackgroundImage: async (id, imageFile) => {
    try {
      const formData = new FormData();
      formData.append('backgroundLogoImage', imageFile);

      const token = localStorage.getItem('token_client');

      const response = await fetch(`${API_BASE_URL}/brand-assets/${id}/upload-background-image`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      return {
        success: true,
        data: data.data
      };
    } catch (error) {
      console.error('Error uploading background image:', error);
      return {
        success: false,
        error: error.message || 'Failed to upload background image'
      };
    }
  },

  // Toggle brand asset status (activate/deactivate)
  toggleBrandAssetStatus: async (id) => {
    try {
      const response = await api.request(`/brand-assets/${id}/toggle`, {
        method: 'PATCH'
      });
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error toggling brand asset status:', error);
      return {
        success: false,
        error: error.message || 'Failed to toggle brand asset status'
      };
    }
  },

  // Get presigned URL for S3 image with timeout and error handling
  // Now supports both S3 keys and URLs
  getPresignedImageUrl: async (imageUrl, imageKey = null) => {
    try {
      // If we have a key, use it directly (preferred method)
      if (imageKey) {
        const response = await api.request(`/media/presigned-url?key=${encodeURIComponent(imageKey)}`, {
          method: 'GET',
          timeout: 5000
        });
        
        const presignedUrl = response.data?.presignedUrl;
        if (presignedUrl && presignedUrl.startsWith('http')) {
          return presignedUrl;
        }
      }
      
      // Fallback: Extract key from URL if no key provided
      if (!imageUrl || !imageUrl.includes('amazonaws.com')) {
        return imageUrl;
      }

      // Extract key from S3 URL
      const url = new URL(imageUrl);
      const key = url.pathname.substring(1);

      // Use new endpoint
      const response = await api.request(`/media/presigned-url?key=${encodeURIComponent(key)}`, {
        method: 'GET',
        timeout: 5000
      });
      
      const presignedUrl = response.data?.presignedUrl;
      if (presignedUrl && presignedUrl.startsWith('http')) {
        return presignedUrl;
      }
      
      // Return null to use placeholder instead of broken URL
      return null;
    } catch (error) {
      console.warn('Error getting presigned URL:', error.message);
      // Return null to use placeholder image
      return null;
    }
  }
};

export default brandAssetService;