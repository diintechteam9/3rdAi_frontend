import { UserGroupIcon, ArrowLeftIcon } from '@heroicons/vue/24/outline';
import { useRouter } from 'vue-router';

export default {
  name: 'Connect',
  setup() {
    const router = useRouter();
    
    const goBack = () => {
      router.back();
    };
    
    return () => (
      <div class="page-container">
        <style>{`
          .page-container {
            min-height: 100vh;
            background: linear-gradient(135deg, #f5f1eb 0%, #ede7d9 100%);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 2rem;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            position: relative;
          }
          
          .back-button {
            position: absolute;
            top: 2rem;
            left: 2rem;
            background: rgba(255,255,255,0.9);
            border: none;
            border-radius: 12px;
            padding: 0.75rem;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            backdrop-filter: blur(10px);
          }
          
          .back-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(0,0,0,0.15);
          }
          
          .back-icon {
            width: 1.5rem;
            height: 1.5rem;
            color: #8b4513;
          }
          
          .coming-soon-card {
            background: rgba(255,255,255,0.9);
            border-radius: 24px;
            padding: 3rem 2rem;
            text-align: center;
            box-shadow: 0 8px 32px rgba(0,0,0,0.1);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255,255,255,0.2);
            max-width: 400px;
            width: 100%;
          }
          
          .icon {
            width: 4rem;
            height: 4rem;
            color: #8b4513;
            margin: 0 auto 1.5rem;
          }
          
          .title {
            font-size: 2rem;
            font-weight: 800;
            color: #2d3748;
            margin-bottom: 1rem;
          }
          
          .subtitle {
            font-size: 1.2rem;
            color: #8b4513;
            margin-bottom: 1rem;
            font-weight: 600;
          }
          
          .message {
            color: #6b5b73;
            line-height: 1.6;
            font-size: 1rem;
          }
        `}</style>
        
        <button class="back-button" onClick={goBack}>
          <ArrowLeftIcon class="back-icon" />
        </button>
        
        <div class="coming-soon-card">
          <UserGroupIcon class="icon" />
          <h1 class="title">Connect</h1>
          <h2 class="subtitle">Coming Soon</h2>
          <p class="message">Connect with like-minded spiritual seekers in our community. Building connections that matter!</p>
        </div>
      </div>
    );
  }
};