import { ref } from 'vue';
import { useRouter, RouterLink } from 'vue-router';
import api from '../../services/api.js';

export default {
  name: 'ClientRegister',
  setup() {
    const router = useRouter();
    const organizationName = ref('');
    const state = ref('');
    const city = ref('');
    const address = ref('');
    const email = ref('');
    const contactNumber = ref('');
    const alternateContact = ref('');
    const password = ref('');
    const confirmPassword = ref('');
    const cityBoundary = ref('Delhi');
    const loading = ref(false);
    const error = ref('');

    const handleRegister = async (e) => {
      e.preventDefault();

      if (password.value !== confirmPassword.value) {
        error.value = 'Passwords do not match';
        return;
      }

      loading.value = true;
      error.value = '';

      try {
        const response = await api.clientRegister(
          email.value,
          password.value,
          organizationName.value,
          state.value,
          city.value,
          address.value,
          contactNumber.value,
          alternateContact.value,
          cityBoundary.value
        );

        alert(response?.message || 'Registration submitted! Please wait for admin approval before logging in.');
        router.push('/client/login');
      } catch (err) {
        error.value = err.message || 'Registration failed';
      } finally {
        loading.value = false;
      }
    };

    return () => (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ background: 'white', borderRadius: '12px', padding: '3rem', width: '100%', maxWidth: '800px', boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)' }}>
          <h1 style={{ textAlign: 'center', marginBottom: '2rem', color: '#1f2937', fontSize: '2rem' }}>Police HQ Registration</h1>
          {error.value && <div class="alert alert-danger">{error.value}</div>}
          <form onSubmit={handleRegister}>
            <div class="row">
              <div class="col-md-6 mb-3">
                <label class="form-label">Organization Name <span class="text-danger">*</span></label>
                <input
                  value={organizationName.value}
                  onInput={(e) => organizationName.value = e.target.value}
                  type="text"
                  class="form-control"
                  required
                  placeholder="Enter organization name"
                />
              </div>
              <div class="col-md-6 mb-3">
                <label class="form-label">Official Email <span class="text-danger">*</span></label>
                <input
                  value={email.value}
                  onInput={(e) => email.value = e.target.value}
                  type="email"
                  class="form-control"
                  required
                  placeholder="Enter official email"
                />
              </div>
            </div>

            <div class="row">
              <div class="col-md-6 mb-3">
                <label class="form-label">State <span class="text-danger">*</span></label>
                <input
                  value={state.value}
                  onInput={(e) => state.value = e.target.value}
                  type="text"
                  class="form-control"
                  required
                  placeholder="Enter state"
                />
              </div>
              <div class="col-md-6 mb-3">
                <label class="form-label">City / Jurisdiction <span class="text-danger">*</span></label>
                <input
                  value={city.value}
                  onInput={(e) => city.value = e.target.value}
                  type="text"
                  class="form-control"
                  required
                  placeholder="Enter city / jurisdiction"
                />
              </div>
            </div>

            <div class="mb-3">
              <label class="form-label">Headquarters Address <span class="text-danger">*</span></label>
              <textarea
                value={address.value}
                onInput={(e) => address.value = e.target.value}
                class="form-control"
                rows="2"
                required
                placeholder="Enter headquarters address"
              />
            </div>

            <div class="row">
              <div class="col-md-6 mb-3">
                <label class="form-label">Official Contact Number <span class="text-danger">*</span></label>
                <input
                  value={contactNumber.value}
                  onInput={(e) => contactNumber.value = e.target.value}
                  type="text"
                  class="form-control"
                  required
                  placeholder="Enter contact number"
                />
              </div>
              <div class="col-md-6 mb-3">
                <label class="form-label">Alternate Contact Number</label>
                <input
                  value={alternateContact.value}
                  onInput={(e) => alternateContact.value = e.target.value}
                  type="text"
                  class="form-control"
                  placeholder="Enter alternate contact number"
                />
              </div>
            </div>

            <div class="mb-3">
              <label class="form-label">Select City Boundary <span class="text-danger">*</span></label>
              <select
                value={cityBoundary.value}
                onChange={(e) => cityBoundary.value = e.target.value}
                class="form-select"
                required
              >
                <option value="Delhi">Delhi</option>
                <option value="Bangalore">Bangalore</option>
              </select>
            </div>

            <div class="row">
              <div class="col-md-6 mb-3">
                <label class="form-label">Password <span class="text-danger">*</span></label>
                <input
                  value={password.value}
                  onInput={(e) => password.value = e.target.value}
                  type="password"
                  class="form-control"
                  required
                  placeholder="Enter password"
                />
              </div>
              <div class="col-md-6 mb-3">
                <label class="form-label">Confirm Password <span class="text-danger">*</span></label>
                <input
                  value={confirmPassword.value}
                  onInput={(e) => confirmPassword.value = e.target.value}
                  type="password"
                  class="form-control"
                  required
                  placeholder="Confirm password"
                />
              </div>
            </div>

            <button type="submit" disabled={loading.value} class="btn btn-primary w-100 mt-3">
              {loading.value ? 'Registering...' : 'Register as Client'}
            </button>
            <p style={{ textAlign: 'center', marginTop: '1.5rem', color: '#6b7280' }}>
              Already registered? <RouterLink to="/client/login" style={{ color: '#6366f1', textDecoration: 'none' }}>Login here</RouterLink>
            </p>
          </form>
        </div>
      </div>
    );
  }
};



