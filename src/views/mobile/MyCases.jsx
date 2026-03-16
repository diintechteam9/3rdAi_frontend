import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import api from '../../services/api.js';
import { MapPinIcon, ClockIcon, ChevronRightIcon, DocumentTextIcon } from '@heroicons/vue/24/outline';

export default {
    name: 'MyCases',
    setup() {
        const router = useRouter();
        const cases = ref([]);
        const caseTypes = ref([]);
        const loading = ref(true);
        const error = ref('');

        const activeCategory = ref('open'); // 'open' or 'closed'
        const activeSubFilter = ref('Reported');

        const fetchCases = async () => {
            loading.value = true;
            try {
                // Fetch cases and types in parallel
                const [casesRes, typesRes] = await Promise.all([
                    api.getUserCases(),
                    api.getMobileCaseTypes()
                ]);

                if (casesRes.success) {
                    cases.value = casesRes.data.alerts;
                } else {
                    error.value = casesRes.message || 'Failed to fetch cases';
                }

                if (typesRes?.data) {
                    caseTypes.value = typesRes.data;
                }
            } catch (err) {
                console.error(err);
                error.value = 'Error loading dashboard. Please try again.';
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
                case 'Reported': return { bg: '#e0f2fe', text: '#0369a1' }; // light blue
                case 'Under Review': return { bg: '#fef3c7', text: '#b45309' }; // light yellow/orange
                case 'Verified': return { bg: '#ede9fe', text: '#6d28d9' }; // light purple
                case 'Action Taken': return { bg: '#dbeafe', text: '#1d4ed8' }; // blue
                case 'Resolved': return { bg: '#dcfce7', text: '#15803d' }; // green
                case 'Rejected': return { bg: '#fee2e2', text: '#b91c1c' }; // red
                default: return { bg: '#f1f5f9', text: '#475569' }; // gray
            }
        };

        const formatDate = (dateString) => {
            const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
            return new Date(dateString).toLocaleDateString(undefined, options);
        };

        const getCaseTypeName = (typeId) => {
            const ct = caseTypes.value.find(t => t.id === typeId);
            return ct?.name || typeId || 'General Issue';
        };

        const getSubCategoryInfo = (caseObj) => {
            const ct = caseTypes.value.find(t => t.id === (caseObj.metadata?.type || ''));
            if (!ct) return null;

            // Find the sub-category value from metadata
            const selectField = ct.fields?.find(f => f.type === 'select');
            if (!selectField) return null;

            const subVal = caseObj.metadata[selectField.name];
            if (!subVal) return null;

            const option = selectField.options?.find(o => o.value === subVal);
            return option; // Contains label and icon
        };

        const resolveIcon = (iconSource) => {
            if (!iconSource) return null;
            if (iconSource.startsWith('http') || iconSource.startsWith('data:') || iconSource.startsWith('/')) {
                return <img src={iconSource} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />;
            }
            // Add emoji/char support if needed, but primary is URL
            if (iconSource.length <= 4) return <span style={{ fontSize: '18px' }}>{iconSource}</span>;
            return null;
        };

        const handleCaseClick = (caseId) => {
            router.push(`/mobile/user/case/${caseId}`);
        };

        return () => (
            <>
                <style>{`
                    .cases-summary-row {
                        display: flex;
                        gap: 1rem;
                        padding: 0.75rem 0;
                        background: #f8fafc;
                        border-bottom: 1px solid #e2e8f0;
                        position: sticky;
                        top: 60px;
                        z-index: 15;
                        justify-content: flex-start;
                    }
                    .summary-box {
                        width: 130px;
                        padding: 0.8rem 0.6rem;
                        background: white;
                        border-radius: 12px;
                        text-align: center;
                        border: 1px solid #e2e8f0;
                        cursor: pointer;
                        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                        display: flex;
                        flex-direction: row;
                        align-items: center;
                        justify-content: center;
                        gap: 8px;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.02);
                    }
                    .summary-box.active {
                        background: #eff6ff;
                        border-color: #3b82f6;
                        box-shadow: 0 4px 15px rgba(59, 130, 246, 0.1);
                        transform: translateY(-1px);
                    }
                    .summary-val {
                        font-size: 1.1rem;
                        font-weight: 900;
                        color: #0f172a;
                        line-height: 1;
                    }
                    .summary-box.active .summary-val { color: #2563eb; }
                    .summary-label {
                        font-size: 0.6rem;
                        font-weight: 800;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                        color: #64748b;
                    }
                    .summary-box.active .summary-label { color: #2563eb; }

                    .sub-tabs-container {
                        display: flex;
                        overflow-x: auto;
                        gap: 0.4rem;
                        padding: 0.6rem 0;
                        background: #f8fafc;
                        scrollbar-width: none;
                        position: sticky;
                        top: 120px;
                        z-index: 14;
                        border-bottom: 1px solid #e2e8f0;
                    }
                    .sub-tabs-container::-webkit-scrollbar { display: none; }
                    .sub-tab {
                        padding: 0.35rem 0.7rem;
                        border-radius: 8px;
                        font-size: 0.65rem;
                        font-weight: 700;
                        white-space: nowrap;
                        cursor: pointer;
                        background: white;
                        color: #64748b;
                        border: 1px solid #e2e8f0;
                        transition: all 0.2s;
                    }
                    .sub-tab.active {
                        background: #3b82f6;
                        color: white !important;
                        border-color: #3b82f6;
                        box-shadow: 0 4px 10px rgba(59, 130, 246, 0.3);
                    }

                    .case-card {
                        background: white;
                        border-radius: 16px;
                        padding: 0.75rem;
                        margin-bottom: 0.6rem;
                        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.04);
                        border: 1px solid #e2e8f0;
                        cursor: pointer;
                        transition: all 0.3s ease;
                        position: relative;
                        overflow: hidden;
                    }
                    .case-card:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08); border-color: #3b82f6; }
                    .status-dot { width: 5px; height: 5px; border-radius: 50%; display: inline-block; margin-right: 5px; }
                    .case-id { font-size: 0.6rem; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
                `}</style>

                {/* Summary Boxes */}
                <div class="cases-summary-row">
                    <div
                        class={['summary-box', activeCategory.value === 'open' ? 'active' : ''].join(' ')}
                        onClick={() => activeCategory.value = 'open'}
                    >
                        <div style={{ fontSize: '0.9rem' }}>🕒</div>
                        <div class="summary-val" style={{ fontSize: '0.9rem' }}>{counts.value.open}</div>
                        <div class="summary-label" style={{ fontSize: '0.55rem' }}>Open</div>
                    </div>
                    <div
                        class={['summary-box', activeCategory.value === 'closed' ? 'active' : ''].join(' ')}
                        onClick={() => activeCategory.value = 'closed'}
                    >
                        <div style={{ fontSize: '0.9rem' }}>✅</div>
                        <div class="summary-val" style={{ fontSize: '0.9rem' }}>{counts.value.closed}</div>
                        <div class="summary-label" style={{ fontSize: '0.55rem' }}>Closed</div>
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
                                                <h3 style={{ margin: 0, fontSize: '0.85rem', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.02em' }}>
                                                    {caseTypeName}
                                                    {getSubCategoryInfo(c) && (
                                                        <span style={{ color: '#64748b', fontWeight: '600' }}> · {getSubCategoryInfo(c).label}</span>
                                                    )}
                                                </h3>
                                                <div style={{ display: 'flex', alignItems: 'center', fontSize: '0.75rem', color: statusColor.text, fontWeight: '700', marginTop: '1px' }}>
                                                    <span class="status-dot" style={{ backgroundColor: statusColor.text }}></span>
                                                    {c.status || 'Reported'}
                                                </div>
                                            </div>
                                        </div>
                                        {getSubCategoryInfo(c)?.icon && (
                                            <div style={{ width: '32px', height: '32px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                {resolveIcon(getSubCategoryInfo(c).icon)}
                                            </div>
                                        )}
                                        <div class="case-id">#{c._id.slice(-4)}</div>
                                    </div>

                                    <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '0.75rem', marginBottom: '0.75rem', border: '1px solid #e2e8f0' }}>
                                        <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8', lineHeight: '1.4', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
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
