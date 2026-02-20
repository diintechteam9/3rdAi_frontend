import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { ArrowLeftIcon, PlusIcon, TicketIcon, ClockIcon, ExclamationTriangleIcon, ChatBubbleLeftRightIcon, UserIcon } from '@heroicons/vue/24/outline';

export default {
  name: 'ClientTickets',
  setup() {
    const router = useRouter();
    const tickets = ref([
      {
        id: 'TKT-001',
        title: 'Payment Gateway Issue',
        description: 'Unable to complete payment using credit card. Getting error message.',
        customerName: 'Rahul Verma',
        customerEmail: 'rahul@email.com',
        priority: 'high',
        status: 'open',
        category: 'payment',
        assignedTo: 'Support Team',
        createdAt: '2024-01-20T10:30:00',
        updatedAt: '2024-01-20T14:15:00',
        messages: [
          {
            id: 1,
            sender: 'customer',
            message: 'I am trying to make a payment but getting error code 502',
            timestamp: '2024-01-20T10:30:00'
          },
          {
            id: 2,
            sender: 'support',
            message: 'We are looking into this issue. Can you please share the screenshot?',
            timestamp: '2024-01-20T11:00:00'
          }
        ]
      },
      {
        id: 'TKT-002',
        title: 'Product Delivery Delay',
        description: 'Order placed 5 days ago but not yet shipped. Need urgent update.',
        customerName: 'Sneha Patel',
        customerEmail: 'sneha@email.com',
        priority: 'medium',
        status: 'in_progress',
        category: 'shipping',
        assignedTo: 'Logistics Team',
        createdAt: '2024-01-18T09:15:00',
        updatedAt: '2024-01-19T16:30:00',
        messages: [
          {
            id: 1,
            sender: 'customer',
            message: 'My order #12345 is not yet shipped. When will it be delivered?',
            timestamp: '2024-01-18T09:15:00'
          }
        ]
      },
      {
        id: 'TKT-003',
        title: 'Account Login Problem',
        description: 'Cannot login to account. Password reset not working.',
        customerName: 'Arjun Singh',
        customerEmail: 'arjun@email.com',
        priority: 'low',
        status: 'resolved',
        category: 'account',
        assignedTo: 'Tech Support',
        createdAt: '2024-01-15T14:20:00',
        updatedAt: '2024-01-16T10:45:00',
        messages: []
      }
    ]);

    const selectedTicket = ref(null);
    const showCreateModal = ref(false);
    const showMessageModal = ref(false);
    const newMessage = ref('');
    const filterStatus = ref('all');
    const filterPriority = ref('all');

    const newTicket = ref({
      title: '',
      description: '',
      customerName: '',
      customerEmail: '',
      priority: 'medium',
      category: 'general'
    });

    const goBack = () => {
      router.push('/client/tools');
    };

    const getPriorityBadge = (priority) => {
      const badges = {
        low: 'bg-success',
        medium: 'bg-warning',
        high: 'bg-danger',
        urgent: 'bg-dark'
      };
      return badges[priority] || 'bg-secondary';
    };

    const getStatusBadge = (status) => {
      const badges = {
        open: 'bg-primary',
        in_progress: 'bg-info',
        resolved: 'bg-success',
        closed: 'bg-secondary'
      };
      return badges[status] || 'bg-secondary';
    };

    const getCategoryIcon = (category) => {
      const icons = {
        payment: '💳',
        shipping: '📦',
        account: '👤',
        technical: '🔧',
        general: '💬'
      };
      return icons[category] || '💬';
    };

    const createTicket = () => {
      const ticket = {
        id: `TKT-${String(tickets.value.length + 1).padStart(3, '0')}`,
        ...newTicket.value,
        status: 'open',
        assignedTo: 'Support Team',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messages: []
      };
      tickets.value.unshift(ticket);
      newTicket.value = {
        title: '', description: '', customerName: '', customerEmail: '',
        priority: 'medium', category: 'general'
      };
      showCreateModal.value = false;
    };

    const updateTicketStatus = (ticket, status) => {
      ticket.status = status;
      ticket.updatedAt = new Date().toISOString();
    };

    const updateTicketPriority = (ticket, priority) => {
      ticket.priority = priority;
      ticket.updatedAt = new Date().toISOString();
    };

    const viewTicket = (ticket) => {
      selectedTicket.value = ticket;
    };

    const openMessageModal = (ticket) => {
      selectedTicket.value = ticket;
      showMessageModal.value = true;
    };

    const sendMessage = () => {
      if (selectedTicket.value && newMessage.value.trim()) {
        selectedTicket.value.messages.push({
          id: selectedTicket.value.messages.length + 1,
          sender: 'support',
          message: newMessage.value,
          timestamp: new Date().toISOString()
        });
        selectedTicket.value.updatedAt = new Date().toISOString();
        newMessage.value = '';
        showMessageModal.value = false;
      }
    };

    const filteredTickets = () => {
      let filtered = tickets.value;
      
      if (filterStatus.value !== 'all') {
        filtered = filtered.filter(t => t.status === filterStatus.value);
      }
      
      if (filterPriority.value !== 'all') {
        filtered = filtered.filter(t => t.priority === filterPriority.value);
      }
      
      return filtered;
    };

    const getTimeAgo = (timestamp) => {
      const now = new Date();
      const time = new Date(timestamp);
      const diffInHours = Math.floor((now - time) / (1000 * 60 * 60));
      
      if (diffInHours < 1) return 'Just now';
      if (diffInHours < 24) return `${diffInHours}h ago`;
      return `${Math.floor(diffInHours / 24)}d ago`;
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
                <h1 class="mb-0 text-primary">Support Tickets</h1>
                <p class="text-muted mb-0">Manage customer support requests and communications</p>
              </div>
              <button 
                class="btn btn-primary"
                onClick={() => showCreateModal.value = true}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <PlusIcon style={{ width: '1rem', height: '1rem' }} />
                Create Ticket
              </button>
            </div>

            {/* Ticket Stats */}
            <div class="row mb-4">
              <div class="col-md-3">
                <div class="card border-0 shadow-sm">
                  <div class="card-body text-center">
                    <TicketIcon style={{ width: '2rem', height: '2rem', color: '#007bff' }} />
                    <h3 class="mt-2">{tickets.value.filter(t => t.status === 'open').length}</h3>
                    <p class="text-muted mb-0">Open Tickets</p>
                  </div>
                </div>
              </div>
              <div class="col-md-3">
                <div class="card border-0 shadow-sm">
                  <div class="card-body text-center">
                    <ClockIcon style={{ width: '2rem', height: '2rem', color: '#ffc107' }} />
                    <h3 class="mt-2">{tickets.value.filter(t => t.status === 'in_progress').length}</h3>
                    <p class="text-muted mb-0">In Progress</p>
                  </div>
                </div>
              </div>
              <div class="col-md-3">
                <div class="card border-0 shadow-sm">
                  <div class="card-body text-center">
                    <ExclamationTriangleIcon style={{ width: '2rem', height: '2rem', color: '#dc3545' }} />
                    <h3 class="mt-2">{tickets.value.filter(t => t.priority === 'high' || t.priority === 'urgent').length}</h3>
                    <p class="text-muted mb-0">High Priority</p>
                  </div>
                </div>
              </div>
              <div class="col-md-3">
                <div class="card border-0 shadow-sm">
                  <div class="card-body text-center">
                    <div style={{ fontSize: '2rem', color: '#28a745' }}>✓</div>
                    <h3 class="mt-2">{tickets.value.filter(t => t.status === 'resolved').length}</h3>
                    <p class="text-muted mb-0">Resolved</p>
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
                          <option value="open">Open</option>
                          <option value="in_progress">In Progress</option>
                          <option value="resolved">Resolved</option>
                          <option value="closed">Closed</option>
                        </select>
                      </div>
                      <div class="col-md-4">
                        <label class="form-label">Filter by Priority</label>
                        <select class="form-select" v-model={filterPriority.value}>
                          <option value="all">All Priorities</option>
                          <option value="urgent">Urgent</option>
                          <option value="high">High</option>
                          <option value="medium">Medium</option>
                          <option value="low">Low</option>
                        </select>
                      </div>
                      <div class="col-md-4 d-flex align-items-end">
                        <button class="btn btn-outline-secondary w-100">Export Tickets</button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tickets List */}
                <div class="card border-0 shadow-sm">
                  <div class="card-header bg-white">
                    <h5 class="mb-0">Support Tickets ({filteredTickets().length})</h5>
                  </div>
                  <div class="card-body p-0">
                    {filteredTickets().length === 0 ? (
                      <div class="text-center py-5">
                        <TicketIcon style={{ width: '4rem', height: '4rem', color: '#dee2e6' }} />
                        <h4 class="text-muted mt-3">No tickets found</h4>
                        <p class="text-muted">No tickets match your current filters</p>
                      </div>
                    ) : (
                      <div>
                        {filteredTickets().map(ticket => (
                          <div key={ticket.id} class="border-bottom p-4">
                            <div class="d-flex justify-content-between align-items-start mb-3">
                              <div class="flex-grow-1">
                                <div class="d-flex align-items-center mb-2">
                                  <span class="me-2">{getCategoryIcon(ticket.category)}</span>
                                  <h6 class="mb-0 me-3">{ticket.id}</h6>
                                  <span class={`badge ${getPriorityBadge(ticket.priority)} me-2`}>
                                    {ticket.priority}
                                  </span>
                                  <span class={`badge ${getStatusBadge(ticket.status)}`}>
                                    {ticket.status.replace('_', ' ')}
                                  </span>
                                </div>
                                <h5 class="mb-2">{ticket.title}</h5>
                                <p class="text-muted mb-2">{ticket.description}</p>
                                <div class="small text-muted">
                                  <span class="me-3">👤 {ticket.customerName}</span>
                                  <span class="me-3">📧 {ticket.customerEmail}</span>
                                  <span class="me-3">👥 {ticket.assignedTo}</span>
                                  <span>🕒 {getTimeAgo(ticket.updatedAt)}</span>
                                </div>
                              </div>
                              <div class="btn-group btn-group-sm">
                                <button 
                                  class="btn btn-outline-primary"
                                  onClick={() => viewTicket(ticket)}
                                >
                                  <TicketIcon style={{ width: '1rem', height: '1rem' }} />
                                </button>
                                <button 
                                  class="btn btn-outline-info"
                                  onClick={() => openMessageModal(ticket)}
                                >
                                  <ChatBubbleLeftRightIcon style={{ width: '1rem', height: '1rem' }} />
                                </button>
                                <div class="dropdown">
                                  <button class="btn btn-outline-secondary dropdown-toggle" data-bs-toggle="dropdown">
                                    Actions
                                  </button>
                                  <ul class="dropdown-menu">
                                    <li><a class="dropdown-item" href="#" onClick={() => updateTicketStatus(ticket, 'in_progress')}>Mark In Progress</a></li>
                                    <li><a class="dropdown-item" href="#" onClick={() => updateTicketStatus(ticket, 'resolved')}>Mark Resolved</a></li>
                                    <li><hr class="dropdown-divider" /></li>
                                    <li><a class="dropdown-item" href="#" onClick={() => updateTicketPriority(ticket, 'high')}>Set High Priority</a></li>
                                    <li><a class="dropdown-item" href="#" onClick={() => updateTicketPriority(ticket, 'low')}>Set Low Priority</a></li>
                                  </ul>
                                </div>
                              </div>
                            </div>
                            
                            {ticket.messages.length > 0 && (
                              <div class="bg-light rounded p-3">
                                <div class="small text-muted mb-2">Latest Message:</div>
                                <p class="mb-0 small">{ticket.messages[ticket.messages.length - 1].message}</p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div class="col-lg-4">
                {selectedTicket.value ? (
                  <div class="card border-0 shadow-sm">
                    <div class="card-header bg-primary text-white">
                      <h5 class="mb-0">Ticket Details</h5>
                    </div>
                    <div class="card-body">
                      <div class="mb-3">
                        <h5>{selectedTicket.value.id}</h5>
                        <h6>{selectedTicket.value.title}</h6>
                        <p class="text-muted">{selectedTicket.value.description}</p>
                      </div>
                      
                      <div class="mb-3">
                        <div class="row">
                          <div class="col-6">
                            <span class={`badge ${getStatusBadge(selectedTicket.value.status)} w-100`}>
                              {selectedTicket.value.status.replace('_', ' ')}
                            </span>
                          </div>
                          <div class="col-6">
                            <span class={`badge ${getPriorityBadge(selectedTicket.value.priority)} w-100`}>
                              {selectedTicket.value.priority}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div class="mb-3">
                        <div class="small text-muted">
                          <div><strong>Customer:</strong> {selectedTicket.value.customerName}</div>
                          <div><strong>Email:</strong> {selectedTicket.value.customerEmail}</div>
                          <div><strong>Category:</strong> {selectedTicket.value.category}</div>
                          <div><strong>Assigned:</strong> {selectedTicket.value.assignedTo}</div>
                          <div><strong>Created:</strong> {new Date(selectedTicket.value.createdAt).toLocaleDateString()}</div>
                          <div><strong>Updated:</strong> {getTimeAgo(selectedTicket.value.updatedAt)}</div>
                        </div>
                      </div>

                      <div class="mb-3">
                        <h6>Messages ({selectedTicket.value.messages.length})</h6>
                        <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                          {selectedTicket.value.messages.length === 0 ? (
                            <p class="text-muted small">No messages yet</p>
                          ) : (
                            selectedTicket.value.messages.map(msg => (
                              <div key={msg.id} class={`mb-2 p-2 rounded ${msg.sender === 'support' ? 'bg-primary text-white' : 'bg-light'}`}>
                                <div class="small mb-1">
                                  <strong>{msg.sender === 'support' ? 'You' : selectedTicket.value.customerName}</strong>
                                  <span class="ms-2">{getTimeAgo(msg.timestamp)}</span>
                                </div>
                                <div class="small">{msg.message}</div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      <div class="d-grid gap-2">
                        <button 
                          class="btn btn-primary btn-sm"
                          onClick={() => openMessageModal(selectedTicket.value)}
                        >
                          Send Message
                        </button>
                        <button 
                          class="btn btn-success btn-sm"
                          onClick={() => updateTicketStatus(selectedTicket.value, 'resolved')}
                        >
                          Mark Resolved
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div class="card border-0 shadow-sm">
                    <div class="card-body text-center py-5">
                      <TicketIcon style={{ width: '3rem', height: '3rem', color: '#dee2e6' }} />
                      <h5 class="text-muted mt-3">Select a ticket</h5>
                      <p class="text-muted">Click on a ticket to view details</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Create Ticket Modal */}
            {showCreateModal.value && (
              <div class="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                <div class="modal-dialog">
                  <div class="modal-content">
                    <div class="modal-header">
                      <h5 class="modal-title">Create New Ticket</h5>
                      <button class="btn-close" onClick={() => showCreateModal.value = false}></button>
                    </div>
                    <div class="modal-body">
                      <div class="row">
                        <div class="col-md-6">
                          <div class="mb-3">
                            <label class="form-label">Customer Name</label>
                            <input 
                              type="text" 
                              class="form-control" 
                              v-model={newTicket.value.customerName}
                              placeholder="Customer name"
                            />
                          </div>
                        </div>
                        <div class="col-md-6">
                          <div class="mb-3">
                            <label class="form-label">Customer Email</label>
                            <input 
                              type="email" 
                              class="form-control" 
                              v-model={newTicket.value.customerEmail}
                              placeholder="customer@email.com"
                            />
                          </div>
                        </div>
                      </div>
                      
                      <div class="mb-3">
                        <label class="form-label">Ticket Title</label>
                        <input 
                          type="text" 
                          class="form-control" 
                          v-model={newTicket.value.title}
                          placeholder="Brief description of the issue"
                        />
                      </div>
                      
                      <div class="mb-3">
                        <label class="form-label">Description</label>
                        <textarea 
                          class="form-control" 
                          rows="4"
                          v-model={newTicket.value.description}
                          placeholder="Detailed description of the issue"
                        ></textarea>
                      </div>

                      <div class="row">
                        <div class="col-md-6">
                          <div class="mb-3">
                            <label class="form-label">Priority</label>
                            <select class="form-select" v-model={newTicket.value.priority}>
                              <option value="low">Low</option>
                              <option value="medium">Medium</option>
                              <option value="high">High</option>
                              <option value="urgent">Urgent</option>
                            </select>
                          </div>
                        </div>
                        <div class="col-md-6">
                          <div class="mb-3">
                            <label class="form-label">Category</label>
                            <select class="form-select" v-model={newTicket.value.category}>
                              <option value="general">General</option>
                              <option value="technical">Technical</option>
                              <option value="payment">Payment</option>
                              <option value="shipping">Shipping</option>
                              <option value="account">Account</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div class="modal-footer">
                      <button class="btn btn-secondary" onClick={() => showCreateModal.value = false}>Cancel</button>
                      <button class="btn btn-primary" onClick={createTicket}>Create Ticket</button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Message Modal */}
            {showMessageModal.value && (
              <div class="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                <div class="modal-dialog">
                  <div class="modal-content">
                    <div class="modal-header">
                      <h5 class="modal-title">Send Message</h5>
                      <button class="btn-close" onClick={() => showMessageModal.value = false}></button>
                    </div>
                    <div class="modal-body">
                      <div class="mb-3">
                        <strong>Ticket:</strong> {selectedTicket.value?.id} - {selectedTicket.value?.title}
                      </div>
                      <div class="mb-3">
                        <strong>Customer:</strong> {selectedTicket.value?.customerName}
                      </div>
                      <div class="mb-3">
                        <label class="form-label">Your Message</label>
                        <textarea 
                          class="form-control" 
                          rows="4"
                          v-model={newMessage.value}
                          placeholder="Type your message to the customer..."
                        ></textarea>
                      </div>
                    </div>
                    <div class="modal-footer">
                      <button class="btn btn-secondary" onClick={() => showMessageModal.value = false}>Cancel</button>
                      <button class="btn btn-primary" onClick={sendMessage}>Send Message</button>
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