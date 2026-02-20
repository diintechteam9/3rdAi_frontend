import { ref } from 'vue';
import { useRouter } from 'vue-router';
import {
  StarIcon,
  HeartIcon,
  UserGroupIcon,
  ShoppingBagIcon,
  ArrowRightIcon
} from '@heroicons/vue/24/outline';

export default {
  name: 'ClientServices',
  setup() {
    const router = useRouter();

    const services = [
      // { 
      //   id: 2, 
      //   name: 'Healing', 
      //   icon: HeartIcon, 
      //   description: 'Spiritual healing sessions and wellness treatments', 
      //   route: '/client/healing',
      //   color: '#10b981',
      //   category: 'Wellness'
      // },
      // { 
      //   id: 3, 
      //   name: 'Yoga', 
      //   icon: UserGroupIcon, 
      //   description: 'Yoga classes, meditation sessions and mindfulness training', 
      //   route: '/client/yoga',
      //   color: '#06b6d4',
      //   category: 'Fitness'
      // },
      {
        id: 4,
        name: 'Brahma Bazar',
        icon: ShoppingBagIcon,
        description: 'Spiritual products, books, and sacred items marketplace',
        route: '/client/brahma-bazar',
        color: '#f59e0b',
        category: 'Shopping'
      }
    ];

    const handleCardClick = (route) => {
      router.push(route);
    };

    const getCategoryBadgeColor = (category) => {
      const colors = {
        'Spiritual': 'bg-primary',
        'Wellness': 'bg-success',
        'Fitness': 'bg-info',
        'Shopping': 'bg-warning'
      };
      return colors[category] || 'bg-secondary';
    };

    return () => (
      <div class="container-fluid px-4">
        <style>{`
          .service-card {
            cursor: pointer;
            transition: all 0.3s ease;
            border-radius: 16px;
          }
          .service-card:hover {
            transform: translateY(-8px) scale(1.02);
            box-shadow: 0 20px 40px rgba(0,0,0,0.15) !important;
          }
          .service-icon {
            transition: all 0.3s ease;
          }
          .service-card:hover .service-icon {
            transform: rotate(10deg) scale(1.1);
          }
          .arrow-btn {
            transition: all 0.3s ease;
          }
          .service-card:hover .arrow-btn {
            transform: scale(1.2);
            background-color: var(--service-color) !important;
            color: white !important;
          }
          .hover-overlay {
            opacity: 0;
            transition: opacity 0.3s ease;
          }
          .service-card:hover .hover-overlay {
            opacity: 1;
          }
        `}</style>
        <div class="row">
          <div class="col-12">
            {/* Header Section */}
            <div class="mb-5">
              <div class="d-flex align-items-center justify-content-between mb-3">
                <div>
                  <h1 class="display-5 fw-bold text-dark mb-2">Services</h1>
                  <p class="lead text-muted mb-0">Explore our spiritual and wellness services for your journey</p>
                </div>
                <div class="text-end">
                  <div class="badge bg-light text-dark px-3 py-2 fs-6">
                    Services
                  </div>
                </div>
              </div>
              <hr class="border-2 opacity-25" />
            </div>

            {/* Services Grid */}
            <div class="row g-4">
              {services.map(service => (
                <div key={service.id} class="col-xl-4 col-lg-6 col-md-6 col-sm-12">
                  <div
                    class="service-card card h-100 border-0 shadow-sm position-relative overflow-hidden"
                    style={{
                      '--service-color': service.color,
                      background: `linear-gradient(135deg, ${service.color}08 0%, ${service.color}15 30%, #f8fafc 100%)`
                    }}
                    onClick={() => handleCardClick(service.route)}
                  >
                    {/* Category Badge */}
                    <div class="position-absolute top-0 end-0 m-3">
                      <span class={`badge ${getCategoryBadgeColor(service.category)} px-2 py-1`}>
                        {service.category}
                      </span>
                    </div>

                    <div class="card-body p-4">
                      {/* Icon */}
                      <div class="mb-4">
                        <div
                          class="service-icon d-inline-flex align-items-center justify-content-center rounded-3"
                          style={{
                            width: '72px',
                            height: '72px',
                            backgroundColor: `${service.color}15`,
                            border: `2px solid ${service.color}25`
                          }}
                        >
                          <service.icon
                            style={{
                              width: '2rem',
                              height: '2rem',
                              color: service.color
                            }}
                          />
                        </div>
                      </div>

                      {/* Content */}
                      <div class="mb-4">
                        <h5 class="card-title fw-bold mb-2 text-dark">{service.name}</h5>
                        <p class="card-text text-muted mb-0 lh-base" style={{ fontSize: '0.95rem' }}>
                          {service.description}
                        </p>
                      </div>

                      {/* Action Button */}
                      <div class="d-flex align-items-center justify-content-between">
                        <div class="d-flex align-items-center text-muted" style={{ fontSize: '0.85rem' }}>
                          <span>Click to explore</span>
                        </div>
                        <div
                          class="arrow-btn d-flex align-items-center justify-content-center rounded-circle"
                          style={{
                            width: '40px',
                            height: '40px',
                            backgroundColor: `${service.color}10`,
                            color: service.color
                          }}
                        >
                          <ArrowRightIcon style={{ width: '1.25rem', height: '1.25rem' }} />
                        </div>
                      </div>
                    </div>

                    {/* Hover Effect Overlay */}
                    <div
                      class="hover-overlay position-absolute top-0 start-0 w-100 h-100"
                      style={{
                        background: `linear-gradient(135deg, ${service.color}15 0%, ${service.color}25 100%)`,
                        pointerEvents: 'none',
                        borderRadius: '16px'
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer Info */}
            <div class="mt-5 pt-4 border-top">
              <div class="row align-items-center">
                <div class="col-md-8">
                  <p class="text-muted mb-0">
                    <strong>Need guidance?</strong> Contact our spiritual advisors for personalized service recommendations.
                  </p>
                </div>
                <div class="col-md-4 text-md-end">
                  <small class="text-muted">Last updated: {new Date().toLocaleDateString()}</small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
};
