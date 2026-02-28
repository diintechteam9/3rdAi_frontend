import { ref, onMounted } from 'vue';
import PartnerCases from './PartnerCases.jsx';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export default {
    name: 'PartnerAlerts',
    setup() {
        const activeTab = ref('CLIENT'); // 'CLIENT' or 'USER'
        const alerts = ref([]);
        const loading = ref(true);
        const error = ref('');

        const priorityConfig = {
            critical: { bg: '#fee2e2', border: '#fca5a5', color: '#991b1b', badge: '#ef4444', label: '🚨 Critical' },
            high: { bg: '#fff7ed', border: '#fed7aa', color: '#9a3412', badge: '#f97316', label: '🔴 High' },
            medium: { bg: '#fefce8', border: '#fde68a', color: '#92400e', badge: '#f59e0b', label: '🟡 Medium' },
            low: { bg: '#eff6ff', border: '#bfdbfe', color: '#1e40af', badge: '#3b82f6', label: '🔵 Low' }
        };

        const fetchAlerts = async () => {
            if (activeTab.value === 'USER') return;
            loading.value = true;
            error.value = '';
            try {
                const token = localStorage.getItem('partner_token');
                const res = await fetch(`${API_BASE_URL}/alerts/partner?limit=50&type=${activeTab.value}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const data = await res.json();
                if (data.success) {
                    alerts.value = data.data.alerts || [];
                } else {
                    error.value = 'Failed to load alerts';
                }
            } catch (e) {
                error.value = 'Network error loading alerts';
                console.error(e);
            } finally {
                loading.value = false;
            }
        };

        onMounted(fetchAlerts);

        const setTab = (tab) => {
            activeTab.value = tab;
            if (tab === 'CLIENT') {
                alerts.value = [];
                fetchAlerts();
            }
        };

        const renderContent = () => {
            if (activeTab.value === 'USER') {
                return (
                    <div style={{ height: '100%', width: '100%', overflow: 'hidden' }}>
                        <PartnerCases />
                    </div>
                );
            }

            if (loading.value) {
                return (
                    <div style={{ textAlign: 'center', padding: '100px 24px', color: '#64748b' }}>
                        <div style={{ width: '32px', height: '32px', border: '3px solid #e2e8f0', borderTopColor: '#4f46e5', borderRadius: '50%', display: 'inline-block', animation: 'spin 1s linear infinite', marginBottom: '16px' }}></div>
                        <div style={{ fontWeight: '600' }}>Loading device alerts...</div>
                    </div>
                );
            }

            if (error.value) {
                return (
                    <div style={{ textAlign: 'center', padding: '48px 24px' }}>
                        <div style={{ color: '#ef4444', background: '#fee2e2', borderRadius: '12px', padding: '16px', display: 'inline-block', maxWidth: '400px' }}>
                            {error.value}
                        </div>
                    </div>
                );
            }

            if (alerts.value.length === 0) {
                return (
                    <div style={{ textAlign: 'center', padding: '80px 24px', color: '#94a3b8' }}>
                        <div style={{ fontSize: '64px', marginBottom: '16px' }}>🏢</div>
                        <h3 style={{ margin: '0 0 8px', fontSize: '18px', color: '#1e293b', fontWeight: '700' }}>No Client Alerts</h3>
                        <p style={{ margin: 0, fontSize: '14px' }}>There are no active alerts from connected devices.</p>
                    </div>
                );
            }

            return (
                <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {alerts.value.map((alert) => {
                            const cfg = priorityConfig[alert.priority] || priorityConfig.medium;
                            return (
                                <div key={alert._id} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'flex-start', gap: '16px', transition: 'all 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: cfg.badge, marginTop: '6px', flexShrink: 0, boxShadow: `0 0 0 4px ${cfg.bg}` }} />
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '8px', flexWrap: 'wrap' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <h3 style={{ fontWeight: '700', color: '#1e293b', fontSize: '16px', margin: 0 }}>{alert.title}</h3>
                                                <span style={{ fontSize: '10px', fontWeight: '800', color: cfg.color, background: cfg.bg, padding: '2px 8px', borderRadius: '999px', border: `1px solid ${cfg.border}`, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{alert.priority}</span>
                                            </div>
                                            <span style={{ color: '#64748b', fontSize: '12px', fontWeight: '500' }}>
                                                {new Date(alert.createdAt).toLocaleString('en-IN', {
                                                    weekday: 'short', month: 'short', day: 'numeric',
                                                    hour: '2-digit', minute: '2-digit', hour12: true
                                                })}
                                            </span>
                                        </div>
                                        <p style={{ margin: 0, color: '#475569', fontSize: '14px', lineHeight: '1.6' }}>{alert.message}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            );
        };

        return () => (
            <div style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column', background: '#f8fafc', fontFamily: "'Inter', sans-serif" }}>
                <style>{`
                    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
                    @keyframes spin { to { transform: rotate(360deg); } }
                    
                    /* Custom Premium Scrollbar */
                    ::-webkit-scrollbar {
                        width: 6px;
                        height: 6px;
                    }
                    ::-webkit-scrollbar-track {
                        background: transparent;
                    }
                    ::-webkit-scrollbar-thumb {
                        background: #e2e8f0;
                        border-radius: 10px;
                    }
                    ::-webkit-scrollbar-thumb:hover {
                        background: #cbd5e1;
                    }

                    .tab-btn-main {
                        padding: 16px 0;
                        font-size: 13px;
                        font-weight: 700;
                        cursor: pointer;
                        border: none;
                        background: transparent;
                        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        position: relative;
                        bottom: -1px;
                    }
                    .tab-btn-main::after {
                        content: '';
                        position: absolute;
                        bottom: 0;
                        left: 0;
                        right: 0;
                        height: 2px;
                        background: #4f46e5;
                        transform: scaleX(0);
                        transition: transform 0.3s ease;
                        border-radius: 2px;
                    }
                    .tab-btn-main.active {
                        color: #4f46e5 !important;
                    }
                    .tab-btn-main.active::after {
                        transform: scaleX(1);
                    }
                `}</style>

                {/* Main Content Area */}
                <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    {/* Integrated Tab Bar */}
                    <div style={{ background: 'white', borderBottom: '1px solid #e2e8f0', padding: '0 24px', flexShrink: 0, display: 'flex', alignItems: 'center', height: '56px', gap: '32px' }}>
                        <button
                            onClick={() => setTab('CLIENT')}
                            class={['tab-btn-main', activeTab.value === 'CLIENT' ? 'active' : ''].join(' ')}
                            style={{ color: activeTab.value === 'CLIENT' ? '#4f46e5' : '#64748b' }}
                        >
                            <span style={{ fontSize: '16px' }}>🏢</span> Device Alerts
                        </button>
                        <button
                            onClick={() => setTab('USER')}
                            class={['tab-btn-main', activeTab.value === 'USER' ? 'active' : ''].join(' ')}
                            style={{ color: activeTab.value === 'USER' ? '#4f46e5' : '#64748b' }}
                        >
                            <span style={{ fontSize: '16px' }}>👥</span> Citizen Reports
                        </button>

                        <div style={{ flex: 1 }}></div>

                        {activeTab.value === 'CLIENT' && (
                            <button
                                onClick={fetchAlerts}
                                style={{
                                    fontSize: '12px',
                                    fontWeight: '600',
                                    color: '#4f46e5',
                                    background: '#eef2ff',
                                    border: '1px solid #c7d2fe',
                                    padding: '6px 14px',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                ↻ Refresh
                            </button>
                        )}
                    </div>

                    {/* Content Scroll Area */}
                    <div style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
                        {renderContent()}
                    </div>
                </div>
            </div>
        );
    }
};
