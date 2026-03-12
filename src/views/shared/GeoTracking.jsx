/**
 * GeoTracking.jsx  — Multi-Area Geo-Based Case Routing Dashboard
 *
 * Behaviour by role:
 *   Client  → sees ALL area polygons for their city + ALL cases with partner names
 *             Bangalore clients also see camera layer with radius circles
 *   Partner → sees ONLY their assigned area polygon + ONLY their cases
 *   Admin   → same as client (all areas + all cases)
 *
 * All data loads via REST. Live updates via Socket.IO polling (new_case + case_status_updated).
 */

import { ref, computed, onMounted, onUnmounted, defineComponent, shallowRef } from 'vue';
import axios from 'axios';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';
import { io } from 'socket.io-client';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:4000';

// ── Leaflet default icon fix for Vite ─────────────────────────────────────────
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.3/dist/images/marker-shadow.png',
});

// ── Red marker icon for cases ─────────────────────────────────────────────────
const RED_ICON = L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

// ── Status badge color ────────────────────────────────────────────────────────
const STATUS_COLORS = {
    pending: '#f59e0b',
    assigned: '#3b82f6',
    'in-progress': '#8b5cf6',
    attended: '#10b981',
    resolved: '#22c55e',
    closed: '#6b7280'
};

// ── Decode JWT from localStorage (no library needed) ──────────────────────────
function decodeToken(token) {
    try {
        return JSON.parse(atob(token.split('.')[1]));
    } catch {
        return null;
    }
}

function getAuthInfo() {
    const clientToken = localStorage.getItem('token_client');
    const partnerToken = localStorage.getItem('token_partner');
    const adminToken = localStorage.getItem('token_admin') || localStorage.getItem('token_super_admin');

    // Safely get path, defaulting to empty string if not available
    const path = typeof window !== 'undefined' ? window.location.pathname : '';

    // Route-specific priority:
    // If we are on a partner route, check partner token FIRST
    if (path.includes('/partner') && partnerToken) {
        const p = decodeToken(partnerToken);
        const partnerId = p?.partnerId || p?.userId || p?.id;
        console.log('[GeoTracking] Partner route detected, JWT decoded:', { partnerId, clientId: p?.clientId, role: p?.role });
        return { token: partnerToken, role: 'partner', id: partnerId, clientId: p?.clientId };
    }

    // If we are on a client route, check client token FIRST
    if (path.includes('/client') && clientToken) {
        const p = decodeToken(clientToken);
        return { token: clientToken, role: 'client', id: p?.userId || p?.id, city: p?.city || null };
    }

    // If we are on admin routes, check admin token FIRST
    if ((path.includes('/admin') || path.includes('/super')) && adminToken) {
        const p = decodeToken(adminToken);
        return { token: adminToken, role: 'admin', id: p?.userId || p?.id };
    }

    // Fallbacks if no path matches or no specific token exists for that route:
    if (clientToken) {
        const p = decodeToken(clientToken);
        return { token: clientToken, role: 'client', id: p?.userId || p?.id, city: p?.city || null };
    }
    if (partnerToken) {
        const p = decodeToken(partnerToken);
        const partnerId = p?.partnerId || p?.userId || p?.id;
        return { token: partnerToken, role: 'partner', id: partnerId, clientId: p?.clientId };
    }
    if (adminToken) {
        const p = decodeToken(adminToken);
        return { token: adminToken, role: 'admin', id: p?.userId || p?.id };
    }

    return { token: null, role: 'guest', id: null };
}

