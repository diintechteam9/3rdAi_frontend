import { ref, computed, onMounted, watch } from 'vue';
import api from '../../services/api.js';

// ─── Static Config ─────────────────────────────────────────────────────────

const STATUS_FLOW = {
    'Reported': { next: ['Under Review'], color: '#64748b', bg: '#f1f5f9', icon: '📋' },
    'Under Review': { next: ['Verified', 'Rejected'], color: '#d97706', bg: '#fef3c7', icon: '🔍' },
    'Verified': { next: ['Action Taken', 'Rejected'], color: '#7c3aed', bg: '#ede9fe', icon: '✅' },
    'Action Taken': { next: ['Resolved'], color: '#2563eb', bg: '#dbeafe', icon: '⚡' },
    'Resolved': { next: [], color: '#16a34a', bg: '#dcfce7', icon: '🏁' },
    'Rejected': { next: [], color: '#dc2626', bg: '#fee2e2', icon: '❌' }
};

const CATEGORY_BASIS_TYPES = {
    robbery: [
        'Eyewitness Account Recorded',
        'CCTV Footage Reviewed',
        'FIR Lodged',
        'Suspect Identified',
        'Suspect Apprehended',
        'Vehicle Traced',
        'Forensic Evidence Collected',
        'Victim Statement Recorded',
        'Case Under Investigation'
    ],
    unidentified_emergency: [
        'Scene Assessed by Officers',
        'Medical Assessment Completed',
        'Ambulance Dispatched',
        'Forensic Team Dispatched',
        'Identity of Person Confirmed',
        'Object Identified as Safe',
        'Object Identified as Threat',
        'Area Cordoned Off',
        'Case Referred to Specialists'
    ],
    snatching: [
        'Eyewitness Account Recorded',
        'CCTV Footage Reviewed',
        'Victim Statement Recorded',
        'FIR Lodged',
        'Suspect Traced via CCTV',
        'Suspect Apprehended',
        'Stolen Item Recovered',
        'Vehicle Number Traced',
        'Case Under Investigation'
    ],
    theft: [
        'Scene Inspected by Officers',
        'CCTV Evidence Collected',
        'Victim Statement Recorded',
        'Forensic Evidence Collected',
        'FIR Lodged',
        'Suspect Identified',
        'Suspect Apprehended',
        'Item Partially Recovered',
        'Item Fully Recovered',
        'Insurance Notified'
    ],
    harassment: [
        'Individual Apprehended',
        'Scene Monitored by Officers',
        'Victim Statement Recorded',
        'CCTV Evidence Collected',
        'Suspect Under Surveillance',
        'FIR Lodged',
        'Restraining Notice Issued',
        'Case Transferred to Cyber Cell',
        'Case Under Investigation'
    ],
    accident: [
        'Accident Scene Secured',
        'Medical Assistance Provided',
        'Ambulance Dispatched',
        'FIR Registered',
        'Vehicles Involved Inspected',
        'Traffic Restored',
        'Hit & Run Investigation Started',
        'Insurance Notified',
        'Victim Hospitalized',
        'Scene Cleared'
    ],
    camera_issue: [
        'Technical Team Dispatched',
        'Camera Restored and Functional',
        'New Camera Installation Initiated',
        'Street Light Repaired',
        'Maintenance Request Filed',
        'Blind Spot Logged for Review',
        'Temporary Patrol Assigned',
        'Issue Under Continuous Observation'
    ]
};

const DEFAULT_BASIS_TYPES = [
    'Site Inspection Completed',
    'Evidence Collected',
    'Witness Statement Recorded',
    'FIR Lodged',
    'Case Under Investigation',
    'Action Initiated',
    'Case Resolved'
];

const CASE_TYPE_LABELS = {
    robbery: 'Robbery',
    unidentified_emergency: 'Emergency / Unknown',
    snatching: 'Snatching',
    theft: 'Theft',
    harassment: 'Harassment / Suspicious',
    accident: 'Accident',
    camera_issue: 'Camera / Safety Issue'
};

const PRIORITY_CONFIG = {
    critical: { color: '#dc2626', bg: '#fee2e2', border: '#fca5a5', label: 'CRITICAL', dot: '#ef4444' },
    high: { color: '#d97706', bg: '#fef3c7', border: '#fde68a', label: 'HIGH', dot: '#f59e0b' },
    medium: { color: '#2563eb', bg: '#dbeafe', border: '#bfdbfe', label: 'MEDIUM', dot: '#3b82f6' },
    low: { color: '#16a34a', bg: '#dcfce7', border: '#86efac', label: 'LOW', dot: '#22c55e' }
};

