import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext.jsx";
import GoalPlannerCalc from "../../sections/GoalPlannerCalc.jsx";
import MarketplacePreview from "../../sections/MarketplacePreview.jsx";
import InspirationShowcase from "../../sections/InspirationShowcase.jsx";

// Animated number that counts up when `start` becomes true
function AnimatedNumber({ end, duration = 1500, decimals = 0, prefix = "", suffix = "", start = false, formatter }) {
  const [value, setValue] = useState(0);
  const rafRef = useRef(null);

  useEffect(() => {
    if (!start) return;

    let startTime = null;
    const startValue = 0;
    const diff = end - startValue;

    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const current = startValue + diff * progress;
      setValue(current);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step);
      }
    };

    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [start, end, duration]);

  const display = (() => {
    const rounded = Number(value.toFixed(decimals));
    const base = formatter ? formatter(rounded) : rounded.toFixed(decimals);
    return `${prefix}${base}${suffix}`;
  })();

  return <span>{display}</span>;
}

export default function Home() {
  const statsRef = useRef(null);
  const [statsInView, setStatsInView] = useState(false);
  const authContext = useAuth();
  const isAuthenticated = !!authContext?.user;

  // Trigger stats animation when the stats container becomes visible
  useEffect(() => {
    const el = statsRef.current;
    if (!el || statsInView) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setStatsInView(true);
            observer.disconnect();
          }
        });
      },
      { threshold: 0.35 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [statsInView]);

  return (
    <div className="home-page">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="container-xxl">
          <div className="hero-content">
            <div className="hero-text">
              <div className="hero-badge">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2">
                  <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
                </svg>
                <span>Loved by smart savers</span>
              </div>
              
              <h1 className="hero-title">
                From unused to unstoppable – 
                <span className="highlight"> fund your goals with ease.</span>
              </h1>
              
              <p className="hero-description">
                Plan goals, track savings, and turn unused items into cash via local resale. 
                Transform your dreams into achievable milestones with our smart goal-setting platform.
              </p>
              
              <div className="hero-actions">
                <a href="/register" className="btn btn-primary btn-lg">
                  <span>Start a Goal</span>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </a>
                <a href="/marketplace" className="btn btn-outline btn-lg">
                  Explore Marketplace
                </a>
              </div>

              {/* Social Proof Stats */}
              <div ref={statsRef} className="hero-stats">
                <div className="stat-item">
                  <div className="stat-number">
                    <AnimatedNumber
                      end={8213}
                      duration={1400}
                      decimals={0}
                      start={statsInView}
                      formatter={(v) => v.toLocaleString()}
                    />
                  </div>
                  <div className="stat-label">goals planned</div>
                </div>
                <div className="stat-item">
                  <div className="stat-number">
                    <AnimatedNumber
                      end={19.6}
                      duration={1500}
                      decimals={1}
                      prefix="₹"
                      suffix="L"
                      start={statsInView}
                    />
                  </div>
                  <div className="stat-label">resale earnings</div>
                </div>
                <div className="stat-item">
                  <div className="stat-number">
                    <AnimatedNumber
                      end={4.8}
                      duration={1300}
                      decimals={1}
                      suffix="★"
                      start={statsInView}
                    />
                  </div>
                  <div className="stat-label">user rating</div>
                </div>
              </div>
            </div>

            <div className="hero-visual">
              <div className="hero-image-container">
                <img
                  src="https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=1400&auto=format&fit=crop"
                  alt="Smart Goal Planning"
                  className="hero-image"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="container-xxl">
          <div className="section-header text-center">
            <h2 className="section-title">Why Choose SmartGoal?</h2>
            <p className="section-subtitle">
              Everything you need to turn your dreams into reality
            </p>
          </div>
          
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </div>
              <h3 className="feature-title">Smart Planning</h3>
              <p className="feature-description">
                AI-powered goal planning that adapts to your lifestyle and financial situation
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                </svg>
              </div>
              <h3 className="feature-title">Progress Tracking</h3>
              <p className="feature-description">
                Visual progress tracking with milestones and achievements to keep you motivated
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
              </div>
              <h3 className="feature-title">Resale Platform</h3>
              <p className="feature-description">
                Turn unused items into cash with our local marketplace and fund your goals faster
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Inspiration Section */}
      <section className="inspiration-section">
        <div className="container-xxl">
          <div className="section-header text-center">
            <h2 className="section-title">Goal Inspiration</h2>
            <p className="section-subtitle">Fresh ideas to spark your next goal</p>
          </div>
          <div className="inspiration-content">
            <InspirationShowcase />
          </div>
        </div>
      </section>

      {/* Planner Section */}
      <section className="tools-section">
        <div className="container-xxl">
          <div className="section-header text-center">
            <h2 className="section-title">Powerful Tools</h2>
            <p className="section-subtitle">
              Plan smarter, track better, achieve faster
            </p>
          </div>
          
          <div className="tools-grid">
            <div className="tool-card">
              <GoalPlannerCalc />
            </div>
          </div>
        </div>
      </section>

      {/* Marketplace Section */}
      <section className="marketplace-section">
        <div className="container-xxl">
          <div className="section-header">
            <div className="header-content">
              <h2 className="section-title">Featured Items</h2>
              <p className="section-subtitle">
                Discover great deals to fund your goals
              </p>
            </div>
            {isAuthenticated && (
              <a href="/marketplace" className="btn btn-outline">
                View All Items
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </a>
            )}
          </div>
          
          <div className="marketplace-content">
            {isAuthenticated ? (
              <MarketplacePreview />
            ) : (
              <div className="row g-3">
                <div className="col-12">
                  <div className="card border-0 bg-light">
                    <div className="card-body text-center py-5">
                      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted mb-3">
                        <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z"/>
                        <path d="M12 6v6l4 2"/>
                      </svg>
                      <h5 className="text-muted mt-3 mb-2">Sign in to view your nearby listings</h5>
                      <p className="text-muted mb-4">
                        Browse featured items, discover deals, and connect with local sellers after you sign in.
                      </p>
                      <div className="d-flex gap-2 justify-content-center">
                        <a href="/login" className="btn btn-primary">
                          Sign In
                        </a>
                        <a href="/register" className="btn btn-outline-primary">
                          Create Account
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="container-xxl">
          <div className="cta-content text-center">
            <h2 className="cta-title">Ready to Start Your Journey?</h2>
            <p className="cta-description">
              Join thousands of users who are already achieving their goals with SmartGoal
            </p>
            <div className="cta-actions">
              <a href="/register" className="btn btn-primary btn-lg">Get Started Free</a>
              <a href="/demo" className="btn btn-outline btn-lg">Watch Demo</a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
