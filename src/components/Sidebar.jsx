import { ref, computed, onMounted, onUnmounted } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { useAuth } from '../store/auth.js';
import logo from '../assets/logo.jpeg';

// Create a shared sidebar state that can be accessed globally
const sidebarState = ref({
  isCollapsed: false,
  isMobile: false
});

// Export the state and toggle function
export { sidebarState };
export const toggleSidebar = () => {
  sidebarState.value.isCollapsed = !sidebarState.value.isCollapsed;
};

export default {
  name: 'Sidebar',
  setup() {
    const { userRole } = useAuth();
    const route = useRoute();

    const checkMobile = () => {
      sidebarState.value.isMobile = window.innerWidth < 1024;
      if (sidebarState.value.isMobile) {
        sidebarState.value.isCollapsed = true;
      }
    };

    onMounted(() => {
      checkMobile();
      window.addEventListener('resize', checkMobile);
    });

    onUnmounted(() => {
      window.removeEventListener('resize', checkMobile);
    });

    const toggleCollapse = () => {
      sidebarState.value.isCollapsed = !sidebarState.value.isCollapsed;
    };

    // Super Admin menu
    const superAdminMenu = [
      { path: '/super-admin/overview', label: 'Overview', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /></svg> },
      { path: '/super-admin/admins', label: 'Admins', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg> },
      { path: '/super-admin/users', label: 'Users', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg> },
      { path: '/super-admin/pending-approvals', label: 'Pending Approvals', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12,6 12,12 16,14" /></svg> }
    ];

    // Admin menu
    const adminMenu = [
      { path: '/admin/overview', label: 'Overview', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /></svg> },
      { path: '/admin/clients', label: 'Clients', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21h18" /><path d="M5 21V7l8-4v18" /><path d="M19 21V11l-6-4" /></svg> },
      { path: '/admin/ai-agents', label: 'AI Agents', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><circle cx="12" cy="5" r="2" /><path d="M12 7v4" /><line x1="8" y1="16" x2="8" y2="16" /><line x1="16" y1="16" x2="16" y2="16" /></svg> },
      { path: '/admin/payments', label: 'Payments', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg> },
      { path: '/admin/users', label: 'Users', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg> },
      { path: '/admin/tools', label: 'Tools', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" /></svg> }
    ];

    const adminFooter = [
      { path: '/admin/support', label: 'Support', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg> },
      { path: '/admin/health', label: 'Health', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg> },
      { path: '/admin/settings', label: 'Settings', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M12 1v6m0 6v6m11-7h-6m-6 0H1m15.5-3.5L19 4m-7 7-2.5-2.5M7.5 17.5L5 20m7-7 2.5 2.5M16.5 6.5L19 4" /></svg> }
    ];

    // Client menu
    const clientMenu = [
      { path: '/client/overview', label: 'Overview', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="9" /><rect x="14" y="3" width="7" height="5" /><rect x="14" y="12" width="7" height="9" /><rect x="3" y="16" width="7" height="5" /></svg> },
      { path: '/client/ai-agents', label: 'AI Agents', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><circle cx="12" cy="5" r="2" /><path d="M12 7v4" /><line x1="8" y1="16" x2="8" y2="16" /><line x1="16" y1="16" x2="16" y2="16" /></svg> },
      { path: '/client/services', label: 'Services', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg> },
      { path: '/client/users', label: 'Users', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg> },
      { path: '/client/payments', label: 'Payments', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg> },
      { path: '/client/tools', label: 'Tools', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" /></svg> }
    ];

    const clientFooter = [
      { path: '/client/support', label: 'Support', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg> },
      { path: '/client/health', label: 'Health', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg> },
      { path: '/client/settings', label: 'Settings', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M12 1v6m0 6v6m11-7h-6m-6 0H1m15.5-3.5L19 4m-7 7-2.5-2.5M7.5 17.5L5 20m7-7 2.5 2.5M16.5 6.5L19 4" /></svg> }
    ];

    const menuItems = computed(() => {
      if (userRole.value === 'super_admin') {
        return superAdminMenu;
      } else if (userRole.value === 'admin') {
        return adminMenu;
      } else if (userRole.value === 'client') {
        return clientMenu;
      }
      return [];
    });

    const footerItems = computed(() => {
      if (userRole.value === 'admin') {
        return adminFooter;
      } else if (userRole.value === 'client') {
        return clientFooter;
      }
      return [];
    });

    const portalType = computed(() => {
      if (userRole.value === 'super_admin') {
        return 'Super Admin Portal';
      } else if (userRole.value === 'admin') {
        return 'Admin Portal';
      } else if (userRole.value === 'client') {
        return 'Client Portal';
      } else if (userRole.value === 'user') {
        return 'User Portal';
      }
      return 'Portal';
    });

    const isActive = (itemPath) => {
      if (itemPath === '/') {
        return route.path === '/';
      }
      return route.path === itemPath || route.path.startsWith(itemPath + '/');
    };

    // Convert to computed for reactivity
    const sidebarStyle = computed(() => ({
      width: sidebarState.value.isCollapsed ? '80px' : '260px',
      height: '100vh',
      background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)',
      color: 'white',
      display: 'flex',
      flexDirection: 'column',
      transition: 'all 0.3s ease',
      position: 'fixed',
      left: 0,
      top: 0,
      zIndex: sidebarState.value.isMobile && !sidebarState.value.isCollapsed ? 1001 : 200,
      overflow: 'hidden',
      boxShadow: '2px 0 10px rgba(0, 0, 0, 0.1)',
      transform: sidebarState.value.isMobile && sidebarState.value.isCollapsed ? 'translateX(-100%)' : 'translateX(0)'
    }));

    return () => (
      <>
        {/* Mobile Overlay */}
        {!sidebarState.value.isCollapsed && sidebarState.value.isMobile && (
          <div
            style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(0, 0, 0, 0.5); z-index: 1000;"
            onClick={toggleCollapse}
          />
        )}

        <aside style={sidebarStyle.value}>
          <div style={{ padding: sidebarState.value.isCollapsed ? '1rem 0.5rem' : '1rem', borderBottom: '1px solid #2d2d3e', minWidth: 0, overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: sidebarState.value.isCollapsed ? 'center' : 'space-between', alignItems: 'center', marginBottom: sidebarState.value.isCollapsed ? '0.5rem' : '1rem', flexDirection: sidebarState.value.isCollapsed ? 'column' : 'row', gap: sidebarState.value.isCollapsed ? '0.5rem' : '0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: sidebarState.value.isCollapsed ? 0 : 1, justifyContent: sidebarState.value.isCollapsed ? 'center' : 'flex-start', flexDirection: sidebarState.value.isCollapsed ? 'column' : 'row' }}>
                <img
                  src={logo}
                  alt="Brahmakosh Logo"
                  style={{
                    width: sidebarState.value.isCollapsed ? '40px' : '50px',
                    height: sidebarState.value.isCollapsed ? '40px' : '50px',
                    borderRadius: '8px',
                    objectFit: 'contain',
                    flexShrink: 0
                  }}
                />
                {!sidebarState.value.isCollapsed && (
                  <div style={{ minWidth: 0, overflow: 'hidden' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0, color: 'white', whiteSpace: 'nowrap' }}>Brahmakosh</h2>
                    <p style={{ fontSize: '0.75rem', margin: '0.25rem 0 0 0', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>
                      {portalType.value}
                    </p>
                  </div>
                )}
              </div>
            </div>
            {sidebarState.value.isCollapsed && (
              <div style={{ textAlign: 'center', paddingTop: '0.5rem' }}>
                <p style={{ fontSize: '0.65rem', margin: 0, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>
                  {userRole.value === 'super_admin' ? 'Super Admin' : userRole.value === 'admin' ? 'Admin' : userRole.value === 'client' ? 'Client' : 'User'}
                </p>
              </div>
            )}
          </div>

          <nav
            class="sidebar-nav"
            style={{
              flex: 1,
              padding: '1rem 0',
              overflowY: 'auto',
              overflowX: 'hidden',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none'
            }}
          >
            <style>{`
              .sidebar-nav::-webkit-scrollbar {
                display: none;
              }
              .sidebar-nav {
                -ms-overflow-style: none;
                scrollbar-width: none;
              }
            `}</style>
            {menuItems.value.map(item => (
              <RouterLink
                key={item.path}
                to={item.path}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: sidebarState.value.isCollapsed ? 'center' : 'flex-start',
                  padding: sidebarState.value.isCollapsed ? '1rem 0.5rem' : '1rem 1.5rem',
                  color: isActive(item.path) ? '#6366f1' : '#b4b4c0',
                  textDecoration: 'none',
                  transition: 'all 0.2s',
                  borderLeft: sidebarState.value.isCollapsed ? 'none' : `3px solid ${isActive(item.path) ? '#6366f1' : 'transparent'}`,
                  background: isActive(item.path) ? '#2d2d3e' : 'transparent',
                  minWidth: 0,
                  overflow: 'hidden',
                  whiteSpace: 'nowrap'
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: sidebarState.value.isCollapsed ? 0 : '1rem', minWidth: '32px', flexShrink: 0 }}>{item.icon}</span>
                {!sidebarState.value.isCollapsed && <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>}
              </RouterLink>
            ))}
          </nav>

          <div style={{ borderTop: '1px solid #2d2d3e', padding: '0.5rem 0', minWidth: 0, overflow: 'hidden' }}>
            {footerItems.value.map(item => (
              <RouterLink
                key={item.path}
                to={item.path}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: sidebarState.value.isCollapsed ? 'center' : 'flex-start',
                  padding: sidebarState.value.isCollapsed ? '0.75rem 0.5rem' : '0.75rem 1.5rem',
                  color: isActive(item.path) ? '#6366f1' : '#b4b4c0',
                  textDecoration: 'none',
                  transition: 'all 0.2s',
                  borderLeft: sidebarState.value.isCollapsed ? 'none' : `3px solid ${isActive(item.path) ? '#6366f1' : 'transparent'}`,
                  background: isActive(item.path) ? '#2d2d3e' : 'transparent',
                  minWidth: 0,
                  overflow: 'hidden',
                  whiteSpace: 'nowrap'
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: sidebarState.value.isCollapsed ? 0 : '1rem', minWidth: '32px', flexShrink: 0 }}>{item.icon}</span>
                {!sidebarState.value.isCollapsed && <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>}
              </RouterLink>
            ))}
          </div>
        </aside>
      </>
    );
  }
};