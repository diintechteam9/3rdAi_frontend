import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';

export default {
    name: 'PartnerWaitingApproval',
    setup() {
        const router = useRouter();
        const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

        const email = ref(localStorage.getItem('partner_pending_email') || '');
        const status = ref('pending'); // pending | approved | rejected
        const blockedReason = ref('');
        const partnerName = ref('');
        const checking = ref(false);
        const lastChecked = ref(null);
        const approvedRedirecting = ref(false);
        let pollTimer = null;

        const clearPendingData = () => {
            localStorage.removeItem('partner_pending_email');
            localStorage.removeItem('partner_token');
            localStorage.removeItem('partner_data');
        };

        const checkStatus = async () => {
            if (!email.value || approvedRedirecting.value) return;
            checking.value = true;
            try {
                const res = await fetch(
                    `${API_BASE_URL}/partners/approval-status?email=${encodeURIComponent(email.value)}`
                );
                const data = await res.json();

                if (data.success) {
                    status.value = data.data.verificationStatus;
                    blockedReason.value = data.data.blockedReason || '';
                    partnerName.value = data.data.name || '';
                    lastChecked.value = new Date().toLocaleTimeString();

                    // ✅ APPROVED → auto-redirect to login
                    if (data.data.verificationStatus === 'approved') {
                        clearInterval(pollTimer);
                        approvedRedirecting.value = true;
                        // Wait briefly for animation, then redirect to login
                        setTimeout(() => {
                            clearPendingData();
                            router.push('/partner/login');
                        }, 2500);
                    }

                    // ❌ REJECTED → stop polling
                    if (data.data.verificationStatus === 'rejected') {
                        clearInterval(pollTimer);
                    }
                }
            } catch (e) {
                console.error('Status check error:', e);
            } finally {
                checking.value = false;
            }
        };

        // Re-register — clear localStorage and redirect to registration
        const goToReRegister = () => {
            clearPendingData();
            router.push('/partner/register');
        };

        onMounted(() => {
            if (!email.value) {
                router.push('/partner/login');
                return;
            }
            // Check immediately
            checkStatus();
            // Auto-check every 30 seconds (only in pending state)
            pollTimer = setInterval(() => {
                if (status.value === 'pending') {
                    checkStatus();
                } else {
                    clearInterval(pollTimer);
                }
            }, 30000);
        });

        onUnmounted(() => {
            clearInterval(pollTimer);
        });

        const handleBackToLogin = () => {
            clearPendingData();
            router.push('/partner/login');
        };

        return () => (
            <div style={{
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '24px',
                fontFamily: "'Inter', 'Segoe UI', sans-serif"
            }}>
                <div style={{ width: '100%', maxWidth: '480px' }}>

                    {/* Card */}
                    <div style={{
                        background: 'rgba(255,255,255,0.05)',
                        backdropFilter: 'blur(20px)',
                        borderRadius: '24px',
                        border: '1px solid rgba(255,255,255,0.1)',
                        padding: '48px 40px',
                        textAlign: 'center',
                        boxShadow: '0 25px 50px rgba(0,0,0,0.4)'
                    }}>

                        {/* Logo */}
                        <div style={{ marginBottom: '32px' }}>
                            <img src="/logo.png" alt="3rdAI" style={{
                                width: '64px', height: '64px', borderRadius: '16px', objectFit: 'contain'
                            }} />
                        </div>

                        {/* ============ PENDING STATE ============ */}
                        {status.value === 'pending' && (
                            <>
                                {/* Animated Clock */}
                                <div style={{
                                    width: '96px', height: '96px', margin: '0 auto 28px',
                                    background: 'rgba(251, 191, 36, 0.12)',
                                    borderRadius: '50%',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    border: '2px solid rgba(251, 191, 36, 0.4)',
                                    animation: 'pulse 2s infinite'
                                }}>
                                    <svg width="44" height="44" fill="none" stroke="#fbbf24" strokeWidth="2"
                                        strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                        <circle cx="12" cy="12" r="10" />
                                        <polyline points="12 6 12 12 16 14" />
                                    </svg>
                                </div>

                                <h1 style={{ fontSize: '24px', fontWeight: '700', color: 'white', margin: '0 0 12px' }}>
                                    Waiting for Approval
                                </h1>
                                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px', lineHeight: '1.7', margin: '0 0 8px' }}>
                                    {partnerName.value ? `Hi ${partnerName.value}! Your` : 'Your'} registration request has been submitted successfully.
                                </p>
                                <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '13px', lineHeight: '1.7', margin: '0 0 28px' }}>
                                    The Admin or Client will <strong style={{ color: '#fbbf24' }}>review and approve</strong> your account before you can login.
                                </p>

                                {/* Email badge */}
                                <div style={{
                                    background: 'rgba(255,255,255,0.07)',
                                    borderRadius: '12px', padding: '12px 18px', marginBottom: '20px',
                                    display: 'flex', alignItems: 'center', gap: '10px'
                                }}>
                                    <svg width="16" height="16" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2" viewBox="0 0 24 24">
                                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                                        <polyline points="22,6 12,13 2,6" />
                                    </svg>
                                    <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px' }}>{email.value}</span>
                                </div>

                                {/* Auto-check indicator */}
                                <div style={{
                                    background: 'rgba(99,102,241,0.1)',
                                    border: '1px solid rgba(99,102,241,0.2)',
                                    borderRadius: '10px', padding: '10px 14px',
                                    marginBottom: '24px',
                                    display: 'flex', alignItems: 'center', gap: '8px'
                                }}>
                                    <div style={{
                                        width: '7px', height: '7px', borderRadius: '50%',
                                        background: '#6366f1', animation: 'blink 1.5s infinite', flexShrink: 0
                                    }} />
                                    <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>
                                        {checking.value
                                            ? 'Checking status...'
                                            : `Auto-check every 30 sec${lastChecked.value ? ` · Last: ${lastChecked.value}` : ''}`}
                                    </span>
                                </div>

                                {/* Manual check */}
                                <button
                                    onClick={checkStatus}
                                    disabled={checking.value}
                                    style={{
                                        width: '100%', padding: '13px', marginBottom: '12px',
                                        background: checking.value ? 'rgba(255,255,255,0.08)' : 'linear-gradient(135deg,#6366f1,#4f46e5)',
                                        color: 'white', border: 'none', borderRadius: '12px',
                                        fontSize: '14px', fontWeight: '600',
                                        cursor: checking.value ? 'not-allowed' : 'pointer', transition: 'all 0.2s'
                                    }}
                                >
                                    {checking.value ? '⏳ Checking...' : '🔄 Check Status Now'}
                                </button>

                                <button
                                    onClick={handleBackToLogin}
                                    style={{
                                        width: '100%', padding: '11px',
                                        background: 'transparent', color: 'rgba(255,255,255,0.4)',
                                        border: '1px solid rgba(255,255,255,0.12)',
                                        borderRadius: '12px', fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={e => e.target.style.borderColor = 'rgba(255,255,255,0.3)'}
                                    onMouseLeave={e => e.target.style.borderColor = 'rgba(255,255,255,0.12)'}
                                >
                                    ← Back to Login
                                </button>
                            </>
                        )}

                        {/* ============ APPROVED STATE ============ */}
                        {status.value === 'approved' && (
                            <>
                                <div style={{
                                    width: '96px', height: '96px', margin: '0 auto 28px',
                                    background: 'rgba(16,185,129,0.15)', borderRadius: '50%',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    border: '2px solid rgba(16,185,129,0.5)',
                                    animation: 'scaleIn 0.4s ease'
                                }}>
                                    <svg width="48" height="48" fill="none" stroke="#10b981" strokeWidth="2.5"
                                        strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                                        <polyline points="22 4 12 14.01 9 11.01" />
                                    </svg>
                                </div>

                                <h1 style={{ fontSize: '26px', fontWeight: '700', color: 'white', margin: '0 0 10px' }}>
                                    🎉 Account Approved!
                                </h1>
                                <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '14px', margin: '0 0 24px', lineHeight: '1.7' }}>
                                    Congratulations{partnerName.value ? `, ${partnerName.value}` : ''}! Your account has been approved.
                                    <br />Redirecting you to the login page...
                                </p>

                                <div style={{
                                    background: 'rgba(16,185,129,0.1)',
                                    border: '1px solid rgba(16,185,129,0.3)',
                                    borderRadius: '12px', padding: '14px',
                                    color: '#6ee7b7', fontSize: '14px', fontWeight: '500'
                                }}>
                                    ✅ Redirecting to login page...
                                </div>

                                {/* Spinner */}
                                <div style={{ marginTop: '20px' }}>
                                    <div class="spinner-border text-success" role="status" style={{ width: '28px', height: '28px' }}>
                                        <span class="visually-hidden">Loading...</span>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* ============ REJECTED STATE ============ */}
                        {status.value === 'rejected' && (
                            <>
                                <div style={{
                                    width: '96px', height: '96px', margin: '0 auto 28px',
                                    background: 'rgba(239,68,68,0.12)', borderRadius: '50%',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    border: '2px solid rgba(239,68,68,0.4)'
                                }}>
                                    <svg width="48" height="48" fill="none" stroke="#ef4444" strokeWidth="2.5"
                                        strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                        <circle cx="12" cy="12" r="10" />
                                        <line x1="15" y1="9" x2="9" y2="15" />
                                        <line x1="9" y1="9" x2="15" y2="15" />
                                    </svg>
                                </div>

                                <h1 style={{ fontSize: '24px', fontWeight: '700', color: 'white', margin: '0 0 12px' }}>
                                    Account Rejected
                                </h1>

                                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px', lineHeight: '1.7', margin: '0 0 6px' }}>
                                    Your registration request has been rejected.
                                </p>
                                <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '13px', margin: '0 0 20px' }}>
                                    Please <strong style={{ color: '#f87171' }}>register again</strong> with the correct details.
                                </p>

                                {/* Reason box */}
                                {blockedReason.value && (
                                    <div style={{
                                        background: 'rgba(239,68,68,0.08)',
                                        border: '1px solid rgba(239,68,68,0.25)',
                                        borderRadius: '12px', padding: '14px 16px',
                                        marginBottom: '20px', textAlign: 'left'
                                    }}>
                                        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Rejection Reason</p>
                                        <p style={{ color: '#fca5a5', fontSize: '14px', margin: 0 }}>{blockedReason.value}</p>
                                    </div>
                                )}

                                {/* Info box */}
                                <div style={{
                                    background: 'rgba(255,255,255,0.05)',
                                    borderRadius: '12px', padding: '14px 16px',
                                    marginBottom: '24px', textAlign: 'left',
                                    border: '1px solid rgba(255,255,255,0.08)'
                                }}>
                                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', margin: 0, lineHeight: '1.6' }}>
                                        ⚠️ Your previous account will be removed. Please register again with correct details or contact your admin/client for assistance.
                                    </p>
                                </div>

                                {/* Re-register button — MAIN ACTION */}
                                <button
                                    onClick={goToReRegister}
                                    style={{
                                        width: '100%', padding: '14px', marginBottom: '12px',
                                        background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                                        color: 'white', border: 'none', borderRadius: '12px',
                                        fontSize: '15px', fontWeight: '700', cursor: 'pointer',
                                        transition: 'all 0.2s', letterSpacing: '0.3px'
                                    }}
                                    onMouseEnter={e => e.target.style.opacity = '0.9'}
                                    onMouseLeave={e => e.target.style.opacity = '1'}
                                >
                                    🔄 Register Again
                                </button>

                                <button
                                    onClick={handleBackToLogin}
                                    style={{
                                        width: '100%', padding: '11px',
                                        background: 'transparent', color: 'rgba(255,255,255,0.35)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '12px', fontSize: '13px', cursor: 'pointer'
                                    }}
                                >
                                    ← Back to Login
                                </button>
                            </>
                        )}

                    </div>

                    {/* Footer */}
                    <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: '11px', marginTop: '20px' }}>
                        3rdAI Partner Portal
                        {status.value === 'pending' && ' · Status is checked every 30 seconds'}
                    </p>
                </div>

                <style>{`
          @keyframes pulse {
            0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(251,191,36,0.25); }
            50% { transform: scale(1.04); box-shadow: 0 0 0 14px rgba(251,191,36,0); }
          }
          @keyframes blink {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.25; }
          }
          @keyframes scaleIn {
            from { transform: scale(0.7); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
          }
        `}</style>
            </div>
        );
    }
};
