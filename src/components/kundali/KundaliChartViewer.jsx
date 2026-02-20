// frontend/src/components/kundali/KundaliChartViewer.jsx

import { ref } from 'vue';

export default {
  name: 'KundaliChartViewer',
  props: {
    chart: {
      type: Object,
      default: () => ({})
    },
    title: {
      type: String,
      required: true
    }
  },
  setup(props) {
    const isFullscreen = ref(false);
    const isZoomed = ref(false);
    const rotation = ref(0);
    const isFlipped = ref(false);

    const toggleFullscreen = () => {
      isFullscreen.value = !isFullscreen.value;
    };

    const toggleZoom = () => {
      isZoomed.value = !isZoomed.value;
    };

    const rotateChart = () => {
      rotation.value = (rotation.value + 90) % 360;
    };

    const flipChart = () => {
      isFlipped.value = !isFlipped.value;
    };

    const resetRotation = () => {
      rotation.value = 0;
      isFlipped.value = false;
    };

    const getHousePlanets = (houseNumber) => {
      if (!props.chart || !props.chart.houses) return [];
      
      const houses = props.chart.houses;
      if (Array.isArray(houses)) {
        return houses[houseNumber - 1] || [];
      } else if (typeof houses === 'object') {
        return houses[houseNumber] || houses[houseNumber.toString()] || [];
      }
      return [];
    };

    const hasChartData = () => {
      return props.chart && props.chart.houses && 
             (Array.isArray(props.chart.houses) || typeof props.chart.houses === 'object');
    };

    const formatPlanetName = (planet) => {
      if (typeof planet === 'string') return planet;
      if (typeof planet === 'object' && planet.name) return planet.name;
      if (typeof planet === 'object' && planet.planet) return planet.planet;
      return planet?.toString() || '';
    };

    const getPlanetColor = (planet) => {
      const planetName = formatPlanetName(planet).toLowerCase();
      const colors = {
        'sun': '#FF6B35',
        'moon': '#4ECDC4',
        'mars': '#FF4757',
        'mercury': '#3742FA',
        'jupiter': '#FFA502',
        'venus': '#FF6348',
        'saturn': '#2F3542',
        'rahu': '#8B4513',
        'ketu': '#696969',
        'uranus': '#00CED1',
        'neptune': '#4169E1',
        'pluto': '#8B008B'
      };
      return colors[planetName] || '#007bff';
    };

    return () => (
      <div class="kundali-chart-viewer">
        <div class="d-flex justify-content-between align-items-center mb-2">
          <h6 class="mb-0 d-flex align-items-center gap-2 text-primary">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 6v6l4 2"/>
            </svg>
            {props.title}
          </h6>
          <div class="btn-group btn-group-sm">
            <button 
              class={`btn btn-outline-primary ${isZoomed.value ? 'active' : ''}`}
              onClick={toggleZoom}
              title="Zoom"
              disabled={!hasChartData()}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.35-4.35"/>
                <line x1="11" y1="8" x2="11" y2="14"/>
                <line x1="8" y1="11" x2="14" y2="11"/>
              </svg>
            </button>
            <button 
              class="btn btn-outline-primary"
              onClick={rotateChart}
              title="Rotate 90°"
              disabled={!hasChartData()}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/>
                <path d="M21 3v5h-5"/>
              </svg>
            </button>
            <button 
              class="btn btn-outline-primary"
              onClick={flipChart}
              title="Flip Chart"
              disabled={!hasChartData()}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M8 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3"/>
                <path d="M16 3h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-3"/>
                <path d="M12 20v2"/>
                <path d="M12 14v2"/>
                <path d="M12 8v2"/>
                <path d="M12 2v2"/>
              </svg>
            </button>
            <button 
              class="btn btn-outline-secondary"
              onClick={resetRotation}
              title="Reset All"
              disabled={!hasChartData() || (rotation.value === 0 && !isFlipped.value)}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
                <path d="M21 3v5h-5"/>
                <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
                <path d="M3 21v-5h5"/>
              </svg>
            </button>
            <button 
              class="btn btn-outline-primary"
              onClick={toggleFullscreen}
              title="Fullscreen"
              disabled={!hasChartData()}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
              </svg>
            </button>
          </div>
        </div>

        <div class={`chart-container ${isZoomed.value ? 'zoomed' : ''}`}>
          <div class="chart-wrapper">
            {!hasChartData() ? (
              <div class="no-chart-data">
                <div class="text-center py-5">
                  <div class="chart-icon-placeholder">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" class="text-muted">
                      <circle cx="12" cy="12" r="10"/>
                      <path d="M12 6v6l4 2"/>
                    </svg>
                  </div>
                  <h5 class="text-muted mt-3">Chart Data Not Available</h5>
                  <p class="text-muted mb-0">Complete birth details are required to generate birth charts.</p>
                </div>
              </div>
            ) : (
              <div class="svg-chart-container">
                <svg 
                  width="100%" 
                  height="100%" 
                  viewBox="0 0 350 350" 
                  class="kundali-svg-chart"
                  xmlns="http://www.w3.org/2000/svg"
                  style={{ 
                    transform: `rotate(${rotation.value}deg) ${isFlipped.value ? 'scaleX(-1)' : ''}` 
                  }}
                >
                  <defs>
                    <linearGradient id="houseGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95"/>
                      <stop offset="100%" stopColor="#f8f9fa" stopOpacity="0.8"/>
                    </linearGradient>
                    <filter id="shadow">
                      <feDropShadow dx="1" dy="1" stdDeviation="2" floodOpacity="0.2"/>
                    </filter>
                    <filter id="glow">
                      <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                      <feMerge> 
                        <feMergeNode in="coloredBlur"/>
                        <feMergeNode in="SourceGraphic"/>
                      </feMerge>
                    </filter>
                  </defs>
                  
                  <g class="chart-background">
                    <rect width="350" height="350" fill="url(#houseGrad)" rx="10" ry="10"/>
                  </g>
                  
                  <g class="slice">
                    <path d="M10,10L175,10L92.5,92.5L10,10" stroke="#667eea" strokeWidth="2" fill="rgba(255,255,255,0.7)" filter="url(#shadow)" class="house-path house-12"/>
                    <path d="M175,10L340,10L257.5,92.5L175,10" stroke="#667eea" strokeWidth="2" fill="rgba(255,255,255,0.7)" filter="url(#shadow)" class="house-path house-1"/>
                    <path d="M92.5,92.5L10,175L10,10" stroke="#667eea" strokeWidth="2" fill="rgba(255,255,255,0.7)" filter="url(#shadow)" class="house-path house-11"/>
                    <path d="M92.5,92.5L175,175L257.5,92.5L175,10" stroke="#667eea" strokeWidth="2" fill="rgba(255,255,255,0.7)" filter="url(#shadow)" class="house-path house-center"/>
                    <path d="M257.5,92.5L340,175L340,10" stroke="#667eea" strokeWidth="2" fill="rgba(255,255,255,0.7)" filter="url(#shadow)" class="house-path house-2"/>
                    <path d="M92.5,92.5L175,175L92.5,257.5L10,175" stroke="#667eea" strokeWidth="2" fill="rgba(255,255,255,0.7)" filter="url(#shadow)" class="house-path house-10"/>
                    <path d="M257.5,92.5L340,175L257.5,257.5L175,175" stroke="#667eea" strokeWidth="2" fill="rgba(255,255,255,0.7)" filter="url(#shadow)" class="house-path house-3"/>
                    <path d="M92.5,257.5L10,340L10,175" stroke="#667eea" strokeWidth="2" fill="rgba(255,255,255,0.7)" filter="url(#shadow)" class="house-path house-9"/>
                    <path d="M175,175L257.5,257.5L175,340L92.5,257.5" stroke="#667eea" strokeWidth="2" fill="rgba(255,255,255,0.7)" filter="url(#shadow)" class="house-path house-6"/>
                    <path d="M340,175L340,340L257.5,257.5" stroke="#667eea" strokeWidth="2" fill="rgba(255,255,255,0.7)" filter="url(#shadow)" class="house-path house-4"/>
                    <path d="M92.5,257.5L175,340L10,340" stroke="#667eea" strokeWidth="2" fill="rgba(255,255,255,0.7)" filter="url(#shadow)" class="house-path house-8"/>
                    <path d="M257.5,257.5L340,340L175,340" stroke="#667eea" strokeWidth="2" fill="rgba(255,255,255,0.7)" filter="url(#shadow)" class="house-path house-5"/>
                  </g>
                  
                  <g class="house-numbers">
                    <text fontSize="16" x="171.7" y="161.8" textAnchor="middle" fill="#667eea" fontWeight="bold" class="house-number">6</text>
                    <text fontSize="16" x="92.5" y="76" textAnchor="middle" fill="#667eea" fontWeight="bold" class="house-number">7</text>
                    <text fontSize="16" x="67.75" y="99.1" textAnchor="middle" fill="#667eea" fontWeight="bold" class="house-number">8</text>
                    <text fontSize="16" x="147.5" y="179.95" textAnchor="middle" fill="#667eea" fontWeight="bold" class="house-number">9</text>
                    <text fontSize="16" x="64.4" y="265.75" textAnchor="middle" fill="#667eea" fontWeight="bold" class="house-number">10</text>
                    <text fontSize="16" x="82.6" y="282.3" textAnchor="middle" fill="#667eea" fontWeight="bold" class="house-number">11</text>
                    <text fontSize="16" x="168.4" y="199.8" textAnchor="middle" fill="#667eea" fontWeight="bold" class="house-number">12</text>
                    <text fontSize="16" x="249.25" y="277.3" textAnchor="middle" fill="#667eea" fontWeight="bold" class="house-number">1</text>
                    <text fontSize="16" x="274" y="257.5" textAnchor="middle" fill="#667eea" fontWeight="bold" class="house-number">2</text>
                    <text fontSize="16" x="190.55" y="179.95" textAnchor="middle" fill="#667eea" fontWeight="bold" class="house-number">3</text>
                    <text fontSize="16" x="274" y="97.45" textAnchor="middle" fill="#667eea" fontWeight="bold" class="house-number">4</text>
                    <text fontSize="16" x="249.25" y="76" textAnchor="middle" fill="#667eea" fontWeight="bold" class="house-number">5</text>
                  </g>
                  
                  <g class="planets">
                    {[1,2,3,4,5,6,7,8,9,10,11,12].map(houseNum => {
                      const housePlanets = getHousePlanets(houseNum);
                      const positions = {
                        1: { x: 249.25, y: 50 },
                        2: { x: 300, y: 120 },
                        3: { x: 280, y: 200 },
                        4: { x: 300, y: 240 },
                        5: { x: 249.25, y: 320 },
                        6: { x: 175, y: 220 },
                        7: { x: 92.5, y: 50 },
                        8: { x: 50, y: 120 },
                        9: { x: 70, y: 200 },
                        10: { x: 50, y: 240 },
                        11: { x: 92.5, y: 320 },
                        12: { x: 175, y: 50 }
                      };
                      
                      return housePlanets.map((planet, idx) => {
                        const planetName = formatPlanetName(planet);
                        const shortName = planetName.substring(0, 2);
                        const pos = positions[houseNum];
                        const x = pos.x + (idx * 20) - (housePlanets.length * 10);
                        const y = pos.y + (idx % 2) * 15;
                        
                        return (
                          <g key={`${houseNum}-${idx}`} class="planet-group">
                            <circle cx={x} cy={y} r="12" fill={getPlanetColor(planet)} stroke="white" strokeWidth="2" filter="url(#glow)" class="planet-circle"/>
                            <text fontSize="10" x={x} y={y+3} textAnchor="middle" fill="white" fontWeight="bold" class="planet-text">{shortName}</text>
                            <title>{planetName}</title>
                          </g>
                        );
                      });
                    })}
                  </g>
                </svg>
              </div>
            )}
          </div>
        </div>

        <style jsx>{`
          .chart-container {
            perspective: 1200px;
            transform-style: preserve-3d;
            transition: all 0.6s ease;
          }
          
          .chart-container.zoomed {
            transform: scale(1.15);
          }
          
          .chart-wrapper {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 15px;
            padding: 1.5rem;
            box-shadow: 0 15px 30px rgba(0,0,0,0.1);
            min-height: 400px;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          
          .svg-chart-container {
            width: 100%;
            max-width: 380px;
            height: 380px;
            position: relative;
          }
          
          .kundali-svg-chart {
            width: 100%;
            height: 100%;
            filter: drop-shadow(0 10px 20px rgba(0,0,0,0.1));
            transition: all 0.6s ease;
            transform-origin: center;
          }
          
          .kundali-svg-chart:hover {
            transform: scale(1.02);
          }
          
          .house-path {
            transition: all 0.3s ease;
            cursor: pointer;
          }
          
          .house-path:hover {
            fill: rgba(255, 255, 255, 1);
            stroke: #ffd700;
            stroke-width: 3;
            filter: url(#glow);
          }
          
          .house-number {
            transition: all 0.3s ease;
            cursor: pointer;
          }
          
          .planet-circle {
            transition: all 0.3s ease;
            cursor: pointer;
            animation: planetPulse 2s ease-in-out infinite;
          }
          
          .planet-circle:hover {
            r: 15;
            stroke-width: 3;
          }
          
          .planet-text {
            pointer-events: none;
            text-shadow: 0 1px 2px rgba(0,0,0,0.3);
          }
          
          .no-chart-data {
            width: 100%;
            color: white;
          }
          
          .chart-icon-placeholder {
            animation: pulse 2s ease-in-out infinite;
          }
          
          @keyframes planetPulse {
            0%, 100% {
              opacity: 0.8;
            }
            50% {
              opacity: 1;
            }
          }
          
          @keyframes pulse {
            0%, 100% {
              opacity: 0.5;
              transform: scale(1);
            }
            50% {
              opacity: 1;
              transform: scale(1.05);
            }
          }
        `}</style>
      </div>
    );
  }
};