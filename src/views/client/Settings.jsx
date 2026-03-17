import { ref } from 'vue';

export default {
  name: 'ClientSettings',
  setup() {
    const activeTab = ref('general');

    const renderGeneralSettings = () => (
      <div class="settings-content">
        <h5 class="mb-4">⚙️ General Settings</h5>
        <div class="row g-3">
          <div class="col-md-6">
            <label class="form-label">Language</label>
            <select class="form-select">
              <option selected>English</option>
              <option>Hindi</option>
            </select>
          </div>
          <div class="col-md-6">
            <label class="form-label">Timezone</label>
            <select class="form-select">
              <option selected>IST (UTC+5:30)</option>
            </select>
          </div>
          <div class="col-12 mt-4">
            <button class="btn btn-primary">Save Changes</button>
          </div>
        </div>
      </div>
    );

    const renderSupport = () => (
      <div class="settings-content">
        <h5 class="mb-4">🎧 Support & Assistance</h5>
        <div class="row g-4">
          <div class="col-md-6">
            <div class="p-4 border rounded-4 bg-light h-100">
              <h6 class="fw-bold"><i class="bi bi-envelope-fill me-2 text-primary"></i>Email Support</h6>
              <p class="text-muted small">Expect a response within 24 hours.</p>
              <a href="mailto:support@3rdai.com" class="btn btn-sm btn-outline-primary">Contact via Email</a>
            </div>
          </div>
          <div class="col-md-6">
            <div class="p-4 border rounded-4 bg-light h-100">
              <h6 class="fw-bold"><i class="bi bi-telephone-fill me-2 text-success"></i>Phone Support</h6>
              <p class="text-muted small">Available Mon-Fri, 9AM to 6PM.</p>
              <a href="tel:+911234567890" class="btn btn-sm btn-outline-success">Call +91-123-456-7890</a>
            </div>
          </div>
        </div>
      </div>
    );

    const renderHelp = () => (
      <div class="settings-content">
        <h5 class="mb-4">❓ Help Center</h5>
        <div class="accordion" id="helpAccordion">
          <div class="accordion-item border-0 mb-3 shadow-sm rounded-4 overflow-hidden">
            <h2 class="accordion-header">
              <button class="accordion-button collapsed fw-bold" type="button" data-bs-toggle="collapse" data-bs-target="#help1">
                How to add a new city boundary?
              </button>
            </h2>
            <div id="help1" class="accordion-collapse collapse" data-bs-parent="#helpAccordion">
              <div class="accordion-body text-muted">
                Go to the Geo Tracking section and upload your KML or GeoJSON file to set the boundaries for your city.
              </div>
            </div>
          </div>
          <div class="accordion-item border-0 mb-3 shadow-sm rounded-4 overflow-hidden">
            <h2 class="accordion-header">
              <button class="accordion-button collapsed fw-bold" type="button" data-bs-toggle="collapse" data-bs-target="#help2">
                Managing Staff access
              </button>
            </h2>
            <div id="help2" class="accordion-collapse collapse" data-bs-parent="#helpAccordion">
              <div class="accordion-body text-muted">
                In the Staff section, you can approve or revoke partner applications and manage their permissions.
              </div>
            </div>
          </div>
        </div>
      </div>
    );

    return () => (
      <div class="container-fluid p-0">
        <div class="card border-0 shadow-sm rounded-4 overflow-hidden">
          <div class="card-header bg-white border-bottom p-0">
            <div class="d-flex overflow-auto">
              <button 
                class={`px-4 py-3 border-0 bg-transparent fw-bold ${activeTab.value === 'general' ? 'text-primary border-bottom border-primary border-3' : 'text-muted'}`}
                onClick={() => activeTab.value = 'general'}
              >
                ⚙️ Settings
              </button>
              <button 
                class={`px-4 py-3 border-0 bg-transparent fw-bold ${activeTab.value === 'support' ? 'text-primary border-bottom border-primary border-3' : 'text-muted'}`}
                onClick={() => activeTab.value = 'support'}
              >
                🎧 Support
              </button>
              <button 
                class={`px-4 py-3 border-0 bg-transparent fw-bold ${activeTab.value === 'help' ? 'text-primary border-bottom border-primary border-3' : 'text-muted'}`}
                onClick={() => activeTab.value = 'help'}
              >
                ❓ Help
              </button>
            </div>
          </div>
          <div class="card-body p-4">
            {activeTab.value === 'general' && renderGeneralSettings()}
            {activeTab.value === 'support' && renderSupport()}
            {activeTab.value === 'help' && renderHelp()}
          </div>
        </div>
      </div>
    );
  }
};
