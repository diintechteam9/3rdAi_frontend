import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { ArrowLeftIcon, PlusIcon, ChartBarIcon, EyeIcon, PlayIcon, PauseIcon, DocumentTextIcon } from '@heroicons/vue/24/outline';

export default {
  name: 'ClientSurvey',
  setup() {
    const router = useRouter();
    const surveys = ref([
      {
        id: 1,
        title: 'Customer Satisfaction Survey',
        description: 'Help us improve our services',
        status: 'active',
        questions: 8,
        responses: 245,
        completionRate: 78,
        createdAt: '2024-01-15',
        expiresAt: '2024-02-15',
        type: 'feedback'
      },
      {
        id: 2,
        title: 'Product Feature Request',
        description: 'What features would you like to see next?',
        status: 'draft',
        questions: 5,
        responses: 0,
        completionRate: 0,
        createdAt: '2024-01-20',
        expiresAt: '2024-03-01',
        type: 'research'
      },
      {
        id: 3,
        title: 'Brand Awareness Study',
        description: 'Understanding market perception',
        status: 'completed',
        questions: 12,
        responses: 500,
        completionRate: 85,
        createdAt: '2023-12-01',
        expiresAt: '2024-01-01',
        type: 'market_research'
      }
    ]);

    const showCreateModal = ref(false);
    const selectedSurvey = ref(null);
    const newSurvey = ref({
      title: '',
      description: '',
      type: 'feedback',
      expiresAt: '',
      questions: []
    });

    const goBack = () => {
      router.push('/client/tools');
    };

    const createSurvey = () => {
      surveys.value.unshift({
        id: Date.now(),
        ...newSurvey.value,
        status: 'draft',
        questions: 0,
        responses: 0,
        completionRate: 0,
        createdAt: new Date().toISOString().split('T')[0]
      });
      newSurvey.value = {
        title: '', description: '', type: 'feedback', expiresAt: '', questions: []
      };
      showCreateModal.value = false;
    };

    const toggleSurveyStatus = (survey) => {
      if (survey.status === 'active') {
        survey.status = 'paused';
      } else if (survey.status === 'paused' || survey.status === 'draft') {
        survey.status = 'active';
      }
    };

    const getStatusBadge = (status) => {
      const badges = {
        active: 'bg-success',
        paused: 'bg-warning',
        completed: 'bg-info',
        draft: 'bg-secondary'
      };
      return badges[status] || 'bg-secondary';
    };

    const getTypeLabel = (type) => {
      const types = {
        feedback: 'Customer Feedback',
        research: 'Product Research',
        market_research: 'Market Research',
        nps: 'NPS Survey'
      };
      return types[type] || type;
    };

    const viewSurvey = (survey) => {
      selectedSurvey.value = survey;
    };

    return () => (
      <div class="container-fluid">
        <div class="row">
          <div class="col-12">
            <div class="d-flex align-items-center mb-4">
              <button 
                class="btn btn-outline-secondary me-3" 
                onClick={goBack}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <ArrowLeftIcon style={{ width: '1rem', height: '1rem' }} />
                Back to Tools
              </button>
              <div class="flex-grow-1">
                <h1 class="mb-0 text-primary">Customer Surveys</h1>
                <p class="text-muted mb-0">Create surveys and collect valuable customer insights</p>
              </div>
              <button 
                class="btn btn-primary"
                onClick={() => showCreateModal.value = true}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <PlusIcon style={{ width: '1rem', height: '1rem' }} />
                Create Survey
              </button>
            </div>

            {/* Survey Stats */}
            <div class="row mb-4">
              <div class="col-md-3">
                <div class="card border-0 shadow-sm">
                  <div class="card-body text-center">
                    <ChartBarIcon style={{ width: '2rem', height: '2rem', color: '#007bff' }} />
                    <h3 class="mt-2">{surveys.value.filter(s => s.status === 'active').length}</h3>
                    <p class="text-muted mb-0">Active Surveys</p>
                  </div>
                </div>
              </div>
              <div class="col-md-3">
                <div class="card border-0 shadow-sm">
                  <div class="card-body text-center">
                    <DocumentTextIcon style={{ width: '2rem', height: '2rem', color: '#28a745' }} />
                    <h3 class="mt-2">{surveys.value.reduce((sum, s) => sum + s.responses, 0)}</h3>
                    <p class="text-muted mb-0">Total Responses</p>
                  </div>
                </div>
              </div>
              <div class="col-md-3">
                <div class="card border-0 shadow-sm">
                  <div class="card-body text-center">
                    <div style={{ fontSize: '2rem', color: '#ffc107' }}>%</div>
                    <h3 class="mt-2">{Math.round(surveys.value.reduce((sum, s) => sum + s.completionRate, 0) / surveys.value.length) || 0}%</h3>
                    <p class="text-muted mb-0">Avg Completion</p>
                  </div>
                </div>
              </div>
              <div class="col-md-3">
                <div class="card border-0 shadow-sm">
                  <div class="card-body text-center">
                    <EyeIcon style={{ width: '2rem', height: '2rem', color: '#dc3545' }} />
                    <h3 class="mt-2">{surveys.value.filter(s => s.status === 'completed').length}</h3>
                    <p class="text-muted mb-0">Completed</p>
                  </div>
                </div>
              </div>
            </div>

            <div class="row">
              <div class="col-lg-8">
                <div class="card border-0 shadow-sm">
                  <div class="card-header bg-white">
                    <h5 class="mb-0">All Surveys</h5>
                  </div>
                  <div class="card-body p-0">
                    {surveys.value.length === 0 ? (
                      <div class="text-center py-5">
                        <ChartBarIcon style={{ width: '4rem', height: '4rem', color: '#dee2e6' }} />
                        <h4 class="text-muted mt-3">No surveys created</h4>
                        <p class="text-muted">Create your first customer survey</p>
                      </div>
                    ) : (
                      <div class="table-responsive">
                        <table class="table table-hover mb-0">
                          <thead class="table-light">
                            <tr>
                              <th>Survey Details</th>
                              <th>Type</th>
                              <th>Responses</th>
                              <th>Completion</th>
                              <th>Status</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {surveys.value.map(survey => (
                              <tr key={survey.id}>
                                <td>
                                  <div>
                                    <h6 class="mb-1">{survey.title}</h6>
                                    <small class="text-muted">{survey.description}</small>
                                    <div class="small text-muted mt-1">
                                      {survey.questions} questions • Created {new Date(survey.createdAt).toLocaleDateString()}
                                    </div>
                                  </div>
                                </td>
                                <td>
                                  <span class="badge bg-light text-dark">{getTypeLabel(survey.type)}</span>
                                </td>
                                <td>
                                  <strong>{survey.responses}</strong>
                                  <div class="small text-muted">responses</div>
                                </td>
                                <td>
                                  <div class="d-flex align-items-center">
                                    <div class="progress me-2" style={{ width: '60px', height: '6px' }}>
                                      <div 
                                        class="progress-bar" 
                                        style={{ width: `${survey.completionRate}%` }}
                                      ></div>
                                    </div>
                                    <span class="small">{survey.completionRate}%</span>
                                  </div>
                                </td>
                                <td>
                                  <span class={`badge ${getStatusBadge(survey.status)}`}>
                                    {survey.status}
                                  </span>
                                </td>
                                <td>
                                  <div class="btn-group btn-group-sm">
                                    <button 
                                      class="btn btn-outline-primary"
                                      onClick={() => viewSurvey(survey)}
                                    >
                                      <EyeIcon style={{ width: '1rem', height: '1rem' }} />
                                    </button>
                                    {(survey.status === 'active' || survey.status === 'paused' || survey.status === 'draft') && (
                                      <button 
                                        class="btn btn-outline-secondary"
                                        onClick={() => toggleSurveyStatus(survey)}
                                      >
                                        {survey.status === 'active' ? 
                                          <PauseIcon style={{ width: '1rem', height: '1rem' }} /> : 
                                          <PlayIcon style={{ width: '1rem', height: '1rem' }} />
                                        }
                                      </button>
                                    )}
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

              <div class="col-lg-4">
                {selectedSurvey.value ? (
                  <div class="card border-0 shadow-sm">
                    <div class="card-header bg-primary text-white">
                      <h5 class="mb-0">Survey Analytics</h5>
                    </div>
                    <div class="card-body">
                      <h5>{selectedSurvey.value.title}</h5>
                      <p class="text-muted">{selectedSurvey.value.description}</p>
                      
                      <div class="mb-3">
                        <span class={`badge ${getStatusBadge(selectedSurvey.value.status)} mb-2`}>
                          {selectedSurvey.value.status}
                        </span>
                        <div class="small text-muted">
                          <div><strong>Type:</strong> {getTypeLabel(selectedSurvey.value.type)}</div>
                          <div><strong>Questions:</strong> {selectedSurvey.value.questions}</div>
                          <div><strong>Created:</strong> {new Date(selectedSurvey.value.createdAt).toLocaleDateString()}</div>
                          <div><strong>Expires:</strong> {new Date(selectedSurvey.value.expiresAt).toLocaleDateString()}</div>
                        </div>
                      </div>

                      <div class="mb-3">
                        <h6>Response Metrics</h6>
                        <div class="row text-center">
                          <div class="col-6">
                            <div class="border rounded p-2 mb-2">
                              <div class="h4 mb-0 text-primary">{selectedSurvey.value.responses}</div>
                              <small class="text-muted">Responses</small>
                            </div>
                          </div>
                          <div class="col-6">
                            <div class="border rounded p-2 mb-2">
                              <div class="h4 mb-0 text-success">{selectedSurvey.value.completionRate}%</div>
                              <small class="text-muted">Completion</small>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div class="mb-3">
                        <h6>Response Rate Trend</h6>
                        <div class="bg-light rounded p-3 text-center">
                          <ChartBarIcon style={{ width: '3rem', height: '3rem', color: '#dee2e6' }} />
                          <p class="small text-muted mt-2">Analytics chart would appear here</p>
                        </div>
                      </div>

                      <div class="d-grid gap-2">
                        <button class="btn btn-outline-primary btn-sm">View Responses</button>
                        <button class="btn btn-outline-secondary btn-sm">Export Data</button>
                        <button class="btn btn-outline-info btn-sm">Share Survey</button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div class="card border-0 shadow-sm">
                    <div class="card-body text-center py-5">
                      <ChartBarIcon style={{ width: '3rem', height: '3rem', color: '#dee2e6' }} />
                      <h5 class="text-muted mt-3">Select a survey</h5>
                      <p class="text-muted">Click on a survey to view analytics</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Create Modal */}
            {showCreateModal.value && (
              <div class="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                <div class="modal-dialog">
                  <div class="modal-content">
                    <div class="modal-header">
                      <h5 class="modal-title">Create New Survey</h5>
                      <button class="btn-close" onClick={() => showCreateModal.value = false}></button>
                    </div>
                    <div class="modal-body">
                      <div class="mb-3">
                        <label class="form-label">Survey Title</label>
                        <input 
                          type="text" 
                          class="form-control" 
                          v-model={newSurvey.value.title}
                          placeholder="e.g., Customer Satisfaction Survey"
                        />
                      </div>
                      <div class="mb-3">
                        <label class="form-label">Description</label>
                        <textarea 
                          class="form-control" 
                          rows="3"
                          v-model={newSurvey.value.description}
                          placeholder="Brief description of the survey purpose"
                        ></textarea>
                      </div>
                      <div class="mb-3">
                        <label class="form-label">Survey Type</label>
                        <select class="form-select" v-model={newSurvey.value.type}>
                          <option value="feedback">Customer Feedback</option>
                          <option value="research">Product Research</option>
                          <option value="market_research">Market Research</option>
                          <option value="nps">NPS Survey</option>
                        </select>
                      </div>
                      <div class="mb-3">
                        <label class="form-label">Expires On</label>
                        <input 
                          type="date" 
                          class="form-control" 
                          v-model={newSurvey.value.expiresAt}
                        />
                      </div>
                    </div>
                    <div class="modal-footer">
                      <button class="btn btn-secondary" onClick={() => showCreateModal.value = false}>Cancel</button>
                      <button class="btn btn-primary" onClick={createSurvey}>Create Survey</button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
};