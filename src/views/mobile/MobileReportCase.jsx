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

        const handleMediaUpload = async (event) => {
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
                        formData.value.media.push({
                            url: URL.createObjectURL(file),
                            type: file.type.startsWith('image/') ? 'image' : 
                                  file.type.startsWith('video/') ? 'video' : 'audio'
                        });
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
            const hasSubCategories = (ct.subCategories && ct.subCategories.length > 0) || 
                                     ct.fields?.some(f => f.type === 'select');
            
            if (hasSubCategories) {
                selectedCT.value = ct;
                // Stay on current step to let user pick sub-option
            } else {
                selectedCT.value = ct;
                preFilledField.value = null;
                selectedSubTypeLabel.value = '';
                
                // Initialize dynamic data
                const dyn = {};
                ct.fields?.forEach(f => dyn[f.name] = '');
                formData.value.dynamicData = dyn;
                currentStep.value = 1;
            }
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

        const searchSuggestions = ref([]);
        const isSearching = ref(false);
        let searchTimeout = null;

        const handleLocationInput = (e) => {
            const val = e.target.value;
            formData.value.location = val;

            if (searchTimeout) clearTimeout(searchTimeout);
            
            if (!val || val.length < 3) {
                searchSuggestions.value = [];
                return;
            }

            searchTimeout = setTimeout(async () => {
                isSearching.value = true;
                try {
                    const res = await api.searchLocation(val);
                    if (res?.success) {
                        searchSuggestions.value = res.data || [];
                    }
                } catch (err) {
                    console.error('Location search failed:', err);
                } finally {
                    isSearching.value = false;
                }
            }, 300);
        };

        const handleSelectSuggestion = async (loc) => {
            formData.value.location = loc.displayName;
            searchSuggestions.value = [];
            
            // Fetch exact coordinates using placeId
            if (loc.placeId) {
                try {
                    const res = await api.getPlaceDetails(loc.placeId);
                    if (res?.success) {
                        formData.value.latitude = res.data.lat;
                        formData.value.longitude = res.data.lng;
                    }
                } catch (err) {
                    console.error('Failed to get coordinates for place:', err);
                }
            }
        };

        const getLocation = () => {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(async (pos) => {
                    const lat = pos.coords.latitude;
                    const lon = pos.coords.longitude;
                    formData.value.latitude = lat;
                    formData.value.longitude = lon;
                    
                    // Try to get address via reverse geocoding
                    try {
                        const res = await api.reverseGeocode(lat, lon);
                        if (res?.success && res.data?.location) {
                            formData.value.location = res.data.location.formattedAddress;
                        } else {
                            formData.value.location = `GPS: ${lat.toFixed(4)}, ${lon.toFixed(4)}`;
                        }
                    } catch (err) {
                        formData.value.location = `GPS: ${lat.toFixed(4)}, ${lon.toFixed(4)}`;
                    }
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
                    message: formData.value.description,
                    caseType: selectedCT.value.id,
                    formData: {
                        ...formData.value.dynamicData,
                        media: formData.value.mediaKeys
                    }
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
            <div>

                {/* Track Status View */}
                {activeTab.value === 'track' && (
                    <div className="fade-in-section" style={{ padding: '16px 20px 0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', padding: '0 4px' }}>
                            <div style={{ width: '3px', height: '14px', background: '#3b82f6', borderRadius: '2px' }}></div>
                            <h2 style={{ color: '#0f172a', fontSize: '16px', fontWeight: '800', margin: 0 }}>My Cases</h2>
                            <span style={{ fontSize: '9px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', marginLeft: 'auto', letterSpacing: '0.05em' }}>Real-time</span>
                        </div>
                        <MyCases />
                    </div>
                )}

                {/* Add New Case View */}
                {activeTab.value === 'report' && (
                    <div className="fade-in-section" style={{ padding: '8px 20px 0' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                            {caseTypes.value.map(ct => {
                                const isActive = selectedCT.value?.id === ct.id;
                                const selectField = ct.fields?.find(f => f.type === 'select');
                                const displaySubs = (ct.subCategories && ct.subCategories.length > 0) 
                                    ? ct.subCategories 
                                    : (selectField?.options || []);

                                return (
                                    <div key={ct.id} style={{ display: 'contents' }}>
                                        <div 
                                            onClick={() => handleCategoryClick(ct)} 
                                            className="glass-card" 
                                            style={{ 
                                                borderRadius: '20px', 
                                                overflow: 'hidden',
                                                display: 'flex', 
                                                flexDirection: 'column', 
                                                cursor: 'pointer',
                                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                                border: isActive ? `2px solid ${ct.color || '#6366f1'}` : '1px solid #e2e8f0',
                                                background: 'white',
                                                position: 'relative'
                                            }}
                                        >
                                            {/* Header Section (Inspired by Image 2) */}
                                            <div style={{
                                                background: `linear-gradient(135deg, ${ct.color || '#6366f1'}20 0%, ${ct.color || '#6366f1'}08 100%)`,
                                                padding: '20px 16px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '12px',
                                                borderBottom: '1px solid rgba(0,0,0,0.03)',
                                                minHeight: '80px'
                                            }}>
                                                <div style={{ 
                                                    width: '44px', 
                                                    height: '44px', 
                                                    borderRadius: '14px', 
                                                    background: 'white', 
                                                    display: 'flex', 
                                                    alignItems: 'center', 
                                                    justifyContent: 'center', 
                                                    color: ct.color || '#6366f1',
                                                    boxShadow: '0 6px 12px rgba(0,0,0,0.05)',
                                                    flexShrink: 0
                                                }}>
                                                    {resolveIcon(ct.icon, '26px')}
                                                </div>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <h3 style={{ color: '#0f172a', fontWeight: '800', margin: 0, fontSize: '16px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '-0.02em' }}>{ct.name}</h3>
                                                    <p style={{ color: '#64748b', fontSize: '11px', margin: '2px 0 0', opacity: 0.8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Report {ct.name} incidents</p>
                                                </div>
                                            </div>

                                            {/* Sub-category Row (Labels Below Icons) - Refactored for In-Card Expansion */}
                                            {displaySubs.length > 0 && (
                                                <div style={{ 
                                                    padding: '16px 8px', 
                                                    display: 'flex', 
                                                    gap: '12px', 
                                                    justifyContent: 'center',
                                                    background: 'white',
                                                    flexWrap: 'wrap'
                                                }}>
                                                    {(isActive ? displaySubs : displaySubs.slice(0, 3)).map((sub, sidx) => (
                                                        <div 
                                                            key={sidx} 
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleSubOptionClick(ct, selectField?.name || 'subCategory', sub);
                                                            }}
                                                            style={{ 
                                                                display: 'flex',
                                                                flexDirection: 'column',
                                                                alignItems: 'center',
                                                                gap: '6px',
                                                                width: '56px',
                                                                marginBottom: isActive ? '12px' : '0'
                                                            }}
                                                        >
                                                            <div style={{ 
                                                                width: '40px', 
                                                                height: '40px', 
                                                                borderRadius: '12px', 
                                                                background: '#f8fafc', 
                                                                border: '1px solid #e2e8f0', 
                                                                display: 'flex', 
                                                                alignItems: 'center', 
                                                                justifyContent: 'center', 
                                                                overflow: 'hidden',
                                                                flexShrink: 0,
                                                                boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                                                            }}>
                                                                {resolveIcon(sub.icon, '20px', sub.label)}
                                                            </div>
                                                            <div style={{ 
                                                                fontSize: '8px', 
                                                                color: '#64748b', 
                                                                fontWeight: '800', 
                                                                textTransform: 'uppercase', 
                                                                textAlign: 'center',
                                                                whiteSpace: 'nowrap',
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis',
                                                                width: '100%'
                                                            }}>
                                                                {sub.label}
                                                            </div>
                                                        </div>
                                                    ))}

                                                    {/* Expansion Trigger / OTHERS */}
                                                    {isActive ? (
                                                        <div 
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                preFilledField.value = null;
                                                                selectedSubTypeLabel.value = '';
                                                                const dyn = {};
                                                                ct.fields?.forEach(f => dyn[f.name] = '');
                                                                formData.value.dynamicData = dyn;
                                                                currentStep.value = 1;
                                                            }}
                                                            style={{ 
                                                                display: 'flex',
                                                                flexDirection: 'column',
                                                                alignItems: 'center',
                                                                gap: '6px',
                                                                width: '56px',
                                                                cursor: 'pointer'
                                                            }}
                                                        >
                                                            <div style={{ 
                                                                width: '40px', 
                                                                height: '40px', 
                                                                borderRadius: '12px', 
                                                                background: 'white', 
                                                                display: 'flex', 
                                                                alignItems: 'center', 
                                                                justifyContent: 'center', 
                                                                color: '#64748b', 
                                                                border: '1px dashed #cbd5e1'
                                                            }}>
                                                                <PlusIcon style={{ width: '14px' }} />
                                                            </div>
                                                            <div style={{ fontSize: '8px', color: '#64748b', fontWeight: '800', textTransform: 'uppercase' }}>OTHERS</div>
                                                        </div>
                                                    ) : (
                                                        displaySubs.length > 3 && (
                                                            <div 
                                                                onClick={(e) => { e.stopPropagation(); handleCategoryClick(ct); }}
                                                                style={{ 
                                                                    display: 'flex',
                                                                    flexDirection: 'column',
                                                                    alignItems: 'center',
                                                                    gap: '6px',
                                                                    width: '56px',
                                                                    cursor: 'pointer'
                                                                }}
                                                            >
                                                                <div style={{ 
                                                                    width: '40px', 
                                                                    height: '40px', 
                                                                    borderRadius: '12px', 
                                                                    background: '#f8fafc', 
                                                                    border: '1px solid #e2e8f0', 
                                                                    display: 'flex', 
                                                                    alignItems: 'center', 
                                                                    justifyContent: 'center', 
                                                                    fontSize: '12px', 
                                                                    color: '#64748b', 
                                                                    fontWeight: '800',
                                                                    flexShrink: 0
                                                                }}>
                                                                    +{displaySubs.length - 3}
                                                                </div>
                                                                <div style={{ fontSize: '8px', color: '#64748b', fontWeight: '800', textTransform: 'uppercase' }}>MORE</div>
                                                            </div>
                                                        )
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        );

        const renderStep1 = () => (
            <div style={{ padding: '16px' }}>
                <div className="glass-card" style={{ borderRadius: '24px', padding: '16px', minHeight: '340px', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '12px', background: '#f9731620', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f97316', border: '1px solid #f9731630' }}>
                            <MegaphoneIcon style={{ width: '18px' }} />
                        </div>
                        <h2 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', margin: 0 }}>Incident Description</h2>
                    </div>
                    <p style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '10px', fontWeight: '500' }}>Can you describe what happened?</p>
                    <textarea
                        onInput={e => { formData.value.description = e.target.value; }}
                        onChange={e => { formData.value.description = e.target.value; }}
                        value={formData.value.description}
                        placeholder="e.g. Armed robbery by 2 people on a blue bike, heading North..."
                        style={{ flex: 1, width: '100%', border: '1px solid rgba(0,0,0,0.05)', background: 'rgba(0,0,0,0.02)', borderRadius: '16px', padding: '12px', color: '#0f172a', resize: 'none', fontSize: '13px', lineHeight: '1.4', outline: 'none' }}
                    />

                    {formData.value.media.length > 0 && (
                        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', marginTop: '12px', paddingBottom: '6px' }}>
                            {formData.value.media.map((m, i) => (
                                <div key={i} style={{ width: '60px', height: '60px', borderRadius: '12px', overflow: 'hidden', flexShrink: 0, border: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {m.type === 'image' ? (
                                        <img src={m.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : m.type === 'video' ? (
                                        <VideoCameraIcon style={{ width: '24px', color: '#6366f1' }} />
                                    ) : (
                                        <FireIcon style={{ width: '24px', color: '#f59e0b' }} />
                                    )}
                                </div>
                            ))}
                            {isUploading.value && (
                                <div style={{ width: '60px', height: '60px', borderRadius: '12px', background: 'rgba(0,0,0,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <div className="upload-spinner" style={{ width: '16px', height: '16px' }}></div>
                                </div>
                            )}
                        </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginTop: '16px' }}>
                        <label style={{ background: 'white', padding: '12px 6px', borderRadius: '16px', textAlign: 'center', color: '#64748b', border: '1px solid #e2e8f0', cursor: 'pointer' }}>
                            <PhotoIcon style={{ width: '20px', margin: '0 auto 4px' }} />
                            <div style={{ fontSize: '10px', fontWeight: '700' }}>Photo</div>
                            <input type="file" accept="image/*" multiple onChange={handleMediaUpload} style={{ display: 'none' }} />
                        </label>
                        <label style={{ background: 'white', padding: '12px 6px', borderRadius: '16px', textAlign: 'center', color: '#64748b', border: '1px solid #e2e8f0', cursor: 'pointer' }}>
                            <VideoCameraIcon style={{ width: '20px', margin: '0 auto 4px' }} />
                            <div style={{ fontSize: '10px', fontWeight: '700' }}>Video</div>
                            <input type="file" accept="video/*" multiple onChange={handleMediaUpload} style={{ display: 'none' }} />
                        </label>
                        <label style={{ background: 'white', padding: '12px 6px', borderRadius: '16px', textAlign: 'center', color: '#64748b', border: '1px solid #e2e8f0', cursor: 'pointer' }}>
                            <FireIcon style={{ width: '20px', margin: '0 auto 4px' }} />
                            <div style={{ fontSize: '10px', fontWeight: '700' }}>Audio</div>
                            <input type="file" accept="audio/*" multiple onChange={handleMediaUpload} style={{ display: 'none' }} />
                        </label>
                    </div>
                </div>
                <button onClick={() => currentStep.value = 2} className="premium-continue-btn" disabled={isUploading.value}>
                    {isUploading.value ? 'Uploading Media...' : 'Continue'} <ArrowRightIcon style={{ width: '18px' }} />
                </button>
            </div>
        );

        const renderStep2 = () => (
            <div style={{ padding: '16px' }}>
                <div className="glass-card" style={{ borderRadius: '24px', padding: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '12px', background: '#0ea5e920', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0ea5e9', border: '1px solid #0ea5e930' }}>
                            <MapPinIcon style={{ width: '18px' }} />
                        </div>
                        <h2 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', margin: 0 }}>Incident Location</h2>
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ fontSize: '10px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: '6px', display: 'block', letterSpacing: '0.05em' }}>Address / Landmark</label>
                        <div style={{ position: 'relative' }}>
                            <input
                                onInput={handleLocationInput}
                                value={formData.value.location}
                                placeholder="Where did it occur?"
                                style={{ width: '100%', padding: '12px 42px 12px 16px', background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.05)', borderRadius: '14px', color: '#0f172a', fontSize: '13px', outline: 'none' }}
                            />
                            <button onClick={getLocation} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'rgba(14, 165, 233, 0.1)', color: '#0ea5e9', width: '28px', height: '28px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <MapPinIcon style={{ width: '14px' }} />
                            </button>

                            {/* Suggestion List */}
                            {searchSuggestions.value.length > 0 && (
                                <div style={{ 
                                    position: 'absolute', 
                                    top: '100%', 
                                    left: 0, 
                                    right: 0, 
                                    background: 'white', 
                                    borderRadius: '14px', 
                                    marginTop: '8px', 
                                    boxShadow: '0 10px 25px rgba(0,0,0,0.1)', 
                                    zIndex: 100,
                                    border: '1px solid #e2e8f0',
                                    overflow: 'hidden'
                                }}>
                                    {searchSuggestions.value.map((loc, idx) => (
                                        <div 
                                            key={idx}
                                            onClick={() => handleSelectSuggestion(loc)}
                                            style={{ 
                                                padding: '12px 16px', 
                                                fontSize: '13px', 
                                                borderBottom: idx === searchSuggestions.value.length - 1 ? 'none' : '1px solid #f1f5f9',
                                                cursor: 'pointer',
                                                color: '#1e293b',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '10px'
                                            }}
                                            onMouseOver={(e) => e.currentTarget.style.background = '#f8fafc'}
                                            onMouseOut={(e) => e.currentTarget.style.background = 'white'}
                                        >
                                            <MapPinIcon style={{ width: '14px', color: '#64748b' }} />
                                            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{loc.displayName}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {isSearching.value && (
                                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, padding: '12px', textAlign: 'center', background: 'white', borderRadius: '14px', marginTop: '4px', fontSize: '12px', color: '#64748b' }}>
                                    Searching...
                                </div>
                            )}
                        </div>
                    </div>

                    <div>
                        <label style={{ fontSize: '10px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: '6px', display: 'block', letterSpacing: '0.05em' }}>Incident Time</label>
                        <input
                            type="datetime-local"
                            onInput={e => formData.value.dateTime = e.target.value}
                            value={formData.value.dateTime}
                            style={{ width: '100%', padding: '12px 16px', background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.05)', borderRadius: '14px', color: '#0f172a', fontSize: '13px', outline: 'none' }}
                        />
                    </div>
                </div>
                <button onClick={() => currentStep.value = 3} className="premium-continue-btn" style={{ marginTop: '16px' }}>
                    Continue <ArrowRightIcon style={{ width: '16px' }} />
                </button>
            </div>
        );

        const renderStep3 = () => {
            const fields = selectedCT.value?.fields || [];
            return (
                <div style={{ padding: '16px' }}>
                    <div className="glass-card" style={{ borderRadius: '24px', padding: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                            <div style={{ width: '36px', height: '36px', borderRadius: '12px', background: '#e11d4820', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#e11d48', border: '1px solid #e11d4830' }}>
                                <ShieldCheckIcon style={{ width: '18px' }} />
                            </div>
                            <h2 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', margin: 0 }}>Additional Details</h2>
                        </div>
                        {fields.filter(f => f.name !== preFilledField.value).map(f => (
                            <div key={f.name} style={{ marginBottom: '16px' }}>
                                <label style={{ fontSize: '10px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: '6px', display: 'block', letterSpacing: '0.05em' }}>{f.label}</label>
                                {f.type === 'select' ? (
                                    <select
                                        onChange={e => { formData.value.dynamicData[f.name] = e.target.value; }}
                                        value={formData.value.dynamicData[f.name]}
                                        style={{ width: '100%', padding: '12px 16px', background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.05)', borderRadius: '14px', color: '#0f172a', fontSize: '13px', outline: 'none', appearance: 'none' }}
                                    >
                                        <option value="" style={{ background: 'white' }}>Select {f.label}</option>
                                        {f.options?.map(o => <option key={o.value} value={o.value} style={{ background: 'white' }}>{o.label}</option>)}
                                    </select>
                                ) : f.type === 'boolean' ? (
                                    <div 
                                        onClick={() => formData.value.dynamicData[f.name] = (formData.value.dynamicData[f.name] === 'Yes' ? 'No' : 'Yes')}
                                        style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(0,0,0,0.01)', padding: '10px 16px', borderRadius: '14px', border: '1px solid rgba(0,0,0,0.03)', cursor: 'pointer' }}
                                    >
                                        <div style={{ 
                                            width: '32px', 
                                            height: '20px', 
                                            borderRadius: '10px', 
                                            background: formData.value.dynamicData[f.name] === 'Yes' ? '#10b981' : 'rgba(0,0,0,0.1)', 
                                            position: 'relative',
                                            transition: 'all 0.3s'
                                        }}>
                                            <div style={{ 
                                                width: '14px', 
                                                height: '14px', 
                                                background: 'white', 
                                                borderRadius: '50%', 
                                                position: 'absolute', 
                                                top: '3px', 
                                                left: formData.value.dynamicData[f.name] === 'Yes' ? '15px' : '3px',
                                                transition: 'all 0.3s',
                                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                            }} />
                                        </div>
                                        <span style={{ fontSize: '13px', color: '#475569', fontWeight: '700' }}>
                                            {formData.value.dynamicData[f.name] === 'Yes' ? 'Yes' : 'No'}
                                        </span>
                                    </div>
                                ) : (
                                    <input
                                        type={f.type === 'number' ? 'number' : 'text'}
                                        onInput={e => { formData.value.dynamicData[f.name] = e.target.value; }}
                                        onChange={e => { formData.value.dynamicData[f.name] = e.target.value; }}
                                        value={formData.value.dynamicData[f.name]}
                                        style={{ width: '100%', padding: '12px 16px', background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.05)', borderRadius: '14px', color: '#0f172a', fontSize: '13px', outline: 'none' }}
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                    <button 
                        onClick={() => currentStep.value = 4} 
                        className="premium-continue-btn" 
                        style={{ marginTop: '16px' }}
                    >
                        Review Report <ArrowRightIcon style={{ width: '18px' }} />
                    </button>
                </div>
            );
        };

        const renderStep4 = () => (
            <div style={{ padding: '16px' }}>
                <div className="glass-card" style={{ borderRadius: '24px', padding: '16px' }}>
                    <h2 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', marginBottom: '20px' }}>Final Review</h2>

                    <div style={{ display: 'grid', gap: '10px' }}>
                        {[
                            { l: 'Incident Category', v: selectedCT.value.name, c: selectedCT.value.color },
                            ...(selectedSubTypeLabel.value ? [{ l: 'Sub-Type', v: selectedSubTypeLabel.value, c: selectedCT.value.color }] : []),
                            { l: 'Location Reported', v: formData.value.location },
                            { l: 'Incident Time', v: new Date(formData.value.dateTime).toLocaleString() },
                            { l: 'Description Summary', v: formData.value.description || 'No description provided.' }
                        ].map(item => (
                            <div key={item.l} style={{ background: '#f8fafc', borderRadius: '16px', padding: '12px', border: '1px solid #e2e8f0' }}>
                                <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '800', textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '0.05em' }}>{item.l}</div>
                                <div style={{ color: item.c || '#0f172a', fontWeight: '700', fontSize: '13px', lineHeight: '1.4' }}>{item.v}</div>
                            </div>
                        ))}

                        {/* Media Section in Review */}
                        {formData.value.media.length > 0 && (
                            <div style={{ background: '#f8fafc', borderRadius: '16px', padding: '12px', border: '1px solid #e2e8f0' }}>
                                <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '800', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.05em' }}>Evidence / Media</div>
                                <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                                    {formData.value.media.map((m, i) => (
                                        <div key={i} style={{ width: '48px', height: '48px', borderRadius: '10px', overflow: 'hidden', flexShrink: 0, border: '1px solid #cbd5e1', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            {m.type === 'image' ? (
                                                <img src={m.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            ) : m.type === 'video' ? (
                                                <VideoCameraIcon style={{ width: '20px', color: '#6366f1' }} />
                                            ) : (
                                                <FireIcon style={{ width: '20px', color: '#f59e0b' }} />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Dynamic Fields Section */}
                        {Object.keys(formData.value.dynamicData).length > 0 && (
                            <div style={{ background: '#f8fafc', borderRadius: '16px', padding: '12px', border: '1px solid #e2e8f0' }}>
                                <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '800', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.05em' }}>Additional Details</div>
                                {Object.entries(formData.value.dynamicData).map(([key, value]) => {
                                    if (key === preFilledField.value) return null;
                                    return (
                                        <div key={key} style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                                            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>{key}:</span>
                                            <span style={{ fontSize: '12px', color: '#0f172a', fontWeight: '700' }}>{value || 'N/A'}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
                <button 
                    onClick={submitFinal} 
                    disabled={loading.value} 
                    className="premium-continue-btn" 
                    style={{ background: 'linear-gradient(135deg, #e11d48 0%, #be123c 100%)', boxShadow: '0 8px 20px rgba(225, 29, 72, 0.2)', marginTop: '16px' }}
                >
                    {loading.value ? 'Finalizing...' : 'Submit Official Report'}
                    {!loading.value && <ShieldCheckIcon style={{ width: '18px' }} />}
                </button>
            </div>
        );

        return () => (
            <div style={{ minHeight: '100vh', background: '#f8fafc', paddingTop: '2.6rem', paddingBottom: '30px', fontFamily: "'Inter', sans-serif" }}>
                <style>{`
                    .premium-continue-btn {
                        width: 100%;
                        padding: 14px;
                        background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
                        color: white;
                        border: none;
                        border-radius: 14px;
                        font-weight: 800;
                        font-size: 14px;
                        cursor: pointer;
                        box-shadow: 0 8px 20px rgba(249, 115, 22, 0.2);
                        transition: all 0.3s ease;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 8px;
                    }
                    .premium-continue-btn:active { transform: scale(0.97); filter: brightness(1.1); }
                    .premium-continue-btn:disabled { opacity: 0.6; cursor: not-allowed; }

                    .glass-card {
                        background: white;
                        backdrop-filter: blur(20px);
                        -webkit-backdrop-filter: blur(20px);
                        border: 1px solid #e2e8f0;
                        box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.05);
                        transition: transform 0.2s ease, border-color 0.2s ease;
                    }
                    .glass-card:active { transform: scale(0.99); border-color: #cbd5e1; }

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
                    @keyframes fadeInDown {
                        from { opacity: 0; transform: translateY(-10px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                `}</style>

                <div style={{ 
                    padding: '0 20px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    height: '64px',
                    position: 'sticky',
                    top: '64px',
                    background: '#f8fafc',
                    zIndex: '90',
                    width: '100%',
                    borderBottom: '1px solid #e2e8f0',
                    justifyContent: 'space-between'
                }}>
                    {currentStep.value > 0 ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <button onClick={() => currentStep.value--} style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'white', border: '1px solid #e2e8f0', color: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                                <ArrowLeftIcon style={{ width: '18px' }} />
                            </button>
                            <h1 style={{ color: '#0f172a', fontSize: '18px', fontWeight: '800', margin: 0, letterSpacing: '-0.02em' }}>
                                Report {selectedCT.value?.name}
                            </h1>
                        </div>
                    ) : (
                        <>
                            <h1 style={{ color: '#0f172a', fontSize: '20px', fontWeight: '900', margin: 0, letterSpacing: '-0.03em' }}>
                                {activeTab.value === 'track' ? 'Reports' : 'Select Category'}
                            </h1>
                            <button 
                                onClick={() => activeTab.value = activeTab.value === 'track' ? 'report' : 'track'}
                                style={{ 
                                    padding: '8px 14px', 
                                    borderRadius: '10px', 
                                    background: activeTab.value === 'track' ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' : '#fff',
                                    color: activeTab.value === 'track' ? 'white' : '#1e293b',
                                    border: activeTab.value === 'track' ? 'none' : '1px solid #e2e8f0',
                                    fontSize: '12px',
                                    fontWeight: '800',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    cursor: 'pointer',
                                    boxShadow: activeTab.value === 'track' ? '0 4px 12px rgba(37, 99, 235, 0.2)' : '0 2px 4px rgba(0,0,0,0.02)',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                {activeTab.value === 'track' ? (
                                    <>
                                        <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <span style={{ fontSize: '14px', lineHeight: 1 }}>+</span>
                                        </div>
                                        Add New Case
                                    </>
                                ) : (
                                    'Cancel'
                                )}
                            </button>
                        </>
                    )}
                </div>

                <div 
                    className="fade-in-section" 
                    style={{ 
                        maxWidth: '600px', 
                        margin: '0 auto',
                        paddingBottom: '40px'
                    }}
                >
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
