/**
 * AreaAssignment.jsx
 *
 * Client Dashboard: Assign approved partners to KML-imported area polygons.
 * Each area represents one pincode/polygon from the city KML file.
 *
 * Flow:
 *  1. Load all areas where clientId = logged-in client
 *  2. Load all approved partners for this client
 *  3. Client selects a partner from dropdown for each area
 *  4. PATCH /api/areas/:id/assign-partner is called
 *  5. Geo-routing automatically uses these assignments for future citizen cases
 */

import { ref, computed, onMounted } from 'vue';

export default {
    name: 'AreaAssignment',
    setup() {
        const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

        const areas = ref([]);
        const partners = ref([]);
        const loading = ref(true);
        const saving = ref(null);   // areaId currently being saved
        const search = ref('');
        const filter = ref('all'); // all | assigned | unassigned
        const toast = ref({ show: false, msg: '', type: 'success' });

        // ── Auth helpers ──────────────────────────────────────────────────────
        const getToken = () => localStorage.getItem('token_client')
            || localStorage.getItem('token_admin')
            || localStorage.getItem('token_super_admin');

        const getHeaders = () => ({
            Authorization: `Bearer ${getToken()}`,
            'Content-Type': 'application/json'
        });

        const decodeToken = (tok) => {
            try { return JSON.parse(atob(tok.split('.')[1])); } catch { return null; }
        };

        const getClientId = () => {
            const tok = getToken();
            if (!tok) return null;
            const p = decodeToken(tok);
            return p?.userId || p?.id || null;
        };

        // ── Toast ─────────────────────────────────────────────────────────────
        const showToast = (msg, type = 'success') => {
            toast.value = { show: true, msg, type };
            setTimeout(() => toast.value.show = false, 3500);
        };

        // ── Fetch areas for this client ───────────────────────────────────────
        const fetchAreas = async () => {
            try {
                const clientId = getClientId();
                const url = clientId
                    ? `${API_BASE}/areas/list?clientId=${clientId}`
                    : `${API_BASE}/areas/list`;

                const res = await fetch(url, { headers: getHeaders() });
                const data = await res.json();

                if (data.success) {
                    areas.value = data.areas;
                } else {
                    showToast('Failed to load areas', 'error');
                }
            } catch (e) {
                console.error('[AreaAssignment] fetchAreas error:', e);
                showToast('Network error loading areas', 'error');
            }
        };

        // ── Fetch approved partners for this client ───────────────────────────
        const fetchPartners = async () => {
            try {
                const res = await fetch(`${API_BASE}/partners/all`, { headers: getHeaders() });
                const data = await res.json();

                if (data.success) {
                    // Only show approved partners
                    partners.value = (data.data?.partners || []).filter(
                        p => p.verificationStatus === 'approved'
                    );
                }
            } catch (e) {
                console.error('[AreaAssignment] fetchPartners error:', e);
            }
        };

        // ── Load data ─────────────────────────────────────────────────────────
        onMounted(async () => {
            loading.value = true;
            await Promise.all([fetchAreas(), fetchPartners()]);
            loading.value = false;
        });

        // ── Assign partner to area ────────────────────────────────────────────
        const assignPartner = async (areaId, partnerId) => {
            saving.value = areaId;
            try {
                const res = await fetch(`${API_BASE}/areas/${areaId}/assign-partner`, {
                    method: 'PATCH',
                    headers: getHeaders(),
                    body: JSON.stringify({ partnerId })
                });
                const data = await res.json();

                if (data.success) {
                    const area = areas.value.find(a => a._id === areaId);
                    if (area) {
                        const partner = partners.value.find(p => p._id === partnerId);
                        area.partner = partner
                            ? { _id: partner._id, name: partner.name, email: partner.email, designation: partner.designation }
                            : null;
                    }
                    showToast(`✅ Partner assigned to "${areas.value.find(a => a._id === areaId)?.name}"`, 'success');
                } else {
                    showToast(data.error || 'Failed to assign partner', 'error');
                }
            } catch (e) {
                showToast('Network error', 'error');
            } finally {
                saving.value = null;
            }
        };

        // ── Unassign partner ──────────────────────────────────────────────────
        const unassignPartner = async (areaId, areaName) => {
            if (!confirm(`Remove partner from "${areaName}"? This area will be unassigned.`)) return;
            saving.value = areaId;
            try {
                const res = await fetch(`${API_BASE}/areas/${areaId}/unassign-partner`, {
                    method: 'PATCH',
                    headers: getHeaders()
                });
                const data = await res.json();

                if (data.success) {
                    const area = areas.value.find(a => a._id === areaId);
                    if (area) area.partner = null;
                    showToast(`Partner removed from "${areaName}"`, 'warning');
                } else {
                    showToast(data.error || 'Failed to unassign', 'error');
                }
            } catch (e) {
                showToast('Network error', 'error');
            } finally {
                saving.value = null;
            }
        };

        // ── Filtered & searched areas ─────────────────────────────────────────
        const filteredAreas = computed(() => {
            let list = areas.value;

            if (filter.value === 'assigned') list = list.filter(a => a.partner);
            if (filter.value === 'unassigned') list = list.filter(a => !a.partner);

            if (search.value.trim()) {
                const q = search.value.trim().toLowerCase();
                list = list.filter(a =>
                    a.name.toLowerCase().includes(q) ||
                    (a.partner?.name || '').toLowerCase().includes(q)
                );
            }
            return list;
        });

        const totalAssigned = computed(() => areas.value.filter(a => a.partner).length);
        const totalUnassigned = computed(() => areas.value.filter(a => !a.partner).length);

        // ── Render ────────────────────────────────────────────────────────────
        return () => (
            <div style={{ padding: '28px', fontFamily: "'Inter', sans-serif" }}>

                {/* CSS */}
                <style>{`
                    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
                    .area-card { transition: all 0.2s ease; }
                    .area-card:hover { box-shadow: 0 8px 30px rgba(0,0,0,0.1) !important; transform: translateY(-1px); }
                    .partner-select { appearance: none; cursor: pointer; }
                    .partner-select:focus { outline: none; box-shadow: 0 0 0 3px rgba(99,102,241,0.15); }
                    .btn-unassign { transition: all 0.2s; }
                    .btn-unassign:hover { background: #fef2f2 !important; color: #dc2626 !important; border-color: #fca5a5 !important; }
                    .filter-tab { transition: all 0.2s; cursor: pointer; }
                    .filter-tab:hover { background: rgba(99,102,241,0.08); }
                `}</style>

                {/* Toast */}
                {toast.value.show && (
                    <div style={{
                        position: 'fixed', top: '20px', right: '24px', zIndex: 9999,
                        padding: '14px 20px', borderRadius: '14px', fontSize: '14px', fontWeight: '600',
                        background: toast.value.type === 'success' ? '#ecfdf5'
                            : toast.value.type === 'warning' ? '#fefce8'
                                : '#fef2f2',
                        color: toast.value.type === 'success' ? '#065f46'
                            : toast.value.type === 'warning' ? '#92400e'
                                : '#991b1b',
                        border: `1px solid ${toast.value.type === 'success' ? '#6ee7b7' : toast.value.type === 'warning' ? '#fde68a' : '#fca5a5'}`,
                        boxShadow: '0 10px 30px rgba(0,0,0,0.12)',
                        display: 'flex', alignItems: 'center', gap: '8px',
                        animation: 'slideIn 0.3s ease'
                    }}>
                        {toast.value.msg}
                    </div>
                )}

                {/* Page Header */}
                <div style={{ marginBottom: '28px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
                                <div style={{
                                    width: '40px', height: '40px', borderRadius: '12px',
                                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
                                    </svg>
                                </div>
                                <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '800', color: '#111827', letterSpacing: '-0.5px' }}>
                                    Area Assignment
                                </h1>
                            </div>
                            <p style={{ margin: 0, color: '#6b7280', fontSize: '14px', lineHeight: '1.5' }}>
                                Assign approved partners to city areas (pincode zones from KML data).
                                Citizen cases are automatically routed to the assigned partner.
                            </p>
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <div style={{ padding: '10px 18px', background: '#ecfdf5', border: '1px solid #6ee7b7', borderRadius: '12px', textAlign: 'center' }}>
                                <div style={{ fontSize: '20px', fontWeight: '800', color: '#059669' }}>{totalAssigned.value}</div>
                                <div style={{ fontSize: '11px', color: '#059669', fontWeight: '600' }}>Assigned</div>
                            </div>
                            <div style={{ padding: '10px 18px', background: '#fff7ed', border: '1px solid #fdba74', borderRadius: '12px', textAlign: 'center' }}>
                                <div style={{ fontSize: '20px', fontWeight: '800', color: '#ea580c' }}>{totalUnassigned.value}</div>
                                <div style={{ fontSize: '11px', color: '#ea580c', fontWeight: '600' }}>Unassigned</div>
                            </div>
                            <div style={{ padding: '10px 18px', background: '#f5f3ff', border: '1px solid #c4b5fd', borderRadius: '12px', textAlign: 'center' }}>
                                <div style={{ fontSize: '20px', fontWeight: '800', color: '#7c3aed' }}>{partners.value.length}</div>
                                <div style={{ fontSize: '11px', color: '#7c3aed', fontWeight: '600' }}>Partners</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* How it works banner */}
                <div style={{
                    background: 'linear-gradient(135deg, #eff6ff, #f0fdf4)',
                    border: '1px solid #bfdbfe', borderRadius: '14px', padding: '14px 20px',
                    marginBottom: '24px', display: 'flex', gap: '20px', flexWrap: 'wrap'
                }}>
                    {[
                        { step: '1', label: 'Areas loaded from KML', color: '#3b82f6' },
                        { step: '2', label: 'Assign a partner per area', color: '#8b5cf6' },
                        { step: '3', label: 'Citizen submits case with GPS', color: '#10b981' },
                        { step: '4', label: 'Case auto-routed to partner', color: '#f59e0b' }
                    ].map(s => (
                        <div key={s.step} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{
                                width: '24px', height: '24px', borderRadius: '50%',
                                background: s.color, color: 'white',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '12px', fontWeight: '700', flexShrink: 0
                            }}>{s.step}</div>
                            <span style={{ fontSize: '13px', color: '#374151', fontWeight: '500' }}>{s.label}</span>
                        </div>
                    ))}
                </div>

                {/* Search + Filter bar */}
                <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
                    {/* Search */}
                    <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
                        <svg style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }}
                            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Search areas or partners..."
                            value={search.value}
                            onInput={e => search.value = e.target.value}
                            style={{
                                width: '100%', padding: '10px 14px 10px 38px', borderRadius: '10px',
                                border: '1.5px solid #e5e7eb', fontSize: '14px', background: 'white',
                                boxSizing: 'border-box', transition: 'border 0.2s',
                                outline: 'none'
                            }}
                        />
                    </div>

                    {/* Filter tabs */}
                    <div style={{ display: 'flex', background: '#f3f4f6', padding: '4px', borderRadius: '10px', gap: '2px' }}>
                        {[['all', 'All'], ['assigned', '✅ Assigned'], ['unassigned', '⚠️ Unassigned']].map(([val, label]) => (
                            <button
                                key={val}
                                class="filter-tab"
                                onClick={() => filter.value = val}
                                style={{
                                    padding: '7px 14px', borderRadius: '7px', border: 'none', fontSize: '13px',
                                    fontWeight: '600', cursor: 'pointer',
                                    background: filter.value === val ? 'white' : 'transparent',
                                    color: filter.value === val ? '#6366f1' : '#6b7280',
                                    boxShadow: filter.value === val ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
                                }}
                            >{label}</button>
                        ))}
                    </div>
                </div>

                {/* Content */}
                {loading.value ? (
                    <div style={{ textAlign: 'center', padding: '80px', color: '#9ca3af' }}>
                        <div style={{ width: '40px', height: '40px', border: '3px solid #e5e7eb', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
                        <p style={{ margin: 0 }}>Loading areas and partners...</p>
                    </div>
                ) : filteredAreas.value.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '80px', background: 'white', borderRadius: '16px', border: '1px solid #e5e7eb' }}>
                        <div style={{ fontSize: '48px', marginBottom: '12px' }}>
                            {areas.value.length === 0 ? '🗺️' : '🔍'}
                        </div>
                        <h3 style={{ color: '#374151', margin: '0 0 8px', fontWeight: '700' }}>
                            {areas.value.length === 0
                                ? 'No areas found'
                                : `No areas matching "${search.value}"`}
                        </h3>
                        <p style={{ color: '#9ca3af', fontSize: '14px', margin: 0 }}>
                            {areas.value.length === 0
                                ? 'Run the KML import script to populate city areas, then link them to your client account.'
                                : 'Try a different search term or clear the filter.'}
                        </p>
                        {areas.value.length === 0 && (
                            <div style={{ marginTop: '20px', padding: '14px 20px', background: '#f8fafc', borderRadius: '10px', border: '1px dashed #cbd5e1', display: 'inline-block' }}>
                                <code style={{ fontSize: '13px', color: '#475569' }}>
                                    node scripts/import_kml.js
                                </code>
                            </div>
                        )}
                    </div>
                ) : (
                    <div>
                        {/* Results count */}
                        <p style={{ color: '#6b7280', fontSize: '13px', marginBottom: '14px', fontWeight: '500' }}>
                            Showing {filteredAreas.value.length} of {areas.value.length} areas
                        </p>

                        {/* Area cards grid */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                            gap: '14px'
                        }}>
                            {filteredAreas.value.map(area => (
                                <div key={area._id} class="area-card" style={{
                                    background: 'white', borderRadius: '16px', padding: '20px',
                                    border: area.partner ? '1px solid #d1fae5' : '1px solid #fde68a',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                                }}>
                                    {/* Area header */}
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '16px' }}>
                                        <div style={{
                                            width: '40px', height: '40px', borderRadius: '10px', flexShrink: 0,
                                            background: area.partner ? '#ecfdf5' : '#fef3c7',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                                        }}>
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                                                stroke={area.partner ? '#059669' : '#d97706'} stroke-width="2">
                                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                                <circle cx="12" cy="10" r="3" />
                                            </svg>
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px', flexWrap: 'wrap' }}>
                                                <span style={{ fontWeight: '700', color: '#111827', fontSize: '14px', lineHeight: '1.3' }}>
                                                    {area.name}
                                                </span>
                                                <span style={{
                                                    padding: '2px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: '600',
                                                    background: area.partner ? '#d1fae5' : '#fef3c7',
                                                    color: area.partner ? '#065f46' : '#92400e'
                                                }}>
                                                    {area.partner ? '✅ Assigned' : '⚠️ Unassigned'}
                                                </span>
                                            </div>
                                            <div style={{ color: '#9ca3af', fontSize: '12px' }}>
                                                {area.city} {area.description && `· ${area.description.substring(0, 40)}${area.description.length > 40 ? '...' : ''}`}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Current partner */}
                                    {area.partner && (
                                        <div style={{
                                            display: 'flex', alignItems: 'center', gap: '10px',
                                            padding: '10px 14px', background: '#f0fdf4', borderRadius: '10px',
                                            marginBottom: '14px', border: '1px solid #bbf7d0'
                                        }}>
                                            <div style={{
                                                width: '32px', height: '32px', borderRadius: '50%',
                                                background: 'linear-gradient(135deg, #10b981, #059669)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                color: 'white', fontWeight: '700', fontSize: '14px', flexShrink: 0
                                            }}>
                                                {area.partner.name?.[0]?.toUpperCase() || 'P'}
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontWeight: '600', color: '#065f46', fontSize: '13px' }}>
                                                    {area.partner.name}
                                                </div>
                                                <div style={{ color: '#6b7280', fontSize: '11px' }}>
                                                    {area.partner.designation || area.partner.email}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Partner assignment dropdown */}
                                    <div style={{ marginBottom: '12px' }}>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
                                            {area.partner ? 'Change Partner' : 'Assign Partner'}
                                        </label>
                                        <div style={{ position: 'relative' }}>
                                            <select
                                                class="partner-select"
                                                disabled={saving.value === area._id}
                                                onChange={async e => {
                                                    const val = e.target.value;
                                                    if (val && val !== '__unassign__') {
                                                        await assignPartner(area._id, val);
                                                    }
                                                    e.target.value = '';
                                                }}
                                                style={{
                                                    width: '100%', padding: '9px 36px 9px 12px',
                                                    border: '1.5px solid #e5e7eb', borderRadius: '10px',
                                                    fontSize: '13px', background: 'white', color: '#374151',
                                                    transition: 'border 0.2s', cursor: 'pointer',
                                                    boxSizing: 'border-box',
                                                    opacity: saving.value === area._id ? 0.6 : 1
                                                }}
                                            >
                                                <option value="">
                                                    {saving.value === area._id ? '⏳ Saving...' : '— Select a partner —'}
                                                </option>
                                                {partners.value.map(p => (
                                                    <option key={p._id} value={p._id}>
                                                        {p.name}{p.designation ? ` (${p.designation})` : ''}
                                                    </option>
                                                ))}
                                            </select>
                                            <svg style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#9ca3af' }}
                                                width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                <polyline points="6 9 12 15 18 9" />
                                            </svg>
                                        </div>
                                    </div>

                                    {/* Unassign button */}
                                    {area.partner && (
                                        <button
                                            class="btn-unassign"
                                            disabled={saving.value === area._id}
                                            onClick={() => unassignPartner(area._id, area.name)}
                                            style={{
                                                width: '100%', padding: '8px', borderRadius: '8px',
                                                border: '1.5px solid #e5e7eb', background: 'white',
                                                color: '#9ca3af', fontSize: '12px', fontWeight: '600',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            Remove Assignment
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <style>{`
                    @keyframes spin { to { transform: rotate(360deg); } }
                    @keyframes slideIn { from { opacity:0; transform:translateX(20px); } to { opacity:1; transform:translateX(0); } }
                `}</style>
            </div>
        );
    }
};
