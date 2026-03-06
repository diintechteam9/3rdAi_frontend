import { ref, onMounted } from 'vue';
import { useRouter, RouterLink } from 'vue-router';
import { useAuth } from '../../store/auth.js';
import api from '../../services/api.js';

export default {
  name: 'UserLogin',
  setup() {
    const router = useRouter();
    const { login } = useAuth();
    const email = ref('');
    const password = ref('');
    const clientId = ref('');
    const loading = ref(false);
    const error = ref('');
    const googleAvailable = ref(false);

    // Clients list for dropdown
    const clients = ref([]);
    const clientsLoading = ref(true);

    // Fetch all available clients on mount
    const fetchClients = async () => {
      try {
        const res = await api.request('/public/clients/778205', { method: 'GET' });
        clients.value = res.data || [];
        if (clients.value.length > 0) {
          clientId.value = clients.value[0].clientId; // default select first
        }
      } catch (e) {
        console.error('Failed to fetch clients:', e);
      } finally {
        clientsLoading.value = false;
      }
    };

    const handleLogin = async (e) => {
      e.preventDefault();
      loading.value = true;
      error.value = '';

      try {
        const response = await api.request(`/auth/user/login/${clientId.value}`, {
          method: 'POST',
          body: {
            email: email.value,
            password: password.value,
            clientId: clientId.value
          }
        });

        if (response.success) {
          localStorage.setItem('token_user', response.data.token);
          localStorage.setItem('user_client_id', response.data.clientId);
          localStorage.setItem('user_client_name', response.data.clientName);
          router.push('/mobile/user/dashboard');
        }
      } catch (err) {
        error.value = err.message || 'Login failed';
      } finally {
        loading.value = false;
      }
    };

    onMounted(() => {
      fetchClients();

      const gClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      if (!gClientId) {
        console.warn('VITE_GOOGLE_CLIENT_ID not set. Google Sign-In disabled.');
        return;
      }

      // Google script
      if (window.google?.accounts?.id) {
        initGoogle();
        return;
      }
      const scriptSrc = 'https://accounts.google.com/gsi/client';
      let script = document.querySelector(`script[src="${scriptSrc}"]`);
      if (!script) {
        script = document.createElement('script');
        script.src = scriptSrc;
        script.async = true;
        script.defer = true;
        script.onload = initGoogle;
        script.onerror = () => {
          console.warn('Google Sign-In script failed to load. Google login disabled.');
          googleAvailable.value = false;
        };
        document.body.appendChild(script);
      } else {
        const checkGoogle = setInterval(() => {
          if (window.google?.accounts?.id) {
            initGoogle();
            clearInterval(checkGoogle);
          }
        }, 100);
        setTimeout(() => clearInterval(checkGoogle), 5000);
      }
    });

    function initGoogle() {
      if (!window.google || !window.google.accounts) return;
      const gClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      if (!gClientId) return;
      try {
        const parent = document.getElementById('g_id_signin');
        if (parent) parent.innerHTML = '';
        window.google.accounts.id.initialize({
          client_id: gClientId,
          callback: handleGoogleCredential,
          ux_mode: 'popup',
          auto_select: false,
          cancel_on_tap_outside: false
        });
        if (parent) {
          window.google.accounts.id.renderButton(parent, { theme: 'outline', size: 'large', width: 250, text: 'signin_with' });
          googleAvailable.value = true;
        }
      } catch (err) {
        console.warn('Google Sign-In could not be initialized:', err.message);
        googleAvailable.value = false;
      }
    }

    async function handleGoogleCredential(response) {
      loading.value = true;
      error.value = '';
      try {
        const { data } = await api.post(`/auth/user/google/${clientId.value}`, {
          idToken: response.credential,
          clientId: clientId.value
        });
        localStorage.setItem('token_user', data.data.token);
        localStorage.setItem('user_client_id', data.data.clientId);
        localStorage.setItem('user_client_name', data.data.clientName);
        router.push('/mobile/user/dashboard');
      } catch (e) {
        error.value = e.response?.data?.message || 'Google login failed';
      } finally {
        loading.value = false;
      }
    }

    return () => (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ background: 'white', borderRadius: '12px', padding: '3rem', width: '100%', maxWidth: '400px', boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)' }}>
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <img src="/logo.png" alt="3rdAI Logo" style={{ width: '120px', height: '120px', borderRadius: '20px', objectFit: 'contain' }} />
          </div>
          <h1 style={{ textAlign: 'center', marginBottom: '2rem', color: '#1f2937', fontSize: '2rem', fontWeight: 'bold' }}>3rdAI User Login</h1>
          {error.value && <div class="alert alert-danger">{error.value}</div>}
          <form onSubmit={handleLogin}>
            <div class="mb-3">
              <label class="form-label" for="email">Email</label>
              <input
                id="email"
                name="email"
                value={email.value}
                onInput={(e) => email.value = e.target.value}
                type="email"
                class="form-control"
                required
                placeholder="Enter user email"
                autocomplete="email"
              />
            </div>

            {/* Client Dropdown */}
            <div class="mb-3">
              <label class="form-label" for="clientSelect">Select Organization</label>
              {clientsLoading.value ? (
                <select class="form-select" disabled>
                  <option>Loading organizations...</option>
                </select>
              ) : clients.value.length === 0 ? (
                <div class="alert alert-warning" style={{ padding: '8px 12px', fontSize: '14px' }}>
                  No organizations found. Contact admin.
                </div>
              ) : (
                <select
                  id="clientSelect"
                  class="form-select"
                  value={clientId.value}
                  onChange={(e) => clientId.value = e.target.value}
                  required
                >
                  <option value="">-- Select Organization --</option>
                  {clients.value.map(c => (
                    <option key={c.clientId} value={c.clientId}>{c.label}</option>
                  ))}
                </select>
              )}
            </div>

            <div class="mb-3">
              <label class="form-label" for="password">Password</label>
              <input
                id="password"
                name="password"
                value={password.value}
                onInput={(e) => password.value = e.target.value}
                type="password"
                class="form-control"
                required
                placeholder="Enter password"
                autocomplete="current-password"
              />
            </div>
            <button type="submit" disabled={loading.value} class="btn btn-primary w-100">
              {loading.value ? 'Logging in...' : 'Login'}
            </button>
            <p style={{ textAlign: 'center', marginTop: '1rem', marginBottom: '0.5rem' }}>
              <RouterLink to="/user/forgot-password" style={{ color: '#6366f1', textDecoration: 'none', fontSize: '0.9rem' }}>
                Forgot Password?
              </RouterLink>
            </p>
            <p style={{ textAlign: 'center', marginTop: '1rem', color: '#6b7280' }}>
              Don't have an account?{' '}
              <RouterLink to="/mobile/user/register" style={{ color: '#6366f1', textDecoration: 'none', fontWeight: 'bold' }}>
                Register
              </RouterLink>
            </p>
          </form>

          {/* Google Sign-In - always rendered */}
          <div style={{ marginTop: '1.5rem' }}>
            <div style={{ textAlign: 'center', marginBottom: '1rem', color: '#6b7280', position: 'relative' }}>
              <span style={{ background: 'white', padding: '0 10px', position: 'relative', zIndex: 1 }}>or</span>
              <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '1px', background: '#e5e7eb', zIndex: 0 }}></div>
            </div>
            <div id="g_id_signin" style={{ display: 'flex', justifyContent: 'center' }}></div>
            {!googleAvailable.value && import.meta.env.VITE_GOOGLE_CLIENT_ID && (
              <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: '0.8rem', marginTop: '0.5rem' }}>
                Google Sign-In unavailable. Check Google Cloud Console OAuth settings.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }
};
