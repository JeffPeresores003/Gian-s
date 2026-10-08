import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import api, { getImageUrl } from '../lib/api';
import AdminSalesReport from '../components/AdminSalesReport';
import printReceiptSlip from '../lib/printReceipt';
import FlavorModal, { hasFlavors, cartKeyOf, displayName } from '../components/FlavorModal';
import {
  ShoppingBag,
  History,
  TrendingUp,
  Search,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  Calendar,
  LogOut,
  Coffee,
  Printer,
  X,
  CreditCard,
  Banknote,
  Smartphone,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Calculator as CalcIcon,
  RefreshCw,
  Loader2,
  ArrowRight,
  Clock,
  User,
  SlidersHorizontal,
  Download,
  PieChart as PieIcon,
  Activity,
  Package,
  AlertCircle,
  MapPin,
  Phone,
  Tag,
  Percent,
} from 'lucide-react';

export default function CashierPOSPage() {
  const { user, logout, isAdmin } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  // Active top navigation tab: 'pos' | 'history' | 'reports' | 'online'
  const [activeTab, setActiveTab] = useState('pos');

  // ---------- Online Orders State ----------
  const [onlineSubTab, setOnlineSubTab] = useState('pending'); // 'pending' | 'history'
  const [pendingOrders, setPendingOrders] = useState([]);
  const [loadingPendingOrders, setLoadingPendingOrders] = useState(false);
  const [pendingSearch, setPendingSearch] = useState('');
  const [onlineHistoryOrders, setOnlineHistoryOrders] = useState([]);
  const [loadingOnlineHistory, setLoadingOnlineHistory] = useState(false);
  const [onlineHistorySearch, setOnlineHistorySearch] = useState('');
  const [onlineHistoryDate, setOnlineHistoryDate] = useState('');
  const [addonModalOrder, setAddonModalOrder] = useState(null);
  const [selectedAddonProduct, setSelectedAddonProduct] = useState('');
  const [addonQuantity, setAddonQuantity] = useState(1);
  const [submittingAddon, setSubmittingAddon] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // ---------- Catalog & Menu State ----------
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // ---------- Order & Cart State ----------
  const [cart, setCart] = useState([]);
  const [flavorProduct, setFlavorProduct] = useState(null);
  const [customerName, setCustomerName] = useState('');
  const [orderType, setOrderType] = useState('dine-in'); // 'dine-in' | 'take-out'
  const [paymentMethod, setPaymentMethod] = useState('cash'); // 'cash' | 'gcash' | 'card'
  const [tenderedAmount, setTenderedAmount] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [submittingOrder, setSubmittingOrder] = useState(false);

  // ---------- Editable Discount State (Task 4) ----------
  const [discount, setDiscount] = useState({
    active: false,
    type: 'percent', // 'percent' | 'fixed'
    value: 20,
    name: '20% OFF',
  });
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [discountTypeInput, setDiscountTypeInput] = useState('percent');
  const [discountValueInput, setDiscountValueInput] = useState('20');
  const [discountNameInput, setDiscountNameInput] = useState('');

  const [showCalculator, setShowCalculator] = useState(false); // Collapsible on-screen keypad

  // ---------- Completed Order Receipt Modal ----------
  const [completedOrder, setCompletedOrder] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  // ---------- Order History State ----------
  const [historyOrders, setHistoryOrders] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyDate, setHistoryDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [historySearch, setHistorySearch] = useState('');
  const [viewingReceiptOrder, setViewingReceiptOrder] = useState(null);

  // ---------- Load Menu Catalog ----------
  const fetchProducts = async () => {
    setLoadingProducts(true);
    try {
      const res = await api.get('/products');
      setProducts(res.data?.products || []);
    } catch {
      addToast('Failed to load menu products.', 'error');
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Unique categories list
  const categories = useMemo(() => {
    const cats = Array.from(new Set(products.map((p) => p.category).filter(Boolean)));
    return ['All', ...cats];
  }, [products]);

  // Filtered products for catalog grid
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesCat = selectedCategory === 'All' || p.category === selectedCategory;
      const matchesSearch =
        searchQuery.trim() === '' ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase().trim());
      return matchesCat && matchesSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  // ---------- Cart Calculations (Task 4: Editable Discount) ----------
  const cartSubtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [cart]);

  const discountAmount = useMemo(() => {
    if (!discount.active || cartSubtotal <= 0) return 0;
    if (discount.type === 'percent') {
      const pct = Math.max(0, parseFloat(discount.value) || 0);
      return Math.min(cartSubtotal, (cartSubtotal * pct) / 100);
    } else {
      const fixed = Math.max(0, parseFloat(discount.value) || 0);
      return Math.min(cartSubtotal, fixed);
    }
  }, [discount, cartSubtotal]);

  const discountLabel = useMemo(() => {
    if (!discount.active) return '';
    if (discount.name?.trim()) return discount.name.trim();
    if (discount.type === 'percent') return `${discount.value}% OFF`;
    return `₱${parseFloat(discount.value || 0).toFixed(0)} OFF`;
  }, [discount]);

  const cartTotal = useMemo(() => {
    return Math.max(0, cartSubtotal - discountAmount);
  }, [cartSubtotal, discountAmount]);

  const numTendered = parseFloat(tenderedAmount) || 0;
  const changeDue = Math.max(0, numTendered - cartTotal);
  const amountShort = Math.max(0, cartTotal - numTendered);
  const isPaymentValid = paymentMethod !== 'cash' || numTendered >= cartTotal;

  // ---------- Cart Handlers ----------
  const addToCart = (product, flavor = null) => {
    if (!product.is_available) {
      addToast(`"${product.name}" is currently marked out of stock.`, 'info');
      return;
    }

    // Flavored products ask for a flavor first
    if (hasFlavors(product) && flavor === null) {
      setFlavorProduct(product);
      return;
    }

    const line = { ...product, flavor };
    const key = cartKeyOf(line);
    setCart((prev) => {
      const existing = prev.find((item) => cartKeyOf(item) === key);
      if (existing) {
        return prev.map((item) =>
          cartKeyOf(item) === key ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...line, quantity: 1 }];
    });
  };

  const updateQuantity = (key, delta) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (cartKeyOf(item) === key) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean)
    );
  };

  const removeFromCart = (key) => {
    setCart((prev) => prev.filter((item) => cartKeyOf(item) !== key));
  };

  const clearCart = () => {
    setCart([]);
    setTenderedAmount('');
    setCustomerName('');
    setOrderNotes('');
    setDiscount({ active: false, type: 'percent', value: 20, name: '20% OFF' });
  };

  // Quick cash buttons
  const setQuickCash = (amount) => {
    if (amount === 'exact') {
      setTenderedAmount(cartTotal > 0 ? cartTotal.toFixed(2) : '0');
    } else {
      setTenderedAmount(Number(amount).toFixed(2));
    }
  };

  // Calculator append
  const appendKeypad = (char) => {
    if (char === 'C') {
      setTenderedAmount('');
      return;
    }
    if (char === 'BS') {
      setTenderedAmount((prev) => prev.slice(0, -1));
      return;
    }
    if (char === '.' && tenderedAmount.includes('.')) return;
    setTenderedAmount((prev) => prev + char);
  };

  // ---------- Submit Order ----------
  const handleCheckout = async (e) => {
    e.preventDefault();
    if (cart.length === 0) {
      addToast('Cannot place order: Cart is empty.', 'error');
      return;
    }

    if (paymentMethod === 'cash' && numTendered < cartTotal) {
      addToast(`Cash tendered (₱${numTendered.toFixed(2)}) is less than total (₱${cartTotal.toFixed(2)}).`, 'error');
      return;
    }

    setSubmittingOrder(true);
    try {
      const payload = {
        customer_name: customerName.trim() || 'Guest',
        order_type: orderType,
        payment_method: paymentMethod,
        total_amount: cartTotal, // already discounted if discount.active
        amount_paid: paymentMethod === 'cash' ? numTendered : cartTotal,
        change_amount: paymentMethod === 'cash' ? changeDue : 0,
        notes: discount.active
          ? `[${discountLabel} (-₱${discountAmount.toFixed(2)})] ${orderNotes.trim() || ''}`.trim()
          : orderNotes.trim() || null,
        items: cart.map((item) => ({
          product_id: item.id,
          product_name: item.name,
          flavor: item.flavor || null,
          unit_price: item.price,        // always original unit price
          quantity: item.quantity,
          subtotal: item.price * item.quantity, // always original subtotal
        })),
      };

      const res = await api.post('/orders', payload);
      const newOrder = res.data?.order;

      // Show receipt popup
      setCompletedOrder({
        ...newOrder,
        items: [...cart],
      });
      setShowReceiptModal(true);

      addToast(`Order ${newOrder?.order_number || ''} placed successfully!`, 'success');
      clearCart();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to complete order.';
      addToast(msg, 'error');
    } finally {
      setSubmittingOrder(false);
    }
  };

  // ---------- Load Order History ----------
  const fetchOrderHistory = async () => {
    setLoadingHistory(true);
    try {
      const params = {};
      if (historyDate) params.date = historyDate;
      if (historySearch.trim()) params.search = historySearch.trim();

      const res = await api.get('/orders', { params });
      setHistoryOrders(res.data?.orders || []);
    } catch {
      addToast('Failed to load order history.', 'error');
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'history') {
      fetchOrderHistory();
    }
  }, [activeTab, historyDate]);

  const viewOrderReceipt = async (orderId) => {
    try {
      const res = await api.get(`/orders/${orderId}`);
      setViewingReceiptOrder(res.data?.order);
    } catch {
      addToast('Failed to fetch order details.', 'error');
    }
  };

  // ---------- Online Orders Handlers ----------
  const fetchPendingOrders = async () => {
    setLoadingPendingOrders(true);
    try {
      const params = {};
      if (pendingSearch.trim()) params.search = pendingSearch.trim();
      const res = await api.get('/online-orders/pending', { params });
      setPendingOrders(res.data?.orders || []);
    } catch {
      // quiet fail on background polling
    } finally {
      setLoadingPendingOrders(false);
    }
  };

  const fetchOnlineOrderHistory = async () => {
    setLoadingOnlineHistory(true);
    try {
      const params = {};
      if (onlineHistoryDate) params.date = onlineHistoryDate;
      if (onlineHistorySearch.trim()) params.search = onlineHistorySearch.trim();
      const res = await api.get('/online-orders/history', { params });
      setOnlineHistoryOrders(res.data?.orders || []);
    } catch {
      addToast('Failed to load online order history.', 'error');
    } finally {
      setLoadingOnlineHistory(false);
    }
  };

  const handleConfirmOnlineOrder = async (orderId) => {
    setActionLoadingId(orderId);
    try {
      await api.post(`/online-orders/${orderId}/confirm`, {
        payment_method: 'cash',
      });
      addToast('Online order confirmed and approved for rider delivery!', 'success');
      fetchPendingOrders();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to confirm order.', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCancelOnlineOrder = async (orderId) => {
    if (!window.confirm('Are you sure you want to cancel this online order?')) return;
    setActionLoadingId(orderId);
    try {
      await api.post(`/online-orders/${orderId}/cancel-cashier`);
      addToast('Order has been cancelled.', 'info');
      fetchPendingOrders();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to cancel order.', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleAddUpdatedItem = async (e) => {
    e.preventDefault();
    if (!addonModalOrder || !selectedAddonProduct) return;
    const prod = products.find((p) => p.id === parseInt(selectedAddonProduct, 10));
    if (!prod) return;

    setSubmittingAddon(true);
    try {
      await api.post(`/online-orders/${addonModalOrder.id}/update-item`, {
        product_id: prod.id,
        product_name: prod.name,
        unit_price: prod.price,
        quantity: addonQuantity,
      });
      addToast(`Added ${addonQuantity}x "${prod.name}" as add-on!`, 'success');
      setAddonModalOrder(null);
      setSelectedAddonProduct('');
      setAddonQuantity(1);
      fetchPendingOrders();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to add item.', 'error');
    } finally {
      setSubmittingAddon(false);
    }
  };

  const viewOnlineReceipt = async (orderId) => {
    try {
      const res = await api.get(`/online-orders/${orderId}/receipt`);
      setViewingReceiptOrder(res.data?.order);
    } catch {
      addToast('Failed to fetch online order receipt.', 'error');
    }
  };

  useEffect(() => {
    fetchPendingOrders();
    const interval = setInterval(() => {
      fetchPendingOrders();
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (activeTab === 'online') {
      if (onlineSubTab === 'pending') fetchPendingOrders();
      if (onlineSubTab === 'history') fetchOnlineOrderHistory();
    }
  }, [activeTab, onlineSubTab, onlineHistoryDate]);

  const handleLogout = async () => {
    await logout();
    addToast('Logged out of counter session.', 'info');
    navigate('/admin/login');
  };

  const handlePrint = () => {
    printReceiptSlip('printable-receipt');
  };


  return (
    <div className={`pos-layout ${activeTab === 'pos' ? 'pos-active-workspace' : ''}`}>
      {/* ─── Top Header / Navigation ─────────────────────────── */}
      <header className="pos-navbar">
        <div className="pos-nav-left">
          <div className="pos-brand">
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
              }}
            />
            <div>
              <div className="pos-brand-title">Gian&apos;s Foodhouse</div>
              <div className="pos-brand-sub">Counter POS &amp; Order Terminal</div>
            </div>
          </div>

          <nav className="pos-tabs">
            <button
              type="button"
              className={`pos-tab-btn ${activeTab === 'pos' ? 'active' : ''}`}
              onClick={() => setActiveTab('pos')}
              id="pos-tab-orders"
            >
              <ShoppingBag size={16} />
              <span>Counter POS</span>
            </button>
            <button
              type="button"
              className={`pos-tab-btn ${activeTab === 'history' ? 'active' : ''}`}
              onClick={() => setActiveTab('history')}
              id="pos-tab-history"
            >
              <History size={16} />
              <span>Order History</span>
            </button>
            <button
              type="button"
              className={`pos-tab-btn ${activeTab === 'reports' ? 'active' : ''}`}
              onClick={() => setActiveTab('reports')}
              id="pos-tab-reports"
            >
              <TrendingUp size={16} />
              <span>Sales Reports</span>
            </button>
            <button
              type="button"
              className={`pos-tab-btn ${activeTab === 'online' ? 'active' : ''}`}
              onClick={() => setActiveTab('online')}
              id="pos-tab-online"
              style={{ position: 'relative' }}
            >
              <Package size={16} />
              <span>Online Orders</span>
              {pendingOrders.length > 0 && (
                <span
                  style={{
                    marginLeft: '6px',
                    background: '#e11d48',
                    color: '#fff',
                    borderRadius: '10px',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '1px 6px',
                    display: 'inline-block',
                  }}
                >
                  {pendingOrders.length}
                </span>
              )}
            </button>
          </nav>
        </div>

        <div className="pos-nav-right">
          <span className="pos-user-badge">
            <User size={14} />
            <span>Cashier: <strong>{user?.username || 'Staff'}</strong></span>
          </span>

          {isAdmin && (
            <a
              href="/admin/dashboard"
              className="btn-pos-aux"
              title="Switch to Admin Dashboard"
            >
              <SlidersHorizontal size={14} />
              <span>Admin Portal</span>
            </a>
          )}

          <a
            href="/menu"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-pos-aux"
            title="Open customer digital menu"
          >
            <ExternalLink size={14} />
            <span>Public Menu</span>
          </a>

          <button
            type="button"
            className="btn-pos-logout"
            onClick={handleLogout}
            title="Sign out of POS"
            id="pos-logout-btn"
          >
            <LogOut size={15} />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* ─── TAB 1: POS COUNTER WORKSPACE ───────────────────── */}
      {activeTab === 'pos' && (
        <div className="pos-workspace">
          {/* Left Column: Product Selection & Catalog */}
          <div className="pos-catalog-column">
            {/* Search & Categories Bar */}
            <div className="pos-search-bar">
              <div className="search-wrap" style={{ flex: 1 }}>
                <Search className="search-icon" size={16} />
                <input
                  type="text"
                  className="search-input"
                  placeholder="Quick search coffee, meals, snacks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  id="pos-product-search"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                  >
                    <X size={14} color="#8C7A6B" />
                  </button>
                )}
              </div>

              <div className="pos-category-pills">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    className={`pos-pill ${selectedCategory === cat ? 'active' : ''}`}
                    onClick={() => setSelectedCategory(cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Products Grid */}
            <div className="pos-grid-container">
              {loadingProducts ? (
                <div className="state-center" style={{ minHeight: '350px' }}>
                  <Loader2 className="spinner" size={32} />
                  <p className="state-sub">Loading menu catalog...</p>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="state-center" style={{ minHeight: '350px' }}>
                  <Coffee size={40} className="state-icon" />
                  <div className="state-title">No items found</div>
                  <p className="state-sub">Try searching another keyword or category.</p>
                </div>
              ) : (
                <div className="pos-grid">
                  {filteredProducts.map((p) => {
                    const isAvail = Boolean(p.is_available);
                    const inCartQty = cart
                      .filter((c) => c.id === p.id)
                      .reduce((s, c) => s + c.quantity, 0);
                    const inCartItem = inCartQty > 0 ? { quantity: inCartQty } : null;

                    return (
                      <div
                        key={p.id}
                        className={`pos-card ${!isAvail ? 'out-of-stock' : ''}`}
                        onClick={() => addToCart(p)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === 'Enter' && addToCart(p)}
                        id={`pos-item-${p.id}`}
                      >
                        {/* Image Thumbnail */}
                        <div className="pos-card-img-wrap">
                          {p.image_url ? (
                            <img src={getImageUrl(p.image_url)} alt={p.name} className="pos-card-img" />
                          ) : (
                            <div className="pos-card-img-placeholder">
                              <Coffee size={24} color="#D4A96A" />
                            </div>
                          )}
                          {!isAvail && (
                            <div className="pos-badge-soldout">Out of Stock</div>
                          )}
                          {inCartItem && (
                            <div className="pos-badge-qty">{inCartItem.quantity}</div>
                          )}
                        </div>

                        {/* Details */}
                        <div className="pos-card-info">
                          <span className="pos-card-category">{p.category}</span>
                          <h4 className="pos-card-name" title={p.name}>{p.name}</h4>
                          <div className="pos-card-price">
                            ₱{Number(p.price).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Flavor picker modal */}
          {flavorProduct && (
            <FlavorModal
              product={flavorProduct}
              onClose={() => setFlavorProduct(null)}
              onSelect={(flavor) => {
                addToCart(flavorProduct, flavor);
                setFlavorProduct(null);
              }}
            />
          )}

          {/* Right Column: Active Order Cart & Calculator */}
          <div className="pos-cart-column">
            <div className="pos-cart-header">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 className="pos-cart-title">Current Order</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {/* Editable Discount / Promo Button */}
                  <button
                    type="button"
                    className={`btn-discount-toggle ${discount.active ? 'active' : ''}`}
                    onClick={() => {
                      setDiscountTypeInput(discount.type || 'percent');
                      setDiscountValueInput(String(discount.value || 20));
                      setDiscountNameInput(discount.name || '');
                      setShowDiscountModal(true);
                    }}
                    title={discount.active ? `Click to edit ${discountLabel}` : 'Click to apply discount / promo'}
                    id="pos-discount-toggle-btn"
                  >
                    <Tag size={12} />
                    <span className="discount-badge-text">{discount.active ? discountLabel : 'Discount'}</span>
                    {discount.active && <span className="discount-active-dot" />}
                  </button>

                  {cart.length > 0 && (
                    <button
                      type="button"
                      className="btn-pos-clear"
                      onClick={clearCart}
                      title="Clear order"
                    >
                      Clear All
                    </button>
                  )}
                </div>
              </div>

              {/* Customer & Order Type */}
              <div className="pos-order-meta">
                <input
                  type="text"
                  className="pos-customer-input"
                  placeholder="Customer Name / Table # (Optional)"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  id="pos-customer-name"
                />

                <div className="pos-type-toggle">
                  <button
                    type="button"
                    className={`pos-type-btn ${orderType === 'dine-in' ? 'active' : ''}`}
                    onClick={() => setOrderType('dine-in')}
                  >
                    Dine In
                  </button>
                  <button
                    type="button"
                    className={`pos-type-btn ${orderType === 'take-out' ? 'active' : ''}`}
                    onClick={() => setOrderType('take-out')}
                  >
                    Take Out
                  </button>
                </div>
              </div>
            </div>

            {/* Cart Items List */}
            <div className="pos-cart-items">
              {cart.length === 0 ? (
                <div className="pos-cart-empty">
                  <ShoppingBag size={40} strokeWidth={1.5} color="#C4B5A5" />
                  <p>Order is currently empty.</p>
                  <small>Tap products on the left to add items.</small>
                </div>
              ) : (
                cart.map((item) => (
                  <div key={cartKeyOf(item)} className="pos-cart-item">
                    <div className="pos-cart-item-info">
                      <div className="pos-cart-item-name">
                        {item.name}
                        {item.flavor && (
                          <span style={{ color: 'var(--color-brand)', fontWeight: 600 }}> ({item.flavor})</span>
                        )}
                      </div>
                      <div className="pos-cart-item-unit">
                        ₱{Number(item.price).toFixed(2)} each
                      </div>
                    </div>

                    <div className="pos-cart-qty-ctrl">
                      <button
                        type="button"
                        className="pos-qty-btn"
                        onClick={() => updateQuantity(cartKeyOf(item), -1)}
                        aria-label="Decrease quantity"
                      >
                        <Minus size={13} />
                      </button>
                      <span className="pos-qty-num">{item.quantity}</span>
                      <button
                        type="button"
                        className="pos-qty-btn"
                        onClick={() => updateQuantity(cartKeyOf(item), 1)}
                        aria-label="Increase quantity"
                      >
                        <Plus size={13} />
                      </button>
                    </div>

                    <div className="pos-cart-item-subtotal">
                      ₱{(item.price * item.quantity).toFixed(2)}
                    </div>

                    <button
                      type="button"
                      className="pos-cart-item-del"
                      onClick={() => removeFromCart(cartKeyOf(item))}
                      aria-label="Remove item"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Compact Total & Payment Footer (Task 5) */}
            <div className="pos-cart-footer compact">
              {/* Row 1: Total & Discount Tag */}
              <div className="pos-compact-total-row">
                <div className="pos-total-label-wrap">
                  <span className="pos-total-title">Total Amount</span>
                  {discount.active && cartSubtotal > 0 ? (
                    <span
                      className="pos-discount-tag"
                      onClick={() => {
                        setDiscountTypeInput(discount.type);
                        setDiscountValueInput(String(discount.value));
                        setDiscountNameInput(discount.name);
                        setShowDiscountModal(true);
                      }}
                      title="Click to edit discount"
                    >
                      🏷️ {discountLabel} (-₱{discountAmount.toFixed(2)})
                      <button
                        type="button"
                        className="pos-discount-tag-close"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDiscount({ active: false, type: 'percent', value: 20, name: '20% OFF' });
                        }}
                        title="Remove discount"
                      >
                        ✕
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="btn-add-promo-link"
                      onClick={() => setShowDiscountModal(true)}
                    >
                      + Promo / Discount
                    </button>
                  )}
                </div>
                <span className={`pos-compact-total-val ${discount.active ? 'total-discounted' : ''}`}>
                  ₱{cartTotal.toFixed(2)}
                </span>
              </div>

              {/* Row 2: Compact Payment Method Selector */}
              <div className="pos-payment-methods compact">
                <button
                  type="button"
                  className={`pos-method-btn ${paymentMethod === 'cash' ? 'active' : ''}`}
                  onClick={() => setPaymentMethod('cash')}
                >
                  <Banknote size={13} /> Cash
                </button>
                <button
                  type="button"
                  className={`pos-method-btn ${paymentMethod === 'gcash' ? 'active' : ''}`}
                  onClick={() => {
                    setPaymentMethod('gcash');
                    setTenderedAmount(cartTotal.toFixed(2));
                  }}
                >
                  <Smartphone size={13} /> GCash / QR
                </button>
                <button
                  type="button"
                  className={`pos-method-btn ${paymentMethod === 'card' ? 'active' : ''}`}
                  onClick={() => {
                    setPaymentMethod('card');
                    setTenderedAmount(cartTotal.toFixed(2));
                  }}
                >
                  <CreditCard size={13} /> Card
                </button>
              </div>

              {/* Row 3: Cash Tender & Change in ONE single horizontal row */}
              {paymentMethod === 'cash' && (
                <div className="pos-compact-cash-box">
                  <div className="pos-cash-input-row">
                    <span className="pos-cash-mini-label">Cash (₱):</span>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      className="pos-compact-tender-input"
                      placeholder="0.00"
                      value={tenderedAmount}
                      onChange={(e) => setTenderedAmount(e.target.value)}
                      id="pos-cash-tendered-input"
                    />
                    <button
                      type="button"
                      className="pos-btn-exact"
                      onClick={() => setQuickCash('exact')}
                      title="Set tendered amount to exact total"
                    >
                      Exact
                    </button>

                    <div className="pos-compact-change-pill">
                      {cartTotal > 0 && numTendered > 0 ? (
                        numTendered >= cartTotal ? (
                          <span className="pill-change-success">Change: ₱{changeDue.toFixed(2)}</span>
                        ) : (
                          <span className="pill-change-warning">Short: ₱{amountShort.toFixed(2)}</span>
                        )
                      ) : (
                        <span className="pill-change-neutral">Enter cash above</span>
                      )}
                    </div>

                    <button
                      type="button"
                      className={`btn-toggle-keypad-mini ${showCalculator ? 'active' : ''}`}
                      onClick={() => setShowCalculator((prev) => !prev)}
                      id="pos-toggle-keypad-btn"
                      title={showCalculator ? 'Hide Keypad' : 'Show Keypad'}
                    >
                      <CalcIcon size={12} />
                      <span>Keypad</span>
                      {showCalculator ? <ChevronDown size={11} /> : <ChevronUp size={11} />}
                    </button>
                  </div>

                  {/* Collapsible Keypad & Quick Cash */}
                  {showCalculator && (
                    <div className="pos-compact-keypad-dropdown">
                      <div className="pos-quick-cash-row compact">
                        <button type="button" onClick={() => setQuickCash(50)}>₱50</button>
                        <button type="button" onClick={() => setQuickCash(100)}>₱100</button>
                        <button type="button" onClick={() => setQuickCash(200)}>₱200</button>
                        <button type="button" onClick={() => setQuickCash(500)}>₱500</button>
                        <button type="button" onClick={() => setQuickCash(1000)}>₱1000</button>
                      </div>

                      <div className="pos-num-pad compact">
                        {['7', '8', '9', '4', '5', '6', '1', '2', '3', '0', '.', 'C'].map((k) => (
                          <button
                            key={k}
                            type="button"
                            className="pos-pad-btn compact"
                            onClick={() => appendKeypad(k)}
                          >
                            {k}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Row 4: Complete Order Button */}
              <button
                type="button"
                className="btn-pos-checkout compact"
                disabled={cart.length === 0 || submittingOrder || !isPaymentValid}
                onClick={handleCheckout}
                id="pos-submit-order-btn"
              >
                {submittingOrder ? (
                  <>
                    <Loader2 className="spinner" size={15} />
                    <span>Processing Order...</span>
                  </>
                ) : (
                  <>
                    <span>Place Order &bull; ₱{cartTotal.toFixed(2)}</span>
                    <ArrowRight size={15} />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 2: ORDER HISTORY ────────────────────────────── */}
      {activeTab === 'history' && (
        <div className="pos-history-container">
          <div className="pos-history-top">
            <div>
              <h2 className="pos-section-title">Order History</h2>
              <p className="pos-section-sub">Inspect past orders, customer payments, and receipts</p>
            </div>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={16} color="#8C7A6B" />
                <input
                  type="date"
                  className="pos-date-picker"
                  value={historyDate}
                  onChange={(e) => setHistoryDate(e.target.value)}
                  id="pos-history-date-picker"
                />
              </div>

              <button
                type="button"
                className="btn-pos-aux"
                onClick={fetchOrderHistory}
                title="Refresh history"
              >
                <RefreshCw size={14} /> Refresh
              </button>
            </div>
          </div>

          {/* Search Filter */}
          <div className="pos-history-search-row">
            <div className="search-wrap" style={{ maxWidth: '400px' }}>
              <Search className="search-icon" size={16} />
              <input
                type="text"
                className="search-input"
                placeholder="Search by order # or customer..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchOrderHistory()}
              />
            </div>
          </div>

          {/* Orders Table */}
          <div className="pos-table-card">
            {loadingHistory ? (
              <div className="state-center" style={{ minHeight: '300px' }}>
                <Loader2 className="spinner" size={28} />
                <p className="state-sub">Loading orders...</p>
              </div>
            ) : historyOrders.length === 0 ? (
              <div className="state-center" style={{ minHeight: '300px' }}>
                <ShoppingBag size={40} className="state-icon" />
                <div className="state-title">No orders found</div>
                <p className="state-sub">No sales registered for this date or search filter.</p>
              </div>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Order #</th>
                    <th>Time</th>
                    <th>Customer</th>
                    <th>Type</th>
                    <th>Items</th>
                    <th>Total</th>
                    <th>Payment</th>
                    <th>Change</th>
                    <th>Cashier</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {historyOrders.map((ord) => {
                    const timeStr = new Date(ord.created_at).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                    });

                    return (
                      <tr key={ord.id}>
                        <td>
                          <span style={{ fontWeight: 600, fontFamily: 'monospace', color: 'var(--color-brand)' }}>
                            {ord.order_number}
                          </span>
                        </td>
                        <td>{timeStr}</td>
                        <td>{ord.customer_name}</td>
                        <td>
                          <span className={`pos-badge-type ${ord.order_type}`}>
                            {ord.order_type === 'dine-in' ? 'Dine In' : 'Take Out'}
                          </span>
                        </td>
                        <td>{ord.item_count} items</td>
                        <td>
                          <strong>₱{Number(ord.total_amount).toFixed(2)}</strong>
                        </td>
                        <td style={{ textTransform: 'capitalize' }}>
                          {ord.payment_method} (₱{Number(ord.amount_paid).toFixed(2)})
                        </td>
                        <td>₱{Number(ord.change_amount).toFixed(2)}</td>
                        <td>{ord.cashier_name}</td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            type="button"
                            className="btn-receipt-view"
                            onClick={() => viewOrderReceipt(ord.id)}
                            id={`view-receipt-${ord.id}`}
                          >
                            <Printer size={13} />
                            <span>Receipt</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ─── TAB 3: SALES REPORTS ────────────────────────────── */}
      {activeTab === 'reports' && <AdminSalesReport />}

      {/* ─── TAB 4: ONLINE ORDERS (PENDING & HISTORY) ───────── */}
      {activeTab === 'online' && (
        <div className="pos-history-container">
          <div className="pos-history-top" style={{ flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h2 className="pos-section-title">Online Orders Management</h2>
              <p className="pos-section-sub">
                Approve pending orders, upsale additional items, and review delivery history
              </p>
            </div>

            {/* Sub-tabs pills */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                type="button"
                className={`pos-pill ${onlineSubTab === 'pending' ? 'active' : ''}`}
                onClick={() => setOnlineSubTab('pending')}
                style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                id="pos-online-subtab-pending"
              >
                <span>Pending Orders</span>
                {pendingOrders.length > 0 && (
                  <span
                    style={{
                      marginLeft: '6px',
                      background: '#e11d48',
                      color: '#fff',
                      borderRadius: '8px',
                      padding: '1px 6px',
                      fontSize: '0.72rem',
                    }}
                  >
                    {pendingOrders.length}
                  </span>
                )}
              </button>
              <button
                type="button"
                className={`pos-pill ${onlineSubTab === 'history' ? 'active' : ''}`}
                onClick={() => setOnlineSubTab('history')}
                style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                id="pos-online-subtab-history"
              >
                <span>Online Order History</span>
              </button>
            </div>
          </div>

          {/* ── Sub-tab 1: Pending Orders ── */}
          {onlineSubTab === 'pending' && (
            <>
              <div className="pos-history-search-row" style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                <div className="search-wrap" style={{ maxWidth: '420px', flex: 1 }}>
                  <Search className="search-icon" size={16} />
                  <input
                    type="text"
                    className="search-input"
                    placeholder="Search pending by OTN, customer name, contact..."
                    value={pendingSearch}
                    onChange={(e) => setPendingSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && fetchPendingOrders()}
                  />
                </div>
                <button
                  type="button"
                  className="btn-pos-aux"
                  onClick={fetchPendingOrders}
                  title="Refresh pending orders"
                >
                  <RefreshCw size={14} /> Refresh
                </button>
              </div>

              <div className="pos-table-card">
                {loadingPendingOrders ? (
                  <div className="state-center" style={{ minHeight: '280px' }}>
                    <Loader2 className="spinner" size={28} />
                    <p className="state-sub">Loading pending online orders...</p>
                  </div>
                ) : pendingOrders.length === 0 ? (
                  <div className="state-center" style={{ minHeight: '280px' }}>
                    <Package size={40} className="state-icon" />
                    <div className="state-title">No pending orders</div>
                    <p className="state-sub">All online orders have been processed or confirmed.</p>
                  </div>
                ) : (
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>OTN / Time</th>
                        <th>Customer</th>
                        <th>Delivery Address</th>
                        <th>Items</th>
                        <th>Notes</th>
                        <th>Total</th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingOrders.map((ord) => {
                        const timeStr = new Date(ord.created_at).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                        });
                        const isLoading = actionLoadingId === ord.id;

                        return (
                          <tr key={ord.id}>
                            <td>
                              <div style={{ fontWeight: 600, fontFamily: 'monospace', color: 'var(--color-brand)' }}>
                                {ord.order_number}
                              </div>
                              <div style={{ fontSize: '0.78rem', color: '#8C7A6B' }}>{timeStr}</div>
                            </td>
                            <td>
                              <div style={{ fontWeight: 600 }}>{ord.customer_name}</div>
                              <div style={{ fontSize: '0.78rem', color: '#666', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Phone size={11} /> {ord.contact_number}
                              </div>
                            </td>
                            <td>
                              <div style={{ maxWidth: '240px', fontSize: '0.85rem', lineHeight: 1.4 }}>
                                {ord.delivery_address}
                              </div>
                            </td>
                            <td>
                              <span style={{ fontWeight: 600 }}>{ord.item_count} items</span>
                              {Boolean(ord.updated_item_count) && (
                                <div style={{ fontSize: '0.75rem', color: '#C8873A', fontWeight: 700 }}>
                                  +{ord.updated_item_count} upsale(s)
                                </div>
                              )}
                            </td>
                            <td>
                              <div style={{ maxWidth: '180px', fontSize: '0.8rem', color: ord.notes ? '#333' : '#999', fontStyle: ord.notes ? 'normal' : 'italic' }}>
                                {ord.notes || 'None'}
                              </div>
                            </td>
                            <td>
                              <strong style={{ fontSize: '1rem', color: 'var(--color-brand)' }}>
                                ₱{Number(ord.total_amount).toFixed(2)}
                              </strong>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                                {/* Confirm Button */}
                                <button
                                  type="button"
                                  className="btn-save"
                                  style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                                  disabled={isLoading}
                                  onClick={() => handleConfirmOnlineOrder(ord.id)}
                                  title="Approve order for delivery"
                                >
                                  {isLoading ? <Loader2 className="spinner" size={12} /> : <CheckCircle2 size={13} />}
                                  <span>Confirm</span>
                                </button>

                                {/* Upsale Button */}
                                <button
                                  type="button"
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    padding: '6px 12px',
                                    fontSize: '0.8rem',
                                    fontWeight: 700,
                                    background: 'linear-gradient(135deg, #C8873A, #D4A96A)',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '7px',
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap',
                                  }}
                                  onClick={() => {
                                    setAddonModalOrder(ord);
                                    setSelectedAddonProduct('');
                                    setAddonQuantity(1);
                                  }}
                                  title="Upsale — add extra products to this order"
                                >
                                  <Plus size={13} />
                                  <span>Upsale</span>
                                </button>

                                {/* Receipt Button */}
                                <button
                                  type="button"
                                  className="btn-receipt-view"
                                  style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                                  onClick={() => viewOnlineReceipt(ord.id)}
                                  title="View order receipt"
                                >
                                  <Printer size={13} />
                                </button>

                                {/* Cancel Button */}
                                <button
                                  type="button"
                                  className="btn-delete"
                                  style={{ padding: '6px 10px', fontSize: '0.8rem', background: 'transparent', border: '1px solid #dc3232', color: '#dc3232' }}
                                  disabled={isLoading}
                                  onClick={() => handleCancelOnlineOrder(ord.id)}
                                  title="Cancel order"
                                >
                                  <X size={13} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}

          {/* ── Sub-tab 2: Online Order History ── */}
          {onlineSubTab === 'history' && (
            <>
              <div className="pos-history-top" style={{ marginTop: '4px' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Calendar size={16} color="#8C7A6B" />
                    <input
                      type="date"
                      className="pos-date-picker"
                      value={onlineHistoryDate}
                      onChange={(e) => setOnlineHistoryDate(e.target.value)}
                    />
                  </div>

                  <button
                    type="button"
                    className="btn-pos-aux"
                    onClick={fetchOnlineOrderHistory}
                    title="Refresh history"
                  >
                    <RefreshCw size={14} /> Refresh
                  </button>
                </div>

                <div className="search-wrap" style={{ maxWidth: '350px' }}>
                  <Search className="search-icon" size={16} />
                  <input
                    type="text"
                    className="search-input"
                    placeholder="Search OTN or customer..."
                    value={onlineHistorySearch}
                    onChange={(e) => setOnlineHistorySearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && fetchOnlineOrderHistory()}
                  />
                </div>
              </div>

              <div className="pos-table-card">
                {loadingOnlineHistory ? (
                  <div className="state-center" style={{ minHeight: '300px' }}>
                    <Loader2 className="spinner" size={28} />
                    <p className="state-sub">Loading online order history...</p>
                  </div>
                ) : onlineHistoryOrders.length === 0 ? (
                  <div className="state-center" style={{ minHeight: '300px' }}>
                    <Package size={40} className="state-icon" />
                    <div className="state-title">No online orders found</div>
                    <p className="state-sub">No confirmed or completed orders matching the filter.</p>
                  </div>
                ) : (
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>OTN</th>
                        <th>Date &amp; Time</th>
                        <th>Customer</th>
                        <th>Address</th>
                        <th>Status</th>
                        <th>Rider</th>
                        <th>Total</th>
                        <th>Cashier</th>
                        <th style={{ textAlign: 'right' }}>Receipt</th>
                      </tr>
                    </thead>
                    <tbody>
                      {onlineHistoryOrders.map((ord) => {
                        const dateStr = new Date(ord.created_at).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        });

                        const statusBadgeStyle = {
                          confirmed: { bg: '#e0f2fe', color: '#0369a1', text: 'Confirmed' },
                          to_deliver: { bg: '#fef3c7', color: '#b45309', text: 'On the Way' },
                          delivered: { bg: '#dcfce7', color: '#15803d', text: 'Delivered' },
                          cancelled: { bg: '#fee2e2', color: '#b91c1c', text: 'Cancelled' },
                        }[ord.status] || { bg: '#f3f4f6', color: '#4b5563', text: ord.status };

                        return (
                          <tr key={ord.id}>
                            <td>
                              <span style={{ fontWeight: 600, fontFamily: 'monospace', color: 'var(--color-brand)' }}>
                                {ord.order_number}
                              </span>
                            </td>
                            <td style={{ fontSize: '0.82rem' }}>{dateStr}</td>
                            <td>
                              <div style={{ fontWeight: 600 }}>{ord.customer_name}</div>
                              <div style={{ fontSize: '0.75rem', color: '#666' }}>{ord.contact_number}</div>
                            </td>
                            <td style={{ maxWidth: '200px', fontSize: '0.82rem' }}>
                              {ord.delivery_address}
                            </td>
                            <td>
                              <span
                                style={{
                                  display: 'inline-block',
                                  padding: '3px 9px',
                                  borderRadius: '12px',
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  background: statusBadgeStyle.bg,
                                  color: statusBadgeStyle.color,
                                }}
                              >
                                {statusBadgeStyle.text}
                              </span>
                            </td>
                            <td>
                              <span style={{ fontSize: '0.85rem' }}>{ord.rider_name || '—'}</span>
                            </td>
                            <td>
                              <strong>₱{Number(ord.total_amount).toFixed(2)}</strong>
                            </td>
                            <td style={{ fontSize: '0.85rem' }}>{ord.cashier_name || '—'}</td>
                            <td style={{ textAlign: 'right' }}>
                              <button
                                type="button"
                                className="btn-receipt-view"
                                onClick={() => viewOnlineReceipt(ord.id)}
                              >
                                <Printer size={13} />
                                <span>Receipt</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ─── ADD-ON / UPSELL MODAL ──────────────────────────── */}
      {addonModalOrder && (
        <div className="modal-overlay" onClick={() => setAddonModalOrder(null)}>
          <div className="modal-card" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--color-brand)' }}>
                  Upsale Product to Order
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: '#8C7A6B' }}>
                  {addonModalOrder.order_number} &bull; {addonModalOrder.customer_name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAddonModalOrder(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
              >
                <X size={18} color="#8C7A6B" />
              </button>
            </div>

            <form onSubmit={handleAddUpdatedItem}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
                  Select Menu Product *
                </label>
                <select
                  className="search-input"
                  style={{ width: '100%' }}
                  value={selectedAddonProduct}
                  onChange={(e) => setSelectedAddonProduct(e.target.value)}
                  required
                >
                  <option value="">-- Choose item from menu --</option>
                  {products
                    .filter((p) => p.is_available)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} — ₱{Number(p.price).toFixed(2)} ({p.category})
                      </option>
                    ))}
                </select>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
                  Quantity
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    className="btn-pos-aux"
                    style={{ width: '36px', height: '36px', padding: 0, justifyContent: 'center' }}
                    onClick={() => setAddonQuantity((q) => Math.max(1, q - 1))}
                  >
                    <Minus size={14} />
                  </button>
                  <input
                    type="number"
                    min="1"
                    className="search-input"
                    style={{ width: '70px', textAlign: 'center' }}
                    value={addonQuantity}
                    onChange={(e) => setAddonQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  />
                  <button
                    type="button"
                    className="btn-pos-aux"
                    style={{ width: '36px', height: '36px', padding: 0, justifyContent: 'center' }}
                    onClick={() => setAddonQuantity((q) => q + 1)}
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>

              {selectedAddonProduct && (() => {
                const prod = products.find((p) => p.id === parseInt(selectedAddonProduct, 10));
                if (!prod) return null;
                const addition = prod.price * addonQuantity;
                const newTotal = Number(addonModalOrder.total_amount) + addition;

                return (
                  <div
                    style={{
                      background: '#FAF7F2',
                      border: '1px solid #E5DCD0',
                      borderRadius: '8px',
                      padding: '12px',
                      marginBottom: '20px',
                      fontSize: '0.85rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span>Upsale Subtotal:</span>
                      <strong>+₱{addition.toFixed(2)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-brand)', fontWeight: 700 }}>
                      <span>Updated Order Total:</span>
                      <span>₱{newTotal.toFixed(2)}</span>
                    </div>
                  </div>
                );
              })()}

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn-pos-aux"
                  onClick={() => setAddonModalOrder(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-save"
                  disabled={submittingAddon || !selectedAddonProduct}
                >
                  {submittingAddon ? (
                    <><Loader2 className="spinner" size={14} /> Adding...</>
                  ) : (
                    <><Plus size={14} /> Add to Order</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── DISCOUNT / PROMO MODAL (Task 4) ─── */}
      {showDiscountModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowDiscountModal(false)}
          style={{ zIndex: 1100 }}
        >
          <div
            className="modal-card"
            style={{ maxWidth: '440px', padding: '24px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header" style={{ marginBottom: '16px' }}>
              <div>
                <h3 className="modal-title" style={{ fontSize: '1.25rem', margin: 0 }}>
                  Order Discount / Promo
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: 'var(--color-muted)' }}>
                  Current Order Subtotal: <strong style={{ color: 'var(--color-brand)' }}>₱{cartSubtotal.toFixed(2)}</strong>
                </p>
              </div>
              <button
                type="button"
                className="btn-pos-clear"
                onClick={() => setShowDiscountModal(false)}
                style={{ padding: '4px 8px' }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Quick Presets */}
            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-brand)', marginBottom: '8px' }}>
                Quick Preset Promos
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                <button
                  type="button"
                  className={`pos-discount-preset-btn ${discount.active && discount.type === 'percent' && Number(discount.value) === 20 ? 'active' : ''}`}
                  onClick={() => {
                    setDiscount({ active: true, type: 'percent', value: 20, name: '20% OFF' });
                    setShowDiscountModal(false);
                    addToast('Applied 20% discount!', 'success');
                  }}
                >
                  <Percent size={14} /> 20% Standard OFF
                </button>
                <button
                  type="button"
                  className={`pos-discount-preset-btn ${discount.active && discount.type === 'percent' && Number(discount.value) === 10 ? 'active' : ''}`}
                  onClick={() => {
                    setDiscount({ active: true, type: 'percent', value: 10, name: '10% OFF' });
                    setShowDiscountModal(false);
                    addToast('Applied 10% promo discount!', 'success');
                  }}
                >
                  <Percent size={14} /> 10% Promo OFF
                </button>
                <button
                  type="button"
                  className={`pos-discount-preset-btn ${discount.active && discount.type === 'fixed' && Number(discount.value) === 100 ? 'active' : ''}`}
                  onClick={() => {
                    setDiscount({ active: true, type: 'fixed', value: 100, name: '₱100 OFF Promo' });
                    setShowDiscountModal(false);
                    addToast('Applied ₱100 OFF promo discount!', 'success');
                  }}
                >
                  <Tag size={14} /> ₱100 OFF Promo
                </button>
                <button
                  type="button"
                  className={`pos-discount-preset-btn ${discount.active && discount.type === 'fixed' && Number(discount.value) === 50 ? 'active' : ''}`}
                  onClick={() => {
                    setDiscount({ active: true, type: 'fixed', value: 50, name: '₱50 OFF Promo' });
                    setShowDiscountModal(false);
                    addToast('Applied ₱50 OFF promo discount!', 'success');
                  }}
                >
                  <Tag size={14} /> ₱50 OFF Promo
                </button>
              </div>
            </div>

            {/* Custom Discount Form */}
            <div style={{
              background: 'var(--color-cream)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: '14px',
              marginBottom: '18px'
            }}>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-brand)', marginBottom: '8px' }}>
                Custom Promo / Discount Amount
              </label>

              {/* Type Switcher */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '10px' }}>
                <button
                  type="button"
                  className={`pos-discount-type-tab ${discountTypeInput === 'percent' ? 'active' : ''}`}
                  onClick={() => setDiscountTypeInput('percent')}
                >
                  % Percentage Off
                </button>
                <button
                  type="button"
                  className={`pos-discount-type-tab ${discountTypeInput === 'fixed' ? 'active' : ''}`}
                  onClick={() => setDiscountTypeInput('fixed')}
                >
                  ₱ Fixed Pesos Off
                </button>
              </div>

              {/* Amount input */}
              <div style={{ position: 'relative', marginBottom: '8px' }}>
                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontWeight: 800, color: 'var(--color-brand)', fontSize: '0.95rem' }}>
                  {discountTypeInput === 'percent' ? '%' : '₱'}
                </span>
                <input
                  type="number"
                  step="any"
                  min="0"
                  placeholder={discountTypeInput === 'percent' ? 'Enter percentage (e.g. 15)' : 'Enter amount in Pesos (e.g. 100)'}
                  value={discountValueInput}
                  onChange={(e) => setDiscountValueInput(e.target.value)}
                  className="order-form-input"
                  style={{ paddingLeft: '32px', height: '38px', fontSize: '0.95rem', fontWeight: 700 }}
                />
              </div>

              {/* Custom Label input */}
              <input
                type="text"
                placeholder="Optional Promo Label (e.g. Weekend Promo, Senior, VIP)"
                value={discountNameInput}
                onChange={(e) => setDiscountNameInput(e.target.value)}
                className="order-form-input"
                style={{ height: '36px', fontSize: '0.82rem' }}
              />
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
              {discount.active && (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setDiscount({ active: false, type: 'percent', value: 20, name: '20% OFF' });
                    setShowDiscountModal(false);
                    addToast('Discount removed.', 'info');
                  }}
                  style={{ marginRight: 'auto', color: '#B91C1C', borderColor: '#FCA5A5' }}
                >
                  Remove Discount
                </button>
              )}
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowDiscountModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  const val = parseFloat(discountValueInput);
                  if (isNaN(val) || val <= 0) {
                    addToast('Please enter a valid discount amount.', 'error');
                    return;
                  }
                  if (discountTypeInput === 'percent' && val > 100) {
                    addToast('Percentage discount cannot exceed 100%.', 'error');
                    return;
                  }
                  const name = discountNameInput.trim()
                    ? discountNameInput.trim()
                    : discountTypeInput === 'percent' ? `${val}% OFF` : `₱${val} OFF`;
                  setDiscount({
                    active: true,
                    type: discountTypeInput,
                    value: val,
                    name,
                  });
                  setShowDiscountModal(false);
                  addToast(`Applied discount: ${name}!`, 'success');
                }}
              >
                Apply Discount
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── RECEIPT POPUP MODAL (After Checkout or from History) ─── */}
      {(showReceiptModal && completedOrder) || viewingReceiptOrder ? (
        <div
          className="modal-overlay"
          onClick={() => {
            setShowReceiptModal(false);
            setCompletedOrder(null);
            setViewingReceiptOrder(null);
          }}
        >
          <div
            className="modal-card receipt-card"
            style={{ maxWidth: '360px', width: '100%', margin: '0 auto', padding: '16px' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Printable Receipt Paper */}
            <div className="receipt-paper" id="printable-receipt">
              <div className="receipt-header">
                <img
                  src="/gians.png"
                  alt="Gian's Logo"
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    objectFit: 'contain',
                    margin: '0 auto 6px auto',
                    display: 'block',
                  }}
                />
                <div className="receipt-logo">Gian&apos;s Foodhouse</div>
                <div className="receipt-sub">Poblacion, San Miguel, Bohol</div>
                <div className="receipt-sub">Tel: 0950 498 1269</div>
                <div className="receipt-divider">- - - - - - - - - - - - - - - - - - - -</div>
              </div>

              {(() => {
                const order = completedOrder || viewingReceiptOrder;
                const dateStr = new Date(order.created_at || Date.now()).toLocaleString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <>
                    <div className="receipt-meta">
                      <div><span>Order #:</span> <strong>{order.order_number}</strong></div>
                      <div><span>Date:</span> {dateStr}</div>
                      <div><span>Customer:</span> {order.customer_name || 'Guest'}</div>
                      <div>
                        <span>Type:</span>{' '}
                        {order.order_type === 'dine-in'
                          ? 'DINE IN'
                          : order.order_type === 'online'
                          ? 'ONLINE DELIVERY'
                          : 'TAKE OUT'}
                      </div>
                      {order.delivery_address && (
                        <div><span>Address:</span> {order.delivery_address}</div>
                      )}
                      {order.contact_number && (
                        <div><span>Contact:</span> {order.contact_number}</div>
                      )}
                      {order.rider_name && (
                        <div><span>Rider:</span> {order.rider_name}</div>
                      )}
                      <div><span>Cashier:</span> {order.cashier_name || user?.username}</div>
                    </div>

                    <div className="receipt-divider">- - - - - - - - - - - - - - - - - - - -</div>

                    <div className="receipt-items-table">
                      <div className="receipt-table-header">
                        <span>Item</span>
                        <span style={{ textAlign: 'center' }}>Qty</span>
                        <span style={{ textAlign: 'right' }}>Amount</span>
                      </div>

                      {order.items?.map((item, idx) => (
                        <div key={idx} className="receipt-item-row">
                          <span className="receipt-item-title">
                            {item.name ? displayName(item) : item.product_name}
                            {Boolean(item.is_updated) && (
                              <span style={{ fontSize: '0.72rem', color: '#C8873A', marginLeft: '5px', fontWeight: 700 }}>
                                (Upsale)
                              </span>
                            )}
                          </span>
                          <span style={{ textAlign: 'center' }}>{item.quantity}</span>
                          <span style={{ textAlign: 'right' }}>
                            ₱{(Number(item.price || item.unit_price) * item.quantity).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="receipt-divider">- - - - - - - - - - - - - - - - - - - -</div>

                    <div className="receipt-totals">
                      {/* Show discount line on receipt for fresh orders */}
                      {completedOrder && discount.active && (
                        <>
                          <div className="receipt-total-row">
                            <span>Subtotal:</span>
                            <span>₱{cartSubtotal.toFixed(2)}</span>
                          </div>
                          <div className="receipt-total-row" style={{ color: '#16a34a', fontWeight: 700 }}>
                            <span>Discount ({discountLabel}):</span>
                            <span>-₱{discountAmount.toFixed(2)}</span>
                          </div>
                        </>
                      )}
                      {/* Show discount note from history receipts */}
                      {viewingReceiptOrder && order.notes?.includes('[') && (order.notes?.includes('Discount') || order.notes?.includes('OFF')) && (
                        <div className="receipt-total-row" style={{ color: '#16a34a', fontSize: '0.78rem' }}>
                          <span>🏷️ {order.notes.match(/\[(.*?)\]/)?.[1] || 'Discount Applied'}</span>
                        </div>
                      )}
                      <div className="receipt-total-row final">
                        <span>TOTAL DUE:</span>
                        <span>₱{Number(order.total_amount).toFixed(2)}</span>
                      </div>
                      <div className="receipt-total-row">
                        <span>Cash Tendered:</span>
                        <span>₱{Number(order.amount_paid).toFixed(2)}</span>
                      </div>
                      <div className="receipt-total-row">
                        <span>CHANGE:</span>
                        <span>₱{Number(order.change_amount).toFixed(2)}</span>
                      </div>
                      <div className="receipt-total-row">
                        <span>Payment Method:</span>
                        <span style={{ textTransform: 'uppercase' }}>{order.payment_method}</span>
                      </div>
                    </div>

                    <div className="receipt-divider">- - - - - - - - - - - - - - - - - - - -</div>

                    <div className="receipt-footer">
                      <p>Thank you for dining at Gian&apos;s!</p>
                      <small>Please keep this receipt for reference.</small>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Modal Actions */}
            <div className="modal-actions receipt-actions">
              <button
                type="button"
                className="btn-print"
                onClick={handlePrint}
                id="print-receipt-btn"
              >
                <Printer size={16} /> Print Receipt
              </button>
              <button
                type="button"
                className="btn-save"
                onClick={() => {
                  setShowReceiptModal(false);
                  setCompletedOrder(null);
                  setViewingReceiptOrder(null);
                }}
              >
                Done / Next Order
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
