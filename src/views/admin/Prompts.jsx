import { ref, computed, onMounted } from 'vue';
import api from '../../services/api.js';

export default {
  name: 'AdminPrompts',
  setup() {
    const loading = ref(false);
    const error = ref('');
    const prompts = ref([]);
    const formValues = ref({});
    const feedback = ref({});
    const savingKey = ref(null);

    const sortedPrompts = computed(() => {
      return [...prompts.value].sort((a, b) => a.label.localeCompare(b.label));
    });

    const initFormValues = (items) => {
      const nextValues = {};
      items.forEach(prompt => {
        nextValues[prompt.key] = {
          label: prompt.label || '',
          description: prompt.description || '',
          content: prompt.content || ''
        };
      });
      formValues.value = nextValues;
    };

    const loadPrompts = async () => {
      loading.value = true;
      error.value = '';
      feedback.value = {};
      try {
        const res = await api.getAdminPrompts();
        if (res?.success && res?.data?.prompts) {
          prompts.value = res.data.prompts;
          initFormValues(res.data.prompts);
        } else {
          error.value = res?.message || 'Failed to load prompts';
        }
      } catch (err) {
        error.value = err?.message || 'Failed to load prompts';
      } finally {
        loading.value = false;
      }
    };

    const resetPrompt = (key) => {
      const prompt = prompts.value.find(p => p.key === key);
      if (!prompt) return;
      formValues.value = {
        ...formValues.value,
        [key]: {
          label: prompt.label || '',
          description: prompt.description || '',
          content: prompt.content || ''
        }
      };
      feedback.value = {
        ...feedback.value,
        [key]: { type: 'info', message: 'Changes reverted.' }
      };
    };

    const savePrompt = async (key) => {
      const payload = formValues.value[key];
      if (!payload?.content || !payload.content.trim()) {
        feedback.value = {
          ...feedback.value,
          [key]: { type: 'danger', message: 'Content cannot be empty.' }
        };
        return;
      }

      savingKey.value = key;
      feedback.value = { ...feedback.value, [key]: null };

      try {
        const res = await api.updateAdminPrompt(key, {
          label: payload.label,
          description: payload.description,
          content: payload.content
        });
        if (res?.success && res?.data?.prompt) {
          const updated = res.data.prompt;
          prompts.value = prompts.value.map(p => (p.key === key ? updated : p));
          formValues.value = {
            ...formValues.value,
            [key]: {
              label: updated.label || '',
              description: updated.description || '',
              content: updated.content || ''
            }
          };
          feedback.value = {
            ...feedback.value,
            [key]: { type: 'success', message: 'Prompt saved successfully.' }
          };
        } else {
          throw new Error(res?.message || 'Failed to save prompt');
        }
      } catch (err) {
        feedback.value = {
          ...feedback.value,
          [key]: { type: 'danger', message: err?.message || 'Failed to save prompt.' }
        };
      } finally {
        savingKey.value = null;
      }
    };

    onMounted(() => {
      loadPrompts();
    });

    return () => (
      <div class="card border-0 shadow-sm">
        <div class="card-body p-4">
          <div class="d-flex align-items-center justify-content-between mb-3">
            <div>
              <h1 class="h4 mb-1">Prompts</h1>
              <p class="text-muted mb-0">
                Manage AI prompts used across the platform. Updates apply immediately to any new summaries.
              </p>
            </div>
            <button
              type="button"
              class="btn btn-outline-secondary"
              disabled={loading.value}
              onClick={loadPrompts}
            >
              {loading.value ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>

          {error.value && (
            <div class="alert alert-danger">
              <strong>Error:</strong> {error.value}
            </div>
          )}

          {loading.value && prompts.value.length === 0 ? (
            <div class="text-center py-5 text-muted">Loading prompts…</div>
          ) : (
            <div class="d-flex flex-column gap-4">
              {sortedPrompts.value.map(prompt => {
                const formValue = formValues.value[prompt.key] || {
                  label: '',
                  description: '',
                  content: ''
                };
                const promptFeedback = feedback.value[prompt.key];
                return (
                  <div key={prompt.key} class="card border shadow-sm">
                    <div class="card-body p-4">
                      <div class="d-flex justify-content-between align-items-start flex-wrap gap-3 mb-3">
                        <div>
                          <h2 class="h5 mb-1">{formValue.label || prompt.label || prompt.key}</h2>
                          <p class="text-muted small mb-2">{formValue.description || 'No description provided.'}</p>
                          <p class="text-muted small mb-0">
                            <strong>Key:</strong> <code>{prompt.key}</code>
                            {prompt.updatedAt && (
                              <span class="ms-3">
                                <strong>Last updated:</strong>{' '}
                                {new Date(prompt.updatedAt).toLocaleString()}
                              </span>
                            )}
                          </p>
                        </div>
                        <div class="d-flex gap-2">
                          <button
                            type="button"
                            class="btn btn-outline-secondary btn-sm"
                            onClick={() => resetPrompt(prompt.key)}
                            disabled={savingKey.value === prompt.key}
                          >
                            Reset
                          </button>
                          <button
                            type="button"
                            class="btn btn-primary btn-sm"
                            onClick={() => savePrompt(prompt.key)}
                            disabled={savingKey.value === prompt.key}
                          >
                            {savingKey.value === prompt.key ? 'Saving…' : 'Save'}
                          </button>
                        </div>
                      </div>

                      <div class="mb-3">
                        <label class="form-label small fw-semibold text-muted">Label</label>
                        <input
                          type="text"
                          class="form-control"
                          value={formValue.label}
                          onInput={e => {
                            formValues.value = {
                              ...formValues.value,
                              [prompt.key]: {
                                ...formValue,
                                label: e.target.value
                              }
                            };
                          }}
                        />
                      </div>

                      <div class="mb-3">
                        <label class="form-label small fw-semibold text-muted">Description</label>
                        <textarea
                          class="form-control"
                          rows="2"
                          value={formValue.description}
                          onInput={e => {
                            formValues.value = {
                              ...formValues.value,
                              [prompt.key]: {
                                ...formValue,
                                description: e.target.value
                              }
                            };
                          }}
                        />
                      </div>

                      <div class="mb-3">
                        <label class="form-label small fw-semibold text-muted">Prompt</label>
                        <textarea
                          class="form-control font-monospace"
                          rows="6"
                          value={formValue.content}
                          onInput={e => {
                            formValues.value = {
                              ...formValues.value,
                              [prompt.key]: {
                                ...formValue,
                                content: e.target.value
                              }
                            };
                          }}
                        />
                        <div class="form-text">
                          Avoid placeholders like {'{user}'}—write the final instructions for the AI model.
                        </div>
                      </div>

                      {promptFeedback && (
                        <div class={`alert alert-${promptFeedback.type} mb-0`}>
                          {promptFeedback.message}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {sortedPrompts.value.length === 0 && !loading.value && (
                <div class="text-center py-5 text-muted">
                  No prompts configured yet.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }
};
