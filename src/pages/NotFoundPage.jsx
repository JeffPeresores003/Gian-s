import { Link } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="state-center" style={{ minHeight: '70vh' }}>
      <h1 className="font-serif" style={{ fontSize: '4rem', color: 'var(--color-brand)', marginBottom: '8px' }}>
        404
      </h1>
      <div className="state-title">Page Not Found</div>
      <p className="state-sub" style={{ maxWidth: '380px', marginBottom: '24px' }}>
        The page you are looking for doesn&apos;t exist or has moved.
      </p>
      <div style={{ display: 'flex', gap: '12px' }}>
        <Link to="/" className="btn-primary">
          <Home size={16} />
          <span>Return Home</span>
        </Link>
        <Link to="/menu" className="btn-secondary">
          <ArrowLeft size={16} />
          <span>Explore Menu</span>
        </Link>
      </div>
    </div>
  );
}
