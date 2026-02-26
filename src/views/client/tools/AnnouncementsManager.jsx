/**
 * AnnouncementsManager.jsx
 * Client Tool — Create, manage and publish Announcements for partners
 */
import { ref, onMounted } from 'vue';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export default {
    name: 'AnnouncementsManager',
    setup() {
        const announcements = ref([]);
        const loading = ref(false);
        const submitting = ref(false);
        const deletingId = ref(null);

        const form = ref({ title: '', content: '' });
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

        // ── Fetch ────────────────────────────────────────────────────────────────
        const fetchAnnouncements = async () => {
            loading.value = true;
            try {
                const res = await fetch(`${API_BASE_URL}/announcements`, {
                    headers: { Authorization: `Bearer ${getToken()}` }
                });
                const data = await res.json();
                if (data.success) announcements.value = data.data.announcements || [];
            } catch (e) {
                console.error('[AnnouncementsManager] fetch:', e);
            } finally {
                loading.value = false;
            }
        };

        // ── Create ───────────────────────────────────────────────────────────────
        const handleCreate = async () => {
            formError.value = '';
            if (!form.value.title.trim() || !form.value.content.trim()) {
                formError.value = 'Title aur Content dono required hain.';
                return;
            }
            submitting.value = true;
            try {
                const res = await fetch(`${API_BASE_URL}/announcements`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
                    body: JSON.stringify(form.value)
                });
                const data = await res.json();
                if (data.success) {
                    showToast('📢 Announcement publish hua!', 'success');
                    form.value = { title: '', content: '' };
                    await fetchAnnouncements();
                } else {
                    formError.value = data.message || 'Failed to publish';
                }
            } catch (e) {
                formError.value = 'Network error';
            } finally {
                submitting.value = false;
            }
        };

        // ── Toggle active ─────────────────────────────────────────────────────────
        const toggleActive = async (ann) => {
            try {
                const res = await fetch(`${API_BASE_URL}/announcements/${ann._id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
                    body: JSON.stringify({ isActive: !ann.isActive })
                });
                const data = await res.json();
                if (data.success) {
                    showToast(ann.isActive ? 'Announcement unpublished' : 'Announcement published', 'success');
                    await fetchAnnouncements();
                }
            } catch (e) { console.error(e); }
        };

        // ── Delete ───────────────────────────────────────────────────────────────
        const handleDelete = async (annId) => {
            if (!confirm('Is announcement ko delete karna hai?')) return;
            deletingId.value = annId;
            try {
                const res = await fetch(`${API_BASE_URL}/announcements/${annId}`, {
                    method: 'DELETE',
                    headers: { Authorization: `Bearer ${getToken()}` }
                });
                const data = await res.json();
                if (data.success) {
                    showToast('🗑️ Announcement deleted', 'warning');
                    await fetchAnnouncements();
                }
            } catch (e) { console.error(e); } finally {
                deletingId.value = null;
            }
        };

        onMounted(fetchAnnouncements);

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
                    <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#111827', margin: '0 0 6px' }}>📢 Announcements Manager</h1>
                    <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>Partners ke liye announcements publish karein</p>
                </div>

                {/* Create Form */}
                <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e5e7eb', padding: '24px', marginBottom: '24px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', margin: '0 0 18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>➕</span> Naya Announcement Publish Karo
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <input
                            value={form.value.title}
                            onInput={e => form.value.title = e.target.value}
                            placeholder="Announcement Title *"
                            style={{ padding: '11px 14px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', outline: 'none' }}
                        />
                        <textarea
                            rows={4}
                            value={form.value.content}
                            onInput={e => form.value.content = e.target.value}
                            placeholder="Announcement content — partners ko kya batana hai? *"
                            style={{ padding: '11px 14px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }}
                        />
                        {formError.value && (
                            <p style={{ color: '#ef4444', fontSize: '13px', margin: 0 }}>{formError.value}</p>
                        )}
                        <button
                            onClick={handleCreate}
                            disabled={submitting.value}
                            style={{
                                padding: '12px 24px', borderRadius: '8px', border: 'none', width: 'fit-content',
                                background: submitting.value ? '#d1d5db' : 'linear-gradient(135deg,#8b5cf6,#6d28d9)',
                                color: 'white', fontWeight: '600', fontSize: '14px',
                                cursor: submitting.value ? 'not-allowed' : 'pointer', transition: 'all 0.2s'
                            }}
                        >
                            {submitting.value ? 'Publishing...' : '📢 Announcement Publish Karo'}
                        </button>
                    </div>
                </div>

                {/* List */}
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#374151', margin: 0 }}>
                            Saare Announcements ({announcements.value.length})
                        </h3>
                        <button onClick={fetchAnnouncements} style={{ padding: '6px 14px', borderRadius: '8px', border: '1px solid #e5e7eb', background: 'white', fontSize: '13px', cursor: 'pointer' }}>
                            🔄 Refresh
                        </button>
                    </div>

                    {loading.value ? (
                        <div style={{ textAlign: 'center', padding: '48px', color: '#9ca3af' }}>Loading...</div>
                    ) : announcements.value.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '48px', background: 'white', borderRadius: '14px', border: '1px solid #e5e7eb', color: '#9ca3af' }}>
                            <div style={{ fontSize: '40px', marginBottom: '10px' }}>📭</div>
                            <p style={{ margin: 0 }}>Koi announcement nahi. Upar se create karo.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {announcements.value.map(ann => (
                                <div key={ann._id} style={{
                                    background: ann.isActive ? 'linear-gradient(135deg,#f5f3ff,#ede9fe)' : 'white',
                                    borderRadius: '12px',
                                    border: ann.isActive ? '1px solid #ddd6fe' : '1px solid #e5e7eb',
                                    padding: '16px 20px', display: 'flex', alignItems: 'flex-start', gap: '14px',
                                    opacity: ann.isActive ? 1 : 0.6
                                }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px', flexWrap: 'wrap' }}>
                                            <span style={{ fontWeight: '600', color: '#4c1d95', fontSize: '15px' }}>📣 {ann.title}</span>
                                            <span style={{
                                                fontSize: '11px', fontWeight: '600', padding: '2px 10px', borderRadius: '999px',
                                                background: ann.isActive ? '#8b5cf6' : '#e5e7eb',
                                                color: ann.isActive ? 'white' : '#6b7280'
                                            }}>
                                                {ann.isActive ? '✅ Published' : 'Unpublished'}
                                            </span>
                                        </div>
                                        <p style={{ color: '#5b21b6', fontSize: '13px', margin: '0 0 6px', lineHeight: '1.6' }}>{ann.content}</p>
                                        <p style={{ color: '#9ca3af', fontSize: '11px', margin: 0 }}>{new Date(ann.createdAt).toLocaleString()}</p>
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                                        <button
                                            onClick={() => toggleActive(ann)}
                                            style={{
                                                padding: '6px 14px', borderRadius: '8px', border: '1px solid #e5e7eb',
                                                background: ann.isActive ? '#fef3c7' : '#d1fae5',
                                                color: ann.isActive ? '#92400e' : '#065f46',
                                                fontSize: '12px', fontWeight: '600', cursor: 'pointer'
                                            }}
                                        >
                                            {ann.isActive ? '⏸ Unpublish' : '▶ Publish'}
                                        </button>
                                        <button
                                            onClick={() => handleDelete(ann._id)}
                                            disabled={deletingId.value === ann._id}
                                            style={{
                                                padding: '6px 14px', borderRadius: '8px', border: '1px solid #fca5a5',
                                                background: 'white', color: '#ef4444', fontSize: '12px', fontWeight: '600', cursor: 'pointer'
                                            }}
                                        >
                                            {deletingId.value === ann._id ? '...' : '🗑️'}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    }
};