export default defineComponent({
    name: 'GeoTracking',
    setup() {
        const mapContainer = ref(null);
        const map = shallowRef(null);
        const layers = shallowRef({
            boundaries: null,
            cameras: null,
            cases: null,
            heatmap: null
        });

        const toggles = ref({
            boundaries: true,
            cameras: true,
            cases: true,
            heatmap: false
        });

        const casesCoords = ref([]);
        const socketHandler = ref(null);
        const statsRef = ref({ total: 0, pending: 0, attended: 0, resolved: 0 });
        const noAreaWarning = ref(false); // shown when partner has no assigned area

        const allCameras = ref([]); // store all raw camera data
        const areaHiddenLayers = ref([]); // store layers hidden during area filtering

        // Auth info — determines what this user can see
        const auth = getAuthInfo();

        // ── Mount guard ───────────────────────────────────────────────────────
        let isMounted = false;

        const isReady = () =>
            isMounted && map.value && layers.value.boundaries;

        // ── Map init ──────────────────────────────────────────────────────────
        // For partners: start at a neutral zoom so fitBounds shows their area correctly.
        // For clients/admins: start at India view as fallback.
        const initMap = () => {
            if (map.value || !mapContainer.value) return;

            try {
                // Partner: start zoomed in to Delhi/NCR region by default (fitBounds will override)
                // Client/Admin: start at India center
                const initialCenter = auth.role === 'partner' ? [28.6139, 77.2090] : [20.5937, 78.9629];
                const initialZoom = auth.role === 'partner' ? 11 : 5;

                const m = L.map(mapContainer.value, {
                    center: initialCenter,
                    zoom: initialZoom,
                    fadeAnimation: false,
                    markerZoomAnimation: false,
                    zoomSnap: 0.25,  // finer zoom steps for fitBounds precision
                });

                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                    maxZoom: 19,
                }).addTo(m);

                layers.value = {
                    boundaries: L.layerGroup().addTo(m),
                    cameras: L.layerGroup().addTo(m),
                    cases: L.layerGroup().addTo(m),
                    heatmap: null
                };

                map.value = m;
            } catch (err) {
                console.error('[GeoTracking] Map init error:', err);
            }
        };

        // ── Fit map to a Leaflet bounds object safely ──────────────────────────
        // Always call this AFTER the geoLayer is added to its parent layerGroup.
        // ✅ FIX: Wait 200ms for Leaflet to fully render the polygon into the DOM
        // before calling getBounds() — otherwise bounds come back invalid/empty.
        const fitToLayer = (geoLayer) => {
            if (!isReady() || !geoLayer) return;
            setTimeout(() => {
                try {
                    if (!isReady()) return;
                    map.value.invalidateSize();   // ensure map knows its real dimensions
                    const bounds = geoLayer.getBounds();
                    // isValid() returns false for empty/degenerate bounds
                    if (bounds && bounds.isValid()) {
                        map.value.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
                        console.log('[GeoTracking] ✅ fitBounds applied to partner area');
                    } else {
                        console.warn('[GeoTracking] bounds invalid — polygon may have no coordinates');
                    }
                } catch (e) {
                    console.warn('[GeoTracking] fitBounds failed:', e.message);
                }
            }, 200);
        };

        // ── Fetch & render areas (role-filtered, NO fallback for partners) ──────
        const fetchAreas = async () => {
            try {
                noAreaWarning.value = false;

                // Build role-specific query params + always send auth token
                const params = {};
                const headers = auth.token ? { Authorization: `Bearer ${auth.token}` } : {};

                if (auth.role === 'client') params.clientId = auth.id;
                if (auth.role === 'partner') params.partnerId = auth.id;
                // admin → no filter (sees all)

                const { data } = await axios.get(`${API_BASE_URL}/areas`, { params, headers });

                if (!isReady()) return;

                // Partner with NO assigned area → show warning, do NOT load all areas
                if (data?.features?.length === 0) {
                    if (auth.role === 'partner') {
                        console.warn('[GeoTracking] Partner has no assigned area yet.');
                        noAreaWarning.value = true;
                    }
                    return; // do not render anything
                }

                if (data.type === 'FeatureCollection' && data.features.length > 0) {
                    layers.value.boundaries.clearLayers();

                    const geoLayer = L.geoJSON(data, {
                        style: feature => {
                            const city = feature.properties?.city;
                            return {
                                color: city === 'Delhi' ? '#ef4444' : '#3b82f6',
                                weight: 2,
                                opacity: 0.9,
                                fillColor: city === 'Delhi' ? '#fecaca' : '#bfdbfe',
                                fillOpacity: auth.role === 'partner' ? 0.35 : 0.15
                            };
                        },
                        onEachFeature: (feature, layer) => {
                            const p = feature.properties;
                            const partnerInfo = p.partnerName && p.partnerName !== 'Unassigned'
                                ? `<br/><b>Partner:</b> ${p.partnerName}`
                                : '<br/><span style="color:#9ca3af">No partner assigned</span>';
                            layer.bindPopup(
                                `<b>${p.name}</b><br/><b>City:</b> ${p.city}${partnerInfo}`
                            );
                        }
                    });

                    if (toggles.value.boundaries && isReady()) {
                        layers.value.boundaries.addLayer(geoLayer);
                        // fitToLayer MUST be after addLayer so getBounds() works correctly
                        // This auto-zooms the map to exactly the partner's area boundary
                        fitToLayer(geoLayer);

                        // Populate the dropdown list
                        updateAvailableAreas(data);
                    }
                }
            } catch (err) {
                console.error('[GeoTracking] fetchAreas error:', err);
            }
        };


        // ── Fetch & render cameras (Bangalore only) ───────────────────────────
        const fetchCameras = async () => {
            try {
                // Cameras only exist for Bangalore
                const { data } = await axios.get(`${API_BASE_URL}/cameras`, {
                    params: { city: 'Bangalore' }
                });
                if (!isReady()) return;

                if (data.type === 'FeatureCollection') {
                    allCameras.value = data.features; // save for filtering
                    renderCameras(data.features);
                }
            } catch (err) {
                console.error('[GeoTracking] fetchCameras error:', err);
            }
        };

        const renderCameras = (features) => {
            if (!isReady()) return;
            layers.value.cameras.clearLayers();

            features.forEach(feature => {
                if (!feature.geometry?.coordinates) return;

                const latlng = [
                    feature.geometry.coordinates[1],
                    feature.geometry.coordinates[0]
                ];
                const p = feature.properties || {};
                const radius = p.radius || 300;
                const statusColor = p.isActive ? '#10b981' : '#ef4444';

                const popupContent = `
                    <div style="min-width:260px; font-family: 'Inter', sans-serif; padding:4px;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                            <span style="font-size:16px; font-weight:700; color:#1e293b;">📷 ${p.locationName || p.name}</span>
                            <span style="background:${statusColor}20; color:${statusColor}; padding:2px 8px; border-radius:12px; font-size:11px; font-weight:700; border:1px solid ${statusColor}40;">
                                ${p.isActive ? 'ACTIVE' : 'INACTIVE'}
                            </span>
                        </div>
                        <div style="background:#f8fafc; border-radius:10px; padding:12px; border:1px solid #e2e8f0;">
                            <table style="width:100%; font-size:12px; border-collapse:collapse;">
                                <tr style="border-bottom:1px solid #e2e8f0;">
                                    <td style="padding:4px 0; color:#64748b; font-weight:500;">Camera ID</td>
                                    <td style="padding:4px 0; color:#1e293b; font-weight:600; text-align:right;">${p.cameraId || 'N/A'}</td>
                                </tr>
                                <tr style="border-bottom:1px solid #e2e8f0;">
                                    <td style="padding:4px 0; color:#64748b; font-weight:500;">Latitude</td>
                                    <td style="padding:4px 0; color:#1e293b; font-weight:600; text-align:right;">${latlng[0].toFixed(6)}</td>
                                </tr>
                                <tr style="border-bottom:1px solid #e2e8f0;">
                                    <td style="padding:4px 0; color:#64748b; font-weight:500;">Longitude</td>
                                    <td style="padding:4px 0; color:#1e293b; font-weight:600; text-align:right;">${latlng[1].toFixed(6)}</td>
                                </tr>
                            </table>
                        </div>
                        ${p.videoUrl ? `
                            <a href="${p.videoUrl}" target="_blank" style="display:block; margin-top:12px; background:#4f46e5; color:white; text-align:center; padding:10px; border-radius:10px; text-decoration:none; font-weight:700; font-size:13px; box-shadow:0 4px 6px -1px rgba(79,70,229,0.2);">
                                📹 Watch Live Stream
                            </a>
                        ` : `
                            <div style="margin-top:10px; text-align:center; font-size:11px; color:#94a3b8;">Live Feed Unavailable</div>
                        `}
                    </div>
                `;

                const marker = L.marker(latlng).bindPopup(popupContent);
                const circle = L.circle(latlng, {
                    radius,
                    color: statusColor,
                    weight: 1,
                    fillOpacity: 0.08,
                    fillColor: statusColor
                });

                layers.value.cameras.addLayer(marker);
                layers.value.cameras.addLayer(circle);

                // Attach ID for direct lookup (standardized string)
                marker.cameraId = String(p.cameraId || '');
            });
        };

        // ── Render a single case feature ──────────────────────────────────────
        const renderCase = (feature, addToHeatmap = true) => {
            if (!isReady() || !feature?.geometry?.coordinates) return;

            const latlng = [
                feature.geometry.coordinates[1],
                feature.geometry.coordinates[0]
            ];
            const p = feature.properties || {};
            const status = p.status || 'pending';
            const color = STATUS_COLORS[status] || '#6b7280';

            const marker = L.marker(latlng, { icon: RED_ICON }).bindPopup(`
                <div style="min-width:180px;font-family:sans-serif">
                    <b style="font-size:14px">${p.title || 'Untitled Case'}</b>
                    <hr style="margin:6px 0;border-color:#e5e7eb"/>
                    <span style="background:${color};color:white;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:600">
                        ${status.toUpperCase()}
                    </span>
                    ${p.partnerName ? `<br/><span style="color:#374151;font-size:12px;margin-top:4px;display:block">👮 ${p.partnerName}</span>` : ''}
                    ${p.attendedAt ? `<br/><span style="color:#6b7280;font-size:11px">Attended: ${new Date(p.attendedAt).toLocaleString()}</span>` : ''}
                    ${p.description ? `<br/><span style="color:#4b5563;font-size:12px;margin-top:4px;display:block">${p.description.substring(0, 80)}</span>` : ''}
                    <br/><span style="color:#9ca3af;font-size:11px">${new Date(p.createdAt).toLocaleDateString()}</span>
                </div>
            `);

            layers.value.cases.addLayer(marker);

            if (addToHeatmap) {
                casesCoords.value.push([...latlng, 1]);
            }
        };

        // ── Heatmap ───────────────────────────────────────────────────────────
        const updateHeatmap = () => {
            if (!isReady()) return;

            if (layers.value.heatmap) {
                map.value.removeLayer(layers.value.heatmap);
                layers.value.heatmap = null;
            }

            if (toggles.value.heatmap && casesCoords.value.length > 0) {
                layers.value.heatmap = L.heatLayer(casesCoords.value, {
                    radius: 30,
                    blur: 20,
                    maxZoom: 15
                }).addTo(map.value);
            }
        };

        // ── Fetch & render cases via Alert API (the real incident system) ──────────
        // Cases are stored as Alert documents, NOT in the Case model.
        // Only alerts with location.coordinates can be mapped.
        const fetchCases = async () => {
            try {
                const headers = auth.token ? { Authorization: `Bearer ${auth.token}` } : {};
                let endpoint;

                if (auth.role === 'partner') {
                    endpoint = `${API_BASE_URL}/alerts/partner`;  // only their assigned cases
                } else {
                    endpoint = `${API_BASE_URL}/alerts`;           // client/admin: all tenant cases
                }

                const { data } = await axios.get(endpoint, { headers });
                if (!isReady()) return;

                // Alerts API: { success, data: { alerts: [...], total, statusCounts } }
                const rawAlerts = data?.data?.alerts || [];

                casesCoords.value = [];
                layers.value.cases.clearLayers();

                rawAlerts.forEach(alert => {
                    if (!alert.location?.coordinates?.length) return; // skip if no GPS
                    const feature = {
                        geometry: alert.location,
                        properties: {
                            id: alert._id,
                            title: alert.title,
                            status: alert.status,
                            description: alert.message,
                            partnerName: alert.assignedPartnerId?.name || null,
                            attendedAt: alert.attendedAt,
                            createdAt: alert.createdAt,
                            priority: alert.priority
                        }
                    };
                    renderCase(feature, true);
                });


                if (!toggles.value.cases && isReady()) {
                    layers.value.cases.clearLayers();
                }
                updateHeatmap();

                // Map Alert status names to stats panel
                const sc = data?.data?.statusCounts || {};
                statsRef.value = {
                    total: data?.data?.total || rawAlerts.length,
                    pending: (sc['Reported'] || 0) + (sc['Under Review'] || 0),
                    attended: sc['Action Taken'] || 0,
                    resolved: sc['Resolved'] || 0
                };
            } catch (err) {
                // Non-critical: map showing areas/cameras is still useful without cases
                console.warn('[GeoTracking] fetchCases (non-critical):', err.message);
            }
        };

        // ── Toggle handler ────────────────────────────────────────────────────
        const handleToggle = async (layerName) => {
            if (!isReady()) return;

            toggles.value[layerName] = !toggles.value[layerName];

            if (layerName === 'heatmap') { updateHeatmap(); return; }

            const l = layers.value[layerName];
            if (!l) return;

            if (toggles.value[layerName]) {
                map.value.addLayer(l);

                // ── OPTIMIZATION: Only fetch if the layer group is empty ──
                const isEmpty = l.getLayers().length === 0;

                if (layerName === 'boundaries' && isEmpty) await fetchAreas();
                if (layerName === 'cameras' && (isEmpty || allCameras.value.length === 0)) await fetchCameras();
                if (layerName === 'cases' && isEmpty) await fetchCases();

                // ── SYNC FIX: If a specific focus is active, re-apply it after re-enabling layer ──
                if (selectedAreaId.value && (layerName === 'boundaries' || layerName === 'cameras')) {
                    handleAreaChange({ target: { value: selectedAreaId.value } });

                    if (selectedCameraId.value && layerName === 'cameras') {
                        handleCameraChange({ target: { value: selectedCameraId.value } });
                    }
                }
            } else {
                map.value.removeLayer(l);
                // DO NOT clearLayers() here if we want to preserve state when toggling off/on
                // Just keep them in memory so re-enabling is instant and doesn't reset filters
                if (layerName === 'heatmap') updateHeatmap();
            }
        };

        // ── WebSocket — live updates ───────────────────────────────────────────
        const connectWebSocket = () => {
            if (socketHandler.value || !isMounted) return;

            const { token } = auth;

            const socket = io(WS_URL, {
                path: '/socket.io/',
                auth: { token },
                transports: ['polling'],   // polling only — avoids WS upgrade loop
                reconnection: true,
                reconnectionAttempts: 5,
                reconnectionDelay: 3000,
                reconnectionDelayMax: 10000
            });

            socketHandler.value = socket;

            socket.on('connect', () =>
                console.log('[GeoTracking] ✅ Live updates connected (polling)')
            );

            socket.on('connect_error', err =>
                console.warn('[GeoTracking] Live connection error (map still functional):', err.message)
            );

            // New case submitted → render on map immediately
            socket.on('new_case', caseGeoJSON => {
                if (!isReady()) return;
                console.log('[GeoTracking] 🆕 New case live:', caseGeoJSON?.properties?.title);
                renderCase(caseGeoJSON, true);
                if (toggles.value.heatmap) updateHeatmap();
                statsRef.value.total++;
                statsRef.value.pending++;
            });

            // Case status updated → refresh cases layer
            socket.on('case_status_updated', updatedGeoJSON => {
                if (!isReady()) return;
                console.log('[GeoTracking] 🔄 Case updated:', updatedGeoJSON?.properties?.status);
                // Full refresh to re-render popup content with new status
                fetchCases();
            });
        };

        // ── Advanced Filtering & Zoom Logic ──────────────────────────────────
        const selectedAreaId = ref('');
        const selectedCameraId = ref('');
        const availableAreas = ref([]);
        const filteredCameras = ref([]);

        // Extract areas from boundary features for the dropdown
        const updateAvailableAreas = (data) => {
            if (data?.features) {
                availableAreas.value = data.features.map(f => ({
                    // CRITICAL: Must use a STABLE ID (name or _id) to prevent resets during toggle
                    id: f.properties?.name || f.id || f.properties?._id || 'unknown',
                    name: f.properties?.name || 'Unnamed Area',
                    feature: f
                })).sort((a, b) => a.name.localeCompare(b.name));
            }
        };

        const handleAreaChange = (e) => {
            const areaId = e.target.value;
            selectedAreaId.value = areaId;
            selectedCameraId.value = ''; // Reset camera filter
            filteredCameras.value = [];

            // ── RESTORE STEP: Always show all areas before filtering ──
            if (areaHiddenLayers.value.length > 0) {
                areaHiddenLayers.value.forEach(l => l.addTo(map.value));
                areaHiddenLayers.value = [];
            }

            if (!areaId) {
                // Show all cameras when 'All Areas' is selected
                renderCameras(allCameras.value);

                const defaultCenter = auth.role === 'partner' ? [28.6139, 77.2090] : [20.5937, 78.9629];
                const defaultZoom = auth.role === 'partner' ? 11 : 5;
                map.value.setView(defaultCenter, defaultZoom);

                // Re-fit to all boundaries
                if (layers.value.boundaries) {
                    const groupBounds = layers.value.boundaries.getBounds();
                    if (groupBounds && groupBounds.isValid()) {
                        map.value.fitBounds(groupBounds, { padding: [40, 40] });
                    }
                }
                return;
            }

            let foundAreaLayer = null;

            // 1. Filter Area Visibility
            layers.value.boundaries.eachLayer(l => {
                l.eachLayer(subLayer => {
                    const featureName = subLayer.feature?.properties?.name;
                    const selectedName = availableAreas.value.find(a => a.id === areaId)?.name;

                    if (featureName === selectedName) {
                        foundAreaLayer = subLayer;
                        if (!map.value.hasLayer(subLayer)) {
                            subLayer.addTo(map.value); // ensure it's visible
                        }
                        const bounds = subLayer.getBounds();
                        if (bounds && bounds.isValid()) {
                            map.value.fitBounds(bounds, { padding: [60, 60], maxZoom: 15 });
                            subLayer.openPopup();
                        }
                    } else {
                        // Hide non-selected areas
                        areaHiddenLayers.value.push(subLayer);
                        subLayer.removeFrom(map.value);
                    }
                });
            });

            // 2. Spatial Camera Filtering (Exact Point-in-Polygon)
            if (foundAreaLayer) {
                const areaPolygon = foundAreaLayer;

                // Helper: Ray-casting algorithm for exact boundary check
                const isPointInPolygon = (lat, lng, polyLayer) => {
                    // Handle nested arrays (MultiPolygons or holes)
                    const latlngs = polyLayer.getLatLngs();
                    const checkInRing = (ring) => {
                        let isInside = false;
                        for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
                            const xi = ring[i].lat, yi = ring[i].lng;
                            const xj = ring[j].lat, yj = ring[j].lng;
                            const intersect = ((yi > lng) !== (yj > lng))
                                && (lat < (xj - xi) * (lng - yi) / (yj - yi) + xi);
                            if (intersect) isInside = !isInside;
                        }
                        return isInside;
                    };

                    // Deep check for nested rings
                    if (Array.isArray(latlngs[0]) && !latlngs[0].lat) {
                        return latlngs.some(ring => checkInRing(ring));
                    }
                    return checkInRing(latlngs);
                };

                const camerasInArea = allCameras.value.filter(cam => {
                    const lat = cam.geometry.coordinates[1];
                    const lng = cam.geometry.coordinates[0];
                    return isPointInPolygon(lat, lng, areaPolygon);
                });

                filteredCameras.value = camerasInArea.map(c => ({
                    id: c.properties.cameraId,
                    name: c.properties.locationName || c.properties.name || 'Unnamed Camera'
                })).sort((a, b) => a.name.localeCompare(b.name));

                // Update map to only show these cameras
                renderCameras(camerasInArea);
            }
        };

        const handleCameraChange = (e) => {
            const camId = String(e.target.value || '');
            selectedCameraId.value = camId;

            if (!camId) return;

            // Find marker in cameras layer group
            layers.value.cameras.eachLayer(layer => {
                if (layer instanceof L.Marker && String(layer.cameraId) === camId) {
                    map.value.setView(layer.getLatLng(), 18);
                    layer.openPopup();
                }
            });
        };

        // ── Lifecycle ─────────────────────────────────────────────────────────
        onMounted(async () => {
            isMounted = true;
            initMap();
            // ✅ FIX: Fetch areas FIRST (sequential) so fitBounds runs on a ready map.
            // Then fetch cameras & cases in parallel (they don't affect map zoom).
            await fetchAreas();
            await Promise.all([fetchCameras(), fetchCases()]);
            connectWebSocket();
        });

        onUnmounted(() => {
            isMounted = false;

            if (socketHandler.value) {
                socketHandler.value.disconnect();
                socketHandler.value = null;
            }
            if (map.value) {
                try { map.value.remove(); } catch (_) { }
                map.value = null;
            }
            layers.value = { boundaries: null, cameras: null, cases: null, heatmap: null };
        });

        // ── Template ──────────────────────────────────────────────────────────
        return () => (
            <div style="height: 100%; display: flex; flex-direction: column; background: #f8fafc; padding: 14px 18px; gap: 10px; box-sizing: border-box; overflow: hidden;">

                {/* ── Header ── */}
                <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
                    <div>
                        <h2 style="margin:0; font-size:22px; font-weight:700; background:linear-gradient(135deg,#2563eb,#4f46e5); -webkit-background-clip:text; color:transparent;">
                            🗺️ Geo Tracking Dashboard
                        </h2>
                        <p style="margin:4px 0 0; font-size:13px; color:#64748b;">
                            {auth.role === 'partner'
                                ? 'Showing your assigned area and cases'
                                : 'All city areas, cases and partner assignments'}
                        </p>
                    </div>

                    {/* Advanced Filters */}
                    <div style="display:flex; align-items:center; gap:16px; flex-wrap:wrap;">
                        {/* Area Selector */}
                        <div style="display:flex; align-items:center; gap:10px; background:white; padding:10px 16px; border-radius:14px; border:1.5px solid #e2e8f0; box-shadow:0 2px 8px rgba(0,0,0,0.04); transition:all 0.3s ease;">
                            <span style="font-size:14px; font-weight:700; color:#64748b;">📍 Area:</span>
                            <select
                                value={selectedAreaId.value}
                                onChange={handleAreaChange}
                                style="border:none; background:transparent; font-size:14px; font-weight:700; color:#1e293b; outline:none; cursor:pointer; min-width:180px; font-family:inherit;"
                            >
                                <option value="">All City Areas</option>
                                {availableAreas.value.map(area => (
                                    <option key={area.id} value={area.id}>{area.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Camera Selector (Only shown when an area is selected) */}
                        {selectedAreaId.value && filteredCameras.value.length > 0 && (
                            <div style="display:flex; align-items:center; gap:10px; background:#f0f9ff; padding:10px 16px; border-radius:14px; border:1.5px solid #bae6fd; box-shadow:0 2px 8px rgba(14,165,233,0.1); animation: slideIn 0.3s ease-out;">
                                <span style="font-size:14px; font-weight:700; color:#0369a1;">📷 Camera:</span>
                                <select
                                    value={selectedCameraId.value}
                                    onChange={handleCameraChange}
                                    style="border:none; background:transparent; font-size:14px; font-weight:700; color:#0c4a6e; outline:none; cursor:pointer; min-width:200px; font-family:inherit;"
                                >
                                    <option value="">Select Camera ({filteredCameras.value.length})</option>
                                    {filteredCameras.value.map(cam => (
                                        <option key={cam.id} value={cam.id}>{cam.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>

                    {/* Layer toggles */}
                    <div style="display:flex; gap:12px; background:white; padding:10px 16px; border-radius:12px; box-shadow:0 1px 4px rgba(0,0,0,0.08); border:1px solid #e2e8f0; flex-wrap:wrap;">
                        {[
                            { key: 'boundaries', label: 'Areas', emoji: '🔷' },
                            { key: 'cameras', label: 'Cameras', emoji: '📷' },
                            { key: 'cases', label: 'Cases', emoji: '📍' },
                            { key: 'heatmap', label: 'Heatmap', emoji: '🔥' }
                        ].map(({ key, label, emoji }) => (
                            <label key={key} style="display:flex; align-items:center; gap:6px; cursor:pointer; user-select:none;">
                                <input
                                    type="checkbox"
                                    style="width:15px; height:15px; accent-color:#4f46e5; cursor:pointer;"
                                    checked={toggles.value[key]}
                                    onChange={() => handleToggle(key)}
                                />
                                <span style="font-size:13px; font-weight:500; color:#374151;">
                                    {emoji} {label}
                                </span>
                            </label>
                        ))}
                    </div>
                </div>

                {/* ── Stats bar ── */}
                <div style="display:flex; gap:12px; flex-wrap:wrap;">
                    {[
                        { label: 'Total Cases', value: statsRef.value.total, color: '#3b82f6' },
                        { label: 'Pending', value: statsRef.value.pending, color: '#f59e0b' },
                        { label: 'Attended', value: statsRef.value.attended, color: '#10b981' },
                        { label: 'Resolved', value: statsRef.value.resolved, color: '#22c55e' }
                    ].map(({ label, value, color }) => (
                        <div key={label} style={`background:white; border-radius:10px; padding:10px 18px; border-left:3px solid ${color}; box-shadow:0 1px 3px rgba(0,0,0,0.06); flex:1; min-width:120px;`}>
                            <div style={`font-size:22px; font-weight:700; color:${color};`}>{value}</div>
                            <div style="font-size:12px; color:#6b7280; margin-top:2px;">{label}</div>
                        </div>
                    ))}
                </div>

                {/* ── No-area warning for partners ── */}
                {noAreaWarning.value && (
                    <div style="background:#fef3c7; border:1.5px solid #fbbf24; border-radius:12px; padding:14px 20px; display:flex; align-items:center; gap:12px; font-size:14px; color:#92400e; font-weight:600;">
                        <span style="font-size:22px;">⚠️</span>
                        <div>
                            <div>You have not been assigned to any area yet.</div>
                            <div style="font-size:12px; font-weight:400; margin-top:2px; color:#b45309;">Please contact your admin/client to assign you to an area. The map will show your jurisdiction once assigned.</div>
                        </div>
                    </div>
                )}

                {/* ── Map container — always rendered (never conditionally mounted) ── */}
                <div
                    ref={mapContainer}
                    style="flex:1; min-height:350px; border-radius:16px; overflow:hidden; box-shadow:0 8px 25px -5px rgba(0,0,0,0.12); border:1.5px solid #e2e8f0; z-index:10; width:100%;"
                />
            </div>
        );
    }
});
