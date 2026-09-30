import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  RotateCcw,
  Coffee,
  AlertCircle,
  Loader2,
  CheckCircle2,
  CircleOff,
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  X,
  MapPin,
  User,
  Phone,
  FileText,
  Copy,
  Download,
  ArrowRight,
  ArrowLeft,
  ChevronDown,
  AlertTriangle,
} from 'lucide-react';
import api, { getImageUrl } from '../lib/api';
import { useToast } from '../contexts/ToastContext';
import { createQRCodeDataURL } from '../lib/qrcode';

const FIXED_DELIVERY_FEE = 50.00;

export default function MenuPage() {
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  // ─── Cart & Ordering System State ─────────────────────────────
  const [cart, setCart] = useState([]);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [orderStep, setOrderStep] = useState(0); // 0: Cart Review, 1: Info, 2: Confirmation

  // Checkout inputs
  const [fullName, setFullName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState(null);
  const [qrDataUrl, setQrDataUrl] = useState('');

  // Fetch initial products and categories from backend
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const [prodRes, catRes] = await Promise.all([
          api.get('/products'),
          api.get('/categories'),
        ]);
        setProducts(prodRes.data?.products || []);
        setCategories(catRes.data?.categories || []);
      } catch (err) {
        setError('Unable to load menu products right now. Please check back shortly.');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Filter products client-side for ultra-responsive instant search and filtering
  const filteredProducts = useMemo(() => {
    return products
      .filter((item) => {
        const isAvail = Boolean(item.is_available);

        if (availabilityFilter === 'available' && !isAvail) return false;
        if (availabilityFilter === 'out_of_stock' && isAvail) return false;

        if (searchTerm.trim() !== '') {
          const matchName = item.name?.toLowerCase().includes(searchTerm.toLowerCase().trim());
          const matchDesc = item.description?.toLowerCase().includes(searchTerm.toLowerCase().trim());
          if (!matchName && !matchDesc) return false;
        }

        if (selectedCategory && item.category !== selectedCategory) {
          return false;
        }

        if (minPrice !== '' && !isNaN(Number(minPrice))) {
          if (Number(item.price) < Number(minPrice)) return false;
        }

        if (maxPrice !== '' && !isNaN(Number(maxPrice))) {
          if (Number(item.price) > Number(maxPrice)) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const aAvail = Boolean(a.is_available) ? 1 : 0;
        const bAvail = Boolean(b.is_available) ? 1 : 0;
        return bAvail - aAvail;
      });
  }, [products, searchTerm, selectedCategory, availabilityFilter, minPrice, maxPrice]);

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedCategory('');
    setAvailabilityFilter('');
    setMinPrice('');
    setMaxPrice('');
  };

  const hasActiveFilters =
    searchTerm !== '' ||
    selectedCategory !== '' ||
    availabilityFilter !== '' ||
    minPrice !== '' ||
    maxPrice !== '';

  // ─── Cart Calculations ─────────────────────────────────────────
  const cartCount = useMemo(() => cart.reduce((sum, i) => sum + i.quantity, 0), [cart]);
  const cartSubtotal = useMemo(() => cart.reduce((sum, i) => sum + i.price * i.quantity, 0), [cart]);
  const cartTotal = useMemo(() => (cartSubtotal > 0 ? cartSubtotal + FIXED_DELIVERY_FEE : 0), [cartSubtotal]);

  // ─── Cart Handlers ─────────────────────────────────────────────
  const addToCart = (product) => {
    if (!product.is_available) {
      addToast(`"${product.name}" is currently marked out of stock.`, 'info');
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
    addToast(`Added "${product.name}" to your order!`, 'success');
  };

  const updateQuantity = (productId, delta) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id === productId) {
            const nextQty = item.quantity + delta;
            return nextQty > 0 ? { ...item, quantity: nextQty } : null;
          }
          return item;
        })
        .filter(Boolean)
    );
  };

  const removeFromCart = (productId) => {
    setCart((prev) => prev.filter((item) => item.id !== productId));
  };

  // ─── Submit Online Order ───────────────────────────────────────
  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    if (!fullName.trim() || !contactNumber.trim() || !deliveryAddress.trim()) {
      addToast('Please fill in all required customer fields.', 'error');
      return;
    }
    if (cart.length === 0) {
      addToast('Your cart is empty.', 'error');
      return;
    }

    setSubmittingOrder(true);
    try {
      const payload = {
        customer_name: fullName.trim(),
        contact_number: contactNumber.trim(),
        delivery_address: deliveryAddress.trim(),
        delivery_fee: FIXED_DELIVERY_FEE,
        total_amount: cartTotal,
        notes: notes.trim() || null,
        items: cart.map((i) => ({
          product_id: i.id,
          product_name: i.name,
          unit_price: i.price,
          quantity: i.quantity,
        })),
      };

      const res = await api.post('/online-orders', payload);
      const { order_number, qr_token } = res.data;

      const orderData = {
        order_number,
        qr_token,
        customer_name: fullName.trim(),
        contact_number: contactNumber.trim(),
        delivery_address: deliveryAddress.trim(),
        delivery_fee: FIXED_DELIVERY_FEE,
        notes: notes.trim() || null,
        total_amount: cartTotal,
        items: [...cart],
        created_at: new Date().toISOString(),
      };
      setConfirmedOrder(orderData);

      // Generate QR Code data URL using our pure JS QR generator
      const qrUrl = createQRCodeDataURL(qr_token, {
        width: 320,
        margin: 3,
        color: { dark: '#20120B', light: '#FAF7F2' },
      });
      setQrDataUrl(qrUrl);

      // Move to confirmation step and clear cart
      setOrderStep(2);
      setCart([]);
      addToast('Order submitted successfully! Pending cashier approval.', 'success');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to place order. Please try again.';
      addToast(msg, 'error');
    } finally {
      setSubmittingOrder(false);
    }
  };

  // ─── Copy OTN ──────────────────────────────────────────────────
  const copyOTN = () => {
    navigator.clipboard.writeText(confirmedOrder?.order_number || '');
    addToast('OTN copied to clipboard!', 'success');
  };

  // ─── Download Full Confirmation Ticket PNG ─────────────────────
  // ─── Download Full Confirmation Receipt PNG (Matches Cashier Receipt Style) ───
  const downloadPNG = () => {
    if (!confirmedOrder) return;
    const otn = confirmedOrder.order_number || '';
    const items = confirmedOrder.items || [];

    const canvasWidth = 480;
    const pad = 28;
    const lineHeight = 22;

    const dateStr = new Date(confirmedOrder.created_at || Date.now()).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const headerH = 145;
    const metaH = 150 + (confirmedOrder.notes ? 30 : 0);
    const itemsH = Math.max(items.length * lineHeight, lineHeight) + 60;
    const totalsH = 140;
    const qrH = qrDataUrl ? 230 : 50;
    const footerH = 75;
    const canvasHeight = headerH + metaH + itemsH + totalsH + qrH + footerH;

    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext('2d');

    // Thermal paper background & font
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Subtle thermal paper dashed border
    ctx.strokeStyle = '#D5C8BE';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(6, 6, canvasWidth - 12, canvasHeight - 12);
    ctx.setLineDash([]);

    const drawDashedDivider = (currY) => {
      ctx.fillStyle = '#888888';
      ctx.font = '13px "Courier New", Courier, monospace';
      ctx.textAlign = 'center';
      ctx.fillText('- - - - - - - - - - - - - - - - - - - -', canvasWidth / 2, currY);
      return currY + 18;
    };

    const drawReceiptContent = (logoImg, qrImg) => {
      let y = 30;

      // ── Logo ──
      if (logoImg) {
        const logoSize = 44;
        ctx.save();
        ctx.beginPath();
        ctx.arc(canvasWidth / 2, y + logoSize / 2, logoSize / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(logoImg, canvasWidth / 2 - logoSize / 2, y, logoSize, logoSize);
        ctx.restore();
        y += logoSize + 12;
      }

      // ── Header (Gian's Foodhouse) ──
      ctx.fillStyle = '#1A1A1A';
      ctx.font = 'bold 18px "Courier New", Courier, monospace';
      ctx.textAlign = 'center';
      ctx.fillText("Gian's Foodhouse", canvasWidth / 2, y);
      y += 18;

      ctx.fillStyle = '#555555';
      ctx.font = '11px "Courier New", Courier, monospace';
      ctx.fillText('Poblacion, San Miguel, Bohol', canvasWidth / 2, y);
      y += 15;
      ctx.fillText('Tel: 0950 498 1269', canvasWidth / 2, y);
      y += 18;

      y = drawDashedDivider(y);

      // ── Meta Details ──
      const meta = [
        ['Order #:', otn],
        ['Date:', dateStr],
        ['Customer:', confirmedOrder.customer_name || 'Guest'],
        ['Type:', 'ONLINE DELIVERY'],
      ];
      if (confirmedOrder.delivery_address) meta.push(['Address:', confirmedOrder.delivery_address]);
      if (confirmedOrder.contact_number) meta.push(['Contact:', confirmedOrder.contact_number]);
      if (confirmedOrder.rider_name) meta.push(['Rider:', confirmedOrder.rider_name]);
      meta.push(['Cashier:', 'Online Order']);
      if (confirmedOrder.notes) meta.push(['Note:', confirmedOrder.notes]);

      ctx.font = '12px "Courier New", Courier, monospace';
      meta.forEach(([lbl, val]) => {
        ctx.fillStyle = '#555555';
        ctx.textAlign = 'left';
        ctx.fillText(lbl, pad, y);

        ctx.fillStyle = '#1A1A1A';
        ctx.textAlign = 'right';
        const displayVal = val.length > 28 ? val.substring(0, 26) + '...' : val;
        ctx.fillText(displayVal, canvasWidth - pad, y);
        y += 17;
      });

      y += 4;
      y = drawDashedDivider(y);

      // ── Items Table ──
      ctx.fillStyle = '#1A1A1A';
      ctx.font = 'bold 12px "Courier New", Courier, monospace';
      ctx.textAlign = 'left';
      ctx.fillText('Item', pad, y);
      ctx.textAlign = 'center';
      ctx.fillText('Qty', canvasWidth / 2 + 35, y);
      ctx.textAlign = 'right';
      ctx.fillText('Amount', canvasWidth - pad, y);
      y += 16;

      ctx.strokeStyle = '#888888';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(pad, y - 4);
      ctx.lineTo(canvasWidth - pad, y - 4);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.font = '12px "Courier New", Courier, monospace';
      let itemsSubtotal = 0;
      items.forEach((item) => {
        const itemQty = item.quantity;
        const itemPrice = Number(item.subtotal || item.price * itemQty);
        itemsSubtotal += itemPrice;

        ctx.fillStyle = '#1A1A1A';
        ctx.textAlign = 'left';
        const rawName = item.name || item.product_name;
        const itemName = rawName.length > 20 ? rawName.substring(0, 18) + '..' : rawName;
        ctx.fillText(itemName, pad, y);

        ctx.textAlign = 'center';
        ctx.fillText(String(itemQty), canvasWidth / 2 + 35, y);

        ctx.textAlign = 'right';
        ctx.fillText(`\u20B1${itemPrice.toFixed(2)}`, canvasWidth - pad, y);
        y += lineHeight;
      });

      y += 4;
      y = drawDashedDivider(y);

      // ── Totals ──
      const delFee = Number(confirmedOrder.delivery_fee || FIXED_DELIVERY_FEE);
      const calcSubtotal = itemsSubtotal > 0 ? itemsSubtotal : Math.max(0, Number(confirmedOrder.total_amount || 0) - delFee);

      ctx.font = '12px "Courier New", Courier, monospace';
      ctx.fillStyle = '#555555';
      ctx.textAlign = 'left';
      ctx.fillText('Subtotal:', pad, y);
      ctx.fillStyle = '#1A1A1A';
      ctx.textAlign = 'right';
      ctx.fillText(`\u20B1${calcSubtotal.toFixed(2)}`, canvasWidth - pad, y);
      y += 18;

      ctx.fillStyle = '#555555';
      ctx.textAlign = 'left';
      ctx.fillText('Delivery Fee:', pad, y);
      ctx.fillStyle = '#1A1A1A';
      ctx.textAlign = 'right';
      ctx.fillText(`\u20B1${delFee.toFixed(2)}`, canvasWidth - pad, y);
      y += 20;

      // Final Total Due Row (dashed top & bottom lines)
      ctx.strokeStyle = '#888888';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(pad, y - 6);
      ctx.lineTo(canvasWidth - pad, y - 6);
      ctx.stroke();

      ctx.fillStyle = '#1A1A1A';
      ctx.font = 'bold 15px "Courier New", Courier, monospace';
      ctx.textAlign = 'left';
      ctx.fillText('TOTAL DUE:', pad, y + 10);
      ctx.textAlign = 'right';
      ctx.fillText(`\u20B1${Number(confirmedOrder.total_amount || 0).toFixed(2)}`, canvasWidth - pad, y + 10);

      ctx.beginPath();
      ctx.moveTo(pad, y + 20);
      ctx.lineTo(canvasWidth - pad, y + 20);
      ctx.stroke();
      ctx.setLineDash([]);
      y += 34;

      ctx.fillStyle = '#555555';
      ctx.font = '12px "Courier New", Courier, monospace';
      ctx.textAlign = 'left';
      ctx.fillText('Payment Method:', pad, y);
      ctx.fillStyle = '#1A1A1A';
      ctx.textAlign = 'right';
      ctx.fillText('Cash on Delivery', canvasWidth - pad, y);
      y += 20;

      y = drawDashedDivider(y);

      // ── QR Code Section (Below Receipt) ──
      if (qrImg) {
        ctx.fillStyle = '#1A1A1A';
        ctx.font = 'bold 12px "Courier New", Courier, monospace';
        ctx.textAlign = 'center';
        ctx.fillText('SCAN TO VERIFY DELIVERY', canvasWidth / 2, y);
        y += 15;

        const qrBoxSize = 140;
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect((canvasWidth - qrBoxSize) / 2, y, qrBoxSize, qrBoxSize);
        ctx.drawImage(qrImg, (canvasWidth - qrBoxSize) / 2, y, qrBoxSize, qrBoxSize);
        y += qrBoxSize + 14;

        ctx.fillStyle = '#555555';
        ctx.font = '10px "Courier New", Courier, monospace';
        ctx.fillText('Show this QR to Courier upon delivery', canvasWidth / 2, y);
        y += 14;
        ctx.fillText(otn, canvasWidth / 2, y);
        y += 16;
      }

      y = drawDashedDivider(y);

      // ── Footer ──
      ctx.fillStyle = '#555555';
      ctx.font = '11px "Courier New", Courier, monospace';
      ctx.textAlign = 'center';
      ctx.fillText("Thank you for ordering at Gian's!", canvasWidth / 2, y);
      y += 15;
      ctx.fillText('Please present this receipt upon receiving.', canvasWidth / 2, y);

      const a = document.createElement('a');
      a.download = `Gians-Receipt-${otn}.png`;
      a.href = canvas.toDataURL('image/png');
      a.click();
    };

    const logoImg = new Image();
    logoImg.crossOrigin = 'anonymous';
    logoImg.src = '/gians.png';

    const loadQRAndDraw = (loadedLogo) => {
      if (qrDataUrl) {
        const qrImg = new Image();
        qrImg.onload = () => drawReceiptContent(loadedLogo, qrImg);
        qrImg.onerror = () => drawReceiptContent(loadedLogo, null);
        qrImg.src = qrDataUrl;
      } else {
        drawReceiptContent(loadedLogo, null);
      }
    };

    logoImg.onload = () => loadQRAndDraw(logoImg);
    logoImg.onerror = () => loadQRAndDraw(null);
  };

  return (
    <div className="menu-page-root">
      {/* ─── Hero Banner ──────────────────────────────────────── */}
      <section className="menu-hero">
        <div className="menu-hero-glow menu-hero-glow-1" />
        <div className="menu-hero-glow menu-hero-glow-2" />
        <div className="menu-hero-content">
          <span className="menu-hero-eyebrow">
            <span className="menu-hero-eyebrow-dot" />
            Digital Ordering Menu
          </span>
          <h1 className="menu-hero-title font-serif">
            Fresh Food &amp; <span className="menu-hero-title-accent">Brews</span>
          </h1>
          <p className="menu-hero-sub">
            Tap any item to add it to your order — get a live tracking number the moment you check out.
          </p>
          {cart.length > 0 && (
            <button
              className="menu-hero-cart-cta"
              onClick={() => { setOrderStep(0); setIsOrderModalOpen(true); }}
            >
              <ShoppingBag size={18} />
              <span>Review Order</span>
              <span className="menu-hero-cta-badge">{cartCount}</span>
              <span className="menu-hero-cta-sep">·</span>
              <span className="menu-hero-cta-total">₱{cartTotal.toFixed(2)}</span>
            </button>
          )}
        </div>
      </section>

      {/* ─── Filter Bar ───────────────────────────────────────── */}
      <section className="menu-filter-section">
        <div className="menu-filter-bar">
          {/* Search */}
          <div className="mfb-search">
            <Search className="mfb-search-icon" size={16} />
            <input
              id="menu-search-input"
              type="text"
              className="mfb-search-input"
              placeholder="Search drinks, snacks, meals…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button className="mfb-clear-btn" onClick={() => setSearchTerm('')} type="button">
                <X size={13} />
              </button>
            )}
          </div>

          <div className="mfb-divider" />

          {/* Category */}
          <div className="mfb-select-wrap">
            <select
              id="menu-category-select"
              className="mfb-select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id || cat.name} value={cat.name}>{cat.name}</option>
              ))}
            </select>
            <ChevronDown className="mfb-select-arrow" size={14} />
          </div>

          <div className="mfb-divider" />

          {/* Availability pills */}
          <div className="mfb-pills">
            <button
              type="button"
              className={`mfb-pill ${availabilityFilter === '' ? 'mfb-pill-active' : ''}`}
              onClick={() => setAvailabilityFilter('')}
            >All</button>
            <button
              type="button"
              className={`mfb-pill ${availabilityFilter === 'available' ? 'mfb-pill-active' : ''}`}
              onClick={() => setAvailabilityFilter('available')}
            >
              <span className="mfb-pill-dot mfb-dot-green" />Available
            </button>
            <button
              type="button"
              className={`mfb-pill ${availabilityFilter === 'out_of_stock' ? 'mfb-pill-active' : ''}`}
              onClick={() => setAvailabilityFilter('out_of_stock')}
            >
              <span className="mfb-pill-dot mfb-dot-red" />Out of Stock
            </button>
          </div>

          <div className="mfb-divider" />

          {/* Price range */}
          <div className="mfb-price-range">
            <span className="mfb-price-label">₱</span>
            <input
              type="number"
              min="0"
              placeholder="Min"
              className="mfb-price-input"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
            />
            <span className="mfb-price-dash">–</span>
            <input
              type="number"
              min="0"
              placeholder="Max"
              className="mfb-price-input"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
            />
          </div>

          {hasActiveFilters && (
            <>
              <div className="mfb-divider" />
              <button type="button" className="mfb-reset" onClick={handleResetFilters}>
                <RotateCcw size={12} /> Reset
              </button>
            </>
          )}
        </div>

        {!loading && !error && (
          <div className="menu-results-row">
            <span className="menu-results-count">
              {filteredProducts.length} item{filteredProducts.length !== 1 ? 's' : ''}
              {hasActiveFilters ? ' matched' : ' on menu'}
            </span>
            {hasActiveFilters && (
              <button className="menu-results-clear" onClick={handleResetFilters} type="button">
                Clear filters
              </button>
            )}
          </div>
        )}
      </section>

      {/* ─── Product Grid ─────────────────────────────────────── */}
      <section className="menu-grid-section">
        {loading ? (
          <div className="menu-state-center">
            <div className="menu-spinner-ring">
              <Loader2 size={28} className="menu-spin-icon" />
            </div>
            <p className="menu-state-sub">Loading the menu…</p>
          </div>
        ) : error ? (
          <div className="menu-state-center">
            <AlertCircle size={40} style={{ color: 'var(--color-unavailable)', marginBottom: '10px' }} />
            <div className="menu-state-title">Notice</div>
            <p className="menu-state-sub">{error}</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="menu-state-center">
            <Coffee size={52} className="menu-state-empty-icon" />
            <div className="menu-state-title">No items found</div>
            <p className="menu-state-sub">
              {hasActiveFilters
                ? 'Try widening your filters or clearing the search.'
                : 'Our digital menu is being refreshed.'}
            </p>
            {hasActiveFilters && (
              <button className="btn-secondary" onClick={handleResetFilters} style={{ marginTop: '16px' }}>
                Clear All Filters
              </button>
            )}
          </div>
        ) : (
          <div className="menu-products-grid">
            {filteredProducts.map((product, idx) => {
              const isAvail = Boolean(product.is_available);
              const inCart = cart.find((c) => c.id === product.id);
              const formattedPrice = Number(product.price).toLocaleString('en-PH', {
                style: 'currency',
                currency: 'PHP',
              });

              return (
                <article
                  key={product.id}
                  id={`product-card-${product.id}`}
                  className={`mpcard ${!isAvail ? 'mpcard-unavail' : ''} ${inCart ? 'mpcard-incart' : ''}`}
                  style={{ animationDelay: `${Math.min(idx * 45, 500)}ms` }}
                  onClick={() => isAvail && addToCart(product)}
                >
                  <div className="mpcard-img-wrap">
                    {product.image_url ? (
                      <img
                        src={getImageUrl(product.image_url)}
                        alt={product.name}
                        loading="lazy"
                        className="mpcard-img"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          const fb = e.currentTarget.parentElement.querySelector('.mpcard-fallback');
                          if (fb) fb.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div className="mpcard-fallback" style={{ display: product.image_url ? 'none' : 'flex' }}>
                      <Coffee size={38} strokeWidth={1.4} />
                    </div>

                    {!isAvail && (
                      <div className="mpcard-oos-overlay">
                        <span className="mpcard-oos-pill">
                          <CircleOff size={12} /> Out of Stock
                        </span>
                      </div>
                    )}

                    {product.category && (
                      <span className="mpcard-cat-badge">{product.category}</span>
                    )}

                    {inCart && isAvail && (
                      <div className="mpcard-incart-badge">
                        <CheckCircle2 size={13} />
                        <span>In Order</span>
                      </div>
                    )}
                  </div>

                  <div className="mpcard-body">
                    <h2 className="mpcard-name">{product.name}</h2>
                    <p className="mpcard-desc">{product.description || 'Freshly prepared upon order.'}</p>

                    <div className="mpcard-footer">
                      <span className="mpcard-price">{formattedPrice}</span>

                      {isAvail ? (
                        inCart ? (
                          <div className="mpcard-qty" onClick={(e) => e.stopPropagation()}>
                            <button type="button" onClick={() => updateQuantity(product.id, -1)}>
                              <Minus size={11} />
                            </button>
                            <span>{inCart.quantity}</span>
                            <button type="button" onClick={() => updateQuantity(product.id, 1)}>
                              <Plus size={11} />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="mpcard-add-btn"
                            onClick={(e) => { e.stopPropagation(); addToCart(product); }}
                          >
                            <Plus size={12} /> Add
                          </button>
                        )
                      ) : (
                        <span className="mpcard-oos-badge">
                          <CircleOff size={10} /> Unavailable
                        </span>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* ─── Floating Cart Pill ───────────────────────────────── */}
      {cart.length > 0 && !isOrderModalOpen && (
        <button
          className="fcart-pill"
          onClick={() => { setOrderStep(0); setIsOrderModalOpen(true); }}
        >
          <ShoppingBag size={19} />
          <div className="fcart-pill-info">
            <span className="fcart-pill-label">Your Order</span>
            <span className="fcart-pill-total">₱{cartTotal.toFixed(2)}</span>
          </div>
          <span className="fcart-pill-badge">{cartCount}</span>
        </button>
      )}

      {/* ─── Order Checkout Modal ─────────────────────────────── */}
      {isOrderModalOpen && (
        <div className="modal-overlay" onClick={() => setIsOrderModalOpen(false)}>
          <div className="order-drawer" onClick={(e) => e.stopPropagation()}>

            {/* Header */}
            <div className="order-drawer-head">
              <div>
                <h3 className="order-drawer-title font-serif">
                  {orderStep === 0 && 'Your Order'}
                  {orderStep === 1 && 'Delivery Details'}
                  {orderStep === 2 && 'Order Placed!'}
                </h3>
                <p className="order-drawer-sub">
                  {orderStep === 0 && `${cartCount} item${cartCount !== 1 ? 's' : ''} selected`}
                  {orderStep === 1 && 'Fill in your contact and drop-off info'}
                  {orderStep === 2 && 'Use your OTN to track your order'}
                </p>
              </div>
              <button className="order-drawer-close" type="button" onClick={() => setIsOrderModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            {/* Step tracker */}
            <div className="order-steps-bar">
              {['Cart', 'Delivery', 'Confirm'].map((label, i) => (
                <div key={i} className="order-step-item">
                  <div className={`order-step-node ${orderStep > i ? 'osn-done' : orderStep === i ? 'osn-active' : ''}`}>
                    {orderStep > i ? <CheckCircle2 size={12} /> : i + 1}
                  </div>
                  <span className={`order-step-lbl ${orderStep >= i ? 'osl-active' : ''}`}>{label}</span>
                  {i < 2 && <div className={`order-step-track ${orderStep > i ? 'ost-done' : ''}`} />}
                </div>
              ))}
            </div>

            {/* ── STEP 0: Cart Review ── */}
            {orderStep === 0 && (
              <div className="order-body">
                {cart.length === 0 ? (
                  <div className="menu-state-center" style={{ padding: '48px 0' }}>
                    <ShoppingBag size={44} className="menu-state-empty-icon" />
                    <div className="menu-state-title">Your cart is empty</div>
                    <p className="menu-state-sub">Browse the menu and tap items to add them.</p>
                  </div>
                ) : (
                  <>
                    <div className="cart-items-list">
                      {cart.map((item) => (
                        <div key={item.id} className="cart-item-row">
                          <div className="cart-item-info">
                            <span className="cart-item-name">{item.name}</span>
                            <span className="cart-item-unit">₱{Number(item.price).toFixed(2)} each</span>
                          </div>
                          <div className="cart-item-actions">
                            <div className="mpcard-qty">
                              <button type="button" onClick={() => updateQuantity(item.id, -1)}><Minus size={11} /></button>
                              <span>{item.quantity}</span>
                              <button type="button" onClick={() => updateQuantity(item.id, 1)}><Plus size={11} /></button>
                            </div>
                            <span className="cart-item-subtotal">₱{(item.price * item.quantity).toFixed(2)}</span>
                            <button type="button" className="cart-item-remove" onClick={() => removeFromCart(item.id)}>
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="cart-summary-box">
                      <div className="cart-summary-row">
                        <span>Items Subtotal</span><span>₱{cartSubtotal.toFixed(2)}</span>
                      </div>
                      <div className="cart-summary-row">
                        <span>Delivery Fee</span><span>₱{FIXED_DELIVERY_FEE.toFixed(2)}</span>
                      </div>
                      <div className="cart-summary-total">
                        <span>Total Due</span><span>₱{cartTotal.toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="order-footer-btns">
                      <button className="btn-secondary" type="button" onClick={() => setIsOrderModalOpen(false)}>
                        Keep Browsing
                      </button>
                      <button className="btn-primary" type="button" onClick={() => setOrderStep(1)}>
                        Delivery Info <ArrowRight size={15} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ── STEP 1: Delivery Info ── */}
            {orderStep === 1 && (
              <form onSubmit={handlePlaceOrder} className="order-body">
                <div className="order-form-fields">
                  <div className="order-form-field">
                    <label className="order-form-label"><User size={13} /> Full Name *</label>
                    <input className="order-form-input" placeholder="e.g. Maria Santos"
                      value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                  </div>
                  <div className="order-form-field">
                    <label className="order-form-label"><Phone size={13} /> Contact Number *</label>
                    <input className="order-form-input" placeholder="e.g. 0917-123-4567"
                      value={contactNumber} onChange={(e) => setContactNumber(e.target.value)} required />
                  </div>
                  <div className="order-form-field">
                    <label className="order-form-label"><MapPin size={13} /> Delivery Address *</label>
                    <textarea className="order-form-input order-form-textarea"
                      placeholder="House/Unit, Street, Barangay, City"
                      value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} required />
                  </div>
                  <div className="order-form-field">
                    <label className="order-form-label"><FileText size={13} /> Special Notes (Optional)</label>
                    <input className="order-form-input" placeholder="e.g. Less sugar, extra ice, ring bell"
                      value={notes} onChange={(e) => setNotes(e.target.value)} />
                  </div>
                </div>

                <div className="cart-summary-box" style={{ marginBottom: '20px' }}>
                  <div className="cart-summary-row">
                    <span>Items Subtotal</span><span>₱{cartSubtotal.toFixed(2)}</span>
                  </div>
                  <div className="cart-summary-row">
                    <span>Delivery Fee</span><span>₱{FIXED_DELIVERY_FEE.toFixed(2)}</span>
                  </div>
                  <div className="cart-summary-total">
                    <span>Total Amount</span><span>₱{cartTotal.toFixed(2)}</span>
                  </div>
                </div>

                <div className="order-footer-btns">
                  <button className="btn-secondary" type="button" onClick={() => setOrderStep(0)}>
                    <ArrowLeft size={15} /> Back
                  </button>
                  <button className="btn-primary" type="submit" disabled={submittingOrder}>
                    {submittingOrder
                      ? <><Loader2 size={15} className="menu-spin-icon" /> Placing…</>
                      : <>Place Order · ₱{cartTotal.toFixed(2)}</>
                    }
                  </button>
                </div>
              </form>
            )}

            {/* ── STEP 2: Confirmation Ticket ── */}
            {orderStep === 2 && confirmedOrder && (
              <div className="order-body order-confirm-body">
                {/* Success Icon & Title */}
                <div className="order-success-icon">
                  <CheckCircle2 size={38} />
                </div>
                <h3 className="font-serif order-success-title">Order Submitted Successfully!</h3>
                <div className="ticket-status-pill">
                  <span className="ticket-status-dot" /> Pending Cashier Approval
                </div>

                {/* ─── CRITICAL NOTICE CALLOUT ─── */}
                <div className="ticket-warning-banner">
                  <div className="ticket-warning-icon-wrap">
                    <AlertTriangle size={22} className="ticket-warning-icon" />
                  </div>
                  <div className="ticket-warning-text-wrap">
                    <strong className="ticket-warning-title">
                      ⚠️ Highly Recommended: Screenshot or Download This Ticket!
                    </strong>
                    <p className="ticket-warning-desc">
                      This confirmation ticket is only shown right now. Once closed, <strong>this ticket screen will be gone</strong>! 
                      The only way to check your order afterwards is by entering your <strong>OTN</strong> on the Track Order page. 
                      Click <strong>"Download Ticket (PNG)"</strong> below to save your complete ticket with QR code for the rider.
                    </p>
                  </div>
                </div>

                {/* ─── OFFICIAL TICKET CARD ─── */}
                <div className="customer-ticket-card">
                  {/* OTN Box */}
                  <div className="otn-box">
                    <div className="otn-label">ORDER TRACKING NUMBER (OTN)</div>
                    <div className="otn-number">{confirmedOrder.order_number}</div>
                    <button type="button" className="otn-copy-btn" onClick={copyOTN}>
                      <Copy size={13} /> Copy OTN
                    </button>
                  </div>

                  {/* Customer Information Section */}
                  <div className="ticket-section">
                    <div className="ticket-section-title">
                      <User size={13} /> Customer &amp; Delivery Details
                    </div>
                    <div className="ticket-info-grid">
                      <div className="ticket-info-item">
                        <span className="ticket-info-label">Customer Name:</span>
                        <span className="ticket-info-val">{confirmedOrder.customer_name}</span>
                      </div>
                      <div className="ticket-info-item">
                        <span className="ticket-info-label">Contact Number:</span>
                        <span className="ticket-info-val">{confirmedOrder.contact_number}</span>
                      </div>
                      <div className="ticket-info-item full-span">
                        <span className="ticket-info-label">Delivery Address:</span>
                        <span className="ticket-info-val">{confirmedOrder.delivery_address}</span>
                      </div>
                      {confirmedOrder.notes && (
                        <div className="ticket-info-item full-span">
                          <span className="ticket-info-label">Special Notes:</span>
                          <span className="ticket-info-val">{confirmedOrder.notes}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Ordered Items Breakdown */}
                  <div className="ticket-section">
                    <div className="ticket-section-title">
                      <ShoppingBag size={13} /> Ordered Products ({confirmedOrder.items?.length || 0})
                    </div>
                    <div className="ticket-items-list">
                      {confirmedOrder.items?.map((item, idx) => (
                        <div key={idx} className="ticket-item-row">
                          <span className="ticket-item-qty">{item.quantity}×</span>
                          <span className="ticket-item-name">{item.name}</span>
                          <span className="ticket-item-price">₱{(Number(item.price) * item.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '8px', marginTop: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--color-muted)', marginBottom: '4px' }}>
                        <span>Items Subtotal</span>
                        <span>₱{(confirmedOrder.items?.reduce((s, i) => s + Number(i.price) * i.quantity, 0) || 0).toFixed(2)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--color-muted)', marginBottom: '8px' }}>
                        <span>Delivery Fee</span>
                        <span>₱{Number(confirmedOrder.delivery_fee || FIXED_DELIVERY_FEE).toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="ticket-total-row">
                      <span>Total Amount Due</span>
                      <span className="ticket-total-val">₱{Number(confirmedOrder.total_amount).toFixed(2)}</span>
                    </div>
                  </div>

                  {/* QR Code Section Below Info */}
                  {qrDataUrl && (
                    <div className="ticket-qr-section">
                      <div className="ticket-qr-header">
                        <span className="ticket-qr-title">Rider Delivery Verification QR</span>
                        <span className="ticket-qr-subtitle">
                          Present this QR code to the rider upon arrival to confirm delivery or cancel on the spot.
                        </span>
                      </div>
                      <div className="ticket-qr-img-box">
                        <img src={qrDataUrl} alt="Order QR Code" className="ticket-qr-img" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer Buttons */}
                <div className="order-footer-btns ticket-footer-btns">
                  <button type="button" className="btn-ticket-download" onClick={downloadPNG}>
                    <Download size={16} /> Download Ticket (PNG)
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => {
                      setIsOrderModalOpen(false);
                      navigate(`/track?otn=${confirmedOrder.order_number}`);
                    }}
                  >
                    Track Order <ArrowRight size={15} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
