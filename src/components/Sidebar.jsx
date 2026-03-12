import { ref, computed, onMounted, onUnmounted } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { useAuth } from '../store/auth.js';
import { superAdminMenu, adminMenu, adminFooter, clientMenu, clientFooter } from '../constants/menuItems.jsx';

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

    const expandedMenus = ref({});

    const toggleMenu = (label) => {
      expandedMenus.value[label] = !expandedMenus.value[label];
    };

    const toggleCollapse = () => {
      sidebarState.value.isCollapsed = !sidebarState.value.isCollapsed;
      if (sidebarState.value.isCollapsed) {
        expandedMenus.value = {}; // close all sub-menus when collapsing sidebar
      }
    };


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

    return {
      sidebarState,
      userRole,
      route,
      menuItems,
      footerItems,
      portalType,
      isActive,
      sidebarStyle,
      expandedMenus,
      toggleMenu,
      toggleCollapse
    };
  },
  render() {
    const { sidebarState, menuItems, footerItems, portalType, isActive, sidebarStyle, expandedMenus, toggleMenu, toggleCollapse, userRole } = this;

    return (
      <>
        {/* Mobile Overlay */}
        {!sidebarState.isCollapsed && sidebarState.isMobile && (
          <div
            style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(0, 0, 0, 0.5); z-index: 1000;"
            onClick={toggleCollapse}
          />
        )}

        <aside style={sidebarStyle}>
          <div style={{ padding: sidebarState.isCollapsed ? '1rem 0.5rem' : '1rem', borderBottom: '1px solid #2d2d3e', minWidth: 0, overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: sidebarState.isCollapsed ? 'center' : 'space-between', alignItems: 'center', marginBottom: sidebarState.isCollapsed ? '0.5rem' : '1rem', flexDirection: sidebarState.isCollapsed ? 'column' : 'row', gap: sidebarState.isCollapsed ? '0.5rem' : '0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: sidebarState.isCollapsed ? 0 : 1, justifyContent: sidebarState.isCollapsed ? 'center' : 'flex-start', flexDirection: sidebarState.isCollapsed ? 'column' : 'row' }}>
                <img
                  src="/logo.png"
                  alt="3rdAI Logo"
                  style={{
                    width: sidebarState.isCollapsed ? '60px' : '80px',
                    height: sidebarState.isCollapsed ? '60px' : '80px',
                    borderRadius: '8px',
                    objectFit: 'contain',
                    flexShrink: 0
                  }}
                />
                {!sidebarState.isCollapsed && (
                  <div style={{ minWidth: 0, overflow: 'hidden' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0, color: 'white', whiteSpace: 'nowrap' }}>3rdAI</h2>
                    <p style={{ fontSize: '0.75rem', margin: '0.25rem 0 0 0', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>
                      {portalType}
                    </p>
                  </div>
                )}
              </div>
              <button
                onClick={toggleCollapse}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '1.25rem',
                  cursor: 'pointer',
                  padding: '0.25rem',
                  color: '#b4b4c0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'color 0.2s',
                  marginLeft: sidebarState.isCollapsed ? '0' : '0.5rem'
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              </button>
            </div>
            {sidebarState.isCollapsed && (
              <div style={{ textAlign: 'center', paddingTop: '0.5rem' }}>
                <p style={{ fontSize: '0.65rem', margin: 0, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>
                  {userRole === 'super_admin' ? 'Super Admin' : userRole === 'admin' ? 'Admin' : userRole === 'client' ? 'Client' : 'User'}
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
            {menuItems.map(item => (
              <div key={item.label}>
                {item.isParent ? (
                  <>
                    <div
                      onClick={() => toggleMenu(item.label)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: sidebarState.isCollapsed ? 'center' : 'space-between',
                        padding: sidebarState.isCollapsed ? '1rem 0.5rem' : '1rem 1.5rem',
                        color: '#b4b4c0',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        background: 'transparent',
                        minWidth: 0,
                        overflow: 'hidden',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: sidebarState.isCollapsed ? 0 : '1rem', minWidth: '32px', flexShrink: 0 }}>{item.icon}</span>
                        {!sidebarState.isCollapsed && <span style={{ fontWeight: 500 }}>{item.label}</span>}
                      </div>
                      {!sidebarState.isCollapsed && (
                        <svg
                          width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                          style={{ transition: 'transform 0.3s', transform: expandedMenus[item.label] ? 'rotate(180deg)' : 'rotate(0deg)' }}
                        >
                          <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                      )}
                    </div>
                    {expandedMenus[item.label] && !sidebarState.isCollapsed && (
                      <div style={{ background: 'rgba(0,0,0,0.15)', paddingLeft: '1rem' }}>
                        {item.children.map(child => (
                          <RouterLink
                            key={child.path}
                            to={child.path}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              padding: '0.75rem 1.5rem',
                              color: isActive(child.path) ? '#6366f1' : '#a1a1aa',
                              textDecoration: 'none',
                              fontSize: '0.9rem',
                              transition: 'all 0.2s',
                              background: isActive(child.path) ? 'rgba(99,102,241,0.1)' : 'transparent'
                            }}
                          >
                            <span style={{ marginRight: '0.75rem', opacity: 0.7 }}>{child.icon}</span>
                            <span>{child.label}</span>
                          </RouterLink>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <RouterLink
                    to={item.path}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: sidebarState.isCollapsed ? 'center' : 'flex-start',
                      padding: sidebarState.isCollapsed ? '1rem 0.5rem' : '1rem 1.5rem',
                      color: isActive(item.path) ? '#6366f1' : '#b4b4c0',
                      textDecoration: 'none',
                      transition: 'all 0.2s',
                      borderLeft: sidebarState.isCollapsed ? 'none' : `3px solid ${isActive(item.path) ? '#6366f1' : 'transparent'}`,
                      background: isActive(item.path) ? '#2d2d3e' : 'transparent',
                      minWidth: 0,
                      overflow: 'hidden',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: sidebarState.isCollapsed ? 0 : '1rem', minWidth: '32px', flexShrink: 0 }}>{item.icon}</span>
                    {!sidebarState.isCollapsed && <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>}
                  </RouterLink>
                )}
              </div>
            ))}
          </nav>

          <div style={{ borderTop: '1px solid #2d2d3e', padding: '0.5rem 0', minWidth: 0, overflow: 'hidden' }}>
            {footerItems.map(item => (
              <RouterLink
                key={item.path}
                to={item.path}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: sidebarState.isCollapsed ? 'center' : 'flex-start',
                  padding: sidebarState.isCollapsed ? '0.75rem 0.5rem' : '0.75rem 1.5rem',
                  color: isActive(item.path) ? '#6366f1' : '#b4b4c0',
                  textDecoration: 'none',
                  transition: 'all 0.2s',
                  borderLeft: sidebarState.isCollapsed ? 'none' : `3px solid ${isActive(item.path) ? '#6366f1' : 'transparent'}`,
                  background: isActive(item.path) ? '#2d2d3e' : 'transparent',
                  minWidth: 0,
                  overflow: 'hidden',
                  whiteSpace: 'nowrap'
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: sidebarState.isCollapsed ? 0 : '1rem', minWidth: '32px', flexShrink: 0 }}>{item.icon}</span>
                {!sidebarState.isCollapsed && <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>}
              </RouterLink>
            ))}
          </div>
        </aside>
      </>
    );
  }
};
