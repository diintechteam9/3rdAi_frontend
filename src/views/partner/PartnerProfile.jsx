import { ref, onMounted } from 'vue';
import { useToast } from 'vue-toastification';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export default {
    name: 'PartnerProfile',
    setup() {
        const toast = useToast();
        const loading = ref(true);
        const saving = ref(false);
        const error = ref('');
        const partner = ref(null);

        // Edit Mode State
        const isEditing = ref(false);
        const editForm = ref({});
        const profileImageFile = ref(null);
        const profileImagePreview = ref(null);

        const indianStates = [
            'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
            'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
            'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
            'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
            'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
            'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
            'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'
        ];

        const loadProfile = async () => {
            const token = localStorage.getItem('partner_token');
            if (!token) {
                error.value = 'Not authenticated';
                loading.value = false;
                return;
            }

            try {
                const res = await fetch(`${API_BASE_URL}/partners/profile`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const data = await res.json();

                if (data.success) {
                    partner.value = data.data;
                    initEditForm();
                } else {
                    error.value = data.message || 'Failed to load profile';
                }
            } catch (e) {
                error.value = e.message || 'Server error';
            } finally {
                loading.value = false;
            }
        };

        const initEditForm = () => {
            if (!partner.value) return;
            editForm.value = {
                name: partner.value.name || '',
                phone: partner.value.phone || '',
                bio: partner.value.bio || '',
                designation: partner.value.designation || '',
                policeId: partner.value.policeId || '',
                policeStation: partner.value.policeStation || '',
                experience: partner.value.experience || 0,
                area: partner.value.location?.area || '',
                state: partner.value.location?.state || ''
            };
            profileImageFile.value = null;
            profileImagePreview.value = partner.value.profilePicture || null;
        };

        const toggleEdit = () => {
            if (isEditing.value) {
                // Cancel
                initEditForm();
            }
            isEditing.value = !isEditing.value;
        };

        const handleImageChange = (e) => {
            const file = e.target.files[0];
            if (file) {
                if (file.size > 5 * 1024 * 1024) {
                    toast.error('Image size must be less than 5MB');
                    return;
                }
                profileImageFile.value = file;
                profileImagePreview.value = URL.createObjectURL(file);
            }
        };

        const saveProfile = async () => {
            const token = localStorage.getItem('partner_token');
            if (!token) return;

            saving.value = true;
            try {
                const formData = new FormData();

                // Append text fields
                Object.keys(editForm.value).forEach(key => {
                    formData.append(key, editForm.value[key]);
                });

                // Append file if selected
                if (profileImageFile.value) {
                    formData.append('profileImage', profileImageFile.value);
                }

                const res = await fetch(`${API_BASE_URL}/partners/profile`, {
                    method: 'PUT',
                    headers: { Authorization: `Bearer ${token}` }, // Fetch sets multipart boundary automatically
                    body: formData
                });
                const data = await res.json();

                if (data.success) {
                    partner.value = data.data;
                    toast.success('Profile updated successfully!');
                    isEditing.value = false;
                } else {
                    toast.error(data.message || 'Failed to update profile');
                }
            } catch (e) {
                toast.error('Network error while saving');
            } finally {
                saving.value = false;
            }
        };

        onMounted(() => {
            loadProfile();
        });

        // Common styles for inputs
        const inputStyle = {
            width: '100%', padding: '10px 14px', borderRadius: '8px',
            border: '1px solid #d1d5db', fontSize: '15px', color: '#1f2937',
            background: '#f9fafb', outline: 'none', transition: 'border-color 0.2s'
        };

        const labelStyle = {
            display: 'block', fontSize: '13px', fontWeight: '600',
            color: '#4b5563', marginBottom: '6px'
        };

        return () => (
            <div style="max-width: 850px; margin: 0 auto; background: white; border-radius: 16px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1); overflow: hidden; font-family: 'Inter', sans-serif;">

                {/* Banner Banner */}
                <div style="background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%); height: 160px; position: relative;">
                    {partner.value && !loading.value && (
                        <button
                            onClick={isEditing.value ? saveProfile : toggleEdit}
                            disabled={saving.value}
                            style={{
                                position: 'absolute', top: '20px', right: '20px',
                                background: isEditing.value ? '#10b981' : 'rgba(255,255,255,0.2)',
                                backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.3)',
                                padding: '8px 16px', borderRadius: '20px', color: 'white',
                                fontWeight: '600', fontSize: '14px', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: '6px',
                                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                            }}
                        >
                            {saving.value ? (
                                <span><span class="spinner-border spinner-border-sm me-2"></span>Saving...</span>
                            ) : isEditing.value ? (
                                <><span>💾</span> Save Changes</>
                            ) : (
                                <><span>⚙️</span> Edit Profile</>
                            )}
                        </button>
                    )}
                    {isEditing.value && (
                        <button
                            onClick={toggleEdit}
                            disabled={saving.value}
                            style={{
                                position: 'absolute', top: '20px', right: '160px',
                                background: 'rgba(239, 68, 68, 0.9)', border: 'none',
                                padding: '8px 16px', borderRadius: '20px', color: 'white',
                                fontWeight: '600', fontSize: '14px', cursor: 'pointer',
                                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                            }}
                        >
                            Cancel
                        </button>
                    )}
                </div>

                <div style="padding: 0 32px 32px;">
                    {/* Profile Header section (Avatar + Name) */}
                    <div style="display: flex; align-items: flex-end; margin-top: -60px; margin-bottom: 32px; position: relative; gap: 24px;">

                        {/* Avatar */}
                        <div style="position: relative;">
                            <div style="width: 120px; height: 120px; background: white; border-radius: 50%; padding: 4px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); z-index: 10;">
                                {(profileImagePreview.value && isEditing.value) || (partner.value?.profilePicture && !isEditing.value) ? (
                                    <img
                                        src={isEditing.value ? profileImagePreview.value : partner.value.profilePicture}
                                        alt={partner.value?.name}
                                        style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover; background: #f3f4f6;"
                                        onError={(e) => {
                                            e.target.style.display = 'none';
                                            e.target.nextElementSibling.style.display = 'flex';
                                        }}
                                    />
                                ) : null}
                                <div style={`width: 100%; height: 100%; border-radius: 50%; background: #e0e7ff; display: ${(isEditing.value ? profileImagePreview.value : partner.value?.profilePicture) ? 'none' : 'flex'}; align-items: center; justify-content: center; font-size: 42px; font-weight: bold; color: #4338ca;`}>
                                    {partner.value?.name?.charAt(0)?.toUpperCase() || 'P'}
                                </div>
                            </div>

                            {/* Upload Button Overlay */}
                            {isEditing.value && (
                                <div
                                    style="position: absolute; bottom: 0; right: 0; background: #2563eb; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; border: 3px solid white; cursor: pointer; z-index: 20; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);"
                                    onClick={() => document.getElementById('profileImageInput').click()}
                                    title="Change Profile Picture"
                                >
                                    <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><circle cx="12" cy="13" r="4" stroke-linecap="round" stroke-linejoin="round"></circle></svg>
                                </div>
                            )}
                            <input type="file" id="profileImageInput" class="d-none" accept="image/*" onChange={handleImageChange} />
                        </div>

                        {/* Name & Titles */}
                        {!loading.value && !error.value && partner.value && (
                            <div style="flex: 1; margin-bottom: 8px;">
                                <h1 style="font-size: 32px; font-weight: 800; color: #111827; margin: 0 0 8px 0; letter-spacing: -0.5px;">{partner.value.name}</h1>

                                <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
                                    <span style={`padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: 700; border: 1px solid transparent; ${partner.value.verificationStatus === 'approved' ? 'background: #d1fae5; color: #065f46; border-color: #34d399;' :
                                        partner.value.verificationStatus === 'pending' ? 'background: #fef3c7; color: #92400e; border-color: #fbbf24;' :
                                            'background: #fee2e2; color: #991b1b; border-color: #f87171;'
                                        }`}>
                                        {partner.value.verificationStatus ? partner.value.verificationStatus.charAt(0).toUpperCase() + partner.value.verificationStatus.slice(1) : 'Unknown'}
                                    </span>

                                    {partner.value.designation ? (
                                        <span style="color: #4b5563; font-size: 15px; font-weight: 500; display: flex; align-items: center; gap: 6px; background: #f3f4f6; padding: 6px 12px; border-radius: 20px;">
                                            🎗️ {partner.value.designation}
                                        </span>
                                    ) : null}
                                </div>
                            </div>
                        )}
                    </div>

                    {loading.value && (
                        <div style="text-align: center; padding: 60px; color: #6b7280;">
                            <div class="spinner-border text-primary" role="status"></div>
                            <div class="mt-3 font-medium">Loading profile data...</div>
                        </div>
                    )}

                    {error.value && (
                        <div style="background: #fee2e2; border-left: 4px solid #ef4444; color: #991b1b; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
                            <strong>Error:</strong> {error.value}
                        </div>
                    )}

                    {!loading.value && !error.value && partner.value && (
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 24px;">

                            {/* Contact Box */}
                            <div style="background: #ffffff; border-radius: 12px; padding: 24px; border: 1px solid #e5e7eb; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
                                <h3 style="font-size: 17px; font-weight: 700; color: #111827; margin: 0 0 20px 0; display: flex; align-items: center; gap: 8px;">
                                    <span>📞</span> Contact Information
                                </h3>

                                <div style="display: flex; flex-direction: column; gap: 16px;">
                                    <div>
                                        <label style={labelStyle}>Email Address (Read-only)</label>
                                        <div style="color: #6b7280; font-weight: 500; font-size: 15px; background: #f9fafb; padding: 10px 14px; border-radius: 8px; border: 1px dashed #d1d5db;">
                                            {partner.value.email}
                                        </div>
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Phone Number</label>
                                        <div style="color: #1f2937; font-weight: 500; font-size: 15px;">{partner.value.phone || '—'}</div>
                                    </div>
                                    <div style="display: flex; gap: 16px;">
                                        <div style="flex: 1;">
                                            <label style={labelStyle}>Area</label>
                                            <div style="color: #1f2937; font-weight: 500; font-size: 15px;">{partner.value.location?.area || '—'}</div>
                                        </div>
                                        <div style="flex: 1;">
                                            <label style={labelStyle}>State</label>
                                            <div style="color: #1f2937; font-weight: 500; font-size: 15px;">{partner.value.location?.state || '—'}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Verification & Bio Box */}
                            <div style="background: #ffffff; border-radius: 12px; padding: 24px; border: 1px solid #e5e7eb; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
                                <h3 style="font-size: 17px; font-weight: 700; color: #111827; margin: 0 0 20px 0; display: flex; align-items: center; gap: 8px;">
                                    <span>🛡️</span> Professional & Bio
                                </h3>

                                <div style="display: flex; flex-direction: column; gap: 16px;">
                                    <div>
                                        <label style={labelStyle}>Bio / About Me</label>
                                        <div style="color: #4b5563; font-size: 14px; line-height: 1.6; background: #f9fafb; padding: 12px; border-radius: 8px;">
                                            {partner.value.bio || <span style="font-style: italic; color: #9ca3af;">No bio provided.</span>}
                                        </div>
                                    </div>

                                    <div style="display: flex; gap: 16px;">
                                        <div style="flex: 1;">
                                            <label style={labelStyle}>Police ID</label>
                                            <div style="color: #1f2937; font-weight: 500; font-size: 15px;">{partner.value.policeId || '—'}</div>
                                        </div>
                                        <div style="flex: 1;">
                                            <label style={labelStyle}>Years of Experience</label>
                                            <div style="color: #1f2937; font-weight: 500; font-size: 15px;">{(partner.value.experience !== undefined && partner.value.experience !== null) ? `${partner.value.experience} years` : '—'}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }
};
