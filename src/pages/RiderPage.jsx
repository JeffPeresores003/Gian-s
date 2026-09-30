import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import api from '../lib/api';
import '../trk-rider.css';
import {
  Package,
  Truck,
  CheckCircle2,
  XCircle,
  Loader2,
  LogOut,
  Search,
  RefreshCw,
  MapPin,
  Phone,
  User,
  QrCode,
  Camera,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Navigation,
  Copy,
  Check,
  ExternalLink,
  ShieldAlert,
  X,
  FileText,
  Clock,
} from 'lucide-react';

const STATUS_CONFIG = {
  confirmed: {
    label: 'Ready for Pickup',
    color: '#0284C7',
    bg: '#F0F9FF',
    border: '#BAE6FD',
    strip: 'linear-gradient(90deg, #38BDF8, #2563EB)',
  },
  to_deliver: {
    label: 'Out for Delivery',
    color: '#B27027',
    bg: '#FEF3C7',
    border: '#FDE68A',
    strip: 'linear-gradient(90deg, #D4A96A, #E8C87A)',
  },
};

/* --- Delivery Confirmation & Scanner Modal ---------------------- */
function DeliveryConfirmationModal({
  initialToken = '',
  initialOrder = null,
  activeOrders = [],
  onDelivered,
  onCancelled,
  onClose,
}) {
  const { addToast } = useToast();
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const [scanMode, setScanMode] = useState('manual'); // 'manual' | 'camera'
  const [cameraError, setCameraError] = useState('');
  const [searchInput, setSearchInput] = useState(initialToken || '');
  const [verifying, setVerifying] = useState(false);
  const [verifiedOrder, setVerifiedOrder] = useState(initialOrder);
  const [actionLoading, setActionLoading] = useState(false);
  const [showCancelPrompt, setShowCancelPrompt] = useState(false);

  // If initialOrder is provided or changed, populate verifiedOrder
  useEffect(() => {
    if (initialOrder) {
      setVerifiedOrder(initialOrder);
      // Fetch full order with items if items aren't loaded yet
      if (!initialOrder.items || initialOrder.items.length === 0) {
        api.post('/online-orders/verify-qr', { query: initialOrder.order_number })
          .then((res) => {
            if (res.data?.order) setVerifiedOrder(res.data.order);
          })
          .catch(() => {});
      }
    } else if (initialToken) {
      handleSearch(initialToken);
    }
  }, [initialOrder, initialToken]);

  // Camera scanner handling
  useEffect(() => {
    let active = true;

    if (scanMode === 'camera' && !verifiedOrder) {
      const startCamera = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: 'environment' } },
          });
          if (!active) {
            stream.getTracks().forEach((t) => t.stop());
            return;
          }
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(() => {});
          }
          setCameraError('');
        } catch (err) {
          if (active) {
            setCameraError(
              'Camera access unavailable or denied. Switch to manual search below.'
            );
            setScanMode('manual');
          }
        }
      };
      startCamera();
    }

    return () => {
      active = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [scanMode, verifiedOrder]);

  const handleSearch = async (queryToSearch) => {
    const q = (queryToSearch || searchInput).trim();
    if (!q) {
      addToast('Please enter customer name, OTN, or QR token.', 'error');
      return;
    }

    setVerifying(true);
    try {
      const res = await api.post('/online-orders/verify-qr', { query: q });
      setVerifiedOrder(res.data.order);
      addToast(`Order found for ${res.data.order.customer_name}!`, 'success');
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    } catch (err) {
      const msg = err.response?.data?.message || `No active delivery found matching "${q}".`;
      addToast(msg, 'error');
    } finally {
      setVerifying(false);
    }
  };

  const handleSelectQuickOrder = (ord) => {
    setVerifiedOrder(ord);
    if (!ord.items || ord.items.length === 0) {
      api.post('/online-orders/verify-qr', { query: ord.order_number })
        .then((res) => {
          if (res.data?.order) setVerifiedOrder(res.data.order);
        })
        .catch(() => {});
    }
  };

  const handleConfirmDelivery = async () => {
    if (!verifiedOrder) return;
    setActionLoading(true);
    try {
      await api.post('/online-orders/deliver', {
        order_id: verifiedOrder.id,
        order_number: verifiedOrder.order_number,
        qr_token: verifiedOrder.qr_token,
      });
      addToast(`Order #${verifiedOrder.order_number} marked as Delivered!`, 'success');
      onDelivered(verifiedOrder.id);
      onClose();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to complete delivery.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelByRider = async () => {
    if (!verifiedOrder) return;
    setActionLoading(true);
    try {
      await api.post('/online-orders/cancel-rider', {
        order_id: verifiedOrder.id,
        order_number: verifiedOrder.order_number,
        qr_token: verifiedOrder.qr_token,
      });
      addToast(`Order #${verifiedOrder.order_number} cancelled on delivery.`, 'warning');
      onCancelled(verifiedOrder.id);
      onClose();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to cancel order.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1000 }}>
      <div
        className="modal-card"
        style={{
          maxWidth: '540px',
          width: '100%',
          padding: '24px 26px',
          borderRadius: 'var(--radius-xl)',
          background: 'var(--color-surface)',
          boxShadow: '0 24px 60px rgba(44, 24, 16, 0.22)',
          border: '1px solid var(--color-border)',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '16px', borderBottom: '1px solid var(--color-border)', marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '38px', height: '38px', borderRadius: '10px',
              background: 'rgba(212,169,106,0.15)', border: '1px solid rgba(212,169,106,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#B27027', flexShrink: 0
            }}>
              {verifiedOrder ? <CheckCircle2 size={20} style={{ color: '#15803d' }} /> : <QrCode size={19} />}
            </div>
            <div>
              <h3 className="modal-title" style={{ fontSize: '1.25rem', margin: 0, fontFamily: 'var(--font-serif)', color: 'var(--color-brand)' }}>
                {verifiedOrder ? 'Confirm Customer Delivery' : 'Delivery Verification & Search'}
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                {verifiedOrder ? 'Verify order items, address & collect payment' : 'Search by Customer Name, OTN code, or scan receipt QR'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: '32px', height: '32px', borderRadius: '8px', border: '1px solid var(--color-border)',
              background: 'var(--color-cream)', color: 'var(--color-text-muted)', display: 'flex',
              alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.15s ease'
            }}
            title="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {!verifiedOrder ? (
            <>
              {/* Scan Mode Toggle: Manual Search vs Camera Scanner */}
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px',
                background: 'var(--color-cream)', padding: '4px', borderRadius: 'var(--radius-sm)'
              }}>
                <button
                  type="button"
                  onClick={() => setScanMode('manual')}
                  style={{
                    padding: '8px 12px', fontSize: '0.8rem', fontWeight: 700, border: 'none', borderRadius: '6px',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                    background: scanMode === 'manual' ? '#fff' : 'transparent',
                    color: scanMode === 'manual' ? 'var(--color-brand)' : 'var(--color-muted)',
                    boxShadow: scanMode === 'manual' ? '0 1px 4px rgba(44,24,16,0.08)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Search size={14} /> Manual Search
                </button>
                <button
                  type="button"
                  onClick={() => setScanMode('camera')}
                  style={{
                    padding: '8px 12px', fontSize: '0.8rem', fontWeight: 700, border: 'none', borderRadius: '6px',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                    background: scanMode === 'camera' ? '#fff' : 'transparent',
                    color: scanMode === 'camera' ? 'var(--color-brand)' : 'var(--color-muted)',
                    boxShadow: scanMode === 'camera' ? '0 1px 4px rgba(44,24,16,0.08)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Camera size={14} /> Camera Scanner
                </button>
              </div>

              {scanMode === 'camera' && (
                <div style={{
                  position: 'relative', borderRadius: 'var(--radius-md)', overflow: 'hidden',
                  border: '1.5px solid var(--color-border)', background: '#1A1208', height: '210px'
                }}>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  {/* Clean scanner viewfinder guide */}
                  <div style={{
                    position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    pointerEvents: 'none'
                  }}>
                    <div style={{
                      width: '140px', height: '140px', border: '2px solid rgba(212,169,106,0.85)',
                      borderRadius: '8px', boxShadow: '0 0 0 9999px rgba(0,0,0,0.38)'
                    }} />
                  </div>
                  <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(26,18,8,0.75)',
                    textAlign: 'center', padding: '6px 12px'
                  }}>
                    <p style={{ margin: 0, fontSize: '0.74rem', color: '#E8D8C8', fontWeight: 600 }}>
                      Align customer receipt QR within the box
                    </p>
                  </div>
                  {cameraError && (
                    <div style={{
                      position: 'absolute', inset: 0, background: 'rgba(26,18,8,0.92)',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      padding: '16px', textAlign: 'center'
                    }}>
                      <AlertTriangle style={{ color: '#F59E0B', marginBottom: '8px' }} size={24} />
                      <p style={{ margin: 0, fontSize: '0.78rem', color: '#fff', maxWidth: '280px', lineHeight: 1.4 }}>
                        {cameraError}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Manual Search Box */}
              <div style={{
                background: 'var(--color-cream)', border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)', padding: '14px 16px'
              }}>
                <label style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-brand)', marginBottom: '8px'
                }}>
                  <span>Customer Name or OTN Code</span>
                  <span style={{ fontSize: '0.72rem', fontWeight: 500, color: 'var(--color-text-muted)' }}>
                    No QR code needed
                  </span>
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <Search
                      size={14}
                      style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: '#A89F91' }}
                    />
                    <input
                      type="text"
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      placeholder="e.g. Maria Santos or OTN-..."
                      style={{
                        width: '100%', padding: '9px 12px 9px 32px', fontSize: '0.84rem',
                        fontWeight: 600, border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)',
                        background: '#fff', color: 'var(--color-brand)', outline: 'none'
                      }}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSearch()}
                    disabled={verifying || !searchInput.trim()}
                    className="btn-add"
                    style={{
                      padding: '0 16px', fontSize: '0.82rem', fontWeight: 700, whiteSpace: 'nowrap',
                      opacity: verifying || !searchInput.trim() ? 0.6 : 1
                    }}
                  >
                    {verifying ? <Loader2 size={13} className="animate-spin" /> : 'Search'}
                  </button>
                </div>
              </div>

              {/* Quick Select from Active Queue (if available) */}
              {activeOrders && activeOrders.length > 0 && (
                <div style={{ marginTop: '2px' }}>
                  <div style={{
                    fontSize: '0.74rem', fontWeight: 700, textTransform: 'uppercase',
                    color: 'var(--color-text-muted)', marginBottom: '8px', letterSpacing: '0.04em'
                  }}>
                    Select from Active Deliveries ({activeOrders.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '180px', overflowY: 'auto' }}>
                    {activeOrders.map((ord) => (
                      <div
                        key={ord.id}
                        onClick={() => handleSelectQuickOrder(ord)}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '10px 12px', background: '#fff', border: '1px solid var(--color-border)',
                          borderRadius: '8px', cursor: 'pointer', transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--color-brand-light)'; e.currentTarget.style.background = '#FDFAF7'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.background = '#fff'; }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.84rem', color: 'var(--color-brand)' }}>
                            {ord.customer_name}
                          </span>
                          <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>
                            {ord.order_number} &bull; {ord.delivery_address?.substring(0, 28)}...
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <strong style={{ fontFamily: 'monospace', fontSize: '0.86rem', color: 'var(--color-brand)' }}>
                            {'\u20B1'}{parseFloat(ord.total_amount || 0).toFixed(2)}
                          </strong>
                          <span style={{
                            padding: '3px 8px', fontSize: '0.7rem', fontWeight: 700,
                            borderRadius: '4px', background: 'rgba(212,169,106,0.15)', color: '#B27027'
                          }}>
                            Select
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Verified Order Preview & Delivered Confirmation */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => { setVerifiedOrder(null); setShowCancelPrompt(false); }}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: '0.76rem', color: 'var(--color-brand-light)', fontWeight: 600,
                    textDecoration: 'underline', padding: 0
                  }}
                >
                  &larr; Search another order
                </button>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: '5px',
                  background: 'rgba(22, 163, 74, 0.1)', color: '#15803d', border: '1px solid rgba(22, 163, 74, 0.25)',
                  borderRadius: '999px', padding: '3px 10px', fontSize: '0.74rem', fontWeight: 700
                }}>
                  <CheckCircle2 size={12} /> Ready for Confirmation
                </span>
              </div>

              {/* Customer & Address Details */}
              <div style={{
                background: 'var(--color-surface)', border: '1px solid rgba(22, 163, 74, 0.35)',
                borderRadius: 'var(--radius-md)', padding: '14px 16px', boxShadow: '0 2px 8px rgba(22,163,74,0.06)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '10px', marginBottom: '10px' }}>
                  <div>
                    <span style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>Customer</span>
                    <strong style={{ fontSize: '0.96rem', color: 'var(--color-brand)' }}>{verifiedOrder.customer_name}</strong>
                  </div>
                  <span style={{
                    fontFamily: 'monospace', fontSize: '0.8rem', fontWeight: 700,
                    color: 'var(--color-brand)', background: 'var(--color-cream)',
                    border: '1px solid var(--color-border)', padding: '3px 8px', borderRadius: '6px'
                  }}>
                    {verifiedOrder.order_number}
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.8rem' }}>
                  <div>
                    <span style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>Contact Number</span>
                    <a href={`tel:${verifiedOrder.contact_number}`} style={{ color: '#B27027', fontWeight: 700, textDecoration: 'none' }}>
                      {verifiedOrder.contact_number}
                    </a>
                  </div>
                  <div>
                    <span style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>Status</span>
                    <span style={{ fontWeight: 700, color: 'var(--color-brand)', textTransform: 'capitalize' }}>
                      {verifiedOrder.status?.replace('_', ' ')}
                    </span>
                  </div>
                  <div style={{ gridColumn: 'span 2', paddingTop: '6px', borderTop: '1px solid var(--color-border)' }}>
                    <span style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>Delivery Address</span>
                    <span style={{ color: 'var(--color-brand)', lineHeight: 1.4 }}>{verifiedOrder.delivery_address}</span>
                  </div>
                  {verifiedOrder.notes && (
                    <div style={{ gridColumn: 'span 2', paddingTop: '6px', borderTop: '1px solid var(--color-border)' }}>
                      <span style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', color: '#D97706' }}>Customer Note</span>
                      <span style={{ color: '#92400E', fontStyle: 'italic', fontSize: '0.78rem' }}>{verifiedOrder.notes}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Items List */}
              <div style={{
                background: 'var(--color-cream)', border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)', padding: '12px 14px', maxHeight: '140px', overflowY: 'auto'
              }}>
                <div style={{
                  display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', fontWeight: 700,
                  textTransform: 'uppercase', color: 'var(--color-text-muted)', borderBottom: '1px solid var(--color-border)',
                  paddingBottom: '6px', marginBottom: '8px'
                }}>
                  <span>Items</span>
                  <span>{verifiedOrder.items?.length || 0} Total</span>
                </div>
                {verifiedOrder.items && verifiedOrder.items.length > 0 ? (
                  verifiedOrder.items.map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        fontSize: '0.8rem', padding: '4px 0', borderBottom: '1px solid rgba(0,0,0,0.04)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{
                          width: '20px', height: '20px', borderRadius: '4px', background: '#fff',
                          border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center',
                          justifyContent: 'center', fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-brand)'
                        }}>
                          {item.quantity}{'\u00D7'}
                        </span>
                        <span style={{ color: 'var(--color-brand)', fontWeight: 500 }}>{item.product_name}</span>
                        {item.is_updated === 1 && (
                          <span style={{ fontSize: '0.65rem', background: '#FEF3C7', color: '#B45309', padding: '1px 4px', borderRadius: '3px', fontWeight: 700 }}>
                            Upsale
                          </span>
                        )}
                      </div>
                      <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--color-brand)' }}>
                        {'\u20B1'}{parseFloat(item.subtotal || item.unit_price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  ))
                ) : (
                  <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                    Order verified with full items.
                  </p>
                )}
              </div>

              {/* Collectible Amount Banner */}
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px 16px', background: 'rgba(212,169,106,0.14)',
                border: '1.5px solid rgba(212,169,106,0.4)', borderRadius: 'var(--radius-md)'
              }}>
                <div>
                  <span style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-brand)' }}>Amount to Collect:</span>
                  <span style={{ fontSize: '0.72rem', color: '#B27027', fontWeight: 600 }}>Cash on Delivery</span>
                </div>
                <span style={{ fontFamily: 'monospace', fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-brand)' }}>
                  {'\u20B1'}{parseFloat(verifiedOrder.total_amount || 0).toFixed(2)}
                </span>
              </div>

              {/* Cancellation Prompt */}
              {showCancelPrompt && (
                <div style={{
                  padding: '12px 14px', background: '#FEF2F2', border: '1px solid #FECACA',
                  borderRadius: 'var(--radius-md)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#B91C1C', fontSize: '0.8rem', fontWeight: 700, marginBottom: '4px' }}>
                    <ShieldAlert size={15} /> Confirm Delivery Cancellation
                  </div>
                  <p style={{ margin: '0 0 10px 0', fontSize: '0.75rem', color: '#7F1D1D', lineHeight: 1.4 }}>
                    Are you sure? This marks the order as cancelled/failed on delivery.
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setShowCancelPrompt(false)}
                      className="btn-cancel"
                      style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelByRider}
                      disabled={actionLoading}
                      style={{
                        padding: '6px 14px', fontSize: '0.78rem', fontWeight: 700,
                        background: '#DC2626', color: '#fff', border: 'none',
                        borderRadius: 'var(--radius-sm)', cursor: 'pointer'
                      }}
                    >
                      {actionLoading ? <Loader2 size={12} className="animate-spin" /> : 'Yes, Cancel Order'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        {verifiedOrder && !showCancelPrompt && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--color-border)'
          }}>
            <button
              type="button"
              onClick={() => setShowCancelPrompt(true)}
              disabled={actionLoading}
              className="btn-cancel"
              style={{
                borderColor: '#FECACA', color: '#DC2626', background: '#FEF2F2',
                padding: '9px 16px', fontSize: '0.8rem', fontWeight: 700
              }}
            >
              Cancel Order
            </button>
            <button
              type="button"
              onClick={handleConfirmDelivery}
              disabled={actionLoading}
              className="btn-save"
              style={{
                flex: 1, padding: '10px 16px', fontSize: '0.84rem', fontWeight: 700,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                background: 'linear-gradient(135deg, #15803d, #16a34a)',
                boxShadow: '0 2px 8px rgba(22,163,74,0.3)'
              }}
            >
              {actionLoading ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <>
                  <CheckCircle2 size={15} /> Confirm &amp; Complete Delivery
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* --- Main Rider Portal Page --------------------------------------- */
export default function RiderPage() {
  const { user, logout } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all'); // 'all' | 'confirmed' | 'to_deliver'
  const [expandedCards, setExpandedCards] = useState({});
  const [activeModal, setActiveModal] = useState(false);
  const [modalInitialToken, setModalInitialToken] = useState('');
  const [modalInitialOrder, setModalInitialOrder] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [copiedOtn, setCopiedOtn] = useState(null);

  const fetchOrders = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      const res = await api.get('/online-orders/rider/confirmed');
      setOrders(
        (res.data.orders || []).filter((order) =>
          ['confirmed', 'to_deliver'].includes(order.status)
        )
      );
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to load delivery queue.', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(() => {
      fetchOrders(true);
    }, 25000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  const handleLogout = async () => {
    try {
      await logout();
      addToast('Logged out successfully.', 'info');
      navigate('/admin/login');
    } catch (err) {
      addToast('Logout error: ' + err.message, 'error');
    }
  };

  const handleAcceptOrder = async (orderId) => {
    setActionLoadingId(orderId);
    try {
      await api.post(`/online-orders/${orderId}/to-deliver`);
      addToast('Order accepted! You are now out for delivery.', 'success');
      setOrders((prev) =>
        prev.map((ord) =>
          ord.id === orderId ? { ...ord, status: 'to_deliver' } : ord
        )
      );
    } catch (err) {
      addToast(err.response?.data?.message || 'Could not update order status.', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCopyOTN = (otn) => {
    navigator.clipboard.writeText(otn);
    setCopiedOtn(otn);
    setTimeout(() => setCopiedOtn(null), 2000);
    addToast(`OTN ${otn} copied to clipboard!`, 'info');
  };

  const toggleExpand = (id) => {
    setExpandedCards((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredOrders = orders.filter((ord) => {
    const matchesFilter =
      selectedFilter === 'all' ? true : ord.status === selectedFilter;
    const q = searchQuery.toLowerCase().trim();
    if (!q) return matchesFilter;

    const matchesSearch =
      ord.order_number?.toLowerCase().includes(q) ||
      ord.customer_name?.toLowerCase().includes(q) ||
      ord.contact_number?.includes(q) ||
      ord.delivery_address?.toLowerCase().includes(q);

    return matchesFilter && matchesSearch;
  });

  const readyCount = orders.filter((o) => o.status === 'confirmed').length;
  const enRouteCount = orders.filter((o) => o.status === 'to_deliver').length;

  return (
    <div className="admin-layout">

      {/* --- Navbar — same pattern as admin --- */}
      <header className="admin-navbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img
            src="/gians.png"
            alt="Gian's Logo"
            style={{ width: '34px', height: '34px', borderRadius: '50%', objectFit: 'contain', background: '#fff', padding: '2px' }}
          />
          <span className="admin-nav-title">Gian's Foodhouse &bull; Rider Portal</span>
          <span style={{ fontSize: '0.75rem', background: 'rgba(255,255,255,0.15)', padding: '3px 10px', borderRadius: '6px', color: 'rgba(255,255,255,0.95)', fontWeight: 500 }}>
            Rider: <strong>{user?.username || 'Rider'}</strong>
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.72rem', color: 'rgba(255,255,255,0.75)' }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#4ade80', display: 'inline-block', boxShadow: '0 0 6px rgba(74,222,128,0.7)' }} />
            Online
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            className="btn-admin-logout"
            onClick={() => fetchOrders(true)}
            disabled={refreshing || loading}
            title="Refresh queue"
            style={{ opacity: (refreshing || loading) ? 0.6 : 1 }}
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            className="btn-add"
            onClick={() => { setModalInitialToken(''); setModalInitialOrder(null); setActiveModal(true); }}
            title="Confirm Delivery or Scan QR"
            style={{ gap: '7px' }}
          >
            <CheckCircle2 size={15} />
            <span>Confirm Delivery / QR</span>
          </button>

          <button
            type="button"
            className="btn-admin-logout"
            onClick={handleLogout}
            title="Log Out"
          >
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* --- Main Content --- */}
      <main className="admin-content">

        {/* Page header */}
        <div className="admin-top">
          <div>
            <h1 className="admin-page-title">Delivery Queue</h1>
            <p className="admin-page-sub">Confirmed orders ready for pickup and active deliveries.</p>
          </div>

          {/* Stat badges */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              background: '#EFF6FF', border: '1px solid #BFDBFE',
              borderRadius: '12px', padding: '10px 18px',
            }}>
              <Package size={20} style={{ color: '#2563EB' }} />
              <div>
                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#1E40AF', lineHeight: 1 }}>{readyCount}</div>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#3B82F6', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ready for Pickup</div>
              </div>
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              background: '#FFFBEB', border: '1px solid #FDE68A',
              borderRadius: '12px', padding: '10px 18px',
            }}>
              <Truck size={20} style={{ color: '#D97706' }} />
              <div>
                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#92400E', lineHeight: 1 }}>{enRouteCount}</div>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#B45309', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Out for Delivery</div>
              </div>
            </div>
          </div>
        </div>

        {/* Search & Filter bar — same pattern as admin */}
        <div className="admin-search-wrap">
          <div className="search-wrap" style={{ flex: 2 }}>
            <Search className="search-icon" size={16} />
            <input
              type="text"
              className="search-input"
              placeholder="Search by OTN, customer name, or address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              id="rider-search-input"
            />
          </div>

          <select
            className="filter-select"
            value={selectedFilter}
            onChange={(e) => setSelectedFilter(e.target.value)}
            id="rider-status-filter"
            style={{ minWidth: '200px' }}
          >
            <option value="all">All Orders ({orders.length})</option>
            <option value="confirmed">Ready for Pickup ({readyCount})</option>
            <option value="to_deliver">Out for Delivery ({enRouteCount})</option>
          </select>
        </div>

        {/* Orders Table — same pattern as admin-table-wrap / admin-table */}
        <div className="admin-table-wrap">
          {loading ? (
            <div className="state-center">
              <Loader2 className="spinner" size={28} />
              <p className="state-sub">Loading delivery queue...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="state-center">
              <Package size={40} className="state-icon" />
              <div className="state-title">No Orders Found</div>
              <p className="state-sub">
                {searchQuery
                  ? `No orders matching "${searchQuery}".`
                  : 'No confirmed orders in queue right now. Auto-refreshes every 25 seconds.'}
              </p>
              {searchQuery && (
                <button type="button" onClick={() => setSearchQuery('')}
                  style={{ marginTop: '8px', fontSize: '0.82rem', color: 'var(--color-brand-light)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                  Clear Search
                </button>
              )}
            </div>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Customer</th>
                  <th>Address</th>
                  <th style={{ textAlign: 'center' }}>Items</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                  <th style={{ textAlign: 'center' }}>Status</th>
                  <th style={{ textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((ord) => {
                  const cfg = STATUS_CONFIG[ord.status];
                  if (!cfg) return null;
                  const isExpanded = !!expandedCards[ord.id];
                  const isEnRoute = ord.status === 'to_deliver';

                  return (
                    <>
                      <tr key={ord.id} style={isEnRoute ? { background: 'rgba(212,169,106,0.05)' } : {}}>
                        {/* OTN */}
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.8rem', color: 'var(--color-brand)' }}>
                              {ord.order_number}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopyOTN(ord.order_number)}
                              title="Copy OTN"
                              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: '#BFAB96' }}
                            >
                              {copiedOtn === ord.order_number
                                ? <Check size={12} style={{ color: '#059669' }} />
                                : <Copy size={12} />}
                            </button>
                          </div>
                        </td>

                        {/* Customer */}
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--color-brand)', fontSize: '0.88rem' }}>{ord.customer_name}</div>
                          <a href={`tel:${ord.contact_number}`}
                            style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--color-brand-light)', textDecoration: 'none' }}>
                            {ord.contact_number}
                          </a>
                        </td>

                        {/* Address */}
                        <td style={{ maxWidth: '220px' }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '5px' }}>
                            <MapPin size={13} style={{ color: '#f87171', flexShrink: 0, marginTop: '2px' }} />
                            <span style={{ fontSize: '0.82rem', color: 'var(--color-brand)', lineHeight: 1.4 }}>{ord.delivery_address}</span>
                          </div>
                        </td>

                        {/* Items toggle */}
                        <td style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => toggleExpand(ord.id)}
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: '4px',
                              fontSize: '0.78rem', fontWeight: 700,
                              color: 'var(--color-text-muted)', background: 'var(--color-cream)',
                              border: '1px solid var(--color-border)', borderRadius: '8px',
                              padding: '5px 10px', cursor: 'pointer',
                            }}
                          >
                            <Package size={12} style={{ color: '#C8873A' }} />
                            {ord.items?.length || 0}
                            {isExpanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                          </button>
                        </td>

                        {/* Amount */}
                        <td style={{ textAlign: 'right' }}>
                          <strong style={{ fontFamily: 'monospace', fontSize: '0.95rem', color: 'var(--color-brand)' }}>
                            {'\u20B1'}{parseFloat(ord.total_amount || 0).toFixed(2)}
                          </strong>
                        </td>

                        {/* Status */}
                        <td style={{ textAlign: 'center' }}>
                          <span className={`status-badge ${ord.status === 'confirmed' ? 'available' : ''}`}
                            style={ord.status === 'to_deliver' ? {
                              background: 'rgba(212,169,106,0.15)', color: '#B27027',
                              border: '1px solid rgba(212,169,106,0.4)', borderRadius: '999px',
                              padding: '3px 10px', fontSize: '0.72rem', fontWeight: 700,
                              display: 'inline-flex', alignItems: 'center', gap: '5px'
                            } : {}}>
                            {ord.status === 'confirmed' && <CheckCircle2 size={12} />}
                            {cfg.label}
                          </span>
                        </td>

                        {/* Action */}
                        <td style={{ textAlign: 'center' }}>
                          {ord.status === 'confirmed' ? (
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                              <button
                                type="button"
                                className="btn-add"
                                onClick={() => handleAcceptOrder(ord.id)}
                                disabled={actionLoadingId === ord.id}
                                style={{ gap: '5px', padding: '6px 12px', fontSize: '0.78rem', opacity: actionLoadingId === ord.id ? 0.6 : 1 }}
                                title="Accept order & start delivery"
                              >
                                {actionLoadingId === ord.id
                                  ? <Loader2 size={13} className="animate-spin" />
                                  : <><Truck size={13} /> Accept</>}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setModalInitialOrder(ord);
                                  setModalInitialToken(ord.order_number);
                                  setActiveModal(true);
                                }}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '6px 10px',
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  background: 'rgba(22, 163, 74, 0.1)',
                                  color: '#15803d',
                                  border: '1px solid rgba(22, 163, 74, 0.3)',
                                  borderRadius: 'var(--radius-sm)',
                                  cursor: 'pointer',
                                }}
                                title="Mark as delivered directly"
                              >
                                <CheckCircle2 size={12} /> Delivered
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              className="btn-add"
                              onClick={() => {
                                setModalInitialOrder(ord);
                                setModalInitialToken(ord.order_number);
                                setActiveModal(true);
                              }}
                              style={{
                                gap: '6px',
                                padding: '7px 14px',
                                fontSize: '0.78rem',
                                background: 'linear-gradient(135deg, #15803d, #16a34a)',
                                color: '#fff',
                                boxShadow: '0 2px 6px rgba(22, 163, 74, 0.25)',
                              }}
                              title="Confirm delivery & complete transaction"
                            >
                              <CheckCircle2 size={13} /> Delivered
                            </button>
                          )}
                        </td>
                      </tr>

                      {/* Expandable items row */}
                      {isExpanded && (
                        <tr key={`${ord.id}-items`}>
                          <td colSpan={7} style={{ padding: 0, background: '#FDFAF7', borderBottom: '1px solid var(--color-border)' }}>
                            <div style={{ padding: '12px 24px' }}>
                              {ord.notes && (
                                <div style={{
                                  display: 'flex', alignItems: 'flex-start', gap: '8px',
                                  fontSize: '0.8rem', color: '#92400E',
                                  background: '#FFFBEB', border: '1px solid #FDE68A',
                                  borderRadius: '8px', padding: '8px 12px', marginBottom: '10px'
                                }}>
                                  <FileText size={13} style={{ color: '#D97706', flexShrink: 0, marginTop: '1px' }} />
                                  <span><strong>Note:</strong> {ord.notes}</span>
                                </div>
                              )}
                              {ord.items && ord.items.length > 0 ? (
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                                  <thead>
                                    <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                                      <th style={{ padding: '5px 8px', textAlign: 'left', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--color-text-muted)', letterSpacing: '0.05em' }}>Qty</th>
                                      <th style={{ padding: '5px 8px', textAlign: 'left', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--color-text-muted)', letterSpacing: '0.05em' }}>Item</th>
                                      <th style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--color-text-muted)', letterSpacing: '0.05em' }}>Subtotal</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {ord.items.map((item, idx) => (
                                      <tr key={idx} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                        <td style={{ padding: '7px 8px', fontFamily: 'monospace', fontWeight: 700, color: '#C8873A' }}>{item.quantity}{'\u00D7'}</td>
                                        <td style={{ padding: '7px 8px', color: 'var(--color-brand)' }}>{item.product_name}</td>
                                        <td style={{ padding: '7px 8px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: 'var(--color-brand)' }}>
                                          {'\u20B1'}{parseFloat(item.subtotal || item.unit_price * item.quantity).toFixed(2)}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              ) : (
                                <p style={{ fontSize: '0.8rem', fontStyle: 'italic', color: 'var(--color-brand-light)' }}>
                                  Item details available via QR verification.
                                </p>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </main>

      {/* --- Delivery Confirmation Modal --- */}
      {activeModal && (
        <DeliveryConfirmationModal
          initialToken={modalInitialToken}
          initialOrder={modalInitialOrder}
          activeOrders={orders}
          onDelivered={(orderId) => {
            setOrders((prev) => prev.filter((o) => o.id !== orderId));
            fetchOrders(true);
          }}
          onCancelled={(orderId) => {
            setOrders((prev) => prev.filter((o) => o.id !== orderId));
            fetchOrders(true);
          }}
          onClose={() => {
            setActiveModal(false);
            setModalInitialToken('');
            setModalInitialOrder(null);
          }}
        />
      )}
    </div>
  );
}
