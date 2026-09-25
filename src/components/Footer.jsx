import { MapPin, Phone, Mail } from 'lucide-react';

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-top">
          {/* Brand */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <img
                src="/gians.png"
                alt="Gian's Logo"
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  objectFit: 'contain',
                  background: '#fff',
                  padding: '2px',
                }}
              />
              <span className="footer-brand-name" style={{ margin: 0 }}>Gian&apos;s Foodhouse</span>
            </div>
            <p className="footer-brand-desc">
              A cozy corner cafe where every cup tells a story. Crafted with love, served with care.
            </p>
          </div>

          {/* Visit */}
          <div>
            <div className="footer-col-title">Visit Us</div>
            <a
              className="footer-link"
              href="https://maps.google.com/?q=Purok+4,+Poblacion,+San+Miguel,+Bohol"
              target="_blank"
              rel="noopener noreferrer"
              id="footer-address-link"
            >
              <MapPin size={14} />
              <span>Purok 4, Poblacion, San Miguel, Bohol</span>
            </a>
            <a className="footer-link" href="tel:+639289842688" id="footer-phone-link">
              <Phone size={14} />
              <span>+63 928 984 2688</span>
            </a>
          </div>

          {/* Connect */}
          <div>
            <div className="footer-col-title">Connect</div>
            <a className="footer-link" href="mailto:sicap.algabre2@gmail.com" id="footer-email-link">
              <Mail size={14} />
              <span>sicap.algabre2@gmail.com</span>
            </a>
            <a
              className="footer-link"
              href="https://www.facebook.com"
              target="_blank"
              rel="noopener noreferrer"
              id="footer-facebook-link"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
              </svg>
              <span>Gian&apos;s Foodhouse</span>
            </a>
          </div>
        </div>

        <div className="footer-bottom">
          &copy; {year} Gian&apos;s Cafe. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
