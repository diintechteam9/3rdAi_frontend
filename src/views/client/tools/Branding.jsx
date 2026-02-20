import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import { ArrowLeftIcon, PlusIcon, PhotoIcon, TrashIcon, EyeIcon, PencilIcon, EllipsisVerticalIcon, CalendarIcon, ChartBarIcon, SwatchIcon, GlobeAltIcon, ShareIcon } from '@heroicons/vue/24/outline';
import brandAssetService from '../../../services/brandAssetService.js';

export default {
  name: 'ClientBranding',
  setup() {
    const router = useRouter();
    const toast = useToast();
    const brandAssets = ref([]);
    const loading = ref(false);
    const showUploadModal = ref(false);
    const showEditModal = ref(false);
    const selectedAsset = ref(null);
    const showViewModal = ref(false);
    const activeDropdown = ref(null);
    const editingAsset = ref(null);
    const formData = ref({
      headingText: '',
      brandLogoName: '',
      brandLogoImage: null,
      backgroundLogoImage: null,
      webLinkUrl: '',
      socialLink: ''
    });
    const editFormData = ref({
      headingText: '',
      brandLogoName: '',
      webLinkUrl: '',
      socialLink: '',
      brandLogoImage: null,
      backgroundLogoImage: null
    });
    const imageUploaded = ref(false);
    const imageFileName = ref('');
    const backgroundImageUploaded = ref(false);
    const backgroundImageFileName = ref('');
    const editImageUploaded = ref(false);
    const editImageFileName = ref('');
    const editBackgroundImageUploaded = ref(false);
    const editBackgroundImageFileName = ref('');

    // Generate placeholder image as data URL
    const generatePlaceholder = (text, bgColor = '007bff', textColor = 'ffffff') => {
      const canvas = document.createElement('canvas');
      canvas.width = 100;
      canvas.height = 100;
      const ctx = canvas.getContext('2d');
      
      // Fill background
      ctx.fillStyle = `#${bgColor}`;
      ctx.fillRect(0, 0, 100, 100);
      
      // Add text
      ctx.fillStyle = `#${textColor}`;
      ctx.font = 'bold 40px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text.charAt(0).toUpperCase(), 50, 50);
      
      return canvas.toDataURL();
    };
    const loadBrandAssets = async () => {
      loading.value = true;
      try {
        const response = await brandAssetService.getAllBrandAssets();
        if (response.success) {
          let assetsList = response.data.data || [];
          
          // Convert S3 URLs to presigned URLs with better error handling
          assetsList = await Promise.all(
            assetsList.map(async (asset) => {
              if (asset.brandLogoImage || asset.brandLogoImageKey) {
                try {
                  const presignedUrl = await brandAssetService.getPresignedImageUrl(
                    asset.brandLogoImage, 
                    asset.brandLogoImageKey
                  );
                  // Only use presigned URL if it's valid
                  if (presignedUrl && presignedUrl.startsWith('http')) {
                    asset.brandLogoImage = presignedUrl;
                  } else {
                    asset.brandLogoImage = asset.brandLogoImage || null;
                  }
                } catch (error) {
                  // Keep original URL as fallback
                  asset.brandLogoImage = asset.brandLogoImage || null;
                }
              }
              if (asset.backgroundLogoImage || asset.backgroundLogoImageKey) {
                try {
                  const presignedUrl = await brandAssetService.getPresignedImageUrl(
                    asset.backgroundLogoImage, 
                    asset.backgroundLogoImageKey
                  );
                  if (presignedUrl && presignedUrl.startsWith('http')) {
                    asset.backgroundLogoImage = presignedUrl;
                  } else {
                    asset.backgroundLogoImage = asset.backgroundLogoImage || null;
                  }
                } catch (error) {
                  asset.backgroundLogoImage = asset.backgroundLogoImage || null;
                }
              }
              // Debug log
              console.log('Asset loaded:', {
                name: asset.brandLogoName,
                hasBackgroundImage: !!asset.backgroundLogoImage,
                backgroundImageUrl: asset.backgroundLogoImage
              });
              return asset;
            })
          );
          
          brandAssets.value = assetsList;
        } else {
          // Failed to load brand assets
        }
      } catch (error) {
        // Error loading brand assets
      } finally {
        loading.value = false;
      }
    };

    // Add new brand asset
    const addBrandAsset = async () => {
      if (!formData.value.headingText || !formData.value.brandLogoName || !formData.value.webLinkUrl || !formData.value.socialLink) {
        toast.error('Please fill all required fields');
        return;
      }

      loading.value = true;
      try {
        // First create brand asset without image
        const { brandLogoImage, backgroundLogoImage, ...assetData } = formData.value;
        const response = await brandAssetService.createBrandAsset(assetData);
        
        if (response.success && response.data) {
          let createdAsset = response.data;
          
          // Upload brand logo image if provided and asset ID exists
          if (brandLogoImage && createdAsset._id) {
            try {
              const imageResponse = await brandAssetService.uploadImage(createdAsset._id, brandLogoImage);
              
              if (imageResponse.success && imageResponse.data) {
                // Update the created asset with the image URL from response
                if (imageResponse.data.brandAsset && imageResponse.data.brandAsset.brandLogoImage) {
                  let imageUrl = imageResponse.data.brandAsset.brandLogoImage;
                  // Get presigned URL for S3 images
                  try {
                    const presignedUrl = await brandAssetService.getPresignedImageUrl(imageUrl);
                    createdAsset.brandLogoImage = presignedUrl || imageUrl;
                  } catch (error) {
                    createdAsset.brandLogoImage = imageUrl;
                  }
                } else if (imageResponse.data.imageUrl) {
                  let imageUrl = imageResponse.data.imageUrl;
                  // Get presigned URL for S3 images
                  try {
                    const presignedUrl = await brandAssetService.getPresignedImageUrl(imageUrl);
                    createdAsset.brandLogoImage = presignedUrl || imageUrl;
                  } catch (error) {
                    createdAsset.brandLogoImage = imageUrl;
                  }
                }
              }
            } catch (imageError) {
              toast.warning('Brand asset created but logo image upload failed');
            }
          }
          
          // Upload background logo image if provided
          if (backgroundLogoImage && createdAsset._id) {
            try {
              const bgImageResponse = await brandAssetService.uploadBackgroundImage(createdAsset._id, backgroundLogoImage);
              
              if (bgImageResponse.success && bgImageResponse.data) {
                if (bgImageResponse.data.brandAsset && bgImageResponse.data.brandAsset.backgroundLogoImage) {
                  let imageUrl = bgImageResponse.data.brandAsset.backgroundLogoImage;
                  try {
                    const presignedUrl = await brandAssetService.getPresignedImageUrl(imageUrl);
                    createdAsset.backgroundLogoImage = presignedUrl || imageUrl;
                  } catch (error) {
                    createdAsset.backgroundLogoImage = imageUrl;
                  }
                } else if (bgImageResponse.data.imageUrl) {
                  let imageUrl = bgImageResponse.data.imageUrl;
                  try {
                    const presignedUrl = await brandAssetService.getPresignedImageUrl(imageUrl);
                    createdAsset.backgroundLogoImage = presignedUrl || imageUrl;
                  } catch (error) {
                    createdAsset.backgroundLogoImage = imageUrl;
                  }
                }
              }
            } catch (bgImageError) {
              toast.warning('Brand asset created but background image upload failed');
            }
          }
          
          brandAssets.value.unshift(createdAsset);
          formData.value = { headingText: '', brandLogoName: '', brandLogoImage: null, backgroundLogoImage: null, webLinkUrl: '', socialLink: '' };
          imageUploaded.value = false;
          imageFileName.value = '';
          backgroundImageUploaded.value = false;
          backgroundImageFileName.value = '';
          showUploadModal.value = false;
          toast.success('Brand asset created successfully!');
        } else {
          toast.error('Failed to create brand asset: ' + response.error);
        }
      } catch (error) {
        toast.error('Error creating brand asset');
      } finally {
        loading.value = false;
      }
    };

    // Edit brand asset
    const editAsset = (asset) => {
      editingAsset.value = asset;
      editFormData.value = {
        headingText: asset.headingText,
        brandLogoName: asset.brandLogoName,
        webLinkUrl: asset.webLinkUrl,
        socialLink: asset.socialLink
      };
      showEditModal.value = true;
    };

    // Update brand asset
    const updateBrandAsset = async () => {
      if (!editFormData.value.headingText || !editFormData.value.brandLogoName || !editFormData.value.webLinkUrl || !editFormData.value.socialLink) {
        toast.error('Please fill all required fields');
        return;
      }

      loading.value = true;
      try {
        // Find original asset to preserve image
        const originalAsset = brandAssets.value.find(a => (a._id || a.id) === (editingAsset.value._id || editingAsset.value.id));
        
        // First update text fields
        const { brandLogoImage, backgroundLogoImage, ...textData } = editFormData.value;
        const response = await brandAssetService.updateBrandAsset(
          editingAsset.value._id || editingAsset.value.id, 
          textData
        );
        
        if (response.success) {
          let updatedAsset = response.data;
          
          // Upload new brand logo image if provided
          if (brandLogoImage) {
            try {
              const imageResponse = await brandAssetService.uploadImage(
                editingAsset.value._id || editingAsset.value.id, 
                brandLogoImage
              );
              
              if (imageResponse.success && imageResponse.data) {
                if (imageResponse.data.brandAsset && imageResponse.data.brandAsset.brandLogoImage) {
                  let imageUrl = imageResponse.data.brandAsset.brandLogoImage;
                  try {
                    const presignedUrl = await brandAssetService.getPresignedImageUrl(imageUrl);
                    updatedAsset.brandLogoImage = presignedUrl || imageUrl;
                  } catch (error) {
                    updatedAsset.brandLogoImage = imageUrl;
                  }
                } else if (imageResponse.data.imageUrl) {
                  let imageUrl = imageResponse.data.imageUrl;
                  try {
                    const presignedUrl = await brandAssetService.getPresignedImageUrl(imageUrl);
                    updatedAsset.brandLogoImage = presignedUrl || imageUrl;
                  } catch (error) {
                    updatedAsset.brandLogoImage = imageUrl;
                  }
                }
              }
            } catch (imageError) {
              toast.warning('Asset updated but logo image upload failed');
            }
          } else if (originalAsset && originalAsset.brandLogoImage) {
            // Preserve existing image if no new image uploaded
            updatedAsset.brandLogoImage = originalAsset.brandLogoImage;
          }
          
          // Upload new background logo image if provided
          if (backgroundLogoImage) {
            try {
              const bgImageResponse = await brandAssetService.uploadBackgroundImage(
                editingAsset.value._id || editingAsset.value.id, 
                backgroundLogoImage
              );
              
              if (bgImageResponse.success && bgImageResponse.data) {
                if (bgImageResponse.data.brandAsset && bgImageResponse.data.brandAsset.backgroundLogoImage) {
                  let imageUrl = bgImageResponse.data.brandAsset.backgroundLogoImage;
                  try {
                    const presignedUrl = await brandAssetService.getPresignedImageUrl(imageUrl);
                    updatedAsset.backgroundLogoImage = presignedUrl || imageUrl;
                  } catch (error) {
                    updatedAsset.backgroundLogoImage = imageUrl;
                  }
                } else if (bgImageResponse.data.imageUrl) {
                  let imageUrl = bgImageResponse.data.imageUrl;
                  try {
                    const presignedUrl = await brandAssetService.getPresignedImageUrl(imageUrl);
                    updatedAsset.backgroundLogoImage = presignedUrl || imageUrl;
                  } catch (error) {
                    updatedAsset.backgroundLogoImage = imageUrl;
                  }
                }
              }
            } catch (bgImageError) {
              toast.warning('Asset updated but background image upload failed');
            }
          } else if (originalAsset && originalAsset.backgroundLogoImage) {
            // Preserve existing background image if no new image uploaded
            updatedAsset.backgroundLogoImage = originalAsset.backgroundLogoImage;
          }
          
          const index = brandAssets.value.findIndex(a => (a._id || a.id) === (editingAsset.value._id || editingAsset.value.id));
          if (index !== -1) {
            brandAssets.value[index] = { ...brandAssets.value[index], ...updatedAsset };
          }
          
          showEditModal.value = false;
          editingAsset.value = null;
          editImageUploaded.value = false;
          editImageFileName.value = '';
          editBackgroundImageUploaded.value = false;
          editBackgroundImageFileName.value = '';
          toast.success('Brand asset updated successfully!');
        } else {
          toast.error('Failed to update brand asset: ' + response.error);
        }
      } catch (error) {
        toast.error('Error updating brand asset');
      } finally {
        loading.value = false;
      }
    };

    // Toggle brand asset status
    const toggleAssetStatus = async (asset) => {
      try {
        const response = await brandAssetService.toggleBrandAssetStatus(asset._id || asset.id);
        if (response.success) {
          const index = brandAssets.value.findIndex(a => (a._id || a.id) === (asset._id || asset.id));
          if (index !== -1) {
            brandAssets.value[index] = { ...brandAssets.value[index], isActive: response.data.isActive };
          }
          activeDropdown.value = null;
          toast.success(`Brand asset ${response.data.isActive ? 'enabled' : 'disabled'} successfully!`);
        } else {
          toast.error('Failed to toggle status: ' + response.error);
        }
      } catch (error) {
        console.error('Error toggling status:', error);
        toast.error('Error toggling status');
      }
    };

    // Delete brand asset
    const deleteAsset = async (id) => {
      const shouldDelete = confirm('⚠️ Are you sure you want to delete this brand asset?\n\nThis action cannot be undone.');
      if (!shouldDelete) {
        toast.info('Delete cancelled');
        return;
      }
      
      loading.value = true;
      try {
        const response = await brandAssetService.deleteBrandAsset(id);
        if (response.success) {
          brandAssets.value = brandAssets.value.filter(a => (a._id || a.id) !== id);
          toast.success('Brand asset deleted successfully!');
        } else {
          toast.error('Failed to delete brand asset: ' + response.error);
        }
      } catch (error) {
        console.error('Error deleting brand asset:', error);
        toast.error('Error deleting brand asset');
      } finally {
        loading.value = false;
      }
    };

    // Simple functions to prevent rerenders
    const goBack = () => {
      router.push('/client/tools');
    };

    const toggleDropdown = (assetId) => {
      activeDropdown.value = activeDropdown.value === assetId ? null : assetId;
    };

    const viewAsset = (asset) => {
      selectedAsset.value = asset;
    };

    // Load brand assets on component mount
    onMounted(() => {
      // Console log all tokens for debugging
      const clientToken = localStorage.getItem('token_client');
      const userToken = localStorage.getItem('token_user');
      const adminToken = localStorage.getItem('token_admin');
      const superAdminToken = localStorage.getItem('token_super_admin');
      
      console.log('=== TOKEN DEBUG ===');
      console.log('Client Token:', clientToken);
      console.log('User Token:', userToken);
      console.log('Admin Token:', adminToken);
      console.log('Super Admin Token:', superAdminToken);
      console.log('Current URL:', window.location.href);
      console.log('Current Role Context:', window.location.pathname.includes('/client') ? 'CLIENT' : 'OTHER');
      console.log('==================');
      
      loadBrandAssets();
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
                  <h1 class="mb-1 fw-bold fs-2 text-dark">
                    <SwatchIcon style={{ width: '2rem', height: '2rem' }} class="me-2" />
                    Brand Management
                  </h1>
                  <p class="mb-0 text-dark" style={{ opacity: 0.8 }}>Manage your brand assets and guidelines</p>
                  {!loading.value && brandAssets.value.length > 0 && (
                    <small class="text-dark d-block mt-1" style={{ opacity: 0.8 }}>
                      <ChartBarIcon style={{ width: '16px', height: '16px' }} class="me-1" />
                      {brandAssets.value.length} brand assets
                    </small>
                  )}
                </div>
                <button 
                  class="btn btn-light btn-lg rounded-pill px-4 shadow-sm"
                  onClick={() => showUploadModal.value = true}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '600' }}
                >
                  <PlusIcon style={{ width: '1.2rem', height: '1.2rem' }} />
                  <span class="d-none d-sm-inline">Upload Asset</span>
                  <span class="d-sm-none">Upload</span>
                </button>
              </div>
            </div>

            {loading.value && (
              <div class="text-center py-5">
                <div class="spinner-border text-primary mb-3" role="status" style={{ width: '3rem', height: '3rem' }}>
                  <span class="visually-hidden">Loading...</span>
                </div>
                <p class="text-muted">Loading brand assets...</p>
              </div>
            )}

            <div class="row g-4">
              {brandAssets.value.map(asset => (
                <div key={asset._id || asset.id} class="col-xl-3 col-lg-4 col-md-6 col-sm-12">
                  <div 
                    class={`card border-0 shadow-lg h-100 position-relative overflow-hidden ${!asset.isActive ? 'opacity-50' : ''}`}
                    style={{ 
                      transition: 'all 0.3s ease',
                      ...(asset.backgroundLogoImage && {
                        backgroundImage: `url('${asset.backgroundLogoImage}')`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        backgroundRepeat: 'no-repeat'
                      }),
                      ...(!asset.backgroundLogoImage && {
                        background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)'
                      }),
                      borderRadius: '16px',
                      cursor: 'default'
                    }}
                  >
                    {!asset.isActive && (
                      <div class="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{ backgroundColor: 'rgba(0,0,0,0.1)', zIndex: 1, pointerEvents: 'none' }}>
                        <span class="badge bg-secondary px-3 py-2 rounded-pill shadow">🔒 Disabled</span>
                      </div>
                    )}
                    
                    {/* Dropdown at top-right corner */}
                    <div class="position-absolute" style={{ top: '12px', right: '12px', zIndex: 10 }}>
                      <div class="dropdown position-relative">
                        <button 
                          class="btn btn-light btn-sm rounded-circle d-flex align-items-center justify-content-center shadow-sm"
                          onClick={() => toggleDropdown(asset._id || asset.id)}
                          style={{ width: '32px', height: '32px', transition: 'all 0.2s ease', backgroundColor: 'white', border: 'none' }}
                        >
                          <EllipsisVerticalIcon style={{ width: '1rem', height: '1rem', color: 'black' }} />
                        </button>
                        {activeDropdown.value === (asset._id || asset.id) && (
                          <div class="dropdown-menu show position-absolute shadow-lg border-0 rounded-3" style={{ minWidth: '160px', right: '0', top: '100%', zIndex: 1000, marginTop: '8px' }}>
                            {asset.isActive && (
                              <>
                                <button 
                                  class="dropdown-item d-flex align-items-center gap-2 py-2 px-3 rounded-2"
                                  onClick={() => { editAsset(asset); toggleDropdown(null); }}
                                >
                                  <PencilIcon style={{ width: '1rem', height: '1rem', color: '#8b5cf6' }} />
                                  <span class="fw-medium">Edit Asset</span>
                                </button>
                              </>
                            )}
                            <button 
                              class="dropdown-item d-flex align-items-center gap-2 py-2 px-3 rounded-2"
                              onClick={() => { toggleAssetStatus(asset); toggleDropdown(null); }}
                            >
                              <span class={`rounded-circle ${asset.isActive ? 'bg-warning' : 'bg-success'}`} style={{ width: '1rem', height: '1rem' }}></span>
                              <span class="fw-medium">{asset.isActive ? 'Disable' : 'Enable'}</span>
                            </button>
                            {asset.isActive && (
                              <>
                                <hr class="dropdown-divider my-1" />
                                <button 
                                  class="dropdown-item d-flex align-items-center gap-2 py-2 px-3 text-danger rounded-2"
                                  onClick={() => { deleteAsset(asset._id || asset.id); toggleDropdown(null); }}
                                >
                                  <TrashIcon style={{ width: '1rem', height: '1rem' }} />
                                  <span class="fw-medium">Delete</span>
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div class="card-body p-3">
                      <div class="d-flex justify-content-between align-items-center mb-3">
                        <div class="me-3">
                          <img 
                            src={asset.brandLogoImage || generatePlaceholder(asset.brandLogoName || 'Brand')} 
                            alt={asset.brandLogoName || 'Brand Asset'}
                            class="rounded-circle shadow" 
                            style={{ width: '70px', height: '70px', objectFit: 'cover', border: '3px solid #fff' }}
                            onError={(e) => {
                              e.target.src = generatePlaceholder(asset.brandLogoName || 'B', 'dc3545');
                            }}
                          />
                        </div>
                        <div class="flex-grow-1" style={{ minWidth: 0, paddingRight: '40px' }}>
                          <h5 class="mb-1 fw-bold text-truncate" style={{ fontSize: '1.1rem', color: '#FFD700', textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }} title={asset.headingText || 'Brand Asset'}>{asset.headingText || 'Brand Asset'}</h5>
                          <p class="mb-0 fw-semibold text-truncate" style={{ fontSize: '0.9rem', color: '#87CEEB', textShadow: '1px 1px 3px rgba(0,0,0,0.7)' }} title={asset.brandLogoName || 'Logo Name'}>{asset.brandLogoName || 'Logo Name'}</p>
                        </div>
                      </div>
                      <div class="d-flex justify-content-between align-items-start mb-2">
                        <div class="flex-grow-1">
                          <div class="d-flex align-items-center gap-1 mb-2">
                            <a 
                              href={asset.isActive ? asset.webLinkUrl : '#'} 
                              target={asset.isActive ? '_blank' : '_self'}
                              rel={asset.isActive ? 'noopener noreferrer' : ''}
                              class={`badge bg-primary-subtle text-primary px-2 py-1 rounded-pill fw-semibold text-decoration-none d-flex align-items-center gap-1 ${!asset.isActive ? 'disabled' : ''}`}
                              style={{ fontSize: '0.7rem', cursor: asset.isActive ? 'pointer' : 'not-allowed', opacity: asset.isActive ? 1 : 0.5 }}
                              title={asset.isActive ? "Visit Website" : "Disabled"}
                              onClick={(e) => !asset.isActive && e.preventDefault()}
                            >
                              <GlobeAltIcon style={{ width: '12px', height: '12px' }} />
                              Website
                            </a>
                            <a 
                              href={asset.isActive ? asset.socialLink : '#'}
                              target={asset.isActive ? '_blank' : '_self'}
                              rel={asset.isActive ? 'noopener noreferrer' : ''}
                              class={`badge bg-info-subtle text-info px-2 py-1 rounded-pill fw-semibold text-decoration-none d-flex align-items-center gap-1 ${!asset.isActive ? 'disabled' : ''}`}
                              style={{ fontSize: '0.7rem', cursor: asset.isActive ? 'pointer' : 'not-allowed', opacity: asset.isActive ? 1 : 0.5 }}
                              title={asset.isActive ? "Visit Social Profile" : "Disabled"}
                              onClick={(e) => !asset.isActive && e.preventDefault()}
                            >
                              <ShareIcon style={{ width: '12px', height: '12px' }} />
                              Social
                            </a>
                          </div>
                          <span class={`badge px-2 py-1 rounded-pill fw-semibold ${asset.isActive ? 'bg-success-subtle text-success' : 'bg-secondary-subtle text-secondary'}`} style={{ fontSize: '0.75rem' }}>
                            {asset.isActive ? '✅ Active' : '🔒 Disabled'}
                          </span>
                        </div>
                      </div>
                      
                      <div class="d-flex align-items-center justify-content-between pt-2 border-top border-light">
                        <small class="text-muted d-flex align-items-center" style={{ fontSize: '0.75rem' }}>
                          <CalendarIcon style={{ width: '12px', height: '12px' }} class="me-1" />
                          {asset.createdAt ? new Date(asset.createdAt).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'short', 
                            day: 'numeric' 
                          }) : 'No date'}
                        </small>
                        <button 
                          class="btn btn-primary btn-sm px-2 py-1 fw-semibold rounded-pill"
                          onClick={() => viewAsset(asset)}
                          style={{ fontSize: '0.75rem' }}
                          disabled={!asset.isActive}
                        >
                          <EyeIcon style={{ width: '12px', height: '12px' }} class="me-1" />
                          View
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {brandAssets.value.length === 0 && !loading.value && (
                <div class="col-12">
                  <div class="text-center py-5">
                    <div class="mb-4 p-4 rounded-circle bg-light d-inline-flex align-items-center justify-content-center" style={{ width: '120px', height: '120px' }}>
                      <SwatchIcon style={{ width: '4rem', height: '4rem', color: '#6c757d' }} />
                    </div>
                    <h4 class="text-muted mb-3">
                      🎨 No brand assets yet
                    </h4>
                    <p class="text-muted mb-4">Start building your brand identity by uploading your first asset</p>
                    <button 
                      class="btn btn-primary btn-lg rounded-pill px-4 shadow-sm"
                      onClick={() => showUploadModal.value = true}
                      style={{ fontWeight: '600' }}
                    >
                      <PlusIcon style={{ width: '1.2rem', height: '1.2rem' }} class="me-2" />
                      Upload First Asset
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Upload Modal */}
            {showUploadModal.value && (
              <div class="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={() => showUploadModal.value = false}>
                <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable modal-fullscreen-sm-down" style={{ maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
                  <div class="modal-content border-0 shadow-lg" style={{ borderRadius: '16px', maxHeight: '85vh' }}>
                    <div class="modal-header">
                      <h5 class="modal-title">Upload Brand Asset</h5>
                      <button class="btn-close" onClick={() => showUploadModal.value = false}></button>
                    </div>
                    <div class="modal-body">
                      <div class="row">
                        <div class="col-md-6">
                          <div class="mb-3">
                            <label class="form-label fw-semibold">Heading Text</label>
                            <input 
                              type="text" 
                              class="form-control rounded-3" 
                              placeholder="Enter heading text"
                              v-model={formData.value.headingText}
                            />
                          </div>
                        </div>
                        <div class="col-md-6">
                          <div class="mb-3">
                            <label class="form-label fw-semibold">Brand Logo Name</label>
                            <input 
                              type="text" 
                              class="form-control rounded-3" 
                              placeholder="Enter brand logo name"
                              v-model={formData.value.brandLogoName}
                            />
                          </div>
                        </div>
                      </div>
                      <div class="mb-3">
                        <label class="form-label fw-semibold">Brand Logo Image</label>
                        <input 
                          type="file" 
                          class="form-control rounded-3" 
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files[0];
                            if (file) {
                              formData.value.brandLogoImage = file;
                              imageUploaded.value = true;
                              imageFileName.value = file.name;
                            }
                          }}
                        />
                        {imageUploaded.value && (
                          <div class="mt-2 p-2 bg-success bg-opacity-10 rounded">
                            <small class="text-success">
                              ✓ Image uploaded: {imageFileName.value}
                            </small>
                          </div>
                        )}
                      </div>
                      <div class="mb-3">
                        <label class="form-label fw-semibold">Background Logo Image</label>
                        <input 
                          type="file" 
                          class="form-control rounded-3" 
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files[0];
                            if (file) {
                              formData.value.backgroundLogoImage = file;
                              backgroundImageUploaded.value = true;
                              backgroundImageFileName.value = file.name;
                            }
                          }}
                        />
                        {backgroundImageUploaded.value && (
                          <div class="mt-2 p-2 bg-success bg-opacity-10 rounded">
                            <small class="text-success">
                              ✓ Background image uploaded: {backgroundImageFileName.value}
                            </small>
                          </div>
                        )}
                      </div>
                      <div class="row">
                        <div class="col-md-6">
                          <div class="mb-3">
                            <label class="form-label fw-semibold">Web Link URL</label>
                            <input 
                              type="url" 
                              class="form-control rounded-3" 
                              placeholder="https://example.com"
                              v-model={formData.value.webLinkUrl}
                            />
                          </div>
                        </div>
                        <div class="col-md-6">
                          <div class="mb-3">
                            <label class="form-label fw-semibold">Social Link</label>
                            <input 
                              type="url" 
                              class="form-control rounded-3" 
                              placeholder="https://social-platform.com/profile"
                              v-model={formData.value.socialLink}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    <div class="modal-footer">
                      <button class="btn btn-secondary" onClick={() => showUploadModal.value = false} disabled={loading.value}>Cancel</button>
                      <button 
                        class="btn btn-primary"
                        onClick={addBrandAsset}
                        disabled={loading.value}
                      >
                        {loading.value ? 'Creating...' : 'Upload Asset'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Edit Modal */}
            {showEditModal.value && (
              <div class="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={() => showEditModal.value = false}>
                <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable modal-fullscreen-sm-down" style={{ maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
                  <div class="modal-content border-0 shadow-lg" style={{ borderRadius: '16px', maxHeight: '85vh' }}>
                    <div class="modal-header">
                      <h5 class="modal-title">Edit Brand Asset</h5>
                      <button class="btn-close" onClick={() => showEditModal.value = false}></button>
                    </div>
                    <div class="modal-body">
                      <div class="row">
                        <div class="col-md-6">
                          <div class="mb-3">
                            <label class="form-label fw-semibold">Heading Text</label>
                            <input 
                              type="text" 
                              class="form-control rounded-3" 
                              placeholder="Enter heading text"
                              v-model={editFormData.value.headingText}
                            />
                          </div>
                        </div>
                        <div class="col-md-6">
                          <div class="mb-3">
                            <label class="form-label fw-semibold">Brand Logo Name</label>
                            <input 
                              type="text" 
                              class="form-control rounded-3" 
                              placeholder="Enter brand logo name"
                              v-model={editFormData.value.brandLogoName}
                            />
                          </div>
                        </div>
                      </div>
                      <div class="mb-3">
                        <label class="form-label fw-semibold">Brand Logo Image</label>
                        <input 
                          type="file" 
                          class="form-control rounded-3" 
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files[0];
                            if (file) {
                              editFormData.value.brandLogoImage = file;
                              editImageUploaded.value = true;
                              editImageFileName.value = file.name;
                            }
                          }}
                        />
                        {editImageUploaded.value && (
                          <div class="mt-2 p-2 bg-success bg-opacity-10 rounded">
                            <small class="text-success">
                              ✓ New image selected: {editImageFileName.value}
                            </small>
                          </div>
                        )}
                        {editingAsset.value?.brandLogoImage && !editImageUploaded.value && (
                          <div class="mt-2 p-2 bg-info bg-opacity-10 rounded">
                            <small class="text-info">
                              📷 Current image will be kept if no new image is selected
                            </small>
                          </div>
                        )}
                      </div>
                      <div class="mb-3">
                        <label class="form-label fw-semibold">Background Logo Image</label>
                        <input 
                          type="file" 
                          class="form-control rounded-3" 
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files[0];
                            if (file) {
                              editFormData.value.backgroundLogoImage = file;
                              editBackgroundImageUploaded.value = true;
                              editBackgroundImageFileName.value = file.name;
                            }
                          }}
                        />
                        {editBackgroundImageUploaded.value && (
                          <div class="mt-2 p-2 bg-success bg-opacity-10 rounded">
                            <small class="text-success">
                              ✓ New background image selected: {editBackgroundImageFileName.value}
                            </small>
                          </div>
                        )}
                        {editingAsset.value?.backgroundLogoImage && !editBackgroundImageUploaded.value && (
                          <div class="mt-2 p-2 bg-info bg-opacity-10 rounded">
                            <small class="text-info">
                              🇺️ Current background image will be kept if no new image is selected
                            </small>
                          </div>
                        )}
                      </div>
                      <div class="row">
                        <div class="col-md-6">
                          <div class="mb-3">
                            <label class="form-label fw-semibold">Web Link URL</label>
                            <input 
                              type="url" 
                              class="form-control rounded-3" 
                              placeholder="https://example.com"
                              v-model={editFormData.value.webLinkUrl}
                            />
                          </div>
                        </div>
                        <div class="col-md-6">
                          <div class="mb-3">
                            <label class="form-label fw-semibold">Social Link</label>
                            <input 
                              type="url" 
                              class="form-control rounded-3" 
                              placeholder="https://social-platform.com/profile"
                              v-model={editFormData.value.socialLink}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    <div class="modal-footer">
                      <button class="btn btn-secondary" onClick={() => showEditModal.value = false} disabled={loading.value}>Cancel</button>
                      <button 
                        class="btn btn-primary"
                        onClick={updateBrandAsset}
                        disabled={loading.value}
                      >
                        {loading.value ? 'Updating...' : 'Update Asset'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* View Modal */}
            {selectedAsset.value && (
              <div class="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={() => selectedAsset.value = null}>
                <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable modal-fullscreen-sm-down" style={{ maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
                  <div class="modal-content border-0 shadow-lg" style={{ borderRadius: '16px', maxHeight: '80vh' }}>
                    <div class="modal-header bg-primary text-white border-0" style={{ borderRadius: '16px 16px 0 0' }}>
                      <h5 class="mb-0 fw-bold d-flex align-items-center">
                        <EyeIcon style={{ width: '1.5rem', height: '1.5rem' }} class="me-2" />
                        Brand Asset Preview
                      </h5>
                      <button 
                        class="btn-close btn-close-white" 
                        onClick={() => selectedAsset.value = null}
                      ></button>
                    </div>
                    <div class="modal-body p-4" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                      {selectedAsset.value.brandLogoImage && (
                        <div class="text-center mb-4">
                          <img 
                            src={selectedAsset.value.brandLogoImage}
                            alt={selectedAsset.value.brandLogoName}
                            class="rounded-circle border border-3 border-white shadow-lg"
                            style={{ width: '100px', height: '100px', objectFit: 'cover' }}
                          />
                        </div>
                      )}
                      <h4 class="mb-2 text-center fw-bold text-dark">{selectedAsset.value.headingText}</h4>
                      <p class="text-primary text-center mb-3 fw-semibold">{selectedAsset.value.brandLogoName}</p>

                      <div class="p-3 rounded-3 mb-4" style={{ backgroundColor: '#f8f9fa', border: '1px solid #e9ecef' }}>
                        <div class="mb-3">
                          <label class="form-label fw-bold text-muted">Web Link</label>
                          <p class="mb-0">
                            <a href={selectedAsset.value.webLinkUrl} target="_blank" class="text-decoration-none">
                              {selectedAsset.value.webLinkUrl}
                            </a>
                          </p>
                        </div>
                        <div class="mb-3">
                          <label class="form-label fw-bold text-muted">Social Link</label>
                          <p class="mb-0">
                            <a href={selectedAsset.value.socialLink} target="_blank" class="text-decoration-none">
                              {selectedAsset.value.socialLink}
                            </a>
                          </p>
                        </div>
                        <div class="mb-0">
                          <label class="form-label fw-bold text-muted">Status</label>
                          <p class="mb-0">
                            <span class={`badge ${selectedAsset.value.isActive ? 'bg-success' : 'bg-secondary'} px-3 py-2 rounded-pill`}>
                              {selectedAsset.value.isActive ? '✅ Active' : '❌ Inactive'}
                            </span>
                          </p>
                        </div>
                      </div>
                      <hr class="my-3" />
                      <small class="text-muted d-flex align-items-center gap-1">
                        <CalendarIcon style={{ width: '14px', height: '14px' }} />
                        Created on {selectedAsset.value.createdAt ? new Date(selectedAsset.value.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'No date'}
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