import { ref, onMounted, onUnmounted, computed } from 'vue';
import { io } from 'socket.io-client';
import api from '../../services/api.js';

export default {
  name: 'UserChat',
  setup() {
    // State
    const socket = ref(null);
    const isConnected = ref(false);
    const loading = ref(false);
    const activeView = ref('partners'); // 'partners' or 'chat'

    // Data
    const partners = ref([]);
    const conversations = ref([]);
    const selectedPartner = ref(null);
    const selectedConversation = ref(null);
    const messages = ref([]);
    const newMessage = ref('');
    const typingUsers = ref(new Set());



    // Typing timeout
    let typingTimeout = null;

    // WebSocket Connection
    const connectWebSocket = () => {
      const token = localStorage.getItem('token_user');

      if (!token) {
        console.error('No user token found');
        return;
      }


      console.log('🔌 Connecting to WebSocket...');

      socket.value = io(import.meta.env.VITE_WS_URL || 'https://stage.brahmakosh.com', {
        path: '/socket.io/',
        auth: { token },
        transports: ['polling', 'websocket'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
      });

      // Connection events
      socket.value.on('connect', () => {
        console.log('✅ WebSocket connected');
        isConnected.value = true;
      });

      socket.value.on('connected', (data) => {
        console.log('✅ Server acknowledged connection:', data);
      });

      socket.value.on('disconnect', () => {
        console.log('❌ WebSocket disconnected');
        isConnected.value = false;
      });

      socket.value.on('connect_error', (error) => {
        console.error('❌ WebSocket connection error:', error);
      });

      // Message events
      socket.value.on('message:new', (data) => {
        console.log('📨 New message received:', data);

        if (selectedConversation.value?.conversationId === data.conversationId) {
          messages.value.push(data.message);
          scrollToBottom();

          // Mark as read immediately
          markMessagesAsRead(data.conversationId);
        } else {
          // Update unread count
          const conv = conversations.value.find(c => c.conversationId === data.conversationId);
          if (conv) {
            conv.unreadCount = (conv.unreadCount || 0) + 1;
            conv.lastMessage = data.message;
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
        if (data.messageIds === 'all') {
          messages.value.forEach(msg => {
            msg.isRead = true;
            msg.readAt = data.readAt;
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

      // Partner status changes
      socket.value.on('partner:status:changed', (data) => {
        const partner = partners.value.find(p => p._id === data.partnerId);
        if (partner) {
          partner.onlineStatus = data.status;
        }
      });
    };

    // Load partners
    const loadPartners = async () => {
      loading.value = true;
      try {
        const response = await api.getAvailablePartners();
        if (response.data.success) {
          partners.value = response.data.data;
        }
      } catch (error) {
        console.error('Error loading partners:', error);
      } finally {
        loading.value = false;
      }
    };

    // Load conversations
    const loadConversations = async () => {
      try {
        const response = await api.getConversations();
        if (response.data.success) {
          const list = response.data.data || [];
          // Sort so the latest activity appears first
          conversations.value = list.sort((a, b) => {
            const getTime = (c) =>
              new Date(c.lastMessageAt || c.updatedAt || c.createdAt || 0).getTime();
            return getTime(b) - getTime(a);
          });
        }
      } catch (error) {
        console.error('Error loading conversations:', error);
      }
    };

    // Select partner and start conversation
    const selectPartner = (partner) => {
      selectedPartner.value = partner;

      // Check if conversation already exists
      const existingConv = conversations.value.find(
        c => c.partnerId._id === partner._id
      );

      if (existingConv) {
        // Conversation exists, open it
        selectConversation(existingConv);
      } else {
        // Create new conversation request directly
        createConversationRequest();
      }
    };

    // Create conversation request
    const createConversationRequest = async () => {
      if (!selectedPartner.value) return;

      try {
        const response = await api.createConversation({
          partnerId: selectedPartner.value._id
        });

        if (response.data.success) {
          const conversation = response.data.data;

          // Add to conversations list
          conversations.value.unshift(conversation);



          // Show waiting message
          alert('Conversation request sent! Waiting for partner to accept.');

          // Switch to conversations view
          activeView.value = 'chat';
          selectConversation(conversation);
        }
      } catch (error) {
        console.error('Error creating conversation:', error);
        alert(error.response?.data?.message || 'Failed to create conversation request');
      }
    };

    // Select conversation
    const selectConversation = async (conversation) => {
      selectedConversation.value = conversation;
      messages.value = [];
      activeView.value = 'chat';

      // Join conversation via WebSocket
      socket.value.emit('conversation:join',
        { conversationId: conversation.conversationId },
        async (response) => {
          if (response.success) {
            console.log('✅ Joined conversation');
            await loadMessages(conversation.conversationId);
          }
        }
      );
    };

    // Load messages
    const loadMessages = async (conversationId) => {
      loading.value = true;
      try {
        const response = await api.getConversationMessages(conversationId);
        if (response.data.success) {
          messages.value = response.data.data.messages;
          scrollToBottom();

          // Mark as read
          markMessagesAsRead(conversationId);
        }
      } catch (error) {
        console.error('Error loading messages:', error);
      } finally {
        loading.value = false;
      }
    };

    // Send message
    const sendMessage = () => {
      if (!newMessage.value.trim() || !selectedConversation.value) return;

      // Check if conversation is accepted
      if (selectedConversation.value.status === 'pending') {
        alert('Waiting for partner to accept the conversation request');
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

      socket.value.emit('message:send', messageData, (response) => {
        if (response.success) {
          console.log('✅ Message sent');
          updateConversationPreview();
          newMessage.value = '';
          stopTyping();
        } else {
          console.error('❌ Failed to send message:', response.message);
          alert(response.message);
        }
      });
    };

    // Typing indicators
    const startTyping = () => {
      if (!selectedConversation.value) return;

      socket.value.emit('typing:start', {
        conversationId: selectedConversation.value.conversationId
      });

      if (typingTimeout) clearTimeout(typingTimeout);
      typingTimeout = setTimeout(stopTyping, 3000);
    };

    const stopTyping = () => {
      if (!selectedConversation.value) return;

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
      socket.value.emit('message:read', { conversationId });
    };

    // Back to partners list
    const backToPartners = () => {
      activeView.value = 'partners';
      selectedConversation.value = null;
      messages.value = [];

      if (selectedConversation.value) {
        socket.value.emit('conversation:leave', {
          conversationId: selectedConversation.value.conversationId
        });
      }
    };

    // Scroll to bottom
    const scrollToBottom = () => {
      setTimeout(() => {
        const container = document.getElementById('user-messages-container');
        if (container) {
          container.scrollTop = container.scrollHeight;
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

    // Get status color
    const getStatusColor = (status) => {
      switch (status) {
        case 'online': return '#10b981';
        case 'busy': return '#f59e0b';
        case 'offline': return '#6b7280';
        default: return '#6b7280';
      }
    };

    // Get status text
    const getStatusText = (status) => {
      switch (status) {
        case 'online': return 'Online';
        case 'busy': return 'Busy';
        case 'offline': return 'Offline';
        default: return 'Unknown';
      }
    };

    // Computed
    const isTyping = computed(() => typingUsers.value.size > 0);
    const totalUnread = computed(() => {
      return conversations.value.reduce((sum, conv) => sum + (conv.unreadCount || 0), 0);
    });

    // Lifecycle
    onMounted(async () => {
      connectWebSocket();
      await loadPartners();
      await loadConversations();
    });

    onUnmounted(() => {
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
      <div style="height: calc(100vh - 64px); background-color: #f9fafb;">
        {/* Astrology Form Modal */}


        {/* Main Content */}
        {activeView.value === 'partners' ? (
          <div style="padding: 24px;">
            <div style="max-width: 1200px; margin: 0 auto;">
              {/* Header */}
              <div style="margin-bottom: 24px;">
                <h1 style="font-size: 28px; font-weight: 700; color: #111827; margin: 0 0 8px 0;">
                  Connect with Astrologers
                </h1>
                <p style="color: #6b7280;">
                  Choose an available astrologer to start your consultation
                </p>

                {conversations.value.length > 0 && (
                  <button
                    onClick={() => activeView.value = 'chat'}
                    style="margin-top: 16px; padding: 10px 20px; background-color: #6366f1; color: white; border: none; border-radius: 8px; font-weight: 500; cursor: pointer; display: inline-flex; align-items: center; gap: 8px;"
                  >
                    <span>My Conversations</span>
                    {totalUnread.value > 0 && (
                      <span style="padding: 2px 8px; background-color: #ef4444; border-radius: 10px; font-size: 12px;">
                        {totalUnread.value}
                      </span>
                    )}
                  </button>
                )}
              </div>

              {/* Partners Grid */}
              {loading.value ? (
                <div style="text-align: center; padding: 60px;">
                  <div style="width: 50px; height: 50px; border: 4px solid #e5e7eb; border-top-color: #6366f1; border-radius: 50%; margin: 0 auto; animation: spin 1s linear infinite;" />
                </div>
              ) : partners.value.length === 0 ? (
                <div style="text-align: center; padding: 60px; background-color: white; border-radius: 12px;">
                  <p style="color: #6b7280;">No astrologers available at the moment</p>
                </div>
              ) : (
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 24px;">
                  {partners.value.map(partner => (
                    <div
                      key={partner._id}
                      style="background-color: white; border-radius: 12px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border: 1px solid #e5e7eb; transition: transform 0.2s, box-shadow 0.2s; cursor: pointer;"
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-4px)';
                        e.currentTarget.style.boxShadow = '0 10px 25px rgba(0,0,0,0.15)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
                      }}
                      onClick={() => selectPartner(partner)}
                    >
                      <div style="display: flex; align-items: start; gap: 16px; margin-bottom: 16px;">
                        <div style="position: relative;">
                          <div style="width: 64px; height: 64px; background: linear-gradient(135deg, #6366f1, #8b5cf6); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; font-size: 24px;">
                            {partner.name?.charAt(0) || 'P'}
                          </div>
                          <div
                            style={`position: absolute; bottom: 2px; right: 2px; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; background-color: ${getStatusColor(partner.onlineStatus)};`}
                          />
                        </div>
                        <div style="flex: 1;">
                          <h3 style="font-size: 18px; font-weight: 600; color: #111827; margin: 0 0 4px 0;">
                            {partner.name}
                          </h3>
                          <p style="font-size: 13px; color: #6b7280; margin: 0;">
                            {partner.specialization || 'Vedic Astrologer'}
                          </p>
                          <div style="display: flex; align-items: center; gap: 8px; margin-top: 6px;">
                            <span style={`font-size: 12px; font-weight: 500; color: ${getStatusColor(partner.onlineStatus)};`}>
                              {getStatusText(partner.onlineStatus)}
                            </span>
                            {partner.canAcceptConversation === false && (
                              <span style="font-size: 11px; padding: 2px 8px; background-color: #fef3c7; color: #92400e; border-radius: 10px;">
                                Busy
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div style="display: flex; align-items: center; gap: 16px; padding-top: 16px; border-top: 1px solid #f3f4f6;">
                        <div style="text-align: center; flex: 1;">
                          <p style="font-size: 20px; font-weight: 600; color: #111827; margin: 0;">
                            {partner.rating || '4.8'}
                          </p>
                          <p style="font-size: 12px; color: #6b7280; margin: 0;">Rating</p>
                        </div>
                        <div style="text-align: center; flex: 1;">
                          <p style="font-size: 20px; font-weight: 600; color: #111827; margin: 0;">
                            {partner.totalSessions || 0}
                          </p>
                          <p style="font-size: 12px; color: #6b7280; margin: 0;">Sessions</p>
                        </div>
                        <div style="text-align: center; flex: 1;">
                          <p style="font-size: 20px; font-weight: 600; color: #111827; margin: 0;">
                            {partner.experience || 5}+
                          </p>
                          <p style="font-size: 12px; color: #6b7280; margin: 0;">Years</p>
                        </div>
                      </div>

                      <button
                        style={`width: 100%; margin-top: 16px; padding: 12px; background-color: #6366f1; color: white; border: none; border-radius: 8px; font-weight: 500; cursor: pointer; ${partner.canAcceptConversation === false ? 'opacity: 0.5;' : ''
                          }`}
                        disabled={partner.canAcceptConversation === false}
                      >
                        {partner.canAcceptConversation === false ? 'Currently Busy' : 'Start Consultation'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div style="display: flex; height: 100%;">
            {/* Conversations Sidebar */}
            <div style="width: 320px; background-color: white; border-right: 1px solid #e5e7eb; display: flex; flex-direction: column;">
              <div style="padding: 16px; border-bottom: 1px solid #e5e7eb;">
                <button
                  onClick={backToPartners}
                  style="width: 100%; padding: 10px; background-color: #f3f4f6; color: #374151; border: none; border-radius: 6px; font-weight: 500; cursor: pointer; display: flex; align-items: center; gap: 8px; justify-content: center;"
                >
                  <svg style="width: 16px; height: 16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  <span>Browse Astrologers</span>
                </button>
              </div>

              <div style="flex: 1; overflow-y: auto;">
                {conversations.value.length === 0 ? (
                  <div style="padding: 40px 20px; text-align: center; color: #6b7280;">
                    <p>No conversations yet</p>
                  </div>
                ) : (
                  conversations.value.map(conv => (
                    <div
                      key={conv.conversationId}
                      onClick={() => selectConversation(conv)}
                      style={`padding: 16px; border-bottom: 1px solid #f3f4f6; cursor: pointer; ${selectedConversation.value?.conversationId === conv.conversationId
                          ? 'background-color: #eef2ff;'
                          : ''
                        }`}
                    >
                      <div style="display: flex; align-items: center; gap: 12px;">
                        <div style="position: relative;">
                          <div style="width: 48px; height: 48px; background: linear-gradient(135deg, #6366f1, #8b5cf6); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: 600;">
                            {conv.partnerId?.name?.charAt(0) || 'P'}
                          </div>
                          {conv.status === 'pending' && (
                            <div style="position: absolute; top: -4px; right: -4px; width: 16px; height: 16px; background-color: #f59e0b; border-radius: 50%; border: 2px solid white;" />
                          )}
                          {conv.unreadCount > 0 && (
                            <div style="position: absolute; top: -2px; right: -2px; min-width: 20px; height: 20px; background-color: #ef4444; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: white; font-size: 11px; font-weight: 600; padding: 0 6px;">
                              {conv.unreadCount}
                            </div>
                          )}
                        </div>
                        <div style="flex: 1; min-width: 0;">
                          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                            <p style="font-weight: 600; color: #111827; margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                              {conv.partnerId?.name}
                            </p>
                            {conv.lastMessageAt && (
                              <span style="font-size: 12px; color: #6b7280;">
                                {formatTime(conv.lastMessageAt)}
                              </span>
                            )}
                          </div>
                          <p style="font-size: 14px; color: #6b7280; margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                            {conv.status === 'pending'
                              ? '⏳ Waiting for acceptance...'
                              : conv.lastMessage?.content || 'Start chatting'
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Chat Area */}
            <div style="flex: 1; display: flex; flex-direction: column;">
              {selectedConversation.value ? (
                <>
                  {/* Chat Header - Full partner details */}
                  <div style={{ padding: '16px 24px', background: 'white', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{ position: 'relative' }}>
                        <div style={{ width: 48, height: 48, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 600, fontSize: 18 }}>
                          {selectedConversation.value.partnerId?.name?.charAt(0) || 'P'}
                        </div>
                        <div style={{ position: 'absolute', bottom: 0, right: 0, width: 14, height: 14, borderRadius: '50%', border: '2px solid white', backgroundColor: getStatusColor(selectedConversation.value.partnerId?.onlineStatus) }} />
                      </div>
                      <div>
                        <p style={{ fontWeight: 700, color: '#111827', margin: 0, fontSize: 16 }}>
                          {selectedConversation.value.partnerId?.name}
                        </p>
                        {selectedConversation.value.status === 'pending' ? (
                          <p style={{ fontSize: 12, color: '#f59e0b', margin: 0 }}>Waiting for acceptance...</p>
                        ) : isTyping.value ? (
                          <p style={{ fontSize: 12, color: '#10b981', margin: 0 }}>typing...</p>
                        ) : (
                          <>
                            <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>
                              {Array.isArray(selectedConversation.value.partnerId?.specialization) ? selectedConversation.value.partnerId.specialization.join(', ') : (selectedConversation.value.partnerId?.specialization || 'Astrologer')}
                            </p>
                            <div style={{ display: 'flex', gap: 12, marginTop: 4, fontSize: 12, color: '#9ca3af' }}>
                              <span>⭐ {selectedConversation.value.partnerId?.rating?.toFixed?.(1) || '0.0'}</span>
                              <span>📊 {selectedConversation.value.partnerId?.totalSessions || selectedConversation.value.partnerId?.completedSessions || 0} sessions</span>
                              <span>📅 {selectedConversation.value.partnerId?.experience || 0}y exp</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Messages */}
                  <div
                    id="user-messages-container"
                    style="flex: 1; overflow-y: auto; padding: 24px; display: flex; flex-direction: column; gap: 16px; background-color: #f9fafb;"
                  >
                    {loading.value ? (
                      <div style="text-align: center; padding: 40px;">
                        <div style="width: 40px; height: 40px; border: 3px solid #e5e7eb; border-top-color: #6366f1; border-radius: 50%; margin: 0 auto; animation: spin 1s linear infinite;" />
                      </div>
                    ) : selectedConversation.value.status === 'pending' ? (
                      <div style="text-align: center; padding: 40px;">
                        <div style="width: 64px; height: 64px; margin: 0 auto 16px; background-color: #fef3c7; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                          <svg style="width: 32px; height: 32px; color: #f59e0b;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <h3 style="font-size: 18px; font-weight: 600; color: #111827; margin: 0 0 8px 0;">
                          Waiting for Astrologer
                        </h3>
                        <p style="color: #6b7280; margin: 0;">
                          Your consultation request has been sent. The astrologer will accept it shortly.
                        </p>
                      </div>
                    ) : messages.value.length === 0 ? (
                      <div style="text-align: center; padding: 40px; color: #6b7280;">
                        <p>Start your consultation by sending a message</p>
                      </div>
                    ) : (
                      messages.value.map((message, index) => {
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
                      })
                    )}
                  </div>

                  {/* Message Input */}
                  <div style="padding: 16px 24px; background-color: white; border-top: 1px solid #e5e7eb;">
                    {selectedConversation.value.status === 'pending' ? (
                      <div style="text-align: center; padding: 12px; background-color: #fef3c7; border-radius: 8px; color: #92400e; font-size: 14px;">
                        Messaging will be enabled once the astrologer accepts your request
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
                          style={`padding: 12px 24px; background-color: #6366f1; color: white; border: none; border-radius: 24px; font-weight: 500; cursor: pointer; ${!newMessage.value.trim() ? 'opacity: 0.5; cursor: not-allowed;' : ''
                            }`}
                        >
                          Send
                        </button>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div style="flex: 1; display: flex; align-items: center; justify-content: center; color: #6b7280;">
                  <div style="text-align: center;">
                    <svg style="width: 64px; height: 64px; margin: 0 auto 16px; color: #d1d5db;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <p style="font-size: 18px; font-weight: 600; margin: 0 0 8px 0;">No conversation selected</p>
                    <p style="font-size: 14px;">Select a conversation to start chatting</p>
                  </div>
                </div>
              )}
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