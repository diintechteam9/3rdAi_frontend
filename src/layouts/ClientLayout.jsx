import { computed } from 'vue';
import { RouterView } from 'vue-router';
import Sidebar from '../components/Sidebar.jsx';
import Header from '../components/Header.jsx';
import { sidebarState } from '../components/Sidebar.jsx';

export default {
  name: 'ClientLayout',
  setup() {
    const sidebarWidth = computed(() => {
      return sidebarState.value.isMobile ? 0 : (sidebarState.value.isCollapsed ? 80 : 260);
    });

    return () => (
      <div style={{ display: 'flex', minHeight: '100vh', position: 'relative', backgroundColor: '#f9fafb' }}>
        <Sidebar />
        <div style={{ 
          flex: 1, 
          marginLeft: `${sidebarWidth.value}px`, 
          display: 'flex', 
          flexDirection: 'column', 
          background: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
          transition: 'all 0.3s ease',
          minWidth: 0,
          position: 'relative'
        }}>
          <Header />
          <main style={{ padding: sidebarState.value.isMobile ? '1rem' : '2rem', flex: 1, minHeight: 'calc(100vh - 80px)' }}>
            <RouterView />
          </main>
        </div>
      </div>
    );
  }
};
