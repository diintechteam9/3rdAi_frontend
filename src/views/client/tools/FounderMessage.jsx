import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import { ArrowLeftIcon, PlusIcon, EyeIcon, PencilIcon, TrashIcon, UserIcon, EllipsisVerticalIcon, ChevronLeftIcon, ChevronRightIcon, ChatBubbleLeftRightIcon, DocumentTextIcon, CalendarIcon, ChartBarIcon } from '@heroicons/vue/24/outline';
import founderMessageService from '../../../services/founderMessageService.js';

export default {
  name: 'ClientFounderMessage',
  setup() {
    const router = useRouter();
    const toast = useToast();
    const messages = ref([]);
    const loading = ref(false);
    const showAddModal = ref(false);
    const showEditModal = ref(false);
    const selectedMessage = ref(null);
    const activeDropdown = ref(null);
    const currentPage = ref(1);
    const itemsPerPage = 9;
    const editMessage = ref({
      _id: '',
      founderName: '',
      position: '',
      content: '',
      founderImage: null
    });
    const editImageUploaded = ref(false);
    const editImageFileName = ref('');
    const newMessage = ref({
      founderName: '',
      position: '',
      content: '',
      founderImage: null
    });
    const newImageUploaded = ref(false);
    const newImageFileName = ref('');
    const expandedMessages = ref(new Set());

    const toggleExpand = (messageId) => {
      const expanded = new Set(expandedMessages.value);
      if (expanded.has(messageId)) {
        expanded.delete(messageId);
      } else {
        expanded.add(messageId);
      }
      expandedMessages.value = expanded;
    };

    const goBack = () => {
      router.push('/client/tools');
    };

    // Load all messages
    const loadMessages = async () => {
      loading.value = true;
      try {
        const response = await founderMessageService.getAllMessages();
        if (response.success) {
          // Convert S3 URLs to presigned URLs for better access
          let messagesList = await Promise.all(
            response.data.map(async (message) => {
              if (message.founderImage || message.founderImageKey) {
                try {
                  const presignedUrl = await founderMessageService.getPresignedImageUrl(
                    message.founderImage, 
                    message.founderImageKey
                  );
                  return { ...message, founderImage: presignedUrl || message.founderImage };
                } catch (error) {
                  return { ...message, founderImage: message.founderImage || null };
                }
              }
              return message;
            })
          );
          
          messages.value = messagesList;
        } else {
          console.error('Failed to load messages:', response.error);
        }
      } catch (error) {
        console.error('Error loading messages:', error);
      } finally {
        loading.value = false;
      }
    };

    // Add new message
    const addMessage = async () => {
      if (!newMessage.value.founderName || !newMessage.value.position || !newMessage.value.content) {
        toast.error('Please fill all required fields');
        return;
      }

      loading.value = true;
      try {
        // First create message without image (like testimonials)
        const { founderImage, ...messageData } = newMessage.value;
        const response = await founderMessageService.createMessage(messageData);
        
        if (response.success && response.data) {
          let createdMessage = response.data;
          
          // Upload image if provided and message ID exists
          if (founderImage && createdMessage._id) {
            try {
              const imageResponse = await founderMessageService.uploadImage(createdMessage._id, founderImage);
              
              if (imageResponse.success && imageResponse.data) {
                let imageUrl = imageResponse.data.imageUrl;
                if (imageUrl) {
                  // Get presigned URL for S3 images
                  try {
                    const presignedUrl = await founderMessageService.getPresignedImageUrl(imageUrl);
                    imageUrl = presignedUrl || imageUrl;
                  } catch (error) {
                    // Use original URL if presigned fails
                  }
                  
                  createdMessage.founderImage = imageUrl;
                }
              }
            } catch (imageError) {
              toast.warning('Message created but image upload failed');
            }
          }
          
          messages.value.unshift(createdMessage);
          newMessage.value = { founderName: '', position: '', content: '', founderImage: null };
          showAddModal.value = false;
          toast.success('Message created successfully!');
        } else {
          toast.error('Failed to create message: ' + response.error);
        }
      } catch (error) {
        toast.error('Error creating message');
      } finally {
        loading.value = false;
      }
    };

    // Delete message with confirmation
    const showDeleteConfirmation = (id) => {
      toast.info(
        'Are you sure you want to delete this message?',
        {
          timeout: false,
          closeOnClick: false,
          pauseOnFocusLoss: false,
          pauseOnHover: true,
          draggable: false,
          showCloseButton: false,
          hideProgressBar: false,
          closeButton: false,
          icon: '⚠️',
          onClose: () => {},
          onClick: () => {},
          // Custom buttons using HTML
          toastClassName: 'custom-confirm-toast',
          bodyClassName: 'custom-confirm-body'
        }
      );
      
      // Create custom confirmation
      setTimeout(() => {
        const confirmed = confirm('Are you sure you want to delete this message?');
        if (confirmed) {
          deleteMessage(id);
        }
      }, 100);
    };

    // Delete message
    const deleteMessage = async (id) => {
      
      loading.value = true;
      try {
        const response = await founderMessageService.deleteMessage(id);
        if (response.success) {
          messages.value = messages.value.filter(m => m._id !== id);
          if (selectedMessage.value && selectedMessage.value._id === id) {
            selectedMessage.value = null;
          }
          // Reset to first page if current page becomes empty
          if (paginatedMessages.value.length === 0 && currentPage.value > 1) {
            currentPage.value = currentPage.value - 1;
          }
          toast.success('Message deleted successfully!');
        } else {
          toast.error('Failed to delete message: ' + response.error);
        }
      } catch (error) {
        console.error('Error deleting message:', error);
        toast.error('Error deleting message');
      } finally {
        loading.value = false;
      }
    };

    // Toggle status
    const toggleStatus = async (message) => {
      try {
        const response = await founderMessageService.toggleStatus(message._id);
        if (response.success) {
          const index = messages.value.findIndex(m => m._id === message._id);
          if (index !== -1) {
            messages.value[index] = { ...messages.value[index], isActive: response.data.isActive };
          }
          if (selectedMessage.value && selectedMessage.value._id === message._id) {
            selectedMessage.value = { ...selectedMessage.value, isActive: response.data.isActive };
          }
          activeDropdown.value = null;
          toast.success(`Message ${response.data.isActive ? 'enabled' : 'disabled'} successfully!`);
        } else {
          toast.error('Failed to toggle status: ' + response.error);
        }
      } catch (error) {
        console.error('Error toggling status:', error);
        toast.error('Error toggling status');
      }
    };

    // View message
    const viewMessage = async (message) => {
      let messageToShow = { ...message };
      
      // Get fresh presigned URL for image if exists
      if (message.founderImage && message.founderImage.includes('amazonaws.com')) {
        try {
          const presignedUrl = await founderMessageService.getPresignedImageUrl(message.founderImage);
          messageToShow.founderImage = presignedUrl;
          
          // Update the card image too
          const index = messages.value.findIndex(m => m._id === message._id);
          if (index !== -1) {
            messages.value[index].founderImage = presignedUrl;
          }
        } catch (error) {
          console.error('Error getting presigned URL:', error);
        }
      }
      
      selectedMessage.value = messageToShow;
    };

    // Toggle dropdown
    const toggleDropdown = (messageId) => {
      activeDropdown.value = activeDropdown.value === messageId ? null : messageId;
    };

    // Pagination computed properties
    const totalPages = computed(() => Math.ceil(messages.value.length / itemsPerPage));
    const paginatedMessages = computed(() => {
      const start = (currentPage.value - 1) * itemsPerPage;
      const end = start + itemsPerPage;
      return messages.value.slice(start, end);
    });

    const goToPage = (page) => {
      if (page >= 1 && page <= totalPages.value) {
        currentPage.value = page;
      }
    };

    // Open edit modal
    const openEditModal = (message) => {
      editMessage.value = {
        _id: message._id,
        founderName: message.founderName,
        position: message.position,
        content: message.content,
        founderImage: null
      };
      showEditModal.value = true;
    };

    // Update message
    const updateMessage = async () => {
      if (!editMessage.value.founderName || !editMessage.value.position || !editMessage.value.content) {
        toast.error('Please fill all required fields');
        return;
      }

      loading.value = true;
      try {
        // Find original message to preserve image
        const originalMessage = messages.value.find(m => m._id === editMessage.value._id);
        
        // Only send text fields, exclude founderImage and _id
        const { founderImage, _id, ...messageData } = editMessage.value;
        console.log('Sending to backend:', messageData); // Debug log
        const response = await founderMessageService.updateMessage(_id, messageData);
        
        if (response.success) {
          let updatedMessage = response.data;
          
          // Upload new image if provided
          if (founderImage && typeof founderImage !== 'string') {
            try {
              const imageResponse = await founderMessageService.uploadImage(_id, founderImage);
              if (imageResponse.success && imageResponse.data && imageResponse.data.imageUrl) {
                let imageUrl = imageResponse.data.imageUrl;
                try {
                  const presignedUrl = await founderMessageService.getPresignedImageUrl(imageUrl);
                  updatedMessage.founderImage = presignedUrl || imageUrl;
                } catch (error) {
                  updatedMessage.founderImage = imageUrl;
                }
              }
            } catch (imageError) {
              toast.warning('Message updated but image upload failed');
            }
          } else if (originalMessage && originalMessage.founderImage) {
            // Preserve existing image if no new image uploaded
            updatedMessage.founderImage = originalMessage.founderImage;
          }
          
          const index = messages.value.findIndex(m => m._id === _id);
          if (index !== -1) {
            messages.value[index] = updatedMessage;
          }
          
          // Update selected message if it's the same one
          if (selectedMessage.value && selectedMessage.value._id === _id) {
            selectedMessage.value = updatedMessage;
          }
          
          showEditModal.value = false;
          editMessage.value = { _id: '', founderName: '', position: '', content: '', founderImage: null };
          toast.success('Message updated successfully!');
        } else {
          toast.error('Failed to update message: ' + response.error);
        }
      } catch (error) {
        console.error('Error updating message:', error);
        toast.error('Error updating message: ' + error.message);
      } finally {
        loading.value = false;
      }
    };

    // Load messages on component mount
    onMounted(() => {
      loadMessages();
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
                    <ChatBubbleLeftRightIcon style={{ width: '2rem', height: '2rem' }} class="me-2" />
                    Founder Messages
                  </h1>
                  <p class="mb-0 text-dark" style={{ opacity: 0.8 }}>Create and manage messages from leadership</p>
                  {!loading.value && messages.value.length > 0 && (
                    <small class="text-dark d-block mt-1" style={{ opacity: 0.8 }}>
                      <ChartBarIcon style={{ width: '16px', height: '16px' }} class="me-1" />
                      {messages.value.length} total messages • Page {currentPage.value} of {totalPages.value}
                    </small>
                  )}
                </div>
                <button 
                  class="btn btn-light btn-lg rounded-pill px-4 shadow-sm"
                  onClick={() => { showAddModal.value = true; }}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '600' }}
                >
                  <PlusIcon style={{ width: '1.2rem', height: '1.2rem' }} />
                  <span class="d-none d-sm-inline">Create Message</span>
                  <span class="d-sm-none">Create</span>
                </button>
              </div>
            </div>

            <div class="row">
              <div class="col-12">
                <div class="card border-0 shadow-lg rounded-4">
                  <div class="card-header bg-white border-0 rounded-top-4 p-4">
                    <h5 class="mb-0 fw-bold text-dark d-flex align-items-center">
                      <DocumentTextIcon style={{ width: '1.5rem', height: '1.5rem' }} class="me-2" />
                      All Messages
                    </h5>
                  </div>
                  <div class="card-body p-4">
                    {messages.value.length === 0 ? (
                      <div class="text-center py-5">
                        <div class="mb-4 p-4 rounded-circle bg-light d-inline-flex align-items-center justify-content-center" style={{ width: '120px', height: '120px' }}>
                          <UserIcon style={{ width: '4rem', height: '4rem', color: '#6c757d' }} />
                        </div>
                        <h4 class="text-muted mb-3">
                          <ChatBubbleLeftRightIcon style={{ width: '3rem', height: '3rem' }} class="me-2" />
                          No messages yet
                        </h4>
                        <p class="text-muted mb-4">Create your first founder message to connect with your audience</p>
                        <button 
                          class="btn btn-primary btn-lg rounded-pill px-4 shadow-sm"
                          onClick={() => { showAddModal.value = true; }}
                          style={{ fontWeight: '600' }}
                        >
                          <PlusIcon style={{ width: '1.2rem', height: '1.2rem' }} class="me-2" />
                          Create First Message
                        </button>
                      </div>
                    ) : (
                      <div class="row g-4">
                        {paginatedMessages.value.map(message => (
                          <div key={message._id} class="col-xl-4 col-lg-6 col-md-6 col-sm-12">
                            <div class={`card border-0 shadow-lg h-100 position-relative ${!message.isActive ? 'opacity-50' : ''}`} style={{ background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)', borderRadius: '16px', transition: 'all 0.3s ease', minHeight: '300px' }}>
                              {!message.isActive && (
                                <div class="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{ backgroundColor: 'rgba(0,0,0,0.1)', zIndex: 1, pointerEvents: 'none' }}>
                                  <span class="badge bg-secondary px-3 py-2 rounded-pill shadow">🔒 Disabled</span>
                                </div>
                              )}
                              <div class="card-body p-3 d-flex flex-column">
                                {/* Header with image and name */}
                                <div class="d-flex align-items-center mb-3">
                                  <div class="flex-shrink-0 me-3">
                                    {message.founderImage ? (
                                      <img 
                                        src={message.founderImage} 
                                        alt={message.founderName}
                                        class="rounded-circle border border-3 border-white shadow-lg"
                                        style={{ width: '60px', height: '60px', objectFit: 'cover' }}
                                      />
                                    ) : (
                                      <div class="rounded-circle d-flex align-items-center justify-content-center border border-3 border-white shadow-lg" style={{ width: '60px', height: '60px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                                        <UserIcon style={{ width: '2rem', height: '2rem', color: 'white' }} />
                                      </div>
                                    )}
                                  </div>
                                  <div class="flex-grow-1">
                                    <h6 class="mb-1 fw-bold text-dark" style={{ fontSize: '1rem' }}>{message.founderName}</h6>
                                    <p class="mb-0 fw-semibold text-primary" style={{ fontSize: '0.85rem' }}>{message.position}</p>
                                  </div>
                                  <div class="dropdown position-relative">
                                    <button 
                                      class="btn btn-light btn-sm rounded-circle d-flex align-items-center justify-content-center shadow-sm"
                                      onClick={() => toggleDropdown(message._id)}
                                      style={{ width: '32px', height: '32px', transition: 'all 0.2s ease', position: 'relative', zIndex: 10 }}
                                    >
                                      <EllipsisVerticalIcon style={{ width: '1rem', height: '1rem' }} />
                                    </button>
                                    {activeDropdown.value === message._id && (
                                      <div class="dropdown-menu show position-absolute shadow-lg border-0 rounded-3" style={{ minWidth: '160px', right: '0', top: '100%', zIndex: 1000 }}>
                                        {message.isActive && (
                                          <>
                                            <button 
                                              class="dropdown-item d-flex align-items-center gap-2 py-2 px-3 rounded-2"
                                              onClick={() => { openEditModal(message); toggleDropdown(null); }}
                                            >
                                              <PencilIcon style={{ width: '1rem', height: '1rem', color: '#8b5cf6' }} />
                                              <span class="fw-medium">Edit Message</span>
                                            </button>
                                          </>
                                        )}
                                        <button 
                                          class="dropdown-item d-flex align-items-center gap-2 py-2 px-3 rounded-2"
                                          onClick={() => { toggleStatus(message); toggleDropdown(null); }}
                                        >
                                          <span>{message.isActive ? '🔴' : '🟢'}</span> {message.isActive ? 'Disable' : 'Enable'}
                                        </button>
                                        {message.isActive && (
                                          <>
                                            <div class="dropdown-divider"></div>
                                            <button 
                                              class="dropdown-item d-flex align-items-center gap-2 py-2 px-3 text-danger rounded-2"
                                              onClick={() => { deleteMessage(message._id); toggleDropdown(null); }}
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
                                
                                {/* Message content */}
                                <div class="flex-grow-1 mb-3">
                                  <div class="p-3 rounded-3" style={{ backgroundColor: '#f8f9fa', border: '1px solid #e9ecef', minHeight: '120px' }}>
                                    <p class="mb-0 text-dark lh-base" style={{ fontSize: '0.9rem' }}>
                                      {expandedMessages.value.has(message._id) 
                                        ? message.content 
                                        : (message.content.length > 100 ? message.content.substring(0, 100) + '...' : message.content)
                                      }
                                    </p>
                                    {message.content.length > 100 && (
                                      <button 
                                        class="btn btn-link p-0 mt-2 text-primary fw-semibold"
                                        onClick={() => toggleExpand(message._id)}
                                        style={{ fontSize: '0.8rem', textDecoration: 'none' }}
                                      >
                                        {expandedMessages.value.has(message._id) ? 'See Less' : 'See More'}
                                      </button>
                                    )}
                                  </div>
                                </div>
                                
                                {/* Footer */}
                                <div class="mt-auto">
                                  <div class="d-flex justify-content-between align-items-center">
                                    <small class="text-muted d-flex align-items-center gap-1">
                                      <CalendarIcon style={{ width: '12px', height: '12px' }} />
                                      {new Date(message.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                    </small>
                                    <button 
                                      class="btn btn-primary btn-sm px-3 py-1 fw-semibold rounded-pill"
                                      onClick={() => viewMessage(message)}
                                      disabled={loading.value || !message.isActive}
                                      style={{ fontSize: '0.75rem', cursor: message.isActive ? 'pointer' : 'not-allowed' }}
                                      title={message.isActive ? 'View full message in modal' : 'Message is disabled'}
                                    >
                                      <EyeIcon style={{ width: '12px', height: '12px' }} class="me-1" />
                                      View
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Enhanced Pagination */}
                    {messages.value.length > itemsPerPage && (
                      <div class="d-flex justify-content-center align-items-center mt-5">
                        <nav aria-label="Messages pagination">
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
                  </div>
                </div>
              </div>
            </div>

            {/* Message Preview Modal for Mobile */}
            {selectedMessage.value && (
              <div class="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={() => selectedMessage.value = null}>
                <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable modal-fullscreen-sm-down" style={{ maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
                  <div class="modal-content border-0 shadow-lg" style={{ borderRadius: '16px', maxHeight: '80vh' }}>
                    <div class="modal-header bg-primary text-white border-0" style={{ borderRadius: '16px 16px 0 0' }}>
                      <h5 class="mb-0 fw-bold d-flex align-items-center">
                        <EyeIcon style={{ width: '1.5rem', height: '1.5rem' }} class="me-2" />
                        Message Preview
                      </h5>
                      <button 
                        class="btn-close btn-close-white" 
                        onClick={() => selectedMessage.value = null}
                      ></button>
                    </div>
                    <div class="modal-body p-4" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                      {selectedMessage.value.founderImage && (
                        <div class="text-center mb-4">
                          <img 
                            src={selectedMessage.value.founderImage} 
                            alt={selectedMessage.value.founderName}
                            class="rounded-circle border border-3 border-white shadow-lg"
                            style={{ width: '100px', height: '100px', objectFit: 'cover' }}
                          />
                        </div>
                      )}
                      <h4 class="mb-2 text-center fw-bold text-dark">{selectedMessage.value.founderName}</h4>
                      <p class="text-primary text-center mb-3 fw-semibold">{selectedMessage.value.position}</p>

                      <div class="p-3 rounded-3 mb-4" style={{ backgroundColor: '#f8f9fa', border: '1px solid #e9ecef' }}>
                        <p class="mb-0 text-dark lh-base" style={{ fontSize: '0.95rem' }}>{selectedMessage.value.content}</p>
                      </div>
                      <hr class="my-3" />
                      <small class="text-muted d-flex align-items-center gap-1">
                        <CalendarIcon style={{ width: '14px', height: '14px' }} />
                        Created on {new Date(selectedMessage.value.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                      </small>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Add Modal */}
            {showAddModal.value && (
              <div class="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={() => showAddModal.value = false}>
                <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable modal-fullscreen-sm-down" style={{ maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
                  <div class="modal-content border-0 shadow-lg" style={{ borderRadius: '16px', maxHeight: '85vh' }}>
                    <div class="modal-header">
                      <h5 class="modal-title">Create New Message</h5>
                      <button class="btn-close" onClick={() => showAddModal.value = false}></button>
                    </div>
                    <div class="modal-body">
                      <div class="row">
                        <div class="col-md-6">
                          <div class="mb-3">
                            <label class="form-label">Founder Name</label>
                            <input 
                              type="text" 
                              class="form-control" 
                              value={newMessage.value.founderName}
                              onInput={(e) => newMessage.value.founderName = e.target.value}
                              placeholder="Enter founder name"
                            />
                          </div>
                        </div>
                        <div class="col-md-6">
                          <div class="mb-3">
                            <label class="form-label">Position</label>
                            <input 
                              type="text" 
                              class="form-control" 
                              value={newMessage.value.position}
                              onInput={(e) => newMessage.value.position = e.target.value}
                              placeholder="Enter position"
                            />
                          </div>
                        </div>
                      </div>
                      <div class="mb-3">
                        <label class="form-label">Founder Image</label>
                        <input 
                          type="file" 
                          class="form-control" 
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files[0];
                            if (file) {
                              newMessage.value.founderImage = file;
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
                      </div>
                      <div class="mb-3">
                        <label class="form-label">Message</label>
                        <textarea 
                          class="form-control" 
                          rows="6"
                          value={newMessage.value.content}
                          onInput={(e) => newMessage.value.content = e.target.value}
                          placeholder="Enter your message content"
                        ></textarea>
                      </div>

                    </div>
                    <div class="modal-footer">
                      <button class="btn btn-secondary" onClick={() => showAddModal.value = false} disabled={loading.value}>
                        Cancel
                      </button>
                      <button class="btn btn-primary" onClick={addMessage} disabled={loading.value}>
                        {loading.value ? 'Creating...' : 'Create Message'}
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
                      <h5 class="modal-title">Edit Message</h5>
                      <button class="btn-close" onClick={() => showEditModal.value = false}></button>
                    </div>
                    <div class="modal-body">
                      <div class="row">
                        <div class="col-md-6">
                          <div class="mb-3">
                            <label class="form-label">Founder Name</label>
                            <input 
                              type="text" 
                              class="form-control" 
                              value={editMessage.value.founderName}
                              onInput={(e) => editMessage.value.founderName = e.target.value}
                              placeholder="Enter founder name"
                            />
                          </div>
                        </div>
                        <div class="col-md-6">
                          <div class="mb-3">
                            <label class="form-label">Position</label>
                            <input 
                              type="text" 
                              class="form-control" 
                              value={editMessage.value.position}
                              onInput={(e) => editMessage.value.position = e.target.value}
                              placeholder="Enter position"
                            />
                          </div>
                        </div>
                      </div>
                      <div class="mb-3">
                        <label class="form-label">Founder Image (Optional)</label>
                        <input 
                          type="file" 
                          class="form-control" 
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files[0];
                            if (file) {
                              editMessage.value.founderImage = file;
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
                        <small class="text-muted">Leave empty to keep current image</small>
                      </div>
                      <div class="mb-3">
                        <label class="form-label">Message</label>
                        <textarea 
                          class="form-control" 
                          rows="6"
                          value={editMessage.value.content}
                          onInput={(e) => editMessage.value.content = e.target.value}
                          placeholder="Enter your message content"
                        ></textarea>
                      </div>

                    </div>
                    <div class="modal-footer">
                      <button class="btn btn-secondary" onClick={() => showEditModal.value = false} disabled={loading.value}>
                        Cancel
                      </button>
                      <button class="btn btn-primary" onClick={updateMessage} disabled={loading.value}>
                        {loading.value ? 'Updating...' : 'Update Message'}
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