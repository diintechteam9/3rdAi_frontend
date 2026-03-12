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
                fields: []
            };
            view.value = 'edit';
        };

        const startEdit = (ct) => {
            currentCT.value = JSON.parse(JSON.stringify(ct)); // path clone
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
                                        <div style={{ position: 'absolute', top: 0, left: 0, height: '4px', width: '100%', background: ct.color }}></div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                                            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: ct.color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', color: ct.color }}>
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
                                        <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '16px', flex: 1 }}>{ct.description || 'No description provided'}</p>

                                        {/* Sub-option Preview */}
                                        {ct.fields?.some(f => f.type === 'select' && f.options?.some(o => o.icon)) && (
                                            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                                                {ct.fields.find(f => f.type === 'select' && f.options?.some(o => o.icon)).options.slice(0, 4).map(opt => (
                                                    <div key={opt.value} style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }} title={opt.label}>
                                                        {opt.icon?.startsWith('http') ? <img src={opt.icon} style={{ width: '18px' }} /> : (opt.icon || '📍')}
                                                    </div>
                                                ))}
                                                {ct.fields.find(f => f.type === 'select' && f.options?.some(o => o.icon)).options.length > 4 && (
                                                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#64748b', fontWeight: '800' }}>
                                                        +{ct.fields.find(f => f.type === 'select' && f.options?.some(o => o.icon)).options.length - 4}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                                            <span style={{ color: '#94a3b8' }}>{ct.fields?.length || 0} Dynamic Fields</span>
                                            <span style={{ padding: '4px 10px', borderRadius: '99px', background: ct.isActive ? '#d1fae5' : '#f1f5f9', color: ct.isActive ? '#065f46' : '#64748b', fontWeight: '600' }}>
                                                {ct.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                        <div style={{ marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <button onClick={() => view.value = 'list'} style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'white', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                                <ChevronLeftIcon style={{ width: '20px', height: '20px' }} />
                            </button>
                            <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#111827' }}>
                                {currentCT.value._id ? 'Edit Case Type' : 'New Case Type'}
                            </h1>
                        </div>

                        <div style={{ display: 'grid', gap: '24px' }}>
                            <div style={{ background: 'white', borderRadius: '24px', padding: '32px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                                <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '20px', color: '#1e293b' }}>Basic Information</h3>
                                <div style={{ display: 'grid', gap: '20px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>Case Type Name *</label>
                                        <input
                                            v-model={currentCT.value.name}
                                            placeholder="e.g., Street Light Not Working"
                                            onInput={e => currentCT.value.name = e.target.value}
                                            style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #cbd5e1', outline: 'none' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>Description</label>
                                        <textarea
                                            v-model={currentCT.value.description}
                                            onInput={e => currentCT.value.description = e.target.value}
                                            placeholder="Give a short description of what this case is about..."
                                            rows="3"
                                            style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #cbd5e1', outline: 'none', resize: 'none' }}
                                        />
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>Brand Color</label>
                                            <input
                                                type="color"
                                                value={currentCT.value.color}
                                                onInput={e => currentCT.value.color = e.target.value}
                                                style={{ width: '100%', height: '45px', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>Status</label>
                                            <select
                                                value={currentCT.value.isActive}
                                                onChange={e => currentCT.value.isActive = e.target.value === 'true'}
                                                style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #cbd5e1', outline: 'none' }}
                                            >
                                                <option value="true">Active</option>
                                                <option value="false">Inactive</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div style={{ background: 'white', borderRadius: '24px', padding: '32px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                                    <div style={{ borderLeft: '4px solid #f43f5e', paddingLeft: '12px' }}>
                                        <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b', margin: 0 }}>Custom Form Fields</h3>
                                        <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0' }}>Add extra questions users should answer for this specific case type.</p>
                                    </div>
                                    <button
                                        onClick={addField}
                                        style={{ background: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0', padding: '8px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                                    >
                                        <PlusIcon style={{ width: '16px', height: '16px' }} />
                                        Add Question
                                    </button>
                                </div>

                                <div style={{ display: 'grid', gap: '16px' }}>
                                    {currentCT.value.fields.map((field, index) => (
                                        <div key={index} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '20px', position: 'relative' }}>
                                            <button
                                                onClick={() => removeField(index)}
                                                style={{ position: 'absolute', top: '20px', right: '20px', border: 'none', background: 'transparent', cursor: 'pointer' }}
                                            >
                                                <XMarkIcon style={{ width: '20px', height: '20px', color: '#ef4444' }} />
                                            </button>

                                            <div style={{ display: 'grid', gap: '16px' }}>
                                                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
                                                    <div>
                                                        <label style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Question Label *</label>
                                                        <input
                                                            v-model={field.label}
                                                            onInput={e => field.label = e.target.value}
                                                            placeholder="e.g., What is the height of the suspect?"
                                                            style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none' }}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Answer Type</label>
                                                        <select
                                                            v-model={field.type}
                                                            onChange={e => field.type = e.target.value}
                                                            style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none' }}
                                                        >
                                                            <option value="text">Text Box</option>
                                                            <option value="textarea">Large Paragraph</option>
                                                            <option value="number">Numeric Only</option>
                                                            <option value="select">Selection Dropdown</option>
                                                            <option value="date">Date picker</option>
                                                        </select>
                                                    </div>
                                                </div>

                                                {field.type === 'select' && (
                                                    <div style={{ marginTop: '12px' }}>
                                                        <label style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '10px' }}>Selection Options (Labels & Icons)</label>
                                                        <div style={{ display: 'grid', gap: '8px' }}>
                                                            {field.options && field.options.map((opt, optIdx) => (
                                                                <div key={optIdx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 32px', gap: '8px', alignItems: 'center' }}>
                                                                    <input
                                                                        placeholder="Label (e.g. MOBILE)"
                                                                        value={opt.label}
                                                                        onInput={e => { opt.label = e.target.value; opt.value = e.target.value; }}
                                                                        style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                                                                    />
                                                                    <input
                                                                        placeholder="Icon URL or Emoji"
                                                                        value={opt.icon}
                                                                        onInput={e => opt.icon = e.target.value}
                                                                        style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                                                                    />
                                                                    <button
                                                                        onClick={() => field.options.splice(optIdx, 1)}
                                                                        style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                                                                    >
                                                                        <XMarkIcon style={{ width: '16px', height: '16px' }} />
                                                                    </button>
                                                                </div>
                                                            ))}
                                                            <button
                                                                onClick={() => field.options.push({ label: '', value: '', icon: '' })}
                                                                style={{ padding: '8px', border: '1px dashed #cbd5e1', borderRadius: '8px', background: 'white', color: '#6366f1', fontSize: '12px', cursor: 'pointer', fontWeight: '600' }}
                                                            >
                                                                + Add Option
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}

                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={field.required}
                                                        onChange={e => field.required = e.target.checked}
                                                        id={`req-${index}`}
                                                    />
                                                    <label for={`req-${index}`} style={{ fontSize: '14px', color: '#475569', cursor: 'pointer' }}>Mandatory field (Required to submit form)</label>
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    {currentCT.value.fields.length === 0 && (
                                        <div style={{ textAlign: 'center', padding: '40px', background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '16px', color: '#64748b' }}>
                                            Pehle se kuch standard fields (Location, Photo, Description) har case mein rahenge. Naye sawal add karne ke liye upar "Add Question" button dabayein.
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '16px', justifyContent: 'flex-end', marginTop: '16px' }}>
                                <button
                                    onClick={() => view.value = 'list'}
                                    style={{ padding: '12px 32px', borderRadius: '12px', border: '1px solid #cbd5e1', background: 'white', fontWeight: '600', color: '#475569', cursor: 'pointer' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={loading.value}
                                    style={{ padding: '12px 32px', borderRadius: '12px', border: 'none', background: '#f43f5e', color: 'white', fontWeight: '700', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(244, 63, 94, 0.2)' }}
                                >
                                    {loading.value ? 'Saving...' : 'Save Configuration'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }
};
