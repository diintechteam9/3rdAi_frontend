// frontend/src/components/kundali/BirthDetails.jsx

export default {
  name: 'BirthDetails',
  props: {
    data: {
      type: Object,
      required: true
    }
  },
  setup(props) {
    const formatDate = (day, month, year) => {
      if (!day || !month || !year) return 'N/A';
      const monthStr = String(month).padStart(2, '0');
      const dayStr = String(day).padStart(2, '0');
      return `${dayStr}/${monthStr}/${year}`;
    };

    const formatTime = (hour, minute) => {
      if (hour === undefined || hour === null || minute === undefined || minute === null) return 'N/A';
      const hourStr = String(hour).padStart(2, '0');
      const minuteStr = String(minute).padStart(2, '0');
      return `${hourStr}:${minuteStr}`;
    };

    const formatCoordinate = (coord, suffix = '') => {
      if (coord === undefined || coord === null || isNaN(coord)) return 'N/A';
      return `${parseFloat(coord).toFixed(4)}°${suffix}`;
    };

    return () => {
      // Safe data access with fallbacks
      const birthDetails = props.data?.birthDetails || {};
      const hasData = props.data && Object.keys(birthDetails).length > 0;
      
      // Check if we have minimum required data
      const hasMinimumData = birthDetails.day && birthDetails.month && birthDetails.year;

      return (
        <div class="birth-details">
          {!hasData || !hasMinimumData ? (
            <div class="alert alert-warning">
              <div class="d-flex align-items-center">
                <i class="fas fa-exclamation-triangle me-2"></i>
                <span>Birth details not available. Please ensure complete birth information is provided (Date, Time, and Location are required).</span>
              </div>
            </div>
          ) : (
            <div class="card border-0 shadow-sm">
              <div class="card-header bg-primary text-white">
                <h5 class="mb-0">
                  <i class="fas fa-user me-2"></i>
                  Birth Details
                </h5>
              </div>
              <div class="card-body">
                <div class="row">
                  <div class="col-lg-6">
                    <div class="table-responsive">
                      <table class="table table-striped">
                        <tbody>
                          <tr>
                            <td class="fw-bold">Date</td>
                            <td>{formatDate(birthDetails.day, birthDetails.month, birthDetails.year)}</td>
                          </tr>
                          <tr>
                            <td class="fw-bold">Time</td>
                            <td>{formatTime(birthDetails.hour, birthDetails.minute)}</td>
                          </tr>
                          <tr>
                            <td class="fw-bold">Timezone</td>
                            <td>{birthDetails.timezone || birthDetails.tzone || '+05:30 (IST)'}</td>
                          </tr>
                          <tr>
                            <td class="fw-bold">Sunrise</td>
                            <td>{birthDetails.sunrise || 'N/A'}</td>
                          </tr>
                          <tr>
                            <td class="fw-bold">Sunset</td>
                            <td>{birthDetails.sunset || 'N/A'}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div class="col-lg-6">
                    <div class="table-responsive">
                      <table class="table table-striped">
                        <tbody>
                          <tr>
                            <td class="fw-bold">Latitude</td>
                            <td>{formatCoordinate(birthDetails.latitude, 'N')}</td>
                          </tr>
                          <tr>
                            <td class="fw-bold">Longitude</td>
                            <td>{formatCoordinate(birthDetails.longitude, 'E')}</td>
                          </tr>
                          <tr>
                            <td class="fw-bold">Ayanamsha</td>
                            <td>{formatCoordinate(birthDetails.ayanamsha)}</td>
                          </tr>
                          <tr>
                            <td class="fw-bold">Place</td>
                            <td>{birthDetails.place || birthDetails.placeOfBirth || 'N/A'}</td>
                          </tr>
                          <tr>
                            <td class="fw-bold">Source</td>
                            <td>
                              <span class="badge bg-success">
                                {birthDetails.calculationSource || 'API'}
                              </span>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    };
  }
};