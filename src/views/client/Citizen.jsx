import { ref } from 'vue';
import AllReports from './AllReports.jsx';
import Users from './Users.jsx';

export default {
  name: 'CitizenContainer',
  setup() {
    const activeTab = ref('reports'); // 'reports' | 'users'

    return () => (
      <div style={{ background: '#f8fafc', minHeight: '100vh' }}>
        {/* Tab Navigation */}
        <div style={{ 
          background: 'white', 
          padding: '0 24px', 
          borderBottom: '1px solid #e2e8f0',
          position: 'sticky',
          top: 0,
          zIndex: 10
        }}>
          <div style={{ display: 'flex', gap: '32px' }}>
            <button
              onClick={() => activeTab.value = 'reports'}
              style={{
                padding: '16px 4px',
                fontSize: '14px',
                fontWeight: '600',
                color: activeTab.value === 'reports' ? '#6366f1' : '#64748b',
                background: 'transparent',
                border: 'none',
                borderBottom: `2px solid ${activeTab.value === 'reports' ? '#6366f1' : 'transparent'}`,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              Citizen Reports
            </button>
            <button
              onClick={() => activeTab.value = 'users'}
              style={{
                padding: '16px 4px',
                fontSize: '14px',
                fontWeight: '600',
                color: activeTab.value === 'users' ? '#6366f1' : '#64748b',
                background: 'transparent',
                border: 'none',
                borderBottom: `2px solid ${activeTab.value === 'users' ? '#6366f1' : 'transparent'}`,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              Citizens
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div style={{ transition: 'all 0.3s ease' }}>
          {activeTab.value === 'reports' ? (
            <AllReports />
          ) : (
            <Users />
          )}
        </div>
      </div>
    );
  }
};
