// frontend/src/components/kundali/PlanetTable.jsx

export default {
  name: 'PlanetTable',
  props: {
    planets: {
      type: Array,
      default: () => []
    },
    title: {
      type: String,
      default: 'Planets'
    }
  },
  setup(props) {
    const formatDegree = (planet) => {
      // Try multiple field names for degree
      const degree = planet.normDegree ?? planet.norm_degree ?? planet.degree ?? planet.fullDegree ?? planet.full_degree;
      
      if (degree === undefined || degree === null || isNaN(degree)) return 'N/A';
      return `${parseFloat(degree).toFixed(2)}°`;
    };

    const formatFullDegree = (planet) => {
      const degree = planet.fullDegree ?? planet.full_degree ?? planet.degree;
      if (degree === undefined || degree === null || isNaN(degree)) return 'N/A';
      return `${parseFloat(degree).toFixed(4)}°`;
    };

    const getBadgeClass = (awastha) => {
      if (!awastha) return 'bg-secondary';
      const awashtaStr = String(awastha).toLowerCase();
      const classes = {
        'own': 'bg-success',
        'exalted': 'bg-primary',
        'debilitated': 'bg-danger',
        'neutral': 'bg-secondary',
        'friend': 'bg-info',
        'enemy': 'bg-warning'
      };
      return classes[awashtaStr] || 'bg-secondary';
    };

    const isRetrograde = (planet) => {
      // Check multiple field formats
      const retro = planet.isRetro ?? planet.is_retro ?? planet.retro;
      if (typeof retro === 'boolean') return retro;
      if (typeof retro === 'string') return retro.toLowerCase() === 'true' || retro === '1';
      return false;
    };

    const isCombust = (planet) => {
      const combust = planet.isCombust ?? planet.is_combust ?? planet.combust;
      if (typeof combust === 'boolean') return combust;
      if (typeof combust === 'string') return combust.toLowerCase() === 'true' || combust === '1';
      return false;
    };

    const safeGet = (obj, key, defaultValue = 'N/A') => {
      const value = obj && obj[key] !== undefined && obj[key] !== null ? obj[key] : defaultValue;
      // Basic XSS protection - escape HTML characters
      if (typeof value === 'string') {
        return value.replace(/[<>"'&]/g, (match) => {
          const escapeMap = { '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;', '&': '&amp;' };
          return escapeMap[match];
        });
      }
      return value;
    };

    return () => {
      const validPlanets = Array.isArray(props.planets) ? props.planets.filter(p => p && p.name) : [];
      
      return (
        <div class="planet-table">
          <div class="d-flex justify-content-between align-items-center mb-3">
            <h6 class="mb-0">{props.title}</h6>
            {validPlanets.length > 0 && (
              <span class="badge bg-primary">{validPlanets.length} Planets</span>
            )}
          </div>
          
          {validPlanets.length === 0 ? (
            <div class="alert alert-info">
              <div class="d-flex align-items-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="me-2">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                  <path d="M12 16v-4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                  <path d="M12 8h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
                <span>No planetary data available. Complete birth details are required for planetary calculations.</span>
              </div>
            </div>
          ) : (
            <div class="table-responsive">
              <table class="table table-striped table-hover">
                <thead class="table-dark sticky-top">
                  <tr>
                    <th>Planet</th>
                    <th>Degree</th>
                    <th>Sign</th>
                    <th>Sign Lord</th>
                    <th>Nakshatra</th>
                    <th>House</th>
                    <th>Status</th>
                    <th>Awastha</th>
                  </tr>
                </thead>
                <tbody>
                  {validPlanets.map((planet, index) => {
                    const planetId = planet.id ?? planet.name ?? index;
                    const planetIsRetro = isRetrograde(planet);
                    const planetIsCombust = isCombust(planet);
                    
                    return (
                      <tr key={planetId}>
                        <td class="fw-bold text-primary">{safeGet(planet, 'name')}</td>
                        <td>
                          <span title={`Full: ${formatFullDegree(planet)}`}>
                            {formatDegree(planet)}
                          </span>
                        </td>
                        <td>
                          {safeGet(planet, 'sign') !== 'N/A' ? (
                            <span class="badge bg-info">{safeGet(planet, 'sign')}</span>
                          ) : (
                            <span class="text-muted">N/A</span>
                          )}
                        </td>
                        <td>
                          {safeGet(planet, 'signLord') !== 'N/A' ? (
                            safeGet(planet, 'signLord')
                          ) : safeGet(planet, 'sign_lord') !== 'N/A' ? (
                            safeGet(planet, 'sign_lord')
                          ) : (
                            <span class="text-muted">N/A</span>
                          )}
                        </td>
                        <td>
                          {safeGet(planet, 'nakshatra') !== 'N/A' ? (
                            <>
                              {safeGet(planet, 'nakshatra')}
                              {planet.nakshatra_pad && (
                                <span class="text-muted ms-1">({planet.nakshatra_pad})</span>
                              )}
                            </>
                          ) : (
                            <span class="text-muted">N/A</span>
                          )}
                        </td>
                        <td>
                          <span class="badge bg-secondary">{safeGet(planet, 'house')}</span>
                        </td>
                        <td>
                          <div class="d-flex gap-1">
                            {planetIsRetro && (
                              <span class="badge bg-danger" title="Retrograde">R</span>
                            )}
                            {planetIsCombust && (
                              <span class="badge bg-warning text-dark" title="Combust">C</span>
                            )}
                            {!planetIsRetro && !planetIsCombust && (
                              <span class="badge bg-success" title="Normal">N</span>
                            )}
                          </div>
                        </td>
                        <td>
                          <span class={`badge ${getBadgeClass(planet.planet_awastha ?? planet.awastha)}`}>
                            {safeGet(planet, 'planet_awastha', safeGet(planet, 'awastha', 'Neutral'))}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <style jsx>{`
            .table th {
              font-size: 0.875rem;
              font-weight: 600;
              white-space: nowrap;
            }
            
            .table td {
              vertical-align: middle;
              font-size: 0.875rem;
            }
            
            .badge {
              font-size: 0.75rem;
              font-weight: 600;
            }
            
            .table-hover tbody tr:hover {
              background-color: rgba(0, 123, 255, 0.1);
              cursor: pointer;
            }
            
            .alert {
              border-radius: 8px;
            }

            .sticky-top {
              position: sticky;
              top: 0;
              z-index: 10;
            }
          `}</style>
        </div>
      );
    };
  }
};