/**
 * InformationManager.jsx
 * Client Tool — Create, manage and publish Information Section content
 * Types: banner | reel | alert | public_safety_video | cyber_safety_video
 */
import { ref, onMounted } from 'vue';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export default {
    name: 'InformationManager',
    setup() {
        const items = ref([]);
        const loading = ref(false);
        const submitting = ref(false);
        const deletingId = ref(null);
        const activeTab = ref('all');

        const mediaInput = ref(null);
        const thumbInput = ref(null);

        const defaultForm = () => ({
            type: 'banner',
            title: '',
            description: '',
            priority: 0,
            mediaFile: null,
            thumbnailFile: null,
            status: 'draft'
        });

        const form = ref(defaultForm());
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

        // ── Type configuration ────────────────────────────────────────────────────
        const typeConfig = {
            banner: { label: '🖼️ Banner', color: '#6366f1', bg: '#eef2ff' },
            reel: { label: '🎬 Reel', color: '#ec4899', bg: '#fdf2f8' },
            alert: { label: '🔔 Alert', color: '#ef4444', bg: '#fee2e2' },
            public_safety_video: { label: '🛡️ Public Safety Video', color: '#10b981', bg: '#d1fae5' },
            cyber_safety_video: { label: '💻 Cyber Safety Video', color: '#f59e0b', bg: '#fef3c7' }
        };

        const tabs = [
            { id: 'all', label: 'All' },
            { id: 'banner', label: '🖼️ Banners' },
            { id: 'reel', label: '🎬 Reels' },
            { id: 'alert', label: '🔔 Alerts' },
            { id: 'public_safety_video', label: '🛡️ Public Safety' },
            { id: 'cyber_safety_video', label: '💻 Cyber Safety' }
        ];

        // ── Filtered items by active tab ──────────────────────────────────────────
        const filteredItems = () =>
            activeTab.value === 'all'
                ? items.value
                : items.value.filter(i => i.type === activeTab.value);

        // ── Fetch all information ─────────────────────────────────────────────────
        const fetchItems = async () => {
            loading.value = true;
            try {
                const res = await fetch(`${API_BASE_URL}/information/list`, {
                    headers: { Authorization: `Bearer ${getToken()}` }
                });
                const data = await res.json();
                if (data.success) items.value = data.data || [];
            } catch (e) {
                console.error('[InformationManager] fetchItems:', e);
            } finally {
                loading.value = false;
            }
        };

        // ── Upload Presigned File Helper ──────────────────────────────────────────
        const uploadFileToR2 = async (file, fileType) => {
            // Get Presigned URL
            const resUrl = await fetch(`${API_BASE_URL}/information/generate-upload-url`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${getToken()}`
                },
                body: JSON.stringify({
                    fileName: file.name,
                    contentType: file.type || 'application/octet-stream',
                    fileType: fileType
                })
            });
            const urlData = await resUrl.json();
            if (!urlData.success) throw new Error(urlData.message || 'Failed to get upload URL');

            const { uploadUrl, key } = urlData.data;

            // Direct upload S3/R2 (PUT Request)
            const uploadRes = await fetch(uploadUrl, {
                method: 'PUT',
                body: file,
                headers: {
                    'Content-Type': file.type || 'application/octet-stream'
                }
            });

            if (!uploadRes.ok) throw new Error('File upload to storage failed');
            return key; // return the database key
        };

        // ── Create ────────────────────────────────────────────────────────────────
        const handleCreate = async () => {
            formError.value = '';
            if (!form.value.title.trim()) {
                formError.value = 'Title is required.';
                return;
            }
            if (!form.value.mediaFile) {
                formError.value = 'Primary Media File is required.';
                return;
            }

            submitting.value = true;
            try {
                // 1. Upload files first
                let mediaKey = null;
                let thumbnailKey = null;

                if (form.value.mediaFile) {
                    showToast('Uploading media...', 'warning');
                    mediaKey = await uploadFileToR2(form.value.mediaFile, 'media');
                }

                if (form.value.thumbnailFile) {
                    thumbnailKey = await uploadFileToR2(form.value.thumbnailFile, 'thumbnail');
                }

                // 2. Save Item records
                const res = await fetch(`${API_BASE_URL}/information`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${getToken()}`
                    },
                    body: JSON.stringify({
                        type: form.value.type,
                        title: form.value.title,
                        description: form.value.description,
                        priority: form.value.priority,
                        status: form.value.status,
                        mediaKey,
                        thumbnailKey
                    })
                });
                const data = await res.json();
                if (data.success) {
                    showToast('✅ Content published successfully!', 'success');
                    form.value = defaultForm();
                    // Reset file inputs visually
                    if (mediaInput.value) mediaInput.value.value = '';
                    if (thumbInput.value) thumbInput.value.value = '';
                    await fetchItems();
                } else {
                    formError.value = data.message || 'Failed to save content details';
                }
            } catch (e) {
                console.error(e);
                formError.value = e.message || 'Network error during upload';
            } finally {
                submitting.value = false;
            }
        };

        // ── Toggle draft/published ────────────────────────────────────────────────
        const toggleStatus = async (item) => {
            const newStatus = item.status === 'published' ? 'draft' : 'published';
            try {
                const res = await fetch(`${API_BASE_URL}/information/${item._id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${getToken()}`
                    },
                    body: JSON.stringify({ status: newStatus })
                });
                const data = await res.json();
                if (data.success) {
                    showToast(newStatus === 'published' ? '✅ Published!' : '📝 Moved to Draft', 'success');
                    await fetchItems();
                }
            } catch (e) { console.error(e); }
        };

        // ── Delete ────────────────────────────────────────────────────────────────
        const handleDelete = async (id) => {
            if (!confirm('Are you sure you want to delete this item?')) return;
            deletingId.value = id;
            try {
                const res = await fetch(`${API_BASE_URL}/information/${id}`, {
                    method: 'DELETE',
                    headers: { Authorization: `Bearer ${getToken()}` }
                });
                const data = await res.json();
                if (data.success) {
                    showToast('🗑️ Deleted', 'warning');
                    await fetchItems();
                }
            } catch (e) { console.error(e); } finally {
                deletingId.value = null;
            }
        };

        onMounted(fetchItems);

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
                    <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#111827', margin: '0 0 6px' }}>
                        📋 Information Manager
                    </h1>
                    <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>
                        Manage banners, reels, safety videos and alerts shown to users
                    </p>
                </div>

                {/* Create Form */}
                <div style={{
                    background: 'white', borderRadius: '16px',
                    border: '1px solid #e5e7eb', padding: '24px',
                    marginBottom: '24px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)'
                }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', margin: '0 0 18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>➕</span> Add New Content
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>

                        {/* Type */}
                        <select
                            value={form.value.type}
                            onChange={e => form.value.type = e.target.value}
                            style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', outline: 'none' }}
                        >
                            <option value="banner">🖼️ Banner</option>
                            <option value="reel">🎬 Reel</option>
                            <option value="alert">🔔 Alert</option>
                            <option value="public_safety_video">🛡️ Public Safety Video</option>
                            <option value="cyber_safety_video">💻 Cyber Safety Video</option>
                        </select>

                        {/* Status */}
                        <select
                            value={form.value.status}
                            onChange={e => form.value.status = e.target.value}
                            style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', outline: 'none' }}
                        >
                            <option value="draft">📝 Draft</option>
                            <option value="published">✅ Published</option>
                        </select>

                        {/* Title */}
                        <input
                            value={form.value.title}
                            onInput={e => form.value.title = e.target.value}
                            placeholder="Title *"
                            style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', outline: 'none', gridColumn: 'span 2' }}
                        />

                        {/* Priority */}
                        <div style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #d1d5db', background: 'white', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                            <label style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px', fontWeight: '600' }}>
                                Priority (Higher number = shows first)
                            </label>
                            <input
                                type="number"
                                value={form.value.priority}
                                onInput={e => form.value.priority = parseInt(e.target.value) || 0}
                                placeholder="0"
                                style={{ fontSize: '14px', border: 'none', outline: 'none', background: 'transparent' }}
                            />
                        </div>

                        {/* Description */}
                        <textarea
                            rows={3}
                            value={form.value.description}
                            onInput={e => form.value.description = e.target.value}
                            placeholder="Description (optional)"
                            style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', outline: 'none', resize: 'vertical', gridColumn: 'span 2', fontFamily: 'inherit' }}
                        />

                        {/* Media File Upload */}
                        <div style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #d1d5db', background: 'white', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                            <label style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px', fontWeight: '600' }}>
                                Primary Media File (Image/Video) *
                            </label>
                            <input
                                type="file"
                                ref={mediaInput}
                                onChange={e => form.value.mediaFile = e.target.files[0]}
                                style={{ fontSize: '13px' }}
                            />
                        </div>

                        {/* Thumbnail File Upload */}
                        <div style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #d1d5db', background: 'white', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                            <label style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px', fontWeight: '600' }}>
                                Thumbnail Image (Optional)
                            </label>
                            <input
                                type="file"
                                accept="image/*"
                                ref={thumbInput}
                                onChange={e => form.value.thumbnailFile = e.target.files[0]}
                                style={{ fontSize: '13px' }}
                            />
                        </div>

                        {/* Submit */}
                        <button
                            onClick={handleCreate}
                            disabled={submitting.value}
                            style={{
                                gridColumn: 'span 2',
                                padding: '11px 24px', borderRadius: '8px', border: 'none',
                                background: submitting.value ? '#d1d5db' : 'linear-gradient(135deg,#6366f1,#4f46e5)',
                                color: 'white', fontWeight: '600', fontSize: '14px',
                                cursor: submitting.value ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
                                marginTop: '4px'
                            }}
                        >
                            {submitting.value ? 'Uploading & Saving...' : '📤 Save Content'}
                        </button>
                    </div>
                    {formError.value && (
                        <p style={{ color: '#ef4444', fontSize: '13px', margin: '10px 0 0' }}>{formError.value}</p>
                    )}
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '18px' }}>
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => activeTab.value = tab.id}
                            style={{
                                padding: '7px 16px', borderRadius: '999px', border: 'none', fontSize: '13px', fontWeight: '600',
                                background: activeTab.value === tab.id ? '#6366f1' : '#f3f4f6',
                                color: activeTab.value === tab.id ? 'white' : '#374151',
                                cursor: 'pointer', transition: 'all 0.2s'
                            }}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* List Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#374151', margin: 0 }}>
                        Content List ({filteredItems().length})
                    </h3>
                    <button onClick={fetchItems} style={{ padding: '6px 14px', borderRadius: '8px', border: '1px solid #e5e7eb', background: 'white', fontSize: '13px', cursor: 'pointer' }}>
                        🔄 Refresh
                    </button>
                </div>

                {/* List */}
                {loading.value ? (
                    <div style={{ textAlign: 'center', padding: '48px', color: '#9ca3af' }}>Loading...</div>
                ) : filteredItems().length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '48px', background: 'white', borderRadius: '14px', border: '1px solid #e5e7eb', color: '#9ca3af' }}>
                        <div style={{ fontSize: '40px', marginBottom: '10px' }}>📋</div>
                        <p style={{ margin: 0 }}>No content found. Add one above.</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {filteredItems().map(item => {
                            const cfg = typeConfig[item.type] || typeConfig.banner;
                            return (
                                <div key={item._id} style={{
                                    background: 'white', borderRadius: '12px',
                                    border: `1px solid ${item.status === 'published' ? cfg.color + '40' : '#e5e7eb'}`,
                                    padding: '16px 20px', display: 'flex', alignItems: 'flex-start', gap: '14px',
                                    opacity: item.status === 'published' ? 1 : 0.7
                                }}>
                                    {/* Thumbnail preview - now using the injected presigned URLs attached from backend */}
                                    {item.thumbnail || item.mediaUrl ? (
                                        <div style={{
                                            width: '64px', height: '48px', borderRadius: '8px',
                                            background: '#f3f4f6', overflow: 'hidden', flexShrink: 0
                                        }}>
                                            <img
                                                src={item.thumbnail || item.mediaUrl}
                                                alt="thumb"
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                onError={e => e.target.style.display = 'none'}
                                            />
                                        </div>
                                    ) : null}
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px', flexWrap: 'wrap' }}>
                                            <span style={{ fontWeight: '600', color: '#111827', fontSize: '15px' }}>{item.title}</span>
                                            <span style={{ fontSize: '11px', fontWeight: '600', color: cfg.color, background: cfg.bg, padding: '2px 10px', borderRadius: '999px' }}>
                                                {cfg.label}
                                            </span>
                                            <span style={{
                                                fontSize: '11px', fontWeight: '600', padding: '2px 10px', borderRadius: '999px',
                                                background: item.status === 'published' ? '#d1fae5' : '#f3f4f6',
                                                color: item.status === 'published' ? '#065f46' : '#6b7280'
                                            }}>
                                                {item.status === 'published' ? '✅ Published' : '📝 Draft'}
                                            </span>
                                        </div>
                                        {item.description && (
                                            <p style={{ color: '#6b7280', fontSize: '13px', margin: '0 0 4px' }}>{item.description}</p>
                                        )}
                                        {item.mediaUrl && (
                                            <a href={item.mediaUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#6366f1', fontSize: '12px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                                                🔗 Open Media
                                            </a>
                                        )}
                                        <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
                                            <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                ⭐ Priority: <span style={{ color: '#111827' }}>{item.priority || 0}</span>
                                            </span>
                                            <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                ❤️ Likes: <span style={{ color: '#ec4899' }}>{item.likesCount || 0}</span>
                                            </span>
                                            <span style={{ fontSize: '12px', color: '#9ca3af', fontWeight: '500', marginLeft: 'auto' }}>
                                                {new Date(item.createdAt).toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                                        <button
                                            onClick={() => toggleStatus(item)}
                                            style={{
                                                padding: '6px 14px', borderRadius: '8px', border: '1px solid #e5e7eb',
                                                background: item.status === 'published' ? '#fef3c7' : '#d1fae5',
                                                color: item.status === 'published' ? '#92400e' : '#065f46',
                                                fontSize: '12px', fontWeight: '600', cursor: 'pointer'
                                            }}
                                        >
                                            {item.status === 'published' ? '📝 Draft' : '✅ Publish'}
                                        </button>
                                        <button
                                            onClick={() => handleDelete(item._id)}
                                            disabled={deletingId.value === item._id}
                                            style={{
                                                padding: '6px 14px', borderRadius: '8px', border: '1px solid #fca5a5',
                                                background: 'white', color: '#ef4444', fontSize: '12px', fontWeight: '600', cursor: 'pointer'
                                            }}
                                        >
                                            {deletingId.value === item._id ? '...' : '🗑️'}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    }
};
