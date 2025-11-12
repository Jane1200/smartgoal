export default function About() {
  return (
    <div className="about-page">
      {/* Hero Section */}
      <section className="about-hero">
        <div className="container-xxl">
          <div className="about-hero-content text-center">
            <div className="about-hero-badge">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2">
                <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
              </svg>
              <span>Your trusted goal partner</span>
            </div>
            <h1 className="about-hero-title">
              About <span className="about-hero-highlight">SmartGoal</span>
            </h1>
            <p className="about-hero-description">
              Transforming dreams into achievable goals through smart planning and sustainable resale
            </p>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="about-mission">
        <div className="container-xxl">
          <div className="about-section-header text-center">
            <h2 className="about-section-title">Our Mission</h2>
            <p className="about-section-subtitle">
              Empowering people to turn their dreams into reality
            </p>
          </div>
          
          <div className="row align-items-center">
            <div className="col-lg-6">
              <div className="about-mission-content">
                <p className="about-mission-text">
                  At SmartGoal, we believe that every dream deserves a clear path to reality. 
                  We're revolutionizing how people plan, save, and achieve their financial goals 
                  by combining intelligent goal-setting tools with sustainable resale solutions.
                </p>
                <p className="about-mission-text">
                  Our platform empowers users to transform unused items into cash while providing 
                  AI-driven insights to make goal achievement faster, smarter, and more sustainable.
                </p>
              </div>
            </div>
            <div className="col-lg-6">
              <div className="about-mission-visual">
                <div className="about-image-container">
                  <img
                    src="https://images.unsplash.com/photo-1559136555-9303baea8ebd?q=80&w=1200&auto=format&fit=crop"
                    alt="Smart Goal Planning"
                    className="about-image"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="about-values">
        <div className="container-xxl">
          <div className="about-section-header text-center">
            <h2 className="about-section-title">Our Values</h2>
            <p className="about-section-subtitle">
              The principles that guide everything we do
            </p>
          </div>
          
          <div className="about-values-grid">
            <div className="about-value-card">
              <div className="about-value-icon">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
              </div>
              <h3 className="about-value-title">Excellence</h3>
              <p className="about-value-description">
                We strive for excellence in every feature, ensuring our platform delivers 
                the best possible experience for goal achievement.
              </p>
            </div>
            
            <div className="about-value-card">
              <div className="about-value-icon">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                </svg>
              </div>
              <h3 className="about-value-title">Innovation</h3>
              <p className="about-value-description">
                We leverage cutting-edge AI and technology to provide intelligent insights 
                that make goal planning smarter and more effective.
              </p>
            </div>
            
            <div className="about-value-card">
              <div className="about-value-icon">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              </div>
              <h3 className="about-value-title">Community</h3>
              <p className="about-value-description">
                We foster a supportive community where users can share experiences, 
                learn from each other, and achieve their goals together.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Story Section */}
      <section className="about-story">
        <div className="container-xxl">
          <div className="row align-items-center">
            <div className="col-lg-6">
              <div className="about-story-visual">
                <div className="about-image-container">
                  <img
                    src="https://images.unsplash.com/photo-1553877522-43269d4ea984?q=80&w=1200&auto=format&fit=crop"
                    alt="Our Story"
                    className="about-image"
                  />
                </div>
              </div>
            </div>
            <div className="col-lg-6">
              <div className="about-story-content">
                <h2 className="about-section-title">Our Story</h2>
                <p className="about-story-text">
                  SmartGoal was born from a simple observation: people have dreams, but many struggle 
                  to turn them into reality due to unclear planning and financial constraints.
                </p>
                <p className="about-story-text">
                  We noticed that while people had unused items worth money, they lacked a convenient 
                  way to convert these into goal funding. At the same time, goal-setting apps existed 
                  but lacked the practical tools to accelerate achievement.
                </p>
                <p className="about-story-text">
                  That's when we decided to bridge this gap by creating a comprehensive platform that 
                  combines smart goal planning with sustainable resale solutions, making dreams more 
                  achievable than ever before.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Impact Section */}
      <section className="about-impact">
        <div className="container-xxl">
          <div className="about-section-header text-center">
            <h2 className="about-section-title">Our Impact</h2>
            <p className="about-section-subtitle">
              Numbers that tell our story of success
            </p>
          </div>
          
          <div className="about-stats-grid">
            <div className="about-stat-card">
              <div className="about-stat-number">8,213+</div>
              <div className="about-stat-label">Goals Planned</div>
            </div>
            <div className="about-stat-card">
              <div className="about-stat-number">₹19.6L+</div>
              <div className="about-stat-label">Earnings Generated</div>
            </div>
            <div className="about-stat-card">
              <div className="about-stat-number">4.8★</div>
              <div className="about-stat-label">User Rating</div>
            </div>
            <div className="about-stat-card">
              <div className="about-stat-number">2,500+</div>
              <div className="about-stat-label">Items Sold</div>
            </div>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="about-team">
        <div className="container-xxl">
          <div className="about-section-header text-center">
            <h2 className="about-section-title">Our Team</h2>
            <p className="about-section-subtitle">
              Passionate individuals working to make your dreams achievable
            </p>
          </div>
          
          <div className="about-team-content text-center">
            <p className="about-team-description">
              Our diverse team of developers, designers, and financial experts is united by 
              a common vision: to democratize goal achievement through technology. We combine 
              technical expertise with deep understanding of user needs to create solutions 
              that truly make a difference.
            </p>
            <div className="about-team-skills">
              <div className="about-skill-tag">User-Centric Design</div>
              <div className="about-skill-tag">Financial Expertise</div>
              <div className="about-skill-tag">Sustainable Innovation</div>
              <div className="about-skill-tag">Community Focus</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="about-cta">
        <div className="container-xxl">
          <div className="about-cta-content text-center">
            <h2 className="about-cta-title">Ready to Start Your Journey?</h2>
            <p className="about-cta-description">
              Join thousands of users who are already achieving their goals with SmartGoal
            </p>
            <div className="about-cta-actions">
              <a href="/register" className="about-cta-btn about-cta-btn-primary">Get Started Free</a>
              <a href="/" className="about-cta-btn about-cta-btn-outline">Learn More</a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
