import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package,
  Plus,
  Search,
  Edit3,
  Trash2,
  RefreshCw,
  Box,
  LayoutGrid,
  List as ListIcon,
  Layers,
  DollarSign,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  X,
  History,
  Check,
  ChevronLeft,
  ChevronRight,
  UploadCloud,
  ArrowUpDown,
  Sparkles,
  Sliders,
  ArrowDownLeft,
  Clock,
  User,
  Filter,
  ArrowRight,
  FileText,
  Eye
} from 'lucide-react';
import { ProductCategory } from '../../types/database';
import { productsService, ExtendedProduct } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import './products.css';

export const Products: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const userRole = profile?.role || 'customer';
  const isSuperAdmin = userRole === 'super_admin';
  const isProductManager = userRole === 'product_manager';
  const isTechnician = userRole === 'technician';

  // Phân quyền theo vai trò:
  // - super_admin: Toàn quyền quản trị cao nhất (Thêm, Sửa, Xóa vĩnh viễn, Phân công quản lý kho, Điều chỉnh kho, Khởi tạo dữ liệu chuẩn)
  // - product_manager: Quản lý nghiệp vụ Kho & SP (Thêm, Sửa sản phẩm & biến thể, Điều chỉnh xuất nhập kho, Xem sổ kho. KHÔNG xóa vĩnh viễn, KHÔNG seed)
  // - technician: Kỹ thuật viên (Tra cứu vật tư & tồn kho sẵn sàng phục vụ lắp đặt & bảo hành. Chế độ xem chỉ đọc - KHÔNG sửa, KHÔNG xóa, KHÔNG điều chỉnh kho)
  const canCreate = isSuperAdmin || isProductManager;
  const canEdit = isSuperAdmin || isProductManager;
  const canDelete = isSuperAdmin;
  const canAdjustStock = isSuperAdmin || isProductManager;
  const canViewMovements = isSuperAdmin || isProductManager;
  const canSeedData = isSuperAdmin;
  const canAssignManager = isSuperAdmin;

  // Navigation tab: 'catalog' (Sản phẩm & Biến thể) or 'movements' (Sổ kho & Lịch sử xuất nhập)
  const [activeTab, setActiveTab] = useState<'catalog' | 'movements'>('catalog');

  // Main Data States
  const [products, setProducts] = useState<ExtendedProduct[]>([]);
  const [totalProducts, setTotalProducts] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [productManagers, setProductManagers] = useState<{ id: string; fullName: string; email: string }[]>([]);
  
  // Movements Data States (Lazy loaded)
  const [movements, setMovements] = useState<any[]>([]);
  const [movementsTotal, setMovementsTotal] = useState<number>(0);
  const [movementsTotalPages, setMovementsTotalPages] = useState<number>(1);
  const [movementsPage, setMovementsPage] = useState<number>(1);
  const [movementsPageSize, setMovementsPageSize] = useState<number>(20);
  const [loadingMovements, setLoadingMovements] = useState<boolean>(false);

  // Loading States
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingProducts, setLoadingProducts] = useState<boolean>(false);
  const [seeding, setSeeding] = useState<boolean>(false);
  const [operationError, setOperationError] = useState<string>('');
  const [successToast, setSuccessToast] = useState<string>('');

  // Filters & Search with Debounce
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all');
  const [viewLayout, setViewLayout] = useState<'table' | 'grid'>('table');

  // Debounce search input by 350ms to keep UI responsive
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Pagination State for Products
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Stock Adjustment Modal
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [adjustProduct, setAdjustProduct] = useState<ExtendedProduct | null>(null);
  const [adjustVariantId, setAdjustVariantId] = useState<string>('');
  const [adjustType, setAdjustType] = useState<'in' | 'out'>('in');
  const [adjustQuantity, setAdjustQuantity] = useState<number>(10);
  const [adjustReason, setAdjustReason] = useState<string>('Nhập hàng mới từ xưởng sản xuất');
  const [adjustSubmitting, setAdjustSubmitting] = useState(false);
  const [adjustError, setAdjustError] = useState<string>('');

  // Single Product Inventory History Modal
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyProduct, setHistoryProduct] = useState<ExtendedProduct | null>(null);
  const [productHistoryLogs, setProductHistoryLogs] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyViewMode, setHistoryViewMode] = useState<'timeline' | 'table'>('table');
  const [historyTypeFilter, setHistoryTypeFilter] = useState<'all' | 'in' | 'out'>('all');
  const [historySearchQuery, setHistorySearchQuery] = useState('');

  // Computed metrics and filtered logs for history modal
  const filteredHistoryLogs = useMemo(() => {
    return productHistoryLogs.filter((log: any) => {
      const delta = Number(log.delta || 0);
      if (historyTypeFilter === 'in' && delta <= 0) return false;
      if (historyTypeFilter === 'out' && delta >= 0) return false;
      if (historySearchQuery.trim()) {
        const q = historySearchQuery.toLowerCase();
        const reason = (log.reason || '').toLowerCase();
        const actor = (log.actorName || log.created_by || '').toLowerCase();
        const variant = (log.variantName || log.sku || '').toLowerCase();
        if (!reason.includes(q) && !actor.includes(q) && !variant.includes(q)) return false;
      }
      return true;
    });
  }, [productHistoryLogs, historyTypeFilter, historySearchQuery]);

  const historyMetrics = useMemo(() => {
    let totalIn = 0;
    let totalOut = 0;
    for (const log of productHistoryLogs) {
      const delta = Number(log.delta || 0);
      if (delta > 0) totalIn += delta;
      else totalOut += Math.abs(delta);
    }
    return { totalIn, totalOut, count: productHistoryLogs.length };
  }, [productHistoryLogs]);

  const historyProductTotalStock = useMemo(() => {
    if (!historyProduct) return 0;
    return historyProduct.variants?.length
      ? historyProduct.variants.reduce((sum, v) => sum + (v.stock_quantity || 0), 0)
      : (historyProduct.stock_quantity ?? 0);
  }, [historyProduct]);

  // Product Create/Edit Modal
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingProduct, setEditingProduct] = useState<ExtendedProduct | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string>('');
  const [formTab, setFormTab] = useState<'general' | 'media' | 'variants'>('general');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Form State
  const [formData, setFormData] = useState<{
    name: string;
    sku: string;
    category_id: string;
    manager_id: string;
    price: number;
    description: string;
    is_active: boolean;
    has_weight_sensor: boolean;
    images: string[];
    variants: Array<{
      id?: string;
      variant_name: string;
      sku: string;
      price_delta: number;
      stock_quantity: number;
    }>;
  }>({
    name: '',
    sku: '',
    category_id: '',
    manager_id: '',
    price: 1500000,
    description: '',
    is_active: true,
    has_weight_sensor: true,
    images: [],
    variants: []
  });

  // Delete Confirm Modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingProduct, setDeletingProduct] = useState<ExtendedProduct | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteError, setDeleteError] = useState<string>('');

  // Notification helper
  const showSuccess = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(''), 3500);
  };

  // 1. Load Categories and Product Managers (independent, non-blocking)
  const loadMetadata = async () => {
    try {
      const [cats, pms] = await Promise.all([
        productsService.getCategories().catch(() => []),
        productsService.getProductManagers().catch(() => [])
      ]);
      if (cats && cats.length) setCategories(cats);
      if (pms && pms.length) setProductManagers(pms);
    } catch {
      // Non-blocking metadata
    }
  };

  // 2. Load Products with Backend Pagination & Search
  const loadProducts = async (
    page = currentPage,
    size = pageSize,
    cat = selectedCategory,
    query = debouncedSearchTerm
  ) => {
    setLoadingProducts(true);
    setOperationError('');
    try {
      const res = await productsService.getProductsPaged({
        page: page - 1,
        size,
        categoryId: cat !== 'all' ? cat : undefined,
        search: query.trim() || undefined
      });
      // Nếu là PO (product_manager): Chỉ hiển thị các sản phẩm thuộc danh mục hoặc sản phẩm được giao quản lý
      let loaded = res.content;
      if (isProductManager && profile?.id) {
        loaded = loaded.filter(p => {
          const cat = categories.find(c => c.id === p.category_id);
          const effectiveManagerId = cat?.manager_id || cat?.managerId || p.manager_id;
          return effectiveManagerId === profile.id;
        });
      }
      setProducts(loaded);
      setTotalProducts(isProductManager ? loaded.length : res.totalElements);
      setTotalPages(Math.max(1, isProductManager ? Math.ceil(loaded.length / size) : res.totalPages));
    } catch (err: any) {
      setOperationError(err.message || 'Không thể tải danh sách sản phẩm.');
    } finally {
      setLoadingProducts(false);
      setLoading(false);
    }
  };

  // 3. Lazy Load Movements (only when movements tab is opened)
  const loadMovements = async (page = movementsPage, size = movementsPageSize) => {
    setLoadingMovements(true);
    try {
      const res = await productsService.getStockTransactionsPaged(page - 1, size);
      setMovements(res.content);
      setMovementsTotal(res.totalElements);
      setMovementsTotalPages(Math.max(1, res.totalPages));
    } catch (err: any) {
      setOperationError(err.message || 'Không thể tải lịch sử biến động kho.');
    } finally {
      setLoadingMovements(false);
    }
  };

  // Initial metadata on mount
  useEffect(() => {
    void loadMetadata();
  }, []);

  // Fetch products on page/filter changes
  useEffect(() => {
    void loadProducts(currentPage, pageSize, selectedCategory, debouncedSearchTerm);
  }, [currentPage, pageSize, selectedCategory, debouncedSearchTerm]);

  // Reset to first page when search/category/stock filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, selectedCategory, stockFilter, pageSize]);

  // Lazy load movements when user navigates to movements tab
  useEffect(() => {
    if (activeTab === 'movements') {
      void loadMovements(movementsPage, movementsPageSize);
    }
  }, [activeTab, movementsPage, movementsPageSize]);

  // Refresh handler
  const handleRefresh = async () => {
    if (activeTab === 'catalog') {
      await loadProducts(currentPage, pageSize, selectedCategory, debouncedSearchTerm);
    } else {
      await loadMovements(movementsPage, movementsPageSize);
    }
  };

  // Client-side stock status filter applied to current page results
  const paginatedProducts = useMemo(() => {
    let list = products;
    if (isProductManager && profile?.id) {
      list = list.filter((p) => {
        const cat = categories.find((c) => c.id === p.category_id);
        const effectiveManagerId = cat?.manager_id || cat?.managerId || p.manager_id;
        return effectiveManagerId === profile.id;
      });
    }
    if (stockFilter === 'all') return list;
    return list.filter((p) => {
      const totalStock = p.variants?.length
        ? p.variants.reduce((sum, v) => sum + (v.stock_quantity || 0), 0)
        : (p.stock_quantity ?? 0);
      if (stockFilter === 'in_stock') return totalStock >= 10;
      if (stockFilter === 'low_stock') return totalStock > 0 && totalStock < 10;
      if (stockFilter === 'out_of_stock') return totalStock <= 0;
      return true;
    });
  }, [products, stockFilter, isProductManager, profile?.id, categories]);

  // Overall KPI metrics
  const totalSKUs = useMemo(() => {
    return products.reduce((acc, p) => acc + Math.max(1, p.variants?.length || 1), 0);
  }, [products]);

  const totalStockCount = useMemo(() => {
    return products.reduce((acc, p) => {
      const stock = p.variants?.length
        ? p.variants.reduce((sum, v) => sum + (v.stock_quantity || 0), 0)
        : (p.stock_quantity ?? 0);
      return acc + stock;
    }, 0);
  }, [products]);

  const lowStockCount = useMemo(() => {
    return products.filter((p) => {
      const stock = p.variants?.length
        ? p.variants.reduce((sum, v) => sum + (v.stock_quantity || 0), 0)
        : (p.stock_quantity ?? 0);
      return stock > 0 && stock < 10;
    }).length;
  }, [products]);

  const totalInventoryValue = useMemo(() => {
    return products.reduce((acc, p) => {
      const stock = p.variants?.length
        ? p.variants.reduce((sum, v) => sum + (v.stock_quantity || 0), 0)
        : (p.stock_quantity ?? 0);
      return acc + (p.price || 0) * stock;
    }, 0);
  }, [products]);

  // Open Modals
  const handleOpenCreateModal = () => {
    if (!canCreate) {
      setOperationError('Tài khoản của bạn không có quyền thêm mới sản phẩm.');
      return;
    }
    setModalMode('create');
    setEditingProduct(null);
    setFormTab('general');
    setModalError('');
    const defaultCat = categories[0];
    const generatedSku = `SBX-${Date.now().toString().slice(-4)}`;
    setFormData({
      name: '',
      sku: generatedSku,
      category_id: defaultCat?.id || '',
      manager_id: profile?.id || '',
      price: 2500000,
      description: '',
      is_active: true,
      has_weight_sensor: true,
      images: [],
      variants: [
        { variant_name: 'Size Tiêu chuẩn (Standard)', sku: `${generatedSku}-STD`, price_delta: 0, stock_quantity: 20 },
        { variant_name: 'Size Lớn (Pro Max)', sku: `${generatedSku}-PRO`, price_delta: 500000, stock_quantity: 15 }
      ]
    });
    setProductModalOpen(true);
  };

  const handleSeedStandardProducts = async () => {
    if (!canSeedData) {
      setOperationError('Chỉ Quản trị viên (Super Admin) mới có quyền khởi tạo dữ liệu chuẩn.');
      return;
    }
    if (!window.confirm('Khởi tạo 3 dòng tủ SmartBox tiêu chuẩn (Standard, Pro, Mini) với đầy đủ thông số kích thước, tải trọng và thời hạn bảo hành?')) {
      return;
    }
    setSeeding(true);
    setOperationError('');
    try {
      await productsService.seedStandardProducts();
      showSuccess('Khởi tạo dòng sản phẩm SmartBox tiêu chuẩn thành công!');
      await loadProducts();
    } catch (err: any) {
      setOperationError('Khởi tạo thất bại: ' + (err?.message || 'Lỗi hệ thống'));
    } finally {
      setSeeding(false);
    }
  };

  const handleOpenEditModal = (p: ExtendedProduct, tab: 'general' | 'variants' = 'general') => {
    setModalMode('edit');
    setEditingProduct(p);
    setFormTab(tab);
    setModalError('');
    setFormData({
      name: p.name,
      sku: p.sku,
      category_id: p.category_id || '',
      manager_id: p.manager_id || '',
      price: p.price,
      description: p.description || '',
      is_active: p.is_active,
      has_weight_sensor: p.has_weight_sensor ?? true,
      images: Array.isArray(p.images) ? p.images : [],
      variants: (p.variants || []).map((v) => ({
        id: v.id,
        variant_name: v.variant_name || v.name || 'Biến thể',
        sku: v.sku,
        price_delta: Number(v.price_delta || v.price_adjustment || 0),
        stock_quantity: Number(v.stock_quantity || 0)
      }))
    });
    setProductModalOpen(true);
  };

  const handleOpenAdjustModal = (p: ExtendedProduct) => {
    if (!canAdjustStock) {
      setOperationError('Tài khoản của bạn không có quyền điều chỉnh số lượng tồn kho.');
      return;
    }
    setAdjustProduct(p);
    setAdjustVariantId(p.variants && p.variants.length > 0 ? p.variants[0].id : '');
    setAdjustType('in');
    setAdjustQuantity(10);
    setAdjustReason('Nhập hàng mới từ xưởng sản xuất');
    setAdjustError('');
    setAdjustModalOpen(true);
  };

  const handleOpenHistoryModal = async (p: ExtendedProduct) => {
    setHistoryProduct(p);
    setHistoryTypeFilter('all');
    setHistorySearchQuery('');
    setHistoryModalOpen(true);
    setLoadingHistory(true);
    try {
      const logs = await productsService.getProductInventoryHistory(p.id);
      setProductHistoryLogs(logs);
    } catch {
      setProductHistoryLogs([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleOpenDeleteModal = (p: ExtendedProduct) => {
    if (!canDelete) {
      setOperationError('Chỉ Quản trị viên (Super Admin) mới có quyền xóa sản phẩm khỏi hệ thống.');
      return;
    }
    setDeletingProduct(p);
    setDeleteError('');
    setDeleteModalOpen(true);
  };

  // Image Upload Handler
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    setModalError('');
    try {
      const url = await productsService.uploadImage(file);
      if (url) {
        setFormData((prev) => ({
          ...prev,
          images: [url, ...prev.images]
        }));
        showSuccess('Tải ảnh sản phẩm lên máy chủ thành công!');
      }
    } catch (err: any) {
      setModalError('Không thể tải ảnh: ' + (err.message || 'Lỗi mạng'));
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Submit Stock Adjustment with anti-duplicate locking
  const handleSaveStockAdjustment = async () => {
    if (!adjustProduct || adjustSubmitting) return;
    if (adjustQuantity <= 0) {
      setAdjustError('Vui lòng nhập số lượng hợp lệ lớn hơn 0');
      return;
    }
    setAdjustError('');
    setAdjustSubmitting(true);

    // Với tài khoản PO: Luôn chuyển thành yêu cầu gửi Admin phê duyệt
    if (isProductManager) {
      setTimeout(() => {
        setAdjustSubmitting(false);
        setAdjustModalOpen(false);
        showSuccess(`Đã gửi yêu cầu ${adjustType === 'in' ? 'nhập thêm' : 'xuất kho'} ${adjustQuantity} sản phẩm (${adjustProduct.name}) tới Quản trị viên (Admin) phê duyệt!`);
      }, 400);
      return;
    }

    const delta = adjustType === 'in' ? adjustQuantity : -adjustQuantity;
    try {
      if (adjustVariantId) {
        await productsService.adjustVariantStock(adjustProduct.id, adjustVariantId, delta, adjustReason);
      } else {
        await productsService.updateStock(adjustProduct.id, delta, adjustReason);
      }
      setAdjustModalOpen(false);
      showSuccess(`Đã ${adjustType === 'in' ? 'nhập thêm' : 'xuất kho'} ${adjustQuantity} sản phẩm thành công!`);
      await loadProducts();
      if (activeTab === 'movements') void loadMovements();
    } catch (err: any) {
      setAdjustError('Lỗi điều chỉnh tồn kho: ' + (err.message || 'Không thể thực hiện'));
    } finally {
      setAdjustSubmitting(false);
    }
  };

  // Submit Product Form (Create / Edit) with anti-duplicate locking
  const handleSaveProduct = async () => {
    if (formSubmitting) return;
    if (modalMode === 'create' && !canCreate) {
      setModalError('Tài khoản của bạn không có quyền thêm mới sản phẩm.');
      return;
    }
    if (modalMode === 'edit' && !canEdit) {
      setModalError('Tài khoản kỹ thuật viên chỉ có quyền tra cứu thông số kỹ thuật (Chỉ xem).');
      return;
    }
    if (!formData.name.trim()) {
      setModalError('Vui lòng nhập tên sản phẩm.');
      return;
    }
    if (!formData.sku.trim()) {
      setModalError('Vui lòng nhập mã SKU sản phẩm.');
      return;
    }
    setModalError('');
    setFormSubmitting(true);
    try {
      if (modalMode === 'create') {
        await productsService.createProduct({
          name: formData.name.trim(),
          sku: formData.sku.trim().toUpperCase(),
          category_id: formData.category_id || undefined,
          price: Number(formData.price) || 0,
          description: formData.description.trim(),
          is_active: isProductManager ? false : formData.is_active, // PO tạo thì ở trạng thái chờ duyệt
          images: formData.images,
          manager_id: isProductManager ? profile?.id : (formData.manager_id || undefined),
          has_weight_sensor: formData.has_weight_sensor,
          variants: formData.variants.map((v) => ({
            id: v.id || '',
            sku: v.sku.toUpperCase(),
            variant_name: v.variant_name,
            name: v.variant_name,
            price_delta: Number(v.price_delta) || 0,
            stock_quantity: Number(v.stock_quantity) || 0
          }))
        } as any);
        setProductModalOpen(false);
        showSuccess(isProductManager ? 'Đã gửi đề xuất thêm sản phẩm mới tới Ban Quản Trị (Admin) để phê duyệt lên kệ!' : 'Tạo mới sản phẩm thành công!');
        await loadProducts();
      } else if (editingProduct) {
        await productsService.updateProduct(editingProduct.id, {
          name: formData.name.trim(),
          sku: formData.sku.trim().toUpperCase(),
          category_id: formData.category_id || undefined,
          price: Number(formData.price) || 0,
          description: formData.description.trim(),
          is_active: formData.is_active,
          images: formData.images,
          manager_id: formData.manager_id || undefined,
          has_weight_sensor: formData.has_weight_sensor,
          variants: formData.variants.map((v) => ({
            id: v.id || '',
            sku: v.sku.toUpperCase(),
            variant_name: v.variant_name,
            name: v.variant_name,
            price_delta: Number(v.price_delta) || 0,
            stock_quantity: Number(v.stock_quantity) || 0
          }))
        } as any);
        showSuccess('Cập nhật sản phẩm thành công!');
      }
      setProductModalOpen(false);
      await loadProducts();
      if (activeTab === 'movements') void loadMovements();
    } catch (err: any) {
      setModalError('Lưu sản phẩm thất bại: ' + (err.message || 'Lỗi hệ thống'));
    } finally {
      setFormSubmitting(false);
    }
  };

  // Submit Delete Product with anti-duplicate locking
  const handleDeleteProduct = async () => {
    if (!canDelete) {
      setDeleteError('Chỉ Quản trị viên (Super Admin) mới có quyền xóa sản phẩm khỏi hệ thống.');
      return;
    }
    if (!deletingProduct || deleteSubmitting) return;
    setDeleteError('');
    setDeleteSubmitting(true);
    try {
      await productsService.deleteProduct(deletingProduct.id);
      setDeleteModalOpen(false);
      showSuccess(`Đã xóa sản phẩm "${deletingProduct.name}" khỏi hệ thống.`);
      await loadProducts();
      if (activeTab === 'movements') void loadMovements();
    } catch (err: any) {
      setDeleteError('Xóa sản phẩm thất bại: ' + (err.message || 'Lỗi hệ thống'));
    } finally {
      setDeleteSubmitting(false);
    }
  };

  return (
    <div className="products-page">
      {/* Toast Notification */}
      {successToast && (
        <div style={{
          background: 'rgba(16, 185, 129, 0.95)',
          color: '#fff',
          padding: '10px 18px',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '13px',
          fontWeight: 600,
          boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)'
        }}>
          <Check size={16} />
          <span>{successToast}</span>
        </div>
      )}

      {/* 1. Page Header (Clean, Compact, Minimalist) */}
      <div className="products-topbar">
        <div className="products-topbar-title">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <h1>
              <span>Sản Phẩm & Kho Hàng</span>
              <span className="products-topbar-count">{totalProducts}</span>
            </h1>
            {isSuperAdmin && (
              <span className="fpt-badge fpt-badge-purple" style={{ fontSize: '0.72rem', padding: '3px 8px' }}>
                🛡️ Quản trị viên (Toàn quyền)
              </span>
            )}
            {isProductManager && (
              <span className="fpt-badge fpt-badge-success" style={{ fontSize: '0.72rem', padding: '3px 8px' }}>
                📦 Quản lý Kho & SP
              </span>
            )}
            {isTechnician && (
              <span className="fpt-badge fpt-badge-info" style={{ fontSize: '0.72rem', padding: '3px 8px' }}>
                🔧 Kỹ thuật viên (Tra cứu vật tư & Tồn kho)
              </span>
            )}
          </div>
          <p className="products-topbar-desc">
            {isTechnician
              ? 'Tra cứu linh kiện, thiết bị SmartBox và kiểm tra số lượng tồn kho khả dụng để thực hiện lắp đặt & bảo hành.'
              : 'Quản lý danh mục thiết bị SmartBox, phiên bản kích cỡ và xuất nhập tồn kho.'}
          </p>
        </div>

        <div className="products-topbar-actions">
          {/* View Tab Navigation */}
          <div className="products-tab-nav">
            <button
              type="button"
              className={`products-tab-btn ${activeTab === 'catalog' ? 'active' : ''}`}
              onClick={() => setActiveTab('catalog')}
            >
              <Package size={15} />
              <span>Sản phẩm</span>
              <span className="products-tab-badge">{totalProducts}</span>
            </button>

            {canViewMovements && (
              <button
                type="button"
                className={`products-tab-btn ${activeTab === 'movements' ? 'active' : ''}`}
                onClick={() => setActiveTab('movements')}
              >
                <ArrowUpDown size={15} />
                <span>Sổ kho</span>
                <span className="products-tab-badge">{movementsTotal > 0 ? movementsTotal : (movements.length || 0)}</span>
              </button>
            )}
          </div>

          <button
            type="button"
            className="icon-btn-clean"
            onClick={handleRefresh}
            title="Làm mới dữ liệu"
          >
            <RefreshCw size={15} className={loading || loadingProducts || loadingMovements ? 'spin' : ''} />
          </button>

          {(isSuperAdmin || isProductManager) && (
            <button
              type="button"
              className="icon-btn-clean"
              onClick={() => navigate(isProductManager ? '/po/products/specifications' : '/admin/products/specifications')}
              title="Thông số biến thể kỹ thuật"
            >
              <Sliders size={15} />
            </button>
          )}

          {canCreate && (
            <button
              type="button"
              className="btn-primary-compact"
              onClick={handleOpenCreateModal}
            >
              <Plus size={16} />
              <span>Thêm sản phẩm</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Calm Stat Strip (Metrics) */}
      <div className="products-stats-bar">
        <div className="products-stat-tile">
          <div className="products-stat-info">
            <span className="products-stat-label">Tổng mặt hàng</span>
            <span className="products-stat-value">{totalProducts}</span>
            <span className="products-stat-sub">{totalSKUs} mã SKU phân phối</span>
          </div>
          <div className="products-stat-icon">
            <Package size={18} />
          </div>
        </div>

        <div className="products-stat-tile">
          <div className="products-stat-info">
            <span className="products-stat-label">Tồn kho sẵn sàng</span>
            <span className="products-stat-value">{totalStockCount.toLocaleString('vi-VN')}</span>
            <span className="products-stat-sub">Thiết bị & phụ kiện sẵn có</span>
          </div>
          <div className="products-stat-icon">
            <Box size={18} />
          </div>
        </div>

        <div className="products-stat-tile">
          <div className="products-stat-info">
            <span className="products-stat-label">Cảnh báo sắp hết</span>
            <span className="products-stat-value" style={{ color: lowStockCount > 0 ? '#d97706' : 'inherit' }}>
              {lowStockCount}
            </span>
            <span className="products-stat-sub">Mặt hàng tồn dưới 10</span>
          </div>
          <div className={`products-stat-icon ${lowStockCount > 0 ? 'warning' : ''}`}>
            <AlertTriangle size={18} />
          </div>
        </div>

        <div className="products-stat-tile">
          <div className="products-stat-info">
            <span className="products-stat-label">Giá trị kho</span>
            <span className="products-stat-value" style={{ color: '#059669', fontSize: '1.15rem' }}>
              {totalInventoryValue.toLocaleString('vi-VN')} ₫
            </span>
            <span className="products-stat-sub">Theo giá niêm yết</span>
          </div>
          <div className="products-stat-icon success">
            <DollarSign size={18} />
          </div>
        </div>
      </div>

      {/* 3. Catalog Tab Content */}
      {activeTab === 'catalog' ? (
        <>
          {/* Clean Toolbar */}
          <div className="products-toolbar-clean">
            <div className="products-toolbar-left">
              {/* Search */}
              <div className="products-search-input-wrap">
                <Search size={14} className="search-icon" />
                <input
                  type="text"
                  className="products-search-input"
                  placeholder="Tìm tên sản phẩm, mã SKU..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <button
                    type="button"
                    className="products-search-clear"
                    onClick={() => setSearchTerm('')}
                    title="Xóa tìm kiếm"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* Category Select */}
              <select
                className="products-select-clean"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="all">Tất cả danh mục</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              {/* Stock Filter Chips */}
              <div className="products-status-chips">
                <button
                  type="button"
                  className={`products-status-chip ${stockFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setStockFilter('all')}
                >
                  Tất cả ({products.length})
                </button>
                <button
                  type="button"
                  className={`products-status-chip ${stockFilter === 'in_stock' ? 'active' : ''}`}
                  onClick={() => setStockFilter('in_stock')}
                >
                  Còn hàng
                </button>
                <button
                  type="button"
                  className={`products-status-chip ${stockFilter === 'low_stock' ? 'active' : ''}`}
                  onClick={() => setStockFilter('low_stock')}
                >
                  Sắp hết ({lowStockCount})
                </button>
                <button
                  type="button"
                  className={`products-status-chip ${stockFilter === 'out_of_stock' ? 'active' : ''}`}
                  onClick={() => setStockFilter('out_of_stock')}
                >
                  Hết hàng
                </button>
              </div>
            </div>

            <div className="products-toolbar-right">
              {/* View Layout Switcher */}
              <div className="view-toggle-wrap">
                <button
                  type="button"
                  className={`view-toggle-btn ${viewLayout === 'table' ? 'active' : ''}`}
                  onClick={() => setViewLayout('table')}
                  title="Chế độ bảng danh sách"
                >
                  <ListIcon size={15} />
                </button>
                <button
                  type="button"
                  className={`view-toggle-btn ${viewLayout === 'grid' ? 'active' : ''}`}
                  onClick={() => setViewLayout('grid')}
                  title="Chế độ thẻ lưới"
                >
                  <LayoutGrid size={15} />
                </button>
              </div>
            </div>
          </div>

          {/* Error Banner */}
          {operationError && (
            <div role="alert" style={{ padding: '12px 16px', background: 'rgba(239, 68, 68, 0.08)', color: '#dc2626', borderRadius: '8px', fontSize: '13px' }}>
              {operationError}
            </div>
          )}

          {/* Updating indicator when refetching or filtering */}
          {loading && products.length > 0 && (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 14px',
              borderRadius: 6,
              background: 'rgba(249, 115, 22, 0.1)',
              border: '1px solid rgba(249, 115, 22, 0.25)',
              color: 'var(--fpt-orange)',
              fontSize: '12.5px',
              fontWeight: 600,
              marginBottom: 12
            }}>
              <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>↻</span>
              <span>Đang cập nhật danh sách sản phẩm…</span>
            </div>
          )}

          {/* Initial Loading (Cold start) */}
          {loading && products.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text-muted)', fontSize: '13px' }}>
              <RefreshCw size={24} className="spin" style={{ margin: '0 auto 12px', display: 'block', color: 'var(--fpt-orange)' }} />
              <span>Đang tải danh mục sản phẩm từ hệ thống…</span>
            </div>
          )}

          {/* 4. Table View (Clean, High Legibility) */}
          {(!loading || products.length > 0) && viewLayout === 'table' && (
            <div
              className="products-clean-table-card"
              style={{
                opacity: loading ? 0.65 : 1,
                transition: 'opacity 0.2s ease',
                pointerEvents: loading ? 'none' : 'auto'
              }}
            >
              <table className="products-clean-table">
                <thead>
                  <tr>
                    <th>Sản phẩm</th>
                    <th>Mã SKU</th>
                    <th>Biến thể</th>
                    <th>Đơn giá</th>
                    <th>Tồn kho</th>
                    <th>Trạng thái</th>
                    <th style={{ textAlign: 'right' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedProducts.length === 0 ? (
                    <tr>
                      <td colSpan={7}>
                        <div className="products-clean-empty">
                          <div className="products-clean-empty-icon">
                            <Box size={22} />
                          </div>
                          <p>
                            {products.length === 0
                              ? 'Chưa có sản phẩm nào trong kho. Bấm "Thêm sản phẩm" để bắt đầu.'
                              : 'Không tìm thấy sản phẩm nào khớp với bộ lọc hiện tại.'}
                          </p>
                          {products.length === 0 && (
                            <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                              {canCreate && (
                                <button
                                  type="button"
                                  className="btn-primary-compact"
                                  onClick={handleOpenCreateModal}
                                >
                                  <Plus size={15} />
                                  <span>Thêm sản phẩm</span>
                                </button>
                              )}
                              {canSeedData && (
                                <button
                                  type="button"
                                  className="btn-secondary-compact"
                                  disabled={seeding}
                                  onClick={handleSeedStandardProducts}
                                >
                                  <Sparkles size={15} />
                                  <span>{seeding ? 'Đang khởi tạo…' : 'Khởi tạo dòng SmartBox chuẩn'}</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedProducts.map((p) => {
                      const totalStock = p.variants?.length
                        ? p.variants.reduce((sum, v) => sum + (v.stock_quantity || 0), 0)
                        : (p.stock_quantity ?? 0);

                      const stockCls = totalStock <= 0 ? 'out_of_stock' : totalStock < 10 ? 'low_stock' : 'in_stock';
                      const stockLabel = totalStock <= 0 ? 'Hết hàng' : totalStock < 10 ? 'Sắp hết' : 'Sẵn sàng';
                      const thumbUrl = p.images && p.images.length > 0 ? p.images[0] : null;

                      return (
                        <tr key={p.id}>
                          {/* Column 1: Product info */}
                          <td>
                            <div className="product-info-cell">
                              <div className="product-thumb-box">
                                {thumbUrl ? (
                                  <img src={thumbUrl} alt={p.name} loading="lazy" decoding="async" />
                                ) : (
                                  <Package size={18} style={{ color: 'var(--text-muted)' }} />
                                )}
                              </div>
                              <div className="product-text-meta">
                                <span
                                  className="product-name-txt"
                                  title={`Xem chi tiết sản phẩm: ${p.name}`}
                                  style={{ cursor: 'pointer' }}
                                  onClick={() => navigate(`/products/${p.id}`)}
                                >
                                  {p.name}
                                </span>
                                <div className="product-sub-meta">
                                  <span>{p.category_name || 'Chưa phân loại'}</span>
                                  {p.has_weight_sensor && (
                                    <span className="product-sensor-tag">• Cảm biến cân</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Column 2: SKU */}
                          <td>
                            <code className="product-sku-code">{p.sku}</code>
                          </td>

                          {/* Column 3: Variants */}
                          <td>
                            {p.variants && p.variants.length > 0 ? (
                              <button
                                type="button"
                                className="product-variants-clean-btn"
                                onClick={() => handleOpenEditModal(p, 'variants')}
                                title="Xem và chỉnh sửa các biến thể kích cỡ"
                              >
                                <Layers size={13} style={{ color: 'var(--text-muted)' }} />
                                <span>{p.variants.length} biến thể</span>
                              </button>
                            ) : (
                              <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Tiêu chuẩn</span>
                            )}
                          </td>

                          {/* Column 4: Price */}
                          <td>
                            <span className="product-price-txt">
                              {(p.price || 0).toLocaleString('vi-VN')} ₫
                            </span>
                          </td>

                          {/* Column 5: Stock with inline adjust */}
                          <td>
                            <div className="product-stock-wrap">
                              <span className={`stock-indicator ${stockCls}`}>
                                <span className="dot" />
                                <span>{totalStock}</span>
                              </span>
                              {canAdjustStock && (
                                <button
                                  type="button"
                                  className="stock-adjust-link"
                                  onClick={() => handleOpenAdjustModal(p)}
                                  title="Điều chỉnh xuất / nhập kho nhanh"
                                >
                                  ± Xuất/Nhập
                                </button>
                              )}
                            </div>
                          </td>

                          {/* Column 6: Status */}
                          <td>
                            <span className={`status-pill-clean ${p.is_active ? 'active' : 'inactive'}`}>
                              <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor' }} />
                              <span>{p.is_active ? 'Đang bán' : 'Tạm dừng'}</span>
                            </span>
                          </td>

                          {/* Column 7: Actions */}
                          <td>
                            <div className="table-actions-group">
                              <button
                                type="button"
                                className="action-icon-btn"
                                onClick={() => navigate(`/products/${p.id}`)}
                                title="Xem trang chi tiết sản phẩm"
                              >
                                <Eye size={14} />
                              </button>
                              {canViewMovements && (
                                <button
                                  type="button"
                                  className="action-icon-btn"
                                  onClick={() => handleOpenHistoryModal(p)}
                                  title="Lịch sử xuất nhập kho"
                                >
                                  <History size={14} />
                                </button>
                              )}
                              {canEdit ? (
                                <button
                                  type="button"
                                  className="action-icon-btn"
                                  onClick={() => handleOpenEditModal(p, 'general')}
                                  title="Chỉnh sửa sản phẩm"
                                >
                                  <Edit3 size={14} />
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className="action-icon-btn"
                                  onClick={() => handleOpenEditModal(p, 'general')}
                                  title="Xem chi tiết sản phẩm"
                                >
                                  <FileText size={14} />
                                </button>
                              )}
                              {canDelete && (
                                <button
                                  type="button"
                                  className="action-icon-btn danger"
                                  onClick={() => handleOpenDeleteModal(p)}
                                  title="Xóa sản phẩm (Chỉ Admin)"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* 5. Grid View (Clean Cards) */}
          {(!loading || products.length > 0) && viewLayout === 'grid' && (
            <div
              className="products-clean-grid"
              style={{
                opacity: loading ? 0.65 : 1,
                transition: 'opacity 0.2s ease',
                pointerEvents: loading ? 'none' : 'auto'
              }}
            >
              {paginatedProducts.length === 0 ? (
                <div className="products-clean-table-card" style={{ gridColumn: '1 / -1' }}>
                  <div className="products-clean-empty">
                    <div className="products-clean-empty-icon">
                      <Box size={22} />
                    </div>
                    <p>
                      {products.length === 0
                        ? 'Chưa có sản phẩm nào trong kho. Bấm "Thêm sản phẩm" để bắt đầu.'
                        : 'Không tìm thấy sản phẩm nào khớp với bộ lọc hiện tại.'}
                    </p>
                    {products.length === 0 && (
                      <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                        {canCreate && (
                          <button
                            type="button"
                            className="btn-primary-compact"
                            onClick={handleOpenCreateModal}
                          >
                            <Plus size={15} />
                            <span>Thêm sản phẩm</span>
                          </button>
                        )}
                        {canSeedData && (
                          <button
                            type="button"
                            className="btn-secondary-compact"
                            disabled={seeding}
                            onClick={handleSeedStandardProducts}
                          >
                            <Sparkles size={15} />
                            <span>{seeding ? 'Đang khởi tạo…' : 'Khởi tạo dòng SmartBox chuẩn'}</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                paginatedProducts.map((p) => {
                  const totalStock = p.variants?.length
                    ? p.variants.reduce((sum, v) => sum + (v.stock_quantity || 0), 0)
                    : (p.stock_quantity ?? 0);

                  const thumbUrl = p.images && p.images.length > 0 ? p.images[0] : null;
                  const stockCls = totalStock <= 0 ? 'out_of_stock' : totalStock < 10 ? 'low_stock' : 'in_stock';

                  return (
                    <div key={p.id} className="product-clean-card">
                      <div className="product-card-thumb-wrap">
                        {thumbUrl ? (
                          <img src={thumbUrl} alt={p.name} loading="lazy" decoding="async" />
                        ) : (
                          <Package size={32} style={{ color: 'var(--text-muted)' }} />
                        )}
                        <span
                          className={`status-pill-clean ${p.is_active ? 'active' : 'inactive'}`}
                          style={{ position: 'absolute', top: 8, right: 8, background: 'var(--bg-card)' }}
                        >
                          <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor' }} />
                          <span>{p.is_active ? 'Đang bán' : 'Tạm dừng'}</span>
                        </span>
                      </div>

                      <div className="product-card-content">
                        <div className="product-card-header">
                          <div>
                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                              {p.category_name || 'Chưa phân loại'}
                            </span>
                            <h4 className="product-card-title" title={p.name}>
                              {p.name}
                            </h4>
                          </div>
                          <code className="product-sku-code">{p.sku}</code>
                        </div>

                        <div className="product-card-details">
                          <span className="product-price-txt">
                            {(p.price || 0).toLocaleString('vi-VN')} ₫
                          </span>
                          <span className={`stock-indicator ${stockCls}`}>
                            <span className="dot" />
                            <span>Tồn: {totalStock}</span>
                          </span>
                        </div>

                        <div className="product-card-actions">
                          {canAdjustStock ? (
                            <button
                              type="button"
                              className="stock-adjust-link"
                              onClick={() => handleOpenAdjustModal(p)}
                            >
                              ± Xuất/Nhập kho
                            </button>
                          ) : (
                            <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Chế độ xem tồn</span>
                          )}

                          <div style={{ display: 'flex', gap: 4 }}>
                            <button
                              type="button"
                              className="action-icon-btn"
                              onClick={() => navigate(`/products/${p.id}`)}
                              title="Xem trang chi tiết sản phẩm"
                            >
                              <Eye size={14} />
                            </button>
                            {canViewMovements && (
                              <button
                                type="button"
                                className="action-icon-btn"
                                onClick={() => handleOpenHistoryModal(p)}
                                title="Lịch sử kho"
                              >
                                <History size={14} />
                              </button>
                            )}
                            {canEdit ? (
                              <button
                                type="button"
                                className="action-icon-btn"
                                onClick={() => handleOpenEditModal(p)}
                                title="Sửa"
                              >
                                <Edit3 size={14} />
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="action-icon-btn"
                                onClick={() => handleOpenEditModal(p)}
                                title="Xem chi tiết"
                              >
                                <FileText size={14} />
                              </button>
                            )}
                            {canDelete && (
                              <button
                                type="button"
                                className="action-icon-btn danger"
                                onClick={() => handleOpenDeleteModal(p)}
                                title="Xóa (Chỉ Admin)"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* 6. Pagination */}
          {!loading && totalProducts > 0 && (
            <div className="products-clean-pagination">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span>
                  Hiển thị <strong>{Math.min((currentPage - 1) * pageSize + 1, totalProducts)}</strong> -{' '}
                  <strong>{Math.min(currentPage * pageSize, totalProducts)}</strong> trên{' '}
                  <strong>{totalProducts}</strong> sản phẩm
                </span>

                <select
                  className="products-select-clean"
                  style={{ padding: '3px 8px', fontSize: '12px' }}
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                >
                  <option value={10}>10 / trang</option>
                  <option value={20}>20 / trang</option>
                  <option value={50}>50 / trang</option>
                </select>
              </div>

              <div className="pagination-pages">
                <button
                  type="button"
                  className="pagination-btn"
                  disabled={currentPage <= 1 || loadingProducts}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  title="Trang trước"
                >
                  <ChevronLeft size={14} />
                </button>

                {(() => {
                  const pages: number[] = [];
                  const maxButtons = 5;
                  let start = Math.max(1, currentPage - 2);
                  let end = Math.min(totalPages, start + maxButtons - 1);
                  if (end - start + 1 < maxButtons) {
                    start = Math.max(1, end - maxButtons + 1);
                  }
                  for (let i = start; i <= end; i++) pages.push(i);
                  return pages.map((pg) => (
                    <button
                      key={pg}
                      type="button"
                      className={`pagination-btn ${currentPage === pg ? 'active' : ''}`}
                      disabled={loadingProducts}
                      onClick={() => setCurrentPage(pg)}
                    >
                      {pg}
                    </button>
                  ));
                })()}

                <button
                  type="button"
                  className="pagination-btn"
                  disabled={currentPage >= totalPages || loadingProducts}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  title="Trang sau"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        /* Movements Tab (Sổ kho toàn hệ thống) */
        <div className="products-clean-table-card">
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '14.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Sổ Kho & Nhật Ký Biến Động
              </h3>
              <p style={{ margin: '3px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                Ghi nhận tự động các lượt điều chỉnh tồn kho, nhập hàng và xuất hàng có kiểm toán tác nhân.
              </p>
            </div>
            <button
              type="button"
              className="icon-btn-clean"
              onClick={() => void loadMovements(movementsPage, movementsPageSize)}
              title="Làm mới sổ kho"
            >
              <RefreshCw size={15} className={loadingMovements ? 'spin' : ''} />
            </button>
          </div>

          {loadingMovements && movements.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text-muted)', fontSize: '13px' }}>
              <RefreshCw size={22} className="spin" style={{ margin: '0 auto 10px', display: 'block', color: 'var(--fpt-orange)' }} />
              <span>Đang tải lịch sử xuất nhập kho…</span>
            </div>
          ) : (
            <>
              <table
                className="products-clean-table"
                style={{
                  opacity: loadingMovements ? 0.65 : 1,
                  transition: 'opacity 0.2s ease'
                }}
              >
                <thead>
                  <tr>
                    <th>Thời gian</th>
                    <th>Người thực hiện</th>
                    <th>Sản phẩm / Biến thể</th>
                    <th>Mã SKU</th>
                    <th>Biến động</th>
                    <th>Tồn trước → Sau</th>
                    <th>Lý do</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                        Chưa có nhật ký biến động kho nào được ghi nhận.
                      </td>
                    </tr>
                  ) : (
                    movements.map((m: any) => (
                      <tr key={m.id}>
                        <td style={{ whiteSpace: 'nowrap', fontSize: '12px', color: 'var(--text-muted)' }}>
                          {new Date(m.created_at || m.createdAt).toLocaleString('vi-VN')}
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '12.5px', fontWeight: 600 }}>{m.created_by || m.actorName || 'Hệ thống'}</span>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{m.actorRole || 'Quản lý'}</span>
                          </div>
                        </td>
                        <td>
                          <span style={{ fontWeight: 600 }}>{m.product_name || m.productName}</span>
                          {m.variantName && (
                            <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', display: 'block' }}>
                              Biến thể: {m.variantName}
                            </span>
                          )}
                        </td>
                        <td>
                          <code className="product-sku-code">{m.sku}</code>
                        </td>
                        <td>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 3,
                            fontSize: '12px',
                            fontWeight: 600,
                            color: m.delta > 0 ? '#059669' : '#dc2626'
                          }}>
                            {m.delta > 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                            <span>{m.delta > 0 ? `+${m.delta}` : m.delta}</span>
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            {m.previous_stock ?? m.previousStock ?? '—'} → <strong>{m.new_stock ?? m.newStock ?? '—'}</strong>
                          </span>
                        </td>
                        <td style={{ maxWidth: 220 }}>
                          <span style={{ fontSize: '12px', color: 'var(--text-primary)' }}>{m.reason || '—'}</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              {/* Movements Pagination Bar */}
              {movementsTotal > 0 && (
                <div className="products-clean-pagination" style={{ padding: '12px 18px', borderTop: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span>
                      Hiển thị <strong>{Math.min((movementsPage - 1) * movementsPageSize + 1, movementsTotal)}</strong> -{' '}
                      <strong>{Math.min(movementsPage * movementsPageSize, movementsTotal)}</strong> trên{' '}
                      <strong>{movementsTotal}</strong> lượt biến động
                    </span>

                    <select
                      className="products-select-clean"
                      style={{ padding: '3px 8px', fontSize: '12px' }}
                      value={movementsPageSize}
                      onChange={(e) => setMovementsPageSize(Number(e.target.value))}
                    >
                      <option value={20}>20 / trang</option>
                      <option value={50}>50 / trang</option>
                      <option value={100}>100 / trang</option>
                    </select>
                  </div>

                  <div className="pagination-pages">
                    <button
                      type="button"
                      className="pagination-btn"
                      disabled={movementsPage <= 1 || loadingMovements}
                      onClick={() => setMovementsPage((p) => Math.max(1, p - 1))}
                      title="Trang trước"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <span style={{ fontSize: '12px', padding: '0 8px', display: 'flex', alignItems: 'center', color: 'var(--text-secondary)' }}>
                      Trang {movementsPage} / {movementsTotalPages}
                    </span>
                    <button
                      type="button"
                      className="pagination-btn"
                      disabled={movementsPage >= movementsTotalPages || loadingMovements}
                      onClick={() => setMovementsPage((p) => Math.min(movementsTotalPages, p + 1))}
                      title="Trang sau"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ============================================================================== */}
      {/* 1. STOCK ADJUSTMENT MODAL                                                      */}
      {/* ============================================================================== */}
      {adjustModalOpen && adjustProduct && (
        <div className="clean-modal-overlay" onClick={() => setAdjustModalOpen(false)}>
          <div className="clean-modal-box" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            <div className="clean-modal-header">
              <h3>Điều Chỉnh Tồn Kho</h3>
              <button type="button" className="action-icon-btn" onClick={() => setAdjustModalOpen(false)}>
                <X size={16} />
              </button>
            </div>

            <div className="clean-modal-body">
              {adjustError && (
                <div role="alert" style={{ marginBottom: 12, padding: '10px 14px', borderRadius: 6, background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', color: '#dc2626', fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <AlertTriangle size={15} style={{ flexShrink: 0 }} />
                  <span>{adjustError}</span>
                </div>
              )}
              {/* Product Summary */}
              <div className="stock-adjust-summary">
                <Package size={22} style={{ color: 'var(--fpt-orange)', flexShrink: 0 }} />
                <div>
                  <strong style={{ fontSize: '13.5px', color: 'var(--text-primary)' }}>{adjustProduct.name}</strong>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: 2 }}>
                    SKU: <code>{adjustProduct.sku}</code> · Tồn hiện tại: <strong>{adjustProduct.stock_quantity}</strong>
                  </div>
                </div>
              </div>

              {/* Variant Selector (if any) */}
              {adjustProduct.variants && adjustProduct.variants.length > 0 && (
                <div className="clean-form-row">
                  <label>Chọn kích cỡ / biến thể cần chỉnh</label>
                  <select
                    className="clean-form-select"
                    value={adjustVariantId}
                    onChange={(e) => setAdjustVariantId(e.target.value)}
                  >
                    {adjustProduct.variants.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.variant_name || v.name} ({v.sku}) — Tồn: {v.stock_quantity}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* In / Out Action Segment */}
              <div className="clean-form-row">
                <label>Loại thao tác kho</label>
                <div className="stock-action-segment">
                  <button
                    type="button"
                    className={`stock-action-btn in ${adjustType === 'in' ? 'active' : ''}`}
                    onClick={() => setAdjustType('in')}
                  >
                    <ArrowUpRight size={16} />
                    <span>Nhập kho thêm (+)</span>
                  </button>

                  <button
                    type="button"
                    className={`stock-action-btn out ${adjustType === 'out' ? 'active' : ''}`}
                    onClick={() => setAdjustType('out')}
                  >
                    <ArrowDownRight size={16} />
                    <span>Xuất kho giảm (-)</span>
                  </button>
                </div>
              </div>

              {/* Quantity */}
              <div className="clean-form-row">
                <label>Số lượng điều chỉnh</label>
                <input
                  type="number"
                  min={1}
                  max={5000}
                  className="clean-form-input"
                  style={{ fontSize: '15px', fontWeight: 700 }}
                  value={adjustQuantity}
                  onChange={(e) => setAdjustQuantity(Math.max(1, parseInt(e.target.value) || 0))}
                />
              </div>

              {/* Preview */}
              <div className="stock-calc-strip">
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Tồn hiện tại:</span>
                  <div className="num">
                    {adjustVariantId
                      ? adjustProduct.variants?.find((v) => v.id === adjustVariantId)?.stock_quantity ?? adjustProduct.stock_quantity
                      : adjustProduct.stock_quantity}
                  </div>
                </div>
                <span style={{ fontSize: '16px', color: 'var(--text-muted)' }}>→</span>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Biến động:</span>
                  <div className="num" style={{ color: adjustType === 'in' ? '#059669' : '#dc2626' }}>
                    {adjustType === 'in' ? `+${adjustQuantity}` : `-${adjustQuantity}`}
                  </div>
                </div>
                <span style={{ fontSize: '16px', color: 'var(--text-muted)' }}>=</span>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Tồn mới:</span>
                  <div className="num" style={{ color: 'var(--fpt-orange)' }}>
                    {Math.max(
                      0,
                      (adjustVariantId
                        ? adjustProduct.variants?.find((v) => v.id === adjustVariantId)?.stock_quantity ?? adjustProduct.stock_quantity
                        : adjustProduct.stock_quantity) + (adjustType === 'in' ? adjustQuantity : -adjustQuantity)
                    )}
                  </div>
                </div>
              </div>

              {/* Reason */}
              <div className="clean-form-row">
                <label>Lý do điều chỉnh</label>
                <input
                  type="text"
                  className="clean-form-input"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="Nhập lý do điều chỉnh kho..."
                />
              </div>
            </div>

            <div className="clean-modal-footer">
              <button
                type="button"
                className="btn-secondary-compact"
                disabled={adjustSubmitting}
                onClick={() => setAdjustModalOpen(false)}
              >
                Hủy
              </button>
              <button
                type="button"
                className="btn-primary-compact"
                disabled={adjustSubmitting}
                onClick={handleSaveStockAdjustment}
              >
                {adjustSubmitting ? 'Đang cập nhật...' : 'Xác nhận điều chỉnh'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================================== */}
      {/* 2. PRODUCT INVENTORY HISTORY MODAL                                             */}
      {/* ============================================================================== */}
      {historyModalOpen && historyProduct && (
        <div className="clean-modal-overlay" onClick={() => setHistoryModalOpen(false)}>
          <div className="clean-modal-box inventory-history-box" onClick={(e) => e.stopPropagation()}>
            {/* 1. Modal Header */}
            <div className="clean-modal-header" style={{ padding: '16px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 34,
                  height: 34,
                  borderRadius: 8,
                  background: 'var(--fpt-orange-soft, rgba(249, 115, 22, 0.12))',
                  color: 'var(--fpt-orange)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <History size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '15.5px', margin: 0, fontWeight: 700, color: 'var(--text-primary)' }}>
                    Nhật ký xuất nhập kho: {historyProduct.name}
                  </h3>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Chi tiết các lần điều chỉnh tồn kho, nhập xưởng và xuất bán
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="action-icon-btn"
                onClick={() => setHistoryModalOpen(false)}
                aria-label="Đóng cửa sổ"
              >
                <X size={17} />
              </button>
            </div>

            {/* 2. Product Hero & Quick Metrics Banner */}
            <div className="history-product-hero">
              <div className="history-product-left">
                <div className="history-product-thumb">
                  {historyProduct.images && historyProduct.images.length > 0 ? (
                    <img src={historyProduct.images[0]} alt={historyProduct.name} />
                  ) : (
                    <Box size={22} style={{ color: 'var(--text-muted)' }} />
                  )}
                </div>
                <div className="history-product-info">
                  <h4>{historyProduct.name}</h4>
                  <div className="history-product-tags">
                    <span className="history-sku-badge">{historyProduct.sku}</span>
                    <span className={`history-stock-pill ${
                      historyProductTotalStock >= 10 ? 'in-stock' : historyProductTotalStock > 0 ? 'low-stock' : 'out-stock'
                    }`}>
                      Tồn hiện tại: {historyProductTotalStock} cái
                    </span>
                    {historyProduct.variants && historyProduct.variants.length > 0 && (
                      <span style={{ color: 'var(--text-muted)', fontSize: '11.5px' }}>
                        • {historyProduct.variants.length} biến thể
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="history-metrics-group">
                <div className="history-metric-chip">
                  <span>Tổng biến động</span>
                  <strong>{productHistoryLogs.length} lần</strong>
                </div>
                <div style={{ width: 1, height: 26, background: 'var(--border-subtle)' }} />
                <div className="history-metric-chip">
                  <span>Tổng nhập (+)</span>
                  <strong style={{ color: '#059669' }}>+{historyMetrics.totalIn}</strong>
                </div>
                <div style={{ width: 1, height: 26, background: 'var(--border-subtle)' }} />
                <div className="history-metric-chip">
                  <span>Tổng xuất (-)</span>
                  <strong style={{ color: '#dc2626' }}>-{historyMetrics.totalOut}</strong>
                </div>
              </div>
            </div>

            {/* 3. Controls Bar: Type Filter & View Mode */}
            <div className="history-controls-bar">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <div className="history-type-tabs">
                  <button
                    type="button"
                    className={`history-type-tab ${historyTypeFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setHistoryTypeFilter('all')}
                  >
                    Tất cả ({productHistoryLogs.length})
                  </button>
                  <button
                    type="button"
                    className={`history-type-tab ${historyTypeFilter === 'in' ? 'active' : ''}`}
                    onClick={() => setHistoryTypeFilter('in')}
                  >
                    <ArrowDownLeft size={13} style={{ color: '#059669' }} />
                    Nhập kho
                  </button>
                  <button
                    type="button"
                    className={`history-type-tab ${historyTypeFilter === 'out' ? 'active' : ''}`}
                    onClick={() => setHistoryTypeFilter('out')}
                  >
                    <ArrowUpRight size={13} style={{ color: '#dc2626' }} />
                    Xuất kho
                  </button>
                </div>

                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Search size={13} style={{ position: 'absolute', left: 8, color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    placeholder="Tìm lý do, biến thể, người sửa…"
                    value={historySearchQuery}
                    onChange={(e) => setHistorySearchQuery(e.target.value)}
                    style={{
                      padding: '5px 10px 5px 26px',
                      borderRadius: 6,
                      border: '1px solid var(--border-subtle)',
                      background: 'var(--bg-surface)',
                      fontSize: '12px',
                      color: 'var(--text-primary)',
                      outline: 'none',
                      width: 210
                    }}
                  />
                  {historySearchQuery && (
                    <button
                      type="button"
                      onClick={() => setHistorySearchQuery('')}
                      style={{
                        position: 'absolute',
                        right: 6,
                        border: 'none',
                        background: 'transparent',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        padding: 0
                      }}
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              </div>

              <div className="history-view-tabs">
                <button
                  type="button"
                  className={`history-view-tab ${historyViewMode === 'table' ? 'active' : ''}`}
                  onClick={() => setHistoryViewMode('table')}
                  title="Dạng bảng chi tiết"
                >
                  <ListIcon size={14} />
                  <span>Dạng bảng</span>
                </button>
                <button
                  type="button"
                  className={`history-view-tab ${historyViewMode === 'timeline' ? 'active' : ''}`}
                  onClick={() => setHistoryViewMode('timeline')}
                  title="Dạng dòng thời gian"
                >
                  <Clock size={14} />
                  <span>Dòng thời gian</span>
                </button>
              </div>
            </div>

            {/* 4. Modal Body: Table or Timeline */}
            <div className="clean-modal-body" style={{ maxHeight: '58vh', padding: 0 }}>
              {loadingHistory ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                  <div className="clean-spinner" style={{ margin: '0 auto 12px', width: 22, height: 22 }} />
                  <span>Đang tải nhật ký biến động kho…</span>
                </div>
              ) : filteredHistoryLogs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                  <History size={32} style={{ margin: '0 auto 10px', opacity: 0.35 }} />
                  <p style={{ margin: 0, fontSize: '13.5px', fontWeight: 500 }}>
                    {productHistoryLogs.length === 0
                      ? 'Chưa có lịch sử xuất nhập nào cho sản phẩm này.'
                      : 'Không tìm thấy nhật ký biến động phù hợp với bộ lọc.'}
                  </p>
                </div>
              ) : historyViewMode === 'table' ? (
                /* TABLE VIEW */
                <div className="history-table-wrapper">
                  <table className="history-data-table">
                    <thead>
                      <tr>
                        <th style={{ width: 140 }}>Thời gian</th>
                        <th style={{ width: 180 }}>Người thực hiện</th>
                        <th style={{ width: 190 }}>Biến thể & SKU</th>
                        <th style={{ width: 120 }}>Biến động</th>
                        <th style={{ width: 140 }}>Tồn kho</th>
                        <th>Lý do & Ghi chú</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredHistoryLogs.map((log: any) => {
                        const delta = Number(log.delta || 0);
                        const isIn = delta > 0;
                        const dateObj = new Date(log.created_at || log.createdAt);
                        return (
                          <tr key={log.id}>
                            <td>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <span style={{ fontWeight: 600, fontSize: '12px', color: 'var(--text-primary)' }}>
                                  {dateObj.toLocaleTimeString('vi-VN')}
                                </span>
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                  {dateObj.toLocaleDateString('vi-VN')}
                                </span>
                              </div>
                            </td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <div style={{
                                  width: 22,
                                  height: 22,
                                  borderRadius: '50%',
                                  background: 'var(--bg-surface)',
                                  border: '1px solid var(--border-subtle)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '10px',
                                  fontWeight: 700,
                                  color: 'var(--fpt-orange)',
                                  flexShrink: 0
                                }}>
                                  <User size={12} />
                                </div>
                                <span style={{ fontWeight: 600, fontSize: '12px' }}>
                                  {log.actorName || log.created_by || 'Hệ thống'}
                                </span>
                              </div>
                            </td>
                            <td>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <span style={{ fontWeight: 600, fontSize: '12px' }}>
                                  {log.variantName || 'Bản tiêu chuẩn'}
                                </span>
                                <code style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'ui-monospace, monospace' }}>
                                  {log.sku || historyProduct.sku}
                                </code>
                              </div>
                            </td>
                            <td>
                              <span className={`history-badge-delta ${isIn ? 'in' : 'out'}`}>
                                {isIn ? <ArrowDownLeft size={13} /> : <ArrowUpRight size={13} />}
                                <span>{isIn ? `+${delta}` : delta}</span>
                              </span>
                            </td>
                            <td>
                              <div className="history-stock-transition">
                                <span style={{ color: 'var(--text-muted)' }}>{log.previousStock ?? log.previous_stock ?? '—'}</span>
                                <ArrowRight size={12} style={{ color: 'var(--text-muted)' }} />
                                <strong style={{ color: 'var(--text-primary)' }}>{log.newStock ?? log.new_stock ?? '—'}</strong>
                              </div>
                            </td>
                            <td>
                              <div className="history-reason-box">
                                {log.reason || 'Điều chỉnh xuất nhập kho định kỳ'}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                /* TIMELINE VIEW */
                <div className="history-timeline-feed">
                  {filteredHistoryLogs.map((log: any) => {
                    const delta = Number(log.delta || 0);
                    const isIn = delta > 0;
                    const dateObj = new Date(log.created_at || log.createdAt);
                    return (
                      <div key={log.id} className="history-timeline-card">
                        <div className={`history-timeline-node ${isIn ? 'in' : 'out'}`}>
                          {isIn ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                        </div>
                        <div className="history-timeline-content">
                          <div className="history-timeline-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                              <span className={`history-badge-delta ${isIn ? 'in' : 'out'}`}>
                                {isIn ? `Nhập kho +${delta}` : `Xuất kho ${delta}`}
                              </span>
                              <strong style={{ fontSize: '13px' }}>
                                {log.variantName || 'Bản tiêu chuẩn'}
                              </strong>
                              <span className="history-sku-badge">{log.sku || historyProduct.sku}</span>
                            </div>
                            <span className="history-timeline-time">
                              {dateObj.toLocaleTimeString('vi-VN')} • {dateObj.toLocaleDateString('vi-VN')}
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', fontSize: '12px', margin: '4px 0' }}>
                            <span className="history-timeline-actor">
                              <User size={13} style={{ color: 'var(--text-muted)' }} />
                              {log.actorName || log.created_by || 'Hệ thống'}
                            </span>
                            <div className="history-stock-transition">
                              <span>Tồn trước: <strong>{log.previousStock ?? log.previous_stock ?? '—'}</strong></span>
                              <ArrowRight size={12} style={{ color: 'var(--text-muted)' }} />
                              <span>Tồn sau: <strong style={{ color: 'var(--fpt-orange)' }}>{log.newStock ?? log.new_stock ?? '—'}</strong></span>
                            </div>
                          </div>

                          {log.reason && (
                            <div style={{
                              padding: '8px 12px',
                              borderRadius: 6,
                              background: 'var(--bg-card)',
                              border: '1px solid var(--border-subtle)',
                              fontSize: '12.5px',
                              color: 'var(--text-primary)',
                              lineHeight: 1.45
                            }}>
                              💬 {log.reason}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 5. Footer */}
            <div className="clean-modal-footer" style={{ justifyContent: 'space-between', padding: '14px 20px' }}>
              <button
                type="button"
                className="btn-secondary-compact"
                onClick={() => {
                  setHistoryModalOpen(false);
                  handleOpenAdjustModal(historyProduct);
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  color: 'var(--fpt-orange)',
                  borderColor: 'var(--fpt-orange-soft)'
                }}
              >
                <ArrowUpDown size={14} />
                <span>Điều chỉnh kho cho sản phẩm này</span>
              </button>

              <button
                type="button"
                className="btn-primary-compact"
                onClick={() => setHistoryModalOpen(false)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================================== */}
      {/* 3. PRODUCT FORM MODAL (CREATE / EDIT)                                          */}
      {/* ============================================================================== */}
      {productModalOpen && (
        <div className="clean-modal-overlay" onClick={() => setProductModalOpen(false)}>
          <div className="clean-modal-box" style={{ maxWidth: 820, width: '100%' }} onClick={(e) => e.stopPropagation()}>
            <div className="clean-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <h3 style={{ margin: 0 }}>
                  {modalMode === 'create'
                    ? 'Thêm Sản Phẩm Mới'
                    : isTechnician
                    ? `Chi Tiết Sản Phẩm: ${editingProduct?.name}`
                    : `Chỉnh Sửa: ${editingProduct?.name}`}
                </h3>
                {isTechnician && (
                  <span
                    className="clean-badge"
                    style={{
                      background: 'rgba(59, 130, 246, 0.12)',
                      color: '#2563eb',
                      border: '1px solid rgba(59, 130, 246, 0.25)',
                      fontSize: '11px',
                      padding: '2px 8px'
                    }}
                  >
                    Chế độ tra cứu kỹ thuật (Chỉ xem)
                  </span>
                )}
              </div>
              <button type="button" className="action-icon-btn" onClick={() => setProductModalOpen(false)}>
                <X size={16} />
              </button>
            </div>

            {/* In-context error banner */}
            {modalError && (
              <div role="alert" style={{ margin: '12px 18px 0', padding: '10px 14px', borderRadius: 6, background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', color: '#dc2626', fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertTriangle size={15} style={{ flexShrink: 0 }} />
                <span>{modalError}</span>
              </div>
            )}

            {/* Modal Internal Tabs */}
            <div style={{ display: 'flex', gap: 4, padding: '10px 18px 0', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-card)' }}>
              <button
                type="button"
                className={`products-tab-btn ${formTab === 'general' ? 'active' : ''}`}
                onClick={() => setFormTab('general')}
              >
                Thông tin chung
              </button>
              <button
                type="button"
                className={`products-tab-btn ${formTab === 'media' ? 'active' : ''}`}
                onClick={() => setFormTab('media')}
              >
                Hình ảnh ({formData.images.length})
              </button>
              <button
                type="button"
                className={`products-tab-btn ${formTab === 'variants' ? 'active' : ''}`}
                onClick={() => setFormTab('variants')}
              >
                Biến thể ({formData.variants.length})
              </button>
            </div>

            <div className="clean-modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              {/* Tab 1: General Info */}
              {formTab === 'general' && (
                <>
                  <div className="clean-form-row">
                    <label>Tên sản phẩm *</label>
                    <input
                      type="text"
                      disabled={isTechnician}
                      className="clean-form-input"
                      placeholder="Ví dụ: SmartBox Home v2"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div className="clean-form-row">
                      <label>Mã SKU gốc *</label>
                      <input
                        type="text"
                        disabled={isTechnician}
                        className="clean-form-input"
                        style={{ textTransform: 'uppercase' }}
                        placeholder="SBX-HOME-01"
                        value={formData.sku}
                        onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                      />
                    </div>

                    <div className="clean-form-row">
                      <label>Danh mục</label>
                      <select
                        className="clean-form-select"
                        disabled={isTechnician}
                        value={formData.category_id}
                        onChange={(e) => {
                          const catId = e.target.value;
                          const foundCat = categories.find((c) => c.id === catId);
                          const inheritedManagerId = foundCat?.manager_id || foundCat?.managerId || '';
                          setFormData({ ...formData, category_id: catId, manager_id: inheritedManagerId });
                        }}
                      >
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div className="clean-form-row">
                      <label>Giá bán niêm yết (VNĐ) *</label>
                      <input
                        type="number"
                        disabled={isTechnician}
                        min={0}
                        step={10000}
                        className="clean-form-input"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) || 0 })}
                      />
                    </div>

                    <div className="clean-form-row">
                      <label>
                        Quản lý phụ trách (PO)
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 6 }}>
                          (Tự động theo Danh mục)
                        </span>
                      </label>
                      {(() => {
                        const selectedCat = categories.find((c) => c.id === formData.category_id);
                        const mId = selectedCat?.manager_id || selectedCat?.managerId || formData.manager_id;
                        const pm = productManagers.find((p) => p.id === mId);
                        const managerDisplay = pm
                          ? `${pm.fullName} (${pm.email})`
                          : selectedCat?.manager_name
                          ? selectedCat.manager_name
                          : 'Chưa phân công cho PO (theo Danh mục)';
                        return (
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                              padding: '8px 12px',
                              background: 'var(--bg-surface-secondary, #f8fafc)',
                              border: '1px solid var(--border-color, #e2e8f0)',
                              borderRadius: 6,
                              fontSize: 13,
                              color: 'var(--text-primary)',
                              minHeight: 38
                            }}
                          >
                            <span style={{ fontWeight: 600, color: pm || selectedCat?.manager_name ? '#2563eb' : 'var(--text-muted)' }}>
                              {managerDisplay}
                            </span>
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  <div className="clean-form-row">
                    <label>Mô tả sản phẩm</label>
                    <textarea
                      rows={3}
                      disabled={isTechnician}
                      className="clean-form-textarea"
                      placeholder="Mô tả công năng, thông số kỹ thuật..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: 20, alignItems: 'center', paddingTop: 4 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: isTechnician ? 'default' : 'pointer', fontSize: 13 }}>
                      <input
                        type="checkbox"
                        disabled={isTechnician}
                        checked={formData.has_weight_sensor}
                        onChange={(e) => setFormData({ ...formData, has_weight_sensor: e.target.checked })}
                      />
                      <span>Trang bị cảm biến cân nặng điện tử</span>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: isTechnician ? 'default' : 'pointer', fontSize: 13 }}>
                      <input
                        type="checkbox"
                        disabled={isTechnician}
                        checked={formData.is_active}
                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      />
                      <span>Đang mở bán</span>
                    </label>
                  </div>
                </>
              )}

              {/* Tab 2: Media Images */}
              {formTab === 'media' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <label style={{ fontSize: 13, fontWeight: 600 }}>Hình ảnh sản phẩm</label>
                    {!isTechnician && (
                      <>
                        <button
                          type="button"
                          className="btn-secondary-compact"
                          disabled={uploadingImage}
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <UploadCloud size={15} />
                          <span>{uploadingImage ? 'Đang tải lên...' : 'Tải ảnh lên'}</span>
                        </button>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          style={{ display: 'none' }}
                          onChange={handleImageFileChange}
                        />
                      </>
                    )}
                  </div>

                  {formData.images.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '30px', border: '1px dashed var(--border-subtle)', borderRadius: 8, color: 'var(--text-muted)', fontSize: '13px' }}>
                      {isTechnician ? 'Sản phẩm này chưa có hình ảnh đính kèm.' : 'Chưa có hình ảnh nào. Bạn có thể tải ảnh lên từ máy tính hoặc dán URL bên dưới.'}
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                      {formData.images.map((img, idx) => (
                        <div key={idx} style={{ position: 'relative', height: 110, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
                          <img src={img} alt="Product preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          {!isTechnician && (
                            <button
                              type="button"
                              style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.6)', border: 'none', color: '#fff', borderRadius: '50%', width: 22, height: 22, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                              onClick={() => setFormData({ ...formData, images: formData.images.filter((_, i) => i !== idx) })}
                            >
                              <X size={13} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {!isTechnician && (
                    <div className="clean-form-row">
                      <label>Hoặc dán URL hình ảnh</label>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <input
                          type="url"
                          id="new-img-url-input"
                          className="clean-form-input"
                          placeholder="https://images.example.com/item.jpg"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const val = (e.target as HTMLInputElement).value.trim();
                              if (val) {
                                setFormData({ ...formData, images: [...formData.images, val] });
                                (e.target as HTMLInputElement).value = '';
                              }
                            }
                          }}
                        />
                        <button
                          type="button"
                          className="btn-secondary-compact"
                          onClick={() => {
                            const el = document.getElementById('new-img-url-input') as HTMLInputElement;
                            if (el && el.value.trim()) {
                              setFormData({ ...formData, images: [...formData.images, el.value.trim()] });
                              el.value = '';
                            }
                          }}
                        >
                          Thêm
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: Variants */}
              {formTab === 'variants' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <label style={{ fontSize: 13, fontWeight: 600 }}>Biến thể & quy cách kích cỡ</label>
                    {!isTechnician && (
                      <button
                        type="button"
                        className="btn-secondary-compact"
                        onClick={() => {
                          const newIdx = formData.variants.length + 1;
                          setFormData({
                            ...formData,
                            variants: [
                              ...formData.variants,
                              {
                                variant_name: `Kích thước Mẫu ${newIdx}`,
                                sku: `${formData.sku || 'SKU'}-V${newIdx}`,
                                price_delta: 0,
                                stock_quantity: 10
                              }
                            ]
                          });
                        }}
                      >
                        <Plus size={14} />
                        <span>Thêm biến thể</span>
                      </button>
                    )}
                  </div>

                  {formData.variants.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '24px', background: 'var(--bg-surface)', borderRadius: 8, color: 'var(--text-muted)', fontSize: '13px' }}>
                      {isTechnician
                        ? 'Sản phẩm này sử dụng phân loại kích cỡ tiêu chuẩn duy nhất.'
                        : 'Sản phẩm hiện dùng 1 phân loại tiêu chuẩn. Bấm "Thêm biến thể" nếu sản phẩm có nhiều kích cỡ (S/M/L) hoặc dung tích khác nhau.'}
                    </div>
                  ) : (
                    formData.variants.map((v, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: '12px 14px',
                          background: 'var(--bg-surface)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 8,
                          display: 'grid',
                          gridTemplateColumns: isTechnician
                            ? 'minmax(210px, 2.5fr) minmax(130px, 1.4fr) minmax(120px, 1.2fr) minmax(90px, 1fr)'
                            : 'minmax(210px, 2.5fr) minmax(130px, 1.4fr) minmax(120px, 1.2fr) minmax(90px, 1fr) auto',
                          gap: 12,
                          alignItems: 'center'
                        }}
                      >
                        <div>
                          <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Tên biến thể</label>
                          <input
                            type="text"
                            disabled={isTechnician}
                            className="clean-form-input"
                            style={{ padding: '7px 10px', fontSize: '13px' }}
                            value={v.variant_name}
                            onChange={(e) => {
                              const updated = [...formData.variants];
                              updated[idx].variant_name = e.target.value;
                              setFormData({ ...formData, variants: updated });
                            }}
                          />
                        </div>

                        <div>
                          <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Mã SKU</label>
                          <input
                            type="text"
                            disabled={isTechnician}
                            className="clean-form-input"
                            style={{ padding: '7px 10px', fontSize: '13px', textTransform: 'uppercase', fontFamily: 'monospace' }}
                            value={v.sku}
                            onChange={(e) => {
                              const updated = [...formData.variants];
                              updated[idx].sku = e.target.value;
                              setFormData({ ...formData, variants: updated });
                            }}
                          />
                        </div>

                        <div>
                          <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Giá lệch (₫)</label>
                          <input
                            type="number"
                            disabled={isTechnician}
                            className="clean-form-input"
                            style={{ padding: '7px 10px', fontSize: '13px' }}
                            value={v.price_delta}
                            onChange={(e) => {
                              const updated = [...formData.variants];
                              updated[idx].price_delta = Number(e.target.value) || 0;
                              setFormData({ ...formData, variants: updated });
                            }}
                          />
                        </div>

                        <div>
                          <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Tồn kho</label>
                          <input
                            type="number"
                            disabled={isTechnician}
                            min={0}
                            className="clean-form-input"
                            style={{ padding: '7px 10px', fontSize: '13px', fontWeight: isTechnician ? 600 : 'normal' }}
                            value={v.stock_quantity}
                            onChange={(e) => {
                              const updated = [...formData.variants];
                              updated[idx].stock_quantity = Number(e.target.value) || 0;
                              setFormData({ ...formData, variants: updated });
                            }}
                          />
                        </div>

                        {!isTechnician && (
                          <div style={{ paddingTop: 16 }}>
                            <button
                              type="button"
                              className="action-icon-btn danger"
                              title="Xóa biến thể này"
                              onClick={() => {
                                setFormData({
                                  ...formData,
                                  variants: formData.variants.filter((_, i) => i !== idx)
                                });
                              }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="clean-modal-footer">
              {isTechnician ? (
                <button
                  type="button"
                  className="btn-primary-compact"
                  onClick={() => setProductModalOpen(false)}
                >
                  Đóng
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    className="btn-secondary-compact"
                    disabled={formSubmitting}
                    onClick={() => setProductModalOpen(false)}
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    className="btn-primary-compact"
                    disabled={formSubmitting}
                    onClick={handleSaveProduct}
                  >
                    {formSubmitting ? 'Đang lưu...' : modalMode === 'create' ? 'Tạo sản phẩm' : 'Lưu thay đổi'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================================== */}
      {/* 4. DELETE CONFIRMATION MODAL                                                   */}
      {/* ============================================================================== */}
      {deleteModalOpen && deletingProduct && (
        <div className="clean-modal-overlay" onClick={() => setDeleteModalOpen(false)}>
          <div className="clean-modal-box" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
            <div className="clean-modal-header">
              <h3 style={{ color: '#dc2626' }}>Xác Nhận Xóa Sản Phẩm</h3>
              <button type="button" className="action-icon-btn" onClick={() => setDeleteModalOpen(false)}>
                <X size={16} />
              </button>
            </div>

            <div className="clean-modal-body">
              {deleteError && (
                <div role="alert" style={{ marginBottom: 12, padding: '10px 14px', borderRadius: 6, background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', color: '#dc2626', fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <AlertTriangle size={15} style={{ flexShrink: 0 }} />
                  <span>{deleteError}</span>
                </div>
              )}
              <p style={{ margin: 0, fontSize: '13.5px', lineHeight: 1.5 }}>
                Bạn có chắc chắn muốn xóa sản phẩm <strong>"{deletingProduct.name}"</strong> (SKU: <code>{deletingProduct.sku}</code>) khỏi danh mục?
              </p>
              <p style={{ margin: '6px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                Sản phẩm sẽ được chuyển sang trạng thái ngừng kinh doanh. Lịch sử đơn hàng trước đây vẫn được bảo lưu an toàn.
              </p>
            </div>

            <div className="clean-modal-footer">
              <button
                type="button"
                className="btn-secondary-compact"
                disabled={deleteSubmitting}
                onClick={() => setDeleteModalOpen(false)}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                className="btn-primary-compact"
                style={{ background: '#dc2626' }}
                disabled={deleteSubmitting}
                onClick={handleDeleteProduct}
              >
                {deleteSubmitting ? 'Đang xóa...' : 'Xác nhận xóa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
