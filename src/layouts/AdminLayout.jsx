import { RouterView } from 'vue-router';
import { computed } from 'vue';
import Sidebar, { sidebarState } from '../components/Sidebar.jsx';
import Header from '../components/Header.jsx';

export default {
  name: 'AdminLayout',
  setup() {
    // Reactive margin based on sidebar state
    const mainContentStyle = computed(() => ({
      flex: 1,
      marginLeft: sidebarState.value.isMobile && sidebarState.value.isCollapsed 
        ? '0' 
        : sidebarState.value.isCollapsed 
        ? '80px' 
        : '260px',
      display: 'flex',
      flexDirection: 'column',
      background: '#f5f5f5',
      transition: 'margin-left 0.3s ease',
      minHeight: '100vh'
    }));

    return () => (
      <div style={{ display: 'flex', minHeight: '100vh', position: 'relative' }}>
        <Sidebar />
        <div style={mainContentStyle.value}>
          <Header />
          <main style={{ 
            padding: '2rem', 
            flex: 1, 
            minHeight: 'calc(100vh - 80px)',
            overflowY: 'auto'
          }}>
            <RouterView />
          </main>
        </div>
      </div>
    );
  }
};
