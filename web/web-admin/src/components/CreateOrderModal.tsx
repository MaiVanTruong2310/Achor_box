import React, { useState, useEffect, useMemo } from 'react';
import {
  ShoppingBag,
  X,
  Plus,
  Trash2,
  ShieldAlert,
  User,
  Package,
  CheckCircle2,
  AlertCircle,
  ShieldCheck
} from 'lucide-react';
import { adminRequest } from '../services/adminRequest';
import { adminCatalogApi } from '../services/adminCatalogApi';
import { toast } from '../contexts/ToastContext';
import { Profile } from '../types/database';
import './create-order-modal.css';

interface ProductVariant {
  id: string;
  sku: string;
  variant_name: string;
  price_delta: number;
  stock_quantity: number;
  color_name: string | null;
  color_hex: string | null;
  capacity_liter: number | null;
  warranty_months: number;
  is_active: boolean;
}

interface ProductItem {
  id: string;
  name: string;
  price: number;
  variants: ProductVariant[];
}

interface WarrantyPlan {
  id: string;
  code: string;
  name: string;
  extraMonths: number;
  price: number;
  description?: string | null;
}

interface SelectedItem {
  productId: string;
  productName: string;
  variantId: string;
  variantName: string;
  sku: string;
  colorName: string | null;
  colorHex: string | null;
  basePrice: number;
  warrantyMonths: number;
  warrantyPlanId: string;
  warrantyPlanName: string | null;
  warrantyPlanPrice: number;
  warrantyExtraMonths: number;
  price: number;
  quantity: number;
}

