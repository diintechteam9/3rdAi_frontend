const API_BASE_URL = import.meta.env.VITE_API_URL || '';

// Helper to get role from path
const getRoleFromPath = (path) => {
  if (path?.startsWith('/super-admin')) return 'super_admin';
  if (path?.startsWith('/admin')) return 'admin';
  if (path?.startsWith('/client')) return 'client';
  if (path?.startsWith('/partner')) return 'partner';
  if (path?.startsWith('/mobile/user')) return 'user';
  if (path?.startsWith('/user')) return 'user';
  return null;
};

// Helper to get token for a specific role
const getTokenForRole = (role) => {
  if (!role) {
    const currentPath = window.location.pathname;
    role = getRoleFromPath(currentPath);
  }

  if (role) {
    const tokenKey = role === 'partner' ? 'partner_token' : `token_${role}`;
    const token = localStorage.getItem(tokenKey);

    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.role === role) {
          return token;
        } else {
          console.warn(`[Token Mismatch] Token role (${payload.role}) doesn't match requested role (${role})`);
          return null;
        }
      } catch (e) {
        return token;
      }
    }
    return null;
  }

  return null;
};

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  async request(endpoint, options = {}) {
    const method = options.method || 'GET';
    let token = options.token;
    console.log('token', token);
    console.log('endpoint', endpoint);
    console.log('method', method);
    console.log('client token check:', localStorage.getItem('token_client'));
    let tokenSource = 'provided';

    // Handle query params
    if (options.params) {
      const searchParams = new URLSearchParams();
      Object.keys(options.params).forEach(key => {
        if (options.params[key] !== undefined && options.params[key] !== null) {
          searchParams.append(key, options.params[key]);
        }
      });
      const queryString = searchParams.toString();
      if (queryString) {
        endpoint = `${endpoint}?${queryString}`;
      }
    }

    if (!token) {
      // PUBLIC ENDPOINTS - No token required
      const publicEndpoints = [
        '/public/',
        '/mobile/user/register/',
        '/mobile/user/check-email',
        '/mobile/user/search-location',
        '/mobile/user/reverse-geocode',
        '/mobile/user/get-location',
        '/auth/user/login',
        '/auth/user/google',
        '/auth/user/register',
        '/auth/user/forgot-password',
        '/auth/user/verify-reset-otp',
        '/auth/user/reset-password',
        '/auth/user/resend-reset-otp',
        '/auth/super-admin/login',
        '/auth/admin/login',
        '/auth/client/login',
        '/auth/client/register',
        '/partners/login',
        '/partners/register'
      ];

      const isPublicEndpoint = publicEndpoints.some(pub => endpoint.includes(pub)) &&
        !endpoint.includes('/upload-url') &&
        !endpoint.includes('/toggle-status');

      if (isPublicEndpoint) {
        token = null;
        tokenSource = 'none (public endpoint)';
      } else if (endpoint.includes('/partner') || endpoint.includes('/chat/partner') || endpoint.includes('/alerts/partner')) {
        // PARTNER ENDPOINTS - Use partner token
        token = getTokenForRole('partner');
        tokenSource = 'partner (endpoint match)';
      } else if (endpoint.includes('/super-admin/') || endpoint.includes('/auth/super-admin/')) {
        token = getTokenForRole('super_admin');
        tokenSource = 'super_admin (endpoint match)';
      } else if (endpoint.includes('/admin/') || endpoint.includes('/auth/admin/')) {
        // Since Super Admin can access Admin routes, try Super Admin token first
        token = getTokenForRole('super_admin') || getTokenForRole('admin');
        tokenSource = token === getTokenForRole('super_admin') ? 'super_admin (via admin endpoint)' : 'admin (endpoint match)';
      } else if (endpoint.includes('/client/') || endpoint.includes('/auth/client/') ||
        endpoint.includes('/testimonials') || endpoint.includes('/founder-messages') ||
        endpoint.includes('/brand-assets') ||
        endpoint.includes('/reviews') || endpoint.includes('/experts') ||
        endpoint.includes('/swapna-decoder')) {
        token = getTokenForRole('client');
        console.log('getTokenForRole result:', token);
        if (!token) {
          token = localStorage.getItem('token_client');
          console.log('Direct localStorage fallback:', token);
        }
        tokenSource = endpoint.includes('/testimonials') ? 'client (testimonials endpoint)' :
          endpoint.includes('/founder-messages') ? 'client (founder-messages endpoint)' :
            endpoint.includes('/brand-assets') ? 'client (brand-assets endpoint)' :
              endpoint.includes('/reviews') ? 'client (reviews endpoint)' :
                endpoint.includes('/experts') ? 'client (experts endpoint)' :
                  'client (endpoint match)';
      } else if (endpoint.includes('/dream-requests')) {
        // Dream requests - check if it's from mobile user or client admin
        const currentPath = window.location.pathname;
        if (currentPath.includes('/mobile') || currentPath.includes('/user')) {
          // Mobile user creating request
          token = getTokenForRole('user');
          tokenSource = 'user (dream request from mobile)';
        } else if (currentPath.includes('/client')) {
          // Client admin viewing/managing requests
          token = getTokenForRole('client');
          tokenSource = 'client (dream request management)';
        } else {
          // Fallback: try user first, then client
          token = getTokenForRole('user') || getTokenForRole('client');
          tokenSource = 'dream-requests (fallback)';
        }
      } else if (endpoint.includes('/chat/conversations') ||
        endpoint.includes('/chat/unread-count') ||
        endpoint.includes('/chat/conversation/') ||
        endpoint.includes('/chat/partners')) {
        // ✅ FIXED: Chat endpoints - determine user vs partner based on current route
        const currentPath = window.location.pathname;

        if (currentPath.includes('/partner')) {
          // Partner chat
          token = getTokenForRole('partner');
          tokenSource = 'chat (partner)';
        } else if (currentPath.includes('/user')) {
          // User chat
          token = getTokenForRole('user');
          tokenSource = 'chat (user)';
        } else {
          // Fallback: try partner first, then user
          token = getTokenForRole('partner') || getTokenForRole('user');
          tokenSource = token ? 'chat (fallback)' : 'none';
        }

        if (token) {
          try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            console.log('[Chat Endpoint] Using token with role:', payload.role);
          } catch (e) {
            console.warn('[API Warning] Could not verify token role:', e);
          }
        }
      } else if (endpoint.includes('/mobile/voice')) {
        const currentPath = window.location.pathname;
        if (currentPath.includes('/partner')) {
          token = getTokenForRole('partner');
          tokenSource = 'voice (partner)';
        } else if (currentPath.includes('/client')) {
          token = getTokenForRole('client') || localStorage.getItem('token_client');
          tokenSource = 'voice (client)';
        } else if (currentPath.includes('/user') || currentPath.includes('/mobile')) {
          token = getTokenForRole('user');
          tokenSource = 'voice (user)';
        } else {
          token = getTokenForRole('user') || getTokenForRole('client') || getTokenForRole('partner');
          tokenSource = 'voice (fallback)';
        }
      } else if (endpoint.includes('/user/') || endpoint.includes('/users/') ||
        endpoint.includes('/alerts/user') ||
        endpoint.includes('/mobile/chat') ||
        endpoint.includes('/mobile/user/profile') ||
        endpoint.includes('/notifications')) {
        // Let's check for 'client', 'user', or 'partner' tokens for chat/profile
        token = getTokenForRole('user') || getTokenForRole('client') || getTokenForRole('partner');
        tokenSource = 'user/client/partner (authenticated endpoint)';

        if (token) {
          try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            // Only reject if it's strictly not user, client, or partner
            if (payload.role !== 'user' && payload.role !== 'client' && payload.role !== 'partner') {
              console.error('[API Error] Wrong token role for user endpoint:', {
                endpoint,
                tokenRole: payload.role,
                requiredRole: 'user/client/partner',
                message: 'Rejecting non-user/client/partner token for user endpoint'
              });
              token = null;
              tokenSource = 'rejected (wrong role)';
            }
          } catch (e) {
            console.warn('[API Warning] Could not verify token role:', e);
          }
        }

        if (!token && !isPublicEndpoint) {
          const otherTokens = {
            super_admin: !!localStorage.getItem('token_super_admin'),
            admin: !!localStorage.getItem('token_admin'),
            client: !!localStorage.getItem('token_client'),
            partner: !!localStorage.getItem('partner_token')
          };
          const hasOtherTokens = Object.values(otherTokens).some(v => v);
          if (hasOtherTokens) {
            console.error('[API Error]', {
              endpoint,
              message: 'User endpoint requires user token, but user is not logged in. Other roles are logged in. Please logout and login as a user.',
              otherTokens,
              availableTokens: Object.keys(otherTokens).filter(k => otherTokens[k])
            });
          }
        }
      } else {
        const currentPath = window.location.pathname;
        const routeRole = getRoleFromPath(currentPath);
        if (routeRole) {
          token = getTokenForRole(routeRole);
          tokenSource = `route-based (${routeRole})`;
        } else {
          token = null;
          tokenSource = 'none (no role detected)';
        }
      }
    }

    const config = {
      ...options,
      headers: {
        ...(!(options.body instanceof FormData) && { 'Content-Type': 'application/json' }),
        ...(token && { Authorization: `Bearer ${token}` }),
        ...(options.headers || {}),
      },
    };

    console.log(`[API Request] ${method} ${endpoint}`, {
      hasToken: !!token,
      tokenSource,
      headers: config.headers
    });

    delete config.token;

    if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
      config.body = JSON.stringify(config.body);
    }

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, config);

      const contentType = response.headers.get('content-type');
      let data;

      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        if (!response.ok) {
          throw new Error(`Server returned ${response.status} ${response.statusText}. ${response.status === 404 ? 'Endpoint not found. Please ensure the server is deployed with the latest routes.' : ''}`);
        }
        try {
          data = JSON.parse(text);
        } catch {
          throw new Error(`Expected JSON response but received ${contentType || 'unknown content type'}`);
        }
      }

      if (!response.ok) {
        if (response.status === 403 && data.error === 'INVALID_ROLE') {
          console.error('[API Error - Role Mismatch]', {
            endpoint,
            status: response.status,
            requiredRole: data.requiredRole,
            currentRole: data.currentRole,
            message: data.message,
            hasToken: !!token,
            tokenSource
          });

          if (data.currentRole && data.requiredRole) {
            const errorMsg = `You are logged in as '${data.currentRole}' but this feature requires '${data.requiredRole}' role. Please logout and login as a user.`;
            console.error('[Role Mismatch]', errorMsg);
          }
        } else {
          const errorMessage = data.error && data.message
            ? `${data.message} (${data.error})`
            : data.error || data.message || 'Request failed';

          console.error('[API Error]', {
            endpoint,
            status: response.status,
            statusText: response.statusText,
            error: errorMessage,
            hasToken: !!token,
            responseData: data
          });

          const error = new Error(errorMessage);
          error.status = response.status;
          error.responseData = data;
          throw error;
        }
      }

      return data;
    } catch (error) {
      console.error('[API Exception]', {
        endpoint,
        error: error.message,
        hasToken: !!token
      });
      throw error;
    }
  }

  // ==================== PARTNER AUTH ====================
  async partnerLogin(email, password) {
    return this.request('/partners/login', {
      method: 'POST',
      body: { email, password },
    });
  }

  async partnerRegister(name, email, password, specialization, clientId) {
    return this.request('/partners/register', {
      method: 'POST',
      body: { name, email, password, specialization, clientId },
    });
  }

  async getCurrentPartner(token = null) {
    return this.request('/partners/me', { token });
  }

  // ==================== CHAT API - PARTNER ====================

  // Partner Status Management
  async updatePartnerStatus(status) {
    return this.request('/chat/partner/status', {
      method: 'PATCH',
      body: { status },
    });
  }

  async getPartnerStatus() {
    return this.request('/chat/partner/status');
  }

  // Partner Requests
  async getPartnerRequests() {
    return this.request('/chat/partner/requests');
  }

  async acceptConversationRequest(conversationId) {
    return this.request(`/chat/partner/requests/${conversationId}/accept`, {
      method: 'POST',
    });
  }

  async rejectConversationRequest(conversationId) {
    return this.request(`/chat/partner/requests/${conversationId}/reject`, {
      method: 'POST',
    });
  }

  // ==================== CHAT API - USER ====================

  // Get available partners (for users)
  async getAvailablePartners() {
    return this.request('/chat/partners');
  }

  // Get full partner details by ID
  async getPartnerById(partnerId) {
    return this.request(`/chat/partners/${partnerId}`);
  }

  // Create conversation request
  async createConversation(data) {
    return this.request('/chat/conversations', {
      method: 'POST',
      body: data,
    });
  }

  // ==================== CHAT API - COMMON ====================

  // Get conversations
  async getConversations() {
    return this.request('/chat/conversations');
  }

  // Get messages for a conversation
  async getConversationMessages(conversationId, page = 1, limit = 50) {
    return this.request(`/chat/conversations/${conversationId}/messages?page=${page}&limit=${limit}`);
  }

  // Send message (REST fallback)
  async sendMessage(conversationId, data) {
    return this.request(`/chat/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: data,
    });
  }

  // Mark messages as read
  async markMessagesAsRead(conversationId) {
    return this.request(`/chat/conversations/${conversationId}/read`, {
      method: 'PATCH',
    });
  }

  // End conversation (pass feedback for single-call flow)
  async endConversation(conversationId, feedback = {}) {
    return this.request(`/chat/conversations/${conversationId}/end`, {
      method: 'PATCH',
      body: feedback,
    });
  }

  // Submit conversation feedback (rating + satisfaction + description)
  async submitConversationFeedback(conversationId, payload) {
    return this.request(`/chat/conversations/${conversationId}/feedback`, {
      method: 'PATCH',
      body: payload,
    });
  }

  // Get unread count
  async getUnreadCount() {
    return this.request('/chat/unread-count');
  }



  // Chat credits history - user (what they invested)


  // ==================== EXISTING METHODS ====================

  // Super Admin Auth endpoints
  async superAdminLogin(email, password) {
    return this.request('/auth/super-admin/login', {
      method: 'POST',
      body: { email, password },
    });
  }

  // Admin Auth endpoints
  async adminLogin(email, password) {
    return this.request('/auth/admin/login', {
      method: 'POST',
      body: { email, password },
    });
  }

  async getCurrentAdmin(token = null) {
    return this.request('/auth/admin/me', { token });
  }

  // Client Auth endpoints
  async clientLogin(email, password) {
    return this.request('/auth/client/login', {
      method: 'POST',
      body: { email, password },
    });
  }

  async clientRegister(email, password, organizationName, state, city, address, contactNumber, alternateContact, cityBoundary) {
    return this.request('/auth/client/register', {
      method: 'POST',
      body: { email, password, organizationName, state, city, address, contactNumber, alternateContact, cityBoundary },
    });
  }

  async getCurrentClient(token = null) {
    return this.request('/auth/client/me', { token });
  }

  // User Auth endpoints
  async userLogin(email, password) {
    return this.request('/auth/user/login', {
      method: 'POST',
      body: { email, password },
    });
  }

  async userRegister(email, password, profile, clientId) {
    return this.request(`/auth/user/register/${clientId}`, {
      method: 'POST',
      body: { email, password, profile, clientId },
    });
  }

  async getCurrentUser(token = null) {
    return this.request('/auth/user/me', { token });
  }

  // Mobile User Registration
  async mobileUserRegisterStep1(email, password, clientId) {
    return this.request(`/mobile/user/register/step1/${clientId}`, {
      method: 'POST',
      body: { email, password, clientId },
    });
  }

  async mobileUserRegisterStep1Verify(email, otp, clientId) {
    return this.request(`/mobile/user/register/step1/verify/${clientId}`, {
      method: 'POST',
      body: { email, otp, clientId },
    });
  }

  async mobileUserRegisterStep2(email, mobile, clientId) {
    return this.request(`/mobile/user/register/step2/${clientId}`, {
      method: 'POST',
      body: { email, mobile, clientId, otpMethod: 'whatsapp' }, // Default to whatsapp
    });
  }

  async mobileUserRegisterStep2Verify(email, otp, clientId) {
    return this.request(`/mobile/user/register/step2/verify/${clientId}`, {
      method: 'POST',
      body: { email, otp, clientId },
    });
  }

  async mobileUserRegisterStep3(email, profileData, imageFileName, imageContentType, clientId) {
    return this.request(`/mobile/user/register/step3/${clientId}`, {
      method: 'POST',
      body: {
        email,
        clientId,
        ...profileData,
        imageFileName,
        imageContentType
      },
    });
  }

  async resendEmailOTP(email) {
    return this.request('/mobile/user/register/resend-email-otp', {
      method: 'POST',
      body: { email },
    });
  }

  async resendMobileOTP(email) {
    return this.request('/mobile/user/register/resend-mobile-otp', {
      method: 'POST',
      body: { email },
    });
  }

  async mobileUserLogin(email, password) {
    return this.request('/auth/user/login', {
      method: 'POST',
      body: { email, password },
    });
  }

  // Firebase Authentication
  async firebaseSignUp(idToken) {
    return this.request('/mobile/user/register/firebase', {
      method: 'POST',
      body: { idToken },
    });
  }

  async firebaseSignIn(idToken) {
    return this.request('/mobile/user/login/firebase', {
      method: 'POST',
      body: { idToken },
    });
  }

  // Chat APIs (AI Chat)
  async createChat(token, title = null) {
    return this.request('/mobile/chat', {
      method: 'POST',
      token,
      body: title ? { title } : {},
    });
  }

  async getChats(token) {
    return this.request('/mobile/chat', {
      method: 'GET',
      token,
    });
  }

  async getChat(chatId, token) {
    return this.request(`/mobile/chat/${chatId}`, {
      method: 'GET',
      token,
    });
  }

  async sendChatMessage(chatId, message, token) {
    return this.request(`/mobile/chat/${chatId}/message`, {
      method: 'POST',
      token,
      body: { message },
    });
  }

  async deleteChat(chatId, token) {
    return this.request(`/mobile/chat/${chatId}`, {
      method: 'DELETE',
      token,
    });
  }

  // Voice APIs
  async startVoiceSession(token, existingChatId = null) {
    return this.request('/mobile/voice/start', {
      method: 'POST',
      token,
      body: existingChatId ? { chatId: existingChatId } : {},
    });
  }

  async processVoice(chatId, audioData, token, audioFormat = 'linear16') {
    return this.request('/mobile/voice/process', {
      method: 'POST',
      token,
      body: {
        chatId,
        audioData,
        audioFormat,
      },
    });
  }

  // Report Citizen Case
  async reportCase(payload) {
    return this.request('/alerts/user', {
      method: 'POST',
      body: payload
    });
  }

  // Get Dynamic Mobile Form Details
  async getMobileCaseForm(caseType) {
    return this.request(`/mobile/cases/form/${caseType}`, {
      method: 'GET'
    });
  }

  // Get Case Types for mobile reporting
  async getMobileCaseTypes() {
    return this.request('/mobile/cases/types');
  }

  // Get User's Own Cases
  async getUserCases() {
    return this.request('/alerts/user', {
      method: 'GET'
    });
  }

  // Get User's Specific Case
  async getUserCaseById(caseId) {
    return this.request(`/alerts/user/${caseId}`, {
      method: 'GET'
    });
  }

  // Partner — Get all cases with optional filters
  async getPartnerCases(params = {}) {
    const qs = new URLSearchParams();
    if (params.status) qs.append('status', params.status);
    if (params.type) qs.append('type', params.type);
    if (params.priority) qs.append('priority', params.priority);
    if (params.page) qs.append('page', params.page);
    if (params.limit) qs.append('limit', params.limit);
    const query = qs.toString() ? `?${qs.toString()}` : '';
    return this.request(`/alerts/partner${query}`, { method: 'GET' });
  }

  // Partner — Get specific case detail (includes allowedNextStatuses + availableBasisTypes)
  async getPartnerCaseById(caseId) {
    return this.request(`/alerts/partner/${caseId}`, { method: 'GET' });
  }

  // Partner — Structured status update (strict flow: basisType + description required)
  async updateCaseStatus(alertId, status, basisType, description) {
    return this.request(`/alerts/partner/${alertId}/status`, {
      method: 'PATCH',
      body: { status, basisType, description }
    });
  }

  // Partner — Get basis types for a given case category
  async getPartnerBasisTypes(category) {
    return this.request(`/alerts/partner/basis-types?category=${encodeURIComponent(category)}`, {
      method: 'GET'
    });
  }

  // Super Admin endpoints
  async getAdmins() {
    return this.request('/super-admin/admins');
  }

  async createAdmin(email, password) {
    return this.request('/super-admin/admins', {
      method: 'POST',
      body: { email, password },
    });
  }

  async updateAdmin(id, data) {
    return this.request(`/super-admin/admins/${id}`, {
      method: 'PUT',
      body: data,
    });
  }

  async deleteAdmin(id) {
    return this.request(`/super-admin/admins/${id}`, {
      method: 'DELETE',
    });
  }

  async getSuperAdminDashboard() {
    return this.request('/super-admin/dashboard/overview');
  }

  async getPendingApprovals() {
    return this.request('/super-admin/pending-approvals');
  }

  async getUsers() {
    return this.request('/super-admin/users');
  }

  async deleteUser(userId) {
    return this.request(`/super-admin/users/${userId}`, {
      method: 'DELETE',
    });
  }

  async approveLogin(type, userId) {
    return this.request(`/super-admin/approve-login/${type}/${userId}`, {
      method: 'POST',
    });
  }

  async rejectLogin(type, userId) {
    return this.request(`/super-admin/reject-login/${type}/${userId}`, {
      method: 'POST',
    });
  }

  // Admin endpoints
  async getClients() {
    return this.request('/admin/clients');
  }

  async createClient(clientData) {
    return this.request('/admin/clients', {
      method: 'POST',
      body: clientData,
    });
  }

  async getClientLoginToken(clientId) {
    return this.request(`/admin/clients/${clientId}/login-token`, {
      method: 'POST',
    });
  }

  async updateClient(id, data) {
    return this.request(`/admin/clients/${id}`, {
      method: 'PUT',
      body: data,
    });
  }

  async deleteClient(id) {
    return this.request(`/admin/clients/${id}`, {
      method: 'DELETE',
    });
  }

  async approveClient(id) {
    return this.request(`/admin/clients/${id}/approve`, {
      method: 'PATCH',
    });
  }

  async rejectClient(id) {
    return this.request(`/admin/clients/${id}/reject`, {
      method: 'PATCH',
    });
  }

  async getAdminUsers(queryString = '') {
    return this.request(`/admin/users${queryString}`);
  }

  async getAdminDashboard() {
    return this.request('/admin/dashboard/overview');
  }

  async getOpenAIApiKey(clientId = null) {
    const qs = clientId ? `?clientId=${encodeURIComponent(clientId)}` : '';
    return this.request(`/admin/settings/openai-api-key${qs}`);
  }

  async updateOpenAIApiKey(apiKey, clientId = null) {
    return this.request('/admin/settings/openai-api-key', {
      method: 'PUT',
      body: { apiKey: apiKey || '', ...(clientId ? { clientId } : {}) },
    });
  }

  async getAdminPrompts() {
    return this.request('/admin/prompts');
  }

  async updateAdminPrompt(key, payload) {
    return this.request(`/admin/prompts/${encodeURIComponent(key)}`, {
      method: 'PUT',
      body: payload
    });
  }

  async getGeminiApiKey(clientId = null) {
    const qs = clientId ? `?clientId=${encodeURIComponent(clientId)}` : '';
    return this.request(`/admin/settings/gemini-api-key${qs}`);
  }

  async updateGeminiApiKey(apiKey, clientId = null) {
    return this.request('/admin/settings/gemini-api-key', {
      method: 'PUT',
      body: { apiKey: apiKey || '', ...(clientId ? { clientId } : {}) },
    });
  }

  async getAiProvider() {
    return this.request('/admin/settings/ai-provider');
  }

  async updateAiProvider(aiProvider) {
    return this.request('/admin/settings/ai-provider', {
      method: 'PUT',
      body: { aiProvider },
    });
  }

  // Client endpoints
  async getClientUsers(queryString = '') {
    return this.request(`/client/users${queryString}`);
  }

  async createClientUser(email, password, profile) {
    return this.request('/client/users', {
      method: 'POST',
      body: { email, password, profile },
    });
  }

  async updateClientUser(id, data) {
    return this.request(`/client/users/${id}`, {
      method: 'PUT',
      body: data,
    });
  }

  async deleteClientUser(id) {
    return this.request(`/client/users/${id}`, {
      method: 'DELETE',
    });
  }





  async getClientDashboard() {
    return this.request('/client/dashboard/overview');
  }

  // User endpoints
  async getUserProfile() {
    return this.request('/users/profile');
  }

  async updateUserProfile(data) {
    return this.request('/users/profile', {
      method: 'PUT',
      body: data,
    });
  }

  // Upload endpoints
  async getPresignedUrl(fileName, contentType) {
    return this.request('/upload/presigned-url', {
      method: 'POST',
      body: { fileName, contentType },
    });
  }

  async uploadToS3(presignedUrl, file) {
    return fetch(presignedUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type,
      },
    });
  }



  // Password Reset
  async forgotPassword(email) {
    return this.request('/auth/user/forgot-password', {
      method: 'POST',
      body: { email },
    });
  }

  async verifyResetOTP(email, otp) {
    return this.request('/auth/user/verify-reset-otp', {
      method: 'POST',
      body: { email, otp },
    });
  }

  async resetPassword(email, resetToken, newPassword) {
    return this.request('/auth/user/reset-password', {
      method: 'POST',
      body: { email, resetToken, newPassword },
    });
  }

  async resendResetOTP(email) {
    return this.request('/auth/user/resend-reset-otp', {
      method: 'POST',
      body: { email },
    });
  }

  // Testimonials
  async getTestimonials() {
    return this.request('/testimonials');
  }

  async getTestimonial(id) {
    return this.request(`/testimonials/${id}`);
  }

  async createTestimonial(testimonialData) {
    return this.request('/testimonials', {
      method: 'POST',
      body: testimonialData,
    });
  }

  async updateTestimonial(id, testimonialData) {
    return this.request(`/testimonials/${id}`, {
      method: 'PUT',
      body: testimonialData,
    });
  }

  async deleteTestimonial(id) {
    return this.request(`/testimonials/${id}`, {
      method: 'DELETE',
    });
  }

  async uploadTestimonialImage(id, imageFile) {
    const formData = new FormData();
    formData.append('image', imageFile);

    const token = getTokenForRole('client') || getTokenForRole('user');

    return fetch(`${this.baseURL}/testimonials/${id}/upload-image`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    }).then(async (response) => {
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Image upload failed');
      }
      return data;
    });
  }

  async getTestimonialStats() {
    return this.request('/testimonials/stats/summary');
  }

  // Mobile User Image Upload (Step 4 / Profile Update)
  async updateUserProfileWithImage(formData, token) {
    return fetch(`${this.baseURL}/mobile/user/profile`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    }).then(async (response) => {
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Profile update failed');
      }
      return data;
    });
  }

  async mobileUserRegisterStep4UploadImage(formData, token) {
    return fetch(`${this.baseURL}/mobile/user/profile/image`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    }).then(async (response) => {
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Profile image upload failed');
      }
      return data;
    });
  }
}

const apiService = new ApiService();

// Create axios-like interface
const api = {
  get: async (url, config = {}) => {
    const response = await apiService.request(url, { method: 'GET', ...config });
    return { data: response };
  },
  post: async (url, data, config = {}) => {
    const response = await apiService.request(url, { method: 'POST', body: data, ...config });
    return { data: response };
  },
  put: async (url, data, config = {}) => {
    const response = await apiService.request(url, { method: 'PUT', body: data, ...config });
    return { data: response };
  },
  delete: async (url, config = {}) => {
    const response = await apiService.request(url, { method: 'DELETE', ...config });
    return { data: response };
  },
  patch: async (url, data, config = {}) => {
    const response = await apiService.request(url, { method: 'PATCH', body: data, ...config });
    return { data: response };
  },

  // Partner Auth
  partnerLogin: apiService.partnerLogin.bind(apiService),
  partnerRegister: apiService.partnerRegister.bind(apiService),
  getCurrentPartner: apiService.getCurrentPartner.bind(apiService),

  // Chat - Partner Methods
  updatePartnerStatus: apiService.updatePartnerStatus.bind(apiService),
  getPartnerStatus: apiService.getPartnerStatus.bind(apiService),
  getPartnerRequests: apiService.getPartnerRequests.bind(apiService),
  acceptConversationRequest: apiService.acceptConversationRequest.bind(apiService),
  rejectConversationRequest: apiService.rejectConversationRequest.bind(apiService),

  // Chat - User Methods
  getAvailablePartners: apiService.getAvailablePartners.bind(apiService),
  getPartnerById: apiService.getPartnerById.bind(apiService),
  createConversation: apiService.createConversation.bind(apiService),

  // Chat - Common Methods
  getConversations: apiService.getConversations.bind(apiService),
  getConversationMessages: apiService.getConversationMessages.bind(apiService),
  sendMessage: apiService.sendMessage.bind(apiService),
  markMessagesAsRead: apiService.markMessagesAsRead.bind(apiService),
  endConversation: apiService.endConversation.bind(apiService),
  getUnreadCount: apiService.getUnreadCount.bind(apiService),


  // All existing methods
  superAdminLogin: apiService.superAdminLogin.bind(apiService),
  adminLogin: apiService.adminLogin.bind(apiService),
  getCurrentAdmin: apiService.getCurrentAdmin.bind(apiService),
  clientLogin: apiService.clientLogin.bind(apiService),
  clientRegister: apiService.clientRegister.bind(apiService),
  getCurrentClient: apiService.getCurrentClient.bind(apiService),
  userLogin: apiService.userLogin.bind(apiService),
  userRegister: apiService.userRegister.bind(apiService),
  getCurrentUser: apiService.getCurrentUser.bind(apiService),
  mobileUserRegisterStep1: apiService.mobileUserRegisterStep1.bind(apiService),
  mobileUserRegisterStep1Verify: apiService.mobileUserRegisterStep1Verify.bind(apiService),
  mobileUserRegisterStep2: apiService.mobileUserRegisterStep2.bind(apiService),
  mobileUserRegisterStep2Verify: apiService.mobileUserRegisterStep2Verify.bind(apiService),
  mobileUserRegisterStep3: apiService.mobileUserRegisterStep3.bind(apiService),
  resendEmailOTP: apiService.resendEmailOTP.bind(apiService),
  resendMobileOTP: apiService.resendMobileOTP.bind(apiService),
  mobileUserLogin: apiService.mobileUserLogin.bind(apiService),
  firebaseSignUp: apiService.firebaseSignUp.bind(apiService),
  firebaseSignIn: apiService.firebaseSignIn.bind(apiService),
  createChat: apiService.createChat.bind(apiService),
  getChats: apiService.getChats.bind(apiService),
  getChat: apiService.getChat.bind(apiService),
  sendChatMessage: apiService.sendChatMessage.bind(apiService),
  deleteChat: apiService.deleteChat.bind(apiService),
  startVoiceSession: apiService.startVoiceSession.bind(apiService),
  processVoice: apiService.processVoice.bind(apiService),
  getAdmins: apiService.getAdmins.bind(apiService),
  createAdmin: apiService.createAdmin.bind(apiService),
  updateAdmin: apiService.updateAdmin.bind(apiService),
  deleteAdmin: apiService.deleteAdmin.bind(apiService),
  getSuperAdminDashboard: apiService.getSuperAdminDashboard.bind(apiService),
  getPendingApprovals: apiService.getPendingApprovals.bind(apiService),
  getUsers: apiService.getUsers.bind(apiService),
  deleteUser: apiService.deleteUser.bind(apiService),
  approveLogin: apiService.approveLogin.bind(apiService),
  rejectLogin: apiService.rejectLogin.bind(apiService),
  getClients: apiService.getClients.bind(apiService),
  createClient: apiService.createClient.bind(apiService),
  getClientLoginToken: apiService.getClientLoginToken.bind(apiService),
  updateClient: apiService.updateClient.bind(apiService),
  deleteClient: apiService.deleteClient.bind(apiService),
  getAdminUsers: apiService.getAdminUsers.bind(apiService),
  getAdminDashboard: apiService.getAdminDashboard.bind(apiService),
  getGeminiApiKey: apiService.getGeminiApiKey.bind(apiService),
  updateGeminiApiKey: apiService.updateGeminiApiKey.bind(apiService),
  getOpenAIApiKey: apiService.getOpenAIApiKey.bind(apiService),
  updateOpenAIApiKey: apiService.updateOpenAIApiKey.bind(apiService),
  getAiProvider: apiService.getAiProvider.bind(apiService),
  updateAiProvider: apiService.updateAiProvider.bind(apiService),
  getAdminPrompts: apiService.getAdminPrompts.bind(apiService),
  updateAdminPrompt: apiService.updateAdminPrompt.bind(apiService),
  getClientUsers: apiService.getClientUsers.bind(apiService),
  createClientUser: apiService.createClientUser.bind(apiService),
  updateClientUser: apiService.updateClientUser.bind(apiService),
  deleteClientUser: apiService.deleteClientUser.bind(apiService),

  submitConversationFeedback: apiService.submitConversationFeedback.bind(apiService),
  getClientDashboard: apiService.getClientDashboard.bind(apiService),
  getUserProfile: apiService.getUserProfile.bind(apiService),
  updateUserProfile: apiService.updateUserProfile.bind(apiService),
  getPresignedUrl: apiService.getPresignedUrl.bind(apiService),
  uploadToS3: apiService.uploadToS3.bind(apiService),

  forgotPassword: apiService.forgotPassword.bind(apiService),
  verifyResetOTP: apiService.verifyResetOTP.bind(apiService),
  resetPassword: apiService.resetPassword.bind(apiService),
  resendResetOTP: apiService.resendResetOTP.bind(apiService),
  getTestimonials: apiService.getTestimonials.bind(apiService),
  getTestimonial: apiService.getTestimonial.bind(apiService),
  createTestimonial: apiService.createTestimonial.bind(apiService),
  updateTestimonial: apiService.updateTestimonial.bind(apiService),
  deleteTestimonial: apiService.deleteTestimonial.bind(apiService),
  uploadTestimonialImage: apiService.uploadTestimonialImage.bind(apiService),
  getTestimonialStats: apiService.getTestimonialStats.bind(apiService),
  updateUserProfileWithImage: apiService.updateUserProfileWithImage.bind(apiService),
  mobileUserRegisterStep4UploadImage: apiService.mobileUserRegisterStep4UploadImage.bind(apiService),
  reportCase: apiService.reportCase.bind(apiService),
  getMobileCaseForm: apiService.getMobileCaseForm.bind(apiService),
  getMobileCaseTypes: apiService.getMobileCaseTypes.bind(apiService),
  getUserCases: apiService.getUserCases.bind(apiService),
  getUserCaseById: apiService.getUserCaseById.bind(apiService),
  getPartnerCases: apiService.getPartnerCases.bind(apiService),
  updateCaseStatus: apiService.updateCaseStatus.bind(apiService),
  getPartnerCaseById: apiService.getPartnerCaseById.bind(apiService),
  getPartnerBasisTypes: apiService.getPartnerBasisTypes.bind(apiService),
  request: apiService.request.bind(apiService),

};

export default api;