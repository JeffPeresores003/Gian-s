import { Link, NavLink } from 'react-router-dom';
import { BookOpen } from 'lucide-react';

export default function Navbar() {
  return (
    <nav className="navbar" role="navigation" aria-label="Main navigation">
      <div className="navbar-inner">
        {/* Left Side: Brand Logo */}
        <Link to="/" className="nav-logo" aria-label="Gian's Foodhouse home">
          <img
            src="/gians.png"
            alt="Gian's Logo"
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              objectFit: 'contain',
              background: '#fff',
              padding: '2px',
              border: '1px solid var(--color-border)',
            }}
          />
          <span className="nav-logo-text">Gian&apos;s</span>
        </Link>

        {/* Right Side: Menu Button */}
        <div className="nav-actions">
          <NavLink
            to="/menu"
            className={({ isActive }) => `btn-nav-menu${isActive ? ' active' : ''}`}
            id="nav-menu-link"
          >
            <BookOpen size={15} />
            <span>Menu</span>
          </NavLink>
        </div>
      </div>
    </nav>
  );
}
