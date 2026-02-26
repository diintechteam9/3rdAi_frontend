import { ref, onMounted } from 'vue';
import { useAuth } from '../../store/auth.js';
import api from '../../services/api.js';

export default {
    name: 'PartnerAIChat',
    setup() {
        const { token, getTokenForRole } = useAuth();
        const chats = ref([]);
        const selectedChatId = ref(null);
        const messages = ref([]);
        const input = ref('');
        const loading = ref(false);
        const chatLoading = ref(true);

        onMounted(async () => {
            await loadChats();
        });

        const getPartnerToken = () => {
            // Get partner token
            return getTokenForRole('partner') || localStorage.getItem('partner_token');
        };

        const loadChats = async () => {
            try {
                const partnerToken = getPartnerToken();
                if (!partnerToken) {
                    throw new Error('Authentication required. Please login as a partner.');
                }

                const data = await api.getChats(partnerToken);
                if (data.success) {
                    chats.value = data.data.chats;
                }
            } catch (error) {
                console.error('[PartnerAIChat] Failed to load chats:', error.message);
            } finally {
                chatLoading.value = false;
            }
        };

        const loadChat = async (chatId) => {
            try {
                const partnerToken = getPartnerToken();
                if (!partnerToken) throw new Error('Partner token required');

                const data = await api.getChat(chatId, partnerToken);
                if (data.success) {
                    messages.value = data.data.messages || [];
                }
            } catch (error) {
                console.error('Failed to load chat:', error);
            }
        };

        const handleNewChat = async () => {
            try {
                const partnerToken = getPartnerToken();
                if (!partnerToken) throw new Error('Partner token required');

                const data = await api.createChat(partnerToken);
                if (data.success) {
                    selectedChatId.value = data.data.chatId;
                    messages.value = [];
                    await loadChats();
                }
            } catch (error) {
                console.error('Failed to create chat:', error);
            }
        };

        const handleSelectChat = async (chatId) => {
            selectedChatId.value = chatId;
            await loadChat(chatId);
        };

        const handleSend = async () => {
            if (!input.value.trim() || loading.value || !selectedChatId.value) return;

            const userMessage = { role: 'user', content: input.value };
            messages.value.push(userMessage);
            const messageText = input.value;
            input.value = '';
            loading.value = true;

            try {
                const partnerToken = getPartnerToken();
                if (!partnerToken) throw new Error('Partner token required');

                const data = await api.sendChatMessage(selectedChatId.value, messageText, partnerToken);
                if (data.success) {
                    messages.value.push(data.data.assistantMessage);
                    await loadChats(); // Refresh chat list to update lastMessage and updatedAt
                    scrollToBottom();
                }
            } catch (error) {
                console.error('Failed to send message:', error);
                messages.value = messages.value.filter(m => m !== userMessage);
            } finally {
                loading.value = false;
            }
        };

        const scrollToBottom = () => {
            setTimeout(() => {
                const container = document.getElementById('ai-chat-messages-container');
                if (container) {
                    container.scrollTop = container.scrollHeight;
                }
            }, 100);
        };

        return () => (
            <div style={{ display: 'flex', height: '100%', minHeight: 'calc(100vh - 120px)', gap: '20px' }}>
                {/* Chat List Sidebar */}
                <div style={{ width: '300px', borderRight: '1px solid #ddd', paddingRight: '20px', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ marginBottom: '20px' }}>
                        <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#111827', margin: '0 0 16px 0' }}>
                            AI Police Chat
                        </h2>
                        <button
                            onClick={handleNewChat}
                            style={{
                                width: '100%',
                                padding: '12px',
                                backgroundColor: '#6366f1',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '16px',
                                fontWeight: '500',
                                transition: 'background-color 0.2s',
                            }}
                            onMouseEnter={(e) => e.target.style.backgroundColor = '#4f46e5'}
                            onMouseLeave={(e) => e.target.style.backgroundColor = '#6366f1'}
                        >
                            + New Chat
                        </button>
                    </div>

                    {chatLoading.value ? (
                        <div style={{ textAlign: 'center', padding: '20px', color: '#6b7280' }}>Loading chats...</div>
                    ) : chats.value.length === 0 ? (
                        <p style={{ color: '#6b7280', fontSize: '14px', textAlign: 'center', marginTop: '20px' }}>
                            No chat history yet. Start a new chat!
                        </p>
                    ) : (
                        <div style={{ flex: 1, overflowY: 'auto' }}>
                            {chats.value.map(chat => (
                                <div
                                    key={chat.chatId}
                                    onClick={() => handleSelectChat(chat.chatId)}
                                    style={{
                                        padding: '12px',
                                        marginBottom: '8px',
                                        backgroundColor: selectedChatId.value === chat.chatId ? '#eef2ff' : 'white',
                                        border: selectedChatId.value === chat.chatId ? '1px solid #6366f1' : '1px solid #e5e7eb',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    <div style={{ fontWeight: '600', marginBottom: '4px', color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {chat.title || 'Ongoing Chat'}
                                    </div>
                                    {chat.lastMessage && (
                                        <div style={{
                                            fontSize: '13px',
                                            color: '#6b7280',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap'
                                        }}>
                                            {chat.lastMessage}
                                        </div>
                                    )}
                                    <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '6px' }}>
                                        {new Date(chat.updatedAt).toLocaleString()}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Chat Messages */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)', border: '1px solid #f3f4f6' }}>
                    {selectedChatId.value ? (
                        <>
                            {/* Chat Header */}
                            <div style={{ padding: '16px 24px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center' }}>
                                <div style={{ width: 40, height: 40, background: 'linear-gradient(135deg, #10b981, #059669)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', marginRight: '16px' }}>
                                    <svg style={{ width: '20px', height: '20px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#111827' }}>AI Assistant</h3>
                                    <p style={{ margin: 0, fontSize: '13px', color: '#10b981' }}>Online</p>
                                </div>
                            </div>

                            {/* Messages Area */}
                            <div id="ai-chat-messages-container" style={{
                                flex: 1,
                                overflowY: 'auto',
                                padding: '24px',
                                backgroundColor: '#f9fafb',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '16px'
                            }}>
                                {messages.value.length === 0 ? (
                                    <div style={{ textAlign: 'center', margin: 'auto', color: '#6b7280' }}>
                                        <div style={{ width: '64px', height: '64px', margin: '0 auto 16px', background: '#d1fae5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <svg style={{ width: '32px', height: '32px', color: '#059669' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                            </svg>
                                        </div>
                                        <p style={{ fontSize: '16px' }}>Start your conversation with the AI Police Assistant</p>
                                    </div>
                                ) : (
                                    messages.value.map((msg, i) => (
                                        <div
                                            key={i}
                                            style={{
                                                display: 'flex',
                                                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start'
                                            }}
                                        >
                                            <div style={{
                                                maxWidth: '75%',
                                                padding: '12px 16px',
                                                borderRadius: '16px',
                                                backgroundColor: msg.role === 'user' ? '#6366f1' : 'white',
                                                color: msg.role === 'user' ? 'white' : '#111827',
                                                borderBottomRightRadius: msg.role === 'user' ? '4px' : '16px',
                                                borderBottomLeftRadius: msg.role === 'assistant' ? '4px' : '16px',
                                                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                                border: msg.role === 'assistant' ? '1px solid #e5e7eb' : 'none'
                                            }}>
                                                <p style={{ margin: 0, whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>{msg.content}</p>
                                            </div>
                                        </div>
                                    ))
                                )}
                                {loading.value && (
                                    <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                                        <div style={{
                                            padding: '12px 16px',
                                            borderRadius: '16px',
                                            borderBottomLeftRadius: '4px',
                                            backgroundColor: 'white',
                                            border: '1px solid #e5e7eb',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px'
                                        }}>
                                            <div style={{ width: '6px', height: '6px', backgroundColor: '#9ca3af', borderRadius: '50%', animation: 'bounce 1.4s infinite ease-in-out both' }}></div>
                                            <div style={{ width: '6px', height: '6px', backgroundColor: '#9ca3af', borderRadius: '50%', animation: 'bounce 1.4s infinite ease-in-out both', animationDelay: '0.2s' }}></div>
                                            <div style={{ width: '6px', height: '6px', backgroundColor: '#9ca3af', borderRadius: '50%', animation: 'bounce 1.4s infinite ease-in-out both', animationDelay: '0.4s' }}></div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Input Area */}
                            <div style={{ padding: '16px 24px', borderTop: '1px solid #e5e7eb', backgroundColor: 'white', borderRadius: '0 0 12px 12px' }}>
                                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                    <input
                                        type="text"
                                        value={input.value}
                                        onInput={(e) => input.value = e.target.value}
                                        onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                                        placeholder="Type your message to AI Police..."
                                        style={{
                                            flex: 1,
                                            padding: '12px 16px',
                                            border: '1px solid #d1d5db',
                                            borderRadius: '24px',
                                            fontSize: '15px',
                                            outline: 'none',
                                        }}
                                        disabled={loading.value}
                                    />
                                    <button
                                        onClick={handleSend}
                                        disabled={loading.value || !input.value.trim()}
                                        style={{
                                            padding: '12px 24px',
                                            backgroundColor: '#6366f1',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '24px',
                                            cursor: loading.value || !input.value.trim() ? 'not-allowed' : 'pointer',
                                            opacity: loading.value || !input.value.trim() ? 0.6 : 1,
                                            fontWeight: '500',
                                            transition: 'background-color 0.2s'
                                        }}
                                    >
                                        Send
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }}>
                            <div style={{ textAlign: 'center' }}>
                                <svg style={{ width: '64px', height: '64px', margin: '0 auto 16px', color: '#d1d5db' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                                <p style={{ fontSize: '18px', fontWeight: '500', margin: '0 0 8px 0', color: '#4b5563' }}>No chat selected</p>
                                <p style={{ fontSize: '14px', margin: 0 }}>Create a new chat or select an existing one to continue.</p>
                            </div>
                        </div>
                    )}
                </div>
                <style>{`
          @keyframes bounce {
            0%, 80%, 100% { transform: scale(0); }
            40% { transform: scale(1); }
          }
        `}</style>
            </div>
        );
    }
};
