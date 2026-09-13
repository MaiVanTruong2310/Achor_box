import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Package,
  Plus,
  Search,
  Edit3,
  Trash2,
  Tag,
  AlertTriangle,
  Layers,
  DollarSign,
  TrendingUp,
  X,
  Save,
  CheckCircle2,
  Box,
  PlusCircle,
  MinusCircle,
  RefreshCw,
  Eye,
  SlidersHorizontal,
  Globe,
  Ticket,
  Gift,
  ArrowUpDown,
  History,
  ArrowUpRight,
  ArrowDownRight,
  Copy,
  Check,
  Sparkles,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Image as ImageIcon,
  Cpu,
  ShieldCheck,
  Palette,
  HardDrive,
  Share2,
  HelpCircle,
  CheckSquare,
  Square,
  LayoutGrid,
  List as ListIcon,
  Calculator,
  Zap,
  UploadCloud,
  Upload
} from 'lucide-react';
import {
  Product,
  ProductCategory,
  ProductVariant,
  ProductSEO,
  StockTransaction,
  Coupon,
  ValidateCouponResponse,
  ProductCombo
} from '../types/database';
import { productsService, ExtendedProduct } from '../services/api';
import { uploadProductImageToSupabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';

// ==============================================================================
// 1. SMARTBOX LOGO SVG FALLBACK COMPONENT
// ==============================================================================
export const SmartBoxLogoPlaceholder: React.FC<{
  name?: string;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}> = ({ name = 'SmartBox IoT', size = 56, className = '', style = {} }) => {
  return (
    <div
      className={`smartbox-logo-placeholder ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '12px',
        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
        border: '1px solid rgba(59, 130, 246, 0.3)',
        boxShadow: 'inset 0 1px 3px rgba(255, 255, 255, 0.1), 0 4px 12px rgba(0, 0, 0, 0.25)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        flexShrink: 0,
        ...style
      }}
      title={`${name} (Ảnh hệ thống mặc định)`}
    >
      {/* Circuit Glow Overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle at 50% 30%, rgba(37, 99, 235, 0.35) 0%, transparent 70%)',
          pointerEvents: 'none'
        }}
      />
      {/* SmartBox Stylized Isometric SVG Box */}
      <svg
        width={Math.max(24, size * 0.48)}
        height={Math.max(24, size * 0.48)}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ zIndex: 2 }}
      >
        <path
          d="M24 4L42 14.5V33.5L24 44L6 33.5V14.5L24 4Z"
          fill="url(#box-gradient)"
          stroke="#60a5fa"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="M24 4V24M24 24L42 14.5M24 24L6 14.5"
          stroke="#93c5fd"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <circle cx="24" cy="24" r="3.5" fill="#38bdf8" />
        <path
          d="M24 24V44"
          stroke="#3b82f6"
          strokeWidth="1.5"
          strokeDasharray="2 2"
        />
        <defs>
          <linearGradient id="box-gradient" x1="6" y1="4" x2="42" y2="44" gradientUnits="userSpaceOnUse">
            <stop stopColor="#1e40af" stopOpacity="0.8" />
            <stop offset="1" stopColor="#0f172a" stopOpacity="0.95" />
          </linearGradient>
        </defs>
      </svg>
      {size >= 60 && (
        <span
          style={{
            fontSize: '0.55rem',
            fontFamily: 'var(--font-mono)',
            fontWeight: 800,
            color: '#60a5fa',
            letterSpacing: '0.05em',
            marginTop: '2px',
            zIndex: 2,
            textTransform: 'uppercase'
          }}
        >
          SmartBox
        </span>
      )}
    </div>
  );
};

// Preset images for demo products from Supabase / High quality IoT CDNs
const PRESET_PRODUCT_IMAGES = [
  {
    name: 'SmartBox Pro Titan (Mặt Trước)',
    url: 'https://images.unsplash.com/photo-1558346490-a72e53ae2d4f?auto=format&fit=crop&w=800&q=80'
  },
  {
    name: 'SmartBox Enterprise 150L (Góc Nghiêng)',
    url: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80'
  },
  {
    name: 'Module Cảm Biến HC-SR04 & ESP32',
    url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80'
  },
  {
    name: 'Khóa Cơ Servo MG90S Kim Loại',
    url: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=800&q=80'
  }
];

// Available color options for product variants
const VARIANT_COLORS = [
  { name: 'Trắng Titan (Titanium White)', hex: '#f8fafc' },
  { name: 'Xám Không Gian (Space Gray)', hex: '#475569' },
  { name: 'Đen Nhám (Matte Black)', hex: '#0f172a' },
  { name: 'Xanh Navy (Deep Cobalt)', hex: '#1e3a8a' },
  { name: 'Vàng Kim Khí (Metallic Amber)', hex: '#d97706' }
];

const VARIANT_FIRMWARES = [
  'v1.2.0-stable (Chuẩn)',
  'v2.0.1-mesh (Kết nối Mesh)',
  'v2.4.0-ai-vision (Nhận diện AI)',
  'v3.0.0-beta (Doanh Nghiệp)'
];

const VARIANT_CAPACITIES = [
  'Standard 45L (Hộ gia đình)',
  'Pro 85L (Biệt thự / Nhà phố)',
  'Enterprise 150L (Tòa nhà / Văn phòng)',
  'Linh kiện / Phụ kiện rời'
];

export const Products: React.FC = () => {
  const { profile } = useAuth();

  // Navigation Sub-tabs
  const [activeTab, setActiveTab] = useState<'catalog' | 'inventory' | 'promotions' | 'seo'>('catalog');

  // Main Data States
  const [products, setProducts] = useState<ExtendedProduct[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [combos, setCombos] = useState<ProductCombo[]>([]);
  const [stockLogs, setStockLogs] = useState<StockTransaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<string>('all');
  const [viewLayout, setViewLayout] = useState<'table' | 'grid'>('table');

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(8);

  // Copied State indicator
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Modal State for Product CRUD
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [modalActiveTab, setModalActiveTab] = useState<'general' | 'pricing' | 'variants' | 'media' | 'seo'>('general');

  // Product Form Data
  const [productForm, setProductForm] = useState<{
    sku: string;
    name: string;
    category_id: string;
    category_name: string;
    price: number;
    discount_price: number | null;
    stock_quantity: number;
    description: string;
    images: string[];
    is_active: boolean;
    is_featured: boolean;
    variants: ProductVariant[];
    seo: ProductSEO;
  }>({
    sku: '',
    name: '',
    category_id: '',
    category_name: 'Hộp Nhận Hàng IoT',
    price: 1850000,
    discount_price: null,
    stock_quantity: 20,
    description: '',
    images: [],
    is_active: true,
    is_featured: false,
    variants: [],
    seo: {
      meta_title: '',
      meta_description: '',
      slug: '',
      keywords: ['smartbox', 'hộp nhận hàng thông minh', 'iot esp32']
    }
  });

  // Image Upload to Supabase Storage State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccessMessage, setUploadSuccessMessage] = useState<string | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [isCopiedUrl, setIsCopiedUrl] = useState(false);

  const handleFileUpload = async (file: File) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('Vui lòng chỉ chọn tệp hình ảnh hợp lệ (PNG, JPG, WEBP, SVG).');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setUploadError('Kích thước tệp vượt quá giới hạn 10MB của Supabase Storage.');
      return;
    }

    setIsUploadingImage(true);
    setUploadError(null);
    setUploadSuccessMessage(null);

    try {
      const res = await uploadProductImageToSupabase(file);
      if (res.error) {
        setUploadError(res.error);
      } else if (res.url) {
        setProductForm((prev) => ({
          ...prev,
          images: [res.url, ...prev.images.filter((u) => u !== res.url)]
        }));
        setUploadSuccessMessage('Đã tải ảnh lên Supabase Storage thành công và lưu liên kết CDN!');
        setTimeout(() => setUploadSuccessMessage(null), 5000);
      }
    } catch (err: any) {
      setUploadError(err.message || 'Lỗi khi tải ảnh lên Supabase');
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleCopyUrl = (url: string) => {
    if (!url) return;
    navigator.clipboard.writeText(url);
    setIsCopiedUrl(true);
    setTimeout(() => setIsCopiedUrl(false), 2000);
  };

  // Modal State for Stock Movement (In / Out)
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [stockTargetProduct, setStockTargetProduct] = useState<ExtendedProduct | null>(null);
  const [stockMovementType, setStockMovementType] = useState<'in' | 'out'>('in');
  const [stockMovementDelta, setStockMovementDelta] = useState<number>(10);
  const [stockMovementReason, setStockMovementReason] = useState<string>('Nhập lô sản xuất xưởng');
  const [stockMovementNotes, setStockMovementNotes] = useState<string>('');

  // Modal State for Coupon CRUD
  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);
  const [couponForm, setCouponForm] = useState<Coupon>({
    id: '',
    code: '',
    description: '',
    discount_type: 'percentage',
    discount_value: 10,
    min_order_value: 1000000,
    max_discount: 300000,
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0],
    usage_limit: 100,
    used_count: 0,
    is_active: true
  });

  // Live Coupon Simulator State
  const [testCouponCode, setTestCouponCode] = useState('SMARTBOX2026');
  const [testOrderAmount, setTestOrderAmount] = useState<number>(3000000);
  const [testResult, setTestResult] = useState<ValidateCouponResponse | null>(null);
  const [isTestingCoupon, setIsTestingCoupon] = useState(false);

  const handleTestCoupon = async () => {
    if (!testCouponCode.trim()) return;
    setIsTestingCoupon(true);
    try {
      const result = await productsService.validateCoupon(testCouponCode, Number(testOrderAmount) || 0);
      setTestResult(result);
    } catch {
      // ignore
    } finally {
      setIsTestingCoupon(false);
    }
  };

  // Modal State for Combo CRUD
  const [isComboModalOpen, setIsComboModalOpen] = useState(false);
  const [comboProductSearch, setComboProductSearch] = useState('');
  const [comboForm, setComboForm] = useState<ProductCombo>({
    id: '',
    name: '',
    description: '',
    product_ids: [],
    product_names: [],
    original_price: 0,
    combo_price: 0,
    discount_percent: 15,
    image_url: '',
    is_active: true
  });

  // Load all data
  const loadAllData = async () => {
    setLoading(true);
    try {
      const [prodsData, catsData, couponsData, combosData, logsData] = await Promise.all([
        productsService.getProducts(),
        productsService.getCategories(),
        productsService.getCoupons(),
        productsService.getCombos(),
        productsService.getStockTransactions()
      ]);

      // Enrich products with sample variants & SEO if missing
      const enrichedProds: ExtendedProduct[] = prodsData.map((p, idx) => {
        const defaultSlug = p.name
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '');

        const hasVariants = p.variants && p.variants.length > 0;
        const variants: ProductVariant[] = hasVariants
          ? p.variants!
          : [
              {
                id: `var-${p.id}-1`,
                sku: `${p.sku}-WHT`,
                name: `${p.name} (Trắng Titan)`,
                color: 'Trắng Titan',
                color_code: '#f8fafc',
                firmware_version: 'v1.2.0-stable',
                capacity: 'Standard 45L',
                price_adjustment: 0,
                stock_quantity: Math.floor(p.stock_quantity * 0.6)
              },
              {
                id: `var-${p.id}-2`,
                sku: `${p.sku}-GRY`,
                name: `${p.name} (Xám Không Gian)`,
                color: 'Xám Không Gian',
                color_code: '#475569',
                firmware_version: 'v2.0.1-mesh',
                capacity: 'Pro 85L',
                price_adjustment: 350000,
                stock_quantity: Math.floor(p.stock_quantity * 0.4)
              }
            ];

        const seo: ProductSEO = p.seo || {
          meta_title: `${p.name} - Hộp Giao Nhận Hàng Thông Minh SmartBox IoT`,
          meta_description:
            p.description ||
            `Mua ngay ${p.name} chính hãng SmartBox với cảm biến tự động, camera an ninh và khóa điện tử ESP32. Bảo hành 12 tháng.`,
          slug: defaultSlug || `smartbox-product-${idx + 1}`,
          keywords: ['smartbox', 'hộp nhận hàng', 'iot', 'esp32', p.sku.toLowerCase()],
          canonical_url: `https://smartbox.vn/products/${defaultSlug || p.sku.toLowerCase()}`
        };

        return {
          ...p,
          variants,
          seo,
          is_featured: idx === 0 || idx === 1
        };
      });

      setProducts(enrichedProds);
      setCategories(catsData);
      setCoupons(couponsData);
      setCombos(combosData);
      setStockLogs(logsData);
    } catch (err) {
      console.error('Error loading product management data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchCat = selectedCategory === 'all' || p.category_name === selectedCategory;

      const matchStock =
        stockFilter === 'all' ||
        (stockFilter === 'low' && p.stock_quantity < 10) ||
        (stockFilter === 'available' && p.stock_quantity >= 10);

      return matchSearch && matchCat && matchStock;
    });
  }, [products, searchTerm, selectedCategory, stockFilter]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredProducts.slice(start, start + pageSize);
  }, [filteredProducts, currentPage, pageSize]);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategory, stockFilter, pageSize]);

  // Overall KPI metrics
  const totalStock = products.reduce((acc, p) => acc + p.stock_quantity, 0);
  const totalInventoryValue = products.reduce((acc, p) => acc + p.price * p.stock_quantity, 0);
  const lowStockCount = products.filter((p) => p.stock_quantity < 10).length;
  const activeCouponsCount = coupons.filter((c) => c.is_active).length;

  // Copy code helper
  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // -------------------------------------------------------------
  // Product CRUD Handlers
  // -------------------------------------------------------------
  const handleOpenCreateProduct = () => {
    setModalMode('create');
    setEditingId(null);
    setModalActiveTab('general');
    const defaultCat = categories[0];
    const newSku = `SDB-PRO-0${products.length + 1}`;
    setProductForm({
      sku: newSku,
      name: '',
      category_id: defaultCat?.id || '',
      category_name: defaultCat?.name || 'Hộp Nhận Hàng IoT',
      price: 2200000,
      discount_price: null,
      stock_quantity: 25,
      description: '',
      images: [],
      is_active: true,
      is_featured: false,
      variants: [
        {
          id: `var-new-1`,
          sku: `${newSku}-WHT`,
          name: 'Phiên bản Trắng Titan',
          color: 'Trắng Titan',
          color_code: '#f8fafc',
          firmware_version: 'v1.2.0-stable',
          capacity: 'Standard 45L',
          price_adjustment: 0,
          stock_quantity: 15
        }
      ],
      seo: {
        meta_title: '',
        meta_description: '',
        slug: '',
        keywords: ['smartbox', 'hộp thông minh', 'iot']
      }
    });
    setIsProductModalOpen(true);
  };

  const handleOpenEditProduct = (prod: ExtendedProduct) => {
    setModalMode('edit');
    setEditingId(prod.id);
    setModalActiveTab('general');
    setProductForm({
      sku: prod.sku,
      name: prod.name,
      category_id: prod.category_id || '',
      category_name: prod.category_name || 'Hộp Nhận Hàng IoT',
      price: prod.price,
      discount_price: prod.discount_price || null,
      stock_quantity: prod.stock_quantity,
      description: prod.description || '',
      images: prod.images || [],
      is_active: prod.is_active,
      is_featured: prod.is_featured || false,
      variants: prod.variants || [],
      seo: prod.seo || {
        meta_title: `${prod.name} - SmartBox IoT`,
        meta_description: prod.description || '',
        slug: prod.sku.toLowerCase()
      }
    });
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const matchedCategory = categories.find(
      (c) => c.id === productForm.category_id || c.name === productForm.category_name
    );
    const targetCategoryId =
      matchedCategory?.id || (productForm.category_id?.length === 36 ? productForm.category_id : undefined);

    // Auto-generate slug if empty
    const finalSlug =
      productForm.seo.slug ||
      productForm.name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

    const finalSEO: ProductSEO = {
      ...productForm.seo,
      meta_title: productForm.seo.meta_title || `${productForm.name} - SmartBox IoT`,
      meta_description:
        productForm.seo.meta_description ||
        productForm.description ||
        `Sản phẩm ${productForm.name} chính hãng SmartBox IoT.`,
      slug: finalSlug,
      canonical_url: `https://smartbox.vn/products/${finalSlug}`
    };

    if (modalMode === 'create') {
      const newProductPayload: Partial<Product> = {
        category_id: targetCategoryId,
        sku: productForm.sku,
        name: productForm.name,
        description: productForm.description,
        price: Number(productForm.price),
        discount_price: productForm.discount_price ? Number(productForm.discount_price) : null,
        stock_quantity: Number(productForm.stock_quantity),
        images: productForm.images,
        is_active: productForm.is_active,
        is_featured: productForm.is_featured,
        variants: productForm.variants,
        seo: finalSEO
      };

      const res = await productsService.createProduct(newProductPayload);
      const createdItem: ExtendedProduct = res.data
        ? { ...res.data, category_name: matchedCategory?.name || productForm.category_name, variants: productForm.variants, seo: finalSEO }
        : {
            id: `prod-local-${Date.now()}`,
            category_id: targetCategoryId || null,
            category_name: matchedCategory?.name || productForm.category_name,
            sku: productForm.sku,
            name: productForm.name,
            description: productForm.description,
            price: Number(productForm.price),
            discount_price: productForm.discount_price ? Number(productForm.discount_price) : null,
            stock_quantity: Number(productForm.stock_quantity),
            images: productForm.images,
            is_active: productForm.is_active,
            is_featured: productForm.is_featured,
            variants: productForm.variants,
            seo: finalSEO,
            created_at: new Date().toISOString()
          };

      setProducts([createdItem, ...products]);

      // Record creation stock log
      await productsService.addStockTransaction({
        id: `tx-${Date.now().toString().slice(-6)}`,
        product_id: createdItem.id,
        product_name: createdItem.name,
        sku: createdItem.sku,
        transaction_type: 'in',
        delta: createdItem.stock_quantity,
        previous_stock: 0,
        new_stock: createdItem.stock_quantity,
        reason: 'Khởi tạo sản phẩm & nhập tồn kho ban đầu',
        created_at: new Date().toISOString(),
        created_by: profile?.full_name || 'Tổng Quản Trị Hệ Thống'
      });
    } else if (modalMode === 'edit' && editingId) {
      await productsService.updateProduct(editingId, {
        sku: productForm.sku,
        name: productForm.name,
        category_id: targetCategoryId,
        price: Number(productForm.price),
        discount_price: productForm.discount_price ? Number(productForm.discount_price) : null,
        stock_quantity: Number(productForm.stock_quantity),
        description: productForm.description,
        images: productForm.images,
        is_active: productForm.is_active,
        is_featured: productForm.is_featured,
        variants: productForm.variants,
        seo: finalSEO
      });

      setProducts(
        products.map((p) => {
          if (p.id === editingId) {
            return {
              ...p,
              sku: productForm.sku,
              name: productForm.name,
              category_id: targetCategoryId || p.category_id,
              category_name: matchedCategory?.name || productForm.category_name,
              price: Number(productForm.price),
              discount_price: productForm.discount_price ? Number(productForm.discount_price) : null,
              stock_quantity: Number(productForm.stock_quantity),
              description: productForm.description,
              images: productForm.images,
              is_active: productForm.is_active,
              is_featured: productForm.is_featured,
              variants: productForm.variants,
              seo: finalSEO
            };
          }
          return p;
        })
      );
    }

    setIsProductModalOpen(false);
  };

  const handleDeleteProduct = async (id: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa sản phẩm này khỏi cơ sở dữ liệu?')) {
      setProducts(products.filter((p) => p.id !== id));
      await productsService.deleteProduct(id);
    }
  };

  // -------------------------------------------------------------
  // Stock Adjustment Handlers
  // -------------------------------------------------------------
  const handleQuickAdjustStock = async (prod: ExtendedProduct, delta: number) => {
    const prevStock = prod.stock_quantity;
    const nextStock = Math.max(0, prevStock + delta);
    const reason = delta > 0 ? `Nhập kho nhanh (+${delta} sản phẩm)` : `Xuất kho nhanh (${delta} sản phẩm)`;

    setProducts(
      products.map((p) => {
        if (p.id === prod.id) {
          return { ...p, stock_quantity: nextStock };
        }
        return p;
      })
    );

    await productsService.updateStock(prod.id, delta, reason, profile?.full_name || 'Admin');

    const newTx: StockTransaction = {
      id: `tx-${Date.now().toString().slice(-6)}`,
      product_id: prod.id,
      product_name: prod.name,
      sku: prod.sku,
      transaction_type: delta > 0 ? 'in' : 'out',
      delta: Math.abs(delta),
      previous_stock: prevStock,
      new_stock: nextStock,
      reason,
      created_at: new Date().toISOString(),
      created_by: profile?.full_name || 'Tổng Quản Trị Hệ Thống'
    };

    setStockLogs([newTx, ...stockLogs]);
    await productsService.addStockTransaction(newTx);
  };

  const handleOpenDetailedStockModal = (prod: ExtendedProduct) => {
    setStockTargetProduct(prod);
    setStockMovementType('in');
    setStockMovementDelta(10);
    setStockMovementReason('Nhập lô sản xuất xưởng');
    setStockMovementNotes('');
    setIsStockModalOpen(true);
  };

  const handleExecuteStockMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockTargetProduct) return;

    const deltaValue = stockMovementType === 'in' ? Math.abs(stockMovementDelta) : -Math.abs(stockMovementDelta);
    const prevStock = stockTargetProduct.stock_quantity;
    const nextStock = Math.max(0, prevStock + deltaValue);
    const finalReason = stockMovementNotes ? `${stockMovementReason}: ${stockMovementNotes}` : stockMovementReason;

    setProducts(
      products.map((p) => {
        if (p.id === stockTargetProduct.id) {
          return { ...p, stock_quantity: nextStock };
        }
        return p;
      })
    );

    await productsService.updateStock(stockTargetProduct.id, deltaValue, finalReason, profile?.full_name || 'Admin');

    const newTx: StockTransaction = {
      id: `tx-${Date.now().toString().slice(-6)}`,
      product_id: stockTargetProduct.id,
      product_name: stockTargetProduct.name,
      sku: stockTargetProduct.sku,
      transaction_type: stockMovementType,
      delta: Math.abs(deltaValue),
      previous_stock: prevStock,
      new_stock: nextStock,
      reason: finalReason,
      created_at: new Date().toISOString(),
      created_by: profile?.full_name || 'Tổng Quản Trị Hệ Thống'
    };

    setStockLogs([newTx, ...stockLogs]);
    await productsService.addStockTransaction(newTx);
    setIsStockModalOpen(false);
  };

  // -------------------------------------------------------------
  // Variant Management Helper in Modal
  // -------------------------------------------------------------
  const handleAddVariant = () => {
    const newVariant: ProductVariant = {
      id: `var-${Date.now()}`,
      sku: `${productForm.sku}-VAR${productForm.variants.length + 1}`,
      name: `Biến thể mới #${productForm.variants.length + 1}`,
      color: VARIANT_COLORS[productForm.variants.length % VARIANT_COLORS.length].name,
      color_code: VARIANT_COLORS[productForm.variants.length % VARIANT_COLORS.length].hex,
      firmware_version: VARIANT_FIRMWARES[0],
      capacity: VARIANT_CAPACITIES[0],
      price_adjustment: 0,
      stock_quantity: 10
    };
    setProductForm({
      ...productForm,
      variants: [...productForm.variants, newVariant]
    });
  };

  const handleUpdateVariant = (index: number, field: keyof ProductVariant, val: any) => {
    const updated = [...productForm.variants];
    updated[index] = { ...updated[index], [field]: val };
    setProductForm({ ...productForm, variants: updated });
  };

  const handleRemoveVariant = (index: number) => {
    const updated = productForm.variants.filter((_, i) => i !== index);
    setProductForm({ ...productForm, variants: updated });
  };

  // -------------------------------------------------------------
  // Coupon Handlers
  // -------------------------------------------------------------
  const handleToggleCoupon = async (coupon: Coupon) => {
    const updated: Coupon = { ...coupon, is_active: !coupon.is_active };
    setCoupons(coupons.map((c) => (c.id === coupon.id ? updated : c)));
    await productsService.saveCoupon(updated);
  };

  const handleDeleteCoupon = async (id: string) => {
    if (confirm('Bạn có chắc muốn xóa mã giảm giá này?')) {
      setCoupons(coupons.filter((c) => c.id !== id));
      await productsService.deleteCoupon(id);
    }
  };

  const handleSaveCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    const newCoupon: Coupon = {
      ...couponForm,
      id: couponForm.id || `cpn-${Date.now().toString().slice(-4)}`,
      code: couponForm.code.toUpperCase().trim()
    };
    setCoupons([newCoupon, ...coupons.filter((c) => c.id !== newCoupon.id)]);
    await productsService.saveCoupon(newCoupon);
    setIsCouponModalOpen(false);
  };

  // -------------------------------------------------------------
  // Combo Handlers & Product Selection
  // -------------------------------------------------------------
  const handleToggleCombo = async (combo: ProductCombo) => {
    const updated: ProductCombo = { ...combo, is_active: !combo.is_active };
    setCombos(combos.map((c) => (c.id === combo.id ? updated : c)));
    await productsService.saveCombo(updated);
  };

  const handleDeleteCombo = async (id: string) => {
    if (confirm('Bạn có chắc muốn xóa gói combo này?')) {
      setCombos(combos.filter((c) => c.id !== id));
      await productsService.deleteCombo(id);
    }
  };

  const handleToggleProductInCombo = (prod: ExtendedProduct) => {
    const isSelected = comboForm.product_ids.includes(prod.id);
    let newIds: string[];
    let newNames: string[];

    if (isSelected) {
      newIds = comboForm.product_ids.filter((id) => id !== prod.id);
      newNames = comboForm.product_names.filter((name) => name !== prod.name);
    } else {
      newIds = [...comboForm.product_ids, prod.id];
      newNames = [...comboForm.product_names, prod.name];
    }

    const selectedProds = products.filter((p) => newIds.includes(p.id));
    const newOriginalPrice = selectedProds.reduce((sum, p) => sum + (p.price || 0), 0);
    const discountRate = comboForm.discount_percent > 0 ? comboForm.discount_percent : 15;
    const newComboPrice = Math.round(newOriginalPrice * (1 - discountRate / 100));

    let newImg = comboForm.image_url;
    if ((!newImg || newImg.includes('unsplash.com')) && selectedProds.length > 0 && selectedProds[0].images?.[0]) {
      newImg = selectedProds[0].images[0];
    }

    setComboForm({
      ...comboForm,
      product_ids: newIds,
      product_names: newNames,
      original_price: newOriginalPrice,
      combo_price: newComboPrice,
      discount_percent: discountRate,
      image_url: newImg
    });
  };

  const handleRemoveProductFromCombo = (prodId: string) => {
    const newIds = comboForm.product_ids.filter((id) => id !== prodId);
    const selectedProds = products.filter((p) => newIds.includes(p.id));
    const newNames = selectedProds.map((p) => p.name);
    const newOriginalPrice = selectedProds.reduce((sum, p) => sum + (p.price || 0), 0);
    const discountRate = comboForm.discount_percent > 0 ? comboForm.discount_percent : 15;
    const newComboPrice = Math.round(newOriginalPrice * (1 - discountRate / 100));

    setComboForm({
      ...comboForm,
      product_ids: newIds,
      product_names: newNames,
      original_price: newOriginalPrice,
      combo_price: newComboPrice
    });
  };

  const handleApplyDiscountPreset = (percent: number) => {
    const newComboPrice = Math.round(comboForm.original_price * (1 - percent / 100));
    setComboForm({
      ...comboForm,
      discount_percent: percent,
      combo_price: newComboPrice
    });
  };

  const filteredComboProducts = useMemo(() => {
    if (!comboProductSearch.trim()) return products;
    const q = comboProductSearch.toLowerCase().trim();
    return products.filter((p) =>
      p.name.toLowerCase().includes(q) ||
      (p.sku && p.sku.toLowerCase().includes(q)) ||
      (p.category_name && p.category_name.toLowerCase().includes(q))
    );
  }, [products, comboProductSearch]);

  const handleSaveCombo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (comboForm.product_ids.length === 0) {
      alert('Vui lòng chọn ít nhất 1 sản phẩm cho gói combo!');
      return;
    }
    const newCombo: ProductCombo = {
      ...comboForm,
      id: comboForm.id || `combo-${Date.now().toString().slice(-4)}`
    };
    setCombos([newCombo, ...combos.filter((c) => c.id !== newCombo.id)]);
    await productsService.saveCombo(newCombo);
    setIsComboModalOpen(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 1. Header & Quick Actions */}
      <div
        className="card"
        style={{
          padding: '20px 24px',
          borderRadius: '16px',
          background: 'var(--bg-card)',
          backdropFilter: 'blur(20px)',
          border: '1px solid var(--border-glass)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                boxShadow: '0 6px 18px rgba(37, 99, 235, 0.3)',
                flexShrink: 0
              }}
            >
              <Package size={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  Quản Lý Sản Phẩm & Tồn Kho SmartBox
                </h2>
                <span className="badge badge-success" style={{ fontSize: '0.72rem', padding: '3px 9px', borderRadius: '12px' }}>
                  <Sparkles size={11} /> Đầy Đủ Biến Thể & SEO
                </span>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.83rem', marginTop: '4px', margin: 0 }}>
                Kiểm soát danh mục thiết bị IoT, biến thể firmware/màu sắc, xuất nhập tồn kho và cấu hình SEO trang bán lẻ.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              className="btn btn-secondary"
              onClick={() => {
                const sampleTarget = products[0] || null;
                if (sampleTarget) handleOpenDetailedStockModal(sampleTarget);
              }}
              style={{ borderRadius: '9999px', padding: '7px 16px', gap: '6px' }}
            >
              <ArrowUpDown size={15} color="var(--accent-amber)" />
              <span>Phiếu Xuất/Nhập Kho</span>
            </button>

            <button
              className="btn btn-primary"
              onClick={handleOpenCreateProduct}
              style={{ borderRadius: '9999px', padding: '7px 18px', gap: '6px' }}
            >
              <Plus size={16} />
              <span>Thêm Sản Phẩm Mới</span>
            </button>
          </div>
        </div>

        {/* Seamless Navigation Pill Tabs (Blends with background) */}
        <div style={{ display: 'flex', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              background: 'var(--bg-surface)',
              borderRadius: '9999px',
              padding: '3px',
              border: 'none',
              gap: '2px',
              flexWrap: 'wrap'
            }}
          >
            {[
              { id: 'catalog', label: 'Sản Phẩm & Biến Thể', icon: Package },
              { id: 'inventory', label: 'Tồn Kho & Xuất Nhập', icon: History },
              { id: 'promotions', label: `Combo & Mã Giảm Giá (${activeCouponsCount})`, icon: Gift },
              { id: 'seo', label: 'Cấu Hình SEO & Storefront', icon: Globe }
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  style={{
                    padding: '6px 16px',
                    fontSize: '0.8125rem',
                    fontWeight: isActive ? 700 : 500,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    border: 'none',
                    borderRadius: '9999px',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.2s ease',
                    background: isActive ? 'var(--accent-primary)' : 'transparent',
                    color: isActive ? '#ffffff' : 'var(--text-secondary)',
                    boxShadow: isActive ? '0 2px 8px rgba(37, 99, 235, 0.35)' : 'none'
                  }}
                >
                  <Icon size={14} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. Real-time KPI Metric Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <div className="card" style={{ padding: '16px 20px', borderRadius: '14px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(37, 99, 235, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary)', flexShrink: 0 }}>
            <Package size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
              Tổng Số Mặt Hàng / SKU
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px', whiteSpace: 'nowrap' }}>
              {products.length} <span style={{ fontSize: '0.78rem', fontWeight: 500, color: 'var(--text-secondary)' }}>SKU ({categories.length} danh mục)</span>
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '16px 20px', borderRadius: '14px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-amber)', flexShrink: 0 }}>
            <AlertTriangle size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
              Cảnh Báo Sắp Hết Hàng (&lt;10)
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--accent-amber)', marginTop: '2px', whiteSpace: 'nowrap' }}>
              {lowStockCount} <span style={{ fontSize: '0.78rem', fontWeight: 500, color: 'var(--accent-amber)' }}>mặt hàng cần nhập</span>
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '16px 20px', borderRadius: '14px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(14, 165, 233, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-sky)', flexShrink: 0 }}>
            <Box size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
              Tổng Tồn Kho Sẵn Sàng
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--accent-sky)', marginTop: '2px', whiteSpace: 'nowrap' }}>
              {totalStock.toLocaleString('vi-VN')} <span style={{ fontSize: '0.78rem', fontWeight: 500, color: 'var(--text-secondary)' }}>sản phẩm</span>
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '16px 20px', borderRadius: '14px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-emerald)', flexShrink: 0 }}>
            <DollarSign size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
              Giá Trị Kho Hàng Quy Đổi
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--accent-emerald)', marginTop: '2px', whiteSpace: 'nowrap' }}>
              {totalInventoryValue.toLocaleString('vi-VN')} ₫
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          TAB 1: PRODUCT CATALOG & VARIANTS
          ========================================================================= */}
      {activeTab === 'catalog' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Toolbar: Search, Filters, View Layout Switch */}
          <div
            className="card"
            style={{
              padding: '14px 20px',
              borderRadius: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '14px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '280px' }}>
              <div style={{ position: 'relative', width: '100%', maxWidth: '380px' }}>
                <Search size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  className="input-field"
                  style={{ paddingLeft: '40px', margin: 0, borderRadius: '9999px', border: 'none', background: 'var(--bg-surface)' }}
                  placeholder="Tìm theo tên sản phẩm, mã SKU, mô tả..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
              {/* Category Filter */}
              <select
                className="input-field"
                style={{ width: 'auto', padding: '6px 14px', fontSize: '0.8125rem', margin: 0, borderRadius: '9999px', whiteSpace: 'nowrap', border: 'none', background: 'var(--bg-surface)' }}
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="all">Tất cả danh mục</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>

              {/* Stock Status Filter Pill */}
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  background: 'var(--bg-surface)',
                  borderRadius: '9999px',
                  padding: '3px',
                  border: 'none',
                  gap: '2px'
                }}
              >
                {[
                  { id: 'all', label: `Tất cả (${products.length})` },
                  { id: 'low', label: `Sắp hết (${lowStockCount})` },
                  { id: 'available', label: 'Còn hàng' }
                ].map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setStockFilter(st.id)}
                    style={{
                      padding: '6px 14px',
                      fontSize: '0.8125rem',
                      fontWeight: stockFilter === st.id ? 700 : 500,
                      borderRadius: '9999px',
                      border: 'none',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.18s ease',
                      background: stockFilter === st.id ? 'var(--accent-primary)' : 'transparent',
                      color: stockFilter === st.id ? '#ffffff' : 'var(--text-secondary)',
                      boxShadow: stockFilter === st.id ? '0 2px 8px rgba(37, 99, 235, 0.3)' : 'none'
                    }}
                  >
                    {st.label}
                  </button>
                ))}
              </div>

              {/* Layout Switcher */}
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  background: 'var(--bg-surface)',
                  borderRadius: '9999px',
                  padding: '3px',
                  border: 'none',
                  gap: '2px'
                }}
              >
                <button
                  type="button"
                  onClick={() => setViewLayout('table')}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '9999px',
                    border: 'none',
                    cursor: 'pointer',
                    background: viewLayout === 'table' ? 'var(--accent-primary)' : 'transparent',
                    color: viewLayout === 'table' ? '#ffffff' : 'var(--text-secondary)'
                  }}
                  title="Xem dạng bảng"
                >
                  <ListIcon size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => setViewLayout('grid')}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '9999px',
                    border: 'none',
                    cursor: 'pointer',
                    background: viewLayout === 'grid' ? 'var(--accent-primary)' : 'transparent',
                    color: viewLayout === 'grid' ? '#ffffff' : 'var(--text-secondary)'
                  }}
                  title="Xem dạng lưới thẻ"
                >
                  <LayoutGrid size={15} />
                </button>
              </div>
            </div>
          </div>

          {/* TABLE VIEW */}
          {viewLayout === 'table' && (
            <div className="card" style={{ padding: 0, overflow: 'hidden', borderRadius: '14px' }}>
              <div style={{ overflowX: 'auto', width: '100%' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                      <th style={{ padding: '14px 18px', fontWeight: 700, fontSize: '0.78rem', whiteSpace: 'nowrap' }}>SẢN PHẨM & DANH MỤC</th>
                      <th style={{ padding: '14px 18px', fontWeight: 700, fontSize: '0.78rem', whiteSpace: 'nowrap' }}>MÃ SKU</th>
                      <th style={{ padding: '14px 18px', fontWeight: 700, fontSize: '0.78rem', whiteSpace: 'nowrap' }}>BIẾN THỂ</th>
                      <th style={{ padding: '14px 18px', fontWeight: 700, fontSize: '0.78rem', whiteSpace: 'nowrap' }}>GIÁ BÁN NIÊM YẾT</th>
                      <th style={{ padding: '14px 18px', fontWeight: 700, fontSize: '0.78rem', whiteSpace: 'nowrap' }}>TỒN KHO</th>
                      <th style={{ padding: '14px 18px', fontWeight: 700, fontSize: '0.78rem', whiteSpace: 'nowrap' }}>TRẠNG THÁI & SEO</th>
                      <th style={{ padding: '14px 18px', fontWeight: 700, fontSize: '0.78rem', whiteSpace: 'nowrap', textAlign: 'right' }}>THAO TÁC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedProducts.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                          <Package size={36} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
                          <div>Không tìm thấy sản phẩm nào phù hợp với bộ lọc.</div>
                        </td>
                      </tr>
                    ) : (
                      paginatedProducts.map((prod) => {
                        const hasImg = prod.images && prod.images.length > 0 && prod.images[0].trim() !== '';
                        return (
                          <tr key={prod.id} style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background 0.15s' }}>
                            {/* Product Info with SmartBox Logo Fallback */}
                            <td style={{ padding: '14px 18px', verticalAlign: 'middle' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                {hasImg ? (
                                  <img
                                    src={prod.images![0]}
                                    alt={prod.name}
                                    style={{
                                      width: '52px',
                                      height: '52px',
                                      objectFit: 'cover',
                                      borderRadius: '10px',
                                      border: '1px solid var(--border-subtle)',
                                      flexShrink: 0
                                    }}
                                    onError={(e) => {
                                      // If image fails, replace with placeholder
                                      (e.target as HTMLElement).style.display = 'none';
                                    }}
                                  />
                                ) : (
                                  <SmartBoxLogoPlaceholder name={prod.name} size={52} />
                                )}
                                <div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.88rem' }}>
                                      {prod.name}
                                    </span>
                                    {prod.is_featured && (
                                      <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', fontSize: '0.68rem', padding: '2px 6px', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                        <Sparkles size={10} />
                                        Nổi bật
                                      </span>
                                    )}
                                  </div>
                                  <div style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', marginTop: '2px', fontWeight: 600 }}>
                                    {prod.category_name}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* SKU */}
                            <td style={{ padding: '14px 18px', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>
                              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-secondary)', background: 'var(--bg-surface)', padding: '3px 8px', borderRadius: '6px', fontSize: '0.8rem' }}>
                                {prod.sku}
                              </span>
                            </td>

                            {/* Variants preview */}
                            <td style={{ padding: '14px 18px', verticalAlign: 'middle' }}>
                              {prod.variants && prod.variants.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                    {prod.variants.length} biến thể
                                  </span>
                                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                    {prod.variants.slice(0, 3).map((v) => (
                                      <span
                                        key={v.id}
                                        style={{
                                          fontSize: '0.68rem',
                                          padding: '2px 6px',
                                          borderRadius: '6px',
                                          background: 'var(--bg-surface)',
                                          color: 'var(--text-secondary)',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '4px'
                                        }}
                                      >
                                        {v.color_code && (
                                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: v.color_code }} />
                                        )}
                                        {v.color || v.name}
                                      </span>
                                    ))}
                                    {prod.variants.length > 3 && (
                                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                                        +{prod.variants.length - 3}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Mặc định</span>
                              )}
                            </td>

                            {/* Price */}
                            <td style={{ padding: '14px 18px', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>
                              <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--accent-sky)' }}>
                                {prod.price.toLocaleString('vi-VN')} ₫
                              </div>
                              {prod.discount_price && (
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textDecoration: 'line-through' }}>
                                  {prod.discount_price.toLocaleString('vi-VN')} ₫
                                </div>
                              )}
                            </td>

                            {/* Stock with quick buttons */}
                            <td style={{ padding: '14px 18px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontWeight: 800, fontSize: '1rem', color: prod.stock_quantity < 10 ? 'var(--accent-amber)' : 'var(--accent-emerald)' }}>
                                  {prod.stock_quantity}
                                </span>
                                {prod.stock_quantity < 10 ? (
                                  <span className="badge badge-warning" style={{ fontSize: '0.68rem', borderRadius: '6px', padding: '2px 6px' }}>
                                    <AlertTriangle size={10} /> Sắp hết
                                  </span>
                                ) : (
                                  <span className="badge badge-success" style={{ fontSize: '0.68rem', borderRadius: '6px', padding: '2px 6px' }}>
                                    Sẵn hàng
                                  </span>
                                )}
                              </div>
                              {/* Quick stock adjustments */}
                              <div style={{ display: 'flex', gap: '3px', marginTop: '6px' }}>
                                <button
                                  className="btn btn-secondary"
                                  style={{ padding: '2px 6px', fontSize: '0.68rem', borderRadius: '4px' }}
                                  title="Giảm 1"
                                  onClick={() => handleQuickAdjustStock(prod, -1)}
                                >
                                  -1
                                </button>
                                <button
                                  className="btn btn-secondary"
                                  style={{ padding: '2px 6px', fontSize: '0.68rem', borderRadius: '4px' }}
                                  title="Tăng 1"
                                  onClick={() => handleQuickAdjustStock(prod, 1)}
                                >
                                  +1
                                </button>
                                <button
                                  className="btn btn-secondary"
                                  style={{ padding: '2px 6px', fontSize: '0.68rem', borderRadius: '4px' }}
                                  title="Nhập lô +10"
                                  onClick={() => handleQuickAdjustStock(prod, 10)}
                                >
                                  +10
                                </button>
                              </div>
                            </td>

                            {/* Status & SEO */}
                            <td style={{ padding: '14px 18px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <span className={prod.is_active ? 'badge badge-online' : 'badge badge-offline'} style={{ borderRadius: '6px' }}>
                                  <span className="badge-dot" />
                                  {prod.is_active ? 'Đang mở bán' : 'Tạm ngưng'}
                                </span>
                                {prod.seo?.slug && (
                                  <span style={{ fontSize: '0.7rem', color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                    <Globe size={11} /> SEO Sẵn sàng
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Actions */}
                            <td style={{ padding: '14px 18px', textAlign: 'right', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                              <div style={{ display: 'inline-flex', gap: '6px' }}>
                                <button
                                  className="btn btn-secondary"
                                  style={{ padding: '6px 10px', borderRadius: '8px' }}
                                  title="Nhập/Xuất kho chi tiết"
                                  onClick={() => handleOpenDetailedStockModal(prod)}
                                >
                                  <ArrowUpDown size={14} color="var(--accent-amber)" />
                                </button>
                                <button
                                  className="btn btn-secondary"
                                  style={{ padding: '6px 10px', borderRadius: '8px' }}
                                  title="Chỉnh sửa sản phẩm & SEO"
                                  onClick={() => handleOpenEditProduct(prod)}
                                >
                                  <Edit3 size={14} color="var(--accent-primary)" />
                                </button>
                                <button
                                  className="btn btn-secondary"
                                  style={{ padding: '6px 10px', borderRadius: '8px', color: 'var(--accent-rose)' }}
                                  title="Xóa sản phẩm"
                                  onClick={() => handleDeleteProduct(prod.id)}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* GRID CARDS VIEW */}
          {viewLayout === 'grid' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
              {paginatedProducts.map((prod) => {
                const hasImg = prod.images && prod.images.length > 0 && prod.images[0].trim() !== '';
                return (
                  <div
                    key={prod.id}
                    className="card"
                    style={{
                      padding: '16px',
                      borderRadius: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                      position: 'relative'
                    }}
                  >
                    {/* Header Image or Fallback */}
                    <div
                      style={{
                        width: '100%',
                        height: '140px',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        position: 'relative',
                        background: 'var(--bg-surface)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      {hasImg ? (
                        <img
                          src={prod.images![0]}
                          alt={prod.name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <SmartBoxLogoPlaceholder name={prod.name} size={90} />
                      )}

                      <span
                        style={{
                          position: 'absolute',
                          top: '8px',
                          left: '8px',
                          background: 'rgba(15, 23, 42, 0.85)',
                          backdropFilter: 'blur(4px)',
                          color: '#60a5fa',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '8px'
                        }}
                      >
                        {prod.sku}
                      </span>

                      <span
                        style={{
                          position: 'absolute',
                          top: '8px',
                          right: '8px'
                        }}
                        className={prod.is_active ? 'badge badge-online' : 'badge badge-offline'}
                      >
                        {prod.is_active ? 'Mở bán' : 'Tạm ngưng'}
                      </span>
                    </div>

                    {/* Product Details */}
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', fontWeight: 600, height: '1.2rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {prod.category_name}
                      </div>
                      <h4
                        style={{
                          fontSize: '0.95rem',
                          fontWeight: 700,
                          color: 'var(--text-primary)',
                          marginTop: '2px',
                          lineHeight: 1.35,
                          height: '2.6rem',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical'
                        }}
                        title={prod.name}
                      >
                        {prod.name}
                      </h4>
                      <p
                        style={{
                          fontSize: '0.78rem',
                          color: prod.description ? 'var(--text-secondary)' : 'var(--text-muted)',
                          fontStyle: prod.description ? 'normal' : 'italic',
                          marginTop: '4px',
                          height: '2.4rem',
                          lineHeight: 1.4,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical'
                        }}
                      >
                        {prod.description || 'Chưa có mô tả kỹ thuật.'}
                      </p>
                    </div>

                    {/* Pricing & Stock */}
                    <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '10px' }}>
                      <div>
                        <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--accent-sky)' }}>
                          {prod.price.toLocaleString('vi-VN')} ₫
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          Tồn: <strong style={{ color: prod.stock_quantity < 10 ? 'var(--accent-amber)' : 'var(--accent-emerald)' }}>{prod.stock_quantity}</strong> cái
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '6px 8px', borderRadius: '8px' }}
                          title="Nhập/Xuất kho"
                          onClick={() => handleOpenDetailedStockModal(prod)}
                        >
                          <ArrowUpDown size={13} color="var(--accent-amber)" />
                        </button>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '6px 8px', borderRadius: '8px' }}
                          title="Chỉnh sửa"
                          onClick={() => handleOpenEditProduct(prod)}
                        >
                          <Edit3 size={13} color="var(--accent-primary)" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* SMART PAGINATION FOOTER */}
          <div
            className="card"
            style={{
              padding: '12px 20px',
              borderRadius: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
              <span>
                Hiển thị <strong>{(currentPage - 1) * pageSize + 1}</strong> - <strong>{Math.min(currentPage * pageSize, filteredProducts.length)}</strong> trên tổng số <strong>{filteredProducts.length}</strong> sản phẩm
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '12px' }}>
                <span>Xem mỗi trang:</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '8px',
                    background: 'var(--bg-surface)',
                    border: 'none',
                    color: 'var(--text-primary)',
                    fontSize: '0.8rem',
                    cursor: 'pointer'
                  }}
                >
                  <option value={5}>5</option>
                  <option value={8}>8</option>
                  <option value={12}>12</option>
                  <option value={24}>24</option>
                </select>
              </div>
            </div>

            {/* Page Navigation Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button
                className="btn btn-secondary"
                style={{ padding: '6px 8px', borderRadius: '8px' }}
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(1)}
                title="Trang đầu"
              >
                <ChevronsLeft size={14} />
              </button>
              <button
                className="btn btn-secondary"
                style={{ padding: '6px 8px', borderRadius: '8px' }}
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                title="Trang trước"
              >
                <ChevronLeft size={14} />
              </button>

              {/* Page numbers */}
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                .map((pageNum, idx, arr) => {
                  const isCur = pageNum === currentPage;
                  const prevP = arr[idx - 1];
                  const hasGap = prevP && pageNum - prevP > 1;
                  return (
                    <React.Fragment key={pageNum}>
                      {hasGap && <span style={{ padding: '0 4px', color: 'var(--text-muted)' }}>...</span>}
                      <button
                        type="button"
                        onClick={() => setCurrentPage(pageNum)}
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          border: 'none',
                          cursor: 'pointer',
                          fontWeight: isCur ? 700 : 500,
                          fontSize: '0.8125rem',
                          background: isCur ? 'var(--accent-primary)' : 'var(--bg-surface)',
                          color: isCur ? '#ffffff' : 'var(--text-secondary)'
                        }}
                      >
                        {pageNum}
                      </button>
                    </React.Fragment>
                  );
                })}

              <button
                className="btn btn-secondary"
                style={{ padding: '6px 8px', borderRadius: '8px' }}
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                title="Trang sau"
              >
                <ChevronRight size={14} />
              </button>
              <button
                className="btn btn-secondary"
                style={{ padding: '6px 8px', borderRadius: '8px' }}
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(totalPages)}
                title="Trang cuối"
              >
                <ChevronsRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: INVENTORY & STOCK FLOW
          ========================================================================= */}
      {activeTab === 'inventory' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Inventory Top Action */}
          <div className="card" style={{ padding: '16px 20px', borderRadius: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                Nhật Ký Xuất Nhập & Biến Động Tồn Kho
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                Lưu vết tự động mọi giao dịch nhập lô xưởng, xuất bán lẻ và xuất linh kiện bảo hành KTV.
              </p>
            </div>
            <button
              className="btn btn-primary"
              onClick={() => {
                const sampleTarget = products[0] || null;
                if (sampleTarget) handleOpenDetailedStockModal(sampleTarget);
              }}
              style={{ borderRadius: '9999px', padding: '6px 16px' }}
            >
              <Plus size={15} />
              <span>Tạo Phiếu Xuất/Nhập Kho Mới</span>
            </button>
          </div>

          {/* Stock Transactions Log Table */}
          <div className="card" style={{ padding: 0, overflow: 'hidden', borderRadius: '14px' }}>
            <div style={{ overflowX: 'auto', width: '100%' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '12px 16px', fontWeight: 700, fontSize: '0.78rem', whiteSpace: 'nowrap' }}>MÃ PHIẾU</th>
                    <th style={{ padding: '12px 16px', fontWeight: 700, fontSize: '0.78rem', whiteSpace: 'nowrap' }}>SẢN PHẨM & SKU</th>
                    <th style={{ padding: '12px 16px', fontWeight: 700, fontSize: '0.78rem', whiteSpace: 'nowrap' }}>LOẠI GIAO DỊCH</th>
                    <th style={{ padding: '12px 16px', fontWeight: 700, fontSize: '0.78rem', whiteSpace: 'nowrap' }}>BIẾN ĐỘNG</th>
                    <th style={{ padding: '12px 16px', fontWeight: 700, fontSize: '0.78rem', whiteSpace: 'nowrap' }}>TỒN TRƯỚC ➔ SAU</th>
                    <th style={{ padding: '12px 16px', fontWeight: 700, fontSize: '0.78rem' }}>LÝ DO / GHI CHÚ</th>
                    <th style={{ padding: '12px 16px', fontWeight: 700, fontSize: '0.78rem', whiteSpace: 'nowrap' }}>THỜI GIAN & NGƯỜI LẬP</th>
                  </tr>
                </thead>
                <tbody>
                  {stockLogs.map((log) => {
                    const isIncoming = log.transaction_type === 'in';
                    return (
                      <tr key={log.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '12px 16px', whiteSpace: 'nowrap', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent-primary)' }}>
                          #{log.id.toUpperCase()}
                        </td>
                        <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{log.product_name}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{log.sku}</div>
                        </td>
                        <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                          <span
                            className="badge"
                            style={{
                              background: isIncoming ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                              color: isIncoming ? '#10b981' : '#f43f5e',
                              borderRadius: '6px'
                            }}
                          >
                            {isIncoming ? <ArrowDownRight size={13} /> : <ArrowUpRight size={13} />}
                            {isIncoming ? 'Nhập Kho (+)' : 'Xuất Kho (-)'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                          <span style={{ fontWeight: 800, fontSize: '0.95rem', color: isIncoming ? 'var(--accent-emerald)' : 'var(--accent-rose)' }}>
                            {isIncoming ? `+${log.delta}` : `-${log.delta}`}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>
                          {log.previous_stock} ➔ <strong style={{ color: 'var(--text-primary)' }}>{log.new_stock}</strong>
                        </td>
                        <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
                          {log.reason}
                        </td>
                        <td style={{ padding: '12px 16px', whiteSpace: 'nowrap', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          <div>{new Date(log.created_at).toLocaleString('vi-VN')}</div>
                          <div style={{ fontWeight: 600, color: 'var(--text-secondary)', marginTop: '2px' }}>{log.created_by}</div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: COMBOS & COUPONS PROMOTIONS
          ========================================================================= */}
      {activeTab === 'promotions' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* 1. Coupons Section */}
          <div className="card" style={{ padding: '20px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Ticket size={20} color="var(--accent-primary)" />
                  Mã Giảm Giá & Voucher Khuyến Mãi (Coupons)
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                  Thiết lập mã coupon giảm theo % hoặc số tiền cố định cho khách hàng thanh toán qua VNPAY / Trực tuyến.
                </p>
              </div>
              <button
                className="btn btn-primary"
                onClick={() => {
                  setCouponForm({
                    id: '',
                    code: `SMART${Math.floor(1000 + Math.random() * 9000)}`,
                    description: '',
                    discount_type: 'percentage',
                    discount_value: 10,
                    min_order_value: 1500000,
                    max_discount: 300000,
                    start_date: new Date().toISOString().split('T')[0],
                    end_date: new Date(Date.now() + 60 * 86400000).toISOString().split('T')[0],
                    usage_limit: 100,
                    used_count: 0,
                    is_active: true
                  });
                  setIsCouponModalOpen(true);
                }}
                style={{ borderRadius: '9999px', padding: '6px 16px' }}
              >
                <Plus size={15} />
                <span>Thêm Mã Coupon Mới</span>
              </button>
            </div>

            {/* Coupons Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '14px' }}>
              {coupons.map((cpn) => {
                const isPercent = cpn.discount_type === 'percentage';
                const usagePercent = Math.min(100, Math.round((cpn.used_count / cpn.usage_limit) * 100));
                return (
                  <div
                    key={cpn.id}
                    style={{
                      padding: '16px',
                      borderRadius: '14px',
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                      position: 'relative'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span
                            style={{
                              fontFamily: 'var(--font-mono)',
                              fontWeight: 800,
                              fontSize: '1rem',
                              color: 'var(--accent-primary)',
                              background: 'rgba(37, 99, 235, 0.12)',
                              padding: '3px 8px',
                              borderRadius: '6px'
                            }}
                          >
                            {cpn.code}
                          </span>
                          <button
                            onClick={() => handleCopyCode(cpn.code)}
                            title="Sao chép mã"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                          >
                            {copiedCode === cpn.code ? <Check size={14} color="var(--accent-emerald)" /> : <Copy size={14} />}
                          </button>
                        </div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--accent-emerald)', marginTop: '4px' }}>
                          {isPercent ? `Giảm ${cpn.discount_value}%` : `Giảm ${cpn.discount_value.toLocaleString('vi-VN')} ₫`}
                        </div>
                      </div>

                      <button
                        onClick={() => handleToggleCoupon(cpn)}
                        className={cpn.is_active ? 'badge badge-online' : 'badge badge-offline'}
                        style={{ cursor: 'pointer', border: 'none', borderRadius: '8px' }}
                      >
                        {cpn.is_active ? 'Đang áp dụng' : 'Tạm dừng'}
                      </button>
                    </div>

                    <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                      {cpn.description}
                    </p>

                    {/* Usage Progress */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        <span>Lượt dùng: {cpn.used_count} / {cpn.usage_limit}</span>
                        <span>{usagePercent}%</span>
                      </div>
                      <div className="progress-bar-track" style={{ marginTop: '4px' }}>
                        <div className="progress-bar-fill sky" style={{ width: `${usagePercent}%` }} />
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '8px', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      <span>HSD: {cpn.start_date} ➔ {cpn.end_date}</span>
                      <button
                        onClick={() => handleDeleteCoupon(cpn.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-rose)' }}
                        title="Xóa coupon"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Live Coupon Simulator & Verification Engine */}
          <div className="card" style={{ padding: '20px', borderRadius: '16px', background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.05) 0%, rgba(16, 185, 129, 0.05) 100%)', border: '1px solid var(--border-glass)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
              <div>
                <h4 style={{ fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                  <Zap size={18} color="var(--accent-amber)" />
                  Công Cụ Giả Lập & Kiểm Tra Áp Mã Khuyến Mãi (Live Engine)
                </h4>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                  Kiểm tra trực tiếp quy tắc giảm giá, điều kiện đơn tối thiểu và trần tối đa theo logic Backend / API thời gian thực.
                </p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', alignItems: 'flex-end' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Mã Giảm Giá Cần Thử
                </label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <input
                    type="text"
                    className="input-field"
                    style={{ textTransform: 'uppercase', fontFamily: 'var(--font-mono)', fontWeight: 700 }}
                    placeholder="VD: SMARTBOX2026"
                    value={testCouponCode}
                    onChange={(e) => setTestCouponCode(e.target.value.toUpperCase())}
                  />
                  {coupons.length > 0 && (
                    <select
                      className="input-field"
                      style={{ width: 'auto', maxWidth: '140px' }}
                      value={testCouponCode}
                      onChange={(e) => setTestCouponCode(e.target.value)}
                    >
                      <option value="">-- Chọn mã --</option>
                      {coupons.map((c) => (
                        <option key={c.id} value={c.code}>{c.code}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Giá Trị Đơn Hàng Giả Lập (VNĐ)
                </label>
                <input
                  type="number"
                  className="input-field"
                  value={testOrderAmount}
                  step={100000}
                  min={0}
                  onChange={(e) => setTestOrderAmount(Number(e.target.value))}
                />
              </div>

              <div>
                <button
                  type="button"
                  onClick={handleTestCoupon}
                  disabled={isTestingCoupon || !testCouponCode}
                  className="btn btn-primary"
                  style={{ width: '100%', height: '38px', borderRadius: '8px', gap: '6px' }}
                >
                  {isTestingCoupon ? <RefreshCw size={15} className="animate-spin" /> : <Calculator size={15} />}
                  <span>{isTestingCoupon ? 'Đang Tính Toán...' : 'Kiểm Tra Áp Mã'}</span>
                </button>
              </div>
            </div>

            {testResult && (
              <div
                style={{
                  marginTop: '16px',
                  padding: '14px 18px',
                  borderRadius: '12px',
                  background: testResult.isValid ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)',
                  border: `1px solid ${testResult.isValid ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '14px',
                  animation: 'fadeIn 0.25s ease'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className={testResult.isValid ? 'badge badge-online' : 'badge badge-danger'}>
                      {testResult.isValid ? 'Áp Dụng Thành Công' : 'Không Hợp Lệ'}
                    </span>
                    <strong style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>{testResult.message}</strong>
                  </div>
                  {testResult.isValid && (
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      Mã: <strong>{testResult.code}</strong> • Loại: {testResult.discountType === 'percentage' ? `Giảm ${testResult.discountValue}%` : 'Số tiền cố định'}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', textAlign: 'right' }}>
                  <div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Tiền Được Giảm</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--accent-emerald)' }}>
                      - {testResult.discountAmount.toLocaleString('vi-VN')} ₫
                    </div>
                  </div>
                  <div style={{ borderLeft: '1px solid var(--border-subtle)', paddingLeft: '16px' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Thực Trả Khách Hàng</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--accent-primary)' }}>
                      {testResult.finalTotal.toLocaleString('vi-VN')} ₫
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 2. Combos Section */}
          <div className="card" style={{ padding: '20px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Gift size={20} color="var(--accent-amber)" />
                  Gói Combo Khuyến Mãi Sản Phẩm
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                  Gộp nhiều thiết bị & linh kiện SmartBox thành gói giá ưu đãi nhằm kích cầu mua sắm.
                </p>
              </div>
              <button
                className="btn btn-primary"
                onClick={() => {
                  setComboForm({
                    id: '',
                    name: '',
                    description: '',
                    product_ids: [],
                    product_names: [],
                    original_price: 0,
                    combo_price: 0,
                    discount_percent: 15,
                    image_url: '',
                    is_active: true
                  });
                  setComboProductSearch('');
                  setIsComboModalOpen(true);
                }}
                style={{ borderRadius: '9999px', padding: '6px 16px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Plus size={15} />
                <span>Tạo Gói Combo Mới</span>
              </button>
            </div>

            {/* Combos Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '16px' }}>
              {combos.map((combo) => (
                <div
                  key={combo.id}
                  style={{
                    padding: '16px',
                    borderRadius: '14px',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}
                >
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <img
                      src={combo.image_url || 'https://images.unsplash.com/photo-1558346490-a72e53ae2d4f?w=200'}
                      alt={combo.name}
                      style={{ width: '70px', height: '70px', borderRadius: '10px', objectFit: 'cover', flexShrink: 0 }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <h4 style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                          {combo.name}
                        </h4>
                        <span className="badge" style={{ background: 'rgba(244, 63, 94, 0.15)', color: '#f43f5e', fontSize: '0.7rem' }}>
                          Tiết kiệm -{combo.discount_percent}%
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '6px' }}>
                        <span style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--accent-emerald)' }}>
                          {combo.combo_price.toLocaleString('vi-VN')} ₫
                        </span>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textDecoration: 'line-through' }}>
                          {combo.original_price.toLocaleString('vi-VN')} ₫
                        </span>
                      </div>
                    </div>
                  </div>

                  <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0 }}>
                    {combo.description}
                  </p>

                  <div style={{ background: 'var(--bg-card)', padding: '8px 12px', borderRadius: '8px', fontSize: '0.75rem' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                      Sản phẩm bao gồm ({combo.product_names?.length || 0}):
                    </div>
                    <ul style={{ margin: 0, paddingLeft: '16px', color: 'var(--text-secondary)' }}>
                      {combo.product_names?.map((name, i) => (
                        <li key={i}>{name}</li>
                      ))}
                    </ul>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '8px' }}>
                    <button
                      onClick={() => handleToggleCombo(combo)}
                      className={combo.is_active ? 'badge badge-online' : 'badge badge-offline'}
                      style={{ cursor: 'pointer', border: 'none', borderRadius: '8px' }}
                    >
                      {combo.is_active ? 'Đang mở bán' : 'Tạm ngưng'}
                    </button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        onClick={() => {
                          setComboForm(combo);
                          setComboProductSearch('');
                          setIsComboModalOpen(true);
                        }}
                        style={{
                          background: 'rgba(59, 130, 246, 0.1)',
                          border: '1px solid rgba(59, 130, 246, 0.25)',
                          borderRadius: '6px',
                          padding: '4px 8px',
                          cursor: 'pointer',
                          color: 'var(--accent-primary)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '0.75rem',
                          fontWeight: 600
                        }}
                        title="Chỉnh sửa combo"
                      >
                        <Edit3 size={13} />
                        <span>Sửa</span>
                      </button>
                      <button
                        onClick={() => handleDeleteCombo(combo.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-rose)', padding: '4px' }}
                        title="Xóa combo"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 4: SEO STUDIO & GOOGLE SEARCH LIVE PREVIEW
          ========================================================================= */}
      {activeTab === 'seo' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* SEO Header */}
          <div className="card" style={{ padding: '20px', borderRadius: '16px' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Globe size={20} color="var(--accent-primary)" />
              SEO Studio & Xem Trước Kết Quả Tìm Kiếm Google
            </h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
              Tối ưu hóa thẻ Meta Title, Meta Description và URL Slug cho từng mã sản phẩm phục vụ trang bán hàng công khai (Public Storefront).
            </p>
          </div>

          {/* SEO Products List with Google Snippet Preview */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))', gap: '16px' }}>
            {products.map((prod) => {
              const seo = prod.seo || {
                meta_title: `${prod.name} - SmartBox IoT`,
                meta_description: prod.description || '',
                slug: prod.sku.toLowerCase()
              };
              return (
                <div
                  key={prod.id}
                  className="card"
                  style={{
                    padding: '18px',
                    borderRadius: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.78rem', color: 'var(--accent-primary)' }}>
                        {prod.sku}
                      </span>
                      <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{prod.name}</strong>
                    </div>
                    <button
                      className="btn btn-secondary"
                      style={{ padding: '4px 10px', fontSize: '0.75rem', borderRadius: '8px' }}
                      onClick={() => {
                        handleOpenEditProduct(prod);
                        setModalActiveTab('seo');
                      }}
                    >
                      <Edit3 size={12} /> Chỉnh SEO
                    </button>
                  </div>

                  {/* GOOGLE SEARCH SIMULATED SNIPPET */}
                  <div
                    style={{
                      background: '#ffffff',
                      color: '#202124',
                      padding: '14px 16px',
                      borderRadius: '12px',
                      fontFamily: 'Roboto, Arial, sans-serif',
                      boxShadow: '0 1px 6px rgba(32, 33, 36, 0.1)',
                      border: '1px solid #dadce0'
                    }}
                  >
                    {/* Simulated Google Favicon & Domain */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <div
                        style={{
                          width: '18px',
                          height: '18px',
                          borderRadius: '50%',
                          background: '#2563eb',
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.6rem',
                          fontWeight: 800
                        }}
                      >
                        SB
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#202124' }}>
                        <span>smartbox.vn</span>
                        <span style={{ color: '#5f6368' }}> › products › {seo.slug || 'item'}</span>
                      </div>
                    </div>

                    {/* Title */}
                    <div style={{ fontSize: '1.05rem', fontWeight: 500, color: '#1a0dab', lineHeight: 1.3, cursor: 'pointer' }}>
                      {seo.meta_title || `${prod.name} - SmartBox IoT Gateway`}
                    </div>

                    {/* Description */}
                    <div style={{ fontSize: '0.8rem', color: '#4d5156', marginTop: '4px', lineHeight: 1.4 }}>
                      {seo.meta_description || prod.description || 'Hộp giao nhận hàng thông minh IoT ESP32 chính hãng SmartBox.'}
                    </div>
                  </div>

                  {/* Keywords Tag Cloud */}
                  {seo.keywords && seo.keywords.length > 0 && (
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '4px' }}>
                      {seo.keywords.map((kw, i) => (
                        <span
                          key={i}
                          style={{
                            fontSize: '0.7rem',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            background: 'var(--bg-surface)',
                            color: 'var(--text-secondary)'
                          }}
                        >
                          #{kw}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 1: PRODUCT CREATE / EDIT (MULTI-TAB)
          ========================================================================= */}
      {isProductModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '780px', maxHeight: '90vh', overflowY: 'auto', borderRadius: '16px' }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                  <Package size={22} color="var(--accent-primary)" />
                  {modalMode === 'create' ? 'Thêm Mới Sản Phẩm & Cấu Hình Biến Thể' : 'Cập Nhật Thông Tin & SEO Sản Phẩm'}
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                  Mã SKU: <strong style={{ color: 'var(--accent-primary)', fontFamily: 'var(--font-mono)' }}>{productForm.sku}</strong>
                </p>
              </div>
              <button
                className="btn btn-secondary"
                style={{ padding: '6px', borderRadius: '50%' }}
                onClick={() => setIsProductModalOpen(false)}
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Sub-tabs */}
            <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
              {[
                { id: 'general', label: '1. Thông Tin Chung', icon: Package },
                { id: 'pricing', label: '2. Giá & Tồn Kho', icon: DollarSign },
                { id: 'variants', label: `3. Biến Thể (${productForm.variants.length})`, icon: Palette },
                { id: 'media', label: '4. Thư Viện Ảnh', icon: ImageIcon },
                { id: 'seo', label: '5. Cấu Hình SEO', icon: Globe }
              ].map((t) => {
                const Icon = t.icon;
                const isSel = modalActiveTab === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setModalActiveTab(t.id as any)}
                    style={{
                      padding: '6px 12px',
                      fontSize: '0.78rem',
                      fontWeight: isSel ? 700 : 500,
                      borderRadius: '8px',
                      border: 'none',
                      cursor: 'pointer',
                      background: isSel ? 'var(--accent-primary)' : 'var(--bg-surface)',
                      color: isSel ? '#ffffff' : 'var(--text-secondary)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                  >
                    <Icon size={13} />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>

            <form onSubmit={handleSaveProduct} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* TAB 1: General Info */}
              {modalActiveTab === 'general' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '4px' }}>
                        Mã SKU Gốc *
                      </label>
                      <input
                        type="text"
                        required
                        className="input-field"
                        style={{ margin: 0, fontFamily: 'var(--font-mono)', borderRadius: '8px' }}
                        value={productForm.sku}
                        onChange={(e) => setProductForm({ ...productForm, sku: e.target.value.toUpperCase() })}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '4px' }}>
                        Danh Mục Sản Phẩm *
                      </label>
                      <select
                        className="input-field"
                        style={{ margin: 0, borderRadius: '8px' }}
                        value={productForm.category_name}
                        onChange={(e) => {
                          const matched = categories.find((c) => c.name === e.target.value);
                          setProductForm({
                            ...productForm,
                            category_name: e.target.value,
                            category_id: matched?.id || productForm.category_id
                          });
                        }}
                      >
                        {categories.map((c) => (
                          <option key={c.id} value={c.name}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '4px' }}>
                      Tên Đầy Đủ Sản Phẩm *
                    </label>
                    <input
                      type="text"
                      required
                      className="input-field"
                      style={{ margin: 0, borderRadius: '8px' }}
                      value={productForm.name}
                      onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                      placeholder="Ví dụ: SmartBox Pro IoT v2 Max Cân Tải..."
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '4px' }}>
                      Mô Tả Cấu Hình & Cảm Biến IoT
                    </label>
                    <textarea
                      className="input-field"
                      rows={3}
                      style={{ margin: 0, resize: 'vertical', borderRadius: '8px' }}
                      value={productForm.description}
                      onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                      placeholder="Mô tả thông số bo mạch ESP32-S3, cảm biến HC-SR04, cơ cấu khóa servo..."
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>
                      <input
                        type="checkbox"
                        checked={productForm.is_active}
                        onChange={(e) => setProductForm({ ...productForm, is_active: e.target.checked })}
                      />
                      <span>Đang mở bán kinh doanh</span>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>
                      <input
                        type="checkbox"
                        checked={productForm.is_featured}
                        onChange={(e) => setProductForm({ ...productForm, is_featured: e.target.checked })}
                      />
                      <span>Đánh dấu sản phẩm nổi bật (Featured)</span>
                    </label>
                  </div>
                </div>
              )}

              {/* TAB 2: Pricing & Stock */}
              {modalActiveTab === 'pricing' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '4px' }}>
                        Giá Bán Niêm Yết (VNĐ) *
                      </label>
                      <input
                        type="number"
                        required
                        className="input-field"
                        style={{ margin: 0, borderRadius: '8px' }}
                        value={productForm.price}
                        onChange={(e) => setProductForm({ ...productForm, price: Number(e.target.value) })}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '4px' }}>
                        Giá Khuyến Mãi (Nếu có)
                      </label>
                      <input
                        type="number"
                        className="input-field"
                        style={{ margin: 0, borderRadius: '8px' }}
                        value={productForm.discount_price || ''}
                        onChange={(e) => setProductForm({ ...productForm, discount_price: e.target.value ? Number(e.target.value) : null })}
                        placeholder="Để trống nếu không giảm giá"
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '4px' }}>
                        Số Lượng Tồn Kho Khởi Tạo *
                      </label>
                      <input
                        type="number"
                        required
                        className="input-field"
                        style={{ margin: 0, borderRadius: '8px' }}
                        value={productForm.stock_quantity}
                        onChange={(e) => setProductForm({ ...productForm, stock_quantity: Number(e.target.value) })}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '4px' }}>
                        Ngưỡng Cảnh Báo Hết Hàng
                      </label>
                      <input
                        type="number"
                        className="input-field"
                        style={{ margin: 0, borderRadius: '8px' }}
                        defaultValue={10}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: Variants Manager */}
              {modalActiveTab === 'variants' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h4 style={{ fontSize: '0.92rem', fontWeight: 700, margin: 0 }}>
                        Biến Thể Đa Chiều (Màu sắc, Firmware, Dung tích)
                      </h4>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                        Thiết lập từng phiên bản với SKU riêng và giá chênh lệch.
                      </p>
                    </div>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={handleAddVariant}
                      style={{ padding: '4px 10px', fontSize: '0.75rem', borderRadius: '8px' }}
                    >
                      <Plus size={13} /> Thêm Biến Thể
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {productForm.variants.map((v, idx) => (
                      <div
                        key={v.id || idx}
                        style={{
                          padding: '12px',
                          borderRadius: '10px',
                          background: 'var(--bg-surface)',
                          border: '1px solid var(--border-subtle)',
                          display: 'grid',
                          gridTemplateColumns: '1.2fr 1fr 1fr 1fr 1fr auto',
                          gap: '8px',
                          alignItems: 'center'
                        }}
                      >
                        <div>
                          <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>Tên biến thể</label>
                          <input
                            type="text"
                            className="input-field"
                            style={{ margin: 0, padding: '4px 8px', fontSize: '0.75rem', borderRadius: '6px' }}
                            value={v.name}
                            onChange={(e) => handleUpdateVariant(idx, 'name', e.target.value)}
                          />
                        </div>

                        <div>
                          <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>Màu sắc</label>
                          <select
                            className="input-field"
                            style={{ margin: 0, padding: '4px 6px', fontSize: '0.75rem', borderRadius: '6px' }}
                            value={v.color}
                            onChange={(e) => {
                              const selColor = VARIANT_COLORS.find((c) => c.name === e.target.value);
                              handleUpdateVariant(idx, 'color', e.target.value);
                              if (selColor) handleUpdateVariant(idx, 'color_code', selColor.hex);
                            }}
                          >
                            {VARIANT_COLORS.map((c) => (
                              <option key={c.name} value={c.name}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>Firmware</label>
                          <select
                            className="input-field"
                            style={{ margin: 0, padding: '4px 6px', fontSize: '0.75rem', borderRadius: '6px' }}
                            value={v.firmware_version}
                            onChange={(e) => handleUpdateVariant(idx, 'firmware_version', e.target.value)}
                          >
                            {VARIANT_FIRMWARES.map((fw) => (
                              <option key={fw} value={fw}>
                                {fw}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>Giá lệch (+/- ₫)</label>
                          <input
                            type="number"
                            className="input-field"
                            style={{ margin: 0, padding: '4px 8px', fontSize: '0.75rem', borderRadius: '6px' }}
                            value={v.price_adjustment}
                            onChange={(e) => handleUpdateVariant(idx, 'price_adjustment', Number(e.target.value))}
                          />
                        </div>

                        <div>
                          <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>Tồn kho</label>
                          <input
                            type="number"
                            className="input-field"
                            style={{ margin: 0, padding: '4px 8px', fontSize: '0.75rem', borderRadius: '6px' }}
                            value={v.stock_quantity}
                            onChange={(e) => handleUpdateVariant(idx, 'stock_quantity', Number(e.target.value))}
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveVariant(idx)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-rose)', padding: '4px' }}
                          title="Xóa biến thể"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 4: Media Gallery & Supabase Storage Upload */}
              {modalActiveTab === 'media' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Modern Drag & Drop / File Picker Upload Zone */}
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDraggingFile(true);
                    }}
                    onDragLeave={() => setIsDraggingFile(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDraggingFile(false);
                      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                        handleFileUpload(e.dataTransfer.files[0]);
                      }
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      border: `2px dashed ${isDraggingFile ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                      borderRadius: '14px',
                      padding: '24px 20px',
                      textAlign: 'center',
                      background: isDraggingFile ? 'rgba(37, 99, 235, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                      cursor: isUploadingImage ? 'wait' : 'pointer',
                      transition: 'all 0.2s ease',
                      position: 'relative'
                    }}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleFileUpload(e.target.files[0]);
                        }
                      }}
                    />

                    {isUploadingImage ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                        <RefreshCw size={30} className="animate-spin" color="var(--accent-primary)" />
                        <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          Đang tải ảnh lên Supabase Storage Bucket...
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          Đang mã hóa và tạo liên kết CDN công khai tốc độ cao
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                          width: '46px',
                          height: '46px',
                          borderRadius: '12px',
                          background: 'var(--accent-primary-soft)',
                          color: 'var(--accent-primary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginBottom: '2px'
                        }}>
                          <UploadCloud size={26} />
                        </div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          Kéo thả hoặc bấm vào đây để Tải Ảnh Mới
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          Hỗ trợ ảnh PNG, JPG, JPEG, WEBP, SVG (Dung lượng tối đa 10MB)
                        </div>
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          padding: '3px 10px',
                          borderRadius: '20px',
                          background: 'rgba(16, 185, 129, 0.12)',
                          color: 'var(--accent-emerald)',
                          marginTop: '4px'
                        }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-emerald)' }} />
                          Lưu trữ an toàn trên Supabase Storage Bucket: <code>products</code>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Upload Error Alert */}
                  {uploadError && (
                    <div style={{
                      padding: '10px 14px',
                      borderRadius: '8px',
                      background: 'rgba(244, 63, 94, 0.12)',
                      border: '1px solid rgba(244, 63, 94, 0.3)',
                      color: 'var(--accent-rose-text)',
                      fontSize: '0.8rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <AlertTriangle size={16} />
                      <span>{uploadError}</span>
                    </div>
                  )}

                  {uploadSuccessMessage && (
                    <div style={{
                      padding: '10px 14px',
                      borderRadius: '8px',
                      background: 'rgba(16, 185, 129, 0.12)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      color: 'var(--accent-emerald)',
                      fontSize: '0.8rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <CheckCircle2 size={16} />
                      <span>{uploadSuccessMessage}</span>
                    </div>
                  )}

                  {/* Direct Link Input with Copy Button */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label style={{ fontSize: '0.8125rem', fontWeight: 600, margin: 0 }}>
                        URL Hình Ảnh Hiện Tại (Supabase Storage Bucket / CDN)
                      </label>
                      {productForm.images[0] && (
                        <button
                          type="button"
                          onClick={() => handleCopyUrl(productForm.images[0])}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: isCopiedUrl ? 'var(--accent-emerald)' : 'var(--accent-primary)',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          {isCopiedUrl ? <Check size={13} /> : <Copy size={13} />}
                          <span>{isCopiedUrl ? 'Đã sao chép liên kết!' : 'Sao chép link CDN'}</span>
                        </button>
                      )}
                    </div>
                    <input
                      type="url"
                      className="input-field"
                      style={{ margin: 0, borderRadius: '8px', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}
                      value={productForm.images[0] || ''}
                      onChange={(e) => {
                        const val = e.target.value.trim();
                        setProductForm({ ...productForm, images: val ? [val] : [] });
                      }}
                      placeholder="https://...supabase.co/storage/v1/object/public/products/smartbox-pro.jpg"
                    />
                  </div>

                  {/* Preset Sample Images */}
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                      Hoặc chọn nhanh ảnh mẫu minh họa IoT chuẩn:
                    </span>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {PRESET_PRODUCT_IMAGES.map((img, i) => (
                        <button
                          key={i}
                          type="button"
                          className="btn btn-secondary"
                          style={{ padding: '4px 10px', fontSize: '0.72rem', borderRadius: '8px' }}
                          onClick={() => setProductForm({ ...productForm, images: [img.url] })}
                        >
                          {img.name}
                        </button>
                      ))}
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ padding: '4px 10px', fontSize: '0.72rem', borderRadius: '8px', color: 'var(--accent-amber)' }}
                        onClick={() => setProductForm({ ...productForm, images: [] })}
                      >
                        Dùng Logo SmartBox Mặc Định (Fallback)
                      </button>
                    </div>
                  </div>

                  {/* Preview Container */}
                  <div style={{
                    border: '1px solid var(--border-glass)',
                    padding: '16px',
                    borderRadius: '12px',
                    background: 'var(--bg-surface)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px'
                  }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      Xem Trước Hình Ảnh Hiển Thị Thực Tế:
                    </div>
                    {productForm.images.length > 0 && productForm.images[0] ? (
                      <div style={{ position: 'relative', display: 'inline-block' }}>
                        <img
                          src={productForm.images[0]}
                          alt="Preview"
                          style={{
                            width: '140px',
                            height: '140px',
                            objectFit: 'cover',
                            borderRadius: '12px',
                            border: '1px solid var(--border-subtle)',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
                            display: 'block'
                          }}
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => setProductForm({ ...productForm, images: [] })}
                          style={{
                            position: 'absolute',
                            top: '-8px',
                            right: '-8px',
                            width: '26px',
                            height: '26px',
                            borderRadius: '50%',
                            background: 'var(--accent-rose)',
                            color: '#ffffff',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.5)'
                          }}
                          title="Gỡ ảnh này"
                        >
                          <X size={15} />
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                        <SmartBoxLogoPlaceholder name={productForm.name} size={110} />
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          Chưa có ảnh (Hệ thống sẽ hiển thị logo SmartBox mặc định)
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 5: SEO Configuration */}
              {modalActiveTab === 'seo' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '4px' }}>
                      Meta Title (Tiêu đề SEO Google)
                    </label>
                    <input
                      type="text"
                      className="input-field"
                      style={{ margin: 0, borderRadius: '8px' }}
                      value={productForm.seo.meta_title}
                      onChange={(e) => setProductForm({ ...productForm, seo: { ...productForm.seo, meta_title: e.target.value } })}
                      placeholder="Ví dụ: SmartBox Pro v2 - Hộp Nhận Hàng Thông Minh IoT"
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '4px' }}>
                      URL Slug (Đường dẫn thân thiện)
                    </label>
                    <input
                      type="text"
                      className="input-field"
                      style={{ margin: 0, fontFamily: 'var(--font-mono)', borderRadius: '8px' }}
                      value={productForm.seo.slug}
                      onChange={(e) => setProductForm({ ...productForm, seo: { ...productForm.seo, slug: e.target.value } })}
                      placeholder="smartbox-pro-v2-max"
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '4px' }}>
                      Meta Description (Mô tả tìm kiếm)
                    </label>
                    <textarea
                      className="input-field"
                      rows={3}
                      style={{ margin: 0, borderRadius: '8px' }}
                      value={productForm.seo.meta_description}
                      onChange={(e) => setProductForm({ ...productForm, seo: { ...productForm.seo, meta_description: e.target.value } })}
                      placeholder="Mô tả hấp dẫn dưới 160 ký tự giúp tăng tỷ lệ click trên Google..."
                    />
                  </div>

                  {/* Live Google Search Preview in Modal */}
                  <div
                    style={{
                      background: '#ffffff',
                      color: '#202124',
                      padding: '12px 16px',
                      borderRadius: '10px',
                      fontFamily: 'Roboto, Arial, sans-serif',
                      border: '1px solid #dadce0'
                    }}
                  >
                    <div style={{ fontSize: '0.72rem', color: '#202124' }}>
                      smartbox.vn › products › {productForm.seo.slug || 'san-pham'}
                    </div>
                    <div style={{ fontSize: '1rem', fontWeight: 500, color: '#1a0dab', marginTop: '2px' }}>
                      {productForm.seo.meta_title || `${productForm.name || 'Tên Sản Phẩm'} - SmartBox IoT`}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#4d5156', marginTop: '2px' }}>
                      {productForm.seo.meta_description || productForm.description || 'Mô tả tóm tắt sản phẩm SmartBox IoT.'}
                    </div>
                  </div>
                </div>
              )}

              {/* Modal Actions */}
              <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid var(--border-subtle)', paddingTop: '14px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsProductModalOpen(false)}>
                  Hủy bỏ
                </button>
                <button type="submit" className="btn btn-primary" style={{ gap: '6px', borderRadius: '9999px', padding: '7px 20px' }}>
                  <Save size={16} />
                  <span>{modalMode === 'create' ? 'Tạo Sản Phẩm' : 'Lưu Thay Đổi'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: DETAILED STOCK MOVEMENT (IN / OUT)
          ========================================================================= */}
      {isStockModalOpen && stockTargetProduct && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '520px', borderRadius: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                  <ArrowUpDown size={20} color="var(--accent-amber)" />
                  Lập Phiếu Xuất / Nhập Kho
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                  Sản phẩm: <strong style={{ color: 'var(--text-primary)' }}>{stockTargetProduct.name}</strong> ({stockTargetProduct.sku})
                </p>
              </div>
              <button className="btn btn-secondary" style={{ padding: '6px', borderRadius: '50%' }} onClick={() => setIsStockModalOpen(false)}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleExecuteStockMovement} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '6px' }}>
                  Loại Giao Dịch
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setStockMovementType('in');
                      setStockMovementReason('Nhập lô sản xuất xưởng');
                    }}
                    style={{
                      padding: '10px',
                      borderRadius: '10px',
                      border: 'none',
                      cursor: 'pointer',
                      fontWeight: stockMovementType === 'in' ? 700 : 500,
                      background: stockMovementType === 'in' ? 'rgba(16, 185, 129, 0.2)' : 'var(--bg-surface)',
                      color: stockMovementType === 'in' ? '#10b981' : 'var(--text-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    <ArrowDownRight size={16} />
                    <span>Nhập Kho Thêm</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStockMovementType('out');
                      setStockMovementReason('Xuất đơn hàng khách mua');
                    }}
                    style={{
                      padding: '10px',
                      borderRadius: '10px',
                      border: 'none',
                      cursor: 'pointer',
                      fontWeight: stockMovementType === 'out' ? 700 : 500,
                      background: stockMovementType === 'out' ? 'rgba(244, 63, 94, 0.2)' : 'var(--bg-surface)',
                      color: stockMovementType === 'out' ? '#f43f5e' : 'var(--text-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    <ArrowUpRight size={16} />
                    <span>Xuất Kho</span>
                  </button>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '4px' }}>
                  Số Lượng Biến Động (Hiện tại: <strong>{stockTargetProduct.stock_quantity}</strong> cái)
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  className="input-field"
                  style={{ margin: 0, borderRadius: '8px' }}
                  value={stockMovementDelta}
                  onChange={(e) => setStockMovementDelta(Number(e.target.value))}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '4px' }}>
                  Lý Do Giao Dịch
                </label>
                <select
                  className="input-field"
                  style={{ margin: 0, borderRadius: '8px' }}
                  value={stockMovementReason}
                  onChange={(e) => setStockMovementReason(e.target.value)}
                >
                  {stockMovementType === 'in' ? (
                    <>
                      <option value="Nhập lô sản xuất xưởng">Nhập lô sản xuất xưởng</option>
                      <option value="Nhập linh kiện kiểm định lô mới">Nhập linh kiện kiểm định lô mới</option>
                      <option value="Nhập hoàn kho từ bảo hành">Nhập hoàn kho sau bảo trì</option>
                      <option value="Điều chỉnh kiểm kê định kỳ">Điều chỉnh kiểm kê định kỳ</option>
                    </>
                  ) : (
                    <>
                      <option value="Xuất đơn hàng khách mua">Xuất giao đơn hàng</option>
                      <option value="Xuất KTV thay linh kiện bảo hành">Xuất KTV sửa chữa / bảo hành</option>
                      <option value="Xuất hàng mẫu triển lãm">Xuất hàng mẫu Demo / Showroom</option>
                      <option value="Xuất hủy hàng lỗi kỹ thuật">Xuất hủy / trả lỗi nhà cung cấp</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '4px' }}>
                  Ghi Chú Bổ Sung (Mã đơn hàng, số phiếu giao nhận...)
                </label>
                <input
                  type="text"
                  className="input-field"
                  style={{ margin: 0, borderRadius: '8px' }}
                  value={stockMovementNotes}
                  onChange={(e) => setStockMovementNotes(e.target.value)}
                  placeholder="Ví dụ: Đơn #ORD-99182 / Thợ Lê Văn Vũ..."
                />
              </div>

              <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsStockModalOpen(false)}>
                  Hủy bỏ
                </button>
                <button type="submit" className="btn btn-primary" style={{ borderRadius: '9999px', padding: '7px 20px' }}>
                  Xác Nhận Cập Nhật Kho
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 3: COUPON CREATE / EDIT
          ========================================================================= */}
      {isCouponModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '520px', borderRadius: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                  <Ticket size={20} color="var(--accent-primary)" />
                  Tạo Mã Giảm Giá Mới
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                  Thiết lập chính sách coupon khuyến mãi cho đơn hàng trực tuyến.
                </p>
              </div>
              <button className="btn btn-secondary" style={{ padding: '6px', borderRadius: '50%' }} onClick={() => setIsCouponModalOpen(false)}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveCoupon} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '4px' }}>
                  Mã Giảm Giá (Coupon Code) *
                </label>
                <input
                  type="text"
                  required
                  className="input-field"
                  style={{ margin: 0, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', borderRadius: '8px' }}
                  value={couponForm.code}
                  onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })}
                  placeholder="Vd: SUMMER2026, SMARTBOX15"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '4px' }}>
                  Mô Tả Chương Trình
                </label>
                <input
                  type="text"
                  required
                  className="input-field"
                  style={{ margin: 0, borderRadius: '8px' }}
                  value={couponForm.description}
                  onChange={(e) => setCouponForm({ ...couponForm, description: e.target.value })}
                  placeholder="Ví dụ: Giảm 15% mừng khai trương cho khách hàng mới..."
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '4px' }}>
                    Loại Giảm Giá
                  </label>
                  <select
                    className="input-field"
                    style={{ margin: 0, borderRadius: '8px' }}
                    value={couponForm.discount_type}
                    onChange={(e) => setCouponForm({ ...couponForm, discount_type: e.target.value as any })}
                  >
                    <option value="percentage">Giảm theo Phần Trăm (%)</option>
                    <option value="fixed_amount">Giảm Số Tiền Cố Định (₫)</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '4px' }}>
                    Giá Trị Giảm *
                  </label>
                  <input
                    type="number"
                    required
                    className="input-field"
                    style={{ margin: 0, borderRadius: '8px' }}
                    value={couponForm.discount_value}
                    onChange={(e) => setCouponForm({ ...couponForm, discount_value: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '4px' }}>
                    Đơn Tối Thiểu (₫)
                  </label>
                  <input
                    type="number"
                    className="input-field"
                    style={{ margin: 0, borderRadius: '8px' }}
                    value={couponForm.min_order_value || 0}
                    onChange={(e) => setCouponForm({ ...couponForm, min_order_value: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '4px' }}>
                    Số Lượt Tối Đa
                  </label>
                  <input
                    type="number"
                    required
                    className="input-field"
                    style={{ margin: 0, borderRadius: '8px' }}
                    value={couponForm.usage_limit}
                    onChange={(e) => setCouponForm({ ...couponForm, usage_limit: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '4px' }}>
                    Ngày Bắt Đầu
                  </label>
                  <input
                    type="date"
                    required
                    className="input-field"
                    style={{ margin: 0, borderRadius: '8px' }}
                    value={couponForm.start_date}
                    onChange={(e) => setCouponForm({ ...couponForm, start_date: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '4px' }}>
                    Ngày Kết Thúc
                  </label>
                  <input
                    type="date"
                    required
                    className="input-field"
                    style={{ margin: 0, borderRadius: '8px' }}
                    value={couponForm.end_date}
                    onChange={(e) => setCouponForm({ ...couponForm, end_date: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsCouponModalOpen(false)}>
                  Hủy bỏ
                </button>
                <button type="submit" className="btn btn-primary" style={{ borderRadius: '9999px', padding: '7px 20px' }}>
                  Lưu Coupon
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 4: COMBO CREATE / EDIT WITH PRODUCT PICKER
          ========================================================================= */}
      {isComboModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '680px', maxHeight: '90vh', overflowY: 'auto', borderRadius: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                  <Gift size={20} color="var(--accent-amber)" />
                  {comboForm.id ? 'Chỉnh Sửa Gói Combo Khuyến Mãi' : 'Tạo Gói Combo Khuyến Mãi'}
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                  Gộp các sản phẩm trong kho thành gói combo ưu đãi đặc biệt để kích cầu mua sắm.
                </p>
              </div>
              <button className="btn btn-secondary" style={{ padding: '6px', borderRadius: '50%' }} onClick={() => setIsComboModalOpen(false)}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveCombo} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '4px' }}>
                  Tên Gói Combo *
                </label>
                <input
                  type="text"
                  required
                  className="input-field"
                  style={{ margin: 0, borderRadius: '8px' }}
                  value={comboForm.name}
                  onChange={(e) => setComboForm({ ...comboForm, name: e.target.value })}
                  placeholder="Ví dụ: Combo SmartBox Pro + Module Cảm Biến"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '4px' }}>
                  Mô Tả Ưu Đãi
                </label>
                <textarea
                  className="input-field"
                  rows={2}
                  style={{ margin: 0, borderRadius: '8px' }}
                  value={comboForm.description}
                  onChange={(e) => setComboForm({ ...comboForm, description: e.target.value })}
                  placeholder="Mô tả lợi ích khi mua theo gói combo (ví dụ: Tặng kèm voucher bảo hành 12 tháng, miễn phí cài đặt)..."
                />
              </div>

              {/* PRODUCT PICKER SECTION */}
              <div style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '12px',
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                    <Package size={16} color="var(--accent-primary)" />
                    <span>Chọn Sản Phẩm Cho Vào Combo *</span>
                  </label>
                  <span className="badge" style={{
                    background: comboForm.product_ids.length > 0 ? 'rgba(59, 130, 246, 0.15)' : 'rgba(156, 163, 175, 0.15)',
                    color: comboForm.product_ids.length > 0 ? 'var(--accent-primary)' : 'var(--text-muted)',
                    fontSize: '0.72rem',
                    fontWeight: 700
                  }}>
                    Đã chọn: {comboForm.product_ids.length} sản phẩm
                  </span>
                </div>

                {/* Selected Products Chips */}
                {comboForm.product_ids.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', padding: '4px 0' }}>
                    {comboForm.product_ids.map((id) => {
                      const prod = products.find((p) => p.id === id);
                      return (
                        <div
                          key={id}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: 'var(--bg-card)',
                            border: '1px solid var(--border-glass)',
                            borderRadius: '8px',
                            padding: '4px 8px 4px 6px',
                            fontSize: '0.75rem',
                            color: 'var(--text-primary)'
                          }}
                        >
                          {prod?.images?.[0] ? (
                            <img
                              src={prod.images[0]}
                              alt=""
                              style={{ width: '22px', height: '22px', borderRadius: '4px', objectFit: 'cover' }}
                            />
                          ) : (
                            <Box size={14} color="var(--accent-primary)" />
                          )}
                          <span style={{ fontWeight: 600, maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {prod?.name || id}
                          </span>
                          <span style={{ color: 'var(--accent-emerald)', fontWeight: 700, fontSize: '0.72rem' }}>
                            {prod ? `${(prod.price || 0).toLocaleString('vi-VN')} ₫` : ''}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveProductFromCombo(id)}
                            style={{
                              background: 'none',
                              border: 'none',
                              padding: '2px',
                              cursor: 'pointer',
                              color: 'var(--text-muted)',
                              display: 'flex',
                              alignItems: 'center',
                              borderRadius: '4px'
                            }}
                            title="Bỏ chọn"
                          >
                            <X size={13} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Product Search Box */}
                <div style={{ position: 'relative' }}>
                  <Search
                    size={14}
                    style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
                  />
                  <input
                    type="text"
                    className="input-field"
                    style={{ margin: 0, paddingLeft: '32px', fontSize: '0.8rem', borderRadius: '8px', height: '34px' }}
                    placeholder="Tìm sản phẩm theo tên, SKU để thêm vào combo..."
                    value={comboProductSearch}
                    onChange={(e) => setComboProductSearch(e.target.value)}
                  />
                  {comboProductSearch && (
                    <button
                      type="button"
                      onClick={() => setComboProductSearch('')}
                      style={{
                        position: 'absolute',
                        right: '8px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--text-muted)'
                      }}
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>

                {/* Scrollable Product Picker List */}
                <div
                  style={{
                    maxHeight: '180px',
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    paddingRight: '4px'
                  }}
                >
                  {filteredComboProducts.length === 0 ? (
                    <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      Không tìm thấy sản phẩm nào phù hợp
                    </div>
                  ) : (
                    filteredComboProducts.map((p) => {
                      const isSelected = comboForm.product_ids.includes(p.id);
                      return (
                        <div
                          key={p.id}
                          onClick={() => handleToggleProductInCombo(p)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '6px 10px',
                            borderRadius: '8px',
                            background: isSelected ? 'rgba(59, 130, 246, 0.1)' : 'var(--bg-card)',
                            border: `1px solid ${isSelected ? 'var(--accent-primary)' : 'var(--border-glass)'}`,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', color: isSelected ? 'var(--accent-primary)' : 'var(--text-muted)' }}>
                            {isSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                          </div>
                          <img
                            src={p.images?.[0] || 'https://images.unsplash.com/photo-1558346490-a72e53ae2d4f?w=100'}
                            alt=""
                            style={{ width: '36px', height: '36px', borderRadius: '6px', objectFit: 'cover', flexShrink: 0 }}
                          />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {p.name}
                              </span>
                              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', background: 'var(--bg-surface)', padding: '1px 5px', borderRadius: '4px' }}>
                                {p.sku}
                              </span>
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                              Tồn kho: {p.stock_quantity} {p.category_name ? `• ${p.category_name}` : ''}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--accent-emerald)' }}>
                              {(p.price || 0).toLocaleString('vi-VN')} ₫
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* PRICING & DISCOUNT CALCULATION */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '0.8125rem', fontWeight: 600, margin: 0 }}>
                    Tính Toán Giá & Chiết Khấu Ưu Đãi
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Mức giảm:</span>
                    {[10, 15, 20, 25].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => handleApplyDiscountPreset(pct)}
                        style={{
                          background: comboForm.discount_percent === pct ? 'var(--accent-primary)' : 'var(--bg-surface)',
                          color: comboForm.discount_percent === pct ? '#fff' : 'var(--text-secondary)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: '6px',
                          padding: '2px 7px',
                          fontSize: '0.7rem',
                          cursor: 'pointer',
                          fontWeight: 600
                        }}
                      >
                        -{pct}%
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '3px' }}>
                      Giá Gốc (Tổng cộng) *
                    </label>
                    <input
                      type="number"
                      required
                      className="input-field"
                      style={{ margin: 0, borderRadius: '8px' }}
                      value={comboForm.original_price}
                      onChange={(e) => {
                        const newOrig = Number(e.target.value);
                        const newCombo = Math.round(newOrig * (1 - comboForm.discount_percent / 100));
                        setComboForm({ ...comboForm, original_price: newOrig, combo_price: newCombo });
                      }}
                    />
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      {(comboForm.original_price || 0).toLocaleString('vi-VN')} ₫
                    </span>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '3px' }}>
                      % Giảm Giá
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      className="input-field"
                      style={{ margin: 0, borderRadius: '8px' }}
                      value={comboForm.discount_percent}
                      onChange={(e) => {
                        const pct = Number(e.target.value);
                        const newCombo = Math.round(comboForm.original_price * (1 - pct / 100));
                        setComboForm({ ...comboForm, discount_percent: pct, combo_price: Math.max(0, newCombo) });
                      }}
                    />
                    <span style={{ fontSize: '0.7rem', color: 'var(--accent-rose)', fontWeight: 600 }}>
                      Tiết kiệm -{comboForm.discount_percent}%
                    </span>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '3px' }}>
                      Giá Bán Combo *
                    </label>
                    <input
                      type="number"
                      required
                      className="input-field"
                      style={{ margin: 0, borderRadius: '8px', borderColor: 'var(--accent-emerald)', fontWeight: 700 }}
                      value={comboForm.combo_price}
                      onChange={(e) => {
                        const newPrice = Number(e.target.value);
                        const discount = comboForm.original_price
                          ? Math.round(((comboForm.original_price - newPrice) / comboForm.original_price) * 100)
                          : 0;
                        setComboForm({ ...comboForm, combo_price: newPrice, discount_percent: Math.max(0, discount) });
                      }}
                    />
                    <span style={{ fontSize: '0.7rem', color: 'var(--accent-emerald)', fontWeight: 700 }}>
                      {(comboForm.combo_price || 0).toLocaleString('vi-VN')} ₫
                    </span>
                  </div>
                </div>
              </div>

              {/* URL Ảnh Đại Diện Combo */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '4px' }}>
                  URL Ảnh Đại Diện Combo
                </label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {comboForm.image_url ? (
                    <img
                      src={comboForm.image_url}
                      alt="Combo preview"
                      style={{ width: '38px', height: '38px', borderRadius: '8px', objectFit: 'cover', border: '1px solid var(--border-subtle)', flexShrink: 0 }}
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : null}
                  <input
                    type="url"
                    className="input-field"
                    style={{ margin: 0, borderRadius: '8px', flex: 1 }}
                    value={comboForm.image_url}
                    onChange={(e) => setComboForm({ ...comboForm, image_url: e.target.value })}
                    placeholder="https://... (hoặc tự động lấy từ ảnh sản phẩm đầu tiên)"
                  />
                </div>
              </div>

              <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsComboModalOpen(false)}>
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ borderRadius: '9999px', padding: '7px 20px', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Save size={15} />
                  <span>{comboForm.id ? 'Cập Nhật Combo' : 'Lưu Gói Combo'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
