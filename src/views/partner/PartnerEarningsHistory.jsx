import { ref, onMounted } from 'vue';
import api from '../../services/api.js';

export default {
  name: 'PartnerEarningsHistory',
  setup() {
    const loading = ref(false);
    const error = ref('');
    const items = ref([]);
    const page = ref(1);
    const limit = ref(20);
    const totalPages = ref(1);

    const loadHistory = async () => {
      try {
        loading.value = true;
        error.value = '';
        const res = await api.getPartnerChatCreditHistory({ page: page.value, limit: limit.value });
        if (res?.success) {
          items.value = res.data || [];
          totalPages.value = res.meta?.totalPages || 1;
        } else {
          error.value = res?.message || 'Failed to load earnings history';
        }
      } catch (e) {
        error.value = e?.response?.data?.message || e.message || 'Failed to load earnings history';
      } finally {
        loading.value = false;
      }
    };

    const nextPage = () => {
      if (page.value < totalPages.value) {
        page.value += 1;
        loadHistory();
      }
    };

    const prevPage = () => {
      if (page.value > 1) {
        page.value -= 1;
        loadHistory();
      }
    };

    onMounted(() => {
      loadHistory();
    });

    const formatDateTime = (value) => {
      if (!value) return '';
      return new Date(value).toLocaleString();
    };

    return () => (
      <div style="padding: 24px;">
        <h1 style="font-size: 22px; font-weight: 700; color: #111827; margin: 0 0 4px 0;">
          Earnings History
        </h1>
        <p style="color: #6b7280; margin: 0 0 20px 0; font-size: 14px;">
          Credits you earned from completed chat sessions.
        </p>

        {error.value && (
          <div class="alert alert-danger py-2" role="alert">
            {error.value}
          </div>
        )}

        {loading.value ? (
          <div style="text-align: center; padding: 40px;">
            <div class="spinner-border text-primary" role="status">
              <span class="visually-hidden">Loading...</span>
            </div>
          </div>
        ) : items.value.length === 0 ? (
          <div style="text-align: center; padding: 40px; color: #6b7280;">
            <p style="margin: 0 0 4px 0;">No earnings history yet.</p>
            <p style="margin: 0; font-size: 13px;">Complete some chats to see your earnings here.</p>
          </div>
        ) : (
          <div style="background-color: white; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border: 1px solid #e5e7eb;">
            <div style="padding: 16px 20px; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 14px; font-weight: 600; color: #374151;">Recent Earnings</span>
              <span style="font-size: 12px; color: #9ca3af;">Page {page.value} of {totalPages.value}</span>
            </div>
            <div style="padding: 8px 0;">
              {items.value.map((entry) => (
                <div key={entry.conversationId} style="display: flex; justify-content: space-between; align-items: flex-start; padding: 12px 20px; border-bottom: 1px solid #f3f4f6;">
                  <div>
                    <p style="margin: 0; font-weight: 500; color: #111827; font-size: 14px;">
                      {entry.user?.profile?.name || entry.user?.email || 'User'}
                    </p>
                    <p style="margin: '4px 0 0'; color: #6b7280; font-size: 12px;">
                      {formatDateTime(entry.createdAt)}
                    </p>
                    <p style="margin: '2px 0 0'; color: #9ca3af; font-size: 12px;">
                      {entry.billableMinutes} min • Conversation: {entry.conversationId}
                    </p>
                  </div>
                  <div style="text-align: right;">
                    <p style="margin: 0; font-weight: 600; color: #16a34a; font-size: 14px;">
                      +{entry.creditsEarned} cr
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div style="padding: 12px 16px; border-top: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center;">
              <button
                class="btn btn-sm btn-outline-secondary"
                disabled={page.value <= 1}
                onClick={prevPage}
              >
                Previous
              </button>
              <span style="font-size: 12px; color: #9ca3af;">Page {page.value} of {totalPages.value}</span>
              <button
                class="btn btn-sm btn-outline-secondary"
                disabled={page.value >= totalPages.value}
                onClick={nextPage}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }
};