interface CreateOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateOrderModal: React.FC<CreateOrderModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [customers, setCustomers] = useState<Profile[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [warrantyPlans, setWarrantyPlans] = useState<WarrantyPlan[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(false);

  // Customer form state
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [recipientName, setRecipientName] = useState('');
  const [phone, setPhone] = useState('');
  const [, setEmail] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [installationNote, setInstallationNote] = useState('');

  // Items selection state
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [chosenProductId, setChosenProductId] = useState<string>('');
  const [chosenVariantId, setChosenVariantId] = useState<string>('');
  const [chosenPlanId, setChosenPlanId] = useState<string>('');
  const [chosenQuantity, setChosenQuantity] = useState<number>(1);

  // Coupon & metadata
  const [couponCode, setCouponCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Load initial catalog, warranty plans & customers
  useEffect(() => {
    if (!isOpen) return;

    let active = true;
    setLoadingInitial(true);
    setErrorMsg('');

    Promise.all([
      adminCatalogApi.users(0, '', 'customer', 'all'),
      adminRequest<any[]>('/products'),
      adminRequest<any[]>('/warranty-plans').catch(() => [])
    ])
      .then(([usersPage, prods, plans]) => {
        if (!active) return;
        setCustomers(usersPage.content || []);

        const mappedPlans: WarrantyPlan[] = (plans || []).map((pl: any) => ({
          id: pl.id,
          code: pl.code || '',
          name: pl.name || 'Gói gia hạn bảo hành',
          extraMonths: Number(pl.extraMonths ?? pl.extra_months) || 0,
          price: Number(pl.price) || 0,
          description: pl.description || null
        }));
        setWarrantyPlans(mappedPlans);

        // Filter active products and transform active variants
        const mappedProds: ProductItem[] = (prods || [])
          .filter((p: any) => p.isActive !== false && p.is_active !== false)
          .map((p: any) => ({
            id: p.id,
            name: p.name,
            price: Number(p.price) || 0,
            variants: (p.variants || [])
              .filter((v: any) => v.isActive !== false && v.is_active !== false)
              .map((v: any) => ({
                id: v.id,
                sku: v.sku || 'N/A',
                variant_name: v.variant_name || v.variantName || 'Tiêu chuẩn',
                price_delta: Number(v.price_delta ?? v.priceDelta) || 0,
                stock_quantity: Number(v.stock_quantity ?? v.stockQuantity) || 0,
                color_name: v.colorName ?? v.color_name ?? null,
                color_hex: v.colorHex ?? v.color_hex ?? null,
                capacity_liter: v.capacityLiter ?? v.capacity_liter ?? null,
                warranty_months: Number(v.warrantyMonths ?? v.warranty_months) || 12,
                is_active: v.isActive !== false && v.is_active !== false
              }))
          }))
          .filter((p) => p.variants.length > 0);
        setProducts(mappedProds);

        if (mappedProds.length > 0) {
          setChosenProductId(mappedProds[0].id);
          if (mappedProds[0].variants.length > 0) {
            setChosenVariantId(mappedProds[0].variants[0].id);
          }
        }
        setChosenPlanId('');
      })
      .catch(() => {
        if (!active) return;
        toast.error('Không thể tải danh mục sản phẩm hoặc khách hàng.', 'Lỗi tải dữ liệu');
      })
      .finally(() => {
        if (active) setLoadingInitial(false);
      });

    return () => {
      active = false;
    };
  }, [isOpen]);

  // When customer is selected from dropdown, fill in contact details
  const handleCustomerChange = (customerId: string) => {
    setSelectedCustomerId(customerId);
    const found = customers.find((c) => c.id === customerId);
    if (found) {
      setRecipientName(found.full_name || '');
      setPhone(found.phone || '');
      setEmail(found.email || '');
      setAddressLine(found.default_address || '');
    }
  };

  // Variants of currently selected product
  const currentVariants = useMemo(() => {
    const prod = products.find((p) => p.id === chosenProductId);
    return prod ? prod.variants : [];
  }, [products, chosenProductId]);

  // Update chosen variant when product changes
  useEffect(() => {
    if (currentVariants.length > 0) {
      setChosenVariantId(currentVariants[0].id);
    } else {
      setChosenVariantId('');
    }
  }, [chosenProductId, currentVariants]);

  // Currently chosen variant object
  const currentVariantObj = useMemo(() => {
    return currentVariants.find((v) => v.id === chosenVariantId);
  }, [currentVariants, chosenVariantId]);

  // Distinct color options for the current product
  const currentColors = useMemo(() => {
    const seen = new Set<string>();
    return currentVariants
      .filter((v) => v.color_name)
      .filter((v) => {
        const key = `${v.color_name}|${v.color_hex || ''}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((v) => ({ name: v.color_name as string, hex: v.color_hex || '#d4d4d8' }));
  }, [currentVariants]);

  // Distinct capacity options for the current product
  const currentCapacities = useMemo(() => {
    return Array.from(
      new Set(currentVariants.map((v) => v.capacity_liter).filter((c): c is number => typeof c === 'number' && c > 0))
    );
  }, [currentVariants]);

  const currentPlanObj = useMemo(() => {
    return warrantyPlans.find((pl) => pl.id === chosenPlanId) || null;
  }, [warrantyPlans, chosenPlanId]);

  const selectColor = (colorName: string) => {
    if (!currentVariantObj) return;
    const match =
      currentVariants.find(
        (v) => v.color_name === colorName && v.capacity_liter === currentVariantObj.capacity_liter
      ) || currentVariants.find((v) => v.color_name === colorName);
    if (match) {
      setChosenVariantId(match.id);
    }
  };

  const selectCapacity = (capacity: number) => {
    if (!currentVariantObj) return;
    const match =
      currentVariants.find(
        (v) => v.capacity_liter === capacity && v.color_name === currentVariantObj.color_name
      ) || currentVariants.find((v) => v.capacity_liter === capacity);
    if (match) {
      setChosenVariantId(match.id);
    }
  };

  // Subtotal calculation
  const subtotal = useMemo(() => {
    return selectedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [selectedItems]);

  const handleAddItem = () => {
    const prod = products.find((p) => p.id === chosenProductId);
    const variant = currentVariants.find((v) => v.id === chosenVariantId);
    if (!prod || !variant) return;

    if (chosenQuantity < 1) {
      toast.error('Số lượng tối thiểu là 1.');
      return;
    }

    if (variant.stock_quantity <= 0) {
      toast.error('Biến thể này hiện đã hết hàng trong kho.');
      return;
    }

    const baseUnitPrice = prod.price + variant.price_delta;
    const planPrice = currentPlanObj ? currentPlanObj.price : 0;
    const extraMonths = currentPlanObj ? currentPlanObj.extraMonths : 0;
    const unitPrice = baseUnitPrice + planPrice;

    // Check if already in list
    const existingIndex = selectedItems.findIndex((it) => it.variantId === variant.id);

    if (existingIndex >= 0) {
      const updated = [...selectedItems];
      const newQty = updated[existingIndex].quantity + chosenQuantity;
      if (newQty > variant.stock_quantity) {
        toast.error(`Tổng số lượng vượt quá tồn kho khả dụng (${variant.stock_quantity}).`);
        return;
      }
      updated[existingIndex] = {
        ...updated[existingIndex],
        quantity: newQty,
        warrantyPlanId: currentPlanObj ? currentPlanObj.id : '',
        warrantyPlanName: currentPlanObj ? currentPlanObj.name : null,
        warrantyPlanPrice: planPrice,
        warrantyExtraMonths: extraMonths,
        price: unitPrice
      };
      setSelectedItems(updated);
    } else {
      if (chosenQuantity > variant.stock_quantity) {
        toast.error(`Số lượng vượt quá tồn kho khả dụng (${variant.stock_quantity}).`);
        return;
      }
      setSelectedItems([
        ...selectedItems,
        {
          productId: prod.id,
          productName: prod.name,
          variantId: variant.id,
          variantName: variant.variant_name,
          sku: variant.sku,
          colorName: variant.color_name,
          colorHex: variant.color_hex,
          basePrice: baseUnitPrice,
          warrantyMonths: variant.warranty_months,
          warrantyPlanId: currentPlanObj ? currentPlanObj.id : '',
          warrantyPlanName: currentPlanObj ? currentPlanObj.name : null,
          warrantyPlanPrice: planPrice,
          warrantyExtraMonths: extraMonths,
          price: unitPrice,
          quantity: chosenQuantity
        }
      ]);
    }

    setChosenQuantity(1);
    toast.success(`Đã thêm ${prod.name} (${variant.variant_name}) vào đơn.`);
  };

  const handleUpdateItemPlan = (variantId: string, planId: string) => {
    const plan = warrantyPlans.find((pl) => pl.id === planId) || null;
    setSelectedItems((prev) =>
      prev.map((it) => {
        if (it.variantId !== variantId) return it;
        const planPrice = plan ? plan.price : 0;
        const extraMonths = plan ? plan.extraMonths : 0;
        return {
          ...it,
          warrantyPlanId: plan ? plan.id : '',
          warrantyPlanName: plan ? plan.name : null,
          warrantyPlanPrice: planPrice,
          warrantyExtraMonths: extraMonths,
          price: it.basePrice + planPrice
        };
      })
    );
  };

  const handleRemoveItem = (variantId: string) => {
    setSelectedItems((prev) => prev.filter((it) => it.variantId !== variantId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (selectedItems.length === 0) {
      setErrorMsg('Vui lòng thêm ít nhất một sản phẩm vào đơn hàng.');
      return;
    }

    if (!recipientName.trim() || !phone.trim() || !addressLine.trim()) {
      setErrorMsg('Vui lòng điền đầy đủ họ tên, số điện thoại và địa chỉ giao hàng.');
      return;
    }

    if (!/^(?:\+84|84|0)(?:3|5|7|8|9)\d{8}$/.test(phone.replace(/[\s.-]/g, ''))) {
      setErrorMsg('Số điện thoại không hợp lệ (ví dụ 0912345678 hoặc +84912345678).');
      return;
    }

    setSubmitting(true);

    try {
      const payload: any = {
        shippingAddress: addressLine.trim(),
        shippingDetails: {
          recipientName: recipientName.trim(),
          phone: phone.trim(),
          addressLine: addressLine.trim(),
          installationNote: installationNote.trim() || undefined
        },
        items: selectedItems.map((it) => ({
          variantId: it.variantId,
          quantity: it.quantity,
          ...(it.warrantyPlanId ? { warrantyPlanId: it.warrantyPlanId } : {})
        }))
      };

      if (selectedCustomerId) {
        payload.customerId = selectedCustomerId;
      }

      if (couponCode.trim()) {
        payload.couponCode = couponCode.trim();
      }

      await adminRequest<any>('/orders', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      toast.success(
        'Tạo đơn hàng mới thành công! Đơn hàng đã ở trạng thái Chờ xử lý và chuyển vào hàng đợi PO thẩm định.'
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      const msg = err?.message || 'Không thể tạo đơn hàng. Vui lòng kiểm tra lại thông tin.';
      setErrorMsg(msg);
      toast.error(msg, 'Lỗi tạo đơn hàng');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="com-overlay" role="dialog" aria-modal="true">
      <div className="com-card">
        {/* Header */}
        <div className="com-header">
          <div className="com-title-box">
            <div className="com-title-icon">
              <ShoppingBag size={20} />
            </div>
            <div>
              <h2 className="com-title">Tạo đơn hàng mới cho khách hàng</h2>
              <p className="com-subtitle">
                Đơn hàng tạo mới sẽ chuyển sang trạng thái <strong>Chờ xử lý (Pending)</strong> để PO thẩm định kho & sản phẩm.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="com-close-btn"
            onClick={onClose}
            disabled={submitting}
            title="Đóng cửa sổ"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="com-body">
          {/* Security & Operational Notice */}
          <div className="com-notice-box">
            <ShieldAlert size={20} color="#2563eb" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <strong>Quy định thanh toán & thẩm định:</strong> Quản trị viên chỉ hỗ trợ lên đơn hàng cho khách. Hệ thống <strong>không cho phép Admin thu tiền hay xác nhận thanh toán</strong>; đơn hàng được chuyển tới Quản lý Kho & Sản phẩm (PO) phê duyệt trước khi khách hàng tự hoàn tất thanh toán.
            </div>
          </div>

          {errorMsg && (
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '12px 16px', borderRadius: '10px', color: '#b91c1c', display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.88rem' }}>
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 1. Customer Selection */}
          <div className="com-section">
            <h3 className="com-section-title">
              <User size={18} color="var(--accent-primary, #2563eb)" />
              <span>1. Thông tin khách hàng & người nhận</span>
            </h3>

            <div className="com-field">
              <label className="com-label">Chọn từ danh sách khách hàng đã đăng ký (hoặc để trống nếu tạo đơn mới):</label>
              <select
                className="com-select"
                value={selectedCustomerId}
                onChange={(e) => handleCustomerChange(e.target.value)}
                disabled={loadingInitial || submitting}
              >
                <option value="">-- Khách hàng tự do / Đặt qua hotline --</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.full_name || 'Khách hàng'} - {c.email} ({c.phone || 'Chưa có SĐT'})
                  </option>
                ))}
              </select>
            </div>

            <div className="com-grid-2">
              <div className="com-field">
                <label className="com-label">Họ và tên người nhận (*):</label>
                <input
                  type="text"
                  className="com-input"
                  required
                  placeholder="Ví dụ: Nguyễn Văn A"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  disabled={submitting}
                />
              </div>

              <div className="com-field">
                <label className="com-label">Số điện thoại liên hệ (*):</label>
                <input
                  type="tel"
                  className="com-input"
                  required
                  placeholder="Ví dụ: 0987654321"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={submitting}
                />
              </div>
            </div>

            <div className="com-field">
              <label className="com-label">Địa chỉ giao hàng chi tiết (*):</label>
              <input
                type="text"
                className="com-input"
                required
                placeholder="Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành phố..."
                value={addressLine}
                onChange={(e) => setAddressLine(e.target.value)}
                disabled={submitting}
              />
            </div>

            <div className="com-field">
              <label className="com-label">Ghi chú giao hàng & hướng dẫn lắp đặt (nếu có):</label>
              <input
                type="text"
                className="com-input"
                placeholder="Ví dụ: Giao giờ hành chính, lắp đặt ban công tầng 2..."
                value={installationNote}
                onChange={(e) => setInstallationNote(e.target.value)}
                disabled={submitting}
              />
            </div>
          </div>

          {/* 2. Products, Color & Warranty Plan Selection */}
          <div className="com-section">
            <h3 className="com-section-title">
              <Package size={18} color="var(--accent-primary, #2563eb)" />
              <span>2. Thêm sản phẩm, màu sắc & gói bảo hành vào đơn</span>
            </h3>

            <div className="com-add-item-box" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="com-item-select-row">
                <div className="com-field">
                  <label className="com-label">Sản phẩm Anchor Box:</label>
                  <select
                    className="com-select"
                    value={chosenProductId}
                    onChange={(e) => setChosenProductId(e.target.value)}
                    disabled={loadingInitial || submitting || products.length === 0}
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.price.toLocaleString('vi-VN')} ₫)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="com-field">
                  <label className="com-label">Biến thể / Quy cách & Màu:</label>
                  <select
                    className="com-select"
                    value={chosenVariantId}
                    onChange={(e) => setChosenVariantId(e.target.value)}
                    disabled={loadingInitial || submitting || currentVariants.length === 0}
                  >
                    {currentVariants.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.variant_name}{v.color_name ? ` - Màu: ${v.color_name}` : ''} ({v.sku}) - Tồn: {v.stock_quantity}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="com-field">
                  <label className="com-label">Số lượng:</label>
                  <input
                    type="number"
                    className="com-input"
                    min={1}
                    max={currentVariantObj?.stock_quantity || 99}
                    value={chosenQuantity}
                    onChange={(e) => setChosenQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    disabled={submitting}
                  />
                </div>

                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleAddItem}
                  disabled={submitting || !chosenVariantId || (currentVariantObj?.stock_quantity || 0) <= 0}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 40 }}
                >
                  <Plus size={16} />
                  <span>Thêm</span>
                </button>
              </div>

              {/* Capacity & Color Swatches + Extended Warranty Plan selector */}
              <div className="com-grid-2" style={{ gap: 12, alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {currentCapacities.length > 1 && (
                    <div>
                      <span className="com-label" style={{ display: 'block', marginBottom: 4 }}>Chọn nhanh dung tích:</span>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {currentCapacities.map((cap) => {
                          const active = currentVariantObj?.capacity_liter === cap;
                          return (
                            <button
                              key={cap}
                              type="button"
                              onClick={() => selectCapacity(cap)}
                              disabled={submitting}
                              style={{
                                padding: '5px 10px',
                                borderRadius: 6,
                                fontSize: '0.78rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                border: active ? '2px solid #2563eb' : '1px solid var(--border-subtle, #cbd5e1)',
                                background: active ? 'rgba(37, 99, 235, 0.08)' : 'var(--bg-surface, #fff)',
                                color: active ? '#1d4ed8' : 'var(--text-primary, #1e293b)'
                              }}
                            >
                              {cap} L
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {currentColors.length > 0 && (
                    <div>
                      <span className="com-label" style={{ display: 'block', marginBottom: 4 }}>Chọn màu hộp:</span>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {currentColors.map((color) => {
                          const active = currentVariantObj?.color_name === color.name;
                          return (
                            <button
                              key={color.name}
                              type="button"
                              onClick={() => selectColor(color.name)}
                              disabled={submitting}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '5px 10px',
                                borderRadius: 20,
                                fontSize: '0.78rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                border: active ? '2px solid #2563eb' : '1px solid var(--border-subtle, #cbd5e1)',
                                background: active ? 'rgba(37, 99, 235, 0.08)' : 'var(--bg-surface, #fff)',
                                color: active ? '#1d4ed8' : 'var(--text-primary, #1e293b)'
                              }}
                            >
                              <span
                                style={{
                                  width: 12,
                                  height: 12,
                                  borderRadius: '50%',
                                  backgroundColor: color.hex,
                                  border: '1px solid rgba(0,0,0,0.2)',
                                  display: 'inline-block'
                                }}
                              />
                              <span>{color.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Warranty Plan Selector */}
                <div className="com-field" style={{ margin: 0 }}>
                  <label className="com-label" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <ShieldCheck size={14} color="#2563eb" />
                    <span>Gói bảo hành áp dụng:</span>
                  </label>
                  <select
                    className="com-select"
                    value={chosenPlanId}
                    onChange={(e) => setChosenPlanId(e.target.value)}
                    disabled={loadingInitial || submitting}
                  >
                    <option value="">
                      Bảo hành tiêu chuẩn ({currentVariantObj?.warranty_months || 12} tháng - Đã bao gồm)
                    </option>
                    {warrantyPlans.map((pl) => (
                      <option key={pl.id} value={pl.id}>
                        {pl.name} (+{pl.extraMonths} tháng · +{pl.price.toLocaleString('vi-VN')} ₫/sp)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {currentVariantObj && (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary, #64748b)', display: 'flex', flexWrap: 'wrap', gap: 16 }}>
                  <span>SKU: <b>{currentVariantObj.sku}</b></span>
                  {currentVariantObj.color_name && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      Màu:
                      <span
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: '50%',
                          backgroundColor: currentVariantObj.color_hex || '#d4d4d8',
                          border: '1px solid rgba(0,0,0,0.2)',
                          display: 'inline-block'
                        }}
                      />
                      <b>{currentVariantObj.color_name}</b>
                    </span>
                  )}
                  <span>
                    Bảo hành:{' '}
                    <b>
                      {(currentVariantObj.warranty_months || 12) + (currentPlanObj?.extraMonths || 0)} tháng
                      {currentPlanObj ? ` (${currentPlanObj.name})` : ' (Tiêu chuẩn)'}
                    </b>
                  </span>
                  <span>Tồn kho khả dụng: <b style={{ color: currentVariantObj.stock_quantity > 0 ? '#10b981' : '#ef4444' }}>{currentVariantObj.stock_quantity}</b> chiếc</span>
                  <span>
                    Đơn giá tạm tính:{' '}
                    <b>
                      {(
                        (products.find((p) => p.id === chosenProductId)?.price || 0) +
                        currentVariantObj.price_delta +
                        (currentPlanObj?.price || 0)
                      ).toLocaleString('vi-VN')}{' '}
                      ₫
                    </b>
                  </span>
                </div>
              )}
            </div>

            {/* Selected Items Table */}
            {selectedItems.length > 0 ? (
              <table className="com-items-table">
                <thead>
                  <tr>
                    <th>Sản phẩm</th>
                    <th>Biến thể / Màu</th>
                    <th>Gói bảo hành</th>
                    <th>Số lượng</th>
                    <th>Đơn giá</th>
                    <th>Thành tiền</th>
                    <th style={{ width: 40 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {selectedItems.map((item) => (
                    <tr key={item.variantId}>
                      <td style={{ fontWeight: 600 }}>{item.productName}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {item.colorHex && (
                            <span
                              style={{
                                width: 10,
                                height: 10,
                                borderRadius: '50%',
                                backgroundColor: item.colorHex,
                                border: '1px solid rgba(0,0,0,0.2)',
                                display: 'inline-block',
                                flexShrink: 0
                              }}
                            />
                          )}
                          <span>{item.variantName}</span>
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary, #64748b)' }}>{item.sku}</div>
                      </td>
                      <td>
                        <select
                          className="com-select"
                          style={{ padding: '4px 8px', fontSize: '0.78rem', height: 32 }}
                          value={item.warrantyPlanId}
                          onChange={(e) => handleUpdateItemPlan(item.variantId, e.target.value)}
                          disabled={submitting}
                        >
                          <option value="">Tiêu chuẩn ({item.warrantyMonths} tháng)</option>
                          {warrantyPlans.map((pl) => (
                            <option key={pl.id} value={pl.id}>
                              {pl.name} (+{pl.price.toLocaleString('vi-VN')} ₫)
                            </option>
                          ))}
                        </select>
                      </td>
                      <td style={{ fontWeight: 700 }}>{item.quantity}</td>
                      <td>{item.price.toLocaleString('vi-VN')} ₫</td>
                      <td style={{ fontWeight: 700, color: 'var(--accent-primary, #2563eb)' }}>
                        {(item.price * item.quantity).toLocaleString('vi-VN')} ₫
                      </td>
                      <td>
                        <button
                          type="button"
                          className="com-trash-btn"
                          onClick={() => handleRemoveItem(item.variantId)}
                          disabled={submitting}
                          title="Xóa mặt hàng này"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ padding: '18px', textAlign: 'center', background: 'var(--bg-secondary, #f8fafc)', borderRadius: 10, color: 'var(--text-secondary, #64748b)', fontSize: '0.86rem' }}>
                Chưa có sản phẩm nào trong đơn hàng. Vui lòng chọn sản phẩm và bấm &ldquo;Thêm&rdquo;.
              </div>
            )}
          </div>

          {/* 3. Voucher & Cost Summary */}
          <div className="com-section">
            <div className="com-grid-2" style={{ alignItems: 'center' }}>
              <div className="com-field">
                <label className="com-label">Mã Voucher / Khuyến mãi (nếu có):</label>
                <input
                  type="text"
                  className="com-input"
                  placeholder="Ví dụ: SMARTBOX2026"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  disabled={submitting}
                />
              </div>

              <div className="com-summary-bar">
                <div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary, #64748b)' }}>
                    Tổng tiền hàng ({selectedItems.reduce((acc, it) => acc + it.quantity, 0)} sản phẩm):
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#10b981' }}>
                    {subtotal.toLocaleString('vi-VN')} ₫
                  </div>
                </div>
                <div style={{ textAlign: 'right', fontSize: '0.78rem', color: 'var(--text-secondary, #64748b)' }}>
                  Trạng thái đơn: <strong>pending</strong>
                  <div>Chờ PO thẩm định</div>
                </div>
              </div>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="com-footer">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={submitting}
          >
            Hủy bỏ
          </button>

          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={submitting || selectedItems.length === 0}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 24px',
              borderRadius: 10,
              fontWeight: 700,
              background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)'
            }}
          >
            <CheckCircle2 size={18} />
            <span>{submitting ? 'Đang tạo đơn hàng...' : 'Tạo đơn hàng (Chờ PO thẩm định)'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
