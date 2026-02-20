import { ref, onMounted, computed } from 'vue';
import logo from '../../assets/logo.jpeg';
import PartnerChat from './PartnerChat.jsx';

export default {
  name: 'PartnerDashboard',
  setup() {
    const activeTab = ref('dashboard');
    const sidebarCollapsed = ref(false);
    const loading = ref(false);
    
    const partner = ref({ name: 'John Doe', specialization: 'Vedic Astrologer', email: 'john.doe@example.com' });
    const stats = computed(() => ({
      totalSessions: 156,
      completed: 142,
      totalEarning: 45200,
      pendingEarning: 3800
    }));

    const sessions = ref([
      { id: 1, client: 'Rahul Kumar', type: 'Chat', amount: 500, date: '2024-01-15', status: 'completed' },
      { id: 2, client: 'Priya Sharma', type: 'Voice', amount: 750, date: '2024-01-16', status: 'pending' },
      { id: 3, client: 'Amit Singh', type: 'Video', amount: 1200, date: '2024-01-17', status: 'completed' }
    ]);

    const toggleSidebar = () => {
      sidebarCollapsed.value = !sidebarCollapsed.value;
    };

    const handleLogout = () => {
      localStorage.removeItem('partner_token');
      sessionStorage.removeItem('partner_token');
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = '/partner/login';
    };

    onMounted(() => {
      const partnerData = localStorage.getItem('partner_data');
      if (partnerData) {
        try {
          const parsedData = JSON.parse(partnerData);
          partner.value = {
            name: parsedData.name || 'Partner',
            email: parsedData.email || 'partner@example.com',
            specialization: parsedData.specialization || 'Astrologer'
          };
        } catch (error) {
          console.error('Error parsing partner data:', error);
        }
      }
    });

    const StatsCard = ({ title, value, icon, color = 'blue' }) => (
      <div style="background-color: white; border-radius: 12px; box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1); border: 1px solid #f3f4f6; padding: 24px;">
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <div>
            <p style="font-size: 14px; font-weight: 500; color: #6b7280;">{title}</p>
            <p style="font-size: 30px; font-weight: bold; color: #111827;">{value}</p>
          </div>
          <div style={`width: 48px; height: 48px; background-color: ${color === 'blue' ? '#dbeafe' : color === 'green' ? '#d1fae5' : color === 'yellow' ? '#fef3c7' : '#fed7aa'}; border-radius: 8px; display: flex; align-items: center; justify-content: center;`}>
            <span style="font-size: 24px;">{icon}</span>
          </div>
        </div>
      </div>
    );

    const Badge = ({ status }) => (
      <span style={`display: inline-flex; padding: 4px 12px; font-size: 12px; font-weight: 600; border-radius: 9999px; ${
        status === 'completed' ? 'background-color: #d1fae5; color: #065f46;' :
        status === 'pending' ? 'background-color: #fef3c7; color: #92400e;' :
        'background-color: #f3f4f6; color: #374151;'
      }`}>
        {status}
      </span>
    );

    const renderDashboard = () => (
      <div style="display: flex; flex-direction: column; gap: 24px;">
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 24px;">
          <StatsCard title="Total Sessions" value={stats.value.totalSessions} icon={<svg style="width: 24px; height: 24px;" fill="currentColor" viewBox="0 0 20 20"><path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"/></svg>} color="blue" />
          <StatsCard title="Completed" value={stats.value.completed} icon={<svg style="width: 24px; height: 24px;" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>} color="green" />
          <StatsCard title="Total Earning" value={`₹${stats.value.totalEarning.toLocaleString()}`} icon={<svg style="width: 24px; height: 24px;" fill="currentColor" viewBox="0 0 20 20"><path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z"/><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd"/></svg>} color="yellow" />
          <StatsCard title="Pending" value={`₹${stats.value.pendingEarning.toLocaleString()}`} icon={<svg style="width: 24px; height: 24px;" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"/></svg>} color="orange" />
        </div>
        
        <div style="background-color: white; border-radius: 12px; box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1); border: 1px solid #f3f4f6;">
          <div style="padding: 24px; border-bottom: 1px solid #e5e7eb;">
            <h3 style="font-size: 18px; font-weight: 600; color: #1f2937;">Recent Sessions</h3>
          </div>
          <div style="padding: 24px;">
            <div style="display: flex; flex-direction: column; gap: 16px;">
              {sessions.value.slice(0, 3).map(session => (
                <div key={session.id} style="display: flex; align-items: center; justify-content: space-between; padding: 16px; background-color: #f9fafb; border-radius: 8px;">
                  <div>
                    <p style="font-weight: 500; color: #111827;">{session.client}</p>
                    <p style="font-size: 14px; color: #6b7280;">{session.type} Session</p>
                  </div>
                  <div style="text-align: right;">
                    <p style="font-weight: 600; color: #111827;">₹{session.amount}</p>
                    <Badge status={session.status} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );

    const renderPlaceholder = (title) => (
      <div style="background-color: white; border-radius: 12px; box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1); border: 1px solid #f3f4f6; padding: 48px; text-align: center;">
        <div style="margin-bottom: 16px;">
          <svg style="width: 64px; height: 64px; color: #9ca3af; margin: 0 auto;" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
          </svg>
        </div>
        <h2 style="font-size: 24px; font-weight: bold; color: #1f2937; margin-bottom: 8px;">{title}</h2>
        <p style="color: #6b7280;">This section is under development</p>
      </div>
    );

    const renderContent = () => {
      switch (activeTab.value) {
        case 'dashboard':
          return renderDashboard();
        case 'analytics':
          return renderPlaceholder('Analytics');
        case 'chat':
          return <PartnerChat />;
        case 'voice':
          return renderPlaceholder('Voice Sessions');
        case 'video':
          return renderPlaceholder('Video Sessions');
        case 'payments':
          return (
            <iframe
              src="/partner/earnings"
              style="border: none; width: 100%; height: calc(100vh - 140px);"
              title="Earnings History"
            />
          );
        case 'profile':
          return renderPlaceholder('Profile Settings');
        default:
          return renderDashboard();
      }
    };

    return () => (
      <div style="position: relative; min-height: 100vh; background-color: #f9fafb; margin: 0; padding: 0;">
        {/* Mobile Overlay */}
        {sidebarCollapsed.value && window.innerWidth < 1024 && (
          <div 
            style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(0, 0, 0, 0.5); z-index: 40;"
            onClick={toggleSidebar}
          />
        )}
        
        {/* Fixed Sidebar */}
        <div style={`position: fixed; top: 0; left: 0; width: ${sidebarCollapsed.value ? '80px' : '260px'}; height: 100vh; background: linear-gradient(180deg, #1a1a2e 0%, #16213e 100%); box-shadow: 2px 0 8px rgba(0,0,0,0.1); z-index: 50; transition: width 0.3s ease;`}>
          {/* Sidebar Header */}
          <div style="display: flex; align-items: center; justify-content: center; height: 80px; padding: 0 24px; border-bottom: 1px solid #2d2d3e; margin: 0;">
            <div style="display: flex; align-items: center; justify-content: center; gap: 12px;">
              <img 
                src={logo} 
                alt="Brahmakosh Logo" 
                style="width: 40px; height: 40px; border-radius: 8px; object-fit: contain;"
              />
              {!sidebarCollapsed.value && (
                <div>
                  <div style="font-size: 18px; font-weight: bold; color: white; line-height: 1.2;">BrahmKosh</div>
                  <div style="font-size: 11px; color: #9ca3af; line-height: 1;">Partner Dashboard</div>
                </div>
              )}
            </div>
          </div>
          
          {/* Navigation */}
          <nav style="margin-top: 24px; padding: 0 12px;">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: <svg style="width: 18px; height: 18px;" fill="currentColor" viewBox="0 0 20 20"><path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"/></svg> },
              { id: 'analytics', label: 'Analytics', icon: <svg style="width: 18px; height: 18px;" fill="currentColor" viewBox="0 0 20 20"><path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"/></svg> },
              { id: 'chat', label: 'Chat', icon: <svg style="width: 18px; height: 18px;" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd"/></svg> },
              { id: 'voice', label: 'Voice', icon: <svg style="width: 18px; height: 18px;" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd"/></svg> },
              { id: 'video', label: 'Video', icon: <svg style="width: 18px; height: 18px;" fill="currentColor" viewBox="0 0 20 20"><path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z"/></svg> },
              { id: 'payments', label: 'Payments', icon: <svg style="width: 18px; height: 18px;" fill="currentColor" viewBox="0 0 20 20"><path d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zM14 6a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2h8zM6 10a1 1 0 011-1h2a1 1 0 110 2H7a1 1 0 01-1-1zm5 0a1 1 0 011-1h1a1 1 0 110 2h-1a1 1 0 01-1-1z"/></svg> },
              { id: 'profile', label: 'Profile', icon: <svg style="width: 18px; height: 18px;" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"/></svg> }
            ].map(item => (
              <button
                key={item.id}
                onClick={() => {
                  activeTab.value = item.id;
                  if (window.innerWidth < 1024) {
                    sidebarCollapsed.value = false;
                  }
                }}
                style={`width: 100%; display: flex; align-items: center; gap: 12px; padding: 12px; margin-bottom: 4px; text-align: left; border-radius: 8px; transition: all 0.2s; border: none; cursor: pointer; justify-content: ${sidebarCollapsed.value ? 'center' : 'flex-start'}; ${
                  activeTab.value === item.id
                    ? 'background: #2d2d3e; color: #6366f1; border-left: 3px solid #6366f1;'
                    : 'color: #b4b4c0; background: transparent;'
                }`}
              >
                <span style="font-size: 18px;">{item.icon}</span>
                <span style={`font-weight: 500; ${sidebarCollapsed.value ? 'display: none;' : ''}`}>{item.label}</span>
              </button>
            ))}
          </nav>
          
          {/* Logout Button */}
          <div style="position: absolute; bottom: 0; width: 100%; padding: 24px; border-top: 1px solid #2d2d3e; z-index: 100;">
            <div
              onClick={handleLogout}
              style={`width: 100%; display: flex; align-items: center; gap: 12px; padding: 12px; color: #b4b4c0; background: transparent; border: none; border-radius: 8px; transition: background-color 0.2s; cursor: pointer; justify-content: ${sidebarCollapsed.value ? 'center' : 'flex-start'};`}
            >
              <span style="font-size: 18px;">
                <svg style="width: 18px; height: 18px;" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd"/>
                </svg>
              </span>
              {!sidebarCollapsed.value && (
                <span style="font-weight: 500;">Logout</span>
              )}
            </div>
          </div>
        </div>
        
        {/* Fixed Navbar */}
        <div style={`position: fixed; top: 0; left: ${sidebarCollapsed.value ? '80px' : '260px'}; right: 0; height: 64px; background-color: white; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border-bottom: 1px solid #e5e7eb; z-index: 30; margin: 0; padding: 0; transition: left 0.3s ease;`}>
          <div style="display: flex; align-items: center; justify-content: space-between; height: 100%; padding: 0 24px; margin: 0;">
            <div style="display: flex; align-items: center; gap: 16px;">
              <button 
                onClick={toggleSidebar} 
                style="display: flex; padding: 8px; border-radius: 6px; background: none; border: none; cursor: pointer;"
              >
                <svg style="width: 24px; height: 24px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              
              <h1 style="font-size: 24px; font-weight: bold; color: #1f2937; text-transform: capitalize; margin: 0;">{activeTab.value}</h1>
            </div>
            
            <div style="display: flex; align-items: center; gap: 16px;">
              <div style="display: flex; align-items: center; gap: 12px;">
                <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #7c3aed, #2563eb); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                  <span style="color: white; font-weight: 600; font-size: 14px;">
                    {partner.value.name?.charAt(0) || 'P'}
                  </span>
                </div>
                <div style={`display: ${window.innerWidth >= 768 ? 'block' : 'none'};`}>
                  <div style="font-weight: 600; color: #1f2937; font-size: 14px;">{partner.value.name}</div>
                  <div style="font-size: 12px; color: #6b7280;">{partner.value.email}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Main Content */}
        <div style={`margin-left: ${sidebarCollapsed.value ? '80px' : '260px'}; padding-top: 64px; min-height: 100vh; transition: margin-left 0.3s ease;`}>
          <main style={activeTab.value === 'chat' ? 'padding: 0;' : 'padding: 24px;'}>
            {renderContent()}
          </main>
        </div>
        
        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          body { margin: 0; padding: 0; overflow-x: hidden; }
        `}</style>
      </div>
    );
  }
};