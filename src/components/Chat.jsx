import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';

function Chat({ chatId, token }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (chatId) loadChat();
  }, [chatId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadChat = async () => {
    try {
      const res = await api.getChat(chatId, token);
      if (res.data.success) {
        setMessages(res.data.data.messages || []);
      }
    } catch (err) {
      console.error('Failed to load chat:', err);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await api.sendChatMessage(chatId, input, token);
      if (res.data.success) {
        setMessages(prev => [...prev, res.data.data.assistantMessage]);
      }
    } catch (err) {
      console.error('Send failed:', err);
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: 20, background: '#f5f5f5' }}>
        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
              marginBottom: 12
            }}
          >
            <div
              style={{
                maxWidth: '70%',
                padding: '12px 16px',
                borderRadius: 12,
                background: msg.role === 'user' ? '#3498db' : '#ecf0f1',
                color: msg.role === 'user' ? '#fff' : '#2c3e50'
              }}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {loading && <div style={{ textAlign: 'center' }}>AI is thinking…</div>}
        <div ref={messagesEndRef} />
      </div>

      <div style={{ padding: 20, borderTop: '1px solid #ddd', display: 'flex', gap: 10 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder="Type your message..."
          disabled={loading}
          style={{ flex: 1, padding: 12, borderRadius: 8 }}
        />
        <button onClick={handleSend} disabled={loading}>
          Send
        </button>
      </div>
    </div>
  );
}

export default Chat;
