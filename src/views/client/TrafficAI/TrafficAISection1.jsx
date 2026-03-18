import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

// --- CONSTANTS ---

const PROJECT_CATEGORIES = [
    {
        id: 'traffic',
        label: 'Traffic',
        icon: '🚦',
        subcategories: ['Highway', 'City Junction', 'Traffic Signal', 'Toll Plaza']
    },
    {
        id: 'parking',
        label: 'Parking',
        icon: '🅿️',
        subcategories: ['Open Parking', 'Multi-level', 'Entry/Exit Gate']
    },
    {
        id: 'campus',
        label: 'Campus',
        icon: '🏢',
        subcategories: ['School/College', 'Office Building', 'Hospital']
    },
    {
        id: 'commercial',
        label: 'Commercial',
        icon: '🏪',
        subcategories: ['Mall', 'Market/Bazaar', 'Petrol Pump']
    },
    {
        id: 'residential',
        label: 'Residential',
        icon: '🏘️',
        subcategories: ['Housing Society', 'Apartment', 'Gated Community']
    },
    {
        id: 'industrial',
        label: 'Industrial',
        icon: '🏭',
        subcategories: ['Factory', 'Warehouse', 'Construction Site']
    },
];

const DETECTION_MODES = [
    { key: 'anpr', label: 'Number Plate', icon: '🔢', color: '#00d4ff' },
    { key: 'helmet', label: 'No Helmet', icon: '⛑️', color: '#ff4d6d' },
    { key: 'wrong_side', label: 'Wrong Side', icon: '↩️', color: '#ff9900' },
    { key: 'triple', label: 'Triple Riding', icon: '👥', color: '#a855f7' },
    { key: 'stalled', label: 'Stalled Vehicle', icon: '🛑', color: '#ef4444' },
    { key: 'seatbelt', label: 'No Seatbelt', icon: '🔒', color: '#f59e0b' },
    { key: 'security', label: 'Security Alert', icon: '🚨', color: '#10b981' },
] as const;

// --- TYPES & INTERFACES ---

type CameraFeedType = 'webcam' | 'ip' | 'rtsp';

interface CameraFeed {
    id: string;
    type: CameraFeedType;
    name?: string;
    ip?: string;
    port?: string;
    path?: string;
    username?: string;
    password?: string;
    deviceId?: string;
}

interface Source {
    id: string;
    name: string;
    description: string;
    type: 'camera' | 'video';
    category: string;
    subcategory: string;
    createdAt: string;
    cameraFeeds?: CameraFeed[];
    videoFile?: File;
    videoFileUrl?: string;
}

type ModalType =
    | { type: 'addSource' }
    | { type: 'editSource'; source: Source }
    | { type: 'deleteSource'; source: Source }
    | null;

// --- STYLES ---

