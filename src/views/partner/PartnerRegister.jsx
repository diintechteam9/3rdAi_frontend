import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';

export default {
  name: 'PartnerRegister',
  setup() {
    const router = useRouter();
    const toast = useToast();

    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

    const loading = ref(false);
    const registerForm = ref({
      name: '',
      designation: '',
      area: '',
      state: '',
      email: '',
      phone: '',
      policeId: '',
      experience: '',
      password: '',
      clientId: ''
    });

    // Image upload state
    const profileImageFile = ref(null);
    const profileImagePreview = ref(null);

    const indianStates = [
      'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
      'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
      'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
      'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
      'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
      'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
      'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'
    ];

    const handleImageChange = (e) => {
      const file = e.target.files[0];
      if (file) {
        if (file.size > 5 * 1024 * 1024) {
          toast.error('Image size must be less than 5MB');
          return;
        }
        profileImageFile.value = file;
        profileImagePreview.value = URL.createObjectURL(file);
      }
    };

    const register = async () => {
      const { name, designation, area, state, email, phone, policeId, experience, password, clientId } = registerForm.value;

      if (!name || !designation || !area || !state || !email || !phone || !policeId || !experience || !password || !clientId) {
        toast.error('Please fill all required fields');
        return;
      }

      loading.value = true;
      try {
        const formData = new FormData();
        Object.entries(registerForm.value).forEach(([key, value]) => {
          formData.append(key, value);
        });

        if (profileImageFile.value) {
          formData.append('profileImage', profileImageFile.value);
        }

        const response = await fetch(`${API_BASE_URL}/partners/register`, {
          method: 'POST',
          // NO 'Content-Type': 'application/json' here! Fetch sets boundary automatically for FormData
          body: formData
        });

        const data = await response.json();

        if (data.success) {
          localStorage.setItem('partner_pending_email', registerForm.value.email);
          toast.success('Registration successful! Waiting for admin approval.');
          router.push('/partner/waiting-approval');
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
      <div class="min-vh-100 d-flex align-items-center justify-content-center py-4"
        style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' }}>
        <div class="container">
          <div class="row justify-content-center">
            <div class="col-md-7 col-lg-6 col-xl-5">

              <div class="card border-0 rounded-4 shadow-lg" style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1) !important' }}>
                <div class="card-body p-4 p-md-5">

                  {/* Header */}
                  <div class="text-center mb-4">
                    <div class="mb-3">
                      <img src="/logo.png" alt="3rdAI Logo" style={{ width: '80px', height: '80px', borderRadius: '16px', objectFit: 'contain' }} />
                    </div>
                    <h4 class="fw-bold mb-1 text-white">Partner Registration</h4>
                    <p class="mb-0" style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.5)' }}>
                      Create your account to get started
                    </p>
                  </div>

                  {/* Form */}
                  <form onSubmit={(e) => { e.preventDefault(); register(); }}>

                    {/* Image Upload */}
                    <div class="d-flex flex-column align-items-center mb-4">
                      <div
                        class="position-relative"
                        style={{ width: '90px', height: '90px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)', border: '2px dashed rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden' }}
                        onClick={() => document.getElementById('profileImageInput').click()}
                      >
                        {profileImagePreview.value ? (
                          <img src={profileImagePreview.value} alt="Profile Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <svg width="32" height="32" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                            <circle cx="12" cy="13" r="4" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                        <div class="position-absolute w-100 h-100 d-flex align-items-center justify-content-center" style={{ background: 'rgba(0,0,0,0.5)', opacity: 0, transition: 'opacity 0.2s' }} onMouseEnter={e => e.currentTarget.style.opacity = 1} onMouseLeave={e => e.currentTarget.style.opacity = 0}>
                          <span style={{ fontSize: '11px', color: 'white', fontWeight: '500' }}>Upload</span>
                        </div>
                      </div>
                      <span class="mt-2" style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>Profile Picture (Optional)</span>
                      <input
                        type="file"
                        id="profileImageInput"
                        class="d-none"
                        accept="image/*"
                        onChange={handleImageChange}
                      />
                    </div>


                    {/* Name */}
                    <div class="mb-3">
                      <label class="form-label fw-semibold" style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.875rem' }}>
                        Full Name <span class="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        class="form-control rounded-3"
                        style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: 'white', padding: '0.65rem 1rem' }}
                        placeholder="Enter your full name"
                        value={registerForm.value.name}
                        onInput={(e) => (registerForm.value.name = e.target.value)}
                        required
                      />
                    </div>

                    {/* Designation */}
                    <div class="mb-3">
                      <label class="form-label fw-semibold" style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.875rem' }}>
                        Designation <span class="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        class="form-control rounded-3"
                        style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: 'white', padding: '0.65rem 1rem' }}
                        placeholder="e.g. Inspector, Sub-Inspector, DSP"
                        value={registerForm.value.designation}
                        onInput={(e) => (registerForm.value.designation = e.target.value)}
                        required
                      />
                    </div>

                    {/* Area + State in a row */}
                    <div class="row g-3 mb-3">
                      <div class="col-6">
                        <label class="form-label fw-semibold" style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.875rem' }}>
                          Area <span class="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          class="form-control rounded-3"
                          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: 'white', padding: '0.65rem 1rem' }}
                          placeholder="e.g. Connaught Place"
                          value={registerForm.value.area}
                          onInput={(e) => (registerForm.value.area = e.target.value)}
                          required
                        />
                      </div>
                      <div class="col-6">
                        <label class="form-label fw-semibold" style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.875rem' }}>
                          State <span class="text-danger">*</span>
                        </label>
                        <select
                          class="form-select rounded-3"
                          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: registerForm.value.state ? 'white' : 'rgba(255,255,255,0.4)', padding: '0.65rem 1rem' }}
                          value={registerForm.value.state}
                          onChange={(e) => (registerForm.value.state = e.target.value)}
                          required
                        >
                          <option value="" style={{ background: '#1e293b', color: '#aaa' }}>Select State</option>
                          {indianStates.map(s => (
                            <option key={s} value={s} style={{ background: '#1e293b', color: 'white' }}>{s}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Email */}
                    <div class="mb-3">
                      <label class="form-label fw-semibold" style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.875rem' }}>
                        Email Address <span class="text-danger">*</span>
                      </label>
                      <input
                        type="email"
                        class="form-control rounded-3"
                        style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: 'white', padding: '0.65rem 1rem' }}
                        placeholder="example@gmail.com"
                        value={registerForm.value.email}
                        onInput={(e) => (registerForm.value.email = e.target.value)}
                        required
                      />
                    </div>

                    {/* Phone */}
                    <div class="mb-3">
                      <label class="form-label fw-semibold" style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.875rem' }}>
                        Phone Number <span class="text-danger">*</span>
                      </label>
                      <input
                        type="tel"
                        class="form-control rounded-3"
                        style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: 'white', padding: '0.65rem 1rem' }}
                        placeholder="E.g. 9876543210"
                        value={registerForm.value.phone}
                        onInput={(e) => (registerForm.value.phone = e.target.value)}
                        required
                      />
                    </div>

                    {/* Police ID and Experience */}
                    <div class="row g-3 mb-3">
                      <div class="col-6">
                        <label class="form-label fw-semibold" style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.875rem' }}>
                          Police ID <span class="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          class="form-control rounded-3"
                          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: 'white', padding: '0.65rem 1rem' }}
                          placeholder="ID Number"
                          value={registerForm.value.policeId}
                          onInput={(e) => (registerForm.value.policeId = e.target.value)}
                          required
                        />
                      </div>
                      <div class="col-6">
                        <label class="form-label fw-semibold" style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.875rem' }}>
                          Years of Experience <span class="text-danger">*</span>
                        </label>
                        <input
                          type="number"
                          class="form-control rounded-3"
                          min="0"
                          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: 'white', padding: '0.65rem 1rem' }}
                          placeholder="Years"
                          value={registerForm.value.experience}
                          onInput={(e) => (registerForm.value.experience = e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    {/* Password */}
                    <div class="mb-3">
                      <label class="form-label fw-semibold" style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.875rem' }}>
                        Password <span class="text-danger">*</span>
                      </label>
                      <input
                        type="password"
                        class="form-control rounded-3"
                        style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: 'white', padding: '0.65rem 1rem' }}
                        placeholder="Create a strong password"
                        value={registerForm.value.password}
                        onInput={(e) => (registerForm.value.password = e.target.value)}
                        required
                      />
                    </div>

                    {/* Client ID */}
                    <div class="mb-4">
                      <label class="form-label fw-semibold" style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.875rem' }}>
                        Client ID <span class="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        class="form-control rounded-3"
                        style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: 'white', padding: '0.65rem 1rem' }}
                        placeholder="Enter Client ID (e.g. CLI-123456)"
                        value={registerForm.value.clientId}
                        onInput={(e) => (registerForm.value.clientId = e.target.value)}
                        required
                      />
                      <small style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.78rem' }}>
                        Client ID provided by your organization
                      </small>
                    </div>

                    {/* Submit */}
                    <button
                      type="submit"
                      class="btn btn-lg w-100 rounded-3 fw-semibold"
                      disabled={loading.value}
                      style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)', border: 'none', color: 'white', padding: '0.75rem', fontSize: '1rem', transition: 'opacity 0.2s', opacity: loading.value ? 0.7 : 1 }}
                    >
                      {loading.value ? (
                        <span>
                          <span class="spinner-border spinner-border-sm me-2" role="status" />
                          Creating Account...
                        </span>
                      ) : 'Create Account'}
                    </button>
                  </form>

                  {/* Footer */}
                  <div class="text-center mt-4">
                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem' }}>Already have an account? </span>
                    <a href="/partner/login" class="fw-semibold text-decoration-none" style={{ color: '#60a5fa', fontSize: '0.875rem' }}>
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
