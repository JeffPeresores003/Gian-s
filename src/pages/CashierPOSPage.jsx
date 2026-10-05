import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import api, { getImageUrl } from '../lib/api';
import * as XLSX from 'xlsx';
import LineGraph from '../components/LineGraph';
import PieGraph from '../components/PieGraph';
import printReceiptSlip from '../lib/printReceipt';
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

  // ---------- Sales Report State ----------
  const [reportDate, setReportDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [reportData, setReportData] = useState(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [lineGraphView, setLineGraphView] = useState('daily'); // 'daily' | 'monthly'
  const [pieGraphView, setPieGraphView] = useState('category'); // 'category' | 'dining'
  const [drilldownCategory, setDrilldownCategory] = useState(null);
  const [categoryTimeframe, setCategoryTimeframe] = useState('daily'); // 'daily' | 'monthly' | 'annually'

  // Products belonging to the selected drilldown category, sorted by total revenue & qty sold (Daily / Monthly / Annually)
  const categoryTopProducts = useMemo(() => {
    if (!drilldownCategory || !reportData) return [];
    let list = [];
    if (categoryTimeframe === 'daily') {
      list = reportData.product_breakdown_daily || [];
    } else if (categoryTimeframe === 'annually') {
      list = reportData.product_breakdown_yearly || [];
    } else {
      list = reportData.product_breakdown_monthly || reportData.product_breakdown || [];
    }
    return list
      .filter((p) => p.category?.toLowerCase() === drilldownCategory.toLowerCase())
      .sort((a, b) => Number(b.total) - Number(a.total));
  }, [drilldownCategory, reportData, categoryTimeframe]);

  // Today's / selected day's money breakdown by payment method (Cash, GCash, Card)
  const dailyPaymentBreakdown = useMemo(() => {
    if (!reportData?.payment_daily) return [];
    const dateStr = reportDate;
    const dayRows = reportData.payment_daily.filter((p) => p.sale_date === dateStr);
    const defs = [
      { method: 'cash', label: 'Cash Tendered', color: '#16A34A', bg: 'rgba(22, 163, 74, 0.08)' },
      { method: 'gcash', label: 'GCash / QR', color: '#0284C7', bg: 'rgba(2, 132, 199, 0.08)' },
      { method: 'card', label: 'Credit / Debit Card', color: '#4F46E5', bg: 'rgba(79, 70, 229, 0.08)' },
    ];
    return defs.map((d) => {
      const match = dayRows.find((r) => r.method?.toLowerCase() === d.method);
      return {
        ...d,
        count: match ? match.count : 0,
        total: match ? Number(match.total) : 0,
      };
    });
  }, [reportData, reportDate]);

  const dailyTotalMoney = useMemo(() => {
    return dailyPaymentBreakdown.reduce((sum, item) => sum + item.total, 0);
  }, [dailyPaymentBreakdown]);

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

  // Product Category breakdown for Pie Graph (Daily / Monthly / Annually)
  const pieCategoryData = useMemo(() => {
    if (!reportData) return [];
    let list = [];
    if (categoryTimeframe === 'daily') {
      list = reportData.category_breakdown_daily || [];
    } else if (categoryTimeframe === 'annually') {
      list = reportData.category_breakdown_yearly || [];
    } else {
      list = reportData.category_breakdown_monthly || reportData.category_breakdown || [];
    }
    return list.map((c) => ({
      label: c.category,
      value: Number(c.total),
      count: c.items_sold,
    }));
  }, [reportData, categoryTimeframe]);

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
                  {/* Category Breakdown Donut (Clickable) */}
                  {/* Category Breakdown Donut with Daily / Monthly / Annually Buttons */}
                  <PieGraph
                    data={pieCategoryData}
                    title="Revenue by Product Category"
                    subtitle={`Breakdown (${categoryTimeframe === 'daily' ? new Date(reportDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : categoryTimeframe === 'monthly' ? new Date(reportDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : new Date(reportDate).getFullYear()}). Click a category to inspect its top-selling products.`}
                    donut={true}
                    onItemClick={(slice) => setDrilldownCategory(slice.label)}
                    selectedLabel={drilldownCategory}
                    colorPalette={[
                      '#C48B3F', // Caramel
                      '#2C1810', // Espresso
                      '#16A34A', // Emerald
                      '#D4A96A', // Crema
                      '#4F46E5', // Indigo
                      '#DC2626', // Crimson Roast
                      '#0284C7', // Sky Blue
                    ]}
                    headerActions={
                      <div className="chart-pill-toggles">
                        <button
                          type="button"
                          className={`chart-pill-btn ${categoryTimeframe === 'daily' ? 'active' : ''}`}
                          onClick={() => setCategoryTimeframe('daily')}
                        >
                          Daily
                        </button>
                        <button
                          type="button"
                          className={`chart-pill-btn ${categoryTimeframe === 'monthly' ? 'active' : ''}`}
                          onClick={() => setCategoryTimeframe('monthly')}
                        >
                          Monthly
                        </button>
                        <button
                          type="button"
                          className={`chart-pill-btn ${categoryTimeframe === 'annually' ? 'active' : ''}`}
                          onClick={() => setCategoryTimeframe('annually')}
                        >
                          Annually
                        </button>
                      </div>
                    }
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

                {/* 3. Daily Money Breakdown by Payment Method (Task 4) */}
                <div className="pos-breakdown-card" style={{ marginTop: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <h3 className="pos-breakdown-title" style={{ margin: 0 }}>
                        Daily Money Breakdown &bull; {new Date(reportDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                      </h3>
                      <p style={{ margin: '2px 0 0 0', fontSize: '0.82rem', color: 'var(--color-muted)' }}>
                        Exact money earned today split by GCash, Cash, and Card tender
                      </p>
                    </div>
                    <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--color-brand)', background: 'var(--color-cream)', padding: '5px 12px', borderRadius: '20px', border: '1px solid var(--color-border)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <TrendingUp size={14} color="var(--color-brand)" /> Day Total Earned: ₱{dailyTotalMoney.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                    {dailyPaymentBreakdown.map((pm) => (
                      <div
                        key={pm.method}
                        style={{
                          background: pm.bg,
                          border: `1.5px solid ${pm.color}33`,
                          borderRadius: 'var(--radius-md)',
                          padding: '16px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '14px',
                        }}
                      >
                        <div
                          style={{
                            background: '#fff',
                            width: '46px',
                            height: '46px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
                            color: pm.color,
                          }}
                        >
                          {pm.method === 'cash' && <Banknote size={22} color={pm.color} />}
                          {pm.method === 'gcash' && <Smartphone size={22} color={pm.color} />}
                          {pm.method === 'card' && <CreditCard size={22} color={pm.color} />}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: pm.color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            {pm.label}
                          </div>
                          <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--color-brand)', fontFamily: 'var(--font-sans)', margin: '2px 0' }}>
                            ₱{pm.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>
                            <strong>{pm.count}</strong> transactions ({dailyTotalMoney > 0 ? ((pm.total / dailyTotalMoney) * 100).toFixed(1) : 0}%)
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
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

      {/* Category Top Products Breakdown Modal (Task 4) */}
      {drilldownCategory && (
        <div className="modal-overlay" onClick={() => setDrilldownCategory(null)}>
          <div className="modal-card" style={{ maxWidth: '640px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-brand-mid)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Category Performance Drilldown &bull; {categoryTimeframe.toUpperCase()} VIEW
                </span>
                <h3 className="modal-title" style={{ marginTop: '2px' }}>
                  Top Selling Products &bull; {drilldownCategory}
                </h3>
              </div>
              <button
                type="button"
                className="btn-icon"
                onClick={() => setDrilldownCategory(null)}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ marginTop: '8px' }}>
              {categoryTopProducts.length === 0 ? (
                <div className="state-center" style={{ padding: '32px' }}>
                  <ShoppingBag size={36} className="state-icon" />
                  <p className="state-sub">No sales registered for items in {drilldownCategory} during this period.</p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th style={{ width: '40px' }}>Rank</th>
                        <th>Product Item</th>
                        <th style={{ textAlign: 'center' }}>Units Sold</th>
                        <th style={{ textAlign: 'center' }}>Orders</th>
                        <th style={{ textAlign: 'right' }}>Total Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categoryTopProducts.map((p, idx) => (
                        <tr key={idx}>
                          <td>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '24px',
                                height: '24px',
                                borderRadius: '50%',
                                background: idx === 0 ? '#FEF3C7' : idx === 1 ? '#F3F4F6' : idx === 2 ? '#FFEDD5' : 'transparent',
                                color: idx === 0 ? '#92400E' : idx === 1 ? '#374151' : idx === 2 ? '#9A3412' : 'var(--color-muted)',
                                fontWeight: 700,
                                fontSize: '0.78rem',
                              }}
                            >
                              #{idx + 1}
                            </span>
                          </td>
                          <td>
                            <strong>{p.product_name}</strong>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span style={{ background: 'var(--color-cream)', padding: '2px 8px', borderRadius: '12px', fontWeight: 600, fontSize: '0.85rem' }}>
                              {p.qty_sold} sold
                            </span>
                          </td>
                          <td style={{ textAlign: 'center', color: 'var(--color-muted)', fontSize: '0.85rem' }}>
                            {p.order_count}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--color-brand)' }}>
                            ₱{Number(p.total).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="modal-actions" style={{ marginTop: '20px' }}>
              <button
                type="button"
                className="btn-save"
                onClick={() => setDrilldownCategory(null)}
              >
                Close Drilldown
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
                            {item.name || item.product_name}
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
