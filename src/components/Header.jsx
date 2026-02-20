import { ref, computed, onMounted, onUnmounted } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { useAuth } from '../store/auth.js';
import { toggleSidebar, sidebarState } from './Sidebar.jsx';

export default {
  name: 'Header',
  setup() {
    const { user, logout } = useAuth();
    const route = useRoute();
    const showMenu = ref(false);

    const pageTitle = computed(() => {
      const routeName = route.name || '';
      return routeName.replace(/([A-Z])/g, ' $1').trim() || 'Dashboard';
    });

    const handleToggleSidebar = () => {
      console.log('Header toggle clicked, current sidebar state:', sidebarState.value);
      toggleSidebar();
      console.log('After toggle, sidebar state:', sidebarState.value);
    };

    const toggleMenu = () => {
      showMenu.value = !showMenu.value;
    };

    const handleLogout = () => {
      logout();
      showMenu.value = false;
    };

    const handleClickOutside = (e) => {
      if (!e.target.closest('.user-menu')) {
        showMenu.value = false;
      }
    };

    onMounted(() => {
      document.addEventListener('click', handleClickOutside);
    });

    onUnmounted(() => {
      document.removeEventListener('click', handleClickOutside);
    });

    return () => (
      <header style={{ 
        background: 'white', 
        borderBottom: '1px solid #e5e7eb', 
        height: '80px', 
        zIndex: 50, 
        position: 'sticky', 
        top: 0,
        width: '100%'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '100%', padding: '0 2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button 
              onClick={handleToggleSidebar}
              style={{ 
                background: 'transparent', 
                border: 'none', 
                fontSize: '1.5rem', 
                cursor: 'pointer', 
                padding: '0.5rem',
                color: '#1f2937',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="6" x2="21" y2="6"/>
                <line x1="3" y1="12" x2="21" y2="12"/>
                <line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#1f2937', margin: 0 }}>{pageTitle.value}</h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div 
              class="user-menu" 
              onClick={toggleMenu}
              style={{ position: 'relative', cursor: 'pointer', padding: '0.5rem 1rem', borderRadius: '8px', background: '#f3f4f6', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}
            >
              <span style={{ fontWeight: 500, color: '#1f2937', fontSize: '0.9rem' }}>{user.value?.email}</span>
              <span style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'capitalize' }}>{user.value?.role}</span>
              {showMenu.value && (
                <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '0.5rem', background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)', minWidth: '150px', overflow: 'hidden' }}>
                  <RouterLink 
                    to="/profile" 
                    class="dropdown-item"
                    style={{ display: 'block', padding: '0.75rem 1rem', color: '#1f2937', textDecoration: 'none', fontSize: '0.9rem' }}
                  >
                    Profile
                  </RouterLink>
                  <button 
                    onClick={handleLogout}
                    class="dropdown-item"
                    style={{ display: 'block', padding: '0.75rem 1rem', color: '#1f2937', textDecoration: 'none', border: 'none', background: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', fontSize: '0.9rem' }}
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
    );
  }
};
