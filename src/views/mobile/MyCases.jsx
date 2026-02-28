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
                case 'Reported': return { bg: '#e0f2fe', text: '#0284c7' }; // light blue
                case 'Under Review': return { bg: '#fef3c7', text: '#d97706' }; // light yellow/orange
                case 'Verified': return { bg: '#ede9fe', text: '#7c3aed' }; // light purple
                case 'Action Taken': return { bg: '#dbeafe', text: '#2563eb' }; // blue
                case 'Resolved': return { bg: '#dcfce7', text: '#16a34a' }; // green
                case 'Rejected': return { bg: '#fee2e2', text: '#dc2626' }; // red
                default: return { bg: '#f1f5f9', text: '#475569' }; // gray
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
            <div class="my-cases-container" style={{ padding: '0', background: '#f8fafc', display: 'flex', flexDirection: 'column', height: '100%' }}>
                <style>{`
                    .cases-summary-row {
                        display: flex;
                        gap: 0.75rem;
                        padding: 1.25rem;
                        background: white;
                        border-bottom: 1px solid #f1f5f9;
                        position: sticky;
                        top: 0;
                        z-index: 10;
                    }
                    .summary-box {
                        flex: 1;
                        padding: 1rem 0.5rem;
                        background: #f8fafc;
                        border-radius: 16px;
                        text-align: center;
                        border: 1px solid #f1f5f9;
                        cursor: pointer;
                        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        gap: 2px;
                    }
                    .summary-box.active {
                        background: white;
                        border-color: #4f46e5;
                        box-shadow: 0 10px 20px rgba(79, 70, 229, 0.1);
                        transform: translateY(-2px);
                    }
                    .summary-val {
                        font-size: 1.5rem;
                        font-weight: 900;
                        color: #1e293b;
                        line-height: 1;
                    }
                    .summary-box.active .summary-val { color: #4f46e5; }
                    .summary-label {
                        font-size: 0.7rem;
                        font-weight: 800;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                        color: #94a3b8;
                    }
                    .summary-box.active .summary-label { color: #4f46e5; }

                    .sub-tabs-container {
                        display: flex;
                        overflow-x: auto;
                        gap: 0.5rem;
                        padding: 0.75rem 1.25rem;
                        scrollbar-width: none;
                    }
                    .sub-tabs-container::-webkit-scrollbar { display: none; }
                    .sub-tab {
                        padding: 0.5rem 1rem;
                        border-radius: 10px;
                        font-size: 0.75rem;
                        font-weight: 700;
                        white-space: nowrap;
                        cursor: pointer;
                        background: white;
                        color: #64748b;
                        border: 1px solid #f1f5f9;
                        transition: all 0.2s;
                    }
                    .sub-tab.active {
                        background: #4f46e5;
                        color: white !important;
                        border-color: #4f46e5;
                        box-shadow: 0 4px 10px rgba(79, 70, 229, 0.2);
                    }

                    .case-card {
                        background: white;
                        border-radius: 20px;
                        padding: 1.25rem;
                        margin: 0 1.25rem 1rem;
                        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.03);
                        border: 1px solid #f1f5f9;
                        cursor: pointer;
                        transition: all 0.3s ease;
                        position: relative;
                        overflow: hidden;
                    }
                    .case-card:hover { transform: translateY(-3px); box-shadow: 0 12px 25px rgba(0, 0, 0, 0.06); border-color: #4f46e5; }
                    .status-dot { width: 6px; height: 6px; border-radius: 50%; display: inline-block; margin-right: 5px; }
                    .case-id { font-size: 0.65rem; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; }
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
                            <div style={{ width: '32px', height: '32px', border: '3px solid #f1f5f9', borderTopColor: '#4f46e5', borderRadius: '50%', animation: 'spin-cycle 1s linear infinite', margin: '0 auto 1rem' }}></div>
                            <p style={{ fontSize: '0.9rem', fontWeight: '600' }}>Syncing cases...</p>
                            <style>{`@keyframes spin-cycle { to { transform: rotate(360deg); } }`}</style>
                        </div>
                    ) : error.value ? (
                        <div style={{ margin: '2rem', padding: '1.5rem', background: '#fee2e2', color: '#dc2626', borderRadius: '16px', textAlign: 'center', border: '1px solid #fecaca' }}>
                            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⚠️</div>
                            <p style={{ fontWeight: '700' }}>{error.value}</p>
                            <button onClick={fetchCases} style={{ marginTop: '1rem', padding: '0.5rem 1rem', background: '#dc2626', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '700' }}>Retry</button>
                        </div>
                    ) : filteredCases.value.length === 0 ? (
                        <div style={{ margin: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '250px', backgroundColor: 'white', borderRadius: '24px', border: '2px dashed #e2e8f0' }}>
                            <div style={{ fontSize: '3.5rem', marginBottom: '1rem', filter: 'grayscale(1) opacity(0.5)' }}>🗃️</div>
                            <p style={{ color: '#475569', fontSize: '1rem', fontWeight: '800' }}>No {activeCategory.value} cases</p>
                            <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '0.25rem' }}>Everything looks clear here.</p>
                        </div>
                    ) : (
                        filteredCases.value.map((c, index) => {
                            const statusColor = getStatusColor(c.status || 'Reported');
                            const caseTypeName = getCaseTypeName(c.metadata?.type || 'General Issue');
                            const loc = c.metadata?.location || 'Location not specified';

                            return (
                                <div key={c._id} class="case-card" onClick={() => handleCaseClick(c._id)} style={{ animation: `slideUp 0.4s ease-out backwards ${index * 0.05}s` }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                        <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'center' }}>
                                            <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: `${statusColor.bg}50`, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${statusColor.bg}` }}>
                                                <DocumentTextIcon style={{ width: '22px', height: '22px', color: statusColor.text }} />
                                            </div>
                                            <div>
                                                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800', color: '#1e293b', letterSpacing: '-0.02em' }}>{caseTypeName}</h3>
                                                <div style={{ display: 'flex', alignItems: 'center', fontSize: '0.8rem', color: statusColor.text, fontWeight: '700', marginTop: '2px' }}>
                                                    <span class="status-dot" style={{ backgroundColor: statusColor.text }}></span>
                                                    {c.status || 'Reported'}
                                                </div>
                                            </div>
                                        </div>
                                        <div class="case-id">#{c._id.slice(-6)}</div>
                                    </div>

                                    <div style={{ background: '#f8fafc', borderRadius: '14px', padding: '0.85rem 1rem', marginBottom: '1rem', border: '1px solid #f1f5f9' }}>
                                        <p style={{ margin: 0, fontSize: '0.88rem', color: '#475569', lineHeight: '1.5', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                            {c.message || 'No details shared.'}
                                        </p>
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', gap: '0.8rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#94a3b8', fontSize: '0.75rem', fontWeight: '600' }}>
                                                <MapPinIcon style={{ width: '14px', height: '14px' }} />
                                                <span style={{ maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{loc}</span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#94a3b8', fontSize: '0.75rem', fontWeight: '600' }}>
                                                <ClockIcon style={{ width: '14px', height: '14px' }} />
                                                <span>{formatDate(c.createdAt)}</span>
                                            </div>
                                        </div>
                                        <div style={{ color: '#4f46e5', fontSize: '1.1rem' }}>›</div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                    <div style={{ height: '2rem' }}></div>
                </div>
            </div>
        );
    }
};
