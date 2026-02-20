import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { 
  ArrowLeftIcon, 
  PlusIcon, 
  TrashIcon, 
  PencilIcon, 
  ChevronLeftIcon, 
  ChevronRightIcon, 
  ChartBarIcon,
  BuildingOffice2Icon,
  LinkIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  EyeIcon
} from '@heroicons/vue/24/outline';
import { useToast } from 'vue-toastification';
import sponsorService from '../../../services/sponsorService.js';

export default {
  name: 'ClientSponsors',
  setup() {
    const router = useRouter();
    const toast = useToast();
    const sponsors = ref([]);
    const loading = ref(false);
    const showAddModal = ref(false);
    const showEditModal = ref(false);
    const showDropdown = ref({});
    const editingSponsor = ref(null);
    const expandedDescriptions = ref({});
    const currentPage = ref(1);
    const itemsPerPage = ref(12);

    const sponsorshipTypes = ['Platinum', 'Gold', 'Silver', 'Bronze'];

    const toggleDropdown = (sponsorId) => {
      showDropdown.value = {
        ...showDropdown.value,
        [sponsorId]: !showDropdown.value[sponsorId]
      };
    };

    const toggleDescription = (sponsorId) => {
      expandedDescriptions.value = {
        ...expandedDescriptions.value,
        [sponsorId]: !expandedDescriptions.value[sponsorId]
      };
    };

    const truncateDescription = (description, limit = 120) => {
      if (description.length <= limit) return description;
      return description.substring(0, limit) + '...';
    };

    const paginatedSponsors = computed(() => {
      const start = (currentPage.value - 1) * itemsPerPage.value;
      const end = start + itemsPerPage.value;
      return sponsors.value.slice(start, end);
    });

    const totalPages = computed(() => {
      return Math.ceil(sponsors.value.length / itemsPerPage.value);
    });

    const goToPage = (page) => {
      if (page >= 1 && page <= totalPages.value) {
        currentPage.value = page;
      }
    };

    const newSponsor = ref({
      name: '',
      description: '',
      website: '',
      logo: null,
      sponsorshipType: 'Gold',
      isActive: true
    });
    const newLogoUploaded = ref(false);
    const newLogoFileName = ref('');
    const editLogoUploaded = ref(false);
    const editLogoFileName = ref('');
    const selectedSponsor = ref(null);

    const goBack = () => {
      router.push('/client/tools');
    };

    const fetchSponsors = async () => {
      loading.value = true;
      try {
        const response = await sponsorService.getAllSponsors();
        
        if (response.success && response.data) {
          // Handle nested response structure
          const actualData = response.data.data || response.data;
          let sponsorsList = Array.isArray(actualData.data) ? actualData.data : 
                           Array.isArray(actualData) ? actualData : [];
          sponsors.value = sponsorsList;
        } else {
          sponsors.value = [];
        }
      } catch (error) {
        toast.error('Failed to load sponsors');
        sponsors.value = [];
      } finally {
        loading.value = false;
      }
    };

    const getTypeColor = (type) => {
      const colors = {
        'Platinum': '#e5e7eb',
        'Gold': '#fbbf24',
        'Silver': '#9ca3af',
        'Bronze': '#d97706'
      };
      return colors[type] || '#6b7280';
    };

    const addSponsor = async () => {
      try {
        loading.value = true;
        toast.info('Creating sponsor...');
        const { logo, ...sponsorData } = newSponsor.value;
        const response = await sponsorService.createSponsor(sponsorData);
        
        if (response.success && response.data) {
          let createdSponsor = response.data;
          
          // Upload logo if provided
          if (logo && createdSponsor._id) {
            try {
              toast.info('Uploading logo...');
              const logoResponse = await sponsorService.uploadLogo(createdSponsor._id, logo);
              if (logoResponse.success && logoResponse.data) {
                createdSponsor.logo = logoResponse.data.logoUrl;
              }
            } catch (logoError) {
              toast.error('⚠️ Sponsor created but logo upload failed');
            }
          }
          
          newSponsor.value = {
            name: '',
            description: '',
            website: '',
            logo: null,
            sponsorshipType: 'Gold',
            isActive: true
          };
          newLogoUploaded.value = false;
          newLogoFileName.value = '';
          showAddModal.value = false;
          toast.success('✓ Sponsor added successfully!');
          await fetchSponsors();
        } else {
          toast.error('❌ ' + (response.error || 'Failed to create sponsor'));
        }
      } catch (error) {
        toast.error('❌ Failed to create sponsor. Please try again.');
      } finally {
        loading.value = false;
      }
    };

    const editSponsor = (sponsor) => {
      editingSponsor.value = { ...sponsor };
      showEditModal.value = true;
    };

    const updateSponsor = async () => {
      try {
        loading.value = true;
        toast.info('Updating sponsor...');
        const { logo, ...sponsorData } = editingSponsor.value;
        
        const response = await sponsorService.updateSponsor(
          editingSponsor.value.id || editingSponsor.value._id, 
          sponsorData
        );
        
        if (response.success) {
          let updatedSponsor = response.data;
          
          // Upload new logo if provided
          if (logo && typeof logo !== 'string') {
            try {
              toast.info('Uploading new logo...');
              const logoResponse = await sponsorService.uploadLogo(updatedSponsor._id, logo);
              if (logoResponse.success && logoResponse.data) {
                updatedSponsor.logo = logoResponse.data.logoUrl;
              }
            } catch (logoError) {
              toast.error('⚠️ Sponsor updated but logo upload failed');
            }
          }
          
          showEditModal.value = false;
          editingSponsor.value = null;
          editLogoUploaded.value = false;
          editLogoFileName.value = '';
          toast.success('✓ Sponsor updated successfully!');
          await fetchSponsors();
        }
      } catch (error) {
        toast.error('❌ Failed to update sponsor. Please try again.');
      } finally {
        loading.value = false;
      }
    };

    const deleteSponsor = async (id) => {
      const confirmed = confirm('Are you sure you want to delete this sponsor?');
      if (!confirmed) {
        toast.info('Delete cancelled');
        return;
      }
      
      try {
        loading.value = true;
        toast.info('Deleting sponsor...');
        const response = await sponsorService.deleteSponsor(id);
        
        if (response.success) {
          sponsors.value = sponsors.value.filter(s => (s.id || s._id) !== id);
          toast.success('✓ Sponsor deleted successfully!');
        } else {
          toast.error('❌ ' + (response.message || 'Failed to delete sponsor'));
        }
      } catch (error) {
        toast.error('❌ Failed to delete sponsor. Please try again.');
      } finally {
        loading.value = false;
      }
    };

    const viewSponsor = (sponsor) => {
      selectedSponsor.value = { ...sponsor };
    };

    const toggleSponsorStatus = async (sponsor) => {
      try {
        const response = await sponsorService.toggleSponsorStatus(sponsor._id || sponsor.id);
        if (response.success) {
          const index = sponsors.value.findIndex(s => (s.id || s._id) === (sponsor._id || sponsor.id));
          if (index !== -1) {
            sponsors.value[index] = {
              ...sponsors.value[index],
              isActive: response.data.isActive
            };
          }
          showDropdown.value = {};
          toast.success(`✓ Sponsor ${response.data.isActive ? 'enabled' : 'disabled'} successfully!`);
        } else {
          toast.error('❌ ' + (response.error || 'Failed to toggle sponsor status'));
        }
      } catch (error) {
        toast.error('❌ Failed to toggle sponsor status. Please try again.');
      }
    };

    onMounted(() => {
      fetchSponsors();
    });

    return () => (
      <div class="container-fluid px-3 px-lg-4">
        <div class="row">
          <div class="col-12">
            {/* Enhanced Header */}
            <div class="bg-gradient-primary rounded-4 p-4 mb-4 text-white shadow-lg">
              <div class="d-flex flex-column flex-md-row align-items-start align-items-md-center gap-3">
                <button 
                  class="btn btn-light btn-sm rounded-pill px-3" 
                  onClick={goBack}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  <ArrowLeftIcon style={{ width: '1rem', height: '1rem' }} />
                  <span class="d-none d-sm-inline">Back to Tools</span>
                  <span class="d-sm-none">Back</span>
                </button>
                <div class="flex-grow-1">
                  <h1 class="mb-1 fw-bold fs-2 text-dark">🤝 Sponsor Management</h1>
                  <p class="mb-0 text-dark" style={{ opacity: 0.8 }}>Manage your sponsorship partnerships and collaborations</p>
                  {!loading.value && sponsors.value.length > 0 && (
                    <small class="text-dark d-block mt-1" style={{ opacity: 0.8 }}>
                      <ChartBarIcon style={{ width: '16px', height: '16px' }} class="me-1" />
                      {sponsors.value.length} total sponsors • Page {currentPage.value} of {totalPages.value}
                    </small>
                  )}
                </div>
                <button 
                  class="btn btn-light btn-lg rounded-pill px-4 shadow-sm"
                  onClick={() => showAddModal.value = true}
                  disabled={loading.value}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '600' }}
                >
                  <PlusIcon style={{ width: '1.2rem', height: '1.2rem' }} />
                  <span class="d-none d-sm-inline">Add Sponsor</span>
                  <span class="d-sm-none">Add</span>
                </button>
              </div>
            </div>

            {loading.value && (
              <div class="text-center py-5">
                <div class="spinner-border text-primary mb-3" role="status" style={{ width: '3rem', height: '3rem' }}>
                  <span class="visually-hidden">Loading...</span>
                </div>
                <p class="text-muted">Loading sponsors...</p>
              </div>
            )}

            <div class="row g-4">
              {paginatedSponsors.value.map(sponsor => (
                <div key={sponsor._id || sponsor.id} class="col-xl-4 col-lg-6 col-md-6 col-sm-12">
                  <div 
                    class={`card border-0 shadow-lg h-100 position-relative overflow-hidden sponsor-card ${!sponsor.isActive ? 'opacity-50' : ''}`}
                    style={{ 
                      cursor: 'default',
                      transition: 'all 0.3s ease',
                      background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)'
                    }}
                  >
                    {!sponsor.isActive && (
                      <div class="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{ backgroundColor: 'rgba(0,0,0,0.1)', zIndex: 1, pointerEvents: 'none' }}>
                        <span class="badge bg-secondary px-3 py-2 rounded-pill shadow">🔒 Disabled</span>
                      </div>
                    )}
                    
                    {/* Sponsorship Type Badge */}
                    <div class="position-absolute top-0 start-0 m-3">
                      <span 
                        class="badge px-3 py-2 rounded-pill fw-bold"
                        style={{ 
                          backgroundColor: getTypeColor(sponsor.sponsorshipType) + '20',
                          color: getTypeColor(sponsor.sponsorshipType),
                          border: `2px solid ${getTypeColor(sponsor.sponsorshipType)}`
                        }}
                      >
                        {sponsor.sponsorshipType}
                      </span>
                    </div>
                    
                    <div class="card-body p-4">
                      <div class="d-flex align-items-start mb-3">
                        <div class="position-relative me-3 flex-shrink-0">
                          <div class="logo-container d-flex align-items-center justify-content-center" style={{ width: '70px', height: '70px' }}>
                            {sponsor.logo ? (
                              <img 
                                src={sponsor.logo} 
                                alt={sponsor.name}
                                class="rounded-circle border border-3 border-white shadow-lg"
                                style={{ 
                                  width: '70px', 
                                  height: '70px', 
                                  objectFit: 'cover',
                                  objectPosition: 'center',
                                  transition: 'transform 0.3s ease'
                                }}
                              />
                            ) : (
                              <div 
                                class="d-flex align-items-center justify-content-center rounded-circle border border-3 border-white shadow-lg"
                                style={{ 
                                  width: '70px', 
                                  height: '70px',
                                  backgroundColor: '#f8f9fa',
                                  border: '2px solid #e9ecef'
                                }}
                              >
                                <BuildingOffice2Icon 
                                  style={{ width: '2rem', height: '2rem', color: '#6c757d' }} 
                                />
                              </div>
                            )}
                          </div>
                        </div>
                        <div class="flex-grow-1">
                          <h5 class="mb-2 fw-bold text-dark" style={{ fontSize: '1.1rem' }}>{sponsor.name}</h5>
                          {sponsor.website && (
                            <div class="d-flex align-items-center mb-2">
                              <LinkIcon style={{ width: '1rem', height: '1rem', color: '#6c757d' }} class="me-2" />
                              <a 
                                href={sponsor.website} 
                                target="_blank" 
                                class="text-decoration-none small text-primary"
                              >
                                Visit Website
                              </a>
                            </div>
                          )}
                          <small class="text-success d-flex align-items-center fw-semibold">
                            ✅ Active Partnership
                          </small>
                        </div>
                        <div class="dropdown">
                          <button 
                            class="btn btn-light btn-sm rounded-circle d-flex align-items-center justify-content-center shadow-sm" 
                            type="button" 
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleDropdown(sponsor._id || sponsor.id);
                            }}
                            style={{ 
                              width: '40px', 
                              height: '40px', 
                              fontSize: '18px', 
                              fontWeight: 'bold',
                              transition: 'all 0.2s ease',
                              position: 'relative',
                              zIndex: 10
                            }}
                            title="More options"
                          >
                            ⋮
                          </button>
                          {showDropdown.value[sponsor._id || sponsor.id] && (
                            <ul class="dropdown-menu show position-absolute shadow-lg border-0 rounded-3" style={{ top: '100%', right: '0', zIndex: 1000, minWidth: '160px' }}>
                              {sponsor.isActive && (
                                <>
                                  <li>
                                    <button 
                                      class="dropdown-item d-flex align-items-center py-2 rounded-2" 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        editSponsor(sponsor);
                                        toggleDropdown(sponsor._id || sponsor.id);
                                      }}
                                    >
                                      <PencilIcon style={{ width: '16px', height: '16px' }} class="me-2 text-primary" />
                                      Edit
                                    </button>
                                  </li>
                                </>
                              )}
                              <li>
                                <button 
                                  class="dropdown-item d-flex align-items-center py-2 rounded-2" 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleSponsorStatus(sponsor);
                                    toggleDropdown(sponsor._id || sponsor.id);
                                  }}
                                >
                                  <span>{sponsor.isActive ? '🔴' : '🟢'}</span> {sponsor.isActive ? 'Disable' : 'Enable'}
                                </button>
                              </li>
                              {sponsor.isActive && (
                                <>
                                  <div class="dropdown-divider"></div>
                                  <li>
                                    <button 
                                      class="dropdown-item d-flex align-items-center py-2 text-danger rounded-2" 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        deleteSponsor(sponsor._id || sponsor.id);
                                        toggleDropdown(sponsor._id || sponsor.id);
                                      }}
                                    >
                                      <TrashIcon style={{ width: '16px', height: '16px' }} class="me-2" />
                                      Delete
                                    </button>
                                  </li>
                                </>
                              )}
                            </ul>
                          )}
                        </div>
                      </div>
                      
                      <div class="sponsor-content mb-3">
                        <div class="description-content p-3 rounded-3" style={{ backgroundColor: '#f8f9fa', border: '1px solid #e9ecef', minHeight: '100px' }}>
                          <p class="mb-0 text-dark lh-base" style={{ fontSize: '0.95rem' }}>
                            {expandedDescriptions.value[sponsor._id || sponsor.id] 
                              ? sponsor.description 
                              : truncateDescription(sponsor.description)}
                          </p>
                          {sponsor.description.length > 120 && (
                            <button 
                              class="btn btn-link p-0 text-primary fw-semibold mt-2" 
                              style={{ fontSize: '0.85rem', textDecoration: 'none' }}
                              onClick={() => toggleDescription(sponsor._id || sponsor.id)}
                            >
                              {expandedDescriptions.value[sponsor._id || sponsor.id] ? '👆 See less' : '👇 See more'}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Sponsorship Details - Removed date and amount fields */}
                      
                      <div class="d-flex align-items-center justify-content-between pt-3 border-top border-light">
                        <small class="text-muted d-flex align-items-center">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" class="me-1">
                            <path d="M9 11H7v6h2v-6zm4 0h-2v6h2v-6zm4 0h-2v6h2v-6zm2-7h-3V2h-2v2H8V2H6v2H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H3V8h14v12z"/>
                          </svg>
                          {new Date(sponsor.createdAt).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </small>
                        <button 
                          class="btn btn-primary btn-sm px-3 py-1 fw-semibold rounded-pill"
                          onClick={() => viewSponsor(sponsor)}
                          disabled={loading.value || !sponsor.isActive}
                          style={{ fontSize: '0.75rem', cursor: sponsor.isActive ? 'pointer' : 'not-allowed' }}
                          title={sponsor.isActive ? 'View full sponsor details in modal' : 'Sponsor is disabled'}
                        >
                          <EyeIcon style={{ width: '12px', height: '12px' }} class="me-1" />
                          View
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Enhanced Pagination */}
            {sponsors.value.length > itemsPerPage.value && (
              <div class="d-flex justify-content-center align-items-center mt-5">
                <nav aria-label="Sponsors pagination">
                  <ul class="pagination mb-0 shadow-sm rounded-pill" style={{ backgroundColor: 'white' }}>
                    <li class={`page-item ${currentPage.value === 1 ? 'disabled' : ''}`}>
                      <button 
                        class="page-link border-0 rounded-pill px-3 py-2 d-flex align-items-center" 
                        onClick={() => goToPage(currentPage.value - 1)}
                        disabled={currentPage.value === 1}
                        style={{ backgroundColor: 'transparent' }}
                      >
                        <ChevronLeftIcon style={{ width: '16px', height: '16px' }} class="me-1" />
                        <span class="d-none d-sm-inline">Previous</span>
                      </button>
                    </li>
                    {Array.from({ length: totalPages.value }, (_, i) => i + 1).map(page => (
                      <li key={page} class={`page-item ${currentPage.value === page ? 'active' : ''}`}>
                        <button 
                          class={`page-link border-0 rounded-circle mx-1 ${currentPage.value === page ? 'bg-primary text-white shadow-sm' : 'bg-light text-dark'}`}
                          onClick={() => goToPage(page)}
                          style={{ 
                            width: '40px', 
                            height: '40px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: '600'
                          }}
                        >
                          {page}
                        </button>
                      </li>
                    ))}
                    <li class={`page-item ${currentPage.value === totalPages.value ? 'disabled' : ''}`}>
                      <button 
                        class="page-link border-0 rounded-pill px-3 py-2 d-flex align-items-center" 
                        onClick={() => goToPage(currentPage.value + 1)}
                        disabled={currentPage.value === totalPages.value}
                        style={{ backgroundColor: 'transparent' }}
                      >
                        <span class="d-none d-sm-inline">Next</span>
                        <ChevronRightIcon style={{ width: '16px', height: '16px' }} class="ms-1" />
                      </button>
                    </li>
                  </ul>
                </nav>
              </div>
            )}

            {sponsors.value.length === 0 && !loading.value && (
              <div class="text-center py-5">
                <div class="mb-4 p-4 rounded-circle bg-light d-inline-flex align-items-center justify-content-center" style={{ width: '120px', height: '120px' }}>
                  <BuildingOffice2Icon style={{ width: '4rem', height: '4rem', color: '#6c757d' }} />
                </div>
                <h4 class="text-muted mb-3">🤝 No sponsors yet</h4>
                <p class="text-muted mb-4">Start building partnerships by adding your first sponsor</p>
                <button 
                  class="btn btn-primary btn-lg rounded-pill px-4 shadow-sm"
                  onClick={() => showAddModal.value = true}
                  style={{ fontWeight: '600' }}
                >
                  <PlusIcon style={{ width: '1.2rem', height: '1.2rem' }} class="me-2" />
                  Add First Sponsor
                </button>
              </div>
            )}

            {/* Add Modal */}
            {showAddModal.value && (
              <div class="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable modal-fullscreen-sm-down" style={{ maxWidth: '600px' }}>
                  <div class="modal-content">
                    <div class="modal-header">
                      <h5 class="modal-title">Add New Sponsor</h5>
                      <button class="btn-close" onClick={() => showAddModal.value = false}></button>
                    </div>
                    <div class="modal-body">
                      <div class="row g-3">
                        <div class="col-12">
                          <label class="form-label">Sponsor Name *</label>
                          <input 
                            type="text" 
                            class="form-control"
                            v-model={newSponsor.value.name}
                            placeholder="Enter sponsor name"
                            required
                          />
                        </div>
                        <div class="col-12">
                          <label class="form-label">Description</label>
                          <textarea 
                            class="form-control" 
                            rows="3"
                            v-model={newSponsor.value.description}
                            placeholder="Enter sponsor description"
                          ></textarea>
                        </div>
                        <div class="col-md-6">
                          <label class="form-label">Website</label>
                          <input 
                            type="url" 
                            class="form-control"
                            v-model={newSponsor.value.website}
                            placeholder="https://example.com"
                          />
                        </div>
                        <div class="col-12">
                          <label class="form-label">Logo Image</label>
                          <input 
                            type="file" 
                            class="form-control"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files[0];
                              if (file) {
                                newSponsor.value.logo = file;
                                newLogoUploaded.value = true;
                                newLogoFileName.value = file.name;
                              }
                            }}
                          />
                          {newLogoUploaded.value && (
                            <div class="mt-2 p-2 bg-success bg-opacity-10 rounded">
                              <small class="text-success">
                                ✓ Logo uploaded: {newLogoFileName.value}
                              </small>
                            </div>
                          )}
                          <small class="form-text text-muted">Max file size: 5MB (JPG, PNG, GIF)</small>
                        </div>
                        <div class="col-md-6">
                          <label class="form-label">Sponsorship Type</label>
                          <select 
                            class="form-select"
                            v-model={newSponsor.value.sponsorshipType}
                          >
                            {sponsorshipTypes.map(type => (
                              <option key={type} value={type}>{type}</option>
                            ))}
                          </select>
                        </div>
                        <div class="col-12">
                          <div class="form-check">
                            <input 
                              class="form-check-input" 
                              type="checkbox" 
                              v-model={newSponsor.value.isActive}
                            />
                            <label class="form-check-label">
                              Active Sponsorship
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div class="modal-footer">
                      <button class="btn btn-secondary" onClick={() => showAddModal.value = false}>Cancel</button>
                      <button 
                        class="btn btn-primary" 
                        onClick={addSponsor}
                        disabled={loading.value}
                      >
                        {loading.value ? 'Adding...' : 'Add Sponsor'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Edit Modal */}
            {showEditModal.value && editingSponsor.value && (
              <div class="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable modal-fullscreen-sm-down" style={{ maxWidth: '600px' }}>
                  <div class="modal-content">
                    <div class="modal-header">
                      <h5 class="modal-title">Edit Sponsor</h5>
                      <button 
                        class="btn-close" 
                        onClick={() => {
                          showEditModal.value = false;
                          editingSponsor.value = null;
                        }}
                      ></button>
                    </div>
                    <div class="modal-body">
                      <div class="row g-3">
                        <div class="col-12">
                          <label class="form-label">Sponsor Name *</label>
                          <input 
                            type="text" 
                            class="form-control"
                            v-model={editingSponsor.value.name}
                            placeholder="Enter sponsor name"
                            required
                          />
                        </div>
                        <div class="col-12">
                          <label class="form-label">Description</label>
                          <textarea 
                            class="form-control" 
                            rows="3"
                            v-model={editingSponsor.value.description}
                            placeholder="Enter sponsor description"
                          ></textarea>
                        </div>
                        <div class="col-md-6">
                          <label class="form-label">Website</label>
                          <input 
                            type="url" 
                            class="form-control"
                            v-model={editingSponsor.value.website}
                            placeholder="https://example.com"
                          />
                        </div>
                        <div class="col-12">
                          <label class="form-label">Logo Image</label>
                          <input 
                            type="file" 
                            class="form-control"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files[0];
                              if (file) {
                                editingSponsor.value.logo = file;
                                editLogoUploaded.value = true;
                                editLogoFileName.value = file.name;
                              }
                            }}
                          />
                          {editLogoUploaded.value && (
                            <div class="mt-2 p-2 bg-success bg-opacity-10 rounded">
                              <small class="text-success">
                                ✓ Logo uploaded: {editLogoFileName.value}
                              </small>
                            </div>
                          )}
                          <small class="form-text text-muted">Max file size: 5MB (JPG, PNG, GIF)</small>
                        </div>
                        <div class="col-md-6">
                          <label class="form-label">Sponsorship Type</label>
                          <select 
                            class="form-select"
                            v-model={editingSponsor.value.sponsorshipType}
                          >
                            {sponsorshipTypes.map(type => (
                              <option key={type} value={type}>{type}</option>
                            ))}
                          </select>
                        </div>
                        <div class="col-12">
                          <div class="form-check">
                            <input 
                              class="form-check-input" 
                              type="checkbox" 
                              v-model={editingSponsor.value.isActive}
                            />
                            <label class="form-check-label">
                              Active Sponsorship
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div class="modal-footer">
                      <button class="btn btn-secondary" onClick={() => showEditModal.value = false}>Cancel</button>
                      <button 
                        class="btn btn-primary" 
                        onClick={updateSponsor}
                        disabled={loading.value}
                      >
                        {loading.value ? 'Updating...' : 'Update Sponsor'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Sponsor Preview Modal */}
            {selectedSponsor.value && (
              <div class="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={() => selectedSponsor.value = null}>
                <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable modal-fullscreen-sm-down" style={{ maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
                  <div class="modal-content border-0 shadow-lg" style={{ borderRadius: '16px', maxHeight: '80vh' }}>
                    <div class="modal-header bg-primary text-white border-0" style={{ borderRadius: '16px 16px 0 0' }}>
                      <h5 class="mb-0 fw-bold d-flex align-items-center">
                        <EyeIcon style={{ width: '1.5rem', height: '1.5rem' }} class="me-2" />
                        Sponsor Details
                      </h5>
                      <button 
                        class="btn-close btn-close-white" 
                        onClick={() => selectedSponsor.value = null}
                      ></button>
                    </div>
                    <div class="modal-body p-4" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                      {selectedSponsor.value.logo && (
                        <div class="text-center mb-4">
                          <img 
                            src={selectedSponsor.value.logo} 
                            alt={selectedSponsor.value.name}
                            class="rounded-circle border border-3 border-white shadow-lg"
                            style={{ width: '100px', height: '100px', objectFit: 'cover' }}
                          />
                        </div>
                      )}
                      <h4 class="mb-2 text-center fw-bold text-dark">{selectedSponsor.value.name}</h4>
                      <div class="text-center mb-3">
                        <span 
                          class="badge px-3 py-2 rounded-pill fw-bold"
                          style={{ 
                            backgroundColor: getTypeColor(selectedSponsor.value.sponsorshipType) + '20',
                            color: getTypeColor(selectedSponsor.value.sponsorshipType),
                            border: `2px solid ${getTypeColor(selectedSponsor.value.sponsorshipType)}`
                          }}
                        >
                          {selectedSponsor.value.sponsorshipType} Sponsor
                        </span>
                      </div>
                      
                      {selectedSponsor.value.website && (
                        <div class="text-center mb-3">
                          <a 
                            href={selectedSponsor.value.website} 
                            target="_blank" 
                            class="btn btn-outline-primary btn-sm"
                          >
                            <LinkIcon style={{ width: '16px', height: '16px' }} class="me-1" />
                            Visit Website
                          </a>
                        </div>
                      )}

                      <div class="p-3 rounded-3 mb-4" style={{ backgroundColor: '#f8f9fa', border: '1px solid #e9ecef' }}>
                        <h6 class="fw-bold mb-2">Description</h6>
                        <p class="mb-0 text-dark lh-base" style={{ fontSize: '0.95rem' }}>{selectedSponsor.value.description}</p>
                      </div>
                      
                      <hr class="my-3" />
                      <small class="text-muted d-flex align-items-center gap-1">
                        <CalendarIcon style={{ width: '14px', height: '14px' }} />
                        Partnership started on {new Date(selectedSponsor.value.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                      </small>
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