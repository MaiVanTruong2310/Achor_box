import React, { useState, useEffect, useMemo } from 'react';
import {
  ShoppingBag,
  X,
  Plus,
  Trash2,
  ShieldAlert,
  User,
  MapPin,
  Package,
  CreditCard,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { adminRequest, AdminApiError } from '../services/adminRequest';
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
}

interface ProductItem {
  id: string;
  name: string;
  price: number;
  variants: ProductVariant[];
}

interface SelectedItem {
  productId: string;
  productName: string;
  variantId: string;
  variantName: string;
  sku: string;
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
  const [loadingInitial, setLoadingInitial] = useState(false);

  // Customer form state
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [recipientName, setRecipientName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [installationNote, setInstallationNote] = useState('');

  // Items selection state
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [chosenProductId, setChosenProductId] = useState<string>('');
  const [chosenVariantId, setChosenVariantId] = useState<string>('');
  const [chosenQuantity, setChosenQuantity] = useState<number>(1);

  // Coupon & metadata
  const [couponCode, setCouponCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Load initial catalog & customers
  useEffect(() => {
    if (!isOpen) return;

    let active = true;
    setLoadingInitial(true);
    setErrorMsg('');

    Promise.all([
      adminCatalogApi.users(0, '', 'customer', 'all'),
      adminRequest<any[]>('/products')
    ])
      .then(([usersPage, prods]) => {
        if (!active) return;
        setCustomers(usersPage.content || []);
        
        // Filter active products and transform variants
        const mappedProds: ProductItem[] = (prods || []).map((p) => ({
          id: p.id,
          name: p.name,
          price: Number(p.price) || 0,
          variants: (p.variants || []).map((v: any) => ({
            id: v.id,
            sku: v.sku || 'N/A',
            variant_name: v.variant_name || v.variantName || 'Tiêu chuẩn',
            price_delta: Number(v.price_delta || v.priceDelta) || 0,
            stock_quantity: Number(v.stock_quantity ?? v.stockQuantity) || 0
          }))
        }));
        setProducts(mappedProds);

        if (mappedProds.length > 0) {
          setChosenProductId(mappedProds[0].id);
          if (mappedProds[0].variants.length > 0) {
            setChosenVariantId(mappedProds[0].variants[0].id);
          }
        }
      })
      .catch((err) => {
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

    // Check if already in list
    const existingIndex = selectedItems.findIndex((it) => it.variantId === variant.id);
    const unitPrice = prod.price + variant.price_delta;

    if (existingIndex >= 0) {
      const updated = [...selectedItems];
      const newQty = updated[existingIndex].quantity + chosenQuantity;
      if (newQty > variant.stock_quantity) {
        toast.error(`Tổng số lượng vượt quá tồn kho khả dụng (${variant.stock_quantity}).`);
        return;
      }
      updated[existingIndex].quantity = newQty;
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
          price: unitPrice,
          quantity: chosenQuantity
        }
      ]);
    }

    setChosenQuantity(1);
    toast.success(`Đã thêm ${prod.name} (${variant.variant_name}) vào đơn.`);
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
          quantity: it.quantity
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

          {/* 2. Products & Variants Selection */}
          <div className="com-section">
            <h3 className="com-section-title">
              <Package size={18} color="var(--accent-primary, #2563eb)" />
              <span>2. Thêm sản phẩm & biến thể vào đơn</span>
            </h3>

            <div className="com-add-item-box">
              <div className="com-item-select-row">
                <div className="com-field">
                  <label className="com-label">Sản phẩm SmartBox:</label>
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
                  <label className="com-label">Biến thể / Quy cách:</label>
                  <select
                    className="com-select"
                    value={chosenVariantId}
                    onChange={(e) => setChosenVariantId(e.target.value)}
                    disabled={loadingInitial || submitting || currentVariants.length === 0}
                  >
                    {currentVariants.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.variant_name} ({v.sku}) - Tồn: {v.stock_quantity}
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

              {currentVariantObj && (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary, #64748b)', display: 'flex', gap: 16 }}>
                  <span>SKU: <b>{currentVariantObj.sku}</b></span>
                  <span>Tồn kho khả dụng: <b style={{ color: currentVariantObj.stock_quantity > 0 ? '#10b981' : '#ef4444' }}>{currentVariantObj.stock_quantity}</b> chiếc</span>
                  <span>Đơn giá biến thể: <b>{((products.find(p => p.id === chosenProductId)?.price || 0) + currentVariantObj.price_delta).toLocaleString('vi-VN')} ₫</b></span>
                </div>
              )}
            </div>

            {/* Selected Items Table */}
            {selectedItems.length > 0 ? (
              <table className="com-items-table">
                <thead>
                  <tr>
                    <th>Sản phẩm</th>
                    <th>Biến thể / SKU</th>
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
                        <span>{item.variantName}</span>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary, #64748b)' }}>{item.sku}</div>
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
