import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { ArrowLeftIcon, PlusIcon, BellIcon, PaperAirplaneIcon, EyeIcon } from '@heroicons/vue/24/outline';

export default {
  name: 'ClientPushNotification',
  setup() {
    const router = useRouter();
    const notifications = ref([
      {
        id: 1,
        title: 'Welcome Offer',
        message: 'Get 20% off on your first purchase!',
        status: 'sent',
        recipients: 1250,
        sentAt: '2024-01-15T10:30:00',
        clickRate: '12.5%'
      },
      {
        id: 2,
        title: 'New Product Launch',
        message: 'Check out our latest product collection',
        status: 'scheduled',
        recipients: 2100,
        scheduledAt: '2024-01-20T09:00:00',
        clickRate: '0%'
      }
    ]);

    const showCreateModal = ref(false);
    const newNotification = ref({
      title: '',
      message: '',
      scheduleType: 'now',
      scheduledAt: ''
    });

    const goBack = () => {
      router.push('/client/tools');
    };

    const sendNotification = () => {
      const notification = {
        id: Date.now(),
        ...newNotification.value,
        status: newNotification.value.scheduleType === 'now' ? 'sent' : 'scheduled',
        recipients: Math.floor(Math.random() * 2000) + 500,
        sentAt: newNotification.value.scheduleType === 'now' ? new Date().toISOString() : null,
        clickRate: '0%'
      };
      notifications.value.unshift(notification);
      newNotification.value = { title: '', message: '', scheduleType: 'now', scheduledAt: '' };
      showCreateModal.value = false;
    };

    const getStatusBadge = (status) => {
      const badges = {
        sent: 'bg-success',
        scheduled: 'bg-warning',
        draft: 'bg-secondary'
      };
      return badges[status] || 'bg-secondary';
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
                <h1 class="mb-0 text-primary">Push Notifications</h1>
                <p class="text-muted mb-0">Send targeted notifications to your users</p>
              </div>
              <button 
                class="btn btn-primary"
                onClick={() => showCreateModal.value = true}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <PlusIcon style={{ width: '1rem', height: '1rem' }} />
                Create Notification
              </button>
            </div>

            <div class="row mb-4">
              <div class="col-md-3">
                <div class="card border-0 shadow-sm text-center">
                  <div class="card-body">
                    <h3 class="text-primary">{notifications.value.filter(n => n.status === 'sent').length}</h3>
                    <p class="text-muted mb-0">Sent</p>
                  </div>
                </div>
              </div>
              <div class="col-md-3">
                <div class="card border-0 shadow-sm text-center">
                  <div class="card-body">
                    <h3 class="text-warning">{notifications.value.filter(n => n.status === 'scheduled').length}</h3>
                    <p class="text-muted mb-0">Scheduled</p>
                  </div>
                </div>
              </div>
              <div class="col-md-3">
                <div class="card border-0 shadow-sm text-center">
                  <div class="card-body">
                    <h3 class="text-info">{notifications.value.reduce((sum, n) => sum + n.recipients, 0)}</h3>
                    <p class="text-muted mb-0">Total Recipients</p>
                  </div>
                </div>
              </div>
              <div class="col-md-3">
                <div class="card border-0 shadow-sm text-center">
                  <div class="card-body">
                    <h3 class="text-success">8.7%</h3>
                    <p class="text-muted mb-0">Avg Click Rate</p>
                  </div>
                </div>
              </div>
            </div>

            <div class="card border-0 shadow-sm">
              <div class="card-header bg-white">
                <h5 class="mb-0">Notification History</h5>
              </div>
              <div class="card-body p-0">
                {notifications.value.length === 0 ? (
                  <div class="text-center py-5">
                    <BellIcon style={{ width: '4rem', height: '4rem', color: '#dee2e6' }} />
                    <h4 class="text-muted mt-3">No notifications sent</h4>
                    <p class="text-muted">Create your first push notification</p>
                  </div>
                ) : (
                  <div class="table-responsive">
                    <table class="table table-hover mb-0">
                      <thead class="table-light">
                        <tr>
                          <th>Title</th>
                          <th>Status</th>
                          <th>Recipients</th>
                          <th>Click Rate</th>
                          <th>Date</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {notifications.value.map(notification => (
                          <tr key={notification.id}>
                            <td>
                              <div>
                                <h6 class="mb-1">{notification.title}</h6>
                                <small class="text-muted">{notification.message}</small>
                              </div>
                            </td>
                            <td>
                              <span class={`badge ${getStatusBadge(notification.status)}`}>
                                {notification.status}
                              </span>
                            </td>
                            <td>{notification.recipients.toLocaleString()}</td>
                            <td>{notification.clickRate}</td>
                            <td>
                              {notification.sentAt 
                                ? new Date(notification.sentAt).toLocaleDateString()
                                : notification.scheduledAt 
                                  ? new Date(notification.scheduledAt).toLocaleDateString()
                                  : '-'
                              }
                            </td>
                            <td>
                              <button class="btn btn-outline-primary btn-sm">
                                <EyeIcon style={{ width: '1rem', height: '1rem' }} />
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
                <div class="modal-dialog">
                  <div class="modal-content">
                    <div class="modal-header">
                      <h5 class="modal-title">Create Push Notification</h5>
                      <button class="btn-close" onClick={() => showCreateModal.value = false}></button>
                    </div>
                    <div class="modal-body">
                      <div class="mb-3">
                        <label class="form-label">Notification Title</label>
                        <input 
                          type="text" 
                          class="form-control" 
                          v-model={newNotification.value.title}
                          placeholder="Enter notification title"
                        />
                      </div>
                      <div class="mb-3">
                        <label class="form-label">Message</label>
                        <textarea 
                          class="form-control" 
                          rows="3"
                          v-model={newNotification.value.message}
                          placeholder="Enter notification message"
                        ></textarea>
                      </div>
                      <div class="mb-3">
                        <label class="form-label">Send Time</label>
                        <select class="form-select" v-model={newNotification.value.scheduleType}>
                          <option value="now">Send Now</option>
                          <option value="schedule">Schedule for Later</option>
                        </select>
                      </div>
                      {newNotification.value.scheduleType === 'schedule' && (
                        <div class="mb-3">
                          <label class="form-label">Schedule Date & Time</label>
                          <input 
                            type="datetime-local" 
                            class="form-control"
                            v-model={newNotification.value.scheduledAt}
                          />
                        </div>
                      )}
                    </div>
                    <div class="modal-footer">
                      <button class="btn btn-secondary" onClick={() => showCreateModal.value = false}>Cancel</button>
                      <button class="btn btn-primary" onClick={sendNotification}>
                        <PaperAirplaneIcon style={{ width: '1rem', height: '1rem' }} class="me-2" />
                        {newNotification.value.scheduleType === 'now' ? 'Send Now' : 'Schedule'}
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