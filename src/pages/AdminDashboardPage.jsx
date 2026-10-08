import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import api, { getImageUrl } from '../lib/api';
import * as XLSX from 'xlsx';
import {
  Plus,
  Edit2,
  Trash2,
  Search,
  LogOut,
  Coffee,
  X,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ExternalLink,
  ImagePlus,
  Link,
  Boxes,
  ShoppingBag,
  TrendingDown,
  TrendingUp,
  ArrowUpDown,
  Layers,
  UtensilsCrossed,
  Download,
  Upload,
  FileSpreadsheet,
  CircleDollarSign,
} from 'lucide-react';
import AdminOrderManagement from '../components/AdminOrderManagement';
import AdminSalesReport from '../components/AdminSalesReport';
import AdminProfitsManagement from '../components/AdminProfitsManagement';
import FlavorEditor from '../components/FlavorEditor';

const INITIAL_PRODUCT_FORM = {
  id: null,
  name: '',
  description: '',
  price: '',
  cost_price: '',
  category: 'Coffee',
  image_url: '',
  is_available: true,
  flavors: [],
};

const INITIAL_STOCK_FORM = {
  id: null,
  item_name: '',
  category: 'Dairy',
  quantity: '',
  unit: 'Liters',
  min_quantity: '5',
  cost_per_unit: '',
  notes: '',
};

