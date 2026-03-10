/**
 * InformationSection.jsx
 * Mobile User View — Displays published Information content
 * Layout: Modern Mobile-App style vertical scrollable feed
 */
import { ref, onMounted, computed, onUnmounted } from 'vue';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export default {
    name: 'InformationSection',
    setup() {
        const grouped = ref({
            banner: [],
            reels: [],
            alerts: [],
            publicSafetyVideos: [],
            cyberSafetyVideos: []
        });
        const loading = ref(true);
        const error = ref('');

        const getToken = () =>
            localStorage.getItem('token_user') ||
            localStorage.getItem('token_partner');

        const fetchInformation = async () => {
            loading.value = true;
            error.value = '';
            try {
                const res = await fetch(`${API_BASE_URL}/information`, {
                    headers: { Authorization: `Bearer ${getToken()}` }
                });
                const data = await res.json();
                if (data.success) {
                    grouped.value = {
                        banner: data.data.banner || [],
                        reels: data.data.reels || [],
                        alerts: data.data.alerts || [],
                        publicSafetyVideos: data.data.publicSafetyVideos || [],
                        cyberSafetyVideos: data.data.cyberSafetyVideos || []
                    };
                } else {
                    error.value = data.message || 'Failed to load information';
                }
            } catch (e) {
                console.error('[InformationSection] fetch error:', e);
                error.value = 'Network error. Please try again.';
            } finally {
                loading.value = false;
            }
        };

        const totalCount = computed(() =>
            Object.values(grouped.value).reduce((sum, arr) => sum + arr.length, 0)
        );

        const isVideo = (url) => url && /\.(mp4|webm|ogg|mov)(\?|$)/i.test(url);
        const isImage = (url) => url && /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(url);

        const formatDate = (dateStr) => {
            return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
        };

        const publicSafetyVisibleCount = ref(3);
        const cyberSafetyVisibleCount = ref(3);

        const loadMorePublicSafety = () => {
            publicSafetyVisibleCount.value += 3;
        };

        const loadMoreCyberSafety = () => {
            cyberSafetyVisibleCount.value += 3;
        };

        const activeBannerIndex = ref(0);
        let bannerInterval = null;

        const activeReelIndex = ref(-1);
        const likingReelId = ref(null);
        let reelObserver = null;

        const setupObserver = () => {
            if (reelObserver) reelObserver.disconnect();

            reelObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    const video = entry.target.querySelector('video');
                    if (video) {
                        if (entry.isIntersecting) {
                            video.play().catch(e => console.log('Autoplay blocked'));
                            video.muted = false;
                        } else {
                            video.pause();
                            video.muted = true;
                        }
                    }
                });
            }, {
                threshold: 0.6 // 60% visibility to trigger
            });

            setTimeout(() => {
                const reels = document.querySelectorAll('.reel-video-container');
                reels.forEach(r => reelObserver.observe(r));
            }, 100);
        };

        const openReel = (index) => {
            activeReelIndex.value = index;
            document.body.style.overflow = 'hidden';

            // We use 'auto' behavior to jump instantly to the clicked reel
            setTimeout(() => {
                const el = document.getElementById(`reel-item-${index}`);
                if (el) {
                    el.scrollIntoView({ behavior: 'auto', block: 'start' });
                }
                setupObserver();
            }, 10); // Reduced delay for faster snap
        };

        const closeReel = () => {
            if (reelObserver) reelObserver.disconnect();
            activeReelIndex.value = -1;
            document.body.style.overflow = 'auto';
        };

        const toggleLike = async (item) => {
            if (likingReelId.value) return;
            likingReelId.value = item._id;
            try {
                const res = await fetch(`${API_BASE_URL}/information/${item._id}/like`, {
                    method: 'PUT',
                    headers: { Authorization: `Bearer ${getToken()}` }
                });
                const data = await res.json();
                if (data.success) {
                    // Update local state for the item
                    item.likesCount = data.data.likesCount;
                    item.liked = data.data.liked;
                }
            } catch (e) {
                console.error('Like error:', e);
            } finally {
                likingReelId.value = null;
            }
        };

        const shareReel = async (item) => {
            if (navigator.share) {
                try {
                    await navigator.share({
                        title: item.title,
                        text: item.description || 'Check out this safety reel!',
                        url: item.mediaUrl || window.location.href
                    });
                } catch (err) {
                    console.log('Share failed:', err);
                }
            } else {
                // Fallback: Copy to clipboard
                navigator.clipboard.writeText(item.mediaUrl || window.location.href);
                alert('Link copied to clipboard!');
            }
        };

        onMounted(() => {
            fetchInformation();
            bannerInterval = setInterval(() => {
                if (grouped.value.banner && grouped.value.banner.length > 1) {
                    activeBannerIndex.value = (activeBannerIndex.value + 1) % grouped.value.banner.length;
                }
            }, 10000); // 10 seconds

            // Inject keyframes globally to avoid Vue JSX parse issues with style tags
            const style = document.createElement('style');
            style.innerHTML = `
                @keyframes bannerFade {
                    from { opacity: 0.4; }
                    to { opacity: 1; }
                }
                @keyframes marquee {
                    0% { transform: translateX(100%); }
                    100% { transform: translateX(-100%); }
                }
            `;
            document.head.appendChild(style);
        });

        onUnmounted(() => {
            if (bannerInterval) clearInterval(bannerInterval);
        });

        // Reusable renderer for media inside cards
        const renderMediaPreview = (item, heightOpts = { img: '180px', vid: '220px', thumb: '160px' }) => {
            if (item.mediaUrl && isVideo(item.mediaUrl)) {
                return (
                    <video
                        src={item.mediaUrl}
                        controls
                        style={{ width: '100%', height: heightOpts.vid, objectFit: 'contain', background: '#000', display: 'block' }}
                        poster={item.thumbnail || undefined}
                    />
                );
            }
            if (item.mediaUrl && isImage(item.mediaUrl)) {
                return (
                    <img
                        src={item.mediaUrl}
                        alt=""
                        style={{ width: '100%', height: heightOpts.img, objectFit: 'contain', background: '#f8fafc', display: 'block' }}
                    />
                );
            }
            if (item.thumbnail) {
                return (
                    <div style={{ position: 'relative', height: heightOpts.thumb }}>
                        <img
                            src={item.thumbnail}
                            alt="thumbnail"
                            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        />
                        {item.mediaUrl && (
                            <a
                                href={item.mediaUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                    position: 'absolute', inset: 0,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    background: 'rgba(0,0,0,0.4)', color: 'white', fontSize: '2rem', textDecoration: 'none'
                                }}
                            >
                                ▶
                            </a>
                        )}
                    </div>
                );
            }
            return null; // Return nothing if no media is present
        };

        const renderReelPlayer = () => {
            if (activeReelIndex.value === -1) return null;
            const reelsList = grouped.value.reels;

            return (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 1000,
                    background: 'rgba(0,0,0,0.95)',
                    backdropFilter: 'blur(15px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    {/* Main Scrollable Container */}
                    <div style={{
                        position: 'relative',
                        width: '100%',
                        maxWidth: '420px',
                        height: '92vh', // Slightly reduced to ensure it fits mobile screens better
                        background: '#000',
                        borderRadius: '16px',
                        overflowY: 'scroll',
                        scrollSnapType: 'y mandatory',
                        msOverflowStyle: 'none',
                        scrollbarWidth: 'none',
                        boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                        WebkitOverflowScrolling: 'touch', // For better iOS scroll
                        touchAction: 'pan-y'
                    }}>
                        {/* Header Area (Sticky or Fixed inside) */}
                        <div style={{
                            position: 'sticky', top: 0, left: 0, right: 0, zIndex: 20,
                            padding: '16px', display: 'flex', alignItems: 'center',
                            background: 'linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)',
                            pointerEvents: 'none'
                        }}>
                            <button onClick={closeReel} style={{
                                background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white',
                                width: '40px', height: '40px', borderRadius: '50%', fontSize: '20px',
                                cursor: 'pointer', pointerEvents: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>✕</button>
                        </div>

                        {reelsList.map((item, index) => (
                            <div
                                key={item._id}
                                id={`reel-item-${index}`}
                                className="reel-video-container"
                                style={{
                                    height: '92vh', // Must match parent's height exactly
                                    width: '100%',
                                    position: 'relative',
                                    scrollSnapAlign: 'start',
                                    scrollSnapStop: 'always',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: '#000',
                                    overflow: 'hidden'
                                }}
                            >
                                <video
                                    src={item.mediaUrl}
                                    controls
                                    loop
                                    // Mute all by default, observer will unmute visible one
                                    muted={true}
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'contain',
                                        backgroundColor: '#000'
                                    }}
                                />

                                {/* Floating Actions (Right Side) */}
                                <div style={{
                                    position: 'absolute', right: '12px', bottom: '130px',
                                    display: 'flex', flexDirection: 'column', gap: '22px', alignItems: 'center',
                                    zIndex: 5
                                }}>
                                    <div style={{ textAlign: 'center', cursor: 'pointer' }} onClick={() => toggleLike(item)}>
                                        <div style={{
                                            fontSize: '30px', color: item.liked ? '#ef4444' : 'white',
                                            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
                                            transition: 'transform 0.2s',
                                            transform: item.liked ? 'scale(1.2)' : 'scale(1)'
                                        }}>
                                            {item.liked ? '❤️' : '🤍'}
                                        </div>
                                        <span style={{ color: 'white', fontSize: '12px', fontWeight: '700', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
                                            {item.likesCount || 0}
                                        </span>
                                    </div>

                                    <div style={{ textAlign: 'center', cursor: 'pointer' }} onClick={() => shareReel(item)}>
                                        <div style={{
                                            fontSize: '30px', color: 'white',
                                            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))'
                                        }}>
                                            ↗️
                                        </div>
                                        <span style={{ color: 'white', fontSize: '12px', fontWeight: '700', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
                                            Share
                                        </span>
                                    </div>
                                </div>

                                {/* Video Text Overlay (Bottom) */}
                                <div style={{
                                    position: 'absolute', bottom: 0, left: 0, right: 0,
                                    padding: '40px 80px 40px 16px',
                                    background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 100%)',
                                    color: 'white', zIndex: 4
                                }}>
                                    <h3 style={{ margin: '0 0 8px', fontSize: '1.1rem', fontWeight: '700' }}>{item.title}</h3>
                                    <p style={{ margin: 0, fontSize: '0.9rem', opacity: 0.9, lineHeight: '1.4' }}>{item.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            );
        };

        // Reusable fallback button if it's a PDF or unknown link without thumbnail
        const FallbackViewContent = ({ item }) => {
            if (item.mediaUrl && !isVideo(item.mediaUrl) && !isImage(item.mediaUrl) && !item.thumbnail) {
                return (
                    <a
                        href={item.mediaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                            display: 'inline-flex', alignItems: 'center', gap: '6px',
                            padding: '6px 14px', borderRadius: '8px',
                            background: '#eef2ff', color: '#4f46e5',
                            fontSize: '12px', fontWeight: 600, textDecoration: 'none',
                            marginTop: '8px'
                        }}
                    >
                        🔗 View Link
                    </a>
                );
            }
            return null;
        };

        return () => (
            <div style={{
                padding: '0',
                minHeight: '100%',
                background: '#f8fafc',
                fontFamily: "'Inter','Segoe UI',sans-serif",
                paddingBottom: '40px'
            }}>
                {/* Fixed Top Header (Mobile App Style) */}
                <div style={{
                    background: 'white',
                    padding: '16px 20px',
                    position: 'sticky',
                    top: 0,
                    zIndex: 10,
                    boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <div>
                        <h2 style={{ margin: '0 0 2px', fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>
                            Information
                        </h2>
                        <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
                            Updates, Safety, and Alerts
                        </p>
                    </div>
                    {!loading.value && totalCount.value > 0 && (
                        <div style={{
                            background: '#eef2ff', color: '#4f46e5',
                            padding: '4px 10px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600
                        }}>
                            {totalCount.value} Updates
                        </div>
                    )}
                </div>

                {/* Loading / Error States */}
                {loading.value && (
                    <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
                        <div style={{ fontSize: '2rem', marginBottom: '10px' }}>⏳</div>
                        <p>Loading your feed...</p>
                    </div>
                )}

                {!loading.value && error.value && (
                    <div style={{ margin: '20px', background: '#fee2e2', borderRadius: '12px', padding: '20px', textAlign: 'center', color: '#991b1b' }}>
                        <p style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: 500 }}>{error.value}</p>
                        <button onClick={fetchInformation} style={{ padding: '8px 24px', borderRadius: '8px', border: 'none', background: '#ef4444', color: 'white', fontWeight: 600, cursor: 'pointer' }}>Retry</button>
                    </div>
                )}

                {/* Empty State (Removed so sections always show regardless of total count) */}


                {/* Full Scrollable Layout Sections */}
                {!loading.value && !error.value && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', padding: '20px 16px' }}>

                        {/* Section 1: Top Banners (Carousel) */}
                        <section>
                            {grouped.value.banner.length > 0 ? (
                                <div style={{ position: 'relative', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.1)', height: '220px', background: '#1e293b' }}>
                                    <div key={grouped.value.banner[activeBannerIndex.value]?._id || 'banner'} style={{ width: '100%', height: '100%', position: 'relative', animation: 'bannerFade 0.6s ease-in-out' }}>
                                        {renderMediaPreview(grouped.value.banner[activeBannerIndex.value], { img: '220px', vid: '220px', thumb: '220px' })}
                                        <div style={{
                                            position: 'absolute', bottom: 0, left: 0, right: 0,
                                            background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.4) 65%, transparent 100%)',
                                            padding: '40px 16px 20px', pointerEvents: 'none'
                                        }}>
                                            <h3 style={{ margin: '0 0 6px', fontSize: '1.2rem', fontWeight: 700, color: 'white' }}>{grouped.value.banner[activeBannerIndex.value]?.title}</h3>
                                            {grouped.value.banner[activeBannerIndex.value]?.description && (
                                                <p style={{ margin: '0 0 10px', color: '#cbd5e1', fontSize: '0.9rem', lineHeight: '1.4', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{grouped.value.banner[activeBannerIndex.value]?.description}</p>
                                            )}
                                        </div>
                                        <div style={{ position: 'absolute', top: '16px', right: '16px' }}>
                                            <FallbackViewContent item={grouped.value.banner[activeBannerIndex.value]} />
                                        </div>
                                    </div>

                                    {/* Carousel Indicators */}
                                    {grouped.value.banner.length > 1 && (
                                        <div style={{ position: 'absolute', bottom: '12px', right: '16px', display: 'flex', gap: '6px', zIndex: 5 }}>
                                            {grouped.value.banner.map((_, idx) => (
                                                <div
                                                    key={idx}
                                                    onClick={() => activeBannerIndex.value = idx}
                                                    style={{
                                                        width: activeBannerIndex.value === idx ? '18px' : '6px',
                                                        height: '6px',
                                                        borderRadius: '3px',
                                                        background: activeBannerIndex.value === idx ? '#ffffff' : 'rgba(255,255,255,0.4)',
                                                        transition: 'all 0.3s ease',
                                                        cursor: 'pointer'
                                                    }}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div style={{ background: '#e2e8f0', height: '140px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '14px', border: '1px dashed #cbd5e1' }}>
                                    No banners available
                                </div>
                            )}
                        </section>

                        {/* Section 2: Safety Reels (Vertical Shorts Format) */}
                        <section>
                            <h3 style={{ margin: '0 0 16px', fontSize: '1.15rem', fontWeight: 700, color: '#1e293b', paddingLeft: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span>📱</span> Safety Reels
                            </h3>
                            {grouped.value.reels.length > 0 ? (
                                <div style={{
                                    display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '16px',
                                    scrollbarWidth: 'none', margin: '0 -16px', paddingLeft: '16px', paddingRight: '16px'
                                }}>
                                    {grouped.value.reels.slice(0, 6).map((item, index) => (
                                        <div key={item._id}
                                            onClick={() => openReel(index)}
                                            style={{
                                                flexShrink: 0, width: '140px', height: '240px', background: '#000', borderRadius: '12px',
                                                overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', position: 'relative',
                                                cursor: 'pointer'
                                            }}>
                                            <div style={{ height: '100%', width: '100%', position: 'absolute', top: 0, left: 0 }}>
                                                {renderMediaPreview(item, { img: '100%', vid: '100%', thumb: '100%' })}
                                            </div>
                                            {/* Gradient Overlay for Text */}
                                            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 100%)', padding: '20px 10px 10px', color: 'white', zIndex: 2 }}>
                                                <h4 style={{ margin: '0 0 4px', fontSize: '0.85rem', fontWeight: 600, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{item.title}</h4>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <p style={{ margin: 0, fontSize: '0.65rem', color: '#cbd5e1' }}>{formatDate(item.createdAt)}</p>
                                                    <span style={{ fontSize: '0.65rem' }}>❤️ {item.likesCount || 0}</span>
                                                </div>
                                            </div>
                                            {/* Play Icon / Reel Badge overlay */}
                                            <div style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(0,0,0,0.5)', color: 'white', fontSize: '0.65rem', padding: '3px 8px', borderRadius: '12px', fontWeight: 600, zIndex: 2, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <span>▶</span> Reel
                                            </div>
                                        </div>
                                    ))}
                                    {grouped.value.reels.length > 6 && (
                                        <div
                                            onClick={() => openReel(6)}
                                            style={{
                                                flexShrink: 0, width: '140px', height: '240px',
                                                background: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)',
                                                borderRadius: '12px', display: 'flex', flexDirection: 'column',
                                                alignItems: 'center', justifyContent: 'center', color: 'white',
                                                cursor: 'pointer', boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
                                                gap: '8px'
                                            }}>
                                            <div style={{ fontSize: '24px' }}>➕</div>
                                            <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>See More</div>
                                            <div style={{ fontSize: '0.7rem', opacity: 0.8 }}>{grouped.value.reels.length - 6} more reels</div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div style={{ background: 'white', padding: '20px', borderRadius: '12px', textAlign: 'center', color: '#94a3b8', border: '1px dashed #cbd5e1' }}>
                                    No safety reels published yet.
                                </div>
                            )}
                        </section>

                        {/* Section 3: Latest Alerts */}
                        <section>
                            {grouped.value.alerts.length > 0 ? (
                                <div style={{ background: '#fff7ed', borderRadius: '16px', padding: '16px 0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 16px', marginBottom: '12px' }}>
                                        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#c2410c', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span>💡</span> Latest updates
                                        </h3>
                                        <span style={{ fontSize: '0.85rem', color: '#9a3412', fontWeight: 600, cursor: 'pointer' }}>See all &gt;</span>
                                    </div>
                                    <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '8px', scrollbarWidth: 'none', paddingLeft: '16px', paddingRight: '16px' }}>
                                        {grouped.value.alerts.map((item, index) => (
                                            <div key={item._id} style={{
                                                flexShrink: 0, width: '260px', background: 'white', borderRadius: '12px',
                                                padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px',
                                                boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #fed7aa'
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                                                    <div style={{ fontSize: '1.2rem', background: '#ffedd5', padding: '6px', borderRadius: '8px' }}>🚨</div>
                                                    <div style={{ flex: 1 }}>
                                                        <h4 style={{ margin: '0 0 4px', fontSize: '0.9rem', fontWeight: 700, color: '#1f2937', lineHeight: '1.3', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{item.title}</h4>
                                                    </div>
                                                </div>
                                                {item.description && <p style={{ margin: 0, fontSize: '0.8rem', color: '#4b5563', lineHeight: '1.4', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{item.description}</p>}
                                                <div style={{ marginTop: 'auto', paddingTop: '4px', textAlign: 'right' }}>
                                                    <span style={{ fontSize: '0.7rem', color: '#9ca3af', fontWeight: 500 }}>{formatDate(item.createdAt)}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <h3 style={{ margin: '0 0 16px', fontSize: '1.15rem', fontWeight: 700, color: '#1e293b', paddingLeft: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span>🚨</span> Latest updates
                                    </h3>
                                    <div style={{ background: 'white', padding: '20px', borderRadius: '12px', textAlign: 'center', color: '#94a3b8', border: '1px dashed #cbd5e1' }}>
                                        No alerts currently present.
                                    </div>
                                </div>
                            )}
                        </section>

                        {/* Section 4: Public Safety Guides */}
                        <section>
                            <h3 style={{ margin: '0 0 16px', fontSize: '1.15rem', fontWeight: 700, color: '#1e293b', paddingLeft: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span>🛡️</span> Public Safety Guides
                            </h3>
                            {grouped.value.publicSafetyVideos.length > 0 ? (
                                <>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                                        {grouped.value.publicSafetyVideos.slice(0, publicSafetyVisibleCount.value).map(item => (
                                            <div key={item._id} style={{ background: 'white', borderRadius: '16px', overflow: 'hidden', border: '1px solid #e2e8f0', boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
                                                {renderMediaPreview(item, { img: '180px', vid: '180px', thumb: '180px' })}
                                                <div style={{ padding: '16px' }}>
                                                    <h4 style={{ margin: '0 0 8px', fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>{item.title}</h4>
                                                    {item.description && <p style={{ margin: '0 0 12px', fontSize: '0.85rem', color: '#475569', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{item.description}</p>}
                                                    <FallbackViewContent item={item} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    {publicSafetyVisibleCount.value < grouped.value.publicSafetyVideos.length && (
                                        <div style={{ textAlign: 'center', marginTop: '20px' }}>
                                            <button onClick={loadMorePublicSafety} style={{ padding: '10px 24px', borderRadius: '999px', border: '2px solid #6366f1', background: 'transparent', color: '#6366f1', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s', touchAction: 'manipulation' }}>
                                                ⬇ Load More Guides
                                            </button>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div style={{ background: 'white', padding: '20px', borderRadius: '12px', textAlign: 'center', color: '#94a3b8', border: '1px dashed #cbd5e1' }}>
                                    No public safety guides available.
                                </div>
                            )}
                        </section>

                        {/* Section 5: Cyber Safety Guides */}
                        <section>
                            <h3 style={{ margin: '0 0 16px', fontSize: '1.15rem', fontWeight: 700, color: '#1e293b', paddingLeft: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span>💻</span> Cyber Safety Guides
                            </h3>
                            {grouped.value.cyberSafetyVideos.length > 0 ? (
                                <>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                                        {grouped.value.cyberSafetyVideos.slice(0, cyberSafetyVisibleCount.value).map(item => (
                                            <div key={item._id} style={{ background: 'white', borderRadius: '16px', overflow: 'hidden', border: '1px solid #e2e8f0', boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
                                                {renderMediaPreview(item, { img: '180px', vid: '180px', thumb: '180px' })}
                                                <div style={{ padding: '16px' }}>
                                                    <h4 style={{ margin: '0 0 8px', fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>{item.title}</h4>
                                                    {item.description && <p style={{ margin: '0 0 12px', fontSize: '0.85rem', color: '#475569', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{item.description}</p>}
                                                    <FallbackViewContent item={item} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    {cyberSafetyVisibleCount.value < grouped.value.cyberSafetyVideos.length && (
                                        <div style={{ textAlign: 'center', marginTop: '20px' }}>
                                            <button onClick={loadMoreCyberSafety} style={{ padding: '10px 24px', borderRadius: '999px', border: '2px solid #6366f1', background: 'transparent', color: '#6366f1', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s', touchAction: 'manipulation' }}>
                                                ⬇ Load More Guides
                                            </button>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div style={{ background: 'white', padding: '20px', borderRadius: '12px', textAlign: 'center', color: '#94a3b8', border: '1px dashed #cbd5e1' }}>
                                    No cyber safety guides available.
                                </div>
                            )}
                        </section>

                    </div>
                )}
                {/* Reel Player Modal (Full Scrollable List) */}
                {renderReelPlayer()}
            </div>
        );
    }
};
