import { ref, watch, onMounted } from 'vue';
import { useRouter } from 'vue-router';

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

const STYLES = {
    container: { padding: '24px', backgroundColor: '#0a0f1a', minHeight: '100vh', color: '#e2e8f0', fontFamily: 'inherit' },
    headerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
    pageTitle: { fontSize: '24px', fontWeight: 'bold', color: '#e2e8f0', margin: 0, textTransform: 'uppercase', letterSpacing: '1px' },
    addSourceBtn: { backgroundColor: '#00d4ff', color: '#0a0f1a', border: 'none', borderRadius: '8px', padding: '12px 24px', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0, 212, 255, 0.3)', transition: 'all 0.2s' },
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
};

// --- CHATBOT WIDGET ---
const RAG_API_BASE = import.meta.env.VITE_TRAFFIC_API_URL || 'https://histolytic-unpregnant-cary.ngrok-free.dev';

const RAGChatbot = {
    setup() {
        const isOpen = ref(false);
        const iframeUrl = "https://test.3rdai.co/memory-chat-public?id=mem-9ad11c9da8d0a764&direct=1";

        return () => (
            <>
                <button 
                  onClick={() => isOpen.value = !isOpen.value} 
                  style={{ position: 'fixed', bottom: '28px', right: '28px', width: '60px', height: '60px', borderRadius: '50%', backgroundColor: '#00d4ff', border: 'none', cursor: 'pointer', fontSize: '24px', zIndex: 10000, boxShadow: '0 4px 20px rgba(0,212,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                    {isOpen.value ? '✕' : '💬'}
                </button>
                {isOpen.value && (
                    <div style={{ position: 'fixed', top: '10vh', right: '40px', width: '450px', height: '80vh', zIndex: 10000, boxShadow: '0 20px 60px rgba(0,0,0,0.6)', borderRadius: '16px', overflow: 'hidden', backgroundColor: '#0f1520', border: '1px solid #1e2d3d' }}>
                        <div style={{ padding: '12px 20px', background: '#111827', borderBottom: '1px solid #1e2d3d', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: '#fff', fontWeight: 'bold', fontSize: '14px' }}>3rdAi RAG Assistant</span>
                            <button onClick={() => isOpen.value = false} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '18px' }}>✕</button>
                        </div>
                        <iframe 
                            src={iframeUrl} 
                            style={{ width: '100%', height: 'calc(100% - 45px)', border: 'none' }} 
                            allow="microphone; clipboard-write"
                        />
                    </div>
                )}
            </>
        )
    }
};

