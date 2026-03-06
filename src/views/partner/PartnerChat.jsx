import { ref, onMounted, onUnmounted, computed } from 'vue';
import io from 'socket.io-client';
import api from '../../services/api.js';

export default {
  name: 'PartnerChat',
  setup() {
    // State
    const socket = ref(null);
    const isConnected = ref(false);
    const loading = ref(false);
    const activeTab = ref('conversations'); // 'conversations' or 'requests'

    // Data
    const conversations = ref([]);
    const pendingRequests = ref([]);
    const selectedConversation = ref(null);
    const messages = ref([]);
    const newMessage = ref('');
    const typingUsers = ref(new Set());
    const onlineStatuses = ref(new Map());
    const showEndModal = ref(false);
    const showFeedbackModal = ref(false);

    const endFeedbackStars = ref(0);
    const endFeedbackText = ref('');
    const endFeedbackSatisfaction = ref('');
    const endModalSubmitting = ref(false);
    const conversationDetails = ref({ sessionDetails: null, rating: null });

    // Partner info
    const partnerInfo = ref({
      id: null,
      status: 'online',
      activeConversations: 0,
      maxConversations: 5
    });

    // Typing timeout
    let typingTimeout = null;
    // Message poll interval when WebSocket is disconnected
    let messagePollInterval = null;

    // WebSocket Connection
    const connectWebSocket = () => {
      const token = localStorage.getItem('token_partner');

      if (!token) {
        console.error('❌ No partner token found');
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
          partnerInfo.value.id = data.userId;
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
        console.log('✅ Messages read by user:', data);

        if (data.messageIds === 'all') {
          messages.value.forEach(msg => {
            if (msg.senderModel === 'Partner') {
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
            typingUsers.value.add(data.userId);
          } else {
            typingUsers.value.delete(data.userId);
          }
        }
      });

      // Conversation events
      socket.value.on('conversation:user:joined', (data) => {
        console.log('👤 User joined conversation:', data);
      });

      socket.value.on('conversation:user:left', (data) => {
        console.log('👋 User left conversation:', data);
      });

      // New conversation request notification
      socket.value.on('notification:new:request', async (data) => {
        console.log('🔔 New conversation request:', data);
        await loadPendingRequests();

        // Show notification
        if (Notification.permission === 'granted') {
          new Notification('New Consultation Request', {
            body: `${data.userName || 'A user'} has requested a consultation`,
            icon: '/logo.png'
          });
        }
      });
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

    // Load pending requests
    const loadPendingRequests = async () => {
      try {
        console.log('🔍 Loading partner requests...');
        const response = await api.getPartnerRequests();

        console.log('📦 Full response:', response.data);

        // API returns { success, data: { requests, totalRequests } }
        if (response && response.success && response.data) {
          pendingRequests.value = response.data.requests || [];
          console.log('✅ Loaded pending requests:', pendingRequests.value.length);
        } else {
          pendingRequests.value = [];
          console.warn('⚠️ No requests data found in response');
        }
      } catch (error) {
        console.error('❌ Error loading requests:', error);
        pendingRequests.value = [];
      }
    };

    // Accept conversation request
    const acceptRequest = async (conversationId) => {
      try {
        const response = await api.acceptConversationRequest(conversationId);

        if (response && response.success) {
          console.log('✅ Request accepted');

          // Remove from pending requests
          pendingRequests.value = pendingRequests.value.filter(
            r => r.conversationId !== conversationId
          );

          // Add to conversations
          const conversation = response.data;
          conversation.otherUser = conversation.userId;
          conversation.unreadCount = 0;
          conversations.value.unshift(conversation);

          // Switch to conversations tab
          activeTab.value = 'conversations';

          // Open the conversation
          selectConversation(conversation);
        }
      } catch (error) {
        console.error('❌ Error accepting request:', error);
        alert(error.responseData?.message || error.message || 'Failed to accept request');
      }
    };

    // Reject conversation request
    const rejectRequest = async (conversationId) => {
      if (!confirm('Are you sure you want to reject this request?')) return;

      try {
        const response = await api.rejectConversationRequest(conversationId);

        if (response && response.success) {
          console.log('✅ Request rejected');
          pendingRequests.value = pendingRequests.value.filter(
            r => r.conversationId !== conversationId
          );
        }
      } catch (error) {
        console.error('❌ Error rejecting request:', error);
      }
    };

    // Select conversation
    const selectConversation = async (conversation) => {
      console.log('💬 Selecting conversation:', conversation);
      selectedConversation.value = conversation;
      messages.value = [];

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
        alert('Please accept the conversation request first');
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
            senderModel: 'Partner'
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

    const openEndModal = () => {
      if (!selectedConversation.value || selectedConversation.value.status === 'ended') return;
      endFeedbackStars.value = 0;
      endFeedbackText.value = '';
      endFeedbackSatisfaction.value = '';
      showEndModal.value = true;
    };

    const closeEndModal = () => {
      showEndModal.value = false;
    };



    const sessionSummary = computed(() => {
      const conv = selectedConversation.value;
      if (!conv) return { duration: 0, messagesCount: 0 };
      const start = conv.startedAt || conv.createdAt ? new Date(conv.startedAt || conv.createdAt) : new Date();
      const duration = Math.round((Date.now() - start.getTime()) / (1000 * 60));
      return { duration: Math.max(0, duration), messagesCount: messages.value.length };
    });

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
          sessionDetails: endRes?.data?.sessionDetails,
          rating: endRes?.data?.rating
        };
        conversationDetails.value = { sessionDetails: endRes?.data?.sessionDetails, rating: endRes?.data?.rating };

        closeEndModal();
        await loadConversations();
        await loadMessages(selectedConversation.value.conversationId);
      } catch (error) {
        console.error('❌ Error ending conversation:', error);
        alert(error.responseData?.message || error.message || 'Failed to end session');
      } finally {
        endModalSubmitting.value = false;
      }
    };

    const hasPartnerSubmittedFeedback = computed(() => {
      const r = conversationDetails.value.rating || selectedConversation.value?.rating;
      return !!(r?.byPartner?.stars != null || r?.byPartner?.feedback || r?.byPartner?.ratedAt);
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
        await loadConversations();
        await loadMessages(selectedConversation.value.conversationId);
        showFeedbackModal.value = false;
      } catch (e) {
        alert(e?.responseData?.message || e?.message || 'Failed to submit feedback');
      } finally {
        endModalSubmitting.value = false;
      }
    };

    // Update partner status
    const updateStatus = async (status) => {
      try {
        await api.updatePartnerStatus(status);
        partnerInfo.value.status = status;
        console.log('✅ Status updated to:', status);
      } catch (error) {
        console.error('❌ Error updating status:', error);
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

    // Format full date for birth details
    const formatFullDate = (dateString) => {
      if (!dateString) return 'Not provided';
      try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      } catch (e) {
        return dateString;
      }
    };

    // Computed
    const isTyping = computed(() => typingUsers.value.size > 0);
    const unreadCount = computed(() => {
      return conversations.value.reduce((sum, conv) => sum + (conv.unreadCount || 0), 0);
    });

    // Request notification permission
    const requestNotificationPermission = () => {
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
      }
    };

    // Lifecycle
    onMounted(async () => {
      console.log('🚀 PartnerChat component mounted');

      // Request notification permission
      requestNotificationPermission();

      // Connect WebSocket first
      connectWebSocket();

      // Load data
      await loadConversations();
      await loadPendingRequests();
    });

    onUnmounted(() => {
      console.log('👋 PartnerChat component unmounting');
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
      <div style="display: flex; height: 100%; gap: 20px;">
        {/* Sidebar */}
        <div style="width: 300px; border-right: 1px solid #ddd; padding-right: 20px; display: flex; flex-direction: column;">
          {/* Header */}
          <div style="margin-bottom: 20px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
              <h2 style="font-size: 20px; font-weight: 600; color: #111827; margin: 0;">
                Chat Sessions
              </h2>
              <div style={`width: 12px; height: 12px; border-radius: 50%; ${isConnected.value ? 'background-color: #10b981;' : 'background-color: #ef4444;'
                }`} title={isConnected.value ? 'Connected' : 'Disconnected'} />
            </div>

            {/* Status selector */}
            <div style="display: flex; gap: 8px;">
              <select
                value={partnerInfo.value.status}
                onChange={(e) => updateStatus(e.target.value)}
                style="flex: 1; padding: 12px; border: 1px solid #ddd; border-radius: 8px; background-color: white; cursor: pointer; font-size: 14px;"
              >
                <option value="online">🟢 Online</option>
                <option value="busy">🟡 Busy</option>
                <option value="offline">⚫ Offline</option>
              </select>
            </div>
          </div>

          <div style="display: flex; margin-bottom: 16px; border-bottom: 1px solid #eee; padding-bottom: 10px;">
            <button
              onClick={() => activeTab.value = 'conversations'}
              style={`flex: 1; padding: 10px; border: none; font-size: 14px; cursor: pointer; transition: background-color 0.2s; border-radius: 8px 0 0 8px; border: 1px solid #eee; border-right: none; ${activeTab.value === 'conversations' ? 'background-color: #3498db; color: white; border-color: #3498db;' : 'background-color: white; color: #7f8c8d;'}`}
            >
              Chats
              {unreadCount.value > 0 && ` (${unreadCount.value})`}
            </button>
            <button
              onClick={() => activeTab.value = 'requests'}
              style={`flex: 1; padding: 10px; border: none; font-size: 14px; cursor: pointer; transition: background-color 0.2s; border-radius: 0 8px 8px 0; border: 1px solid #eee; ${activeTab.value === 'requests' ? 'background-color: #3498db; color: white; border-color: #3498db;' : 'background-color: white; color: #7f8c8d;'}`}
            >
              Requests
              {pendingRequests.value.length > 0 && ` (${pendingRequests.value.length})`}
            </button>
          </div>

          <div style="flex: 1; overflow-y: auto;">
            {activeTab.value === 'conversations' ? (
              loading.value && conversations.value.length === 0 ? (
                <div style="padding: 20px; text-align: center; color: #7f8c8d;">Loading chats...</div>
              ) : conversations.value.length === 0 ? (
                <p style="color: #7f8c8d; font-size: 14px; text-align: center; margin-top: 20px;">No active chats</p>
              ) : (
                conversations.value.map(conv => (
                  <div
                    key={conv.conversationId}
                    onClick={() => selectConversation(conv)}
                    style={{
                      padding: '12px',
                      marginBottom: '8px',
                      backgroundColor: selectedConversation.value?.conversationId === conv.conversationId ? '#e8f4f8' : 'white',
                      border: selectedConversation.value?.conversationId === conv.conversationId ? '2px solid #3498db' : '1px solid #ddd',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ fontWeight: 'bold', marginBottom: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                        <div style={{ flexShrink: 0, width: 24, height: 24, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 600, fontSize: 10, overflow: 'hidden' }}>
                          {conv.otherUser?.profileImage ? (
                            <img src={conv.otherUser.profileImage} alt="User" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            conv.otherUser?.profile?.name?.charAt(0)?.toUpperCase() || conv.otherUser?.email?.charAt(0)?.toUpperCase() || 'U'
                          )}
                        </div>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {conv.otherUser?.profile?.name || conv.otherUser?.email || 'User'}
                        </span>
                      </div>
                      {conv.unreadCount > 0 && (
                        <span style="background-color: #ef4444; color: white; border-radius: 50%; font-size: 10px; padding: 2px 6px;">{conv.unreadCount}</span>
                      )}
                    </div>
                    {conv.lastMessage && (
                      <div style="font-size: 12px; color: #7f8c8d; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                        {typeof conv.lastMessage === 'string' ? conv.lastMessage : (conv.lastMessage?.content || '')}
                      </div>
                    )}
                    <div style="font-size: 10px; color: #95a5a6; margin-top: 4px;">
                      {formatTime(conv.lastMessageAt || conv.updatedAt)}
                    </div>
                  </div>
                ))
              )
            ) : (
              pendingRequests.value.length === 0 ? (
                <p style="color: #7f8c8d; font-size: 14px; text-align: center; margin-top: 20px;">No pending requests</p>
              ) : (
                pendingRequests.value.map(request => (
                  <div key={request.conversationId} style="padding: 12px; margin-bottom: 8px; border: 1px solid #ddd; border-radius: 8px; background-color: white;">
                    <div style="font-weight: bold; margin-bottom: 4px;">
                      {request.userId?.profile?.name || request.userId?.email || 'User'}
                    </div>
                    <div style="font-size: 10px; color: #95a5a6; margin-bottom: 8px;">
                      Requested {formatDate(request.createdAt)}
                    </div>
                    {request.aadhaarNumber && (
                      <div style="font-size: 11px; color: #374151; margin-bottom: 8px; background: #f3f4f6; padding: 4px; border-radius: 4px; font-family: monospace;">
                        <strong>Aadhaar:</strong> {request.aadhaarNumber.slice(0, 4)} {request.aadhaarNumber.slice(4, 8)} {request.aadhaarNumber.slice(8, 12)}
                      </div>
                    )}
                    <div style="display: flex; gap: 8px;">
                      <button
                        onClick={() => acceptRequest(request.conversationId)}
                        style="flex: 1; padding: 6px; background-color: #3498db; color: white; border: none; border-radius: 4px; font-size: 12px; cursor: pointer;"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => rejectRequest(request.conversationId)}
                        style="flex: 1; padding: 6px; background-color: transparent; color: #e74c3c; border: 1px solid #e74c3c; border-radius: 4px; font-size: 12px; cursor: pointer;"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))
              )
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>

          {selectedConversation.value ? (
            <>
              {/* Chat Header - Full user details */}
              <div style={{ padding: '16px 24px', background: 'white', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 0 }}>
                  <div style={{ flexShrink: 0, width: 48, height: 48, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 600, fontSize: 18, overflow: 'hidden' }}>
                    {selectedConversation.value.otherUser?.profileImage ? (
                      <img src={selectedConversation.value.otherUser.profileImage} alt="User" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      selectedConversation.value.otherUser?.profile?.name?.charAt(0)?.toUpperCase() || selectedConversation.value.otherUser?.email?.charAt(0)?.toUpperCase() || 'U'
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 700, color: '#111827', margin: 0, fontSize: 16 }}>
                      {selectedConversation.value.otherUser?.profile?.name || selectedConversation.value.otherUser?.email || 'User'}
                    </p>
                    <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>
                      {selectedConversation.value.otherUser?.email}
                    </p>
                    {selectedConversation.value.aadhaarNumber && (
                      <p style={{ fontSize: 12, color: '#374151', margin: '4px 0 0', fontFamily: 'monospace', background: '#f3f4f6', padding: '2px 6px', borderRadius: 4, display: 'inline-block' }}>
                        Aadhaar: {selectedConversation.value.aadhaarNumber}
                      </p>
                    )}

                    {isTyping.value && (
                      <p style={{ fontSize: 12, color: '#10b981', margin: '4px 0 0', fontWeight: 500 }}>typing...</p>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>

                  {selectedConversation.value.status !== 'ended' && (
                    <button
                      onClick={openEndModal}
                      style={{ padding: '8px 16px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: 6, fontWeight: 500, cursor: 'pointer', transition: 'background-color 0.2s' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#dc2626'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ef4444'}
                    >
                      End Session
                    </button>
                  )}
                </div>
              </div>

              {/* Messages */}
              <div
                id="messages-container"
                style={{ flex: 1, overflowY: 'auto', padding: '20px', backgroundColor: '#f5f5f5' }}
              >
                {loading.value ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#7f8c8d' }}>
                    Loading...
                  </div>
                ) : messages.value.length === 0 && selectedConversation.value.status !== 'ended' ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#7f8c8d' }}>
                    <p>No messages yet. Start the conversation!</p>
                  </div>
                ) : (
                  <>
                    {messages.value.map((message, index) => {
                      const isPartnerMessage = message.senderModel === 'Partner';
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

                          <div style={{ display: 'flex', marginBottom: '15px', justifyContent: isPartnerMessage ? 'flex-end' : 'flex-start' }}>
                            <div style={{ maxWidth: '70%', padding: '12px 16px', borderRadius: '12px', backgroundColor: isPartnerMessage ? '#3498db' : '#ecf0f1', color: isPartnerMessage ? 'white' : '#2c3e50' }}>
                              <p style={{ margin: 0, wordWrap: 'break-word' }}>{message.content}</p>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px', fontSize: '11px', color: isPartnerMessage ? 'rgba(255,255,255,0.7)' : '#95a5a6', justifyContent: isPartnerMessage ? 'flex-end' : 'flex-start' }}>
                                <span>{formatTime(message.createdAt)}</span>
                                {isPartnerMessage && (
                                  <span style={{ color: message.isRead ? '#fff' : 'rgba(255,255,255,0.7)' }} title={message.isRead ? 'Read' : 'Sent'}>
                                    {message.isRead ? '✔✔' : '✔'}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {/* End of chat: Session Summary & Feedback */}
                    {selectedConversation.value.status === 'ended' && (
                      <div style={{ marginTop: 32, paddingTop: 24, borderTop: '2px solid #e5e7eb' }}>
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
                            <p style={{ margin: 0, fontSize: 11, fontWeight: 600, opacity: 0.9, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Session Summary</p>
                            <p style={{ margin: '10px 0 0', fontSize: 18, fontWeight: 600 }}>{(conversationDetails.value.sessionDetails?.duration ?? 0)} min</p>
                            <p style={{ margin: '4px 0 0', fontSize: 14, opacity: 0.95 }}>{(conversationDetails.value.sessionDetails?.messagesCount ?? messages.value.length)} messages</p>
                            {conversationDetails.value.sessionDetails?.partnerCreditsEarned > 0 && (
                              <p style={{ margin: '4px 0 0', fontSize: 12, opacity: 0.95 }}>
                                Credits earned: {conversationDetails.value.sessionDetails.partnerCreditsEarned}
                              </p>
                            )}
                          </div>
                          <div style={{ padding: 20 }}>
                            {conversationDetails.value.sessionDetails?.summary && (
                              <div style={{ marginBottom: 20 }}>
                                <p style={{ margin: '0 0 8px 0', fontSize: 12, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Topics discussed</p>
                                <p style={{ margin: 0, fontSize: 14, color: '#334155', lineHeight: 1.5 }}>{conversationDetails.value.sessionDetails.summary}</p>
                              </div>
                            )}
                            <p style={{ margin: '0 0 14px 0', fontSize: 12, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Feedback</p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                              <div style={{ padding: 14, background: '#f8fafc', borderRadius: 12, borderLeft: '4px solid #6366f1' }}>
                                <p style={{ margin: '0 0 6px 0', fontSize: 12, fontWeight: 600, color: '#4f46e5' }}>Your feedback</p>
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
                                  <p style={{ margin: 0, fontSize: 13, color: '#94a3b8' }}>No feedback submitted</p>
                                )}
                              </div>
                              <div style={{ padding: 14, background: '#f0fdf4', borderRadius: 12, borderLeft: '4px solid #10b981' }}>
                                <p style={{ margin: '0 0 6px 0', fontSize: 12, fontWeight: 600, color: '#059669' }}>User feedback</p>
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
              <div style={{ padding: '20px', borderTop: '1px solid #ddd', display: 'flex', gap: '10px', background: 'white' }}>
                {selectedConversation.value.status === 'ended' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {!hasPartnerSubmittedFeedback.value && (
                      <button onClick={openFeedbackModal}
                        style={{ padding: '12px 20px', backgroundColor: '#3498db', color: 'white', border: 'none', borderRadius: 8, fontWeight: 500, cursor: 'pointer', fontSize: 14 }}>
                        Add your feedback
                      </button>
                    )}
                    <p style={{ margin: 0, fontSize: 14, color: '#7f8c8d' }}>This consultation has ended.</p>
                  </div>
                ) : selectedConversation.value.status === 'pending' ? (
                  <div style={{ textAlign: 'center', padding: '12px', flex: 1, backgroundColor: '#fef3c7', borderRadius: '8px', color: '#92400e', fontSize: '14px' }}>
                    Please accept the conversation request to enable messaging
                  </div>
                ) : (
                  <>
                    <input
                      type="text"
                      value={newMessage.value}
                      onInput={(e) => {
                        newMessage.value = e.target.value;
                        startTyping();
                      }}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          sendMessage();
                        }
                      }}
                      placeholder="Type your message..."
                      style={{ flex: 1, padding: '12px', border: '1px solid #ddd', borderRadius: '8px', outline: 'none', fontSize: '16px' }}
                    />
                    <button
                      onClick={sendMessage}
                      disabled={!newMessage.value.trim()}
                      style={{ padding: '12px 24px', backgroundColor: '#3498db', color: 'white', border: 'none', borderRadius: '8px', cursor: !newMessage.value.trim() ? 'not-allowed' : 'pointer', opacity: !newMessage.value.trim() ? 0.6 : 1 }}
                    >
                      Send
                    </button>
                  </>
                )}
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: '#7f8c8d', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <svg style={{ width: '64px', height: '64px', margin: '0 auto 16px', color: '#d1d5db' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p>Select a chat or accept a request to start chatting.</p>
            </div>
          )}
        </div>

        {/* End Session Modal - polished card design */}
        {
          showEndModal.value && (
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
                  <h3 style={{ fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: '-0.02em', position: 'relative' }}>End Consultation</h3>
                  <p style={{ color: 'rgba(255,255,255,0.9)', margin: '10px 0 0', fontSize: 14, lineHeight: 1.5, position: 'relative' }}>Share your experience before closing this session.</p>
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
                    <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#1e293b', marginBottom: 12 }}>Rating (1–5 stars) <span style={{ color: '#ef4444' }}>*</span></label>
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
                      style={{ width: '100%', padding: '14px 16px', border: '1px solid #e2e8f0', borderRadius: 12, fontSize: 14, backgroundColor: 'white', color: '#334155', cursor: 'pointer', fontFamily: 'inherit' }}>
                      <option value="">Select how you feel...</option>
                      <option value="very_happy">😊 Very Happy</option>
                      <option value="happy">🙂 Happy</option>
                      <option value="neutral">😐 Neutral</option>
                      <option value="unhappy">😕 Unhappy</option>
                      <option value="very_unhappy">😞 Very Unhappy</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', gap: 14 }}>
                    <button onClick={closeEndModal}
                      style={{ flex: 1, padding: 15, backgroundColor: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 12, fontWeight: 600, cursor: 'pointer', fontSize: 15 }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#e2e8f0'; e.currentTarget.style.color = '#334155'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#f1f5f9'; e.currentTarget.style.color = '#475569'; }}
                    >Cancel</button>
                    <button onClick={endConversation} disabled={endModalSubmitting.value || endFeedbackStars.value < 1}
                      style={{
                        flex: 1, padding: 15,
                        background: (endModalSubmitting.value || endFeedbackStars.value < 1) ? '#94a3b8' : 'linear-gradient(135deg, #ef4444 0%, #dc2626 50%, #b91c1c 100%)',
                        color: 'white', border: 'none', borderRadius: 12, fontWeight: 600, cursor: (endModalSubmitting.value || endFeedbackStars.value < 1) ? 'not-allowed' : 'pointer', fontSize: 15,
                        boxShadow: (endModalSubmitting.value || endFeedbackStars.value < 1) ? 'none' : '0 4px 16px rgba(239,68,68,0.4)'
                      }}
                    >{endModalSubmitting.value ? 'Ending...' : (endFeedbackStars.value < 1 ? 'Give rating to end' : 'End Consultation')}</button>
                  </div>
                </div>
              </div>
            </div>
          )
        }
        {/* Add Feedback Modal - polished card design */}
        {
          showFeedbackModal.value && (
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
          )
        }

        {/* User Complete Details Modal - Astrology, Numerology, Doshas, Remedies, Panchang */}

        <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
      </div >
    );
  }
};
