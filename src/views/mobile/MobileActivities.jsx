export default {
  name: 'MobileActivities',
  setup() {
    return () => (
      <div class="mobile-activities">
        <div class="activities-header">
          <h1>Spiritual Check-In</h1>
          <p>Track your spiritual activities and progress</p>
        </div>
        
        <style>{`
          .mobile-activities {
            padding: 1rem;
            min-height: 100vh;
            background: #f8fafc;
          }
          
          .activities-header {
            text-align: center;
            margin-bottom: 2rem;
          }
          
          .activities-header h1 {
            font-size: 2rem;
            font-weight: 700;
            color: #1e293b;
            margin-bottom: 0.5rem;
          }
          
          .activities-header p {
            font-size: 1rem;
            color: #64748b;
            margin: 0;
          }
          
          @media (max-width: 768px) {
            .mobile-activities {
              padding: 0.75rem;
            }
            
            .activities-header h1 {
              font-size: 1.75rem;
            }
            
            .activities-header p {
              font-size: 0.9rem;
            }
          }
          
          @media (max-width: 480px) {
            .mobile-activities {
              padding: 0.5rem;
            }
            
            .activities-header h1 {
              font-size: 1.5rem;
            }
            
            .activities-header p {
              font-size: 0.85rem;
            }
          }
        `}</style>
      </div>
    );
  }
};