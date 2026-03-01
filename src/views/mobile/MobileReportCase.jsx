import { ref, computed, onMounted } from 'vue';
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

            // Snatching
            snatchingType: '',
            itemStolen: '',
            estimatedValue: '',
            numberOfAttackers: '',
            weaponUsed: 'No',
            vehicleUsed: '',
            injuryHappened: 'No',

            // Theft
            theftType: '',
            // itemStolen (shared)
            // estimatedValue (shared)
            cctvNearby: 'No',
            suspectSeen: 'No',
            vehicleType: '',
            numberPlate: '',
            vehicleColor: '',

            // Harassment / Suspicious
            incidentType: '',
            personDescription: '',
            vehicleDescription: '',
            repeatedIncident: 'No',

            // Accident
            accidentType: '',
            injuries: 'No',
            ambulanceRequired: 'No',
            vehiclesInvolved: '',
            roadBlocked: 'No',

            // Camera / Safety Issue
            issueType: '',
            sinceWhen: '',

            // Custom Title
            incidentTitle: '',

            // Robbery
            robberyWeaponUsed: 'No',
            robberyInjury: 'No',
            robberySuspectCount: '',

            // Emergency
            emergencyType: ''
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
                        ...formData.value
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
                        <div class="form-section">
                            <h2 style={{ fontSize: '1.25rem', fontWeight: '800', margin: '0 0 1.5rem 0', color: '#1e293b' }}>Additional Info</h2>

                            {/* ===================== SNATCHING ===================== */}
                            {caseType.value === 'snatching' && (
                                <>
                                    <div style={{ marginBottom: '1.25rem' }}>
                                        <label class="input-label">Snatching Type <span style={{ color: '#ef4444' }}>*</span></label>
                                        <select required value={formData.value.snatchingType} onChange={(e) => formData.value.snatchingType = e.target.value} class="input-field">
                                            <option value="">Select type</option>
                                            <option value="Mobile">Mobile</option>
                                            <option value="Chain">Chain</option>
                                            <option value="Bag">Bag</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>
                                    <div style={{ marginBottom: '1.25rem' }}>
                                        <label class="input-label">Item Stolen <span style={{ color: '#ef4444' }}>*</span></label>
                                        <input required type="text" value={formData.value.itemStolen} onInput={(e) => formData.value.itemStolen = e.target.value} class="input-field" />
                                    </div>
                                    <div style={{ marginBottom: '1.25rem' }}>
                                        <label class="input-label">Estimated Value (₹)</label>
                                        <input type="number" value={formData.value.estimatedValue} onInput={(e) => formData.value.estimatedValue = e.target.value} class="input-field" />
                                    </div>
                                    <div style={{ marginBottom: '1.25rem' }}>
                                        <label class="input-label">Number of Attackers</label>
                                        <input type="number" value={formData.value.numberOfAttackers} onInput={(e) => formData.value.numberOfAttackers = e.target.value} class="input-field" />
                                    </div>
                                    <div style={{ marginBottom: '1.25rem' }}>
                                        <label class="input-label">Weapon Used?</label>
                                        <select value={formData.value.weaponUsed} onChange={(e) => formData.value.weaponUsed = e.target.value} class="input-field">
                                            <option value="No">No</option>
                                            <option value="Yes">Yes</option>
                                        </select>
                                    </div>
                                    <div style={{ marginBottom: '1.25rem' }}>
                                        <label class="input-label">Vehicle Used by Attacker</label>
                                        <select value={formData.value.vehicleUsed} onChange={(e) => formData.value.vehicleUsed = e.target.value} class="input-field">
                                            <option value="">Select vehicle</option>
                                            <option value="Bike">Bike</option>
                                            <option value="Car">Car</option>
                                            <option value="On foot">On foot</option>
                                        </select>
                                    </div>
                                    <div style={{ marginBottom: '1.25rem' }}>
                                        <label class="input-label">Injury Happened?</label>
                                        <select value={formData.value.injuryHappened} onChange={(e) => formData.value.injuryHappened = e.target.value} class="input-field">
                                            <option value="No">No</option>
                                            <option value="Yes">Yes</option>
                                        </select>
                                    </div>
                                </>
                            )}

                            {/* ===================== THEFT ===================== */}
                            {caseType.value === 'theft' && (
                                <>
                                    <div style={{ marginBottom: '1.25rem' }}>
                                        <label class="input-label">Theft Type <span style={{ color: '#ef4444' }}>*</span></label>
                                        <select required value={formData.value.theftType} onChange={(e) => formData.value.theftType = e.target.value} class="input-field">
                                            <option value="">Select type</option>
                                            <option value="Vehicle">Vehicle</option>
                                            <option value="House">House</option>
                                            <option value="Shop">Shop</option>
                                            <option value="Pickpocket">Pickpocket</option>
                                        </select>
                                    </div>
                                    <div style={{ marginBottom: '1.25rem' }}>
                                        <label class="input-label">Item Stolen <span style={{ color: '#ef4444' }}>*</span></label>
                                        <input required type="text" value={formData.value.itemStolen} onInput={(e) => formData.value.itemStolen = e.target.value} class="input-field" />
                                    </div>
                                    <div style={{ marginBottom: '1.25rem' }}>
                                        <label class="input-label">Estimated Value (₹)</label>
                                        <input type="number" value={formData.value.estimatedValue} onInput={(e) => formData.value.estimatedValue = e.target.value} class="input-field" />
                                    </div>
                                    <div style={{ marginBottom: '1.25rem' }}>
                                        <label class="input-label">CCTV Nearby?</label>
                                        <select value={formData.value.cctvNearby} onChange={(e) => formData.value.cctvNearby = e.target.value} class="input-field">
                                            <option value="No">No</option>
                                            <option value="Yes">Yes</option>
                                        </select>
                                    </div>
                                    <div style={{ marginBottom: '1.25rem' }}>
                                        <label class="input-label">Suspect Seen?</label>
                                        <select value={formData.value.suspectSeen} onChange={(e) => formData.value.suspectSeen = e.target.value} class="input-field">
                                            <option value="No">No</option>
                                            <option value="Yes">Yes</option>
                                        </select>
                                    </div>

                                    {formData.value.theftType === 'Vehicle' && (
                                        <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '16px', border: '1px solid #e2e8f0', marginTop: '1rem' }}>
                                            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: '800', color: '#1e293b' }}>Vehicle Details</h3>
                                            <div style={{ marginBottom: '1.25rem' }}>
                                                <label class="input-label">Vehicle Type (e.g. Car, Bike)</label>
                                                <input type="text" value={formData.value.vehicleType} onInput={(e) => formData.value.vehicleType = e.target.value} class="input-field" style={{ background: 'white' }} />
                                            </div>
                                            <div style={{ marginBottom: '1.25rem' }}>
                                                <label class="input-label">Number Plate</label>
                                                <input type="text" value={formData.value.numberPlate} onInput={(e) => formData.value.numberPlate = e.target.value} class="input-field" style={{ background: 'white' }} />
                                            </div>
                                            <div style={{ marginBottom: '0' }}>
                                                <label class="input-label">Color</label>
                                                <input type="text" value={formData.value.vehicleColor} onInput={(e) => formData.value.vehicleColor = e.target.value} class="input-field" style={{ background: 'white' }} />
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}

                            {/* ===================== HARASSMENT ===================== */}
                            {caseType.value === 'harassment' && (
                                <>
                                    <div style={{ marginBottom: '1.25rem' }}>
                                        <label class="input-label">Incident Type <span style={{ color: '#ef4444' }}>*</span></label>
                                        <select required value={formData.value.incidentType} onChange={(e) => formData.value.incidentType = e.target.value} class="input-field">
                                            <option value="">Select type</option>
                                            <option value="Harassment">Harassment</option>
                                            <option value="Stalking">Stalking</option>
                                            <option value="Suspicious person">Suspicious person</option>
                                            <option value="Suspicious vehicle">Suspicious vehicle</option>
                                        </select>
                                    </div>
                                    <div style={{ marginBottom: '1.25rem' }}>
                                        <label class="input-label">Person Description</label>
                                        <textarea rows="3" value={formData.value.personDescription} onInput={(e) => formData.value.personDescription = e.target.value} placeholder="Height, clothes, visible marks..." class="input-field" style={{ resize: 'none' }}></textarea>
                                    </div>
                                    <div style={{ marginBottom: '1.25rem' }}>
                                        <label class="input-label">Vehicle Description (If any)</label>
                                        <textarea rows="2" value={formData.value.vehicleDescription} onInput={(e) => formData.value.vehicleDescription = e.target.value} placeholder="Type, color, number plate..." class="input-field" style={{ resize: 'none' }}></textarea>
                                    </div>
                                    <div style={{ marginBottom: '1.25rem' }}>
                                        <label class="input-label">Repeated Incident?</label>
                                        <select value={formData.value.repeatedIncident} onChange={(e) => formData.value.repeatedIncident = e.target.value} class="input-field">
                                            <option value="No">No</option>
                                            <option value="Yes">Yes</option>
                                        </select>
                                    </div>
                                </>
                            )}

                            {/* ===================== ACCIDENT ===================== */}
                            {caseType.value === 'accident' && (
                                <>
                                    <div style={{ marginBottom: '1.25rem' }}>
                                        <label class="input-label">Accident Type <span style={{ color: '#ef4444' }}>*</span></label>
                                        <select required value={formData.value.accidentType} onChange={(e) => formData.value.accidentType = e.target.value} class="input-field">
                                            <option value="">Select type</option>
                                            <option value="Bike">Bike</option>
                                            <option value="Car">Car</option>
                                            <option value="Hit & run">Hit & run</option>
                                        </select>
                                    </div>
                                    <div style={{ marginBottom: '1.25rem' }}>
                                        <label class="input-label">Injuries? <span style={{ color: '#ef4444' }}>*</span></label>
                                        <select required value={formData.value.injuries} onChange={(e) => formData.value.injuries = e.target.value} class="input-field">
                                            <option value="No">No</option>
                                            <option value="Yes">Yes</option>
                                        </select>
                                    </div>
                                    <div style={{ marginBottom: '1.25rem' }}>
                                        <label class="input-label">Ambulance Required?</label>
                                        <select value={formData.value.ambulanceRequired} onChange={(e) => formData.value.ambulanceRequired = e.target.value} class="input-field">
                                            <option value="No">No</option>
                                            <option value="Yes">Yes</option>
                                        </select>
                                    </div>
                                    <div style={{ marginBottom: '1.25rem' }}>
                                        <label class="input-label">Vehicles Involved</label>
                                        <input type="text" value={formData.value.vehiclesInvolved} onInput={(e) => formData.value.vehiclesInvolved = e.target.value} placeholder="e.g. 1 Car, 1 Bike" class="input-field" />
                                    </div>
                                    <div style={{ marginBottom: '1.25rem' }}>
                                        <label class="input-label">Road Blocked?</label>
                                        <select value={formData.value.roadBlocked} onChange={(e) => formData.value.roadBlocked = e.target.value} class="input-field">
                                            <option value="No">No</option>
                                            <option value="Yes">Yes</option>
                                        </select>
                                    </div>
                                </>
                            )}

                            {/* ===================== CAMERA / SAFETY ISSUE ===================== */}
                            {caseType.value === 'camera_issue' && (
                                <>
                                    <div style={{ marginBottom: '1.25rem' }}>
                                        <label class="input-label">Issue Type <span style={{ color: '#ef4444' }}>*</span></label>
                                        <select required value={formData.value.issueType} onChange={(e) => formData.value.issueType = e.target.value} class="input-field">
                                            <option value="">Select type</option>
                                            <option value="Camera not working">Camera not working</option>
                                            <option value="No camera">No camera</option>
                                            <option value="Blind spot">Blind spot</option>
                                            <option value="Street light not working">Street light not working</option>
                                        </select>
                                    </div>
                                    <div style={{ marginBottom: '1.25rem' }}>
                                        <label class="input-label">Since When</label>
                                        <input type="text" value={formData.value.sinceWhen} onInput={(e) => formData.value.sinceWhen = e.target.value} placeholder="e.g. 2 days, Since yesterday" class="input-field" />
                                    </div>
                                </>
                            )}

                            {/* ===================== ROBBERY ===================== */}
                            {caseType.value === 'robbery' && (
                                <>
                                    <div style={{ marginBottom: '1.25rem' }}>
                                        <label class="input-label">Incident Title <span style={{ color: '#ef4444' }}>*</span></label>
                                        <input required type="text" value={formData.value.incidentTitle} onInput={(e) => formData.value.incidentTitle = e.target.value} placeholder="e.g. Armed robbery at store" class="input-field" />
                                    </div>
                                    <div style={{ marginBottom: '1.25rem' }}>
                                        <label class="input-label">Weapon Used?</label>
                                        <select value={formData.value.robberyWeaponUsed} onChange={(e) => formData.value.robberyWeaponUsed = e.target.value} class="input-field">
                                            <option value="No">No</option>
                                            <option value="Yes">Yes</option>
                                        </select>
                                    </div>
                                    <div style={{ marginBottom: '1.25rem' }}>
                                        <label class="input-label">Injury Happened?</label>
                                        <select value={formData.value.robberyInjury} onChange={(e) => formData.value.robberyInjury = e.target.value} class="input-field">
                                            <option value="No">No</option>
                                            <option value="Yes">Yes</option>
                                        </select>
                                    </div>
                                    <div style={{ marginBottom: '1.25rem' }}>
                                        <label class="input-label">Suspect Count</label>
                                        <input type="number" value={formData.value.robberySuspectCount} onInput={(e) => formData.value.robberySuspectCount = e.target.value} class="input-field" />
                                    </div>
                                </>
                            )}

                            {/* ===================== EMERGENCY ===================== */}
                            {caseType.value === 'unidentified_emergency' && (
                                <>
                                    <div style={{ marginBottom: '1.25rem' }}>
                                        <label class="input-label">Emergency Type <span style={{ color: '#ef4444' }}>*</span></label>
                                        <select required value={formData.value.emergencyType} onChange={(e) => formData.value.emergencyType = e.target.value} class="input-field">
                                            <option value="">Select type</option>
                                            <option value="Dead Body">Dead Body</option>
                                            <option value="Unconscious Person">Unconscious Person</option>
                                            <option value="Suspicious Object">Suspicious Object</option>
                                            <option value="Unknown Person">Unknown Person</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>
                                </>
                            )}

                        </div>

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
