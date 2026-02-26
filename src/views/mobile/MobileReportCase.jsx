import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ArrowLeftIcon, MapPinIcon, PhotoIcon, VideoCameraIcon, ArrowRightIcon, ExclamationTriangleIcon, ShieldExclamationIcon, EyeSlashIcon, MegaphoneIcon } from '@heroicons/vue/24/outline';
import api from '../../services/api.js';

export default {
    name: 'MobileReportCase',
    setup() {
        const route = useRoute();
        const router = useRouter();
        const caseType = ref(route.query.type || '');

        const casesList = [
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
            sinceWhen: ''
        });

        const caseNames = {
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
                // Construct payload
                const payload = {
                    title: `New ${currentCaseName.value} Case`,
                    type: 'USER',
                    priority: 'high',
                    formData: {
                        type: caseType.value,
                        ...formData.value
                    }
                };

                // Real API Call
                console.log('Submitting case payload:', payload);
                const apiService = new api();
                await apiService.reportCase(payload);

                alert(`${currentCaseName.value} case reported successfully!`);
                router.replace('/mobile/user/dashboard');
                loading.value = false;
            } catch (e) {
                console.error(e);
                alert('Error submitting report.');
                loading.value = false;
            }
        };

        return () => (
            <div class="report-case-container" style={{ minHeight: '100vh', background: '#f8fafc', paddingBottom: '2rem' }}>
                <style>{`
                    .cases-grid {
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
                        gap: 1.5rem;
                        align-content: start;
                    }

                    .case-card {
                        background: white;
                        border-radius: 16px;
                        padding: 1.5rem;
                        min-height: 200px;
                        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                        cursor: pointer;
                        transition: all 0.3s ease;
                        border: 1px solid rgba(0, 0, 0, 0.05);
                        position: relative;
                        overflow: hidden;
                        display: flex;
                        flex-direction: column;
                    }

                    .case-card:hover {
                        transform: translateY(-4px);
                        box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
                    }

                    .case-icon-container {
                        width: 60px;
                        height: 60px;
                        border-radius: 12px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        margin-bottom: 1rem;
                        transition: all 0.3s ease;
                    }

                    .case-card:hover .case-icon-container {
                        transform: scale(1.1);
                    }

                    .case-title {
                        font-size: 1.1rem;
                        font-weight: 600;
                        color: #1e293b;
                        margin-bottom: 0.5rem;
                    }

                    .case-description {
                        font-size: 0.9rem;
                        color: #64748b;
                        line-height: 1.4;
                        margin-bottom: 1rem;
                        flex: 1;
                    }

                    .case-action {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        margin-top: auto;
                    }

                    .case-action-text {
                        font-size: 0.8rem;
                        color: #94a3b8;
                    }

                    .case-arrow {
                        width: 32px;
                        height: 32px;
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        transition: all 0.3s ease;
                    }

                    .case-card:hover .case-arrow {
                        transform: scale(1.2);
                    }

                    @media (max-width: 768px) {
                        .case-card { padding: 1.25rem; }
                        .case-icon-container { width: 50px; height: 50px; }
                        .case-title { font-size: 1rem; }
                        .case-description { font-size: 0.85rem; }
                        .cases-grid { grid-template-columns: 1fr; gap: 1rem; }
                    }

                    @media (max-width: 480px) {
                        .case-card { padding: 1rem; }
                        .case-icon-container { width: 45px; height: 45px; }
                        .case-title { font-size: 0.95rem; }
                        .case-description { font-size: 0.8rem; }
                        .cases-grid { gap: 0.75rem; }
                        .case-arrow { width: 28px; height: 28px; }
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
                    <div style={{ padding: '1rem' }}>
                        <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.5rem' }}>Select the type of incident you want to report.</p>
                        <div class="cases-grid">
                            {casesList.map(c => (
                                <div
                                    key={c.id}
                                    class="case-card"
                                    onClick={() => handleCaseClick(c.id)}
                                    style={{
                                        background: `linear-gradient(135deg, ${c.color}08 0%, ${c.color}15 30%, #ffffff 100%)`
                                    }}
                                >
                                    <div class="case-icon-container" style={{
                                        backgroundColor: `${c.color}15`,
                                        border: `2px solid ${c.color}25`
                                    }}>
                                        <c.icon style={{ width: '1.5rem', height: '1.5rem', color: c.color }} />
                                    </div>

                                    <div class="case-title">{c.name}</div>
                                    <div class="case-description">{c.description}</div>

                                    <div class="case-action">
                                        <div class="case-action-text">Tap to report</div>
                                        <div
                                            class="case-arrow"
                                            style={{
                                                backgroundColor: `${c.color}10`,
                                                color: c.color
                                            }}
                                        >
                                            <ArrowRightIcon style={{ width: '1rem', height: '1rem' }} />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <form onSubmit={(e) => { e.preventDefault(); submitCase(); }} style={{ padding: '1rem' }}>

                        <div class="form-section" style={{ background: 'white', padding: '1.25rem', borderRadius: '12px', marginBottom: '1rem', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                            <h2 style={{ fontSize: '1.1rem', margin: '0 0 1rem 0', color: '#334155' }}>Basic Details</h2>

                            {/* Location */}
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#475569', marginBottom: '0.5rem' }}>Location<span style={{ color: 'red' }}>*</span></label>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <input required type="text" value={formData.value.location} onInput={(e) => formData.value.location = e.target.value} placeholder="Enter address manually or use GPS" style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem' }} />
                                    <button type="button" onClick={getLocation} style={{ padding: '0.75rem', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', color: '#2563eb', cursor: 'pointer' }}>
                                        <MapPinIcon style={{ width: '24px', height: '24px' }} />
                                    </button>
                                </div>
                            </div>

                            {/* Date Time */}
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#475569', marginBottom: '0.5rem' }}>Date & Time<span style={{ color: 'red' }}>*</span></label>
                                <input required type="datetime-local" value={formData.value.dateTime} onInput={(e) => formData.value.dateTime = e.target.value} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem', boxSizing: 'border-box' }} />
                            </div>

                            {/* Description */}
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#475569', marginBottom: '0.5rem' }}>Description<span style={{ color: 'red' }}>*</span></label>
                                <textarea required rows="4" value={formData.value.description} onInput={(e) => formData.value.description = e.target.value} placeholder="Please provide details of the incident..." style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem', boxSizing: 'border-box', resize: 'vertical' }}></textarea>
                            </div>

                            {/* Media Upload */}
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#475569', marginBottom: '0.5rem' }}>Photo/Video proof</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', background: '#f1f5f9', borderRadius: '8px', cursor: 'pointer', border: '1px dashed #cbd5e1' }}>
                                        <PhotoIcon style={{ width: '20px', height: '20px', color: '#64748b' }} />
                                        <span style={{ fontSize: '0.875rem', color: '#64748b' }}>Select Media</span>
                                        <input type="file" multiple accept="image/*,video/*" onChange={handleFileUpload} style={{ display: 'none' }} />
                                    </label>
                                    {formData.value.media.length > 0 && (
                                        <span style={{ fontSize: '0.875rem', color: '#10b981', fontWeight: '500' }}>{formData.value.media.length} file(s) attached</span>
                                    )}
                                </div>
                            </div>

                            {/* Anonymous Toggle */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '1rem', padding: '1rem', background: '#fffbeb', borderRadius: '8px', border: '1px solid #fef3c7' }}>
                                <input type="checkbox" id="anon" checked={formData.value.isAnonymous} onChange={(e) => formData.value.isAnonymous = e.target.checked} style={{ width: '1.25rem', height: '1.25rem', cursor: 'pointer' }} />
                                <label for="anon" style={{ fontSize: '0.875rem', color: '#92400e', cursor: 'pointer', fontWeight: '500', userSelect: 'none' }}>Report Anonymously</label>
                            </div>
                        </div>

                        {/* Type Specific Fields */}
                        <div class="form-section" style={{ background: 'white', padding: '1.25rem', borderRadius: '12px', marginBottom: '1rem', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                            <h2 style={{ fontSize: '1.1rem', margin: '0 0 1rem 0', color: '#334155' }}>Case Specifics</h2>

                            {/* ===================== SNATCHING ===================== */}
                            {caseType.value === 'snatching' && (
                                <>
                                    <div style={{ marginBottom: '1rem' }}>
                                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#475569', marginBottom: '0.5rem' }}>Snatching Type<span style={{ color: 'red' }}>*</span></label>
                                        <select required value={formData.value.snatchingType} onChange={(e) => formData.value.snatchingType = e.target.value} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem', boxSizing: 'border-box' }}>
                                            <option value="">Select type</option>
                                            <option value="Mobile">Mobile</option>
                                            <option value="Chain">Chain</option>
                                            <option value="Bag">Bag</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>
                                    <div style={{ marginBottom: '1rem' }}>
                                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#475569', marginBottom: '0.5rem' }}>Item Stolen<span style={{ color: 'red' }}>*</span></label>
                                        <input required type="text" value={formData.value.itemStolen} onInput={(e) => formData.value.itemStolen = e.target.value} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem', boxSizing: 'border-box' }} />
                                    </div>
                                    <div style={{ marginBottom: '1rem' }}>
                                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#475569', marginBottom: '0.5rem' }}>Estimated Value (₹)</label>
                                        <input type="number" value={formData.value.estimatedValue} onInput={(e) => formData.value.estimatedValue = e.target.value} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem', boxSizing: 'border-box' }} />
                                    </div>
                                    <div style={{ marginBottom: '1rem' }}>
                                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#475569', marginBottom: '0.5rem' }}>Number of Attackers</label>
                                        <input type="number" value={formData.value.numberOfAttackers} onInput={(e) => formData.value.numberOfAttackers = e.target.value} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem', boxSizing: 'border-box' }} />
                                    </div>
                                    <div style={{ marginBottom: '1rem' }}>
                                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#475569', marginBottom: '0.5rem' }}>Weapon Used?</label>
                                        <select value={formData.value.weaponUsed} onChange={(e) => formData.value.weaponUsed = e.target.value} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem', boxSizing: 'border-box' }}>
                                            <option value="No">No</option>
                                            <option value="Yes">Yes</option>
                                        </select>
                                    </div>
                                    <div style={{ marginBottom: '1rem' }}>
                                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#475569', marginBottom: '0.5rem' }}>Vehicle Used by Attacker</label>
                                        <select value={formData.value.vehicleUsed} onChange={(e) => formData.value.vehicleUsed = e.target.value} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem', boxSizing: 'border-box' }}>
                                            <option value="">Select vehicle</option>
                                            <option value="Bike">Bike</option>
                                            <option value="Car">Car</option>
                                            <option value="On foot">On foot</option>
                                        </select>
                                    </div>
                                    <div style={{ marginBottom: '1rem' }}>
                                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#475569', marginBottom: '0.5rem' }}>Injury Happened?</label>
                                        <select value={formData.value.injuryHappened} onChange={(e) => formData.value.injuryHappened = e.target.value} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem', boxSizing: 'border-box' }}>
                                            <option value="No">No</option>
                                            <option value="Yes">Yes</option>
                                        </select>
                                    </div>
                                </>
                            )}

                            {/* ===================== THEFT ===================== */}
                            {caseType.value === 'theft' && (
                                <>
                                    <div style={{ marginBottom: '1rem' }}>
                                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#475569', marginBottom: '0.5rem' }}>Theft Type<span style={{ color: 'red' }}>*</span></label>
                                        <select required value={formData.value.theftType} onChange={(e) => formData.value.theftType = e.target.value} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem', boxSizing: 'border-box' }}>
                                            <option value="">Select type</option>
                                            <option value="Vehicle">Vehicle</option>
                                            <option value="House">House</option>
                                            <option value="Shop">Shop</option>
                                            <option value="Pickpocket">Pickpocket</option>
                                        </select>
                                    </div>
                                    <div style={{ marginBottom: '1rem' }}>
                                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#475569', marginBottom: '0.5rem' }}>Item Stolen<span style={{ color: 'red' }}>*</span></label>
                                        <input required type="text" value={formData.value.itemStolen} onInput={(e) => formData.value.itemStolen = e.target.value} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem', boxSizing: 'border-box' }} />
                                    </div>
                                    <div style={{ marginBottom: '1rem' }}>
                                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#475569', marginBottom: '0.5rem' }}>Estimated Value (₹)</label>
                                        <input type="number" value={formData.value.estimatedValue} onInput={(e) => formData.value.estimatedValue = e.target.value} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem', boxSizing: 'border-box' }} />
                                    </div>
                                    <div style={{ marginBottom: '1rem' }}>
                                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#475569', marginBottom: '0.5rem' }}>CCTV Nearby?</label>
                                        <select value={formData.value.cctvNearby} onChange={(e) => formData.value.cctvNearby = e.target.value} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem', boxSizing: 'border-box' }}>
                                            <option value="No">No</option>
                                            <option value="Yes">Yes</option>
                                        </select>
                                    </div>
                                    <div style={{ marginBottom: '1rem' }}>
                                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#475569', marginBottom: '0.5rem' }}>Suspect Seen?</label>
                                        <select value={formData.value.suspectSeen} onChange={(e) => formData.value.suspectSeen = e.target.value} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem', boxSizing: 'border-box' }}>
                                            <option value="No">No</option>
                                            <option value="Yes">Yes</option>
                                        </select>
                                    </div>

                                    {formData.value.theftType === 'Vehicle' && (
                                        <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0', marginTop: '1rem' }}>
                                            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: '#334155' }}>Vehicle Details</h3>
                                            <div style={{ marginBottom: '1rem' }}>
                                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#475569', marginBottom: '0.5rem' }}>Vehicle Type (e.g. Car, Bike)</label>
                                                <input type="text" value={formData.value.vehicleType} onInput={(e) => formData.value.vehicleType = e.target.value} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem', boxSizing: 'border-box' }} />
                                            </div>
                                            <div style={{ marginBottom: '1rem' }}>
                                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#475569', marginBottom: '0.5rem' }}>Number Plate</label>
                                                <input type="text" value={formData.value.numberPlate} onInput={(e) => formData.value.numberPlate = e.target.value} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem', boxSizing: 'border-box' }} />
                                            </div>
                                            <div style={{ marginBottom: '0' }}>
                                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#475569', marginBottom: '0.5rem' }}>Color</label>
                                                <input type="text" value={formData.value.vehicleColor} onInput={(e) => formData.value.vehicleColor = e.target.value} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem', boxSizing: 'border-box' }} />
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}

                            {/* ===================== HARASSMENT ===================== */}
                            {caseType.value === 'harassment' && (
                                <>
                                    <div style={{ marginBottom: '1rem' }}>
                                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#475569', marginBottom: '0.5rem' }}>Incident Type<span style={{ color: 'red' }}>*</span></label>
                                        <select required value={formData.value.incidentType} onChange={(e) => formData.value.incidentType = e.target.value} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem', boxSizing: 'border-box' }}>
                                            <option value="">Select type</option>
                                            <option value="Harassment">Harassment</option>
                                            <option value="Stalking">Stalking</option>
                                            <option value="Suspicious person">Suspicious person</option>
                                            <option value="Suspicious vehicle">Suspicious vehicle</option>
                                        </select>
                                    </div>
                                    <div style={{ marginBottom: '1rem' }}>
                                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#475569', marginBottom: '0.5rem' }}>Person Description</label>
                                        <textarea rows="3" value={formData.value.personDescription} onInput={(e) => formData.value.personDescription = e.target.value} placeholder="Height, clothes, visible marks..." style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem', boxSizing: 'border-box', resize: 'vertical' }}></textarea>
                                    </div>
                                    <div style={{ marginBottom: '1rem' }}>
                                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#475569', marginBottom: '0.5rem' }}>Vehicle Description (If any)</label>
                                        <textarea rows="2" value={formData.value.vehicleDescription} onInput={(e) => formData.value.vehicleDescription = e.target.value} placeholder="Type, color, number plate..." style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem', boxSizing: 'border-box', resize: 'vertical' }}></textarea>
                                    </div>
                                    <div style={{ marginBottom: '1rem' }}>
                                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#475569', marginBottom: '0.5rem' }}>Repeated Incident?</label>
                                        <select value={formData.value.repeatedIncident} onChange={(e) => formData.value.repeatedIncident = e.target.value} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem', boxSizing: 'border-box' }}>
                                            <option value="No">No</option>
                                            <option value="Yes">Yes</option>
                                        </select>
                                    </div>
                                </>
                            )}

                            {/* ===================== ACCIDENT ===================== */}
                            {caseType.value === 'accident' && (
                                <>
                                    <div style={{ marginBottom: '1rem' }}>
                                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#475569', marginBottom: '0.5rem' }}>Accident Type<span style={{ color: 'red' }}>*</span></label>
                                        <select required value={formData.value.accidentType} onChange={(e) => formData.value.accidentType = e.target.value} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem', boxSizing: 'border-box' }}>
                                            <option value="">Select type</option>
                                            <option value="Bike">Bike</option>
                                            <option value="Car">Car</option>
                                            <option value="Hit & run">Hit & run</option>
                                        </select>
                                    </div>
                                    <div style={{ marginBottom: '1rem' }}>
                                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#475569', marginBottom: '0.5rem' }}>Injuries?<span style={{ color: 'red' }}>*</span></label>
                                        <select required value={formData.value.injuries} onChange={(e) => formData.value.injuries = e.target.value} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem', boxSizing: 'border-box' }}>
                                            <option value="No">No</option>
                                            <option value="Yes">Yes</option>
                                        </select>
                                    </div>
                                    <div style={{ marginBottom: '1rem' }}>
                                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#475569', marginBottom: '0.5rem' }}>Ambulance Required?</label>
                                        <select value={formData.value.ambulanceRequired} onChange={(e) => formData.value.ambulanceRequired = e.target.value} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem', boxSizing: 'border-box' }}>
                                            <option value="No">No</option>
                                            <option value="Yes">Yes</option>
                                        </select>
                                    </div>
                                    <div style={{ marginBottom: '1rem' }}>
                                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#475569', marginBottom: '0.5rem' }}>Vehicles Involved</label>
                                        <input type="text" value={formData.value.vehiclesInvolved} onInput={(e) => formData.value.vehiclesInvolved = e.target.value} placeholder="e.g. 1 Car, 1 Bike" style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem', boxSizing: 'border-box' }} />
                                    </div>
                                    <div style={{ marginBottom: '1rem' }}>
                                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#475569', marginBottom: '0.5rem' }}>Road Blocked?</label>
                                        <select value={formData.value.roadBlocked} onChange={(e) => formData.value.roadBlocked = e.target.value} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem', boxSizing: 'border-box' }}>
                                            <option value="No">No</option>
                                            <option value="Yes">Yes</option>
                                        </select>
                                    </div>
                                </>
                            )}

                            {/* ===================== CAMERA / SAFETY ISSUE ===================== */}
                            {caseType.value === 'camera_issue' && (
                                <>
                                    <div style={{ marginBottom: '1rem' }}>
                                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#475569', marginBottom: '0.5rem' }}>Issue Type<span style={{ color: 'red' }}>*</span></label>
                                        <select required value={formData.value.issueType} onChange={(e) => formData.value.issueType = e.target.value} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem', boxSizing: 'border-box' }}>
                                            <option value="">Select type</option>
                                            <option value="Camera not working">Camera not working</option>
                                            <option value="No camera">No camera</option>
                                            <option value="Blind spot">Blind spot</option>
                                            <option value="Street light not working">Street light not working</option>
                                        </select>
                                    </div>
                                    <div style={{ marginBottom: '1rem' }}>
                                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#475569', marginBottom: '0.5rem' }}>Since When</label>
                                        <input type="text" value={formData.value.sinceWhen} onInput={(e) => formData.value.sinceWhen = e.target.value} placeholder="e.g. 2 days, Since yesterday" style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem', boxSizing: 'border-box' }} />
                                    </div>
                                    {/* Note: Photo proof is already covered in Common fields */}
                                </>
                            )}

                        </div>

                        <button type="submit" disabled={loading.value} style={{
                            width: '100%',
                            padding: '1rem',
                            background: loading.value ? '#93c5fd' : '#2563eb',
                            color: 'white',
                            border: 'none',
                            borderRadius: '12px',
                            fontSize: '1.1rem',
                            fontWeight: '600',
                            cursor: loading.value ? 'not-allowed' : 'pointer',
                            boxShadow: '0 4px 6px -1px rgba(37,99,235,0.2)',
                            transition: 'all 0.2s'
                        }}>
                            {loading.value ? 'Submitting...' : 'Submit Report'}
                        </button>
                    </form>
                )}
            </div>
        );
    }
};
