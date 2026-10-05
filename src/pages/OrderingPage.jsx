import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingCart, Plus, Minus, Trash2, Search, MapPin,
  User, Phone, FileText, CheckCircle2, Copy, Download,
  ArrowLeft, ArrowRight, Loader2, X, Package,
} from 'lucide-react';
import api, { getImageUrl } from '../lib/api';
import { useToast } from '../contexts/ToastContext';
import QRCode from '../lib/qrcode';

/* ─── Step indicator ─────────────────────────────────────────── */
const STEPS = ['Browse & Select', 'Your Info', 'Confirmation'];

function StepBar({ current }) {
  return (
    <div className="order-step-bar">
      {STEPS.map((label, i) => (
        <div key={i} className={`order-step ${i <= current ? 'active' : ''} ${i < current ? 'done' : ''}`}>
          <div className="order-step-circle">{i < current ? <CheckCircle2 size={14} /> : i + 1}</div>
          <span className="order-step-label">{label}</span>
          {i < STEPS.length - 1 && <div className="order-step-line" />}
        </div>
      ))}
    </div>
  );
}

const FIXED_DELIVERY_FEE = 0.00;

/* ─── Main Page ──────────────────────────────────────────────── */
export default function OrderingPage() {
  const { addToast } = useToast();
  const navigate = useNavigate();

  // Step 0: Browse & Cart
  const [step, setStep] = useState(0);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [cart, setCart] = useState([]);

  // Step 1: Info
  const [fullName, setFullName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [notes, setNotes] = useState('');

  // Step 2: Confirmation
  const [submitting, setSubmitting] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState(null); // { order_number, qr_token }
  const [qrDataUrl, setQrDataUrl] = useState('');

  // ── Load products ──
  useEffect(() => {
    (async () => {
      setLoadingProducts(true);
      try {
        const [prodRes, catRes] = await Promise.all([
          api.get('/products'),
          api.get('/categories'),
        ]);
        setProducts(prodRes.data?.products || []);
        const cats = (catRes.data?.categories || []).map((c) => c.name);
        setCategories(['All', ...cats]);
      } catch {
        addToast('Unable to load menu. Please try again.', 'error');
      } finally {
        setLoadingProducts(false);
      }
    })();
  }, []);

  // ── Filtered products ──
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (!p.is_available) return false;
      if (selectedCategory !== 'All' && p.category !== selectedCategory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q);
      }
      return true;
    });
  }, [products, selectedCategory, searchQuery]);

  // ── Cart logic ──
  const addToCart = (product) => {
    setCart((prev) => {
      const ex = prev.find((i) => i.id === product.id);
      if (ex) return prev.map((i) => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const updateQty = (id, delta) => {
    setCart((prev) =>
      prev.map((i) => i.id === id ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i)
    );
  };

  const removeFromCart = (id) => setCart((prev) => prev.filter((i) => i.id !== id));

  const cartSubtotal = useMemo(() => cart.reduce((s, i) => s + i.price * i.quantity, 0), [cart]);
  const cartTotal = useMemo(() => cartSubtotal, [cartSubtotal]);
  const cartCount = useMemo(() => cart.reduce((s, i) => s + i.quantity, 0), [cart]);

  // ── Step 0 → 1 ──
  const goToInfo = () => {
    if (cart.length === 0) {
      addToast('Please add at least one item to your order.', 'error');
      return;
    }
    setStep(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ── Step 1 → 2 (submit) ──
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fullName.trim()) { addToast('Full name is required.', 'error'); return; }
    if (!contactNumber.trim()) { addToast('Contact number is required.', 'error'); return; }
    if (!deliveryAddress.trim()) { addToast('Delivery address is required.', 'error'); return; }

    setSubmitting(true);
    try {
      const res = await api.post('/online-orders', {
        customer_name: fullName.trim(),
        contact_number: contactNumber.trim(),
        delivery_address: deliveryAddress.trim(),
        delivery_fee: 0,
        total_amount: cartTotal,
        notes: notes.trim() || null,
        items: cart.map((i) => ({
          product_id: i.id,
          product_name: i.name,
          unit_price: i.price,
          quantity: i.quantity,
        })),
      });

      const { order_number, qr_token } = res.data;
      setConfirmedOrder({ order_number, qr_token });

      // Generate QR code dataURL
      const qr = await QRCode.toDataURL(qr_token, {
        errorCorrectionLevel: 'H',
        width: 300,
        margin: 2,
        color: { dark: '#1a0a00', light: '#faf7f2' },
      });
      setQrDataUrl(qr);

      setStep(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to place order. Try again.';
      addToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Copy OTN ──
  const copyOTN = () => {
    navigator.clipboard.writeText(confirmedOrder?.order_number || '');
    addToast('OTN copied to clipboard!', 'success');
  };

  // ── Download PNG ──
  const downloadPNG = async () => {
    const otn = confirmedOrder?.order_number || '';
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 420;
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = '#1a0a00';
    ctx.fillRect(0, 0, 600, 420);

    // Top accent bar
    const grad = ctx.createLinearGradient(0, 0, 600, 0);
    grad.addColorStop(0, '#c8873a');
    grad.addColorStop(1, '#e5a558');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 600, 6);

    // Title
    ctx.fillStyle = '#e5a558';
    ctx.font = 'bold 22px serif';
    ctx.textAlign = 'center';
    ctx.fillText("Gian's Cafe & Food House", 300, 50);

    ctx.fillStyle = '#faf7f2';
    ctx.font = '13px sans-serif';
    ctx.fillText('Online Order Confirmation', 300, 72);

    // OTN box
    ctx.fillStyle = 'rgba(200,135,58,0.15)';
    ctx.roundRect(60, 95, 480, 70, 12);
    ctx.fill();
    ctx.strokeStyle = 'rgba(200,135,58,0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#c8873a';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ORDER TRACKING NUMBER', 300, 118);

    ctx.fillStyle = '#faf7f2';
    ctx.font = 'bold 26px monospace';
    ctx.fillText(otn, 300, 150);

    // Separator
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(60, 180);
    ctx.lineTo(540, 180);
    ctx.stroke();

    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '12px sans-serif';
    ctx.fillText('Show this QR code to the rider upon delivery', 300, 200);

    // Draw QR
    const qrImg = new Image();
    qrImg.src = qrDataUrl;
    await new Promise((r) => { qrImg.onload = r; });
    ctx.drawImage(qrImg, 210, 210, 180, 180);

    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.font = '11px sans-serif';
    ctx.fillText('Track your order at giansorder.com with your OTN', 300, 408);

    const link = document.createElement('a');
    link.download = `GiansOrder_${otn}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    addToast('Order confirmation downloaded!', 'success');
  };

  // Removed handleMapChange

  // ─────────────────────────────────────────────────────────────
  return (
    <div className="ordering-page">
      {/* Back to menu */}
      <div className="ordering-back-row">
        <button className="ordering-back-btn" onClick={() => step > 0 ? setStep(s => s - 1) : navigate('/menu')}>
          <ArrowLeft size={16} /> {step > 0 ? 'Back' : 'Back to Menu'}
        </button>
      </div>

      <div className="ordering-header">
        <h1 className="ordering-title font-serif">Place Your Order</h1>
        <p className="ordering-subtitle">Online delivery from Gian's Cafe & Food House</p>
      </div>

      <StepBar current={step} />

      {/* ── STEP 0: Browse & Cart ── */}
      {step === 0 && (
        <div className="ordering-step0-layout">
          {/* Product grid (left) */}
          <div className="ordering-catalog">
            <div className="ordering-filters">
              <div className="ordering-search-wrap">
                <Search size={16} className="ordering-search-icon" />
                <input
                  className="ordering-search"
                  placeholder="Search items…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="ordering-cats">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    className={`ordering-cat-chip ${selectedCategory === cat ? 'active' : ''}`}
                    onClick={() => setSelectedCategory(cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {loadingProducts ? (
              <div className="ordering-loading"><Loader2 className="spin" size={28} /><span>Loading menu…</span></div>
            ) : filteredProducts.length === 0 ? (
              <div className="ordering-empty"><Package size={40} /><p>No items match your search.</p></div>
            ) : (
              <div className="ordering-products-grid">
                {filteredProducts.map((product) => {
                  const inCart = cart.find((i) => i.id === product.id);
                  return (
                    <div key={product.id} className={`ordering-product-card ${inCart ? 'in-cart' : ''}`}>
                      {product.image_url && (
                        <img
                          src={getImageUrl(product.image_url)}
                          alt={product.name}
                          className="ordering-product-img"
                        />
                      )}
                      <div className="ordering-product-body">
                        <div className="ordering-product-name">{product.name}</div>
                        <div className="ordering-product-cat">{product.category}</div>
                        {product.description && (
                          <div className="ordering-product-desc">{product.description}</div>
                        )}
                        <div className="ordering-product-footer">
                          <span className="ordering-product-price">₱{Number(product.price).toFixed(2)}</span>
                          {inCart ? (
                            <div className="ordering-qty-ctrl">
                              <button onClick={() => updateQty(product.id, -1)}><Minus size={12} /></button>
                              <span>{inCart.quantity}</span>
                              <button onClick={() => updateQty(product.id, 1)}><Plus size={12} /></button>
                            </div>
                          ) : (
                            <button className="ordering-add-btn" onClick={() => addToCart(product)}>
                              <Plus size={14} /> Add
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Cart summary (right) */}
          <div className="ordering-cart-panel">
            <div className="ordering-cart-header">
              <ShoppingCart size={18} />
              <span>Your Order</span>
              {cartCount > 0 && <span className="ordering-cart-badge">{cartCount}</span>}
            </div>

            {cart.length === 0 ? (
              <div className="ordering-cart-empty">
                <ShoppingCart size={36} />
                <p>Your cart is empty</p>
                <span>Add items from the menu</span>
              </div>
            ) : (
              <>
                <div className="ordering-cart-items">
                  {cart.map((item) => (
                    <div key={item.id} className="ordering-cart-item">
                      <div className="ordering-cart-item-info">
                        <span className="ordering-cart-item-name">{item.name}</span>
                        <span className="ordering-cart-item-price">₱{(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                      <div className="ordering-cart-item-ctrl">
                        <button onClick={() => updateQty(item.id, -1)}><Minus size={11} /></button>
                        <span>{item.quantity}</span>
                        <button onClick={() => updateQty(item.id, 1)}><Plus size={11} /></button>
                        <button className="ordering-cart-remove" onClick={() => removeFromCart(item.id)}><Trash2 size={12} /></button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="ordering-cart-divider" />
                <div className="ordering-cart-total">
                  <span>Total</span>
                  <span className="ordering-cart-total-amount">₱{cartTotal.toFixed(2)}</span>
                </div>
                <button className="ordering-proceed-btn" onClick={goToInfo}>
                  Continue <ArrowRight size={16} />
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── STEP 1: Customer Info ── */}
      {step === 1 && (
        <div className="ordering-info-layout">
          <form className="ordering-info-form" onSubmit={handleSubmit}>
            <div className="ordering-info-section-title"><User size={16} /> Customer Information</div>

            <div className="ordering-field">
              <label>Full Name *</label>
              <input
                placeholder="e.g. Juan Dela Cruz"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
            <div className="ordering-field">
              <label>Contact Number *</label>
              <input
                placeholder="e.g. 09xx-xxx-xxxx"
                value={contactNumber}
                onChange={(e) => setContactNumber(e.target.value)}
                required
              />
            </div>
            <div className="ordering-field">
              <label>Delivery Address *</label>
              <textarea
                rows={3}
                placeholder="House/Bldg No., Street, Barangay, City"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                required
              />
            </div>

            <div className="ordering-field" style={{ marginTop: '20px' }}>
              <label><FileText size={14} /> Special Notes (optional)</label>
              <textarea
                rows={2}
                placeholder="Any special instructions for your order…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {/* Order summary */}
            <div className="ordering-info-summary">
              <div className="ordering-info-summary-title">Order Summary</div>
              {cart.map((item) => (
                <div key={item.id} className="ordering-info-summary-row">
                  <span>{item.name} × {item.quantity}</span>
                  <span>₱{(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
              <div className="ordering-info-summary-total">
                <span>Total Amount Due</span>
                <span>₱{cartTotal.toFixed(2)}</span>
              </div>
            </div>

            <button type="submit" className="ordering-proceed-btn" disabled={submitting}>
              {submitting ? <><Loader2 className="spin" size={16} /> Placing Order…</> : <>Place Order <ArrowRight size={16} /></>}
            </button>
          </form>
        </div>
      )}

      {/* ── STEP 2: Confirmation ── */}
      {step === 2 && confirmedOrder && (
        <div className="ordering-confirmation">
          <div className="ordering-confirm-card">
            <div className="ordering-confirm-icon">
              <CheckCircle2 size={48} />
            </div>
            <h2 className="ordering-confirm-title font-serif">Order Placed!</h2>
            <p className="ordering-confirm-sub">
              Your order has been received and is pending cashier approval.
              Use your OTN below to track your delivery.
            </p>

            <div className="ordering-otn-box">
              <div className="ordering-otn-label">ORDER TRACKING NUMBER</div>
              <div className="ordering-otn-value">{confirmedOrder.order_number}</div>
              <button className="ordering-otn-copy" onClick={copyOTN}>
                <Copy size={14} /> Copy OTN
              </button>
            </div>

            {qrDataUrl && (
              <div className="ordering-qr-section">
                <p className="ordering-qr-hint">Show this QR to the rider upon delivery</p>
                <img src={qrDataUrl} alt="Order QR Code" className="ordering-qr-img" />
              </div>
            )}

            <div className="ordering-confirm-actions">
              <button className="ordering-download-btn" onClick={downloadPNG} disabled={!qrDataUrl}>
                <Download size={16} /> Download as PNG
              </button>
              <button
                className="ordering-track-btn"
                onClick={() => navigate(`/track?otn=${confirmedOrder.order_number}`)}
              >
                Track Order <ArrowRight size={16} />
              </button>
            </div>

            <button className="ordering-new-order-btn" onClick={() => navigate('/menu')}>
              Back to Menu
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
