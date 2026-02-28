import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import api from '../../services/api.js';
import { ArrowLeftIcon, CalendarIcon, EllipsisHorizontalCircleIcon, CheckBadgeIcon, ShieldCheckIcon, DocumentMagnifyingGlassIcon, WrenchScrewdriverIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/vue/24/outline';

export default {
    name: 'CaseDetail',
    setup() {
        const route = useRoute();
        const router = useRouter();
        const caseId = route.params.id;
        const caseData = ref(null);
        const loading = ref(true);
        const error = ref('');

        const caseFlow = [
            { id: 'Reported', label: 'Reported', icon: EllipsisHorizontalCircleIcon },
            { id: 'Under Review', label: 'Under Review', icon: DocumentMagnifyingGlassIcon },
            { id: 'Verified', label: 'Verified', icon: ShieldCheckIcon },
            { id: 'Action Taken', label: 'Action Taken', icon: WrenchScrewdriverIcon },
            { id: 'Resolved', label: 'Resolved', icon: CheckCircleIcon }
        ];

        const fetchCaseDetail = async () => {
            loading.value = true;
            try {
                // If it's a partner route or user route, api method changes
                const isPartner = route.path.includes('/partner');
                let response;
                if (isPartner) {
                    response = await api.getPartnerCaseById(caseId);
                } else {
                    response = await api.getUserCaseById(caseId);
                }

                if (response.success) {
                    caseData.value = response.data.alert;
                } else {
                    error.value = 'Failed to load case details';
                }
            } catch (err) {
                console.error(err);
                error.value = 'Error fetching case';
            } finally {
                loading.value = false;
            }
        };

        onMounted(() => {
            fetchCaseDetail();
        });

        const goBack = () => {
            router.back();
        };

        const formatDate = (dateString, includeTime = true) => {
            const options = { year: 'numeric', month: 'short', day: 'numeric' };
            if (includeTime) {
                options.hour = '2-digit';
                options.minute = '2-digit';
            }
            return new Date(dateString).toLocaleDateString(undefined, options);
        };

        const getStatusColor = (status) => {
            switch (status) {
                case 'Reported': return { bg: '#e0f2fe', text: '#0284c7' };
                case 'Under Review': return { bg: '#fef3c7', text: '#d97706' };
                case 'Verified': return { bg: '#ede9fe', text: '#7c3aed' };
                case 'Action Taken': return { bg: '#dbeafe', text: '#2563eb' };
                case 'Resolved': return { bg: '#dcfce7', text: '#16a34a' };
                case 'Rejected': return { bg: '#fee2e2', text: '#dc2626' };
                default: return { bg: '#f1f5f9', text: '#475569' };
            }
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

        // Determine which steps are completed/active
        const getTimelineStatus = (stepId, currentStatus, isRejected) => {
            if (isRejected) {
                if (stepId === 'Rejected') return 'active';
                const mainFlowIndex = caseFlow.findIndex(s => s.id === stepId);
                return mainFlowIndex === 0 ? 'completed' : 'inactive'; // Usually at least reported
            }

            if (currentStatus === 'Rejected') {
                return stepId === 'Reported' ? 'completed' : 'inactive';
            }

            const stepIndex = caseFlow.findIndex(s => s.id === stepId);
            const currentIndex = caseFlow.findIndex(s => s.id === currentStatus);

            if (stepIndex < currentIndex) return 'completed';
            if (stepIndex === currentIndex) return 'active';
            return 'inactive';
        };

        // Get specific timeline log entry for a status
        const getTimelineLogNote = (status) => {
            if (!caseData.value || !caseData.value.timeline) return null;
            // Sort by timestamp descending and find the latest note for this status
            const logs = [...caseData.value.timeline].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            const log = logs.find(l => l.status === status);
            return log ? { note: log.note, time: formatDate(log.timestamp, true) } : null;
        };

        return () => {
            if (loading.value) {
                return (
                    <div style={{ padding: '2rem', display: 'flex', justifyContent: 'center', background: '#f8fafc', minHeight: '100vh' }}>
                        <div style={{ color: '#64748b' }}>Loading case details...</div>
                    </div>
                );
            }

            if (error.value || !caseData.value) {
                return (
                    <div style={{ padding: '2rem', textAlign: 'center', background: '#f8fafc', minHeight: '100vh' }}>
                        <div style={{ color: '#dc2626', marginBottom: '1rem' }}>{error.value || 'Case not found'}</div>
                        <button onClick={goBack} style={{ padding: '0.5rem 1rem', background: '#e2e8f0', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Go Back</button>
                    </div>
                );
            }

            const currentStatus = caseData.value.status || 'Reported';
            const isRejected = currentStatus === 'Rejected';
            const statusColor = getStatusColor(currentStatus);
            const caseType = getCaseTypeName(caseData.value.metadata?.type);

            // Flow to display (if rejected, we show a rejected step at the end)
            let displayFlow = [...caseFlow];
            if (isRejected) {
                displayFlow = [
                    { id: 'Reported', label: 'Reported', icon: EllipsisHorizontalCircleIcon },
                    { id: 'Rejected', label: 'Rejected', icon: XCircleIcon }
                ];
            }

            return (
                <div class="case-detail-container" style={{ minHeight: '100vh', background: '#f8fafc', paddingBottom: '2rem' }}>
                    <style>{`
                        .detail-card {
                            background: white;
                            border-radius: 20px;
                            padding: 1.5rem;
                            margin-bottom: 1.25rem;
                            box-shadow: 0 4px 15px rgba(0,0,0,0.05);
                            border: 1px solid #f1f5f9;
                        }
                        .timeline-container {
                            position: relative;
                            padding-left: 2.5rem;
                            margin-top: 1.5rem;
                        }
                        .timeline-item {
                            position: relative;
                            padding-bottom: 2.5rem;
                        }
                        .timeline-item:last-child {
                            padding-bottom: 0;
                        }
                        .timeline-line {
                            position: absolute;
                            left: -1.25rem;
                            top: 2rem;
                            bottom: 0;
                            width: 3px;
                            background-color: #e2e8f0;
                            border-radius: 4px;
                        }
                        .timeline-item.completed .timeline-line {
                            background: linear-gradient(180deg, #10b981 0%, #10b981 100%);
                        }
                        .timeline-item:last-child .timeline-line {
                            display: none;
                        }
                        .timeline-icon-wrap {
                            position: absolute;
                            left: -2.25rem;
                            top: 0;
                            width: 2.25rem;
                            height: 2.25rem;
                            border-radius: 10px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            background: white;
                            border: 2px solid #e2e8f0;
                            z-index: 2;
                            transition: all 0.3s ease;
                        }
                        .timeline-item.completed .timeline-icon-wrap {
                            border-color: #10b981;
                            background: #10b981;
                            color: white;
                            box-shadow: 0 0 10px rgba(16, 185, 129, 0.3);
                        }
                        .timeline-item.active .timeline-icon-wrap {
                            border-color: #4f46e5;
                            background: #eff6ff;
                            color: #4f46e5;
                            box-shadow: 0 0 0 4px #e0e7ff;
                        }
                        .timeline-item.active.rejected .timeline-icon-wrap {
                            border-color: #ef4444;
                            background: #fef2f2;
                            color: #ef4444;
                            box-shadow: 0 0 0 4px #fee2e2;
                        }
                        .timeline-item.inactive .timeline-icon-wrap {
                            color: #94a3b8;
                            background: #f8fafc;
                        }
                    `}</style>

                    {/* Header */}
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
                            Case Detail
                        </h1>
                    </div>

                    <div style={{ padding: '1rem' }}>

                        {/* Top Section */}
                        <div style={{
                            background: `linear-gradient(135deg, ${statusColor.text}10 0%, #ffffff 100%)`,
                            borderRadius: '20px',
                            padding: '1.75rem',
                            marginBottom: '1.25rem',
                            boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
                            border: `1px solid ${statusColor.text}15`,
                            position: 'relative',
                            overflow: 'hidden'
                        }}>
                            <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', background: `${statusColor.text}10`, borderRadius: '50%' }}></div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem', position: 'relative', zIndex: 2 }}>
                                <div>
                                    <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.4rem', fontWeight: '800', color: '#1e293b', letterSpacing: '-0.02em' }}>
                                        {caseType}
                                    </h2>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b', fontSize: '0.9rem', fontWeight: '500' }}>
                                        <CalendarIcon style={{ width: '18px', height: '18px' }} />
                                        <span>Reported on {formatDate(caseData.value.createdAt)}</span>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                                    <span style={{
                                        background: statusColor.text,
                                        color: 'white',
                                        padding: '0.4rem 1rem',
                                        borderRadius: '999px',
                                        fontWeight: '700',
                                        fontSize: '0.8rem',
                                        boxShadow: `0 4px 10px ${statusColor.text}40`
                                    }}>
                                        {currentStatus}
                                    </span>
                                    <p style={{ margin: '0', fontSize: '0.75rem', fontWeight: '700', color: '#94a3b8' }}>ID: {caseId.slice(-8).toUpperCase()}</p>
                                </div>
                            </div>
                        </div>

                        {/* Middle Section (Description) */}
                        <div class="detail-card">
                            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.15rem', fontWeight: '800', color: '#1e293b' }}>Description</h3>
                            <div style={{ background: '#f8fafc', borderRadius: '14px', padding: '1.25rem', border: '1px solid #f1f5f9' }}>
                                <p style={{ margin: 0, fontSize: '1rem', color: '#475569', lineHeight: '1.7', whiteSpace: 'pre-wrap', fontWeight: '500' }}>
                                    {caseData.value.message || 'No description provided.'}
                                </p>
                            </div>
                        </div>

                        {/* Bottom Section (Progress Timeline) */}
                        <div class="detail-card">
                            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.15rem', fontWeight: '800', color: '#1e293b' }}>Status Progress</h3>

                            <div class="timeline-container">
                                {displayFlow.map((step, index) => {
                                    const tStatus = getTimelineStatus(step.id, currentStatus, isRejected);
                                    const logData = getTimelineLogNote(step.id);

                                    return (
                                        <div key={index} class={`timeline-item ${tStatus} ${step.id === 'Rejected' ? 'rejected' : ''}`}>
                                            <div class="timeline-line"></div>
                                            <div class="timeline-icon-wrap">
                                                {tStatus === 'completed' && step.id !== 'Rejected' ? (
                                                    <CheckBadgeIcon style={{ width: '1.2rem', height: '1.2rem' }} />
                                                ) : (
                                                    <step.icon style={{ width: '1.2rem', height: '1.2rem' }} />
                                                )}
                                            </div>

                                            <div style={{ paddingLeft: '0.5rem' }}>
                                                <h4 style={{
                                                    margin: '0 0 0.25rem 0',
                                                    fontSize: '1rem',
                                                    fontWeight: '600',
                                                    color: tStatus === 'inactive' ? '#94a3b8' : (step.id === 'Rejected' ? '#ef4444' : '#1e293b')
                                                }}>
                                                    {step.label}
                                                </h4>
                                                {logData && tStatus !== 'inactive' && (
                                                    <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                                                        <p style={{ margin: '0 0 0.25rem 0' }}>{logData.note}</p>
                                                        <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>{logData.time}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                    </div>
                </div>
            );
        };
    }
};