export default function AdminDashboardPage() {
  const { user, logout } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  // Active top navigation tab: 'products' | 'stocks'
  const [activeTab, setActiveTab] = useState('products');

  // ============================================================
  //  MENU PRODUCTS STATE
  // ============================================================
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // Product Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState(INITIAL_PRODUCT_FORM);
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  // Image upload states
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [uploadMode, setUploadMode] = useState('file');
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Delete product confirmation
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // ============================================================
  //  RAW STOCK INVENTORY STATE
  // ============================================================
  const [stocks, setStocks] = useState([]);
  const [loadingStocks, setLoadingStocks] = useState(false);
  const [stockSearch, setStockSearch] = useState('');
  const [stockCategoryFilter, setStockCategoryFilter] = useState('');
  const [stockStatusFilter, setStockStatusFilter] = useState('');

  // Stock Modal states
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [stockFormData, setStockFormData] = useState(INITIAL_STOCK_FORM);
  const [stockSaving, setStockSaving] = useState(false);
  const [stockFormErrors, setStockFormErrors] = useState({});

  // Delete stock confirmation
  const [deleteStockTarget, setDeleteStockTarget] = useState(null);
  const [deletingStock, setDeletingStock] = useState(false);
  const importFileRef = useRef(null);

  // ============================================================
  //  FETCH DATA
  // ============================================================
  const fetchProducts = async () => {
    setLoadingProducts(true);
    try {
      const res = await api.get('/admin/products');
      setProducts(res.data?.products || []);

      const distinctCats = Array.from(
        new Set((res.data?.products || []).map((p) => p.category).filter(Boolean))
      );
      setCategories(distinctCats.length > 0 ? distinctCats : ['Coffee', 'Tea', 'Pastries', 'Beverages']);
    } catch {
      addToast('Failed to load products list.', 'error');
    } finally {
      setLoadingProducts(false);
    }
  };

  const fetchStocks = async () => {
    setLoadingStocks(true);
    try {
      const res = await api.get('/admin/inventory');
      setStocks(res.data?.stocks || []);
    } catch {
      addToast('Failed to load raw stock supplies.', 'error');
    } finally {
      setLoadingStocks(false);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchStocks();
  }, []);

  // Filtered products list
  const filteredProducts = useMemo(() => {
    return products.filter((item) => {
      const matchesSearch =
        searchTerm.trim() === '' ||
        item.name.toLowerCase().includes(searchTerm.toLowerCase().trim()) ||
        item.category.toLowerCase().includes(searchTerm.toLowerCase().trim());
      const matchesCategory = categoryFilter === '' || item.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, categoryFilter]);

  // Filtered stock inventory list
  const filteredStocks = useMemo(() => {
    return stocks.filter((item) => {
      const matchesSearch =
        stockSearch.trim() === '' ||
        item.item_name.toLowerCase().includes(stockSearch.toLowerCase().trim()) ||
        item.category.toLowerCase().includes(stockSearch.toLowerCase().trim()) ||
        (item.notes && item.notes.toLowerCase().includes(stockSearch.toLowerCase().trim()));
      const matchesCategory = stockCategoryFilter === '' || item.category === stockCategoryFilter;
      const matchesStatus = stockStatusFilter === '' || item.stock_status === stockStatusFilter;
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [stocks, stockSearch, stockCategoryFilter, stockStatusFilter]);

  // Stock categories list
  const stockCategories = useMemo(() => {
    const cats = Array.from(new Set(stocks.map((s) => s.category).filter(Boolean)));
    return cats.length > 0 ? cats : ['Dairy', 'Coffee & Beans', 'Frozen & Meat', 'Bakery', 'Condiments', 'Packaging', 'Dry Goods'];
  }, [stocks]);

  // Low stock items count
  const lowStockCount = useMemo(() => {
    return stocks.filter((s) => s.stock_status === 'low_stock' || s.stock_status === 'out_of_stock').length;
  }, [stocks]);

  // ============================================================
  //  PRODUCT HANDLERS
  // ============================================================
  const resetImageState = () => {
    setImageFile(null);
    setImagePreview('');
    setUploadMode('file');
    setIsDragOver(false);
    setUploading(false);
  };

  const handleOpenAddProduct = () => {
    setFormData({
      ...INITIAL_PRODUCT_FORM,
      category: categories[0] || 'Coffee',
    });
    resetImageState();
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleOpenEditProduct = (product) => {
    setFormData({
      id: product.id,
      name: product.name,
      description: product.description || '',
      price: product.price,
      cost_price: product.cost_price != null ? String(product.cost_price) : '',
      category: product.category,
      image_url: product.image_url || '',
      is_available: Boolean(product.is_available),
      flavors: Array.isArray(product.flavors) ? product.flavors.map((f) => ({ ...f })) : [],
    });
    if (product.image_url) {
      setImagePreview(getImageUrl(product.image_url));
      setUploadMode(
        product.image_url.startsWith('data:image') ||
        product.image_url.startsWith('/uploads') ||
        product.image_url.includes('/uploads/')
          ? 'file'
          : 'url'
      );
    } else {
      resetImageState();
    }
    setImageFile(null);
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleToggleAvailability = async (product) => {
    const newStatus = !product.is_available;
    try {
      await api.patch(`/admin/products/${product.id}/availability`, {
        is_available: newStatus,
      });
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, is_available: newStatus ? 1 : 0 } : p))
      );
      addToast(
        `"${product.name}" marked as ${newStatus ? 'Available' : 'Unavailable'}.`,
        'success'
      );
    } catch {
      addToast('Failed to update product availability.', 'error');
    }
  };

  const handleFileSelect = useCallback((file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      addToast('Please select an image file (JPEG, PNG, WebP, etc.).', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      addToast('Image must be smaller than 5 MB.', 'error');
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }, [addToast]);

  const handleDropZoneDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDropZoneDragLeave = () => setIsDragOver(false);

  const handleDropZoneDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    handleFileSelect(file);
  };

  const handleRemoveImage = () => {
    if (imagePreview && imagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreview);
    }
    setImageFile(null);
    setImagePreview('');
    setFormData((prev) => ({ ...prev, image_url: '' }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const validateProductForm = () => {
    const errors = {};
    if (!formData.name.trim()) errors.name = 'Product name is required.';
    if (!formData.price || isNaN(Number(formData.price)) || Number(formData.price) < 0) {
      errors.price = 'Valid non-negative price is required.';
    }
    if (!formData.category.trim()) errors.category = 'Category is required.';
    if (
      uploadMode === 'url' &&
      formData.image_url &&
      !formData.image_url.match(/^(https?:\/\/|data:image\/|\/uploads\/)/)
    ) {
      errors.image_url = 'Image URL must start with http:// or https://';
    }
    return errors;
  };

  const handleSubmitProductForm = async (e) => {
    e.preventDefault();
    const errors = validateProductForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setSaving(true);
    try {
      let resolvedImageUrl = formData.image_url?.trim() || null;

      if (imageFile) {
        setUploading(true);
        const fd = new FormData();
        fd.append('image', imageFile);
        const uploadRes = await api.post('/admin/upload', fd);
        resolvedImageUrl = uploadRes.data.image_url;
        setUploading(false);
      }

      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        price: parseFloat(formData.price),
        cost_price: formData.cost_price !== '' && formData.cost_price != null ? parseFloat(formData.cost_price) : 0,
        category: formData.category.trim(),
        image_url: resolvedImageUrl,
        is_available: Boolean(formData.is_available),
        flavors: formData.flavors || [],
      };

      if (formData.id) {
        await api.put(`/admin/products/${formData.id}`, payload);
        addToast('Product successfully updated.', 'success');
      } else {
        await api.post('/admin/products', payload);
        addToast('New product added to catalog.', 'success');
      }

      setIsModalOpen(false);
      resetImageState();
      fetchProducts();
    } catch (err) {
      setUploading(false);
      const msg = err.response?.data?.message || 'Failed to save product.';
      addToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProductConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/admin/products/${deleteTarget.id}`);
      addToast(`"${deleteTarget.name}" deleted from menu.`, 'success');
      setDeleteTarget(null);
      fetchProducts();
    } catch {
      addToast('Failed to delete product.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  // ============================================================
  //  RAW STOCK INVENTORY HANDLERS
  // ============================================================
  const handleOpenAddStock = () => {
    setStockFormData({
      ...INITIAL_STOCK_FORM,
      category: stockCategories[0] || 'Dairy',
    });
    setStockFormErrors({});
    setIsStockModalOpen(true);
  };

  const handleOpenEditStock = (stock) => {
    setStockFormData({
      id: stock.id,
      item_name: stock.item_name,
      category: stock.category,
      quantity: stock.quantity,
      unit: stock.unit,
      min_quantity: stock.min_quantity,
      cost_per_unit: stock.cost_per_unit || '',
      notes: stock.notes || '',
    });
    setStockFormErrors({});
    setIsStockModalOpen(true);
  };

  const validateStockForm = () => {
    const errors = {};
    if (!stockFormData.item_name.trim()) errors.item_name = 'Item name is required.';
    if (!stockFormData.unit.trim()) errors.unit = 'Unit is required (e.g. Liters, kg, Pieces).';
    if (isNaN(Number(stockFormData.quantity)) || Number(stockFormData.quantity) < 0) {
      errors.quantity = 'Non-negative quantity is required.';
    }
    if (isNaN(Number(stockFormData.min_quantity)) || Number(stockFormData.min_quantity) < 0) {
      errors.min_quantity = 'Non-negative reorder threshold is required.';
    }
    return errors;
  };

  const handleSubmitStockForm = async (e) => {
    e.preventDefault();
    const errors = validateStockForm();
    if (Object.keys(errors).length > 0) {
      setStockFormErrors(errors);
      return;
    }

    setStockSaving(true);
    try {
      const payload = {
        item_name: stockFormData.item_name.trim(),
        category: stockFormData.category.trim(),
        quantity: parseFloat(stockFormData.quantity) || 0,
        unit: stockFormData.unit.trim(),
        min_quantity: parseFloat(stockFormData.min_quantity) || 5,
        cost_per_unit: stockFormData.cost_per_unit ? parseFloat(stockFormData.cost_per_unit) : null,
        notes: stockFormData.notes.trim() || null,
      };

      if (stockFormData.id) {
        await api.put(`/admin/inventory/${stockFormData.id}`, payload);
        addToast(`Stock item "${payload.item_name}" updated.`, 'success');
      } else {
        await api.post('/admin/inventory', payload);
        addToast(`New stock item "${payload.item_name}" added.`, 'success');
      }

      setIsStockModalOpen(false);
      fetchStocks();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to save stock item.';
      addToast(msg, 'error');
    } finally {
      setStockSaving(false);
    }
  };

  // Quick quantity adjustment (+1, -1, +5, -5) directly in row
  const handleQuickAdjustStock = async (stock, delta) => {
    try {
      const res = await api.patch(`/admin/inventory/${stock.id}/adjust`, { delta });
      const updatedStock = res.data?.stock;

      setStocks((prev) =>
        prev.map((s) => {
          if (s.id === stock.id) {
            const newQty = Math.max(0, Number(s.quantity) + delta);
            const newStatus =
              newQty <= 0 ? 'out_of_stock' : newQty <= Number(s.min_quantity) ? 'low_stock' : 'in_stock';
            return { ...s, quantity: newQty, stock_status: newStatus };
          }
          return s;
        })
      );

      const sign = delta > 0 ? `+${delta}` : `${delta}`;
      addToast(`${stock.item_name}: adjusted by ${sign} ${stock.unit}.`, 'info');
    } catch {
      addToast('Failed to adjust stock quantity.', 'error');
    }
  };

  const handleDeleteStockConfirm = async () => {
    if (!deleteStockTarget) return;
    setDeletingStock(true);
    try {
      await api.delete(`/admin/inventory/${deleteStockTarget.id}`);
      addToast(`"${deleteStockTarget.item_name}" removed from stock inventory.`, 'success');
      setDeleteStockTarget(null);
      fetchStocks();
    } catch {
      addToast('Failed to delete stock item.', 'error');
    } finally {
      setDeletingStock(false);
    }
  };

  // ── Export Inventory to Excel ──
  const exportInventoryExcel = () => {
    if (stocks.length === 0) {
      addToast('No stock data to export.', 'info');
      return;
    }
    const wb = XLSX.utils.book_new();
    const headers = ['Item Name', 'Category', 'Quantity', 'Unit', 'Min Quantity', 'Cost Per Unit', 'Status', 'Notes'];
    const rows = stocks.map((s) => [
      s.item_name,
      s.category,
      Number(s.quantity),
      s.unit,
      Number(s.min_quantity),
      s.cost_per_unit ? Number(s.cost_per_unit) : '',
      s.stock_status,
      s.notes || '',
    ]);
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    XLSX.utils.book_append_sheet(wb, ws, 'Inventory');
    const fileName = `GiansInventory_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
    addToast(`Inventory exported: ${fileName}`, 'success');
  };

  // ── Import Inventory from Excel ──
  const handleImportExcel = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (importFileRef.current) importFileRef.current.value = '';

    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });

      if (rows.length === 0) {
        addToast('Excel file is empty or has no data rows.', 'error');
        return;
      }

      let successCount = 0;
      let errorCount = 0;

      for (const row of rows) {
        const itemName = String(row['Item Name'] || row['item_name'] || '').trim();
        const category = String(row['Category'] || row['category'] || 'Dry Goods').trim();
        const quantity = parseFloat(row['Quantity'] || row['quantity'] || 0);
        const unit = String(row['Unit'] || row['unit'] || 'pcs').trim();
        const minQty = parseFloat(row['Min Quantity'] || row['min_quantity'] || 5);
        const costPerUnit = parseFloat(row['Cost Per Unit'] || row['cost_per_unit']) || null;
        const notes = String(row['Notes'] || row['notes'] || '').trim() || null;

        if (!itemName) { errorCount++; continue; }

        try {
          await api.post('/admin/inventory', {
            item_name: itemName,
            category,
            quantity,
            unit,
            min_quantity: minQty,
            cost_per_unit: costPerUnit,
            notes,
          });
          successCount++;
        } catch {
          errorCount++;
        }
      }

      fetchStocks();
      addToast(
        `Import complete: ${successCount} items added${errorCount > 0 ? `, ${errorCount} skipped` : ''}.`,
        successCount > 0 ? 'success' : 'error'
      );
    } catch (err) {
      addToast('Failed to parse Excel file. Make sure it is a valid .xlsx file.', 'error');
    }
  };

  const handleLogout = async () => {
    await logout();
    addToast('Signed out of admin session.', 'info');
    navigate('/admin/login');
  };

  return (
    <div className="admin-layout">
      {/* ─── Admin Navbar ───────────────────────────────────── */}
      <header className="admin-navbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img
            src="/gians.png"
            alt="Gian's Logo"
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              objectFit: 'contain',
              background: '#fff',
              padding: '2px',
            }}
          />
          <span className="admin-nav-title">Gian&apos;s Foodhouse &bull; Admin Portal</span>
          <span
            style={{
              fontSize: '0.75rem',
              background: 'rgba(255, 255, 255, 0.15)',
              padding: '3px 10px',
              borderRadius: '6px',
              color: 'rgba(255, 255, 255, 0.95)',
              fontWeight: 500,
            }}
          >
            Signed in as <strong>{user?.username || 'admin'}</strong>
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Quick link to Counter POS */}
          <a
            href="/cashier/pos"
            className="btn-admin-logout"
            title="Open Counter Order Terminal"
            style={{ background: 'rgba(212, 169, 106, 0.25)', borderColor: 'var(--color-brand-mid)' }}
          >
            <ShoppingBag size={14} />
            <span>Counter POS</span>
          </a>

          <a
            href="/menu"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-admin-logout"
            title="Preview Customer Menu"
          >
            <ExternalLink size={14} />
            <span>Public Menu</span>
          </a>

          <button
            type="button"
            className="btn-admin-logout"
            onClick={handleLogout}
            id="admin-logout-btn"
          >
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* ─── Sub-Navigation Tabs ──────────────────────────────── */}
      <div className="admin-subnav">
        <div className="admin-subnav-inner">
          <button
            type="button"
            className={`admin-subnav-btn ${activeTab === 'products' ? 'active' : ''}`}
            onClick={() => setActiveTab('products')}
            id="tab-products-catalog"
          >
            <UtensilsCrossed size={16} />
            <span>Menu Catalog</span>
            <span className="subnav-pill">{products.length}</span>
          </button>

          <button
            type="button"
            className={`admin-subnav-btn ${activeTab === 'stocks' ? 'active' : ''}`}
            onClick={() => setActiveTab('stocks')}
            id="tab-stock-inventory"
          >
            <Boxes size={16} />
            <span>Stock Inventory (Raw Supplies)</span>
            <span className={`subnav-pill ${lowStockCount > 0 ? 'alert' : ''}`}>
              {stocks.length}
            </span>
          </button>

          <button
            type="button"
            className={`admin-subnav-btn ${activeTab === 'profits' ? 'active' : ''}`}
            onClick={() => setActiveTab('profits')}
            id="tab-profits"
          >
            <CircleDollarSign size={16} />
            <span>Profits</span>
          </button>

          <button
            type="button"
            className={`admin-subnav-btn ${activeTab === 'orders' ? 'active' : ''}`}
            onClick={() => setActiveTab('orders')}
            id="tab-admin-orders"
          >
            <ShoppingBag size={16} />
            <span>Order History &amp; Edits</span>
          </button>

          <button
            type="button"
            className={`admin-subnav-btn ${activeTab === 'reports' ? 'active' : ''}`}
            onClick={() => setActiveTab('reports')}
            id="tab-admin-reports"
          >
            <TrendingUp size={16} />
            <span>Sales Reports &amp; Analytics</span>
          </button>
        </div>
      </div>

      {/* ─── TAB 1: MENU PRODUCTS ─────────────────────────────── */}
      {activeTab === 'products' && (
        <main className="admin-content">
          <div className="admin-top">
            <div>
              <h1 className="admin-page-title">Menu Product Management</h1>
              <p className="admin-page-sub">
                Control menu items, upload photos, set pricing, and toggle live availability.
              </p>
            </div>

            <button
              type="button"
              className="btn-add"
              onClick={handleOpenAddProduct}
              id="admin-add-product-btn"
            >
              <Plus size={16} />
              <span>Add New Product</span>
            </button>
          </div>

          {/* Search & Filter */}
          <div className="admin-search-wrap">
            <div className="search-wrap" style={{ flex: 2 }}>
              <Search className="search-icon" size={16} />
              <input
                type="text"
                className="search-input"
                placeholder="Search products by name or category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                id="admin-search-input"
              />
            </div>

            <select
              className="filter-select"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              id="admin-category-filter"
              style={{ minWidth: '180px' }}
            >
              <option value="">All Categories</option>
              {categories.map((c, i) => (
                <option key={i} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Product Table */}
          <div className="admin-table-wrap">
            {loadingProducts ? (
              <div className="state-center">
                <Loader2 className="spinner" size={28} />
                <p className="state-sub">Loading catalog inventory...</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="state-center">
                <Coffee size={40} className="state-icon" />
                <div className="state-title">No products found</div>
                <p className="state-sub">
                  {searchTerm || categoryFilter
                    ? 'No products match your current search criteria.'
                    : 'Start by clicking "Add New Product" above.'}
                </p>
              </div>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th style={{ width: '60px' }}>Item</th>
                    <th>Product Details</th>
                    <th>Category</th>
                    <th>Price</th>
                    <th style={{ width: '130px' }}>Status</th>
                    <th style={{ width: '120px' }}>Availability</th>
                    <th style={{ width: '90px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((p) => {
                    const isAvail = Boolean(p.is_available);
                    const priceStr = Number(p.price).toLocaleString('en-US', {
                      style: 'currency',
                      currency: 'PHP',
                    });

                    return (
                      <tr key={p.id} id={`admin-product-row-${p.id}`}>
                        <td>
                          {p.image_url ? (
                            <img
                              src={getImageUrl(p.image_url)}
                              alt=""
                              className="product-thumb"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.parentElement.querySelector(
                                  '.product-thumb-placeholder'
                                ).style.display = 'flex';
                              }}
                            />
                          ) : null}
                          <div
                            className="product-thumb-placeholder"
                            style={{ display: p.image_url ? 'none' : 'flex' }}
                          >
                            <Coffee size={18} color="#D4A96A" />
                          </div>
                        </td>

                        <td>
                          <div className="product-table-name">{p.name}</div>
                          {p.description && (
                            <div className="product-table-desc">{p.description}</div>
                          )}
                        </td>

                        <td>
                          <span className="product-table-category">{p.category}</span>
                        </td>

                        <td>
                          <strong className="product-table-price">{priceStr}</strong>
                        </td>

                        <td>
                          <span className={`status-badge ${isAvail ? 'available' : 'unavailable'}`}>
                            {isAvail ? (
                              <>
                                <CheckCircle2 size={12} />
                                <span>Available</span>
                              </>
                            ) : (
                              <>
                                <AlertTriangle size={12} />
                                <span>Out of Stock</span>
                              </>
                            )}
                          </span>
                        </td>

                        <td>
                          <label className="toggle-label" title="Toggle availability">
                            <input
                              type="checkbox"
                              className="toggle-input"
                              checked={isAvail}
                              onChange={() => handleToggleAvailability(p)}
                              aria-label={`Toggle availability for ${p.name}`}
                              id={`toggle-availability-${p.id}`}
                            />
                          </label>
                        </td>

                        <td style={{ textAlign: 'right' }}>
                          <div className="table-actions">
                            <button
                              type="button"
                              className="btn-table-action btn-table-edit"
                              onClick={() => handleOpenEditProduct(p)}
                              title="Edit Product"
                              aria-label={`Edit ${p.name}`}
                              id={`edit-product-${p.id}`}
                            >
                              <Edit2 size={15} />
                            </button>
                            <button
                              type="button"
                              className="btn-table-action btn-table-delete"
                              onClick={() => setDeleteTarget(p)}
                              title="Delete Product"
                              aria-label={`Delete ${p.name}`}
                              id={`delete-product-${p.id}`}
                            >
                              <Trash2 size={15} />
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
        </main>
      )}

      {/* ─── TAB 2: RAW STOCK INVENTORY ──────────────────────── */}
      {activeTab === 'stocks' && (
        <main className="admin-content">
          <div className="admin-top">
            <div>
              <h1 className="admin-page-title">Raw Stock Supplies &amp; Ingredients</h1>
              <p className="admin-page-sub">
                Manage kitchen stocks (milks, coffee beans, burger patties, fries, condensed milk, syrups) and set low stock warnings.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              {/* Hidden file input for Excel import */}
              <input
                ref={importFileRef}
                type="file"
                accept=".xlsx,.xls"
                style={{ display: 'none' }}
                onChange={handleImportExcel}
                id="admin-import-excel-input"
              />

              <button
                type="button"
                className="btn-add"
                onClick={() => importFileRef.current?.click()}
                id="admin-import-stock-btn"
                style={{ background: 'linear-gradient(135deg, #1a7340, #145c32)', gap: '7px' }}
                title="Import stocks from Excel (.xlsx)"
              >
                <Upload size={15} />
                <span>Import Excel</span>
              </button>

              <button
                type="button"
                className="btn-add"
                onClick={exportInventoryExcel}
                id="admin-export-stock-btn"
                style={{ background: 'linear-gradient(135deg, #2563a8, #1a4a82)', gap: '7px' }}
                title="Export current inventory to Excel"
              >
                <Download size={15} />
                <span>Export Excel</span>
              </button>

              <button
                type="button"
                className="btn-add"
                onClick={handleOpenAddStock}
                id="admin-add-stock-btn"
              >
                <Plus size={16} />
                <span>Add Stock Item</span>
              </button>
            </div>
          </div>

          {/* Low Stock Warning Banner */}
          {lowStockCount > 0 && (
            <div className="stock-alert-banner">
              <AlertTriangle size={20} />
              <div>
                <strong>Low Stock Alert:</strong> There are {lowStockCount} raw stock items below their recommended minimum reorder level.
              </div>
            </div>
          )}

          {/* Stock Search & Filter Bar */}
          <div className="admin-search-wrap">
            <div className="search-wrap" style={{ flex: 2 }}>
              <Search className="search-icon" size={16} />
              <input
                type="text"
                className="search-input"
                placeholder="Search supplies by name, category, notes..."
                value={stockSearch}
                onChange={(e) => setStockSearch(e.target.value)}
                id="admin-stock-search-input"
              />
            </div>

            <select
              className="filter-select"
              value={stockCategoryFilter}
              onChange={(e) => setStockCategoryFilter(e.target.value)}
              id="admin-stock-category-filter"
              style={{ minWidth: '160px' }}
            >
              <option value="">All Categories</option>
              {stockCategories.map((c, i) => (
                <option key={i} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <select
              className="filter-select"
              value={stockStatusFilter}
              onChange={(e) => setStockStatusFilter(e.target.value)}
              id="admin-stock-status-filter"
              style={{ minWidth: '150px' }}
            >
              <option value="">All Stock Status</option>
              <option value="in_stock">In Stock</option>
              <option value="low_stock">Low Stock</option>
              <option value="out_of_stock">Out of Stock</option>
            </select>
          </div>

          {/* Raw Stocks Table */}
          <div className="admin-table-wrap">
            {loadingStocks ? (
              <div className="state-center">
                <Loader2 className="spinner" size={28} />
                <p className="state-sub">Loading raw supply inventory...</p>
              </div>
            ) : filteredStocks.length === 0 ? (
              <div className="state-center">
                <Boxes size={40} className="state-icon" />
                <div className="state-title">No stock supplies found</div>
                <p className="state-sub">
                  {stockSearch || stockCategoryFilter || stockStatusFilter
                    ? 'No supplies match your current search criteria.'
                    : 'Start by clicking "Add Stock Item" above.'}
                </p>
              </div>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Item Name &amp; Description</th>
                    <th>Category</th>
                    <th>In Stock Level</th>
                    <th>Min. Reorder</th>
                    <th>Status</th>
                    <th style={{ width: '150px' }}>Quick Adjust</th>
                    <th style={{ width: '90px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStocks.map((s) => {
                    const qtyNum = Number(s.quantity);
                    const minNum = Number(s.min_quantity);

                    return (
                      <tr key={s.id} id={`stock-row-${s.id}`}>
                        <td>
                          <div className="product-table-name">{s.item_name}</div>
                          {s.notes && (
                            <div className="product-table-desc">{s.notes}</div>
                          )}
                          {s.cost_per_unit && (
                            <span style={{ fontSize: '0.78rem', color: 'var(--color-muted)' }}>
                              Unit Cost: ₱{Number(s.cost_per_unit).toFixed(2)}
                            </span>
                          )}
                        </td>

                        <td>
                          <span className="product-table-category">{s.category}</span>
                        </td>

                        <td>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                            <strong style={{ fontSize: '1.05rem', color: 'var(--color-brand)' }}>
                              {qtyNum.toFixed(2)}
                            </strong>
                            <span style={{ fontSize: '0.82rem', color: 'var(--color-muted)' }}>
                              {s.unit}
                            </span>
                          </div>
                        </td>

                        <td>
                          <span style={{ fontSize: '0.85rem', color: 'var(--color-muted)' }}>
                            Min: {minNum.toFixed(2)} {s.unit}
                          </span>
                        </td>

                        <td>
                          <span className={`status-badge ${s.stock_status}`}>
                            {s.stock_status === 'in_stock' && (
                              <>
                                <CheckCircle2 size={12} />
                                <span>In Stock</span>
                              </>
                            )}
                            {s.stock_status === 'low_stock' && (
                              <>
                                <AlertTriangle size={12} />
                                <span>Low Stock</span>
                              </>
                            )}
                            {s.stock_status === 'out_of_stock' && (
                              <>
                                <TrendingDown size={12} />
                                <span>Out of Stock</span>
                              </>
                            )}
                          </span>
                        </td>

                        {/* Quick Adjust Buttons */}
                        <td>
                          <div className="stock-adjust-group">
                            <button
                              type="button"
                              className="btn-stock-adjust"
                              onClick={() => handleQuickAdjustStock(s, -1)}
                              title={`Deduct 1 ${s.unit}`}
                              aria-label={`Deduct 1 ${s.unit} from ${s.item_name}`}
                            >
                              -1
                            </button>
                            <button
                              type="button"
                              className="btn-stock-adjust"
                              onClick={() => handleQuickAdjustStock(s, 1)}
                              title={`Add 1 ${s.unit}`}
                              aria-label={`Add 1 ${s.unit} to ${s.item_name}`}
                            >
                              +1
                            </button>
                            <button
                              type="button"
                              className="btn-stock-adjust bulk"
                              onClick={() => handleQuickAdjustStock(s, 5)}
                              title={`Stock In +5 ${s.unit}`}
                            >
                              +5
                            </button>
                          </div>
                        </td>

                        <td style={{ textAlign: 'right' }}>
                          <div className="table-actions">
                            <button
                              type="button"
                              className="btn-table-action btn-table-edit"
                              onClick={() => handleOpenEditStock(s)}
                              title="Edit Stock Item"
                              aria-label={`Edit ${s.item_name}`}
                              id={`edit-stock-${s.id}`}
                            >
                              <Edit2 size={15} />
                            </button>
                            <button
                              type="button"
                              className="btn-table-action btn-table-delete"
                              onClick={() => setDeleteStockTarget(s)}
                              title="Delete Stock Item"
                              aria-label={`Delete ${s.item_name}`}
                              id={`delete-stock-${s.id}`}
                            >
                              <Trash2 size={15} />
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
        </main>
      )}

      {/* ─── TAB: PROFITS & MARGINS ──────────────────────────── */}
      {activeTab === 'profits' && (
        <AdminProfitsManagement products={products} onProductsUpdated={fetchProducts} />
      )}

      {/* ─── TAB 3: ORDER HISTORY & OPERATIONS ──────────────── */}
      {activeTab === 'orders' && <AdminOrderManagement products={products} />}

      {/* ─── TAB 4: SALES REPORTS & ANALYTICS ───────────────── */}
      {activeTab === 'reports' && <AdminSalesReport />}

      {/* ─── ADD/EDIT MENU PRODUCT MODAL ─────────────────────── */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => !saving && setIsModalOpen(false)}>
          <div
            className="modal-card"
            style={{ maxWidth: '460px', width: '100%', margin: '0 auto', padding: '24px 22px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2 className="modal-title">{formData.id ? 'Edit Product' : 'Add New Product'}</h2>
              <button
                type="button"
                className="btn-icon"
                onClick={() => !saving && setIsModalOpen(false)}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitProductForm} noValidate>
              <div className="form-group">
                <label className="form-label" htmlFor="product-name-input">
                  Product Name *
                </label>
                <input
                  id="product-name-input"
                  type="text"
                  className={`form-input ${formErrors.name ? 'error' : ''}`}
                  placeholder="e.g. Vanilla Bean Cold Brew"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
                {formErrors.name && <span className="form-error">{formErrors.name}</span>}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="product-category-input">
                    Category *
                  </label>
                  <input
                    id="product-category-input"
                    type="text"
                    list="category-suggestions"
                    className={`form-input ${formErrors.category ? 'error' : ''}`}
                    placeholder="Coffee, Tea, Pastry..."
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    required
                  />
                  <datalist id="category-suggestions">
                    {categories.map((c, i) => (
                      <option key={i} value={c} />
                    ))}
                  </datalist>
                  {formErrors.category && <span className="form-error">{formErrors.category}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="product-price-input">
                    Selling Price (₱) *
                  </label>
                  <input
                    id="product-price-input"
                    type="number"
                    step="0.01"
                    min="0"
                    className={`form-input ${formErrors.price ? 'error' : ''}`}
                    placeholder="150.00"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    required
                  />
                  {formErrors.price && <span className="form-error">{formErrors.price}</span>}
                </div>
              </div>

              {/* Cost Price per item & Calculated Profit */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', alignItems: 'flex-start', marginBottom: '14px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" htmlFor="product-cost-input">
                    Cost per Item (Capital ₱)
                  </label>
                  <input
                    id="product-cost-input"
                    type="number"
                    step="0.01"
                    min="0"
                    className="form-input"
                    placeholder="e.g. 60.00"
                    value={formData.cost_price}
                    onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                  />
                  <span style={{ fontSize: '0.72rem', color: 'var(--color-muted)', display: 'block', marginTop: '3px' }}>
                    Used for profit tracking
                  </span>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ color: 'var(--color-muted)' }}>
                    Calculated Profit
                  </label>
                  <div
                    style={{
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--color-cream)',
                      border: '1px solid var(--color-border)',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      color:
                        (parseFloat(formData.price) || 0) - (parseFloat(formData.cost_price) || 0) >= 0
                          ? '#16a34a'
                          : '#dc2626',
                      minHeight: '38px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                    }}
                  >
                    <div>
                      ₱{((parseFloat(formData.price) || 0) - (parseFloat(formData.cost_price) || 0)).toFixed(2)} gain
                    </div>
                    {parseFloat(formData.price) > 0 && (
                      <div style={{ fontSize: '0.72rem', color: 'var(--color-muted)', fontWeight: 600 }}>
                        {(
                          (((parseFloat(formData.price) || 0) - (parseFloat(formData.cost_price) || 0)) /
                            parseFloat(formData.price)) *
                          100
                        ).toFixed(1)}
                        % margin
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="product-desc-input">
                  Description
                </label>
                <textarea
                  id="product-desc-input"
                  className="form-input"
                  rows={3}
                  placeholder="Nuanced flavor notes, origin, preparation details..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <FlavorEditor
                value={formData.flavors || []}
                onChange={(flavors) => setFormData((prev) => ({ ...prev, flavors }))}
              />

              {/* Image Upload Zone */}
              <div className="form-group">
                <label className="form-label">Product Image</label>

                <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setUploadMode('file')}
                    style={{
                      padding: '4px 12px',
                      fontSize: '0.8rem',
                      fontWeight: 500,
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid',
                      cursor: 'pointer',
                      borderColor: uploadMode === 'file' ? 'var(--color-brand-mid)' : 'var(--color-border)',
                      background: uploadMode === 'file' ? 'rgba(212,169,106,0.12)' : 'transparent',
                      color: uploadMode === 'file' ? 'var(--color-brand)' : 'var(--color-muted)',
                      display: 'flex', alignItems: 'center', gap: '5px',
                    }}
                  >
                    <ImagePlus size={13} /> Upload File
                  </button>
                  <button
                    type="button"
                    onClick={() => setUploadMode('url')}
                    style={{
                      padding: '4px 12px',
                      fontSize: '0.8rem',
                      fontWeight: 500,
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid',
                      cursor: 'pointer',
                      borderColor: uploadMode === 'url' ? 'var(--color-brand-mid)' : 'var(--color-border)',
                      background: uploadMode === 'url' ? 'rgba(212,169,106,0.12)' : 'transparent',
                      color: uploadMode === 'url' ? 'var(--color-brand)' : 'var(--color-muted)',
                      display: 'flex', alignItems: 'center', gap: '5px',
                    }}
                  >
                    <Link size={13} /> Paste URL
                  </button>
                </div>

                {uploadMode === 'file' ? (
                  <>
                    <div
                      className={`upload-zone${
                        imagePreview && !imagePreview.startsWith('http') ? ' has-image' : ''
                      }${isDragOver ? ' drag-over' : ''}`}
                      onDragOver={handleDropZoneDragOver}
                      onDragLeave={handleDropZoneDragLeave}
                      onDrop={handleDropZoneDrop}
                      onClick={() => fileInputRef.current?.click()}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
                      aria-label="Upload product image"
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={(e) => handleFileSelect(e.target.files?.[0])}
                        onClick={(e) => e.stopPropagation()}
                      />
                      {imagePreview && !imagePreview.startsWith('http') ? (
                        <>
                          <img src={getImageUrl(imagePreview)} alt="Preview" className="upload-preview" />
                          <div className="upload-preview-actions">
                            <span className="upload-preview-name">{imageFile?.name}</span>
                            <button
                              type="button"
                              className="btn-upload-remove"
                              onClick={(e) => { e.stopPropagation(); handleRemoveImage(); }}
                            >
                              <X size={12} /> Remove
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="upload-icon">
                            <ImagePlus size={36} />
                          </div>
                          <div className="upload-hint">
                            <strong>Drag &amp; drop</strong> your image here, or{' '}
                            <strong>click to browse</strong>
                            <small>JPEG, PNG, WebP, GIF — max 5 MB</small>
                          </div>
                        </>
                      )}
                    </div>

                    {imagePreview && imagePreview.startsWith('http') && !imageFile && (
                      <div style={{ marginTop: '8px' }}>
                        <img
                          src={getImageUrl(imagePreview)}
                          alt="Current product"
                          className="upload-preview"
                        />
                        <div className="upload-preview-actions">
                          <span className="upload-preview-name">Current image (drag a new file to replace)</span>
                          <button
                            type="button"
                            className="btn-upload-remove"
                            onClick={handleRemoveImage}
                          >
                            <X size={12} /> Remove
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div>
                    <input
                      id="product-image-url-input"
                      type="url"
                      className={`upload-url-input ${formErrors.image_url ? 'error' : ''}`}
                      placeholder="https://example.com/images/espresso.jpg"
                      value={formData.image_url}
                      onChange={(e) => {
                        setFormData({ ...formData, image_url: e.target.value });
                        setImageFile(null);
                        setImagePreview(e.target.value);
                      }}
                    />
                    {formData.image_url && (
                      <img
                        src={getImageUrl(formData.image_url)}
                        alt="URL preview"
                        className="upload-preview"
                        style={{ marginTop: '8px' }}
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        onLoad={(e) => { e.currentTarget.style.display = 'block'; }}
                      />
                    )}
                    {formErrors.image_url && (
                      <span className="form-error">{formErrors.image_url}</span>
                    )}
                  </div>
                )}
              </div>

              {/* Availability Checkbox */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  marginTop: '12px',
                  padding: '12px',
                  background: 'var(--color-cream)',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <input
                  id="product-availability-check"
                  type="checkbox"
                  checked={formData.is_available}
                  onChange={(e) => setFormData({ ...formData, is_available: e.target.checked })}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--color-brand)' }}
                />
                <label htmlFor="product-availability-check" style={{ fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer' }}>
                  Available in public digital menu
                </label>
              </div>

              {/* Modal Actions */}
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setIsModalOpen(false)}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-save"
                  disabled={saving}
                  id="modal-submit-product-btn"
                >
                  {saving ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Loader2 className="spinner" size={14} />
                      {uploading ? 'Uploading image...' : 'Saving...'}
                    </span>
                  ) : formData.id ? (
                    'Update Product'
                  ) : (
                    'Create Product'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── ADD/EDIT RAW STOCK ITEM MODAL ───────────────────── */}
      {isStockModalOpen && (
        <div className="modal-overlay" onClick={() => !stockSaving && setIsStockModalOpen(false)}>
          <div
            className="modal-card"
            style={{ maxWidth: '460px', width: '100%', margin: '0 auto', padding: '24px 22px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2 className="modal-title">
                {stockFormData.id ? 'Edit Stock Supply' : 'Add Raw Stock Supply'}
              </h2>
              <button
                type="button"
                className="btn-icon"
                onClick={() => !stockSaving && setIsStockModalOpen(false)}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitStockForm} noValidate>
              {/* Item Name */}
              <div className="form-group">
                <label className="form-label" htmlFor="stock-name-input">
                  Supply / Ingredient Name *
                </label>
                <input
                  id="stock-name-input"
                  type="text"
                  className={`form-input ${stockFormErrors.item_name ? 'error' : ''}`}
                  placeholder="e.g. Fresh Whole Milk, Beef Patties, Fries..."
                  value={stockFormData.item_name}
                  onChange={(e) => setStockFormData({ ...stockFormData, item_name: e.target.value })}
                  required
                />
                {stockFormErrors.item_name && <span className="form-error">{stockFormErrors.item_name}</span>}
              </div>

              {/* Category & Unit */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="stock-category-input">
                    Category *
                  </label>
                  <input
                    id="stock-category-input"
                    type="text"
                    list="stock-cat-suggestions"
                    className="form-input"
                    placeholder="Dairy, Meat, Coffee..."
                    value={stockFormData.category}
                    onChange={(e) => setStockFormData({ ...stockFormData, category: e.target.value })}
                    required
                  />
                  <datalist id="stock-cat-suggestions">
                    {stockCategories.map((c, i) => (
                      <option key={i} value={c} />
                    ))}
                  </datalist>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="stock-unit-input">
                    Unit of Measurement *
                  </label>
                  <input
                    id="stock-unit-input"
                    type="text"
                    list="stock-unit-suggestions"
                    className={`form-input ${stockFormErrors.unit ? 'error' : ''}`}
                    placeholder="Liters, kg, Pieces, Cans..."
                    value={stockFormData.unit}
                    onChange={(e) => setStockFormData({ ...stockFormData, unit: e.target.value })}
                    required
                  />
                  <datalist id="stock-unit-suggestions">
                    <option value="Liters" />
                    <option value="Kilograms" />
                    <option value="Pieces" />
                    <option value="Cans" />
                    <option value="Packs" />
                    <option value="Boxes" />
                    <option value="Bottles" />
                    <option value="Bags" />
                  </datalist>
                  {stockFormErrors.unit && <span className="form-error">{stockFormErrors.unit}</span>}
                </div>
              </div>

              {/* Quantity & Minimum Reorder Alert */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="stock-qty-input">
                    Current Quantity in Stock *
                  </label>
                  <input
                    id="stock-qty-input"
                    type="number"
                    step="0.01"
                    min="0"
                    className={`form-input ${stockFormErrors.quantity ? 'error' : ''}`}
                    placeholder="25.00"
                    value={stockFormData.quantity}
                    onChange={(e) => setStockFormData({ ...stockFormData, quantity: e.target.value })}
                    required
                  />
                  {stockFormErrors.quantity && <span className="form-error">{stockFormErrors.quantity}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="stock-min-qty-input">
                    Min. Reorder Warning Level *
                  </label>
                  <input
                    id="stock-min-qty-input"
                    type="number"
                    step="0.01"
                    min="0"
                    className={`form-input ${stockFormErrors.min_quantity ? 'error' : ''}`}
                    placeholder="5.00"
                    value={stockFormData.min_quantity}
                    onChange={(e) => setStockFormData({ ...stockFormData, min_quantity: e.target.value })}
                    required
                  />
                  {stockFormErrors.min_quantity && <span className="form-error">{stockFormErrors.min_quantity}</span>}
                </div>
              </div>

              {/* Unit Cost */}
              <div className="form-group">
                <label className="form-label" htmlFor="stock-cost-input">
                  Cost per Unit (₱) - Optional
                </label>
                <input
                  id="stock-cost-input"
                  type="number"
                  step="0.01"
                  min="0"
                  className="form-input"
                  placeholder="e.g. 95.00"
                  value={stockFormData.cost_per_unit}
                  onChange={(e) => setStockFormData({ ...stockFormData, cost_per_unit: e.target.value })}
                />
              </div>

              {/* Notes */}
              <div className="form-group">
                <label className="form-label" htmlFor="stock-notes-input">
                  Supplier / Storage Notes
                </label>
                <textarea
                  id="stock-notes-input"
                  className="form-input"
                  rows={2}
                  placeholder="Brand, supplier name, expiry notes, chiller compartment..."
                  value={stockFormData.notes}
                  onChange={(e) => setStockFormData({ ...stockFormData, notes: e.target.value })}
                />
              </div>

              {/* Modal Actions */}
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setIsStockModalOpen(false)}
                  disabled={stockSaving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-save"
                  disabled={stockSaving}
                  id="modal-submit-stock-btn"
                >
                  {stockSaving ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Loader2 className="spinner" size={14} />
                      Saving...
                    </span>
                  ) : stockFormData.id ? (
                    'Update Stock Item'
                  ) : (
                    'Add Stock Item'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── DELETE MENU PRODUCT MODAL ───────────────────────── */}
      {deleteTarget && (
        <div className="modal-overlay" onClick={() => !deleting && setDeleteTarget(null)}>
          <div className="modal-card" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background: 'rgba(176, 64, 64, 0.1)',
                  color: 'var(--color-unavailable)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Trash2 size={20} />
              </div>
              <h3 className="modal-title" style={{ fontSize: '1.25rem' }}>
                Confirm Delete
              </h3>
            </div>

            <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
              Are you sure you want to delete <strong>{deleteTarget.name}</strong>? This action cannot be undone.
            </p>

            <div className="modal-actions">
              <button
                type="button"
                className="btn-cancel"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
              >
                Keep Item
              </button>
              <button
                type="button"
                className="btn-save"
                style={{ background: 'var(--color-unavailable)' }}
                onClick={handleDeleteProductConfirm}
                disabled={deleting}
                id="modal-confirm-delete-btn"
              >
                {deleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── DELETE RAW STOCK ITEM MODAL ─────────────────────── */}
      {deleteStockTarget && (
        <div className="modal-overlay" onClick={() => !deletingStock && setDeleteStockTarget(null)}>
          <div className="modal-card" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background: 'rgba(176, 64, 64, 0.1)',
                  color: 'var(--color-unavailable)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Trash2 size={20} />
              </div>
              <h3 className="modal-title" style={{ fontSize: '1.25rem' }}>
                Delete Stock Supply
              </h3>
            </div>

            <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
              Are you sure you want to remove <strong>{deleteStockTarget.item_name}</strong> from raw supplies inventory?
            </p>

            <div className="modal-actions">
              <button
                type="button"
                className="btn-cancel"
                onClick={() => setDeleteStockTarget(null)}
                disabled={deletingStock}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-save"
                style={{ background: 'var(--color-unavailable)' }}
                onClick={handleDeleteStockConfirm}
                disabled={deletingStock}
                id="modal-confirm-delete-stock-btn"
              >
                {deletingStock ? 'Deleting...' : 'Yes, Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
