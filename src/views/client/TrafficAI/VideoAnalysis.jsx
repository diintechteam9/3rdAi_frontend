import { ref, onMounted, computed, watch, nextTick } from 'vue';
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

const API_URL = import.meta.env.VITE_TRAFFIC_API_URL || 'https://histolytic-unpregnant-cary.ngrok-free.dev';
const NGROK_HEADERS = { "ngrok-skip-browser-warning": "true" };

export default {
    name: 'VideoAnalysis',
    setup() {
        const route = useRoute();
        const router = useRouter();
        const sourceId = computed(() => route.params.sourceId);

        const videos = ref([]);
        const detections = ref([]);
        const showModal = ref(false);
        const isUploading = ref(false);
        const selectedDetection = ref(null);

        // Form state
        const formFile = ref(null);
        const formName = ref('');
        const formTriggers = ref([]);
        const fileInput = ref(null);

        const triggerMap = {
            'anpr': 'anpr', 'helmet': 'helmet', 'wrong_side': 'wrongside',
            'triple': 'tripling', 'stalled': 'stalled', 'seatbelt': 'seatbelt',
            'security': 'security'
        };

        const handleFile = (e) => {
            const file = e.target.files?.[0];
            if (file) {
                formFile.value = file;
                formName.value = file.name;
            }
        };

        const toggleTrigger = (key) => {
            const idx = formTriggers.value.indexOf(key);
            if (idx > -1) formTriggers.value.splice(idx, 1);
            else formTriggers.value.push(key);
        };

        const backendStatus = ref('checking');

        onMounted(async () => {
            console.log("Checking backend health at:", API_URL);
            try {
                // Try a simple GET to check if backend is alive
                const res = await fetch(`${API_URL}/`, { headers: NGROK_HEADERS });
                if (res.ok) {
                    backendStatus.value = 'online';
                    console.log("Backend is ONLINE");
                } else {
                    backendStatus.value = 'offline';
                    console.error("Backend responded with error status:", res.status);
                }
            } catch (err) {
                backendStatus.value = 'offline';
                console.error("Backend unreachable. Possible causes: ngrok tunnel closed, CORS issue, or server down.", err);
            }
        });

        const handleUpload = async () => {
            if (!formFile.value || !formName.value || formTriggers.value.length === 0) return;
            isUploading.value = true;
            console.log(`[Video] Uploading ${formName.value} to ${API_URL}`);

            try {
                const backendTriggers = formTriggers.value.map(t => triggerMap[t] || t);
                const formData = new FormData();
                formData.append("file", formFile.value);
                formData.append("triggers", backendTriggers.join(","));

                const res = await fetch(`${API_URL}/api/process`, {
                    method: "POST",
                    headers: NGROK_HEADERS,
                    body: formData
                });

                if (!res.ok) {
                    const errorText = await res.text();
                    console.error("[Video] Backend Error:", errorText);
                    throw new Error(`Server Response Error (${res.status}): ${errorText || 'Unknown error'}`);
                }

                const data = await res.json();
                console.log("[Video] Job Created:", data.job_id);
                
                const newVideo = {
                    id: (videos.value.length + 1).toString(),
                    name: formName.value,
                    size: formFile.value.size,
                    status: 'waiting',
                    progress: 0,
                    job_id: data.job_id,
                    selectedTriggers: [...formTriggers.value],
                    videoUrl: URL.createObjectURL(formFile.value)
                };
                videos.value.push(newVideo);
                closeModal();
            } catch (err) { 
                console.error("[Video] UPLOAD ERROR:", err);
                alert(`NETWORK ERROR: Failed to upload.\n\nTarget: ${API_URL}\nError: ${err.message}\n\nREASON: The server/tunnel might be offline, or there's a CORS issue.`); 
            }
            finally { isUploading.value = false; }
        };

        const startAnalysis = (videoId) => {
            const video = videos.value.find(v => v.id === videoId);
            if (!video || !video.job_id) return;
            video.status = 'processing';
            video.progress = 10;
            pollStatus(videoId, video.job_id);
        };

        const pollStatus = async (videoId, jobId) => {
            try {
                const res = await fetch(`${API_URL}/status/${jobId}`, { headers: NGROK_HEADERS });
                if (!res.ok) throw new Error(`Status Check Failed: ${res.status}`);
                const data = await res.json();
                const video = videos.value.find(v => v.id === videoId);
                if (!video) return;

                if (data.status === 'completed') {
                    video.status = 'done';
                    video.progress = 100;
                    fetchReport(videoId, jobId);
                } else if (data.status === 'failed') {
                    video.status = 'error';
                } else {
                    video.progress = data.progress || video.progress + 2;
                    setTimeout(() => pollStatus(videoId, jobId), 3000);
                }
            } catch (err) { 
                console.warn("[Video] Status Poll Error:", err.message);
                setTimeout(() => pollStatus(videoId, jobId), 5000); 
            }
        };

        const fetchReport = async (videoId, jobId) => {
            try {
                const res = await fetch(`${API_URL}/report/${jobId}`, { headers: NGROK_HEADERS });
                const data = await res.json();
                let allRows = data.all || data || [];
                if (!Array.isArray(allRows)) {
                    allRows = data.by_trigger ? Object.values(data.by_trigger).flat() : [];
                }
                
                const newDetections = allRows.map((item, index) => {
                    const trig = item.trigger || 'security';
                    const backendToFrontend = { 'wrongside': 'wrong_side', 'tripling': 'triple' };
                    const triggerKey = backendToFrontend[trig] || trig;
                    
                    const cropUrl = item.CropImgUrl || item.plate_image || '';
                    const fullUrl = item.FullImgUrl || item.vehicle_image || '';

                    return {
                        id: `${videoId}-${jobId}-${index}`,
                        time: item.timestamp || '00:00:00',
                        type: item.violation_type || triggerKey,
                        confidence: item.confidence || 0.95,
                        cameraId: videoId,
                        triggerKey: triggerKey,
                        imageUrl: triggerKey === 'anpr' ? (cropUrl || fullUrl) : (fullUrl || cropUrl),
                        plate: item.plate_number || item.Plate
                    };
                });
                detections.value.push(...newDetections);
            } catch (err) { console.error(err); }
        };

        const closeModal = () => {
            showModal.value = false;
            formFile.value = null;
            formName.value = '';
            formTriggers.value = [];
        };

        return () => (
            <div style={{ padding: '24px', backgroundColor: '#080c14', minHeight: '100vh', color: '#e2e8f0', fontFamily: 'inherit' }}>
                <button onClick={() => router.back()} style={{ background: 'transparent', border: '1px solid #1e2d3d', color: '#64748b', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', marginBottom: '24px' }}>
                    ← Back
                </button>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', borderBottom: '1px solid #1e2d3d', paddingBottom: '24px' }}>
                    <div>
                        <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#fff', margin: 0, textTransform: 'uppercase' }}>Video Workspace</h1>
                        <p style={{ color: '#64748b', marginTop: '4px' }}>Extract Violations from Video Footages</p>
                    </div>
                    <button onClick={() => showModal.value = true} style={{ backgroundColor: '#00d4ff', color: '#0a0f1a', border: 'none', borderRadius: '8px', padding: '12px 24px', fontWeight: 'bold', cursor: 'pointer' }}>
                        + Add Video
                    </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.8fr) 1fr', gap: '40px' }}>
                    <div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '24px' }}>
                            {videos.value.map(video => (
                                <div key={video.id} style={{ backgroundColor: '#0f1520', borderRadius: '24px', border: '1px solid #1e2d3d', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                                    <div style={{ padding: '16px', background: '#111827', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ fontWeight: 'bold', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>🎬 {video.name}</div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            {video.status === 'processing' && (
                                                <span style={{ fontSize: '12px', color: '#00d4ff', fontWeight: 'bold' }}>{Math.round(video.progress)}%</span>
                                            )}
                                            <button 
                                                onClick={() => startAnalysis(video.id)} 
                                                disabled={video.status !== 'waiting'}
                                                style={{ backgroundColor: video.status === 'done' ? '#10b981' : video.status === 'processing' ? '#1a2234' : '#00d4ff', color: video.status === 'processing' ? '#00d4ff' : '#000', border: 'none', padding: '6px 16px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
                                            >
                                                {video.status === 'waiting' ? '▶ Analyze' : video.status === 'processing' ? 'Analyzing...' : '✓ Done'}
                                            </button>
                                        </div>
                                    </div>
                                    
                                    <div style={{ position: 'relative', aspectRatio: '16/9', backgroundColor: '#000' }}>
                                        {video.videoUrl ? (
                                            <video src={video.videoUrl} controls style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                        ) : (
                                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '12px' }}>
                                                Video Preview Unavailable
                                            </div>
                                        )}
                                        {video.status === 'processing' && (
                                            <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                                                <div style={{ width: '60%', height: '4px', backgroundColor: '#1e2d3d', borderRadius: '2px', overflow: 'hidden' }}>
                                                    <div style={{ width: `${video.progress}%`, height: '100%', backgroundColor: '#00d4ff', transition: 'width 0.3s ease' }} />
                                                </div>
                                                <span style={{ color: '#fff', fontSize: '14px', fontWeight: 'bold' }}>AI Engine Processing... {Math.round(video.progress)}%</span>
                                            </div>
                                        )}
                                    </div>

                                    <div style={{ padding: '20px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                            <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' }}>Detected Violations</div>
                                            <div style={{ fontSize: '10px', color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '2px 8px', borderRadius: '10px' }}>
                                                {detections.value.filter(d => d.cameraId === video.id).length} Matches
                                            </div>
                                        </div>
                                        
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '12px' }}>
                                            {detections.value.filter(d => d.cameraId === video.id).map(d => (
                                                <div key={d.id} onClick={() => selectedDetection.value = d} style={{ cursor: 'pointer', position: 'relative', borderRadius: '12px', overflow: 'hidden', border: '1px solid #1e2d3d', transition: 'transform 0.2s' }}>
                                                    <img src={d.imageUrl} style={{ width: '100%', aspectRatio: '1/1', objectFit: 'cover' }} />
                                                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(transparent, rgba(0,0,0,0.8))', padding: '4px', fontSize: '9px', color: '#fff', textAlign: 'center' }}>
                                                        {d.type.split('_').join(' ').toUpperCase()}
                                                    </div>
                                                </div>
                                            ))}
                                            {video.status === 'done' && detections.value.filter(d => d.cameraId === video.id).length === 0 && (
                                                <div style={{ gridColumn: '1/-1', textAlign: 'center', p: '20px', color: '#ef4444', fontSize: '12px' }}>No violations detected in this footage.</div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div>
                        <div style={{ backgroundColor: '#0f1520', borderRadius: '16px', border: '1px solid #1e2d3d', padding: '24px' }}>
                            <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', marginBottom: '24px' }}>Backend Status</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px', borderBottom: '1px solid #1e2d3d', paddingBottom: '24px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                    <span>Connection</span>
                                    <span style={{ color: backendStatus.value === 'online' ? '#10b981' : (backendStatus.value === 'checking' ? '#f59e0b' : '#ef4444'), fontWeight: 'bold' }}>
                                        {backendStatus.value.toUpperCase()}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                    <span>Active Videos</span>
                                    <span>{videos.value.length}</span>
                                </div>
                            </div>

                            <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', marginBottom: '24px' }}>Instructions</div>
                            <ul style={{ fontSize: '13px', color: '#64748b', paddingLeft: '16px', lineHeight: '1.6' }}>
                                <li>Upload mp4/avi/mov files (max 500MB).</li>
                                <li>Select triggers to configure extraction.</li>
                                <li>Click 'Analyze' to start processing.</li>
                                <li>View violation snapshots once done.</li>
                            </ul>
                        </div>
                    </div>
                </div>

                {showModal.value && (
                    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                        <div style={{ backgroundColor: '#0f1520', border: '1px solid #1e2d3d', borderRadius: '24px', padding: '32px', width: '450px' }}>
                            <h2 style={{ color: '#fff', marginBottom: '24px' }}>Process Video</h2>
                            
                            {!formFile.value ? (
                                <div onClick={() => fileInput.value?.click()} style={{ border: '2px dashed #1e2d3d', borderRadius: '16px', padding: '40px', textAlign: 'center', cursor: 'pointer', background: '#111827' }}>
                                    <div style={{ fontSize: '40px', marginBottom: '16px' }}>🎬</div>
                                    <div style={{ color: '#fff', fontWeight: 'bold' }}>Click to select video</div>
                                    <input type="file" ref={fileInput} hidden onChange={handleFile} accept="video/*" />
                                </div>
                            ) : (
                                <div style={{ background: '#111827', borderRadius: '12px', padding: '16px', border: '1px solid #1e2d3d', marginBottom: '16px' }}>
                                    <div style={{ color: '#fff', fontWeight: 'bold', fontSize: '14px' }}>{formFile.value.name}</div>
                                    <div style={{ color: '#10b981', fontSize: '11px' }}>{(formFile.value.size / 1024 / 1024).toFixed(1)} MB</div>
                                </div>
                            )}

                            <div style={{ margin: '24px 0' }}>
                                <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#00d4ff', marginBottom: '12px' }}>SELECT MODELS</div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                    {DETECTION_MODES.map(m => (
                                        <button key={m.key} onClick={() => toggleTrigger(m.key)} style={{ padding: '8px', borderRadius: '8px', border: `1px solid ${formTriggers.value.includes(m.key) ? '#00d4ff' : '#1e2d3d'}`, background: formTriggers.value.includes(m.key) ? '#00d4ff22' : 'transparent', color: '#fff', fontSize: '11px', cursor: 'pointer' }}>
                                            {m.icon} {m.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button onClick={handleUpload} disabled={isUploading.value || !formFile.value} style={{ flex: 1, backgroundColor: '#00d4ff', color: '#000', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', opacity: (isUploading.value || !formFile.value) ? 0.5 : 1 }}>
                                    {isUploading.value ? 'Uploading...' : 'Start Upload'}
                                </button>
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
                                <div><div style={{ color: '#64748b', fontSize: '10px' }}>TIMESTAMP</div><div style={{ color: '#fff' }}>{selectedDetection.value.time}</div></div>
                                <div><div style={{ color: '#64748b', fontSize: '10px' }}>VIOLATION</div><div style={{ color: '#ef4444', fontWeight: 'bold' }}>{selectedDetection.value.type}</div></div>
                                <div><div style={{ color: '#64748b', fontSize: '10px' }}>PLATE</div><div style={{ color: '#00d4ff', fontWeight: 'bold' }}>{selectedDetection.value.plate || 'N/A'}</div></div>
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
