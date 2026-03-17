// frontend/src/views/client/Users.jsx

import { ref, onMounted, computed } from 'vue';
import api from '../../services/api.js';

export default {
  name: 'ClientUsers',
  setup() {
    const users = ref([]);
    const loading = ref(false);
    const activeTab = ref('all'); // pending | approved | all
    const showCreateModal = ref(false);
    const detailsModal = ref({ show: false, user: null });
    const actionLoading = ref(null);
    const toast = ref({ show: false, msg: '', type: 'success' });

    const newUser = ref({
      email: '',
      password: '',
      profile: {
        name: '',
        address: '',
        currentLocation: ''
      }
    });

    const showToast = (msg, type = 'success') => {
      toast.value = { show: true, msg, type };
      setTimeout(() => toast.value.show = false, 3000);
    };

    const fetchUsers = async () => {
      loading.value = true;
      try {
        const response = await api.getClientUsers();
        // We show users based on registration step or status
        users.value = response.data.users || [];
      } catch (error) {
        console.error('Failed to fetch users:', error);
      } finally {
        loading.value = false;
      }
    };

    const displayUsers = computed(() => {
      if (activeTab.value === 'approved') return users.value.filter(u => u.approvalStatus === 'approved');
      if (activeTab.value === 'pending') return users.value.filter(u => !u.approvalStatus || u.approvalStatus === 'pending');
      return users.value;
    });

    const pendingCount = computed(() => users.value.filter(u => !u.approvalStatus || u.approvalStatus === 'pending').length);

    const handleCreate = async (e) => {
      e.preventDefault();
      try {
        await api.createClientUser(
          newUser.value.email,
          newUser.value.password,
          newUser.value.profile
        );
        showCreateModal.value = false;
        newUser.value = {
          email: '',
          password: '',
          profile: { name: '', address: '', currentLocation: '' }
        };
        showToast('User created successfully');
        fetchUsers();
      } catch (error) {
        showToast(error.message || 'Failed to create user', 'error');
      }
    };

    const handleDelete = async (id) => {
      if (!confirm('Are you sure you want to delete this user?')) return;
      try {
        await api.deleteClientUser(id);
        showToast('User deleted successfully');
        fetchUsers();
      } catch (error) {
        showToast(error.message || 'Failed to delete user', 'error');
      }
    };

    const handleApproval = async (id, status) => {
      actionLoading.value = id;
      try {
        await api.updateClientUser(id, { approvalStatus: status });
        showToast(`User ${status} successfully`);
        fetchUsers();
      } catch (error) {
        showToast(`Failed to update user status`, 'error');
      } finally {
        actionLoading.value = null;
      }
    };

    const updateProfile = (field, value) => {
      newUser.value.profile[field] = value;
    };

    const statusBadge = (status) => {
      const map = {
        pending: { color: '#f59e0b', bg: '#fef3c7', label: '⏳ Pending' },
        approved: { color: '#10b981', bg: '#d1fae5', label: '✅ Approved' },
        rejected: { color: '#ef4444', bg: '#fee2e2', label: '❌ Rejected' }
      };
      const s = map[status] || map.pending;
      return (
        <span style={{ padding: '4px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: '600', color: s.color, background: s.bg, textTransform: 'uppercase' }}>
          {s.label}
        </span>
      );
    };

    onMounted(fetchUsers);

    return () => (
      <div style={{ padding: '24px 24px 80px', fontFamily: "'Inter', sans-serif" }}>
        {/* Toast */}
        {toast.value.show && (
          <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 9999, padding: '12px 20px', borderRadius: '10px', background: toast.value.type === 'success' ? '#10b981' : '#ef4444', color: 'white', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontWeight: '600' }}>
            {toast.value.msg}
          </div>
        )}

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#111827', margin: '0 0 4px' }}>Citizens</h1>
            <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>Manage your citizen accounts and approvals</p>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {pendingCount.value > 0 && (
              <span style={{ background: '#fef3c7', color: '#b45309', padding: '6px 14px', borderRadius: '999px', fontSize: '13px', fontWeight: '600', border: '1px solid #f59e0b' }}>
                {pendingCount.value} Pending
              </span>
            )}
            <button onClick={() => showCreateModal.value = true} style={{ background: '#6366f1', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '10px', fontWeight: '600', cursor: 'pointer', boxShadow: '0 2px 4px rgba(99,102,241,0.2)' }}>
              + Add Citizen
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px', background: '#f3f4f6', padding: '4px', borderRadius: '10px', marginBottom: '20px', width: 'fit-content' }}>
          {[
            { id: 'pending', label: '⏳ Pending' },
            { id: 'approved', label: '✅ Approved' },
            { id: 'all', label: '👥 All Citizens' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => activeTab.value = tab.id}
              style={{
                padding: '8px 18px', borderRadius: '7px', border: 'none', fontSize: '13px', fontWeight: '500', cursor: 'pointer',
                background: activeTab.value === tab.id ? 'white' : 'transparent',
                color: activeTab.value === tab.id ? '#111827' : '#6b7280',
                boxShadow: activeTab.value === tab.id ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading.value ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#6b7280' }}>Loading users...</div>
        ) : displayUsers.value.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', background: 'white', borderRadius: '16px', border: '1px dashed #cbd5e1' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>👥</div>
            <h3 style={{ margin: '0 0 8px', color: '#1e293b' }}>No Citizens Found</h3>
            <p style={{ color: '#64748b', margin: 0 }}>There are no citizens matching your current filter.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {displayUsers.value.map(user => (
              <div
                key={user._id}
                onClick={() => detailsModal.value = { show: true, user }}
                style={{
                  background: 'white', borderRadius: '14px', border: '1px solid #e5e7eb', padding: '16px 20px',
                  display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer', transition: 'box-shadow 0.2s'
                }}
                onMouseOver={e => e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.05)'}
                onMouseOut={e => e.currentTarget.style.boxShadow = 'none'}
              >
                {/* Avatar */}
                <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: 'linear-gradient(135deg, #6366f1, #a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '700', fontSize: '18px', flexShrink: 0 }}>
                  {(user.profile?.name || user.email || 'U')[0].toUpperCase()}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '2px' }}>
                    <span style={{ fontWeight: '600', color: '#111827', fontSize: '15px' }}>{user.profile?.name || 'Incomplete Profile'}</span>
                    {statusBadge(user.approvalStatus || 'pending')}
                  </div>
                  <div style={{ display: 'flex', gap: '16px', color: '#6b7280', fontSize: '12px', flexWrap: 'wrap' }}>
                    <span>📧 {user.email}</span>
                    {user.profile?.address && <span>📍 {user.profile.address}</span>}
                    <span>📅 {new Date(user.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                {(!user.approvalStatus || user.approvalStatus === 'pending') && (
                  <div style={{ display: 'flex', gap: '8px' }} onClick={e => e.stopPropagation()}>
                    <button onClick={() => handleApproval(user._id, 'approved')} style={{ background: '#10b981', color: 'white', border: 'none', padding: '6px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>Approve</button>
                    <button onClick={() => handleApproval(user._id, 'rejected')} style={{ background: 'white', color: '#ef4444', border: '1px solid #fee2e2', padding: '6px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>Reject</button>
                  </div>
                )}

                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(user._id); }}
                  style={{ background: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer', padding: '4px' }}
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Details Modal */}
        {detailsModal.value.show && detailsModal.value.user && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={() => detailsModal.value.show = false}>
            <div style={{ background: 'white', borderRadius: '20px', width: '100%', maxWidth: '500px', padding: '24px', position: 'relative' }} onClick={e => e.stopPropagation()}>
              <h2 style={{ margin: '0 0 20px', fontSize: '20px', color: '#1e293b' }}>Citizen Details</h2>
              <div style={{ display: 'grid', gap: '16px' }}>
                {[
                  { label: 'Name', value: detailsModal.value.user.profile?.name },
                  { label: 'Email', value: detailsModal.value.user.email },
                  { label: 'Address', value: detailsModal.value.user.profile?.address },
                  { label: 'Current Location', value: detailsModal.value.user.profile?.currentLocation },
                  { label: 'Created At', value: new Date(detailsModal.value.user.createdAt).toLocaleString() },
                  { label: 'Status', value: detailsModal.value.user.approvalStatus?.toUpperCase() || 'PENDING' }
                ].map(item => (
                  <div key={item.label}>
                    <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '2px' }}>{item.label}</div>
                    <div style={{ fontSize: '14px', color: '#1e293b', fontWeight: '500' }}>{item.value || '—'}</div>
                  </div>
                ))}
              </div>
              <button onClick={() => detailsModal.value.show = false} style={{ marginTop: '24px', width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc', fontWeight: '600', cursor: 'pointer' }}>Close</button>
            </div>
          </div>
        )}

        {/* Create Modal */}
        {showCreateModal.value && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={() => showCreateModal.value = false}>
            <div style={{ background: 'white', borderRadius: '20px', width: '100%', maxWidth: '600px', padding: '24px' }} onClick={e => e.stopPropagation()}>
              <h2 style={{ margin: '0 0 20px', fontSize: '20px', color: '#1e293b' }}>Create New Citizen</h2>
              <form onSubmit={handleCreate}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ fontSize: '13px', color: '#64748b', display: 'block', marginBottom: '4px' }}>Name *</label>
                    <input value={newUser.value.profile.name} onInput={e => updateProfile('name', e.target.value)} type="text" placeholder="Full Name" required style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '13px', color: '#64748b', display: 'block', marginBottom: '4px' }}>Email *</label>
                    <input value={newUser.value.email} onInput={e => newUser.value.email = e.target.value} type="email" placeholder="email@example.com" required style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '13px', color: '#64748b', display: 'block', marginBottom: '4px' }}>Address</label>
                    <input value={newUser.value.profile.address} onInput={e => updateProfile('address', e.target.value)} type="text" placeholder="Street, City" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '13px', color: '#64748b', display: 'block', marginBottom: '4px' }}>Password *</label>
                    <input value={newUser.value.password} onInput={e => newUser.value.password = e.target.value} type="password" placeholder="Min 6 chars" required minLength={6} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                  <button type="button" onClick={() => showCreateModal.value = false} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', fontWeight: '600', cursor: 'pointer' }}>Cancel</button>
                  <button type="submit" style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: '#6366f1', color: 'white', fontWeight: '600', cursor: 'pointer' }}>Create Citizen</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }
};
