import { useState, useEffect, useMemo } from 'react';
import { useToast } from '../contexts/ToastContext';
import api from '../lib/api';
import printReceiptSlip from '../lib/printReceipt';
import {
  Search,
  Calendar,
  RefreshCw,
  Printer,
  Edit2,
  RotateCcw,
  Eye,
  Plus,
  Trash2,
  X,
  CheckCircle2,
  AlertCircle,
  Clock,
  User,
  ShoppingBag,
  CreditCard,
  Banknote,
  Smartphone,
  Tag,
  Percent,
  DollarSign,
  ShieldCheck,
  Loader2,
  ChevronDown,
} from 'lucide-react';

export default function AdminOrderManagement({ products = [] }) {
  const { addToast } = useToast();

  // Filters & List
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dateFilter, setDateFilter] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('all'); // all | dine-in | take-out | online
  const [statusFilter, setStatusFilter] = useState('all'); // all | sales | refunded | edited | cancelled | unpaid
  const [summary, setSummary] = useState({ gross: 0, refunds: 0, net: 0, sales_count: 0, total_count: 0 });

  // View / Audit Modal
  const [viewOrder, setViewOrder] = useState(null);
  const [viewAudit, setViewAudit] = useState([]);
  const [loadingView, setLoadingView] = useState(false);

  // Edit Order Modal
  const [editOrder, setEditOrder] = useState(null);
  const [editCustomerName, setEditCustomerName] = useState('');
  const [editOrderType, setEditOrderType] = useState('dine-in');
  const [editPaymentMethod, setEditPaymentMethod] = useState('cash');
  const [editAmountPaid, setEditAmountPaid] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editReason, setEditReason] = useState('');
  const [editItems, setEditItems] = useState([]);
  const [editDiscount, setEditDiscount] = useState({ active: false, type: 'percent', value: 20, name: '20% OFF' });
  const [selectedCatalogProduct, setSelectedCatalogProduct] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Refund Modal
  const [refundOrder, setRefundOrder] = useState(null);
  const [refundMode, setRefundMode] = useState('discount'); // 'discount' | 'partial' | 'full'
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [refundDiscount, setRefundDiscount] = useState({ type: 'percent', value: 20, label: '20% Senior / Promo Discount' });
  const [processingRefund, setProcessingRefund] = useState(false);

  // Receipt Modal
  const [receiptOrder, setReceiptOrder] = useState(null);

  // ---------- Fetch Admin Orders ----------
  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = {};
      if (dateFilter) params.date = dateFilter;
      if (searchFilter.trim()) params.search = searchFilter.trim();
      if (typeFilter !== 'all') params.type = typeFilter;
      if (statusFilter !== 'all') params.status = statusFilter;

      const res = await api.get('/admin/orders', { params });
      setOrders(res.data?.orders || []);
      setSummary(res.data?.summary || { gross: 0, refunds: 0, net: 0, sales_count: 0, total_count: 0 });
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to load order history.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [dateFilter, typeFilter, statusFilter]);

  // ---------- Open View / Audit Details ----------
  const handleOpenView = async (orderId) => {
    setLoadingView(true);
    try {
      const res = await api.get(`/admin/orders/${orderId}`);
      setViewOrder(res.data?.order);
      setViewAudit(res.data?.audit || []);
    } catch {
      addToast('Failed to load order details.', 'error');
    } finally {
      setLoadingView(false);
    }
  };

  // ---------- Open Edit Order Modal ----------
  const handleOpenEdit = async (orderSummary) => {
    try {
      const res = await api.get(`/admin/orders/${orderSummary.id}`);
      const ord = res.data?.order;
      if (!ord) return;

      setEditOrder(ord);
      setEditCustomerName(ord.customer_name || 'Guest');
      setEditOrderType(ord.order_type || 'dine-in');
      setEditPaymentMethod(ord.payment_method || 'cash');
      setEditAmountPaid(ord.amount_paid != null ? String(ord.amount_paid) : '');
      setEditReason('');

      // Check notes for existing discount tag: "[20% OFF (-₱50.00)] note"
      const match = ord.notes?.match(/\[(.*?)\s*\(-₱([\d.,]+)\)\]/);
      if (match) {
        const label = match[1] || '';
        const isPct = label.includes('%');
        setEditDiscount({
          active: true,
          type: isPct ? 'percent' : 'fixed',
          value: isPct ? (label.match(/\d+/)?.[0] || '20') : parseFloat(match[2].replace(/,/g, '')),
          name: label,
        });
        setEditNotes(ord.notes.replace(/\[(.*?)\]/, '').trim());
      } else {
        setEditDiscount({ active: false, type: 'percent', value: 20, name: '20% OFF' });
        setEditNotes(ord.notes || '');
      }

      setEditItems(
        (ord.items || []).map((it) => ({
          product_id: it.product_id,
          product_name: it.product_name || it.name,
          unit_price: Number(it.unit_price || it.price),
          quantity: parseInt(it.quantity, 10) || 1,
          is_updated: Boolean(it.is_updated),
        }))
      );
      setSelectedCatalogProduct('');
    } catch {
      addToast('Could not load order for editing.', 'error');
    }
  };

  // Calculations for Edit Order
  const editSubtotal = useMemo(() => {
    return editItems.reduce((sum, item) => sum + (Number(item.unit_price) || 0) * (parseInt(item.quantity, 10) || 0), 0);
  }, [editItems]);

  const editDiscountAmount = useMemo(() => {
    if (!editDiscount.active || editSubtotal <= 0) return 0;
    if (editDiscount.type === 'percent') {
      const pct = Math.max(0, parseFloat(editDiscount.value) || 0);
      return Math.min(editSubtotal, (editSubtotal * Math.min(pct, 100)) / 100);
    }
    const fixed = Math.max(0, parseFloat(editDiscount.value) || 0);
    return Math.min(editSubtotal, fixed);
  }, [editDiscount, editSubtotal]);

  const editDeliveryFee = editOrder?.order_type === 'online' ? Number(editOrder.delivery_fee) || 0 : 0;
  const editTotalAmount = Math.max(0, editSubtotal - editDiscountAmount + editDeliveryFee);

  const handleAddCatalogItem = () => {
    if (!selectedCatalogProduct) return;
    const prod = products.find((p) => p.id === parseInt(selectedCatalogProduct, 10));
    if (!prod) return;

    setEditItems((prev) => {
      const idx = prev.findIndex((i) => i.product_id === prod.id || i.product_name === prod.name);
      if (idx >= 0) {
        return prev.map((item, i) => (i === idx ? { ...item, quantity: item.quantity + 1 } : item));
      }
      return [
        ...prev,
        {
          product_id: prod.id,
          product_name: prod.name,
          unit_price: Number(prod.price),
          quantity: 1,
          is_updated: true,
        },
      ];
    });
    setSelectedCatalogProduct('');
  };

  const handleUpdateItemQty = (index, delta) => {
    setEditItems((prev) =>
      prev
        .map((item, i) => {
          if (i === index) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean)
    );
  };

  const handleUpdateItemPrice = (index, newPrice) => {
    setEditItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, unit_price: Math.max(0, parseFloat(newPrice) || 0) } : item))
    );
  };

  const handleRemoveItem = (index) => {
    setEditItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveEditSubmit = async (e) => {
    e.preventDefault();
    if (!editOrder) return;
    if (editItems.length === 0) {
      addToast('Order must contain at least one item.', 'error');
      return;
    }
    if (!editReason.trim()) {
      addToast('Please provide an audit reason for modifying this order.', 'error');
      return;
    }

    setSavingEdit(true);
    try {
      const payload = {
        customer_name: editCustomerName.trim() || 'Guest',
        order_type: editOrderType,
        payment_method: editPaymentMethod,
        amount_paid: editPaymentMethod === 'cash' ? (parseFloat(editAmountPaid) || editTotalAmount) : editTotalAmount,
        notes: editNotes,
        reason: editReason.trim(),
        discount: editDiscount.active
          ? {
              type: editDiscount.type,
              value: parseFloat(editDiscount.value) || 0,
              label: editDiscount.name || (editDiscount.type === 'percent' ? `${editDiscount.value}% OFF` : `₱${editDiscount.value} OFF`),
            }
          : null,
        items: editItems.map((item) => ({
          product_id: item.product_id,
          product_name: item.product_name,
          unit_price: item.unit_price,
          quantity: item.quantity,
          is_updated: item.is_updated,
        })),
      };

      await api.put(`/admin/orders/${editOrder.id}`, payload);
      addToast(`Order ${editOrder.order_number} successfully updated! Changes are live on cashier POS and reports.`, 'success');
      setEditOrder(null);
      fetchOrders();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to update order.', 'error');
    } finally {
      setSavingEdit(false);
    }
  };

  // ---------- Open Refund Modal ----------
  const handleOpenRefund = async (ord) => {
    setRefundOrder(ord);
    setRefundMode('discount');
    setRefundReason('');
    setRefundAmount('');
    setRefundDiscount({ type: 'percent', value: '20', label: '20% Senior / PWD' });
    try {
      const res = await api.get(`/admin/orders/${ord.id}`);
      if (res.data?.order) {
        setRefundOrder(res.data.order);
      }
    } catch {
      // fallback to summary ord
    }
  };

  const remainingRefundable = useMemo(() => {
    if (!refundOrder) return 0;
    return Math.max(0, Number(refundOrder.total_amount) - (Number(refundOrder.refund_amount) || 0));
  }, [refundOrder]);

  const calculatedDiscountRefund = useMemo(() => {
    if (!refundOrder) return 0;
    let base = Number(refundOrder.total_amount) || 0;
    if (Array.isArray(refundOrder.items) && refundOrder.items.length > 0) {
      base = refundOrder.items.reduce(
        (sum, it) => sum + (Number(it.unit_price || it.price || 0) * (Number(it.quantity) || 1)),
        0
      );
    }
    const val = parseFloat(refundDiscount.value) || 0;
    if (refundDiscount.type === 'percent') {
      return Math.min(remainingRefundable, (base * Math.min(val, 100)) / 100);
    }
    return Math.min(remainingRefundable, val);
  }, [refundOrder, refundDiscount, remainingRefundable]);

  const handleRefundSubmit = async (e) => {
    e.preventDefault();
    if (!refundOrder) return;

    let payload = { mode: refundMode };
    if (refundMode === 'full') {
      if (!refundReason.trim()) {
        addToast('Please enter a reason for the full refund.', 'error');
        return;
      }
      payload.reason = refundReason.trim();
    } else if (refundMode === 'discount') {
      const numVal = parseFloat(refundDiscount.value);
      if (isNaN(numVal) || numVal <= 0) {
        addToast('Please enter a valid discount percentage or flat amount.', 'error');
        return;
      }
      if (refundDiscount.type === 'percent' && numVal > 100) {
        addToast('Percentage discount cannot exceed 100%.', 'error');
        return;
      }
      payload.discount = {
        type: refundDiscount.type,
        value: numVal,
        label: refundDiscount.label?.trim() || (refundDiscount.type === 'percent' ? `${numVal}% OFF` : `₱${numVal} OFF`),
      };
      payload.reason = refundReason.trim();
    } else {
      const amt = parseFloat(refundAmount);
      if (isNaN(amt) || amt <= 0) {
        addToast('Please enter a valid refund amount.', 'error');
        return;
      }
      if (amt > remainingRefundable) {
        addToast(`Refund amount cannot exceed remaining balance (₱${remainingRefundable.toFixed(2)}).`, 'error');
        return;
      }
      if (!refundReason.trim()) {
        addToast('Please enter a reason for the partial refund.', 'error');
        return;
      }
      payload.amount = amt;
      payload.reason = refundReason.trim();
    }

    setProcessingRefund(true);
    try {
      const res = await api.post(`/admin/orders/${refundOrder.id}/refund`, payload);
      addToast(res.data?.message || 'Refund successfully processed! Recorded in sales reports.', 'success');
      setRefundOrder(null);
      fetchOrders();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to process refund.', 'error');
    } finally {
      setProcessingRefund(false);
    }
  };

  // ---------- Print Receipt ----------
  const handlePrint = async (ord) => {
    try {
      const res = await api.get(`/orders/${ord.id}`);
      setReceiptOrder(res.data?.order || ord);
    } catch {
      setReceiptOrder(ord);
    }
  };

  return (
    <main className="admin-content">
      {/* ── Top Header ────────────────────────────────────── */}
      <div className="admin-top">
        <div>
          <h1 className="admin-page-title">Order History &amp; Admin Operations</h1>
          <p className="admin-page-sub">
            Review orders, edit items/quantities, apply missed promo discounts, issue refunds, and track the audit log.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Calendar size={16} color="var(--color-brand)" />
            <input
              type="date"
              className="pos-date-picker"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              title="Filter by Order Date"
            />
            {dateFilter && (
              <button
                type="button"
                className="btn-icon"
                onClick={() => setDateFilter('')}
                title="Clear date filter"
                style={{ width: '28px', height: '28px' }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          <button
            type="button"
            className="btn-pos-aux"
            onClick={fetchOrders}
            title="Refresh Orders"
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* ── Summary Cards ─────────────────────────────────── */}
      <div className="pos-reports-grid" style={{ marginBottom: '24px' }}>
        <div className="pos-metric-card">
          <div className="pos-metric-badge day">Gross Sales</div>
          <div className="pos-metric-amount">
            ₱{Number(summary.gross).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="pos-metric-details">
            <span><strong>{summary.sales_count}</strong> completed sale orders</span>
            <span>All dine-in, take-out &amp; delivered online</span>
          </div>
        </div>

        <div className="pos-metric-card">
          <div className="pos-metric-badge" style={{ background: '#FEE2E2', color: '#991B1B' }}>Refunds Issued</div>
          <div className="pos-metric-amount" style={{ color: '#DC2626' }}>
            ₱{Number(summary.refunds).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="pos-metric-details">
            <span>Customer returns &amp; promo adjustments</span>
            <span>Deducted automatically from revenue</span>
          </div>
        </div>

        <div className="pos-metric-card">
          <div className="pos-metric-badge week">Net Earned Revenue</div>
          <div className="pos-metric-amount" style={{ color: '#16A34A' }}>
            ₱{Number(summary.net).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="pos-metric-details">
            <span>Real revenue retained by Gian&apos;s</span>
            <span>Synchronized with POS Cashier terminal</span>
          </div>
        </div>

        <div className="pos-metric-card">
          <div className="pos-metric-badge month">Orders Logged</div>
          <div className="pos-metric-amount">
            {summary.total_count}
          </div>
          <div className="pos-metric-details">
            <span>Showing filtered order history</span>
            <span>Admin modifications tracked in audit log</span>
          </div>
        </div>
      </div>

      {/* ── Search & Pill Filters Row ──────────────────────── */}
      <div className="admin-search-wrap">
        <div className="search-wrap" style={{ flex: 2, minWidth: '240px' }}>
          <Search className="search-icon" size={16} />
          <input
            type="text"
            className="search-input"
            placeholder="Search by order #, customer, or phone..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchOrders()}
          />
        </div>

        {/* Order Type Filter */}
        <select
          className="form-input"
          style={{ width: 'auto', minWidth: '130px', padding: '9px 12px' }}
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="all">All Types</option>
          <option value="dine-in">Dine In</option>
          <option value="take-out">Take Out</option>
          <option value="online">Online Delivery</option>
        </select>

        {/* Status Filter */}
        <select
          className="form-input"
          style={{ width: 'auto', minWidth: '150px', padding: '9px 12px' }}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All Statuses</option>
          <option value="sales">Completed Sales Only</option>
          <option value="refunded">Refunded / Partial</option>
          <option value="edited">Edited Orders</option>
          <option value="unpaid">Awaiting Rider / Delivery</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* ── Orders Table ───────────────────────────────────── */}
      <div className="pos-table-card">
        {loading ? (
          <div className="state-center" style={{ minHeight: '320px' }}>
            <Loader2 className="spinner" size={32} />
            <p className="state-sub">Loading orders and audit trail...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="state-center" style={{ minHeight: '320px' }}>
            <ShoppingBag size={44} className="state-icon" />
            <div className="state-title">No orders found</div>
            <p className="state-sub">No orders matching the current filter criteria.</p>
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
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((ord) => {
                const dateObj = new Date(ord.created_at);
                const timeStr = dateObj.toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                });
                const dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                const hasRefund = Number(ord.refund_amount) > 0;
                const netAmount = Math.max(0, Number(ord.total_amount) - (Number(ord.refund_amount) || 0));
                const isEdited = Boolean(ord.edited_at);

                return (
                  <tr key={ord.id}>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontWeight: 600, fontFamily: 'monospace', color: 'var(--color-brand)' }}>
                          {ord.order_number}
                        </span>
                        {isEdited && (
                          <span style={{ fontSize: '0.68rem', color: '#D97706', fontWeight: 600 }}>
                            ✎ Edited by {ord.edited_by || 'Admin'}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div>{timeStr}</div>
                      {!dateFilter && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--color-muted)' }}>{dateStr}</div>
                      )}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{ord.customer_name || 'Guest'}</div>
                      {ord.contact_number && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--color-muted)' }}>{ord.contact_number}</div>
                      )}
                    </td>
                    <td>
                      <span className={`pos-badge-type ${ord.order_type}`}>
                        {ord.order_type === 'dine-in'
                          ? 'Dine In'
                          : ord.order_type === 'online'
                          ? 'Online'
                          : 'Take Out'}
                      </span>
                    </td>
                    <td>{ord.item_count || 0} items</td>
                    <td>
                      {hasRefund ? (
                        <div>
                          <div style={{ textDecoration: 'line-through', color: 'var(--color-muted)', fontSize: '0.75rem' }}>
                            ₱{Number(ord.total_amount).toFixed(2)}
                          </div>
                          <strong>₱{netAmount.toFixed(2)}</strong>
                          <div style={{ fontSize: '0.7rem', color: '#DC2626', fontWeight: 600 }}>
                            -₱{Number(ord.refund_amount).toFixed(2)} ref.
                          </div>
                        </div>
                      ) : (
                        <strong>₱{Number(ord.total_amount).toFixed(2)}</strong>
                      )}
                    </td>
                    <td style={{ textTransform: 'capitalize' }}>
                      {ord.payment_method} (₱{Number(ord.amount_paid != null ? ord.amount_paid : ord.total_amount).toFixed(2)})
                    </td>
                    <td>₱{Number(ord.change_amount || 0).toFixed(2)}</td>
                    <td>
                      <div>{ord.cashier_name || 'Staff'}</div>
                      {ord.rider_name && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--color-brand-mid)' }}>Rider: {ord.rider_name}</div>
                      )}
                    </td>
                    <td>
                      <span
                        className="badge"
                        style={{
                          background:
                            ord.status === 'completed' || ord.status === 'delivered'
                              ? 'rgba(22, 163, 74, 0.12)'
                              : ord.status === 'refunded'
                              ? 'rgba(220, 38, 38, 0.12)'
                              : ord.status === 'cancelled'
                              ? 'rgba(156, 163, 175, 0.2)'
                              : 'rgba(217, 119, 6, 0.12)',
                          color:
                            ord.status === 'completed' || ord.status === 'delivered'
                              ? '#16a34a'
                              : ord.status === 'refunded'
                              ? '#dc2626'
                              : ord.status === 'cancelled'
                              ? '#6b7280'
                              : '#d97706',
                        }}
                      >
                        {ord.status === 'completed'
                          ? 'Completed'
                          : ord.status === 'delivered'
                          ? 'Delivered'
                          : ord.status === 'refunded'
                          ? 'Refunded'
                          : ord.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '5px', alignItems: 'center', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                        {/* Receipt Button */}
                        <button
                          type="button"
                          className="btn-receipt-view"
                          onClick={() => handlePrint(ord)}
                          id={`receipt-btn-${ord.id}`}
                          title="Print compact receipt"
                        >
                          <Printer size={13} />
                          <span>Receipt</span>
                        </button>

                        {/* Edit Order (Admin only) */}
                        {!['cancelled', 'refunded'].includes(ord.status) && (
                          <button
                            type="button"
                            className="btn-receipt-view"
                            style={{ background: '#FFFBEB', color: '#D97706', borderColor: '#FDE68A' }}
                            onClick={() => handleOpenEdit(ord)}
                            id={`edit-btn-${ord.id}`}
                            title="Edit order items, quantities, pricing, or discount"
                          >
                            <Edit2 size={13} />
                            <span>Edit</span>
                          </button>
                        )}

                        {/* Refund / Missed Discount (Admin only) */}
                        {(ord.status === 'completed' || ord.status === 'delivered') && netAmount > 0 && (
                          <button
                            type="button"
                            className="btn-receipt-view"
                            style={{ background: '#FEF2F2', color: '#DC2626', borderColor: '#FECACA' }}
                            onClick={() => handleOpenRefund(ord)}
                            id={`refund-btn-${ord.id}`}
                            title="Refund or apply missed discount"
                          >
                            <RotateCcw size={13} />
                            <span>Refund</span>
                          </button>
                        )}

                        {/* View / Audit Trail */}
                        <button
                          type="button"
                          className="btn-receipt-view"
                          style={{ background: 'var(--color-cream)', color: 'var(--color-brand)', borderColor: 'var(--color-border)' }}
                          onClick={() => handleOpenView(ord.id)}
                          id={`view-btn-${ord.id}`}
                          title="View order details and audit timeline"
                        >
                          <Eye size={13} />
                          <span>View</span>
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

      {/* ── MODAL 1: EDIT ORDER (Admin unique function) ─────── */}
      {editOrder && (
        <div className="modal-overlay" onClick={() => setEditOrder(null)}>
          <div className="modal-card" style={{ maxWidth: '720px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-brand-mid)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Admin Order Correction
                </span>
                <h3 className="modal-title" style={{ marginTop: '2px' }}>
                  Edit Order &bull; {editOrder.order_number}
                </h3>
              </div>
              <button type="button" className="btn-icon" onClick={() => setEditOrder(null)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Order Info Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="form-label">Customer Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editCustomerName}
                    onChange={(e) => setEditCustomerName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="form-label">Order Type</label>
                  <select
                    className="form-input"
                    value={editOrderType}
                    onChange={(e) => setEditOrderType(e.target.value)}
                    disabled={editOrder.order_type === 'online'}
                  >
                    <option value="dine-in">Dine In</option>
                    <option value="take-out">Take Out</option>
                    {editOrder.order_type === 'online' && <option value="online">Online Delivery</option>}
                  </select>
                </div>
                <div>
                  <label className="form-label">Payment Method</label>
                  <select
                    className="form-input"
                    value={editPaymentMethod}
                    onChange={(e) => setEditPaymentMethod(e.target.value)}
                  >
                    <option value="cash">Cash</option>
                    <option value="gcash">GCash / QR</option>
                    <option value="card">Card</option>
                  </select>
                </div>
              </div>

              {/* Order Items Table */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label className="form-label" style={{ margin: 0 }}>Order Line Items</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <select
                      className="form-input"
                      style={{ padding: '4px 8px', fontSize: '0.8rem', minWidth: '180px' }}
                      value={selectedCatalogProduct}
                      onChange={(e) => setSelectedCatalogProduct(e.target.value)}
                    >
                      <option value="">+ Add Product from Catalog...</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} (₱{Number(p.price).toFixed(2)})
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="btn-add"
                      style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                      onClick={handleAddCatalogItem}
                      disabled={!selectedCatalogProduct}
                    >
                      <Plus size={14} /> Add
                    </button>
                  </div>
                </div>

                <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                  <table className="admin-table" style={{ margin: 0 }}>
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th style={{ width: '100px' }}>Unit Price (₱)</th>
                        <th style={{ width: '110px', textAlign: 'center' }}>Qty</th>
                        <th style={{ width: '90px', textAlign: 'right' }}>Subtotal</th>
                        <th style={{ width: '40px' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {editItems.map((item, idx) => (
                        <tr key={idx}>
                          <td>
                            <strong>{item.product_name}</strong>
                          </td>
                          <td>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              className="form-input"
                              style={{ padding: '3px 6px', fontSize: '0.82rem' }}
                              value={item.unit_price}
                              onChange={(e) => handleUpdateItemPrice(idx, e.target.value)}
                            />
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                              <button
                                type="button"
                                className="btn-icon"
                                style={{ width: '22px', height: '22px' }}
                                onClick={() => handleUpdateItemQty(idx, -1)}
                              >
                                -
                              </button>
                              <span style={{ fontWeight: 600, minWidth: '20px', textAlign: 'center' }}>
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                className="btn-icon"
                                style={{ width: '22px', height: '22px' }}
                                onClick={() => handleUpdateItemQty(idx, 1)}
                              >
                                +
                              </button>
                            </div>
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 700 }}>
                            ₱{(item.unit_price * item.quantity).toFixed(2)}
                          </td>
                          <td>
                            <button
                              type="button"
                              className="btn-icon"
                              style={{ width: '26px', height: '26px', color: '#DC2626' }}
                              onClick={() => handleRemoveItem(idx)}
                              title="Remove item"
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Discount Section */}
              <div style={{ background: 'var(--color-cream)', padding: '14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: editDiscount.active ? '10px' : '0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Tag size={16} color="var(--color-brand)" />
                    <span style={{ fontWeight: 700, fontSize: '0.88rem' }}>Order Discount / Promo</span>
                    {editDiscount.active && (
                      <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#16A34A', marginLeft: '6px' }}>
                        -₱{editDiscountAmount.toFixed(2)}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    className="btn-pos-aux"
                    style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                    onClick={() => setEditDiscount((d) => ({ ...d, active: !d.active }))}
                  >
                    {editDiscount.active ? 'Remove Discount' : '+ Apply Discount'}
                  </button>
                </div>

                {editDiscount.active && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {/* Quick Presets */}
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {[
                        { type: 'percent', value: '20', name: '20% Senior / PWD' },
                        { type: 'percent', value: '10', name: '10% Promo OFF' },
                        { type: 'fixed', value: '100', name: '₱100 Flat OFF' },
                        { type: 'fixed', value: '50', name: '₱50 Flat OFF' },
                      ].map((pre, i) => (
                        <button
                          key={i}
                          type="button"
                          className="btn-pos-aux"
                          style={{
                            fontSize: '0.75rem',
                            padding: '3px 8px',
                            background: String(editDiscount.value) === String(pre.value) && editDiscount.type === pre.type ? 'var(--color-brand)' : '#fff',
                            color: String(editDiscount.value) === String(pre.value) && editDiscount.type === pre.type ? '#fff' : 'var(--color-brand)',
                          }}
                          onClick={() => setEditDiscount({ active: true, type: pre.type, value: pre.value, name: pre.name })}
                        >
                          {pre.name}
                        </button>
                      ))}
                    </div>

                    {/* Manual Inputs */}
                    <div style={{ display: 'grid', gridTemplateColumns: '120px 120px 1fr', gap: '8px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--color-muted)', marginBottom: '3px' }}>Mode</label>
                        <select
                          className="form-input"
                          style={{ padding: '6px 8px', fontSize: '0.82rem' }}
                          value={editDiscount.type}
                          onChange={(e) => setEditDiscount({ ...editDiscount, type: e.target.value })}
                        >
                          <option value="percent">Percent (%)</option>
                          <option value="fixed">Fixed Flat (₱)</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--color-muted)', marginBottom: '3px' }}>Value ({editDiscount.type === 'percent' ? '%' : '₱'})</label>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          className="form-input"
                          style={{ padding: '6px 8px', fontSize: '0.82rem', fontWeight: 700 }}
                          value={editDiscount.value}
                          onChange={(e) => setEditDiscount({ ...editDiscount, value: e.target.value })}
                          placeholder={editDiscount.type === 'percent' ? 'e.g. 15' : 'e.g. 100'}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--color-muted)', marginBottom: '3px' }}>Promo Label</label>
                        <input
                          type="text"
                          className="form-input"
                          style={{ padding: '6px 8px', fontSize: '0.82rem' }}
                          placeholder="e.g. 20% Senior, ₱100 Promo"
                          value={editDiscount.name}
                          onChange={(e) => setEditDiscount({ ...editDiscount, name: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Totals Summary */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '20px', alignItems: 'center', borderTop: '1px solid var(--color-border)', paddingTop: '12px' }}>
                <div style={{ textAlign: 'right', fontSize: '0.88rem' }}>
                  <div>Subtotal: ₱{editSubtotal.toFixed(2)}</div>
                  {editDiscountAmount > 0 && (
                    <div style={{ color: '#16A34A', fontWeight: 600 }}>Discount: -₱{editDiscountAmount.toFixed(2)}</div>
                  )}
                  {editDeliveryFee > 0 && <div>Delivery Fee: ₱{editDeliveryFee.toFixed(2)}</div>}
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-brand)', marginTop: '4px' }}>
                    New Total: ₱{editTotalAmount.toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Audit Reason (Mandatory) */}
              <div>
                <label className="form-label" style={{ color: '#B45309' }}>
                  Audit Reason for Modification (Required) *
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g., Customer requested iced instead of hot, corrected wrong item placed at counter"
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  required
                />
              </div>

              {/* Modal Buttons */}
              <div className="modal-actions" style={{ marginTop: '12px' }}>
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setEditOrder(null)}
                  disabled={savingEdit}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-save"
                  disabled={savingEdit}
                >
                  {savingEdit ? 'Saving Changes...' : 'Save & Update Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 2: REFUND / MISSED DISCOUNT (Admin unique function) ── */}
      {refundOrder && (
        <div className="modal-overlay" onClick={() => setRefundOrder(null)}>
          <div className="modal-card" style={{ maxWidth: '540px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#DC2626', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Admin Refund &amp; Discount Correction
                </span>
                <h3 className="modal-title" style={{ marginTop: '2px' }}>
                  Refund Order &bull; {refundOrder.order_number}
                </h3>
              </div>
              <button type="button" className="btn-icon" onClick={() => setRefundOrder(null)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleRefundSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Order Context */}
              <div style={{ background: 'var(--color-cream)', padding: '12px 16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', fontSize: '0.88rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span>Customer: <strong>{refundOrder.customer_name}</strong></span>
                  <span>Order Total: <strong>₱{Number(refundOrder.total_amount).toFixed(2)}</strong></span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Already Refunded: ₱{(Number(refundOrder.refund_amount) || 0).toFixed(2)}</span>
                  <span style={{ color: '#16A34A', fontWeight: 700 }}>
                    Refundable Balance: ₱{remainingRefundable.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Mode Selection */}
              <div>
                <label className="form-label">Refund Type</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                  <button
                    type="button"
                    className={`chart-pill-btn ${refundMode === 'discount' ? 'active' : ''}`}
                    onClick={() => setRefundMode('discount')}
                  >
                    Missed Discount
                  </button>
                  <button
                    type="button"
                    className={`chart-pill-btn ${refundMode === 'partial' ? 'active' : ''}`}
                    onClick={() => setRefundMode('partial')}
                  >
                    Partial Amount
                  </button>
                  <button
                    type="button"
                    className={`chart-pill-btn ${refundMode === 'full' ? 'active' : ''}`}
                    onClick={() => setRefundMode('full')}
                  >
                    Full Refund
                  </button>
                </div>
              </div>

              {/* Missed Discount Mode */}
              {refundMode === 'discount' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: '#F0FDF4', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid #BBF7D0' }}>
                  <div>
                    <div style={{ fontSize: '0.86rem', color: '#166534', fontWeight: 700 }}>
                      Manual Missed Discount / Promo Refund
                    </div>
                    <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: '#15803D' }}>
                      Customer placed order without promo discount. Type any percentage or flat peso OFF to refund the discount difference automatically.
                    </p>
                  </div>

                  {/* Mode Switcher: % Percentage OFF vs ₱ Flat Pesos OFF */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#166534', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Discount Mode
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <button
                        type="button"
                        className="btn-pos-aux"
                        style={{
                          padding: '8px 12px',
                          fontWeight: 700,
                          fontSize: '0.82rem',
                          background: refundDiscount.type === 'percent' ? '#166534' : '#fff',
                          color: refundDiscount.type === 'percent' ? '#fff' : '#166534',
                          borderColor: '#166534',
                        }}
                        onClick={() => {
                          setRefundDiscount((prev) => ({
                            ...prev,
                            type: 'percent',
                            value: prev.value || '20',
                            label: `${prev.value || 20}% OFF`,
                          }));
                        }}
                      >
                        <Percent size={13} style={{ marginRight: 5, verticalAlign: 'middle' }} /> % Percentage Off
                      </button>
                      <button
                        type="button"
                        className="btn-pos-aux"
                        style={{
                          padding: '8px 12px',
                          fontWeight: 700,
                          fontSize: '0.82rem',
                          background: refundDiscount.type === 'fixed' ? '#166534' : '#fff',
                          color: refundDiscount.type === 'fixed' ? '#fff' : '#166534',
                          borderColor: '#166534',
                        }}
                        onClick={() => {
                          setRefundDiscount((prev) => ({
                            ...prev,
                            type: 'fixed',
                            value: prev.value || '100',
                            label: `₱${prev.value || 100} OFF`,
                          }));
                        }}
                      >
                        <Tag size={13} style={{ marginRight: 5, verticalAlign: 'middle' }} /> ₱ Flat Pesos Off
                      </button>
                    </div>
                  </div>

                  {/* Quick Preset Buttons (Click to Auto-fill) */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#166534', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Quick Presets (Click to Auto-fill)
                    </label>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {[
                        { type: 'percent', value: '20', label: '20% Senior / PWD' },
                        { type: 'percent', value: '10', label: '10% Promo OFF' },
                        { type: 'fixed', value: '100', label: '₱100 Flat OFF' },
                        { type: 'fixed', value: '50', label: '₱50 Flat OFF' },
                      ].map((pre, i) => (
                        <button
                          key={i}
                          type="button"
                          className="btn-pos-aux"
                          style={{
                            fontSize: '0.76rem',
                            padding: '4px 10px',
                            background: String(refundDiscount.value) === String(pre.value) && refundDiscount.type === pre.type ? '#16A34A' : '#fff',
                            color: String(refundDiscount.value) === String(pre.value) && refundDiscount.type === pre.type ? '#fff' : '#166534',
                            borderColor: '#86EFAC',
                          }}
                          onClick={() => setRefundDiscount({ type: pre.type, value: String(pre.value), label: pre.label })}
                        >
                          {pre.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Manual Typing Inputs */}
                  <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '10px' }}>
                    <div>
                      <label className="form-label" style={{ color: '#166534', fontSize: '0.76rem', marginBottom: '4px' }}>
                        {refundDiscount.type === 'percent' ? 'Discount Rate (%) *' : 'Flat Amount (₱) *'}
                      </label>
                      <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontWeight: 700, color: '#166534', fontSize: '0.85rem' }}>
                          {refundDiscount.type === 'percent' ? '%' : '₱'}
                        </span>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          max={refundDiscount.type === 'percent' ? 100 : remainingRefundable}
                          className="form-input"
                          style={{ paddingLeft: '28px', background: '#fff', borderColor: '#86EFAC', fontWeight: 700 }}
                          placeholder={refundDiscount.type === 'percent' ? 'e.g. 15' : 'e.g. 100'}
                          value={refundDiscount.value}
                          onChange={(e) => {
                            const val = e.target.value;
                            setRefundDiscount((prev) => ({
                              ...prev,
                              value: val,
                              label: prev.label ? prev.label : (prev.type === 'percent' ? `${val}% OFF` : `₱${val} OFF`),
                            }));
                          }}
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="form-label" style={{ color: '#166534', fontSize: '0.76rem', marginBottom: '4px' }}>
                        Promo Name / Reason Description
                      </label>
                      <input
                        type="text"
                        className="form-input"
                        style={{ background: '#fff', borderColor: '#86EFAC' }}
                        placeholder="e.g. Senior / PWD Discount, ₱100 Promo Voucher"
                        value={refundDiscount.label}
                        onChange={(e) => setRefundDiscount((prev) => ({ ...prev, label: e.target.value }))}
                      />
                    </div>
                  </div>

                  {/* Live Real-Time Calculation breakdown */}
                  <div style={{ background: '#fff', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid #BBF7D0', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: 'var(--color-muted)' }}>
                      <span>Original Order Subtotal:</span>
                      <span>₱{(Number(refundOrder.subtotal) || Number(refundOrder.total_amount) || 0).toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: '#166534', fontWeight: 600 }}>
                      <span>Discount Applied:</span>
                      <span>
                        {refundDiscount.type === 'percent' ? `${refundDiscount.value || 0}% OFF` : `₱${refundDiscount.value || 0} Flat OFF`}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed #BBF7D0', paddingTop: '8px' }}>
                      <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#166534' }}>
                        Refund Due to Customer:
                      </span>
                      <span style={{ fontSize: '1.35rem', fontWeight: 800, color: '#16A34A', fontFamily: 'var(--font-sans)' }}>
                        ₱{calculatedDiscountRefund.toFixed(2)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--color-muted)' }}>
                      <span>Net Total Retained:</span>
                      <strong>₱{Math.max(0, Number(refundOrder.total_amount) - calculatedDiscountRefund).toFixed(2)}</strong>
                    </div>
                  </div>
                </div>
              )}

              {/* Partial Amount Mode */}
              {refundMode === 'partial' && (
                <div>
                  <label className="form-label">Refund Amount (₱) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    max={remainingRefundable}
                    className="form-input"
                    placeholder={`Enter up to ₱${remainingRefundable.toFixed(2)}`}
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                    required
                  />
                </div>
              )}

              {/* Full Refund Mode Warning */}
              {refundMode === 'full' && (
                <div style={{ background: '#FEF2F2', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid #FECACA', color: '#991B1B', fontSize: '0.85rem' }}>
                  This will refund the full remaining amount of <strong>₱{remainingRefundable.toFixed(2)}</strong> and mark the order as <strong>Refunded</strong>.
                </div>
              )}

              {/* Refund Reason */}
              <div>
                <label className="form-label">Reason for Refund *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g., Customer had Senior Citizen card not presented at cashier, item issue"
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  required
                />
              </div>

              {/* Modal Buttons */}
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setRefundOrder(null)}
                  disabled={processingRefund}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-save"
                  style={{ background: '#DC2626' }}
                  disabled={processingRefund}
                >
                  {processingRefund ? 'Processing...' : 'Confirm Refund'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 3: VIEW ORDER & AUDIT TIMELINE ───────────── */}
      {viewOrder && (
        <div className="modal-overlay" onClick={() => setViewOrder(null)}>
          <div className="modal-card" style={{ maxWidth: '680px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-brand)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Order Details &amp; Audit Trail
                </span>
                <h3 className="modal-title" style={{ marginTop: '2px' }}>
                  {viewOrder.order_number}
                </h3>
              </div>
              <button type="button" className="btn-icon" onClick={() => setViewOrder(null)}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Info Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.85rem', background: 'var(--color-cream)', padding: '14px', borderRadius: 'var(--radius-sm)' }}>
                <div>Customer: <strong>{viewOrder.customer_name}</strong></div>
                <div>Placed At: <strong>{new Date(viewOrder.created_at).toLocaleString('en-US')}</strong></div>
                <div>Type: <strong style={{ textTransform: 'uppercase' }}>{viewOrder.order_type}</strong></div>
                <div>Payment: <strong style={{ textTransform: 'uppercase' }}>{viewOrder.payment_method}</strong></div>
                <div>Total: <strong>₱{Number(viewOrder.total_amount).toFixed(2)}</strong></div>
                <div>Cashier: <strong>{viewOrder.cashier_name || 'Staff'}</strong></div>
                {viewOrder.delivery_address && (
                  <div style={{ gridColumn: '1 / -1' }}>Address: {viewOrder.delivery_address}</div>
                )}
                {viewOrder.notes && (
                  <div style={{ gridColumn: '1 / -1', color: 'var(--color-muted)' }}>Notes: {viewOrder.notes}</div>
                )}
              </div>

              {/* Items List */}
              <div>
                <h4 style={{ fontSize: '0.9rem', color: 'var(--color-brand)', marginBottom: '8px' }}>Line Items</h4>
                <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                  <table className="admin-table" style={{ margin: 0 }}>
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th style={{ textAlign: 'center' }}>Qty</th>
                        <th style={{ textAlign: 'right' }}>Price</th>
                        <th style={{ textAlign: 'right' }}>Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(viewOrder.items || []).map((it, i) => (
                        <tr key={i}>
                          <td>{it.product_name}</td>
                          <td style={{ textAlign: 'center' }}>{it.quantity}</td>
                          <td style={{ textAlign: 'right' }}>₱{Number(it.unit_price).toFixed(2)}</td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>₱{Number(it.subtotal).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Audit Trail Timeline */}
              <div>
                <h4 style={{ fontSize: '0.9rem', color: 'var(--color-brand)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShieldCheck size={16} color="var(--color-brand)" />
                  Audit Trail &amp; Modifications Log
                </h4>
                {viewAudit.length === 0 ? (
                  <p style={{ fontSize: '0.84rem', color: 'var(--color-muted)', margin: 0 }}>
                    No edits or refunds have been applied to this order. It remains as originally placed.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {viewAudit.map((a, i) => (
                      <div
                        key={i}
                        style={{
                          background: '#fff',
                          border: '1px solid var(--color-border)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '10px 14px',
                          fontSize: '0.82rem',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                          <span style={{ fontWeight: 700, textTransform: 'uppercase', color: a.action.includes('refund') ? '#DC2626' : '#D97706' }}>
                            {a.action}
                          </span>
                          <span style={{ color: 'var(--color-muted)' }}>
                            {new Date(a.created_at).toLocaleString('en-US')}
                          </span>
                        </div>
                        <div>
                          By: <strong>{a.performed_by || 'Admin'}</strong>
                          {a.amount != null && ` &bull; Amount: ₱${Number(a.amount).toFixed(2)}`}
                        </div>
                        {a.reason && (
                          <div style={{ color: 'var(--color-muted)', marginTop: '2px', fontStyle: 'italic' }}>
                            &ldquo;{a.reason}&rdquo;
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="modal-actions" style={{ marginTop: '16px' }}>
              <button
                type="button"
                className="btn-print"
                onClick={() => {
                  setReceiptOrder(viewOrder);
                  setViewOrder(null);
                }}
              >
                <Printer size={15} /> Print Receipt
              </button>
              <button
                type="button"
                className="btn-save"
                onClick={() => setViewOrder(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 4: COMPACT RECEIPT POPUP (72mm Thermal Format) ─ */}
      {receiptOrder && (
        <div className="modal-overlay" onClick={() => setReceiptOrder(null)}>
          <div className="modal-card receipt-card" onClick={(e) => e.stopPropagation()}>
            <div className="receipt-paper" id="admin-printable-receipt">
              <div className="receipt-header">
                <img
                  src="/gians.png"
                  alt="Gian's Logo"
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    objectFit: 'contain',
                    margin: '0 auto 4px auto',
                    display: 'block',
                  }}
                />
                <div className="receipt-logo">Gian&apos;s Foodhouse</div>
                <div className="receipt-sub">Poblacion, San Miguel, Bohol</div>
                <div className="receipt-sub">Tel: 0950 498 1269</div>
                <div className="receipt-divider">- - - - - - - - - - - - - - - - - - - -</div>
              </div>

              <div className="receipt-meta">
                <div><span>Order #:</span> <strong>{receiptOrder.order_number}</strong></div>
                <div><span>Date:</span> {new Date(receiptOrder.created_at || Date.now()).toLocaleString('en-US')}</div>
                <div><span>Customer:</span> {receiptOrder.customer_name || 'Guest'}</div>
                <div>
                  <span>Type:</span>{' '}
                  {receiptOrder.order_type === 'dine-in'
                    ? 'DINE IN'
                    : receiptOrder.order_type === 'online'
                    ? 'ONLINE DELIVERY'
                    : 'TAKE OUT'}
                </div>
                {receiptOrder.delivery_address && (
                  <div><span>Address:</span> {receiptOrder.delivery_address}</div>
                )}
                <div><span>Cashier:</span> {receiptOrder.cashier_name || 'Staff'}</div>
              </div>

              <div className="receipt-divider">- - - - - - - - - - - - - - - - - - - -</div>

              <div className="receipt-items-table">
                <div className="receipt-table-header">
                  <span>Item</span>
                  <span style={{ textAlign: 'center' }}>Qty</span>
                  <span style={{ textAlign: 'right' }}>Amount</span>
                </div>

                {receiptOrder.items?.map((item, idx) => (
                  <div key={idx} className="receipt-item-row">
                    <span className="receipt-item-title">{item.product_name || item.name}</span>
                    <span style={{ textAlign: 'center' }}>{item.quantity}</span>
                    <span style={{ textAlign: 'right' }}>
                      ₱{(Number(item.unit_price || item.price) * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="receipt-divider">- - - - - - - - - - - - - - - - - - - -</div>

              <div className="receipt-totals">
                {receiptOrder.notes?.includes('[') && (
                  <div className="receipt-total-row" style={{ color: '#16a34a', fontSize: '0.78rem' }}>
                    <span>🏷️ {receiptOrder.notes.match(/\[(.*?)\]/)?.[1] || 'Discount Applied'}</span>
                  </div>
                )}
                {Number(receiptOrder.refund_amount) > 0 && (
                  <div className="receipt-total-row" style={{ color: '#dc2626', fontWeight: 600 }}>
                    <span>Refunded Amount:</span>
                    <span>-₱{Number(receiptOrder.refund_amount).toFixed(2)}</span>
                  </div>
                )}
                <div className="receipt-total-row final">
                  <span>TOTAL DUE:</span>
                  <span>₱{Math.max(0, Number(receiptOrder.total_amount) - (Number(receiptOrder.refund_amount) || 0)).toFixed(2)}</span>
                </div>
                <div className="receipt-total-row">
                  <span>Payment Method:</span>
                  <span style={{ textTransform: 'uppercase' }}>{receiptOrder.payment_method}</span>
                </div>
              </div>

              <div className="receipt-divider">- - - - - - - - - - - - - - - - - - - -</div>

              <div className="receipt-footer">
                <p>Thank you for dining at Gian&apos;s!</p>
                <small>Please keep this receipt for reference.</small>
              </div>
            </div>

            <div className="modal-actions receipt-actions">
              <button
                type="button"
                className="btn-print"
                onClick={() => printReceiptSlip('admin-printable-receipt')}
              >
                <Printer size={16} /> Print Receipt
              </button>
              <button
                type="button"
                className="btn-save"
                onClick={() => setReceiptOrder(null)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
