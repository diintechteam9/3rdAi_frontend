import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';

export default {
  name: 'PartnerLogin',
  setup() {
    const router = useRouter();
    const toast = useToast();

    const loading = ref(false);
    const loginForm = ref({
      email: '',
      password: ''
    });

    const login = async () => {
      if (!loginForm.value.email || !loginForm.value.password) {
        toast.error('Please fill all fields');
        return;
      }

      loading.value = true;
      try {
        const response = await fetch('https://stage.brahmakosh.com/api/partners/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(loginForm.value)
        });

        const data = await response.json();

        if (data.success) {
          localStorage.setItem('partner_token', data.data.token);
          localStorage.setItem('partner_data', JSON.stringify(data.data.partner));
          toast.success('Login successful!');
          router.push('/partner/dashboard');
        } else {
          toast.error(data.message || 'Login failed');
        }
      } catch (error) {
        console.error('Login error:', error);
        toast.error('Network error. Please try again.');
      } finally {
        loading.value = false;
      }
    };

    const handleGoogleLogin = async (response) => {
      loading.value = true;
      try {
        const res = await fetch('https://stage.brahmakosh.com/api/partners/google-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ credential: response.credential })
        });

        const data = await res.json();

        if (data.success) {
          localStorage.setItem('partner_token', data.data.token);
          localStorage.setItem('partner_data', JSON.stringify(data.data.partner));
          toast.success('Google login successful!');
          router.push('/partner/dashboard');
        } else {
          toast.error(data.message || 'Google login failed');
        }
      } catch (error) {
        console.error('Google login error:', error);
        toast.error('Google login failed. Please try again.');
      } finally {
        loading.value = false;
      }
    };

    onMounted(() => {
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id: '449350149768-a1a1qn8siakh4hq7tejj60ri81c6hh85.apps.googleusercontent.com',
          callback: handleGoogleLogin
        });

        window.google.accounts.id.renderButton(
          document.getElementById('google-signin-button'),
          {
            theme: 'outline',
            size: 'large',
            text: 'signin_with',
            shape: 'rectangular'
          }
        );
      }
    });

    return () => (
      <div class="min-vh-100 d-flex align-items-center justify-content-center bg-light">
        <div class="container">
          <div class="row justify-content-center">
            
            {/* ✅ Width increased here */}
            <div class="col-md-8 col-lg-6 col-xl-5">

              <div class="card border-0 shadow-sm rounded-4"
                style={{ maxWidth: '520px', margin: '0 auto' }}  // ✅ extra width control
              >
                <div class="card-body p-4 p-md-5">

                  <div class="text-center mb-4">
                    <h3 class="fw-bold mb-1">Partner Login</h3>
                    <p class="text-muted mb-0" style={{ fontSize: '0.95rem' }}>
                      Sign in to continue
                    </p>
                  </div>

                  <form onSubmit={(e) => { e.preventDefault(); login(); }}>
                    <div class="mb-3">
                      <label class="form-label fw-semibold">Email</label>
                      <input
                        type="email"
                        class="form-control form-control-lg rounded-3"
                        placeholder="example@gmail.com"
                        value={loginForm.value.email}
                        onInput={(e) => (loginForm.value.email = e.target.value)}
                      />
                    </div>

                    <div class="mb-3">
                      <label class="form-label fw-semibold">Password</label>
                      <input
                        type="password"
                        class="form-control form-control-lg rounded-3"
                        placeholder="••••••••"
                        value={loginForm.value.password}
                        onInput={(e) => (loginForm.value.password = e.target.value)}
                      />
                    </div>

                    <button
                      type="submit"
                      class="btn btn-dark btn-lg w-100 rounded-3"
                      disabled={loading.value}
                    >
                      {loading.value ? 'Signing in...' : 'Sign In'}
                    </button>
                  </form>

                  <div class="text-center my-4">
                    <div class="d-flex align-items-center">
                      <hr class="flex-grow-1" />
                      <span class="px-3 text-muted">OR</span>
                      <hr class="flex-grow-1" />
                    </div>
                  </div>

                  <div id="google-signin-button" class="d-flex justify-content-center mb-3"></div>

                  <div class="text-center">
                    <span class="text-muted">New here?</span>
                    <a href="/partner/register" class="ms-1 fw-semibold text-decoration-none">
                      Create Account
                    </a>
                  </div>

                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    );
  }
};
