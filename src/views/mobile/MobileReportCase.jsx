import { ref, computed, watch, onMounted } from 'vue'; // Added watch
import { useRoute, useRouter } from 'vue-router';
import { ArrowLeftIcon, MapPinIcon, PhotoIcon, VideoCameraIcon, ArrowRightIcon, ExclamationTriangleIcon, ShieldExclamationIcon, EyeSlashIcon, MegaphoneIcon, BanknotesIcon, FireIcon, CheckCircleIcon, PlusIcon, ShieldCheckIcon } from '@heroicons/vue/24/outline';
import api from '../../services/api.js';
import MyCases from './MyCases.jsx';

export default {
    name: 'MobileReportCase',
    setup() {
        const route = useRoute();
        const router = useRouter();

        // Multi-Step State
        const currentStep = ref(0); // 0: Select, 1: Description, 2: Location, 3: Details, 4: Review
        const caseTypes = ref([]);
        const selectedCT = ref(null);
        const loading = ref(false);
        const isFetching = ref(false);

        const formData = ref({
            location: '',
            latitude: null,
            longitude: null,
            dateTime: new Date().toISOString().slice(0, 16),
            description: '',
            media: [], // Local preview URLs
            mediaKeys: [], // R2 keys
            dynamicData: {}
        });

        const preFilledField = ref(null);
        const selectedSubTypeLabel = ref('');
        const isUploading = ref(false);
        const activeTab = ref('track'); // 'track' or 'report'

        const handleImageUpload = async (event) => {
// ... (rest of handleImageUpload remains the same)
            const files = Array.from(event.target.files);
            if (!files.length) return;

            isUploading.value = true;
            try {
                for (const file of files) {
                    const res = await api.getR2UploadUrl(file.name, file.type);
                    if (res?.success) {
                        const { uploadUrl, key } = res.data;
                        await api.uploadFileToR2(uploadUrl, file);
                        formData.value.mediaKeys.push(key);
                        formData.value.media.push(URL.createObjectURL(file));
                    }
                }
            } catch (e) {
                console.error('Upload failed:', e);
                alert('Media upload failed');
            } finally {
                isUploading.value = false;
            }
        };

        const fetchCaseTypes = async () => {
            isFetching.value = true;
            try {
                const res = await api.getMobileCaseTypes();
                if (res?.data) caseTypes.value = res.data;
            } catch (e) {
                console.error(e);
            } finally {
                isFetching.value = false;
            }
        };

        const handleCategoryClick = (ct) => {
            selectedCT.value = ct;
            preFilledField.value = null;
            selectedSubTypeLabel.value = '';
            
            // Initialize dynamic data
            const dyn = {};
            ct.fields?.forEach(f => dyn[f.name] = '');
            formData.value.dynamicData = dyn;
            currentStep.value = 1;
        };

        const handleSubOptionClick = (ct, fieldName, opt) => {
            selectedCT.value = ct;
            selectedSubTypeLabel.value = opt.label;
            preFilledField.value = fieldName;
            
            const dyn = {};
            ct.fields?.forEach(f => dyn[f.name] = '');
            dyn[fieldName] = opt.value;
            formData.value.dynamicData = dyn;
            currentStep.value = 1; // Jump to description
        };

        const getLocation = () => {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(pos => {
                    formData.value.latitude = pos.coords.latitude;
                    formData.value.longitude = pos.coords.longitude;
                    formData.value.location = `GPS: ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`;
                });
            }
        };

        const submitFinal = async () => {
            loading.value = true;
            try {
                const payload = {
                    title: `New ${selectedCT.value.name} Case`,
                    latitude: formData.value.latitude,
                    longitude: formData.value.longitude,
                    location: formData.value.location,
                    dateTime: formData.value.dateTime,
                    description: formData.value.description,
                    caseType: selectedCT.value.id,
                    ...formData.value.dynamicData,
                    mediaKeys: formData.value.mediaKeys
                };
                await api.reportCase(payload);
                router.replace('/mobile/user/dashboard');
            } catch (e) {
                alert('Submission failed');
            } finally {
                loading.value = false;
            }
        };

        onMounted(fetchCaseTypes);

        // Helper for dynamic icon resolution
        const IconMap = {
            ShieldCheckIcon, ShieldExclamationIcon, ExclamationTriangleIcon,
            MegaphoneIcon, BanknotesIcon, FireIcon, CheckCircleIcon,
            MapPinIcon, PhotoIcon, VideoCameraIcon, EyeSlashIcon,
            PlusIcon, ArrowRightIcon, ArrowLeftIcon
        };

        const resolveIcon = (iconSource, size = '24px', fallbackLabel = '') => {
            if (!iconSource) {
                if (fallbackLabel) {
                    return <span style={{ fontSize: '12px', fontWeight: '800' }}>{fallbackLabel.slice(0, 1).toUpperCase()}</span>;
                }
                return <ExclamationTriangleIcon style={{ width: size, height: size }} />;
            }

            // 1. URL Image
            if (iconSource.startsWith('http') || iconSource.startsWith('data:') || iconSource.startsWith('/')) {
                return <img src={iconSource} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />;
            }

            // 2. HeroIcon Component Name
            if (IconMap[iconSource]) {
                const IconComp = IconMap[iconSource];
                return <IconComp style={{ width: size, height: size }} />;
            }

            // 3. Emoji / Single Char
            if (iconSource.length <= 4) {
                return <span style={{ fontSize: '20px' }}>{iconSource}</span>;
            }

            // 4. Default Fallback (Initials if label provided, else warning icon)
            if (fallbackLabel) {
                return <span style={{ fontSize: '12px', fontWeight: '800' }}>{fallbackLabel.slice(0, 1).toUpperCase()}</span>;
            }
            return <ExclamationTriangleIcon style={{ width: size, height: size }} />;
        };

        // Sub-renderers
        const renderStep0 = () => (
            <div style={{ padding: '0 20px 20px' }}>
                {/* Modern Tab Switcher */}
                <div style={{ 
                    display: 'flex', 
                    background: 'rgba(255,255,255,0.03)', 
                    padding: '4px', 
                    borderRadius: '16px', 
                    marginBottom: '24px',
                    border: '1px solid rgba(255,255,255,0.05)',
                    position: 'sticky',
                    top: '0',
                    zIndex: '20',
                    backdropFilter: 'blur(10px)'
                }}>
                    <button 
                        onClick={() => activeTab.value = 'track'}
                        style={{ 
                            flex: 1,
                            padding: '12px',
                            borderRadius: '12px',
                            border: 'none',
                            background: activeTab.value === 'track' ? 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' : 'transparent',
                            color: activeTab.value === 'track' ? 'white' : '#94a3b8',
                            fontWeight: '800',
                            fontSize: '13px',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                            boxShadow: activeTab.value === 'track' ? '0 4px 15px rgba(99, 102, 241, 0.3)' : 'none'
                        }}
                    >
                        Track Status
                    </button>
                    <button 
                        onClick={() => activeTab.value = 'report'}
                        style={{ 
                            flex: 1,
                            padding: '12px',
                            borderRadius: '12px',
                            border: 'none',
                            background: activeTab.value === 'report' ? 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' : 'transparent',
                            color: activeTab.value === 'report' ? 'white' : '#94a3b8',
                            fontWeight: '800',
                            fontSize: '13px',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                            boxShadow: activeTab.value === 'report' ? '0 4px 15px rgba(99, 102, 241, 0.3)' : 'none'
                        }}
                    >
                        Add New Case
                    </button>
                </div>

                {/* Track Status View */}
                {activeTab.value === 'track' && (
                    <div className="fade-in-section">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', padding: '0 4px' }}>
                            <div style={{ width: '4px', height: '18px', background: '#6366f1', borderRadius: '2px' }}></div>
                            <h2 style={{ color: 'white', fontSize: '18px', fontWeight: '800', margin: 0 }}>My Cases</h2>
                            <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', marginLeft: 'auto', letterSpacing: '0.05em' }}>Real-time Updates</span>
                        </div>
                        <div style={{ margin: '0 -20px' }}>
                            <MyCases />
                        </div>
                    </div>
                )}

                {/* Add New Case View */}
                {activeTab.value === 'report' && (
                    <div className="fade-in-section">
                        <div style={{ padding: '0 4px', marginBottom: '20px' }}>
                            <h2 style={{ color: 'white', fontSize: '20px', fontWeight: '800', marginBottom: '4px' }}>Select Category</h2>
                            <p style={{ color: '#94a3b8', fontSize: '12px', margin: 0 }}>What kind of incident are you reporting?</p>
                        </div>
                        
                        <div style={{ display: 'grid', gap: '12px' }}>
                            {caseTypes.value.map(ct => {
                                const selectField = ct.fields?.find(f => f.type === 'select');
                                return (
                                    <div key={ct.id} className="glass-card" style={{ borderRadius: '24px', padding: '16px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: (selectField ? '16px' : '0') }}>
                                            <div style={{ width: '44px', height: '44px', borderRadius: '14px', background: ct.color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', color: ct.color, border: `1px solid ${ct.color}30`, flexShrink: 0 }}>
                                                {resolveIcon(ct.icon, '22px')}
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <h3 style={{ color: 'white', fontWeight: '800', margin: '0 0 2px', fontSize: '15px' }}>{ct.name}</h3>
                                                <p style={{ color: '#94a3b8', fontSize: '11px', margin: 0, lineHeight: '1.3', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ct.description}</p>
                                            </div>
                                            <button onClick={() => handleCategoryClick(ct)} style={{ width: '32px', height: '32px', borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.05)', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                <ArrowRightIcon style={{ width: '16px', height: '16px' }} />
                                            </button>
                                        </div>

                                        {selectField && (
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px' }}>
                                                {selectField.options?.map(opt => (
                                                    <div key={opt.value} onClick={() => handleSubOptionClick(ct, selectField.name, opt)} className="sub-option-grid-item" style={{ textAlign: 'center', cursor: 'pointer' }}>
                                                        <div style={{ width: '42px', height: '42px', margin: '0 auto 4px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden', color: ct.color }}>
                                                            {resolveIcon(opt.icon, '16px', opt.label)}
                                                        </div>
                                                        <div style={{ fontSize: '7px', color: '#64748b', fontWeight: '800', textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{opt.label}</div>
                                                    </div>
                                                ))}
                                                <div onClick={() => handleCategoryClick(ct)} className="sub-option-grid-item" style={{ textAlign: 'center', cursor: 'pointer' }}>
                                                    <div style={{ width: '42px', height: '42px', margin: '0 auto 4px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', border: '1px dashed rgba(255,255,255,0.1)' }}>
                                                        <PlusIcon style={{ width: '14px' }} />
                                                    </div>
                                                    <div style={{ fontSize: '7px', color: '#475569', fontWeight: '800', textTransform: 'uppercase' }}>OTHERS</div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        );

        const renderStep1 = () => (
            <div style={{ padding: '20px' }}>
                <div className="glass-card" style={{ borderRadius: '32px', padding: '28px', minHeight: '420px', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '28px' }}>
                        <div style={{ width: '44px', height: '44px', borderRadius: '14px', background: '#f9731620', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f97316', border: '1px solid #f9731630' }}>
                            <MegaphoneIcon style={{ width: '22px' }} />
                        </div>
                        <h2 style={{ fontSize: '20px', fontWeight: '800', color: 'white', margin: 0 }}>Incident Description</h2>
                    </div>
                    <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '16px', fontWeight: '500' }}>Can you describe what happened?</p>
                    <textarea
                        onInput={e => formData.value.description = e.target.value}
                        value={formData.value.description}
                        placeholder="e.g. Armed robbery by 2 people on a blue bike, heading North..."
                        style={{ flex: 1, width: '100%', border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.03)', borderRadius: '24px', padding: '20px', color: 'white', resize: 'none', fontSize: '15px', lineHeight: '1.6', outline: 'none' }}
                    />

                    {formData.value.media.length > 0 && (
                        <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', marginTop: '20px', paddingBottom: '10px' }}>
                            {formData.value.media.map((u, i) => (
                                <div key={i} style={{ width: '80px', height: '80px', borderRadius: '16px', overflow: 'hidden', flexShrink: 0, border: '2px solid rgba(255,255,255,0.1)' }}>
                                    <img src={u} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                </div>
                            ))}
                            {isUploading.value && (
                                <div style={{ width: '80px', height: '80px', borderRadius: '16px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <div className="upload-spinner"></div>
                                </div>
                            )}
                        </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginTop: '24px' }}>
                        <label style={{ background: 'rgba(255,255,255,0.03)', padding: '16px 8px', borderRadius: '20px', textAlign: 'center', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer' }}>
                            <PhotoIcon style={{ width: '24px', margin: '0 auto 6px' }} />
                            <div style={{ fontSize: '11px', fontWeight: '700' }}>Photo</div>
                            <input type="file" accept="image/*" multiple onChange={handleImageUpload} style={{ display: 'none' }} />
                        </label>
                        <div style={{ background: 'rgba(255,255,255,0.01)', padding: '16px 8px', borderRadius: '20px', textAlign: 'center', color: '#475569', border: '1px dashed rgba(255,255,255,0.05)', opacity: 0.6 }}>
                            <VideoCameraIcon style={{ width: '24px', margin: '0 auto 6px' }} />
                            <div style={{ fontSize: '11px', fontWeight: '700' }}>Video</div>
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.01)', padding: '16px 8px', borderRadius: '20px', textAlign: 'center', color: '#475569', border: '1px dashed rgba(255,255,255,0.05)', opacity: 0.6 }}>
                            <FireIcon style={{ width: '24px', margin: '0 auto 6px' }} />
                            <div style={{ fontSize: '11px', fontWeight: '700' }}>Audio</div>
                        </div>
                    </div>
                </div>
                <button onClick={() => currentStep.value = 2} className="premium-continue-btn" disabled={isUploading.value}>
                    {isUploading.value ? 'Uploading Media...' : 'Continue'} <ArrowRightIcon style={{ width: '18px' }} />
                </button>
            </div>
        );

        const renderStep2 = () => (
            <div style={{ padding: '20px' }}>
                <div className="glass-card" style={{ borderRadius: '32px', padding: '28px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '28px' }}>
                        <div style={{ width: '44px', height: '44px', borderRadius: '14px', background: '#0ea5e920', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0ea5e9', border: '1px solid #0ea5e930' }}>
                            <MapPinIcon style={{ width: '22px' }} />
                        </div>
                        <h2 style={{ fontSize: '20px', fontWeight: '800', color: 'white', margin: 0 }}>Incident Location</h2>
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                        <label style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: '10px', display: 'block', letterSpacing: '0.05em' }}>Address / Landmark</label>
                        <div style={{ position: 'relative' }}>
                            <input
                                onInput={e => formData.value.location = e.target.value}
                                value={formData.value.location}
                                placeholder="Where did it occur?"
                                style={{ width: '100%', padding: '16px 48px 16px 20px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '20px', color: 'white', fontSize: '15px', outline: 'none' }}
                            />
                            <button onClick={getLocation} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'rgba(14, 165, 233, 0.1)', color: '#0ea5e9', width: '32px', height: '32px', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <MapPinIcon style={{ width: '18px' }} />
                            </button>
                        </div>
                    </div>

                    <div>
                        <label style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: '10px', display: 'block', letterSpacing: '0.05em' }}>Incident Time</label>
                        <input
                            type="datetime-local"
                            onInput={e => formData.value.dateTime = e.target.value}
                            value={formData.value.dateTime}
                            style={{ width: '100%', padding: '16px 20px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '20px', color: 'white', fontSize: '15px', outline: 'none' }}
                        />
                    </div>
                </div>
                <button onClick={() => currentStep.value = 3} className="premium-continue-btn">
                    Continue <ArrowRightIcon style={{ width: '18px' }} />
                </button>
            </div>
        );

        const renderStep3 = () => {
            const fields = selectedCT.value?.fields || [];
            return (
                <div style={{ padding: '20px' }}>
                    <div className="glass-card" style={{ borderRadius: '32px', padding: '28px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '28px' }}>
                            <div style={{ width: '44px', height: '44px', borderRadius: '14px', background: '#e11d4820', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#e11d48', border: '1px solid #e11d4830' }}>
                                <ShieldCheckIcon style={{ width: '22px' }} />
                            </div>
                            <h2 style={{ fontSize: '20px', fontWeight: '800', color: 'white', margin: 0 }}>Additional Details</h2>
                        </div>
                        {fields.filter(f => f.name !== preFilledField.value).map(f => (
                            <div key={f.name} style={{ marginBottom: '20px' }}>
                                <label style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: '10px', display: 'block', letterSpacing: '0.05em' }}>{f.label}</label>
                                {f.type === 'select' ? (
                                    <select
                                        onChange={e => formData.value.dynamicData[f.name] = e.target.value}
                                        value={formData.value.dynamicData[f.name]}
                                        style={{ width: '100%', padding: '16px 20px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '20px', color: 'white', fontSize: '15px', outline: 'none', appearance: 'none' }}
                                    >
                                        <option value="" style={{ background: '#1e293b' }}>Select {f.label}</option>
                                        {f.options?.map(o => <option key={o.value} value={o.value} style={{ background: '#1e293b' }}>{o.label}</option>)}
                                    </select>
                                ) : f.type === 'boolean' ? (
                                    <div 
                                        onClick={() => formData.value.dynamicData[f.name] = (formData.value.dynamicData[f.name] === 'Yes' ? 'No' : 'Yes')}
                                        style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.03)', padding: '12px 20px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer' }}
                                    >
                                        <div style={{ 
                                            width: '40px', 
                                            height: '24px', 
                                            borderRadius: '12px', 
                                            background: formData.value.dynamicData[f.name] === 'Yes' ? '#10b981' : 'rgba(255,255,255,0.1)', 
                                            position: 'relative',
                                            transition: 'all 0.3s'
                                        }}>
                                            <div style={{ 
                                                width: '18px', 
                                                height: '18px', 
                                                background: 'white', 
                                                borderRadius: '50%', 
                                                position: 'absolute', 
                                                top: '3px', 
                                                left: formData.value.dynamicData[f.name] === 'Yes' ? '19px' : '3px',
                                                transition: 'all 0.3s'
                                            }}></div>
                                        </div>
                                        <span style={{ color: 'white', fontWeight: '800', fontSize: '14px' }}>
                                            {formData.value.dynamicData[f.name] === 'Yes' ? 'Yes' : 'No'}
                                        </span>
                                    </div>
                                ) : (
                                    <input
                                        type={f.type === 'number' ? 'number' : 'text'}
                                        onInput={e => formData.value.dynamicData[f.name] = e.target.value}
                                        value={formData.value.dynamicData[f.name]}
                                        style={{ width: '100%', padding: '16px 20px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '20px', color: 'white', fontSize: '15px', outline: 'none' }}
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                    <button onClick={() => currentStep.value = 4} className="premium-continue-btn">
                        Review Report <ArrowRightIcon style={{ width: '18px' }} />
                    </button>
                </div>
            );
        };

        const renderStep4 = () => (
            <div style={{ padding: '20px' }}>
                <div className="glass-card" style={{ borderRadius: '32px', padding: '28px' }}>
                    <h2 style={{ fontSize: '20px', fontWeight: '800', color: 'white', marginBottom: '28px' }}>Final Review</h2>

                    {[
                        { l: 'Incident Category', v: selectedCT.value.name, c: selectedCT.value.color },
                        ...(selectedSubTypeLabel.value ? [{ l: 'Sub-Type', v: selectedSubTypeLabel.value, c: selectedCT.value.color }] : []),
                        { l: 'Location Reported', v: formData.value.location },
                        { l: 'Description Summary', v: formData.value.description || 'No description provided.' }
                    ].map(item => (
                        <div key={item.l} style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '24px', padding: '20px', marginBottom: '16px', border: '1px solid rgba(255,255,255,0.04)' }}>
                            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '800', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.05em' }}>{item.l}</div>
                            <div style={{ color: item.c || 'white', fontWeight: '700', fontSize: '15px', lineHeight: '1.5' }}>{item.v}</div>
                        </div>
                    ))}
                </div>
                <button onClick={submitFinal} disabled={loading.value} className="premium-continue-btn" style={{ background: 'linear-gradient(135deg, #e11d48 0%, #be123c 100%)', boxShadow: '0 10px 25px rgba(225, 29, 72, 0.3)' }}>
                    {loading.value ? 'Finalizing...' : 'Submit Official Report'}
                    {!loading.value && <CheckCircleIcon style={{ width: '20px' }} />}
                </button>
            </div>
        );

        return () => (
            <div style={{ minHeight: '100vh', background: 'radial-gradient(circle at top right, #1e1b4b, #0f172a)', paddingTop: '20px', paddingBottom: '40px' }}>
                <style>{`
                    .premium-continue-btn {
                        width: 100%;
                        padding: 18px;
                        background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
                        color: white;
                        border: none;
                        border-radius: 18px;
                        font-weight: 800;
                        font-size: 16px;
                        margin-top: 24px;
                        cursor: pointer;
                        box-shadow: 0 10px 25px rgba(249, 115, 22, 0.3);
                        transition: all 0.3s ease;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 8px;
                    }
                    .premium-continue-btn:active { transform: scale(0.97); filter: brightness(1.1); }
                    .premium-continue-btn:disabled { opacity: 0.6; cursor: not-allowed; }

                    .glass-card {
                        background: rgba(30, 41, 59, 0.4);
                        backdrop-filter: blur(20px);
                        -webkit-backdrop-filter: blur(20px);
                        border: 1px solid rgba(255, 255, 255, 0.08);
                        box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3);
                        transition: transform 0.2s ease, border-color 0.2s ease;
                    }
                    .glass-card:active { transform: scale(0.99); border-color: rgba(255, 255, 255, 0.2); }

                    .sub-option-grid-item {
                        transition: all 0.2s ease;
                    }
                    .sub-option-grid-item:active { transform: scale(0.92); }
                    
                    @keyframes fadeIn {
                        from { opacity: 0; transform: translateY(10px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                    .fade-in-section { animation: fadeIn 0.4s ease forwards; }

                    .upload-spinner {
                        width: 20px;
                        height: 20px;
                        border: 2px solid rgba(255,255,255,0.1);
                        border-top-color: #6366f1;
                        border-radius: 50%;
                        animation: spin 0.8s linear infinite;
                    }
                    @keyframes spin {
                        to { transform: rotate(360deg); }
                    }
                `}</style>

                {/* Navbar */}
                <div style={{ padding: '0 24px', display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                    {currentStep.value > 0 && (
                        <button onClick={() => currentStep.value--} style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <ArrowLeftIcon style={{ width: '20px' }} />
                        </button>
                    )}
                    <h1 style={{ color: 'white', fontSize: '20px', fontWeight: '800', margin: 0, letterSpacing: '-0.02em' }}>
                        {currentStep.value === 0 ? 'Reports' : `Report ${selectedCT.value?.name}`}
                    </h1>
                </div>

                <div className="fade-in-section">
                    {currentStep.value === 0 && renderStep0()}
                    {currentStep.value === 1 && renderStep1()}
                    {currentStep.value === 2 && renderStep2()}
                    {currentStep.value === 3 && renderStep3()}
                    {currentStep.value === 4 && renderStep4()}
                </div>
            </div>
        );
    }
};
