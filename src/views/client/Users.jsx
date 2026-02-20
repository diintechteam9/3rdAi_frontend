// frontend/src/views/client/Users.jsx

import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import api from '../../services/api.js';

export default {
  name: 'ClientUsers',
  setup() {
    const router = useRouter();
    const users = ref([]);
    const showCreateModal = ref(false);
    const newUser = ref({ 
      email: '', 
      password: '', 
      profile: {
        name: '',
        dob: '',
        timeOfBirth: '',
        placeOfBirth: '',
        latitude: null,
        longitude: null,
        gowthra: ''
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
            dob: '', 
            timeOfBirth: '',
            placeOfBirth: '',
            latitude: null,
            longitude: null,
            gowthra: ''
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

    const viewUserKundali = (user) => {
      router.push(`/client/users/${user._id}/kundali`);
    };

    const closeDetailsModal = () => {
      // Not needed anymore - using separate page
    };

    const updateProfile = (field, value) => {
      // Handle numeric fields properly
      if (field === 'latitude' || field === 'longitude') {
        newUser.value.profile[field] = value && !isNaN(value) ? parseFloat(value) : null;
      } else {
        newUser.value.profile[field] = value;
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
                  <th>DOB</th>
                  <th>Place of Birth</th>
                  <th>Credits</th>
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
                    <td>{user.profile?.dob ? new Date(user.profile.dob).toLocaleDateString() : '-'}</td>
                    <td>{user.profile?.placeOfBirth || '-'}</td>
                    <td>{user.credits ?? 0}</td>
                    <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                    <td>
                      <span class={`badge ${user.isActive ? 'bg-success' : 'bg-danger'}`}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <button 
                        onClick={() => viewUserKundali(user)} 
                        class="btn btn-info btn-sm me-2"
                      >
                        View Kundali
                      </button>
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
                        <div class="col-md-6 mb-3">
                          <label class="form-label">Email *</label>
                          <input
                            value={newUser.value.email}
                            onInput={(e) => newUser.value.email = e.target.value}
                            type="email"
                            class="form-control"
                            required
                          />
                        </div>
                        <div class="col-md-6 mb-3">
                          <label class="form-label">Password *</label>
                          <input
                            value={newUser.value.password}
                            onInput={(e) => newUser.value.password = e.target.value}
                            type="password"
                            class="form-control"
                            required
                            minLength={6}
                          />
                        </div>
                        <div class="col-md-6 mb-3">
                          <label class="form-label">Name</label>
                          <input
                            value={newUser.value.profile.name}
                            onInput={(e) => updateProfile('name', e.target.value)}
                            type="text"
                            class="form-control"
                          />
                        </div>
                        <div class="col-md-6 mb-3">
                          <label class="form-label">Date of Birth</label>
                          <input
                            value={newUser.value.profile.dob}
                            onInput={(e) => updateProfile('dob', e.target.value)}
                            type="date"
                            class="form-control"
                          />
                        </div>
                        <div class="col-md-6 mb-3">
                          <label class="form-label">Time of Birth (HH:MM)</label>
                          <input
                            value={newUser.value.profile.timeOfBirth}
                            onInput={(e) => updateProfile('timeOfBirth', e.target.value)}
                            type="time"
                            class="form-control"
                          />
                        </div>
                        <div class="col-md-6 mb-3">
                          <label class="form-label">Place of Birth</label>
                          <input
                            value={newUser.value.profile.placeOfBirth}
                            onInput={(e) => updateProfile('placeOfBirth', e.target.value)}
                            type="text"
                            class="form-control"
                          />
                        </div>
                        <div class="col-md-6 mb-3">
                          <label class="form-label">Latitude</label>
                          <input
                            value={newUser.value.profile.latitude || ''}
                            onInput={(e) => updateProfile('latitude', e.target.value)}
                            type="number"
                            step="0.0001"
                            class="form-control"
                            placeholder="e.g., 19.20"
                          />
                        </div>
                        <div class="col-md-6 mb-3">
                          <label class="form-label">Longitude</label>
                          <input
                            value={newUser.value.profile.longitude || ''}
                            onInput={(e) => updateProfile('longitude', e.target.value)}
                            type="number"
                            step="0.0001"
                            class="form-control"
                            placeholder="e.g., 25.2"
                          />
                        </div>
                        <div class="col-md-12 mb-3">
                          <label class="form-label">Gowthra</label>
                          <input
                            value={newUser.value.profile.gowthra}
                            onInput={(e) => updateProfile('gowthra', e.target.value)}
                            type="text"
                            class="form-control"
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