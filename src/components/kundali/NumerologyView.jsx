// NumerologyView.jsx - Complete Numerology Data Display Component
import { ref } from 'vue';

export default {
  name: 'NumerologyView',
  props: {
    data: {
      type: Object,
      required: true
    }
  },
  setup(props) {
    const activeTab = ref('report');

    const tabs = [
      { 
        id: 'report', 
        label: 'Numero Report', 
        icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>
      },
      { 
        id: 'table', 
        label: 'Numero Table', 
        icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
      },
      { 
        id: 'prediction', 
        label: 'Daily Prediction', 
        icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>
      }
    ];

    const safeGet = (obj, path, defaultValue = 'N/A') => {
      return path.split('.').reduce((current, key) => {
        return current && current[key] !== undefined && current[key] !== null ? current[key] : defaultValue;
      }, obj);
    };

    const renderNestedObject = (obj, title = null) => {
      if (!obj || typeof obj !== 'object') return null;
      
      return (
        <div class="mb-4">
          {title && <h6 class="text-primary mb-3">{title}</h6>}
          <div class="row g-3">
            {Object.entries(obj).map(([key, value]) => {
              if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                return (
                  <div key={key} class="col-12">
                    {renderNestedObject(value, key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()))}
                  </div>
                );
              }
              
              return (
                <div key={key} class="col-md-6 col-lg-4">
                  <div class="p-3 rounded-3 border bg-light">
                    <small class="text-muted d-block mb-1 text-capitalize">
                      {key.replace(/_/g, ' ')}
                    </small>
                    <strong class="text-dark">
                      {Array.isArray(value) ? value.join(', ') : (value?.toString() || 'N/A')}
                    </strong>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    };

    return () => (
      <div class="numerology-view">
        <div class="card border-0 shadow-lg rounded-4 overflow-hidden">
          <div class="card-header bg-gradient-info text-white p-4">
            <h5 class="mb-0 d-flex align-items-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" class="me-3">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 6v6l4 2"/>
              </svg>
              <span>Numerology Analysis</span>
            </h5>
            <p class="mb-0 mt-2 small">
              <strong>Name:</strong> {safeGet(props.data, 'name')}
              <span class="ms-3">
                <strong>Date:</strong> {props.data?.day}/{props.data?.month}/{props.data?.year}
              </span>
            </p>
          </div>

          <div class="card-body p-0">
            {/* Tab Navigation */}
            <nav class="nav nav-tabs border-bottom bg-light">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  class={`nav-link d-flex align-items-center gap-2 ${activeTab.value === tab.id ? 'active' : ''}`}
                  onClick={() => activeTab.value = tab.id}
                >
                  {tab.icon}
                  <span class="d-none d-md-inline">{tab.label}</span>
                </button>
              ))}
            </nav>

            <div class="p-4">
              {/* Numero Report Tab */}
              {activeTab.value === 'report' && (
                <div>
                  {props.data?.numeroReport ? (
                    <>
                      {/* Core Numbers */}
                      <div class="mb-5">
                        <h6 class="text-primary mb-3 d-flex align-items-center">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" class="me-2">
                            <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
                          </svg>
                          Core Numbers
                        </h6>
                        <div class="row g-3">
                          {props.data.numeroReport.kua_number && (
                            <div class="col-md-6 col-lg-3">
                              <div class="p-4 rounded-3 border bg-primary bg-opacity-10 text-center">
                                <small class="text-muted d-block mb-1">Kua Number</small>
                                <div class="display-4 fw-bold text-primary">{props.data.numeroReport.kua_number.kua}</div>
                                <small class="text-muted mt-2 d-block">{props.data.numeroReport.kua_number.gender}</small>
                              </div>
                            </div>
                          )}
                          {props.data.numeroReport.fav_time && (
                            <div class="col-md-6 col-lg-3">
                              <div class="p-4 rounded-3 border bg-success bg-opacity-10 text-center">
                                <small class="text-muted d-block mb-1">Favorable Time</small>
                                <div class="h3 fw-bold text-success">{props.data.numeroReport.fav_time}</div>
                              </div>
                            </div>
                          )}
                          {props.data.numeroReport.fav_god && (
                            <div class="col-md-6 col-lg-3">
                              <div class="p-4 rounded-3 border bg-warning bg-opacity-10 text-center">
                                <small class="text-muted d-block mb-1">Favorable God</small>
                                <div class="h3 fw-bold text-warning">{props.data.numeroReport.fav_god}</div>
                              </div>
                            </div>
                          )}
                          {props.data.numeroReport.fav_mantra && (
                            <div class="col-md-6 col-lg-3">
                              <div class="p-4 rounded-3 border bg-info bg-opacity-10 text-center">
                                <small class="text-muted d-block mb-1">Favorable Mantra</small>
                                <div class="h3 fw-bold text-info">{props.data.numeroReport.fav_mantra}</div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Detailed Analysis */}
                      {renderNestedObject(props.data.numeroReport, 'Detailed Analysis')}
                    </>
                  ) : (
                    <div class="alert alert-warning">
                      <i class="fas fa-exclamation-triangle me-2"></i>
                      No numero report data available
                    </div>
                  )}
                </div>
              )}

              {/* Numero Table Tab */}
              {activeTab.value === 'table' && (
                <div>
                  {props.data?.numeroTable ? (
                    <>
                      {/* Lo Shu Grid */}
                      {props.data.numeroTable.lo_shu_grid && (
                        <div class="mb-5">
                          <h6 class="text-primary mb-3">Lo Shu Grid</h6>
                          <div class="d-flex justify-content-center">
                            <div class="lo-shu-grid">
                              {props.data.numeroTable.lo_shu_grid.map((row, rowIndex) => (
                                <div key={rowIndex} class="lo-shu-row">
                                  {row.map((cell, cellIndex) => (
                                    <div key={cellIndex} class="lo-shu-cell">
                                      {cell || ''}
                                    </div>
                                  ))}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Inclusion Table */}
                      {props.data.numeroTable.inclusion_table && (
                        <div class="mb-5">
                          <h6 class="text-primary mb-3">Inclusion Table</h6>
                          <div class="table-responsive">
                            <table class="table table-bordered table-hover">
                              <tbody>
                                {props.data.numeroTable.inclusion_table.map((row, rowIndex) => (
                                  <tr key={rowIndex}>
                                    {row.map((cell, cellIndex) => (
                                      <td key={cellIndex} class="text-center fw-bold">
                                        {cell}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Other Table Data */}
                      {renderNestedObject(
                        Object.fromEntries(
                          Object.entries(props.data.numeroTable).filter(
                            ([key]) => !['lo_shu_grid', 'inclusion_table'].includes(key)
                          )
                        ),
                        'Additional Table Data'
                      )}
                    </>
                  ) : (
                    <div class="alert alert-warning">
                      <i class="fas fa-exclamation-triangle me-2"></i>
                      No numero table data available
                    </div>
                  )}
                </div>
              )}

              {/* Daily Prediction Tab */}
              {activeTab.value === 'prediction' && (
                <div>
                  {props.data?.dailyPrediction?.missingFields?.length ? (
                    <div class="alert alert-warning mb-0">
                      <h6 class="alert-heading">Personalization data required</h6>
                      <p class="mb-2">{props.data.dailyPrediction.message}</p>
                      <p class="mb-0"><strong>These fields are missing:</strong> {props.data.dailyPrediction.missingFields.join(', ')}</p>
                    </div>
                  ) : props.data?.dailyPrediction ? (
                    <>
                      {/* Prediction Highlights */}
                      <div class="row g-4 mb-4">
                        {props.data.dailyPrediction.lucky_number && (
                          <div class="col-md-4">
                            <div class="card border-0 shadow-sm bg-success bg-opacity-10">
                              <div class="card-body text-center">
                                <small class="text-muted d-block mb-2">Lucky Number</small>
                                <div class="display-5 fw-bold text-success">
                                  {Array.isArray(props.data.dailyPrediction.lucky_number)
                                    ? props.data.dailyPrediction.lucky_number.join(', ')
                                    : props.data.dailyPrediction.lucky_number}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                        {props.data.dailyPrediction.friendly_number && (
                          <div class="col-md-4">
                            <div class="card border-0 shadow-sm bg-info bg-opacity-10">
                              <div class="card-body text-center">
                                <small class="text-muted d-block mb-2">Friendly Number</small>
                                <div class="display-5 fw-bold text-info">
                                  {Array.isArray(props.data.dailyPrediction.friendly_number)
                                    ? props.data.dailyPrediction.friendly_number.join(', ')
                                    : props.data.dailyPrediction.friendly_number}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                        {props.data.dailyPrediction.radical_number && (
                          <div class="col-md-4">
                            <div class="card border-0 shadow-sm bg-primary bg-opacity-10">
                              <div class="card-body text-center">
                                <small class="text-muted d-block mb-2">Radical Number</small>
                                <div class="display-5 fw-bold text-primary">
                                  {props.data.dailyPrediction.radical_number}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Prediction Details */}
                      {props.data.dailyPrediction.prediction && (
                        <div class="mb-4">
                          <h6 class="text-primary mb-3">Daily Predictions</h6>
                          <div class="row g-3">
                            {Object.entries(props.data.dailyPrediction.prediction).map(([key, value]) => (
                              <div key={key} class="col-12">
                                <div class="card border-0 shadow-sm">
                                  <div class="card-body">
                                    <h6 class="card-title text-capitalize text-primary">
                                      {key.replace(/_/g, ' ')}
                                    </h6>
                                    <p class="card-text mb-0">{value}</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* All Other Prediction Data */}
                      {renderNestedObject(
                        Object.fromEntries(
                          Object.entries(props.data.dailyPrediction).filter(
                            ([key]) => !['prediction', 'lucky_number', 'friendly_number', 'radical_number'].includes(key)
                          )
                        ),
                        'Additional Prediction Data'
                      )}
                    </>
                  ) : (
                    <div class="alert alert-warning">
                      <i class="fas fa-exclamation-triangle me-2"></i>
                      No daily prediction data available
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <style jsx>{`
          .nav-tabs .nav-link {
            border: none;
            color: #6c757d;
            padding: 1rem 1.5rem;
            transition: all 0.3s ease;
            background: transparent;
          }
          
          .nav-tabs .nav-link:hover:not(.active) {
            border-color: transparent;
            color: #007bff;
            background: rgba(0, 123, 255, 0.1);
          }
          
          .nav-tabs .nav-link.active {
            background: linear-gradient(135deg, #007bff, #0056b3);
            color: white;
            border-color: #007bff;
            box-shadow: 0 4px 8px rgba(0, 123, 255, 0.3);
          }

          .bg-gradient-info {
            background: linear-gradient(135deg, #17a2b8, #0d6efd);
          }

          .lo-shu-grid {
            display: inline-block;
            border: 2px solid #007bff;
            border-radius: 8px;
            overflow: hidden;
          }

          .lo-shu-row {
            display: flex;
          }

          .lo-shu-cell {
            width: 80px;
            height: 80px;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 1px solid #dee2e6;
            font-size: 1.5rem;
            font-weight: bold;
            background: white;
            transition: all 0.3s ease;
          }

          .lo-shu-cell:hover {
            background: #e7f1ff;
            transform: scale(1.05);
          }

          @media (max-width: 576px) {
            .lo-shu-cell {
              width: 60px;
              height: 60px;
              font-size: 1.2rem;
            }
          }
        `}</style>
      </div>
    );
  }
};