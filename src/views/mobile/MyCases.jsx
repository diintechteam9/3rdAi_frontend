import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import api from '../../services/api.js';
import { MapPinIcon, ClockIcon, ChevronRightIcon, DocumentTextIcon } from '@heroicons/vue/24/outline';

export default {
    name: 'MyCases',
    setup() {
        const router = useRouter();
        const cases = ref([]);
        const loading = ref(true);
        const error = ref('');

        const activeCategory = ref('open'); // 'open' or 'closed'
        const activeSubFilter = ref('Reported');

        const fetchCases = async () => {
            loading.value = true;
            try {
                const response = await api.getUserCases();
                if (response.success) {
                    cases.value = response.data.alerts;
                } else {
                    error.value = response.message || 'Failed to fetch cases';
                }
            } catch (err) {
                console.error(err);
                error.value = 'Error loading cases. Please try again.';
            } finally {
                loading.value = false;
            }
        };

        onMounted(() => {
            fetchCases();
        });

        const openStatuses = ['Reported', 'Under Review', 'Verified', 'Action Taken'];
        const closedStatuses = ['Resolved', 'Rejected'];

        const counts = computed(() => {
            const open = cases.value.filter(c => openStatuses.includes(c.status || 'Reported')).length;
            const closed = cases.value.filter(c => closedStatuses.includes(c.status)).length;
            return { open, closed };
        });

        const filteredCases = computed(() => {
            let list = cases.value;
            if (activeCategory.value === 'open') {
                list = list.filter(c => openStatuses.includes(c.status || 'Reported'));
                list = list.filter(c => (c.status || 'Reported') === activeSubFilter.value);
            } else {
                list = list.filter(c => closedStatuses.includes(c.status));
            }
            return list;
        });

        const getStatusColor = (status) => {
            switch (status) {
                case 'Reported': return { bg: '#e0f2fe20', text: '#38bdf8' }; // light blue
                case 'Under Review': return { bg: '#fef3c720', text: '#fbbf24' }; // light yellow/orange
                case 'Verified': return { bg: '#ede9fe20', text: '#a78bfa' }; // light purple
                case 'Action Taken': return { bg: '#dbeafe20', text: '#60a5fa' }; // blue
                case 'Resolved': return { bg: '#dcfce720', text: '#4ade80' }; // green
                case 'Rejected': return { bg: '#fee2e220', text: '#f87171' }; // red
                default: return { bg: '#f1f5f920', text: '#94a3b8' }; // gray
            }
        };

        const formatDate = (dateString) => {
            const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
            return new Date(dateString).toLocaleDateString(undefined, options);
        };

        const getCaseTypeName = (typeId) => {
            const types = {
                'robbery': 'Robbery',
                'unidentified_emergency': 'Emergency / Unknown Incident',
                'snatching': 'Snatching',
                'theft': 'Theft',
                'harassment': 'Harassment / Suspicious Activity',
                'accident': 'Accident',
                'camera_issue': 'Camera / Safety Issue'
            };
            return types[typeId] || typeId || 'General Issue';
        };

        const handleCaseClick = (caseId) => {
            router.push(`/mobile/user/case/${caseId}`);
        };

        return () => (
            <>
                <style>{`
                    .cases-summary-row {
                        display: flex;
                        gap: 0.75rem;
                        padding: 1rem;
                        background: transparent;
                        border-bottom: 1px solid rgba(255,255,255,0.05);
                        z-index: 10;
                    }
                    .summary-box {
                        flex: 1;
                        padding: 0.75rem 0.5rem;
                        background: rgba(255,255,255,0.03);
                        border-radius: 16px;
                        text-align: center;
                        border: 1px solid rgba(255,255,255,0.05);
                        cursor: pointer;
                        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        gap: 2px;
                    }
                    .summary-box.active {
                        background: rgba(99, 102, 241, 0.1);
                        border-color: #6366f1;
                        box-shadow: 0 4px 15px rgba(99, 102, 241, 0.2);
                        transform: translateY(-1px);
                    }
                    .summary-val {
                        font-size: 1.25rem;
                        font-weight: 900;
                        color: white;
                        line-height: 1;
                    }
                    .summary-box.active .summary-val { color: #818cf8; }
                    .summary-label {
                        font-size: 0.65rem;
                        font-weight: 800;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                        color: #94a3b8;
                    }
                    .summary-box.active .summary-label { color: #818cf8; }

                    .sub-tabs-container {
                        display: flex;
                        overflow-x: auto;
                        gap: 0.5rem;
                        padding: 0.5rem 1rem;
                        scrollbar-width: none;
                    }
                    .sub-tabs-container::-webkit-scrollbar { display: none; }
                    .sub-tab {
                        padding: 0.4rem 0.8rem;
                        border-radius: 10px;
                        font-size: 0.7rem;
                        font-weight: 700;
                        white-space: nowrap;
                        cursor: pointer;
                        background: rgba(255,255,255,0.03);
                        color: #94a3b8;
                        border: 1px solid rgba(255,255,255,0.05);
                        transition: all 0.2s;
                    }
                    .sub-tab.active {
                        background: #6366f1;
                        color: white !important;
                        border-color: #6366f1;
                        box-shadow: 0 4px 10px rgba(99, 102, 241, 0.3);
                    }

                    .case-card {
                        background: rgba(255,255,255,0.02);
                        border-radius: 20px;
                        padding: 1rem;
                        margin: 0 1rem 0.75rem;
                        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
                        border: 1px solid rgba(255,255,255,0.04);
                        cursor: pointer;
                        transition: all 0.3s ease;
                        position: relative;
                        overflow: hidden;
                    }
                    .case-card:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2); border-color: rgba(99, 102, 241, 0.4); }
                    .status-dot { width: 5px; height: 5px; border-radius: 50%; display: inline-block; margin-right: 5px; }
                    .case-id { font-size: 0.6rem; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
                `}</style>

                {/* Summary Boxes */}
                <div class="cases-summary-row">
                    <div
                        class={['summary-box', activeCategory.value === 'open' ? 'active' : ''].join(' ')}
                        onClick={() => activeCategory.value = 'open'}
                    >
                        <div style={{ fontSize: '1.2rem', marginBottom: '2px' }}>🕒</div>
                        <div class="summary-val">{counts.value.open}</div>
                        <div class="summary-label">Open Cases</div>
                    </div>
                    <div
                        class={['summary-box', activeCategory.value === 'closed' ? 'active' : ''].join(' ')}
                        onClick={() => activeCategory.value = 'closed'}
                    >
                        <div style={{ fontSize: '1.2rem', marginBottom: '2px' }}>✅</div>
                        <div class="summary-val">{counts.value.closed}</div>
                        <div class="summary-label">Closed Cases</div>
                    </div>
                </div>

                {/* Sub-Filters for Open */}
                {activeCategory.value === 'open' && (
                    <div class="sub-tabs-container">
                        {openStatuses.map(st => (
                            <button
                                key={st}
                                class={['sub-tab', activeSubFilter.value === st ? 'active' : ''].join(' ')}
                                onClick={() => activeSubFilter.value = st}
                            >
                                {st}
                            </button>
                        ))}
                    </div>
                )}

                <div style={{ flex: 1, overflowY: 'auto', paddingTop: activeCategory.value === 'closed' ? '1rem' : '0' }}>
                    {loading.value ? (
                        <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
                            <div style={{ width: '32px', height: '32px', border: '3px solid rgba(255,255,255,0.05)', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin-cycle 1s linear infinite', margin: '0 auto 1rem' }}></div>
                            <p style={{ fontSize: '0.9rem', fontWeight: '600' }}>Syncing cases...</p>
                            <style>{`@keyframes spin-cycle { to { transform: rotate(360deg); } }`}</style>
                        </div>
                    ) : error.value ? (
                        <div style={{ margin: '2rem', padding: '1.5rem', background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', borderRadius: '16px', textAlign: 'center', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⚠️</div>
                            <p style={{ fontWeight: '700' }}>{error.value}</p>
                            <button onClick={fetchCases} style={{ marginTop: '1rem', padding: '0.5rem 1rem', background: '#e11d48', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '700' }}>Retry</button>
                        </div>
                    ) : filteredCases.value.length === 0 ? (
                        <div style={{ margin: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '220px', backgroundColor: 'rgba(255,255,255,0.01)', borderRadius: '24px', border: '2px dashed rgba(255,255,255,0.05)' }}>
                            <div style={{ fontSize: '3rem', marginBottom: '1rem', filter: 'grayscale(1) opacity(0.3)' }}>🗃️</div>
                            <p style={{ color: '#94a3b8', fontSize: '0.9rem', fontWeight: '800' }}>No {activeCategory.value} cases</p>
                            <p style={{ color: '#475569', fontSize: '0.75rem', marginTop: '0.25rem' }}>Everything looks clear here.</p>
                        </div>
                    ) : (
                        filteredCases.value.map((c, index) => {
                            const statusColor = getStatusColor(c.status || 'Reported');
                            const caseTypeName = getCaseTypeName(c.metadata?.type || 'General Issue');
                            const loc = c.metadata?.location || 'Location not specified';

                            return (
                                <div key={c._id} class="case-card" onClick={() => handleCaseClick(c._id)} style={{ animation: `slideUp 0.4s ease-out backwards ${index * 0.05}s` }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                                        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: `${statusColor.bg}`, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid rgba(255,255,255,0.05)` }}>
                                                <DocumentTextIcon style={{ width: '18px', height: '18px', color: statusColor.text }} />
                                            </div>
                                            <div>
                                                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '800', color: 'white', letterSpacing: '-0.02em' }}>{caseTypeName}</h3>
                                                <div style={{ display: 'flex', alignItems: 'center', fontSize: '0.75rem', color: statusColor.text, fontWeight: '700', marginTop: '1px' }}>
                                                    <span class="status-dot" style={{ backgroundColor: statusColor.text }}></span>
                                                    {c.status || 'Reported'}
                                                </div>
                                            </div>
                                        </div>
                                        <div class="case-id">#{c._id.slice(-4)}</div>
                                    </div>

                                    <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '12px', padding: '0.75rem', marginBottom: '0.75rem', border: '1px solid rgba(255,255,255,0.03)' }}>
                                        <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8', lineHeight: '1.4', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                            {c.message || 'No details shared.'}
                                        </p>
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', gap: '0.6rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#64748b', fontSize: '0.7rem', fontWeight: '600' }}>
                                                <MapPinIcon style={{ width: '12px', height: '12px' }} />
                                                <span style={{ maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{loc}</span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#64748b', fontSize: '0.7rem', fontWeight: '600' }}>
                                                <ClockIcon style={{ width: '12px', height: '12px' }} />
                                                <span>{formatDate(c.createdAt)}</span>
                                            </div>
                                        </div>
                                        <div style={{ color: '#6366f1', fontSize: '1rem' }}>›</div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                    <div style={{ height: '2rem' }}></div>
                </div>
            </>
        );
    }
};
