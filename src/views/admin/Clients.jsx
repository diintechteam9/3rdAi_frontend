import { ref, onMounted } from 'vue';
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
        await api.createClient(newClient.value);
        showCreateModal.value = false;
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

    onMounted(() => {
      fetchClients();
    });

    return () => (
      <div class="card">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-center mb-4">
            <h1 class="card-title mb-0">Clients</h1>
            <button onClick={() => showCreateModal.value = true} class="btn btn-primary">Add Client</button>
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
                {clients.value.map(client => (
                  <tr key={client._id}>
                    <td>{client.email}</td>
                    <td>{client.organizationName || '-'}</td>
                    <td>{client.cityBoundary || '-'}</td>
                    <td>{client.contactNumber || '-'}</td>
                    <td>{new Date(client.createdAt).toLocaleDateString()}</td>
                    <td>
                      <span class={`badge ${!client.isActive ? 'bg-danger' :
                          !client.loginApproved ? 'bg-warning text-dark' :
                            'bg-success'
                        }`}>
                        {!client.isActive ? 'Inactive' : !client.loginApproved ? 'Pending ⏳' : 'Active ✓'}
                      </span>
                    </td>
                    <td>
                      {!client.loginApproved ? (
                        <button
                          onClick={() => handleApprove(client._id)}
                          class="btn btn-success btn-sm me-2"
                        >
                          ✓ Approve
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => handleLoginAsClient(client._id)}
                            class="btn btn-primary btn-sm me-2"
                          >
                            Login
                          </button>
                          <button
                            onClick={() => handleRevoke(client._id)}
                            class="btn btn-warning btn-sm me-2"
                          >
                            Revoke
                          </button>
                        </>
                      )}
                      <button onClick={() => handleDelete(client._id)} class="btn btn-danger btn-sm">Delete</button>
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
                          onChange={(e) => newClient.value.cityBoundary = e.target.value}
                          class="form-select"
                          required
                        >
                          <option value="Delhi">Delhi</option>
                          <option value="Bangalore">Bangalore</option>
                        </select>
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
        </div>
      </div>
    );
  }
};
