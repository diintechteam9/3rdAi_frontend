import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';

export default {
  name: 'PartnerRegister',
  setup() {
    const router = useRouter();
    const toast = useToast();

    const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://stage.brahmakosh.com/api';

    const loading = ref(false);
    const registerForm = ref({
      name: '',
      email: '',
      password: '',
      phone: '',
      specialization: ''
    });
    const profileImageFile = ref(null);

    const register = async () => {
      if (!registerForm.value.name || !registerForm.value.email || !registerForm.value.password) {
        toast.error('Please fill all required fields');
        return;
      }

      loading.value = true;
      try {
        const response = await fetch(`${API_BASE_URL}/partners/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(registerForm.value)
        });

        const data = await response.json();

        if (data.success) {
          const token = data.data.token;
          localStorage.setItem('partner_token', token);
          localStorage.setItem('partner_data', JSON.stringify(data.data.partner));

          // Optional: upload profile picture right after registration (S3 + save in DB)
          if (profileImageFile.value) {
            try {
              const formData = new FormData();
              formData.append('image', profileImageFile.value);
              const uploadRes = await fetch(`${API_BASE_URL}/mobile/partner/profile/picture`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: formData
              });
              const uploadData = await uploadRes.json();
              if (uploadRes.ok && uploadData?.success) {
                localStorage.setItem('partner_data', JSON.stringify(uploadData.data.partner));
              } else {
                console.warn('Partner profile picture upload failed:', uploadData?.message);
              }
            } catch (uploadErr) {
              console.warn('Partner profile picture upload error:', uploadErr);
            }
          }

          toast.success('Registration successful!');
          router.push('/partner/dashboard');
        } else {
          toast.error(data.message || 'Registration failed');
        }
      } catch (error) {
        console.error('Registration error:', error);
        toast.error('Network error. Please try again.');
      } finally {
        loading.value = false;
      }
    };

    return () => (
      <div class="min-vh-100 d-flex align-items-center justify-content-center bg-light">
        <div class="container">
          <div class="row justify-content-center">
            <div class="col-md-6 col-lg-4">

              {/* Card */}
              <div class="card border-0 shadow-sm rounded-4">
                <div class="card-body p-4 p-md-5">

                  {/* Header */}
                  <div class="text-center mb-4">
                    <h3 class="fw-bold mb-1">Partner Registration</h3>
                    <p class="text-muted mb-0" style={{ fontSize: '0.95rem' }}>
                      Create your account to continue
                    </p>
                  </div>

                  {/* Form */}
                  <form onSubmit={(e) => { e.preventDefault(); register(); }}>

                    <div class="mb-3">
                      <label class="form-label fw-semibold">Full Name *</label>
                      <input
                        type="text"
                        class="form-control form-control-lg rounded-3"
                        placeholder="Your full name"
                        value={registerForm.value.name}
                        onInput={(e) => (registerForm.value.name = e.target.value)}
                        required
                      />
                    </div>

                    <div class="mb-3">
                      <label class="form-label fw-semibold">Email *</label>
                      <input
                        type="email"
                        class="form-control form-control-lg rounded-3"
                        placeholder="example@gmail.com"
                        value={registerForm.value.email}
                        onInput={(e) => (registerForm.value.email = e.target.value)}
                        required
                      />
                    </div>

                    <div class="mb-3">
                      <label class="form-label fw-semibold">Password *</label>
                      <input
                        type="password"
                        class="form-control form-control-lg rounded-3"
                        placeholder="Create a strong password"
                        value={registerForm.value.password}
                        onInput={(e) => (registerForm.value.password = e.target.value)}
                        required
                      />
                    </div>

                    <div class="mb-3">
                      <label class="form-label fw-semibold">Phone</label>
                      <input
                        type="tel"
                        class="form-control form-control-lg rounded-3"
                        placeholder="Optional"
                        value={registerForm.value.phone}
                        onInput={(e) => (registerForm.value.phone = e.target.value)}
                      />
                    </div>

                    <div class="mb-4">
                      <label class="form-label fw-semibold">Specialization</label>
                      <select
                        class="form-select form-select-lg rounded-3"
                        value={registerForm.value.specialization}
                        onChange={(e) => (registerForm.value.specialization = e.target.value)}
                      >
                        <option value="">Select specialization</option>
                        <option value="Astrology">Astrology</option>
                        <option value="Numerology">Numerology</option>
                        <option value="Tarot Reading">Tarot Reading</option>
                        <option value="Palmistry">Palmistry</option>
                        <option value="Vastu">Vastu</option>
                        <option value="Spiritual Counseling">Spiritual Counseling</option>
                      </select>
                    </div>

                    <div class="mb-4">
                      <label class="form-label fw-semibold">Profile Picture (optional)</label>
                      <input
                        type="file"
                        class="form-control form-control-lg rounded-3"
                        accept="image/*"
                        onChange={(e) => { profileImageFile.value = e.target.files?.[0] || null; }}
                      />
                      <small class="text-muted">This will be saved to S3 and stored in your profile.</small>
                    </div>

                    <button
                      type="submit"
                      class="btn btn-dark btn-lg w-100 rounded-3"
                      disabled={loading.value}
                    >
                      {loading.value ? 'Creating Account...' : 'Create Account'}
                    </button>
                  </form>

                  {/* Footer */}
                  <div class="text-center mt-4">
                    <span class="text-muted">Already have an account?</span>
                    <a href="/partner/login" class="ms-1 fw-semibold text-decoration-none">
                      Sign In
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
