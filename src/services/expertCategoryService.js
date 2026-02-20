import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://stage.brahmakosh.com/api';

class ExpertCategoryService {
  constructor() {
    this.api = axios.create({
      baseURL: `${API_BASE_URL}/expert-categories`,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add token to requests
    this.api.interceptors.request.use((config) => {
      // Check for both client and user tokens
      const clientToken = localStorage.getItem('token_client');
      const userToken = localStorage.getItem('token_user');
      const token = clientToken || userToken;
      
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
  }

  // Create expert category
  async createExpertCategory(categoryData) {
    try {
      const clientToken = localStorage.getItem('token_client');
      const userToken = localStorage.getItem('token_user');
      const token = clientToken || userToken;
      console.log('Token check:', { hasToken: !!token, tokenLength: token?.length, tokenType: clientToken ? 'client' : 'user' });
      
      const response = await this.api.post('/', categoryData);
      return response.data;
    } catch (error) {
      console.error('Create expert category error:', error);
      throw error.response?.data || error;
    }
  }

  // Get all expert categories
  async getAllExpertCategories() {
    try {
      const clientToken = localStorage.getItem('token_client');
      const userToken = localStorage.getItem('token_user');
      const token = clientToken || userToken;
      console.log('Token check:', { hasToken: !!token, tokenLength: token?.length, tokenType: clientToken ? 'client' : 'user' });
      
      const response = await this.api.get('/');
      return response.data;
    } catch (error) {
      console.error('Get expert categories error:', error);
      throw error.response?.data || error;
    }
  }

  // Get expert category by ID
  async getExpertCategoryById(id) {
    try {
      const response = await this.api.get(`/${id}`);
      return response.data;
    } catch (error) {
      console.error('Get expert category error:', error);
      throw error.response?.data || error;
    }
  }

  // Update expert category
  async updateExpertCategory(id, categoryData) {
    try {
      const response = await this.api.put(`/${id}`, categoryData);
      return response.data;
    } catch (error) {
      console.error('Update expert category error:', error);
      throw error.response?.data || error;
    }
  }

  // Delete expert category
  async deleteExpertCategory(id) {
    try {
      const response = await this.api.delete(`/${id}`);
      return response.data;
    } catch (error) {
      console.error('Delete expert category error:', error);
      throw error.response?.data || error;
    }
  }

  // Toggle expert category status
  async toggleExpertCategoryStatus(id) {
    try {
      const response = await this.api.patch(`/${id}/toggle-status`);
      return response.data;
    } catch (error) {
      console.error('Toggle expert category status error:', error);
      throw error.response?.data || error;
    }
  }

  // Upload category image
  async uploadCategoryImage(categoryId, imageFile) {
    try {
      const formData = new FormData();
      formData.append('image', imageFile);

      const response = await this.api.post(`/${categoryId}/upload-image`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      console.error('Upload category image error:', error);
      throw error.response?.data || error;
    }
  }
}

export default new ExpertCategoryService();