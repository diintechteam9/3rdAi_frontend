// frontend/src/views/partner/PartnerRegisterMultiStep.jsx
// 4-Step Partner Registration: Email OTP → Phone OTP → Profile Details → Profile Image

import { ref, onMounted } from 'vue';
import { useRouter, RouterLink } from 'vue-router';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

const indianStates = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat',
    'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh',
    'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan',
    'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
    'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
    'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
];

export default {
    name: 'PartnerRegisterMultiStep',
    setup() {
        const router = useRouter();

        /* ── State ── */
        const step = ref(1);
        const loading = ref(false);
        const error = ref('');
        const toast = ref({ show: false, msg: '', type: 'success' });
        const googleAvailable = ref(false);

        // Step 1 — Email
        const email = ref('');
        const password = ref('');
        const confirmPassword = ref('');
        const showPass = ref(false);
        const clientId = ref('');
        const activeClients = ref([]);
        const isLoadingClient = ref(true);
        const emailOtpSent = ref(false);
        const emailOtp = ref('');

        // Step 2 — Phone
        const phone = ref('');
        const phoneOtpSent = ref(false);
        const phoneOtp = ref('');
        const otpMethod = ref('gupshup');

        // Step 3 — Profile
        const profile = ref({
            name: '',
            designation: '',
            area: '',
            state: '',
            policeId: '',
            experience: '',
        });

        // Step 4 — Image
        const partnerToken = ref(null);
        const imageFile = ref(null);
        const imagePreview = ref(null);

        /* ── Helpers ── */
        const showToast = (msg, type = 'success') => {
            toast.value = { show: true, msg, type };
            setTimeout(() => (toast.value.show = false), 3500);
        };

        const apiPost = async (path, body, token = null) => {
            const headers = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;
            const res = await fetch(`${API_BASE_URL}${path}`, {
                method: 'POST',
                headers,
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.message || 'Request failed');
            return data;
        };

        /* ── Step 1: Send Email OTP ── */
        const sendEmailOtp = async (e) => {
            e.preventDefault();
            error.value = '';
            if (!clientId.value) { error.value = 'Please select an organization'; return; }
            if (password.value !== confirmPassword.value) { error.value = 'Passwords do not match'; return; }
            loading.value = true;
            try {
                await apiPost(`/mobile/partner/register/step1/${clientId.value}`, {
                    email: email.value,
                    password: password.value,
                    clientId: clientId.value,
                });
                emailOtpSent.value = true;
                showToast('OTP sent to your email! Check your inbox.');
            } catch (err) {
                error.value = err.message;
            } finally {
                loading.value = false;
            }
        };

        /* ── Step 1: Verify Email OTP ── */
        const verifyEmailOtp = async (e) => {
            e.preventDefault();
            error.value = '';
            loading.value = true;
            try {
                await apiPost(`/mobile/partner/register/step1/verify/${clientId.value}`, {
                    email: email.value,
                    otp: emailOtp.value,
                    clientId: clientId.value,
                });
                showToast('Email verified! Now verify your phone.');
                step.value = 2;
            } catch (err) {
                error.value = err.message;
            } finally {
                loading.value = false;
            }
        };

        /* ── Step 1: Resend Email OTP ── */
        const resendEmailOtp = async () => {
            error.value = '';
            try {
                await apiPost(`/mobile/partner/register/resend-email-otp/${clientId.value}`, {
                    email: email.value,
                    clientId: clientId.value,
                });
                showToast('OTP resent to your email');
            } catch (err) {
                error.value = err.message;
            }
        };

        /* ── Step 1: Google Sign-In ── */
        const handleGoogleCredential = async (response) => {
            loading.value = true;
            error.value = '';
            try {
                await apiPost(`/mobile/partner/register/step1/google/${clientId.value}`, {
                    credential: response.credential,
                    clientId: clientId.value,
                });
                showToast('Email verified via Google! Proceed to phone verification.');
                step.value = 2;
            } catch (err) {
                error.value = err.message;
            } finally {
                loading.value = false;
            }
        };

        /* ── Step 2: Send Phone OTP ── */
        const sendPhoneOtp = async (e) => {
            e.preventDefault();
            error.value = '';
            loading.value = true;
            try {
                await apiPost(`/mobile/partner/register/step2/${clientId.value}`, {
                    email: email.value,
                    phone: phone.value,
                    otpMethod: otpMethod.value,
                    clientId: clientId.value,
                });
                phoneOtpSent.value = true;
                showToast('OTP sent to your phone!');
            } catch (err) {
                error.value = err.message;
            } finally {
                loading.value = false;
            }
        };

        /* ── Step 2: Verify Phone OTP ── */
        const verifyPhoneOtp = async (e) => {
            e.preventDefault();
            error.value = '';
            loading.value = true;
            try {
                await apiPost(`/mobile/partner/register/step2/verify/${clientId.value}`, {
                    email: email.value,
                    otp: phoneOtp.value,
                    clientId: clientId.value,
                });
                showToast('Phone verified! Complete your profile.');
                step.value = 3;
            } catch (err) {
                error.value = err.message;
            } finally {
                loading.value = false;
            }
        };

        /* ── Step 2: Resend Phone OTP ── */
        const resendPhoneOtp = async () => {
            error.value = '';
            try {
                await apiPost(`/mobile/partner/register/step2/resend/${clientId.value}`, {
                    email: email.value,
                    otpMethod: otpMethod.value,
                    clientId: clientId.value,
                });
                showToast('OTP resent to your phone');
            } catch (err) {
                error.value = err.message;
            }
        };

        /* ── Step 3: Save Profile ── */
        const saveProfile = async (e) => {
            e.preventDefault();
            error.value = '';
            const { name, designation, area, state, policeId, experience } = profile.value;
            if (!name || !designation || !area || !state || !policeId) {
                error.value = 'Please fill all required fields';
                return;
            }
            loading.value = true;
            try {
                const data = await apiPost(`/mobile/partner/register/step3/${clientId.value}`, {
                    email: email.value,
                    clientId: clientId.value,
                    name, designation, area, state, policeId, experience,
                });
                partnerToken.value = data.data?.token;
                showToast('Profile saved! Upload your photo to finish.');
                step.value = 4;
            } catch (err) {
                error.value = err.message;
            } finally {
                loading.value = false;
            }
        };

        /* ── Step 4: Upload Image ── */
        const handleImageChange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            if (file.size > 5 * 1024 * 1024) { error.value = 'Image must be under 5 MB'; return; }
            imageFile.value = file;
            imagePreview.value = URL.createObjectURL(file);
        };

        const uploadImage = async (e) => {
            e.preventDefault();
            error.value = '';
            if (!imageFile.value) { error.value = 'Please select a profile image'; return; }
            if (!partnerToken.value) { error.value = 'Session expired. Please redo step 3.'; return; }
            loading.value = true;
            try {
                const formData = new FormData();
                formData.append('image', imageFile.value);

                const res = await fetch(`${API_BASE_URL}/mobile/partner/register/step4`, {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${partnerToken.value}` },
                    body: formData,
                });
                const data = await res.json();
                if (!data.success) throw new Error(data.message || 'Upload failed');

                localStorage.setItem('partner_pending_email', email.value);
                showToast('Registration complete! Waiting for approval.');
                setTimeout(() => router.push('/partner/waiting-approval'), 1200);
            } catch (err) {
                error.value = err.message;
            } finally {
                loading.value = false;
            }
        };

        /* ── Google Sign-In Init ── */
        const loadGoogle = () => {
            if (window.google?.accounts?.id) { initGoogle(); return; }
            const script = document.createElement('script');
            script.src = 'https://accounts.google.com/gsi/client';
            script.async = true;
            script.onload = initGoogle;
            document.head.appendChild(script);
        };

        const initGoogle = () => {
            const gClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
            if (!gClientId || !window.google?.accounts?.id) return;
            try {
                window.google.accounts.id.initialize({
                    client_id: gClientId,
                    callback: handleGoogleCredential,
                    ux_mode: 'popup',
                    auto_select: false,
                });
                const btn = document.getElementById('partner_g_signin');
                if (btn) {
                    window.google.accounts.id.renderButton(btn, {
                        theme: 'filled_blue', size: 'large', width: 320, type: 'standard',
                        text: 'continue_with', shape: 'rectangular',
                    });
                    googleAvailable.value = true;
                }
            } catch { googleAvailable.value = false; }
        };

        /* ── Fetch Clients on Mount ── */
        onMounted(async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/public/clients/778205`);
                const data = await res.json();
                if (data.success && data.data?.length) {
                    activeClients.value = data.data;
                    clientId.value = data.data[0].clientId;
                } else {
                    error.value = 'No active organizations found.';
                }
            } catch {
                error.value = 'Failed to load organization list.';
            } finally {
                isLoadingClient.value = false;
                loadGoogle();
            }
        });

        /* ── Shared Styles ── */
        const inputStyle = {
            background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.15)',
            color: 'white',
            borderRadius: '10px',
            padding: '0.7rem 1rem',
            width: '100%',
            fontSize: '0.9rem',
            outline: 'none',
            transition: 'border-color .2s',
        };
        const labelStyle = { color: 'rgba(255,255,255,0.75)', fontSize: '0.82rem', fontWeight: '600', display: 'block', marginBottom: '6px' };
        const btnPrimary = {
            background: 'linear-gradient(135deg,#3b82f6,#6366f1)',
            border: 'none', color: 'white', borderRadius: '10px',
            padding: '0.75rem', width: '100%', fontWeight: '700',
            fontSize: '1rem', cursor: 'pointer', transition: 'opacity .2s',
            letterSpacing: '.2px',
        };
        const btnSecondary = {
            background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
            color: 'rgba(255,255,255,0.75)', borderRadius: '10px',
            padding: '0.5rem 1rem', cursor: 'pointer', fontSize: '0.85rem',
        };
        const otpInput = {
            ...inputStyle, textAlign: 'center', fontSize: '1.4rem',
            fontWeight: '700', letterSpacing: '8px',
        };

        const steps = ['Email', 'Phone', 'Profile', 'Photo'];

        return () => (
            <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#0f172a 0%,#1e293b 50%,#0f172a 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', fontFamily: "'Inter','Segoe UI',sans-serif" }}>

                {/* Toast */}
                {toast.value.show && (
                    <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 9999, background: toast.value.type === 'success' ? 'linear-gradient(135deg,#10b981,#059669)' : 'linear-gradient(135deg,#ef4444,#dc2626)', color: 'white', padding: '14px 20px', borderRadius: '12px', fontWeight: '600', fontSize: '0.9rem', boxShadow: '0 8px 32px rgba(0,0,0,0.3)', maxWidth: '340px', animation: 'slideIn .3s ease' }}>
                        {toast.value.type === 'success' ? '✅ ' : '❌ '}{toast.value.msg}
                    </div>
                )}

                <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
          input::placeholder { color: rgba(255,255,255,0.3) !important; }
          select option { background: #1e293b; color: white; }
          @keyframes slideIn { from { opacity:0; transform:translateX(40px); } to { opacity:1; transform:translateX(0); } }
          @keyframes fadeUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
          .partner-reg-card { animation: fadeUp .4s ease; }
          .form-input:focus { border-color: #6366f1 !important; box-shadow: 0 0 0 3px rgba(99,102,241,.15); }
          .otp-digit:focus { border-color: #3b82f6 !important; }
        `}</style>

                <div class="partner-reg-card" style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(24px)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)', width: '100%', maxWidth: '540px', padding: '2.5rem', boxShadow: '0 32px 64px rgba(0,0,0,0.4)' }}>

                    {/* Logo + Title */}
                    <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                        <img src="/logo.png" alt="Logo" style={{ width: '70px', height: '70px', borderRadius: '16px', objectFit: 'contain', marginBottom: '12px' }} />
                        <h1 style={{ color: 'white', fontSize: '1.6rem', fontWeight: '800', margin: '0 0 4px' }}>Partner Registration</h1>
                        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', margin: 0 }}>Create your officer account in 4 steps</p>
                    </div>

                    {isLoadingClient.value ? (
                        <div style={{ textAlign: 'center', padding: '3rem 0', color: 'rgba(255,255,255,0.5)' }}>
                            <div style={{ width: '40px', height: '40px', border: '3px solid rgba(255,255,255,0.1)', borderTop: '3px solid #6366f1', borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 1s linear infinite' }} />
                            Loading configuration...
                            <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
                        </div>
                    ) : (
                        <>
                            {/* Step Indicator */}
                            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2rem', gap: '0' }}>
                                {steps.map((s, i) => (
                                    <>
                                        <div key={s} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                                            <div style={{
                                                width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontWeight: '700', fontSize: '0.85rem', transition: 'all .3s',
                                                background: step.value > i + 1 ? 'linear-gradient(135deg,#10b981,#059669)' : step.value === i + 1 ? 'linear-gradient(135deg,#3b82f6,#6366f1)' : 'rgba(255,255,255,0.08)',
                                                color: step.value >= i + 1 ? 'white' : 'rgba(255,255,255,0.3)',
                                                boxShadow: step.value === i + 1 ? '0 0 16px rgba(99,102,241,0.5)' : 'none',
                                            }}>
                                                {step.value > i + 1 ? '✓' : i + 1}
                                            </div>
                                            <span style={{ fontSize: '0.7rem', color: step.value === i + 1 ? '#93c5fd' : 'rgba(255,255,255,0.3)', marginTop: '4px', fontWeight: step.value === i + 1 ? '600' : '400' }}>{s}</span>
                                        </div>
                                        {i < steps.length - 1 && (
                                            <div style={{ flex: 1, height: '2px', background: step.value > i + 1 ? 'linear-gradient(90deg,#10b981,#059669)' : 'rgba(255,255,255,0.08)', marginBottom: '18px', transition: 'background .3s' }} />
                                        )}
                                    </>
                                ))}
                            </div>

                            {/* Error */}
                            {error.value && (
                                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', padding: '12px 16px', borderRadius: '10px', marginBottom: '1.25rem', fontSize: '0.875rem' }}>
                                    ⚠️ {error.value}
                                </div>
                            )}

                            {/* ─── STEP 1: Email OTP ─── */}
                            {step.value === 1 && (
                                <div>
                                    <form onSubmit={emailOtpSent.value ? verifyEmailOtp : sendEmailOtp}>
                                        {/* Organization */}
                                        <div style={{ marginBottom: '1rem' }}>
                                            <label style={labelStyle}>Organization <span style={{ color: '#f87171' }}>*</span></label>
                                            <select
                                                value={clientId.value}
                                                onChange={(e) => clientId.value = e.target.value}
                                                required
                                                disabled={emailOtpSent.value}
                                                class="form-input"
                                                style={{ ...inputStyle, appearance: 'auto' }}
                                            >
                                                <option value="" disabled>— Select Organization —</option>
                                                {activeClients.value.map(c => (
                                                    <option key={c.clientId} value={c.clientId}>{c.label || c.businessName || c.clientId}</option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Email */}
                                        <div style={{ marginBottom: '1rem' }}>
                                            <label style={labelStyle}>Email Address <span style={{ color: '#f87171' }}>*</span></label>
                                            <input
                                                type="email" required class="form-input" style={inputStyle}
                                                placeholder="officer@department.gov.in"
                                                value={email.value}
                                                onInput={(e) => email.value = e.target.value}
                                                disabled={emailOtpSent.value}
                                            />
                                        </div>

                                        {/* Password (only before OTP sent) */}
                                        {!emailOtpSent.value && (
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '1rem' }}>
                                                <div>
                                                    <label style={labelStyle}>Password <span style={{ color: '#f87171' }}>*</span></label>
                                                    <input
                                                        type={showPass.value ? 'text' : 'password'} required class="form-input" style={inputStyle}
                                                        placeholder="Min. 6 characters"
                                                        value={password.value}
                                                        onInput={(e) => password.value = e.target.value}
                                                    />
                                                </div>
                                                <div>
                                                    <label style={labelStyle}>Confirm Password <span style={{ color: '#f87171' }}>*</span></label>
                                                    <input
                                                        type={showPass.value ? 'text' : 'password'} required class="form-input" style={inputStyle}
                                                        placeholder="Repeat password"
                                                        value={confirmPassword.value}
                                                        onInput={(e) => confirmPassword.value = e.target.value}
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {/* OTP input */}
                                        {emailOtpSent.value && (
                                            <div style={{ marginBottom: '1.25rem' }}>
                                                <label style={{ ...labelStyle, textAlign: 'center', display: 'block' }}>Enter 6-Digit Email OTP</label>
                                                <input
                                                    type="text" required class="otp-digit" style={otpInput} maxLength="6"
                                                    placeholder="● ● ● ● ● ●"
                                                    value={emailOtp.value}
                                                    onInput={(e) => emailOtp.value = e.target.value}
                                                />
                                                <div style={{ textAlign: 'center', marginTop: '8px' }}>
                                                    <button type="button" onClick={resendEmailOtp} style={{ background: 'none', border: 'none', color: '#60a5fa', cursor: 'pointer', fontSize: '0.85rem', textDecoration: 'underline' }}>
                                                        Resend OTP
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        <button type="submit" disabled={loading.value} style={{ ...btnPrimary, opacity: loading.value ? 0.7 : 1 }}>
                                            {loading.value ? (
                                                <span>⏳ {emailOtpSent.value ? 'Verifying...' : 'Sending OTP...'}</span>
                                            ) : emailOtpSent.value ? '✓ Verify Email OTP' : '📧 Send Email OTP'}
                                        </button>
                                    </form>

                                    {/* Google Sign-In */}
                                    {!emailOtpSent.value && (
                                        <div style={{ marginTop: '1.5rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem' }}>
                                                <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
                                                <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.8rem' }}>or continue with</span>
                                                <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
                                            </div>
                                            <div id="partner_g_signin" style={{ display: 'flex', justifyContent: 'center' }} />
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ─── STEP 2: Phone OTP ─── */}
                            {step.value === 2 && (
                                <form onSubmit={phoneOtpSent.value ? verifyPhoneOtp : sendPhoneOtp}>
                                    <div style={{ marginBottom: '1rem' }}>
                                        <label style={labelStyle}>Phone Number <span style={{ color: '#f87171' }}>*</span></label>
                                        <input
                                            type="tel" required class="form-input" style={inputStyle}
                                            placeholder="+91 98765 43210"
                                            value={phone.value}
                                            onInput={(e) => phone.value = e.target.value}
                                            disabled={phoneOtpSent.value}
                                        />
                                    </div>

                                    {!phoneOtpSent.value && (
                                        <div style={{ marginBottom: '1rem' }}>
                                            <label style={labelStyle}>Delivery Method</label>
                                            <div style={{ display: 'flex', gap: '10px' }}>
                                                {['gupshup', 'twilio', 'whatsapp'].map(m => (
                                                    <button
                                                        key={m} type="button"
                                                        onClick={() => otpMethod.value = m}
                                                        style={{
                                                            flex: 1, padding: '8px 4px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: '600',
                                                            background: otpMethod.value === m ? 'linear-gradient(135deg,#3b82f6,#6366f1)' : 'rgba(255,255,255,0.06)',
                                                            border: otpMethod.value === m ? 'none' : '1px solid rgba(255,255,255,0.12)',
                                                            color: otpMethod.value === m ? 'white' : 'rgba(255,255,255,0.5)',
                                                            transition: 'all .2s',
                                                        }}
                                                    >
                                                        {m === 'gupshup' ? '📱 SMS' : m === 'twilio' ? '📡 Twilio' : '💬 WhatsApp'}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {phoneOtpSent.value && (
                                        <div style={{ marginBottom: '1.25rem' }}>
                                            <label style={{ ...labelStyle, textAlign: 'center', display: 'block' }}>Enter 6-Digit Phone OTP</label>
                                            <input
                                                type="text" required class="otp-digit" style={otpInput} maxLength="6"
                                                placeholder="● ● ● ● ● ●"
                                                value={phoneOtp.value}
                                                onInput={(e) => phoneOtp.value = e.target.value}
                                            />
                                            <div style={{ textAlign: 'center', marginTop: '8px' }}>
                                                <button type="button" onClick={resendPhoneOtp} style={{ background: 'none', border: 'none', color: '#60a5fa', cursor: 'pointer', fontSize: '0.85rem', textDecoration: 'underline' }}>
                                                    Resend OTP
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    <button type="submit" disabled={loading.value} style={{ ...btnPrimary, opacity: loading.value ? 0.7 : 1 }}>
                                        {loading.value ? '⏳ Processing...' : phoneOtpSent.value ? '✓ Verify Phone OTP' : '📱 Send Phone OTP'}
                                    </button>
                                </form>
                            )}

                            {/* ─── STEP 3: Profile Details ─── */}
                            {step.value === 3 && (
                                <form onSubmit={saveProfile}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '14px' }}>

                                        <div>
                                            <label style={labelStyle}>Full Name <span style={{ color: '#f87171' }}>*</span></label>
                                            <input type="text" required class="form-input" style={inputStyle} placeholder="Inspector Rajesh Kumar"
                                                value={profile.value.name} onInput={(e) => profile.value.name = e.target.value} />
                                        </div>

                                        <div>
                                            <label style={labelStyle}>Designation <span style={{ color: '#f87171' }}>*</span></label>
                                            <input type="text" required class="form-input" style={inputStyle} placeholder="e.g. Inspector, Sub-Inspector, DSP"
                                                value={profile.value.designation} onInput={(e) => profile.value.designation = e.target.value} />
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                            <div>
                                                <label style={labelStyle}>Area <span style={{ color: '#f87171' }}>*</span></label>
                                                <input type="text" required class="form-input" style={inputStyle} placeholder="e.g. Connaught Place"
                                                    value={profile.value.area} onInput={(e) => profile.value.area = e.target.value} />
                                            </div>
                                            <div>
                                                <label style={labelStyle}>State <span style={{ color: '#f87171' }}>*</span></label>
                                                <select required class="form-input" style={{ ...inputStyle, appearance: 'auto' }}
                                                    value={profile.value.state} onChange={(e) => profile.value.state = e.target.value}>
                                                    <option value="" disabled>Select State</option>
                                                    {indianStates.map(s => <option key={s} value={s}>{s}</option>)}
                                                </select>
                                            </div>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                            <div>
                                                <label style={labelStyle}>Police ID / Badge No. <span style={{ color: '#f87171' }}>*</span></label>
                                                <input type="text" required class="form-input" style={inputStyle} placeholder="ID Number"
                                                    value={profile.value.policeId} onInput={(e) => profile.value.policeId = e.target.value} />
                                            </div>
                                            <div>
                                                <label style={labelStyle}>Experience (Years)</label>
                                                <input type="number" min="0" max="50" class="form-input" style={inputStyle} placeholder="0"
                                                    value={profile.value.experience} onInput={(e) => profile.value.experience = e.target.value} />
                                            </div>
                                        </div>

                                    </div>

                                    <button type="submit" disabled={loading.value} style={{ ...btnPrimary, marginTop: '1.5rem', opacity: loading.value ? 0.7 : 1 }}>
                                        {loading.value ? '⏳ Saving...' : 'Save Profile & Continue →'}
                                    </button>
                                </form>
                            )}

                            {/* ─── STEP 4: Profile Image ─── */}
                            {step.value === 4 && (
                                <form onSubmit={uploadImage}>
                                    <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                                        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
                                            Upload your official profile photo. This will be visible to citizens and your organization.
                                        </p>

                                        {/* Preview circle */}
                                        <div
                                            style={{ width: '130px', height: '130px', borderRadius: '50%', margin: '0 auto 16px', background: 'rgba(255,255,255,0.07)', border: imagePreview.value ? 'none' : '2px dashed rgba(99,102,241,0.5)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: imagePreview.value ? '0 0 24px rgba(99,102,241,0.3)' : 'none', transition: 'all .3s' }}
                                            onClick={() => document.getElementById('partner_img_input').click()}
                                        >
                                            {imagePreview.value ? (
                                                <img src={imagePreview.value} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            ) : (
                                                <div style={{ color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>
                                                    <div style={{ fontSize: '2rem' }}>📷</div>
                                                    <div style={{ fontSize: '0.75rem', marginTop: '4px' }}>Click to upload</div>
                                                </div>
                                            )}
                                        </div>

                                        <input
                                            id="partner_img_input" type="file" accept="image/*" style={{ display: 'none' }}
                                            onChange={handleImageChange}
                                        />

                                        <button
                                            type="button"
                                            onClick={() => document.getElementById('partner_img_input').click()}
                                            style={btnSecondary}
                                        >
                                            📂 {imagePreview.value ? 'Change Photo' : 'Choose Photo'}
                                        </button>
                                        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem', marginTop: '8px' }}>Max 5 MB · JPG, PNG, WEBP</p>
                                    </div>

                                    <button type="submit" disabled={loading.value || !imageFile.value} style={{ ...btnPrimary, opacity: (loading.value || !imageFile.value) ? 0.5 : 1 }}>
                                        {loading.value ? '⏳ Uploading...' : '🚀 Complete Registration'}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => { localStorage.setItem('partner_pending_email', email.value); router.push('/partner/waiting-approval'); }}
                                        style={{ ...btnSecondary, width: '100%', marginTop: '10px', textAlign: 'center' }}
                                    >
                                        Skip for now →
                                    </button>
                                </form>
                            )}

                            {/* Footer */}
                            <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.35)', fontSize: '0.85rem', marginTop: '1.75rem' }}>
                                Already have an account?{' '}
                                <RouterLink to="/partner/login" style={{ color: '#60a5fa', fontWeight: '600', textDecoration: 'none' }}>
                                    Sign In
                                </RouterLink>
                            </p>
                        </>
                    )}
                </div>
            </div>
        );
    }
};
