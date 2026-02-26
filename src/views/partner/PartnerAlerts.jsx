import { ref, onMounted } from 'vue';

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
            loading.value = true;
            error.value = '';
            try {
                const token = localStorage.getItem('partner_token');
                // Fetch up to 50 active alerts for the "All Alerts" view, filtered by type
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
            alerts.value = [];
            fetchAlerts();
        };

        return () => (
            <div style="padding: 24px; max-width: 1000px; margin: 0 auto; font-family: 'Inter', 'Segoe UI', sans-serif;">
                <div style="background: white; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); border: 1px solid #f3f4f6; overflow: hidden;">
                    <div style="padding: 20px 24px; border-bottom: 1px solid #f3f4f6; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px;">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <span style="font-size: 24px;">🔔</span>
                            <div>
                                <h2 style="font-size: 18px; font-weight: 700; color: #1f2937; margin: 0;">All Alerts</h2>
                                <p style="font-size: 13px; color: #6b7280; margin: 2px 0 0;">Stay updated with the latest system and client alerts</p>
                            </div>
                        </div>
                        <button
                            onClick={fetchAlerts}
                            style="padding: 8px 16px; border-radius: 8px; border: 1px solid #e5e7eb; background: white; cursor: pointer; font-size: 13px; font-weight: 500; display: flex; align-items: center; gap: 6px; color: #4b5563; transition: all 0.2s;"
                            onMouseOver={e => e.currentTarget.style.background = '#f9fafb'}
                            onMouseOut={e => e.currentTarget.style.background = 'white'}
                        >
                            🔄 Refresh
                        </button>
                    </div>

                    {/* Tabs */}
                    <div style="display: flex; border-bottom: 1px solid #e5e7eb; background: #f9fafb; padding: 0 24px;">
                        <button
                            onClick={() => setTab('CLIENT')}
                            style={`padding: 14px 24px; font-size: 14px; font-weight: 600; cursor: pointer; border: none; background: transparent; transition: all 0.2s; border-bottom: 2px solid ${activeTab.value === 'CLIENT' ? '#4f46e5' : 'transparent'}; color: ${activeTab.value === 'CLIENT' ? '#4f46e5' : '#6b7280'};`}
                        >
                            🏢 Client Alerts
                        </button>
                        <button
                            onClick={() => setTab('USER')}
                            style={`padding: 14px 24px; font-size: 14px; font-weight: 600; cursor: pointer; border: none; background: transparent; transition: all 0.2s; border-bottom: 2px solid ${activeTab.value === 'USER' ? '#4f46e5' : 'transparent'}; color: ${activeTab.value === 'USER' ? '#4f46e5' : '#6b7280'};`}
                        >
                            👥 User Alerts
                        </button>
                    </div>

                    <div style="padding: 24px;">
                        {loading.value ? (
                            <div style="text-align: center; padding: 40px; color: #6b7280;">
                                <div style="width: 24px; height: 24px; border: 3px solid #e5e7eb; border-top-color: #4f46e5; border-radius: 50%; display: inline-block; animation: spin 1s linear infinite; margin: 0 auto 12px;"></div>
                                <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { to { transform: rotate(360deg); } }` }}></style>
                                <div>Loading alerts...</div>
                            </div>
                        ) : error.value ? (
                            <div style="text-align: center; padding: 40px; color: #ef4444; background: #fee2e2; border-radius: 8px;">
                                {error.value}
                            </div>
                        ) : alerts.value.length === 0 ? (
                            <div style="text-align: center; padding: 60px 20px; color: #9ca3af; border: 2px dashed #e5e7eb; border-radius: 12px; background: #f9fafb;">
                                <div style="font-size: 48px; margin-bottom: 16px;">{activeTab.value === 'CLIENT' ? '🏢' : '👥'}</div>
                                <h3 style="margin: 0 0 8px; font-size: 16px; color: #4b5563; font-weight: 600;">No {activeTab.value === 'CLIENT' ? 'Client' : 'User'} Alerts</h3>
                                <p style="margin: 0; font-size: 14px;">There are no active {activeTab.value.toLowerCase()} alerts right now.</p>
                            </div>
                        ) : (
                            <div style="display: flex; flex-direction: column; gap: 16px;">
                                {alerts.value.map((alert) => {
                                    const cfg = priorityConfig[alert.priority] || priorityConfig.medium;
                                    return (
                                        <div key={alert._id} style={`background: ${cfg.bg}; border: 1px solid ${cfg.border}; border-radius: 12px; padding: 20px; display: flex; align-items: flex-start; gap: 16px; transition: transform 0.2s, box-shadow 0.2s; cursor: default;`}
                                            onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'; }}
                                            onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                                        >
                                            <div style={`width: 10px; height: 10px; border-radius: 50%; background: ${cfg.badge}; margin-top: 6px; flex-shrink: 0; box-shadow: 0 0 0 4px white;`} />
                                            <div style="flex: 1; min-width: 0;">
                                                <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 8px; flex-wrap: wrap;">
                                                    <div style="display: flex; align-items: center; gap: 10px;">
                                                        <h3 style="font-weight: 600; color: #111827; font-size: 16px; margin: 0;">{alert.title}</h3>
                                                        <span style={`font-size: 11px; font-weight: 700; color: ${cfg.color}; background: white; padding: 2px 8px; border-radius: 999px; border: 1px solid ${cfg.border};`}>{cfg.label}</span>
                                                    </div>
                                                    <span style="color: #9ca3af; font-size: 12px; font-weight: 500;">
                                                        {new Date(alert.createdAt).toLocaleString(undefined, {
                                                            weekday: 'short', month: 'short', day: 'numeric',
                                                            hour: '2-digit', minute: '2-digit'
                                                        })}
                                                    </span>
                                                </div>
                                                <p style="margin: 0; color: #4b5563; font-size: 14px; line-height: 1.6;">{alert.message}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }
};
