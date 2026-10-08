import { useState, useMemo } from 'react';
import { useToast } from '../contexts/ToastContext';
import api, { getImageUrl } from '../lib/api';
import * as XLSX from 'xlsx';
import {
  Search,
  RefreshCw,
  Download,
  Edit2,
  Check,
  X,
  TrendingUp,
  Percent,
  Coins,
  AlertCircle,
  HelpCircle,
  Coffee,
  ArrowUpDown,
  Filter,
} from 'lucide-react';

export default function AdminProfitsManagement({ products = [], onProductsUpdated }) {
  const { addToast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState('margin-desc'); // 'margin-desc' | 'margin-asc' | 'profit-desc' | 'name-asc'
  const [isEditModeActive, setIsEditModeActive] = useState(false);

  // Per-row editing state: { [productId]: { cost_price: string, price: string } }
  const [editValues, setEditValues] = useState({});
  const [savingId, setSavingId] = useState(null);

  // Distinct categories
  const categories = useMemo(() => {
    const list = Array.from(new Set(products.map((p) => p.category).filter(Boolean)));
    return ['All', ...list];
  }, [products]);

  // Overall KPI statistics
  const stats = useMemo(() => {
    const total = products.length;
    let configuredCount = 0;
    let totalMarginSum = 0;
    let totalProfitSum = 0;

    products.forEach((p) => {
      const price = parseFloat(p.price) || 0;
      const cost = parseFloat(p.cost_price) || 0;
      const profit = price - cost;
      if (cost > 0) {
        configuredCount++;
        const margin = price > 0 ? (profit / price) * 100 : 0;
        totalMarginSum += margin;
      }
      totalProfitSum += profit;
    });

    const avgMargin = configuredCount > 0 ? totalMarginSum / configuredCount : 0;
    const avgProfit = total > 0 ? totalProfitSum / total : 0;
    const unconfiguredCount = total - configuredCount;

    return {
      total,
      configuredCount,
      unconfiguredCount,
      avgMargin,
      avgProfit,
    };
  }, [products]);

  // Start editing a specific product
  const handleStartEdit = (p) => {
    setEditValues((prev) => ({
      ...prev,
      [p.id]: {
        cost_price: p.cost_price != null ? String(p.cost_price) : '0.00',
        price: p.price != null ? String(p.price) : '0.00',
      },
    }));
  };

  // Cancel editing a specific product
  const handleCancelEdit = (pId) => {
    setEditValues((prev) => {
      const next = { ...prev };
      delete next[pId];
      return next;
    });
  };

  // Handle input change for a product row
  const handleValueChange = (pId, field, value) => {
    setEditValues((prev) => ({
      ...prev,
      [pId]: {
        ...(prev[pId] || {}),
        [field]: value,
      },
    }));
  };

  // Save changes for a single product
  const handleSaveProductPricing = async (product) => {
    const current = editValues[product.id];
    if (!current) return;

    const costVal = parseFloat(current.cost_price);
    const priceVal = parseFloat(current.price);

    if (isNaN(costVal) || costVal < 0) {
      addToast('Cost per item must be a valid non-negative number.', 'error');
      return;
    }
    if (isNaN(priceVal) || priceVal < 0) {
      addToast('Selling price must be a valid non-negative number.', 'error');
      return;
    }

    setSavingId(product.id);
    try {
      await api.patch(`/admin/products/${product.id}/pricing`, {
        cost_price: costVal,
        price: priceVal,
      });

      addToast(`Updated pricing & profit for "${product.name}"!`, 'success');
      handleCancelEdit(product.id);
      if (onProductsUpdated) await onProductsUpdated();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update pricing.';
      addToast(msg, 'error');
    } finally {
      setSavingId(null);
    }
  };

  // Enable edit mode for all items
  const handleToggleGlobalEditMode = () => {
    if (isEditModeActive) {
      // Exit global edit mode (clear edits)
      setEditValues({});
      setIsEditModeActive(false);
    } else {
      // Populate all currently visible products into edit values
      const initial = {};
      products.forEach((p) => {
        initial[p.id] = {
          cost_price: p.cost_price != null ? String(p.cost_price) : '0.00',
          price: p.price != null ? String(p.price) : '0.00',
        };
      });
      setEditValues(initial);
      setIsEditModeActive(true);
    }
  };

  // Filtered and sorted products
  const processedProducts = useMemo(() => {
    return products
      .filter((p) => {
        const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
        const matchesSearch =
          searchTerm.trim() === '' ||
          p.name.toLowerCase().includes(searchTerm.toLowerCase().trim()) ||
          p.category.toLowerCase().includes(searchTerm.toLowerCase().trim());
        return matchesCategory && matchesSearch;
      })
      .sort((a, b) => {
        const priceA = parseFloat(a.price) || 0;
        const costA = parseFloat(a.cost_price) || 0;
        const profitA = priceA - costA;
        const marginA = priceA > 0 ? (profitA / priceA) * 100 : 0;

        const priceB = parseFloat(b.price) || 0;
        const costB = parseFloat(b.cost_price) || 0;
        const profitB = priceB - costB;
        const marginB = priceB > 0 ? (profitB / priceB) * 100 : 0;

        if (sortBy === 'margin-desc') return marginB - marginA;
        if (sortBy === 'margin-asc') return marginA - marginB;
        if (sortBy === 'profit-desc') return profitB - profitA;
        if (sortBy === 'profit-asc') return profitA - profitB;
        if (sortBy === 'price-desc') return priceB - priceA;
        if (sortBy === 'cost-desc') return costB - costA;
        if (sortBy === 'name-asc') return a.name.localeCompare(b.name);
        return 0;
      });
  }, [products, selectedCategory, searchTerm, sortBy]);

  // Export Profits to Excel
  const exportProfitsExcel = () => {
    const wb = XLSX.utils.book_new();

    const data = [
      ['Product Name', 'Category', 'Cost per Item (Capital ₱)', 'Selling Price (Menu ₱)', 'Profit per Item (₱)', 'Margin (%)', 'Status'],
      ...processedProducts.map((p) => {
        const price = parseFloat(p.price) || 0;
        const cost = parseFloat(p.cost_price) || 0;
        const profit = price - cost;
        const margin = price > 0 ? (profit / price) * 100 : 0;
        return [
          p.name,
          p.category,
          cost.toFixed(2),
          price.toFixed(2),
          profit.toFixed(2),
          margin.toFixed(1) + '%',
          p.is_available ? 'Available' : 'Unavailable',
        ];
      }),
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Product Profits');

    const fileName = `GiansCafe_Product_Profits_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
    addToast(`Exported profits to ${fileName}`, 'success');
  };

  return (
    <main className="admin-content">
      {/* ── Top Header ────────────────────────────────────── */}
      <div className="admin-top">
        <div>
          <h1 className="admin-page-title" style={{ margin: '0 0 4px 0' }}>Product Profits &amp; Margins</h1>
          <p className="admin-page-sub" style={{ margin: 0 }}>
            Manage cost per item (capital) and menu selling price. Gross profit and margin percentages are calculated automatically.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            className={`btn-pos-aux ${isEditModeActive ? 'active' : ''}`}
            onClick={handleToggleGlobalEditMode}
            style={{
              background: isEditModeActive ? 'var(--color-brand)' : 'var(--color-cream)',
              color: isEditModeActive ? '#fff' : 'var(--color-brand)',
              borderColor: 'var(--color-border)',
              fontWeight: 600,
            }}
          >
            <Edit2 size={14} />
            {isEditModeActive ? 'Done Editing' : 'Edit Mode (All)'}
          </button>

          <button
            type="button"
            className="btn-pos-aux"
            onClick={exportProfitsExcel}
            style={{ background: '#1a7340', color: '#fff', borderColor: '#1a7340' }}
          >
            <Download size={14} /> Export to Excel
          </button>

          {onProductsUpdated && (
            <button
              type="button"
              className="btn-pos-aux"
              onClick={onProductsUpdated}
              title="Refresh product list"
            >
              <RefreshCw size={14} /> Refresh
            </button>
          )}
        </div>
      </div>

      {/* ── KPI Stat Cards ────────────────────────────────── */}
      <div className="pos-reports-grid" style={{ marginBottom: '22px' }}>
        <div className="pos-metric-card" style={{ borderLeft: '4px solid var(--color-brand)' }}>
          <div className="pos-metric-badge day" style={{ background: 'var(--color-cream)', color: 'var(--color-brand)' }}>
            Catalog Overview
          </div>
          <div className="pos-metric-amount" style={{ fontSize: '1.9rem', color: 'var(--color-brand)' }}>
            {stats.total} Products
          </div>
          <div className="pos-metric-details">
            <span><strong>{stats.configuredCount}</strong> with cost recorded</span>
            <span>{stats.unconfiguredCount > 0 ? <strong style={{ color: '#d97706' }}>{stats.unconfiguredCount} need capital set</strong> : '100% configured'}</span>
          </div>
        </div>

        <div className="pos-metric-card" style={{ borderLeft: '4px solid #16a34a' }}>
          <div className="pos-metric-badge" style={{ background: 'rgba(22, 163, 74, 0.12)', color: '#16a34a' }}>
            Average Profit Margin
          </div>
          <div className="pos-metric-amount" style={{ fontSize: '1.9rem', color: '#16a34a' }}>
            {stats.avgMargin.toFixed(1)}%
          </div>
          <div className="pos-metric-details">
            <span>Gross return on sales</span>
            <span>Healthy benchmark: &gt; 50%</span>
          </div>
        </div>

        <div className="pos-metric-card" style={{ borderLeft: '4px solid #0284c7' }}>
          <div className="pos-metric-badge" style={{ background: 'rgba(2, 132, 199, 0.12)', color: '#0284c7' }}>
            Avg Profit Per Product
          </div>
          <div className="pos-metric-amount" style={{ fontSize: '1.9rem', color: '#0284c7' }}>
            ₱{stats.avgProfit.toFixed(2)}
          </div>
          <div className="pos-metric-details">
            <span>Net gain per single unit sold</span>
            <span>(Selling Price − Cost)</span>
          </div>
        </div>

        <div className="pos-metric-card" style={{ borderLeft: '4px solid #d97706' }}>
          <div className="pos-metric-badge" style={{ background: 'rgba(217, 119, 6, 0.12)', color: '#d97706' }}>
            Cost Status
          </div>
          <div className="pos-metric-amount" style={{ fontSize: '1.9rem', color: stats.unconfiguredCount > 0 ? '#d97706' : '#16a34a' }}>
            {stats.unconfiguredCount > 0 ? `${stats.unconfiguredCount} Unset` : 'All Set'}
          </div>
          <div className="pos-metric-details">
            <span>{stats.unconfiguredCount > 0 ? 'Click Edit to input cost per item' : 'All items have cost recorded'}</span>
          </div>
        </div>
      </div>

      {/* ── Search & Filter Controls ──────────────────────── */}
      <div className="admin-search-wrap" style={{ marginBottom: '20px' }}>
        <div className="search-input-wrap" style={{ flex: 1, minWidth: '240px' }}>
          <Search size={16} className="search-icon" />
          <input
            type="search"
            className="admin-search-input"
            placeholder="Search product by name or category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Filter size={15} color="var(--color-muted)" />
            <select
              className="category-filter-select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              style={{ minWidth: '150px' }}
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c === 'All' ? 'All Categories' : c}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ArrowUpDown size={15} color="var(--color-muted)" />
            <select
              className="category-filter-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{ minWidth: '170px' }}
            >
              <option value="margin-desc">Highest Margin %</option>
              <option value="margin-asc">Lowest Margin %</option>
              <option value="profit-desc">Highest Profit (₱)</option>
              <option value="profit-asc">Lowest Profit (₱)</option>
              <option value="price-desc">Highest Selling Price</option>
              <option value="cost-desc">Highest Cost Price</option>
              <option value="name-asc">Product Name (A–Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Profits Table ─────────────────────────────────── */}
      <div className="admin-table-wrap">
        {processedProducts.length === 0 ? (
          <div className="state-center" style={{ padding: '60px 20px' }}>
            <Coffee size={40} className="state-icon" />
            <p className="state-title">No matching products found</p>
            <p className="state-sub">Try adjusting your search query or category filter.</p>
          </div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ width: '60px' }}>Item</th>
                <th>Product Name</th>
                <th>Category</th>
                <th style={{ width: '160px', textAlign: 'right' }}>Price per Item (Cost ₱)</th>
                <th style={{ width: '160px', textAlign: 'right' }}>Selling Price (Menu ₱)</th>
                <th style={{ width: '150px', textAlign: 'right' }}>Calculated Profit</th>
                <th style={{ width: '120px', textAlign: 'center' }}>Margin %</th>
                <th style={{ width: '110px', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {processedProducts.map((p) => {
                const isEditing = isEditModeActive || editValues[p.id] !== undefined;
                const draft = editValues[p.id] || {
                  cost_price: String(p.cost_price ?? 0),
                  price: String(p.price ?? 0),
                };

                const currentCost = isEditing ? parseFloat(draft.cost_price) || 0 : parseFloat(p.cost_price) || 0;
                const currentPrice = isEditing ? parseFloat(draft.price) || 0 : parseFloat(p.price) || 0;
                const calculatedProfit = currentPrice - currentCost;
                const marginPercent = currentPrice > 0 ? (calculatedProfit / currentPrice) * 100 : 0;

                const isSaving = savingId === p.id;

                // Margin badge colors
                let marginBadgeBg = 'rgba(22, 163, 74, 0.12)';
                let marginBadgeColor = '#16a34a';
                let marginLabel = 'Healthy';

                if (marginPercent <= 0) {
                  marginBadgeBg = 'rgba(220, 38, 38, 0.12)';
                  marginBadgeColor = '#dc2626';
                  marginLabel = 'Loss';
                } else if (marginPercent < 25) {
                  marginBadgeBg = 'rgba(234, 88, 12, 0.12)';
                  marginBadgeColor = '#ea580c';
                  marginLabel = 'Low';
                } else if (marginPercent < 50) {
                  marginBadgeBg = 'rgba(217, 119, 6, 0.12)';
                  marginBadgeColor = '#d97706';
                  marginLabel = 'Moderate';
                }

                return (
                  <tr key={p.id} style={{ background: isEditing ? 'rgba(196, 139, 63, 0.04)' : undefined }}>
                    {/* Thumbnail */}
                    <td>
                      <div
                        style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          background: 'var(--color-cream)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: '1px solid var(--color-border)',
                        }}
                      >
                        {p.image_url ? (
                          <img
                            src={getImageUrl(p.image_url)}
                            alt={p.name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : (
                          <Coffee size={20} color="var(--color-brand-mid)" />
                        )}
                      </div>
                    </td>

                    {/* Name & Flavors info */}
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--color-brand)' }}>{p.name}</div>
                      {p.description && (
                        <div style={{ fontSize: '0.78rem', color: 'var(--color-muted)', maxWidth: '280px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {p.description}
                        </div>
                      )}
                      {Array.isArray(p.flavors) && p.flavors.length > 0 && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--color-brand-mid)', marginTop: '2px' }}>
                          {p.flavors.length} flavor{p.flavors.length > 1 ? 's' : ''} available
                        </div>
                      )}
                    </td>

                    {/* Category */}
                    <td>
                      <span className="badge category-badge" style={{ fontSize: '0.76rem', background: 'var(--color-cream)', color: 'var(--color-brand)' }}>
                        {p.category}
                      </span>
                    </td>

                    {/* Price per Item (Cost Price / Capital) */}
                    <td style={{ textAlign: 'right' }}>
                      {isEditing ? (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-brand)' }}>₱</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            className="form-input"
                            value={draft.cost_price}
                            onChange={(e) => handleValueChange(p.id, 'cost_price', e.target.value)}
                            style={{ width: '90px', padding: '6px 8px', fontSize: '0.88rem', fontWeight: 700, textAlign: 'right' }}
                            placeholder="0.00"
                          />
                        </div>
                      ) : (
                        <div>
                          <div style={{ fontSize: '0.95rem', fontWeight: 700, color: currentCost > 0 ? 'var(--color-brand)' : '#d97706' }}>
                            ₱{currentCost.toFixed(2)}
                          </div>
                          {currentCost === 0 && (
                            <span style={{ fontSize: '0.7rem', color: '#d97706', fontWeight: 600 }}>
                              Cost not set
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Selling Price (Menu Price) */}
                    <td style={{ textAlign: 'right' }}>
                      {isEditing ? (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-brand)' }}>₱</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            className="form-input"
                            value={draft.price}
                            onChange={(e) => handleValueChange(p.id, 'price', e.target.value)}
                            style={{ width: '90px', padding: '6px 8px', fontSize: '0.88rem', fontWeight: 700, textAlign: 'right' }}
                            placeholder="0.00"
                          />
                        </div>
                      ) : (
                        <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-brand)' }}>
                          ₱{currentPrice.toFixed(2)}
                        </div>
                      )}
                    </td>

                    {/* Calculated Profit per item */}
                    <td style={{ textAlign: 'right' }}>
                      <div
                        style={{
                          fontSize: '1rem',
                          fontWeight: 800,
                          color: calculatedProfit >= 0 ? '#16a34a' : '#dc2626',
                          fontFamily: 'var(--font-sans)',
                        }}
                      >
                        {calculatedProfit >= 0 ? '+' : ''}₱{calculatedProfit.toFixed(2)}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--color-muted)' }}>
                        per unit gain
                      </div>
                    </td>

                    {/* Margin % */}
                    <td style={{ textAlign: 'center' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '3px 8px',
                          borderRadius: '12px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          background: marginBadgeBg,
                          color: marginBadgeColor,
                        }}
                        title={marginLabel}
                      >
                        {marginPercent.toFixed(1)}%
                      </span>
                    </td>

                    {/* Actions */}
                    <td style={{ textAlign: 'center' }}>
                      {isEditing ? (
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                          <button
                            type="button"
                            className="btn-table-action"
                            style={{ background: '#16a34a', color: '#fff', borderColor: '#16a34a' }}
                            onClick={() => handleSaveProductPricing(p)}
                            disabled={isSaving}
                            title="Save Pricing"
                          >
                            <Check size={14} />
                          </button>
                          <button
                            type="button"
                            className="btn-table-action btn-table-delete"
                            onClick={() => handleCancelEdit(p.id)}
                            disabled={isSaving}
                            title="Cancel Edit"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="btn-table-action btn-table-edit"
                          onClick={() => handleStartEdit(p)}
                          title="Edit Cost & Selling Price"
                        >
                          <Edit2 size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}
