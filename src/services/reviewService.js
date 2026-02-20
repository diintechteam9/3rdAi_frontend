import api from './api.js';

const reviewService = {
  // Get all reviews for an expert
  getExpertReviews: async (expertId) => {
    try {
      const response = await api.get(`/reviews/expert/${expertId}`);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch reviews'
      };
    }
  },

  // Create new review with auto-refresh
  createReview: async (expertId, reviewData) => {
    try {
      const response = await api.post(`/reviews/expert/${expertId}`, reviewData);
      
      // Auto-refresh expert data if function is available
      if (window.refreshExpertData) {
        setTimeout(() => {
          window.refreshExpertData();
        }, 500); // Small delay to ensure backend is updated
      }
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to create review'
      };
    }
  },

  // Update review
  updateReview: async (reviewId, reviewData) => {
    try {
      const response = await api.put(`/reviews/${reviewId}`, reviewData);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to update review'
      };
    }
  },

  // Delete review with auto-refresh
  deleteReview: async (reviewId) => {
    try {
      const response = await api.delete(`/reviews/${reviewId}`);
      
      // Auto-refresh expert data if function is available
      if (window.refreshExpertData) {
        setTimeout(() => {
          window.refreshExpertData();
        }, 500);
      }
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to delete review'
      };
    }
  },

  // Upload review image
  uploadReviewImage: async (reviewId, imageFile) => {
    try {
      console.log('Uploading review image:', { reviewId, fileName: imageFile?.name });
      
      if (!reviewId) {
        throw new Error('Review ID is required for image upload');
      }
      
      if (!imageFile) {
        throw new Error('Image file is required');
      }
      
      const formData = new FormData();
      formData.append('image', imageFile);
      
      // Use the same pattern as testimonials - don't set Content-Type
      const response = await api.post(`/reviews/${reviewId}/upload-image`, formData);
      
      // Handle nested response structure like testimonials
      const responseData = response.data.data || response.data;
      return {
        success: true,
        data: responseData
      };
    } catch (error) {
      console.error('Upload review image error:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to upload image'
      };
    }
  },

  // Toggle review status
  toggleReviewStatus: async (reviewId) => {
    try {
      const response = await api.patch(`/reviews/${reviewId}/toggle-status`);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to toggle review status'
      };
    }
  }
};

export default reviewService;