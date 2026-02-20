import React, { useState, useEffect } from 'react';
import ChatList from '../components/ChatList';
import Chat from '../components/Chat';
import api from '../services/api';

function ChatPage() {
  const [chats, setChats] = useState([]);
  const [selectedChatId, setSelectedChatId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadChats();
  }, []);

  const loadChats = async () => {
    try {
      const res = await api.getChats();
      if (res.data.success) {
        setChats(res.data.data.chats || []);
      }
    } catch (error) {
      console.error('Failed to load chats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNewChat = async () => {
    try {
      const res = await api.createChat();
      if (res.data.success) {
        setSelectedChatId(res.data.data.chatId);
        loadChats();
      }
    } catch (error) {
      console.error('Failed to create chat:', error);
    }
  };

  const handleSelectChat = (chatId) => {
    setSelectedChatId(chatId);
  };

  if (loading) {
    return <div style={{ padding: 20 }}>Loading chats...</div>;
  }

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 40px)', gap: '20px' }}>
      {/* Sidebar */}
      <div style={{ width: '300px', borderRight: '1px solid #ddd', paddingRight: '20px' }}>
        <button
          onClick={handleNewChat}
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: '#3498db',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            marginBottom: '20px'
          }}
        >
          + New Chat
        </button>

        <ChatList
          chats={chats}
          selectedChatId={selectedChatId}
          onSelectChat={handleSelectChat}
        />
      </div>

      {/* Chat Window */}
      <div style={{ flex: 1 }}>
        {selectedChatId ? (
          <Chat chatId={selectedChatId} />
        ) : (
          <div style={{ textAlign: 'center', padding: '40px', color: '#7f8c8d' }}>
            <p>Select a chat or create a new one to start chatting.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default ChatPage;
