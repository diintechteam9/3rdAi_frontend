import { ref, onMounted } from 'vue';
import api from '../../services/api.js';

export default {
  name: 'Tools',
  setup() {
    // ===== API Keys State =====
    const openaiKey = ref('');
    const geminiKey = ref('');
    const apiKeySaving = ref({ openai: false, gemini: false });
    const apiKeyMsg = ref({ openai: '', gemini: '' });
    const apiKeyError = ref({ openai: '', gemini: '' });
    const openaiConfigured = ref(false);
    const geminiConfigured = ref(false);

    // ===== AI Provider State =====
    const aiProvider = ref('gemini');
    const providerSaving = ref(false);
    const providerMsg = ref('');
    const providerError = ref('');

    // ===== Prompts State =====
    const prompts = ref([]);
    const loading = ref(true);
    const saving = ref({});
    const editContent = ref({});
    const successMsg = ref({});
    const errorMsg = ref({});

    // Load current API key status
    const loadApiKeyStatus = async () => {
      try {
        const [openaiRes, geminiRes, providerRes] = await Promise.all([
          api.getOpenAIApiKey(),
          api.getGeminiApiKey(),
          api.getAiProvider()
        ]);
        openaiConfigured.value = openaiRes.data?.configured || false;
        geminiConfigured.value = geminiRes.data?.configured || false;
        aiProvider.value = providerRes.data?.aiProvider || 'gemini';
      } catch (e) {
        console.error('Failed to load API key status:', e);
      }
    };

    const saveOpenAIKey = async () => {
      if (!openaiKey.value.trim()) return;
      apiKeySaving.value.openai = true;
      apiKeyMsg.value.openai = '';
      apiKeyError.value.openai = '';
      try {
        await api.updateOpenAIApiKey(openaiKey.value.trim());
        openaiKey.value = '';
        openaiConfigured.value = true;
        apiKeyMsg.value.openai = '✅ OpenAI API key saved!';
        setTimeout(() => { apiKeyMsg.value.openai = ''; }, 3000);
      } catch (e) {
        apiKeyError.value.openai = '❌ ' + (e.message || 'Failed to save');
      } finally {
        apiKeySaving.value.openai = false;
      }
    };

    const saveGeminiKey = async () => {
      if (!geminiKey.value.trim()) return;
      apiKeySaving.value.gemini = true;
      apiKeyMsg.value.gemini = '';
      apiKeyError.value.gemini = '';
      try {
        await api.updateGeminiApiKey(geminiKey.value.trim());
        geminiKey.value = '';
        geminiConfigured.value = true;
        apiKeyMsg.value.gemini = '✅ Gemini API key saved!';
        setTimeout(() => { apiKeyMsg.value.gemini = ''; }, 3000);
      } catch (e) {
        apiKeyError.value.gemini = '❌ ' + (e.message || 'Failed to save');
      } finally {
        apiKeySaving.value.gemini = false;
      }
    };

    const saveAiProvider = async (provider) => {
      providerSaving.value = true;
      providerMsg.value = '';
      providerError.value = '';
      try {
        await api.updateAiProvider(provider);
        aiProvider.value = provider;
        providerMsg.value = `✅ Active AI switched to ${provider === 'openai' ? 'OpenAI' : 'Gemini'}!`;
        setTimeout(() => { providerMsg.value = ''; }, 3000);
      } catch (e) {
        providerError.value = '❌ ' + (e.message || 'Failed to switch provider');
      } finally {
        providerSaving.value = false;
      }
    };

    const loadPrompts = async () => {
      loading.value = true;
      try {
        const res = await api.getAdminPrompts();
        prompts.value = res.data?.prompts || [];
        prompts.value.forEach(p => {
          editContent.value[p.key] = p.content || '';
        });
      } catch (e) {
        console.error('Failed to load prompts:', e);
      } finally {
        loading.value = false;
      }
    };

    const savePrompt = async (prompt) => {
      saving.value[prompt.key] = true;
      successMsg.value[prompt.key] = '';
      errorMsg.value[prompt.key] = '';
      try {
        await api.updateAdminPrompt(prompt.key, {
          content: editContent.value[prompt.key],
          label: prompt.label,
          description: prompt.description
        });
        successMsg.value[prompt.key] = '✅ Saved!';
        setTimeout(() => { successMsg.value[prompt.key] = ''; }, 3000);
      } catch (e) {
        errorMsg.value[prompt.key] = '❌ ' + (e.message || 'Failed to save');
      } finally {
        saving.value[prompt.key] = false;
      }
    };

    onMounted(() => {
      loadApiKeyStatus();
      loadPrompts();
    });

    return () => (
      <div class="container-fluid p-4">
        <h1 class="mb-1">Tools</h1>
        <p class="text-muted mb-4">Manage API keys and AI system prompts.</p>

        {/* ===== API Keys Section ===== */}
        <div class="card mb-4 shadow-sm border-0" style={{ background: 'linear-gradient(135deg, #667eea11, #764ba211)' }}>
          <div class="card-header border-0 d-flex justify-content-between align-items-center" style={{ background: 'transparent' }}>
            <div>
              <h5 class="mb-0">🔑 API Keys & AI Provider</h5>
              <small class="text-muted">Configure AI service API keys and choose the active provider.</small>
            </div>
          </div>
          <div class="card-body">
            {/* Active Provider Switch */}
            <div class="mb-4 p-3 bg-white rounded border border-primary shadow-sm">
              <div class="d-flex align-items-center justify-content-between">
                <div>
                  <h6 class="mb-1 fw-bold text-primary">Active AI Provider</h6>
                  <p class="mb-0 text-muted small">Select which AI service powers the chat and analysis features.</p>
                </div>
                <div class="d-flex gap-2 align-items-center">
                  <div class="btn-group" role="group">
                    <button
                      type="button"
                      class={`btn ${aiProvider.value === 'openai' ? 'btn-primary active' : 'btn-outline-primary'}`}
                      onClick={() => saveAiProvider('openai')}
                      disabled={providerSaving.value || aiProvider.value === 'openai'}
                    >
                      🤖 OpenAI
                    </button>
                    <button
                      type="button"
                      class={`btn ${aiProvider.value === 'gemini' ? 'btn-primary active' : 'btn-outline-primary'}`}
                      onClick={() => saveAiProvider('gemini')}
                      disabled={providerSaving.value || aiProvider.value === 'gemini'}
                    >
                      ✨ Gemini
                    </button>
                  </div>
                  {providerSaving.value && <div class="spinner-border spinner-border-sm text-primary"></div>}
                </div>
              </div>
              {providerMsg.value && <div class="text-success small mt-2 fw-medium">{providerMsg.value}</div>}
              {providerError.value && <div class="text-danger small mt-2 fw-medium">{providerError.value}</div>}
            </div>

            <div class="row g-3">

              {/* OpenAI Key */}
              <div class="col-md-6">
                <div class="p-3 border rounded bg-white">
                  <div class="d-flex align-items-center gap-2 mb-2">
                    <span style={{ fontSize: '20px' }}>🤖</span>
                    <div>
                      <strong>OpenAI API Key</strong>
                      <div>
                        {openaiConfigured.value
                          ? <span class="badge bg-success">✓ Configured</span>
                          : <span class="badge bg-danger">Not configured</span>
                        }
                      </div>
                    </div>
                  </div>
                  <div class="input-group">
                    <input
                      type="password"
                      class="form-control"
                      placeholder="sk-xxxxxxxxxxxxxxxxx"
                      value={openaiKey.value}
                      onInput={(e) => openaiKey.value = e.target.value}
                    />
                    <button
                      class="btn btn-primary"
                      onClick={saveOpenAIKey}
                      disabled={apiKeySaving.value.openai || !openaiKey.value.trim()}
                    >
                      {apiKeySaving.value.openai ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                  {apiKeyMsg.value.openai && <div class="text-success small mt-1">{apiKeyMsg.value.openai}</div>}
                  {apiKeyError.value.openai && <div class="text-danger small mt-1">{apiKeyError.value.openai}</div>}
                </div>
              </div>

              {/* Gemini Key */}
              <div class="col-md-6">
                <div class="p-3 border rounded bg-white">
                  <div class="d-flex align-items-center gap-2 mb-2">
                    <span style={{ fontSize: '20px' }}>✨</span>
                    <div>
                      <strong>Gemini API Key</strong>
                      <div>
                        {geminiConfigured.value
                          ? <span class="badge bg-success">✓ Configured</span>
                          : <span class="badge bg-danger">Not configured</span>
                        }
                      </div>
                    </div>
                  </div>
                  <div class="input-group">
                    <input
                      type="password"
                      class="form-control"
                      placeholder="AIza-xxxxxxxxxxxxxxxxx"
                      value={geminiKey.value}
                      onInput={(e) => geminiKey.value = e.target.value}
                    />
                    <button
                      class="btn btn-primary"
                      onClick={saveGeminiKey}
                      disabled={apiKeySaving.value.gemini || !geminiKey.value.trim()}
                    >
                      {apiKeySaving.value.gemini ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                  {apiKeyMsg.value.gemini && <div class="text-success small mt-1">{apiKeyMsg.value.gemini}</div>}
                  {apiKeyError.value.gemini && <div class="text-danger small mt-1">{apiKeyError.value.gemini}</div>}
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* ===== Prompts Section ===== */}
        <h5 class="mb-3">🧠 AI System Prompts</h5>

        {loading.value ? (
          <div class="text-center py-4">
            <div class="spinner-border text-primary" role="status"></div>
            <p class="mt-2 text-muted">Loading prompts...</p>
          </div>
        ) : prompts.value.length === 0 ? (
          <div class="alert alert-warning">No prompts found.</div>
        ) : (
          <div>
            {prompts.value.map(prompt => (
              <div key={prompt.key} class="card mb-4 shadow-sm">
                <div class="card-header bg-light d-flex align-items-center justify-content-between">
                  <div>
                    <h5 class="mb-0">{prompt.label || prompt.key}</h5>
                    {prompt.description && <small class="text-muted">{prompt.description}</small>}
                  </div>
                  <span class="badge bg-secondary">{prompt.key}</span>
                </div>
                <div class="card-body">
                  <textarea
                    class="form-control font-monospace"
                    rows="8"
                    value={editContent.value[prompt.key]}
                    onInput={(e) => editContent.value[prompt.key] = e.target.value}
                    placeholder="Enter system prompt..."
                    style={{ fontSize: '13px', lineHeight: '1.6', resize: 'vertical' }}
                  />
                  <div class="d-flex align-items-center gap-2 mt-2">
                    <button
                      class="btn btn-primary btn-sm"
                      onClick={() => savePrompt(prompt)}
                      disabled={saving.value[prompt.key]}
                    >
                      {saving.value[prompt.key] ? 'Saving...' : 'Save Prompt'}
                    </button>
                    {successMsg.value[prompt.key] && <span class="text-success small">{successMsg.value[prompt.key]}</span>}
                    {errorMsg.value[prompt.key] && <span class="text-danger small">{errorMsg.value[prompt.key]}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }
};
