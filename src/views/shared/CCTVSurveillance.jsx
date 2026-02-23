import { ref, onMounted, onUnmounted, watch } from 'vue';

// Mock CCTV cameras distributed across Delhi
const MOCK_CAMERAS = [
    { id: 'C001', lat: 28.6448, lng: 77.2167, name: 'Connaught Place', status: 'online', alerts: 0 },
    { id: 'C002', lat: 28.6562, lng: 77.2410, name: 'Lal Qila', status: 'online', alerts: 1 },
    { id: 'C003', lat: 28.6129, lng: 77.2295, name: 'India Gate', status: 'online', alerts: 0 },
    { id: 'C004', lat: 28.6692, lng: 77.4538, name: 'Noida Sector 18', status: 'offline', alerts: 0 },
    { id: 'C005', lat: 28.5355, lng: 77.3910, name: 'Greater Noida', status: 'online', alerts: 0 },
    { id: 'C006', lat: 28.7041, lng: 77.1025, name: 'Rohini Sector 9', status: 'online', alerts: 2 },
    { id: 'C007', lat: 28.6304, lng: 77.0855, name: 'Janakpuri', status: 'online', alerts: 0 },
    { id: 'C008', lat: 28.5733, lng: 77.0511, name: 'Dwarka Sector 10', status: 'online', alerts: 0 },
    { id: 'C009', lat: 28.5921, lng: 77.3081, name: 'Noida Sector 62', status: 'online', alerts: 1 },
    { id: 'C010', lat: 28.6542, lng: 77.3143, name: 'Kaushambi', status: 'offline', alerts: 0 },
    { id: 'C011', lat: 28.6717, lng: 77.3067, name: 'Vaishali', status: 'online', alerts: 0 },
    { id: 'C012', lat: 28.5274, lng: 77.1340, name: 'Saket', status: 'online', alerts: 0 },
    { id: 'C013', lat: 28.5484, lng: 77.1965, name: 'Lajpat Nagar', status: 'online', alerts: 1 },
    { id: 'C014', lat: 28.5672, lng: 77.2373, name: 'East of Kailash', status: 'online', alerts: 0 },
    { id: 'C015', lat: 28.6100, lng: 77.1656, name: 'Karol Bagh', status: 'online', alerts: 0 },
    { id: 'C016', lat: 28.6330, lng: 77.1660, name: 'Patel Nagar', status: 'online', alerts: 0 },
    { id: 'C017', lat: 28.6600, lng: 77.2300, name: 'Civil Lines', status: 'online', alerts: 0 },
    { id: 'C018', lat: 28.6200, lng: 77.2900, name: 'Preet Vihar', status: 'offline', alerts: 0 },
    { id: 'C019', lat: 28.7200, lng: 77.1900, name: 'Bawana', status: 'online', alerts: 0 },
    { id: 'C020', lat: 28.6890, lng: 77.1570, name: 'Shalimar Bagh', status: 'online', alerts: 0 },
];

// District color mapping
const DISTRICT_COLORS = {
    'Central': '#ef4444',
    'West': '#f97316',
    'East': '#eab308',
    'North': '#22c55e',
    'South': '#3b82f6',
    'New Delhi': '#8b5cf6',
    'North East': '#06b6d4',
    'North West': '#ec4899',
    'South East': '#14b8a6',
    'South West': '#f59e0b',
    'Shahdara': '#84cc16',
    // fallback
    'default': '#6366f1'
};

