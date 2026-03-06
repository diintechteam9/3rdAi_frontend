import { ref, onMounted, onUnmounted, computed } from 'vue';
import io from 'socket.io-client';
import api from '../../services/api.js';

export default {
  name: 'UserChat',
  setup() {
    // State
    const socket = ref(null);
    const isConnected = ref(false);
    const loading = ref(false);
    const showPartnersList = ref(true);

    // Data
    const partners = ref([]);
    const conversations = ref([]);
    const selectedConversation = ref(null);
    const selectedPartner = ref(null);
    const messages = ref([]);
    const newMessage = ref('');
    const typingUsers = ref(new Set());
    const showPartnerDetails = ref(false);
    const showEndModal = ref(false);
    const showFeedbackModal = ref(false); // For adding feedback when viewing ended conv
    const endFeedbackStars = ref(0);
    const endFeedbackText = ref('');
    const endFeedbackSatisfaction = ref('');
    const endModalSubmitting = ref(false);
    const conversationDetails = ref({ sessionDetails: null, rating: null }); // From messages API when ended
    const fullPartnerDetails = ref(null); // Fetched from API for complete DB fields
    const aadhaarNumber = ref(''); // User's Aadhaar proof



    // User info and profile (for auto-fill birth details)
    const userInfo = ref({
      id: null,
      email: null
    });
    const userProfile = ref(null);

    // Typing timeout
    let typingTimeout = null;
    let messagePollInterval = null;

    // WebSocket Connection
    const connectWebSocket = () => {
      const token = localStorage.getItem('token_user'); // ✅ FIXED: Changed from 'token_partner' to 'token_user'

      if (!token) {
        console.error('❌ No user token found');
        return;
      }

      console.log('🔌 Connecting to WebSocket...');
      console.log('🔑 Using token:', token.substring(0, 20) + '...');

      // Disconnect existing socket if any
      if (socket.value) {
        socket.value.disconnect();
      }

      socket.value = io(import.meta.env.VITE_WS_URL || 'http://localhost:4000', {
        path: '/socket.io/',
        auth: {
          token: token  // Send token in auth object
        },
        transports: ['polling', 'websocket'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 10000
      });

      // Connection events
      socket.value.on('connect', () => {
        console.log('✅ WebSocket connected');
        console.log('📍 Socket ID:', socket.value.id);
        isConnected.value = true;
        if (messagePollInterval) {
          clearInterval(messagePollInterval);
          messagePollInterval = null;
        }
      });

      socket.value.on('connected', (data) => {
        console.log('✅ Server acknowledged connection:', data);
        if (data.userId) {
          userInfo.value.id = data.userId;
        }
      });

      socket.value.on('disconnect', (reason) => {
        console.log('❌ WebSocket disconnected, reason:', reason);
        isConnected.value = false;
      });

      socket.value.on('connect_error', (error) => {
        console.error('❌ WebSocket connection error:', error.message);
        console.error('Error details:', error);
      });

      socket.value.on('error', (error) => {
        console.error('❌ WebSocket error:', error);
      });

      // Message events
      socket.value.on('message:new', (data) => {
        console.log('📨 New message received:', data);

        if (selectedConversation.value?.conversationId === data.conversationId) {
          messages.value.push(data.message);
          scrollToBottom();

          // Mark as read immediately if conversation is open
          markMessagesAsRead(data.conversationId);
        } else {
          // Update unread count in conversations list
          const conv = conversations.value.find(c => c.conversationId === data.conversationId);
          if (conv) {
            conv.unreadCount = (conv.unreadCount || 0) + 1;
            conv.lastMessage = data.message;
            conv.lastMessageAt = data.message.createdAt;
          }
        }
      });

      socket.value.on('message:delivered', (data) => {
        const msg = messages.value.find(m => m._id === data.messageId);
        if (msg) {
          msg.isDelivered = true;
          msg.deliveredAt = data.deliveredAt;
        }
      });

      socket.value.on('message:read:receipt', (data) => {
        console.log('✅ Messages read by partner:', data);

        if (data.messageIds === 'all') {
          messages.value.forEach(msg => {
            if (msg.senderModel === 'User') {
              msg.isRead = true;
              msg.readAt = data.readAt;
            }
          });
        } else {
          data.messageIds.forEach(msgId => {
            const msg = messages.value.find(m => m._id === msgId);
            if (msg) {
              msg.isRead = true;
              msg.readAt = data.readAt;
            }
          });
        }
      });

      // Typing events
      socket.value.on('typing:status', (data) => {
        if (selectedConversation.value?.conversationId === data.conversationId) {
          if (data.isTyping) {
            typingUsers.value.add(data.partnerId || data.userId);
          } else {
            typingUsers.value.delete(data.partnerId || data.userId);
          }
        }
      });

      // Conversation events
      socket.value.on('conversation:partner:joined', (data) => {
        console.log('👤 Partner joined conversation:', data);
      });

      socket.value.on('conversation:accepted', async (data) => {
        console.log('✅ Conversation accepted:', data);

        // Move from pending to active
        const pendingConv = conversations.value.find(c => c.conversationId === data.conversationId);
        if (pendingConv) {
          pendingConv.status = 'accepted';
          pendingConv.isAcceptedByPartner = true;
        }

        // Reload conversations
        await loadConversations();

        // Show notification
        if (Notification.permission === 'granted') {
          new Notification('Consultation Accepted', {
            body: `${data.partnerName || 'Partner'} has accepted your consultation request`,
            icon: '/logo.png'
          });
        }
      });

      socket.value.on('conversation:rejected', async (data) => {
        console.log('❌ Conversation rejected:', data);

        // Remove from conversations
        conversations.value = conversations.value.filter(
          c => c.conversationId !== data.conversationId
        );

        // Show notification
        alert(`Your consultation request was declined. Reason: ${data.reason || 'Partner is unavailable'}`);

        // Reload conversations
        await loadConversations();
      });
    };

    // Load user profile for auto-fill (birth details)
    const loadUserProfile = async () => {
      try {
        const token = localStorage.getItem('token_user');
        if (!token) return;
        const response = await api.getCurrentUser(token);
        if (response?.success && response?.data?.user) {
          const u = response.data.user;
          userProfile.value = u;
          if (u._id) userInfo.value.id = u._id;
          if (u.email) userInfo.value.email = u.email;
        }
      } catch (e) {
        console.warn('[UserChat] Could not load user profile:', e?.message);
      }
    };



    // Load available partners
    const loadPartners = async () => {
      loading.value = true;
      try {
        const response = await api.getAvailablePartners();
        console.log('📦 Partners response:', response);

        if (response && response.success) {
          partners.value = response.data || [];
          console.log('✅ Loaded partners:', partners.value.length);
        }
      } catch (error) {
        console.error('❌ Error loading partners:', error);
        partners.value = [];
      } finally {
        loading.value = false;
      }
    };

    // Load conversations
    const loadConversations = async () => {
      loading.value = true;
      try {
        const response = await api.getConversations();
        console.log('📦 Conversations response:', response);

        if (response && response.success) {
          const list = response.data || [];
          // Sort so the latest activity appears first
          conversations.value = list.sort((a, b) => {
            const getTime = (c) =>
              new Date(c.lastMessageAt || c.updatedAt || c.createdAt || 0).getTime();
            return getTime(b) - getTime(a);
          });
          console.log('✅ Loaded conversations:', conversations.value.length);
        }
      } catch (error) {
        console.error('❌ Error loading conversations:', error);
        conversations.value = [];
      } finally {
        loading.value = false;
      }
    };

    // Open partner details first (then allow request)
    const openPartnerDetails = async (partner) => {
      console.log('👤 Selected partner:', partner);
      selectedPartner.value = partner;
      showPartnersList.value = true;
      showPartnerDetails.value = true;
      fullPartnerDetails.value = null;
      try {
        const res = await api.getPartnerById(partner._id);
        if (res?.data) fullPartnerDetails.value = res.data;
      } catch (e) {
        fullPartnerDetails.value = partner;
      }
    };

    // Start consultation flow after viewing partner details
    const startConsultationForSelectedPartner = async () => {
      if (!selectedPartner.value) return;
      const partner = selectedPartner.value;

      const existingConv = conversations.value.find(
        c => c.otherUser?._id === partner._id
      );

      // If active conversation exists, just open it
      if (existingConv && existingConv.status !== 'ended') {
        console.log('ℹ️ Conversation already exists, opening it');
        showPartnerDetails.value = false;
        showPartnersList.value = false;
        await selectConversation(existingConv);
        return;
      }

      // No conversation or previous one ended → start new consultation
      if (existingConv?.status === 'ended') {
        console.log('ℹ️ Previous consultation ended - starting new one');
      }

      showPartnerDetails.value = false;
      showPartnersList.value = false;

      console.log('✅ Creating conversation directly');
      await createConversationRequest();
    };

    // Create conversation request
    const createConversationRequest = async () => {
      if (!selectedPartner.value) return;

      if (!aadhaarNumber.value || aadhaarNumber.value.length < 12) {
        alert('Please enter a valid 12-digit Aadhaar Number to proceed.');
        return;
      }

      try {
        loading.value = true;

        const response = await api.createConversation({
          partnerId: selectedPartner.value._id,
          aadhaarNumber: aadhaarNumber.value
        });

        if (response && response.success) {
          console.log('✅ Conversation request created');

          // Add to conversations
          const conversation = response.data;
          conversations.value.unshift(conversation);

          // Select the new conversation
          selectConversation(conversation);

          // Hide form
          showPartnersList.value = false;
          aadhaarNumber.value = ''; // Reset after successful submission

          // Show notification
          alert('Chat request sent! Waiting for police officer to accept.');
        }
      } catch (error) {
        console.error('❌ Error creating conversation:', error);
        alert(error.response?.data?.message || 'Failed to create chat request');
      } finally {
        loading.value = false;
      }
    };



    // Cancel conversation request
    const cancelConversationRequest = () => {
      selectedPartner.value = null;
    };

    // Select conversation
    const selectConversation = async (conversation) => {
      console.log('💬 Selecting conversation:', conversation);
      selectedConversation.value = conversation;
      messages.value = [];
      showPartnersList.value = false;
      fullPartnerDetails.value = null;

      // Join conversation via WebSocket if connected
      if (socket.value && isConnected.value) {
        socket.value.emit('conversation:join',
          { conversationId: conversation.conversationId },
          async (response) => {
            if (response && response.success) {
              console.log('✅ Joined conversation');
              await loadMessages(conversation.conversationId);
            } else {
              console.error('❌ Failed to join conversation:', response?.message);
              // Fallback: load messages anyway
              await loadMessages(conversation.conversationId);
            }
          }
        );
      } else {
        // Load messages directly if WebSocket not connected
        await loadMessages(conversation.conversationId);
        // Poll for new messages when WebSocket is disconnected
        if (messagePollInterval) clearInterval(messagePollInterval);
        messagePollInterval = setInterval(() => {
          if (selectedConversation.value?.conversationId === conversation.conversationId && !isConnected.value) {
            loadMessages(conversation.conversationId);
          } else if (isConnected.value && messagePollInterval) {
            clearInterval(messagePollInterval);
            messagePollInterval = null;
          }
        }, 4000);
      }
    };

    // Load messages
    const loadMessages = async (conversationId) => {
      loading.value = true;
      conversationDetails.value = { sessionDetails: null, rating: null };
      try {
        const response = await api.getConversationMessages(conversationId);
        if (response && response.success) {
          messages.value = Array.isArray(response.data) ? response.data : ((response.data && response.data.messages) || []);
          if (response.data.sessionDetails) conversationDetails.value.sessionDetails = response.data.sessionDetails;
          if (response.data.rating) conversationDetails.value.rating = response.data.rating;
          console.log('✅ Loaded messages:', messages.value.length);
          scrollToBottom();

          if (selectedConversation.value?.status !== 'ended') {
            markMessagesAsRead(conversationId);
          }
        }
      } catch (error) {
        console.error('❌ Error loading messages:', error);
      } finally {
        loading.value = false;
      }
    };

    // Send message
    const sendMessage = () => {
      if (!newMessage.value.trim() || !selectedConversation.value) return;

      // Check if conversation is accepted
      if (selectedConversation.value.status === 'pending') {
        alert('Please wait for the partner to accept your consultation request');
        return;
      }

      const messageData = {
        conversationId: selectedConversation.value.conversationId,
        content: newMessage.value.trim(),
        messageType: 'text'
      };

      const updateConversationPreview = () => {
        const now = new Date().toISOString();
        const conv = conversations.value.find(
          c => c.conversationId === selectedConversation.value.conversationId
        );
        if (conv) {
          conv.lastMessage = {
            ...(conv.lastMessage || {}),
            content: messageData.content,
            createdAt: now,
            senderModel: 'User'
          };
          conv.lastMessageAt = now;
        }
      };

      if (socket.value && isConnected.value) {
        socket.value.emit('message:send', messageData, (response) => {
          if (response && response.success) {
            console.log('✅ Message sent');
            updateConversationPreview();
            newMessage.value = '';
            stopTyping();
          } else {
            console.error('❌ Failed to send message:', response?.message);
            alert(response?.message || 'Failed to send message');
          }
        });
      } else {
        // Fallback to REST API if WebSocket not connected
        api.sendMessage(selectedConversation.value.conversationId, messageData)
          .then(() => {
            console.log('✅ Message sent via REST');
            updateConversationPreview();
            newMessage.value = '';
            loadMessages(selectedConversation.value.conversationId);
          })
          .catch(error => {
            console.error('❌ Failed to send message:', error);
            alert('Failed to send message');
          });
      }
    };

    // Typing indicators
    const startTyping = () => {
      if (!selectedConversation.value || !socket.value || !isConnected.value) return;

      socket.value.emit('typing:start', {
        conversationId: selectedConversation.value.conversationId
      });

      // Auto-stop typing after 3 seconds
      if (typingTimeout) clearTimeout(typingTimeout);
      typingTimeout = setTimeout(stopTyping, 3000);
    };

    const stopTyping = () => {
      if (!selectedConversation.value || !socket.value || !isConnected.value) return;

      socket.value.emit('typing:stop', {
        conversationId: selectedConversation.value.conversationId
      });

      if (typingTimeout) {
        clearTimeout(typingTimeout);
        typingTimeout = null;
      }
    };

    // Mark messages as read
    const markMessagesAsRead = (conversationId) => {
      if (socket.value && isConnected.value) {
        socket.value.emit('message:read', { conversationId });
      } else {
        api.markMessagesAsRead(conversationId);
      }
    };

    // Open end session modal
    const openEndModal = () => {
      if (!selectedConversation.value || selectedConversation.value.status === 'ended') return;
      endFeedbackStars.value = 0;
      endFeedbackText.value = '';
      endFeedbackSatisfaction.value = '';
      showEndModal.value = true;
    };

    // Close end modal
    const closeEndModal = () => {
      showEndModal.value = false;
    };

    // End conversation with feedback
    const endConversation = async () => {
      if (!selectedConversation.value || endModalSubmitting.value || endFeedbackStars.value < 1) return;

      endModalSubmitting.value = true;
      try {
        const feedbackPayload = {
          stars: endFeedbackStars.value,
          feedback: endFeedbackText.value.trim() || undefined,
          satisfaction: endFeedbackSatisfaction.value || undefined
        };
        const endRes = await api.endConversation(selectedConversation.value.conversationId, feedbackPayload);

        console.log('✅ Conversation ended');

        const conv = conversations.value.find(c => c.conversationId === selectedConversation.value.conversationId);
        if (conv) {
          conv.status = 'ended';
          if (endRes?.data?.sessionDetails) conv.sessionDetails = endRes.data.sessionDetails;
          if (endRes?.data?.rating) conv.rating = endRes.data.rating;
        }

        selectedConversation.value = {
          ...selectedConversation.value,
          status: 'ended',
          sessionDetails: endRes?.data?.sessionDetails || selectedConversation.value.sessionDetails,
          rating: endRes?.data?.rating || selectedConversation.value.rating
        };
        conversationDetails.value = {
          sessionDetails: endRes?.data?.sessionDetails || null,
          rating: endRes?.data?.rating || null
        };

        closeEndModal();
        await loadConversations();
        await loadMessages(selectedConversation.value.conversationId);
      } catch (error) {
        console.error('❌ Error ending conversation:', error);
        alert(error.response?.data?.message || 'Failed to end session');
      } finally {
        endModalSubmitting.value = false;
      }
    };

    const hasUserSubmittedFeedback = computed(() => {
      const r = conversationDetails.value.rating || selectedConversation.value?.rating;
      return !!(r?.byUser?.stars != null || r?.byUser?.feedback || r?.byUser?.ratedAt);
    });

    const openFeedbackModal = () => {
      endFeedbackStars.value = 0;
      endFeedbackText.value = '';
      endFeedbackSatisfaction.value = '';
      showFeedbackModal.value = true;
    };

    const submitFeedbackOnly = async () => {
      if (!selectedConversation.value || endModalSubmitting.value) return;
      endModalSubmitting.value = true;
      try {
        await api.submitConversationFeedback(selectedConversation.value.conversationId, {
          stars: endFeedbackStars.value || undefined,
          feedback: endFeedbackText.value.trim() || undefined,
          satisfaction: endFeedbackSatisfaction.value || undefined
        });
        const conv = conversations.value.find(c => c.conversationId === selectedConversation.value.conversationId);
        if (conv) await loadConversations();
        await loadMessages(selectedConversation.value.conversationId);
        showFeedbackModal.value = false;
      } catch (e) {
        alert(e?.response?.data?.message || 'Failed to submit feedback');
      } finally {
        endModalSubmitting.value = false;
      }
    };

    // Render partner details in neat rows (no card) - we don't use this anymore as per requirement

    // Session summary for end modal
    const sessionSummary = computed(() => {
      const conv = selectedConversation.value;
      if (!conv) return { duration: 0, messagesCount: 0 };
      const start = conv.startedAt || conv.createdAt ? new Date(conv.startedAt || conv.createdAt) : new Date();
      const duration = Math.round((Date.now() - start.getTime()) / (1000 * 60));
      return { duration: Math.max(0, duration), messagesCount: messages.value.length };
    });

    // Back to partners list
    const backToPartnersList = () => {
      selectedConversation.value = null;
      selectedPartner.value = null;
      showPartnerDetails.value = false;
      fullPartnerDetails.value = null;
      messages.value = [];
      showPartnersList.value = true;
      if (messagePollInterval) {
        clearInterval(messagePollInterval);
        messagePollInterval = null;
      }
    };

    // Scroll to bottom of messages
    const scrollToBottom = () => {
      setTimeout(() => {
        const messagesContainer = document.getElementById('messages-container');
        if (messagesContainer) {
          messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
      }, 100);
    };

    // Format time
    const formatTime = (date) => {
      if (!date) return '';
      const d = new Date(date);
      return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    };

    // Computed: separate requested (pending) vs conversations (accepted/active/ended)
    const requestedConversations = computed(() =>
      conversations.value.filter(c => c.status === 'pending')
    );
    const activeConversations = computed(() =>
      conversations.value.filter(c => c.status !== 'pending')
    );

    // Format date
    const formatDate = (date) => {
      if (!date) return '';
      const d = new Date(date);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      if (d.toDateString() === today.toDateString()) return 'Today';
      if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    // Get partner status color
    const getStatusColor = (status) => {
      switch (status) {
        case 'online': return '#10b981';
        case 'busy': return '#f59e0b';
        case 'offline': return '#6b7280';
        default: return '#6b7280';
      }
    };

    // Get partner status text
    const getStatusText = (partner) => {
      if (partner.status === 'online' && !partner.isBusy) return 'Available';
      if (partner.status === 'online' && partner.isBusy) return 'Busy';
      if (partner.status === 'busy') return 'Busy';
      return 'Offline';
    };

    // Computed
    const isTyping = computed(() => typingUsers.value.size > 0);
    const unreadCount = computed(() => {
      return conversations.value.reduce((sum, conv) => sum + (conv.unreadCount || 0), 0);
    });
    const onlinePartners = computed(() => {
      return partners.value.filter(p => p.status === 'online');
    });
    const availablePartners = computed(() => {
      return partners.value.filter(p => p.status === 'online' && !p.isBusy);
    });

    // Request notification permission
    const requestNotificationPermission = () => {
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
      }
    };

    // Lifecycle
    onMounted(async () => {
      console.log('🚀 UserChat component mounted');
      await loadUserProfile();

      // Request notification permission
      requestNotificationPermission();

      // Connect WebSocket first
      connectWebSocket();

      // Load data
      await loadPartners();
      await loadConversations();
    });

    onUnmounted(() => {
      console.log('👋 UserChat component unmounting');
      if (messagePollInterval) {
        clearInterval(messagePollInterval);
        messagePollInterval = null;
      }
      if (socket.value) {
        if (selectedConversation.value) {
          socket.value.emit('conversation:leave', {
            conversationId: selectedConversation.value.conversationId
          });
        }
        socket.value.disconnect();
      }
    });

    return () => (
      <div style="display: flex; height: 100%; overflow: hidden; background-color: #f9fafb;">
        {/* Sidebar */}
        <div style="width: 360px; background-color: white; border-right: 1px solid #e5e7eb; display: flex; flex-direction: column;">
          {/* Header */}
          <div style="padding: 20px; border-bottom: 1px solid #e5e7eb;">
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <h2 style="font-size: 20px; font-weight: 600; color: #111827; margin: 0;">
                Chat
              </h2>
              <div style={`width: 12px; height: 12px; border-radius: 50%; ${isConnected.value ? 'background-color: #10b981;' : 'background-color: #ef4444;'
                }`} title={isConnected.value ? 'Connected' : 'Disconnected'} />
            </div>
            {/* Tabs: Partners / Conversations */}
            <div style="margin-top: 16px; display: flex; gap: 8px; background-color: #f3f4f6; padding: 4px; border-radius: 9999px;">
              <button
                onClick={() => { showPartnersList.value = true; }}
                style={`flex: 1; padding: 6px 10px; border-radius: 9999px; border: none; font-size: 13px; font-weight: 500; cursor: pointer; ${showPartnersList.value
                  ? 'background-color: white; color: #111827; box-shadow: 0 1px 3px rgba(0,0,0,0.08);'
                  : 'background-color: transparent; color: #6b7280;'
                  }`}
              >
                Partners
              </button>
              <button
                onClick={() => { showPartnersList.value = false; showPartnerDetails.value = false; }}
                style={`flex: 1; padding: 6px 10px; border-radius: 9999px; border: none; font-size: 13px; font-weight: 500; cursor: pointer; ${!showPartnersList.value
                  ? 'background-color: white; color: #111827; box-shadow: 0 1px 3px rgba(0,0,0,0.08);'
                  : 'background-color: transparent; color: #6b7280;'
                  }`}
              >
                Conversations
              </button>
            </div>
          </div>

          {/* List */}
          <div style="flex: 1; overflow-y: auto;">
            {showPartnersList.value ? (
              // Partners List
              partners.value.length === 0 ? (
                <div style="padding: 40px 20px; text-align: center; color: #6b7280;">
                  <svg style="width: 48px; height: 48px; margin: 0 auto 12px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <p>No partners available</p>
                </div>
              ) : (
                <>
                  <div style="padding: 12px 16px; background-color: #f9fafb; border-bottom: 1px solid #e5e7eb;">
                    <p style="font-size: 12px; color: #6b7280; margin: 0;">
                      {availablePartners.value.length} available • {onlinePartners.value.length} online • {partners.value.length} total
                    </p>
                  </div>
                  {partners.value.map(partner => (
                    <div
                      key={partner._id}
                      onClick={() => openPartnerDetails(partner)}
                      style="padding: 16px; border-bottom: 1px solid #f3f4f6; cursor: pointer; transition: background-color 0.2s;"
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                    >
                      <div style="display: flex; align-items: center; gap: 12px;">
                        <div style="position: relative; flex-shrink: 0;">
                          <div style="width: 48px; height: 48px; background: linear-gradient(135deg, #6366f1, #8b5cf6); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; overflow: hidden;">
                            {partner.profileImage ? (
                              <img src={partner.profileImage} alt={partner.name || 'Partner'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              partner.name?.charAt(0)?.toUpperCase() || partner.email?.charAt(0)?.toUpperCase() || 'P'
                            )}
                          </div>
                          <div style={`position: absolute; bottom: 0; right: 0; width: 14px; height: 14px; background-color: ${getStatusColor(partner.status)}; border: 2px solid white; border-radius: 50%;`} />
                        </div>
                        <div style="flex: 1; min-width: 0;">
                          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                            <p style="font-weight: 600; color: #111827; margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                              {partner.name || partner.email}
                            </p>
                            <span style={`font-size: 11px; padding: 2px 8px; border-radius: 10px; font-weight: 500; ${partner.status === 'online' && !partner.isBusy
                              ? 'background-color: #d1fae5; color: #065f46;'
                              : 'background-color: #fef3c7; color: #92400e;'
                              }`}>
                              {getStatusText(partner)}
                            </span>
                          </div>
                          <p style="font-size: 13px; color: #6b7280; margin: 0 0 4px 0;">
                            {partner.designation || 'Police Officer'}
                          </p>
                          <div style="display: flex; gap: 12px; font-size: 12px; color: #9ca3af;">
                            <span>⭐ {partner.rating?.toFixed(1) || '0.0'}</span>
                            <span>📊 {partner.totalSessions || 0} sessions</span>
                            <span>📅 {partner.experience || 0}y exp</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )
            ) : (
              // Requested + Conversations (separate sections)
              requestedConversations.value.length === 0 && activeConversations.value.length === 0 ? (
                <div style="padding: 40px 20px; text-align: center; color: #6b7280;">
                  <svg style="width: 48px; height: 48px; margin: 0 auto 12px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <p>No chat sessions yet</p>
                  <button
                    onClick={() => showPartnersList.value = true}
                    style="margin-top: 16px; padding: 10px 20px; background-color: #6366f1; color: white; border: none; border-radius: 6px; font-weight: 500; cursor: pointer;"
                  >
                    Find a Police Officer
                  </button>
                </div>
              ) : (
                <>
                  {requestedConversations.value.length > 0 && (
                    <div style="padding: 12px 16px; background-color: #fffbeb; border-bottom: 1px solid #fde68a;">
                      <p style="font-size: 12px; font-weight: 600; color: #92400e; margin: 0 0 8px 0;">Requested</p>
                      {requestedConversations.value.map(conv => (
                        <div
                          key={conv.conversationId}
                          onClick={() => selectConversation(conv)}
                          style={`padding: 12px; margin-bottom: 8px; border-radius: 8px; cursor: pointer; background: white; border: 1px solid #fde68a; transition: background-color 0.2s; ${selectedConversation.value?.conversationId === conv.conversationId ? 'background-color: #fef3c7;' : ''
                            }`}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fef3c7'}
                          onMouseLeave={(e) => { if (selectedConversation.value?.conversationId !== conv.conversationId) e.currentTarget.style.backgroundColor = 'white'; }}
                        >
                          <div style="display: flex; align-items: center; gap: 10px;">
                            <div style="width: 40px; height: 40px; flex-shrink: 0; background: linear-gradient(135deg, #f59e0b, #d97706); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; overflow: hidden;">
                              {conv.otherUser?.profileImage ? (
                                <img src={conv.otherUser.profileImage} alt="User" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : (
                                conv.otherUser?.name?.charAt(0)?.toUpperCase() || conv.otherUser?.email?.charAt(0)?.toUpperCase() || 'P'
                              )}
                            </div>
                            <div style="flex: 1; min-width: 0;">
                              <p style="font-weight: 600; color: #111827; margin: 0; font-size: 14px;">{conv.otherUser?.name || conv.otherUser?.email}</p>
                              <p style="font-size: 12px; color: #f59e0b; margin: 0;">⏳ Waiting...</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {activeConversations.value.length > 0 && (
                    <div style="padding: 12px 16px;">
                      <p style="font-size: 12px; font-weight: 600; color: #374151; margin: 0 0 8px 0;">Conversations</p>
                      {activeConversations.value.map(conv => (
                        <div
                          key={conv.conversationId}
                          onClick={() => selectConversation(conv)}
                          style={`padding: 16px; border-bottom: 1px solid #f3f4f6; cursor: pointer; transition: background-color 0.2s; ${selectedConversation.value?.conversationId === conv.conversationId
                            ? 'background-color: #eef2ff;'
                            : ''
                            }`}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                          onMouseLeave={(e) => {
                            if (selectedConversation.value?.conversationId !== conv.conversationId) {
                              e.currentTarget.style.backgroundColor = 'white';
                            }
                          }}
                        >
                          <div style="display: flex; align-items: center; gap: 12px;">
                            <div style="position: relative; flex-shrink: 0;">
                              <div style="width: 48px; height: 48px; background: linear-gradient(135deg, #6366f1, #8b5cf6); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; overflow: hidden;">
                                {conv.otherUser?.profileImage ? (
                                  <img src={conv.otherUser.profileImage} alt="User" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                  conv.otherUser?.name?.charAt(0)?.toUpperCase() || conv.otherUser?.email?.charAt(0)?.toUpperCase() || 'P'
                                )}
                              </div>
                              {conv.unreadCount > 0 && (
                                <div style="position: absolute; top: -2px; right: -2px; width: 20px; height: 20px; background-color: #ef4444; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 11px; font-weight: 600;">
                                  {conv.unreadCount}
                                </div>
                              )}
                              {conv.status === 'pending' && (
                                <div style="position: absolute; bottom: -2px; right: -2px; width: 20px; height: 20px; background-color: #f59e0b; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                                  <span style="font-size: 10px;">⏳</span>
                                </div>
                              )}
                            </div>
                            <div style="flex: 1; min-width: 0;">
                              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                                <p style="font-weight: 600; color: #111827; margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                                  {conv.otherUser?.name || conv.otherUser?.email}
                                </p>
                                <span style="font-size: 12px; color: #6b7280;">
                                  {formatTime(conv.lastMessageAt)}
                                </span>
                              </div>
                              {conv.status === 'ended' ? (
                                <p style="font-size: 13px; color: #6b7280; margin: 0; font-style: italic;">Ended</p>
                              ) : (
                                <p style="font-size: 14px; color: #6b7280; margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                                  {conv.lastMessage?.content || 'Start the conversation'}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )
            )}
          </div>
        </div>

        {/* Main Area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'row', minWidth: 0, background: '#f9fafb' }}>
          {(showPartnerDetails.value && selectedPartner.value && !selectedConversation.value) ? (
            // Verification form full width panel
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, background: 'white', borderLeft: '1px solid #e5e7eb' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#111827', letterSpacing: '-0.01em' }}>Verification Required</h3>
                <button
                  onClick={() => { showPartnerDetails.value = false; selectedPartner.value = null; fullPartnerDetails.value = null; aadhaarNumber.value = ''; }}
                  style={{ padding: '6px 14px', border: '1px solid #e5e7eb', background: '#f9fafb', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 500, transition: 'all 0.2s' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#f9fafb'}
                >
                  Close
                </button>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px 0' }}>
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                  <div style={{ width: '56px', height: '56px', background: 'linear-gradient(135deg, #10b981, #059669)', borderRadius: '16px', margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', boxShadow: '0 10px 15px -3px rgba(16, 185, 129, 0.2)' }}>
                    <svg style={{ width: '28px', height: '28px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <h4 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 6px 0', color: '#111827', letterSpacing: '-0.02em' }}>Identity Proof</h4>
                  <p style={{ fontSize: '13px', color: '#6b7280', margin: 0, maxWidth: '320px', margin: '0 auto', lineHeight: '1.5' }}>To chat with a police officer, please verify your identity by entering your Aadhaar Number.</p>
                </div>

                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0', maxWidth: '440px', margin: '0 auto' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.025em' }}>
                    Aadhaar Number <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={aadhaarNumber.value}
                    onInput={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 12);
                      aadhaarNumber.value = val;
                      e.target.value = val;
                    }}
                    placeholder="Enter 12-digit Aadhaar Number"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: '1px solid #cbd5e1',
                      fontSize: '15px',
                      outline: 'none',
                      boxSizing: 'border-box',
                      transition: 'all 0.2s',
                      backgroundColor: 'white'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#6366f1';
                      e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#cbd5e1';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                  <div style={{ display: 'flex', gap: '8px', marginTop: '10px', alignItems: 'flex-start' }}>
                    <svg style={{ width: '14px', height: '14px', color: '#94a3b8', marginTop: '1px', flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <p style={{ fontSize: '11px', color: '#64748b', margin: 0, lineHeight: '1.4' }}>Your information is secure and will only be shared with the requested police official.</p>
                  </div>
                </div>
              </div>
              <div style={{ padding: '16px 20px', borderTop: '1px solid #f3f4f6' }}>
                <button
                  onClick={startConsultationForSelectedPartner}
                  disabled={loading.value || aadhaarNumber.value.length < 12}
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: (loading.value || aadhaarNumber.value.length < 12) ? '#cbd5e1' : 'linear-gradient(135deg, #6366f1, #4f46e5)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    fontWeight: 600,
                    cursor: (loading.value || aadhaarNumber.value.length < 12) ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    transition: 'all 0.3s',
                    boxShadow: (loading.value || aadhaarNumber.value.length < 12) ? 'none' : '0 10px 15px -3px rgba(99, 102, 241, 0.3)'
                  }}>
                  {loading.value ? 'Requesting...' : 'Request to Chat'}
                </button>
              </div>
            </div>

          ) : selectedConversation.value ? (
            // Chat Area + Partner Details side panel
            <>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                {/* Chat Header - Full partner details */}
                <div style={{ padding: '16px 24px', background: 'white', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 0 }}>
                    <button
                      onClick={backToPartnersList}
                      style={{ padding: 8, background: '#f3f4f6', border: 'none', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <svg style={{ width: 20, height: 20 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      <div style={{ width: 48, height: 48, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 600, fontSize: 18, overflow: 'hidden' }}>
                        {selectedConversation.value.otherUser?.profileImage ? (
                          <img src={selectedConversation.value.otherUser.profileImage} alt="Partner" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          selectedConversation.value.otherUser?.name?.charAt(0)?.toUpperCase() || selectedConversation.value.otherUser?.email?.charAt(0)?.toUpperCase() || 'P'
                        )}
                      </div>
                      <div style={{ position: 'absolute', bottom: 0, right: 0, width: 14, height: 14, borderRadius: '50%', border: '2px solid white', backgroundColor: getStatusColor(selectedConversation.value.otherUser?.status || selectedConversation.value.otherUser?.onlineStatus) }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 700, color: '#111827', margin: 0, fontSize: 16 }}>
                        {selectedConversation.value.otherUser?.name || selectedConversation.value.otherUser?.email}
                      </p>
                      {selectedConversation.value.status === 'pending' ? (
                        <p style={{ fontSize: 12, color: '#f59e0b', margin: 0 }}>⏳ Waiting for acceptance</p>
                      ) : isTyping.value ? (
                        <p style={{ fontSize: 12, color: '#10b981', margin: 0 }}>typing...</p>
                      ) : (
                        <>
                          <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>
                            {Array.isArray(selectedConversation.value.otherUser?.designation) ? selectedConversation.value.otherUser.designation.join(', ') : (selectedConversation.value.otherUser?.designation || 'Police Officer')}
                          </p>
                          <div style={{ display: 'flex', gap: 12, marginTop: 4, fontSize: 12, color: '#9ca3af' }}>
                            <span>⭐ {selectedConversation.value.otherUser?.rating?.toFixed?.(1) || '0.0'}</span>
                            <span>📊 {selectedConversation.value.otherUser?.totalSessions || selectedConversation.value.otherUser?.completedSessions || 0} sessions</span>
                            <span>📅 {selectedConversation.value.otherUser?.experience || 0}y exp</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {selectedConversation.value.status !== 'ended' && (
                    <button
                      onClick={openEndModal}
                      style="padding: 8px 16px; background-color: #ef4444; color: white; border: none; border-radius: 6px; font-weight: 500; cursor: pointer; transition: background-color 0.2s;"
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#dc2626'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ef4444'}
                    >
                      End Session
                    </button>
                  )}
                </div>

                {/* Messages */}
                <div
                  id="messages-container"
                  style="flex: 1; overflow-y: auto; padding: 24px; display: flex; flex-direction: column; gap: 16px;"
                >
                  {loading.value ? (
                    <div style="text-align: center; padding: 40px;">
                      <div style="width: 40px; height: 40px; border: 3px solid #e5e7eb; border-top-color: #6366f1; border-radius: 50%; margin: 0 auto; animation: spin 1s linear infinite;" />
                    </div>
                  ) : selectedConversation.value.status === 'pending' ? (
                    <div style="text-align: center; padding: 40px; color: #6b7280;">
                      <div style="width: 64px; height: 64px; background-color: #fef3c7; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px;">
                        <span style="font-size: 32px;">⏳</span>
                      </div>
                      <p style="font-size: 18px; font-weight: 600; margin: 0 0 8px 0; color: #111827;">
                        Waiting for Partner Acceptance
                      </p>
                      <p style="font-size: 14px; margin: 0;">
                        {selectedConversation.value.otherUser?.name || 'The police officer'} will be notified of your chat request.
                      </p>
                    </div>
                  ) : messages.value.length === 0 && selectedConversation.value.status !== 'ended' ? (
                    <div style="text-align: center; padding: 40px; color: #6b7280;">
                      <p>No messages yet. Start the conversation!</p>
                    </div>
                  ) : (
                    <>
                      {messages.value.map((message, index) => {
                        const isUserMessage = message.senderModel === 'User';
                        const showDate = index === 0 ||
                          formatDate(messages.value[index - 1]?.createdAt) !== formatDate(message.createdAt);

                        return (
                          <div key={message._id}>
                            {showDate && (
                              <div style="text-align: center; margin: 16px 0;">
                                <span style="padding: 4px 12px; background-color: #e5e7eb; border-radius: 12px; font-size: 12px; color: #6b7280;">
                                  {formatDate(message.createdAt)}
                                </span>
                              </div>
                            )}

                            <div style={`display: flex; ${isUserMessage ? 'justify-content: flex-end;' : 'justify-content: flex-start;'}`}>
                              <div style={`max-width: 70%; padding: 12px 16px; border-radius: 16px; ${isUserMessage
                                ? 'background-color: #6366f1; color: white; border-bottom-right-radius: 4px;'
                                : 'background-color: white; color: #111827; border-bottom-left-radius: 4px; box-shadow: 0 1px 2px rgba(0,0,0,0.05);'
                                }`}>
                                <p style="margin: 0; word-wrap: break-word;">{message.content}</p>
                                <div style={`display: flex; align-items: center; gap: 4px; margin-top: 4px; font-size: 11px; ${isUserMessage ? 'color: rgba(255,255,255,0.7); justify-content: flex-end;' : 'color: #9ca3af;'
                                  }`}>
                                  <span>{formatTime(message.createdAt)}</span>
                                  {isUserMessage && (
                                    <span
                                      style={message.isRead ? 'color:#22c55e;' : 'color:#e5e7eb;'}
                                      title={message.isRead ? 'Read' : 'Sent'}
                                    >
                                      {message.isRead ? '✔✔' : '✔'}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      {/* End of chat: Session Summary & Feedback (for ended conversations) */}
                      {selectedConversation.value.status === 'ended' && (
                        <div style={{
                          marginTop: 32,
                          paddingTop: 24,
                          borderTop: '2px solid #e5e7eb'
                        }}>
                          <div style={{
                            background: 'white',
                            borderRadius: 16,
                            overflow: 'hidden',
                            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.08), 0 2px 4px -2px rgba(0,0,0,0.06)',
                            border: '1px solid #e5e7eb'
                          }}>
                            <div style={{
                              padding: '20px 20px 16px',
                              background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                              color: 'white'
                            }}>
                              <p style={{ margin: 0, fontSize: 11, fontWeight: 600, opacity: 0.9, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Session Summary
                              </p>
                              <p style={{ margin: '10px 0 0', fontSize: 18, fontWeight: 600 }}>
                                {(conversationDetails.value.sessionDetails?.duration ?? 0)} min
                              </p>
                              <p style={{ margin: '4px 0 0', fontSize: 14, opacity: 0.95 }}>
                                {(conversationDetails.value.sessionDetails?.messagesCount ?? messages.value.length)} messages
                              </p>
                              {conversationDetails.value.sessionDetails?.startTime && (
                                <p style={{ margin: '8px 0 0', fontSize: 12, opacity: 0.9 }}>
                                  Started: {new Date(conversationDetails.value.sessionDetails.startTime).toLocaleString()}
                                </p>
                              )}
                              {conversationDetails.value.sessionDetails?.endTime && (
                                <p style={{ margin: '2px 0 0', fontSize: 12, opacity: 0.9 }}>
                                  Ended: {new Date(conversationDetails.value.sessionDetails.endTime).toLocaleString()}
                                </p>
                              )}
                              {conversationDetails.value.sessionDetails?.creditsUsed > 0 && (
                                <p style={{ margin: '4px 0 0', fontSize: 12, opacity: 0.9 }}>
                                  Credits used: {conversationDetails.value.sessionDetails.creditsUsed}
                                </p>
                              )}
                            </div>
                            <div style={{ padding: 20 }}>
                              {conversationDetails.value.sessionDetails?.summary && (
                                <div style={{ marginBottom: 20 }}>
                                  <p style={{ margin: '0 0 8px 0', fontSize: 12, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    Topics discussed
                                  </p>
                                  <p style={{ margin: 0, fontSize: 14, color: '#334155', lineHeight: 1.5 }}>
                                    {conversationDetails.value.sessionDetails.summary}
                                  </p>
                                </div>
                              )}
                              <p style={{ margin: '0 0 14px 0', fontSize: 12, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Feedback
                              </p>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                <div style={{
                                  padding: 14,
                                  background: '#f8fafc',
                                  borderRadius: 12,
                                  borderLeft: '4px solid #6366f1'
                                }}>
                                  <p style={{ margin: '0 0 6px 0', fontSize: 12, fontWeight: 600, color: '#4f46e5' }}>Your feedback</p>
                                  {(conversationDetails.value.rating?.byUser?.stars != null || conversationDetails.value.rating?.byUser?.feedback) ? (
                                    <>
                                      {conversationDetails.value.rating?.byUser?.stars != null && (
                                        <p style={{ margin: 0, fontSize: 15, color: '#f59e0b' }}>{"★".repeat(conversationDetails.value.rating.byUser.stars)}{"☆".repeat(5 - (conversationDetails.value.rating.byUser.stars || 0))}</p>
                                      )}
                                      {conversationDetails.value.rating?.byUser?.feedback && (
                                        <p style={{ margin: '6px 0 0', fontSize: 14, color: '#334155', lineHeight: 1.5 }}>{conversationDetails.value.rating.byUser.feedback}</p>
                                      )}
                                    </>
                                  ) : (
                                    <p style={{ margin: 0, fontSize: 13, color: '#94a3b8' }}>No feedback submitted</p>
                                  )}
                                </div>
                                <div style={{
                                  padding: 14,
                                  background: '#f0fdf4',
                                  borderRadius: 12,
                                  borderLeft: '4px solid #10b981'
                                }}>
                                  <p style={{ margin: '0 0 6px 0', fontSize: 12, fontWeight: 600, color: '#059669' }}>Partner feedback</p>
                                  {(conversationDetails.value.rating?.byPartner?.stars != null || conversationDetails.value.rating?.byPartner?.feedback) ? (
                                    <>
                                      {conversationDetails.value.rating?.byPartner?.stars != null && (
                                        <p style={{ margin: 0, fontSize: 15, color: '#f59e0b' }}>{"★".repeat(conversationDetails.value.rating.byPartner.stars)}{"☆".repeat(5 - (conversationDetails.value.rating.byPartner.stars || 0))}</p>
                                      )}
                                      {conversationDetails.value.rating?.byPartner?.feedback && (
                                        <p style={{ margin: '6px 0 0', fontSize: 14, color: '#334155', lineHeight: 1.5 }}>{conversationDetails.value.rating.byPartner.feedback}</p>
                                      )}
                                    </>
                                  ) : (
                                    <p style={{ margin: 0, fontSize: 13, color: '#94a3b8' }}>No feedback submitted yet</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Message Input / Ended actions */}
                <div style="padding: 16px 24px; background-color: white; border-top: 1px solid #e5e7eb;">
                  {selectedConversation.value.status === 'ended' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {!hasUserSubmittedFeedback.value && (
                        <button
                          onClick={openFeedbackModal}
                          style={{ padding: '12px 20px', backgroundColor: '#6366f1', color: 'white', border: 'none', borderRadius: 8, fontWeight: 500, cursor: 'pointer', fontSize: 14 }}
                        >
                          Add your feedback
                        </button>
                      )}
                      <button
                        onClick={backToPartnersList}
                        style={{ padding: '12px 20px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: 8, fontWeight: 500, cursor: 'pointer', fontSize: 14 }}
                      >
                        Start New Consultation
                      </button>
                    </div>
                  ) : selectedConversation.value.status === 'pending' ? (
                    <div style="text-align: center; padding: 12px; background-color: #fef3c7; border-radius: 8px; color: #92400e; font-size: 14px;">
                      Please wait for the partner to accept your consultation request
                    </div>
                  ) : (
                    <div style="display: flex; gap: 12px; align-items: center;">
                      <input
                        type="text"
                        value={newMessage.value}
                        onInput={(e) => {
                          newMessage.value = e.target.value;
                          startTyping();
                        }}
                        onKeypress={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            sendMessage();
                          }
                        }}
                        placeholder="Type your message..."
                        style="flex: 1; padding: 12px 16px; border: 1px solid #d1d5db; border-radius: 24px; outline: none; font-size: 14px;"
                      />
                      <button
                        onClick={sendMessage}
                        disabled={!newMessage.value.trim()}
                        style={`padding: 12px 24px; background-color: #6366f1; color: white; border: none; border-radius: 24px; font-weight: 500; cursor: pointer; transition: background-color 0.2s; ${!newMessage.value.trim() ? 'opacity: 0.5; cursor: not-allowed;' : ''
                          }`}
                        onMouseEnter={(e) => {
                          if (newMessage.value.trim()) {
                            e.currentTarget.style.backgroundColor = '#4f46e5';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (newMessage.value.trim()) {
                            e.currentTarget.style.backgroundColor = '#6366f1';
                          }
                        }}
                      >
                        Send
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            // Empty State
            <div style="flex: 1; display: flex; align-items: center; justify-content: center; color: #6b7280;">
              <div style="text-align: center;">
                <svg style="width: 64px; height: 64px; margin: 0 auto 16px; color: #d1d5db;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <p style="font-size: 18px; font-weight: 600; margin: 0 0 8px 0;">Welcome to Spiritual Consultations</p>
                <p style="font-size: 14px; margin: 0 0 16px 0;">Select a partner or start a new consultation</p>
                <button
                  onClick={() => showPartnersList.value = true}
                  style="padding: 12px 24px; background-color: #6366f1; color: white; border: none; border-radius: 6px; font-weight: 500; cursor: pointer;"
                >
                  Browse Partners
                </button>
              </div>
            </div>
          )}
        </div>

        {/* End Consultation Modal - polished card design */}
        {showEndModal.value && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(15,23,42,0.65)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              padding: 24
            }}
            onClick={closeEndModal}
          >
            <div
              style={{
                background: 'linear-gradient(180deg, #ffffff 0%, #fafbff 100%)',
                borderRadius: 20,
                maxWidth: 460,
                width: '100%',
                overflow: 'hidden',
                boxShadow: '0 32px 64px -12px rgba(99,102,241,0.15), 0 0 0 1px rgba(99,102,241,0.08), 0 20px 40px -20px rgba(0,0,0,0.12)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{
                padding: '28px 28px 24px',
                background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #6366f1 100%)',
                color: 'white',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{ position: 'absolute', top: -20, right: -20, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
                <div style={{ position: 'absolute', bottom: -30, left: -30, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
                <h3 style={{ fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: '-0.02em', position: 'relative' }}>
                  End Consultation
                </h3>
                <p style={{ color: 'rgba(255,255,255,0.9)', margin: '10px 0 0', fontSize: 14, lineHeight: 1.5, position: 'relative' }}>
                  Share your experience before closing this session.
                </p>
              </div>

              <div style={{ padding: '28px 28px 28px' }}>
                <div style={{
                  marginBottom: 24,
                  padding: '18px 20px',
                  background: 'linear-gradient(135deg, #f0f4ff 0%, #e8eeff 100%)',
                  borderRadius: 14,
                  border: '1px solid rgba(99,102,241,0.2)'
                }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: '#4f46e5', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Session Summary</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 16, color: '#1e293b', fontWeight: 600 }}>⏱ {sessionSummary.value.duration} min</span>
                    <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#94a3b8' }} />
                    <span style={{ fontSize: 16, color: '#1e293b', fontWeight: 600 }}>💬 {sessionSummary.value.messagesCount} messages</span>
                  </div>
                </div>

                <div style={{ marginBottom: 22 }}>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#1e293b', marginBottom: 12 }}>
                    Rating (1–5 stars) <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => endFeedbackStars.value = n}
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 12,
                          border: 'none',
                          background: endFeedbackStars.value >= n
                            ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                            : 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
                          color: endFeedbackStars.value >= n ? 'white' : '#94a3b8',
                          cursor: 'pointer',
                          fontSize: 20,
                          transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                          boxShadow: endFeedbackStars.value >= n ? '0 4px 12px rgba(245,158,11,0.35)' : '0 1px 3px rgba(0,0,0,0.06)'
                        }}
                        onMouseEnter={(e) => {
                          if (endFeedbackStars.value < n) {
                            e.currentTarget.style.transform = 'scale(1.05)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (endFeedbackStars.value < n) {
                            e.currentTarget.style.transform = 'scale(1)';
                            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)';
                          }
                        }}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: 22 }}>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#1e293b', marginBottom: 10 }}>
                    Feedback (optional)
                  </label>
                  <textarea
                    value={endFeedbackText.value}
                    onInput={(e) => endFeedbackText.value = e.target.value}
                    placeholder="Share your experience..."
                    rows={3}
                    style={{
                      width: '100%',
                      padding: 14,
                      border: '1px solid #e2e8f0',
                      borderRadius: 12,
                      fontSize: 14,
                      resize: 'vertical',
                      outline: 'none',
                      fontFamily: 'inherit',
                      transition: 'border-color 0.2s, box-shadow 0.2s',
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#6366f1';
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.15)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '#e2e8f0';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  />
                </div>

                <div style={{ marginBottom: 28 }}>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#1e293b', marginBottom: 10 }}>
                    Satisfaction
                  </label>
                  <select
                    value={endFeedbackSatisfaction.value}
                    onChange={(e) => endFeedbackSatisfaction.value = e.target.value}
                    style={{
                      width: '100%',
                      padding: '14px 16px',
                      border: '1px solid #e2e8f0',
                      borderRadius: 12,
                      fontSize: 14,
                      backgroundColor: 'white',
                      color: '#334155',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      appearance: 'none',
                      backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%2394a3b8\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'%3E%3C/path%3E%3C/svg%3E")',
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'right 12px center',
                      backgroundSize: 20,
                      paddingRight: 44
                    }}
                  >
                    <option value="">Select how you feel...</option>
                    <option value="very_happy">😊 Very Happy</option>
                    <option value="happy">🙂 Happy</option>
                    <option value="neutral">😐 Neutral</option>
                    <option value="unhappy">😕 Unhappy</option>
                    <option value="very_unhappy">😞 Very Unhappy</option>
                  </select>
                </div>

                <div style={{ display: 'flex', gap: 14 }}>
                  <button
                    onClick={closeEndModal}
                    style={{
                      flex: 1,
                      padding: 15,
                      backgroundColor: '#f1f5f9',
                      color: '#475569',
                      border: 'none',
                      borderRadius: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontSize: 15,
                      transition: 'background-color 0.2s, color 0.2s'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#e2e8f0'; e.currentTarget.style.color = '#334155'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#f1f5f9'; e.currentTarget.style.color = '#475569'; }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={endConversation}
                    disabled={endModalSubmitting.value || endFeedbackStars.value < 1}
                    style={{
                      flex: 1,
                      padding: 15,
                      background: (endModalSubmitting.value || endFeedbackStars.value < 1) ? '#94a3b8' : 'linear-gradient(135deg, #ef4444 0%, #dc2626 50%, #b91c1c 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: 12,
                      fontWeight: 600,
                      cursor: (endModalSubmitting.value || endFeedbackStars.value < 1) ? 'not-allowed' : 'pointer',
                      fontSize: 15,
                      boxShadow: (endModalSubmitting.value || endFeedbackStars.value < 1) ? 'none' : '0 4px 16px rgba(239,68,68,0.4)',
                      transition: 'transform 0.15s, box-shadow 0.15s'
                    }}
                    onMouseEnter={(e) => {
                      if (!endModalSubmitting.value && endFeedbackStars.value >= 1) {
                        e.currentTarget.style.transform = 'translateY(-1px)';
                        e.currentTarget.style.boxShadow = '0 6px 20px rgba(239,68,68,0.45)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = (endModalSubmitting.value || endFeedbackStars.value < 1) ? 'none' : '0 4px 16px rgba(239,68,68,0.4)';
                    }}
                  >
                    {endModalSubmitting.value ? 'Ending...' : (endFeedbackStars.value < 1 ? 'Give rating to end' : 'End Consultation')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add Feedback Modal - polished card design */}
        {showFeedbackModal.value && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(15,23,42,0.65)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              padding: 24
            }}
            onClick={() => showFeedbackModal.value = false}
          >
            <div
              style={{
                background: 'linear-gradient(180deg, #ffffff 0%, #fafbff 100%)',
                borderRadius: 20,
                maxWidth: 460,
                width: '100%',
                overflow: 'hidden',
                boxShadow: '0 32px 64px -12px rgba(99,102,241,0.15), 0 0 0 1px rgba(99,102,241,0.08), 0 20px 40px -20px rgba(0,0,0,0.12)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{
                padding: '28px 28px 24px',
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #7c3aed 100%)',
                color: 'white',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{ position: 'absolute', top: -20, right: -20, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
                <h3 style={{ fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: '-0.02em', position: 'relative' }}>Add Your Feedback</h3>
                <p style={{ color: 'rgba(255,255,255,0.9)', margin: '10px 0 0', fontSize: 14, position: 'relative' }}>Your feedback helps us improve.</p>
              </div>
              <div style={{ padding: '28px 28px 28px' }}>
                <div style={{ marginBottom: 22 }}>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#1e293b', marginBottom: 12 }}>Rating</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button key={n} type="button" onClick={() => endFeedbackStars.value = n}
                        style={{
                          width: 44, height: 44, borderRadius: 12, border: 'none',
                          background: endFeedbackStars.value >= n ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' : 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
                          color: endFeedbackStars.value >= n ? 'white' : '#94a3b8', cursor: 'pointer', fontSize: 20,
                          boxShadow: endFeedbackStars.value >= n ? '0 4px 12px rgba(245,158,11,0.35)' : '0 1px 3px rgba(0,0,0,0.06)',
                          transition: 'transform 0.15s, box-shadow 0.15s'
                        }}
                        onMouseEnter={(e) => { if (endFeedbackStars.value < n) { e.currentTarget.style.transform = 'scale(1.05)'; } }}
                        onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                      >★</button>
                    ))}
                  </div>
                </div>
                <div style={{ marginBottom: 22 }}>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#1e293b', marginBottom: 10 }}>Feedback (optional)</label>
                  <textarea value={endFeedbackText.value} onInput={(e) => endFeedbackText.value = e.target.value} placeholder="Share your experience..."
                    rows={3} style={{ width: '100%', padding: 14, border: '1px solid #e2e8f0', borderRadius: 12, fontSize: 14, resize: 'vertical', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                </div>
                <div style={{ marginBottom: 28 }}>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#1e293b', marginBottom: 10 }}>Satisfaction</label>
                  <select value={endFeedbackSatisfaction.value} onChange={(e) => endFeedbackSatisfaction.value = e.target.value}
                    style={{ width: '100%', padding: '14px 16px', border: '1px solid #e2e8f0', borderRadius: 12, fontSize: 14, backgroundColor: 'white', cursor: 'pointer', fontFamily: 'inherit' }}>
                    <option value="">Select how you feel...</option>
                    <option value="very_happy">😊 Very Happy</option>
                    <option value="happy">🙂 Happy</option>
                    <option value="neutral">😐 Neutral</option>
                    <option value="unhappy">😕 Unhappy</option>
                    <option value="very_unhappy">😞 Very Unhappy</option>
                  </select>
                </div>
                <div style={{ display: 'flex', gap: 14 }}>
                  <button onClick={() => showFeedbackModal.value = false}
                    style={{ flex: 1, padding: 15, backgroundColor: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 12, fontWeight: 600, cursor: 'pointer', fontSize: 15 }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#e2e8f0'; e.currentTarget.style.color = '#334155'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#f1f5f9'; e.currentTarget.style.color = '#475569'; }}
                  >Cancel</button>
                  <button onClick={submitFeedbackOnly} disabled={endModalSubmitting.value}
                    style={{
                      flex: 1, padding: 15,
                      background: endModalSubmitting.value ? '#94a3b8' : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #7c3aed 100%)',
                      color: 'white', border: 'none', borderRadius: 12, fontWeight: 600, cursor: endModalSubmitting.value ? 'not-allowed' : 'pointer', fontSize: 15,
                      boxShadow: endModalSubmitting.value ? 'none' : '0 4px 16px rgba(99,102,241,0.4)'
                    }}
                  >{endModalSubmitting.value ? 'Submitting...' : 'Submit Feedback'}</button>
                </div>
              </div>
            </div>
          </div>
        )}

        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }
};
