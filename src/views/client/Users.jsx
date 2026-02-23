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
        policeStation: '',
        serviceId: ''
      }
    });

    const fetchUsers = async () => {
      try {
        const response = await api.getClientUsers();
        users.value = response.data.users;
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
            policeStation: '',
            serviceId: ''
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
                  <th>Police Station</th>
                  <th>Service ID</th>
                  <th>Created At</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.value.map(user => (
                  <tr key={user._id}>
                    <td>{user.email}</td>
                    <td>{user.profile?.name || '-'}</td>
                    <td>{user.profile?.policeStation || '-'}</td>
                    <td>{user.profile?.serviceId || '-'}</td>
                    <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                    <td>
                      <span class={`badge ${user.isActive ? 'bg-success' : 'bg-danger'}`}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => handleDelete(user._id)}
                        class="btn btn-danger btn-sm"
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

                        {/* Left: Police Station | Right: Password (directly below Email) */}
                        <div class="col-md-6 mb-3">
                          <label class="form-label">Police Station</label>
                          <input
                            value={newUser.value.profile.policeStation}
                            onInput={(e) => updateProfile('policeStation', e.target.value)}
                            type="text"
                            class="form-control"
                            placeholder="e.g., Sector 5 PS"
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

                        {/* Service ID — full width */}
                        <div class="col-md-6 mb-3">
                          <label class="form-label">Service ID</label>
                          <input
                            value={newUser.value.profile.serviceId}
                            onInput={(e) => updateProfile('serviceId', e.target.value)}
                            type="text"
                            class="form-control"
                            placeholder="e.g., SVC-2024-001"
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