const STYLES = {
    container: {
        padding: '24px',
        backgroundColor: '#0a0f1a',
        minHeight: '100vh',
        color: '#e2e8f0',
        fontFamily: 'inherit',
    },
    headerRow: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
    },
    pageTitle: {
        fontSize: '24px',
        fontWeight: 'bold',
        color: '#e2e8f0',
        margin: 0,
        textTransform: 'uppercase' as const,
        letterSpacing: '1px',
    },
    addSourceBtn: {
        backgroundColor: '#00d4ff',
        color: '#0a0f1a',
        border: 'none',
        borderRadius: '8px',
        padding: '12px 24px',
        fontSize: '15px',
        fontWeight: 'bold',
        cursor: 'pointer',
        boxShadow: '0 4px 12px rgba(0, 212, 255, 0.3)',
        transition: 'all 0.2s',
    },
    filterContainer: {
        display: 'flex',
        flexDirection: 'column' as const,
        gap: '12px',
        marginBottom: '32px',
    },
    filterTabs: {
        display: 'flex',
        gap: '8px',
        flexWrap: 'wrap' as const,
    },
    filterTab: (active: boolean) => ({
        padding: '8px 16px',
        borderRadius: '8px',
        border: `1px solid ${active ? '#00d4ff44' : '#1e2d3d'}`,
        backgroundColor: active ? '#00d4ff15' : '#0f1520',
        color: active ? '#00d4ff' : '#64748b',
        fontSize: '13px',
        fontWeight: 'bold',
        cursor: 'pointer',
        transition: 'all 0.2s',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
    }),
    projectGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
        gap: '24px',
    },
    projectCard: {
        backgroundColor: '#0f1520',
        borderRadius: '16px',
        border: '1px solid #1e2d3d',
        padding: '24px',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        display: 'flex',
        flexDirection: 'column' as const,
        gap: '16px',
        position: 'relative' as const,
        overflow: 'hidden',
        '&:hover': {
            borderColor: '#00d4ff88',
            boxShadow: '0 0 20px rgba(0, 212, 255, 0.15)',
        }
    },
    cardHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    categoryIcon: {
        fontSize: '32px',
        marginBottom: '8px',
    },
    badgeRow: {
        display: 'flex',
        gap: '8px',
        flexWrap: 'wrap' as const,
    },
    badge: (color: string) => ({
        fontSize: '10px',
        fontWeight: 'bold',
        padding: '2px 8px',
        borderRadius: '4px',
        backgroundColor: `${color}15`,
        color: color,
        border: `1px solid ${color}33`,
        textTransform: 'uppercase' as const,
    }),
    cardName: {
        fontSize: '18px',
        fontWeight: 'bold',
        color: '#fff',
    },
    cardDesc: {
        fontSize: '13px',
        color: '#64748b',
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical' as any,
        overflow: 'hidden',
        lineHeight: '1.5',
    },
    cardFooter: {
        marginTop: 'auto',
        borderTop: '1px solid #1e2d3d',
        paddingTop: '16px',
        display: 'flex',
        flexDirection: 'column' as const,
        gap: '12px',
    },
    triggerIcons: {
        display: 'flex',
        gap: '6px',
    },
    triggerIcon: (color: string) => ({
        width: '28px',
        height: '28px',
        borderRadius: '50%',
        backgroundColor: `${color}15`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '14px',
        border: `1px solid ${color}33`,
    }),
    modalOverlay: {
        position: 'fixed' as const,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.8)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    modalContent: {
        backgroundColor: '#0f1520',
        border: '1px solid #1e2d3d',
        borderRadius: '20px',
        padding: '32px',
        width: '100%',
        maxWidth: '550px',
        position: 'relative' as const,
        maxHeight: '90vh',
        overflowY: 'auto' as const,
    },
    label: {
        display: 'block',
        fontSize: '11px',
        fontWeight: 'bold',
        color: '#64748b',
        textTransform: 'uppercase' as const,
        letterSpacing: '1px',
        marginBottom: '8px',
    },
    input: {
        width: '100%',
        backgroundColor: '#1a2234',
        border: '1px solid #1e2d3d',
        borderRadius: '8px',
        padding: '12px 16px',
        color: '#e2e8f0',
        fontSize: '14px',
        outline: 'none',
        transition: 'border-color 0.2s',
        marginBottom: '16px',
    },
    select: {
        width: '100%',
        backgroundColor: '#1a2234',
        border: '1px solid #1e2d3d',
        borderRadius: '8px',
        padding: '12px 16px',
        color: '#e2e8f0',
        fontSize: '14px',
        outline: 'none',
        marginBottom: '16px',
        cursor: 'pointer',
    },
    toggleGroup: {
        display: 'flex',
        gap: '8px',
        marginBottom: '20px',
    },
    toggleBtn: (active: boolean, color: string) => ({
        flex: 1,
        padding: '12px',
        borderRadius: '8px',
        border: `1px solid ${active ? color : '#1e2d3d'}`,
        backgroundColor: active ? `${color}11` : 'transparent',
        color: active ? color : '#64748b',
        fontWeight: 'bold',
        fontSize: '13px',
        cursor: 'pointer',
        transition: 'all 0.2s',
    }),
    runBtn: (disabled: boolean) => ({
        width: '100%',
        padding: '16px',
        borderRadius: '12px',
        backgroundColor: disabled ? '#1e2d3d' : '#00d4ff',
        color: disabled ? '#64748b' : '#0a0f1a',
        border: 'none',
        fontSize: '16px',
        fontWeight: 'bold',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.2s',
        boxShadow: disabled ? 'none' : '0 4px 15px rgba(0, 212, 255, 0.3)',
    }),
};

