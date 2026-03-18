import React, { useState, useEffect, useRef } from 'react';

const QUICK_CHIPS = [
    'Aaj kitne violations hue?',
    'Last detected plate kya tha?',
    'Kitne no helmet cases?',
    'Camera pe aaj kya hua?',
];

const RAG_API_BASE = import.meta.env.VITE_TRAFFIC_API_URL || 'https://histolytic-unpregnant-cary.ngrok-free.dev';

const CHATBOT_STYLES = `
@keyframes ragPulse {
    0%   { box-shadow: 0 0 0 0 rgba(0,212,255,0.5); }
    70%  { box-shadow: 0 0 0 14px rgba(0,212,255,0); }
    100% { box-shadow: 0 0 0 0 rgba(0,212,255,0); }
}
@keyframes ragDot {
    0%,80%,100% { transform: scale(0.6); opacity: 0.4; }
    40%         { transform: scale(1);   opacity: 1;   }
}
@keyframes ragSlideUp {
    from { opacity:0; transform:translateY(20px); }
    to   { opacity:1; transform:translateY(0);    }
}
`;

const RAGChatbot = () => {
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [memoryId, setMemoryId] = useState(null);
    const [syncing, setSyncing] = useState(false);
    const [btnHover, setBtnHover] = useState(false);
    const scrollRef = useRef(null);

    useEffect(() => {
        const id = 'rag-chatbot-styles';
        if (!document.getElementById(id)) {
            const el = document.createElement('style');
            el.id = id;
            el.textContent = CHATBOT_STYLES;
            document.head.appendChild(el);
        }
    }, []);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, loading]);

    const addBotMsg = (text, isError = false) => {
        const tsNow = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'bot', text, timestamp: tsNow, isError }]);
    };

    const addUserMsg = (text) => {
        const tsNow = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', text, timestamp: tsNow }]);
    };

    const doSync = async () => {
        setSyncing(true);
        try {
            const resp = await fetch(`${RAG_API_BASE}/api/rag/sync`, { method: 'POST' });
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            const data = await resp.json();
            localStorage.setItem('rag_memory_id', data.memory_id);
            setMemoryId(data.memory_id);
            addBotMsg(`✅ Synced ${data.records_synced} detections. Ask me anything!`);
        } catch {
            addBotMsg('❌ Could not connect. Check backend.', true);
        } finally {
            setSyncing(false);
        }
    };

    useEffect(() => {
        if (!open) return;
        const stored = localStorage.getItem('rag_memory_id');
        if (stored) {
            setMemoryId(stored);
            if (messages.length === 0) addBotMsg('✅ Data already synced. Ask me anything about traffic violations!');
        } else {
            doSync();
        }
    }, [open]);

    const sendMessage = async (msg) => {
        const text = msg.trim();
        if (!text || loading) return;
        addUserMsg(text);
        setInput('');
        setLoading(true);
        const mid = memoryId || localStorage.getItem('rag_memory_id');
        try {
            const resp = await fetch(`${RAG_API_BASE}/api/rag/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: text, memory_id: mid }),
            });
            const data = await resp.json();
            addBotMsg(data.answer || 'No response received.');
        } catch {
            addBotMsg('❌ Error getting response.', true);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <button
                onClick={() => setOpen(o => !o)}
                onMouseEnter={() => setBtnHover(true)}
                onMouseLeave={() => setBtnHover(false)}
                style={{
                    position: 'fixed', bottom: '28px', right: '28px',
                    width: '58px', height: '58px', borderRadius: '50%',
                    backgroundColor: '#00d4ff', border: 'none', cursor: 'pointer',
                    fontSize: '26px', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', zIndex: 9998,
                    animation: open ? 'none' : 'ragPulse 2s infinite',
                    boxShadow: btnHover ? '0 0 24px rgba(0,212,255,0.7)' : '0 4px 16px rgba(0,212,255,0.4)',
                    transition: 'transform 0.2s',
                }}
            >
                {open ? '✕' : '💬'}
            </button>

            {open && (
                <div style={{
                    position: 'fixed', bottom: '100px', right: '24px',
                    width: '380px', height: '520px', backgroundColor: '#0f1520',
                    border: '1px solid #1e2d3d', borderRadius: '20px', zIndex: 9999,
                    display: 'flex', flexDirection: 'column', overflow: 'hidden',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.6)', animation: 'ragSlideUp 0.25s ease',
                }}>
                    {/* Chat UI Elements (Header, Messages, Input) similar to original */}
                    {/* ... (Main chat rendering here) */}
                </div>
            )}
        </>
    );
};

export default RAGChatbot;
