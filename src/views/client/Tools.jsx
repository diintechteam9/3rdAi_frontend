import { ref } from 'vue';
import { useRouter } from 'vue-router';
import {
  ChatBubbleLeftRightIcon,
  ChartBarIcon,
  BellIcon,
  SpeakerWaveIcon,
  ArrowRightIcon,
  MicrophoneIcon,
  BookOpenIcon,
  ShieldCheckIcon
} from '@heroicons/vue/24/outline';

export default {
  name: 'ClientTools',
  setup() {
    const router = useRouter();

    const tools = [
      {
        id: 1,
        name: 'Testimonials',
        icon: ChatBubbleLeftRightIcon,
        description: 'Collect and showcase customer reviews and testimonials',
        route: '/client/tools/testimonial',
        color: '#10b981',
        category: 'Marketing'
      },
      {
        id: 2,
        name: 'Customer Survey',
        icon: ChartBarIcon,
        description: 'Gather feedback through customizable surveys',
        route: '/client/tools/survey',
        color: '#3b82f6',
        category: 'Analytics'
      },
      {
        id: 3,
        name: 'Alerts',
        icon: BellIcon,
        description: 'Send targeted alerts and notifications to your partners',
        route: '/client/tools/alerts',
        color: '#ef4444',
        category: 'Communication'
      },
      {
        id: 4,
        name: 'Announcements',
        icon: SpeakerWaveIcon,
        description: 'Publish announcements and updates for your partners',
        route: '/client/tools/announcements',
        color: '#8b5cf6',
        category: 'Communication'
      },
      {
        id: 5,
        name: 'AI Voice Agent',
        icon: MicrophoneIcon,
        description: 'Engage with the real-time AI Voice Assistant',
        route: '/client/tools/voice',
        color: '#f59e0b',
        category: 'AI Services'
      },
      {
        id: 6,
        name: 'Information Section',
        icon: BookOpenIcon,
        description: 'Manage banners, reels, safety videos and alerts shown to users',
        route: '/client/tools/information',
        color: '#0ea5e9',
        category: 'Content'
      },
      {
        id: 7,
        name: 'Report a Case Setup',
        icon: ShieldCheckIcon,
        description: 'Configure dynamic case types and custom fields for user reporting',
        route: '/client/tools/case-setup',
        color: '#f43f5e',
        category: 'Setup'
      }
    ];

    const handleCardClick = (route) => {
      router.push(route);
    };

    const getCategoryBadgeColor = (category) => {
      const colors = {
        'Marketing': 'bg-success',
        'Analytics': 'bg-primary',
        'Communication': 'bg-danger',
        'Content': 'bg-info'
      };
      return colors[category] || 'bg-secondary';
    };

    return () => (
      <div class="container-fluid px-4">
        <style>{`
          .tool-card {
            cursor: pointer;
            transition: all 0.3s ease;
            border-radius: 16px;
          }
          .tool-card:hover {
            transform: translateY(-8px) scale(1.02);
            box-shadow: 0 20px 40px rgba(0,0,0,0.15) !important;
          }
          .tool-icon {
            transition: all 0.3s ease;
          }
          .tool-card:hover .tool-icon {
            transform: rotate(10deg) scale(1.1);
          }
          .arrow-btn {
            transition: all 0.3s ease;
          }
          .tool-card:hover .arrow-btn {
            transform: scale(1.2);
            background-color: var(--tool-color) !important;
            color: white !important;
          }
          .hover-overlay {
            opacity: 0;
            transition: opacity 0.3s ease;
          }
          .tool-card:hover .hover-overlay {
            opacity: 1;
          }
        `}</style>
        <div class="row">
          <div class="col-12">
            {/* Header */}
            <div class="mb-5">
              <div class="d-flex align-items-center justify-content-between mb-3">
                <div>
                  <h1 class="display-5 fw-bold text-dark mb-2">Business Tools</h1>
                  <p class="lead text-muted mb-0">Powerful tools to grow and manage your business efficiently</p>
                </div>
                <div class="text-end">
                  <div class="badge bg-light text-dark px-3 py-2 fs-6">
                    {tools.length} Tools Available
                  </div>
                </div>
              </div>
              <hr class="border-2 opacity-25" />
            </div>

            {/* Tools Grid */}
            <div class="row g-4">
              {tools.map(tool => (
                <div key={tool.id} class="col-xl-4 col-lg-6 col-md-6 col-sm-12">
                  <div
                    class="tool-card card h-100 border-0 shadow-sm position-relative overflow-hidden"
                    style={{
                      '--tool-color': tool.color,
                      background: `linear-gradient(135deg, ${tool.color}08 0%, ${tool.color}15 30%, #f8fafc 100%)`
                    }}
                    onClick={() => handleCardClick(tool.route)}
                  >
                    {/* Category Badge */}
                    <div class="position-absolute top-0 end-0 m-3">
                      <span class={`badge ${getCategoryBadgeColor(tool.category)} px-2 py-1`}>
                        {tool.category}
                      </span>
                    </div>

                    <div class="card-body p-4">
                      {/* Icon */}
                      <div class="mb-4">
                        <div
                          class="tool-icon d-inline-flex align-items-center justify-content-center rounded-3"
                          style={{
                            width: '72px',
                            height: '72px',
                            backgroundColor: `${tool.color}15`,
                            border: `2px solid ${tool.color}25`
                          }}
                        >
                          <tool.icon
                            style={{
                              width: '2rem',
                              height: '2rem',
                              color: tool.color
                            }}
                          />
                        </div>
                      </div>

                      {/* Content */}
                      <div class="mb-4">
                        <h5 class="card-title fw-bold mb-2 text-dark">{tool.name}</h5>
                        <p class="card-text text-muted mb-0 lh-base" style={{ fontSize: '0.95rem' }}>
                          {tool.description}
                        </p>
                      </div>

                      {/* Action */}
                      <div class="d-flex align-items-center justify-content-between">
                        <span class="text-muted" style={{ fontSize: '0.85rem' }}>Click to access</span>
                        <div
                          class="arrow-btn d-flex align-items-center justify-content-center rounded-circle"
                          style={{
                            width: '40px',
                            height: '40px',
                            backgroundColor: `${tool.color}10`,
                            color: tool.color
                          }}
                        >
                          <ArrowRightIcon style={{ width: '1.25rem', height: '1.25rem' }} />
                        </div>
                      </div>
                    </div>

                    {/* Hover Overlay */}
                    <div
                      class="hover-overlay position-absolute top-0 start-0 w-100 h-100"
                      style={{
                        background: `linear-gradient(135deg, ${tool.color}15 0%, ${tool.color}25 100%)`,
                        pointerEvents: 'none',
                        borderRadius: '16px'
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }
};
