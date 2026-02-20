import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import { BellIcon, CheckIcon, ArrowLeftIcon } from '@heroicons/vue/24/outline';
import notificationService from '../../services/notificationService';

export default {
  name: 'MobileNotifications',
  setup() {
    const router = useRouter();
    const toast = useToast();
    const notifications = ref([]);
    const loading = ref(false);

    const fetchNotifications = async () => {
      loading.value = true;
      try {
        const response = await notificationService.getAll();
        notifications.value = response.data || [];
      } catch (error) {
        toast.error('Failed to load notifications');
      } finally {
        loading.value = false;
      }
    };

    const markAsRead = async (id) => {
      try {
        await notificationService.markAsRead(id);
        const notification = notifications.value.find(n => n._id === id);
        if (notification) notification.isRead = true;
      } catch (error) {
        toast.error('Failed to mark as read');
      }
    };

    const markAllAsRead = async () => {
      try {
        await notificationService.markAllAsRead();
        notifications.value.forEach(n => n.isRead = true);
        toast.success('All marked as read');
      } catch (error) {
        toast.error('Failed to mark all as read');
      }
    };

    const handleNotificationClick = (notification) => {
      if (!notification.isRead) {
        markAsRead(notification._id);
      }
      if (notification.data?.sankalpId) {
        router.push(`/mobile/user/sankalp/${notification.data.sankalpId}`);
      }
    };

    const formatDate = (date) => {
      const d = new Date(date);
      const now = new Date();
      const diff = now - d;
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(diff / 3600000);
      const days = Math.floor(diff / 86400000);

      if (minutes < 60) return `${minutes}m ago`;
      if (hours < 24) return `${hours}h ago`;
      if (days < 7) return `${days}d ago`;
      return d.toLocaleDateString();
    };

    onMounted(() => {
      fetchNotifications();
    });

    return () => (
      <div class="notifications-page">
        <div class="header">
          <button class="back-btn" onClick={() => router.back()}>
            <ArrowLeftIcon style={{ width: '1.5rem', height: '1.5rem' }} />
          </button>
          <h1>Notifications</h1>
          {notifications.value.some(n => !n.isRead) && (
            <button class="mark-all-btn" onClick={markAllAsRead}>
              <CheckIcon style={{ width: '1.25rem', height: '1.25rem' }} />
            </button>
          )}
        </div>

        {loading.value ? (
          <div class="loading">Loading...</div>
        ) : notifications.value.length === 0 ? (
          <div class="empty">
            <BellIcon style={{ width: '4rem', height: '4rem', color: '#cbd5e1' }} />
            <p>No notifications yet</p>
          </div>
        ) : (
          <div class="notifications-list">
            {notifications.value.map(notification => (
              <div
                key={notification._id}
                class={`notification-item ${!notification.isRead ? 'unread' : ''}`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div class="notification-content">
                  <h3>{notification.title}</h3>
                  <p>{notification.message}</p>
                  <span class="time">{formatDate(notification.sentAt)}</span>
                </div>
                {!notification.isRead && <div class="unread-dot"></div>}
              </div>
            ))}
          </div>
        )}

        <style>{`
          .notifications-page {
            min-height: 100vh;
            background: #f8fafc;
            padding-bottom: 2rem;
          }

          .header {
            background: white;
            padding: 1rem;
            display: flex;
            align-items: center;
            gap: 1rem;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            position: sticky;
            top: 0;
            z-index: 10;
          }

          .back-btn, .mark-all-btn {
            background: none;
            border: none;
            padding: 0.5rem;
            cursor: pointer;
            color: #64748b;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .mark-all-btn {
            margin-left: auto;
            color: #9333ea;
          }

          .header h1 {
            font-size: 1.25rem;
            font-weight: 600;
            color: #1e293b;
            margin: 0;
          }

          .loading, .empty {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 3rem 1rem;
            color: #64748b;
          }

          .empty p {
            margin-top: 1rem;
            font-size: 1rem;
          }

          .notifications-list {
            padding: 1rem;
          }

          .notification-item {
            background: white;
            border-radius: 12px;
            padding: 1rem;
            margin-bottom: 0.75rem;
            cursor: pointer;
            position: relative;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            transition: all 0.2s;
          }

          .notification-item:active {
            transform: scale(0.98);
          }

          .notification-item.unread {
            background: #f0f9ff;
            border-left: 3px solid #9333ea;
          }

          .notification-content h3 {
            font-size: 0.95rem;
            font-weight: 600;
            color: #1e293b;
            margin: 0 0 0.5rem 0;
          }

          .notification-content p {
            font-size: 0.85rem;
            color: #64748b;
            margin: 0 0 0.5rem 0;
            line-height: 1.4;
          }

          .notification-content .time {
            font-size: 0.75rem;
            color: #94a3b8;
          }

          .unread-dot {
            position: absolute;
            top: 1rem;
            right: 1rem;
            width: 8px;
            height: 8px;
            background: #9333ea;
            border-radius: 50%;
          }
        `}</style>
      </div>
    );
  }
};
