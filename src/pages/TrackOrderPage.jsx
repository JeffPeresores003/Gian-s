import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Search, Package, CheckCircle2, Loader2, ArrowRight, MapPin, Phone, User, Download, QrCode } from 'lucide-react';
import api from '../lib/api';
import { createQRCodeDataURL } from '../lib/qrcode';
import '../trk-rider.css';

/* ─── Status order & labels ───────────────────────────────────── */
const STATUS_STEPS = [
  { key: 'pending',    label: 'Pending',    desc: 'Waiting for cashier approval' },
  { key: 'confirmed',  label: 'Confirmed',  desc: 'Order approved by cashier' },
  { key: 'to_deliver', label: 'On the Way', desc: 'Rider is heading to you' },
  { key: 'delivered',  label: 'Delivered',  desc: 'Order delivered successfully' },
];

const STATUS_INDEX = {
  pending: 0,
  confirmed: 1,
  to_deliver: 2,
  delivered: 3,
  cancelled: -1,
};

/* ─── Animated SVG Tracker ─────────────────────────────────────── */
function RiderTracker({ status }) {
  const activeIdx = STATUS_INDEX[status] ?? 0;

  if (status === 'cancelled') {
    return (
      <div className="tracker-cancelled">
        <svg viewBox="0 0 80 80" width="80" height="80">
          <circle cx="40" cy="40" r="36" fill="rgba(220,50,50,0.15)" stroke="#dc3232" strokeWidth="2" />
          <path d="M25 25 L55 55 M55 25 L25 55" stroke="#dc3232" strokeWidth="4" strokeLinecap="round" />
        </svg>
        <p className="tracker-cancelled-text">Order Cancelled</p>
      </div>
    );
  }

  /* The SVG road with 4 stations + rider moving along it */
  const totalSteps = STATUS_STEPS.length - 1; // 3 segments
  const riderPct = activeIdx / totalSteps; // 0 → 1

  // Road is horizontal: x from 60 to 540 (width 480) in a 600-wide SVG
  const roadStartX = 60;
  const roadEndX = 540;
  const roadY = 90;
  const segW = (roadEndX - roadStartX) / totalSteps;

  // Rider X position
  const riderX = roadStartX + riderPct * (roadEndX - roadStartX);

  return (
    <div className="rider-tracker-wrap">
      <svg
        viewBox="0 0 600 170"
        className="rider-tracker-svg"
        aria-label={`Order status: ${status}`}
      >
        {/* ── Dashed road base ── */}
        <line
          x1={roadStartX} y1={roadY}
          x2={roadEndX}   y2={roadY}
          stroke="rgba(200,135,58,0.2)"
          strokeWidth="6"
          strokeLinecap="round"
        />

        {/* ── Filled progress road ── */}
        <line
          x1={roadStartX} y1={roadY}
          x2={riderX}     y2={roadY}
          stroke="url(#roadGrad)"
          strokeWidth="6"
          strokeLinecap="round"
        />

        {/* ── Gradient definition ── */}
        <defs>
          <linearGradient id="roadGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="#c8873a" />
            <stop offset="100%" stopColor="#e5c87a" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* ── Station dots ── */}
        {STATUS_STEPS.map((s, i) => {
          const cx = roadStartX + i * segW;
          const done = i <= activeIdx;
          const current = i === activeIdx;
          return (
            <g key={s.key}>
              {/* Outer ring for current */}
              {current && (
                <circle cx={cx} cy={roadY} r={14} fill="rgba(200,135,58,0.2)">
                  <animate attributeName="r" from="12" to="18" dur="1.4s" repeatCount="indefinite" />
                  <animate attributeName="opacity" from="0.6" to="0" dur="1.4s" repeatCount="indefinite" />
                </circle>
              )}
              <circle
                cx={cx} cy={roadY} r={10}
                fill={done ? '#c8873a' : 'rgba(255,255,255,0.08)'}
                stroke={done ? '#e5a558' : 'rgba(200,135,58,0.3)'}
                strokeWidth="2"
                filter={current ? 'url(#glow)' : undefined}
              />
              {done && (
                <path
                  d={`M${cx - 4} ${roadY} l3 3 l5 -6`}
                  stroke="#1a0a00"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              )}
              {/* Label */}
              <text
                x={cx} y={roadY + 26}
                textAnchor="middle"
                fontSize="11"
                fontWeight={current ? '700' : '400'}
                fill={done ? '#e5a558' : 'rgba(255,255,255,0.4)'}
                fontFamily="'Inter', sans-serif"
              >
                {s.label}
              </text>
              <text
                x={cx} y={roadY + 40}
                textAnchor="middle"
                fontSize="9"
                fill={done ? 'rgba(229,165,88,0.7)' : 'rgba(255,255,255,0.25)'}
                fontFamily="'Inter', sans-serif"
              >
                {s.desc}
              </text>
            </g>
          );
        })}

        {/* ── Animated Rider SVG (motorcycle + person) ── */}
        {status !== 'delivered' && (
          <g transform={`translate(${riderX - 20}, ${roadY - 46})`}>
            {/* Bounce animation */}
            <g>
              <animateTransform
                attributeName="transform"
                type="translate"
                values="0,0; 0,-3; 0,0"
                dur="0.6s"
                repeatCount="indefinite"
              />
              {/* Bike body */}
              <ellipse cx="20" cy="30" rx="16" ry="7" fill="#c8873a" opacity="0.9" />
              {/* Front wheel */}
              <circle cx="32" cy="34" r="7" fill="none" stroke="#e5a558" strokeWidth="3" />
              <circle cx="32" cy="34" r="2" fill="#e5a558" />
              {/* Rear wheel */}
              <circle cx="8" cy="34" r="7" fill="none" stroke="#e5a558" strokeWidth="3" />
              <circle cx="8" cy="34" r="2" fill="#e5a558" />
              {/* Exhaust puff */}
              <circle cx="2" cy="30" r="3" fill="rgba(255,255,255,0.2)">
                <animate attributeName="r" from="2" to="6" dur="0.8s" repeatCount="indefinite" />
                <animate attributeName="opacity" from="0.4" to="0" dur="0.8s" repeatCount="indefinite" />
              </circle>
              {/* Rider body */}
              <ellipse cx="19" cy="16" rx="7" ry="10" fill="#3d2010" />
              {/* Rider head */}
              <circle cx="20" cy="7" r="6" fill="#c8873a" />
              {/* Helmet visor */}
              <path d="M15 5 Q20 2 25 5 Q25 10 20 11 Q15 10 15 5" fill="#1a0a00" opacity="0.6" />
              {/* Arm */}
              <line x1="22" y1="18" x2="30" y2="22" stroke="#3d2010" strokeWidth="3" strokeLinecap="round" />
            </g>
          </g>
        )}

        {/* ── Delivered: house icon at the end ── */}
        {status === 'delivered' && (
          <g transform={`translate(${roadEndX - 18}, ${roadY - 50})`}>
            {/* House */}
            <polygon points="18,0 36,18 0,18" fill="#c8873a" />
            <rect x="6" y="18" width="24" height="18" fill="#c8873a" />
            <rect x="12" y="26" width="12" height="10" fill="#1a0a00" opacity="0.4" />
            {/* Check overlay */}
            <circle cx="18" cy="9" r="8" fill="#1a0a00" opacity="0.6" />
            <path d="M13 9 l3 3 l6 -6" stroke="#e5c87a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </g>
        )}
      </svg>
    </div>
  );
}

