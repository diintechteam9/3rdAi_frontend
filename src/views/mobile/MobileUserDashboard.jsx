import { ref, onMounted } from 'vue';
import { useAuth } from '../../store/auth.js';
import { useRouter } from 'vue-router';
import {
  ChatBubbleLeftRightIcon,
  MicrophoneIcon,
  UserIcon,
  FilmIcon,
  ArrowRightIcon,
  VideoCameraIcon,
  UsersIcon,
  BookOpenIcon
} from '@heroicons/vue/24/outline';

export default {
  name: 'MobileUserDashboard',
  setup() {
    const router = useRouter();
    const { user } = useAuth();

    const tools = [
      {
        id: 1,
        name: 'Connect with Expert',
        icon: UsersIcon,
        description: 'Chat live with an available expert partner in real-time',
        route: '/mobile/user/user-chat',
        color: '#f59e0b',
        badge: 'Live'
      },
      {
        id: 3,
        name: 'Text Chat',
        icon: ChatBubbleLeftRightIcon,
        description: 'Start a conversation with AI using text messages',
        route: '/mobile/user/chat',
        color: '#10b981'
      },
      {
        id: 4,
        name: 'Voice Chat',
        icon: MicrophoneIcon,
        description: 'Have a voice-to-voice conversation with AI',
        route: '/mobile/user/voice',
        color: '#8b5cf6'
      },
      {
        id: 5,
        name: 'My Profile',
        icon: UserIcon,
        description: 'View and manage your profile information',
        route: '/mobile/user/profile',
        color: '#3b82f6'
      },
      {
        id: 6,
        name: 'CCTV Surveillance',
        icon: VideoCameraIcon,
        description: 'View live CCTV coverage and Delhi zone monitoring map',
        route: '/mobile/user/cctv-surveillance',
        color: '#ef4444'
      },
      {
        id: 7,
        name: 'Information Section',
        icon: BookOpenIcon,
        description: 'Banners, safety videos, reels aur latest alerts dekho',
        route: '/mobile/user/information',
        color: '#0ea5e9'
      }
    ];

    const handleCardClick = (route) => {
      router.push(route);
    };

    const clientName = user.value?.clientId?.businessName || 'Partner';
    const clientIdDisplay = user.value?.clientId?.clientId || '';

    return () => (
      <div class="mobile-dashboard">
        {/* Header */}
        <div class="dashboard-header">

          <p>Welcome to <strong>{clientName}</strong> AI Services</p>
          {clientIdDisplay && <p class="client-id">Client ID: {clientIdDisplay}</p>}
          <p class="subtitle">Access your AI-powered tools and features</p>
        </div>

        <style>{`
          .mobile-dashboard {
            padding: 1rem;
            min-height: 100vh;
            background: #f8fafc;
            display: flex;
            flex-direction: column;
            height: 100vh;
            overflow-y: auto;
          }
          
          .dashboard-header {
            background: rgba(255, 255, 255, 0.9);
            border-radius: 12px;
            padding: 0.75rem 1rem;
            margin-bottom: 1rem;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            border: 1px solid rgba(0, 0, 0, 0.05);
            text-align: center;
          }
          
          .dashboard-header p {
            margin: 0;
            font-size: 1.05rem;
            color: #1e293b;
            font-weight: 500;
          }

          .dashboard-header .client-id {
            font-size: 0.8rem;
            color: #6366f1;
            font-weight: 600;
            margin: 0.2rem 0;
            background: #e0e7ff;
            display: inline-block;
            padding: 0.1rem 0.5rem;
            border-radius: 4px;
          }

          .tools-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            gap: 1.5rem;
            align-content: start;
            flex-grow: 1;
          }
          
          @media (max-width: 768px) {
            .mobile-dashboard {
              height: auto;
              overflow-y: visible;
              padding: 0.75rem;
            }
            
            .tools-grid {
              grid-template-columns: 1fr;
              gap: 0.75rem;
            }
            
            .dashboard-header {
              padding: 0.5rem 0.75rem;
              margin-bottom: 0.75rem;
            }
            
            .dashboard-header p {
              font-size: 0.9rem;
            }
          }
          
          @media (max-width: 480px) {
            .mobile-dashboard {
              padding: 0.5rem;
            }
            
            .tools-grid {
              gap: 0.5rem;
            }
            
            .dashboard-header {
              padding: 0.5rem 0.75rem;
              margin-bottom: 0.5rem;
            }
          }
          
          .tool-card {
            background: white;
            border-radius: 12px;
            padding: 1.25rem;
            min-height: 200px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            cursor: pointer;
            transition: all 0.3s ease;
            border: 1px solid rgba(0, 0, 0, 0.05);
            position: relative;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
          
          .tool-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
          }
          
          .tool-icon-container {
            width: 45px;
            height: 45px;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 0.6rem;
            transition: all 0.3s ease;
          }
          
          .tool-card:hover .tool-icon-container {
            transform: scale(1.1);
          }
          
          .tool-title {
            font-size: 0.95rem;
            font-weight: 600;
            color: #1e293b;
            margin-bottom: 0.25rem;
          }
          
          .tool-description {
            font-size: 0.8rem;
            color: #64748b;
            line-height: 1.3;
            margin-bottom: 0.6rem;
            flex-grow: 1;
          }
          
          .tool-action {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-top: auto;
          }
          
          .tool-action-text {
            font-size: 0.75rem;
            color: #94a3b8;
          }
          
          .tool-arrow {
            width: 26px;
            height: 26px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s ease;
          }
          
          .tool-card:hover .tool-arrow {
            transform: scale(1.2);
          }
          
          @media (max-width: 768px) {
            .tool-card {
              padding: 1rem;
            }
            
            .tool-icon-container {
              width: 40px;
              height: 40px;
            }
            
            .tool-title {
              font-size: 0.95rem;
            }
            
            .tool-description {
              font-size: 0.8rem;
            }
          }
          
          @media (max-width: 480px) {
            .tool-card {
              padding: 0.85rem;
            }
            
            .tool-icon-container {
              width: 36px;
              height: 36px;
              margin-bottom: 0.5rem;
            }
            
            .tool-title {
              font-size: 0.9rem;
            }
            
            .tool-description {
              font-size: 0.75rem;
            }
            
            .tool-arrow {
              width: 24px;
              height: 24px;
            }
          }
        `}</style>

        {/* Tools Grid */}
        <div class="tools-grid">
          {tools.map(tool => (
            <div
              key={tool.id}
              class="tool-card"
              style={{
                background: `linear-gradient(135deg, ${tool.color}08 0%, ${tool.color}15 30%, #ffffff 100%)`
              }}
              onClick={() => handleCardClick(tool.route)}
            >
              <div
                class="tool-icon-container"
                style={{
                  backgroundColor: `${tool.color}15`,
                  border: `2px solid ${tool.color}25`,
                  position: 'relative'
                }}
              >
                <tool.icon
                  style={{
                    width: '1.5rem',
                    height: '1.5rem',
                    color: tool.color
                  }}
                />
                {tool.badge && (
                  <span style={{
                    position: 'absolute',
                    top: '-6px',
                    right: '-6px',
                    background: '#ef4444',
                    color: 'white',
                    fontSize: '9px',
                    fontWeight: '700',
                    padding: '2px 5px',
                    borderRadius: '999px',
                    lineHeight: '1.2'
                  }}>{tool.badge}</span>
                )}
              </div>

              <div class="tool-title">{tool.name}</div>
              <div class="tool-description">{tool.description}</div>

              <div class="tool-action">
                <div class="tool-action-text">Tap to access</div>
                <div
                  class="tool-arrow"
                  style={{
                    backgroundColor: `${tool.color}10`,
                    color: tool.color
                  }}
                >
                  <ArrowRightIcon style={{ width: '1rem', height: '1rem' }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
};

