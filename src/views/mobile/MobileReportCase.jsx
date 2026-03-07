import { ref, computed, watch, onMounted } from 'vue'; // Added watch
import { useRoute, useRouter } from 'vue-router';
import { ArrowLeftIcon, MapPinIcon, PhotoIcon, VideoCameraIcon, ArrowRightIcon, ExclamationTriangleIcon, ShieldExclamationIcon, EyeSlashIcon, MegaphoneIcon, BanknotesIcon, FireIcon, CheckCircleIcon } from '@heroicons/vue/24/outline';
import api from '../../services/api.js';
import MyCases from './MyCases.jsx';

export default {
    name: 'MobileReportCase',
    setup() {
        const route = useRoute();
        const router = useRouter();
        const caseType = ref(route.query.type || '');
        const activeMainTab = ref('report');

        // Dynamic Fields
        const dynamicFormFields = ref([]);
        const isFetchingForm = ref(false);

        const casesList = [
            { id: 'robbery', name: 'Robbery', icon: BanknotesIcon, color: '#dc2626', description: 'Report an armed robbery or holdup' },
            { id: 'unidentified_emergency', name: 'Emergency / Unknown Incident', icon: FireIcon, color: '#b91c1c', description: 'Report dead bodies, suspicious objects, etc.' },
            { id: 'snatching', name: 'Snatching', icon: ExclamationTriangleIcon, color: '#f97316', description: 'Report a chain, bag, or mobile snatching incident' },
            { id: 'theft', name: 'Theft', icon: EyeSlashIcon, color: '#ef4444', description: 'Report a home, shop, or vehicle theft' },
            { id: 'harassment', name: 'Harassment / Suspicious Activity', icon: ShieldExclamationIcon, color: '#8b5cf6', description: 'Report stalking or suspicious persons' },
            { id: 'accident', name: 'Accident', icon: MegaphoneIcon, color: '#eab308', description: 'Report a road accident or hit & run' },
            { id: 'camera_issue', name: 'Camera / Safety Issue', icon: VideoCameraIcon, color: '#3b82f6', description: 'Report blind spots or non-working cameras' }
        ];

        const loading = ref(false);

        // Common fields
        const formData = ref({
            location: '',
            latitude: null,
            longitude: null,
            dateTime: '',
            description: '',
            isAnonymous: false,
            media: [], // would store files

            // Dynamic data object populated via API
            dynamicData: {}
        });

        const caseNames = {
            'robbery': 'Robbery',
            'unidentified_emergency': 'Emergency / Unknown Incident',
            'snatching': 'Snatching',
            'theft': 'Theft',
            'harassment': 'Harassment / Suspicious Activity',
            'accident': 'Accident',
            'camera_issue': 'Camera / Safety Issue'
        };

        const currentCaseName = computed(() => caseNames[caseType.value] || 'Report a Case');

        const getLocation = () => {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        formData.value.latitude = position.coords.latitude;
                        formData.value.longitude = position.coords.longitude;
                        formData.value.location = `${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)} (Auto GPS)`;
                    },
                    (error) => {
                        alert('Unable to retrieve your location. Please enter manually.');
                    }
                );
            } else {
                alert('Geolocation is not supported by your browser.');
            }
        };

        const goBack = () => {
            if (caseType.value && !route.query.type) {
                caseType.value = '';
            } else {
                router.back();
            }
        };

        const handleCaseClick = (cId) => {
            caseType.value = cId;
        };

        const handleFileUpload = (e) => {
            // Dummy handling for file input
            const files = Array.from(e.target.files);
            formData.value.media = [...formData.value.media, ...files];
        };

        // Fetch dynamic form fields whenever the caseType changes
        watch(caseType, async (newType) => {
            if (!newType) {
                dynamicFormFields.value = [];
                formData.value.dynamicData = {};
                return;
            }

            isFetchingForm.value = true;
            try {
                // Fetch dynamic fields from the backend
                const response = await api.getMobileCaseForm(newType);
                if (response?.data?.specificFields) {
                    dynamicFormFields.value = response.data.specificFields;

                    // Initialize empty state for all new dynamic fields
                    const newDynamicData = {};
                    response.data.specificFields.forEach(f => {
                        newDynamicData[f.name] = ''; // Blank out 
                    });
                    formData.value.dynamicData = newDynamicData;
                }
            } catch (err) {
                console.error("Failed to load dynamic fields:", err);
                alert("Could not load form fields. Please check your connection.");
            } finally {
                isFetchingForm.value = false;
            }
        });

        const submitCase = async () => {
            loading.value = true;
            try {
                const payload = {
                    title: formData.value.incidentTitle || `New ${currentCaseName.value} Case`,
                    type: 'USER',
                    priority: 'high',
                    // ── GPS coordinates at top-level for server-side geo-routing ──
                    // Backend reads req.body.latitude / req.body.longitude to find
                    // matching area polygon via $geoIntersects and auto-assign partner
                    latitude: formData.value.latitude,
                    longitude: formData.value.longitude,
                    // ── Full form data stored as metadata ──
                    formData: {
                        type: caseType.value,
                        ...formData.value.dynamicData, // Insert dynamic user inputs
                        description: formData.value.description,
                        isAnonymous: formData.value.isAnonymous,
                        dateTime: formData.value.dateTime
                    }
                };

                console.log('Submitting case payload:', {
                    ...payload,
                    geoRouting: payload.latitude
                        ? `GPS: [${payload.latitude}, ${payload.longitude}]`
                        : 'No GPS provided'
                });

                await api.reportCase(payload);

                alert(`✅ ${currentCaseName.value} case reported successfully!\nA response team has been notified.`);
                router.replace('/mobile/user/dashboard');
                loading.value = false;
            } catch (e) {
                console.error(e);
                alert('Error submitting report. Please try again.');
                loading.value = false;
            }
        };


        return () => (
            <div class="report-case-container" style={{ minHeight: '100vh', background: '#f8fafc', paddingBottom: '2rem' }}>
                <style>{`
                    .cases-grid {
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
                        gap: 1.25rem;
                        padding-bottom: 2rem;
                    }

                    .case-card-selection {
                        background: white;
                        border-radius: 20px;
                        padding: 1.5rem;
                        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
                        cursor: pointer;
                        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                        border: 1px solid #f1f5f9;
                        position: relative;
                        overflow: hidden;
                        display: flex;
                        flex-direction: column;
                    }

                    .case-card-selection:hover {
                        transform: translateY(-8px);
                        box-shadow: 0 20px 30px rgba(0, 0, 0, 0.1);
                        border-color: #4f46e530;
                    }

                    .selection-icon-container {
                        width: 56px;
                        height: 56px;
                        border-radius: 16px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        margin-bottom: 1.25rem;
                        transition: all 0.3s ease;
                        position: relative;
                        z-index: 2;
                    }

                    .case-card-selection:hover .selection-icon-container {
                        transform: scale(1.1) rotate(-5deg);
                    }

                    .selection-title {
                        font-size: 1.15rem;
                        font-weight: 800;
                        color: #1e293b;
                        margin-bottom: 0.5rem;
                        letter-spacing: -0.02em;
                    }

                    .selection-description {
                        font-size: 0.9rem;
                        color: #64748b;
                        line-height: 1.5;
                        margin-bottom: 1.5rem;
                        flex: 1;
                        font-weight: 500;
                    }

                    .selection-action {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        margin-top: auto;
                        padding-top: 1rem;
                        border-top: 1px solid #f8fafc;
                    }

                    .selection-action-text {
                        font-size: 0.85rem;
                        color: #6366f1;
                        font-weight: 700;
                    }

                    .selection-arrow {
                        width: 36px;
                        height: 36px;
                        border-radius: 12px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        transition: all 0.3s ease;
                        background: #f8fafc;
                        border: 1px solid #f1f5f9;
                    }

                    .case-card-selection:hover .selection-arrow {
                        background: #4f46e510;
                        transform: translateX(4px);
                    }

                    .form-container {
                        max-width: 600px;
                        margin: 0 auto;
                        padding-bottom: 2rem;
                    }

                    .form-section {
                        background: white;
                        border-radius: 20px;
                        padding: 1.5rem;
                        margin-bottom: 1.25rem;
                        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.03);
                        border: 1px solid #f1f5f9;
                        transition: all 0.3s ease;
                    }

                    .form-section:focus-within {
                        border-color: #4f46e530;
                        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.05);
                    }

                    .input-label {
                        display: block;
                        font-size: 0.9rem;
                        font-weight: 700;
                        color: #1e293b;
                        margin-bottom: 0.75rem;
                        letter-spacing: -0.01em;
                    }

                    .input-field {
                        width: 100%;
                        padding: 0.85rem 1rem;
                        border-radius: 12px;
                        border: 1.5px solid #e2e8f0;
                        font-size: 1rem;
                        color: #1e293b;
                        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                        background: #f8fafc;
                        box-sizing: border-box;
                    }

                    .input-field:focus {
                        outline: none;
                        border-color: #4f46e5;
                        background: white;
                        box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.1);
                    }

                    .submit-btn {
                        width: 100%;
                        padding: 1.1rem;
                        background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
                        color: white;
                        border: none;
                        borderRadius: 16px;
                        font-size: 1.1rem;
                        font-weight: 700;
                        cursor: pointer;
                        box-shadow: 0 10px 20px rgba(79, 70, 229, 0.3);
                        transition: all 0.3s ease;
                        letter-spacing: 0.5px;
                        margin-top: 1rem;
                    }

                    .submit-btn:hover {
                        transform: translateY(-2px);
                        box-shadow: 0 15px 30px rgba(79, 70, 229, 0.4);
                        filter: brightness(1.1);
                    }

                    .submit-btn:active {
                        transform: translateY(0);
                    }

                    .submit-btn:disabled {
                        background: #cbd5e1;
                        box-shadow: none;
                        cursor: not-allowed;
                    }

                    @media (max-width: 768px) {
                        .cases-grid { grid-template-columns: 1fr; gap: 1rem; }
                    }
                `}</style>
                {/* Header - Only show when a specific case is selected */}
                {caseType.value && (
                    <div style={{
                        background: 'white',
                        padding: '1rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                        position: 'sticky',
                        top: 0,
                        zIndex: 10
                    }}>
                        <button onClick={goBack} style={{ border: 'none', background: 'transparent', padding: '0.5rem', cursor: 'pointer' }}>
                            <ArrowLeftIcon style={{ width: '24px', height: '24px', color: '#1e293b' }} />
                        </button>
                        <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600', color: '#1e293b' }}>
                            {currentCaseName.value}
                        </h1>
                    </div>
                )}

                {!caseType.value ? (
                    <>
                        <div style={{ padding: '1.5rem 1rem 0', display: 'flex', justifyContent: 'center' }}>
                            <div style={{ background: '#e2e8f0', padding: '0.375rem', borderRadius: '12px', display: 'flex', gap: '0.5rem', width: '100%', maxWidth: '500px', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}>
                                <button
                                    type="button"
                                    onClick={() => activeMainTab.value = 'report'}
                                    style={{ flex: 1, padding: '0.75rem 1rem', borderRadius: '8px', border: 'none', background: activeMainTab.value === 'report' ? 'white' : 'transparent', color: activeMainTab.value === 'report' ? '#4f46e5' : '#64748b', fontWeight: '600', fontSize: '0.95rem', transition: 'all 0.3s ease', cursor: 'pointer', boxShadow: activeMainTab.value === 'report' ? '0 2px 8px rgba(0,0,0,0.1)' : 'none' }}
                                >Report New Case</button>
                                <button
                                    type="button"
                                    onClick={() => activeMainTab.value = 'track'}
                                    style={{ flex: 1, padding: '0.75rem 1rem', borderRadius: '8px', border: 'none', background: activeMainTab.value === 'track' ? 'white' : 'transparent', color: activeMainTab.value === 'track' ? '#4f46e5' : '#64748b', fontWeight: '600', fontSize: '0.95rem', transition: 'all 0.3s ease', cursor: 'pointer', boxShadow: activeMainTab.value === 'track' ? '0 2px 8px rgba(0,0,0,0.1)' : 'none' }}
                                >Track Status</button>
                            </div>
                        </div>

                        {activeMainTab.value === 'report' ? (
                            <div style={{ padding: '1rem' }}>
                                <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.5rem' }}>Select the type of incident you want to report.</p>
                                <div class="cases-grid">
                                    {casesList.map((c, idx) => (
                                        <div
                                            key={c.id}
                                            class="case-card-selection"
                                            onClick={() => handleCaseClick(c.id)}
                                            style={{
                                                background: `linear-gradient(135deg, ${c.color}05 0%, #ffffff 100%)`,
                                                animation: `slideUp 0.5s ease-out backwards ${idx * 0.1}s`
                                            }}
                                        >
                                            <div class="selection-icon-container" style={{
                                                backgroundColor: `${c.color}15`,
                                                border: `1.5px solid ${c.color}25`
                                            }}>
                                                <c.icon style={{ width: '1.75rem', height: '1.75rem', color: c.color }} />
                                            </div>

                                            <div class="selection-title">{c.name}</div>
                                            <div class="selection-description">{c.description}</div>

                                            <div class="selection-action">
                                                <div class="selection-action-text">Report Incident</div>
                                                <div
                                                    class="selection-arrow"
                                                    style={{ color: c.color }}
                                                >
                                                    <ArrowRightIcon style={{ width: '1.1rem', height: '1.1rem' }} />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <MyCases />
                        )}
                    </>
                ) : isFetchingForm.value ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '50vh' }}>
                        <div style={{ width: '40px', height: '40px', border: '4px solid #e2e8f0', borderTopColor: '#4f46e5', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                        <p style={{ marginTop: '1rem', color: '#64748b', fontWeight: '600' }}>Loading Incident Form...</p>
                    </div>
                ) : (
                    <form class="form-container" onSubmit={(e) => { e.preventDefault(); submitCase(); }}>
                        {/* Common Fields */}
                        <div class="form-section">
                            <h2 style={{ fontSize: '1.25rem', fontWeight: '800', margin: '0 0 1.5rem 0', color: '#1e293b' }}>Incident Details</h2>

                            {/* Location */}
                            <div style={{ marginBottom: '1.25rem' }}>
                                <label class="input-label">Address / Landmark <span style={{ color: '#ef4444' }}>*</span></label>
                                <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
                                    <input required type="text" value={formData.value.location} onInput={(e) => formData.value.location = e.target.value} placeholder="e.g. Near Metro Pillar 12" class="input-field" />
                                    <button type="button" onClick={getLocation} style={{ padding: '0 1rem', background: '#4f46e510', border: '1.5px solid #4f46e520', borderRadius: '12px', color: '#4f46e5', cursor: 'pointer', transition: 'all 0.2s' }}>
                                        <MapPinIcon style={{ width: '22px', height: '22px' }} />
                                    </button>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label class="input-label" style={{ fontSize: '0.75rem', color: '#64748b' }}>Latitude</label>
                                        <input type="number" step="any" value={formData.value.latitude} onInput={(e) => formData.value.latitude = parseFloat(e.target.value)} placeholder="0.0000" class="input-field" style={{ fontSize: '0.9rem' }} />
                                    </div>
                                    <div>
                                        <label class="input-label" style={{ fontSize: '0.75rem', color: '#64748b' }}>Longitude</label>
                                        <input type="number" step="any" value={formData.value.longitude} onInput={(e) => formData.value.longitude = parseFloat(e.target.value)} placeholder="0.0000" class="input-field" style={{ fontSize: '0.9rem' }} />
                                    </div>
                                </div>
                                <p style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '0.5rem', fontStyle: 'italic' }}>
                                    * Lat/Lng will be used to route this case to the nearest police station.
                                </p>
                            </div>

                            {/* Date Time */}
                            <div style={{ marginBottom: '1.25rem' }}>
                                <label class="input-label">Date & Time <span style={{ color: '#ef4444' }}>*</span></label>
                                <input required type="datetime-local" value={formData.value.dateTime} onInput={(e) => formData.value.dateTime = e.target.value} class="input-field" />
                            </div>

                            {/* Description */}
                            <div style={{ marginBottom: '1.25rem' }}>
                                <label class="input-label">Description <span style={{ color: '#ef4444' }}>*</span></label>
                                <textarea required rows="4" value={formData.value.description} onInput={(e) => formData.value.description = e.target.value} placeholder="Tell us what happened..." class="input-field" style={{ resize: 'none' }}></textarea>
                            </div>

                            {/* Media Upload */}
                            <div style={{ marginBottom: '1.25rem' }}>
                                <label class="input-label">Photo / Video Proof</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.85rem 1.25rem', background: '#f8fafc', borderRadius: '12px', cursor: 'pointer', border: '1.5px dashed #e2e8f0', flex: 1, transition: 'all 0.2s' }}>
                                        <PhotoIcon style={{ width: '22px', height: '22px', color: '#6366f1' }} />
                                        <span style={{ fontSize: '0.95rem', color: '#64748b', fontWeight: '600' }}>Upload Media</span>
                                        <input type="file" multiple accept="image/*,video/*" onChange={handleFileUpload} style={{ display: 'none' }} />
                                    </label>
                                </div>
                                {formData.value.media.length > 0 && (
                                    <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#10b981', background: '#10b98110', padding: '0.5rem 1rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '700' }}>
                                        <CheckCircleIcon style={{ width: '16px', height: '16px' }} />
                                        {formData.value.media.length} file(s) attached
                                    </div>
                                )}
                            </div>

                            {/* Anonymous Toggle */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '1.5rem', padding: '1.25rem', background: '#fefce8', borderRadius: '16px', border: '1px solid #fef08a' }}>
                                <div style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px' }}>
                                    <input type="checkbox" id="anon" checked={formData.value.isAnonymous} onChange={(e) => formData.value.isAnonymous = e.target.checked} style={{ opacity: 0, width: 0, height: 0 }} />
                                    <label for="anon" style={{ position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: formData.value.isAnonymous ? '#4f46e5' : '#d1d5db', transition: '.4s', borderRadius: '24px' }}>
                                        <span style={{ position: 'absolute', content: '""', height: '18px', width: '18px', left: formData.value.isAnonymous ? '22px' : '3px', bottom: '3px', backgroundColor: 'white', transition: '.4s', borderRadius: '50%' }}></span>
                                    </label>
                                </div>
                                <label for="anon" style={{ fontSize: '0.95rem', color: '#854d0e', cursor: 'pointer', fontWeight: '700', userSelect: 'none' }}>Report Anonymously</label>
                            </div>
                        </div>

                        {/* Type Specific Fields */}
                        {/* Type Specific Dynamic Fields from Backend API */}
                        {dynamicFormFields.value.length > 0 && (
                            <div class="form-section" style={{ animation: 'slideUp 0.3s ease-out' }}>
                                <h2 style={{ fontSize: '1.25rem', fontWeight: '800', margin: '0 0 1.5rem 0', color: '#1e293b' }}>Additional Info</h2>

                                {dynamicFormFields.value.map((field) => (
                                    <div key={field.name} style={{ marginBottom: '1.25rem' }}>
                                        <label class="input-label">
                                            {field.label} {field.required && <span style={{ color: '#ef4444' }}>*</span>}
                                        </label>

                                        {field.type === 'select' ? (
                                            <select
                                                required={field.required}
                                                value={formData.value.dynamicData[field.name] || ''}
                                                onChange={(e) => formData.value.dynamicData[field.name] = e.target.value}
                                                class="input-field"
                                            >
                                                <option value="">Select {field.label.toLowerCase()}</option>
                                                {field.options?.map(opt => (
                                                    <option key={opt} value={opt}>{opt}</option>
                                                ))}
                                            </select>
                                        ) : field.type === 'textarea' ? (
                                            <textarea
                                                required={field.required}
                                                rows="3"
                                                value={formData.value.dynamicData[field.name] || ''}
                                                onInput={(e) => formData.value.dynamicData[field.name] = e.target.value}
                                                placeholder={`Enter ${field.label.toLowerCase()}`}
                                                class="input-field"
                                                style={{ resize: 'none' }}
                                            ></textarea>
                                        ) : field.type === 'number' ? (
                                            <input
                                                type="number"
                                                required={field.required}
                                                value={formData.value.dynamicData[field.name] || ''}
                                                onInput={(e) => formData.value.dynamicData[field.name] = e.target.value}
                                                class="input-field"
                                            />
                                        ) : (
                                            <input
                                                type="text"
                                                required={field.required}
                                                value={formData.value.dynamicData[field.name] || ''}
                                                onInput={(e) => formData.value.dynamicData[field.name] = e.target.value}
                                                placeholder={`Enter ${field.label.toLowerCase()}`}
                                                class="input-field"
                                            />
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        <button type="submit" disabled={loading.value} class="submit-btn">
                            {loading.value ? (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
                                    <div style={{ width: '20px', height: '20px', border: '3px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                                    Submitting Report...
                                </div>
                            ) : 'Submit Incident Report'}
                        </button>

                        <style>{`
                            @keyframes spin { to { transform: rotate(360deg); } }
                        `}</style>
                    </form>
                )}
            </div>
        );
    }
};
