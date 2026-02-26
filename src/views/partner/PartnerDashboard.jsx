import { ref, onMounted, computed, watch } from 'vue';
import logo from '../../assets/logo.png';
import PartnerAIChat from './PartnerAIChat.jsx';
import PartnerProfile from './PartnerProfile.jsx';
import PartnerAlerts from './PartnerAlerts.jsx';
import MobileVoicePage from '../mobile/MobileVoicePage.jsx';
import PartnerChat from './PartnerChat.jsx';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export default {
  name: 'PartnerDashboard',
  setup() {
    const activeTab = ref('home');
    const isAiPoliceOpen = ref(false);
    const sidebarCollapsed = ref(false);

    // Partner info
    const partner = ref({ name: '', specialization: '', email: '' });

    // Alerts state
    const alerts = ref([]);
    const alertsTotal = ref(0);
    const alertsNew = ref(0);
    const alertsLoading = ref(false);

    // Announcements state
    const announcements = ref([]);
    const announcementsTotal = ref(0);
    const announcementsNew = ref(0);
    const announcementsLoading = ref(false);

    // Pending chat requests count (for sidebar badge)
    const pendingChatRequests = ref(0);

    const loadPendingChatCount = async () => {
      try {
        const token = localStorage.getItem('partner_token');
        if (!token) return;
        const res = await fetch(`${API_BASE_URL}/chat/partner/requests`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success && data.data) {
          pendingChatRequests.value = data.data.totalRequests || data.data.requests?.length || 0;
        }
      } catch (e) {
        console.warn('[Dashboard] Could not load pending chat count:', e.message);
      }
    };

    const getToken = () => localStorage.getItem('partner_token');

    // ── Fetch Alerts ─────────────────────────────────────────────────────────
    const loadAlerts = async () => {
      const token = getToken();
      if (!token) return;
      alertsLoading.value = true;
      try {
        const res = await fetch(`${API_BASE_URL}/alerts/partner?limit=5`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
          alerts.value = data.data.alerts || [];
          alertsTotal.value = data.data.total || 0;
          alertsNew.value = data.data.newCount || 0;
        }
      } catch (e) {
        console.error('[Dashboard] loadAlerts error:', e);
      } finally {
        alertsLoading.value = false;
      }
    };

    // ── Fetch Announcements ───────────────────────────────────────────────────
    const loadAnnouncements = async () => {
      const token = getToken();
      if (!token) return;
      announcementsLoading.value = true;
      try {
        const res = await fetch(`${API_BASE_URL}/announcements/partner?limit=5`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
          announcements.value = data.data.announcements || [];
          announcementsTotal.value = data.data.total || 0;
          announcementsNew.value = data.data.newCount || 0;
        }
      } catch (e) {
        console.error('[Dashboard] loadAnnouncements error:', e);
      } finally {
        announcementsLoading.value = false;
      }
    };

    // Reload home data when home tab is activated
    const loadHomeData = () => {
      loadAlerts();
      loadAnnouncements();
      loadPendingChatCount();
    };

    watch(activeTab, (tab) => {
      if (tab === 'home') loadHomeData();
    });

    const toggleSidebar = () => { sidebarCollapsed.value = !sidebarCollapsed.value; };

    const handleLogout = () => {
      localStorage.removeItem('partner_token');
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = '/partner/login';
    };

    onMounted(() => {
      const partnerData = localStorage.getItem('partner_data');
      if (partnerData) {
        try {
          const p = JSON.parse(partnerData);
          partner.value = {
            name: p.name || 'Partner',
            email: p.email || '',
            specialization: p.specialization || ''
          };
        } catch (e) { console.error('Error parsing partner data:', e); }
      }
      loadHomeData();
    });

    // ── Priority config ────────────────────────────────────────────────────
    const priorityConfig = {
      critical: { bg: '#fee2e2', border: '#fca5a5', color: '#991b1b', badge: '#ef4444', label: '🚨 Critical' },
      high: { bg: '#fff7ed', border: '#fed7aa', color: '#9a3412', badge: '#f97316', label: '🔴 High' },
      medium: { bg: '#fefce8', border: '#fde68a', color: '#92400e', badge: '#f59e0b', label: '🟡 Medium' },
      low: { bg: '#eff6ff', border: '#bfdbfe', color: '#1e40af', badge: '#3b82f6', label: '🔵 Low' }
    };

    const StatsCard = ({ title, value, icon, color, loading }) => (
      <div style="background-color: white; border-radius: 12px; box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1); border: 1px solid #f3f4f6; padding: 24px;">
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <div>
            <p style="font-size: 14px; font-weight: 500; color: #6b7280;">{title}</p>
            <p style="font-size: 28px; font-weight: bold; color: #111827; margin-top: 4px;">
              {loading ? <span style="font-size: 18px; color: #9ca3af;">...</span> : value}
            </p>
          </div>
          <div style={`width: 48px; height: 48px; background-color: ${color}; border-radius: 8px; display: flex; align-items: center; justify-content: center;`}>
            <span style="font-size: 22px;">{icon}</span>
          </div>
        </div>
      </div>
    );

    const Badge = ({ status }) => (
      <span style={`display: inline-flex; padding: 4px 12px; font-size: 12px; font-weight: 600; border-radius: 9999px; ${status === 'ended' ? 'background-color: #d1fae5; color: #065f46;' :
        status === 'active' ? 'background-color: #fef3c7; color: #92400e;' :
          'background-color: #f3f4f6; color: #374151;'}`}>
        {status === 'ended' ? 'completed' : status}
      </span>
    );

    const renderDashboard = () => (
      <div style="display: flex; flex-direction: column; gap: 24px;">

        {/* ── Row 1: Alerts + Announcements counts ──────────────────── */}
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px;">
          <StatsCard
            title="Total Alerts"
            value={alertsLoading.value ? '...' : alertsTotal.value}
            icon="🔔"
            color="#fce7f3"
            loading={false}
          />
          <StatsCard
            title="New Announcements"
            value={announcementsLoading.value ? '...' : announcementsNew.value}
            icon="📢"
            color="#ede9fe"
            loading={false}
          />
        </div>

        {/* ── Row 2+3: Alerts & Announcements — side by side ─────────── */}
        <div style="display: flex; gap: 16px; align-items: flex-start;">

          {/* ── Alerts (left) ───────────────────────────────────────── */}
          <div style="flex: 1; background: white; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); border: 1px solid #f3f4f6; overflow: hidden; min-width: 0;">
            <div style="padding: 18px 24px; border-bottom: 1px solid #f3f4f6; display: flex; align-items: center; justify-content: space-between;">
              <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 20px;">🔔</span>
                <h3 style="font-size: 16px; font-weight: 600; color: #1f2937; margin: 0;">Latest Alerts</h3>
                {alertsNew.value > 0 && (
                  <span style="background: #ef4444; color: white; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 999px;">
                    {alertsNew.value} new
                  </span>
                )}
              </div>
              <span style="font-size: 12px; color: #9ca3af;">Total: {alertsTotal.value}</span>
            </div>

            <div style="padding: 16px 24px; display: flex; flex-direction: column; gap: 10px; max-height: 360px; overflow-y: auto;">
              {alertsLoading.value ? (
                <p style="color: #9ca3af; text-align: center; padding: 20px 0;">Loading alerts...</p>
              ) : alerts.value.length === 0 ? (
                <div style="text-align: center; padding: 32px 0; color: #9ca3af;">
                  <div style="font-size: 36px; margin-bottom: 8px;">🎉</div>
                  <p style="margin: 0; font-size: 14px;">No active alerts right now</p>
                </div>
              ) : (
                alerts.value.map((alert, idx) => {
                  const cfg = priorityConfig[alert.priority] || priorityConfig.medium;
                  return (
                    <div key={alert._id || idx} style={`background: ${cfg.bg}; border: 1px solid ${cfg.border}; border-radius: 10px; padding: 14px 16px; display: flex; gap: 12px; align-items: flex-start;`}>
                      <div style={`width: 8px; height: 8px; border-radius: 50%; background: ${cfg.badge}; margin-top: 6px; flex-shrink: 0;`} />
                      <div style="flex: 1; min-width: 0;">
                        <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 4px;">
                          <span style="font-weight: 600; color: #1f2937; font-size: 14px;">{alert.title}</span>
                          <span style={`font-size: 11px; font-weight: 600; color: ${cfg.color};`}>{cfg.label}</span>
                          <span style={`font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; background: ${alert.type === 'USER' ? '#f3e8ff' : '#e0e7ff'}; color: ${alert.type === 'USER' ? '#7e22ce' : '#4338ca'}; border: 1px solid ${alert.type === 'USER' ? '#d8b4fe' : '#c7d2fe'};`}>
                            {alert.type === 'USER' ? '👥 USER' : '🏢 CLIENT'}
                          </span>
                        </div>
                        <p style="margin: 0; color: #4b5563; font-size: 13px; line-height: 1.5;">{alert.message}</p>
                        <p style="margin: 4px 0 0; color: #9ca3af; font-size: 11px;">
                          {new Date(alert.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* ── Announcements (right) ────────────────────────────────── */}
          <div style="flex: 1; background: white; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); border: 1px solid #f3f4f6; overflow: hidden; min-width: 0;">
            <div style="padding: 18px 24px; border-bottom: 1px solid #f3f4f6; display: flex; align-items: center; justify-content: space-between;">
              <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 20px;">📢</span>
                <h3 style="font-size: 16px; font-weight: 600; color: #1f2937; margin: 0;">Announcements</h3>
                {announcementsNew.value > 0 && (
                  <span style="background: #8b5cf6; color: white; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 999px;">
                    {announcementsNew.value} new
                  </span>
                )}
              </div>
              <span style="font-size: 12px; color: #9ca3af;">Total: {announcementsTotal.value}</span>
            </div>

            <div style="padding: 16px 24px; display: flex; flex-direction: column; gap: 10px; max-height: 360px; overflow-y: auto;">
              {announcementsLoading.value ? (
                <p style="color: #9ca3af; text-align: center; padding: 20px 0;">Loading announcements...</p>
              ) : announcements.value.length === 0 ? (
                <div style="text-align: center; padding: 32px 0; color: #9ca3af;">
                  <div style="font-size: 36px; margin-bottom: 8px;">📭</div>
                  <p style="margin: 0; font-size: 14px;">No announcements yet</p>
                </div>
              ) : (
                announcements.value.map((ann, idx) => (
                  <div key={ann._id || idx} style="background: linear-gradient(135deg, #f5f3ff, #ede9fe); border: 1px solid #ddd6fe; border-radius: 10px; padding: 16px;">
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                      <span style="font-size: 16px;">📣</span>
                      <span style="font-weight: 600; color: #4c1d95; font-size: 14px;">{ann.title}</span>
                    </div>
                    <p style="margin: 0 0 6px; color: #5b21b6; font-size: 13px; line-height: 1.6;">{ann.content}</p>
                    <p style="margin: 0; color: #a78bfa; font-size: 11px;">
                      {new Date(ann.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>
    );


    const renderPlaceholder = (title) => (
      <div style="background-color: white; border-radius: 12px; box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1); border: 1px solid #f3f4f6; padding: 48px; text-align: center;">
        <div style="margin-bottom: 16px;">
          <svg style="width: 64px; height: 64px; color: #9ca3af; margin: 0 auto;" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        </div>
        <h2 style="font-size: 24px; font-weight: bold; color: #1f2937; margin-bottom: 8px;">{title}</h2>
        <p style="color: #6b7280;">This section is under development</p>
      </div>
    );

    const renderContent = () => {
      switch (activeTab.value) {
        case 'home':
          return renderDashboard();
        case 'alert':
          return <PartnerAlerts />;
        case 'ai-police-chat':
          return <PartnerAIChat />;
        case 'ai-police-voice':
          return <MobileVoicePage />;
        case 'request':
          return <PartnerChat />;
        case 'profile':
          return <PartnerProfile />;
        case 'settings':
          return renderPlaceholder('Settings');
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
        <div style={`position: fixed; top: 0; left: 0; width: ${sidebarCollapsed.value ? '80px' : '260px'}; height: 100vh; background: linear-gradient(180deg, #1a1a2e 0%, #16213e 100%); box-shadow: 2px 0 8px rgba(0,0,0,0.1); z-index: 50; transition: width 0.3s ease; overflow-y: auto; overflow-x: hidden;`}>
          {/* Sidebar Header */}
          <div style="display: flex; align-items: center; justify-content: center; height: 120px; padding: 0 24px; border-bottom: 1px solid #2d2d3e; margin: 0; position: sticky; top: 0; background: inherit; z-index: 2;">
            <div style="display: flex; align-items: center; justify-content: center; gap: 12px;">
              <img
                src={logo}
                alt="3rdAI Logo"
                style="width: 80px; height: 80px; border-radius: 10px; object-fit: contain;"
              />
              {!sidebarCollapsed.value && (
                <div style="margin-left: 4px;">
                  <div style="font-size: 22px; font-weight: bold; color: white; line-height: 1.1;">3rdAI</div>
                  <div style="font-size: 12px; color: #9ca3af; line-height: 1.2; margin-top: 2px;">Partner Dashboard</div>
                </div>
              )}
            </div>
          </div>

          {/* Navigation */}
          <nav style="margin-top: 24px; padding: 0 12px; padding-bottom: 100px;">
            {[
              { id: 'home', label: 'Home', icon: <svg style="width: 18px; height: 18px;" fill="currentColor" viewBox="0 0 20 20"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" /></svg> },
              { id: 'alert', label: 'Alert', icon: <svg style="width: 18px; height: 18px;" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" /></svg> },
              {
                id: 'ai-police',
                label: 'AI-Police',
                icon: <svg style="width: 18px; height: 18px;" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>,
                subItems: [
                  { id: 'ai-police-chat', label: 'Chat', icon: <svg style="width: 16px; height: 16px;" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" /></svg> },
                  { id: 'ai-police-voice', label: 'Voice', icon: <svg style="width: 16px; height: 16px;" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" /></svg> }
                ]
              },
              {
                id: 'request',
                label: 'User Chat',
                badge: pendingChatRequests.value > 0 ? pendingChatRequests.value : null,
                icon: <svg style="width: 18px; height: 18px;" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" /></svg>
              },
              { id: 'profile', label: 'Profile', icon: <svg style="width: 18px; height: 18px;" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg> },
              { id: 'settings', label: 'Settings', icon: <svg style="width: 18px; height: 18px;" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" /></svg> }
            ].map(item => (
              <div key={item.id} style="margin-bottom: 4px;">
                <button
                  onClick={() => {
                    if (item.subItems) {
                      isAiPoliceOpen.value = !isAiPoliceOpen.value;
                      if (!sidebarCollapsed.value && !isAiPoliceOpen.value && activeTab.value.startsWith(item.id)) {
                        // Active tab remains as is even if collapsed visually
                      }
                    } else {
                      activeTab.value = item.id;
                      isAiPoliceOpen.value = false;
                    }
                    if (window.innerWidth < 1024) {
                      // sidebarCollapsed.value = false;
                    }
                  }}
                  style={`width: 100%; display: flex; align-items: center; justify-content: space-between; padding: 12px; text-align: left; border-radius: 8px; transition: all 0.2s; border: none; cursor: pointer; ${(activeTab.value === item.id || (item.subItems && activeTab.value.startsWith(item.id)))
                    ? 'background: #2d2d3e; color: #6366f1; border-left: 3px solid #6366f1;'
                    : 'color: #b4b4c0; background: transparent;'
                    } ${sidebarCollapsed.value ? 'justify-content: center;' : ''}`}
                >
                  <div style={`display: flex; align-items: center; gap: 12px; ${sidebarCollapsed.value ? 'justify-content: center;' : ''}`}>
                    <span style="font-size: 18px; position: relative;">
                      {item.icon}
                      {item.badge && (
                        <span style="position: absolute; top: -6px; right: -6px; background: #ef4444; color: white; font-size: 9px; font-weight: 700; padding: 2px 5px; border-radius: 999px; line-height: 1.2;">{item.badge}</span>
                      )}
                    </span>
                    <span style={`font-weight: 500; ${sidebarCollapsed.value ? 'display: none;' : ''}`}>{item.label}</span>
                  </div>
                  {item.subItems && !sidebarCollapsed.value && (
                    <span style={`transition: transform 0.2s; ${isAiPoliceOpen.value ? 'transform: rotate(180deg);' : ''}`}>
                      <svg style="width: 16px; height: 16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
                    </span>
                  )}
                </button>

                {/* Sub-menu rendering */}
                {item.subItems && isAiPoliceOpen.value && !sidebarCollapsed.value && (
                  <div style="margin-top: 4px; display: flex; flex-direction: column; gap: 2px;">
                    {item.subItems.map(sub => (
                      <button
                        key={sub.id}
                        onClick={() => {
                          activeTab.value = sub.id;
                          if (window.innerWidth < 1024) sidebarCollapsed.value = false;
                        }}
                        style={`width: 100%; display: flex; align-items: center; gap: 12px; padding: 10px 12px 10px 42px; text-align: left; border-radius: 8px; transition: all 0.2s; border: none; cursor: pointer; ${activeTab.value === sub.id
                          ? 'background: rgba(99, 102, 241, 0.1); color: #818cf8;'
                          : 'color: #8b8b9b; background: transparent;'
                          }`}
                      >
                        <span style="font-size: 14px;">{sub.icon}</span>
                        <span style="font-weight: 400; font-size: 14px;">{sub.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>

          {/* Logout Button */}
          <div style={`position: fixed; bottom: 0; width: ${sidebarCollapsed.value ? '80px' : '260px'}; padding: 24px; border-top: 1px solid #2d2d3e; background: #16213e; z-index: 100; transition: width 0.3s ease;`}>
            <div
              onClick={handleLogout}
              style={`width: 100%; display: flex; align-items: center; gap: 12px; padding: 12px; color: #b4b4c0; background: transparent; border: none; border-radius: 8px; transition: background-color 0.2s; cursor: pointer; justify-content: ${sidebarCollapsed.value ? 'center' : 'flex-start'};`}
            >
              <span style="font-size: 18px;">
                <svg style="width: 18px; height: 18px;" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
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

              <h1 style="font-size: 24px; font-weight: bold; color: #1f2937; text-transform: capitalize; margin: 0;">
                {activeTab.value === 'request' ? 'User Chat' : activeTab.value.includes('ai-police-') ? `AI Police - ${activeTab.value.split('-')[2]}` : activeTab.value}
              </h1>
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
          <main style={(activeTab.value === 'ai-police-chat' || activeTab.value === 'request') ? 'padding: 0; height: calc(100vh - 64px);' : 'padding: 24px;'}>
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