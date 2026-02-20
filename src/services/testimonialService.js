import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://stage.brahmakosh.com/api';

// Helper function to get presigned URL for S3 images
// Now supports both S3 keys and URLs
const getPresignedImageUrl = async (imageUrl, imageKey = null) => {
  if (!imageUrl && !imageKey) return null;
  
  // If we have a key, use it directly (preferred method)
  if (imageKey) {
    try {
      const response = await axios.get(`${API_BASE_URL}/media/presigned-url?key=${encodeURIComponent(imageKey)}`, {
        headers: getAuthHeaders()
      });
      if (response.data.success && response.data.data?.presignedUrl) {
        return response.data.data.presignedUrl;
      }
    } catch (error) {
      console.warn('Failed to get presigned URL from key:', error);
    }
  }
  
  // Fallback: Extract key from URL if no key provided
  if (imageUrl) {
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
      const response = await axios.get(`${API_BASE_URL}/media/presigned-url?key=${encodeURIComponent(key)}`, {
        headers: getAuthHeaders()
      });
      if (response.data.success && response.data.data?.presignedUrl) {
        return response.data.data.presignedUrl;
      }
    } catch (error) {
      console.warn('Failed to get presigned URL from URL:', error);
    }
  }
  
  // Fallback to original URL
  return imageUrl;
};

// Helper function to get client token
const getClientToken = () => {
  const token = localStorage.getItem('token_client');
  return token;
};

// Helper function to get auth headers for client
const getAuthHeaders = () => {
  const token = getClientToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const testimonialService = {
  // Get all testimonials
  async getAllTestimonials() {
    try {
      const response = await axios.get(`${API_BASE_URL}/testimonials?includeInactive=true`, {
        headers: getAuthHeaders()
      });
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.response?.data?.message || error.message };
    }
  },

  // Create new testimonial (without image)
  async createTestimonial(testimonialData) {
    try {
      const response = await axios.post(`${API_BASE_URL}/testimonials`, testimonialData, {
        headers: getAuthHeaders()
      });
      return { success: true, data: response.data.data || response.data };
    } catch (error) {
      console.error('Create testimonial error:', error.response?.data || error.message);
      return { success: false, error: error.response?.data?.message || error.message };
    }
  },

  // Update testimonial (without image)
  async updateTestimonial(id, testimonialData) {
    try {
      const response = await axios.put(`${API_BASE_URL}/testimonials/${id}`, testimonialData, {
        headers: getAuthHeaders()
      });
      return { success: true, data: response.data.data || response.data };
    } catch (error) {
      console.error('Update testimonial error:', error.response?.data || error.message);
      return { success: false, error: error.response?.data?.message || error.message };
    }
  },

  // Delete testimonial
  async deleteTestimonial(id) {
    try {
      const response = await axios.delete(`${API_BASE_URL}/testimonials/${id}`, {
        headers: getAuthHeaders()
      });
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Toggle testimonial status (enable/disable)
  async toggleTestimonialStatus(id) {
    try {
      const response = await axios.patch(`${API_BASE_URL}/testimonials/${id}/toggle`, {}, {
        headers: getAuthHeaders()
      });
      return { success: true, data: response.data.data || response.data };
    } catch (error) {
      return { success: false, error: error.response?.data?.message || error.message };
    }
  },

  // Upload image for testimonial
  async uploadImage(testimonialId, imageFile) {
    try {
      const formData = new FormData();
      formData.append('image', imageFile);
      
      const response = await axios.post(`${API_BASE_URL}/testimonials/${testimonialId}/upload-image`, formData, {
        headers: getAuthHeaders()
        // Don't set Content-Type for FormData - browser sets it automatically with boundary
      });
      // Backend returns {success: true, data: {imageUrl: "..."}}
      // Axios gives us response.data = {success: true, data: {imageUrl: "..."}}
      // So response.data.data = {imageUrl: "..."}
      // We return {success: true, data: {imageUrl: "..."}} so frontend can use response.data.imageUrl
      const responseData = response.data.data || response.data;
      return { success: true, data: responseData };
    } catch (error) {
      return { success: false, error: error.response?.data?.message || error.message };
    }
  },

  // Get presigned URL for S3 image with retry logic
  async getPresignedImageUrl(imageUrl) {
    if (!imageUrl) return null;
    
    // Skip presigned URL for localhost/local URLs (these are old testimonials)
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
      const url = new URL(imageUrl);
      const key = url.pathname.substring(1); // Remove leading slash
      
      // Get presigned URL from backend with timeout
      const response = await axios.get(`${API_BASE_URL}/upload/presigned-url/${encodeURIComponent(key)}`, {
        headers: getAuthHeaders(),
        timeout: 5000 // 5 second timeout
      });
      
      if (response.data.success && response.data.data.presignedUrl) {
        const presignedUrl = response.data.data.presignedUrl;
        // Validate the presigned URL
        if (presignedUrl && presignedUrl.startsWith('http')) {
          return presignedUrl;
        }
      }
    } catch (error) {
      console.warn('Failed to get presigned URL:', error.message);
      // Return null to use placeholder image instead of broken URL
      return null;
    }
    
    // Return null to use placeholder instead of potentially broken URL
    return null;
  }
};

export default testimonialService;