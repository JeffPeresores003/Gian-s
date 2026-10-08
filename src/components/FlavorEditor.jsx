import { useState } from 'react';
import { Plus, X } from 'lucide-react';

/**
 * Optional flavors editor used by the admin Add/Edit Product modal.
 * value: [{ name: string, available: boolean }]
 */
export default function FlavorEditor({ value = [], onChange }) {
  const [draft, setDraft] = useState('');

  const addFlavor = () => {
    const name = draft.trim();
    if (!name) return;
    if (value.some((f) => f.name.toLowerCase() === name.toLowerCase())) {
      setDraft('');
      return;
    }
    onChange([...value, { name, available: true }]);
    setDraft('');
  };

  const toggle = (idx) =>
    onChange(value.map((f, i) => (i === idx ? { ...f, available: !f.available } : f)));

  const remove = (idx) => onChange(value.filter((_, i) => i !== idx));

  return (
    <div className="form-group" id="product-flavors-editor">
      <label className="form-label" htmlFor="product-flavor-input">
        Flavors <span style={{ fontWeight: 400, opacity: 0.6 }}>(optional)</span>
      </label>

      <div style={{ display: 'flex', gap: '8px' }}>
        <input
          id="product-flavor-input"
          className="form-input"
          placeholder="e.g. Cheese, Sour Cream, BBQ, Original"
          value={draft}
          maxLength={50}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addFlavor();
            }
          }}
        />
        <button
          type="button"
          id="product-flavor-add-btn"
          className="btn-cancel"
          onClick={addFlavor}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}
        >
          <Plus size={14} /> Add
        </button>
      </div>

      {value.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '10px' }}>
          {value.map((f, idx) => (
            <div
              key={f.name}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '8px 12px',
                background: 'var(--color-cream)',
                borderRadius: 'var(--radius-sm)',
                opacity: f.available ? 1 : 0.75,
              }}
            >
              <span
                style={{
                  flex: 1,
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  textDecoration: f.available ? 'none' : 'line-through',
                }}
              >
                {f.name}
              </span>
              <label
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', cursor: 'pointer' }}
              >
                <input
                  type="checkbox"
                  checked={f.available}
                  onChange={() => toggle(idx)}
                  style={{ accentColor: 'var(--color-brand)' }}
                />
                {f.available ? 'Available' : 'Out of stock'}
              </label>
              <button
                type="button"
                aria-label={`Remove ${f.name}`}
                onClick={() => remove(idx)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#b42318', display: 'flex' }}
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
