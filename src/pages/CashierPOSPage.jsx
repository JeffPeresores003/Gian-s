import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import api, { getImageUrl } from '../lib/api';
import * as XLSX from 'xlsx';
import LineGraph from '../components/LineGraph';
import PieGraph from '../components/PieGraph';
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
} from 'lucide-react';

export default function CashierPOSPage() {
  const { user, logout, isAdmin } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  // Active top navigation tab: 'pos' | 'history' | 'reports'
  const [activeTab, setActiveTab] = useState('pos');

  // ---------- Catalog & Menu State ----------
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // ---------- Order & Cart State ----------
  const [cart, setCart] = useState([]);
  const [customerName, setCustomerName] = useState('');
  const [orderType, setOrderType] = useState('dine-in'); // 'dine-in' | 'take-out'
  const [paymentMethod, setPaymentMethod] = useState('cash'); // 'cash' | 'gcash' | 'card'
  const [tenderedAmount, setTenderedAmount] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [discountActive, setDiscountActive] = useState(false); // 20% discount toggle

  // ---------- Completed Order Receipt Modal ----------
  const [completedOrder, setCompletedOrder] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  // ---------- Order History State ----------
  const [historyOrders, setHistoryOrders] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyDate, setHistoryDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [historySearch, setHistorySearch] = useState('');
  const [viewingReceiptOrder, setViewingReceiptOrder] = useState(null);

  // ---------- Sales Report State ----------
  const [reportDate, setReportDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [reportData, setReportData] = useState(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [lineGraphView, setLineGraphView] = useState('daily'); // 'daily' | 'monthly'
  const [pieGraphView, setPieGraphView] = useState('category'); // 'category' | 'dining'

  // Chronological Daily Breakdown for Line Graph (Fills 7-day continuous window for smooth waveform)
  const lineDailyData = useMemo(() => {
    if (!reportData?.daily_breakdown) return [];

    if (reportData.daily_breakdown.length >= 5) {
      return [...reportData.daily_breakdown]
        .reverse()
        .map((d) => ({
          label: new Date(d.sale_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          value: Number(d.revenue),
          count: d.orders_count,
          date: d.sale_date,
        }));
    }

    // Build 7-day window ending on reportDate for continuous line wave
    const dateMap = new Map();
    reportData.daily_breakdown.forEach((d) => {
      const key = new Date(d.sale_date).toISOString().split('T')[0];
      dateMap.set(key, { revenue: Number(d.revenue), count: d.orders_count });
    });

    const target = new Date(reportDate);
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const dt = new Date(target);
      dt.setDate(target.getDate() - i);
      const key = dt.toISOString().split('T')[0];
      const found = dateMap.get(key);
      days.push({
        label: dt.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' }),
        value: found ? found.revenue : 0,
        count: found ? found.count : 0,
        date: key,
      });
    }
    return days;
  }, [reportData, reportDate]);

  // Chronological Monthly Breakdown for Line Graph
  const lineMonthlyData = useMemo(() => {
    if (!reportData?.monthly_breakdown) return [];
    return [...reportData.monthly_breakdown]
      .sort((a, b) => a.sale_month - b.sale_month)
      .map((m) => {
        const monthName = new Date(2026, m.sale_month - 1, 1).toLocaleDateString('en-US', { month: 'short' });
        return {
          label: monthName,
          value: Number(m.revenue),
          count: m.orders_count,
        };
      });
  }, [reportData]);

  // Product Category breakdown for Pie Graph
  const pieCategoryData = useMemo(() => {
    if (!reportData?.category_breakdown) return [];
    return reportData.category_breakdown.map((c) => ({
      label: c.category,
      value: Number(c.total),
      count: c.items_sold,
    }));
  }, [reportData]);

  // Payment Method breakdown for Pie Graph
  const piePaymentData = useMemo(() => {
    if (!reportData?.payment_methods) return [];
    return reportData.payment_methods.map((p) => ({
      label: p.method.toUpperCase(),
      value: Number(p.total),
      count: p.count,
    }));
  }, [reportData]);

  // Order Type breakdown for Pie Graph
  const pieDiningData = useMemo(() => {
    if (!reportData?.order_types) return [];
    return reportData.order_types.map((o) => ({
      label: o.type === 'dine-in' ? 'Dine In' : 'Take Out',
      value: Number(o.total),
      count: o.count,
    }));
  }, [reportData]);

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

  // ---------- Cart Calculations ----------
  const DISCOUNT_RATE = 0.20; // 20% off

  const cartSubtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [cart]);

  const discountAmount = useMemo(() => {
    return discountActive ? cartSubtotal * DISCOUNT_RATE : 0;
  }, [discountActive, cartSubtotal]);

  const cartTotal = useMemo(() => {
    return cartSubtotal - discountAmount;
  }, [cartSubtotal, discountAmount]);

  const numTendered = parseFloat(tenderedAmount) || 0;
  const changeDue = Math.max(0, numTendered - cartTotal);
  const amountShort = Math.max(0, cartTotal - numTendered);
  const isPaymentValid = paymentMethod !== 'cash' || numTendered >= cartTotal;

  // ---------- Cart Handlers ----------
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
  };

  const updateQuantity = (productId, delta) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id === productId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean)
    );
  };

  const removeFromCart = (productId) => {
    setCart((prev) => prev.filter((item) => item.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setTenderedAmount('');
    setCustomerName('');
    setOrderNotes('');
    setDiscountActive(false);
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
        total_amount: cartTotal, // already discounted if discountActive
        amount_paid: paymentMethod === 'cash' ? numTendered : cartTotal,
        change_amount: paymentMethod === 'cash' ? changeDue : 0,
        notes: discountActive
          ? `[20% Discount Applied] ${orderNotes.trim() || ''}`.trim()
          : orderNotes.trim() || null,
        items: cart.map((item) => ({
          product_id: item.id,
          product_name: item.name,
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

  // ---------- Load Sales Reports ----------
  const fetchSalesReport = async () => {
    setLoadingReport(true);
    try {
      const res = await api.get('/reports/sales', {
        params: { date: reportDate },
      });
      setReportData(res.data);
    } catch {
      addToast('Failed to load sales report.', 'error');
    } finally {
      setLoadingReport(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'reports') {
      fetchSalesReport();
    }
  }, [activeTab, reportDate]);

  const handleLogout = async () => {
    await logout();
    addToast('Logged out of counter session.', 'info');
    navigate('/admin/login');
  };

  // ── Export Sales Report to Excel ──
  const exportSalesReportExcel = () => {
    if (!reportData) return;

    const wb = XLSX.utils.book_new();

    // Sheet 1: Summary
    const summaryData = [
      ['Period', 'Revenue (₱)', 'Orders', 'Avg Ticket (₱)'],
      ['Day (' + reportDate + ')',
        reportData.day.revenue.toFixed(2), reportData.day.orders, reportData.day.avg_ticket.toFixed(2)],
      ['Week (Mon–Sun)',
        reportData.week.revenue.toFixed(2), reportData.week.orders, reportData.week.avg_ticket.toFixed(2)],
      ['Month (' + new Date(reportDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) + ')',
        reportData.month.revenue.toFixed(2), reportData.month.orders, reportData.month.avg_ticket.toFixed(2)],
      ['Year (' + new Date(reportDate).getFullYear() + ')',
        reportData.year.revenue.toFixed(2), reportData.year.orders, reportData.year.avg_ticket.toFixed(2)],
    ];
    const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, ws1, 'Summary');

    // Sheet 2: Daily Breakdown
    if (reportData.daily_breakdown.length > 0) {
      const dailyData = [
        ['Date', 'Orders', 'Revenue (₱)'],
        ...reportData.daily_breakdown.map((d) => [
          new Date(d.sale_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
          d.orders_count,
          Number(d.revenue).toFixed(2),
        ]),
      ];
      const ws2 = XLSX.utils.aoa_to_sheet(dailyData);
      XLSX.utils.book_append_sheet(wb, ws2, 'Daily Breakdown');
    }

    // Sheet 3: Monthly Breakdown
    if (reportData.monthly_breakdown.length > 0) {
      const monthlyData = [
        ['Month', 'Orders', 'Revenue (₱)'],
        ...reportData.monthly_breakdown.map((m) => [
          new Date(2026, m.sale_month - 1, 1).toLocaleDateString('en-US', { month: 'long' }),
          m.orders_count,
          Number(m.revenue).toFixed(2),
        ]),
      ];
      const ws3 = XLSX.utils.aoa_to_sheet(monthlyData);
      XLSX.utils.book_append_sheet(wb, ws3, 'Monthly Breakdown');
    }

    // Sheet 4: Categories Breakdown
    if (reportData.category_breakdown?.length > 0) {
      const catData = [
        ['Category', 'Items Sold', 'Revenue (₱)'],
        ...reportData.category_breakdown.map((c) => [
          c.category,
          c.items_sold,
          Number(c.total).toFixed(2),
        ]),
      ];
      const ws4 = XLSX.utils.aoa_to_sheet(catData);
      XLSX.utils.book_append_sheet(wb, ws4, 'Category Sales');
    }

    // Sheet 5: Payment Breakdown
    if (reportData.payment_methods?.length > 0) {
      const payData = [
        ['Payment Method', 'Transactions', 'Revenue (₱)'],
        ...reportData.payment_methods.map((p) => [
          p.method.toUpperCase(),
          p.count,
          Number(p.total).toFixed(2),
        ]),
      ];
      const ws5 = XLSX.utils.aoa_to_sheet(payData);
      XLSX.utils.book_append_sheet(wb, ws5, 'Payment Methods');
    }

    const fileName = `GiansSalesReport_${reportDate}.xlsx`;
    XLSX.writeFile(wb, fileName);
    addToast(`Report exported: ${fileName}`, 'success');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="pos-layout">
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
                    const inCartItem = cart.find((c) => c.id === p.id);

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

          {/* Right Column: Active Order Cart & Calculator */}
          <div className="pos-cart-column">
            <div className="pos-cart-header">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 className="pos-cart-title">Current Order</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {/* 20% Discount Toggle Button */}
                  <button
                    type="button"
                    className={`btn-discount-toggle ${discountActive ? 'active' : ''}`}
                    onClick={() => setDiscountActive((prev) => !prev)}
                    title={discountActive ? 'Click to remove 20% discount' : 'Click to apply 20% discount'}
                    id="pos-discount-toggle-btn"
                  >
                    <span className="discount-badge-text">20% OFF</span>
                    {discountActive && <span className="discount-active-dot" />}
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
                  <div key={item.id} className="pos-cart-item">
                    <div className="pos-cart-item-info">
                      <div className="pos-cart-item-name">{item.name}</div>
                      <div className="pos-cart-item-unit">
                        ₱{Number(item.price).toFixed(2)} each
                      </div>
                    </div>

                    <div className="pos-cart-qty-ctrl">
                      <button
                        type="button"
                        className="pos-qty-btn"
                        onClick={() => updateQuantity(item.id, -1)}
                        aria-label="Decrease quantity"
                      >
                        <Minus size={13} />
                      </button>
                      <span className="pos-qty-num">{item.quantity}</span>
                      <button
                        type="button"
                        className="pos-qty-btn"
                        onClick={() => updateQuantity(item.id, 1)}
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
                      onClick={() => removeFromCart(item.id)}
                      aria-label="Remove item"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Total & Calculator Counter */}
            <div className="pos-cart-footer">
              {/* Discount Summary Row */}
              {discountActive && cart.length > 0 && (
                <div className="pos-discount-summary">
                  <div className="pos-discount-line">
                    <span>Subtotal</span>
                    <span>₱{cartSubtotal.toFixed(2)}</span>
                  </div>
                  <div className="pos-discount-line discount-row">
                    <span>🏷️ 20% Discount</span>
                    <span className="discount-save-amount">-₱{discountAmount.toFixed(2)}</span>
                  </div>
                </div>
              )}

              <div className="pos-summary-row pos-total-row">
                <span>Total Amount</span>
                <span className={`pos-total-amount ${discountActive ? 'total-discounted' : ''}`}>
                  ₱{cartTotal.toFixed(2)}
                </span>
              </div>

              {/* Payment Method Selector */}
              <div className="pos-payment-methods">
                <button
                  type="button"
                  className={`pos-method-btn ${paymentMethod === 'cash' ? 'active' : ''}`}
                  onClick={() => setPaymentMethod('cash')}
                >
                  <Banknote size={15} /> Cash
                </button>
                <button
                  type="button"
                  className={`pos-method-btn ${paymentMethod === 'gcash' ? 'active' : ''}`}
                  onClick={() => {
                    setPaymentMethod('gcash');
                    setTenderedAmount(cartTotal.toFixed(2));
                  }}
                >
                  <Smartphone size={15} /> GCash / QR
                </button>
                <button
                  type="button"
                  className={`pos-method-btn ${paymentMethod === 'card' ? 'active' : ''}`}
                  onClick={() => {
                    setPaymentMethod('card');
                    setTenderedAmount(cartTotal.toFixed(2));
                  }}
                >
                  <CreditCard size={15} /> Card
                </button>
              </div>

              {/* Cash Calculator & Change */}
              {paymentMethod === 'cash' && (
                <div className="pos-calculator-box">
                  <div className="pos-tender-input-wrap">
                    <label className="pos-tender-label">Cash Tendered (₱):</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      className="pos-tender-input"
                      placeholder="0.00"
                      value={tenderedAmount}
                      onChange={(e) => setTenderedAmount(e.target.value)}
                      id="pos-cash-tendered-input"
                    />
                  </div>

                  {/* Fast Tender Buttons */}
                  <div className="pos-quick-cash-row">
                    <button type="button" onClick={() => setQuickCash('exact')}>Exact</button>
                    <button type="button" onClick={() => setQuickCash(50)}>₱50</button>
                    <button type="button" onClick={() => setQuickCash(100)}>₱100</button>
                    <button type="button" onClick={() => setQuickCash(200)}>₱200</button>
                    <button type="button" onClick={() => setQuickCash(500)}>₱500</button>
                    <button type="button" onClick={() => setQuickCash(1000)}>₱1000</button>
                  </div>

                  {/* On-Screen Numerical Pad / Calculator */}
                  <div className="pos-num-pad">
                    {['7', '8', '9', '4', '5', '6', '1', '2', '3', '0', '.', 'C'].map((k) => (
                      <button
                        key={k}
                        type="button"
                        className="pos-pad-btn"
                        onClick={() => appendKeypad(k)}
                      >
                        {k}
                      </button>
                    ))}
                  </div>

                  {/* Real-time Change or Shortfall Display */}
                  <div className="pos-change-banner">
                    {cartTotal > 0 && numTendered > 0 ? (
                      numTendered >= cartTotal ? (
                        <div className="pos-change-badge success">
                          <span>Change Due:</span>
                          <strong>₱{changeDue.toFixed(2)}</strong>
                        </div>
                      ) : (
                        <div className="pos-change-badge warning">
                          <span>Amount Lacking:</span>
                          <strong>₱{amountShort.toFixed(2)}</strong>
                        </div>
                      )
                    ) : (
                      <div className="pos-change-badge neutral">
                        <span>Enter cash tendered above</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Complete Order Button */}
              <button
                type="button"
                className="btn-pos-checkout"
                disabled={cart.length === 0 || submittingOrder || !isPaymentValid}
                onClick={handleCheckout}
                id="pos-submit-order-btn"
              >
                {submittingOrder ? (
                  <>
                    <Loader2 className="spinner" size={18} />
                    <span>Processing Order...</span>
                  </>
                ) : (
                  <>
                    <span>Place Order &bull; ₱{cartTotal.toFixed(2)}</span>
                    <ArrowRight size={18} />
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
      {activeTab === 'reports' && (
        <div className="pos-history-container">
          <div className="pos-history-top">
            <div>
              <h2 className="pos-section-title">Sales &amp; Earnings Reports</h2>
              <p className="pos-section-sub">
                Track revenue gained per day, month, and year with automatic ticket analysis
              </p>
            </div>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-brand)' }}>Target Date:</span>
                <input
                  type="date"
                  className="pos-date-picker"
                  value={reportDate}
                  onChange={(e) => setReportDate(e.target.value)}
                  id="pos-report-date-picker"
                />
              </div>

              <button
                type="button"
                className="btn-pos-aux"
                onClick={fetchSalesReport}
                title="Refresh sales statistics"
              >
                <RefreshCw size={14} /> Refresh
              </button>

              {reportData && (
                <button
                  type="button"
                  className="btn-pos-aux"
                  onClick={exportSalesReportExcel}
                  title="Export report to Excel"
                  style={{ background: '#1a7340', color: '#fff', borderColor: '#1a7340' }}
                  id="pos-export-report-btn"
                >
                  <Download size={14} /> Export Excel
                </button>
              )}
            </div>
          </div>

          {loadingReport ? (
            <div className="state-center" style={{ minHeight: '350px' }}>
              <Loader2 className="spinner" size={32} />
              <p className="state-sub">Compiling financial performance report...</p>
            </div>
          ) : reportData ? (
            <>
              {/* 4 Metric Summary Cards: Day / Week / Month / Year */}
              <div className="pos-reports-grid">
                {/* 1. Day Card */}
                <div className="pos-metric-card">
                  <div className="pos-metric-badge day">Day Report ({reportDate})</div>
                  <div className="pos-metric-amount">
                    ₱{reportData.day.revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="pos-metric-details">
                    <span><strong>{reportData.day.orders}</strong> orders placed</span>
                    <span>Avg. Ticket: <strong>₱{reportData.day.avg_ticket.toFixed(2)}</strong></span>
                  </div>
                </div>

                {/* 2. Week Card */}
                <div className="pos-metric-card">
                  <div className="pos-metric-badge week">Week Report (Mon–Sun)</div>
                  <div className="pos-metric-amount">
                    ₱{(reportData.week?.revenue ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="pos-metric-details">
                    <span><strong>{reportData.week?.orders ?? 0}</strong> orders this week</span>
                    <span>Avg. Ticket: <strong>₱{(reportData.week?.avg_ticket ?? 0).toFixed(2)}</strong></span>
                  </div>
                </div>

                {/* 3. Month Card */}
                <div className="pos-metric-card">
                  <div className="pos-metric-badge month">
                    Month Report ({new Date(reportDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })})
                  </div>
                  <div className="pos-metric-amount">
                    ₱{reportData.month.revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="pos-metric-details">
                    <span><strong>{reportData.month.orders}</strong> total orders</span>
                    <span>Avg. Ticket: <strong>₱{reportData.month.avg_ticket.toFixed(2)}</strong></span>
                  </div>
                </div>

                {/* 4. Year Card */}
                <div className="pos-metric-card">
                  <div className="pos-metric-badge year">
                    Year Report ({new Date(reportDate).getFullYear()})
                  </div>
                  <div className="pos-metric-amount">
                    ₱{reportData.year.revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="pos-metric-details">
                    <span><strong>{reportData.year.orders}</strong> annual orders</span>
                    <span>Avg. Ticket: <strong>₱{reportData.year.avg_ticket.toFixed(2)}</strong></span>
                  </div>
                </div>
              </div>

              {/* ── Visual Analytics (Line & Pie Graphs) ── */}
              <div className="pos-charts-section">
                {/* 1. Line Graph: Revenue Velocity & Trajectory */}
                <LineGraph
                  data={lineGraphView === 'daily' ? lineDailyData : lineMonthlyData}
                  title={lineGraphView === 'daily' ? 'Daily Revenue Trajectory' : 'Annual Monthly Revenue Trend'}
                  subtitle={
                    lineGraphView === 'daily'
                      ? `Day-by-day revenue velocity for ${new Date(reportDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`
                      : `Annual overview for calendar year ${new Date(reportDate).getFullYear()}`
                  }
                  strokeColor="#c48b3f"
                  fillColor="#c48b3f"
                  headerActions={
                    <div className="chart-pill-toggles">
                      <button
                        type="button"
                        className={`chart-pill-btn ${lineGraphView === 'daily' ? 'active' : ''}`}
                        onClick={() => setLineGraphView('daily')}
                      >
                        Daily View ({new Date(reportDate).toLocaleDateString('en-US', { month: 'short' })})
                      </button>
                      <button
                        type="button"
                        className={`chart-pill-btn ${lineGraphView === 'monthly' ? 'active' : ''}`}
                        onClick={() => setLineGraphView('monthly')}
                      >
                        Monthly View ({new Date(reportDate).getFullYear()})
                      </button>
                    </div>
                  }
                />

                {/* 2. Dual Pie Graphs Row */}
                <div className="pos-charts-row">
                  {/* Category Breakdown Donut */}
                  <PieGraph
                    data={pieCategoryData}
                    title="Revenue by Product Category"
                    subtitle="Share of sales across coffee, teas, pastries, & specials"
                    donut={true}
                    colorPalette={[
                      '#C48B3F', // Caramel
                      '#2C1810', // Espresso
                      '#16A34A', // Emerald
                      '#D4A96A', // Crema
                      '#4F46E5', // Indigo
                      '#DC2626', // Crimson Roast
                      '#0284C7', // Sky Blue
                    ]}
                  />

                  {/* Payment Method & Dining Preference Breakdown */}
                  <PieGraph
                    data={pieGraphView === 'category' ? piePaymentData : pieDiningData}
                    title={pieGraphView === 'category' ? 'Payment Method Distribution' : 'Dining Preference Breakdown'}
                    subtitle={
                      pieGraphView === 'category'
                        ? 'Volume split by Cash, GCash, and Card tender'
                        : 'Customer order distribution between Dine-In and Take-Out'
                    }
                    donut={true}
                    colorPalette={[
                      '#16A34A', // Emerald (Cash)
                      '#0284C7', // Sky Blue (GCash)
                      '#4F46E5', // Indigo (Card)
                      '#D97706', // Amber
                    ]}
                    headerActions={
                      <div className="chart-pill-toggles">
                        <button
                          type="button"
                          className={`chart-pill-btn ${pieGraphView === 'category' ? 'active' : ''}`}
                          onClick={() => setPieGraphView('category')}
                        >
                          Payment Method
                        </button>
                        <button
                          type="button"
                          className={`chart-pill-btn ${pieGraphView === 'dining' ? 'active' : ''}`}
                          onClick={() => setPieGraphView('dining')}
                        >
                          Dine-In / Take-Out
                        </button>
                      </div>
                    }
                  />
                </div>
              </div>

              {/* Daily Breakdown for Selected Month */}
              <div className="pos-breakdown-section">
                <div className="pos-breakdown-card">
                  <h3 className="pos-breakdown-title">
                    Daily Revenue Breakdown &bull; {new Date(reportDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </h3>
                  {reportData.daily_breakdown.length === 0 ? (
                    <p style={{ color: 'var(--color-muted)', fontSize: '0.88rem' }}>No orders logged for this month yet.</p>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Total Orders</th>
                            <th style={{ textAlign: 'right' }}>Revenue Gained</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reportData.daily_breakdown.map((d, i) => (
                            <tr key={i}>
                              <td>
                                {new Date(d.sale_date).toLocaleDateString('en-US', {
                                  weekday: 'short',
                                  month: 'short',
                                  day: 'numeric',
                                })}
                              </td>
                              <td>{d.orders_count} orders</td>
                              <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--color-brand)' }}>
                                ₱{Number(d.revenue).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Monthly Breakdown for Current Year */}
                <div className="pos-breakdown-card">
                  <h3 className="pos-breakdown-title">
                    Monthly Revenue Breakdown &bull; {new Date(reportDate).getFullYear()}
                  </h3>
                  {reportData.monthly_breakdown.length === 0 ? (
                    <p style={{ color: 'var(--color-muted)', fontSize: '0.88rem' }}>No orders logged for this year yet.</p>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>Month</th>
                            <th>Total Orders</th>
                            <th style={{ textAlign: 'right' }}>Revenue Gained</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reportData.monthly_breakdown.map((m, i) => {
                            const monthName = new Date(2026, m.sale_month - 1, 1).toLocaleDateString('en-US', {
                              month: 'long',
                            });
                            return (
                              <tr key={i}>
                                <td>{monthName}</td>
                                <td>{m.orders_count} orders</td>
                                <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--color-brand)' }}>
                                  ₱{Number(m.revenue).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : null}
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
          <div className="modal-card receipt-card" onClick={(e) => e.stopPropagation()}>
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
                      <div><span>Type:</span> {order.order_type === 'dine-in' ? 'DINE IN' : 'TAKE OUT'}</div>
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
                          <span className="receipt-item-title">{item.name || item.product_name}</span>
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
                      {completedOrder && discountActive && (
                        <>
                          <div className="receipt-total-row">
                            <span>Subtotal:</span>
                            <span>₱{cartSubtotal.toFixed(2)}</span>
                          </div>
                          <div className="receipt-total-row" style={{ color: '#16a34a', fontWeight: 700 }}>
                            <span>20% Discount:</span>
                            <span>-₱{discountAmount.toFixed(2)}</span>
                          </div>
                        </>
                      )}
                      {/* Show discount note from history receipts */}
                      {viewingReceiptOrder && order.notes?.includes('[20% Discount Applied]') && (
                        <div className="receipt-total-row" style={{ color: '#16a34a', fontSize: '0.78rem' }}>
                          <span>🏷️ 20% Discount was applied</span>
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
