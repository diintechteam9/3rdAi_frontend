// frontend/src/components/kundali/PlanetaryPosition.jsx

import { ref } from 'vue';
import PlanetTable from './PlanetTable.jsx';

export default {
  name: 'PlanetaryPosition',
  props: {
    data: {
      type: Object,
      default: () => ({})
    }
  },
  setup(props) {
    const activeSubTab = ref('planets');

    const subTabs = [
      { 
        id: 'planets', 
        label: 'Main Planets', 
        icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
      },
      { 
        id: 'extended', 
        label: 'Shadow Planets', 
        icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><circle cx="12" cy="12" r="4"/></svg>
      }
    ];

    const getPlanetsData = (type) => {
      if (!props.data) {
        console.warn('No data provided to PlanetaryPosition component');
        return [];
      }
      
      let planetsArray = [];
      
      if (type === 'planets') {
        // Try multiple field names for main planets
        planetsArray = props.data.planets || 
                      props.data.planetsPosition || 
                      props.data.planetPositions ||
                      [];
      } else if (type === 'extended') {
        // Try multiple field names for extended/shadow planets
        planetsArray = props.data.planetsExtended || 
                      props.data.planetsExtendedPosition || 
                      props.data.shadowPlanets ||
                      props.data.extendedPlanets ||
                      [];
      }

      // Ensure we have a valid array
      if (!Array.isArray(planetsArray)) {
        console.warn(`Planet data for ${type} is not an array:`, planetsArray);
        return [];
      }

      // Filter out invalid entries (null, undefined, or objects without name)
      const validPlanets = planetsArray.filter(planet => 
        planet && (planet.name || planet.planet)
      );

      console.log(`${type} planets count:`, validPlanets.length);
      return validPlanets;
    };

    const hasAnyData = () => {
      const mainPlanets = getPlanetsData('planets');
      const extendedPlanets = getPlanetsData('extended');
      return mainPlanets.length > 0 || extendedPlanets.length > 0;
    };

    const getPlanetCount = (type) => {
      return getPlanetsData(type).length;
    };

    return () => (
      <div class="planetary-position">
        <div class="card border-0 shadow-sm">
          <div class="card-header bg-warning text-dark">
            <h5 class="mb-0 d-flex align-items-center justify-content-between">
              <span class="d-flex align-items-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" class="me-2">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 6v6l4 2"/>
                </svg>
                Planetary Position
              </span>
              {hasAnyData() && (
                <span class="badge bg-dark">
                  Total: {getPlanetCount('planets') + getPlanetCount('extended')} Planets
                </span>
              )}
            </h5>
          </div>
          <div class="card-body p-0">
            {!hasAnyData() ? (
              <div class="p-4">
                <div class="alert alert-warning mb-0">
                  <div class="d-flex align-items-start">
                    <i class="fas fa-exclamation-triangle me-2 mt-1"></i>
                    <div>
                      <strong>Planetary position data not available.</strong>
                      <p class="mb-0 mt-2">Complete birth details are required for planetary calculations:</p>
                      <ul class="mb-0 mt-2">
                        <li>Date of Birth</li>
                        <li>Time of Birth (accurate)</li>
                        <li>Place of Birth (with coordinates)</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Sub Tabs */}
                <nav class="nav nav-tabs border-bottom">
                  {subTabs.map(tab => {
                    const planetCount = getPlanetCount(tab.id);
                    const hasData = planetCount > 0;
                    
                    return (
                      <button
                        key={tab.id}
                        class={`nav-link d-flex align-items-center gap-2 ${activeSubTab.value === tab.id ? 'active' : ''}`}
                        onClick={() => hasData && (activeSubTab.value = tab.id)}
                        disabled={!hasData}
                      >
                        {tab.icon}
                        <span>{tab.label}</span>
                        <span class={`badge ${hasData ? 'bg-primary' : 'bg-secondary'} ms-2`}>
                          {hasData ? planetCount : 'No Data'}
                        </span>
                      </button>
                    );
                  })}
                </nav>

                {/* Sub Tab Content */}
                <div class="p-3">
                  {activeSubTab.value === 'planets' && (
                    <>
                      {getPlanetCount('planets') > 0 ? (
                        <PlanetTable 
                          planets={getPlanetsData('planets')} 
                          title="Main Planets Position"
                        />
                      ) : (
                        <div class="alert alert-info">
                          <i class="fas fa-info-circle me-2"></i>
                          Main planets data is not available.
                        </div>
                      )}
                    </>
                  )}
                  
                  {activeSubTab.value === 'extended' && (
                    <>
                      {getPlanetCount('extended') > 0 ? (
                        <PlanetTable 
                          planets={getPlanetsData('extended')} 
                          title="Shadow Planets Position"
                        />
                      ) : (
                        <div class="alert alert-info">
                          <i class="fas fa-info-circle me-2"></i>
                          Shadow planets data is not available.
                        </div>
                      )}
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        <style jsx>{`
          .nav-tabs {
            border-bottom: 2px solid #dee2e6;
          }

          .nav-tabs .nav-link {
            border: none;
            color: #6c757d;
            padding: 1rem 1.5rem;
            transition: all 0.3s ease;
            font-weight: 500;
            border-bottom: 3px solid transparent;
          }
          
          .nav-tabs .nav-link:hover:not(:disabled) {
            border-color: transparent;
            color: #007bff;
            background: rgba(0, 123, 255, 0.05);
            border-bottom-color: rgba(0, 123, 255, 0.3);
          }
          
          .nav-tabs .nav-link.active {
            background: rgba(0, 123, 255, 0.1);
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
            font-size: 0.7rem;
            padding: 0.25rem 0.5rem;
            font-weight: 600;
          }

          .alert ul {
            padding-left: 1.5rem;
            margin-bottom: 0;
          }

          .card-header .badge {
            font-size: 0.8rem;
          }
        `}</style>
      </div>
    );
  }
};