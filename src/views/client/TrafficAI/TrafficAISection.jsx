import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom'; // Make sure react-router-dom is installed

// --- CONSTANTS ---
const PROJECT_CATEGORIES = [
    { id: 'traffic', label: 'Traffic', icon: '🚦', subcategories: ['Highway', 'City Junction', 'Traffic Signal', 'Toll Plaza'] },
    { id: 'parking', label: 'Parking', icon: '🅿️', subcategories: ['Open Parking', 'Multi-level', 'Entry/Exit Gate'] },
    { id: 'campus', label: 'Campus', icon: '🏢', subcategories: ['School/College', 'Office Building', 'Hospital'] },
    { id: 'commercial', label: 'Commercial', icon: '🏪', subcategories: ['Mall', 'Market/Bazaar', 'Petrol Pump'] },
    { id: 'residential', label: 'Residential', icon: '🏘️', subcategories: ['Housing Society', 'Apartment', 'Gated Community'] },
    { id: 'industrial', label: 'Industrial', icon: '🏭', subcategories: ['Factory', 'Warehouse', 'Construction Site'] },
];

const DETECTION_MODES = [
    { key: 'anpr', label: 'Number Plate', icon: '🔢', color: '#00d4ff' },
    { key: 'helmet', label: 'No Helmet', icon: '⛑️', color: '#ff4d6d' },
    { key: 'wrong_side', label: 'Wrong Side', icon: '↩️', color: '#ff9900' },
    { key: 'triple', label: 'Triple Riding', icon: '👥', color: '#a855f7' },
    { key: 'stalled', label: 'Stalled Vehicle', icon: '🛑', color: '#ef4444' },
    { key: 'seatbelt', label: 'No Seatbelt', icon: '🔒', color: '#f59e0b' },
    { key: 'security', label: 'Security Alert', icon: '🚨', color: '#10b981' },
];