export default {
    name: 'Device',
    setup() {
        const router = useRouter();
        const projects = ref(JSON.parse(localStorage.getItem('traffic_sources') || '[]'));
        const catFilter = ref('all');
        const showModal = ref(false);
        const hoveredId = ref(null);

        const newProject = ref({
            name: '',
            category: 'traffic',
            subcategory: 'General',
            description: ''
        });

        watch(projects, (newP) => {
            localStorage.setItem('traffic_sources', JSON.stringify(newP));
        }, { deep: true });

        const backendStatus = ref('checking');
        const checkHealth = async () => {
            console.log("Checking RAG Backend at:", RAG_API_BASE);
            try {
                const res = await fetch(`${RAG_API_BASE}/`, { headers: { 'ngrok-skip-browser-warning': 'true' } });
                backendStatus.value = res.ok ? 'online' : 'offline';
            } catch (e) {
                backendStatus.value = 'offline';
                console.warn("Backend Unreachable:", e);
            }
        };

        onMounted(checkHealth);

        const addProject = () => {
            if (!newProject.value.name) return;
            const proj = {
                id: Date.now().toString(),
                ...newProject.value,
                createdAt: new Date().toISOString()
            };
            projects.value = [proj, ...projects.value];
            showModal.value = false;
            newProject.value = { name: '', category: 'traffic', subcategory: 'General', description: '' };
        };

        const deleteProject = (id) => {
            if (confirm('Are you sure you want to delete this project?')) {
                projects.value = projects.value.filter(p => p.id !== id);
            }
        };

        return () => (
            <div style={STYLES.container}>
                <div style={STYLES.headerRow}>
                    <div>
                        <h1 style={STYLES.pageTitle}>Traffic AI Workspace</h1>
                        <div style={{ fontSize: '12px', color: backendStatus.value === 'online' ? '#10b981' : '#ef4444', fontWeight: 'bold', marginTop: '4px' }}>
                            {backendStatus.value === 'online' ? '● BACKEND ONLINE' : '○ BACKEND OFFLINE / RECONNECTING'}
                        </div>
                    </div>
                    <button style={STYLES.addSourceBtn} onClick={() => showModal.value = true}>+ New Project</button>
                </div>

                <div style={STYLES.filterContainer}>
                    <div style={STYLES.filterTabs}>
                        <button 
                          style={STYLES.filterTab(catFilter.value === 'all')} 
                          onClick={() => catFilter.value = 'all'}
                        >
                          ALL
                        </button>
                        {PROJECT_CATEGORIES.map(c => (
                            <button key={c.id} style={STYLES.filterTab(catFilter.value === c.id)} onClick={() => catFilter.value = c.id}>
                                {c.icon} {c.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div style={STYLES.projectGrid}>
                    {projects.value
                        .filter(p => catFilter.value === 'all' || p.category === catFilter.value)
                        .map(p => {
                            const category = PROJECT_CATEGORIES.find(c => c.id === p.category);
                            return (
                                <div
                                    key={p.id}
                                    style={{ 
                                        ...STYLES.projectCard, 
                                        borderColor: hoveredId.value === p.id ? '#00d4ff88' : '#1e2d3d',
                                        transform: hoveredId.value === p.id ? 'translateY(-4px)' : 'none'
                                    }}
                                    onMouseenter={() => hoveredId.value = p.id}
                                    onMouseleave={() => hoveredId.value = null}
                                    onClick={() => router.push(`/client/traffic-ai/project/${p.id}`)}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <div style={STYLES.categoryIcon}>{category?.icon || '📁'}</div>
                                        <div style={STYLES.badge('#64748b')}>{p.subcategory}</div>
                                    </div>
                                    <div>
                                        <div style={STYLES.cardName}>{p.name}</div>
                                        <div style={STYLES.cardDesc}>{p.description || 'No description provided.'}</div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '5px', marginTop: 'auto' }}>
                                        {DETECTION_MODES.slice(0, 5).map(m => (
                                            <div key={m.key} style={STYLES.triggerIcon(m.color)} title={m.label}>{m.icon}</div>
                                        ))}
                                    </div>
                                    {hoveredId.value === p.id && (
                                        <div style={{ position: 'absolute', top: '15px', right: '15px', display: 'flex', gap: '5px' }}>
                                            <button style={{ background: 'transparent', border: 'none', cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); deleteProject(p.id); }}>🗑️</button>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    }
                </div>

                <RAGChatbot />

                {showModal.value && (
                    <div style={STYLES.modalOverlay} onClick={() => showModal.value = false}>
                        <div style={STYLES.modalContent} onClick={e => e.stopPropagation()}>
                            <h2 style={{ color: '#fff', marginBottom: '24px' }}>Add New Project</h2>
                            
                            <label style={{ color: '#64748b', fontSize: '10px', fontWeight: 'bold', marginBottom: '8px', display: 'block', textTransform: 'uppercase' }}>Project Name</label>
                            <input style={STYLES.input} value={newProject.value.name} onInput={e => newProject.value.name = e.target.value} placeholder="e.g. Highway Monitoring" />
                            
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                                <div>
                                    <label style={{ color: '#64748b', fontSize: '10px', fontWeight: 'bold', marginBottom: '8px', display: 'block', textTransform: 'uppercase' }}>Category</label>
                                    <select style={{ ...STYLES.input, marginBottom: 0 }} value={newProject.value.category} onChange={e => {
                                        newProject.value.category = e.target.value;
                                        const cat = PROJECT_CATEGORIES.find(c => c.id === e.target.value);
                                        newProject.value.subcategory = cat?.subcategories[0] || 'General';
                                    }}>
                                        {PROJECT_CATEGORIES.map(c => <option key={c.id} value={c.id} style={{ background: '#1a2234' }}>{c.label}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ color: '#64748b', fontSize: '10px', fontWeight: 'bold', marginBottom: '8px', display: 'block', textTransform: 'uppercase' }}>Subcategory</label>
                                    <select style={{ ...STYLES.input, marginBottom: 0 }} value={newProject.value.subcategory} onChange={e => newProject.value.subcategory = e.target.value}>
                                        {PROJECT_CATEGORIES.find(c => c.id === newProject.value.category)?.subcategories.map(s => (
                                            <option key={s} value={s} style={{ background: '#1a2234' }}>{s}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <label style={{ color: '#64748b', fontSize: '10px', fontWeight: 'bold', marginBottom: '8px', display: 'block', textTransform: 'uppercase' }}>Description</label>
                            <textarea 
                                style={{ ...STYLES.input, minHeight: '100px', resize: 'none' }} 
                                value={newProject.value.description} 
                                onInput={e => newProject.value.description = e.target.value} 
                                placeholder="Describe your project goals..."
                            />

                            <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                                <button style={{ ...STYLES.addSourceBtn, flex: 1 }} onClick={() => {
                                    const ts = new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
                                    addProject();
                                    // addProject inside uses newProject.value, let's inject date there
                                }}>Create Project</button>
                                <button style={{ ...STYLES.addSourceBtn, flex: 1, backgroundColor: 'transparent', color: '#64748b', border: '1px solid #1e2d3d' }} onClick={() => showModal.value = false}>Cancel</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        )
    }
}