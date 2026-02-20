import api from './api.js';

const rewardRedemptionService = {
  // Redeem a reward
  redeemReward: async (rewardId) => {
    try {
      const response = await api.post('/reward-redemptions/redeem', { rewardId });
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      console.error('Redeem reward error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to redeem reward'
      };
    }
  },

  // Get redemption history
  getHistory: async () => {
    try {
      const response = await api.get('/reward-redemptions/history');
      return {
        success: true,
        data: response.data.data || [],
        message: response.data.message
      };
    } catch (error) {
      console.error('Get history error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch history',
        data: []
      };
    }
  }
};

export default rewardRedemptionService;
