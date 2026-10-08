import { useEffect } from 'react';
import { X } from 'lucide-react';

/** Does this product have any configured flavors? */
export const hasFlavors = (product) =>
  Array.isArray(product?.flavors) && product.flavors.length > 0;

/** Unique cart line key: same product with different flavors = separate lines. */
export const cartKeyOf = (item) => `${item.id}::${item.flavor || ''}`;

/** Display name, e.g. "Fries (Cheese)". */
export const displayName = (item) => (item.flavor ? `${item.name} (${item.flavor})` : item.name);

/**
 * Small modal for choosing a flavor. Out-of-stock flavors are shown but disabled.
 */
export default function FlavorModal({ product, onSelect, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!product) return null;

  return (
    <div
      id="flavor-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={`Choose a flavor for ${product.name}`}
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(26, 10, 0, 0.55)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 5000,
        padding: '16px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '340px',
          padding: '20px',
          boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>{product.name}</div>
            <div style={{ fontSize: '0.8rem', opacity: 0.65 }}>Choose a flavor</div>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '14px' }}>
          {product.flavors.map((f) => (
            <button
              key={f.name}
              type="button"
              id={`flavor-option-${f.name.replace(/\s+/g, '-').toLowerCase()}`}
              disabled={!f.available}
              onClick={() => onSelect(f.name)}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 14px',
                borderRadius: '10px',
                border: '1.5px solid var(--color-brand, #8b5a2b)',
                background: f.available ? '#fff' : '#f3f0ec',
                color: f.available ? 'inherit' : '#999',
                borderColor: f.available ? 'var(--color-brand, #8b5a2b)' : '#ddd',
                cursor: f.available ? 'pointer' : 'not-allowed',
                fontWeight: 600,
                fontSize: '0.92rem',
                textAlign: 'left',
              }}
            >
              <span>{f.name}</span>
              {!f.available && <span style={{ fontSize: '0.72rem', fontWeight: 500 }}>Out of stock</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
