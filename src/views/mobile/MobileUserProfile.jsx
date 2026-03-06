import { ref, onMounted } from 'vue';
import { useAuth } from '../../store/auth.js';
import { useRouter } from 'vue-router';
import { UserIcon, CameraIcon, CheckIcon, XMarkIcon, PencilIcon } from '@heroicons/vue/24/outline';
import { useToast } from 'vue-toastification';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export default {
  name: 'MobileUserProfile',
  setup() {
    const { user, fetchCurrentUser } = useAuth();
    const router = useRouter();
    const toast = useToast();

    const loading = ref(false);
    const saving = ref(false);
    const error = ref('');

    const isEditing = ref(false);
    const editForm = ref({ name: '', mobile: '' });
    const profileImageFile = ref(null);
    const profileImagePreview = ref(null);

    const initEditForm = () => {
      if (!user.value) return;
      editForm.value = {
        name: user.value.profile?.name || user.value.name || '',
        mobile: user.value.mobile || ''
      };
      profileImageFile.value = null;
      profileImagePreview.value = getProfileImageUrl();
    };

    onMounted(async () => {
      loading.value = true;
      error.value = '';
      try {
        await fetchCurrentUser('user');
        initEditForm();
      } catch (e) {
        console.error('[MobileUserProfile] Failed to load user profile:', e);
        error.value = e.message || 'Failed to load profile';
      } finally {
        loading.value = false;
      }
    });

    const getProfileImageUrl = () => {
      if (!user.value) return null;
      return user.value.profileImageUrl || user.value.profileImage || null;
    };

    const toggleEdit = () => {
      if (isEditing.value) {
        initEditForm(); // cancel changes
        isEditing.value = false;
      } else {
        document.getElementById('userProfileImageInput').click();
      }
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
        isEditing.value = true;
      }
    };

    const saveProfile = async () => {
      const token = localStorage.getItem('token_user') || localStorage.getItem('token');
      if (!token) return;

      saving.value = true;
      try {
        const formData = new FormData();

        // We only allow updating the profile image now
        if (profileImageFile.value) {
          formData.append('profileImage', profileImageFile.value);
        } else {
          toast.error('Please select an image to upload.');
          saving.value = false;
          return;
        }

        const res = await fetch(`${API_BASE_URL}/users/profile`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}` },
          body: formData
        });
        const data = await res.json();

        if (data.success) {
          await fetchCurrentUser('user');
          toast.success('Profile updated successfully!');
          isEditing.value = false;
        } else {
          toast.error(data.message || 'Failed to update profile');
        }
      } catch (e) {
        toast.error('Network error while saving');
        console.error('Update error:', e);
      } finally {
        saving.value = false;
      }
    };

    return () => {
      const imageUrl = isEditing.value ? profileImagePreview.value : getProfileImageUrl();

      return (
        <div class="profile-page">
          <div class="header" style="display: flex; justify-content: space-between; align-items: center; padding: 1rem 1.5rem;">
            <h1 style="margin: 0; font-size: 1.5rem; color: #1e293b; font-weight: 700;">My Profile</h1>
            {!loading.value && !error.value && user.value && (
              <button
                onClick={isEditing.value ? saveProfile : toggleEdit}
                disabled={saving.value}
                style={`
                  background: ${isEditing.value ? '#10b981' : '#3b82f6'}; 
                  color: white; border: none; padding: 0.5rem 1rem; border-radius: 20px;
                  font-size: 0.875rem; font-weight: 600; cursor: pointer;
                  display: flex; align-items: center; gap: 0.5rem; transition: background 0.2s;
                `}
              >
                {saving.value ? (
                  <span>Saving...</span>
                ) : isEditing.value ? (
                  <><CheckIcon style="width: 1rem; height: 1rem;" /> Save Photo</>
                ) : (
                  <><CameraIcon style="width: 1rem; height: 1rem;" /> Update Photo</>
                )}
              </button>
            )}
          </div>

          {loading.value && (
            <div class="loading" style="text-align: center; padding: 3rem; color: #64748b;">
              <div class="spinner-border text-primary" role="status"></div>
            </div>
          )}

          {error.value && (
            <div class="error" style="margin: 1rem; padding: 1rem; background: #fee2e2; color: #b91c1c; border-radius: 8px;">
              {error.value}
            </div>
          )}

          {!loading.value && !error.value && user.value && (
            <div class="content" style="padding: 1.5rem; max-width: 600px; margin: 0 auto;">

              {/* Avatar Section */}
              <div style="display: flex; flex-direction: column; align-items: center; margin-bottom: 2rem;">
                <div style="position: relative; width: 110px; height: 110px;">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt="Profile"
                      style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover; border: 4px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.1);"
                    />
                  ) : (
                    <div style="width: 100%; height: 100%; border-radius: 50%; background: #e2e8f0; display: flex; align-items: center; justify-content: center; border: 4px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
                      <UserIcon style="width: 3rem; height: 3rem; color: #94a3b8;" />
                    </div>
                  )}

                  {isEditing.value && (
                    <div
                      onClick={() => document.getElementById('userProfileImageInput').click()}
                      style="position: absolute; bottom: 0; right: 0; background: #3b82f6; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; cursor: pointer; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.2);"
                    >
                      <CameraIcon style="width: 1rem; height: 1rem;" />
                    </div>
                  )}
                  <input type="file" id="userProfileImageInput" accept="image/*" style="display: none;" onChange={handleImageChange} />
                </div>

                {!isEditing.value && (
                  <div style="margin-top: 1rem; text-align: center;">
                    <h2 style="margin: 0; font-size: 1.25rem; color: #0f172a; font-weight: 700;">{user.value.profile?.name || user.value.name || 'User'}</h2>
                    <span style="color: #64748b; font-size: 0.875rem;">{user.value.email}</span>
                  </div>
                )}
              </div>

              {/* Form / Details Fields */}
              <div style="background: white; border-radius: 16px; padding: 1.5rem; box-shadow: 0 2px 10px rgba(0,0,0,0.04);">

                {isEditing.value ? (
                  <div style="display: flex; flex-direction: column; gap: 1rem;">
                    <div style="margin-top: 1rem;">
                      <button
                        onClick={toggleEdit}
                        style="width: 100%; text-align: center; background: transparent; color: #ef4444; border: 1px solid #ef4444; padding: 0.75rem; border-radius: 8px; font-weight: 600; cursor: pointer;"
                      >
                        Cancel Update
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style="display: flex; flex-direction: column; gap: 1.25rem;">
                    <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding-bottom: 0.75rem;">
                      <span style="color: #64748b; font-size: 0.875rem; font-weight: 500;">Mobile</span>
                      <span style="color: #0f172a; font-weight: 500;">{user.value.mobile || '—'}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding-bottom: 0.75rem;">
                      <span style="color: #64748b; font-size: 0.875rem; font-weight: 500;">Role</span>
                      <span style="color: #0f172a; font-weight: 500; text-transform: capitalize;">{user.value.role || '—'}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding-bottom: 0.75rem;">
                      <span style="color: #64748b; font-size: 0.875rem; font-weight: 500;">Client</span>
                      <span style="color: #0f172a; font-weight: 500;">{user.value.clientId?.businessName || '—'}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding-bottom: 0.75rem;">
                      <span style="color: #64748b; font-size: 0.875rem; font-weight: 500;">Verified</span>
                      <span style="color: #0f172a; font-weight: 500;">{user.value.emailVerified ? '✅ Yes' : '❌ No'}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                      <span style="color: #64748b; font-size: 0.875rem; font-weight: 500;">Joined</span>
                      <span style="color: #0f172a; font-weight: 500;">{user.value.createdAt ? new Date(user.value.createdAt).toLocaleDateString() : '—'}</span>
                    </div>
                  </div>
                )}

              </div>
            </div>
          )}

          <style>{`
            .profile-page {
              min-height: 100vh;
              background: #f8fafc;
              padding: 0;
              width: 100%;
              font-family: 'Inter', sans-serif;
            }
            .header {
              background: white;
              box-shadow: 0 1px 3px rgba(0,0,0,0.05);
            }
            input:focus {
              border-color: #3b82f6 !important;
              box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
            }
          `}</style>
        </div>
      );
    };
  }
};
