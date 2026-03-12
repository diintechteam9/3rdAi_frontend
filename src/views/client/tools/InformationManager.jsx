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
        const editingId = ref(null);
        const activeTab = ref('all');
        const statusFilter = ref('all'); // 'all', 'enabled', 'disabled'
        const activeMenuId = ref(null);  // For three-dot menu
        const detailItem = ref(null);    // For popup modal

        const mediaInput = ref(null);
        const thumbInput = ref(null);
        const showForm = ref(false);

        const defaultForm = () => ({
            type: '',
            title: '',
            description: '',
            priority: 0,
            mediaType: 'file', // 'file' or 'url'
            mediaFile: null,
            videoUrl: '',
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

        // ── Filtered items by active tab & status ──────────────────────────────────
        const filteredItems = () => {
            let filtered = activeTab.value === 'all'
                ? items.value
                : items.value.filter(i => i.type === activeTab.value);

            if (activeTab.value !== 'all' && statusFilter.value !== 'all') {
                filtered = filtered.filter(item => {
                    if (statusFilter.value === 'enabled') return item.status === 'published';
                    if (statusFilter.value === 'disabled') return item.status === 'draft';
                    return true;
                });
            }
            return filtered;
        };

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

        // ── Create/Update ────────────────────────────────────────────────────────
        const handleCreate = async () => {
            formError.value = '';
            if (!form.value.type) {
                formError.value = 'Please select a content category.';
                return;
            }
            if (!form.value.title.trim()) {
                formError.value = 'Title is required.';
                return;
            }

            // For new items, media is mandatory (either file or url).
            if (!editingId.value) {
                if (form.value.mediaType === 'file' && !form.value.mediaFile) {
                    formError.value = 'Primary Media File is required.';
                    return;
                }
                if (form.value.mediaType === 'url' && !form.value.videoUrl.trim()) {
                    formError.value = 'Video URL is required.';
                    return;
                }
            }

            submitting.value = true;
            try {
                // 1. Upload files first if selected
                let mediaKey = null;
                let thumbnailKey = null;

                if (form.value.mediaType === 'file' && form.value.mediaFile) {
                    showToast(editingId.value ? 'Updating media...' : 'Uploading media...', 'warning');
                    mediaKey = await uploadFileToR2(form.value.mediaFile, 'media');
                }

                if (form.value.thumbnailFile) {
                    thumbnailKey = await uploadFileToR2(form.value.thumbnailFile, 'thumbnail');
                }

                // 2. Save Item records (POST for create, PUT for update)
                const url = editingId.value
                    ? `${API_BASE_URL}/information/${editingId.value}`
                    : `${API_BASE_URL}/information`;

                const method = editingId.value ? 'PUT' : 'POST';

                const body = {
                    type: form.value.type,
                    title: form.value.title,
                    description: form.value.description,
                    priority: form.value.priority,
                    status: form.value.status
                };

                if (mediaKey) body.mediaKey = mediaKey;
                if (thumbnailKey) body.thumbnailKey = thumbnailKey;
                if (form.value.mediaType === 'url') body.videoUrl = form.value.videoUrl;
                else if (form.value.mediaType === 'file' && form.value.mediaFile) body.videoUrl = null; // Clear if switching to file

                const res = await fetch(url, {
                    method: method,
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${getToken()}`
                    },
                    body: JSON.stringify(body)
                });
                const data = await res.json();
                if (data.success) {
                    showToast(editingId.value ? '✅ Content updated!' : '✅ Content saved!', 'success');
                    form.value = defaultForm();
                    showForm.value = false;
                    editingId.value = null; // Reset edit mode
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

        // ── Start Edit ────────────────────────────────────────────────────────────
        const startEdit = (item) => {
            editingId.value = item._id;
            form.value = {
                type: item.type,
                title: item.title,
                description: item.description || '',
                priority: item.priority || 0,
                status: item.status,
                mediaType: item.videoUrl ? 'url' : 'file',
                mediaFile: null,
                videoUrl: item.videoUrl || '',
                thumbnailFile: null
            };
            showForm.value = true;
            window.scrollTo({ top: 0, behavior: 'smooth' });
        };

        // ── Toggle enable/disable ────────────────────────────────────────────────
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
                    showToast(newStatus === 'published' ? '✅ Enabled!' : '🚫 Disabled', 'success');
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

        const getEmbedUrl = (url) => {
            if (!url) return null;
            const ytRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=|shorts\/)|youtu\.be\/)([^"&?\/\s]{11})/i;
            const ytMatch = url.match(ytRegex);
            if (ytMatch && ytMatch[1]) return `https://www.youtube.com/embed/${ytMatch[1]}`;
            const vimeoRegex = /(?:vimeo\.com\/|player\.vimeo\.com\/video\/)([0-9]+)/i;
            const vimeoMatch = url.match(vimeoRegex);
            if (vimeoMatch && vimeoMatch[1]) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
            return null;
        };

        onMounted(() => {
            fetchItems();
            window.addEventListener('click', () => {
                activeMenuId.value = null;
            });
        });

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

                <div style={{ marginBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#111827', margin: '0 0 6px' }}>
                            📋 Information Manager
                        </h1>
                        <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>
                            Manage banners, reels, safety videos and alerts shown to users
                        </p>
                    </div>
                </div>

                {/* Create Form - Show if showForm is true */}
                {showForm.value && (
                    <div style={{
                        background: 'white', borderRadius: '16px',
                        border: '2px solid #6366f1', padding: '24px',
                        marginBottom: '28px', boxShadow: '0 10px 30px rgba(0,0,0,0.08)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                            <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#111827', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span>{editingId.value ? '✏️' : '✨'}</span> {editingId.value ? 'Edit Content' : 'Create New Content'}
                            </h3>
                            <button
                                onClick={() => { showForm.value = false; editingId.value = null; form.value = defaultForm(); }}
                                style={{ background: '#f3f4f6', border: 'none', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
                            >
                                Cancel
                            </button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>

                            {/* Type */}
                            <select
                                value={form.value.type}
                                onChange={e => form.value.type = e.target.value}
                                style={{ padding: '10px 14px', borderRadius: '8px', border: form.value.type ? '1px solid #d1d5db' : '2px solid #6366f1', fontSize: '14px', outline: 'none', background: form.value.type ? 'white' : '#f5f7ff' }}
                            >
                                <option value="" disabled selected>📁 Select Your Category</option>
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
                                <option value="draft">🚫 Disable</option>
                                <option value="published">✅ Enable</option>
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

                            {/* Media Toggle & Input */}
                            <div style={{ gridColumn: 'span 2', padding: '16px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                                    <button
                                        onClick={() => form.value.mediaType = 'file'}
                                        style={{
                                            flex: 1, padding: '8px', borderRadius: '8px', border: 'none', fontSize: '13px', fontWeight: '600',
                                            background: form.value.mediaType === 'file' ? '#6366f1' : 'white',
                                            color: form.value.mediaType === 'file' ? 'white' : '#64748b',
                                            boxShadow: form.value.mediaType === 'file' ? '0 4px 12px rgba(99, 102, 241, 0.2)' : 'none',
                                            cursor: 'pointer', transition: 'all 0.2s'
                                        }}
                                    >
                                        📁 Upload File
                                    </button>
                                    <button
                                        onClick={() => form.value.mediaType = 'url'}
                                        style={{
                                            flex: 1, padding: '8px', borderRadius: '8px', border: 'none', fontSize: '13px', fontWeight: '600',
                                            background: form.value.mediaType === 'url' ? '#6366f1' : 'white',
                                            color: form.value.mediaType === 'url' ? 'white' : '#64748b',
                                            boxShadow: form.value.mediaType === 'url' ? '0 4px 12px rgba(99, 102, 241, 0.2)' : 'none',
                                            cursor: 'pointer', transition: 'all 0.2s'
                                        }}
                                    >
                                        🔗 Video Link
                                    </button>
                                </div>

                                {form.value.mediaType === 'file' ? (
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
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
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <label style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px', fontWeight: '600' }}>
                                            Video URL (YouTube/Vimeo) *
                                        </label>
                                        <input
                                            value={form.value.videoUrl}
                                            onInput={e => form.value.videoUrl = e.target.value}
                                            placeholder="https://www.youtube.com/watch?v=..."
                                            style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '13px', outline: 'none' }}
                                        />
                                    </div>
                                )}
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
                                {submitting.value ? 'Uploading & Saving...' : editingId.value ? '🔄 Update Content' : '📤 Save Content'}
                            </button>
                        </div>
                        {formError.value && (
                            <p style={{ color: '#ef4444', fontSize: '13px', margin: '20px 0 0', background: '#fef2f2', padding: '10px', borderRadius: '8px' }}>⚠️ {formError.value}</p>
                        )}
                    </div>
                )}

                {/* Tabs & Content List - Only show if not adding form, or maybe always show tabs? 
                    User requested: "Add content kr ke jaise hi waha pe tap kre to from wala section khule"
                */}
                {!showForm.value && (
                    <>
                        {/* Sticky Controls Section */}
                        <div style={{
                            position: 'sticky',
                            top: '80px',
                            background: '#f8fafc',
                            padding: '16px 24px',
                            margin: '0 -24px 24px -24px',
                            zIndex: 100,
                            borderBottom: '1px solid #e5e7eb',
                            backdropFilter: 'blur(12px)',
                            WebkitBackdropFilter: 'blur(12px)',
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)'
                        }}>
                            {/* Tabs */}
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
                                {tabs.map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => activeTab.value = tab.id}
                                        style={{
                                            padding: '8px 20px', borderRadius: '12px', border: 'none', fontSize: '14px', fontWeight: '600',
                                            background: activeTab.value === tab.id ? '#6366f1' : 'white',
                                            color: activeTab.value === tab.id ? 'white' : '#4b5563',
                                            boxShadow: activeTab.value === tab.id ? '0 4px 12px rgba(99, 102, 241, 0.2)' : '0 1px 2px rgba(0,0,0,0.05)',
                                            cursor: 'pointer', transition: 'all 0.2s',
                                            border: `1px solid ${activeTab.value === tab.id ? '#6366f1' : '#e5e7eb'}`
                                        }}
                                    >
                                        {tab.label}
                                    </button>
                                ))}

                                <button
                                    onClick={() => showForm.value = true}
                                    style={{
                                        padding: '8px 20px', borderRadius: '12px', border: '1px dashed #6366f1', fontSize: '14px', fontWeight: '700',
                                        background: '#eef2ff', color: '#4f46e5', cursor: 'pointer', marginLeft: 'auto'
                                    }}
                                >
                                    ➕ Add Content
                                </button>
                            </div>

                            {/* Status Filter Switch (Only for specific category tabs) */}
                            {activeTab.value !== 'all' && (
                                <div style={{
                                    display: 'inline-flex', background: '#f1f5f9', padding: '4px', borderRadius: '10px',
                                    marginBottom: '16px', border: '1px solid #e2e8f0'
                                }}>
                                    {['all', 'enabled', 'disabled'].map(s => (
                                        <button
                                            key={s}
                                            onClick={() => statusFilter.value = s}
                                            style={{
                                                padding: '6px 16px', borderRadius: '8px', border: 'none',
                                                fontSize: '12px', fontWeight: '600', cursor: 'pointer',
                                                textTransform: 'capitalize', transition: 'all 0.2s',
                                                background: statusFilter.value === s ? 'white' : 'transparent',
                                                color: statusFilter.value === s ? '#1e293b' : '#64748b',
                                                boxShadow: statusFilter.value === s ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'
                                            }}
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* List Header */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#374151', margin: 0 }}>
                                    Content List ({filteredItems().length})
                                </h3>
                                <button onClick={fetchItems} style={{ padding: '6px 14px', borderRadius: '8px', border: '1px solid #e5e7eb', background: 'white', fontSize: '13px', cursor: 'pointer' }}>
                                    🔄 Refresh
                                </button>
                            </div>
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
                                            background: item.status === 'published' ? 'white' : '#e2e8f0',
                                            borderRadius: '12px',
                                            border: `1px solid ${item.status === 'published' ? cfg.color + '40' : '#e2e8f0'}`,
                                            padding: '20px', display: 'flex', alignItems: 'flex-start', gap: '20px',
                                            opacity: item.status === 'published' ? 1 : 0.9,
                                            boxShadow: item.status === 'published' ? '0 2px 4px rgba(0,0,0,0.02)' : 'none',
                                            position: 'relative',
                                            transition: 'all 0.3s ease'
                                        }}>
                                            {/* Thumbnail preview - Larger Size */}
                                            {item.thumbnail || item.mediaUrl || item.videoUrl ? (
                                                <div style={{
                                                    width: '180px', height: '110px', borderRadius: '12px',
                                                    background: '#f8fafc', overflow: 'hidden', flexShrink: 0,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
                                                    border: '1px solid #f1f5f9', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                                                }} onClick={() => item.mediaUrl && window.open(item.mediaUrl, '_blank')}>
                                                    {getEmbedUrl(item.videoUrl || item.mediaUrl) ? (
                                                        <div style={{ fontSize: '32px' }}>🎬</div>
                                                    ) : (
                                                        <img
                                                            src={item.thumbnail || item.mediaUrl}
                                                            alt="thumb"
                                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                            onError={e => e.target.style.display = 'none'}
                                                        />
                                                    )}
                                                    <div style={{
                                                        position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.1)',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0,
                                                        transition: 'opacity 0.2s', ':hover': { opacity: 1 }
                                                    }}>
                                                        <span style={{ color: 'white', fontSize: '20px' }}>👁️</span>
                                                    </div>
                                                </div>
                                            ) : null}

                                            <div style={{ flex: 1, cursor: 'default' }}>
                                                <div
                                                    onClick={() => detailItem.value = item}
                                                    style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px', flexWrap: 'wrap', cursor: 'pointer' }}
                                                >
                                                    <span style={{ fontWeight: '700', color: '#1e293b', fontSize: '16px' }}>{item.title}</span>
                                                    <span style={{ fontSize: '10px', fontWeight: '700', color: cfg.color, background: cfg.bg, padding: '2px 8px', borderRadius: '6px', textTransform: 'uppercase' }}>
                                                        {cfg.label.split(' ')[1] || cfg.label}
                                                    </span>
                                                    <span style={{
                                                        fontSize: '10px', fontWeight: '700', padding: '2px 8px', borderRadius: '6px',
                                                        background: item.status === 'published' ? '#dcfce7' : '#fee2e2',
                                                        color: item.status === 'published' ? '#166534' : '#991b1b', textTransform: 'uppercase'
                                                    }}>
                                                        {item.status === 'published' ? 'Active' : 'Disabled'}
                                                    </span>
                                                </div>

                                                <div onClick={() => detailItem.value = item} style={{ cursor: 'pointer' }}>
                                                    {item.description && (
                                                        <p style={{
                                                            color: '#64748b', fontSize: '13px', margin: '0 0 8px',
                                                            display: '-webkit-box', WebkitLineClamp: '2', WebkitBoxOrient: 'vertical',
                                                            overflow: 'hidden', lineHeight: '1.5'
                                                        }}>
                                                            {item.description}
                                                        </p>
                                                    )}
                                                </div>

                                                <div style={{ display: 'flex', gap: '16px', marginTop: '12px', alignItems: 'center' }}>
                                                    <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        ⭐ Priority: <span style={{ color: '#475569' }}>{item.priority || 0}</span>
                                                    </span>
                                                    <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        ❤️ Likes: <span style={{ color: '#ec4899' }}>{item.likesCount || 0}</span>
                                                    </span>
                                                    <span style={{ fontSize: '11px', color: '#cbd5e1', marginLeft: 'auto' }}>
                                                        {new Date(item.createdAt).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Actions Section */}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                                {/* Modern Toggle Switch */}
                                                <div
                                                    onClick={(e) => { e.stopPropagation(); toggleStatus(item); }}
                                                    style={{
                                                        width: '44px', height: '22px', borderRadius: '11px',
                                                        background: item.status === 'published' ? '#10b981' : '#cbd5e1',
                                                        position: 'relative', cursor: 'pointer', transition: 'all 0.3s ease',
                                                        boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)'
                                                    }}
                                                >
                                                    <div style={{
                                                        width: '18px', height: '18px', borderRadius: '50%',
                                                        background: 'white', position: 'absolute', top: '2px',
                                                        left: item.status === 'published' ? '24px' : '2px',
                                                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                                                    }} />
                                                </div>

                                                {/* Actions - Three Dot Menu */}
                                                <div style={{ position: 'relative' }}>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            activeMenuId.value = activeMenuId.value === item._id ? null : item._id;
                                                        }}
                                                        style={{
                                                            background: 'none', border: 'none', color: '#94a3b8', fontSize: '20px',
                                                            cursor: 'pointer', padding: '4px 8px', borderRadius: '8px', transition: 'all 0.2s',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                        }}
                                                    >
                                                        ⋮
                                                    </button>

                                                    {activeMenuId.value === item._id && (
                                                        <div style={{
                                                            position: 'absolute', top: '100%', right: 0, zIndex: 50,
                                                            background: 'white', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
                                                            border: '1px solid #f1f5f9', minWidth: '130px', padding: '6px', marginTop: '6px'
                                                        }}>
                                                            <button
                                                                onClick={() => { startEdit(item); activeMenuId.value = null; }}
                                                                style={{
                                                                    width: '100%', textAlign: 'left', padding: '10px 12px', borderRadius: '8px',
                                                                    background: 'none', border: 'none', fontSize: '13px', fontWeight: '600', color: '#475569',
                                                                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px'
                                                                }}
                                                                onMouseEnter={(e) => e.target.style.background = '#f8fafc'}
                                                                onMouseLeave={(e) => e.target.style.background = 'none'}
                                                            >
                                                                ✏️ Edit
                                                            </button>
                                                            <hr style={{ border: 'none', borderTop: '1px solid #f1f5f9', margin: '4px 0' }} />
                                                            <button
                                                                onClick={() => { handleDelete(item._id); activeMenuId.value = null; }}
                                                                style={{
                                                                    width: '100%', textAlign: 'left', padding: '10px 12px', borderRadius: '8px',
                                                                    background: 'none', border: 'none', fontSize: '13px', fontWeight: '600', color: '#ef4444',
                                                                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px'
                                                                }}
                                                                onMouseEnter={(e) => e.target.style.background = '#fef2f2'}
                                                                onMouseLeave={(e) => e.target.style.background = 'none'}
                                                            >
                                                                🗑️ Delete
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </>
                )}
                {/* Detail Modal Popup */}
                {detailItem.value && (
                    <div style={{
                        position: 'fixed', inset: 0, zIndex: 10000,
                        background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
                    }} onClick={() => detailItem.value = null}>
                        <div
                            style={{
                                background: 'white', width: '100%', maxWidth: '600px', borderRadius: '24px',
                                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden',
                                animation: 'modalFadeIn 0.3s ease-out'
                            }}
                            onClick={e => e.stopPropagation()}
                        >
                            <div style={{ padding: '32px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                                            <span style={{ fontSize: '11px', fontWeight: '800', background: '#f1f5f9', color: '#475569', padding: '4px 12px', borderRadius: '8px', textTransform: 'uppercase' }}>
                                                {detailItem.value.type}
                                            </span>
                                            <span style={{
                                                fontSize: '11px', fontWeight: '800', padding: '4px 12px', borderRadius: '8px',
                                                background: detailItem.value.status === 'published' ? '#dcfce7' : '#fee2e2',
                                                color: detailItem.value.status === 'published' ? '#166534' : '#991b1b', textTransform: 'uppercase'
                                            }}>
                                                {detailItem.value.status}
                                            </span>
                                        </div>
                                        <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#1e293b', margin: 0, lineHeight: '1.2' }}>
                                            {detailItem.value.title}
                                        </h2>
                                    </div>
                                    <button
                                        onClick={() => detailItem.value = null}
                                        style={{ background: '#f8fafc', border: 'none', color: '#64748b', width: '40px', height: '40px', borderRadius: '12px', cursor: 'pointer', fontSize: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                    >✕</button>
                                </div>

                                <div style={{ background: '#f8fafc', padding: '24px', borderRadius: '16px', color: '#475569', fontSize: '15px', lineHeight: '1.6', marginBottom: '24px', whiteSpace: 'pre-wrap', maxHeight: '300px', overflowY: 'auto' }}>
                                    {detailItem.value.description || 'No description provided.'}
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: '#f1f5f9', borderRadius: '16px' }}>
                                    <div style={{ display: 'flex', gap: '24px' }}>
                                        <div>
                                            <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase' }}>Priority</div>
                                            <div style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b' }}>{detailItem.value.priority || 0}</div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase' }}>Likes</div>
                                            <div style={{ fontSize: '16px', fontWeight: '700', color: '#ec4899' }}>{detailItem.value.likesCount || 0}</div>
                                        </div>
                                    </div>
                                    {detailItem.value.mediaUrl && (
                                        <button
                                            onClick={() => window.open(detailItem.value.mediaUrl, '_blank')}
                                            style={{ background: '#6366f1', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '12px', fontWeight: '700', cursor: 'pointer', fontSize: '14px' }}
                                        >
                                            View Media
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }
};
