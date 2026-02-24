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

        const isFullScreen = ref(false);

        const toggleFullScreen = () => {
            isFullScreen.value = !isFullScreen.value;
            setTimeout(() => {
                if (mapInstance.value) {
                    mapInstance.value.invalidateSize();
                }
            }, 100);
        };

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

                            polygon.on('click', function () {
                                searchQuery.value = name;
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
            const matching = [];
            kmlLayer.forEach(polygon => {
                const districtMatch = district === 'All' || polygon._districtFilter === district;
                const searchMatch = query === '' ||
                    (polygon._pincodeFilter && polygon._pincodeFilter.includes(query)) ||
                    (polygon._nameFilter && polygon._nameFilter.includes(query)) ||
                    (polygon._districtFilter && polygon._districtFilter.toLowerCase().includes(query));

                if (districtMatch && searchMatch) {
                    matching.push(polygon);
                    polygon.addTo(mapInstance.value); // Show matching polygons
                } else {
                    polygon.removeFrom(mapInstance.value); // Hide non-matching polygons
                }
            });

            if (district === 'All' && query === '') {
                // No search or filter — reset to Delhi default view and show all
                mapInstance.value.setView([28.6139, 77.2090], 11);

                // Show all markers if default view
                cameraMarkers.forEach(marker => {
                    marker.addTo(mapInstance.value);
                });
                return;
            }

            if (matching.length === 0) {
                // Hide all markers if nothing matches the query
                cameraMarkers.forEach(marker => marker.removeFrom(mapInstance.value));
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

                // Show/Hide markers based on if they are within the filtered bounds
                cameraMarkers.forEach(marker => {
                    if (bounds.contains(marker.getLatLng())) {
                        marker.addTo(mapInstance.value);
                    } else {
                        marker.removeFrom(mapInstance.value);
                    }
                });
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
            <div style={{
                display: 'flex', flexDirection: 'column',
                ...(isFullScreen.value ? { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999 } : { flex: 1, minHeight: 0, height: '100%', overflow: 'hidden' }),
                background: '#f8fafc', fontFamily: 'Inter, sans-serif'
            }}>

                {/* Header */}
                <div style={{ padding: '0.8rem 1.5rem', background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ width: 40, height: 40, background: 'linear-gradient(135deg, #ef4444, #991b1b)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>🎥</div>
                        <div>
                            <h1 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: 'white' }}>CCTV Surveillance</h1>
                            <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8' }}>Delhi NCT — Real-time Zone Monitoring</p>
                        </div>
                    </div>

                    {/* Stats Row */}
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
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
                <div style={{ padding: '0.6rem 1.5rem', background: '#ffffff', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
                    <span style={{ color: '#475569', fontSize: '0.85rem', fontWeight: 600 }}>🔍 Filter:</span>
                    <select
                        value={selectedDistrict.value}
                        onChange={(e) => { selectedDistrict.value = e.target.value; }}
                        style={{ background: '#f8fafc', color: '#1e293b', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0.4rem 0.8rem', fontSize: '0.85rem', outline: 'none', transition: 'all 0.2s' }}
                    >
                        {districts.value.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <input
                        type="text"
                        placeholder="Search pincode or area..."
                        value={searchQuery.value}
                        onInput={(e) => { searchQuery.value = e.target.value; }}
                        style={{ background: '#f8fafc', color: '#1e293b', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0.4rem 0.8rem', fontSize: '0.85rem', minWidth: 200, outline: 'none', transition: 'all 0.2s' }}
                    />

                    {/* Legend */}
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', background: '#f1f5f9', padding: '0.4rem 0.8rem', borderRadius: '8px' }}>
                        <span style={{ color: '#475569', fontSize: '0.75rem', fontWeight: 600 }}>Legend:</span>
                        {[
                            { color: '#22c55e', label: 'Online' },
                            { color: '#f97316', label: 'Alert' },
                            { color: '#6b7280', label: 'Offline' },
                        ].map(l => (
                            <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                <div style={{ width: 10, height: 10, borderRadius: '50%', background: l.color, border: '2px solid white', boxShadow: `0 0 0 1px ${l.color}` }}></div>
                                <span style={{ color: '#475569', fontSize: '0.75rem', fontWeight: 500 }}>{l.label}</span>
                            </div>
                        ))}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <div style={{ width: 12, height: 12, background: '#6366f1', opacity: 0.5, border: '1px solid #6366f1', borderRadius: '2px' }}></div>
                            <span style={{ color: '#475569', fontSize: '0.75rem', fontWeight: 500 }}>Pincode Zone</span>
                        </div>
                    </div>
                    {/* Full Screen Toggle Button */}
                    <button
                        onClick={toggleFullScreen}
                        style={{
                            marginLeft: '1rem', background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', color: 'white', border: 'none',
                            borderRadius: '8px', padding: '0.5rem 1rem', fontSize: '0.85rem',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem',
                            fontWeight: 600, boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.4), 0 2px 4px -1px rgba(59, 130, 246, 0.2)', transition: 'transform 0.2s, box-shadow 0.2s'
                        }}
                    >
                        {isFullScreen.value ? 'Exit Full Screen ⛶' : 'Full Screen ⛶'}
                    </button>
                </div>

                {/* Map Container */}
                <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                    {isLoading.value && (
                        <div style={{ position: 'absolute', inset: 0, zIndex: 1000, background: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(4px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
                            <div style={{ width: 50, height: 50, border: '4px solid #e2e8f0', borderTop: '4px solid #3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                            <p style={{ color: '#475569', margin: 0, fontWeight: 500 }}>Loading map data...</p>
                            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
                        </div>
                    )}
                    {error.value && (
                        <div style={{ position: 'absolute', inset: 0, zIndex: 1000, background: 'rgba(255, 255, 255, 0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <div style={{ background: '#fef2f2', padding: '2rem', borderRadius: '16px', border: '1px solid #fca5a5', color: '#dc2626', maxWidth: 400, textAlign: 'center', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}>
                                <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>⚠️</div>
                                <p style={{ margin: 0, fontWeight: 500 }}>{error.value}</p>
                            </div>
                        </div>
                    )}
                    <div ref={mapContainer} style={{ width: '100%', height: '100%' }}></div>

                    {/* Selected Camera Panel */}
                    {selectedCamera.value && (
                        <div style={{ position: 'absolute', bottom: '2rem', right: '1.5rem', zIndex: 999, background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(10px)', borderRadius: '16px', padding: '1.25rem', border: '1px solid rgba(255,255,255,0.2)', minWidth: 260, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <span style={{ color: '#0f172a', fontWeight: 700, fontSize: '1.1rem' }}>📷 {selectedCamera.value.name}</span>
                                <button onClick={() => { selectedCamera.value = null; }} style={{ background: '#f1f5f9', border: 'none', color: '#475569', cursor: 'pointer', fontSize: '1rem', width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}>✕</button>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '0.75rem', textAlign: 'center' }}>
                                    <div style={{ color: selectedCamera.value.status === 'online' ? '#059669' : '#64748b', fontWeight: 800, fontSize: '0.9rem' }}>{selectedCamera.value.status.toUpperCase()}</div>
                                    <div style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 500, marginTop: '2px' }}>Status</div>
                                </div>
                                <div style={{ background: selectedCamera.value.alerts > 0 ? '#fef2f2' : '#f0fdf4', border: `1px solid ${selectedCamera.value.alerts > 0 ? '#fecaca' : '#bbf7d0'}`, borderRadius: '12px', padding: '0.75rem', textAlign: 'center' }}>
                                    <div style={{ color: selectedCamera.value.alerts > 0 ? '#dc2626' : '#059669', fontWeight: 800, fontSize: '0.9rem' }}>{selectedCamera.value.alerts}</div>
                                    <div style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 500, marginTop: '2px' }}>Alerts</div>
                                </div>
                            </div>
                            <div style={{ marginTop: '1rem', color: '#64748b', fontSize: '0.8rem', fontWeight: 500, textAlign: 'center', padding: '0.5rem', background: '#f1f5f9', borderRadius: '8px' }}>
                                Camera ID: <span style={{ color: '#0f172a', fontWeight: 600 }}>{selectedCamera.value.id}</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }
};
