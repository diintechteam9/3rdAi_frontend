import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { chapterService } from '../../../../services/chapterService.js';
import { 
  ArrowLeftIcon,
  PlusIcon,
  EllipsisVerticalIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  CalendarIcon,
  ArrowRightIcon,
  BookOpenIcon,
  PhotoIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/vue/24/outline';
import { useToast } from 'vue-toastification';

export default {
  name: 'GeetaChapterManagement',
  setup() {
    const router = useRouter();
    const toast = useToast();
    const loading = ref(false);
    const showChapterModal = ref(false);
    const showEditModal = ref(false);
    const showViewModal = ref(false);
    const activeDropdown = ref(null);
    const selectedChapter = ref(null);
    const editingChapter = ref(null);
    const chapters = ref([]);

    const createFormState = () => ({
      name: '',
      chapterNumber: 1,
      image: null,
      description: '',
      shlokaCount: 0,
      status: 'active'
    });

    const chapterForm = ref(createFormState());
    const editForm = ref(createFormState());

    const imageUploaded = ref(false);
    const imageFileName = ref('');
    const editImageUploaded = ref(false);
    const editImageFileName = ref('');
    const expandedDescriptions = ref(new Set());

    const toggleDescription = (chapterId) => {
      const expanded = expandedDescriptions.value;
      if (expanded.has(chapterId)) {
        expanded.delete(chapterId);
      } else {
        expanded.add(chapterId);
      }
      expandedDescriptions.value = new Set(expanded);
    };

    const truncateText = (text, maxLength = 100) => {
      if (!text || text.length <= maxLength) return text;
      return text.substring(0, maxLength) + '...';
    };

    const goBack = () => {
      router.push('/client/tools');
    };

    const openChapterModal = () => {
      showChapterModal.value = true;
    };

    const validateForm = (form) => {
      if (!form.name?.trim()) {
        toast.error('Chapter name is required');
        return false;
      }
      if (!form.description?.trim()) {
        toast.error('Description is required');
        return false;
      }
      if (!form.shlokaCount || form.shlokaCount < 1) {
        toast.error('Valid shloka count is required');
        return false;
      }
      return true;
    };

    const handleImageUpload = (event) => {
      const file = event.target.files[0];
      if (file) {
        chapterForm.value.image = file;
        imageUploaded.value = true;
        imageFileName.value = file.name;
      }
    };

    const submitChapter = async () => {
      if (!validateForm(chapterForm.value)) return;
      
      try {
        loading.value = true;
        toast.info('Creating chapter...');
        
        const formData = new FormData();
        formData.append('name', chapterForm.value.name);
        formData.append('chapterNumber', chapterForm.value.chapterNumber);
        formData.append('description', chapterForm.value.description);
        formData.append('shlokaCount', chapterForm.value.shlokaCount);
        formData.append('status', chapterForm.value.status);
        // Remove hardcoded clientId - let service extract from token
        
        if (chapterForm.value.image) {
          formData.append('image', chapterForm.value.image);
        }
        
        const result = await chapterService.createChapter(formData);
        
        if (result.success) {
          chapters.value.push(result.data);
          toast.success('✓ Chapter created successfully!');
          showChapterModal.value = false;
          
          chapterForm.value = createFormState();
          imageUploaded.value = false;
          imageFileName.value = '';
        }
        
      } catch (error) {
        console.error('Submit chapter error:', error);
        toast.error('❌ Failed to create chapter. Please try again.');
      } finally {
        loading.value = false;
      }
    };

    const fetchChapters = async () => {
      try {
        loading.value = true;
        const result = await chapterService.getChapters();
        
        if (result.success) {
          chapters.value = result.data;
        }
      } catch (error) {
        console.error('Fetch chapters error:', error);
        toast.error('Failed to load chapters');
        chapters.value = [];
      } finally {
        loading.value = false;
      }
    };

    const toggleDropdown = (chapterId) => {
      activeDropdown.value = activeDropdown.value === chapterId ? null : chapterId;
    };

    const viewChapter = (chapter) => {
      selectedChapter.value = chapter;
      showViewModal.value = true;
      activeDropdown.value = null;
    };

    const editChapter = (chapter) => {
      editingChapter.value = chapter;
      editForm.value = {
        name: chapter.name,
        chapterNumber: chapter.chapterNumber,
        description: chapter.description,
        shlokaCount: chapter.shlokaCount,
        status: chapter.status,
        image: null
      };
      editImageUploaded.value = !!chapter.imageUrl;
      editImageFileName.value = chapter.imageUrl ? 'Current image' : '';
      showEditModal.value = true;
      activeDropdown.value = null;
    };

    const updateChapter = async () => {
      if (!validateForm(editForm.value)) return;
      
      try {
        loading.value = true;
        toast.info('Updating chapter...');
        
        const formData = new FormData();
        formData.append('name', editForm.value.name);
        formData.append('chapterNumber', editForm.value.chapterNumber);
        formData.append('description', editForm.value.description);
        formData.append('shlokaCount', editForm.value.shlokaCount);
        formData.append('status', editForm.value.status);
        
        if (editForm.value.image) {
          formData.append('image', editForm.value.image);
        }
        
        const result = await chapterService.updateChapter(editingChapter.value._id, formData);
        
        if (result.success) {
          const index = chapters.value.findIndex(c => c._id === editingChapter.value._id);
          if (index !== -1) {
            // If no new image was uploaded, preserve the existing imageUrl
            if (!editForm.value.image && editingChapter.value.imageUrl) {
              result.data.imageUrl = editingChapter.value.imageUrl;
            }
            chapters.value[index] = result.data;
          }
          
          toast.success('✓ Chapter updated successfully!');
          showEditModal.value = false;
          editingChapter.value = null;
        }
        
      } catch (error) {
        console.error('Update error:', error);
        toast.error('❌ Failed to update chapter. Please try again.');
      } finally {
        loading.value = false;
      }
    };

    const deleteChapter = async (chapterId) => {
      const chapter = chapters.value.find(c => c._id === chapterId);
      if (!chapter) return;
      
      const confirmMessage = `Are you sure you want to delete "${chapter.name}"?\n\nThis will also delete all ${chapter.shlokaCount} shlokas in this chapter. This action cannot be undone.`;
      
      if (!confirm(confirmMessage)) return;
      
      try {
        loading.value = true;
        toast.info('Deleting chapter...');
        
        const result = await chapterService.deleteChapter(chapterId);
        
        if (result.success) {
          chapters.value = chapters.value.filter(c => c._id !== chapterId);
          toast.success('✓ Chapter deleted successfully!');
        }
        
      } catch (error) {
        console.error('Delete error:', error);
        toast.error('❌ Failed to delete chapter. Please try again.');
      } finally {
        loading.value = false;
      }
      activeDropdown.value = null;
    };

    const toggleChapterStatus = async (chapter) => {
      try {
        const result = await chapterService.toggleStatus(chapter._id);
        
        if (result.success) {
          const index = chapters.value.findIndex(c => c._id === chapter._id);
          if (index !== -1) {
            chapters.value[index] = result.data;
          }
          
          toast.success(`Chapter ${result.data.status === 'active' ? 'enabled' : 'disabled'} successfully!`);
        }
      } catch (error) {
        console.error('Toggle status error:', error);
        toast.error('❌ Failed to update chapter status');
      }
      activeDropdown.value = null;
    };

    const navigateToShlokas = (chapter) => {
      router.push({
        path: `/client/tools/geeta-shlokas/${chapter._id}`,
        query: { 
          chapter: chapter.chapterNumber,
          chapterName: chapter.name,
          chapterId: chapter._id
        }
      });
    };

    const handleEditImageUpload = (event) => {
      const file = event.target.files[0];
      if (file) {
        editForm.value.image = file;
        editImageUploaded.value = true;
        editImageFileName.value = file.name;
      }
    };

    onMounted(() => {
      fetchChapters();
    });

    return () => (
      <div class="container-fluid px-3 px-lg-4">
        <style>{`
          .chapter-card {
            transition: all 0.3s ease;
            border-radius: 16px;
          }
          .chapter-card:not(.disabled) {
            cursor: pointer;
          }
          .chapter-card:not(.disabled):hover {
            transform: translateY(-8px) scale(1.02);
            box-shadow: 0 20px 40px rgba(0,0,0,0.15) !important;
          }
          .chapter-icon {
            transition: all 0.3s ease;
          }
          .chapter-card:not(.disabled):hover .chapter-icon {
            transform: rotate(10deg) scale(1.1);
          }
          .arrow-btn {
            transition: all 0.3s ease;
          }
          .chapter-card:not(.disabled):hover .arrow-btn {
            transform: scale(1.2);
            background-color: #f97316 !important;
            color: white !important;
          }
          .hover-overlay {
            opacity: 0;
            transition: opacity 0.3s ease;
          }
          .chapter-card:not(.disabled):hover .hover-overlay {
            opacity: 1;
          }
        `}</style>
        
        <div class="row">
          <div class="col-12">
            {/* Header */}
            <div class="bg-gradient-primary rounded-4 p-4 mb-4 text-white shadow-lg">
              <div class="d-flex flex-column flex-md-row align-items-start align-items-md-center gap-3">
                <button 
                  class="btn btn-light btn-sm rounded-pill px-3" 
                  onClick={goBack}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  <ArrowLeftIcon style={{ width: '1rem', height: '1rem' }} />
                  <span>Back to Tools</span>
                </button>
                <div class="flex-grow-1">
                  <h1 class="mb-1 fw-bold fs-2 text-dark"><BookOpenIcon style={{ width: '2rem', height: '2rem' }} class="me-2" />Bhagavad Geeta Chapters</h1>
                  <p class="mb-0 text-dark" style={{ opacity: 0.8 }}>
                    Manage and organize sacred Geeta chapters with shlokas
                  </p>
                </div>
                <button 
                  class="btn btn-light btn-lg rounded-pill px-4 shadow-sm"
                  onClick={openChapterModal}
                  disabled={loading.value}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '600' }}
                >
                  <PlusIcon style={{ width: '1.2rem', height: '1.2rem' }} />
                  <span class="d-none d-sm-inline">Create New Chapter</span>
                  <span class="d-sm-none">Create</span>
                </button>
              </div>
            </div>

            {/* Chapters Grid */}
            {loading.value ? (
              <div class="text-center py-5">
                <div class="spinner-border text-primary mb-3" role="status" style={{ width: '3rem', height: '3rem' }}>
                  <span class="visually-hidden">Loading...</span>
                </div>
                <p class="text-muted">Loading chapters...</p>
              </div>
            ) : chapters.value.length > 0 ? (
              <div class="row g-4">
                {chapters.value.map(chapter => (
                  <div key={chapter._id} class="col-xl-4 col-lg-6 col-md-6 col-sm-12">
                    <div 
                      class={`chapter-card card h-100 border-0 shadow-sm position-relative overflow-hidden ${chapter.status === 'inactive' ? 'disabled opacity-50' : ''}`}
                      style={{
                        background: `linear-gradient(135deg, #f9731608 0%, #f9731615 30%, #f8fafc 100%)`,
                        borderRadius: '16px',
                        pointerEvents: chapter.status === 'active' ? 'auto' : 'none'
                      }}
                    >
                      {chapter.status === 'inactive' && (
                        <div class="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{ backgroundColor: 'rgba(0,0,0,0.1)', zIndex: 1, pointerEvents: 'none' }}>
                          <span class="badge bg-secondary px-3 py-2 rounded-pill shadow">🔒 Disabled</span>
                        </div>
                      )}
                      
                      {/* Dropdown Menu */}
                      <div class="position-absolute top-0 end-0 m-3" style={{ zIndex: 2, pointerEvents: 'auto' }}>
                        <div class="dropdown position-relative">
                          <button 
                            class="btn btn-light btn-sm rounded-circle d-flex align-items-center justify-content-center shadow-sm"
                            onClick={(e) => { e.stopPropagation(); toggleDropdown(chapter._id); }}
                            style={{ width: '32px', height: '32px', transition: 'all 0.2s ease' }}
                          >
                            <EllipsisVerticalIcon style={{ width: '1.25rem', height: '1.25rem' }} />
                          </button>
                          {activeDropdown.value === chapter._id && (
                            <div class="dropdown-menu show position-absolute shadow-lg border-0 rounded-3" style={{ minWidth: '160px', right: '0', top: '100%', zIndex: 1000 }}>
                              {chapter.status === 'active' ? (
                                // Active card - show all options
                                <>
                                  <button 
                                    class="dropdown-item d-flex align-items-center gap-2 py-2 px-3 rounded-2"
                                    onClick={(e) => { e.stopPropagation(); viewChapter(chapter); }}
                                  >
                                    <EyeIcon style={{ width: '1rem', height: '1rem', color: '#0d6efd' }} />
                                    <span class="fw-medium">View Details</span>
                                  </button>
                                  <button 
                                    class="dropdown-item d-flex align-items-center gap-2 py-2 px-3 rounded-2"
                                    onClick={(e) => { e.stopPropagation(); editChapter(chapter); }}
                                  >
                                    <PencilIcon style={{ width: '1rem', height: '1rem', color: '#f97316' }} />
                                    <span class="fw-medium">Edit Chapter</span>
                                  </button>
                                  <button 
                                    class="dropdown-item d-flex align-items-center gap-2 py-2 px-3 rounded-2"
                                    onClick={(e) => { e.stopPropagation(); toggleChapterStatus(chapter); }}
                                  >
                                    <XCircleIcon style={{ width: '1rem', height: '1rem', color: '#dc3545' }} />
                                    <span class="fw-medium">Disable</span>
                                  </button>
                                  <hr class="dropdown-divider my-1" />
                                  <button 
                                    class="dropdown-item d-flex align-items-center gap-2 py-2 px-3 text-danger rounded-2"
                                    onClick={(e) => { e.stopPropagation(); deleteChapter(chapter._id); }}
                                  >
                                    <TrashIcon style={{ width: '1rem', height: '1rem' }} />
                                    <span class="fw-medium">Delete</span>
                                  </button>
                                </>
                              ) : (
                                // Inactive card - show only enable option
                                <button 
                                  class="dropdown-item d-flex align-items-center gap-2 py-2 px-3 rounded-2"
                                  onClick={(e) => { e.stopPropagation(); toggleChapterStatus(chapter); }}
                                >
                                  <CheckCircleIcon style={{ width: '1rem', height: '1rem', color: '#198754' }} />
                                  <span class="fw-medium">Enable</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <div class="card-body p-4">
                        {/* Icon */}
                        <div class="mb-4">
                          <div 
                            class="chapter-icon d-inline-flex align-items-center justify-content-center rounded-3"
                            style={{ 
                              width: '100px', 
                              height: '100px',
                              backgroundColor: '#f9731615',
                              border: '2px solid #f9731625'
                            }}
                          >
                            {chapter.imageUrl ? (
                              <>
                                <img 
                                  src={chapter.imageUrl}
                                  alt={chapter.name}
                                  class="rounded-3"
                                  style={{ width: '90px', height: '90px', objectFit: 'cover' }}
                                  onError={(e) => { 
                                    // Fallback to a placeholder or hide
                                    e.target.style.display = 'none';
                                  }}
                                />
                                <div class="position-absolute bottom-0 start-0 p-1 bg-success text-white" style={{ fontSize: '0.6rem' }}>IMG</div>
                              </>
                            ) : (
                              <div class="position-absolute bottom-0 start-0 p-1 bg-danger text-white" style={{ fontSize: '0.6rem' }}>NO IMG</div>
                            )}
                            <BookOpenIcon 
                              style={{ 
                                fontSize: '2rem',
                                color: '#f97316',
                                width: '2rem',
                                height: '2rem',
                                display: chapter.imageUrl ? 'none' : 'block'
                              }}
                            />
                          </div>
                        </div>

                        {/* Content */}
                        <div class="mb-4">
                          <div class="d-flex align-items-center gap-2 mb-2">
                            <span class="badge bg-primary text-white fw-bold" style={{ fontSize: '0.8rem' }}>
                              Chapter {chapter.chapterNumber || 'N/A'}
                            </span>
                            <span class={`badge px-2 py-1 rounded-pill ${chapter.status === 'active' ? 'bg-success' : 'bg-secondary'}`}>
                              {chapter.status === 'active' ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          <h5 class="card-title fw-bold mb-2 text-dark">{chapter.name}</h5>
                          <div class="card-text text-muted mb-0 lh-base" style={{ fontSize: '0.95rem' }}>
                            {expandedDescriptions.value.has(chapter._id) ? (
                              <>
                                <p class="mb-1">{chapter.description}</p>
                                <button 
                                  class="btn btn-link p-0 text-primary" 
                                  style={{ fontSize: '0.85rem', textDecoration: 'none' }}
                                  onClick={(e) => { e.stopPropagation(); toggleDescription(chapter._id); }}
                                >
                                  See less
                                </button>
                              </>
                            ) : (
                              <>
                                <p class="mb-1">{truncateText(chapter.description, 100)}</p>
                                {chapter.description && chapter.description.length > 100 && (
                                  <button 
                                    class="btn btn-link p-0 text-primary" 
                                    style={{ fontSize: '0.85rem', textDecoration: 'none' }}
                                    onClick={(e) => { e.stopPropagation(); toggleDescription(chapter._id); }}
                                  >
                                    See more
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </div>

                        {/* Stats */}
                        <div class="mb-4">
                          <div class="d-flex align-items-center justify-content-between">
                            <span class="badge bg-primary text-white px-3 py-2 rounded-pill">
                              {chapter.shlokaCount} Shlokas
                            </span>
                            <div class="d-flex align-items-center text-muted" style={{ fontSize: '0.85rem' }}>
                              <CalendarIcon style={{ width: '12px', height: '12px' }} class="me-1" />
                              <span>{chapter.createdAt ? new Date(chapter.createdAt).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric' 
                              }) : 'No date'}</span>
                            </div>
                          </div>
                        </div>

                        {/* Action Button */}
                        <div class="d-flex align-items-center justify-content-between">
                          <div class="d-flex align-items-center text-muted" style={{ fontSize: '0.85rem' }}>
                            <span>Manage Shlokas</span>
                          </div>
                          <div 
                            class="arrow-btn d-flex align-items-center justify-content-center rounded-circle"
                            style={{
                              width: '40px',
                              height: '40px',
                              backgroundColor: '#f9731610',
                              color: '#f97316',
                              cursor: chapter.status === 'active' ? 'pointer' : 'not-allowed'
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (chapter.status === 'active') {
                                navigateToShlokas(chapter);
                              }
                            }}
                          >
                            <ArrowRightIcon style={{ width: '1.25rem', height: '1.25rem' }} />
                          </div>
                        </div>
                      </div>

                      {/* Hover Effect Overlay */}
                      {chapter.status === 'active' && (
                        <div 
                          class="hover-overlay position-absolute top-0 start-0 w-100 h-100"
                          style={{
                            background: 'linear-gradient(135deg, #f9731615 0%, #f9731625 100%)',
                            pointerEvents: 'none',
                            borderRadius: '16px'
                          }}
                        ></div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div class="text-center py-5">
                <div class="mb-4">
                  <div class="bg-light rounded-circle d-inline-flex align-items-center justify-content-center" style={{ width: '80px', height: '80px' }}>
                    <BookOpenIcon style={{ width: '2rem', height: '2rem', color: '#6c757d' }} />
                  </div>
                </div>
                <h4 class="fw-bold mb-2">No Chapters Yet</h4>
                <p class="text-muted mb-4">Create your first Geeta chapter to get started</p>
                <button 
                  class="btn btn-primary rounded-pill px-4"
                  onClick={openChapterModal}
                >
                  Create First Chapter
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Create Chapter Modal */}
        {showChapterModal.value && (
          <div class="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div class="modal-dialog">
              <div class="modal-content">
                <div class="modal-header py-3">
                  <h5 class="modal-title fw-bold">
                    Create New Chapter
                  </h5>
                  <button 
                    type="button" 
                    class="btn-close" 
                    onClick={() => showChapterModal.value = false}
                  ></button>
                </div>
                <div class="modal-body py-3">
                  <form onSubmit={(e) => { e.preventDefault(); submitChapter(); }}>
                    <div class="row g-3">
                      <div class="col-12">
                        <label class="form-label fw-semibold">Chapter Name *</label>
                        <input 
                          type="text" 
                          class="form-control" 
                          v-model={chapterForm.value.name}
                          placeholder="e.g., Arjuna Vishada Yoga"
                          required 
                        />
                      </div>
                      
                      <div class="col-12">
                        <label class="form-label fw-semibold">Chapter Image</label>
                        <input 
                          type="file" 
                          class="form-control" 
                          accept="image/*"
                          onChange={handleImageUpload}
                        />
                        {imageUploaded.value && (
                          <div class="mt-2">
                            <small class="text-success">
                              ✓ {imageFileName.value}
                            </small>
                          </div>
                        )}
                      </div>
                      
                      <div class="col-12">
                        <label class="form-label fw-semibold">Description *</label>
                        <textarea 
                          class="form-control" 
                          rows="3"
                          v-model={chapterForm.value.description}
                          placeholder="Describe the chapter..."
                          required
                        ></textarea>
                      </div>

                      <div class="col-6">
                        <label class="form-label fw-semibold">Chapter Number *</label>
                        <select class="form-select" v-model={chapterForm.value.chapterNumber} required>
                          <option value="1">Chapter 1</option>
                          <option value="2">Chapter 2</option>
                          <option value="3">Chapter 3</option>
                          <option value="4">Chapter 4</option>
                          <option value="5">Chapter 5</option>
                          <option value="6">Chapter 6</option>
                          <option value="7">Chapter 7</option>
                          <option value="8">Chapter 8</option>
                          <option value="9">Chapter 9</option>
                          <option value="10">Chapter 10</option>
                          <option value="11">Chapter 11</option>
                          <option value="12">Chapter 12</option>
                          <option value="13">Chapter 13</option>
                          <option value="14">Chapter 14</option>
                          <option value="15">Chapter 15</option>
                          <option value="16">Chapter 16</option>
                          <option value="17">Chapter 17</option>
                          <option value="18">Chapter 18</option>
                        </select>
                      </div>
                      
                      <div class="col-6">
                        <label class="form-label fw-semibold">Shlokas *</label>
                        <input 
                          type="number" 
                          class="form-control" 
                          v-model={chapterForm.value.shlokaCount}
                          placeholder="47"
                          min="1"
                          required
                        />
                      </div>
                      
                      <div class="col-6">
                        <label class="form-label fw-semibold">Status *</label>
                        <select class="form-select" v-model={chapterForm.value.status} required>
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                        </select>
                      </div>
                    </div>
                  </form>
                </div>
                <div class="modal-footer py-3">
                  <button 
                    type="button" 
                    class="btn btn-secondary" 
                    onClick={() => showChapterModal.value = false}
                  >
                    Cancel
                  </button>
                  <button 
                    type="button" 
                    class="btn btn-primary" 
                    onClick={submitChapter}
                    disabled={loading.value}
                  >
                    {loading.value ? (
                      <>
                        <span class="spinner-border spinner-border-sm me-2"></span>
                        Creating...
                      </>
                    ) : (
                      'Create Chapter'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {showEditModal.value && (
          <div class="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={() => showEditModal.value = false}>
            <div class="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
              <div class="modal-content border-0 shadow-lg" style={{ borderRadius: '16px' }}>
                <div class="modal-header">
                  <h5 class="modal-title">Edit Chapter</h5>
                  <button class="btn-close" onClick={() => showEditModal.value = false}></button>
                </div>
                <div class="modal-body">
                  <div class="mb-3">
                    <label class="form-label fw-semibold">Chapter Name</label>
                    <input 
                      type="text" 
                      class="form-control rounded-3" 
                      placeholder="Enter chapter name"
                      v-model={editForm.value.name}
                    />
                  </div>
                  <div class="mb-3">
                    <label class="form-label fw-semibold">Chapter Number</label>
                    <select class="form-select rounded-3" v-model={editForm.value.chapterNumber}>
                      <option value="1">Chapter 1</option>
                      <option value="2">Chapter 2</option>
                      <option value="3">Chapter 3</option>
                      <option value="4">Chapter 4</option>
                      <option value="5">Chapter 5</option>
                      <option value="6">Chapter 6</option>
                      <option value="7">Chapter 7</option>
                      <option value="8">Chapter 8</option>
                      <option value="9">Chapter 9</option>
                      <option value="10">Chapter 10</option>
                      <option value="11">Chapter 11</option>
                      <option value="12">Chapter 12</option>
                      <option value="13">Chapter 13</option>
                      <option value="14">Chapter 14</option>
                      <option value="15">Chapter 15</option>
                      <option value="16">Chapter 16</option>
                      <option value="17">Chapter 17</option>
                      <option value="18">Chapter 18</option>
                    </select>
                  </div>
                  <div class="mb-3">
                    <label class="form-label fw-semibold">Description</label>
                    <textarea 
                      class="form-control rounded-3" 
                      rows="3"
                      placeholder="Enter description"
                      v-model={editForm.value.description}
                    ></textarea>
                  </div>
                  <div class="mb-3">
                    <label class="form-label fw-semibold">Number of Shlokas</label>
                    <input 
                      type="number" 
                      class="form-control rounded-3" 
                      placeholder="47"
                      v-model={editForm.value.shlokaCount}
                    />
                  </div>
                  <div class="mb-3">
                    <label class="form-label fw-semibold">Status</label>
                    <select class="form-select rounded-3" v-model={editForm.value.status}>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                  <div class="mb-3">
                    <label class="form-label fw-semibold">Chapter Image</label>
                    <input 
                      type="file" 
                      class="form-control rounded-3" 
                      accept="image/*"
                      onChange={handleEditImageUpload}
                    />
                    {editImageUploaded.value && (
                      <div class="mt-2 p-2 bg-success bg-opacity-10 rounded">
                        <small class="text-success">
                          ✓ {editImageFileName.value.includes('Current') ? 'Current image available' : `New image selected: ${editImageFileName.value}`}
                        </small>
                      </div>
                    )}
                  </div>
                </div>
                <div class="modal-footer">
                  <button class="btn btn-secondary" onClick={() => showEditModal.value = false} disabled={loading.value}>Cancel</button>
                  <button 
                    class="btn btn-primary"
                    onClick={updateChapter}
                    disabled={loading.value}
                  >
                    {loading.value ? 'Updating...' : 'Update Chapter'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* View Modal */}
        {showViewModal.value && selectedChapter.value && (
          <div class="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={() => showViewModal.value = false}>
            <div class="modal-dialog modal-dialog-centered" style={{ maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
              <div class="modal-content border-0 shadow-lg" style={{ borderRadius: '16px' }}>
                <div class="modal-header bg-primary text-white border-0" style={{ borderRadius: '16px 16px 0 0' }}>
                  <h5 class="mb-0 fw-bold d-flex align-items-center">
                    <EyeIcon style={{ width: '1.5rem', height: '1.5rem' }} class="me-2" />
                    Chapter Preview
                  </h5>
                  <button 
                    class="btn-close btn-close-white" 
                    onClick={() => showViewModal.value = false}
                  ></button>
                </div>
                <div class="modal-body p-4">
                  {selectedChapter.value.imageUrl && (
                    <div class="text-center mb-4">
                      <img 
                        src={selectedChapter.value.imageUrl}
                        alt={selectedChapter.value.name}
                        class="rounded-circle border border-3 border-white shadow-lg"
                        style={{ width: '100px', height: '100px', objectFit: 'cover' }}
                      />
                    </div>
                  )}
                  <h4 class="mb-2 text-center fw-bold text-dark">
                    Chapter {selectedChapter.value.chapterNumber}: {selectedChapter.value.name}
                  </h4>
                  <p class="text-muted text-center mb-3">{selectedChapter.value.description}</p>

                  <div class="p-3 rounded-3 mb-4" style={{ backgroundColor: '#f8f9fa', border: '1px solid #e9ecef' }}>
                    <div class="mb-3">
                      <label class="form-label fw-bold text-muted">Total Shlokas</label>
                      <p class="mb-0 fw-bold text-primary">{selectedChapter.value.shlokaCount}</p>
                    </div>
                    <div class="mb-0">
                      <label class="form-label fw-bold text-muted">Status</label>
                      <p class="mb-0">
                        <span class={`badge px-3 py-2 rounded-pill ${selectedChapter.value.status === 'active' ? 'bg-success' : 'bg-secondary'}`}>
                          {selectedChapter.value.status === 'active' ? '✅ Active' : '❌ Inactive'}
                        </span>
                      </p>
                    </div>
                  </div>
                  <hr class="my-3" />
                  <small class="text-muted d-flex align-items-center gap-1">
                    <CalendarIcon style={{ width: '14px', height: '14px' }} />
                    Created on {selectedChapter.value.createdAt ? new Date(selectedChapter.value.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'No date'}
                  </small>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
};