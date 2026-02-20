import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { ArrowLeftIcon, PlusIcon, SpeakerWaveIcon, EyeIcon, PlayIcon, PauseIcon, ChartBarIcon } from '@heroicons/vue/24/outline';

export default {
  name: 'ClientAdvertisement',
  setup() {
    const router = useRouter();
    const campaigns = ref([
      {
        id: 1,
        name: 'Summer Collection Launch',
        type: 'banner',
        platform: 'website',
        budget: 50000,
        spent: 32500,
        impressions: 125000,
        clicks: 3250,
        conversions: 145,
        status: 'active',
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        targetAudience: 'Age 25-45, Fashion Enthusiasts'
      },
      {
        id: 2,
        name: 'New Year Promotion',
        type: 'video',
        platform: 'social',
        budget: 75000,
        spent: 75000,
        impressions: 200000,
        clicks: 8500,
        conversions: 320,
        status: 'completed',
        startDate: '2023-12-15',
        endDate: '2024-01-15',
        targetAudience: 'Age 18-35, All Interests'
      },
      {
        id: 3,
        name: 'Brand Awareness Campaign',
        type: 'display',
        platform: 'google',
        budget: 100000,
        spent: 45000,
        impressions: 180000,
        clicks: 4200,
        conversions: 89,
        status: 'paused',
        startDate: '2024-01-10',
        endDate: '2024-02-10',
        targetAudience: 'Age 30-50, Business Professionals'
      }
    ]);

    const showCreateModal = ref(false);
    const selectedCampaign = ref(null);
    const newCampaign = ref({
      name: '',
      type: 'banner',
      platform: 'website',
      budget: 0,
      startDate: '',
      endDate: '',
      targetAudience: ''
    });

    const goBack = () => {
      router.push('/client/tools');
    };

    const createCampaign = () => {
      campaigns.value.unshift({
        id: Date.now(),
        ...newCampaign.value,
        spent: 0,
        impressions: 0,
        clicks: 0,
        conversions: 0,
        status: 'active'
      });
      newCampaign.value = {
        name: '', type: 'banner', platform: 'website',
        budget: 0, startDate: '', endDate: '', targetAudience: ''
      };
      showCreateModal.value = false;
    };

    const toggleCampaignStatus = (campaign) => {
      if (campaign.status === 'active') {
        campaign.status = 'paused';
      } else if (campaign.status === 'paused') {
        campaign.status = 'active';
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

    const getCTR = (clicks, impressions) => {
      return impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) : '0.00';
    };

    const getConversionRate = (conversions, clicks) => {
      return clicks > 0 ? ((conversions / clicks) * 100).toFixed(2) : '0.00';
    };

    const getCPC = (spent, clicks) => {
      return clicks > 0 ? (spent / clicks).toFixed(2) : '0.00';
    };

    const viewCampaign = (campaign) => {
      selectedCampaign.value = campaign;
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
                <h1 class="mb-0 text-primary">Advertisement Campaigns</h1>
                <p class="text-muted mb-0">Manage your marketing campaigns and track performance</p>
              </div>
              <button 
                class="btn btn-primary"
                onClick={() => showCreateModal.value = true}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <PlusIcon style={{ width: '1rem', height: '1rem' }} />
                Create Campaign
              </button>
            </div>

            {/* Performance Overview */}
            <div class="row mb-4">
              <div class="col-md-3">
                <div class="card border-0 shadow-sm">
                  <div class="card-body text-center">
                    <SpeakerWaveIcon style={{ width: '2rem', height: '2rem', color: '#007bff' }} />
                    <h3 class="mt-2">{campaigns.value.filter(c => c.status === 'active').length}</h3>
                    <p class="text-muted mb-0">Active Campaigns</p>
                  </div>
                </div>
              </div>
              <div class="col-md-3">
                <div class="card border-0 shadow-sm">
                  <div class="card-body text-center">
                    <EyeIcon style={{ width: '2rem', height: '2rem', color: '#28a745' }} />
                    <h3 class="mt-2">{campaigns.value.reduce((sum, c) => sum + c.impressions, 0).toLocaleString()}</h3>
                    <p class="text-muted mb-0">Total Impressions</p>
                  </div>
                </div>
              </div>
              <div class="col-md-3">
                <div class="card border-0 shadow-sm">
                  <div class="card-body text-center">
                    <ChartBarIcon style={{ width: '2rem', height: '2rem', color: '#ffc107' }} />
                    <h3 class="mt-2">{campaigns.value.reduce((sum, c) => sum + c.clicks, 0).toLocaleString()}</h3>
                    <p class="text-muted mb-0">Total Clicks</p>
                  </div>
                </div>
              </div>
              <div class="col-md-3">
                <div class="card border-0 shadow-sm">
                  <div class="card-body text-center">
                    <div style={{ fontSize: '2rem', color: '#dc3545' }}>₹</div>
                    <h3 class="mt-2">{campaigns.value.reduce((sum, c) => sum + c.spent, 0).toLocaleString()}</h3>
                    <p class="text-muted mb-0">Total Spent</p>
                  </div>
                </div>
              </div>
            </div>

            <div class="row">
              <div class="col-lg-8">
                <div class="card border-0 shadow-sm">
                  <div class="card-header bg-white">
                    <h5 class="mb-0">Campaign Performance</h5>
                  </div>
                  <div class="card-body p-0">
                    {campaigns.value.length === 0 ? (
                      <div class="text-center py-5">
                        <SpeakerWaveIcon style={{ width: '4rem', height: '4rem', color: '#dee2e6' }} />
                        <h4 class="text-muted mt-3">No campaigns created</h4>
                        <p class="text-muted">Create your first advertising campaign</p>
                      </div>
                    ) : (
                      <div class="table-responsive">
                        <table class="table table-hover mb-0">
                          <thead class="table-light">
                            <tr>
                              <th>Campaign</th>
                              <th>Budget</th>
                              <th>Performance</th>
                              <th>Status</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {campaigns.value.map(campaign => (
                              <tr key={campaign.id}>
                                <td>
                                  <div>
                                    <h6 class="mb-1">{campaign.name}</h6>
                                    <small class="text-muted">
                                      {campaign.type} • {campaign.platform}
                                    </small>
                                  </div>
                                </td>
                                <td>
                                  <div>
                                    <strong>₹{campaign.spent.toLocaleString()}</strong> / ₹{campaign.budget.toLocaleString()}
                                    <div class="progress mt-1" style={{ height: '4px' }}>
                                      <div 
                                        class="progress-bar" 
                                        style={{ width: `${(campaign.spent / campaign.budget) * 100}%` }}
                                      ></div>
                                    </div>
                                  </div>
                                </td>
                                <td>
                                  <div class="small">
                                    <div>Impressions: {campaign.impressions.toLocaleString()}</div>
                                    <div>Clicks: {campaign.clicks.toLocaleString()} (CTR: {getCTR(campaign.clicks, campaign.impressions)}%)</div>
                                    <div>Conversions: {campaign.conversions} (CR: {getConversionRate(campaign.conversions, campaign.clicks)}%)</div>
                                  </div>
                                </td>
                                <td>
                                  <span class={`badge ${getStatusBadge(campaign.status)}`}>
                                    {campaign.status}
                                  </span>
                                </td>
                                <td>
                                  <div class="btn-group btn-group-sm">
                                    <button 
                                      class="btn btn-outline-primary"
                                      onClick={() => viewCampaign(campaign)}
                                    >
                                      <EyeIcon style={{ width: '1rem', height: '1rem' }} />
                                    </button>
                                    {(campaign.status === 'active' || campaign.status === 'paused') && (
                                      <button 
                                        class="btn btn-outline-secondary"
                                        onClick={() => toggleCampaignStatus(campaign)}
                                      >
                                        {campaign.status === 'active' ? 
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
                {selectedCampaign.value ? (
                  <div class="card border-0 shadow-sm">
                    <div class="card-header bg-primary text-white">
                      <h5 class="mb-0">Campaign Details</h5>
                    </div>
                    <div class="card-body">
                      <h5>{selectedCampaign.value.name}</h5>
                      <div class="mb-3">
                        <span class={`badge ${getStatusBadge(selectedCampaign.value.status)} mb-2`}>
                          {selectedCampaign.value.status}
                        </span>
                        <p class="small text-muted mb-1">
                          <strong>Type:</strong> {selectedCampaign.value.type}
                        </p>
                        <p class="small text-muted mb-1">
                          <strong>Platform:</strong> {selectedCampaign.value.platform}
                        </p>
                        <p class="small text-muted">
                          <strong>Duration:</strong> {new Date(selectedCampaign.value.startDate).toLocaleDateString()} - {new Date(selectedCampaign.value.endDate).toLocaleDateString()}
                        </p>
                      </div>
                      
                      <div class="mb-3">
                        <h6>Performance Metrics</h6>
                        <div class="row text-center">
                          <div class="col-6">
                            <div class="border rounded p-2 mb-2">
                              <div class="h5 mb-0">{getCTR(selectedCampaign.value.clicks, selectedCampaign.value.impressions)}%</div>
                              <small class="text-muted">CTR</small>
                            </div>
                          </div>
                          <div class="col-6">
                            <div class="border rounded p-2 mb-2">
                              <div class="h5 mb-0">₹{getCPC(selectedCampaign.value.spent, selectedCampaign.value.clicks)}</div>
                              <small class="text-muted">CPC</small>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div class="mb-3">
                        <h6>Target Audience</h6>
                        <p class="small text-muted">{selectedCampaign.value.targetAudience}</p>
                      </div>

                      <div class="mb-3">
                        <h6>Budget Utilization</h6>
                        <div class="progress mb-2">
                          <div 
                            class="progress-bar" 
                            style={{ width: `${(selectedCampaign.value.spent / selectedCampaign.value.budget) * 100}%` }}
                          ></div>
                        </div>
                        <div class="d-flex justify-content-between small text-muted">
                          <span>₹{selectedCampaign.value.spent.toLocaleString()}</span>
                          <span>₹{selectedCampaign.value.budget.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div class="card border-0 shadow-sm">
                    <div class="card-body text-center py-5">
                      <SpeakerWaveIcon style={{ width: '3rem', height: '3rem', color: '#dee2e6' }} />
                      <h5 class="text-muted mt-3">Select a campaign</h5>
                      <p class="text-muted">Click on a campaign to view details</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Create Modal */}
            {showCreateModal.value && (
              <div class="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                <div class="modal-dialog modal-lg">
                  <div class="modal-content">
                    <div class="modal-header">
                      <h5 class="modal-title">Create New Campaign</h5>
                      <button class="btn-close" onClick={() => showCreateModal.value = false}></button>
                    </div>
                    <div class="modal-body">
                      <div class="row">
                        <div class="col-md-6">
                          <div class="mb-3">
                            <label class="form-label">Campaign Name</label>
                            <input 
                              type="text" 
                              class="form-control" 
                              v-model={newCampaign.value.name}
                              placeholder="e.g., Summer Sale Campaign"
                            />
                          </div>
                        </div>
                        <div class="col-md-6">
                          <div class="mb-3">
                            <label class="form-label">Budget (₹)</label>
                            <input 
                              type="number" 
                              class="form-control" 
                              v-model={newCampaign.value.budget}
                              placeholder="50000"
                            />
                          </div>
                        </div>
                      </div>
                      
                      <div class="row">
                        <div class="col-md-6">
                          <div class="mb-3">
                            <label class="form-label">Ad Type</label>
                            <select class="form-select" v-model={newCampaign.value.type}>
                              <option value="banner">Banner Ad</option>
                              <option value="video">Video Ad</option>
                              <option value="display">Display Ad</option>
                              <option value="native">Native Ad</option>
                            </select>
                          </div>
                        </div>
                        <div class="col-md-6">
                          <div class="mb-3">
                            <label class="form-label">Platform</label>
                            <select class="form-select" v-model={newCampaign.value.platform}>
                              <option value="website">Website</option>
                              <option value="google">Google Ads</option>
                              <option value="facebook">Facebook</option>
                              <option value="instagram">Instagram</option>
                              <option value="social">Social Media</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      <div class="row">
                        <div class="col-md-6">
                          <div class="mb-3">
                            <label class="form-label">Start Date</label>
                            <input 
                              type="date" 
                              class="form-control" 
                              v-model={newCampaign.value.startDate}
                            />
                          </div>
                        </div>
                        <div class="col-md-6">
                          <div class="mb-3">
                            <label class="form-label">End Date</label>
                            <input 
                              type="date" 
                              class="form-control" 
                              v-model={newCampaign.value.endDate}
                            />
                          </div>
                        </div>
                      </div>

                      <div class="mb-3">
                        <label class="form-label">Target Audience</label>
                        <textarea 
                          class="form-control" 
                          rows="2"
                          v-model={newCampaign.value.targetAudience}
                          placeholder="Describe your target audience (age, interests, demographics)"
                        ></textarea>
                      </div>
                    </div>
                    <div class="modal-footer">
                      <button class="btn btn-secondary" onClick={() => showCreateModal.value = false}>Cancel</button>
                      <button class="btn btn-primary" onClick={createCampaign}>Create Campaign</button>
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