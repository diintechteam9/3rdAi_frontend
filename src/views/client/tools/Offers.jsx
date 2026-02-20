import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { ArrowLeftIcon, PlusIcon, GiftIcon, CalendarIcon, UserGroupIcon, ChartBarIcon } from '@heroicons/vue/24/outline';

export default {
  name: 'ClientOffers',
  setup() {
    const router = useRouter();
    const offers = ref([
      {
        id: 1,
        title: 'New Year Sale',
        code: 'NEWYEAR2024',
        type: 'percentage',
        value: 25,
        minOrderValue: 1000,
        maxDiscount: 500,
        validFrom: '2024-01-01',
        validTill: '2024-01-31',
        usageLimit: 1000,
        usedCount: 245,
        status: 'active',
        description: '25% off on orders above ₹1000'
      },
      {
        id: 2,
        title: 'First Time Buyer',
        code: 'WELCOME20',
        type: 'percentage',
        value: 20,
        minOrderValue: 500,
        maxDiscount: 200,
        validFrom: '2024-01-01',
        validTill: '2024-12-31',
        usageLimit: 5000,
        usedCount: 1250,
        status: 'active',
        description: '20% off for new customers'
      },
      {
        id: 3,
        title: 'Free Shipping',
        code: 'FREESHIP',
        type: 'fixed',
        value: 100,
        minOrderValue: 799,
        maxDiscount: 100,
        validFrom: '2024-01-15',
        validTill: '2024-01-20',
        usageLimit: 500,
        usedCount: 500,
        status: 'expired',
        description: 'Free shipping on orders above ₹799'
      }
    ]);

    const showCreateModal = ref(false);
    const newOffer = ref({
      title: '',
      code: '',
      type: 'percentage',
      value: 0,
      minOrderValue: 0,
      maxDiscount: 0,
      validFrom: '',
      validTill: '',
      usageLimit: 100,
      description: ''
    });

    const goBack = () => {
      router.push('/client/tools');
    };

    const generateCode = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let code = '';
      for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      newOffer.value.code = code;
    };

    const createOffer = () => {
      offers.value.unshift({
        id: Date.now(),
        ...newOffer.value,
        usedCount: 0,
        status: 'active'
      });
      newOffer.value = {
        title: '', code: '', type: 'percentage', value: 0,
        minOrderValue: 0, maxDiscount: 0, validFrom: '', validTill: '',
        usageLimit: 100, description: ''
      };
      showCreateModal.value = false;
    };

    const toggleStatus = (offer) => {
      offer.status = offer.status === 'active' ? 'inactive' : 'active';
    };

    const getStatusBadge = (status) => {
      const badges = {
        active: 'bg-success',
        inactive: 'bg-warning',
        expired: 'bg-danger'
      };
      return badges[status] || 'bg-secondary';
    };

    const getUsagePercentage = (used, limit) => {
      return Math.round((used / limit) * 100);
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
                <h1 class="mb-0 text-primary">Offers & Discounts</h1>
                <p class="text-muted mb-0">Create and manage promotional offers</p>
              </div>
              <button 
                class="btn btn-primary"
                onClick={() => showCreateModal.value = true}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <PlusIcon style={{ width: '1rem', height: '1rem' }} />
                Create Offer
              </button>
            </div>

            {/* Stats Cards */}
            <div class="row mb-4">
              <div class="col-md-3">
                <div class="card border-0 shadow-sm">
                  <div class="card-body text-center">
                    <GiftIcon style={{ width: '2rem', height: '2rem', color: '#007bff' }} />
                    <h3 class="mt-2">{offers.value.filter(o => o.status === 'active').length}</h3>
                    <p class="text-muted mb-0">Active Offers</p>
                  </div>
                </div>
              </div>
              <div class="col-md-3">
                <div class="card border-0 shadow-sm">
                  <div class="card-body text-center">
                    <UserGroupIcon style={{ width: '2rem', height: '2rem', color: '#28a745' }} />
                    <h3 class="mt-2">{offers.value.reduce((sum, o) => sum + o.usedCount, 0)}</h3>
                    <p class="text-muted mb-0">Total Usage</p>
                  </div>
                </div>
              </div>
              <div class="col-md-3">
                <div class="card border-0 shadow-sm">
                  <div class="card-body text-center">
                    <ChartBarIcon style={{ width: '2rem', height: '2rem', color: '#ffc107' }} />
                    <h3 class="mt-2">₹{(offers.value.reduce((sum, o) => sum + (o.usedCount * o.value), 0)).toLocaleString()}</h3>
                    <p class="text-muted mb-0">Total Savings</p>
                  </div>
                </div>
              </div>
              <div class="col-md-3">
                <div class="card border-0 shadow-sm">
                  <div class="card-body text-center">
                    <CalendarIcon style={{ width: '2rem', height: '2rem', color: '#dc3545' }} />
                    <h3 class="mt-2">{offers.value.filter(o => o.status === 'expired').length}</h3>
                    <p class="text-muted mb-0">Expired</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Offers List */}
            <div class="card border-0 shadow-sm">
              <div class="card-header bg-white">
                <h5 class="mb-0">All Offers</h5>
              </div>
              <div class="card-body p-0">
                {offers.value.length === 0 ? (
                  <div class="text-center py-5">
                    <GiftIcon style={{ width: '4rem', height: '4rem', color: '#dee2e6' }} />
                    <h4 class="text-muted mt-3">No offers created</h4>
                    <p class="text-muted">Create your first promotional offer</p>
                  </div>
                ) : (
                  <div class="table-responsive">
                    <table class="table table-hover mb-0">
                      <thead class="table-light">
                        <tr>
                          <th>Offer Details</th>
                          <th>Code</th>
                          <th>Discount</th>
                          <th>Usage</th>
                          <th>Validity</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {offers.value.map(offer => (
                          <tr key={offer.id}>
                            <td>
                              <div>
                                <h6 class="mb-1">{offer.title}</h6>
                                <small class="text-muted">{offer.description}</small>
                              </div>
                            </td>
                            <td>
                              <code class="bg-light px-2 py-1 rounded">{offer.code}</code>
                            </td>
                            <td>
                              {offer.type === 'percentage' ? `${offer.value}%` : `₹${offer.value}`}
                              <br />
                              <small class="text-muted">Min: ₹{offer.minOrderValue}</small>
                            </td>
                            <td>
                              <div class="d-flex align-items-center">
                                <div class="flex-grow-1">
                                  <div class="progress" style={{ height: '6px' }}>
                                    <div 
                                      class="progress-bar" 
                                      style={{ width: `${getUsagePercentage(offer.usedCount, offer.usageLimit)}%` }}
                                    ></div>
                                  </div>
                                  <small class="text-muted">{offer.usedCount}/{offer.usageLimit}</small>
                                </div>
                              </div>
                            </td>
                            <td>
                              <small>
                                {new Date(offer.validFrom).toLocaleDateString()} - 
                                {new Date(offer.validTill).toLocaleDateString()}
                              </small>
                            </td>
                            <td>
                              <span class={`badge ${getStatusBadge(offer.status)}`}>
                                {offer.status}
                              </span>
                            </td>
                            <td>
                              <button 
                                class="btn btn-outline-primary btn-sm me-1"
                                onClick={() => toggleStatus(offer)}
                              >
                                {offer.status === 'active' ? 'Deactivate' : 'Activate'}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
                      <h5 class="modal-title">Create New Offer</h5>
                      <button class="btn-close" onClick={() => showCreateModal.value = false}></button>
                    </div>
                    <div class="modal-body">
                      <div class="row">
                        <div class="col-md-6">
                          <div class="mb-3">
                            <label class="form-label">Offer Title</label>
                            <input 
                              type="text" 
                              class="form-control" 
                              v-model={newOffer.value.title}
                              placeholder="e.g., Summer Sale"
                            />
                          </div>
                        </div>
                        <div class="col-md-6">
                          <div class="mb-3">
                            <label class="form-label">Coupon Code</label>
                            <div class="input-group">
                              <input 
                                type="text" 
                                class="form-control" 
                                v-model={newOffer.value.code}
                                placeholder="SUMMER2024"
                              />
                              <button class="btn btn-outline-secondary" onClick={generateCode}>Generate</button>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div class="row">
                        <div class="col-md-4">
                          <div class="mb-3">
                            <label class="form-label">Discount Type</label>
                            <select class="form-select" v-model={newOffer.value.type}>
                              <option value="percentage">Percentage</option>
                              <option value="fixed">Fixed Amount</option>
                            </select>
                          </div>
                        </div>
                        <div class="col-md-4">
                          <div class="mb-3">
                            <label class="form-label">Discount Value</label>
                            <input 
                              type="number" 
                              class="form-control" 
                              v-model={newOffer.value.value}
                              placeholder={newOffer.value.type === 'percentage' ? '25' : '100'}
                            />
                          </div>
                        </div>
                        <div class="col-md-4">
                          <div class="mb-3">
                            <label class="form-label">Max Discount (₹)</label>
                            <input 
                              type="number" 
                              class="form-control" 
                              v-model={newOffer.value.maxDiscount}
                              placeholder="500"
                            />
                          </div>
                        </div>
                      </div>

                      <div class="row">
                        <div class="col-md-4">
                          <div class="mb-3">
                            <label class="form-label">Min Order Value (₹)</label>
                            <input 
                              type="number" 
                              class="form-control" 
                              v-model={newOffer.value.minOrderValue}
                              placeholder="1000"
                            />
                          </div>
                        </div>
                        <div class="col-md-4">
                          <div class="mb-3">
                            <label class="form-label">Valid From</label>
                            <input 
                              type="date" 
                              class="form-control" 
                              v-model={newOffer.value.validFrom}
                            />
                          </div>
                        </div>
                        <div class="col-md-4">
                          <div class="mb-3">
                            <label class="form-label">Valid Till</label>
                            <input 
                              type="date" 
                              class="form-control" 
                              v-model={newOffer.value.validTill}
                            />
                          </div>
                        </div>
                      </div>

                      <div class="row">
                        <div class="col-md-6">
                          <div class="mb-3">
                            <label class="form-label">Usage Limit</label>
                            <input 
                              type="number" 
                              class="form-control" 
                              v-model={newOffer.value.usageLimit}
                              placeholder="100"
                            />
                          </div>
                        </div>
                        <div class="col-md-6">
                          <div class="mb-3">
                            <label class="form-label">Description</label>
                            <input 
                              type="text" 
                              class="form-control" 
                              v-model={newOffer.value.description}
                              placeholder="Brief description of the offer"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    <div class="modal-footer">
                      <button class="btn btn-secondary" onClick={() => showCreateModal.value = false}>Cancel</button>
                      <button class="btn btn-primary" onClick={createOffer}>Create Offer</button>
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