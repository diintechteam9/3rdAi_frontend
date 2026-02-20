import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { ArrowLeftIcon, StarIcon, EyeIcon, ChatBubbleLeftIcon, CheckIcon, XMarkIcon } from '@heroicons/vue/24/outline';

export default {
  name: 'ClientRating',
  setup() {
    const router = useRouter();
    const ratings = ref([
      {
        id: 1,
        customerName: 'Rajesh Kumar',
        email: 'rajesh@email.com',
        rating: 5,
        title: 'Excellent Service!',
        review: 'Outstanding product quality and fast delivery. Highly recommended!',
        date: '2024-01-20',
        status: 'approved',
        platform: 'website',
        productId: 'PRD001',
        productName: 'Premium Headphones',
        helpful: 12,
        response: null
      },
      {
        id: 2,
        customerName: 'Priya Sharma',
        email: 'priya@email.com',
        rating: 4,
        title: 'Good product, minor issues',
        review: 'Product is good overall but delivery was delayed by 2 days.',
        date: '2024-01-18',
        status: 'pending',
        platform: 'app',
        productId: 'PRD002',
        productName: 'Wireless Mouse',
        helpful: 5,
        response: null
      },
      {
        id: 3,
        customerName: 'Amit Patel',
        email: 'amit@email.com',
        rating: 2,
        title: 'Not satisfied',
        review: 'Product quality is poor and customer service was unhelpful.',
        date: '2024-01-15',
        status: 'flagged',
        platform: 'google',
        productId: 'PRD003',
        productName: 'Bluetooth Speaker',
        helpful: 2,
        response: 'We apologize for the inconvenience. Please contact our support team for a replacement.'
      }
    ]);

    const selectedRating = ref(null);
    const showResponseModal = ref(false);
    const responseText = ref('');
    const filterStatus = ref('all');
    const filterRating = ref('all');

    const goBack = () => {
      router.push('/client/tools');
    };

    const getStatusBadge = (status) => {
      const badges = {
        approved: 'bg-success',
        pending: 'bg-warning',
        rejected: 'bg-danger',
        flagged: 'bg-info'
      };
      return badges[status] || 'bg-secondary';
    };

    const getPlatformBadge = (platform) => {
      const badges = {
        website: 'bg-primary',
        app: 'bg-success',
        google: 'bg-warning',
        facebook: 'bg-info'
      };
      return badges[platform] || 'bg-secondary';
    };

    const renderStars = (rating, size = '1rem') => {
      return Array.from({ length: 5 }, (_, i) => (
        <StarIcon 
          key={i}
          style={{ 
            width: size, 
            height: size,
            color: i < rating ? '#ffc107' : '#e9ecef'
          }}
          fill={i < rating ? '#ffc107' : 'none'}
        />
      ));
    };

    const approveRating = (rating) => {
      rating.status = 'approved';
    };

    const rejectRating = (rating) => {
      rating.status = 'rejected';
    };

    const flagRating = (rating) => {
      rating.status = 'flagged';
    };

    const viewRating = (rating) => {
      selectedRating.value = rating;
    };

    const openResponseModal = (rating) => {
      selectedRating.value = rating;
      responseText.value = rating.response || '';
      showResponseModal.value = true;
    };

    const saveResponse = () => {
      if (selectedRating.value) {
        selectedRating.value.response = responseText.value;
        showResponseModal.value = false;
        responseText.value = '';
      }
    };

    const filteredRatings = () => {
      let filtered = ratings.value;
      
      if (filterStatus.value !== 'all') {
        filtered = filtered.filter(r => r.status === filterStatus.value);
      }
      
      if (filterRating.value !== 'all') {
        filtered = filtered.filter(r => r.rating === parseInt(filterRating.value));
      }
      
      return filtered;
    };

    const getAverageRating = () => {
      const approvedRatings = ratings.value.filter(r => r.status === 'approved');
      if (approvedRatings.length === 0) return 0;
      const sum = approvedRatings.reduce((acc, r) => acc + r.rating, 0);
      return (sum / approvedRatings.length).toFixed(1);
    };

    const getRatingDistribution = () => {
      const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
      const approvedRatings = ratings.value.filter(r => r.status === 'approved');
      approvedRatings.forEach(r => {
        distribution[r.rating]++;
      });
      return distribution;
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
                <h1 class="mb-0 text-primary">Ratings & Reviews</h1>
                <p class="text-muted mb-0">Manage customer ratings and respond to reviews</p>
              </div>
            </div>

            {/* Rating Overview */}
            <div class="row mb-4">
              <div class="col-md-3">
                <div class="card border-0 shadow-sm text-center">
                  <div class="card-body">
                    <div class="d-flex justify-content-center mb-2">
                      {renderStars(Math.round(getAverageRating()), '1.5rem')}
                    </div>
                    <h2 class="text-primary">{getAverageRating()}</h2>
                    <p class="text-muted mb-0">Average Rating</p>
                  </div>
                </div>
              </div>
              <div class="col-md-3">
                <div class="card border-0 shadow-sm text-center">
                  <div class="card-body">
                    <h3 class="text-success">{ratings.value.length}</h3>
                    <p class="text-muted mb-0">Total Reviews</p>
                  </div>
                </div>
              </div>
              <div class="col-md-3">
                <div class="card border-0 shadow-sm text-center">
                  <div class="card-body">
                    <h3 class="text-warning">{ratings.value.filter(r => r.status === 'pending').length}</h3>
                    <p class="text-muted mb-0">Pending Review</p>
                  </div>
                </div>
              </div>
              <div class="col-md-3">
                <div class="card border-0 shadow-sm text-center">
                  <div class="card-body">
                    <h3 class="text-info">{Math.round((ratings.value.filter(r => r.response).length / ratings.value.length) * 100)}%</h3>
                    <p class="text-muted mb-0">Response Rate</p>
                  </div>
                </div>
              </div>
            </div>

            <div class="row">
              <div class="col-lg-8">
                {/* Filters */}
                <div class="card border-0 shadow-sm mb-4">
                  <div class="card-body">
                    <div class="row">
                      <div class="col-md-4">
                        <label class="form-label">Filter by Status</label>
                        <select class="form-select" v-model={filterStatus.value}>
                          <option value="all">All Status</option>
                          <option value="pending">Pending</option>
                          <option value="approved">Approved</option>
                          <option value="rejected">Rejected</option>
                          <option value="flagged">Flagged</option>
                        </select>
                      </div>
                      <div class="col-md-4">
                        <label class="form-label">Filter by Rating</label>
                        <select class="form-select" v-model={filterRating.value}>
                          <option value="all">All Ratings</option>
                          <option value="5">5 Stars</option>
                          <option value="4">4 Stars</option>
                          <option value="3">3 Stars</option>
                          <option value="2">2 Stars</option>
                          <option value="1">1 Star</option>
                        </select>
                      </div>
                      <div class="col-md-4 d-flex align-items-end">
                        <button class="btn btn-outline-secondary w-100">Export Reviews</button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Reviews List */}
                <div class="card border-0 shadow-sm">
                  <div class="card-header bg-white">
                    <h5 class="mb-0">Customer Reviews ({filteredRatings().length})</h5>
                  </div>
                  <div class="card-body p-0">
                    {filteredRatings().length === 0 ? (
                      <div class="text-center py-5">
                        <StarIcon style={{ width: '4rem', height: '4rem', color: '#dee2e6' }} />
                        <h4 class="text-muted mt-3">No reviews found</h4>
                        <p class="text-muted">No reviews match your current filters</p>
                      </div>
                    ) : (
                      <div>
                        {filteredRatings().map(rating => (
                          <div key={rating.id} class="border-bottom p-4">
                            <div class="d-flex justify-content-between align-items-start mb-3">
                              <div class="flex-grow-1">
                                <div class="d-flex align-items-center mb-2">
                                  <h6 class="mb-0 me-3">{rating.customerName}</h6>
                                  <div class="d-flex me-3">
                                    {renderStars(rating.rating)}
                                  </div>
                                  <span class={`badge ${getStatusBadge(rating.status)} me-2`}>
                                    {rating.status}
                                  </span>
                                  <span class={`badge ${getPlatformBadge(rating.platform)}`}>
                                    {rating.platform}
                                  </span>
                                </div>
                                <p class="text-muted small mb-2">
                                  {rating.productName} • {new Date(rating.date).toLocaleDateString()}
                                </p>
                              </div>
                              <div class="btn-group btn-group-sm">
                                <button 
                                  class="btn btn-outline-primary"
                                  onClick={() => viewRating(rating)}
                                >
                                  <EyeIcon style={{ width: '1rem', height: '1rem' }} />
                                </button>
                                <button 
                                  class="btn btn-outline-info"
                                  onClick={() => openResponseModal(rating)}
                                >
                                  <ChatBubbleLeftIcon style={{ width: '1rem', height: '1rem' }} />
                                </button>
                                {rating.status === 'pending' && (
                                  <>
                                    <button 
                                      class="btn btn-outline-success"
                                      onClick={() => approveRating(rating)}
                                    >
                                      <CheckIcon style={{ width: '1rem', height: '1rem' }} />
                                    </button>
                                    <button 
                                      class="btn btn-outline-danger"
                                      onClick={() => rejectRating(rating)}
                                    >
                                      <XMarkIcon style={{ width: '1rem', height: '1rem' }} />
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                            
                            <h6 class="mb-2">{rating.title}</h6>
                            <p class="mb-3">{rating.review}</p>
                            
                            {rating.response && (
                              <div class="bg-light rounded p-3 mt-3">
                                <h6 class="small text-muted mb-2">Your Response:</h6>
                                <p class="mb-0">{rating.response}</p>
                              </div>
                            )}
                            
                            <div class="d-flex justify-content-between align-items-center mt-3">
                              <small class="text-muted">{rating.helpful} people found this helpful</small>
                              <small class="text-muted">{rating.email}</small>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div class="col-lg-4">
                {/* Rating Distribution */}
                <div class="card border-0 shadow-sm mb-4">
                  <div class="card-header bg-white">
                    <h5 class="mb-0">Rating Distribution</h5>
                  </div>
                  <div class="card-body">
                    {Object.entries(getRatingDistribution()).reverse().map(([stars, count]) => (
                      <div key={stars} class="d-flex align-items-center mb-2">
                        <span class="me-2">{stars}</span>
                        <StarIcon style={{ width: '1rem', height: '1rem', color: '#ffc107' }} fill="#ffc107" />
                        <div class="progress flex-grow-1 mx-3" style={{ height: '8px' }}>
                          <div 
                            class="progress-bar bg-warning" 
                            style={{ width: `${ratings.value.length > 0 ? (count / ratings.value.length) * 100 : 0}%` }}
                          ></div>
                        </div>
                        <span class="small text-muted">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Selected Review Details */}
                {selectedRating.value ? (
                  <div class="card border-0 shadow-sm">
                    <div class="card-header bg-primary text-white">
                      <h5 class="mb-0">Review Details</h5>
                    </div>
                    <div class="card-body">
                      <div class="text-center mb-3">
                        <h5>{selectedRating.value.customerName}</h5>
                        <div class="d-flex justify-content-center mb-2">
                          {renderStars(selectedRating.value.rating, '1.2rem')}
                        </div>
                        <span class={`badge ${getStatusBadge(selectedRating.value.status)}`}>
                          {selectedRating.value.status}
                        </span>
                      </div>
                      
                      <div class="mb-3">
                        <h6>{selectedRating.value.title}</h6>
                        <p class="text-muted">{selectedRating.value.review}</p>
                      </div>
                      
                      <div class="small text-muted mb-3">
                        <div><strong>Product:</strong> {selectedRating.value.productName}</div>
                        <div><strong>Platform:</strong> {selectedRating.value.platform}</div>
                        <div><strong>Date:</strong> {new Date(selectedRating.value.date).toLocaleDateString()}</div>
                        <div><strong>Helpful:</strong> {selectedRating.value.helpful} votes</div>
                      </div>

                      <div class="d-grid gap-2">
                        <button 
                          class="btn btn-primary btn-sm"
                          onClick={() => openResponseModal(selectedRating.value)}
                        >
                          {selectedRating.value.response ? 'Edit Response' : 'Add Response'}
                        </button>
                        {selectedRating.value.status === 'pending' && (
                          <>
                            <button 
                              class="btn btn-success btn-sm"
                              onClick={() => approveRating(selectedRating.value)}
                            >
                              Approve Review
                            </button>
                            <button 
                              class="btn btn-danger btn-sm"
                              onClick={() => rejectRating(selectedRating.value)}
                            >
                              Reject Review
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div class="card border-0 shadow-sm">
                    <div class="card-body text-center py-5">
                      <StarIcon style={{ width: '3rem', height: '3rem', color: '#dee2e6' }} />
                      <h5 class="text-muted mt-3">Select a review</h5>
                      <p class="text-muted">Click on a review to view details</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Response Modal */}
            {showResponseModal.value && (
              <div class="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                <div class="modal-dialog">
                  <div class="modal-content">
                    <div class="modal-header">
                      <h5 class="modal-title">Respond to Review</h5>
                      <button class="btn-close" onClick={() => showResponseModal.value = false}></button>
                    </div>
                    <div class="modal-body">
                      <div class="mb-3">
                        <strong>Customer:</strong> {selectedRating.value?.customerName}
                      </div>
                      <div class="mb-3">
                        <strong>Review:</strong>
                        <p class="text-muted mt-1">{selectedRating.value?.review}</p>
                      </div>
                      <div class="mb-3">
                        <label class="form-label">Your Response</label>
                        <textarea 
                          class="form-control" 
                          rows="4"
                          v-model={responseText.value}
                          placeholder="Write a professional response to this review..."
                        ></textarea>
                      </div>
                    </div>
                    <div class="modal-footer">
                      <button class="btn btn-secondary" onClick={() => showResponseModal.value = false}>Cancel</button>
                      <button class="btn btn-primary" onClick={saveResponse}>Save Response</button>
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