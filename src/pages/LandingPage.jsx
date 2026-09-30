import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Coffee,
  Sparkles,
  Clock,
  Award,
  Leaf,
  HeartHandshake,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
  ShoppingBag,
  Package,
  Search,
} from 'lucide-react';

/* ── Intersection-Observer scroll-reveal hook ── */
function useScrollReveal(selector = '.reveal') {
  useEffect(() => {
    const els = document.querySelectorAll(selector);
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [selector]);
}

export default function LandingPage() {
  useScrollReveal('.reveal');

  const highlights = [
    {
      icon: Coffee,
      title: 'Artisanal Single-Origin Beans',
      desc: 'Ethically sourced green coffee beans freshly roasted weekly in small batches to preserve nuanced aromas.',
    },
    {
      icon: Leaf,
      title: 'Organic & Local Ingredients',
      desc: 'Dairy, artisanal syrups, and fresh pastries produced daily in collaboration with regional farmers.',
    },
    {
      icon: Award,
      title: 'Certified Baristas',
      desc: 'Every extraction calibrated by temperature and yield to deliver the cleanest flavor balance in every pour.',
    },
    {
      icon: Sparkles,
      title: 'Calm Architectural Space',
      desc: 'Minimalist wood and natural stone interiors crafted specifically for focus, slow mornings, and quiet reading.',
    },
    {
      icon: HeartHandshake,
      title: 'Sustainable Packaging',
      desc: 'All takeaway cups, lids, and packaging items are fully biodegradable and compostable.',
    },
    {
      icon: ShieldCheck,
      title: 'Quality Guarantee',
      desc: 'If your cup is not tuned to perfection, our baristas will gladly adjust and re-craft it for you on the spot.',
    },
  ];

  const operatingHours = [
    { days: 'Monday – Tuesday', hours: '10:00 AM – 07:30 PM' },
    { days: 'Wednesday', hours: 'Closed' },
    { days: 'Thursday – Sunday', hours: '10:00 AM – 07:30 PM' },
  ];

  return (
    <div className="landing-page">
      {/* ─── Hero Section ───────────────────────────────────── */}
      <section className="hero">
        <div className="hero-bg-shape hero-bg-shape-1" />
        <div className="hero-bg-shape hero-bg-shape-2" />
        <div className="hero-bg-shape hero-bg-shape-3" />

        <div className="hero-inner">
          {/* Left: Text content */}
          <div className="hero-text-col">
            <div className="hero-eyebrow hero-anim-fade-up" style={{ animationDelay: '0.1s' }}>
              <span className="hero-eyebrow-dot" />
              <span>Modern Roastery &amp; Cafe</span>
            </div>

            <h1 className="hero-title hero-anim-fade-up" style={{ animationDelay: '0.22s' }}>
              Crafted Coffee, <br />
              <span>Timeless Calm.</span>
            </h1>

            <p className="hero-sub hero-anim-fade-up" style={{ animationDelay: '0.34s' }}>
              Gian&apos;s Food House is an intimate neighborhood space dedicated to meticulous brewing, warm hospitality, and pure culinary craft.
            </p>

            <div className="hero-cta-group hero-anim-fade-up" style={{ animationDelay: '0.46s' }}>
              <Link to="/menu" className="btn-primary" id="hero-explore-menu-btn">
                <span>Explore Full Menu</span>
                <ArrowRight size={18} />
              </Link>

              <Link to="/menu" className="btn-primary hero-order-btn" id="hero-order-online-btn">
                <ShoppingBag size={18} />
                <span>Order Online</span>
              </Link>
            </div>
          </div>

          {/* Right: Circular logo with glow ring */}
          <div className="hero-image-wrap hero-anim-fade-left" style={{ animationDelay: '0.3s' }}>
            <div className="hero-logo-ring">
              <div className="hero-logo-ring-inner">
                <img
                  src="/gians.png"
                  alt="Gian's Food House"
                  className="hero-logo-img"
                />
              </div>
            </div>
            {/* Orbiting dot decorations */}
            <span className="hero-orbit hero-orbit-1" />
            <span className="hero-orbit hero-orbit-2" />
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="hero-scroll-indicator">
          <span className="hero-scroll-line" />
        </div>
      </section>

      {/* ─── Highlights Section ─────────────────────────────── */}
      <section className="section" id="highlights" style={{ backgroundColor: '#FAF7F2' }}>
        <div className="section-inner">
          <div className="reveal" style={{ textAlign: 'center', maxWidth: '640px', margin: '0 auto' }}>
            <div className="section-label">Highlights</div>
            <h2 className="section-title">What Defines Gian&apos;s</h2>
            <p className="section-sub" style={{ margin: '0 auto' }}>
              We set high standards across every detail of our sourcing, preparation, and customer care.
            </p>
          </div>

          <div className="highlights-grid">
            {highlights.map((item, index) => {
              const Icon = item.icon;
              return (
                <div
                  key={index}
                  className="highlight-card reveal"
                  style={{ animationDelay: `${0.08 * index}s` }}
                >
                  <div className="highlight-icon">
                    <Icon size={22} />
                  </div>
                  <div className="highlight-title">{item.title}</div>
                  <div className="highlight-desc">{item.desc}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── Hours & Location Section ───────────────────────── */}
      <section className="section">
        <div className="section-inner">
          <div className="hours-section reveal">
            <div className="hours-grid">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: 0.85, marginBottom: '12px', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  <Clock size={16} />
                  <span>Cafe Schedule</span>
                </div>
                <h2 className="hours-title">Hours of Warmth &amp; Welcome</h2>
                <div className="hours-list">
                  {operatingHours.map((row, idx) => (
                    <div key={idx} className="hours-row">
                      <span className="hours-day">{row.days}</span>
                      <span className="hours-time">{row.hours}</span>
                    </div>
                  ))}
                </div>
                <p className="hours-note">
                  Holiday hours may differ slightly. Follow our social channels for festive schedule updates.
                </p>
              </div>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '16px',
                  padding: '32px',
                  maxWidth: '340px',
                }}
              >
                <h3 className="font-serif" style={{ fontSize: '1.4rem', marginBottom: '12px', color: '#fff' }}>
                  Browse our Digital Menu
                </h3>
                <p style={{ fontSize: '0.875rem', opacity: 0.85, lineHeight: 1.6, marginBottom: '20px' }}>
                  Explore all current roast variations, seasonal cold brews, and freshly prepared bites in real-time.
                </p>
                <Link
                  to="/menu"
                  className="btn-primary"
                  style={{
                    background: '#FAF7F2',
                    color: '#2C1810',
                    justifyContent: 'center',
                    marginBottom: '12px',
                  }}
                  id="hours-explore-menu-btn"
                >
                  <span>Open Directory</span>
                  <ChevronRight size={18} />
                </Link>

                <Link
                  to="/menu"
                  className="btn-primary"
                  style={{ justifyContent: 'center' }}
                  id="hours-order-online-btn"
                >
                  <ShoppingBag size={16} />
                  <span>Order Online</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