export default {
    name: 'CCTVSurveillance',
    setup() {
        const mapContainer = ref(null);
        const isLoading = ref(true);
        const error = ref('');
        const mapInstance = ref(null);
        const selectedCamera = ref(null);
        const searchQuery = ref('');
        const selectedDistrict = ref('All');
        const districts = ref(['All']);
        const stats = ref({
            totalZones: 0,
            onlineCameras: MOCK_CAMERAS.filter(c => c.status === 'online').length,
            offlineCameras: MOCK_CAMERAS.filter(c => c.status === 'offline').length,
            totalAlerts: MOCK_CAMERAS.reduce((a, c) => a + c.alerts, 0),
        });

        let leaflet = null;
        let kmlLayer = null;
        let cameraMarkers = [];

        const initMap = async () => {
            try {
                // Dynamically import Leaflet
                const L = await import('leaflet');
                await import('leaflet/dist/leaflet.css');
                leaflet = L.default || L;

                if (!mapContainer.value) return;

                // Initialize map centered on Delhi
                const map = leaflet.map(mapContainer.value, {
                    center: [28.6139, 77.2090],
                    zoom: 11,
                    zoomControl: true,
                });
                mapInstance.value = map;

                // OpenStreetMap tiles
                leaflet.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '© OpenStreetMap contributors',
                    maxZoom: 18,
                }).addTo(map);

                // Load & parse KML
                await loadKML(map, leaflet);

                // Add CCTV camera markers
                addCameraMarkers(map, leaflet);

                isLoading.value = false;
            } catch (err) {
                console.error('Map init error:', err);
                error.value = 'Map load karne mein problem aayi: ' + err.message;
                isLoading.value = false;
            }
        };

        const loadKML = async (map, L) => {
            try {
                const response = await fetch('/Delhi_Pincode.kml');
                if (!response.ok) throw new Error('KML file not found');
                const kmlText = await response.text();

                const parser = new DOMParser();
                const kmlDoc = parser.parseFromString(kmlText, 'application/xml');
                const placemarks = kmlDoc.querySelectorAll('Placemark');
                const districtSet = new Set(['All']);

                placemarks.forEach((placemark) => {
                    const name = placemark.querySelector('name')?.textContent?.trim() || 'Unknown';

                    // Extract metadata from description HTML
                    let pincode = '', district = '', population = '', officetype = '';
                    const description = placemark.querySelector('description')?.textContent || '';
                    const pincodeMatch = description.match(/pincode<\/td>\s*<td[^>]*>(\d+)/);
                    const districtMatch = description.match(/district<\/td>\s*<td[^>]*>([^<]+)/);
                    const populationMatch = description.match(/tot_p<\/td>\s*<td[^>]*>([\d.]+)/);
                    const officeTypeMatch = description.match(/officetype<\/td>\s*<td[^>]*>([^<]+)/);
                    if (pincodeMatch) pincode = pincodeMatch[1];
                    if (districtMatch) district = districtMatch[1].trim();
                    if (populationMatch) population = parseInt(populationMatch[1]).toLocaleString('en-IN');
                    if (officeTypeMatch) officetype = officeTypeMatch[1].trim();

                    if (district) districtSet.add(district);

                    const color = DISTRICT_COLORS[district] || DISTRICT_COLORS['default'];

                    // Extract all polygon coordinate strings
                    const coordNodes = placemark.querySelectorAll('coordinates');
                    coordNodes.forEach((coordNode) => {
                        const coordText = coordNode.textContent.trim();
                        const latLngs = coordText.split(/\s+/).map(c => {
                            const parts = c.split(',');
                            if (parts.length >= 2) {
                                const lng = parseFloat(parts[0]);
                                const lat = parseFloat(parts[1]);
                                if (!isNaN(lat) && !isNaN(lng)) return [lat, lng];
                            }
                            return null;
                        }).filter(Boolean);

                        if (latLngs.length > 2) {
                            const polygon = L.polygon(latLngs, {
                                color: color,
                                fillColor: color,
                                fillOpacity: 0.25,
                                weight: 1.5,
                                opacity: 0.8,
                            });

                            polygon.bindPopup(`
                <div style="font-family: sans-serif; min-width: 200px;">
                  <div style="background:${color};color:white;padding:8px 12px;border-radius:6px 6px 0 0;margin:-8px -12px 8px;font-weight:600;font-size:15px;">
                    📍 ${name}
                  </div>
                  <table style="width:100%;font-size:13px;border-collapse:collapse;">
                    <tr><td style="color:#6b7280;padding:3px 0;">Pincode</td><td style="font-weight:600;">${pincode}</td></tr>
                    <tr><td style="color:#6b7280;padding:3px 0;">District</td><td style="font-weight:600;">${district}</td></tr>
                    <tr><td style="color:#6b7280;padding:3px 0;">Population</td><td style="font-weight:600;">${population}</td></tr>
                    <tr><td style="color:#6b7280;padding:3px 0;">Office Type</td><td style="font-weight:600;">${officetype}</td></tr>
                  </table>
                </div>
              `, { maxWidth: 280 });

                            polygon.on('mouseover', function () {
                                this.setStyle({ fillOpacity: 0.55, weight: 3 });
                            });
                            polygon.on('mouseout', function () {
                                this.setStyle({ fillOpacity: 0.25, weight: 1.5 });
                            });

                            polygon.addTo(map);
                            polygon._districtFilter = district;
                            polygon._pincodeFilter = pincode;
                            polygon._nameFilter = name.toLowerCase();
                            if (!kmlLayer) kmlLayer = [];
                            kmlLayer.push(polygon);
                        }
                    });
                });

                stats.value.totalZones = placemarks.length;
                districts.value = ['All', ...Array.from(districtSet).filter(d => d !== 'All').sort()];

            } catch (err) {
                console.error('KML parse error:', err);
                error.value = 'KML data load nahi ho saka: ' + err.message;
            }
        };

        const addCameraMarkers = (map, L) => {
            MOCK_CAMERAS.forEach(cam => {
                const color = cam.status === 'online'
                    ? (cam.alerts > 0 ? '#f97316' : '#22c55e')
                    : '#6b7280';

                const icon = L.divIcon({
                    html: `
            <div title="${cam.name}" style="
              width:22px; height:22px; border-radius:50%;
              background:${color}; border:3px solid white;
              box-shadow: 0 0 0 2px ${color}, 0 2px 8px rgba(0,0,0,0.4);
              display:flex; align-items:center; justify-content:center;
              cursor:pointer;
            ">
              <span style="font-size:10px;">📷</span>
            </div>
            ${cam.status === 'online' && cam.alerts > 0 ? `
            <div style="position:absolute;top:-6px;right:-6px;background:#ef4444;color:white;border-radius:50%;width:16px;height:16px;font-size:9px;display:flex;align-items:center;justify-content:center;font-weight:bold;border:2px solid white;">
              ${cam.alerts}
            </div>` : ''}
          `,
                    className: '',
                    iconSize: [22, 22],
                    iconAnchor: [11, 11],
                });

                const marker = L.marker([cam.lat, cam.lng], { icon })
                    .bindPopup(`
            <div style="font-family:sans-serif;min-width:190px;">
              <div style="background:${color};color:white;padding:8px 12px;border-radius:6px 6px 0 0;margin:-8px -12px 8px;font-weight:600;">
                📷 ${cam.name}
              </div>
              <table style="width:100%;font-size:13px;border-collapse:collapse;">
                <tr><td style="color:#6b7280;">Camera ID</td><td style="font-weight:600;">${cam.id}</td></tr>
                <tr><td style="color:#6b7280;">Status</td><td><span style="color:${color};font-weight:600;">${cam.status.toUpperCase()}</span></td></tr>
                <tr><td style="color:#6b7280;">Alerts</td><td style="font-weight:600;color:${cam.alerts > 0 ? '#ef4444' : '#22c55e'}">${cam.alerts > 0 ? cam.alerts + ' Active' : 'None'}</td></tr>
              </table>
            </div>
          `, { maxWidth: 220 })
                    .addTo(map);

                marker.on('click', () => {
                    selectedCamera.value = cam;
                });

                cameraMarkers.push(marker);
            });
        };

        // --- Zoom to filtered polygons ---
        const zoomToFilter = () => {
            if (!mapInstance.value || !kmlLayer || kmlLayer.length === 0) return;

            const query = searchQuery.value.trim().toLowerCase();
            const district = selectedDistrict.value;

            // Find matching polygons
            const matching = kmlLayer.filter(polygon => {
                const districtMatch = district === 'All' || polygon._districtFilter === district;
                const searchMatch = query === '' ||
                    (polygon._pincodeFilter && polygon._pincodeFilter.includes(query)) ||
                    (polygon._nameFilter && polygon._nameFilter.includes(query)) ||
                    (polygon._districtFilter && polygon._districtFilter.toLowerCase().includes(query));
                return districtMatch && searchMatch;
            });

            if (matching.length === 0) {
                // No match — reset to Delhi default view
                mapInstance.value.setView([28.6139, 77.2090], 11);
                return;
            }

            // Compute combined bounds of all matching polygons
            let bounds = null;
            matching.forEach(polygon => {
                const polyBounds = polygon.getBounds();
                if (!bounds) {
                    bounds = polyBounds;
                } else {
                    bounds = bounds.extend(polyBounds);
                }
            });

            if (bounds && bounds.isValid()) {
                mapInstance.value.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
            }
        };

        // Watch district change — zoom immediately
        watch(selectedDistrict, () => {
            zoomToFilter();
        });

        // Watch search query — debounce 300ms to avoid zooming on every keystroke
        let searchDebounce = null;
        watch(searchQuery, () => {
            clearTimeout(searchDebounce);
            searchDebounce = setTimeout(() => {
                zoomToFilter();
            }, 300);
        });

        onMounted(() => {
            initMap();
        });

        onUnmounted(() => {
            if (mapInstance.value) {
                mapInstance.value.remove();
                mapInstance.value = null;
            }
        });

        return () => (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0f172a', fontFamily: 'Inter, sans-serif' }}>

                {/* Header */}
                <div style={{ padding: '1rem 1.5rem', background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', borderBottom: '1px solid #1e3a5f', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ width: 40, height: 40, background: 'linear-gradient(135deg, #ef4444, #991b1b)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>🎥</div>
                        <div>
                            <h1 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: 'white' }}>CCTV Surveillance</h1>
                            <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8' }}>Delhi NCT — Real-time Zone Monitoring</p>
                        </div>
                    </div>

                    {/* Stats Row */}
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                        {[
                            { label: 'Zones', value: stats.value.totalZones, color: '#6366f1' },
                            { label: 'Online', value: stats.value.onlineCameras, color: '#22c55e' },
                            { label: 'Offline', value: stats.value.offlineCameras, color: '#6b7280' },
                            { label: 'Alerts', value: stats.value.totalAlerts, color: '#ef4444' },
                        ].map(s => (
                            <div key={s.label} style={{ background: '#1e293b', border: `1px solid ${s.color}33`, borderRadius: '8px', padding: '0.4rem 0.8rem', textAlign: 'center', minWidth: 60 }}>
                                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: s.color }}>{s.value}</div>
                                <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{s.label}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Toolbar */}
                <div style={{ padding: '0.75rem 1.5rem', background: '#1e293b', borderBottom: '1px solid #334155', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ color: '#94a3b8', fontSize: '0.85rem', fontWeight: 600 }}>🔍 Filter:</span>
                    <select
                        value={selectedDistrict.value}
                        onChange={(e) => { selectedDistrict.value = e.target.value; }}
                        style={{ background: '#0f172a', color: 'white', border: '1px solid #334155', borderRadius: '6px', padding: '0.35rem 0.75rem', fontSize: '0.85rem' }}
                    >
                        {districts.value.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <input
                        type="text"
                        placeholder="Search pincode or area..."
                        value={searchQuery.value}
                        onInput={(e) => { searchQuery.value = e.target.value; }}
                        style={{ background: '#0f172a', color: 'white', border: '1px solid #334155', borderRadius: '6px', padding: '0.35rem 0.75rem', fontSize: '0.85rem', minWidth: 200 }}
                    />

                    {/* Legend */}
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        <span style={{ color: '#64748b', fontSize: '0.75rem' }}>Legend:</span>
                        {[
                            { color: '#22c55e', label: 'Online' },
                            { color: '#f97316', label: 'Alert' },
                            { color: '#6b7280', label: 'Offline' },
                        ].map(l => (
                            <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                <div style={{ width: 10, height: 10, borderRadius: '50%', background: l.color, border: '2px solid white', boxShadow: `0 0 0 1px ${l.color}` }}></div>
                                <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>{l.label}</span>
                            </div>
                        ))}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <div style={{ width: 12, height: 12, background: '#6366f1', opacity: 0.5, border: '1px solid #6366f1' }}></div>
                            <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Pincode Zone</span>
                        </div>
                    </div>
                </div>

                {/* Map Container */}
                <div style={{ flex: 1, position: 'relative' }}>
                    {isLoading.value && (
                        <div style={{ position: 'absolute', inset: 0, zIndex: 1000, background: '#0f172a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
                            <div style={{ width: 50, height: 50, border: '4px solid #334155', borderTop: '4px solid #6366f1', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                            <p style={{ color: '#94a3b8', margin: 0 }}>Delhi NCT map load ho raha hai...</p>
                            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
                        </div>
                    )}
                    {error.value && (
                        <div style={{ position: 'absolute', inset: 0, zIndex: 1000, background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <div style={{ background: '#1e293b', padding: '2rem', borderRadius: '12px', border: '1px solid #ef444433', color: '#ef4444', maxWidth: 400, textAlign: 'center' }}>
                                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⚠️</div>
                                <p style={{ margin: 0, color: '#94a3b8' }}>{error.value}</p>
                            </div>
                        </div>
                    )}
                    <div ref={mapContainer} style={{ width: '100%', height: '100%' }}></div>

                    {/* Selected Camera Panel */}
                    {selectedCamera.value && (
                        <div style={{ position: 'absolute', bottom: '1.5rem', right: '1rem', zIndex: 999, background: '#1e293b', borderRadius: '12px', padding: '1rem 1.25rem', border: '1px solid #334155', minWidth: 220, boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                <span style={{ color: 'white', fontWeight: 600 }}>📷 {selectedCamera.value.name}</span>
                                <button onClick={() => { selectedCamera.value = null; }} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '1rem' }}>✕</button>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                <div style={{ background: '#0f172a', borderRadius: '8px', padding: '0.5rem', textAlign: 'center' }}>
                                    <div style={{ color: selectedCamera.value.status === 'online' ? '#22c55e' : '#6b7280', fontWeight: 700, fontSize: '0.8rem' }}>{selectedCamera.value.status.toUpperCase()}</div>
                                    <div style={{ color: '#64748b', fontSize: '0.7rem' }}>Status</div>
                                </div>
                                <div style={{ background: '#0f172a', borderRadius: '8px', padding: '0.5rem', textAlign: 'center' }}>
                                    <div style={{ color: selectedCamera.value.alerts > 0 ? '#ef4444' : '#22c55e', fontWeight: 700, fontSize: '0.8rem' }}>{selectedCamera.value.alerts}</div>
                                    <div style={{ color: '#64748b', fontSize: '0.7rem' }}>Alerts</div>
                                </div>
                            </div>
                            <div style={{ marginTop: '0.75rem', color: '#94a3b8', fontSize: '0.75rem' }}>ID: {selectedCamera.value.id}</div>
                        </div>
                    )}
                </div>
            </div>
        );
    }
};
