import { RouterView } from 'vue-router';
import { useAuth } from '../store/auth.js';
import { useRouter } from 'vue-router';
import { computed, ref, onMounted, onUnmounted } from 'vue';
import logo from '../assets/logo.png';
import {
  Bars3Icon,
  XMarkIcon,
  HomeIcon,
  HeartIcon,
  ChatBubbleLeftRightIcon,
  TrophyIcon,
  ShoppingBagIcon,
  CogIcon,
  UserIcon,
  MicrophoneIcon,
  CpuChipIcon,
  SparklesIcon,
  ChartBarIcon,
  VideoCameraIcon,
  MoonIcon,
  UsersIcon,
  DocumentPlusIcon
} from '@heroicons/vue/24/outline';

export default {
  name: 'MobileUserLayout',
  setup() {
    const router = useRouter();
    const { user, token, logout } = useAuth();
    const sidebarCollapsed = ref(false);
    const isMobile = ref(false);

    const checkScreenSize = () => {
      const width = window.innerWidth;
      const wasMobile = isMobile.value;
      isMobile.value = width < 1024;

      // Only auto-collapse when switching from desktop to mobile
      if (!wasMobile && isMobile.value) {
        sidebarCollapsed.value = true;
      }
      // Auto-expand when switching from mobile to desktop
      else if (wasMobile && !isMobile.value) {
        sidebarCollapsed.value = false;
      }
    };

    onMounted(() => {
      checkScreenSize();
      window.addEventListener('resize', checkScreenSize);
    });

    onUnmounted(() => {
      window.removeEventListener('resize', checkScreenSize);
    });

    const toggleSidebar = () => {
      sidebarCollapsed.value = !sidebarCollapsed.value;
    };
    const activePage = computed(() => {
      const path = router.currentRoute.value.path;
      if (path.includes('/cctv-surveillance')) return 'cctv';
      if (path.includes('/chat')) return 'chat';
      if (path.includes('/voice')) return 'voice';

      if (path.includes('/profile')) return 'profile';
      if (path.includes('/report-case')) return 'report-case';
      if (path.includes('/my-cases')) return 'my-cases';
      if (path.includes('/user-chat')) return 'user-chat';
      if (path.includes('/dashboard')) return 'home';
      return null;
    });

    const setActivePage = (page) => {
      // Auto-close sidebar on mobile after navigation
      if (isMobile.value) {
        sidebarCollapsed.value = true;
      }

      if (page === 'home') {
        router.push('/mobile/user/dashboard');
      } else if (page === 'cctv') {
        router.push('/mobile/user/cctv-surveillance');
      } else if (page === 'chat') {
        router.push('/mobile/user/chat');
      } else if (page === 'voice') {
        router.push('/mobile/user/voice');

      } else if (page === 'profile') {
        router.push('/mobile/user/profile');
      } else if (page === 'report-case') {
        router.push('/mobile/user/report-case');
      } else if (page === 'my-cases') {
        router.push('/mobile/user/my-cases');
      } else if (page === 'user-chat') {
        router.push('/mobile/user/user-chat');
      }
    };

    const handleLogout = async () => {
      await logout('user');
      router.push('/user/login');
    };



    return () => (
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        {/* Overlay for mobile */}
        {!sidebarCollapsed.value && isMobile.value && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              zIndex: 999
            }}
            onClick={toggleSidebar}
          />
        )}

        {/* Sidebar */}
        <aside style={{
          width: sidebarCollapsed.value ? '70px' : '260px',
          height: '100vh',
          background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)',
          color: 'white',
          display: 'flex',
          flexDirection: 'column',
          position: 'fixed',
          left: 0,
          top: 0,
          zIndex: 1000,
          overflow: 'hidden',
          boxShadow: '2px 0 10px rgba(0, 0, 0, 0.1)',
          transition: 'all 0.3s ease',
          transform: (isMobile.value && sidebarCollapsed.value) ? 'translateX(-100%)' : 'translateX(0)'
        }}>
          <div style={{ padding: (sidebarCollapsed.value && !isMobile.value) ? '0.5rem' : '1rem', borderBottom: '1px solid #2d2d3e', minWidth: 0, overflow: 'hidden', textAlign: (sidebarCollapsed.value && !isMobile.value) ? 'center' : 'left' }}>
            {!(sidebarCollapsed.value && !isMobile.value) ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <img
                  src={logo}
                  alt="3rdAI Logo"
                  style={{
                    width: '45px',
                    height: '45px',
                    borderRadius: '8px',
                    objectFit: 'contain',
                    flexShrink: 0
                  }}
                />
                <div style={{ minWidth: 0, overflow: 'hidden' }}>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0, color: 'white', whiteSpace: 'nowrap' }}>3rdAI</h2>
                  <p style={{ fontSize: '0.75rem', margin: '0.25rem 0 0 0', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>
                    User Portal
                  </p>
                </div>
              </div>
            ) : (
              <div style={{ fontSize: '2rem', padding: '0.5rem 0' }}>
                <button
                  onClick={toggleSidebar}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'white',
                    padding: 0
                  }}
                >
                  <XMarkIcon style={{ width: '2rem', height: '2rem' }} />
                </button>
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
            {[
              { id: 'home', label: 'Home', icon: HomeIcon },
              { id: 'report-case', label: 'Report a Case', icon: DocumentPlusIcon },
              { id: 'cctv', label: 'CCTV', icon: VideoCameraIcon },
              { id: 'voice', label: 'Voice', icon: MicrophoneIcon },
              { id: 'chat', label: 'Chat', icon: ChatBubbleLeftRightIcon },
              { id: 'profile', label: 'Profile', icon: UserIcon },
              { id: 'user-chat', label: 'Expert Chat', icon: UsersIcon }
            ].map(item => (
              <button
                key={item.id}
                onClick={() => setActivePage(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: (sidebarCollapsed.value && !isMobile.value) ? 'center' : 'flex-start',
                  padding: (sidebarCollapsed.value && !isMobile.value) ? '0.75rem' : '1rem 1.5rem',
                  margin: (sidebarCollapsed.value && !isMobile.value) ? '0.25rem' : '0',
                  color: activePage.value === item.id ? '#6366f1' : '#b4b4c0',
                  textDecoration: 'none',
                  transition: 'all 0.3s ease',
                  borderLeft: (sidebarCollapsed.value && !isMobile.value) ? 'none' : `3px solid ${activePage.value === item.id ? '#6366f1' : 'transparent'}`,
                  background: activePage.value === item.id ? '#2d2d3e' : 'transparent',
                  minWidth: 0,
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                  width: (sidebarCollapsed.value && !isMobile.value) ? '50px' : '100%',
                  height: (sidebarCollapsed.value && !isMobile.value) ? '50px' : 'auto',
                  border: 'none',
                  borderRadius: (sidebarCollapsed.value && !isMobile.value) ? '8px' : '0',
                  cursor: 'pointer',
                  fontSize: (sidebarCollapsed.value && !isMobile.value) ? '1.2rem' : '1rem'
                }}
              >
                <item.icon style={{
                  width: '1.5rem',
                  height: '1.5rem',
                  marginRight: (sidebarCollapsed.value && !isMobile.value) ? '0' : '1rem',
                  minWidth: '28px',
                  flexShrink: 0
                }} />
                {!(sidebarCollapsed.value && !isMobile.value) && (
                  <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>
                )}
              </button>
            ))}
          </nav>

          <div style={{ borderTop: '1px solid #2d2d3e', padding: '0.5rem 0', minWidth: 0, overflow: 'hidden' }}>
            <button
              onClick={handleLogout}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: (sidebarCollapsed.value && !isMobile.value) ? 'center' : 'flex-start',
                padding: (sidebarCollapsed.value && !isMobile.value) ? '0.75rem' : '0.75rem 1.5rem',
                margin: (sidebarCollapsed.value && !isMobile.value) ? '0.25rem' : '0',
                color: '#b4b4c0',
                textDecoration: 'none',
                transition: 'all 0.3s ease',
                borderLeft: (sidebarCollapsed.value && !isMobile.value) ? 'none' : '3px solid transparent',
                background: 'transparent',
                minWidth: 0,
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                width: (sidebarCollapsed.value && !isMobile.value) ? '50px' : '100%',
                height: (sidebarCollapsed.value && !isMobile.value) ? '50px' : 'auto',
                border: 'none',
                borderRadius: (sidebarCollapsed.value && !isMobile.value) ? '8px' : '0',
                cursor: 'pointer',
                fontSize: (sidebarCollapsed.value && !isMobile.value) ? '1.2rem' : '1rem'
              }}
            >
              <span style={{
                fontSize: '1.5rem',
                marginRight: (sidebarCollapsed.value && !isMobile.value) ? '0' : '1rem',
                minWidth: '28px',
                textAlign: 'center',
                flexShrink: 0
              }}>🚪</span>
              {!(sidebarCollapsed.value && !isMobile.value) && (
                <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis' }}>Logout</span>
              )}
            </button>
          </div>
        </aside>



        {/* Main Content */}
        <div style={{
          flex: 1,
          marginLeft: isMobile.value ? '0' : (sidebarCollapsed.value ? '70px' : '260px'),
          display: 'flex',
          flexDirection: 'column',
          background: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
          transition: 'margin-left 0.3s ease',
          minHeight: '100vh'
        }}>
          {/* Header */}
          <header style={{
            background: 'white',
            padding: isMobile.value ? '1rem' : '1rem 2rem',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            position: 'sticky',
            top: 0,
            zIndex: 100
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button
                onClick={toggleSidebar}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0.5rem',
                  color: '#1e293b',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Bars3Icon style={{ width: '1.5rem', height: '1.5rem' }} />
              </button>
              <h1 style={{
                margin: 0,
                fontSize: isMobile.value ? '1.25rem' : '1.5rem',
                color: '#1e293b',
                fontWeight: 600
              }}>User Portal</h1>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{
                margin: 0,
                fontSize: isMobile.value ? '0.875rem' : '1rem',
                color: '#1e293b',
                fontWeight: 500,
                display: isMobile.value ? 'none' : 'block'
              }}>Welcome, {user.value?.email || 'Spiritual Seeker'}!</p>
            </div>
          </header>

          <main style={{
            padding: (router.currentRoute.value.path.includes('cctv-surveillance') || router.currentRoute.value.path.includes('user-chat')) ? '0' : (isMobile.value ? '1rem' : '2rem'),
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            height: (router.currentRoute.value.path.includes('cctv-surveillance') || router.currentRoute.value.path.includes('user-chat')) ? 'calc(100vh - 70px)' : 'auto',
            minHeight: 'calc(100vh - 70px)',
            overflow: (router.currentRoute.value.path.includes('cctv-surveillance') || router.currentRoute.value.path.includes('user-chat')) ? 'hidden' : 'visible'
          }}>
            <RouterView />
          </main>
        </div>
      </div>
    );
  }
};