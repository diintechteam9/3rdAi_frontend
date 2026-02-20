import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://stage.brahmakosh.com/api';

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

const sponsorService = {
  // Get all sponsors
  async getAllSponsors() {
    try {
      const response = await axios.get(`${API_BASE_URL}/sponsors?includeInactive=true`, {
        headers: getAuthHeaders()
      });
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.response?.data?.message || error.message };
    }
  },

  // Create new sponsor (without logo)
  async createSponsor(sponsorData) {
    try {
      const response = await axios.post(`${API_BASE_URL}/sponsors`, sponsorData, {
        headers: getAuthHeaders()
      });
      return { success: true, data: response.data.data || response.data };
    } catch (error) {
      console.error('Create sponsor error:', error.response?.data || error.message);
      return { success: false, error: error.response?.data?.message || error.message };
    }
  },

  // Update sponsor (without logo)
  async updateSponsor(id, sponsorData) {
    try {
      const response = await axios.put(`${API_BASE_URL}/sponsors/${id}`, sponsorData, {
        headers: getAuthHeaders()
      });
      return { success: true, data: response.data.data || response.data };
    } catch (error) {
      console.error('Update sponsor error:', error.response?.data || error.message);
      return { success: false, error: error.response?.data?.message || error.message };
    }
  },

  // Delete sponsor
  async deleteSponsor(id) {
    try {
      const response = await axios.delete(`${API_BASE_URL}/sponsors/${id}`, {
        headers: getAuthHeaders()
      });
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Toggle sponsor status (enable/disable)
  async toggleSponsorStatus(id) {
    try {
      const response = await axios.patch(`${API_BASE_URL}/sponsors/${id}/toggle`, {}, {
        headers: getAuthHeaders()
      });
      return { success: true, data: response.data.data || response.data };
    } catch (error) {
      return { success: false, error: error.response?.data?.message || error.message };
    }
  },

  // Upload logo for sponsor
  async uploadLogo(sponsorId, logoFile) {
    try {
      const formData = new FormData();
      formData.append('logo', logoFile);
      
      const response = await axios.post(`${API_BASE_URL}/sponsors/${sponsorId}/upload-logo`, formData, {
        headers: getAuthHeaders()
        // Don't set Content-Type for FormData - browser sets it automatically with boundary
      });
      // Backend returns {success: true, data: {logoUrl: "..."}}
      // Axios gives us response.data = {success: true, data: {logoUrl: "..."}}
      // So response.data.data = {logoUrl: "..."}
      // We return {success: true, data: {logoUrl: "..."}} so frontend can use response.data.logoUrl
      const responseData = response.data.data || response.data;
      return { success: true, data: responseData };
    } catch (error) {
      return { success: false, error: error.response?.data?.message || error.message };
    }
  },

  // Get presigned URL for S3 logo with retry logic
  async getPresignedLogoUrl(logoUrl) {
    if (!logoUrl) return null;
    
    // Skip presigned URL for localhost/local URLs
    if (logoUrl.includes('localhost') || logoUrl.includes('127.0.0.1') || logoUrl.startsWith('/uploads/')) {
      return logoUrl; // Return as-is for local URLs
    }
    
    // Check if it's an S3 URL
    const isS3Url = logoUrl.includes('s3.amazonaws.com') || logoUrl.includes('amazonaws.com');
    if (!isS3Url) {
      return logoUrl; // Return as-is for non-S3 URLs
    }
    
    try {
      // Extract key from S3 URL
      const url = new URL(logoUrl);
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
      // Return null to use placeholder logo instead of broken URL
      return null;
    }
    
    // Return null to use placeholder instead of potentially broken URL
    return null;
  }
};

export default sponsorService;