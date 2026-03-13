// frontend/src/views/client/Users.jsx

import { ref, onMounted } from 'vue';
import api from '../../services/api.js';

export default {
  name: 'ClientUsers',
  setup() {
    const users = ref([]);
    const showCreateModal = ref(false);
    const newUser = ref({
      email: '',
      password: '',
      profile: {
        name: '',
        address: '',
        currentLocation: ''
      }
    });

    const fetchUsers = async () => {
      try {
        const response = await api.getClientUsers();
        const allUsers = response.data.users || [];
        // Show only fully completed accounts
        users.value = allUsers.filter(u =>
          (u.registrationStep === 3 || u.registrationComplete === true) &&
          (u.emailVerified === true) &&
          (u.mobileVerified === true) &&
          (u.isActive !== false) &&
          (u.loginApproved !== false)
        );
      } catch (error) {
        console.error('Failed to fetch users:', error);
      }
    };

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
          profile: {
            name: '',
            address: '',
            currentLocation: ''
          }
        };
        fetchUsers();
      } catch (error) {
        alert(error.message || 'Failed to create user');
      }
    };

    const handleDelete = async (id) => {
      if (confirm('Are you sure you want to delete this user?')) {
        try {
          await api.deleteClientUser(id);
          fetchUsers();
        } catch (error) {
          alert(error.message || 'Failed to delete user');
        }
      }
    };

    const updateProfile = (field, value) => {
      newUser.value.profile[field] = value;
    };

    const handleApproval = async (id, status) => {
      try {
        await api.updateClientUser(id, { approvalStatus: status });
        fetchUsers();
      } catch (error) {
        alert(error.message || `Failed to update user status`);
      }
    };

    onMounted(() => {
      fetchUsers();
    });

    return () => (
      <div class="card">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-center mb-4">
            <h1 class="card-title mb-0">Users</h1>
            <button onClick={() => showCreateModal.value = true} class="btn btn-primary">Add User</button>
          </div>

          <div class="table-responsive">
            <table class="table table-striped table-hover">
              <thead class="table-light">
                <tr>
                  <th>Email</th>
                  <th>Name</th>
                  <th>Address</th>
                  <th>Current Location</th>
                  <th>Created At</th>
                  <th>Status</th>
                  <th>Approval</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.value.map(user => (
                  <tr key={user._id}>
                    <td>{user.email}</td>
                    <td>{user.profile?.name || '-'}</td>
                    <td>{user.profile?.address || '-'}</td>
                    <td>{user.profile?.currentLocation || '-'}</td>
                    <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                    <td>
                      <span class={`badge ${user.isActive ? 'bg-success' : 'bg-danger'}`}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <span class={`badge ${user.approvalStatus === 'approved' ? 'bg-success' : user.approvalStatus === 'rejected' ? 'bg-danger' : 'bg-warning'}`}>
                        {user.approvalStatus || 'pending'}
                      </span>
                    </td>
                    <td>
                      {(!user.approvalStatus || user.approvalStatus === 'pending') && (
                        <>
                          <button onClick={() => handleApproval(user._id, 'approved')} class="btn btn-success btn-sm me-2 mb-1">Approve</button>
                          <button onClick={() => handleApproval(user._id, 'rejected')} class="btn btn-warning btn-sm me-2 mb-1">Reject</button>
                        </>
                      )}
                      <button
                        onClick={() => handleDelete(user._id)}
                        class="btn btn-danger btn-sm mb-1"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Create User Modal */}
          {showCreateModal.value && (
            <div
              class="modal show d-block"
              style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
              onClick={() => showCreateModal.value = false}
            >
              <div class="modal-dialog modal-dialog-scrollable modal-lg" onClick={(e) => e.stopPropagation()}>
                <div class="modal-content">
                  <div class="modal-header">
                    <h5 class="modal-title">Create User</h5>
                    <button type="button" class="btn-close" onClick={() => showCreateModal.value = false}></button>
                  </div>
                  <form onSubmit={handleCreate}>
                    <div class="modal-body">
                      <div class="row">
                        {/* Left: Name | Right: Email */}
                        <div class="col-md-6 mb-3">
                          <label class="form-label">Name *</label>
                          <input
                            value={newUser.value.profile.name}
                            onInput={(e) => updateProfile('name', e.target.value)}
                            type="text"
                            class="form-control"
                            placeholder="Full Name"
                            required
                          />
                        </div>
                        <div class="col-md-6 mb-3">
                          <label class="form-label">Email *</label>
                          <input
                            value={newUser.value.email}
                            onInput={(e) => newUser.value.email = e.target.value}
                            type="email"
                            class="form-control"
                            placeholder="user@gmail.com"
                            required
                          />
                        </div>

                        {/* Left: Address | Right: Password (directly below Email) */}
                        <div class="col-md-6 mb-3">
                          <label class="form-label">Address</label>
                          <input
                            value={newUser.value.profile.address}
                            onInput={(e) => updateProfile('address', e.target.value)}
                            type="text"
                            class="form-control"
                            placeholder="Enter full address"
                          />
                        </div>
                        <div class="col-md-6 mb-3">
                          <label class="form-label">Password *</label>
                          <input
                            value={newUser.value.password}
                            onInput={(e) => newUser.value.password = e.target.value}
                            type="password"
                            class="form-control"
                            placeholder="Min 6 characters"
                            required
                            minLength={6}
                          />
                        </div>

                        {/* Current Location — full width */}
                        <div class="col-md-6 mb-3">
                          <label class="form-label">Current Location</label>
                          <input
                            value={newUser.value.profile.currentLocation}
                            onInput={(e) => updateProfile('currentLocation', e.target.value)}
                            type="text"
                            class="form-control"
                            placeholder="Enter current city/location"
                          />
                        </div>
                      </div>
                    </div>
                    <div class="modal-footer">
                      <button type="button" class="btn btn-secondary" onClick={() => showCreateModal.value = false}>Cancel</button>
                      <button type="submit" class="btn btn-primary">Create</button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
};
