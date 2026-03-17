import { ref, onMounted, computed } from 'vue';
import api from '../../services/api.js';

export default {
  name: 'AdminClients',
  setup() {
    const clients = ref([]);
    const showCreateModal = ref(false);
    const uploadingLogo = ref(false);
    const newClient = ref({
      organizationName: '',
      email: '',
      password: '',
      confirmPassword: '',
      state: '',
      city: '',
      address: '',
      contactNumber: '',
      alternateContact: '',
      cityBoundary: 'Delhi'
    });
    const mapFile = ref(null);
    const showMapUpdateModal = ref(false);
    const activeClientId = ref(null);
    const mapUpdating = ref(false);
    const searchQuery = ref('');
    const showEditModal = ref(false);
    const editingClient = ref({
      _id: null,
      organizationName: '',
      password: '',
      confirmPassword: ''
    });
    const updatingClient = ref(false);
    const activeDropdownId = ref(null);

    const toggleDropdown = (id) => {
      activeDropdownId.value = activeDropdownId.value === id ? null : id;
    };

    const fetchClients = async () => {
      try {
        const response = await api.getClients();
        clients.value = response.data.clients;
      } catch (error) {
        console.error('Failed to fetch clients:', error);
      }
    };

    const handleLoginAsClient = async (clientId) => {
      try {
        const response = await api.getClientLoginToken(clientId);
        const token = response.data.token;

        // Open client dashboard in new tab with token
        const url = `${window.location.origin}/client/overview?token=${token}`;
        window.open(url, '_blank');
      } catch (error) {
        alert(error.message || 'Failed to login as client');
      }
    };

    const handleApprove = async (clientId) => {
      try {
        await api.approveClient(clientId);
        fetchClients();
      } catch (error) {
        alert(error.message || 'Failed to approve client');
      }
    };

    const handleRevoke = async (clientId) => {
      if (!confirm('Are you sure you want to revoke this client\'s approval?')) return;
      try {
        await api.rejectClient(clientId);
        fetchClients();
      } catch (error) {
        alert(error.message || 'Failed to revoke client approval');
      }
    };

    const handleCreate = async (e) => {
      e.preventDefault();
      if (newClient.value.password !== newClient.value.confirmPassword) {
        alert('Passwords do not match');
        return;
      }
      try {
        const formData = new FormData();
        Object.keys(newClient.value).forEach(key => {
          formData.append(key, newClient.value[key]);
        });
        if (mapFile.value) {
          formData.append('mapFile', mapFile.value);
        }

        await api.createClient(formData);
        showCreateModal.value = false;
        mapFile.value = null;
        newClient.value = {
          organizationName: '',
          email: '',
          password: '',
          confirmPassword: '',
          state: '',
          city: '',
          address: '',
          contactNumber: '',
          alternateContact: '',
          cityBoundary: 'Delhi'
        };
        fetchClients();
      } catch (error) {
        alert(error.message || 'Failed to create client');
      }
    };

    const handleUpdateMap = async (e) => {
      e.preventDefault();
      if (!mapFile.value) return;
      mapUpdating.value = true;
      try {
        const formData = new FormData();
        formData.append('mapFile', mapFile.value);
        
        await api.updateClientMap(activeClientId.value, formData);
        alert('Map data updated and merged successfully!');
        showMapUpdateModal.value = false;
        mapFile.value = null;
      } catch (error) {
        alert(error.message || 'Failed to update map data');
      } finally {
        mapUpdating.value = false;
      }
    };

    const handleDelete = async (clientId) => {
      if (!confirm('Are you sure you want to delete this client? This action cannot be undone.')) return;
      try {
        await api.deleteClient(clientId);
        fetchClients();
      } catch (error) {
        alert(error.message || 'Failed to delete client');
      }
    };

    const openEditModal = (client) => {
      editingClient.value = {
        _id: client._id,
        organizationName: client.organizationName,
        password: '',
        confirmPassword: ''
      };
      showEditModal.value = true;
    };

    const handleUpdateClient = async (e) => {
      e.preventDefault();
      if (editingClient.value.password && editingClient.value.password !== editingClient.value.confirmPassword) {
        alert('Passwords do not match');
        return;
      }

      updatingClient.value = true;
      try {
        const updateData = {
          organizationName: editingClient.value.organizationName
        };
        if (editingClient.value.password) {
          updateData.password = editingClient.value.password;
        }

        await api.updateClient(editingClient.value._id, updateData);
        alert('Client updated successfully!');
        showEditModal.value = false;
        fetchClients();
      } catch (error) {
        alert(error.message || 'Failed to update client');
      } finally {
        updatingClient.value = false;
      }
    };

    const filteredClients = computed(() => {
      if (!searchQuery.value) return clients.value;
      const q = searchQuery.value.toLowerCase();
      return clients.value.filter(c => 
        c.email.toLowerCase().includes(q) || 
        (c.organizationName && c.organizationName.toLowerCase().includes(q))
      );
    });

    onMounted(() => {
      fetchClients();
    });

    return () => (
      <div class="card">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-center mb-4">
            <h1 class="card-title mb-0">Clients</h1>
            <div class="d-flex gap-2">
              <input
                type="text"
                class="form-control"
                placeholder="Search clients..."
                style={{ width: '250px' }}
                value={searchQuery.value}
                onInput={(e) => searchQuery.value = e.target.value}
              />
              <button onClick={() => showCreateModal.value = true} class="btn btn-primary">Add Client</button>
            </div>
          </div>

          <div class="table-responsive">
            <table class="table table-striped table-hover">
              <thead class="table-light">
                <tr>
                  <th>Email</th>
                  <th>Organization Name</th>
                  <th>City Boundary</th>
                  <th>Contact Number</th>
                  <th>Created At</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.value.map(client => (
                  <tr key={client._id} style={{ verticalAlign: 'middle' }}>
                    <td style={{ padding: '25px 15px' }}>{client.email}</td>
                    <td style={{ padding: '25px 15px' }}>{client.organizationName || '-'}</td>
                    <td style={{ padding: '25px 15px' }}>{client.cityBoundary || '-'}</td>
                    <td style={{ padding: '25px 15px' }}>{client.contactNumber || '-'}</td>
                    <td style={{ padding: '25px 15px' }}>{new Date(client.createdAt).toLocaleDateString()}</td>
                    <td style={{ padding: '25px 15px' }}>
                      <span class={`badge ${!client.isActive ? 'bg-danger' :
                          !client.loginApproved ? 'bg-warning text-dark' :
                            'bg-success'
                        }`}>
                        {!client.isActive ? 'Inactive' : !client.loginApproved ? 'Pending ⏳' : 'Active ✓'}
                      </span>
                    </td>
                    <td class="text-end">
                      <div class="d-flex justify-content-end align-items-center gap-2">
                        {!client.loginApproved ? (
                          <button
                            onClick={() => handleApprove(client._id)}
                            class="btn btn-success btn-sm"
                          >
                            ✓ Approve
                          </button>
                        ) : (
                          <button
                            onClick={() => handleLoginAsClient(client._id)}
                            class="btn btn-primary btn-sm"
                          >
                            🔑 Login
                          </button>
                        )}

                        <div class="dropdown" style={{ position: 'relative' }}>
                          <button 
                            class="btn btn-outline-secondary btn-sm" 
                            type="button" 
                            onClick={(e) => { e.stopPropagation(); toggleDropdown(client._id); }}
                            style={{ width: '32px', height: '32px', padding: '0', borderRadius: '50%', border: 'none' }}
                          >
                            ⋮
                          </button>
                          {activeDropdownId.value === client._id && (
                            <ul class="dropdown-menu show" style={{ position: 'absolute', right: 0, top: '100%', display: 'block', zIndex: 1000, minWidth: '160px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
                              {client.loginApproved && (
                                <li>
                                  <button class="dropdown-item text-warning" onClick={() => { handleRevoke(client._id); activeDropdownId.value = null; }}>
                                    🚫 Revoke
                                  </button>
                                </li>
                              )}
                              <li>
                                <button class="dropdown-item text-info" onClick={() => { openEditModal(client); activeDropdownId.value = null; }}>
                                  📝 Edit Client
                                </button>
                              </li>
                              <li>
                                <button class="dropdown-item text-info" onClick={() => { activeClientId.value = client._id; showMapUpdateModal.value = true; activeDropdownId.value = null; }}>
                                  🗺️ Update Map
                                </button>
                              </li>
                              <li><hr class="dropdown-divider" /></li>
                              <li>
                                <button class="dropdown-item text-danger" onClick={() => { handleDelete(client._id); activeDropdownId.value = null; }}>
                                  🗑️ Delete
                                </button>
                              </li>
                            </ul>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {showCreateModal.value && (
            <div
              class="modal show d-block"
              style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}
              onClick={() => showCreateModal.value = false}
            >
              <div class="modal-dialog modal-lg" onClick={(e) => e.stopPropagation()} style={{ maxHeight: '90vh', margin: '1.75rem auto' }}>
                <div class="modal-content" style={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
                  <div class="modal-header" style={{ flexShrink: 0 }}>
                    <h5 class="modal-title">Add Police Client</h5>
                    <button type="button" class="btn-close" onClick={() => showCreateModal.value = false}></button>
                  </div>
                  <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                    <div class="modal-body" style={{ overflowY: 'auto', flex: 1 }}>

                      <h6 class="mb-3 fw-bold">Police HQ Information</h6>

                      {/* Row 1: Organization Name + Email */}
                      <div class="row">
                        <div class="col-md-6 mb-3">
                          <label class="form-label">Organization Name <span class="text-danger">*</span></label>
                          <input
                            value={newClient.value.organizationName}
                            onInput={(e) => newClient.value.organizationName = e.target.value}
                            type="text"
                            class="form-control"
                            required
                            placeholder="Enter organization name"
                          />
                        </div>
                        <div class="col-md-6 mb-3">
                          <label class="form-label">Official Email <span class="text-danger">*</span></label>
                          <input
                            value={newClient.value.email}
                            onInput={(e) => newClient.value.email = e.target.value}
                            type="email"
                            class="form-control"
                            required
                            placeholder="Enter official email"
                          />
                        </div>
                      </div>

                      {/* Row 2: State + City/Jurisdiction */}
                      <div class="row">
                        <div class="col-md-6 mb-3">
                          <label class="form-label">State <span class="text-danger">*</span></label>
                          <input
                            value={newClient.value.state}
                            onInput={(e) => newClient.value.state = e.target.value}
                            type="text"
                            class="form-control"
                            required
                            placeholder="Enter state"
                          />
                        </div>
                        <div class="col-md-6 mb-3">
                          <label class="form-label">City / Jurisdiction <span class="text-danger">*</span></label>
                          <input
                            value={newClient.value.city}
                            onInput={(e) => newClient.value.city = e.target.value}
                            type="text"
                            class="form-control"
                            required
                            placeholder="Enter city / jurisdiction"
                          />
                        </div>
                      </div>

                      {/* Row 3: Headquarters Address */}
                      <div class="mb-3">
                        <label class="form-label">Headquarters Address <span class="text-danger">*</span></label>
                        <textarea
                          value={newClient.value.address}
                          onInput={(e) => newClient.value.address = e.target.value}
                          class="form-control"
                          rows="2"
                          required
                          placeholder="Enter headquarters address"
                        />
                      </div>

                      {/* Row 4: Contact Numbers */}
                      <div class="row">
                        <div class="col-md-6 mb-3">
                          <label class="form-label">Official Contact Number <span class="text-danger">*</span></label>
                          <input
                            value={newClient.value.contactNumber}
                            onInput={(e) => newClient.value.contactNumber = e.target.value}
                            type="text"
                            class="form-control"
                            required
                            placeholder="Enter contact number"
                          />
                        </div>
                        <div class="col-md-6 mb-3">
                          <label class="form-label">Alternate Contact Number</label>
                          <input
                            value={newClient.value.alternateContact}
                            onInput={(e) => newClient.value.alternateContact = e.target.value}
                            type="text"
                            class="form-control"
                            placeholder="Enter alternate contact number"
                          />
                        </div>
                      </div>

                      {/* Row 5: City Boundary */}
                      <div class="mb-3">
                        <label class="form-label">Select City Boundary <span class="text-danger">*</span></label>
                        <select
                          value={newClient.value.cityBoundary}
                          onInput={(e) => newClient.value.cityBoundary = e.target.value}
                          class="form-select"
                          required
                        >
                          <option value="Delhi">Delhi</option>
                          <option value="Bangalore">Bangalore</option>
                          <option value="Noida">Noida</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>

                      <div class="mb-3">
                        <label class="form-label">Upload Map Data (KML / GeoJSON)</label>
                        <input
                          type="file"
                          class="form-control"
                          accept=".kml,.geojson,.json"
                          onChange={(e) => mapFile.value = e.target.files[0]}
                        />
                        <div class="form-text">Choose a KML or GeoJSON file to automatically create areas and cameras.</div>
                      </div>

                      <hr class="my-3" />

                      <h6 class="mb-3 fw-bold">Account Security</h6>

                      {/* Row 6: Password */}
                      <div class="row">
                        <div class="col-md-6 mb-3">
                          <label class="form-label">Password <span class="text-danger">*</span></label>
                          <input
                            value={newClient.value.password}
                            onInput={(e) => newClient.value.password = e.target.value}
                            type="password"
                            class="form-control"
                            required
                            placeholder="Enter password"
                          />
                        </div>
                        <div class="col-md-6 mb-3">
                          <label class="form-label">Confirm Password <span class="text-danger">*</span></label>
                          <input
                            value={newClient.value.confirmPassword}
                            onInput={(e) => newClient.value.confirmPassword = e.target.value}
                            type="password"
                            class="form-control"
                            required
                            placeholder="Confirm password"
                          />
                        </div>
                      </div>

                    </div>
                    <div class="modal-footer" style={{ flexShrink: 0 }}>
                      <button type="button" class="btn btn-secondary" onClick={() => showCreateModal.value = false}>Cancel</button>
                      <button type="submit" class="btn btn-primary">Create Client</button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

          {showMapUpdateModal.value && (
            <div
              class="modal show d-block"
              style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}
              onClick={() => { showMapUpdateModal.value = false; mapFile.value = null; }}
            >
              <div class="modal-dialog" onClick={(e) => e.stopPropagation()}>
                <div class="modal-content">
                  <div class="modal-header">
                    <h5 class="modal-title">Update / Merge Map Data</h5>
                    <button type="button" class="btn-close" onClick={() => { showMapUpdateModal.value = false; mapFile.value = null; }}></button>
                  </div>
                  <form onSubmit={handleUpdateMap}>
                    <div class="modal-body">
                      <p class="text-muted small mb-3">Upload a new KML or GeoJSON file. New areas will be added and merged with existing ones. Duplicate areas will be skipped.</p>
                      <div class="mb-3">
                        <label class="form-label">Select File</label>
                        <input
                          type="file"
                          class="form-control"
                          accept=".kml,.geojson,.json"
                          onChange={(e) => mapFile.value = e.target.files[0]}
                          required
                        />
                      </div>
                    </div>
                    <div class="modal-footer">
                      <button type="button" class="btn btn-secondary" onClick={() => { showMapUpdateModal.value = false; mapFile.value = null; }}>Cancel</button>
                      <button type="submit" class="btn btn-primary" disabled={mapUpdating.value}>
                        {mapUpdating.value ? 'Processing...' : 'Upload & Merge'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

          {showEditModal.value && (
            <div
              class="modal show d-block"
              style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}
              onClick={() => showEditModal.value = false}
            >
              <div class="modal-dialog" onClick={(e) => e.stopPropagation()}>
                <div class="modal-content">
                  <div class="modal-header">
                    <h5 class="modal-title">📝 Edit Client Details</h5>
                    <button type="button" class="btn-close" onClick={() => showEditModal.value = false}></button>
                  </div>
                  <form onSubmit={handleUpdateClient}>
                    <div class="modal-body">
                      <div class="mb-3">
                        <label class="form-label">Organization Name</label>
                        <input
                          type="text"
                          class="form-control"
                          value={editingClient.value.organizationName}
                          onInput={(e) => editingClient.value.organizationName = e.target.value}
                          required
                        />
                      </div>
                      
                      <hr class="my-4" />
                      <h6 class="fw-bold mb-2">🔐 Reset Password</h6>
                      <p class="text-muted small mb-3">Leave blank if you don't want to change the password.</p>
                      
                      <div class="mb-3">
                        <label class="form-label">New Password</label>
                        <input
                          type="password"
                          class="form-control"
                          value={editingClient.value.password}
                          onInput={(e) => editingClient.value.password = e.target.value}
                          placeholder="Enter new password"
                        />
                      </div>
                      <div class="mb-3">
                        <label class="form-label">Confirm New Password</label>
                        <input
                          type="password"
                          class="form-control"
                          value={editingClient.value.confirmPassword}
                          onInput={(e) => editingClient.value.confirmPassword = e.target.value}
                          placeholder="Confirm new password"
                        />
                      </div>
                    </div>
                    <div class="modal-footer">
                      <button type="button" class="btn btn-secondary" onClick={() => showEditModal.value = false}>Cancel</button>
                      <button type="submit" class="btn btn-primary" disabled={updatingClient.value}>
                        {updatingClient.value ? 'Saving...' : 'Update Client'}
                      </button>
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
