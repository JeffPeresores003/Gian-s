import { useState, useEffect, useMemo } from 'react';
import { useToast } from '../contexts/ToastContext';
import api from '../lib/api';
import * as XLSX from 'xlsx';
import LineGraph from './LineGraph';
import PieGraph from './PieGraph';
import {
  TrendingUp,
  Calendar,
  RefreshCw,
  Download,
  Loader2,
  ShoppingBag,
  X,
  CreditCard,
  Banknote,
  Smartphone,
  Layers,
} from 'lucide-react';

export default function AdminSalesReport() {
  const { addToast } = useToast();
  const [reportDate, setReportDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [reportData, setReportData] = useState(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [lineGraphView, setLineGraphView] = useState('daily'); // 'daily' | 'monthly'
  const [pieGraphView, setPieGraphView] = useState('category'); // 'category' | 'dining'
  const [drilldownCategory, setDrilldownCategory] = useState(null);
  const [categoryTimeframe, setCategoryTimeframe] = useState('daily'); // 'daily' | 'monthly' | 'annually'

  // Fetch report data
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
    fetchSalesReport();
  }, [reportDate]);

  // Line Graph Daily Waveform
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

  // Line Graph Monthly Waveform
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

  // Dining Type breakdown for Pie Graph
  const pieDiningData = useMemo(() => {
    if (!reportData?.order_types) return [];
    return reportData.order_types.map((o) => ({
      label: o.type === 'dine-in' ? 'Dine In' : o.type === 'online' ? 'Online' : 'Take Out',
      value: Number(o.total),
      count: o.count,
    }));
  }, [reportData]);

  // Top products for drilldown category (Daily / Monthly / Annually)
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

  // Daily money breakdown by payment method (Task 4)
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

  // Export to Excel
  const exportSalesReportExcel = () => {
    if (!reportData) return;

    const wb = XLSX.utils.book_new();

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

    if (reportData.product_breakdown?.length > 0) {
      const prodData = [
        ['Category', 'Product Item', 'Qty Sold', 'Orders Count', 'Revenue (₱)'],
        ...reportData.product_breakdown.map((p) => [
          p.category,
          p.product_name,
          p.qty_sold,
          p.order_count,
          Number(p.total).toFixed(2),
        ]),
      ];
      const ws3 = XLSX.utils.aoa_to_sheet(prodData);
      XLSX.utils.book_append_sheet(wb, ws3, 'Product Sales');
    }

    const fileName = `GiansSalesReport_Admin_${reportDate}.xlsx`;
    XLSX.writeFile(wb, fileName);
    addToast(`Report exported: ${fileName}`, 'success');
  };

  return (
    <main className="admin-content">
      {/* ── Top Header ────────────────────────────────────── */}
      <div className="pos-history-top" style={{ marginBottom: '24px' }}>
        <div>
          <h1 className="admin-page-title" style={{ margin: '0 0 4px 0' }}>Sales &amp; Earnings Reports</h1>
          <p className="admin-page-sub" style={{ margin: 0 }}>
            Inspect daily, weekly, monthly and annual revenue. Online orders record in sales only when marked delivered.
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
              id="admin-report-date-picker"
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

            <div className="pos-charts-row">
              {/* Category Breakdown Donut (Clickable - Task 4) */}
              {/* Category Breakdown Donut with Daily / Monthly / Annually Buttons */}
              <PieGraph
                data={pieCategoryData}
                title="Revenue by Product Category"
                subtitle={`Breakdown (${categoryTimeframe === 'daily' ? new Date(reportDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : categoryTimeframe === 'monthly' ? new Date(reportDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : new Date(reportDate).getFullYear()}). Click any category to view top products.`}
                donut={true}
                onItemClick={(slice) => setDrilldownCategory(slice.label)}
                selectedLabel={drilldownCategory}
                colorPalette={[
                  '#C48B3F',
                  '#2C1810',
                  '#16A34A',
                  '#D4A96A',
                  '#4F46E5',
                  '#DC2626',
                  '#0284C7',
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
                    : 'Customer order distribution between Dine-In, Online and Take-Out'
                }
                donut={true}
                colorPalette={[
                  '#16A34A',
                  '#0284C7',
                  '#4F46E5',
                  '#D97706',
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
                      Dining Type
                    </button>
                  </div>
                }
              />
            </div>

            {/* Daily Money Breakdown by Payment Method (Task 4) */}
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

          {/* Daily Breakdown for Selected Month Table */}
          <div className="pos-breakdown-section" style={{ marginTop: '24px' }}>
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

      {/* ── Category Top Products Drilldown Modal (Task 4) ── */}
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
    </main>
  );
}