export default {
    name: 'PartnerCases',
    setup() {
        // ── State ─────────────────────────────────────────────────────────────
        const cases = ref([]);
        const loading = ref(true);
        const error = ref('');
        const activeFilter = ref('Reported');
        const activeCategory = ref('all'); // 'all', 'open', 'closed'
        const selectedCase = ref(null);
        const caseLoading = ref(false);

        // Update form state
        const updateForm = ref({
            status: '',
            basisType: '',
            description: ''
        });
        const updateLoading = ref(false);
        const updateError = ref('');
        const updateSuccess = ref('');
        const descCharCount = computed(() => updateForm.value.description.length);

        // Custom Dropdown state
        const openDropdown = ref(null); // 'status', 'basis', or null

        const toggleDropdown = (name, e) => {
            if (e) e.stopPropagation();
            if (updateLoading.value) return;

            openDropdown.value = (openDropdown.value === name) ? null : name;
        };

        const closeAllDropdowns = () => {
            openDropdown.value = null;
        };

        // Counts per status
        const statusCounts = ref({});

        const STATUS_TABS = ['Reported', 'Under Review', 'Verified', 'Action Taken', 'Resolved', 'Rejected'];

        // ── Computed ──────────────────────────────────────────────────────────

        const filteredCases = computed(() => {
            if (activeCategory.value === 'all') {
                if (!activeFilter.value) return cases.value;
                return cases.value.filter(c => c.status === activeFilter.value);
            }
            if (activeCategory.value === 'open') {
                const openStatuses = ['Under Review', 'Verified', 'Action Taken'];
                return cases.value.filter(c => openStatuses.includes(c.status));
            }
            if (activeCategory.value === 'closed') {
                return cases.value.filter(c => c.status === 'Resolved');
            }
            return cases.value;
        });

        const allowedNextStatuses = computed(() => {
            if (!selectedCase.value) return [];
            return STATUS_FLOW[selectedCase.value.status]?.next || [];
        });

        const availableBasisTypes = computed(() => {
            if (!selectedCase.value) return DEFAULT_BASIS_TYPES;
            const rawCat = selectedCase.value.metadata?.type || '';
            const cat = rawCat.toLowerCase().trim();

            // Check if we have specific types for this category
            if (CATEGORY_BASIS_TYPES[cat]) {
                return CATEGORY_BASIS_TYPES[cat];
            }

            // Try to find a match by label if key doesn't match directly
            for (const key in CATEGORY_BASIS_TYPES) {
                if (key.toLowerCase() === cat) return CATEGORY_BASIS_TYPES[key];
            }

            return DEFAULT_BASIS_TYPES;
        });

        const isTerminal = computed(() => {
            if (!selectedCase.value) return false;
            return allowedNextStatuses.value.length === 0;
        });

        const descriptionValid = computed(() => descCharCount.value >= 20);
        const formValid = computed(() =>
            updateForm.value.status &&
            updateForm.value.basisType &&
            descriptionValid.value
        );

        // ── API Calls ─────────────────────────────────────────────────────────

        const fetchCases = async () => {
            loading.value = true;
            error.value = '';
            try {
                const response = await api.getPartnerCases({ limit: 100 });
                if (response.success) {
                    cases.value = response.data.alerts;
                    statusCounts.value = response.data.statusCounts || {};
                } else {
                    error.value = response.message || 'Failed to load cases';
                }
            } catch (err) {
                console.error(err);
                error.value = err.message || 'Error loading cases';
            } finally {
                loading.value = false;
            }
        };

        const selectCase = async (caseItem) => {
            caseLoading.value = true;
            updateError.value = '';
            updateSuccess.value = '';
            updateForm.value = { status: '', basisType: '', description: '' };
            try {
                const res = await api.getPartnerCaseById(caseItem._id);
                if (res.success) {
                    selectedCase.value = res.data.alert;
                }
            } catch (err) {
                selectedCase.value = caseItem;
            } finally {
                caseLoading.value = false;
            }
        };

        const submitUpdate = async () => {
            if (!formValid.value || !selectedCase.value) return;
            updateLoading.value = true;
            updateError.value = '';
            updateSuccess.value = '';
            try {
                const res = await api.updateCaseStatus(
                    selectedCase.value._id,
                    updateForm.value.status,
                    updateForm.value.basisType,
                    updateForm.value.description
                );
                if (res.success) {
                    updateSuccess.value = res.message || 'Status updated successfully';
                    selectedCase.value = res.data.alert;
                    // Refresh list in background
                    fetchCases();
                    // Reset form
                    updateForm.value = { status: '', basisType: '', description: '' };
                } else {
                    updateError.value = res.message || 'Update failed';
                }
            } catch (err) {
                updateError.value = err.message || 'Failed to update status';
            } finally {
                updateLoading.value = false;
            }
        };

        // Reset basisType when status changes
        watch(() => updateForm.value.status, () => {
            updateForm.value.basisType = '';
        });

        onMounted(fetchCases);

        // ── Helpers ───────────────────────────────────────────────────────────

        const getCaseCategory = (c) => c.metadata?.type || 'unknown';
        const getCategoryLabel = (c) => CASE_TYPE_LABELS[getCaseCategory(c)] || 'General';
        const getPriority = (c) => PRIORITY_CONFIG[c.priority] || PRIORITY_CONFIG.medium;
        const getStatus = (s) => STATUS_FLOW[s] || { color: '#64748b', bg: '#f1f5f9', icon: '📋' };

        const formatDate = (d) => {
            if (!d) return '—';
            return new Date(d).toLocaleString('en-IN', {
                day: '2-digit', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit', hour12: true
            });
        };

        const formatShortDate = (d) => {
            if (!d) return '—';
            return new Date(d).toLocaleString('en-IN', {
                day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true
            });
        };

        const getTabCount = (tab) => {
            return (statusCounts.value[tab] || 0);
        };

        // ── Render ─────────────────────────────────────────────────────────────

        return () => (
            <div
                style={{ display: 'flex', height: '100%', fontFamily: "'Inter', -apple-system, sans-serif", background: 'transparent' }}
                onClick={closeAllDropdowns}
            >
                <style>{`
                    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
                    * { box-sizing: border-box; }
                    ::-webkit-scrollbar { width: 6px; height: 6px; }
                    ::-webkit-scrollbar-track { background: #f1f5f9; }
                    ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
                    ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }

                    .case-row {
                        background: white;
                        border-radius: 14px;
                        padding: 1rem 1.25rem;
                        margin-bottom: 0.625rem;
                        display: flex;
                        align-items: center;
                        gap: 1rem;
                        cursor: pointer;
                        border: 2px solid transparent;
                        transition: all 0.2s ease;
                        position: relative;
                        overflow: hidden;
                    }
                    .case-row:hover {
                        border-color: #6366f1;
                        box-shadow: 0 4px 20px rgba(99,102,241,0.12);
                        transform: translateX(2px);
                    }
                    .case-row.selected {
                        border-color: #4f46e5;
                        background: linear-gradient(135deg, #eef2ff 0%, #ffffff 100%);
                        box-shadow: 0 4px 20px rgba(79,70,229,0.15);
                    }
                    .status-badge {
                        display: inline-flex;
                        align-items: center;
                        gap: 5px;
                        padding: 3px 10px;
                        border-radius: 999px;
                        font-size: 11px;
                        font-weight: 700;
                        letter-spacing: 0.3px;
                        white-space: nowrap;
                    }
                    .priority-dot {
                        width: 7px; height: 7px;
                        border-radius: 50%;
                        display: inline-block;
                        flex-shrink: 0;
                        animation: pulse-dot 2s infinite;
                    }
                    @keyframes pulse-dot {
                        0%, 100% { opacity: 1; transform: scale(1); }
                        50% { opacity: 0.7; transform: scale(1.3); }
                    }
                     .tab-btn {
                        padding: 0.5rem 1.25rem;
                        border: 1px solid #e2e8f0;
                        border-radius: 12px;
                        font-size: 0.75rem;
                        font-weight: 700;
                        cursor: pointer;
                        white-space: nowrap;
                        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        background: white;
                        color: #64748b;
                    }
                    .tab-btn:hover {
                        border-color: #cbd5e1;
                        background: #f8fafc;
                        color: #475569;
                    }
                    .tab-btn.active { 
                        background: #4f46e5; 
                        color: white !important; 
                        border-color: #4f46e5;
                        box-shadow: 0 4px 12px rgba(79,70,229,0.25); 
                    }

                    .toggle-container {
                        display: flex;
                        background: rgba(255, 255, 255, 0.05);
                        padding: 4px;
                        border-radius: 12px;
                        gap: 4px;
                        border: 1px solid rgba(255, 255, 255, 0.1);
                    }
                    .toggle-item {
                        flex: 1;
                        padding: 10px 8px;
                        text-align: center;
                        border-radius: 8px;
                        cursor: pointer;
                        font-size: 0.75rem;
                        font-weight: 700;
                        transition: all 0.2s;
                        color: #a5b4fc;
                        border: 1px solid transparent;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 6px;
                    }
                    .toggle-item:hover {
                        background: rgba(255, 255, 255, 0.1);
                    }
                    .toggle-item.active {
                        background: #4f46e5;
                        color: white !important;
                        box-shadow: 0 4px 12px rgba(79,70,229,0.3);
                        border-color: rgba(255, 255, 255, 0.1);
                    }
                    .toggle-item.disabled {
                        opacity: 0.5;
                        cursor: not-allowed;
                    }


                    .form-select, .form-textarea {
                        width: 100%;
                        padding: 0.85rem 1rem;
                        border: 2px solid #e2e8f0;
                        border-radius: 12px;
                        font-size: 0.95rem;
                        color: #1e293b;
                        background: #f8fafc;
                        font-family: inherit;
                        transition: all 0.2s ease;
                        outline: none;
                        appearance: none;
                    }
                    .form-select:focus, .form-textarea:focus {
                        border-color: #4f46e5;
                        background: white;
                        box-shadow: 0 0 0 4px rgba(79,70,229,0.1);
                    }
                    .form-select:disabled, .form-textarea:disabled {
                        opacity: 0.5;
                        cursor: not-allowed;
                    }
                    .submit-btn {
                        width: 100%;
                        padding: 1rem;
                        border: none;
                        border-radius: 14px;
                        font-size: 1rem;
                        font-weight: 700;
                        cursor: pointer;
                        transition: all 0.3s ease;
                        letter-spacing: 0.3px;
                    }
                    .submit-btn:not(:disabled):hover {
                        transform: translateY(-2px);
                        box-shadow: 0 8px 25px rgba(79,70,229,0.4);
                        filter: brightness(1.05);
                    }
                    .submit-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

                    /* Custom Dropdown Styles */
                    .custom-dropdown {
                        position: relative;
                        width: 100%;
                    }
                    .dropdown-trigger {
                        width: 100%;
                        padding: 0.85rem 1rem;
                        border: 2px solid rgba(255, 255, 255, 0.1);
                        border-radius: 12px;
                        font-size: 0.85rem;
                        color: white !important;
                        background: rgba(255, 255, 255, 0.05);
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        transition: all 0.2s;
                        text-align: left;
                        font-family: inherit;
                    }
                    .dropdown-trigger:hover:not(.disabled) {
                        background: rgba(255, 255, 255, 0.1);
                        border-color: rgba(255, 255, 255, 0.2);
                    }
                    .dropdown-trigger.disabled {
                        opacity: 0.4;
                        cursor: not-allowed;
                    }
                    .dropdown-menu {
                        position: absolute;
                        top: calc(100% + 4px);
                        left: 0;
                        right: 0;
                        background: #111827; /* Darker than form background */
                        border: 1px solid rgba(255, 255, 255, 0.15);
                        border-radius: 12px;
                        box-shadow: 0 12px 30px rgba(0, 0, 0, 0.6);
                        z-index: 999;
                        max-height: 200px;
                        overflow-y: auto;
                        padding: 4px;
                    }
                    .custom-dropdown.open {
                        z-index: 2000;
                    }
                    .custom-dropdown.open .dropdown-trigger {
                        border-color: #4f46e5;
                        background: rgba(79, 70, 229, 0.1);
                        box-shadow: 0 0 0 4px rgba(79,70,229,0.15);
                    }
                    .dropdown-item {
                        padding: 10px 12px;
                        border-radius: 8px;
                        font-size: 0.8rem;
                        color: #a5b4fc;
                        cursor: pointer;
                        transition: all 0.2s;
                        display: flex;
                        align-items: center;
                        gap: 10px;
                    }
                    .dropdown-item:hover {
                        background: #312e81;
                        color: white;
                    }
                    .dropdown-item.selected {
                        background: #4f46e5;
                        color: white;
                    }


                    .timeline-line {
                        position: absolute;
                        left: 11px;
                        top: 24px;
                        bottom: 0;
                        width: 2px;
                        background: linear-gradient(180deg, #c7d2fe 0%, #e2e8f0 100%);
                    }
                    .timeline-item:last-child .timeline-line { display: none; }

                    .detail-card {
                        background: white;
                        border-radius: 16px;
                        padding: 1.25rem;
                        margin-bottom: 1rem;
                        border: 1px solid #f1f5f9;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.04);
                    }
                    .section-title {
                        font-size: 0.75rem;
                        font-weight: 800;
                        color: #94a3b8;
                        text-transform: uppercase;
                        letter-spacing: 1px;
                        margin-bottom: 1rem;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                    }
                    .section-title::after {
                        content: '';
                        flex: 1;
                        height: 1px;
                        background: #f1f5f9;
                    }
                    .spinner {
                        width: 18px; height: 18px;
                        border: 2px solid rgba(255,255,255,0.4);
                        border-top-color: white;
                        border-radius: 50%;
                        animation: spin 0.8s linear infinite;
                        display: inline-block;
                    }
                    @keyframes spin { to { transform: rotate(360deg); } }
                    .empty-state {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        padding: 3rem 1rem;
                        color: #94a3b8;
                        text-align: center;
                    }
                    .alert-badge {
                        display: inline-flex;
                        align-items: center;
                        gap: 6px;
                        padding: 0.5rem 1rem;
                        border-radius: 10px;
                        font-size: 0.875rem;
                        font-weight: 600;
                    }
                `}</style>

                {/* ── LEFT PANEL: Case List ───────────────────────────────── */}
                <div style={{
                    width: selectedCase.value ? '42%' : '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%',
                    overflow: 'hidden',
                    transition: 'width 0.3s ease',
                    borderRight: selectedCase.value ? '1px solid #e2e8f0' : 'none'
                }}>

                    {/* Header */}
                    <div style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)', padding: '1rem 1.5rem', flexShrink: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{ width: '32px', height: '32px', background: 'rgba(255,255,255,0.15)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>🛡️</div>
                                <div>
                                    <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: '800', color: 'white', lineHeight: '1' }}>Incident Command</h2>
                                    <p style={{ margin: 3, fontSize: '0.65rem', color: '#a5b4fc', fontWeight: '500', opacity: 0.8 }}>Active Police Operations</p>
                                </div>
                            </div>
                            <button
                                onClick={fetchCases}
                                disabled={loading.value}
                                style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', padding: '0.4rem 0.6rem', color: 'white', cursor: loading.value ? 'not-allowed' : 'pointer', fontSize: '0.75rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}
                            >
                                {loading.value ? <span class="spinner" /> : '↻'}
                            </button>
                        </div>

                        {/* Stats strip */}
                        <div style={{ display: 'flex', gap: '0.8rem', marginTop: '1rem' }}>
                            {[
                                {
                                    id: 'all',
                                    label: 'All',
                                    val: cases.value.length,
                                    icon: '📋'
                                },
                                {
                                    id: 'open',
                                    label: 'Open',
                                    val: (statusCounts.value['Under Review'] || 0) + (statusCounts.value['Verified'] || 0) + (statusCounts.value['Action Taken'] || 0),
                                    icon: '🕒'
                                },
                                {
                                    id: 'closed',
                                    label: 'Closed',
                                    val: (statusCounts.value['Resolved'] || 0),
                                    icon: '✅'
                                }
                            ].map(s => {
                                const isActive = activeCategory.value === s.id;
                                return (
                                    <div
                                        key={s.id}
                                        onClick={() => {
                                            activeCategory.value = s.id;
                                            if (s.id !== 'all') activeFilter.value = null;
                                        }}
                                        style={{
                                            background: isActive ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.06)',
                                            borderRadius: '12px',
                                            padding: '0.75rem 0.5rem',
                                            textAlign: 'center',
                                            flex: 1,
                                            cursor: 'pointer',
                                            border: `1px solid ${isActive ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)'}`,
                                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            gap: '4px',
                                            boxShadow: isActive ? '0 4px 15px rgba(0,0,0,0.2)' : 'none',
                                            transform: isActive ? 'translateY(-1px)' : 'none'
                                        }}
                                    >
                                        <div style={{ fontSize: '1.25rem', marginBottom: '2px', filter: isActive ? 'none' : 'grayscale(0.5) opacity(0.7)' }}>{s.icon}</div>
                                        <div style={{ fontSize: '1.2rem', fontWeight: '900', color: 'white', lineHeight: '1' }}>{s.val}</div>
                                        <div style={{ fontSize: '0.65rem', color: isActive ? '#fff' : '#a5b4fc', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.8px' }}>{s.label}</div>

                                        {isActive && (
                                            <div style={{ position: 'absolute', bottom: '0', left: '20%', right: '20%', height: '2px', background: 'white', borderRadius: '2px 2px 0 0' }} />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Filter Tabs */}
                    <div style={{ background: 'white', padding: '0.75rem 1rem', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: '0.5rem', overflowX: 'auto', flexShrink: 0 }}>
                        {STATUS_TABS.map(tab => (
                            <button
                                key={tab}
                                class={['tab-btn', activeFilter.value === tab && activeCategory.value === 'all' ? 'active' : 'inactive'].join(' ')}
                                onClick={() => {
                                    activeFilter.value = tab;
                                    activeCategory.value = 'all';
                                }}
                            >
                                {tab}
                                <span style={{
                                    background: activeFilter.value === tab ? 'rgba(255,255,255,0.2)' : '#f1f5f9',
                                    color: activeFilter.value === tab ? 'white' : '#64748b',
                                    borderRadius: '6px',
                                    padding: '2px 6px',
                                    fontSize: '10px',
                                    fontWeight: '800',
                                    transition: 'all 0.2s'
                                }}>{getTabCount(tab)}</span>

                            </button>
                        ))}
                    </div>

                    {/* Case List */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '0.875rem' }}>
                        {loading.value ? (
                            <div class="empty-state">
                                <div class="spinner" style={{ width: '36px', height: '36px', borderColor: '#e2e8f0', borderTopColor: '#4f46e5', borderWidth: '3px' }} />
                                <p style={{ marginTop: '1rem', fontSize: '0.95rem' }}>Loading cases...</p>
                            </div>
                        ) : error.value ? (
                            <div class="empty-state">
                                <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>⚠️</div>
                                <p style={{ color: '#dc2626', fontWeight: '600' }}>{error.value}</p>
                                <button onClick={fetchCases} style={{ marginTop: '1rem', padding: '0.5rem 1.25rem', background: '#4f46e5', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>Retry</button>
                            </div>
                        ) : filteredCases.value.length === 0 ? (
                            <div class="empty-state">
                                <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🗂️</div>
                                <p style={{ fontSize: '1rem', fontWeight: '700', color: '#475569' }}>No cases found</p>
                                <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '0.25rem' }}>No {activeFilter.value} cases in your jurisdiction</p>
                            </div>
                        ) : (
                            filteredCases.value.map(c => {
                                const priority = getPriority(c);
                                const statusCfg = getStatus(c.status);
                                const isSelected = selectedCase.value?._id === c._id;
                                const catLabel = getCategoryLabel(c);
                                const loc = c.metadata?.location || 'Location not specified';

                                return (
                                    <div
                                        key={c._id}
                                        class={['case-row', isSelected ? 'selected' : ''].join(' ')}
                                        onClick={() => selectCase(c)}
                                    >
                                        {/* Priority strip */}
                                        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px', background: priority.dot, borderRadius: '4px 0 0 4px' }} />

                                        {/* Case icon */}
                                        <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: statusCfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', flexShrink: 0, border: `1px solid ${statusCfg.color}20` }}>
                                            {statusCfg.icon}
                                        </div>

                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem', flexWrap: 'wrap' }}>
                                                <span style={{ fontSize: '0.95rem', fontWeight: '700', color: '#1e293b', letterSpacing: '-0.01em' }}>{catLabel}</span>
                                                <span style={{ fontSize: '0.7rem', fontWeight: '700', color: '#94a3b8' }}>#{c._id.slice(-6).toUpperCase()}</span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                                <span class="status-badge" style={{ background: statusCfg.bg, color: statusCfg.color, border: `1px solid ${statusCfg.color}30` }}>
                                                    {statusCfg.icon} {c.status}
                                                </span>
                                                <span class="status-badge" style={{ background: priority.bg, color: priority.color, border: `1px solid ${priority.border}` }}>
                                                    <span class="priority-dot" style={{ background: priority.dot }} />
                                                    {priority.label}
                                                </span>
                                            </div>
                                            <div style={{ marginTop: '0.35rem', fontSize: '0.78rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                                <span>📍 {loc.length > 35 ? loc.substring(0, 35) + '…' : loc}</span>
                                                <span>·</span>
                                                <span>🕐 {formatShortDate(c.createdAt)}</span>
                                            </div>
                                        </div>

                                        <div style={{ color: '#c7d2fe', fontSize: '1.2rem', flexShrink: 0 }}>›</div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* ── RIGHT PANEL: Case Detail + Update Form ──────────────── */}
                {selectedCase.value && (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: '#f8fafc', position: 'relative' }}>

                        {/* Detail Header */}
                        <div style={{
                            background: 'white',
                            padding: '1.25rem 2rem',
                            borderBottom: '1px solid #e2e8f0',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '1.25rem',
                            flexShrink: 0,
                            boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
                        }}>
                            <button
                                onClick={() => { selectedCase.value = null; updateError.value = ''; updateSuccess.value = ''; }}
                                style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '8px',
                                    border: '1px solid #e2e8f0',
                                    background: 'white',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '16px',
                                    color: '#64748b',
                                    flexShrink: 0,
                                    transition: 'all 0.2s'
                                }}
                                onMouseOver={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#4f46e5'; }}
                                onMouseOut={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.color = '#64748b'; }}
                            >←</button>

                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                                    <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '900', color: '#111827', letterSpacing: '-0.02em' }}>
                                        {getCategoryLabel(selectedCase.value)}
                                    </h3>
                                    <span style={{ fontSize: '0.85rem', background: '#f8fafc', color: '#64748b', padding: '4px 10px', borderRadius: '8px', fontWeight: '700', border: '1px solid #e2e8f0' }}>
                                        ID: {selectedCase.value._id.slice(-8).toUpperCase()}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                                    {(() => {
                                        const sc = getStatus(selectedCase.value.status);
                                        return (
                                            <span class="status-badge" style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.color}30`, padding: '4px 12px', fontSize: '11px' }}>
                                                {sc.icon} {selectedCase.value.status}
                                            </span>
                                        );
                                    })()}
                                    {(() => {
                                        const pc = getPriority(selectedCase.value);
                                        return (
                                            <span class="status-badge" style={{ background: pc.bg, color: pc.color, border: `1px solid ${pc.border}`, padding: '4px 12px', fontSize: '11px' }}>
                                                <span class="priority-dot" style={{ background: pc.dot }} /> {pc.label} Priority
                                            </span>
                                        );
                                    })()}
                                    {isTerminal.value && (
                                        <span class="status-badge" style={{ background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0', padding: '4px 12px', fontSize: '11px' }}>
                                            🔒 Case Archive
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Detail Body */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.25rem' }}>

                            {caseLoading.value ? (
                                <div class="empty-state">
                                    <div class="spinner" style={{ width: '30px', height: '30px', borderColor: '#e2e8f0', borderTopColor: '#4f46e5', borderWidth: '3px' }} />
                                    <p style={{ marginTop: '0.75rem' }}>Loading details...</p>
                                </div>
                            ) : (
                                <>
                                    {/* ── Incident Details ─────────────────── */}
                                    <div class="detail-card">
                                        <div class="section-title">📋 Incident Details</div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>

                                            <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '0.75rem' }}>
                                                <div style={{ fontSize: '0.7rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.25rem' }}>Type</div>
                                                <div style={{ fontSize: '0.9rem', fontWeight: '700', color: '#1e293b' }}>{getCategoryLabel(selectedCase.value)}</div>
                                            </div>

                                            <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '0.75rem' }}>
                                                <div style={{ fontSize: '0.7rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.25rem' }}>Reported / Incident Time</div>
                                                <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#1e293b' }}>
                                                    {formatShortDate(selectedCase.value.createdAt)}
                                                    {selectedCase.value.metadata?.dateTime && (
                                                        <span style={{ color: '#6366f1', marginLeft: '6px' }}>(Inc: {formatShortDate(selectedCase.value.metadata.dateTime)})</span>
                                                    )}
                                                </div>
                                            </div>

                                            <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '0.75rem', gridColumn: '1/-1' }}>
                                                <div style={{ fontSize: '0.7rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.25rem' }}>📍 Location</div>
                                                <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#1e293b' }}>{selectedCase.value.metadata?.location || 'Not specified'}</div>
                                                {selectedCase.value.metadata?.latitude && (
                                                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>
                                                        GPS: {selectedCase.value.metadata.latitude.toFixed(5)}, {selectedCase.value.metadata.longitude?.toFixed(5)}
                                                    </div>
                                                )}
                                            </div>

                                        </div>

                                        <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '0.875rem', marginTop: '0.75rem' }}>
                                            <div style={{ fontSize: '0.7rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.5rem' }}>Citizen Report</div>
                                            <p style={{ margin: 0, fontSize: '0.9rem', color: '#334155', lineHeight: '1.6', fontWeight: '500' }}>
                                                {selectedCase.value.message || 'No description provided.'}
                                            </p>
                                        </div>

                                        {/* Metadata fields */}
                                        {(() => {
                                            const cat = getCaseCategory(selectedCase.value);
                                            const allowedExt = {
                                                'robbery': ['incidentTitle', 'robberyWeaponUsed', 'robberyInjury', 'robberySuspectCount'],
                                                'unidentified_emergency': ['emergencyType'],
                                                'snatching': ['snatchingType', 'itemStolen', 'estimatedValue', 'numberOfAttackers', 'weaponUsed', 'vehicleUsed', 'injuryHappened'],
                                                'theft': ['theftType', 'itemStolen', 'estimatedValue', 'cctvNearby', 'suspectSeen', 'vehicleType', 'numberPlate', 'vehicleColor'],
                                                'harassment': ['incidentType', 'personDescription', 'vehicleDescription', 'repeatedIncident'],
                                                'accident': ['accidentType', 'injuries', 'ambulanceRequired', 'vehiclesInvolved', 'roadBlocked'],
                                                'camera_issue': ['issueType', 'sinceWhen']
                                            };
                                            const validKeys = allowedExt[cat] || [];
                                            const entries = Object.entries(selectedCase.value.metadata || {})
                                                .filter(([k, v]) => validKeys.includes(k) && v !== null && String(v).trim() !== '');

                                            if (entries.length === 0) return null;

                                            return (
                                                <div style={{ marginTop: '0.75rem' }}>
                                                    <div style={{ fontSize: '0.7rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.5rem' }}>Incident Form Data</div>
                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                                        {entries.map(([k, v]) => (
                                                            <div key={k} style={{ background: '#f1f5f9', borderRadius: '8px', padding: '0.6rem 0.75rem' }}>
                                                                <div style={{ fontSize: '0.65rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.2rem' }}>
                                                                    {k.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ')}
                                                                </div>
                                                                <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#334155' }}>{String(v)}</div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </div>

                                    {/* ── Status Update Form ───────────────── */}
                                    {!isTerminal.value ? (
                                        <div style={{ background: 'linear-gradient(135deg, #1e1b4b, #312e81)', borderRadius: '18px', padding: '1.5rem', marginBottom: '1rem', boxShadow: '0 8px 30px rgba(30,27,75,0.25)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                                                <div style={{ width: '38px', height: '38px', background: 'rgba(255,255,255,0.15)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>🔄</div>
                                                <div>
                                                    <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '800', color: 'white' }}>Update Case Status</h4>
                                                    <p style={{ margin: 0, fontSize: '0.75rem', color: '#a5b4fc' }}>All fields mandatory · Strict operational protocol</p>
                                                </div>
                                            </div>

                                            {/* Allowed Next Flow Visual */}
                                            <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '12px', padding: '0.875rem', marginBottom: '1.25rem' }}>
                                                <div style={{ fontSize: '0.7rem', fontWeight: '700', color: '#a5b4fc', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.6rem' }}>Allowed Next Actions</div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                                    <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'rgba(255,255,255,0.6)', background: 'rgba(255,255,255,0.1)', padding: '4px 10px', borderRadius: '8px' }}>
                                                        Current: {selectedCase.value.status}
                                                    </span>
                                                    <span style={{ color: '#a5b4fc', fontSize: '1rem' }}>→</span>
                                                    {allowedNextStatuses.value.map(s => {
                                                        const sc = getStatus(s);
                                                        return (
                                                            <span key={s} style={{ fontSize: '0.8rem', fontWeight: '700', color: sc.color, background: sc.bg, padding: '4px 10px', borderRadius: '8px', border: `1px solid ${sc.color}40` }}>
                                                                {sc.icon} {s}
                                                            </span>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            {/* Step 1: Status */}
                                            <div style={{ marginBottom: '1.25rem' }}>
                                                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '800', color: '#c7d2fe', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.6rem' }}>
                                                    Step 1 — Select New Status <span style={{ color: '#f87171' }}>*</span>
                                                </label>

                                                {allowedNextStatuses.value.length <= 3 ? (
                                                    <div class="toggle-container">
                                                        {allowedNextStatuses.value.map(s => {
                                                            const sc = getStatus(s);
                                                            return (
                                                                <div
                                                                    key={s}
                                                                    class={['toggle-item', updateForm.value.status === s ? 'active' : '', updateLoading.value ? 'disabled' : ''].join(' ')}
                                                                    onClick={() => { if (!updateLoading.value) updateForm.value = { ...updateForm.value, status: s }; }}
                                                                >
                                                                    {sc.icon} {s}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                ) : (
                                                    <div class={['custom-dropdown', openDropdown.value === 'status' ? 'open' : ''].join(' ')}>
                                                        <button
                                                            type="button"
                                                            class={['dropdown-trigger', updateLoading.value ? 'disabled' : ''].join(' ')}
                                                            onClick={(e) => toggleDropdown('status', e)}
                                                        >
                                                            <span>{updateForm.value.status ? getStatus(updateForm.value.status).icon + ' ' + updateForm.value.status : '— Choose status —'}</span>
                                                            <span style={{ fontSize: '10px', opacity: 0.5 }}>{openDropdown.value === 'status' ? '▲' : '▼'}</span>
                                                        </button>
                                                        {openDropdown.value === 'status' && (
                                                            <div class="dropdown-menu">
                                                                {allowedNextStatuses.value.map(s => {
                                                                    const sc = getStatus(s);
                                                                    return (
                                                                        <div
                                                                            key={s}
                                                                            class={['dropdown-item', updateForm.value.status === s ? 'selected' : ''].join(' ')}
                                                                            onClick={() => {
                                                                                updateForm.value = { ...updateForm.value, status: s };
                                                                                openDropdown.value = null;
                                                                            }}
                                                                        >
                                                                            {sc.icon} {s}
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>


                                            {/* Step 2: Basis Type */}
                                            <div style={{ marginBottom: '1.25rem' }}>
                                                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '800', color: '#c7d2fe', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.6rem' }}>
                                                    Step 2 — Operational Basis <span style={{ color: '#f87171' }}>*</span>
                                                </label>
                                                <div style={{ fontSize: '0.7rem', color: '#818cf8', marginBottom: '0.4rem', fontStyle: 'italic' }}>
                                                    {getCategoryLabel(selectedCase.value)} Basis Selection
                                                </div>

                                                {availableBasisTypes.value.length <= 3 && availableBasisTypes.value.length > 0 ? (
                                                    <div class="toggle-container">
                                                        {availableBasisTypes.value.map(b => (
                                                            <div
                                                                key={b}
                                                                class={['toggle-item', updateForm.value.basisType === b ? 'active' : '', (!updateForm.value.status || updateLoading.value) ? 'disabled' : ''].join(' ')}
                                                                onClick={() => { if (updateForm.value.status && !updateLoading.value) updateForm.value = { ...updateForm.value, basisType: b }; }}
                                                            >
                                                                {b}
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div class={['custom-dropdown', openDropdown.value === 'basis' ? 'open' : ''].join(' ')} style={{ zIndex: openDropdown.value === 'basis' ? 3000 : 100 }}>
                                                        <button
                                                            type="button"
                                                            disabled={!updateForm.value.status || updateLoading.value}
                                                            class={['dropdown-trigger', (!updateForm.value.status || updateLoading.value) ? 'disabled' : ''].join(' ')}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                toggleDropdown('basis', e);
                                                            }}
                                                        >
                                                            <span style={{ pointerEvents: 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                                {updateForm.value.basisType || (updateForm.value.status ? '— Select basis type —' : 'Select status first')}
                                                            </span>
                                                            <span style={{ pointerEvents: 'none', fontSize: '10px', opacity: 0.5, marginLeft: '8px' }}>{openDropdown.value === 'basis' ? '▲' : '▼'}</span>
                                                        </button>
                                                        {openDropdown.value === 'basis' && (
                                                            <div class="dropdown-menu" style={{ display: 'block', maxHeight: '250px' }}>
                                                                {availableBasisTypes.value.length > 0 ? availableBasisTypes.value.map(b => (
                                                                    <div
                                                                        key={b}
                                                                        class={['dropdown-item', updateForm.value.basisType === b ? 'selected' : ''].join(' ')}
                                                                        onClick={() => {
                                                                            updateForm.value = { ...updateForm.value, basisType: b };
                                                                            openDropdown.value = null;
                                                                        }}
                                                                    >
                                                                        {b}
                                                                    </div>
                                                                )) : (
                                                                    <div style={{ padding: '10px', fontSize: '0.8rem', color: '#64748b', textAlign: 'center' }}>
                                                                        No basis types available
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>


                                            {/* Step 3: Description */}
                                            <div style={{ marginBottom: '1.25rem' }}>
                                                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '800', color: '#c7d2fe', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.5rem' }}>
                                                    Step 3 — Official Report / Notes <span style={{ color: '#f87171' }}>*</span>
                                                </label>
                                                <textarea
                                                    class="form-textarea"
                                                    rows="4"
                                                    value={updateForm.value.description}
                                                    onInput={e => updateForm.value = { ...updateForm.value, description: e.target.value }}
                                                    placeholder="Document your official action, observations, and findings in detail. Be precise and professional. Minimum 20 characters required."
                                                    disabled={!updateForm.value.basisType || updateLoading.value}
                                                    style={{ resize: 'vertical', minHeight: '90px' }}
                                                />
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.35rem' }}>
                                                    <span style={{ fontSize: '0.72rem', color: descriptionValid.value ? '#6ee7b7' : '#f87171', fontWeight: '600' }}>
                                                        {descriptionValid.value ? '✓ Sufficient detail' : `${20 - descCharCount.value} more chars needed`}
                                                    </span>
                                                    <span style={{ fontSize: '0.72rem', color: '#818cf8' }}>{descCharCount.value} characters</span>
                                                </div>
                                            </div>

                                            {/* Error / Success */}
                                            {updateError.value && (
                                                <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: '10px', padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.875rem', color: '#fca5a5', display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                                                    <span>⚠️</span> <span>{updateError.value}</span>
                                                </div>
                                            )}
                                            {updateSuccess.value && (
                                                <div style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.4)', borderRadius: '10px', padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.875rem', color: '#86efac', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <span>✅</span> <span>{updateSuccess.value}</span>
                                                </div>
                                            )}

                                            {/* Submit */}
                                            <button
                                                class="submit-btn"
                                                onClick={submitUpdate}
                                                disabled={!formValid.value || updateLoading.value}
                                                style={{
                                                    background: formValid.value
                                                        ? 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)'
                                                        : 'rgba(255,255,255,0.1)',
                                                    color: formValid.value ? 'white' : 'rgba(255,255,255,0.4)',
                                                    border: 'none'
                                                }}
                                            >
                                                {updateLoading.value ? (
                                                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.625rem' }}>
                                                        <span class="spinner" /> Submitting Official Update...
                                                    </span>
                                                ) : (
                                                    <span>🔒 Submit Official Status Update</span>
                                                )}
                                            </button>

                                            {/* Extra spacing to allow dropdowns to expand without clipping */}
                                            <div style={{ height: '140px' }}></div>
                                        </div>
                                    ) : (
                                        <div style={{ background: 'white', borderRadius: '16px', padding: '1.25rem', marginBottom: '1rem', textAlign: 'center', border: '2px dashed #e2e8f0' }}>
                                            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>
                                                {selectedCase.value.status === 'Resolved' ? '🏁' : '❌'}
                                            </div>
                                            <div style={{ fontWeight: '800', color: '#1e293b', fontSize: '1rem', marginBottom: '0.25rem' }}>
                                                Case {selectedCase.value.status}
                                            </div>
                                            <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                                                This case has been closed. No further status updates are permitted.
                                            </div>
                                        </div>
                                    )}

                                    {/* ── Timeline ─────────────────────────── */}
                                    <div class="detail-card">
                                        <div class="section-title">🕐 Case Timeline</div>

                                        {(!selectedCase.value.timeline || selectedCase.value.timeline.length === 0) ? (
                                            <div style={{ textAlign: 'center', padding: '1.5rem', color: '#94a3b8', fontSize: '0.9rem' }}>No timeline entries yet</div>
                                        ) : (
                                            <div style={{ position: 'relative' }}>
                                                {[...selectedCase.value.timeline].reverse().map((entry, idx) => {
                                                    const sc = getStatus(entry.status);
                                                    const isFirst = idx === 0;
                                                    return (
                                                        <div key={idx} class="timeline-item" style={{ position: 'relative', paddingLeft: '2rem', paddingBottom: idx < selectedCase.value.timeline.length - 1 ? '1.5rem' : '0' }}>
                                                            {/* Line */}
                                                            {idx < selectedCase.value.timeline.length - 1 && (
                                                                <div class="timeline-line" />
                                                            )}
                                                            {/* Icon */}
                                                            <div style={{
                                                                position: 'absolute',
                                                                left: 0,
                                                                top: 0,
                                                                width: '24px',
                                                                height: '24px',
                                                                borderRadius: '8px',
                                                                background: isFirst ? sc.bg : '#f8fafc',
                                                                border: `2px solid ${isFirst ? sc.color : '#e2e8f0'}`,
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                fontSize: '11px',
                                                                zIndex: 2,
                                                                boxShadow: isFirst ? `0 0 0 3px ${sc.bg}` : 'none'
                                                            }}>
                                                                {sc.icon}
                                                            </div>

                                                            {/* Content */}
                                                            <div style={{ background: isFirst ? `${sc.bg}80` : '#f8fafc', borderRadius: '12px', padding: '0.875rem', border: `1px solid ${isFirst ? sc.color + '30' : '#f1f5f9'}` }}>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                                                    <span style={{ fontWeight: '800', color: sc.color, fontSize: '0.875rem' }}>{entry.status}</span>
                                                                    <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: '600' }}>{formatDate(entry.timestamp)}</span>
                                                                </div>

                                                                {entry.basisType && (
                                                                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'rgba(99,102,241,0.1)', color: '#4f46e5', padding: '3px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '700', marginBottom: '0.4rem' }}>
                                                                        🔖 {entry.basisType}
                                                                    </div>
                                                                )}

                                                                {entry.note && (
                                                                    <p style={{ margin: '0.35rem 0 0', fontSize: '0.85rem', color: '#334155', lineHeight: '1.5', fontWeight: '500' }}>
                                                                        {entry.note}
                                                                    </p>
                                                                )}

                                                                {entry.updatedByName && (
                                                                    <div style={{ marginTop: '0.5rem', fontSize: '0.72rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                        👮 {entry.updatedByName}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>
        );
    }
};