// --- DEFAULTS ---

const DEFAULT_PROJECTS: Source[] = [
    {
        id: '1',
        name: 'Highway Surveillance',
        description: 'Main highway monitoring for overspeeding and wrong side detection.',
        type: 'video',
        category: 'traffic',
        subcategory: 'Highway',
        createdAt: '2026-03-10T14:22:00.000Z'
    },
    {
        id: '2',
        name: 'Mall Parking A',
        description: 'Entry gate ANPR and vehicle counting for mall visitors.',
        type: 'camera',
        category: 'commercial',
        subcategory: 'Mall',
        createdAt: '2026-03-10T14:25:00.000Z',
        cameraFeeds: [{ id: 'cf1', type: 'rtsp', ip: '192.168.1.100', port: '554', path: '/live', username: 'admin', password: 'password123' }]
    }
];

// =============================================================================
// RAG CHATBOT WIDGET (Floating)
// =============================================================================

interface ChatMessage {
    id: string;
    role: 'bot' | 'user';
    text: string;
    timestamp: string;
    isError?: boolean;
}

const QUICK_CHIPS = [
    'Aaj kitne violations hue?',
    'Last detected plate kya tha?',
    'Kitne no helmet cases?',
    'Camera pe aaj kya hua?',
];

const RAG_API_BASE = (import.meta as any).env.VITE_TRAFFIC_API_URL || '';

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

