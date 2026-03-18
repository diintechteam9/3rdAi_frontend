import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const DETECTION_MODES = [
    { key: 'anpr', label: 'Number Plate', icon: '🔢', color: '#00d4ff' },
    { key: 'helmet', label: 'No Helmet', icon: '⛑️', color: '#ff4d6d' },
    { key: 'wrong_side', label: 'Wrong Side', icon: '↩️', color: '#ff9900' },
    { key: 'triple', label: 'Triple Riding', icon: '👥', color: '#a855f7' },
    { key: 'stalled', label: 'Stalled Vehicle', icon: '🛑', color: '#ef4444' },
    { key: 'seatbelt', label: 'No Seatbelt', icon: '🔒', color: '#f59e0b' },
    { key: 'security', label: 'Security Alert', icon: '🚨', color: '#10b981' },
];

export default {
    name: 'CameraAnalysis',
    setup() {
        const route = useRoute();
        const router = useRouter();
        const sourceId = computed(() => route.params.sourceId);

        const feeds = ref([]);
        const showModal = ref(false);
        const selectedDetection = ref(null);
        const detections = ref([]);
        const backendStatus = ref('checking');

        onMounted(async () => {
            const API_URL = import.meta.env.VITE_TRAFFIC_API_URL || 'https://histolytic-unpregnant-cary.ngrok-free.dev';
            const NGROK_HEADERS = { "ngrok-skip-browser-warning": "true" };
            console.log("Checking backend health at:", API_URL);
            try {
                const res = await fetch(`${API_URL}/`, { headers: NGROK_HEADERS });
                if (res.ok) {
                    backendStatus.value = 'online';
                } else {
                    backendStatus.value = 'offline';
                }
            } catch (err) {
                backendStatus.value = 'offline';
                console.error("Backend unreachable", err);
            }
        });

        // Form state
        const formName = ref('');
        const formUrl = ref('');
        const formTriggers = ref([]);

        const handleAddCamera = async () => {
            if (!formName.value || !formUrl.value || formTriggers.value.length === 0) return;

            const newId = (feeds.value.length + 1).toString();
            const newFeed = {
                id: newId,
                name: formName.value,
                streamUrl: formUrl.value,
                status: 'connecting',
                selectedTriggers: [...formTriggers.value]
            };

            feeds.value.push(newFeed);
            const savedTriggers = [...formTriggers.value];
            const savedUrl = formUrl.value;
            
            closeModal();

            // Parallel trigger connections
            const triggerMap = {
                'anpr': 'anpr', 'helmet': 'helmet', 'wrong_side': 'wrongside',
                'triple': 'tripling', 'stalled': 'stalled', 'seatbelt': 'seatbelt',
                'security': 'security'
            };

            console.log(`[Camera] Attempting to connect ${savedUrl} with triggers:`, savedTriggers);

            savedTriggers.forEach(async (tKey) => {
                const caseType = triggerMap[tKey] || tKey;
                try {
                    const API_BASE = import.meta.env.VITE_TRAFFIC_API_URL || 'https://roger-even-benefit-machines.trycloudflare.com';
                    const res = await fetch(`${API_BASE}/api/camera/connect`, {
                        method: 'POST',
                        headers: { 
                            'Content-Type': 'application/json', 
                            'ngrok-skip-browser-warning': 'true' 
                        },
                        body: JSON.stringify({
                            camera_id: `${newId}_${caseType}`,
                            stream_url: savedUrl,
                            triggers: [caseType],
                            project_id: sourceId.value || 'default'
                        }),
                    });
                    if (res.ok) {
                        console.log(`[Camera] SUCCESS: Connected trigger ${caseType} for camera ${newId}`);
                        newFeed.status = 'connected';
                        pollCameraDetections(`${newId}_${caseType}`, newId, tKey);
                    } else {
                        newFeed.status = 'error';
                        console.error(`[Camera] FAILED to connect trigger ${caseType}:`, await res.text());
                    }
                } catch (err) { 
                    newFeed.status = 'error';
                    console.error(`[Camera] CONNECTION ERROR for trigger ${caseType}:`, err); 
                }
            });
        };

        const pollCameraDetections = (backendCameraId, feedId, triggerKey) => {
            const API_URL = import.meta.env.VITE_TRAFFIC_API_URL || 'https://histolytic-unpregnant-cary.ngrok-free.dev';
            const wsUrl = API_URL.replace('http', 'ws') + `/ws/camera/${backendCameraId}`;
            console.log(`[WS] Initializing connection to: ${wsUrl} for feed: ${feedId}`);
            
            const socket = new WebSocket(wsUrl);

            socket.onopen = () => {
                console.log(`[WS] SUCCESS: Connected to ${backendCameraId}`);
            };

            socket.onerror = (err) => {
                console.error(`[WS] ERROR: WebSocket failed for ${backendCameraId}:`, err);
            };

            socket.onmessage = (event) => {
                try {
                    console.log(`[WS] MESSAGE RECEIVED for ${backendCameraId}:`, event.data);
                    const det = JSON.parse(event.data);
                    if (!detections.value.find(d => d.id === `${backendCameraId}-${det.frame}`)) {
                        detections.value.push({
                            id: `${backendCameraId}-${det.frame}`,
                            time: det.timestamp || new Date().toLocaleTimeString(),
                            type: det.trigger || triggerKey,
                            confidence: det.confidence || 0.9,
                            action: 'DETECTED',
                            cameraId: feedId,
                            triggerKey: triggerKey,
                            imageUrl: det.crop_url || det.full_url || '',
                            plate: det.plate || 'UNKNOWN'
                        });
                        console.log(`[WS] New Detection recorded for ${feedId}:`, det.trigger);
                        if (detections.value.length > 100) detections.value.shift();
                    }
                } catch (err) { 
                    console.error(`[WS] PARSE ERROR: Could not parse message from ${backendCameraId}:`, err);
                }
            };

            socket.onclose = (e) => {
                console.warn(`[WS] CLOSED: Connection for ${backendCameraId} closed. Code: ${e.code}`);
            };
        };

        const closeModal = () => {
            showModal.value = false;
            formName.value = '';
            formUrl.value = '';
            formTriggers.value = [];
        };

        const toggleTrigger = (key) => {
            const idx = formTriggers.value.indexOf(key);
            if (idx > -1) formTriggers.value.splice(idx, 1);
            else formTriggers.value.push(key);
        };

        const selectAllTriggers = () => {
            formTriggers.value = DETECTION_MODES.map(m => m.key);
        };

        return () => (
            <div style={{ padding: '24px', backgroundColor: '#080c14', minHeight: '100vh', color: '#e2e8f0', fontFamily: 'inherit' }}>
                <button onClick={() => router.back()} style={{ background: 'transparent', border: '1px solid #1e2d3d', color: '#64748b', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', marginBottom: '24px' }}>
                    ← Back
                </button>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', borderBottom: '1px solid #1e2d3d', paddingBottom: '24px' }}>
                    <div>
                        <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#fff', margin: 0, textTransform: 'uppercase' }}>Camera Workspace</h1>
                        <p style={{ color: '#64748b', marginTop: '4px' }}>Multi-Camera AI Detection Workspace</p>
                    </div>
                    <button onClick={() => showModal.value = true} style={{ backgroundColor: '#00d4ff', color: '#0a0f1a', border: 'none', borderRadius: '8px', padding: '12px 24px', fontWeight: 'bold', cursor: 'pointer' }}>
                        + Add Camera
                    </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: '40px' }}>
                    <div>
                        <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '24px' }}>Connected Feeds</div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px' }}>
                            {feeds.value.map(feed => (
                                <div key={feed.id} style={{ backgroundColor: '#0f1520', borderRadius: '16px', border: '1px solid #1e2d3d', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
                                    <div style={{ padding: '16px', background: '#111827', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1e2d3d' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', color: '#fff' }}>
                                            <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#10b981', boxShadow: '0 0 10px #10b981' }} />
                                            {feed.name}
                                        </div>
                                        <div style={{ display: 'flex', gap: '6px' }}>
                                            {feed.selectedTriggers.map(t => (
                                                <span key={t} style={{ fontSize: '9px', backgroundColor: '#1e2d3d', color: '#00d4ff', padding: '2px 6px', borderRadius: '4px', border: '1px solid #00d4ff33' }}>{t.toUpperCase()}</span>
                                            ))}
                                        </div>
                                    </div>
                                    <div style={{ aspectRatio: '16/9', backgroundColor: '#000', position: 'relative', overflow: 'hidden' }}>
                                        <img 
                                            src={`${import.meta.env.VITE_TRAFFIC_API_URL || 'https://histolytic-unpregnant-cary.ngrok-free.dev'}/api/camera/${feed.id}_${feed.selectedTriggers[0] || 'all'}/feed`}
                                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                            onError={(e) => { e.target.src = 'https://via.placeholder.com/640x360/0f1520/64748b?text=FEED+OFFLINE+OR+RTSP+UNREACHABLE'; }}
                                        />
                                        <div style={{ position: 'absolute', top: '12px', left: '12px', backgroundColor: '#ef4444', color: '#fff', fontSize: '9px', fontWeight: 'bold', padding: '3px 8px', borderRadius: '4px', boxShadow: '0 2px 8px rgba(239, 68, 68, 0.4)' }}>● LIVE</div>
                                        <div style={{ position: 'absolute', bottom: '12px', right: '12px', backgroundColor: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: '10px', padding: '4px 8px', borderRadius: '4px', backdropFilter: 'blur(4px)' }}>{feed.streamUrl}</div>
                                    </div>
                                    <div style={{ padding: '16px', flex: 1 }}>
                                        {feed.selectedTriggers.map(tKey => {
                                            const mode = DETECTION_MODES.find(m => m.key === tKey);
                                            const modeDetections = detections.value.filter(d => d.cameraId === feed.id && (d.triggerKey === tKey || d.type === tKey));
                                            return (
                                                <div key={tKey} style={{ marginBottom: '20px' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                                        <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                            <span>{mode?.icon}</span>
                                                            <span>{mode?.label}</span>
                                                        </div>
                                                        <span style={{ fontSize: '10px', color: '#10b981' }}>{modeDetections.length} hits</span>
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px', minHeight: '60px' }}>
                                                        {modeDetections.map(det => (
                                                            <div key={det.id} onClick={() => selectedDetection.value = det} style={{ flexShrink: 0, width: '100px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #1e2d3d', position: 'relative', cursor: 'pointer' }}>
                                                                <img src={det.imageUrl} style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover' }} />
                                                                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.7)', fontSize: '8px', color: '#fff', textAlign: 'center', padding: '2px' }}>{det.time.split(' ')[0]}</div>
                                                            </div>
                                                        ))}
                                                        {modeDetections.length === 0 && (
                                                            <div style={{ width: '100%', border: '1px dashed #1e2d3d', borderRadius: '8px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1a2234', fontSize: '10px' }}>Awaiting...</div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                            {feeds.value.length === 0 && <div style={{ textAlign: 'center', padding: '100px', gridColumn: '1/-1', color: '#64748b', border: '2px dashed #1e2d3d', borderRadius: '24px' }}>No cameras connected yet. Use "+ Add Camera" to start.</div>}
                        </div>
                    </div>
                </div>

                {showModal.value && (
                    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                        <div style={{ backgroundColor: '#0f1520', border: '1px solid #1e2d3d', borderRadius: '24px', padding: '32px', width: '480px', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}>
                            <h2 style={{ color: '#fff', marginBottom: '24px', fontSize: '20px' }}>Connect New Camera</h2>
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ fontSize: '10px', color: '#64748b', fontWeight: 'bold', display: 'block', marginBottom: '8px', textTransform: 'uppercase' }}>Camera Name</label>
                                <input value={formName.value} onInput={e => formName.value = e.target.value} placeholder="e.g. Highway North" style={{ width: '100%', backgroundColor: '#111827', border: '1px solid #1e2d3d', borderRadius: '8px', padding: '12px', color: '#fff' }} />
                            </div>
                            <div style={{ marginBottom: '24px' }}>
                                <label style={{ fontSize: '10px', color: '#64748b', fontWeight: 'bold', display: 'block', marginBottom: '8px', textTransform: 'uppercase' }}>RTSP Stream URL</label>
                                <input value={formUrl.value} onInput={e => formUrl.value = e.target.value} placeholder="rtsp://admin:pass@ip:554/stream" style={{ width: '100%', backgroundColor: '#111827', border: '1px solid #1e2d3d', borderRadius: '8px', padding: '12px', color: '#fff' }} />
                            </div>
                            
                            <div style={{ marginBottom: '24px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                    <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#00d4ff', textTransform: 'uppercase' }}>AI Triggers</div>
                                    <button onClick={selectAllTriggers} style={{ fontSize: '10px', color: '#000', backgroundColor: '#00d4ff', border: 'none', borderRadius: '4px', padding: '4px 10px', fontWeight: 'bold', cursor: 'pointer' }}>SELECT ALL</button>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                    {DETECTION_MODES.map(m => (
                                        <button key={m.key} onClick={() => toggleTrigger(m.key)} style={{ padding: '10px', borderRadius: '8px', border: `1px solid ${formTriggers.value.includes(m.key) ? '#00d4ff' : '#1e2d3d'}`, background: formTriggers.value.includes(m.key) ? '#00d4ff15' : 'transparent', color: formTriggers.value.includes(m.key) ? '#00d4ff' : '#64748b', fontSize: '11px', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '10px', transition: '0.2s' }}>
                                            <span style={{ fontSize: '14px' }}>{m.icon}</span>
                                            <span>{m.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                            
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button onClick={handleAddCamera} style={{ flex: 1, backgroundColor: '#00d4ff', color: '#000', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Connect Camera</button>
                                <button onClick={closeModal} style={{ flex: 1, backgroundColor: 'transparent', color: '#64748b', border: '1px solid #1e2d3d', padding: '12px', borderRadius: '8px', cursor: 'pointer' }}>Cancel</button>
                            </div>
                        </div>
                    </div>
                )}

                {selectedDetection.value && (
                    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }} onClick={() => selectedDetection.value = null}>
                        <div style={{ backgroundColor: '#0f1520', borderRadius: '24px', border: '1px solid #1e2d3d', padding: '32px', maxWidth: '600px', width: '100%' }} onClick={e => e.stopPropagation()}>
                            <img src={selectedDetection.value.imageUrl} style={{ width: '100%', borderRadius: '12px', marginBottom: '24px' }} />
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div><div style={{ color: '#64748b', fontSize: '10px' }}>TIME</div><div style={{ color: '#fff' }}>{selectedDetection.value.time}</div></div>
                                <div><div style={{ color: '#64748b', fontSize: '10px' }}>TYPE</div><div style={{ color: '#fff' }}>{selectedDetection.value.type}</div></div>
                                <div><div style={{ color: '#64748b', fontSize: '10px' }}>PLATE</div><div style={{ color: '#00d4ff', fontWeight: 'bold' }}>{selectedDetection.value.plate}</div></div>
                                <div><div style={{ color: '#64748b', fontSize: '10px' }}>CONFIDENCE</div><div style={{ color: '#10b981' }}>{Math.round(selectedDetection.value.confidence * 100)}%</div></div>
                            </div>
                            <button onClick={() => selectedDetection.value = null} style={{ width: '100%', marginTop: '32px', backgroundColor: '#1e2d3d', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', cursor: 'pointer' }}>Close</button>
                        </div>
                    </div>
                )}
            </div>
        )
    }
}
