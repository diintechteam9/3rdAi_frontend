import { ref, onMounted, watch } from 'vue';
import api from '../../services/api.js';


export default {
  name: 'Settings',
  setup() {
    const clients = ref([]);
    const selectedClientId = ref(''); // '' = app-level, or client _id
    const geminiMasked = ref(''); // kept for backward compatibility, but now used for OpenAI
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
        // API returns body directly: { success, data: { clients } }
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
        // Use OpenAI key endpoint (per client or app-level)
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
        // Use OpenAI key endpoint (per client or app-level)
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

    return () => (
      <div class="card">
        <div class="card-body">
          <h1 class="card-title">Settings</h1>

          <div class="mt-4" style="max-width: 560px;">
            <h5 class="mb-3">Conversation summary (OpenAI API)</h5>
            <p class="text-muted small mb-3">
              Set an OpenAI API key per client or one default for the app. The key is used to generate a short summary of topics discussed after each conversation ends. For a selected client, only that client&apos;s users will use that client&apos;s key.
            </p>

            {clientsLoadError && (
              <div class="alert alert-warning small">{clientsLoadError}</div>
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

            {geminiLoadError && (
              <div class="alert alert-warning small">{geminiLoadError}</div>
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
                aria-label="Gemini API key"
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
            {geminiSaveMessage && (
              <div class="small mt-2 text-success">{geminiSaveMessage}</div>
            )}
            <p class="small text-muted mt-2 mb-0">
              Get an API key from{' '}
              <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer">Google AI Studio</a>.
            </p>
          </div>
        </div>
      </div>
    );
  }
};
