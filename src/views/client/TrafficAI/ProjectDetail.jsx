import { ref, onMounted, watch, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const PROJECT_CATEGORIES = [
    { id: 'traffic', label: 'Traffic', icon: '🚦' },
    { id: 'parking', label: 'Parking', icon: '🅿️' },
    { id: 'campus', label: 'Campus', icon: '🏢' },
    { id: 'commercial', label: 'Commercial', icon: '🏪' },
    { id: 'residential', label: 'Residential', icon: '🏘️' },
    { id: 'industrial', label: 'Industrial', icon: '🏭' },
];

const STYLES = {
    container: { padding: '24px', backgroundColor: '#0a0f1a', minHeight: '100vh', color: '#e2e8f0' },
    backBtn: { background: 'transparent', border: '1px solid #1e2d3d', color: '#64748b', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 'bold', transition: 'all 0.2s' },
    header: { marginBottom: '40px' },
    pageTitle: { fontSize: '32px', fontWeight: 'bold', color: '#fff', marginBottom: '12px' },
    badgeRow: { display: 'flex', gap: '8px' },
    badge: { fontSize: '11px', fontWeight: 'bold', padding: '4px 12px', borderRadius: '6px', backgroundColor: 'rgba(0, 212, 255, 0.1)', color: '#00d4ff', border: '1px solid rgba(0, 212, 255, 0.2)', textTransform: 'uppercase' },
    tabBar: { display: 'flex', gap: '32px', borderBottom: '1px solid #1e2d3d', marginBottom: '40px' },
    tab: (active) => ({ padding: '12px 0', fontSize: '15px', fontWeight: 'bold', color: active ? '#00d4ff' : '#64748b', borderBottom: active ? '2px solid #00d4ff' : '2px solid transparent', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '8px' }),
    rowContainer: { display: 'flex', flexDirection: 'column', gap: '16px' },
    navRow: { backgroundColor: '#0f1520', borderRadius: '16px', border: '1px solid #1e2d3d', borderLeft: '4px solid transparent', padding: '20px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'all 0.3s ease', cursor: 'pointer' },
    rowLeft: { display: 'flex', alignItems: 'center', gap: '24px' },
    rowIcon: { fontSize: '28px', width: '56px', height: '56px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    rowInfo: { display: 'flex', flexDirection: 'column', gap: '2px' },
    rowTitle: { fontSize: '18px', fontWeight: 'bold', color: '#fff' },
    rowAdded: { fontSize: '13px', color: '#64748b', marginTop: '2px' },
    rowMeta: { fontSize: '12px', fontWeight: 'bold', color: '#00d4ff', textTransform: 'uppercase', marginTop: '2px', letterSpacing: '0.5px' },
    addBtn: { backgroundColor: '#1a2234', border: '1px solid #1e2d3d', color: '#00d4ff', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s' },
    topActions: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
    menuBtn: { background: 'transparent', border: 'none', color: '#64748b', fontSize: '20px', cursor: 'pointer', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', transition: 'all 0.2s' },
    dropdown: { position: 'absolute', top: '100%', right: 0, backgroundColor: '#1a2234', border: '1px solid #1e2d3d', borderRadius: '12px', padding: '8px', zIndex: 100, minWidth: '130px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', gap: '4px' },
    menuItem: { padding: '10px 16px', borderRadius: '8px', fontSize: '14px', color: '#e2e8f0', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', transition: 'all 0.2s' }
};

const AddSourceModal = {
    props: ['initialData'],
    setup(props, { emit }) {
        const name = ref(props.initialData?.name || '');
        const desc = ref(props.initialData?.description || '');
        const type = ref(props.initialData?.type || 'camera');

        return () => (
            <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
                <div style={{ backgroundColor: '#0f1520', width: '450px', borderRadius: '24px', border: '1px solid #1e2d3d', padding: '32px', boxShadow: '0 20px 50px rgba(0,0,0,0.5)', position: 'relative' }}>
                    <button
                        style={{ position: 'absolute', top: '24px', right: '24px', background: 'transparent', border: 'none', color: '#64748b', fontSize: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px' }}
                        onClick={() => emit('cancel')}
                    >
                        ✕
                    </button>
                    <h2 style={{ color: '#fff', fontSize: '24px', marginBottom: '24px', fontWeight: 'bold' }}>{props.initialData ? 'Edit Source' : '+ Add New Source'}</h2>

                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', color: '#64748b', fontSize: '12px', fontWeight: 'bold', marginBottom: '8px', textTransform: 'uppercase' }}>Source Name</label>
                        <input
                            style={{ width: '100%', backgroundColor: '#0a0f1a', border: '1px solid #1e2d3d', borderRadius: '12px', padding: '12px 16px', color: '#fff', fontSize: '14px', outline: 'none' }}
                            placeholder="e.g. Main Entry Cam"
                            value={name.value} onInput={(e) => name.value = e.target.value}
                        />
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', color: '#64748b', fontSize: '12px', fontWeight: 'bold', marginBottom: '8px', textTransform: 'uppercase' }}>Description</label>
                        <textarea
                            style={{ width: '100%', backgroundColor: '#0a0f1a', border: '1px solid #1e2d3d', borderRadius: '12px', padding: '12px 16px', color: '#fff', fontSize: '14px', outline: 'none', minHeight: '80px', resize: 'none' }}
                            placeholder="Brief description of this source..."
                            value={desc.value} onInput={(e) => desc.value = e.target.value}
                        />
                    </div>

                    <div style={{ marginBottom: '32px' }}>
                        <label style={{ display: 'block', color: '#64748b', fontSize: '12px', fontWeight: 'bold', marginBottom: '8px', textTransform: 'uppercase' }}>Select Type</label>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button
                                style={{ flex: 1, padding: '14px', borderRadius: '12px', border: type.value === 'camera' ? '1px solid #00d4ff' : '1px solid #1e2d3d', backgroundColor: type.value === 'camera' ? 'rgba(0, 212, 255, 0.05)' : '#0a0f1a', color: type.value === 'camera' ? '#00d4ff' : '#64748b', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}
                                onClick={() => type.value = 'camera'}
                            >
                                <span>📷</span>
                                <span>CCTV CAMERA</span>
                            </button>
                            <button
                                style={{ flex: 1, padding: '14px', borderRadius: '12px', border: type.value === 'video' ? '1px solid #a855f7' : '1px solid #1e2d3d', backgroundColor: type.value === 'video' ? 'rgba(168, 85, 247, 0.05)' : '#0a0f1a', color: type.value === 'video' ? '#a855f7' : '#64748b', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}
                                onClick={() => type.value = 'video'}
                            >
                                <span>🎬</span>
                                <span>VIDEO FILE</span>
                            </button>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button style={{ flex: 1, padding: '14px', borderRadius: '12px', backgroundColor: '#00d4ff', color: '#000', border: 'none', fontWeight: 'bold', cursor: 'pointer' }} onClick={() => emit('save', { name: name.value, description: desc.value, type: type.value })}>
                            {props.initialData ? 'Update Source' : 'Add Source'}
                        </button>
                        <button style={{ flex: 1, padding: '14px', borderRadius: '12px', backgroundColor: 'transparent', color: '#64748b', border: '1px solid #1e2d3d', fontWeight: 'bold', cursor: 'pointer' }} onClick={() => emit('cancel')}>Cancel</button>
                    </div>
                </div>
            </div>
        )
    }
};

export default {
    name: 'ProjectDetail',
    setup() {
        const route = useRoute();
        const router = useRouter();
        const sourceId = computed(() => route.params.sourceId);
        const activeTab = ref('ALL');
        const showModal = ref(false);
        const editingSource = ref(null);
        const openMenuId = ref(null);

        const DEFAULT_PROJECT_SOURCES = [
            { id: 'cam-1', name: 'Highway Surveillance', type: 'camera', createdAt: '2026-03-10T14:22:00.000Z', description: 'Main CCTV feed' },
            { id: 'vid-1', name: 'Highway Surveillance', type: 'video', createdAt: '2026-03-10T14:22:00.000Z', description: 'Uploaded footage' }
        ];

        const sources = ref([]);

        onMounted(() => {
            const saved = localStorage.getItem('project_sources_' + sourceId.value);
            try {
                sources.value = saved ? JSON.parse(saved) : DEFAULT_PROJECT_SOURCES;
            } catch (e) {
                sources.value = DEFAULT_PROJECT_SOURCES;
            }
        });

        watch(() => sources.value, (newS) => {
            localStorage.setItem('project_sources_' + sourceId.value, JSON.stringify(newS));
        }, { deep: true });

        const formatDate = (dateStr) => {
            try {
                const date = new Date(dateStr);
                if (isNaN(date.getTime())) return 'Recently added';
                return new Intl.DateTimeFormat('en-IN', {
                    day: '2-digit', month: 'short', year: 'numeric',
                    hour: '2-digit', minute: '2-digit', hour12: true
                }).format(date);
            } catch (e) { return 'Recently added'; }
        };

        const projectName = computed(() => {
            try {
                const trafficSources = JSON.parse(localStorage.getItem('traffic_sources') || '[]');
                const currentProject = trafficSources.find(p => p.id === sourceId.value);
                if (currentProject?.name) return currentProject.name;
            } catch (e) { }
            return sources.value.length > 0 ? sources.value[0].name : 'Project Detail';
        });

        const category = computed(() => {
            try {
                const trafficSources = JSON.parse(localStorage.getItem('traffic_sources') || '[]');
                const currentProject = trafficSources.find(p => p.id === sourceId.value);
                return PROJECT_CATEGORIES.find(c => c.id === currentProject?.category) || PROJECT_CATEGORIES[0];
            } catch (e) { return PROJECT_CATEGORIES[0]; }
        });

        const handleNav = (type, sourceItemId) => {
            router.push(`/client/traffic-ai/${type}/${sourceId.value}`);
        };

        const handleAddSource = (data) => {
            if (editingSource.value) {
                sources.value = sources.value.map(s => s.id === editingSource.value.id ? { ...s, ...data } : s);
                editingSource.value = null;
            } else {
                const newSource = {
                    id: `new-${Date.now()}`,
                    name: data.name,
                    description: data.description,
                    type: data.type,
                    createdAt: new Date().toISOString()
                };
                sources.value = [newSource, ...sources.value];
            }
            showModal.value = false;
        };

        const deleteSource = (id, name) => {
            if (confirm(`Delete this source? \n\nSource: ${name}`)) {
                sources.value = sources.value.filter(s => s.id !== id);
                openMenuId.value = null;
            }
        };

        const TRIGGER_ICONS = [
            { icon: '🔢', color: '#00d4ff' }, { icon: '⛑️', color: '#ff4d6d' },
            { icon: '↩️', color: '#ff9900' }, { icon: '👥', color: '#a855f7' },
            { icon: '🛑', color: '#ef4444' }, { icon: '🔒', color: '#f59e0b' },
            { icon: '🚨', color: '#10b981' },
        ];

        return () => (
            <div style={STYLES.container}>
                <div style={STYLES.topActions}>
                    <button style={{ ...STYLES.backBtn, marginBottom: 0 }} onClick={() => router.push('/client/services')}>
                        ← Back to Workspace
                    </button>
                    <button style={STYLES.addBtn} onClick={() => { editingSource.value = null; showModal.value = true; }}>
                        + Add Source
                    </button>
                </div>

                <div style={STYLES.header}>
                    <h1 style={STYLES.pageTitle}>{projectName.value}</h1>
                    <div style={STYLES.badgeRow}>
                        <div style={STYLES.badge}>{category.value?.icon} {category.value?.label}</div>
                        <div style={{ ...STYLES.badge, backgroundColor: 'rgba(255,255,255,0.03)', color: '#64748b', border: '1px solid #1e2d3d' }}>
                            Project Sources
                        </div>
                    </div>
                </div>

                <div style={STYLES.tabBar}>
                    <div style={STYLES.tab(activeTab.value === 'ALL')} onClick={() => activeTab.value = 'ALL'}>✦ ALL</div>
                    <div style={STYLES.tab(activeTab.value === 'CAMERA')} onClick={() => activeTab.value = 'CAMERA'}>📷 CAMERA</div>
                    <div style={STYLES.tab(activeTab.value === 'VIDEO')} onClick={() => activeTab.value = 'VIDEO'}>🎬 VIDEO</div>
                </div>

                <div style={STYLES.rowContainer}>
                    {sources.value
                        .filter(s => activeTab.value === 'ALL' || s.type === activeTab.value.toLowerCase())
                        .map(source => (
                            <div
                                key={source.id}
                                style={STYLES.navRow}
                                onClick={() => handleNav(source.type, source.id)}
                            >
                                <div style={STYLES.rowLeft}>
                                    <div style={STYLES.rowIcon}>{source.type === 'camera' ? '📷' : '🎬'}</div>
                                    <div style={STYLES.rowInfo}>
                                        <div style={STYLES.rowTitle}>{source.name}</div>
                                        <div style={STYLES.rowAdded}>Added: {formatDate(source.createdAt)}</div>
                                        <div style={STYLES.rowMeta}>{source.type} • {category.value?.label}</div>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                                    <div style={{ display: 'flex', gap: '6px' }}>
                                        {TRIGGER_ICONS.map((t, idx) => (
                                            <div key={idx} style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', border: `1px solid ${t.color}33`, color: t.color }}>
                                                {t.icon}
                                            </div>
                                        ))}
                                    </div>

                                    <div style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
                                        <button style={STYLES.menuBtn} onClick={() => openMenuId.value = openMenuId.value === source.id ? null : source.id}>⋮</button>
                                        {openMenuId.value === source.id && (
                                            <div style={STYLES.dropdown}>
                                                <div style={STYLES.menuItem} onClick={() => { editingSource.value = source; showModal.value = true; openMenuId.value = null; }}>✏️ Edit</div>
                                                <div style={{ ...STYLES.menuItem, color: '#ef4444' }} onClick={() => deleteSource(source.id, source.name)}>🗑️ Delete</div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                </div>

                {showModal.value && (
                    <AddSourceModal
                        initialData={editingSource.value}
                        onSave={handleAddSource}
                        onCancel={() => { showModal.value = false; editingSource.value = null; }}
                    />
                )}
            </div>
        )
    }
}
