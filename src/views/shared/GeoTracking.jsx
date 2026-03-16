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

        const mapToggles = ref({
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
        const isLiveMode = ref(true); // Toggle for LIVE / HISTORICAL

        // Custom dropdown state
        const showAreaSelector = ref(false);
        const showCameraSelector = ref(false);

        // Click-away listener
        const handleClickOutside = (event) => {
            if (!event.target.closest('.custom-dropdown')) {
                showAreaSelector.value = false;
                showCameraSelector.value = false;
            }
        };

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
                    zoomSnap: 0.25,
                    zoomControl: false, // Hide default zoom buttons as requested
                });

                // Use a cleaner, minimal map style (CartoDB Positron)
                L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
                    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
                    subdomains: 'abcd',
                    maxZoom: 20
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

                    if (mapToggles.value.boundaries && isReady()) {
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
                // Fetch cameras based on client's city (fallback to Bangalore if not set)
                const targetCity = auth.city || 'Bangalore';
                const { data } = await axios.get(`${API_BASE_URL}/cameras`, {
                    params: { city: targetCity }
                });
                if (!isReady()) return;

                if (data.type === 'FeatureCollection') {
                    allCameras.value = data.features; // save for filtering
                    renderCameras(data.features);

                    // Ensure selector is populated if 'All Areas' is selected (default)
                    if (!selectedAreaId.value) {
                        filteredCameras.value = data.features.map(c => ({
                            id: c.properties.cameraId,
                            name: c.properties.locationName || c.properties.name || 'Unnamed Camera'
                        })).sort((a, b) => a.name.localeCompare(b.name));
                    }
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

                const status = p.status || 'online';
                const color = status === 'online' ? '#22c55e' : '#6b7280';

                const icon = L.divIcon({
                    html: `
                        <div title="${p.cameraName || 'Camera'}" style="
                            width:22px; height:22px; border-radius:50%;
                            background:${color}; border:3px solid white;
                            box-shadow: 0 0 0 2px ${color}, 0 2px 8px rgba(0,0,0,0.4);
                            display:flex; align-items:center; justify-content:center;
                            cursor:pointer;
                        ">
                            <span style="font-size:10px;">📷</span>
                        </div>
                    `,
                    className: '',
                    iconSize: [22, 22],
                    iconAnchor: [11, 11],
                    popupAnchor: [0, -11]
                });

                const marker = L.marker(latlng, { icon }).bindPopup(popupContent);
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

            if (mapToggles.value.heatmap && casesCoords.value.length > 0) {
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


                if (!mapToggles.value.cases && isReady()) {
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

            mapToggles.value[layerName] = !mapToggles.value[layerName];

            if (layerName === 'heatmap') { updateHeatmap(); return; }

            const l = layers.value[layerName];
            if (!l) return;

            if (mapToggles.value[layerName]) {
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
                if (mapToggles.value.heatmap) updateHeatmap();
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
                
                // Populate filteredCameras with all cameras so the selector is still visible and functional
                filteredCameras.value = allCameras.value.map(c => ({
                    id: c.properties.cameraId,
                    name: c.properties.locationName || c.properties.name || 'Unnamed Camera'
                })).sort((a, b) => a.name.localeCompare(b.name));

                const defaultCenter = auth.role === 'partner' ? [28.6139, 77.2090] : [20.5937, 78.9629];
                const defaultZoom = auth.role === 'partner' ? 11 : 5;
                map.value.setView(defaultCenter, defaultZoom);

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

        const goToCurrentLocation = () => {
            if (!map.value) return;
            map.value.locate({ setView: true, maxZoom: 16 });
        };

        const handleZoom = (delta) => {
            if (!map.value) return;
            if (delta > 0) map.value.zoomIn();
            else map.value.zoomOut();
        };

        const toggleMode = (mode) => {
            isLiveMode.value = mode === 'live';
        };

        // ── Lifecycle ─────────────────────────────────────────────────────────
        onMounted(async () => {
            isMounted = true;
            initMap();
            document.addEventListener('mousedown', handleClickOutside);

            // Inject global styles for custom dropdowns and scrollbar hiding
            const style = document.createElement('style');
            style.id = 'geo-tracking-custom-styles';
            style.innerHTML = `
                @keyframes slideIn {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .hide-scrollbar::-webkit-scrollbar { 
                    display: none !important;
                    width: 0 !important;
                    height: 0 !important;
                }
                .hide-scrollbar { 
                    -ms-overflow-style: none !important; 
                    scrollbar-width: none !important; 
                    overflow-x: hidden !important;
                }
                .dropdown-item:hover { 
                    background: rgba(99, 102, 241, 0.1) !important; 
                    color: #818cf8 !important; 
                }
            `;
            document.head.appendChild(style);

            // ✅ FIX: Fetch areas FIRST (sequential) so fitBounds runs on a ready map.
            // Then fetch cameras & cases in parallel (they don't affect map zoom).
            await fetchAreas();
            await Promise.all([fetchCameras(), fetchCases()]);
            connectWebSocket();
        });

        onUnmounted(() => {
            isMounted = false;
            document.removeEventListener('mousedown', handleClickOutside);

            // Clean up injected styles
            const style = document.getElementById('geo-tracking-custom-styles');
            if (style) style.remove();

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
            <div style="height: 100%; display: flex; flex-direction: column; background: #0f172a; padding: 0; box-sizing: border-box; overflow: hidden; font-family: 'Inter', sans-serif;">

                {/* ── Main Map Container Wrapper ── */}

                {/* ── Main Map Container Wrapper ── */}
                <div style="flex:1; position: relative; width: 100%; height: 100%; overflow: hidden;">

                    {/* ── ACTUAL MAP ── */}
                    <div
                        ref={mapContainer}
                        style="width: 100%; height: 100%; z-index: 1;"
                    />

                    <div style="position: absolute; top: 20px; left: 20px; z-index: 1000; display: flex; gap: 12px; align-items: center;">
                        {/* Area Selector (Custom Dropdown) */}
                        <div class="custom-dropdown" style="position: relative;">
                            <div 
                                onClick={() => { showAreaSelector.value = !showAreaSelector.value; showCameraSelector.value = false; }}
                                style="background: rgba(30, 41, 59, 0.85); backdrop-filter: blur(12px); padding: 6px 12px; border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.1); display: flex; align-items: center; gap: 8px; box-shadow: 0 8px 32px rgba(0,0,0,0.3); cursor: pointer; transition: all 0.2s;"
                                onMouseOver={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'}
                                onMouseOut={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
                            >
                                <span style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Area</span>
                                <span style="font-size: 13px; font-weight: 700; color: #f8fafc; max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                                    {selectedAreaId.value ? availableAreas.value.find(a => a.id === selectedAreaId.value)?.name : 'All City Areas'}
                                </span>
                                <span style={`font-size: 10px; color: #6366f1; transition: transform 0.3s; ${showAreaSelector.value ? 'transform: rotate(180deg);' : ''}`}>▼</span>
                            </div>

                            {showAreaSelector.value && (
                                <div class="dropdown-list hide-scrollbar" style="position: absolute; top: calc(100% + 8px); left: 0; width: 220px; max-height: 300px; background: #1e293b; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; overflow-y: auto; overflow-x: hidden; box-shadow: 0 16px 48px rgba(0,0,0,0.5); z-index: 1001; animation: slideIn 0.2s ease-out;">
                                    <div 
                                        onClick={() => { handleAreaChange({ target: { value: '' } }); showAreaSelector.value = false; }}
                                        class="dropdown-item"
                                        style={`padding: 10px 16px; font-size: 13px; cursor: pointer; transition: all 0.2s; ${!selectedAreaId.value ? 'background: rgba(99, 102, 241, 0.15); color: #818cf8; font-weight: 700;' : 'color: #cbd5e1;'}`}
                                    >
                                        All City Areas
                                    </div>
                                    {availableAreas.value.map(area => (
                                        <div 
                                            key={area.id}
                                            onClick={() => { handleAreaChange({ target: { value: area.id } }); showAreaSelector.value = false; }}
                                            class="dropdown-item"
                                            style={`padding: 10px 16px; font-size: 13px; cursor: pointer; transition: all 0.2s; ${selectedAreaId.value === area.id ? 'background: rgba(99, 102, 241, 0.15); color: #818cf8; font-weight: 700;' : 'color: #cbd5e1;'}`}
                                        >
                                            {area.name}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Camera Selector (Custom Dropdown) */}
                        {filteredCameras.value.length > 0 && (
                            <div class="custom-dropdown" style="position: relative;">
                                <div 
                                    onClick={() => { showCameraSelector.value = !showCameraSelector.value; showAreaSelector.value = false; }}
                                    style="background: rgba(30, 41, 59, 0.85); backdrop-filter: blur(12px); padding: 6px 12px; border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.1); display: flex; align-items: center; gap: 8px; box-shadow: 0 8px 32px rgba(0,0,0,0.3); cursor: pointer; transition: all 0.2s;"
                                    onMouseOver={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'}
                                    onMouseOut={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
                                >
                                    <span style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Camera</span>
                                    <span style="font-size: 13px; font-weight: 700; color: #f8fafc; max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                                        {selectedCameraId.value ? filteredCameras.value.find(c => String(c.id) === String(selectedCameraId.value))?.name : `Select Camera (${filteredCameras.value.length})`}
                                    </span>
                                    <span style={`font-size: 10px; color: #6366f1; transition: transform 0.3s; ${showCameraSelector.value ? 'transform: rotate(180deg);' : ''}`}>▼</span>
                                </div>

                                {showCameraSelector.value && (
                                    <div class="dropdown-list hide-scrollbar" style="position: absolute; top: calc(100% + 8px); left: 0; width: 240px; max-height: 300px; background: #1e293b; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; overflow-y: auto; overflow-x: hidden; box-shadow: 0 16px 48px rgba(0,0,0,0.5); z-index: 1001; animation: slideIn 0.2s ease-out;">
                                        <div 
                                            onClick={() => { handleCameraChange({ target: { value: '' } }); showCameraSelector.value = false; }}
                                            class="dropdown-item"
                                            style={`padding: 10px 16px; font-size: 13px; cursor: pointer; transition: all 0.2s; ${!selectedCameraId.value ? 'background: rgba(99, 102, 241, 0.15); color: #818cf8; font-weight: 700;' : 'color: #cbd5e1;'}`}
                                        >
                                            All Cameras ({filteredCameras.value.length})
                                        </div>
                                        {filteredCameras.value.map(cam => (
                                            <div 
                                                key={cam.id}
                                                onClick={() => { handleCameraChange({ target: { value: cam.id } }); showCameraSelector.value = false; }}
                                                class="dropdown-item"
                                                style={`padding: 10px 16px; font-size: 13px; cursor: pointer; transition: all 0.2s; ${String(selectedCameraId.value) === String(cam.id) ? 'background: rgba(99, 102, 241, 0.15); color: #818cf8; font-weight: 700;' : 'color: #cbd5e1;'}`}
                                            >
                                                {cam.name}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* ── OVERLAY: ZOOM CONTROLS (MOVED DOWN) ── */}
                    <div style="position: absolute; top: 230px; right: 20px; z-index: 1000; display: flex; flex-direction: column; gap: 10px;">
                        <div style="background: rgba(30, 41, 59, 0.85); backdrop-filter: blur(12px); border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.1); overflow: hidden; display: flex; flex-direction: column; box-shadow: 0 8px 32px rgba(0,0,0,0.3);">
                            <button
                                onClick={() => handleZoom(1)}
                                style="width: 44px; height: 44px; background: transparent; border: none; color: #f8fafc; font-size: 20px; font-weight: 300; cursor: pointer; border-bottom: 1px solid rgba(255,255,255,0.05); transition: background 0.2s;"
                                onMouseOver={(e) => e.target.style.background = 'rgba(255,255,255,0.05)'}
                                onMouseOut={(e) => e.target.style.background = 'transparent'}
                            >
                                +
                            </button>
                            <button
                                onClick={() => handleZoom(-1)}
                                style="width: 44px; height: 44px; background: transparent; border: none; color: #f8fafc; font-size: 24px; font-weight: 300; cursor: pointer; transition: background 0.2s;"
                                onMouseOver={(e) => e.target.style.background = 'rgba(255,255,255,0.05)'}
                                onMouseOut={(e) => e.target.style.background = 'transparent'}
                            >
                                −
                            </button>
                        </div>


                    </div>

                    {/* ── OVERLAY: TOP RIGHT VIEW LAYERS PANEL ── */}
                    <div style="position: absolute; top: 20px; right: 20px; z-index: 1000; width: 160px; background: rgba(30, 41, 59, 0.85); backdrop-filter: blur(16px); padding: 14px; border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.1); box-shadow: 0 12px 48px rgba(0,0,0,0.4);">
                        <div style="font-size: 10px; font-weight: 800; color: #64748b; letter-spacing: 1.2px; text-transform: uppercase; margin-bottom: 14px;">View Layers</div>

                        <div style="display: flex; flex-direction: column; gap: 12px;">
                            {[
                                { key: 'boundaries', label: 'Areas', color: '#f97316' },
                                { key: 'cameras', label: 'Cameras', color: '#f97316' },
                                { key: 'cases', label: 'Cases', color: '#6366f1' },
                                { key: 'heatmap', label: 'Heatmap', color: '#f97316' }
                            ].map(({ key, label, color }) => (
                                <div key={key} style="display: flex; align-items: center; justify-content: space-between;">
                                    <span style="font-size: 13px; font-weight: 600; color: #cbd5e1;">{label}</span>
                                    <div
                                        onClick={() => handleToggle(key)}
                                        style={`width: 32px; height: 16px; border-radius: 20px; cursor: pointer; position: relative; transition: all 0.3s; ${mapToggles.value[key] ? `background: ${color};` : 'background: #334155;'}`}
                                    >
                                        <div style={`width: 10px; height: 10px; background: white; border-radius: 50%; position: absolute; top: 3px; transition: all 0.3s; ${mapToggles.value[key] ? 'left: 19px;' : 'left: 3px;'}`} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* ── OVERLAY: BOTTOM STATS CARDS ── */}
                    <div style="position: absolute; bottom: 15px; left: 15px; right: 15px; z-index: 1000; display: flex; gap: 10px; flex-wrap: nowrap; overflow-x: auto; padding-bottom: 5px;">
                        {[
                            { label: 'Total Cases', value: statsRef.value.total, color: '#f97316', trend: '+2%' },
                            { label: 'Active Cameras', value: allCameras.value.length || 0, color: '#3b82f6', trend: '-1%' },
                            { label: 'Active Alerts', value: statsRef.value.pending, color: '#ef4444', trend: '-5%' },
                            { label: 'Active Patrols', value: 24, color: '#8b5cf6', trend: '0%' }
                        ].map(({ label, value, color, trend }) => (
                            <div key={label} style={`flex: 1; min-width: 115px; max-width: 180px; background: rgba(30, 41, 59, 0.85); backdrop-filter: blur(12px); padding: 8px 12px; border-radius: 10px; border: 1px solid rgba(255, 255, 255, 0.1); border-left: 3px solid ${color}; box-shadow: 0 8px 32px rgba(0,0,0,0.3);`}>
                                <div style="font-size: 9px; font-weight: 700; color: #94a3b8; text-transform: uppercase; margin-bottom: 4px;">{label}</div>
                                <div style="display: flex; align-items: flex-end; justify-content: space-between;">
                                    <div style="font-size: 18px; font-weight: 800; color: #f8fafc;">{value}</div>
                                    <div style={`font-size: 9px; padding: 1px 5px; border-radius: 4px; font-weight: 700; background: ${color}20; color: ${color};`}>
                                        {trend}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* No-area warning Overlay */}
                    {noAreaWarning.value && (
                        <div style="position: absolute; top: 80px; left: 50%; transform: translateX(-50%); z-index: 2000; background: rgba(254, 243, 199, 0.9); backdrop-filter: blur(4px); border: 1px solid #fbbf24; border-radius: 12px; padding: 12px 24px; display: flex; align-items: center; gap: 12px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);">
                            <span style="font-size: 24px;">⚠️</span>
                            <div style="color: #92400e; font-size: 13px; font-weight: 600;">No assigned area detected. Map features might be limited.</div>
                        </div>
                    )}
                </div>
            </div>
        );
    }
});
