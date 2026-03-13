// frontend/src/views/auth/MobileUserRegister.jsx

import { ref, onMounted } from 'vue';
import { useRouter, RouterLink } from 'vue-router';
import api from '../../services/api.js';

export default {
  name: 'MobileUserRegister',
  setup() {
    const router = useRouter();

    // Client ID - Fetched dynamically
    const DEFAULT_CLIENT_ID = ref('');
    const isLoadingClient = ref(true);
    const activeClients = ref([]);
    const googleAvailable = ref(false);

    // Step 1: Email OTP
    const step = ref(1);
    const email = ref('');
    const password = ref('');
    const emailOtp = ref('');
    const emailOtpSent = ref(false);

    // Step 2: Mobile OTP
    const mobile = ref('');
    const mobileOtp = ref('');
    const mobileOtpSent = ref(false);
    const otpMethod = ref('gupshup');

    // Step 3: Profile
    const profile = ref({
      name: '',
      address: '',
      currentLocation: ''
    });
    const imageFile = ref(null);
    const userToken = ref(null);

    const loading = ref(false);
    const error = ref('');
    const fetchingLocation = ref(false);

    // Step 1: Send Email OTP
    const handleStep1 = async (e) => {
      e.preventDefault();
      loading.value = true;
      error.value = '';

      try {
        const response = await api.request(`/mobile/user/register/step1/${DEFAULT_CLIENT_ID.value}`, {
          method: 'POST',
          body: {
            email: email.value,
            password: password.value,
            clientId: DEFAULT_CLIENT_ID.value
          }
        });

        if (response.success) {
          emailOtpSent.value = true;
          localStorage.setItem('user_client_id', response.data.clientId);
          localStorage.setItem('user_client_name', response.data.clientName);
          alert('OTP sent to your email. Please check and enter the OTP.');
        }
      } catch (err) {
        error.value = err.message || 'Failed to send OTP';
      } finally {
        loading.value = false;
      }
    };

    // Step 1: Verify Email OTP
    const handleStep1Verify = async (e) => {
      e.preventDefault();
      loading.value = true;
      error.value = '';

      try {
        const response = await api.request(`/mobile/user/register/step1/verify/${DEFAULT_CLIENT_ID.value}`, {
          method: 'POST',
          body: {
            email: email.value,
            otp: emailOtp.value,
            clientId: DEFAULT_CLIENT_ID.value
          }
        });

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

    // Resend Email OTP
    const resendEmailOTP = async () => {
      try {
        await api.request('/mobile/user/register/resend-email-otp', {
          method: 'POST',
          body: {
            email: email.value,
            clientId: DEFAULT_CLIENT_ID.value
          }
        });
        alert('OTP resent to your email');
      } catch (err) {
        error.value = err.message || 'Failed to resend OTP';
      }
    };

    // Step 2: Send Mobile OTP
    const handleStep2 = async (e) => {
      e.preventDefault();
      loading.value = true;
      error.value = '';

      try {
        const response = await api.request(`/mobile/user/register/step2/${DEFAULT_CLIENT_ID.value}`, {
          method: 'POST',
          body: {
            email: email.value,
            mobile: mobile.value,
            otpMethod: otpMethod.value,
            clientId: DEFAULT_CLIENT_ID.value
          }
        });

        if (response.success) {
          mobileOtpSent.value = true;
          alert('OTP sent to your mobile number. Please check and enter the OTP.');
        }
      } catch (err) {
        error.value = err.message || 'Failed to send mobile OTP';
      } finally {
        loading.value = false;
      }
    };

    // Step 2: Verify Mobile OTP
    const handleStep2Verify = async (e) => {
      e.preventDefault();
      loading.value = true;
      error.value = '';

      try {
        const response = await api.request(`/mobile/user/register/step2/verify/${DEFAULT_CLIENT_ID.value}`, {
          method: 'POST',
          body: {
            email: email.value,
            otp: mobileOtp.value,
            clientId: DEFAULT_CLIENT_ID.value
          }
        });

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

    // Resend Mobile OTP
    const resendMobileOTP = async () => {
      try {
        await api.request('/mobile/user/register/resend-mobile-otp', {
          method: 'POST',
          body: {
            email: email.value,
            otpMethod: otpMethod.value,
            clientId: DEFAULT_CLIENT_ID.value
          }
        });
        alert('OTP resent to your mobile number');
      } catch (err) {
        error.value = err.message || 'Failed to resend OTP';
      }
    };

    // Get Current Location
    const getCurrentLocation = () => {
      fetchingLocation.value = true;
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            profile.value.currentLocation = `${lat}, ${lng}`;
            fetchingLocation.value = false;
          },
          (err) => {
            console.error('Error fetching location', err);
            alert('Failed to get location. Please allow location access or map might not be secure.');
            fetchingLocation.value = false;
          }
        );
      } else {
        alert('Geolocation is not supported by this browser.');
        fetchingLocation.value = false;
      }
    };
    // Step 3: Complete Profile
    const handleStep3 = async (e) => {
      e.preventDefault();
      loading.value = true;
      error.value = '';

      // Validate required fields
      if (!profile.value.name || !profile.value.address) {
        error.value = 'Please fill in all required fields';
        loading.value = false;
        return;
      }

      try {
        const response = await api.request(`/mobile/user/register/step3/${DEFAULT_CLIENT_ID.value}`, {
          method: 'POST',
          body: {
            email: email.value,
            clientId: DEFAULT_CLIENT_ID.value,
            ...profile.value
          }
        });

        if (response.success) {
          userToken.value = response.data?.token || null;
          step.value = 4;
          alert('Profile completed successfully! Now upload your profile image.');
        }
      } catch (err) {
        error.value = err.message || 'Failed to complete registration';
      } finally {
        loading.value = false;
      }
    };

    // Handle image selection
    const handleImageChange = (e) => {
      const file = e.target.files[0];
      if (file) {
        imageFile.value = file;
      }
    };

    // Step 4: Upload Profile Image
    const handleStep4 = async (e) => {
      e.preventDefault();
      loading.value = true;
      error.value = '';

      try {
        if (!imageFile.value) {
          throw new Error('Please select an image file');
        }
        if (!userToken.value) {
          throw new Error('Missing user token. Please complete profile again.');
        }

        const formData = new FormData();
        formData.append('image', imageFile.value);

        const response = await fetch(`${import.meta.env.VITE_API_URL}/mobile/user/profile/image`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${userToken.value}`,
          },
          body: formData
        });

        const data = await response.json();

        if (data.success) {
          alert('Profile image uploaded successfully! You can now login.');
          router.push('/user/login');
        } else {
          throw new Error(data.message || 'Failed to upload image');
        }
      } catch (err) {
        error.value = err.message || 'Failed to upload profile image';
      } finally {
        loading.value = false;
      }
    };

    // Google Sign-In Handler - Only verify Step 1
    const handleGoogleCredential = async (response) => {
      loading.value = true;
      error.value = '';
      try {
        const { data } = await api.request(`/mobile/user/register/google/${DEFAULT_CLIENT_ID.value}`, {
          method: 'POST',
          body: {
            credential: response.credential,
            clientId: DEFAULT_CLIENT_ID.value
          }
        });

        // Store email and move to appropriate step
        email.value = data.email || '';

        if (data.registrationComplete) {
          // Fully registered - go to login
          localStorage.setItem('token_user', data.token);
          localStorage.setItem('user_client_id', data.clientId);
          localStorage.setItem('user_client_name', data.clientName);
          router.push('/mobile/user/dashboard');
        } else {
          // Only email verified - continue to Step 2
          localStorage.setItem('user_client_id', data.clientId);
          localStorage.setItem('user_client_name', data.clientName);
          step.value = 2;
          alert(`Email verified with Google! Please continue with Step 2: Mobile verification.`);
        }
      } catch (e) {
        error.value = e.message || 'Google registration failed';
      } finally {
        loading.value = false;
      }
    };

    // Fetch Default Client and Load Google Script
    onMounted(async () => {
      try {
        const response = await api.request('/public/clients/778205');
        if (response.success && response.data && response.data.length > 0) {
          activeClients.value = response.data;
          DEFAULT_CLIENT_ID.value = response.data[0].clientId;
        } else {
          error.value = "No active organizations found. Registration cannot proceed.";
        }
      } catch (err) {
        console.error("Failed to load clients:", err);
        error.value = "Failed to load system configuration.";
      } finally {
        isLoadingClient.value = false;
        loadGoogleScript();
      }
    });

    function loadGoogleScript() {
      if (window.google?.accounts?.id) {
        initGoogle();
        return;
      }

      const existingScript = document.querySelector('script[src*="accounts.google.com/gsi/client"]');
      if (existingScript) {
        existingScript.addEventListener('load', initGoogle);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = initGoogle;
      script.onerror = () => {
        console.error('Failed to load Google Sign-In script');
        error.value = 'Google Sign-In is temporarily unavailable';
      };
      document.head.appendChild(script);
    }

    function initGoogle() {
      if (!window.google?.accounts?.id) {
        console.error('Google Sign-In API not available');
        return;
      }

      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

      if (!clientId) {
        console.error('🚨 [GSI_LOGGER] VITE_GOOGLE_CLIENT_ID is missing from .env or not loaded by Vite');
        error.value = 'Google Sign-In configuration error. Please contact support.';
        return;
      }

      try {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleGoogleCredential,
          ux_mode: 'popup',
          auto_select: false,
          cancel_on_tap_outside: true,
        });

        const buttonDiv = document.getElementById('g_id_signin');
        if (buttonDiv) {
          window.google.accounts.id.renderButton(buttonDiv, {
            theme: 'outline',
            size: 'large',
            width: 340,
            type: 'standard',
            text: 'continue_with',
            shape: 'rectangular',
            logo_alignment: 'left',
          });
          googleAvailable.value = true;
        } else {
          console.error('Google Sign-In button container not found');
        }
      } catch (err) {
        console.warn('Google Sign-In could not be initialized. Hiding Google button.', err.message);
        googleAvailable.value = false;
      }
    }

    return () => (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', background: '#f5f5f5' }}>
        <div style={{ background: 'white', borderRadius: '12px', padding: '3rem', width: '100%', maxWidth: '650px', boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)' }}>
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <img src="/logo.png" alt="3rdAI Logo" style={{ width: '120px', height: '120px', borderRadius: '20px', objectFit: 'contain' }} />
          </div>
          <h1 style={{ textAlign: 'center', marginBottom: '2rem', color: '#1f2937', fontSize: '2rem', fontWeight: 'bold' }}>
            3rdAI User Registration
          </h1>

          {/* Progress Indicator */}
          {isLoadingClient.value ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <span class="spinner-border text-primary" role="status"></span>
              <p class="mt-2 text-muted">Loading configuration...</p>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
                <div style={{ flex: 1, textAlign: 'center', padding: '10px', background: step.value >= 1 ? '#3498db' : '#e0e0e0', color: step.value >= 1 ? 'white' : '#666', borderRadius: '8px', margin: '0 5px' }}>
                  Step 1: Email
                </div>
                <div style={{ flex: 1, textAlign: 'center', padding: '10px', background: step.value >= 2 ? '#3498db' : '#e0e0e0', color: step.value >= 2 ? 'white' : '#666', borderRadius: '8px', margin: '0 5px' }}>
                  Step 2: Mobile
                </div>
                <div style={{ flex: 1, textAlign: 'center', padding: '10px', background: step.value >= 3 ? '#3498db' : '#e0e0e0', color: step.value >= 3 ? 'white' : '#666', borderRadius: '8px', margin: '0 5px' }}>
                  Step 3: Profile
                </div>
                <div style={{ flex: 1, textAlign: 'center', padding: '10px', background: step.value >= 4 ? '#3498db' : '#e0e0e0', color: step.value >= 4 ? 'white' : '#666', borderRadius: '8px', margin: '0 5px' }}>
                  Step 4: Image
                </div>
              </div>

              {error.value && (
                <div class="alert alert-danger" style={{ marginBottom: '1rem' }}>
                  {error.value}
                </div>
              )}

              {/* Step 1: Email OTP */}
              {step.value === 1 && (
                <>
                  <form onSubmit={emailOtpSent.value ? handleStep1Verify : handleStep1}>
                    {/* Client Selection Dropdown */}
                    <div class="mb-3">
                      <label class="form-label" style={{ fontWeight: '500' }}>Select Organization *</label>
                      <select
                        class="form-control"
                        value={DEFAULT_CLIENT_ID.value}
                        onChange={(e) => DEFAULT_CLIENT_ID.value = e.target.value}
                        required
                        disabled={emailOtpSent.value}
                        style={{ backgroundColor: '#f9fafb', border: '1px solid #d1d5db' }}
                      >
                        <option value="" disabled>-- Select Organization --</option>
                        {activeClients.value.map(c => (
                          <option key={c.clientId} value={c.clientId}>{c.label}</option>
                        ))}
                      </select>
                    </div>

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
                        <button
                          type="button"
                          onClick={resendEmailOTP}
                          class="btn btn-link"
                          style={{ padding: 0, marginBottom: '1rem' }}
                        >
                          Resend OTP
                        </button>
                      </>
                    )}
                    <button type="submit" disabled={loading.value} class="btn btn-primary w-100">
                      {loading.value
                        ? 'Processing...'
                        : emailOtpSent.value
                          ? 'Verify Email OTP'
                          : 'Send Email OTP'}
                    </button>
                  </form>

                  {/* Google Sign-In - Only show on Step 1 */}
                  {!emailOtpSent.value && (
                    <div style={{ marginTop: '1.5rem', marginBottom: '1.5rem' }}>
                      <div style={{ textAlign: 'center', marginBottom: '1rem', color: '#6b7280', position: 'relative' }}>
                        <span style={{ background: 'white', padding: '0 10px', position: 'relative', zIndex: 1 }}>or</span>
                        <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '1px', background: '#e5e7eb', zIndex: 0 }}></div>
                      </div>
                      <div id="g_id_signin" style={{ display: 'flex', justifyContent: 'center' }}></div>
                      <p style={{ textAlign: 'center', marginTop: '0.5rem', fontSize: '0.85rem', color: '#6b7280' }}>
                        Google Sign-In will verify your email (Step 1 only)
                      </p>
                    </div>
                  )}
                </>
              )}

              {/* Step 2: Mobile OTP */}
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
                  {!mobileOtpSent.value && (
                    <div class="mb-3">
                      <label class="form-label">OTP Method</label>
                      <select
                        value={otpMethod.value}
                        onChange={(e) => otpMethod.value = e.target.value}
                        class="form-control"
                      >
                        <option value="twilio">SMS (Twilio)</option>
                        <option value="gupshup">SMS (Gupshup)</option>
                        <option value="whatsapp">WhatsApp</option>
                      </select>
                    </div>
                  )}
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
                      <button
                        type="button"
                        onClick={resendMobileOTP}
                        class="btn btn-link"
                        style={{ padding: 0, marginBottom: '1rem' }}
                      >
                        Resend OTP
                      </button>
                    </>
                  )}
                  <button type="submit" disabled={loading.value} class="btn btn-primary w-100">
                    {loading.value
                      ? 'Processing...'
                      : mobileOtpSent.value
                        ? 'Verify Mobile OTP'
                        : 'Send Mobile OTP'}
                  </button>
                </form>
              )}

              {/* Step 3: Profile */}
              {step.value === 3 && (
                <form onSubmit={handleStep3}>
                  <div class="mb-3">
                    <label class="form-label">Name *</label>
                    <input
                      value={profile.value.name}
                      onInput={(e) => profile.value.name = e.target.value}
                      type="text"
                      class="form-control"
                      required
                      placeholder="Enter your name"
                    />
                  </div>
                  <div class="mb-3">
                    <label class="form-label">Address *</label>
                    <input
                      value={profile.value.address}
                      onInput={(e) => profile.value.address = e.target.value}
                      type="text"
                      class="form-control"
                      required
                      placeholder="Enter your address"
                    />
                  </div>
                  <div class="mb-3">
                    <label class="form-label">Current Location (Lat, Lng) *</label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input
                        value={profile.value.currentLocation}
                        onInput={(e) => profile.value.currentLocation = e.target.value}
                        type="text"
                        class="form-control"
                        required
                        placeholder="E.g. 28.6139, 77.2090"
                      />
                      <button
                        type="button"
                        class="btn btn-secondary"
                        onClick={getCurrentLocation}
                        disabled={fetchingLocation.value}
                        style={{ whiteSpace: 'nowrap' }}
                      >
                        {fetchingLocation.value ? 'Fetching...' : '📍 Auto Detect'}
                      </button>
                    </div>
                  </div>
                  <button type="submit" disabled={loading.value} class="btn btn-primary w-100">
                    {loading.value ? 'Completing Registration...' : 'Complete Registration'}
                  </button>
                </form>
              )}
              {/* Step 4: Profile Image Upload */}
              {step.value === 4 && (
                <form onSubmit={handleStep4}>
                  <div class="mb-3">
                    <label class="form-label">Profile Image</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      class="form-control"
                      required
                    />
                  </div>
                  <button type="submit" disabled={loading.value} class="btn btn-primary w-100">
                    {loading.value ? 'Uploading...' : 'Upload Image'}
                  </button>
                </form>
              )}

              <p style={{ textAlign: 'center', marginTop: '1.5rem', color: '#6b7280' }}>
                Already have an account? <RouterLink to="/user/login" style={{ color: '#6366f1', textDecoration: 'none' }}>Login here</RouterLink>
              </p>
            </>)}
        </div>
      </div>
    );
  }
};
