import { HomeIcon, ArrowLeftIcon, SparklesIcon, ChevronRightIcon } from '@heroicons/vue/24/outline';
import { useRouter } from 'vue-router';

export default {
  name: 'Home',
  setup() {
    const router = useRouter();
    
    const goBack = () => {
      router.back();
    };
    
    const goToSankalpas = () => {
      router.push('/mobile/user/sankalpas');
    };
    
    return () => (
      <div class="page-container">
        <style>{`
          .page-container {
            min-height: 100vh;
            background: linear-gradient(135deg, #f5f1eb 0%, #ede7d9 100%);
            padding: 1rem;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          }
          
          .header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 1rem 0;
            margin-bottom: 1.5rem;
          }
          
          .back-button {
            background: rgba(255,255,255,0.9);
            border: none;
            border-radius: 12px;
            padding: 0.75rem;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
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
          
          .page-title {
            font-size: 1.75rem;
            font-weight: 800;
            color: #2d3748;
          }
          
          .cards-grid {
            display: grid;
            gap: 1rem;
          }
          
          .feature-card {
            background: linear-gradient(135deg, #9333ea 0%, #7c3aed 100%);
            border-radius: 20px;
            padding: 1.5rem;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 8px 24px rgba(147, 51, 234, 0.3);
            position: relative;
            overflow: hidden;
          }
          
          .feature-card::before {
            content: '';
            position: absolute;
            top: 0;
            right: 0;
            width: 150px;
            height: 150px;
            background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
            border-radius: 50%;
            transform: translate(30%, -30%);
          }
          
          .feature-card:active {
            transform: scale(0.98);
          }
          
          .card-content {
            position: relative;
            z-index: 1;
          }
          
          .card-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 1rem;
          }
          
          .card-icon-wrapper {
            background: rgba(255,255,255,0.2);
            border-radius: 12px;
            padding: 0.75rem;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          
          .card-icon {
            width: 2rem;
            height: 2rem;
            color: white;
          }
          
          .chevron-icon {
            width: 1.5rem;
            height: 1.5rem;
            color: rgba(255,255,255,0.8);
          }
          
          .card-title {
            font-size: 1.5rem;
            font-weight: 700;
            color: white;
            margin-bottom: 0.5rem;
          }
          
          .card-description {
            color: rgba(255,255,255,0.9);
            line-height: 1.5;
            font-size: 0.95rem;
          }
          
          .card-badge {
            display: inline-block;
            background: rgba(255,255,255,0.2);
            color: white;
            padding: 0.25rem 0.75rem;
            border-radius: 12px;
            font-size: 0.75rem;
            font-weight: 600;
            margin-top: 0.75rem;
          }
        `}</style>
        
        <div class="header">
          <button class="back-button" onClick={goBack}>
            <ArrowLeftIcon class="back-icon" />
          </button>
          <h1 class="page-title">Home</h1>
          <div style="width: 3rem;"></div>
        </div>
        
        <div class="cards-grid">
          {/* Sankalpas Card */}
          <div class="feature-card" onClick={goToSankalpas}>
            <div class="card-content">
              <div class="card-header">
                <div class="card-icon-wrapper">
                  <SparklesIcon class="card-icon" />
                </div>
                <ChevronRightIcon class="chevron-icon" />
              </div>
              <h2 class="card-title">🙏 संकल्प (Sankalpas)</h2>
              <p class="card-description">
                Take spiritual resolutions and track your daily progress. Earn karma points by completing your sankalpas.
              </p>
              <span class="card-badge">Start Your Journey</span>
            </div>
          </div>
        </div>
      </div>
    );
  }
};