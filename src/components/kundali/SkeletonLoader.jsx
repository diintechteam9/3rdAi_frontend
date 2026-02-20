// frontend/src/components/kundali/SkeletonLoader.jsx

export default {
  name: 'SkeletonLoader',
  setup() {
    return () => (
      <div class="skeleton-loader">
        <div class="card border-0 shadow-sm mb-4">
          <div class="card-body p-0">
            <div class="d-flex">
              {Array.from({length: 4}, (_, i) => (
                <div key={i} class="flex-fill p-3 text-center">
                  <div class="skeleton skeleton-icon mx-auto mb-2"></div>
                  <div class="skeleton skeleton-text"></div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div class="card border-0 shadow-sm">
          <div class="card-header">
            <div class="skeleton skeleton-title"></div>
          </div>
          <div class="card-body">
            <div class="row">
              <div class="col-lg-6">
                {Array.from({length: 5}, (_, i) => (
                  <div key={i} class="d-flex justify-content-between mb-3">
                    <div class="skeleton skeleton-label"></div>
                    <div class="skeleton skeleton-value"></div>
                  </div>
                ))}
              </div>
              <div class="col-lg-6">
                {Array.from({length: 5}, (_, i) => (
                  <div key={i} class="d-flex justify-content-between mb-3">
                    <div class="skeleton skeleton-label"></div>
                    <div class="skeleton skeleton-value"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <style jsx>{`
          .skeleton {
            background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
            background-size: 200% 100%;
            animation: loading 1.5s infinite;
            border-radius: 4px;
          }
          
          .skeleton-icon {
            width: 24px;
            height: 24px;
            border-radius: 50%;
          }
          
          .skeleton-text {
            height: 16px;
            width: 80px;
          }
          
          .skeleton-title {
            height: 24px;
            width: 200px;
          }
          
          .skeleton-label {
            height: 16px;
            width: 100px;
          }
          
          .skeleton-value {
            height: 16px;
            width: 80px;
          }
          
          @keyframes loading {
            0% {
              background-position: 200% 0;
            }
            100% {
              background-position: -200% 0;
            }
          }
        `}</style>
      </div>
    );
  }
};