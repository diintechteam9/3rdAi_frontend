import { ref, onMounted } from 'vue';
import {
    PlusIcon,
    PencilIcon,
    TrashIcon,
    ChevronLeftIcon,
    CheckIcon,
    XMarkIcon,
    ShieldCheckIcon
} from '@heroicons/vue/24/outline';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export default {
    name: 'CaseTypeManager',
    setup() {
        const caseTypes = ref([]);
        const loading = ref(false);
        const view = ref('list'); // 'list' | 'edit'
        const currentCT = ref(null);
        const toast = ref({ show: false, msg: '', type: 'success' });
        const isUploadingIcon = ref({}); // { 'fieldIndex-optIndex': true }
        const localPreviews = ref({}); // { 'fieldIndex-optIndex': 'blob:...' }

        const showToast = (msg, type = 'success') => {
            toast.value = { show: true, msg, type };
            setTimeout(() => toast.value.show = false, 3000);
        };

        const getToken = () =>
            localStorage.getItem('token_client') ||
            localStorage.getItem('token_admin') ||
            localStorage.getItem('token_super_admin');

        const fetchCaseTypes = async () => {
            loading.value = true;
            try {
                const res = await fetch(`${API_BASE_URL}/client/case-types`, {
                    headers: { Authorization: `Bearer ${getToken()}` }
                });
                const data = await res.json();
                if (data.success) {
                    caseTypes.value = data.data.caseTypes || [];
                }
            } catch (e) {
                console.error('[CaseTypeManager] fetch:', e);
            } finally {
                loading.value = false;
            }
        };

        const startAdd = () => {
            currentCT.value = {
                name: '',
                icon: 'ShieldCheckIcon',
                color: '#6366f1',
                description: '',
                fields: [],
                subCategories: []
            };
            view.value = 'edit';
        };

        const startEdit = (ct) => {
            currentCT.value = JSON.parse(JSON.stringify(ct)); // path clone
            if (!currentCT.value.subCategories) currentCT.value.subCategories = [];
            view.value = 'edit';
        };

        const addField = () => {
            currentCT.value.fields.push({
                name: 'field_' + Date.now(),
                label: '',
                type: 'text',
                required: false,
                options: [{ label: '', value: '', icon: '' }]
            });
        };

        const removeField = (index) => {
            currentCT.value.fields.splice(index, 1);
        };

        const handleSave = async () => {
            if (!currentCT.value.name) {
                showToast('Name is required', 'error');
                return;
            }

            loading.value = true;
            try {
                const isEdit = !!currentCT.value._id;
                const url = isEdit
                    ? `${API_BASE_URL}/client/case-types/${currentCT.value._id}`
                    : `${API_BASE_URL}/client/case-types`;

                const res = await fetch(url, {
                    method: isEdit ? 'PUT' : 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${getToken()}`
                    },
                    body: JSON.stringify(currentCT.value)
                });

                const data = await res.json();
                if (data.success) {
                    showToast(`Case type ${isEdit ? 'updated' : 'created'} successfully!`);
                    view.value = 'list';
                    await fetchCaseTypes();
                } else {
                    showToast(data.message, 'error');
                }
            } catch (e) {
                showToast('Network error', 'error');
            } finally {
                loading.value = false;
            }
        };

        const handleDelete = async (id) => {
            if (!confirm('Are you sure you want to delete this case type? This will hide it from the mobile app.')) return;

            try {
                const res = await fetch(`${API_BASE_URL}/client/case-types/${id}`, {
                    method: 'DELETE',
                    headers: { Authorization: `Bearer ${getToken()}` }
                });
                const data = await res.json();
                if (data.success) {
                    showToast('Case type deleted');
                    await fetchCaseTypes();
                }
            } catch (e) {
                showToast('Error deleting', 'error');
            }
        };

        const toggleCaseTypeStatus = async (ct) => {
            const newStatus = !ct.isActive;
            try {
                const res = await fetch(`${API_BASE_URL}/client/case-types/${ct._id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${getToken()}`
                    },
                    body: JSON.stringify({ isActive: newStatus })
                });

                const data = await res.json();
                if (data.success) {
                    ct.isActive = newStatus; // Optimistic update
                    showToast(`Case type ${newStatus ? 'activated' : 'deactivated'}`);
                } else {
                    showToast(data.message, 'error');
                }
            } catch (e) {
                showToast('Network error', 'error');
            }
        };

        const handleIconUpload = async (event, fieldIdx, optIdx) => {
            const file = event.target.files[0];
            if (!file) return;

            const key = `${fieldIdx}-${optIdx}`;
            isUploadingIcon.value[key] = true;

            try {
                // 1. Get Presigned URL
                const res = await fetch(`${API_BASE_URL}/mobile/cases/upload-url?fileName=${encodeURIComponent(file.name)}&fileType=${encodeURIComponent(file.type)}`, {
                    headers: { Authorization: `Bearer ${getToken()}` }
                });
                const data = await res.json();
                
                if (!data.success) throw new Error(data.message);

                const { uploadUrl, key: r2Key } = data.data;

                // 2. Upload to R2
                const uploadRes = await fetch(uploadUrl, {
                    method: 'PUT',
                    body: file,
                    headers: { 'Content-Type': file.type }
                });

                if (!uploadRes.ok) throw new Error('Failed to upload to R2');

                // Generate local preview for immediate display
                localPreviews.value[key] = URL.createObjectURL(file);

                // 3. Update Icon Key in currentCT (This will be saved to DB)
                currentCT.value.fields[fieldIdx].options[optIdx].icon = r2Key;
                showToast('Icon uploaded successfully');
            } catch (error) {
                console.error('[CaseTypeManager] upload error:', error);
                showToast(error.message || 'Icon upload failed', 'error');
            } finally {
                isUploadingIcon.value[key] = false;
            }
        };

        const handleSubIconUpload = async (event, optIdx) => {
            const file = event.target.files[0];
            if (!file) return;

            const key = `sub-${optIdx}`;
            isUploadingIcon.value[key] = true;

            try {
                const res = await fetch(`${API_BASE_URL}/mobile/cases/upload-url?fileName=${encodeURIComponent(file.name)}&fileType=${encodeURIComponent(file.type)}`, {
                    headers: { Authorization: `Bearer ${getToken()}` }
                });
                const data = await res.json();
                if (!data.success) throw new Error(data.message);
                const { uploadUrl, key: r2Key } = data.data;

                const uploadRes = await fetch(uploadUrl, {
                    method: 'PUT',
                    body: file,
                    headers: { 'Content-Type': file.type }
                });
                if (!uploadRes.ok) throw new Error('Failed to upload to R2');

                localPreviews.value[key] = URL.createObjectURL(file);
                currentCT.value.subCategories[optIdx].icon = r2Key;
                showToast('Icon uploaded successfully');
            } catch (error) {
                showToast(error.message || 'Icon upload failed', 'error');
            } finally {
                isUploadingIcon.value[key] = false;
            }
        };


        onMounted(fetchCaseTypes);

        return () => (
            <div style={{ padding: '24px', background: '#f8fafc', minHeight: '100vh', fontFamily: "'Inter', sans-serif" }}>
                {/* Toast */}
                {toast.value.show && (
                    <div style={{ position: 'fixed', top: '24px', right: '24px', zIndex: 1000, padding: '12px 24px', borderRadius: '12px', background: toast.value.type === 'error' ? '#fee2e2' : '#d1fae5', color: toast.value.type === 'error' ? '#991b1b' : '#065f46', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontWeight: '600', fontSize: '14px', border: `1px solid ${toast.value.type === 'error' ? '#fecaca' : '#a7f3d0'}` }}>
                        {toast.value.msg}
                    </div>
                )}

                {view.value === 'list' ? (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                            <div>
                                <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#111827', margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <ShieldCheckIcon style={{ width: '32px', height: '32px', color: '#f43f5e' }} />
                                    Case Type Setup
                                </h1>
                                <p style={{ color: '#6b7280', marginTop: '4px' }}>Manage the types of incidents users can report and their custom form fields.</p>
                            </div>
                            <button
                                onClick={startAdd}
                                style={{ background: '#f43f5e', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '12px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 6px -1px rgba(244, 63, 94, 0.2)' }}
                            >
                                <PlusIcon style={{ width: '20px', height: '20px' }} />
                                Add Case Type
                            </button>
                        </div>

                        {loading.value ? (
                            <div style={{ textAlign: 'center', padding: '100px' }}>Loading...</div>
                        ) : caseTypes.value.length === 0 ? (
                            <div style={{ background: 'white', padding: '80px', borderRadius: '24px', textAlign: 'center', border: '2px dashed #e2e8f0' }}>
                                <div style={{ fontSize: '48px', marginBottom: '16px' }}>📝</div>
                                <h2 style={{ color: '#1e293b' }}>No Case Types Found</h2>
                                <p style={{ color: '#64748b', maxWidth: '400px', margin: '8px auto 24px' }}>Create your first case type to allow users to report specific incidents in your city.</p>
                                <button onClick={startAdd} style={{ background: '#f43f5e', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer' }}>Get Started</button>
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
                                {caseTypes.value.map(ct => (
                                    <div key={ct._id} style={{ background: 'white', borderRadius: '20px', padding: '24px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', transition: 'transform 0.2s', position: 'relative', overflow: 'hidden' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                                            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#f43f5e' + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f43f5e' }}>
                                                <ShieldCheckIcon style={{ width: '24px', height: '24px' }} />
                                            </div>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <button onClick={() => startEdit(ct)} style={{ p: '8px', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer' }}>
                                                    <PencilIcon style={{ width: '16px', height: '16px', color: '#64748b' }} />
                                                </button>
                                                <button onClick={() => handleDelete(ct._id)} style={{ p: '8px', borderRadius: '8px', border: '1px solid #fee2e2', background: 'white', cursor: 'pointer' }}>
                                                    <TrashIcon style={{ width: '16px', height: '16px', color: '#ef4444' }} />
                                                </button>
                                            </div>
                                        </div>
                                        <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b', marginBottom: '8px' }}>{ct.name}</h3>
                                        <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '16px', flex: 1 }}>{ct.description || 'No description provided'}</p>                                        {/* Sub-Category Tile Previews */}
                                        {ct.subCategories && ct.subCategories.length > 0 && (
                                            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                                                {ct.subCategories.slice(0, 4).map((sub, sidx) => (
                                                    <div key={sidx} style={{ width: '32px', height: '32px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', overflow: 'hidden' }} title={sub.label}>
                                                        {sub.icon?.startsWith('http') ? (
                                                            <img src={sub.icon} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                        ) : (
                                                            <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 'bold' }}>
                                                                {sub.label?.charAt(0).toUpperCase()}
                                                            </span>
                                                        )}
                                                    </div>
                                                ))}
                                                {ct.subCategories.length > 4 && (
                                                    <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: '#64748b', fontWeight: '800' }}>
                                                        +{ct.subCategories.length - 4}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                                            <span style={{ color: '#94a3b8' }}>{ct.fields?.length || 0} Dynamic Fields</span>
                                            <div 
                                                onClick={() => toggleCaseTypeStatus(ct)}
                                                style={{ 
                                                    display: 'flex', 
                                                    alignItems: 'center', 
                                                    gap: '8px', 
                                                    cursor: 'pointer',
                                                    padding: '4px 12px',
                                                    borderRadius: '99px',
                                                    background: ct.isActive ? '#d1fae5' : '#f1f5f9',
                                                    transition: 'all 0.2s'
                                                }}
                                            >
                                                <div style={{ 
                                                    width: '32px', 
                                                    height: '16px', 
                                                    borderRadius: '16px', 
                                                    background: ct.isActive ? '#10b981' : '#cbd5e1', 
                                                    position: 'relative',
                                                    transition: 'all 0.3s'
                                                }}>
                                                    <div style={{ 
                                                        width: '12px', 
                                                        height: '12px', 
                                                        background: 'white', 
                                                        borderRadius: '50%', 
                                                        position: 'absolute', 
                                                        top: '2px', 
                                                        left: ct.isActive ? '18px' : '2px',
                                                        transition: 'all 0.3s'
                                                    }}></div>
                                                </div>
                                                <span style={{ color: ct.isActive ? '#065f46' : '#64748b', fontWeight: '700', fontSize: '12px' }}>
                                                    {ct.isActive ? 'Active' : 'Inactive'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    <div style={{ maxWidth: '900px', margin: '0 auto', paddingBottom: '100px' }}>
                        <div style={{ marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <button onClick={() => view.value = 'list'} style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'white', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}>
                                <ChevronLeftIcon style={{ width: '20px', height: '20px' }} />
                            </button>
                            <div>
                                <h1 style={{ fontSize: '26px', fontWeight: '900', color: '#0f172a', margin: 0 }}>
                                    {currentCT.value._id ? 'Edit Case Configuration' : 'Create New Case Type'}
                                </h1>
                                <p style={{ fontSize: '14px', color: '#64748b', margin: '4px 0 0' }}>Define how this case appears and what information is collected.</p>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gap: '32px' }}>
                            {/* STEP 1: IDENTITY */}
                            <div style={{ background: 'white', borderRadius: '24px', padding: '32px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '14px' }}>1</div>
                                    <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#1e293b', margin: 0 }}>Basic Identity</h3>
                                </div>
                                
                                <div style={{ display: 'grid', gap: '24px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#475569', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.025em' }}>Case Type Name *</label>
                                        <input
                                            v-model={currentCT.value.name}
                                            placeholder="Example: Snatching, Accident..."
                                            onInput={e => currentCT.value.name = e.target.value}
                                            style={{ width: '100%', padding: '14px 18px', borderRadius: '14px', border: '2px solid #f1f5f9', outline: 'none', fontSize: '16px', background: '#f8fafc' }}
                                        />
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#475569', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.025em' }}>Description / Purpose</label>
                                        <textarea
                                            v-model={currentCT.value.description}
                                            onInput={e => currentCT.value.description = e.target.value}
                                            placeholder="Short explanation for users..."
                                            rows="2"
                                            style={{ width: '100%', padding: '14px 18px', borderRadius: '14px', border: '2px solid #f1f5f9', outline: 'none', fontSize: '15px', background: '#f8fafc', resize: 'none' }}
                                        />
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#475569', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.025em' }}>Visibility Status</label>
                                        <select
                                            value={currentCT.value.isActive}
                                            onChange={e => currentCT.value.isActive = e.target.value === 'true'}
                                            style={{ width: '100%', padding: '14px 18px', borderRadius: '14px', border: '2px solid #f1f5f9', outline: 'none', background: '#f8fafc', fontWeight: '600' }}
                                        >
                                            <option value="true">Active (Visible on Mobile)</option>
                                            <option value="false">Inactive (Hidden)</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* STEP 2: SUB-CATEGORY TILES */}
                            <div style={{ background: 'white', borderRadius: '24px', padding: '32px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#f5f3ff', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '14px' }}>2</div>
                                        <div>
                                            <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#1e293b', margin: 0 }}>Sub-Category Tiles</h3>
                                            <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0' }}>These appear as shortcuts on the mobile app home screen.</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => currentCT.value.subCategories.push({ label: '', value: '', icon: '' })}
                                        style={{ background: '#7c3aed', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '12px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                                    >
                                        <PlusIcon style={{ width: '18px' }} /> Add Tile
                                    </button>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px' }}>
                                    {currentCT.value.subCategories?.map((sub, idx) => (
                                        <div key={idx} style={{ background: '#f8fafc', padding: '20px', borderRadius: '20px', border: '1px solid #f1f5f9', position: 'relative' }}>
                                            <button
                                                onClick={() => currentCT.value.subCategories.splice(idx, 1)}
                                                style={{ position: 'absolute', top: '12px', right: '12px', width: '24px', height: '24px', borderRadius: '12px', background: '#fee2e2', color: '#ef4444', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                            >
                                                <XMarkIcon style={{ width: '14px' }} />
                                            </button>
                                            
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                                                <div 
                                                    onClick={() => document.getElementById(`sub-file-${idx}`).click()}
                                                    style={{ width: '80px', height: '80px', borderRadius: '24px', background: 'white', border: '2px dashed #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative', overflow: 'hidden' }}
                                                >
                                                    {isUploadingIcon.value[`sub-${idx}`] ? (
                                                        <div style={{ fontSize: '11px', fontWeight: '700' }}>...</div>
                                                    ) : (localPreviews.value[`sub-${idx}`] || sub.icon) ? (
                                                        <img src={localPreviews.value[`sub-${idx}`] || sub.icon} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                    ) : (
                                                        <PlusIcon style={{ width: '24px', color: '#94a3b8' }} />
                                                    )}
                                                </div>
                                                <input 
                                                    type="file" 
                                                    id={`sub-file-${idx}`} 
                                                    style={{ display: 'none' }} 
                                                    onChange={(e) => handleSubIconUpload(e, idx)}
                                                />
                                                <input
                                                    placeholder="Tile Label (e.g. Mobile)"
                                                    value={sub.label}
                                                    onInput={e => { sub.label = e.target.value; sub.value = e.target.value; }}
                                                    style={{ width: '100%', textAlign: 'center', background: 'transparent', border: 'none', borderBottom: '2px solid #e2e8f0', padding: '4px 0', fontSize: '15px', fontWeight: '700', outline: 'none' }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                    {(!currentCT.value.subCategories || currentCT.value.subCategories.length === 0) && (
                                        <div 
                                            onClick={() => currentCT.value.subCategories.push({ label: '', value: '', icon: '' })}
                                            style={{ gridColumn: '1 / -1', height: '100px', border: '2px dashed #e2e8f0', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', cursor: 'pointer' }}
                                        >
                                            Add your first Sub-Category Tile
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* STEP 3: ADDITIONAL QUESTIONS */}
                            <div style={{ background: 'white', borderRadius: '24px', padding: '32px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#fff7ed', color: '#f97316', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '14px' }}>3</div>
                                        <div>
                                            <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#1e293b', margin: 0 }}>Custom Form Builder</h3>
                                            <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0' }}>Tailor the form users fill out after clicking a tile.</p>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button
                                            onClick={addField}
                                            style={{ background: '#f43f5e', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '12px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                                        >
                                            <PlusIcon style={{ width: '18px' }} /> Add Question
                                        </button>
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gap: '20px' }}>
                                    {currentCT.value.fields.map((field, index) => (
                                        <div key={index} style={{ 
                                            background: field.isActive === false ? '#f1f5f9' : '#f8fafc', 
                                            border: '1px solid #e2e8f0', 
                                            borderRadius: '20px', 
                                            padding: '24px', 
                                            position: 'relative', 
                                            display: 'flex', 
                                            gap: '20px',
                                            opacity: field.isActive === false ? 0.6 : 1
                                        }}>
                                            <div style={{ minWidth: '40px' }}>
                                                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'white', border: '2px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', color: '#94a3b8', fontSize: '14px' }}>
                                                    Q{index + 1}
                                                </div>
                                            </div>

                                            <div style={{ flex: 1, display: 'grid', gap: '20px' }}>
                                                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
                                                    <div>
                                                        <label style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Label *</label>
                                                        <input
                                                            v-model={field.label}
                                                            onInput={e => field.label = e.target.value}
                                                            placeholder="e.g., What happened?"
                                                            style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #cbd5e1', outline: 'none' }}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Type</label>
                                                        <select
                                                            value={field.type}
                                                            onChange={e => field.type = e.target.value}
                                                            style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #cbd5e1', outline: 'none' }}
                                                        >
                                                            <option value="text">Text</option>
                                                            <option value="number">Number</option>
                                                            <option value="boolean">Yes/No Question</option>
                                                        </select>
                                                    </div>
                                                </div>

                                                {field.type === 'select' && (
                                                    <div style={{ background: 'white', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                                                        <div style={{ display: 'grid', gap: '10px' }}>
                                                            {field.options && field.options.map((opt, optIdx) => (
                                                                <div key={optIdx} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                                                    <input
                                                                        placeholder="Option name..."
                                                                        value={opt.label}
                                                                        onInput={e => { opt.label = e.target.value; opt.value = e.target.value; }}
                                                                        style={{ flex: 1, padding: '10px 14px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '14px' }}
                                                                    />
                                                                    <button
                                                                        onClick={() => field.options.splice(optIdx, 1)}
                                                                        style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                                                                    >
                                                                        <XMarkIcon style={{ width: '18px' }} />
                                                                    </button>
                                                                </div>
                                                            ))}
                                                            <button
                                                                onClick={() => {
                                                                    if (!field.options) field.options = [];
                                                                    field.options.push({ label: '', value: '', icon: '' });
                                                                }}
                                                                style={{ padding: '10px', background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '10px', color: '#6366f1', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}
                                                            >
                                                                + Add Option
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}

                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
                                                    <button
                                                        onClick={() => removeField(index)}
                                                        style={{ background: 'white', border: '1px solid #fee2e2', color: '#ef4444', padding: '8px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}
                                                    >
                                                        Delete Question
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    {(!currentCT.value.fields || currentCT.value.fields.length === 0) && (
                                        <div 
                                            onClick={addField}
                                            style={{ textAlign: 'center', padding: '40px', background: '#f8fafc', border: '2px dashed #cbd5e1', borderRadius: '24px', color: '#64748b', cursor: 'pointer' }}
                                        >
                                            Add the first question for this case form.
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '16px', justifyContent: 'flex-end', marginTop: '32px' }}>
                                <button
                                    onClick={() => view.value = 'list'}
                                    style={{ padding: '12px 32px', borderRadius: '14px', border: '1px solid #cbd5e1', background: 'white', fontWeight: '700', color: '#475569', cursor: 'pointer' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={loading.value}
                                    style={{ padding: '12px 40px', borderRadius: '14px', border: 'none', background: '#f43f5e', color: 'white', fontWeight: '800', cursor: 'pointer' }}
                                >
                                    {loading.value ? 'Saving...' : 'Save Configuration'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    },
};
