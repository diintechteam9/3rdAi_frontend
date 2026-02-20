// frontend/src/components/kundali/BirthChart.jsx

import { ref } from 'vue';
import KundaliChartViewer from './KundaliChartViewer.jsx';

export default {
  name: 'BirthChart',
  props: {
    data: {
      type: Object,
      default: () => ({})
    }
  },
  setup(props) {
    const activeSubTab = ref('planet-chart');

    const subTabs = [
      { 
        id: 'planet-chart', 
        label: 'Main Chart', 
        icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
      },
      { 
        id: 'planet-extended-chart', 
        label: 'Extended Chart', 
        icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><path d="M9 9h6v6H9z"/></svg>
      }
    ];

    const getChartData = (type) => {
      if (!props.data) {
        console.warn('No data provided to BirthChart component');
        return null;
      }
      
      let chartData = null;
      
      if (type === 'planet-chart') {
        chartData = props.data.birthChart || props.data.planetChart || props.data.chart;
      } else if (type === 'planet-extended-chart') {
        chartData = props.data.birthExtendedChart || props.data.planetExtendedChart || props.data.extendedChart;
      }

      // Validate chart data structure
      if (chartData && chartData.houses) {
        // Check if houses have any data
        const hasHouseData = Object.keys(chartData.houses).length > 0;
        if (!hasHouseData) {
          console.warn(`Chart ${type} has empty houses object`);
          return null;
        }
        return chartData;
      }

      console.warn(`No valid chart data found for ${type}`);
      return null;
    };

    const hasAnyChartData = () => {
      const mainChart = getChartData('planet-chart');
      const extendedChart = getChartData('planet-extended-chart');
      return !!(mainChart || extendedChart);
    };

    const getChartTitle = (type) => {
      if (type === 'planet-chart') return 'Birth Chart (Lagna Kundali)';
      if (type === 'planet-extended-chart') return 'Extended Chart (Navamsa)';
      return 'Birth Chart';
    };

    return () => (
      <div class="birth-chart">
        <div class="card border-0 shadow-lg rounded-4 overflow-hidden">
          <div class="card-header bg-gradient-info text-white p-4">
            <h5 class="mb-0 d-flex align-items-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" class="me-3">
                <circle cx="12" cy="12" r="10"/>
                <polygon points="10,8 16,12 10,16 10,8"/>
              </svg>
              <span>Birth Chart Analysis</span>
            </h5>
          </div>
          <div class="card-body p-0">
            {!hasAnyChartData() ? (
              <div class="p-5 text-center">
                <div class="mb-4">
                  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" class="text-warning chart-icon">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 6v6l4 2"/>
                  </svg>
                </div>
                <h6 class="text-muted mb-3">Birth Chart Data Unavailable</h6>
                <p class="text-muted mb-0">Complete birth details with accurate time and location are required to generate birth charts.</p>
                <div class="mt-4">
                  <div class="alert alert-info text-start d-inline-block">
                    <strong>Required Information:</strong>
                    <ul class="mb-0 mt-2">
                      <li>Date of Birth</li>
                      <li>Time of Birth (accurate to the minute)</li>
                      <li>Place of Birth (Latitude & Longitude)</li>
                    </ul>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <nav class="nav nav-tabs border-bottom bg-light">
                  {subTabs.map(tab => {
                    const hasData = getChartData(tab.id) !== null;
                    return (
                      <button
                        key={tab.id}
                        class={`nav-link d-flex align-items-center gap-2 ${activeSubTab.value === tab.id ? 'active' : ''}`}
                        onClick={() => hasData && (activeSubTab.value = tab.id)}
                        disabled={!hasData}
                      >
                        {tab.icon}
                        <span>{tab.label}</span>
                        {!hasData && (
                          <span class="badge bg-secondary ms-2">No Data</span>
                        )}
                      </button>
                    );
                  })}
                </nav>

                <div class="p-4">
                  <div class="chart-container">
                    {activeSubTab.value === 'planet-chart' && getChartData('planet-chart') && (
                      <KundaliChartViewer 
                        chart={getChartData('planet-chart')}
                        title={getChartTitle('planet-chart')}
                      />
                    )}
                    
                    {activeSubTab.value === 'planet-extended-chart' && getChartData('planet-extended-chart') && (
                      <KundaliChartViewer 
                        chart={getChartData('planet-extended-chart')}
                        title={getChartTitle('planet-extended-chart')}
                      />
                    )}

                    {/* Fallback if chart data becomes unavailable */}
                    {activeSubTab.value === 'planet-chart' && !getChartData('planet-chart') && (
                      <div class="alert alert-warning">
                        <i class="fas fa-exclamation-triangle me-2"></i>
                        Main chart data is not available.
                      </div>
                    )}

                    {activeSubTab.value === 'planet-extended-chart' && !getChartData('planet-extended-chart') && (
                      <div class="alert alert-warning">
                        <i class="fas fa-exclamation-triangle me-2"></i>
                        Extended chart data is not available.
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <style jsx>{`
          .bg-gradient-info {
            background: linear-gradient(135deg, #17a2b8, #138496);
          }

          .chart-icon {
            animation: rotate 4s linear infinite;
          }
          
          @keyframes rotate {
            from {
              transform: rotate(0deg);
            }
            to {
              transform: rotate(360deg);
            }
          }
          
          .chart-container {
            perspective: 1000px;
            transform-style: preserve-3d;
            min-height: 400px;
          }
          
          .nav-tabs {
            border-bottom: 2px solid #dee2e6;
          }

          .nav-tabs .nav-link {
            border: none;
            color: #6c757d;
            padding: 1rem 1.5rem;
            transition: all 0.3s ease;
            background: transparent;
            border-bottom: 3px solid transparent;
            font-weight: 500;
          }
          
          .nav-tabs .nav-link:hover:not(:disabled) {
            color: #007bff;
            background: rgba(0, 123, 255, 0.05);
            border-bottom-color: rgba(0, 123, 255, 0.3);
          }
          
          .nav-tabs .nav-link.active {
            background: linear-gradient(135deg, rgba(0, 123, 255, 0.1), rgba(0, 86, 179, 0.1));
            color: #007bff;
            border-bottom-color: #007bff;
            font-weight: 600;
          }
          
          .nav-tabs .nav-link:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            background: transparent;
          }
          
          .badge {
            font-size: 0.65rem;
            padding: 0.25rem 0.5rem;
          }

          .alert ul {
            padding-left: 1.5rem;
          }
        `}</style>
      </div>
    );
  }
};