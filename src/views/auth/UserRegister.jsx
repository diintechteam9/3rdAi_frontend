import { ref, onMounted } from 'vue';
import { useRouter, RouterLink } from 'vue-router';
import api from '../../services/api.js';

export default {
  name: 'UserRegister',
  setup() {
    const router = useRouter();

    const step = ref(1);
    const email = ref('');
    const password = ref('');
    const emailOtp = ref('');
    const emailOtpSent = ref(false);
    const clientId = ref('');

    // Clients dropdown
    const clients = ref([]);
    const clientsLoading = ref(true);

    const fetchClients = async () => {
      try {
        const res = await api.request('/public/clients', { method: 'GET' });
        clients.value = res.data || [];
        if (clients.value.length > 0) {
          clientId.value = clients.value[0].clientId;
        }
      } catch (e) {
        console.error('Failed to fetch clients:', e);
      } finally {
        clientsLoading.value = false;
      }
    };

    // Step 2: Mobile OTP
    const mobile = ref('');
    const mobileOtp = ref('');
    const mobileOtpSent = ref(false);

    // Step 3: Profile
    const profile = ref({ name: '', dob: '', timeOfBirth: '', placeOfBirth: '', gowthra: '' });
    const imageFile = ref(null);
    const imageFileName = ref('');
    const imageContentType = ref('');

    const loading = ref(false);
    const error = ref('');

    const handleStep1 = async (e) => {
      e.preventDefault();
      loading.value = true;
      error.value = '';
      try {
        const response = await api.mobileUserRegisterStep1(email.value, password.value, clientId.value);
        if (response.success) {
          emailOtpSent.value = true;
          alert('OTP sent to your email. Please check and enter the OTP.');
        }
      } catch (err) {
        error.value = err.message || 'Failed to send OTP';
      } finally {
        loading.value = false;
      }
    };

    const handleStep1Verify = async (e) => {
      e.preventDefault();
      loading.value = true;
      error.value = '';
      try {
        const response = await api.mobileUserRegisterStep1Verify(email.value, emailOtp.value, clientId.value);
        if (response.success) {
          step.value = 2;
          alert('Email verified successfully! Now verify your mobile number.');
        }
      } catch (err) {
        error.value = err.message || 'Invalid OTP';
      } finally {
        loading.value = false;
      }
    };

    const resendEmailOTP = async () => {
      try {
        await api.resendEmailOTP(email.value);
        alert('OTP resent to your email');
      } catch (err) {
        error.value = err.message || 'Failed to resend OTP';
      }
    };

    const handleStep2 = async (e) => {
      e.preventDefault();
      loading.value = true;
      error.value = '';
      try {
        const response = await api.mobileUserRegisterStep2(email.value, mobile.value, clientId.value);
        if (response.success) {
          mobileOtpSent.value = true;
          alert('OTP sent to your mobile number.');
        }
      } catch (err) {
        error.value = err.message || 'Failed to send mobile OTP';
      } finally {
        loading.value = false;
      }
    };

    const handleStep2Verify = async (e) => {
      e.preventDefault();
      loading.value = true;
      error.value = '';
      try {
        const response = await api.mobileUserRegisterStep2Verify(email.value, mobileOtp.value, clientId.value);
        if (response.success) {
          step.value = 3;
          alert('Mobile verified successfully! Now complete your profile.');
        }
      } catch (err) {
        error.value = err.message || 'Invalid OTP';
      } finally {
        loading.value = false;
      }
    };

    const resendMobileOTP = async () => {
      try {
        await api.resendMobileOTP(email.value);
        alert('OTP resent to your mobile number');
      } catch (err) {
        error.value = err.message || 'Failed to resend OTP';
      }
    };

    const handleStep3 = async (e) => {
      e.preventDefault();
      loading.value = true;
      error.value = '';
      try {
        const response = await api.mobileUserRegisterStep3(email.value, profile.value, imageFileName.value, imageContentType.value, clientId.value);
        if (response.success) {
          if (response.data.token) localStorage.setItem('token_user', response.data.token);
          alert('Registration completed successfully! You can now login.');
          router.push('/user/login');
        }
      } catch (err) {
        error.value = err.message || 'Failed to complete registration';
      } finally {
        loading.value = false;
      }
    };

    const handleImageChange = (e) => {
      const file = e.target.files[0];
      if (file) {
        imageFile.value = file;
        imageFileName.value = file.name;
        imageContentType.value = file.type;
      }
    };

    onMounted(() => {
      fetchClients();

      if (!window.google?.accounts?.id) {
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        document.body.appendChild(script);
        script.onload = () => setTimeout(initGoogle, 100);
      } else {
        setTimeout(initGoogle, 100);
      }
    });

    function initGoogle() {
      if (!window.google || !window.google.accounts) return;
      try {
        window.google.accounts.id.initialize({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
          callback: handleGoogleCredential,
          ux_mode: 'popup',
          auto_select: false,
        });
        const buttonDiv = document.getElementById('g_id_signup');
        if (buttonDiv) {
          window.google.accounts.id.renderButton(buttonDiv, {
            theme: 'outline', size: 'large', width: 340, type: 'standard', text: 'signup_with', shape: 'rectangular'
          });
        }
      } catch (error) {
        console.error('Error initializing Google Sign-In:', error);
      }
    }

    async function handleGoogleCredential(response) {
      loading.value = true;
      error.value = '';
      try {
        const { data } = await api.post('/auth/user/google', {
          idToken: response.credential,
          clientId: clientId.value
        });
        localStorage.setItem('token_user', data.data.token);
        alert('Google sign-up successful! Redirecting to dashboard...');
        router.push('/mobile/user/dashboard');
      } catch (e) {
        error.value = e.response?.data?.message || 'Google sign-up failed';
      } finally {
        loading.value = false;
      }
    }

    // Client dropdown JSX helper
    const ClientDropdown = () => (
      <div class="mb-3">
        <label class="form-label">Select Organization *</label>
        {clientsLoading.value ? (
          <select class="form-select" disabled>
            <option>Loading organizations...</option>
          </select>
        ) : clients.value.length === 0 ? (
          <div class="alert alert-warning" style={{ padding: '8px 12px', fontSize: '14px' }}>
            No organizations available. Contact admin.
          </div>
        ) : (
          <select
            class="form-select"
            value={clientId.value}
            onChange={(e) => clientId.value = e.target.value}
            disabled={emailOtpSent.value}
            required
          >
            <option value="">-- Select Organization --</option>
            {clients.value.map(c => (
              <option key={c.clientId} value={c.clientId}>{c.label}</option>
            ))}
          </select>
        )}
      </div>
    );

    return () => (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', background: '#f5f5f5' }}>
        <div style={{ background: 'white', borderRadius: '12px', padding: '3rem', width: '100%', maxWidth: '600px', boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)' }}>
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <img src="/logo.png" alt="3rdAI Logo" style={{ width: '120px', height: '120px', borderRadius: '20px', objectFit: 'contain' }} />
          </div>
          <h1 style={{ textAlign: 'center', marginBottom: '2rem', color: '#1f2937', fontSize: '2rem', fontWeight: 'bold' }}>
            3rdAI User Registration
          </h1>

          {/* Progress */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
            {['Step 1: Email', 'Step 2: Mobile', 'Step 3: Profile'].map((label, i) => (
              <div key={i} style={{ flex: 1, textAlign: 'center', padding: '10px', background: step.value >= i + 1 ? '#3498db' : '#e0e0e0', color: step.value >= i + 1 ? 'white' : '#666', borderRadius: '8px', margin: '0 5px' }}>
                {label}
              </div>
            ))}
          </div>

          {error.value && <div class="alert alert-danger" style={{ marginBottom: '1rem' }}>{error.value}</div>}

          {/* Step 1 */}
          {step.value === 1 && (
            <>
              <form onSubmit={emailOtpSent.value ? handleStep1Verify : handleStep1}>
                {/* Organization Dropdown */}
                <ClientDropdown />

                <div class="mb-3">
                  <label class="form-label">Email</label>
                  <input
                    value={email.value}
                    onInput={(e) => email.value = e.target.value}
                    type="email"
                    class="form-control"
                    required
                    disabled={emailOtpSent.value}
                    placeholder="Enter email"
                  />
                </div>
                {!emailOtpSent.value && (
                  <div class="mb-3">
                    <label class="form-label">Password</label>
                    <input
                      value={password.value}
                      onInput={(e) => password.value = e.target.value}
                      type="password"
                      class="form-control"
                      required
                      placeholder="Enter password"
                    />
                  </div>
                )}
                {emailOtpSent.value && (
                  <>
                    <div class="mb-3">
                      <label class="form-label">Enter OTP</label>
                      <input
                        value={emailOtp.value}
                        onInput={(e) => emailOtp.value = e.target.value}
                        type="text"
                        class="form-control"
                        required
                        placeholder="Enter 6-digit OTP"
                        maxLength="6"
                      />
                    </div>
                    <button type="button" onClick={resendEmailOTP} class="btn btn-link" style={{ padding: 0, marginBottom: '1rem' }}>
                      Resend OTP
                    </button>
                  </>
                )}
                <button type="submit" disabled={loading.value} class="btn btn-primary w-100">
                  {loading.value ? 'Processing...' : emailOtpSent.value ? 'Verify Email OTP' : 'Send Email OTP'}
                </button>
              </form>

              <div style={{ marginTop: '1.5rem' }}>
                <div style={{ textAlign: 'center', margin: '1rem 0', color: '#6b7280' }}>Or sign up with</div>
                <div id="g_id_signup" style={{ display: 'flex', justifyContent: 'center' }}></div>
              </div>
            </>
          )}

          {/* Step 2 */}
          {step.value === 2 && (
            <form onSubmit={mobileOtpSent.value ? handleStep2Verify : handleStep2}>
              <div class="mb-3">
                <label class="form-label">Mobile Number</label>
                <input
                  value={mobile.value}
                  onInput={(e) => mobile.value = e.target.value}
                  type="tel"
                  class="form-control"
                  required
                  disabled={mobileOtpSent.value}
                  placeholder="Enter mobile number with country code (e.g., +1234567890)"
                />
              </div>
              {mobileOtpSent.value && (
                <>
                  <div class="mb-3">
                    <label class="form-label">Enter OTP</label>
                    <input
                      value={mobileOtp.value}
                      onInput={(e) => mobileOtp.value = e.target.value}
                      type="text"
                      class="form-control"
                      required
                      placeholder="Enter 6-digit OTP"
                      maxLength="6"
                    />
                  </div>
                  <button type="button" onClick={resendMobileOTP} class="btn btn-link" style={{ padding: 0, marginBottom: '1rem' }}>
                    Resend OTP
                  </button>
                </>
              )}
              <button type="submit" disabled={loading.value} class="btn btn-primary w-100">
                {loading.value ? 'Processing...' : mobileOtpSent.value ? 'Verify Mobile OTP' : 'Send Mobile OTP'}
              </button>
            </form>
          )}

          {/* Step 3 */}
          {step.value === 3 && (
            <form onSubmit={handleStep3}>
              <div class="mb-3">
                <label class="form-label">Name</label>
                <input value={profile.value.name} onInput={(e) => profile.value.name = e.target.value} type="text" class="form-control" placeholder="Enter your name" />
              </div>
              <div class="mb-3">
                <label class="form-label">Date of Birth</label>
                <input value={profile.value.dob} onInput={(e) => profile.value.dob = e.target.value} type="date" class="form-control" />
              </div>
              <div class="mb-3">
                <label class="form-label">Time of Birth</label>
                <input value={profile.value.timeOfBirth} onInput={(e) => profile.value.timeOfBirth = e.target.value} type="time" class="form-control" />
              </div>
              <div class="mb-3">
                <label class="form-label">Place of Birth</label>
                <input value={profile.value.placeOfBirth} onInput={(e) => profile.value.placeOfBirth = e.target.value} type="text" class="form-control" placeholder="Enter place of birth" />
              </div>
              <div class="mb-3">
                <label class="form-label">Gowthra</label>
                <input value={profile.value.gowthra} onInput={(e) => profile.value.gowthra = e.target.value} type="text" class="form-control" placeholder="Enter gowthra" />
              </div>
              <button type="submit" disabled={loading.value} class="btn btn-primary w-100">
                {loading.value ? 'Completing Registration...' : 'Complete Registration'}
              </button>
            </form>
          )}

          <p style={{ textAlign: 'center', marginTop: '1.5rem', color: '#6b7280' }}>
            Already have an account? <RouterLink to="/user/login" style={{ color: '#6366f1', textDecoration: 'none' }}>Login here</RouterLink>
          </p>
        </div>
      </div>
    );
  }
};