/* ─── Main Page ─────────────────────────────────────────────────── */
export default function TrackOrderPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [otnInput, setOtnInput] = useState(searchParams.get('otn') || '');
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const [pollingInterval, setPollingInterval] = useState(null);
  const [qrDataUrl, setQrDataUrl] = useState(null);

  useEffect(() => {
    if (order?.qr_token) {
      const url = createQRCodeDataURL(order.qr_token, {
        width: 300,
        margin: 3,
        color: { dark: '#20120B', light: '#FAF7F2' },
      });
      setQrDataUrl(url);
    } else {
      setQrDataUrl(null);
    }
  }, [order?.qr_token]);

  const downloadTicketPNG = () => {
    if (!order) return;
    const otn = order.order_number || '';
    const items = order.items || [];

    // Receipt dimensions — thermal-receipt style (480px width) matching Cashier receipt
    const canvasWidth = 480;
    const pad = 28;
    const lineHeight = 22;

    const dateStr = new Date(order.created_at || Date.now()).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const headerH = 145;
    const metaH = 150 + (order.notes ? 30 : 0);
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
        ['Customer:', order.customer_name || 'Guest'],
        ['Type:', 'ONLINE DELIVERY'],
      ];
      if (order.delivery_address) meta.push(['Address:', order.delivery_address]);
      if (order.contact_number) meta.push(['Contact:', order.contact_number]);
      if (order.rider_name) meta.push(['Rider:', order.rider_name]);
      meta.push(['Cashier:', 'Online Order']);
      if (order.notes) meta.push(['Note:', order.notes]);

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
        const itemPrice = Number(item.subtotal || item.unit_price * itemQty);
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
      const delFee = Number(order.delivery_fee || 0);
      const calcSubtotal = itemsSubtotal > 0 ? itemsSubtotal : Math.max(0, Number(order.total_amount || 0) - delFee);

      ctx.font = '12px "Courier New", Courier, monospace';
      ctx.fillStyle = '#555555';
      ctx.textAlign = 'left';
      ctx.fillText('Subtotal:', pad, y);
      ctx.fillStyle = '#1A1A1A';
      ctx.textAlign = 'right';
      ctx.fillText(`\u20B1${calcSubtotal.toFixed(2)}`, canvasWidth - pad, y);
      y += 18;

      if (delFee > 0) {
        ctx.fillStyle = '#555555';
        ctx.textAlign = 'left';
        ctx.fillText('Delivery Fee:', pad, y);
        ctx.fillStyle = '#1A1A1A';
        ctx.textAlign = 'right';
        ctx.fillText(`\u20B1${delFee.toFixed(2)}`, canvasWidth - pad, y);
        y += 20;
      }

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
      ctx.fillText(`\u20B1${Number(order.total_amount || 0).toFixed(2)}`, canvasWidth - pad, y + 10);

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

      // Download triggered
      const a = document.createElement('a');
      a.download = `Gians-Receipt-${otn}.png`;
      a.href = canvas.toDataURL('image/png');
      a.click();
    };

    // Load Logo & QR images
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

  const fetchOrder = async (otn) => {
    if (!otn?.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/online-orders/track/${otn.trim().toUpperCase()}`);
      setOrder(res.data.order);
    } catch (err) {
      setOrder(null);
      setError(err.response?.data?.message || 'Order not found. Please check your OTN.');
    } finally {
      setLoading(false);
    }
  };

  // Auto-fetch if OTN is in URL
  useEffect(() => {
    const urlOtn = searchParams.get('otn');
    if (urlOtn) fetchOrder(urlOtn);
  }, []);

  // Auto-poll every 15s while order is not final
  useEffect(() => {
    if (!order) return;
    const finalStatuses = ['delivered', 'cancelled'];
    if (finalStatuses.includes(order.status)) {
      if (pollingInterval) clearInterval(pollingInterval);
      return;
    }

    const interval = setInterval(() => {
      fetchOrder(order.order_number);
    }, 15000);
    setPollingInterval(interval);

    return () => clearInterval(interval);
  }, [order?.status]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchOrder(otnInput);
    // Update URL
    navigate(`/track?otn=${otnInput.trim().toUpperCase()}`, { replace: true });
  };

  const statusLabel = (s) => {
    const map = {
      pending: 'Pending Approval',
      confirmed: 'Order Confirmed',
      to_deliver: 'Out for Delivery',
      delivered: 'Delivered',
      cancelled: 'Cancelled',
    };
    return map[s] || s;
  };

  return (
    <div className="trk-page">
      {/* ── Hero Banner ── */}
      <div className="trk-hero">
        <div className="trk-hero-glow trk-hero-glow-1" />
        <div className="trk-hero-glow trk-hero-glow-2" />
        <div className="trk-hero-content">
          <span className="trk-hero-eyebrow">
            <span className="trk-hero-eyebrow-dot" />
            Order Status Center
          </span>
          <h1 className="trk-hero-title font-serif">
            Track Your <span className="trk-hero-accent">Order</span>
          </h1>
          <p className="trk-hero-sub">
            Enter your OTN to get real-time status updates on your delivery.
          </p>
        </div>
      </div>

      {/* ── Search Box ── */}
      <div className="trk-search-section">
        <form className="trk-search-form" onSubmit={handleSearch}>
          <div className="trk-search-wrap">
            <Search size={18} className="trk-search-icon" />
            <input
              className="trk-search-input"
              placeholder="Enter OTN — e.g. OTN-20260930143245"
              value={otnInput}
              onChange={(e) => setOtnInput(e.target.value.toUpperCase())}
              required
            />
            <button type="submit" className="trk-search-btn" disabled={loading} id="track-otn-btn">
              {loading ? <Loader2 className="trk-spin" size={16} /> : <ArrowRight size={16} />}
              <span>{loading ? 'Searching…' : 'Track'}</span>
            </button>
          </div>
        </form>

        {error && (
          <div className="trk-error-box">
            <span className="trk-error-icon">✕</span>
            {error}
          </div>
        )}
      </div>

      {/* ── Result Card ── */}
      {order && (
        <div className="trk-result-section">
          <div className="trk-result-card">
            {/* Card Top Strip */}
            <div className={`trk-card-strip status-strip-${order.status}`} />

            {/* Status + OTN Header */}
            <div className="trk-card-header">
              <div className="trk-otn-wrap">
                <div className="trk-otn-label">ORDER TRACKING NUMBER</div>
                <div className="trk-otn-val">{order.order_number}</div>
              </div>
              <div className={`trk-status-pill status-pill-${order.status}`}>
                {order.status === 'delivered' && <CheckCircle2 size={14} />}
                {statusLabel(order.status)}
              </div>
            </div>

            {/* SVG Rider Progress Tracker */}
            <div className="trk-tracker-wrap">
              <RiderTracker status={order.status} />
              <div className="trk-step-labels">
                {STATUS_STEPS.map((s, i) => {
                  const activeIdx = STATUS_INDEX[order.status] ?? 0;
                  const done = i <= activeIdx && order.status !== 'cancelled';
                  return (
                    <div key={s.key} className={`trk-step-label ${done ? 'trk-step-done' : ''} ${i === activeIdx && order.status !== 'cancelled' ? 'trk-step-current' : ''}`}>
                      {s.label}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Customer Details */}
            <div className="trk-info-section">
              <div className="trk-info-grid">
                <div className="trk-info-row">
                  <span className="trk-info-label"><User size={11} /> Customer</span>
                  <span className="trk-info-val">{order.customer_name}</span>
                </div>
                <div className="trk-info-row">
                  <span className="trk-info-label"><Phone size={11} /> Contact</span>
                  <span className="trk-info-val">{order.contact_number}</span>
                </div>
                <div className="trk-info-row trk-info-full">
                  <span className="trk-info-label"><MapPin size={11} /> Delivery Address</span>
                  <span className="trk-info-val">{order.delivery_address}</span>
                </div>
                {order.rider_name && (
                  <div className="trk-info-row trk-info-full">
                    <span className="trk-info-label">🏍️ Assigned Rider</span>
                    <span className="trk-info-val">{order.rider_name}</span>
                  </div>
                )}
                {Number(order.delivery_fee) > 0 && (
                  <div className="trk-info-row trk-info-full">
                    <span className="trk-info-label">Delivery Fee</span>
                    <span className="trk-info-val">₱{Number(order.delivery_fee).toFixed(2)}</span>
                  </div>
                )}
                <div className="trk-info-row trk-info-full">
                  <span className="trk-info-label">Total Amount</span>
                  <span className="trk-info-val trk-info-total">₱{Number(order.total_amount).toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div className="trk-items-section">
              <div className="trk-items-header">Items Ordered</div>
              <div className="trk-items-list">
                {order.items?.map((item, i) => (
                  <div key={i} className={`trk-item-row ${item.is_updated ? 'trk-item-updated' : ''}`}>
                    <span className="trk-item-qty">{item.quantity}×</span>
                    <span className="trk-item-name">
                      {item.product_name}
                      {item.is_updated && <span className="trk-updated-badge">Revised</span>}
                    </span>
                    <span className="trk-item-price">₱{Number(item.subtotal).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* QR Code Section */}
            {qrDataUrl && (
              <div className="trk-qr-section">
                <div className="trk-qr-badge">
                  <QrCode size={14} />
                  Rider Verification Code
                </div>
                <div className="trk-qr-img-wrap">
                  <img src={qrDataUrl} alt="Order QR Code" className="trk-qr-img" />
                </div>
                <p className="trk-qr-hint">
                  Show this QR code to the rider when they arrive. They will scan it to confirm delivery or record a cancellation on the spot.
                </p>
                <button type="button" className="trk-download-btn" onClick={downloadTicketPNG}>
                  <Download size={14} /> Download Full Ticket (PNG)
                </button>
              </div>
            )}

            {/* Auto-refresh notice */}
            {!['delivered', 'cancelled'].includes(order.status) && (
              <p className="trk-refresh-note">
                <span className="trk-refresh-dot" />
                Live — refreshes every 15 seconds
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