// --- STYLES ---
const STYLES = {
    container: { padding: '24px', backgroundColor: '#0a0f1a', minHeight: '100vh', color: '#e2e8f0', fontFamily: 'inherit' },
    headerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
    pageTitle: { fontSize: '24px', fontWeight: 'bold', color: '#e2e8f0', margin: 0, textTransform: 'uppercase', letterSpacing: '1px' },
    addSourceBtn: { backgroundColor: '#ffffff', color: '#0a0f1a', border: 'none', borderRadius: '8px', padding: '12px 24px', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 12px rgba(255, 255, 255, 0.1)', transition: 'all 0.2s' },
    filterContainer: { display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' },
    filterTabs: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
    filterTab: (active) => ({ padding: '8px 16px', borderRadius: '8px', border: `1px solid ${active ? '#00d4ff44' : '#1e2d3d'}`, backgroundColor: active ? '#00d4ff15' : '#0f1520', color: active ? '#00d4ff' : '#64748b', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '8px' }),
    projectGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '24px' },
    projectCard: { backgroundColor: '#0f1520', borderRadius: '16px', border: '1px solid #1e2d3d', padding: '24px', cursor: 'pointer', transition: 'all 0.3s ease', display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative', overflow: 'hidden' },
    categoryIcon: { fontSize: '32px', marginBottom: '8px' },
    badge: (color) => ({ fontSize: '10px', fontWeight: 'bold', padding: '2px 8px', borderRadius: '4px', backgroundColor: `${color}15`, color: color, border: `1px solid ${color}33`, textTransform: 'uppercase' }),
    cardName: { fontSize: '18px', fontWeight: 'bold', color: '#fff' },
    cardDesc: { fontSize: '13px', color: '#64748b', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: '1.5' },
    triggerIcon: (color) => ({ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', border: `1px solid ${color}33` }),
    modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
    modalContent: { backgroundColor: '#0f1520', border: '1px solid #1e2d3d', borderRadius: '20px', padding: '32px', width: '100%', maxWidth: '550px', position: 'relative', maxHeight: '90vh', overflowY: 'auto' },
    input: { width: '100%', backgroundColor: '#1a2234', border: '1px solid #1e2d3d', borderRadius: '8px', padding: '12px 16px', color: '#e2e8f0', fontSize: '14px', outline: 'none', marginBottom: '16px' },
    runBtn: (disabled) => ({ width: '100%', padding: '16px', borderRadius: '12px', backgroundColor: disabled ? '#1e2d3d' : '#00d4ff', color: disabled ? '#64748b' : '#0a0f1a', border: 'none', fontSize: '16px', fontWeight: 'bold', cursor: disabled ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }),
};

// --- CHATBOT WIDGET COMPONENT ---
const RAG_API_BASE = import.meta.env.VITE_TRAFFIC_API_URL || 'https://histolytic-unpregnant-cary.ngrok-free.dev';

const RAGChatbot = () => {
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [memoryId, setMemoryId] = useState(localStorage.getItem('rag_memory_id'));
    const [syncing, setSyncing] = useState(false);
    const scrollRef = useRef(null);

    const addBotMsg = (text, isError = false) => {
        const ts = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
        setMessages(prev => [...prev, { id: Date.now(), role: 'bot', text, timestamp: ts, isError }]);
    };

    const doSync = async () => {
        setSyncing(true);
        try {
            const resp = await fetch(`${RAG_API_BASE}/api/rag/sync`, { method: 'POST' });
            const data = await resp.json();
            localStorage.setItem('rag_memory_id', data.memory_id);
            setMemoryId(data.memory_id);
            addBotMsg(`✅ Synced ${data.records_synced} detections!`);
        } catch (e) { addBotMsg('❌ Sync failed.', true); }
        finally { setSyncing(false); }
    };

    const sendMessage = async (text) => {
        if (!text.trim() || loading) return;
        const ts = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
        setMessages(prev => [...prev, { id: Date.now(), role: 'user', text, timestamp: ts }]);
        setInput('');
        setLoading(true);
        try {
            const resp = await fetch(`${RAG_API_BASE}/api/rag/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: text, memory_id: memoryId }),
            });
            const data = await resp.json();
            addBotMsg(data.answer || 'No response.');
        } catch (e) { addBotMsg('❌ Error.', true); }
        finally { setLoading(false); }
    };

    return (
        <>
            <button onClick={() => setOpen(!open)} style={{ position: 'fixed', bottom: '28px', right: '28px', width: '60px', height: '60px', borderRadius: '50%', backgroundColor: '#ffffff', border: 'none', cursor: 'pointer', fontSize: '24px', zIndex: 10000, boxShadow: '0 4px 20px rgba(255,255,255,0.1)' }}>
                {open ? '✕' : '💬'}
            </button>
            {open && (
                <div style={{ position: 'fixed', bottom: '100px', right: '24px', width: '350px', height: '500px', backgroundColor: '#0f1520', border: '1px solid #1e2d3d', borderRadius: '20px', display: 'flex', flexDirection: 'column', zIndex: 10000, overflow: 'hidden', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }}>
                    <div style={{ padding: '15px', borderBottom: '1px solid #1e2d3d', background: '#111827', color: '#fff', fontWeight: 'bold' }}>Traffic AI Assistant</div>
                    <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '15px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {messages.map(m => (
                            <div key={m.id} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', backgroundColor: m.role === 'user' ? '#00d4ff22' : '#1a2234', padding: '10px', borderRadius: '10px', maxWidth: '80%', fontSize: '13px' }}>
                                {m.text}
                            </div>
                        ))}
                    </div>
                    <div style={{ padding: '10px', borderTop: '1px solid #1e2d3d', display: 'flex', gap: '5px' }}>
                        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage(input)} style={{ flex: 1, background: '#1a2234', border: '1px solid #1e2d3d', color: '#fff', padding: '8px', borderRadius: '5px' }} placeholder="Ask me anything..." />
                        <button onClick={() => sendMessage(input)} style={{ background: '#00d4ff', border: 'none', padding: '8px 15px', borderRadius: '5px', cursor: 'pointer' }}>➤</button>
                    </div>
                </div>
            )}
        </>
    );
};

// --- SUB-COMPONENTS ---
const ProjectCard = ({ project, isHovered, onHover, onLeave, onEdit, onDelete }) => {
    const navigate = useNavigate();
    const category = PROJECT_CATEGORIES.find(c => c.id === project.category);
    return (
        <div 
            style={{ ...STYLES.projectCard, borderColor: isHovered ? '#00d4ff88' : '#1e2d3d', transform: isHovered ? 'translateY(-4px)' : 'none' }}
            onMouseEnter={onHover} onMouseLeave={onLeave} onClick={() => navigate(`/traffic-ai/project/${project.id}`)}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={STYLES.categoryIcon}>{category?.icon || '📁'}</div>
                <div style={STYLES.badge('#64748b')}>{project.subcategory}</div>
            </div>
            <div>
                <div style={STYLES.cardName}>{project.name}</div>
                <div style={STYLES.cardDesc}>{project.description}</div>
            </div>
            <div style={{ display: 'flex', gap: '5px', marginTop: 'auto' }}>
                {DETECTION_MODES.map(m => <div key={m.key} style={STYLES.triggerIcon(m.color)}>{m.icon}</div>)}
            </div>
            {isHovered && (
                <div style={{ position: 'absolute', top: '15px', right: '15px', display: 'flex', gap: '5px' }}>
                    <button onClick={(e) => { e.stopPropagation(); onEdit(); }}>✏️</button>
                    <button onClick={(e) => { e.stopPropagation(); onDelete(); }}>🗑️</button>
                </div>
            )}
        </div>
    );
};

// --- MAIN SECTION COMPONENT ---
const TrafficAISection = () => {
    const [projects, setProjects] = useState(() => JSON.parse(localStorage.getItem('traffic_sources') || '[]'));
    const [catFilter, setCatFilter] = useState('all');
    const [hoveredId, setHoveredId] = useState(null);
    const [showModal, setShowModal] = useState(false);

    useEffect(() => { localStorage.setItem('traffic_sources', JSON.stringify(projects)); }, [projects]);

    const filtered = projects.filter(p => catFilter === 'all' || p.category === catFilter);

    return (
        <div style={STYLES.container}>
            <div style={STYLES.headerRow}>
                <h1 style={STYLES.pageTitle}>Traffic AI Workspace</h1>
                <button style={STYLES.addSourceBtn} onClick={() => setShowModal(true)}>+ New Project</button>
            </div>

            <div style={STYLES.filterContainer}>
                <div style={STYLES.filterTabs}>
                    <button style={STYLES.filterTab(catFilter === 'all')} onClick={() => setCatFilter('all')}>ALL</button>
                    {PROJECT_CATEGORIES.map(c => (
                        <button key={c.id} style={STYLES.filterTab(catFilter === c.id)} onClick={() => setCatFilter(c.id)}>
                            {c.icon} {c.label}
                        </button>
                    ))}
                </div>
            </div>

            <div style={STYLES.projectGrid}>
                {filtered.map(p => (
                    <ProjectCard 
                        key={p.id} project={p} isHovered={hoveredId === p.id} 
                        onHover={() => setHoveredId(p.id)} onLeave={() => setHoveredId(null)}
                        onDelete={() => setProjects(prev => prev.filter(x => x.id !== p.id))}
                    />
                ))}
            </div>

            <RAGChatbot />

            {/* Modal simple implementation */}
            {showModal && (
                <div style={STYLES.modalOverlay} onClick={() => setShowModal(false)}>
                    <div style={STYLES.modalContent} onClick={e => e.stopPropagation()}>
                        <h2>Add New Project</h2>
                        <input style={STYLES.input} placeholder="Project Name" id="p-name" />
                        <select style={STYLES.input} id="p-cat">
                            {PROJECT_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                        </select>
                        <button style={STYLES.runBtn(false)} onClick={() => {
                            const name = document.getElementById('p-name').value;
                            const category = document.getElementById('p-cat').value;
                            if (name) {
                                setProjects([...projects, { id: Date.now().toString(), name, category, subcategory: 'General', description: 'New project space' }]);
                                setShowModal(false);
                            }
                        }}>Save Project</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TrafficAISection;
