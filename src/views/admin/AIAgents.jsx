import { ref, reactive, onMounted, computed } from 'vue';
import api from '../../services/api.js';

export default {
  name: 'AIAgents',
  setup() {
    const agents = ref([]);
    const loading = ref(false);
    const saving = ref(false);
    const error = ref(null);
    const success = ref(null);

    const editingId = ref(null);

    const form = reactive({
      name: '',
      displayName: '',
      description: '',
      systemPrompt: '',
      firstMessage: '',
      voiceName: 'krishna1',
      isActive: true
    });

    const voiceOptions = [
      { value: 'krishna1', label: 'Krishna 1 (Adam)' },
      { value: 'krishna2', label: 'Krishna 2 (Antoni)' },
      { value: 'krishna3', label: 'Krishna 3 (Arnold)' },
      { value: 'rashmi1', label: 'Rashmi 1 (Rachel)' },
      { value: 'rashmi2', label: 'Rashmi 2 (Domi)' },
      { value: 'rashmi3', label: 'Rashmi 3 (Bella)' }
    ];

    const isEditing = computed(() => !!editingId.value);

    const resetForm = () => {
      editingId.value = null;
      form.name = '';
      form.displayName = '';
      form.description = '';
      form.systemPrompt = '';
      form.firstMessage = '';
      form.voiceName = 'krishna1';
      form.isActive = true;
      error.value = null;
      success.value = null;
    };

    const loadAgents = async () => {
      loading.value = true;
      error.value = null;
      try {
        const { data } = await api.get('/admin/agents');
        agents.value = data?.data?.agents || [];
      } catch (e) {
        console.error('Failed to load agents', e);
        error.value = e.message || 'Failed to load agents';
      } finally {
        loading.value = false;
      }
    };

    const onEdit = (agent) => {
      editingId.value = agent._id;
      form.name = agent.name || '';
      form.displayName = agent.displayName || '';
      form.description = agent.description || '';
      form.systemPrompt = agent.systemPrompt || '';
      form.firstMessage = agent.firstMessage || '';
      form.voiceName = agent.voiceName || 'krishna1';
      form.isActive = agent.isActive ?? true;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const onDelete = async (agent) => {
      if (!confirm(`Delete agent "${agent.displayName || agent.name}"?`)) return;
      error.value = null;
      success.value = null;
      try {
        await api.delete(`/admin/agents/${agent._id}`);
        success.value = 'Agent deleted successfully';
        await loadAgents();
        if (editingId.value === agent._id) resetForm();
      } catch (e) {
        console.error('Failed to delete agent', e);
        error.value = e.message || 'Failed to delete agent';
      }
    };

    const onSubmit = async (evt) => {
      evt?.preventDefault();
      saving.value = true;
      error.value = null;
      success.value = null;

      const payload = {
        name: form.name.trim(),
        displayName: form.displayName.trim() || form.name.trim(),
        description: form.description.trim(),
        systemPrompt: form.systemPrompt.trim(),
        firstMessage: form.firstMessage.trim(),
        voiceName: form.voiceName,
        isActive: form.isActive
      };

      if (!payload.name) {
        error.value = 'Name is required';
        saving.value = false;
        return;
      }

      try {
        if (editingId.value) {
          await api.put(`/admin/agents/${editingId.value}`, payload);
          success.value = 'Agent updated successfully';
        } else {
          await api.post('/admin/agents', payload);
          success.value = 'Agent created successfully';
        }
        await loadAgents();
        resetForm();
      } catch (e) {
        console.error('Failed to save agent', e);
        error.value = e.responseData?.message || e.message || 'Failed to save agent';
      } finally {
        saving.value = false;
      }
    };

    onMounted(loadAgents);

    return () => (
      <div class="container-fluid">
        <div class="row">
          <div class="col-lg-5 mb-4">
            <div class="card shadow-sm">
              <div class="card-body">
                <div class="d-flex justify-content-between align-items-center mb-3">
                  <h5 class="card-title mb-0">
                    {isEditing.value ? 'Edit AI Agent' : 'Create AI Agent'}
                  </h5>
                  {isEditing.value && (
                    <button class="btn btn-sm btn-outline-secondary" type="button" onClick={resetForm}>
                      Cancel edit
                    </button>
                  )}
                </div>

                {error.value && (
                  <div class="alert alert-danger py-2">{error.value}</div>
                )}
                {success.value && (
                  <div class="alert alert-success py-2">{success.value}</div>
                )}

                <form onSubmit={onSubmit}>
                  <div class="mb-3">
                    <label class="form-label">Internal Name *</label>
                    <input
                      type="text"
                      class="form-control"
                      placeholder="e.g. krishna_spiritual_guide"
                      value={form.name}
                      onInput={e => (form.name = e.target.value)}
                    />
                  </div>

                  <div class="mb-3">
                    <label class="form-label">Display Name</label>
                    <input
                      type="text"
                      class="form-control"
                      placeholder="Shown in UI (optional)"
                      value={form.displayName}
                      onInput={e => (form.displayName = e.target.value)}
                    />
                  </div>

                  <div class="mb-3">
                    <label class="form-label">Description</label>
                    <textarea
                      class="form-control"
                      rows="2"
                      placeholder="Short description for admins"
                      value={form.description}
                      onInput={e => (form.description = e.target.value)}
                    />
                  </div>

                  <div class="mb-3">
                    <label class="form-label">System Prompt</label>
                    <textarea
                      class="form-control"
                      rows="4"
                      placeholder="How this agent should behave (will be sent as system prompt)"
                      value={form.systemPrompt}
                      onInput={e => (form.systemPrompt = e.target.value)}
                    />
                  </div>

                  <div class="mb-3">
                    <label class="form-label">First Message (optional)</label>
                    <textarea
                      class="form-control"
                      rows="2"
                      placeholder="Greeting spoken/sent when session starts"
                      value={form.firstMessage}
                      onInput={e => (form.firstMessage = e.target.value)}
                    />
                  </div>

                  <div class="mb-3">
                    <label class="form-label">Voice</label>
                    <select
                      class="form-select"
                      value={form.voiceName}
                      onChange={e => (form.voiceName = e.target.value)}
                    >
                      {voiceOptions.map(v => (
                        <option value={v.value}>{v.label}</option>
                      ))}
                    </select>
                  </div>

                  <div class="form-check form-switch mb-3">
                    <input
                      class="form-check-input"
                      type="checkbox"
                      id="agent-active-switch"
                      checked={form.isActive}
                      onChange={e => (form.isActive = e.target.checked)}
                    />
                    <label class="form-check-label" for="agent-active-switch">
                      Active (available to clients)
                    </label>
                  </div>

                  <button
                    type="submit"
                    class="btn btn-primary"
                    disabled={saving.value}
                  >
                    {saving.value
                      ? isEditing.value ? 'Saving...' : 'Creating...'
                      : isEditing.value ? 'Save Changes' : 'Create Agent'}
                  </button>
                </form>
              </div>
            </div>
          </div>

          <div class="col-lg-7 mb-4">
            <div class="card shadow-sm">
              <div class="card-body">
                <div class="d-flex justify-content-between align-items-center mb-3">
                  <h5 class="card-title mb-0">Existing Agents</h5>
                  <button class="btn btn-sm btn-outline-secondary" type="button" onClick={loadAgents}>
                    Refresh
                  </button>
                </div>

                {loading.value ? (
                  <p>Loading agents...</p>
                ) : agents.value.length === 0 ? (
                  <p class="text-muted mb-0">No agents created yet.</p>
                ) : (
                  <div class="table-responsive">
                    <table class="table table-sm align-middle">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Voice</th>
                          <th>Status</th>
                          <th style="width: 140px;">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {agents.value.map(agent => (
                          <tr key={agent._id}>
                            <td>
                              <div class="fw-semibold">{agent.displayName || agent.name}</div>
                              <div class="text-muted small">{agent.name}</div>
                            </td>
                            <td class="text-nowrap">
                              <span class="badge bg-light text-dark">
                                {agent.voiceName}
                              </span>
                            </td>
                            <td>
                              {agent.isActive ? (
                                <span class="badge bg-success">Active</span>
                              ) : (
                                <span class="badge bg-secondary">Inactive</span>
                              )}
                            </td>
                            <td>
                              <div class="btn-group btn-group-sm">
                                <button
                                  type="button"
                                  class="btn btn-outline-primary"
                                  onClick={() => onEdit(agent)}
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  class="btn btn-outline-danger"
                                  onClick={() => onDelete(agent)}
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
};
