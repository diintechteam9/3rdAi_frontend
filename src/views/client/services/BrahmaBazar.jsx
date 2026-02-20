import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { 
  ShoppingBagIcon,
  BookOpenIcon,
  SparklesIcon,
  GiftIcon,
  HeartIcon,
  StarIcon,
  ArrowLeftIcon
} from '@heroicons/vue/24/outline';

export default {
  name: 'BrahmaBazar',
  setup() {
    const router = useRouter();
    
    const categories = [
      {
        id: 1,
        name: 'Sacred Books',
        icon: BookOpenIcon,
        description: 'Ancient scriptures, spiritual guides, and wisdom literature',
        itemCount: 150,
        color: '#8b5cf6'
      },
      {
        id: 2,
        name: 'Spiritual Items',
        icon: SparklesIcon,
        description: 'Crystals, malas, incense, and meditation accessories',
        itemCount: 200,
        color: '#10b981'
      },
      {
        id: 3,
        name: 'Sacred Gifts',
        icon: GiftIcon,
        description: 'Blessed items, ritual sets, and spiritual gift collections',
        itemCount: 75,
        color: '#f59e0b'
      },
      {
        id: 4,
        name: 'Wellness Products',
        icon: HeartIcon,
        description: 'Ayurvedic products, herbal remedies, and health supplements',
        itemCount: 120,
        color: '#ef4444'
      }
    ];

    const featuredProducts = [
      {
        id: 1,
        name: 'Bhagavad Gita (Premium Edition)',
        price: '₹999',
        rating: 4.8,
        image: '/api/placeholder/200/200',
        category: 'Sacred Books'
      },
      {
        id: 2,
        name: 'Crystal Meditation Set',
        price: '₹1,499',
        rating: 4.9,
        image: '/api/placeholder/200/200',
        category: 'Spiritual Items'
      },
      {
        id: 3,
        name: 'Rudraksha Mala (108 Beads)',
        price: '₹799',
        rating: 4.7,
        image: '/api/placeholder/200/200',
        category: 'Spiritual Items'
      },
      {
        id: 4,
        name: 'Ayurvedic Wellness Kit',
        price: '₹2,299',
        rating: 4.6,
        image: '/api/placeholder/200/200',
        category: 'Wellness Products'
      }
    ];

    return () => (
      <div class="container-fluid px-4">
        <style>{`
          .category-card {
            cursor: pointer;
            transition: all 0.3s ease;
            border-radius: 16px;
          }
          .category-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 15px 35px rgba(0,0,0,0.1) !important;
          }
          .product-card {
            cursor: pointer;
            transition: all 0.3s ease;
            border-radius: 12px;
          }
          .product-card:hover {
            transform: translateY(-3px);
            box-shadow: 0 10px 25px rgba(0,0,0,0.1) !important;
          }
          .category-icon {
            transition: all 0.3s ease;
          }
          .category-card:hover .category-icon {
            transform: scale(1.1);
          }
        `}</style>

        {/* Header Section */}
        <div class="mb-5">
          <div class="d-flex align-items-center justify-content-between mb-3">
            <div class="d-flex align-items-center">
              <button 
                class="btn btn-outline-secondary me-3"
                onClick={() => router.back()}
              >
                <ArrowLeftIcon style={{ width: '1.25rem', height: '1.25rem' }} />
              </button>
              <div>
                <h1 class="display-5 fw-bold text-dark mb-2">
                  <ShoppingBagIcon class="me-3" style={{ width: '2.5rem', height: '2.5rem', color: '#f59e0b' }} />
                  Brahma Bazar
                </h1>
                <p class="lead text-muted mb-0">Spiritual products, books, and sacred items marketplace</p>
              </div>
            </div>
            <div class="text-end">
              <div class="badge bg-warning text-dark px-3 py-2 fs-6">
                Shopping
              </div>
            </div>
          </div>
          <hr class="border-2 opacity-25" />
        </div>

        {/* Categories Section */}
        <div class="mb-5">
          <h3 class="fw-bold mb-4">Shop by Category</h3>
          <div class="row g-4">
            {categories.map(category => (
              <div key={category.id} class="col-xl-3 col-lg-4 col-md-6 col-sm-12">
                <div 
                  class="category-card card h-100 border-0 shadow-sm"
                  style={{ 
                    background: `linear-gradient(135deg, ${category.color}08 0%, ${category.color}15 30%, #f8fafc 100%)`
                  }}
                >
                  <div class="card-body p-4 text-center">
                    <div class="mb-3">
                      <div 
                        class="category-icon d-inline-flex align-items-center justify-content-center rounded-3 mx-auto"
                        style={{ 
                          width: '60px', 
                          height: '60px',
                          backgroundColor: `${category.color}15`,
                          border: `2px solid ${category.color}25`
                        }}
                      >
                        <category.icon 
                          style={{ 
                            width: '1.75rem', 
                            height: '1.75rem',
                            color: category.color
                          }} 
                        />
                      </div>
                    </div>
                    <h5 class="card-title fw-bold mb-2">{category.name}</h5>
                    <p class="card-text text-muted mb-3" style={{ fontSize: '0.9rem' }}>
                      {category.description}
                    </p>
                    <div class="badge bg-light text-dark">
                      {category.itemCount} Items
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Featured Products Section */}
        <div class="mb-5">
          <div class="d-flex align-items-center justify-content-between mb-4">
            <h3 class="fw-bold mb-0">Featured Products</h3>
            <button class="btn btn-outline-warning">View All Products</button>
          </div>
          <div class="row g-4">
            {featuredProducts.map(product => (
              <div key={product.id} class="col-xl-3 col-lg-4 col-md-6 col-sm-12">
                <div class="product-card card h-100 border-0 shadow-sm">
                  <div class="position-relative">
                    <img 
                      src={product.image} 
                      class="card-img-top" 
                      alt={product.name}
                      style={{ height: '200px', objectFit: 'cover' }}
                    />
                    <div class="position-absolute top-0 end-0 m-2">
                      <span class="badge bg-warning text-dark">
                        <StarIcon style={{ width: '0.8rem', height: '0.8rem' }} class="me-1" />
                        {product.rating}
                      </span>
                    </div>
                  </div>
                  <div class="card-body p-3">
                    <div class="mb-2">
                      <small class="text-muted">{product.category}</small>
                    </div>
                    <h6 class="card-title fw-bold mb-2">{product.name}</h6>
                    <div class="d-flex align-items-center justify-content-between">
                      <span class="h5 text-warning fw-bold mb-0">{product.price}</span>
                      <button class="btn btn-sm btn-warning">Add to Cart</button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Info Section */}
        <div class="row g-4 mb-5">
          <div class="col-md-4">
            <div class="card border-0 bg-light h-100">
              <div class="card-body p-4 text-center">
                <ShoppingBagIcon class="mb-3" style={{ width: '2rem', height: '2rem', color: '#f59e0b' }} />
                <h5 class="fw-bold">Free Shipping</h5>
                <p class="text-muted mb-0">On orders above ₹999</p>
              </div>
            </div>
          </div>
          <div class="col-md-4">
            <div class="card border-0 bg-light h-100">
              <div class="card-body p-4 text-center">
                <HeartIcon class="mb-3" style={{ width: '2rem', height: '2rem', color: '#f59e0b' }} />
                <h5 class="fw-bold">Blessed Items</h5>
                <p class="text-muted mb-0">All products are spiritually blessed</p>
              </div>
            </div>
          </div>
          <div class="col-md-4">
            <div class="card border-0 bg-light h-100">
              <div class="card-body p-4 text-center">
                <StarIcon class="mb-3" style={{ width: '2rem', height: '2rem', color: '#f59e0b' }} />
                <h5 class="fw-bold">Quality Assured</h5>
                <p class="text-muted mb-0">Authentic spiritual products only</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Info */}
        <div class="mt-5 pt-4 border-top">
          <div class="row align-items-center">
            <div class="col-md-8">
              <p class="text-muted mb-0">
                <strong>Need help choosing?</strong> Contact our spiritual advisors for product recommendations.
              </p>
            </div>
            <div class="col-md-4 text-md-end">
              <small class="text-muted">Secure payments • Fast delivery</small>
            </div>
          </div>
        </div>
      </div>
    );
  }
};