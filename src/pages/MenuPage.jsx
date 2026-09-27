import { useState, useEffect, useMemo } from 'react';
import {
  Search,
  RotateCcw,
  Coffee,
  AlertCircle,
  Loader2,
  CheckCircle2,
  CircleOff,
} from 'lucide-react';
import api, { getImageUrl } from '../lib/api';

export default function MenuPage() {
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

        // 1. Availability filter (All items, Available only, or Out of stock only)
        if (availabilityFilter === 'available' && !isAvail) return false;
        if (availabilityFilter === 'out_of_stock' && isAvail) return false;

        // 2. Search term check
        if (searchTerm.trim() !== '') {
          const matchName = item.name?.toLowerCase().includes(searchTerm.toLowerCase().trim());
          const matchDesc = item.description?.toLowerCase().includes(searchTerm.toLowerCase().trim());
          if (!matchName && !matchDesc) return false;
        }

        // 3. Category check
        if (selectedCategory && item.category !== selectedCategory) {
          return false;
        }

        // 4. Min price
        if (minPrice !== '' && !isNaN(Number(minPrice))) {
          if (Number(item.price) < Number(minPrice)) return false;
        }

        // 5. Max price
        if (maxPrice !== '' && !isNaN(Number(maxPrice))) {
          if (Number(item.price) > Number(maxPrice)) return false;
        }

        return true;
      })
      .sort((a, b) => {
        // Sort available items first, out of stock items follow
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

  return (
    <div className="menu-page">
      {/* ─── Header ─────────────────────────────────────────── */}
      <div className="menu-header">
        <h1 className="menu-page-title">Digital Menu</h1>
        <p className="menu-page-sub">
          Explore our seasonal roasts, specialty espresso drinks, artisanal teas, and house-made breakfast items.
        </p>
      </div>

      {/* ─── Search & Filter Bar ────────────────────────────── */}
      <div className="menu-controls">
        {/* Search */}
        <div className="search-wrap">
          <Search className="search-icon" size={18} />
          <input
            type="text"
            className="search-input"
            placeholder="Search drinks or food by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            id="menu-search-input"
          />
        </div>

        {/* Category filter */}
        <select
          className="filter-select"
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          aria-label="Filter by category"
          id="menu-category-select"
        >
          <option value="">All Categories</option>
          {categories.map((cat, idx) => (
            <option key={idx} value={cat.name || cat}>
              {cat.name || cat}
            </option>
          ))}
        </select>

        {/* Availability filter */}
        <select
          className="filter-select"
          value={availabilityFilter}
          onChange={(e) => setAvailabilityFilter(e.target.value)}
          aria-label="Filter by availability"
          id="menu-availability-select"
        >
          <option value="">All Availability</option>
          <option value="available">Available Only</option>
          <option value="out_of_stock">Out of Stock</option>
        </select>

        {/* Price Range */}
        <div className="price-filter-wrap">
          <input
            type="number"
            min="0"
            step="1"
            className="price-input"
            placeholder="Min ₱"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            aria-label="Minimum price"
            id="menu-min-price-input"
          />
          <span className="price-sep">–</span>
          <input
            type="number"
            min="0"
            step="1"
            className="price-input"
            placeholder="Max ₱"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            aria-label="Maximum price"
            id="menu-max-price-input"
          />
        </div>

        {/* Reset */}
        {hasActiveFilters && (
          <button
            type="button"
            className="btn-reset"
            onClick={handleResetFilters}
            id="menu-reset-filters-btn"
          >
            <RotateCcw size={14} style={{ display: 'inline', marginRight: '6px' }} />
            Reset
          </button>
        )}
      </div>

      {/* ─── Content States ─────────────────────────────────── */}
      {loading ? (
        <div className="state-center">
          <Loader2 className="spinner" size={32} />
          <p className="state-sub">Loading digital menu...</p>
        </div>
      ) : error ? (
        <div className="state-center">
          <AlertCircle size={40} style={{ color: 'var(--color-unavailable)', marginBottom: '8px' }} />
          <div className="state-title">Notice</div>
          <p className="state-sub">{error}</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="state-center">
          <Coffee size={48} className="state-icon" />
          <div className="state-title">No menu items found</div>
          <p className="state-sub">
            {hasActiveFilters
              ? 'Try widening your filters or clearing search criteria.'
              : 'Our digital menu is currently being refreshed.'}
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              className="btn-secondary"
              onClick={handleResetFilters}
              style={{ marginTop: '16px' }}
            >
              Clear All Filters
            </button>
          )}
        </div>
      ) : (
        /* ─── Product Grid ─────────────────────────────────── */
        <div className="products-grid">
          {filteredProducts.map((product) => {
            const isAvail = Boolean(product.is_available);
            const formattedPrice = Number(product.price).toLocaleString('en-US', {
              style: 'currency',
              currency: 'PHP',
            });

            return (
              <article
                key={product.id}
                className={`product-card ${!isAvail ? 'product-card-unavailable' : ''}`}
                id={`product-card-${product.id}`}
              >
                <div className="product-image-wrap">
                  {product.image_url ? (
                    <img
                      src={getImageUrl(product.image_url)}
                      alt={product.name}
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        const fallback = e.currentTarget.parentElement.querySelector('.product-fallback');
                        if (fallback) fallback.style.display = 'flex';
                      }}
                    />
                  ) : null}

                  <div
                    className="product-image-placeholder product-fallback"
                    style={{ display: product.image_url ? 'none' : 'flex' }}
                  >
                    <Coffee size={36} strokeWidth={1.5} />
                  </div>

                  {/* Out of Stock overlay on the image */}
                  {!isAvail && (
                    <div className="product-out-of-stock-overlay">
                      <span className="product-out-of-stock-pill">
                        <CircleOff size={13} />
                        Out of Stock
                      </span>
                    </div>
                  )}

                  {product.category && (
                    <span className="product-category-badge">{product.category}</span>
                  )}
                </div>

                <div className="product-body">
                  <h2 className="product-name">{product.name}</h2>
                  <p className="product-desc">{product.description || 'Prepared fresh upon order.'}</p>

                  <div className="product-footer">
                    <span className="product-price">{formattedPrice}</span>
                    {isAvail ? (
                      <span className="badge badge-available">
                        <CheckCircle2 size={11} />
                        Available
                      </span>
                    ) : (
                      <span className="badge badge-out-of-stock">
                        <CircleOff size={11} />
                        Out of Stock
                      </span>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
