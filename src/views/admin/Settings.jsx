import { ref, onMounted, watch } from 'vue';
import api from '../../services/api.js';

export default {
  name: 'Settings',
  setup() {
    const activeTab = ref('api');
    const clients = ref([]);
    const selectedClientId = ref('');
    const geminiMasked = ref('');
    const geminiConfigured = ref(false);
    const geminiNewKey = ref('');
    const geminiSaving = ref(false);
    const geminiLoadError = ref('');
    const geminiSaveMessage = ref('');
    const clientsLoadError = ref('');

    async function loadClients() {
      clientsLoadError.value = '';
      try {
        const res = await api.getClients();
        if (res?.success && res?.data?.clients) {
          clients.value = res.data.clients;
        }
      } catch (e) {
        clientsLoadError.value = e?.message || 'Failed to load clients';
      }
    }

    async function loadGeminiKey() {
      geminiLoadError.value = '';
      try {
        const clientId = selectedClientId.value || null;
        const res = await api.getOpenAIApiKey(clientId);
        if (res?.success && res?.data) {
          geminiConfigured.value = res.data.configured;
          geminiMasked.value = res.data.masked || '';
        }
      } catch (e) {
        geminiLoadError.value = e?.message || 'Failed to load Gemini API key status';
      }
    }

    async function saveGeminiKey() {
      geminiSaveMessage.value = '';
      geminiSaving.value = true;
      try {
        const clientId = selectedClientId.value || null;
        const res = await api.updateOpenAIApiKey(geminiNewKey.value, clientId);
        if (res?.success) {
          geminiSaveMessage.value = res.message || 'OpenAI API key updated successfully.';
          geminiConfigured.value = res.data?.configured ?? !!geminiNewKey.value;
          geminiMasked.value = res.data?.masked || '';
          geminiNewKey.value = '';
          await loadGeminiKey();
        } else {
          geminiSaveMessage.value = res?.data?.message || 'Update failed';
        }
      } catch (e) {
        geminiSaveMessage.value = e?.message || 'Failed to update API key';
      } finally {
        geminiSaving.value = false;
      }
    }

    onMounted(async () => {
      await loadClients();
      await loadGeminiKey();
    });

    watch(selectedClientId, () => {
      loadGeminiKey();
    });

    const renderApiSettings = () => (
      <div class="mt-4" style="max-width: 560px;">
        <h5 class="mb-3">Conversation summary (OpenAI API)</h5>
        <p class="text-muted small mb-3">
          Set an OpenAI API key per client or one default for the app. The key is used to generate a short summary of topics discussed after each conversation ends. For a selected client, only that client's users will use that client's key.
        </p>

        {clientsLoadError.value && (
          <div class="alert alert-warning small">{clientsLoadError.value}</div>
        )}

        <div class="mb-3">
          <label class="form-label small fw-semibold text-muted">Client</label>
          <select
            class="form-select"
            value={selectedClientId.value}
            onInput={e => { selectedClientId.value = e.target.value; }}
            aria-label="Select client for API key"
          >
            <option value="">Default (app-level)</option>
            {clients.value.map(c => (
              <option key={c._id} value={c._id}>
                {c.businessName || c.fullName || c.clientId || c.email} ({c.clientId || c._id})
              </option>
            ))}
          </select>
        </div>

        {geminiLoadError.value && (
          <div class="alert alert-warning small">{geminiLoadError.value}</div>
        )}
        <div class="mb-2">
          <span class="text-muted">Current key: </span>
          {geminiConfigured.value ? (
            <code>{geminiMasked.value || '****'}</code>
          ) : (
            <span class="text-muted">Not set</span>
          )}
          {selectedClientId.value && (
            <span class="text-muted small ms-2">(for selected client)</span>
          )}
        </div>
        <div class="input-group mb-2">
          <input
            type="password"
            class="form-control"
            placeholder={selectedClientId.value ? 'Enter Gemini API key for this client' : 'Enter new Gemini API key to update'}
            value={geminiNewKey.value}
            onInput={e => { geminiNewKey.value = e.target.value; }}
          />
          <button
            type="button"
            class="btn btn-primary"
            disabled={geminiSaving.value}
            onClick={saveGeminiKey}
          >
            {geminiSaving.value ? 'Saving…' : 'Save key'}
          </button>
        </div>
        {geminiSaveMessage.value && (
          <div class="small mt-2 text-success">{geminiSaveMessage.value}</div>
        )}
        <p class="small text-muted mt-2 mb-0">
          Get an API key from{' '}
          <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer">Google AI Studio</a>.
        </p>
      </div>
    );

    const renderSupport = () => (
      <div class="mt-4">
        <h5 class="mb-4">🎧 Admin Support</h5>
        <div class="row g-4">
          <div class="col-md-6">
            <div class="p-4 border rounded-4 bg-light">
              <h6 class="fw-bold">Technical Support</h6>
              <p class="text-muted small">For server or API issues.</p>
              <a href="mailto:admin-tech@3rdai.com" class="btn btn-sm btn-outline-primary">Open Ticket</a>
            </div>
          </div>
          <div class="col-md-6">
            <div class="p-4 border rounded-4 bg-light">
              <h6 class="fw-bold">Billing Support</h6>
              <p class="text-muted small">For payment or subscription queries.</p>
              <a href="mailto:billing@3rdai.com" class="btn btn-sm btn-outline-success">Contact Billing</a>
            </div>
          </div>
        </div>
      </div>
    );

    const renderHelp = () => (
      <div class="mt-4">
        <h5 class="mb-4">❓ Admin Help Center</h5>
        <div class="list-group list-group-flush">
          <div class="list-group-item border-0 px-0 mb-3">
            <h6 class="fw-bold mb-1">Managing Clients</h6>
            <p class="text-muted small mb-0">Learn how to create, edit, and manage city boundaries for clients.</p>
          </div>
          <div class="list-group-item border-0 px-0 mb-3">
            <h6 class="fw-bold mb-1">API Documentation</h6>
            <p class="text-muted small mb-0">Reference for all admin and client-facing API endpoints.</p>
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
                class={`px-4 py-3 border-0 bg-transparent fw-bold ${activeTab.value === 'api' ? 'text-primary border-bottom border-primary border-3' : 'text-muted'}`}
                onClick={() => activeTab.value = 'api'}
              >
                ⚙️ API Settings
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
            {activeTab.value === 'api' && renderApiSettings()}
            {activeTab.value === 'support' && renderSupport()}
            {activeTab.value === 'help' && renderHelp()}
          </div>
        </div>
      </div>
    );
  }
};

