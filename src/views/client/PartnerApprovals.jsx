import { ref, onMounted, computed } from 'vue';
import api from '../../services/api.js';

export default {
    name: 'PartnerApprovals',
    setup() {
        const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

        const allPartners = ref([]);
        const loading = ref(false);
        const actionLoading = ref(null); // partnerId jo process ho raha hai
        const activeTab = ref('pending'); // pending | approved | all
        const rejectModal = ref({ show: false, partnerId: null, partnerName: '', reason: '' });
        const detailsModal = ref({ show: false, staff: null });
        const toast = ref({ show: false, msg: '', type: 'success' });

        const getToken = () => {
            return localStorage.getItem('token_client') ||
                localStorage.getItem('token_admin') ||
                localStorage.getItem('token_super_admin');
        };

        const showToast = (msg, type = 'success') => {
            toast.value = { show: true, msg, type };
            setTimeout(() => toast.value.show = false, 3000);
        };

        const fetchPartners = async () => {
            loading.value = true;
            try {
                const token = getToken();
                const endpoint = (activeTab.value === 'pending')
                    ? `${API_BASE_URL}/partners/pending`
                    : `${API_BASE_URL}/partners/all`;

                const res = await fetch(endpoint, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const data = await res.json();
                if (data.success) {
                    allPartners.value = data.data.partners || [];
                }
            } catch (e) {
                console.error('Failed to fetch partners:', e);
            } finally {
                loading.value = false;
            }
        };

        const approvePartner = async (partnerId, partnerName) => {
            if (!confirm(`Are you sure you want to approve ${partnerName}?`)) return;
            actionLoading.value = partnerId;
            try {
                const token = getToken();
                const res = await fetch(`${API_BASE_URL}/partners/${partnerId}/approve`, {
                    method: 'PATCH',
                    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
                });
                const data = await res.json();
                if (data.success) {
                    showToast(`✅ ${partnerName} approved successfully!`, 'success');
                    await fetchPartners();
                } else {
                    showToast(data.message || 'Failed to approve', 'error');
                }
            } catch (e) {
                showToast('Network error', 'error');
            } finally {
                actionLoading.value = null;
            }
        };

        const openRejectModal = (partnerId, partnerName) => {
            rejectModal.value = { show: true, partnerId, partnerName, reason: '' };
        };

        const submitReject = async () => {
            const { partnerId, partnerName, reason } = rejectModal.value;
            actionLoading.value = partnerId;
            rejectModal.value.show = false;
            try {
                const token = getToken();
                const res = await fetch(`${API_BASE_URL}/partners/${partnerId}/reject`, {
                    method: 'PATCH',
                    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ reason })
                });
                const data = await res.json();
                if (data.success) {
                    showToast(`❌ ${partnerName} rejected.`, 'warning');
                    await fetchPartners();
                } else {
                    showToast(data.message || 'Failed to reject', 'error');
                }
            } catch (e) {
                showToast('Network error', 'error');
            } finally {
                actionLoading.value = null;
            }
        };

        const displayPartners = computed(() => {
            if (activeTab.value === 'approved') {
                return allPartners.value.filter(p => p.verificationStatus === 'approved');
            }
            if (activeTab.value === 'pending') {
                return allPartners.value.filter(p => p.verificationStatus === 'pending');
            }
            return allPartners.value;
        });

        const pendingCount = computed(() => allPartners.value.filter(p => p.verificationStatus === 'pending').length);

        onMounted(() => fetchPartners());

        const statusBadge = (status) => {
            const map = {
                pending: { color: '#f59e0b', bg: '#fef3c7', label: '⏳ Pending' },
                approved: { color: '#10b981', bg: '#d1fae5', label: '✅ Approved' },
                rejected: { color: '#ef4444', bg: '#fee2e2', label: '❌ Rejected' }
            };
            const s = map[status] || map.pending;
            return (
                <span style={{
                    padding: '4px 12px', borderRadius: '999px',
                    fontSize: '12px', fontWeight: '600',
                    color: s.color, background: s.bg
                }}>
                    {s.label}
                </span>
            );
        };

        return () => (
            <div style={{ padding: '24px' }}>
                {/* Toast */}
                {toast.value.show && (
                    <div style={{
                        position: 'fixed', top: '20px', right: '20px', zIndex: 9999,
                        padding: '14px 20px', borderRadius: '12px', fontSize: '14px', fontWeight: '600',
                        background: toast.value.type === 'success' ? '#d1fae5' : toast.value.type === 'warning' ? '#fef3c7' : '#fee2e2',
                        color: toast.value.type === 'success' ? '#065f46' : toast.value.type === 'warning' ? '#92400e' : '#991b1b',
                        boxShadow: '0 10px 25px rgba(0,0,0,0.15)'
                    }}>
                        {toast.value.msg}
                    </div>
                )}

                {/* Header */}
                <div style={{ marginBottom: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                        <div>
                            <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#111827', margin: '0 0 4px' }}>
                                Staff
                            </h1>
                            <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>
                                Review and manage staff registration requests
                            </p>
                        </div>
                        {pendingCount.value > 0 && (
                            <div style={{
                                padding: '8px 18px', background: '#fef3c7', border: '1px solid #f59e0b',
                                borderRadius: '999px', fontSize: '14px', fontWeight: '600', color: '#b45309'
                            }}>
                                ⏳ {pendingCount.value} Pending
                            </div>
                        )}
                    </div>
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: '4px', background: '#f3f4f6', padding: '4px', borderRadius: '12px', marginBottom: '20px', width: 'fit-content' }}>
                    {[
                        { id: 'pending', label: '⏳ Pending' },
                        { id: 'approved', label: '✅ Approved' },
                        { id: 'all', label: '👥 All Staff' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => { activeTab.value = tab.id; fetchPartners(); }}
                            style={{
                                padding: '8px 20px', borderRadius: '8px', border: 'none',
                                fontSize: '14px', fontWeight: '500', cursor: 'pointer',
                                background: activeTab.value === tab.id ? 'white' : 'transparent',
                                color: activeTab.value === tab.id ? '#111827' : '#6b7280',
                                boxShadow: activeTab.value === tab.id ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                transition: 'all 0.2s'
                            }}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Partners List */}
                {loading.value ? (
                    <div style={{ textAlign: 'center', padding: '60px', color: '#9ca3af' }}>
                        <div class="spinner-border text-primary" />
                        <p style={{ marginTop: '12px', fontSize: '14px' }}>Loading staff...</p>
                    </div>
                ) : displayPartners.value.length === 0 ? (
                    <div style={{
                        textAlign: 'center', padding: '60px',
                        background: 'white', borderRadius: '16px', border: '1px solid #e5e7eb'
                    }}>
                        <div style={{ fontSize: '48px', marginBottom: '12px' }}>
                            {activeTab.value === 'pending' ? '🎉' : activeTab.value === 'approved' ? '✅' : '👥'}
                        </div>
                        <h3 style={{ color: '#374151', margin: '0 0 8px', fontWeight: '600' }}>
                            {activeTab.value === 'pending' ? 'No pending approvals!' : activeTab.value === 'approved' ? 'No approved staff found' : 'No staff found'}
                        </h3>
                        <p style={{ color: '#9ca3af', fontSize: '14px', margin: 0 }}>
                            {activeTab.value === 'pending' ? 'All registration requests have been handled.' : 'Staff will appear here once they are registered and managed.'}
                        </p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {displayPartners.value.map(partner => (
                            <div key={partner._id}
                                onClick={() => detailsModal.value = { show: true, staff: partner }}
                                style={{
                                    background: 'white', borderRadius: '14px',
                                    border: partner.verificationStatus === 'pending' ? '1px solid #fbbf24' : '1px solid #e5e7eb',
                                    padding: '20px 24px',
                                    display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                                }}
                                onMouseenter={e => e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1)'}
                                onMouseleave={e => e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.02)'}
                            >
                                {/* Avatar */}
                                <div style={{
                                    width: '48px', height: '48px', borderRadius: '12px',
                                    background: partner.profilePicture ? 'transparent' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: 'white', fontWeight: '700', fontSize: '18px', flexShrink: 0,
                                    overflow: 'hidden'
                                }}>
                                    {partner.profilePicture ? (
                                        <img
                                            src={partner.profilePicture}
                                            alt={partner.name}
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                            onError={(e) => {
                                                e.target.style.display = 'none';
                                                e.target.nextElementSibling.style.display = 'flex';
                                            }}
                                        />
                                    ) : null}
                                    <div style={{ display: partner.profilePicture ? 'none' : 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
                                        {(partner.name || 'P')[0].toUpperCase()}
                                    </div>
                                </div>

                                {/* Partner Info */}
                                <div style={{ flex: 1, minWidth: '200px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px', flexWrap: 'wrap' }}>
                                        <span style={{ fontWeight: '600', color: '#111827', fontSize: '15px' }}>{partner.name}</span>
                                        {statusBadge(partner.verificationStatus)}
                                    </div>
                                    <div style={{ color: '#6b7280', fontSize: '13px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                                        <span>📧 {partner.email}</span>
                                        {partner.designation && <span>🎖️ {partner.designation}</span>}
                                        {partner.location?.area && <span>📍 {partner.location.area}</span>}
                                        {partner.location?.state && <span>🗺️ {partner.location.state}</span>}
                                        {partner.clientId?.businessName && <span>🏢 {partner.clientId.businessName}</span>}
                                    </div>
                                    <div style={{ color: '#9ca3af', fontSize: '12px', marginTop: '4px' }}>
                                        Registered: {new Date(partner.createdAt).toLocaleString()}
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                {partner.verificationStatus === 'pending' && (
                                    <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); approvePartner(partner._id, partner.name); }}
                                            disabled={actionLoading.value === partner._id}
                                            style={{
                                                padding: '9px 20px', borderRadius: '8px', border: 'none',
                                                background: actionLoading.value === partner._id ? '#d1fae5' : '#10b981',
                                                color: 'white', fontWeight: '600', fontSize: '13px',
                                                cursor: actionLoading.value === partner._id ? 'not-allowed' : 'pointer',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            {actionLoading.value === partner._id ? '⏳' : '✅ Approve'}
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); openRejectModal(partner._id, partner.name); }}
                                            disabled={actionLoading.value === partner._id}
                                            style={{
                                                padding: '9px 20px', borderRadius: '8px', border: '1px solid #fca5a5',
                                                background: 'white', color: '#ef4444', fontWeight: '600', fontSize: '13px',
                                                cursor: 'pointer', transition: 'all 0.2s'
                                            }}
                                        >
                                            ❌ Reject
                                        </button>
                                    </div>
                                )}

                                {partner.verificationStatus === 'approved' && (
                                    <span style={{ color: '#10b981', fontSize: '13px', fontWeight: '500', flexShrink: 0 }}>
                                        ✅ Approved
                                    </span>
                                )}
                                {partner.verificationStatus === 'rejected' && (
                                    <span style={{ color: '#ef4444', fontSize: '13px', fontWeight: '500', flexShrink: 0 }}>
                                        ❌ Rejected
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* Reject Reason Modal */}
                {rejectModal.value.show && (
                    <div
                        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}
                        onClick={() => rejectModal.value.show = false}
                    >
                        <div
                            style={{ background: 'white', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '440px', boxShadow: '0 25px 50px rgba(0,0,0,0.2)' }}
                            onClick={e => e.stopPropagation()}
                        >
                            <h3 style={{ margin: '0 0 8px', fontWeight: '700', color: '#111827' }}>Reject Staff</h3>
                            <p style={{ color: '#6b7280', fontSize: '14px', margin: '0 0 20px' }}>
                                Rejecting staff member <strong>{rejectModal.value.partnerName}</strong>. Optionally provide a reason.
                            </p>
                            <textarea
                                rows={3}
                                placeholder="Optional reason for rejection..."
                                value={rejectModal.value.reason}
                                onInput={e => rejectModal.value.reason = e.target.value}
                                style={{
                                    width: '100%', padding: '12px 14px', borderRadius: '8px',
                                    border: '1px solid #d1d5db', fontSize: '14px', resize: 'vertical',
                                    outline: 'none', boxSizing: 'border-box'
                                }}
                            />
                            <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                                <button
                                    onClick={() => rejectModal.value.show = false}
                                    style={{
                                        flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #e5e7eb',
                                        background: 'white', color: '#6b7280', fontWeight: '500', cursor: 'pointer'
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={submitReject}
                                    style={{
                                        flex: 1, padding: '10px', borderRadius: '8px', border: 'none',
                                        background: '#ef4444', color: 'white', fontWeight: '600', cursor: 'pointer'
                                    }}
                                >
                                    Confirm Reject
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Staff Details Modal */}
                {detailsModal.value.show && detailsModal.value.staff && (
                    <div
                        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(6px)', padding: '20px' }}
                        onClick={() => detailsModal.value.show = false}
                    >
                        <div
                            style={{
                                background: 'white', borderRadius: '24px', width: '100%', maxWidth: '600px',
                                boxShadow: '0 30px 60px rgba(0,0,0,0.3)', overflow: 'hidden',
                                animation: 'modalSlideUp 0.3s ease-out'
                            }}
                            onClick={e => e.stopPropagation()}
                        >
                            <style>{`
                                @keyframes modalSlideUp {
                                    from { opacity: 0; transform: translateY(20px); }
                                    to { opacity: 1; transform: translateY(0); }
                                }
                                .detail-row {
                                    display: flex; border-bottom: 1px solid #f3f4f6; padding: 12px 0;
                                }
                                .detail-label {
                                    width: 140px; color: #6b7280; font-size: 13px; font-weight: 500;
                                }
                                .detail-value {
                                    flex: 1; color: #111827; font-size: 14px; font-weight: 600;
                                }
                            `}</style>

                            {/* Profile Header */}
                            <div style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', padding: '40px 32px', color: 'white', position: 'relative' }}>
                                <button
                                    onClick={() => detailsModal.value.show = false}
                                    style={{ position: 'absolute', top: '20px', right: '20px', background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                >
                                    ✕
                                </button>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                                    <div style={{
                                        width: '80px', height: '80px', borderRadius: '20px', background: 'white',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                                        boxShadow: '0 10px 20px rgba(0,0,0,0.2)'
                                    }}>
                                        {detailsModal.value.staff.profilePicture ? (
                                            <img src={detailsModal.value.staff.profilePicture} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                            <span style={{ color: '#6366f1', fontSize: '32px', fontWeight: '800' }}>
                                                {(detailsModal.value.staff.name || 'S')[0].toUpperCase()}
                                            </span>
                                        )}
                                    </div>
                                    <div>
                                        <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '700' }}>{detailsModal.value.staff.name}</h2>
                                        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                                            {statusBadge(detailsModal.value.staff.verificationStatus)}
                                            <span style={{ background: 'rgba(255,255,255,0.2)', padding: '4px 12px', borderRadius: '99px', fontSize: '11px' }}>
                                                ID: {detailsModal.value.staff._id.slice(-6).toUpperCase()}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Details Body */}
                            <div style={{ padding: '32px', maxHeight: '60vh', overflowY: 'auto' }}>
                                <h4 style={{ margin: '0 0 16px', color: '#374151', textTransform: 'uppercase', letterSpacing: '1px', fontSize: '12px' }}>Personal Information</h4>
                                <div class="detail-row"><div class="detail-label">Full Name</div><div class="detail-value">{detailsModal.value.staff.name}</div></div>
                                <div class="detail-row"><div class="detail-label">Email Address</div><div class="detail-value">{detailsModal.value.staff.email}</div></div>
                                <div class="detail-row"><div class="detail-label">Designation</div><div class="detail-value">{detailsModal.value.staff.designation || 'Not provided'}</div></div>

                                <h4 style={{ margin: '24px 0 16px', color: '#374151', textTransform: 'uppercase', letterSpacing: '1px', fontSize: '12px' }}>Location & Office</h4>
                                <div class="detail-row"><div class="detail-label">Area / Location</div><div class="detail-value">{detailsModal.value.staff.location?.area || '—'}</div></div>
                                <div class="detail-row"><div class="detail-label">State / Region</div><div class="detail-value">{detailsModal.value.staff.location?.state || '—'}</div></div>
                                <div class="detail-row"><div class="detail-label">Organization</div><div class="detail-value">{detailsModal.value.staff.clientId?.businessName || 'N/A'}</div></div>

                                <h4 style={{ margin: '24px 0 16px', color: '#374151', textTransform: 'uppercase', letterSpacing: '1px', fontSize: '12px' }}>Account Status</h4>
                                <div class="detail-row"><div class="detail-label">Joined On</div><div class="detail-value">{new Date(detailsModal.value.staff.createdAt).toLocaleString()}</div></div>
                                <div class="detail-row"><div class="detail-label">Status</div><div class="detail-value">{detailsModal.value.staff.verificationStatus.toUpperCase()}</div></div>
                            </div>

                            {/* Footer Actions */}
                            <div style={{ padding: '20px 32px', background: '#f9fafb', borderTop: '1px solid #f3f4f6', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                                <button
                                    onClick={() => detailsModal.value.show = false}
                                    style={{ padding: '10px 24px', borderRadius: '10px', border: '1px solid #e5e7eb', background: 'white', color: '#374151', fontWeight: '600', cursor: 'pointer' }}
                                >
                                    Close
                                </button>
                                {detailsModal.value.staff.verificationStatus === 'pending' && (
                                    <button
                                        onClick={() => { detailsModal.value.show = false; approvePartner(detailsModal.value.staff._id, detailsModal.value.staff.name); }}
                                        style={{ padding: '10px 24px', borderRadius: '10px', border: 'none', background: '#10b981', color: 'white', fontWeight: '600', cursor: 'pointer' }}
                                    >
                                        Approve Staff
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }
};
