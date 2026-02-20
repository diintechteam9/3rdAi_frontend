import { ref, onMounted, h, computed } from 'vue';
import { useRouter } from 'vue-router';
import { ArrowLeftIcon, PlusIcon, StarIcon, TrashIcon, PencilIcon, ChevronLeftIcon, ChevronRightIcon, ChartBarIcon } from '@heroicons/vue/24/outline';
import { useToast } from 'vue-toastification';
import testimonialService from '../../../services/testimonialService.js';

export default {
  name: 'ClientTestimonial',
  setup() {
    const router = useRouter();
    const toast = useToast();
    const testimonials = ref([]);
    const loading = ref(false);
    const showAddModal = ref(false);
    const showEditModal = ref(false);
    const showDropdown = ref({});
    const editingTestimonial = ref(null);
    const editImageUploaded = ref(false);
    const editImageFileName = ref('');
    const expandedMessages = ref({});
    const currentPage = ref(1);
    const itemsPerPage = ref(12);

    const toggleDropdown = (testimonialId) => {
      showDropdown.value = {
        ...showDropdown.value,
        [testimonialId]: !showDropdown.value[testimonialId]
      };
    };

    const toggleMessage = (testimonialId) => {
      expandedMessages.value = {
        ...expandedMessages.value,
        [testimonialId]: !expandedMessages.value[testimonialId]
      };
    };

    const truncateMessage = (message, limit = 120) => {
      if (message.length <= limit) return message;
      return message.substring(0, limit) + '...';
    };

    const paginatedTestimonials = computed(() => {
      const start = (currentPage.value - 1) * itemsPerPage.value;
      const end = start + itemsPerPage.value;
      return testimonials.value.slice(start, end);
    });

    const totalPages = computed(() => {
      return Math.ceil(testimonials.value.length / itemsPerPage.value);
    });

    const goToPage = (page) => {
      if (page >= 1 && page <= totalPages.value) {
        currentPage.value = page;
      }
    };

    const toggleTestimonialStatus = async (testimonial) => {
      try {
        const response = await testimonialService.toggleTestimonialStatus(testimonial._id || testimonial.id);
        if (response.success) {
          const index = testimonials.value.findIndex(t => (t.id || t._id) === (testimonial._id || testimonial.id));
          if (index !== -1) {
            testimonials.value[index] = {
              ...testimonials.value[index],
              isActive: response.data.isActive
            };
          }
          showDropdown.value = {};
          toast.success(`✓ Testimonial ${response.data.isActive ? 'enabled' : 'disabled'} successfully!`);
        } else {
          toast.error('❌ ' + (response.error || 'Failed to toggle testimonial status'));
        }
      } catch (error) {
        toast.error('❌ Failed to toggle testimonial status. Please try again.');
      }
    };

    const newTestimonial = ref({
      name: '',
      rating: 5,
      message: '',
      image: null
    });
    const newImageUploaded = ref(false);
    const newImageFileName = ref('');

    const goBack = () => {
      router.push('/client/tools');
    };

    const fetchTestimonials = async () => {
      loading.value = true;
      try {
        const response = await testimonialService.getAllTestimonials();
        if (response.success && response.data) {
          let testimonialsList = Array.isArray(response.data.data) ? response.data.data : [];
          
          // Use signedImageUrl from backend if available
          testimonialsList = testimonialsList.map(testimonial => ({
            ...testimonial,
            image: testimonial.signedImageUrl || testimonial.image || null
          }));
          
          testimonials.value = testimonialsList;
        } else {
          testimonials.value = [];
        }
      } catch (error) {
        toast.error('Failed to load testimonials');
        testimonials.value = [];
      } finally {
        loading.value = false;
      }
    };

    const addTestimonial = async () => {
      try {
        loading.value = true;
        toast.info('Creating testimonial...');
        const { image, ...testimonialData } = newTestimonial.value;
        console.log('1. Creating testimonial without image:', testimonialData);
        const response = await testimonialService.createTestimonial(testimonialData);
        
        if (response.success && response.data) {
          let createdTestimonial = response.data;
          console.log('2. Testimonial created:', createdTestimonial._id);
          
          // Upload image if provided
          if (image && createdTestimonial._id) {
            console.log('3. Uploading image for testimonial:', createdTestimonial._id);
            console.log('4. Image file:', image.name, image.type, image.size);
            try {
              toast.info('Uploading image...');
              const imageResponse = await testimonialService.uploadImage(createdTestimonial._id, image);
              console.log('5. Image upload response:', imageResponse);
              if (imageResponse.success && imageResponse.data) {
                createdTestimonial.image = imageResponse.data.imageUrl;
                console.log('6. Image uploaded successfully:', imageResponse.data.imageUrl);
              } else {
                console.error('7. Image upload failed:', imageResponse.error);
              }
            } catch (imageError) {
              console.error('8. Image upload error:', imageError);
              toast.error('⚠️ Testimonial created but image upload failed');
            }
          } else {
            console.log('3. No image to upload or no testimonial ID');
          }
          
          newTestimonial.value = { name: '', rating: 5, message: '', image: null };
          showAddModal.value = false;
          toast.success('✓ Testimonial added successfully!');
          
          // Refresh list to get pre-signed URLs
          await fetchTestimonials();
        } else {
          console.error('Create testimonial failed:', response.error);
          toast.error('❌ ' + (response.error || 'Failed to create testimonial'));
        }
      } catch (error) {
        console.error('Add testimonial error:', error);
        toast.error('❌ Failed to create testimonial. Please try again.');
      } finally {
        loading.value = false;
      }
    };

    const editTestimonial = (testimonial) => {
      editingTestimonial.value = { ...testimonial };
      showEditModal.value = true;
    };

    const updateTestimonial = async () => {
      try {
        loading.value = true;
        toast.info('Updating testimonial...');
        const { image, ...testimonialData } = editingTestimonial.value;
        
        const response = await testimonialService.updateTestimonial(
          editingTestimonial.value.id || editingTestimonial.value._id, 
          testimonialData
        );
        
        if (response.success) {
          let updatedTestimonial = response.data;
          
          // Upload new image if provided
          if (image && typeof image !== 'string') {
            try {
              toast.info('Uploading new image...');
              const imageResponse = await testimonialService.uploadImage(updatedTestimonial._id, image);
              if (imageResponse.success && imageResponse.data) {
                updatedTestimonial.image = imageResponse.data.imageUrl;
              }
            } catch (imageError) {
              toast.error('⚠️ Testimonial updated but image upload failed');
            }
          }
          
          showEditModal.value = false;
          editingTestimonial.value = null;
          toast.success('✓ Testimonial updated successfully!');
          
          // Refresh list to get pre-signed URLs
          await fetchTestimonials();
        }
      } catch (error) {
        toast.error('❌ Failed to update testimonial. Please try again.');
      } finally {
        loading.value = false;
      }
    };

    const deleteTestimonial = async (id) => {
      // Simple confirmation with toast
      const confirmed = confirm('Are you sure you want to delete this testimonial?');
      if (!confirmed) {
        toast.info('Delete cancelled');
        return;
      }
      
      try {
        loading.value = true;
        toast.info('Deleting testimonial...');
        const response = await testimonialService.deleteTestimonial(id);
        
        if (response.success) {
          testimonials.value = testimonials.value.filter(t => (t.id || t._id) !== id);
          toast.success('✓ Testimonial deleted successfully!');
        } else {
          toast.error('❌ ' + (response.message || 'Failed to delete testimonial'));
        }
      } catch (error) {
        toast.error('❌ Failed to delete testimonial. Please try again.');
      } finally {
        loading.value = false;
      }
    };

    const handleImageUpload = async (event, testimonialId) => {
      const file = event.target.files[0];
      if (!file) return;

      if (!file.type.startsWith('image/')) {
        toast.error('Only image files allowed');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image must be under 5MB');
        return;
      }

      try {
        loading.value = true;
        toast.info('Uploading image...');
        const response = await testimonialService.uploadImage(testimonialId, file);
        
        if (response.success && response.data && response.data.imageUrl) {
          let imageUrl = response.data.imageUrl;
          
          // Get presigned URL for S3 images
          try {
            const presignedUrl = await testimonialService.getPresignedImageUrl(imageUrl);
            imageUrl = presignedUrl || imageUrl;
          } catch (error) {
            // console.warn('Failed to get presigned URL, using original:', error);
          }
          
          const index = testimonials.value.findIndex(t => (t.id || t._id) === testimonialId);
          if (index !== -1) {
            // Force Vue reactivity by creating a new object
            testimonials.value[index] = {
              ...testimonials.value[index],
              image: imageUrl
            };
            // console.log('Image updated in testimonials array:', testimonials.value[index]);
          }
          toast.success('✓ Image uploaded successfully!');
        } else {
          toast.error('❌ Failed to upload image');
        }
      } catch (error) {
        toast.error('❌ Failed to upload image. Please try again.');
      } finally {
        loading.value = false;
      }
    };

    const renderStars = (rating) => {
      return Array.from({ length: 5 }).map((_, i) =>
        h(StarIcon, {
          key: i,
          style: {
            width: '1rem',
            height: '1rem',
            color: i < rating ? '#ffc107' : '#e9ecef'
          },
          fill: i < rating ? '#ffc107' : 'none'
        })
      );
    };

    onMounted(() => {
      // Console log all tokens for debugging
      const clientToken = localStorage.getItem('token_client');
      const userToken = localStorage.getItem('token_user');
      const adminToken = localStorage.getItem('token_admin');
      const superAdminToken = localStorage.getItem('token_super_admin');
      
      console.log('=== TESTIMONIAL TOKEN DEBUG ===');
      console.log('Client Token:', clientToken);
      console.log('User Token:', userToken);
      console.log('Admin Token:', adminToken);
      console.log('Super Admin Token:', superAdminToken);
      console.log('Current URL:', window.location.href);
      console.log('Testimonial Context: CLIENT DASHBOARD');
      
      // Decode and validate client token
      if (clientToken && clientToken.startsWith('eyJ')) {
        try {
          const payload = JSON.parse(atob(clientToken.split('.')[1]));
          console.log('✅ Client Token Payload:', payload);
          console.log('🕐 Token Expires:', new Date(payload.exp * 1000));
          console.log('⏰ Current Time:', new Date());
          console.log('🔑 Token Valid:', payload.exp * 1000 > Date.now());
          
          // Copy token for Postman
          console.log('📋 COPY THIS TOKEN FOR POSTMAN:');
          console.log(clientToken);
        } catch (e) {
          console.log('❌ Could not decode client token:', e);
        }
      }
      
      // Check if user token is real or test
      if (userToken === 'your_user_token_here') {
        console.log('⚠️ User token is a test value, not real token');
        console.log('💡 To get real user token: Login as user role');
      } else if (userToken && userToken.startsWith('eyJ')) {
        console.log('✅ User token appears to be real JWT');
        try {
          const payload = JSON.parse(atob(userToken.split('.')[1]));
          console.log('User Token Payload:', payload);
        } catch (e) {
          console.log('❌ Could not decode user token');
        }
      } else {
        console.log('❌ No valid user token found');
      }
      
      console.log('===============================');
      
      fetchTestimonials();
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
                  <h1 class="mb-1 fw-bold fs-2 text-dark">✨ Customer Testimonials</h1>
                  <p class="mb-0 text-dark" style={{ opacity: 0.8 }}>Showcase your customer success stories</p>
                  {!loading.value && testimonials.value.length > 0 && (
                    <small class="text-dark d-block mt-1" style={{ opacity: 0.8 }}>
                      <ChartBarIcon style={{ width: '16px', height: '16px' }} class="me-1" />
                      {testimonials.value.length} total testimonials • Page {currentPage.value} of {totalPages.value}
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
                  <span class="d-none d-sm-inline">Add Testimonial</span>
                  <span class="d-sm-none">Add</span>
                </button>
              </div>
            </div>

            {loading.value && (
              <div class="text-center py-5">
                <div class="spinner-border text-primary mb-3" role="status" style={{ width: '3rem', height: '3rem' }}>
                  <span class="visually-hidden">Loading...</span>
                </div>
                <p class="text-muted">Loading testimonials...</p>
              </div>
            )}

            <div class="row g-4">
              {paginatedTestimonials.value.map(testimonial => (
                <div key={testimonial._id || testimonial.id} class="col-xl-4 col-lg-6 col-md-6 col-sm-12">
                  <div 
                    class={`card border-0 shadow-lg h-100 position-relative overflow-hidden testimonial-card ${!testimonial.isActive ? 'opacity-50' : ''}`}
                    style={{ 
                      cursor: 'default',
                      transition: 'all 0.3s ease',
                      background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)'
                    }}
                  >
                    {!testimonial.isActive && (
                      <div class="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{ backgroundColor: 'rgba(0,0,0,0.1)', zIndex: 1, pointerEvents: 'none' }}>
                        <span class="badge bg-secondary px-3 py-2 rounded-pill shadow">🔒 Disabled</span>
                      </div>
                    )}
                    
                    {/* Enhanced Quote decoration */}
                    <div class="position-absolute top-0 end-0 p-3" style={{ opacity: 0.08, fontSize: '4rem', color: '#007bff', fontFamily: 'serif' }}>❝</div>
                    
                    <div class="card-body p-4">
                      <div class="d-flex align-items-start mb-3">
                        <div class="position-relative me-3">
                          <div class="avatar-container" style={{ position: 'relative' }}>
                            <img 
                              src={testimonial.image && testimonial.image.trim() ? testimonial.image : `https://ui-avatars.com/api/?name=${encodeURIComponent(testimonial.name)}&background=007bff&color=fff&size=70&font-size=0.33`} 
                              alt={testimonial.name}
                              class="rounded-circle border border-3 border-white shadow-lg"
                              style={{ 
                                width: '70px', 
                                height: '70px', 
                                objectFit: 'cover',
                                transition: 'transform 0.3s ease'
                              }}
                              onError={(e) => {
                                const currentSrc = e.target.src;
                                const isLocalUrl = currentSrc.includes('localhost') || currentSrc.includes('127.0.0.1') || currentSrc.startsWith('/uploads/');
                                const isS3Url = currentSrc.includes('s3.amazonaws.com') || currentSrc.includes('amazonaws.com');
                                
                                if (isLocalUrl) {
                                  e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(testimonial.name)}&background=6c757d&color=fff&size=70&font-size=0.33`;
                                  return;
                                }
                                
                                if (isS3Url && !e.target.dataset.retried) {
                                  e.target.dataset.retried = 'true';
                                  setTimeout(() => {
                                    e.target.src = currentSrc + (currentSrc.includes('?') ? '&' : '?') + 't=' + Date.now();
                                  }, 1000);
                                } else {
                                  e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(testimonial.name)}&background=6c757d&color=fff&size=70&font-size=0.33`;
                                }
                              }}
                              onLoad={(e) => {
                                if (e.target) {
                                  e.target.dataset.retried = 'false';
                                }
                              }}
                            />
                            <input 
                              type="file" 
                              accept="image/*"
                              style={{ display: 'none' }}
                              id={`image-upload-${testimonial.id || testimonial._id}`}
                              onChange={(e) => handleImageUpload(e, testimonial.id || testimonial._id)}
                            />
                            <label 
                              for={`image-upload-${testimonial.id || testimonial._id}`}
                              class="position-absolute bottom-0 end-0 btn btn-primary btn-sm rounded-circle d-flex align-items-center justify-content-center shadow-sm"
                              style={{ 
                                width: '28px', 
                                height: '28px', 
                                fontSize: '12px', 
                                cursor: 'pointer',
                                border: '2px solid white'
                              }}
                              title="Change photo"
                              onClick={(e) => e.stopPropagation()}
                            >
                              📷
                            </label>
                          </div>
                        </div>
                        <div class="flex-grow-1">
                          <h5 class="mb-2 fw-bold text-dark" style={{ fontSize: '1.1rem' }}>{testimonial.name}</h5>
                          <div class="d-flex align-items-center mb-2">
                            <div class="d-flex me-2" style={{ gap: '2px' }}>
                              {renderStars(testimonial.rating)}
                            </div>
                            <span class="badge bg-warning-subtle text-warning px-2 py-1 rounded-pill fw-semibold">
                              ⭐ {testimonial.rating}/5
                            </span>
                          </div>
                          <small class="text-success d-flex align-items-center fw-semibold">
                            ✅ Verified Customer
                          </small>
                        </div>
                        <div class="dropdown">
                          <button 
                            class="btn btn-light btn-sm rounded-circle d-flex align-items-center justify-content-center shadow-sm" 
                            type="button" 
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleDropdown(testimonial.id || testimonial._id);
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
                          {showDropdown.value[testimonial.id || testimonial._id] && (
                            <ul class="dropdown-menu show position-absolute shadow-lg border-0 rounded-3" style={{ top: '100%', right: '0', zIndex: 1000, minWidth: '160px' }}>
                              {testimonial.isActive && (
                                <>
                                  <li>
                                    <button 
                                      class="dropdown-item d-flex align-items-center py-2 rounded-2" 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        editTestimonial(testimonial);
                                        toggleDropdown(testimonial.id || testimonial._id);
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
                                  toggleTestimonialStatus(testimonial);
                                  toggleDropdown(testimonial.id || testimonial._id);
                                }}
                              >
                                <span>{testimonial.isActive ? '🔴' : '🟢'}</span> {testimonial.isActive ? 'Disable' : 'Enable'}
                              </button>
                              </li>
                              {testimonial.isActive && (
                                <>
                                  <div class="dropdown-divider"></div>
                                  <li>
                                    <button 
                                      class="dropdown-item d-flex align-items-center py-2 text-danger rounded-2" 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        deleteTestimonial(testimonial.id || testimonial._id);
                                        toggleDropdown(testimonial.id || testimonial._id);
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
                      
                      <div class="testimonial-content mb-3">
                        <blockquote class="mb-0 position-relative">
                          <div class="quote-content p-3 rounded-3" style={{ backgroundColor: '#f8f9fa', border: '1px solid #e9ecef', minHeight: '120px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                            <p class="mb-0 fst-italic text-dark lh-base" style={{ fontSize: '0.95rem' }}>
                              "{expandedMessages.value[testimonial.id || testimonial._id] 
                                ? testimonial.message 
                                : truncateMessage(testimonial.message)}"
                            </p>
                            {testimonial.message.length > 120 && (
                              <button 
                                class="btn btn-link p-0 text-primary fw-semibold mt-2 align-self-start" 
                                style={{ fontSize: '0.85rem', textDecoration: 'none' }}
                                onClick={() => toggleMessage(testimonial.id || testimonial._id)}
                              >
                                {expandedMessages.value[testimonial.id || testimonial._id] ? '👆 See less' : '👇 See more'}
                              </button>
                            )}
                          </div>
                        </blockquote>
                      </div>
                      
                      <div class="d-flex align-items-center justify-content-between pt-3 border-top border-light">
                        <small class="text-muted d-flex align-items-center">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" class="me-1">
                            <path d="M9 11H7v6h2v-6zm4 0h-2v6h2v-6zm4 0h-2v6h2v-6zm2-7h-3V2h-2v2H8V2H6v2H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H3V8h14v12z"/>
                          </svg>
                          {new Date(testimonial.createdAt).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </small>
                        <div class="d-flex align-items-center">
                          <span class="badge bg-success-subtle text-success px-3 py-2 rounded-pill fw-semibold">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" class="me-1">
                              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                            </svg>
                            Featured
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Enhanced Pagination */}
            {testimonials.value.length > itemsPerPage.value && (
              <div class="d-flex justify-content-center align-items-center mt-5">
                <nav aria-label="Testimonials pagination">
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

            {testimonials.value.length === 0 && !loading.value && (
              <div class="text-center py-5">
                <div class="mb-4 p-4 rounded-circle bg-light d-inline-flex align-items-center justify-content-center" style={{ width: '120px', height: '120px' }}>
                  <StarIcon style={{ width: '4rem', height: '4rem', color: '#6c757d' }} />
                </div>
                <h4 class="text-muted mb-3">🌟 No testimonials yet</h4>
                <p class="text-muted mb-4">Start building trust by adding your first customer testimonial</p>
                <button 
                  class="btn btn-primary btn-lg rounded-pill px-4 shadow-sm"
                  onClick={() => showAddModal.value = true}
                  style={{ fontWeight: '600' }}
                >
                  <PlusIcon style={{ width: '1.2rem', height: '1.2rem' }} class="me-2" />
                  Add First Testimonial
                </button>
              </div>
            )}

            {/* Add Modal */}
            {showAddModal.value && (
              <div class="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                <div class="modal-dialog">
                  <div class="modal-content">
                    <div class="modal-header">
                      <h5 class="modal-title">Add New Testimonial</h5>
                      <button class="btn-close" onClick={() => showAddModal.value = false}></button>
                    </div>
                    <div class="modal-body">
                      <div class="mb-3">
                        <label class="form-label">Customer Name</label>
                        <input 
                          type="text" 
                          class="form-control" 
                          v-model={newTestimonial.value.name}
                          placeholder="Enter customer name"
                        />
                      </div>
                      <div class="mb-3">
                        <label class="form-label">Rating</label>
                        <select class="form-select" v-model={newTestimonial.value.rating}>
                          <option value={5}>5 Stars - Excellent</option>
                          <option value={4}>4 Stars - Very Good</option>
                          <option value={3}>3 Stars - Good</option>
                          <option value={2}>2 Stars - Fair</option>
                          <option value={1}>1 Star - Poor</option>
                        </select>
                      </div>
                      <div class="mb-3">
                        <label class="form-label">Testimonial Message</label>
                        <textarea 
                          class="form-control" 
                          rows="4"
                          v-model={newTestimonial.value.message}
                          placeholder="Enter testimonial message"
                        ></textarea>
                      </div>
                      <div class="mb-3">
                        <label class="form-label">Profile Image</label>
                        <input 
                          type="file" 
                          class="form-control" 
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files[0];
                            if (file) {
                              newTestimonial.value.image = file;
                              newImageUploaded.value = true;
                              newImageFileName.value = file.name;
                            }
                          }}
                        />
                        {newImageUploaded.value && (
                          <div class="mt-2 p-2 bg-success bg-opacity-10 rounded">
                            <small class="text-success">
                              ✓ Image uploaded: {newImageFileName.value}
                            </small>
                          </div>
                        )}
                        <small class="form-text text-muted">Max file size: 5MB (JPG, PNG, GIF)</small>
                      </div>
                    </div>
                    <div class="modal-footer">
                      <button class="btn btn-secondary" onClick={() => showAddModal.value = false}>Cancel</button>
                      <button 
                        class="btn btn-primary" 
                        onClick={addTestimonial}
                        disabled={loading.value}
                      >
                        {loading.value ? 'Adding...' : 'Add Testimonial'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Edit Modal */}
            {showEditModal.value && editingTestimonial.value && (
              <div class="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                <div class="modal-dialog">
                  <div class="modal-content">
                    <div class="modal-header">
                      <h5 class="modal-title">Edit Testimonial</h5>
                      <button 
                        class="btn-close" 
                        onClick={() => {
                          showEditModal.value = false;
                          editingTestimonial.value = null;
                        }}
                      ></button>
                    </div>
                    <div class="modal-body">
                      <div class="mb-3">
                        <label class="form-label">Customer Name</label>
                        <input 
                          type="text" 
                          class="form-control" 
                          v-model={editingTestimonial.value.name}
                          placeholder="Enter customer name"
                        />
                      </div>
                      <div class="mb-3">
                        <label class="form-label">Rating</label>
                        <select class="form-select" v-model={editingTestimonial.value.rating}>
                          <option value={5}>5 Stars - Excellent</option>
                          <option value={4}>4 Stars - Very Good</option>
                          <option value={3}>3 Stars - Good</option>
                          <option value={2}>2 Stars - Fair</option>
                          <option value={1}>1 Star - Poor</option>
                        </select>
                      </div>
                      <div class="mb-3">
                        <label class="form-label">Testimonial Message</label>
                        <textarea 
                          class="form-control" 
                          rows="4"
                          v-model={editingTestimonial.value.message}
                          placeholder="Enter testimonial message"
                        ></textarea>
                      </div>
                      <div class="mb-3">
                        <label class="form-label">Profile Image</label>
                        <input 
                          type="file" 
                          class="form-control" 
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files[0];
                            if (file) {
                              editingTestimonial.value.image = file;
                              editImageUploaded.value = true;
                              editImageFileName.value = file.name;
                            }
                          }}
                        />
                        {editImageUploaded.value && (
                          <div class="mt-2 p-2 bg-success bg-opacity-10 rounded">
                            <small class="text-success">
                              ✓ Image uploaded: {editImageFileName.value}
                            </small>
                          </div>
                        )}
                        <small class="form-text text-muted">Max file size: 5MB (JPG, PNG, GIF)</small>
                      </div>
                    </div>
                    <div class="modal-footer">
                      <button class="btn btn-secondary" onClick={() => showEditModal.value = false}>Cancel</button>
                      <button 
                        class="btn btn-primary" 
                        onClick={updateTestimonial}
                        disabled={loading.value}
                      >
                        {loading.value ? 'Updating...' : 'Update Testimonial'}
                      </button>
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