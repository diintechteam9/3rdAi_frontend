import { ref } from 'vue';
import AreaAssignment from './AreaAssignment.jsx';
import GeoTracking from '../shared/GeoTracking.jsx';

export default {
    name: 'AllAreas',
    components: {
        AreaAssignment,
        GeoTracking
    },
    setup() {
        const activeTab = ref('geo-tracking'); // Default to Geo Tracking

        return {
            activeTab
        };
    },
    render() {
        const { activeTab } = this;

        const tabStyle = (tabId) => ({
            padding: '12px 24px',
            cursor: 'pointer',
            fontSize: '15px',
            fontWeight: '600',
            transition: 'all 0.3s ease',
            borderBottom: activeTab === tabId ? '3px solid #6366f1' : '3px solid transparent',
            color: activeTab === tabId ? '#6366f1' : '#94a3b8',
            background: activeTab === tabId ? 'rgba(99, 102, 241, 0.05)' : 'transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
        });

        return (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#f8fafc' }}>
                {/* Tab Header */}
                <div style={{
                    background: 'white',
                    borderBottom: '1px solid #e2e8f0',
                    display: 'flex',
                    padding: '0 28px',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                }}>
                    <div
                        style={tabStyle('geo-tracking')}
                        onClick={() => this.activeTab = 'geo-tracking'}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
                        </svg>
                        Map
                    </div>
                    <div
                        style={tabStyle('area-assignment')}
                        onClick={() => this.activeTab = 'area-assignment'}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                        </svg>
                        Area Assignment
                    </div>
                </div>

                {/* Tab Content */}
                <div style={{ flex: 1, overflow: 'auto' }}>
                    {activeTab === 'geo-tracking' ? <GeoTracking /> : <AreaAssignment />}
                </div>
            </div>
        );
    }
};