const RAGChatbot: React.FC = () => {
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [memoryId, setMemoryId] = useState<string | null>(null);
    const [syncing, setSyncing] = useState(false);
    const [btnHover, setBtnHover] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

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

    const addBotMsg = (text: string, isError = false) => {
        const tsNow = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'bot', text, timestamp: tsNow, isError }]);
    };

    const addUserMsg = (text: string) => {
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const handleResync = () => {
        localStorage.removeItem('rag_memory_id');
        setMemoryId(null);
        addBotMsg('🔄 Re-syncing latest data...');
        doSync();
    };

    const sendMessage = async (msg: string) => {
        const text = msg.trim();
        if (!text || loading) return;
        addUserMsg(text);
        setInput('');
        setLoading(true);
        const mid = memoryId || localStorage.getItem('rag_memory_id');
        if (!mid) {
            addBotMsg('⚠️ Not synced yet. Please wait...', true);
            setLoading(false);
            return;
        }
        try {
            const resp = await fetch(`${RAG_API_BASE}/api/rag/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: text, memory_id: mid }),
            });
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            const data = await resp.json();
            addBotMsg(data.answer || 'No response received.');
        } catch {
            addBotMsg('❌ Error getting response. Try again.', true);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <button
                id="rag-chat-btn"
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
                    transform: btnHover ? 'scale(1.08)' : 'scale(1)',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                }}
                title="Traffic AI Chatbot"
            >
                {open ? '✕' : '💬'}
            </button>

            {open && (
                <div id="rag-chat-panel" style={{
                    position: 'fixed', bottom: '100px', right: '24px',
                    width: '380px', maxWidth: '95vw', height: '520px',
                    backgroundColor: '#0f1520', border: '1px solid #1e2d3d',
                    borderRadius: '20px', zIndex: 9999,
                    display: 'flex', flexDirection: 'column', overflow: 'hidden',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
                    animation: 'ragSlideUp 0.25s ease',
                }}>
                    {/* Header */}
                    <div style={{
                        padding: '14px 16px', borderBottom: '1px solid #1e2d3d',
                        background: 'linear-gradient(135deg,#0f1520 0%,#131f30 100%)',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{
                                width: '38px', height: '38px', borderRadius: '10px',
                                background: 'linear-gradient(135deg,#00d4ff22,#00d4ff44)',
                                border: '1px solid #00d4ff44',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px',
                            }}>🤖</div>
                            <div>
                                <div style={{ color: '#fff', fontWeight: 'bold', fontSize: '14px' }}>Traffic AI Assistant</div>
                                <div style={{ color: '#64748b', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    {memoryId
                                        ? <><span style={{ color: '#22c55e', fontSize: '8px' }}>●</span>{' '}Online — Ask about violations, plates</>
                                        : <><span style={{ color: '#f59e0b', fontSize: '8px' }}>●</span>{' '}Syncing data...</>}
                                </div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <button onClick={handleResync} disabled={syncing} title="Re-sync data"
                                style={{
                                    background: 'none', border: '1px solid #1e2d3d', borderRadius: '8px',
                                    color: syncing ? '#374151' : '#64748b', padding: '5px 8px',
                                    cursor: syncing ? 'not-allowed' : 'pointer', fontSize: '14px',
                                    opacity: syncing ? 0.5 : 1, transition: 'color 0.2s',
                                }}
                            >🔄</button>
                            <button onClick={() => setOpen(false)}
                                style={{
                                    background: 'none', border: 'none', color: '#64748b',
                                    fontSize: '18px', cursor: 'pointer', padding: '4px 6px', lineHeight: 1,
                                }}
                            >×</button>
                        </div>
                    </div>

                    {/* Messages */}
                    <div ref={scrollRef} style={{
                        flex: 1, overflowY: 'auto', padding: '12px 14px',
                        display: 'flex', flexDirection: 'column', gap: '10px',
                        scrollbarWidth: 'thin', scrollbarColor: '#1e2d3d #0f1520',
                    }}>
                        {messages.length === 0 && !syncing && (
                            <div style={{ textAlign: 'center', marginTop: '16px' }}>
                                <div style={{ fontSize: '36px', marginBottom: '8px' }}>📊</div>
                                <div style={{ color: '#64748b', fontSize: '13px', marginBottom: '20px' }}>Ask anything about traffic data</div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
                                    {QUICK_CHIPS.map(chip => (
                                        <button key={chip} onClick={() => sendMessage(chip)}
                                            style={{
                                                background: '#1e2d3d', border: '1px solid #00d4ff44',
                                                borderRadius: '20px', color: '#00d4ff',
                                                fontSize: '12px', padding: '6px 12px', cursor: 'pointer',
                                            }}
                                        >{chip}</button>
                                    ))}
                                </div>
                            </div>
                        )}
                        {messages.map(msg => (
                            <div key={msg.id} style={{
                                display: 'flex', flexDirection: 'column',
                                alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                            }}>
                                <div style={{
                                    maxWidth: '85%', padding: '10px 13px',
                                    borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                                    backgroundColor: msg.role === 'user' ? 'rgba(0,212,255,0.15)' : msg.isError ? 'rgba(239,68,68,0.1)' : '#111827',
                                    color: msg.role === 'user' ? '#fff' : msg.isError ? '#ef4444' : '#cbd5e1',
                                    fontSize: '13px', lineHeight: '1.55',
                                    border: msg.role === 'user' ? '1px solid rgba(0,212,255,0.25)' : msg.isError ? '1px solid rgba(239,68,68,0.25)' : '1px solid #1e2d3d',
                                    wordBreak: 'break-word' as const,
                                }}>{msg.text}</div>
                                <div style={{ fontSize: '10px', color: '#374151', marginTop: '3px', paddingLeft: '4px' }}>{msg.timestamp}</div>
                            </div>
                        ))}
                        {loading && (
                            <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                                <div style={{
                                    padding: '10px 14px', backgroundColor: '#111827',
                                    border: '1px solid #1e2d3d', borderRadius: '16px 16px 16px 4px',
                                    display: 'flex', gap: '4px', alignItems: 'center',
                                }}>
                                    {[0, 1, 2].map(i => (
                                        <span key={i} style={{
                                            width: '7px', height: '7px', borderRadius: '50%',
                                            backgroundColor: '#00d4ff', display: 'inline-block',
                                            animation: `ragDot 1.2s ${i * 0.2}s infinite`,
                                        }} />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Input */}
                    <div style={{
                        padding: '10px 12px', borderTop: '1px solid #1e2d3d',
                        background: '#0a0f1a', display: 'flex', gap: '8px',
                        alignItems: 'center', flexShrink: 0,
                    }}>
                        <input
                            type="text" value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
                            placeholder="Ask about plates, violations, cameras.."
                            style={{
                                flex: 1, background: '#1a2234', border: '1px solid #1e2d3d',
                                borderRadius: '10px', padding: '10px 14px',
                                color: '#e2e8f0', fontSize: '13px', outline: 'none',
                                transition: 'border-color 0.2s',
                            }}
                            onFocus={e => (e.target.style.borderColor = '#00d4ff')}
                            onBlur={e => (e.target.style.borderColor = '#1e2d3d')}
                        />
                        <button
                            onClick={() => sendMessage(input)}
                            disabled={!input.trim() || loading}
                            style={{
                                backgroundColor: !input.trim() || loading ? '#1e2d3d' : '#00d4ff',
                                border: 'none', borderRadius: '10px', padding: '10px 14px',
                                color: !input.trim() || loading ? '#64748b' : '#0a0f1a',
                                fontSize: '16px', cursor: !input.trim() || loading ? 'not-allowed' : 'pointer',
                                fontWeight: 'bold', transition: 'all 0.2s', flexShrink: 0,
                            }}
                        >➤</button>
                    </div>
                </div>
            )}
        </>
    );
};

// --- MAIN COMPONENT ---

const TrafficAI: React.FC = () => {
    // --- STATE ---
    const [projects, setProjects] = useState<Source[]>(() => {
        const saved = localStorage.getItem('traffic_sources');
        try {
            return saved ? JSON.parse(saved) : DEFAULT_PROJECTS;
        } catch (e) {
            return DEFAULT_PROJECTS;
        }
    });
    const [catFilter, setCatFilter] = useState<string>('all');
    const [subFilter, setSubFilter] = useState<string>('all');
    const [activeModal, setActiveModal] = useState<ModalType>(null);
    const [hoveredId, pHoveredId] = useState<string | null>(null);

    // --- EFFECTS ---
    useEffect(() => {
        localStorage.setItem('traffic_sources', JSON.stringify(projects));
    }, [projects]);

    useEffect(() => {
        setSubFilter('all');
    }, [catFilter]);

    // --- HANDLERS ---

    const filteredProjects = projects.filter(p => {
        const catMatch = catFilter === 'all' || p.category === catFilter;
        const subMatch = subFilter === 'all' || p.subcategory === subFilter;
        return catMatch && subMatch;
    });

    const formatDate = (dateStr: string) => {
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return 'Recently added';
            return new Intl.DateTimeFormat('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            }).format(date);
        } catch (e) {
            return 'Recently added';
        }
    };

    // --- RENDER ---
    return (
        <div style={STYLES.container}>
            <div style={STYLES.headerRow}>
                <h1 style={STYLES.pageTitle}>Recent Projects</h1>
                <button style={STYLES.addSourceBtn} onClick={() => setActiveModal({ type: 'addSource' })}>
                    + Add Project
                </button>
            </div>

            <div style={STYLES.filterContainer}>
                {/* Level 1: Categories */}
                <div style={STYLES.filterTabs}>
                    <button
                        style={STYLES.filterTab(catFilter === 'all')}
                        onClick={() => setCatFilter('all')}
                    >
                        ALL
                    </button>
                    {PROJECT_CATEGORIES.map(cat => (
                        <button
                            key={cat.id}
                            style={STYLES.filterTab(catFilter === cat.id)}
                            onClick={() => setCatFilter(cat.id)}
                        >
                            {cat.icon} {cat.label}
                        </button>
                    ))}
                </div>

                {/* Level 2: Subcategories */}
                {catFilter !== 'all' && (
                    <div style={STYLES.filterTabs}>
                        <button
                            style={STYLES.filterTab(subFilter === 'all')}
                            onClick={() => setSubFilter('all')}
                        >
                            All Subcategories
                        </button>
                        {PROJECT_CATEGORIES.find(c => c.id === catFilter)?.subcategories.map(sub => (
                            <button
                                key={sub}
                                style={STYLES.filterTab(subFilter === sub)}
                                onClick={() => setSubFilter(sub)}
                            >
                                {sub}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <div style={STYLES.projectGrid}>
                {filteredProjects.map(project => (
                    <ProjectCard
                        key={project.id}
                        project={project}
                        isHovered={hoveredId === project.id}
                        onHover={() => pHoveredId(project.id)}
                        onLeave={() => pHoveredId(null)}
                        onEdit={() => setActiveModal({ type: 'editSource', source: project })}
                        onDelete={() => setActiveModal({ type: 'deleteSource', source: project })}
                        formatDate={formatDate}
                    />
                ))}
            </div>

            {/* MODALS */}
            {activeModal && (
                <div style={STYLES.modalOverlay} onClick={() => setActiveModal(null)}>
                    <div style={STYLES.modalContent} onClick={e => e.stopPropagation()}>
                        <div style={{ position: 'absolute', top: '20px', right: '20px', cursor: 'pointer', fontSize: '20px', color: '#64748b' }} onClick={() => setActiveModal(null)}>✕</div>

                        {activeModal.type === 'addSource' && (
                            <AddProjectModal
                                onSave={(p) => {
                                    const newProject = { ...p, id: Date.now().toString(), createdAt: new Date().toISOString() };
                                    setProjects(prev => [...prev, newProject as Source]);
                                    setActiveModal(null);
                                }}
                                onCancel={() => setActiveModal(null)}
                            />
                        )}

                        {activeModal.type === 'editSource' && (
                            <AddProjectModal
                                initialProject={activeModal.source}
                                onSave={(updated) => {
                                    setProjects(prev => prev.map(p => p.id === activeModal.source.id ? { ...p, ...updated } : p));
                                    setActiveModal(null);
                                }}
                                onCancel={() => setActiveModal(null)}
                            />
                        )}

                        {activeModal.type === 'deleteSource' && (
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🗑️</div>
                                <h1 style={{ marginBottom: '12px', fontSize: '24px' }}>Delete Project?</h1>
                                <p style={{ color: '#64748b', marginBottom: '32px' }}>Confirm deleting "{activeModal.source.name}". This action cannot be undone.</p>
                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <button style={{ ...STYLES.runBtn(false), backgroundColor: '#1e2d3d', color: '#e2e8f0' }} onClick={() => setActiveModal(null)}>Cancel</button>
                                    <button style={{ ...STYLES.runBtn(false), backgroundColor: '#ef4444', color: '#fff' }} onClick={() => {
                                        setProjects(prev => prev.filter(p => p.id !== activeModal.source.id));
                                        setActiveModal(null);
                                    }}>Delete</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── FLOATING CHATBOT ── */}
            <RAGChatbot />
        </div>
    );
};


// --- SUB-COMPONENTS ---

const ProjectCard: React.FC<{
    project: Source,
    isHovered: boolean,
    onHover: () => void,
    onLeave: () => void,
    onEdit: () => void,
    onDelete: () => void,
    formatDate: (dateStr: string) => string
}> = ({ project, isHovered, onHover, onLeave, onEdit, onDelete, formatDate }) => {
    const navigate = useNavigate();
    const category = PROJECT_CATEGORIES.find(c => c.id === project.category);

    const handleCardClick = () => {
        navigate(`/traffic-ai/project/${project.id}`);
    };

    return (
        <div
            style={{
                ...STYLES.projectCard,
                borderColor: isHovered ? '#00d4ff88' : '#1e2d3d',
                boxShadow: isHovered ? '0 0 20px rgba(0, 212, 255, 0.15)' : 'none',
                transform: isHovered ? 'translateY(-4px)' : 'none'
            }}
            onMouseEnter={onHover}
            onMouseLeave={onLeave}
            onClick={handleCardClick}
        >
            <div style={STYLES.cardHeader}>
                <div style={STYLES.categoryIcon}>{category?.icon || '📁'}</div>
                <div style={STYLES.badgeRow}>
                    <div style={STYLES.badge('#64748b')}>{project.subcategory}</div>
                </div>
            </div>

            <div>
                <div style={STYLES.cardName}>{project.name}</div>
                <div style={STYLES.cardDesc}>{project.description}</div>
            </div>

            <div style={STYLES.badgeRow}>
                <div style={STYLES.badge(project.type === 'video' ? '#a855f7' : '#00d4ff')}>
                    {project.type.toUpperCase()}
                </div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>
                    Added: {formatDate(project.createdAt)}
                </div>
            </div>

            <div style={STYLES.cardFooter}>
                <div style={STYLES.triggerIcons}>
                    {DETECTION_MODES.map(mode => (
                        <div key={mode.key} style={STYLES.triggerIcon(mode.color)} title={mode.label}>
                            {mode.icon}
                        </div>
                    ))}
                </div>
            </div>

            {/* Hidden admin actions shown on hover */}
            {isHovered && (
                <div style={{ position: 'absolute', top: '24px', right: '24px', display: 'flex', gap: '8px' }}>
                    <button
                        style={{ background: '#1a2234', border: '1px solid #1e2d3d', color: '#e2e8f0', padding: '6px', borderRadius: '6px', cursor: 'pointer' }}
                        onClick={(e) => { e.stopPropagation(); onEdit(); }}
                    >
                        ✏️
                    </button>
                    <button
                        style={{ background: '#1a2234', border: '1px solid #ef444433', color: '#ef4444', padding: '6px', borderRadius: '6px', cursor: 'pointer' }}
                        onClick={(e) => { e.stopPropagation(); onDelete(); }}
                    >
                        🗑️
                    </button>
                </div>
            )}
        </div>
    );
};

const AddProjectModal: React.FC<{
    initialProject?: Source,
    onSave: (p: Omit<Source, 'id' | 'createdAt'>) => void,
    onCancel: () => void
}> = ({ initialProject, onSave, onCancel }) => {
    const [name, setName] = useState(initialProject?.name || '');
    const [desc, setDesc] = useState(initialProject?.description || '');
    const [type, setType] = useState<'camera' | 'video'>(initialProject?.type || 'camera');
    const [category, setCategory] = useState(initialProject?.category || '');
    const [subcategory, setSubcategory] = useState(initialProject?.subcategory || '');

    const selectedCat = PROJECT_CATEGORIES.find(c => c.id === category);

    return (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
            <h2 style={{ margin: '0 0 24px 0', fontSize: '24px' }}>{initialProject ? 'Edit Project' : 'New Project Space'}</h2>

            <label style={STYLES.label}>Project Name</label>
            <input
                style={STYLES.input}
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Smart Intersection 01"
            />

            <label style={STYLES.label}>Description</label>
            <textarea
                style={{ ...STYLES.input, height: '80px', paddingTop: '12px', resize: 'none' }}
                value={desc}
                onChange={e => setDesc(e.target.value)}
                placeholder="Briefly describe the project scope..."
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                    <label style={STYLES.label}>Category</label>
                    <select
                        style={STYLES.select}
                        value={category}
                        onChange={e => {
                            setCategory(e.target.value);
                            setSubcategory('');
                        }}
                    >
                        <option value="" disabled>Select category</option>
                        {PROJECT_CATEGORIES.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.icon} {cat.label}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label style={STYLES.label}>Subcategory</label>
                    <select
                        style={{ ...STYLES.select, opacity: !category ? 0.5 : 1 }}
                        value={subcategory}
                        onChange={e => setSubcategory(e.target.value)}
                        disabled={!category}
                    >
                        <option value="">{category ? 'Select subcategory' : 'Waiting for category...'}</option>
                        {selectedCat?.subcategories.map(sub => (
                            <option key={sub} value={sub}>{sub}</option>
                        ))}
                    </select>
                </div>
            </div>

            <label style={STYLES.label}>Source Format</label>
            <div style={STYLES.toggleGroup}>
                <button
                    style={STYLES.toggleBtn(type === 'camera', '#00d4ff')}
                    onClick={() => setType('camera')}
                >
                    📷 CCTV CAMERA
                </button>
                <button
                    style={STYLES.toggleBtn(type === 'video', '#a855f7')}
                    onClick={() => setType('video')}
                >
                    🎬 VIDEO FILE
                </button>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                <button
                    style={{ ...STYLES.runBtn(false), backgroundColor: '#1e2d3d', color: '#e2e8f0', flex: 1 }}
                    onClick={onCancel}
                >
                    Discard
                </button>
                <button
                    style={{ ...STYLES.runBtn(!name || !category || !subcategory), flex: 1 }}
                    disabled={!name || !category || !subcategory}
                    onClick={() => onSave({ name, description: desc, type, category, subcategory })}
                >
                    {initialProject ? 'Apply Changes' : 'Initialize Project'}
                </button>
            </div>
        </div>
    );
};

export default TrafficAI;
