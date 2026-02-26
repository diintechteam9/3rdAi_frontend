/**
 * AlertsManager.jsx
 * Client Tool — Create, manage and send Alerts to partners
 */
import { ref, onMounted } from 'vue';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export default {
    name: 'AlertsManager',
    setup() {
        const alerts = ref([]);
        const loading = ref(false);
        const submitting = ref(false);
        const deletingId = ref(null);

        const form = ref({ title: '', message: '', priority: 'medium' });
        const formError = ref('');
        const toast = ref({ show: false, msg: '', type: 'success' });

        const showToast = (msg, type = 'success') => {
            toast.value = { show: true, msg, type };
            setTimeout(() => toast.value.show = false, 3000);
        };

        const getToken = () =>
            localStorage.getItem('token_client') ||
            localStorage.getItem('token_admin') ||
            localStorage.getItem('token_super_admin');

        // ── Fetch alerts ─────────────────────────────────────────────────────────
        const fetchAlerts = async () => {
            loading.value = true;
            try {
                const res = await fetch(`${API_BASE_URL}/alerts`, {
                    headers: { Authorization: `Bearer ${getToken()}` }
                });
                const data = await res.json();
                if (data.success) alerts.value = data.data.alerts || [];
            } catch (e) {
                console.error('[AlertsManager] fetchAlerts:', e);
            } finally {
                loading.value = false;
            }
        };

        // ── Create alert ─────────────────────────────────────────────────────────
        const handleCreate = async () => {
            formError.value = '';
            if (!form.value.title.trim() || !form.value.message.trim()) {
                formError.value = 'Title aur Message dono required hain.';
                return;
            }
            submitting.value = true;
            try {
                const res = await fetch(`${API_BASE_URL}/alerts`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
                    body: JSON.stringify(form.value)
                });
                const data = await res.json();
                if (data.success) {
                    showToast('✅ Alert send hua!', 'success');
                    form.value = { title: '', message: '', priority: 'medium' };
                    await fetchAlerts();
                } else {
                    formError.value = data.message || 'Failed to create alert';
                }
            } catch (e) {
                formError.value = 'Network error';
            } finally {
                submitting.value = false;
            }
        };

        // ── Toggle active/inactive ───────────────────────────────────────────────
        const toggleActive = async (alert) => {
            try {
                const res = await fetch(`${API_BASE_URL}/alerts/${alert._id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
                    body: JSON.stringify({ isActive: !alert.isActive })
                });
                const data = await res.json();
                if (data.success) {
                    showToast(alert.isActive ? 'Alert deactivated' : 'Alert activated', 'success');
                    await fetchAlerts();
                }
            } catch (e) { console.error(e); }
        };

        // ── Delete alert ─────────────────────────────────────────────────────────
        const handleDelete = async (alertId) => {
            if (!confirm('Is alert ko delete karna hai?')) return;
            deletingId.value = alertId;
            try {
                const res = await fetch(`${API_BASE_URL}/alerts/${alertId}`, {
                    method: 'DELETE',
                    headers: { Authorization: `Bearer ${getToken()}` }
                });
                const data = await res.json();
                if (data.success) {
                    showToast('🗑️ Alert deleted', 'warning');
                    await fetchAlerts();
                }
            } catch (e) { console.error(e); } finally {
                deletingId.value = null;
            }
        };

        const priorityConfig = {
            critical: { color: '#ef4444', bg: '#fee2e2', label: '🚨 Critical' },
            high: { color: '#f97316', bg: '#fff7ed', label: '🔴 High' },
            medium: { color: '#f59e0b', bg: '#fefce8', label: '🟡 Medium' },
            low: { color: '#3b82f6', bg: '#eff6ff', label: '🔵 Low' }
        };

        onMounted(fetchAlerts);

        return () => (
            <div style={{ padding: '24px', fontFamily: "'Inter','Segoe UI',sans-serif" }}>
                {/* Toast */}
                {toast.value.show && (
                    <div style={{
                        position: 'fixed', top: '20px', right: '20px', zIndex: 9999,
                        padding: '14px 20px', borderRadius: '12px', fontSize: '14px', fontWeight: '600',
                        background: toast.value.type === 'success' ? '#d1fae5' : toast.value.type === 'warning' ? '#fef3c7' : '#fee2e2',
                        color: toast.value.type === 'success' ? '#065f46' : toast.value.type === 'warning' ? '#92400e' : '#991b1b',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.12)'
                    }}>
                        {toast.value.msg}
                    </div>
                )}

                {/* Header */}
                <div style={{ marginBottom: '28px' }}>
                    <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#111827', margin: '0 0 6px' }}>🔔 Alerts Manager</h1>
                    <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>Partners ko targeted alerts bhejein</p>
                </div>

                {/* Create Form */}
                <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e5e7eb', padding: '24px', marginBottom: '24px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', margin: '0 0 18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>➕</span> Naya Alert Create Karo
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                        <input
                            value={form.value.title}
                            onInput={e => form.value.title = e.target.value}
                            placeholder="Alert Title *"
                            style={{ padding: '11px 14px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', outline: 'none', gridColumn: 'span 2' }}
                        />
                        <textarea
                            rows={3}
                            value={form.value.message}
                            onInput={e => form.value.message = e.target.value}
                            placeholder="Alert message / description *"
                            style={{ padding: '11px 14px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', outline: 'none', resize: 'vertical', gridColumn: 'span 2', fontFamily: 'inherit' }}
                        />
                        <select
                            value={form.value.priority}
                            onChange={e => form.value.priority = e.target.value}
                            style={{ padding: '11px 14px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', outline: 'none' }}
                        >
                            <option value="low">🔵 Low</option>
                            <option value="medium">🟡 Medium</option>
                            <option value="high">🔴 High</option>
                            <option value="critical">🚨 Critical</option>
                        </select>
                        <button
                            onClick={handleCreate}
                            disabled={submitting.value}
                            style={{
                                padding: '11px 24px', borderRadius: '8px', border: 'none',
                                background: submitting.value ? '#d1d5db' : 'linear-gradient(135deg,#6366f1,#4f46e5)',
                                color: 'white', fontWeight: '600', fontSize: '14px',
                                cursor: submitting.value ? 'not-allowed' : 'pointer', transition: 'all 0.2s'
                            }}
                        >
                            {submitting.value ? 'Sending...' : '📤 Alert Send Karo'}
                        </button>
                    </div>
                    {formError.value && (
                        <p style={{ color: '#ef4444', fontSize: '13px', margin: 0 }}>{formError.value}</p>
                    )}
                </div>

                {/* Alerts List */}
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#374151', margin: 0 }}>
                            Saare Alerts ({alerts.value.length})
                        </h3>
                        <button onClick={fetchAlerts} style={{ padding: '6px 14px', borderRadius: '8px', border: '1px solid #e5e7eb', background: 'white', fontSize: '13px', cursor: 'pointer' }}>
                            🔄 Refresh
                        </button>
                    </div>

                    {loading.value ? (
                        <div style={{ textAlign: 'center', padding: '48px', color: '#9ca3af' }}>Loading...</div>
                    ) : alerts.value.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '48px', background: 'white', borderRadius: '14px', border: '1px solid #e5e7eb', color: '#9ca3af' }}>
                            <div style={{ fontSize: '40px', marginBottom: '10px' }}>🔔</div>
                            <p style={{ margin: 0 }}>Koi alert nahi hai abhi. Upar se create karo.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {alerts.value.map(alert => {
                                const cfg = priorityConfig[alert.priority] || priorityConfig.medium;
                                return (
                                    <div key={alert._id} style={{
                                        background: 'white', borderRadius: '12px',
                                        border: `1px solid ${alert.isActive ? cfg.color + '40' : '#e5e7eb'}`,
                                        padding: '16px 20px', display: 'flex', alignItems: 'flex-start', gap: '14px',
                                        opacity: alert.isActive ? 1 : 0.6
                                    }}>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px', flexWrap: 'wrap' }}>
                                                <span style={{ fontWeight: '600', color: '#111827', fontSize: '15px' }}>{alert.title}</span>
                                                <span style={{ fontSize: '11px', fontWeight: '600', color: cfg.color, background: cfg.bg, padding: '2px 10px', borderRadius: '999px' }}>{cfg.label}</span>
                                                {!alert.isActive && <span style={{ fontSize: '11px', color: '#9ca3af', background: '#f3f4f6', padding: '2px 10px', borderRadius: '999px' }}>Inactive</span>}
                                            </div>
                                            <p style={{ color: '#6b7280', fontSize: '13px', margin: '0 0 6px' }}>{alert.message}</p>
                                            <p style={{ color: '#9ca3af', fontSize: '11px', margin: 0 }}>{new Date(alert.createdAt).toLocaleString()}</p>
                                        </div>
                                        <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                                            <button
                                                onClick={() => toggleActive(alert)}
                                                style={{
                                                    padding: '6px 14px', borderRadius: '8px', border: '1px solid #e5e7eb',
                                                    background: alert.isActive ? '#fef3c7' : '#d1fae5',
                                                    color: alert.isActive ? '#92400e' : '#065f46',
                                                    fontSize: '12px', fontWeight: '600', cursor: 'pointer'
                                                }}
                                            >
                                                {alert.isActive ? '⏸ Deactivate' : '▶ Activate'}
                                            </button>
                                            <button
                                                onClick={() => handleDelete(alert._id)}
                                                disabled={deletingId.value === alert._id}
                                                style={{
                                                    padding: '6px 14px', borderRadius: '8px', border: '1px solid #fca5a5',
                                                    background: 'white', color: '#ef4444', fontSize: '12px', fontWeight: '600', cursor: 'pointer'
                                                }}
                                            >
                                                {deletingId.value === alert._id ? '...' : '🗑️'}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        );
    }
};
