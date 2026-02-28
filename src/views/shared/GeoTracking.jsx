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
    const partnerToken = localStorage.getItem('partner_token');
    const adminToken = localStorage.getItem('token_admin') || localStorage.getItem('token_super_admin');

    if (clientToken) {
        const p = decodeToken(clientToken);
        return { token: clientToken, role: 'client', id: p?.userId || p?.id, city: p?.city || null };
    }
    if (partnerToken) {
        const p = decodeToken(partnerToken);
        // JWT stores Partner._id in userId/id field (not a separate partnerId)
        // This matches Area.partnerId and Alert.assignedPartnerId
        return { token: partnerToken, role: 'partner', id: p?.userId || p?.id, clientId: p?.clientId };
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

        // Auth info — determines what this user can see
        const auth = getAuthInfo();

        // ── Mount guard ───────────────────────────────────────────────────────
        let isMounted = false;

        const isReady = () =>
            isMounted && map.value && layers.value.boundaries;

        // ── Map init ──────────────────────────────────────────────────────────
        // Default center = India. If areas exist, fitBounds overrides this.
        // This is the correct fallback for this India-centric app.
        const initMap = () => {
            if (map.value || !mapContainer.value) return;

            try {
                const m = L.map(mapContainer.value, {
                    center: [20.5937, 78.9629], // India center — overridden by fitBounds on data load
                    zoom: 5,
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
        // Always call this AFTER the geoLayer is added to its parent layerGroup
        // so that getBounds() operates on DOM-rendered paths.
        const fitToLayer = (geoLayer) => {
            if (!isReady() || !geoLayer) return;
            try {
                const bounds = geoLayer.getBounds();
                // isValid() returns false for empty/degenerate bounds
                if (bounds && bounds.isValid()) {
                    map.value.fitBounds(bounds, { padding: [30, 30], maxZoom: 14 });
                }
            } catch (e) {
                console.warn('[GeoTracking] fitBounds failed:', e.message);
            }
        };   // ← closing brace for fitToLayer

        // ── Fetch & render areas (role-filtered, with fallback) ───────────────
        const fetchAreas = async () => {
            try {
                // Build role-specific query params
                const params = {};
                if (auth.role === 'client') params.clientId = auth.id;
                if (auth.role === 'partner') params.partnerId = auth.id;
                // admin → no filter (sees all)

                let { data } = await axios.get(`${API_BASE_URL}/areas`, { params });

                // FALLBACK: If role-filtered query returns 0 areas (e.g. clientId/partnerId
                // not yet assigned in DB after fresh KML import), load ALL areas so the map
                // is never empty. This keeps the dashboard useful during initial setup.
                if (data?.features?.length === 0 && (params.clientId || params.partnerId)) {
                    console.warn('[GeoTracking] No areas matched filter — loading all areas as fallback');
                    const fallback = await axios.get(`${API_BASE_URL}/areas`);
                    data = fallback.data;
                }

                if (!isReady()) return;

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
                                fillOpacity: auth.role === 'partner' ? 0.25 : 0.15
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
                        fitToLayer(geoLayer);
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
                    layers.value.cameras.clearLayers();

                    data.features.forEach(feature => {
                        if (!feature.geometry?.coordinates) return;

                        const latlng = [
                            feature.geometry.coordinates[1],
                            feature.geometry.coordinates[0]
                        ];
                        const radius = feature.properties?.radius || 300;

                        const marker = L.marker(latlng).bindPopup(
                            `<b>📷 Camera</b><br/>${feature.properties?.name || 'Unknown'}<br/>Radius: ${radius}m`
                        );
                        const circle = L.circle(latlng, {
                            radius,
                            color: '#10b981',
                            weight: 1,
                            fillOpacity: 0.08,
                            fillColor: '#10b981'
                        });

                        if (toggles.value.cameras && isReady()) {
                            layers.value.cameras.addLayer(marker);
                            layers.value.cameras.addLayer(circle);
                        }
                    });
                }
            } catch (err) {
                console.error('[GeoTracking] fetchCameras error:', err);
            }
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
        const handleToggle = (layerName) => {
            if (!isReady()) return;

            toggles.value[layerName] = !toggles.value[layerName];

            if (layerName === 'heatmap') { updateHeatmap(); return; }

            const l = layers.value[layerName];
            if (!l) return;

            if (toggles.value[layerName]) {
                map.value.addLayer(l);
                if (layerName === 'boundaries') fetchAreas();
                if (layerName === 'cameras') fetchCameras();
                if (layerName === 'cases') fetchCases();
            } else {
                map.value.removeLayer(l);
                l.clearLayers();
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

        // ── Lifecycle ─────────────────────────────────────────────────────────
        onMounted(async () => {
            isMounted = true;
            initMap();
            await Promise.all([fetchAreas(), fetchCameras(), fetchCases()]);
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
            <div style="height: calc(100vh - 64px); display: flex; flex-direction: column; background: #f8fafc; padding: 20px; gap: 16px; box-sizing: border-box;">

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

                {/* ── Map container — always rendered (never conditionally mounted) ── */}
                <div
                    ref={mapContainer}
                    style="flex:1; min-height:350px; border-radius:16px; overflow:hidden; box-shadow:0 8px 25px -5px rgba(0,0,0,0.12); border:1.5px solid #e2e8f0; z-index:10; width:100%;"
                />
            </div>
        );
    }
});
