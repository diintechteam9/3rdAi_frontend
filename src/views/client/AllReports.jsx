import { ref, onMounted } from 'vue';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export default {
  name: 'ClientAllReports',
  setup() {
    const reports = ref([]);
    const loading = ref(false);
    const selectedReport = ref(null); // Used for viewing details modal

    const getToken = () =>
      localStorage.getItem('token_client') ||
      localStorage.getItem('token_admin') ||
      localStorage.getItem('token_super_admin');

    const fetchReports = async () => {
      loading.value = true;
      try {
        const res = await fetch(`${API_BASE_URL}/alerts?type=USER`, {
          headers: { Authorization: `Bearer ${getToken()}` }
        });
        const data = await res.json();
        if (data.success) {
          reports.value = data.data.alerts || [];
        }
      } catch (e) {
        console.error('[AllReports] fetch:', e);
      } finally {
        loading.value = false;
      }
    };

    const priorityConfig = {
      critical: { color: '#ef4444', bg: '#fee2e2', label: '🚨 Critical' },
      high: { color: '#f97316', bg: '#fff7ed', label: '🔴 High' },
      medium: { color: '#f59e0b', bg: '#fefce8', label: '🟡 Medium' },
      low: { color: '#3b82f6', bg: '#eff6ff', label: '🔵 Low' }
    };

    const getCaseName = (typeId) => {
      const names = {
        'robbery': 'Robbery',
        'unidentified_emergency': 'Emergency / Unknown',
        'snatching': 'Snatching',
        'theft': 'Theft',
        'harassment': 'Harassment / Suspicious Activity',
        'accident': 'Accident',
        'camera_issue': 'Camera / Safety Issue'
      };
      return names[typeId] || typeId || 'Other';
    };

    onMounted(fetchReports);

    return () => (
      <div style={{ padding: '24px', fontFamily: "'Inter','Segoe UI',sans-serif", background: '#f8fafc', minHeight: '100vh', position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#111827', margin: '0 0 6px' }}>📋 All Citizen Reports</h1>
            <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>View all complaints and cases reported by users</p>
          </div>
          <button onClick={fetchReports} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', color: '#334155', fontSize: '14px', fontWeight: '500', cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', transition: 'background 0.2s' }}>
            🔄 Refresh
          </button>
        </div>

        {loading.value ? (
          <div style={{ textAlign: 'center', padding: '80px 20px', color: '#64748b' }}>
            <div style={{ width: 40, height: 40, border: '3px solid #e2e8f0', borderTop: '3px solid #6366f1', borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 1s linear infinite' }}></div>
            Fetching recent reports...
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : reports.value.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', background: 'white', borderRadius: '16px', border: '1px dashed #cbd5e1' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🛡️</div>
            <h3 style={{ margin: '0 0 8px', color: '#1e293b', fontSize: '18px' }}>No Reports Yet</h3>
            <p style={{ color: '#64748b', margin: 0 }}>There are no citizen complaints reported to your portal at this moment.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
            {reports.value.map(report => {
              const cfg = priorityConfig[report.priority] || priorityConfig.medium;
              const meta = report.metadata || {};
              const typeName = getCaseName(meta.type);

              return (
                <div key={report._id} style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '11px', fontWeight: '600', color: cfg.color, background: cfg.bg, padding: '4px 10px', borderRadius: '999px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{cfg.label}</span>
                      <span style={{ fontSize: '11px', fontWeight: '600', color: '#475569', background: '#f1f5f9', padding: '4px 10px', borderRadius: '999px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{typeName}</span>
                    </div>
                    {meta.isAnonymous && <span style={{ fontSize: '18px' }} title="Anonymous Report">🕵️‍♂️</span>}
                  </div>

                  <h3 style={{ margin: '0 0 8px', fontSize: '17px', color: '#0f172a', fontWeight: '600', lineHeight: '1.4' }}>{report.title}</h3>

                  <p style={{ color: '#475569', fontSize: '14px', margin: '0 0 16px', lineHeight: '1.5', flex: 1 }}>
                    {report.message.length > 100 ? report.message.substring(0, 100) + '...' : report.message}
                  </p>

                  <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #f1f5f9', fontSize: '13px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
                      <span style={{ fontSize: '16px' }}>📍</span>
                      <span style={{ color: '#334155', lineHeight: '1.4', wordBreak: 'break-word' }}>{meta.location || 'Location not provided'}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '16px' }}>🕒</span>
                      <span style={{ color: '#64748b' }}>{meta.dateTime ? new Date(meta.dateTime).toLocaleString() : new Date(report.createdAt).toLocaleString()}</span>
                    </div>
                  </div>

                  <div style={{ marginTop: '16px', borderTop: '1px solid #e2e8f0', paddingTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                    <button onClick={() => selectedReport.value = report} style={{ background: 'transparent', border: 'none', color: '#6366f1', fontSize: '14px', fontWeight: '600', cursor: 'pointer', padding: 0, transition: 'color 0.2s' }}>View Full Details →</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Details modal */}
        {selectedReport.value && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={() => selectedReport.value = null}>
            <div style={{ background: 'white', borderRadius: '16px', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', padding: '24px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', position: 'relative' }} onClick={(e) => e.stopPropagation()}>
              <button onClick={() => selectedReport.value = null} style={{ position: 'absolute', top: '16px', right: '16px', width: '32px', height: '32px', borderRadius: '50%', background: '#f1f5f9', border: 'none', color: '#475569', fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>

              <h2 style={{ margin: '0 0 16px', color: '#0f172a', paddingRight: '40px', fontSize: '20px' }}>{selectedReport.value.title}</h2>

              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
                <p style={{ margin: 0, color: '#334155', fontSize: '15px', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{selectedReport.value.message}</p>
              </div>

              <h4 style={{ margin: '0 0 12px', color: '#475569', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Report Specifics</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '20px' }}>
                {Object.entries(selectedReport.value.metadata || {}).map(([key, value]) => {
                  if (key === 'type' || key === 'description' || !value) return null; // skip redundant details
                  const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                  return (
                    <div key={key} style={{ background: '#f1f5f9', padding: '10px 14px', borderRadius: '8px' }}>
                      <div style={{ color: '#64748b', fontSize: '12px', marginBottom: '4px' }}>{formattedKey}</div>
                      <div style={{ color: '#0f172a', fontSize: '14px', fontWeight: '500' }}>{typeof value === 'boolean' ? (value ? 'Yes' : 'No') : value}</div>
                    </div>
                  )
                })}
              </div>

              <div style={{ background: '#fffbeb', border: '1px solid #fef3c7', padding: '12px 16px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '20px' }}>📅</span>
                <div>
                  <div style={{ color: '#92400e', fontSize: '12px', fontWeight: '600' }}>Reported At</div>
                  <div style={{ color: '#b45309', fontSize: '14px' }}>{new Date(selectedReport.value.createdAt).toLocaleString()}</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
};
