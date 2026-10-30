import { CommerceStatus as Status, EventTimeline, EmptyState, RefreshButton } from '../components/CommerceUi';
import { displayDate as date } from '../components/commercePresentation';
import { OrderNavigation, OrderProgress } from '../components/OrderNavigation';
import { hasPendingOrder, markPendingOrder, clearPendingOrder } from '../api/orderRecovery';
import { phonePattern } from '../api/validation';
import { commerce, checkoutAction, canSubmitQuote } from '../api/commerce';
import { ApprovalDecision } from '../components/ApprovalDecision';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ApiError, money, shop, type OrderView, type Variant } from '../api/shop';
import { useShop } from '../ShopContext';
import { useCatalog } from '../CatalogContext';
import { AccountNav, ErrorNotice, ResourceState, useResource } from '../components/ShopUi';
import { customer, jobLabels, type CustomerOrder } from '../api/customer';
import { DraftEditor } from '../components/DraftEditor';
import { paymentApi, paymentDestination } from '../api/payment';
import {
  ShoppingBag,
  Plus,
  Package,
  Layers,
  Search,
  X,
  Check,
  ArrowRight,
  Info,
  MapPin,
  CreditCard,
  ShieldCheck,
  Truck,
  RotateCcw
} from 'lucide-react';
import './cart-order-table.css';
export function Login() {
    const { user } = useShop();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [show, setShow] = useState(false);
    const [error, setError] = useState<Error>();
    const [busy, setBusy] = useState(false);
    const [cooldown, setCooldown] = useState(0);
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const candidate = params.get('returnTo') || '/account';
    const returnTo = /^\/(?:cart|checkout(?:\/[^/?#]+)?|payment\/result|payments\/vnpay\/return|demo-payment\/[^/?#]+|account(?:\/[^?#]*)?)(?:\?[^#]*)?$/.test(candidate) && !candidate.includes('\\') ? candidate : '/account';
    useEffect(() => { if (user)
        navigate(returnTo, { replace: true }); }, [user, navigate, returnTo]);
    useEffect(() => { if (!cooldown)
        return; const timer = setTimeout(() => setCooldown(c => c - 1), 1000); return () => clearTimeout(timer); }, [cooldown]);
    async function submit(e: FormEvent) { e.preventDefault(); if (busy || cooldown)
        return; setBusy(true); setError(undefined); try {
        await shop.login(email.trim(), password);
    }
    catch (reason) {
        const err = reason as Error;
        setError(err);
        if (err instanceof ApiError && err.status === 429)
            setCooldown(60);
    }
    finally {
        setBusy(false);
    } }
    return <section className="container section form-page"><p className="eyebrow">CHÀO MỪNG TRỞ LẠI</p><h1>Đăng nhập.</h1><form onSubmit={submit} aria-busy={busy}><ErrorNotice error={error} focus /><label>Email<input type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)}/></label><label>Mật khẩu<input type={show ? 'text' : 'password'} autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)}/></label><label className="inline"><input type="checkbox" checked={show} onChange={e => setShow(e.target.checked)}/>Hiện mật khẩu</label><button className="button" disabled={busy || cooldown > 0}>{busy ? 'Đang đăng nhập…' : cooldown ? `Thử lại sau ${cooldown} giây` : 'Đăng nhập →'}</button><p className="muted">Tạo tài khoản mới hoặc khôi phục mật khẩu qua email.</p><Link to="/register">Tạo tài khoản</Link><Link className="text-link" to="/forgot-password">Quên mật khẩu?</Link></form></section>;
}
export function Cart() {
    const { lines, quantity, user, clear, add } = useShop();
    const catalog = useCatalog();
    const [selectedVariantId, setSelectedVariantId] = useState('');
    const [inputQty, setInputQty] = useState(1);
    const [addFeedback, setAddFeedback] = useState<{ type: 'error' | 'success'; message: string } | null>(null);

    const [address, setAddress] = useState('');
    const [addressId, setAddressId] = useState('');
    const [recipient, setRecipient] = useState('');
    const [phone, setPhone] = useState('');
    const [note, setNote] = useState('');
    const addresses = useResource(signal => user ? customer.addresses(signal) : Promise.resolve([]), user?.userId || 'guest');
    const [error, setError] = useState<Error>();
    const [busy, setBusy] = useState(false);
    const [unknown, setUnknown] = useState(() => !!user && hasPendingOrder(user.userId));
    useEffect(() => { const update = () => setUnknown(!!user && hasPendingOrder(user.userId)); update(); window.addEventListener('storage', update); return () => window.removeEventListener('storage', update); }, [user?.userId]);
    const navigate = useNavigate();
    const lock = useRef(false);
    const [coupon, setCoupon] = useState('');
    const [appliedCoupon, setAppliedCoupon] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<'vnpay' | 'cod'>('vnpay');

    useEffect(() => {
        if (addresses.data && addresses.data.length > 0 && !addressId && !recipient) {
            const def = addresses.data.find(a => a.isDefault) || addresses.data[0];
            if (def) setAddressId(def.id);
        }
    }, [addresses.data, addressId, recipient]);

    // Prepare selectable product & variant list
    const selectableItems = useMemo(() => {
        interface SelectableItem {
            id: string;
            productName: string;
            variantName: string;
            sku: string;
            price: number | null;
            stockQuantity: number;
            isActive: boolean;
            canOrder: boolean;
            variant: Variant;
            shortLabel: string;
            statusLabel: string;
            imageUrl?: string;
            category: 'box' | 'acc';
        }
        const list: SelectableItem[] = [];
        if (catalog.data) {
            catalog.data.forEach(p => {
                if (p.variants && p.variants.length > 0) {
                    p.variants.forEach(v => {
                        const canOrder = v.isActive && v.stockQuantity > 0;
                        const statusLabel = !v.isActive
                            ? 'Ngừng bán (mờ)'
                            : v.stockQuantity <= 0
                            ? 'Hết hàng (mờ)'
                            : `Còn ${v.stockQuantity}`;
                        const shortLabel = `${p.name} - ${v.variantName || v.size || v.sku}`;
                        list.push({
                            id: v.id,
                            productName: p.name,
                            variantName: v.variantName || v.size || v.sku,
                            sku: v.sku,
                            price: v.finalPrice,
                            stockQuantity: v.stockQuantity,
                            isActive: v.isActive,
                            canOrder,
                            variant: v,
                            shortLabel,
                            statusLabel,
                            imageUrl: v.images?.[0] || p.images?.[0] || '/banners/achor-box-banner-wide-1.webp',
                            category: 'box',
                        });
                    });
                } else {
                    const rawStock = (p as unknown as { stockQuantity?: number }).stockQuantity ?? 0;
                    const canOrder = p.isActive && rawStock > 0;
                    const statusLabel = !p.isActive
                        ? 'Ngừng bán (mờ)'
                        : rawStock <= 0
                        ? 'Hết hàng (mờ)'
                        : `Còn ${rawStock}`;
                    list.push({
                        id: p.id,
                        productName: p.name,
                        variantName: 'Cấu hình chuẩn',
                        sku: p.sku || 'N/A',
                        price: p.price,
                        stockQuantity: rawStock,
                        isActive: p.isActive,
                        canOrder,
                        variant: {
                            id: p.id,
                            productId: p.id,
                            sku: p.sku || 'N/A',
                            variantName: 'Cấu hình chuẩn',
                            size: null,
                            capacityLiter: null,
                            finalPrice: p.price,
                            stockQuantity: rawStock,
                            isActive: p.isActive,
                        },
                        shortLabel: p.name,
                        statusLabel,
                        imageUrl: p.images?.[0] || '/banners/achor-box-banner-wide-1.webp',
                        category: 'box',
                    });
                }
            });
        }

        // Popular accessories
        const accessories: SelectableItem[] = [
            {
                id: 'acc-mount',
                productName: 'Chân đế ngoài trời AnchorMount',
                variantName: 'Thép mạ kẽm chống ẩm 15cm',
                sku: 'SBX-ACC-MOUNT',
                price: 290000,
                stockQuantity: 99,
                isActive: true,
                canOrder: true,
                imageUrl: '/banners/achor-box-banner-wide-3.webp',
                category: 'acc',
                variant: {
                    id: 'acc-mount',
                    productId: 'prod-acc-mount',
                    sku: 'SBX-ACC-MOUNT',
                    variantName: 'Thép mạ kẽm chống ẩm 15cm',
                    size: 'Chuẩn',
                    capacityLiter: null,
                    finalPrice: 290000,
                    stockQuantity: 99,
                    isActive: true,
                },
                shortLabel: 'Chân đế ngoài trời AnchorMount',
                statusLabel: 'Còn 99',
            },
            {
                id: 'acc-keypad',
                productName: 'Bàn phím mã số cảm ứng & Thẻ từ NFC',
                variantName: 'Phụ kiện mở khóa Pro',
                sku: 'SBX-ACC-KEYPAD',
                price: 390000,
                stockQuantity: 99,
                isActive: true,
                canOrder: true,
                imageUrl: '/banners/achor-box-banner-wide-2.webp',
                category: 'acc',
                variant: {
                    id: 'acc-keypad',
                    productId: 'prod-acc-keypad',
                    sku: 'SBX-ACC-KEYPAD',
                    variantName: 'Phụ kiện mở khóa Pro',
                    size: 'Chuẩn',
                    capacityLiter: null,
                    finalPrice: 390000,
                    stockQuantity: 99,
                    isActive: true,
                },
                shortLabel: 'Bàn phím mã số cảm ứng & NFC',
                statusLabel: 'Còn 99',
            },
            {
                id: 'acc-camera',
                productName: 'Camera an ninh mini AI góc rộng 2K',
                variantName: 'Gắn nóc khoang tủ chống nước',
                sku: 'SBX-ACC-CAM',
                price: 550000,
                stockQuantity: 99,
                isActive: true,
                canOrder: true,
                imageUrl: '/banners/achor-box-banner-wide-4.webp',
                category: 'acc',
                variant: {
                    id: 'acc-camera',
                    productId: 'prod-acc-camera',
                    sku: 'SBX-ACC-CAM',
                    variantName: 'Gắn nóc khoang tủ chống nước',
                    size: 'Chuẩn',
                    capacityLiter: null,
                    finalPrice: 550000,
                    stockQuantity: 99,
                    isActive: true,
                },
                shortLabel: 'Camera an ninh mini AI 2K',
                statusLabel: 'Còn 99',
            },
        ];

        accessories.forEach(acc => {
            if (!list.some(x => x.id === acc.id)) {
                list.push(acc);
            }
        });

        return list;
    }, [catalog.data]);

    // Modal state for Product Picker
    const [pickerModalOpen, setPickerModalOpen] = useState(false);
    const [pickerSearch, setPickerSearch] = useState('');
    const [pickerCategory, setPickerCategory] = useState<'all' | 'box' | 'acc'>('all');
    const [justAddedId, setJustAddedId] = useState<string | null>(null);

    const filteredPickerItems = useMemo(() => {
        return selectableItems.filter(item => {
            const matchCat = pickerCategory === 'all' || item.category === pickerCategory;
            const q = pickerSearch.trim().toLowerCase();
            const matchSearch =
                !q ||
                item.productName.toLowerCase().includes(q) ||
                item.variantName.toLowerCase().includes(q) ||
                item.sku.toLowerCase().includes(q);
            return matchCat && matchSearch;
        });
    }, [selectableItems, pickerCategory, pickerSearch]);

    const handleAddFromModal = (item: typeof selectableItems[0], qty = 1) => {
        if (!item.canOrder) return;
        add(item.variant, item.productName, qty);
        setJustAddedId(item.id);
        setTimeout(() => setJustAddedId(null), 1800);
        setAddFeedback({
            type: 'success',
            message: `Đã thêm ${qty} × ${item.shortLabel} vào đơn (tự động gộp dòng nếu trùng).`
        });
        setTimeout(() => setAddFeedback(null), 3500);
    };

    // Handle "Thêm dòng" - trùng sản phẩm thì gộp dòng
    const handleAddLine = () => {
        if (!selectedVariantId) {
            setAddFeedback({ type: 'error', message: 'Vui lòng chọn một sản phẩm từ danh sách trước.' });
            return;
        }
        const item = selectableItems.find(x => x.id === selectedVariantId);
        if (!item) {
            setAddFeedback({ type: 'error', message: 'Sản phẩm không hợp lệ.' });
            return;
        }
        if (!item.canOrder) {
            setAddFeedback({ type: 'error', message: `${item.shortLabel} hiện ${item.statusLabel}. Không thể thêm.` });
            return;
        }
        const qty = Math.max(1, Math.min(99, Math.floor(inputQty) || 1));
        
        // useShop().add() naturally checks if variant exists:
        // if old exists, count = Math.min(99, variant.stockQuantity, old.quantity + quantity);
        // and updates the existing item in place -> TRÙNG SẢN PHẨM THÌ GỘP DÒNG!
        add(item.variant, item.productName, qty);

        setAddFeedback({
            type: 'success',
            message: `Đã thêm ${qty} × ${item.shortLabel} vào đơn (trùng sản phẩm đã được gộp dòng).`,
        });
        setTimeout(() => setAddFeedback(null), 3500);
    };

    const items = lines.map(line => ({ variantId: line.variant.id, quantity: line.quantity }));
    const pricing = useResource(signal => items.length ? commerce.pricing(items, appliedCoupon, signal) : Promise.resolve(null), JSON.stringify([items, appliedCoupon]));
    const quoteReady = !pricing.loading && !pricing.error && canSubmitQuote(pricing.data, appliedCoupon);

    const calculatedSubtotal = useMemo(() => {
        return lines.reduce((sum, line) => {
            const unitPrice = pricing.data?.itemDetails.find(item => item.variantId === line.variant.id)?.unitPrice ?? line.variant.finalPrice ?? 0;
            return sum + unitPrice * line.quantity;
        }, 0);
    }, [lines, pricing.data]);

    async function submit(e: FormEvent) {
        e.preventDefault();
        if (lock.current || unknown || !quoteReady || !user || user.role !== 'customer' || hasPendingOrder(user.userId))
            return;
        lock.current = true;
        setBusy(true);
        setError(undefined);
        let createSent = false;
        try {
            if (!addressId) {
                const recTrim = recipient.trim();
                if (!recTrim) throw new ApiError(400, 'Vui lòng nhập tên người nhận hàng.');
                if (recTrim.length > 200) throw new ApiError(400, 'Tên người nhận tối đa 200 ký tự.');
                const phTrim = phone.trim();
                if (!phTrim) throw new ApiError(400, 'Vui lòng nhập số điện thoại người nhận hàng.');
                if (!/^\+?[0-9 ()-]{8,30}$/.test(phTrim)) throw new ApiError(400, 'Số điện thoại không đúng định dạng (8-30 ký tự số).');
                const addrTrim = address.trim();
                if (!addrTrim) throw new ApiError(400, 'Vui lòng nhập địa chỉ giao hàng chi tiết.');
                if (addrTrim.length > 2000) throw new ApiError(400, 'Địa chỉ giao hàng tối đa 2000 ký tự.');
            }

            // Revalidate every SKU before reserving stock. Never send local prices to the server.
            for (const line of lines) {
                const variants = await shop.variants(line.variant.productId);
                const variant = variants.find(v => v.id === line.variant.id);
                if (!variant?.isActive || variant.stockQuantity < line.quantity)
                    throw new ApiError(409, `${line.productName}: phiên bản không còn đủ hàng. Vui lòng chọn lại cấu hình.`);
                if (variant.finalPrice == null || variant.finalPrice !== pricing.data?.itemDetails.find(item => item.variantId === line.variant.id)?.unitPrice)
                    throw new ApiError(409, `${line.productName}: giá đã thay đổi. Vui lòng cập nhật bảng giá rồi thử lại.`);
            }
            const quote = await commerce.pricing(items, appliedCoupon);
            if (!canSubmitQuote(quote, appliedCoupon)) throw new ApiError(409, 'Giỏ hàng hoặc mã giảm giá không còn hợp lệ. Vui lòng kiểm tra lại.');
            if (quote.finalTotal !== pricing.data?.finalTotal) { pricing.retry(); throw new ApiError(409, 'Giá đã thay đổi. Kiểm tra bảng giá mới rồi gửi lại.'); }
            markPendingOrder(user.userId);
            createSent = true;
            const order = await customer.createOrder(addressId ? { addressId } : { shippingDetails: { label: 'Địa chỉ đơn hàng', recipientName: recipient.trim(), phone: phone.trim(), addressLine: address.trim(), installationNote: note.trim(), isDefault: false } }, items, appliedCoupon || undefined);
            if (!order.id && !order.orderId) throw new ApiError(502, 'Chưa nhận được mã đơn. Hãy kiểm tra lịch sử đơn trước khi thử lại.');
            clearPendingOrder(user.userId);
            clear();
            navigate(`/account/orders/${order.orderId || order.id}`);
        }
        catch (reason) {
            setError(reason as Error);
            if (!createSent) pricing.retry();
            if (createSent) {
                if (reason instanceof ApiError && reason.status >= 400 && reason.status < 500) clearPendingOrder(user.userId);
                else setUnknown(true);
            }
        }
        finally {
            lock.current = false;
            setBusy(false);
        }
    }
    return <section className="container section commerce-workspace">
        <p className="eyebrow">LỰA CHỌN CỦA BẠN</p>
        <h1>Giỏ hàng & Tạo đơn hàng.</h1>
        <p className="muted">Giỏ hàng chưa giữ kho. Giá dưới đây là ước tính; bảng tổng tiền được tính lại bởi máy chủ.</p>

        {/* B1 TẠO ĐƠN: CHỌN SẢN PHẨM & PHỤ KIỆN VÀO ĐƠN HÀNG */}
        <div className="cart-order-creator-card">
            <div className="cart-creator-header-row">
                <div>
                    <div className="cart-creator-title-group">
                        <h2 className="cart-creator-title">Tạo đơn hàng</h2>
                        <span className="cart-creator-step-badge">
                            <Package size={13} /> Bước 1: Chọn sản phẩm
                        </span>
                    </div>
                    <p className="cart-creator-desc">
                        Chọn cấu hình hộp nhận hàng hoặc phụ kiện bên dưới rồi nhấn <strong>"Thêm dòng"</strong> để đưa vào bảng đơn. Trùng sản phẩm sẽ tự động gộp số lượng.
                    </p>
                </div>

                <button
                    type="button"
                    className="btn-open-picker-modal"
                    onClick={() => setPickerModalOpen(true)}
                    title="Mở danh sách đầy đủ sản phẩm và phụ kiện"
                >
                    <Layers size={16} />
                    <span>Chọn theo danh sách...</span>
                    <span className="badge-picker-count">{selectableItems.length}</span>
                </button>
            </div>

            {/* Full-width Inputs row */}
            <div className="cart-input-row">
                <div className="input-field-group field-product">
                    <label htmlFor="cart-product-select" className="input-field-label">
                        Sản phẩm / Phụ kiện
                    </label>
                    <select
                        id="cart-product-select"
                        className="cart-select-product"
                        value={selectedVariantId}
                        onChange={e => {
                            setSelectedVariantId(e.target.value);
                            setAddFeedback(null);
                        }}
                    >
                        <option value="">-- Chọn sản phẩm hoặc phụ kiện AnchorBox --</option>
                        <optgroup label="Tủ Nhận Hàng Thông Minh AnchorBox">
                            {selectableItems.filter(i => i.category === 'box').map(item => (
                                <option
                                    key={item.id}
                                    value={item.id}
                                    disabled={!item.canOrder}
                                >
                                    {item.shortLabel} · {money(item.price)} ({item.statusLabel})
                                </option>
                            ))}
                        </optgroup>
                        <optgroup label="Phụ Kiện Chính Hãng">
                            {selectableItems.filter(i => i.category === 'acc').map(item => (
                                <option
                                    key={item.id}
                                    value={item.id}
                                    disabled={!item.canOrder}
                                >
                                    {item.shortLabel} · {money(item.price)} ({item.statusLabel})
                                </option>
                            ))}
                        </optgroup>
                    </select>
                </div>

                <div className="input-field-group field-qty">
                    <label htmlFor="cart-qty-input" className="input-field-label">
                        Số lượng (1–99)
                    </label>
                    <input
                        id="cart-qty-input"
                        type="number"
                        min={1}
                        max={99}
                        value={inputQty}
                        onChange={e => {
                            const val = parseInt(e.target.value, 10);
                            if (!isNaN(val)) setInputQty(Math.max(1, Math.min(99, val)));
                            else if (e.target.value === '') setInputQty(1);
                        }}
                        className="cart-input-qty"
                    />
                </div>

                <div className="input-field-group field-btn">
                    <button
                        type="button"
                        className="btn-add-row"
                        onClick={handleAddLine}
                    >
                        <Plus size={16} />
                        <span>Thêm dòng</span>
                    </button>
                </div>
            </div>

            {/* Quick Chips Shelf - Gợi ý chọn nhanh */}
            <div className="cart-quick-chips-shelf">
                <span className="quick-chips-label">Gợi ý nhanh:</span>
                <div className="quick-chips-list">
                    {selectableItems.slice(0, 5).map(item => (
                        <button
                            key={item.id}
                            type="button"
                            className={`quick-chip-item ${selectedVariantId === item.id ? 'is-active' : ''}`}
                            onClick={() => {
                                setSelectedVariantId(item.id);
                                setAddFeedback(null);
                            }}
                            title={`Chọn ${item.shortLabel}`}
                        >
                            <span className="chip-name">{item.productName.replace('Tủ Nhận Hàng Thông Minh ', '')}</span>
                            <span className="chip-price">({money(item.price)})</span>
                        </button>
                    ))}
                </div>
            </div>

            {addFeedback && (
                <div className={`cart-creator-feedback ${addFeedback.type}`}>
                    {addFeedback.type === 'success' ? <Check size={15} /> : <Info size={15} />}
                    <span>{addFeedback.message}</span>
                </div>
            )}

            {/* Table B1: Sản phẩm | Đơn giá | SL | Thành tiền | Xoá */}
            <div className="cart-table-wrapper">
                <table className="cart-order-table">
                    <thead>
                        <tr>
                            <th className="col-product">Sản phẩm</th>
                            <th className="col-price">Đơn giá</th>
                            <th className="col-qty">SL</th>
                            <th className="col-total">Thành tiền</th>
                            <th className="col-action">Xoá</th>
                        </tr>
                    </thead>
                    <tbody>
                        {!lines.length ? (
                            <tr>
                                <td colSpan={5} style={{ padding: 0 }}>
                                    <div className="cart-empty-table-state">
                                        <div className="empty-cart-icon-wrap">
                                            <ShoppingBag size={34} color="#0866e8" />
                                        </div>
                                        <h3>Chưa có sản phẩm nào trong đơn hàng</h3>
                                        <p>
                                            Hãy chọn sản phẩm từ thanh công cụ ở trên, hoặc bấm <strong>"Chọn theo danh sách"</strong> để duyệt nhanh cấu hình hộp nhận hàng &amp; phụ kiện.
                                        </p>
                                        <div className="empty-cart-actions">
                                            <button
                                                type="button"
                                                className="btn-empty-action primary"
                                                onClick={() => setPickerModalOpen(true)}
                                            >
                                                <Layers size={16} />
                                                <span>Mở danh sách chọn sản phẩm</span>
                                            </button>
                                            <Link to="/products" className="btn-empty-action secondary">
                                                <span>Xem toàn bộ Catalog</span>
                                                <ArrowRight size={15} />
                                            </Link>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            lines.map(line => {
                                const unitPrice = pricing.data?.itemDetails.find(item => item.variantId === line.variant.id)?.unitPrice ?? line.variant.finalPrice ?? 0;
                                const lineTotal = unitPrice * line.quantity;
                                return (
                                    <tr key={line.variant.id}>
                                        <td className="col-product">
                                            <strong className="table-product-title">{line.productName}</strong>
                                            <span className="table-product-meta">{line.variant.variantName || line.variant.size || line.variant.sku}</span>
                                        </td>
                                        <td className="col-price">{money(unitPrice)}</td>
                                        <td className="col-qty">
                                            <div className="table-stepper">
                                                <button
                                                    type="button"
                                                    className="table-step-btn"
                                                    disabled={busy || line.quantity <= 1}
                                                    onClick={() => quantity(line.variant.id, line.quantity - 1)}
                                                    aria-label="Giảm số lượng"
                                                >
                                                    −
                                                </button>
                                                <input
                                                    type="number"
                                                    min={1}
                                                    max={Math.min(99, line.variant.stockQuantity)}
                                                    value={line.quantity}
                                                    disabled={busy}
                                                    onChange={e => {
                                                        const v = parseInt(e.target.value, 10);
                                                        if (!isNaN(v)) quantity(line.variant.id, v);
                                                    }}
                                                    className="table-step-input"
                                                    aria-label="Số lượng"
                                                />
                                                <button
                                                    type="button"
                                                    className="table-step-btn"
                                                    disabled={busy || line.quantity >= Math.min(99, line.variant.stockQuantity)}
                                                    onClick={() => quantity(line.variant.id, line.quantity + 1)}
                                                    aria-label="Tăng số lượng"
                                                >
                                                    +
                                                </button>
                                            </div>
                                        </td>
                                        <td className="col-total">{money(lineTotal)}</td>
                                        <td className="col-action">
                                            <button
                                                type="button"
                                                className="table-delete-btn"
                                                disabled={busy}
                                                onClick={() => quantity(line.variant.id, 0)}
                                                title="Xoá sản phẩm này khỏi đơn"
                                                aria-label="Xoá dòng này"
                                            >
                                                ×
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>

                <div className="cart-table-subtotal-footer">
                    <span className="subtotal-note">Tạm tính chỉ để xem; số tiền cuối do BE tính</span>
                    <div className="subtotal-amount-box">
                        <span className="subtotal-label">Tạm tính:</span>
                        <strong className="subtotal-amount">
                            {money(pricing.data?.subtotal ?? calculatedSubtotal)}
                        </strong>
                    </div>
                </div>
            </div>
        </div>

        {/* PRODUCT PICKER MODAL */}
        {pickerModalOpen && (
            <div className="cart-modal-backdrop" onClick={() => setPickerModalOpen(false)}>
                <div className="cart-modal-window" onClick={e => e.stopPropagation()}>
                    <div className="cart-modal-header">
                        <div>
                            <h3>
                                <Layers size={20} color="#0866e8" />
                                Danh sách sản phẩm &amp; Phụ kiện AnchorBox
                            </h3>
                            <p>Chọn cấu hình và thêm trực tiếp vào bảng đơn hàng</p>
                        </div>
                        <button
                            type="button"
                            className="cart-modal-close-btn"
                            onClick={() => setPickerModalOpen(false)}
                            aria-label="Đóng"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    <div className="cart-modal-toolbar">
                        <div className="modal-search-box">
                            <Search size={16} />
                            <input
                                type="text"
                                placeholder="Tìm kiếm theo tên, kích thước, SKU..."
                                value={pickerSearch}
                                onChange={e => setPickerSearch(e.target.value)}
                                autoFocus
                            />
                            {pickerSearch && (
                                <button type="button" onClick={() => setPickerSearch('')}>
                                    <X size={14} />
                                </button>
                            )}
                        </div>

                        <div className="modal-category-tabs">
                            <button
                                type="button"
                                className={`modal-cat-tab ${pickerCategory === 'all' ? 'active' : ''}`}
                                onClick={() => setPickerCategory('all')}
                            >
                                Tất cả ({selectableItems.length})
                            </button>
                            <button
                                type="button"
                                className={`modal-cat-tab ${pickerCategory === 'box' ? 'active' : ''}`}
                                onClick={() => setPickerCategory('box')}
                            >
                                Tủ thông minh ({selectableItems.filter(i => i.category === 'box').length})
                            </button>
                            <button
                                type="button"
                                className={`modal-cat-tab ${pickerCategory === 'acc' ? 'active' : ''}`}
                                onClick={() => setPickerCategory('acc')}
                            >
                                Phụ kiện ({selectableItems.filter(i => i.category === 'acc').length})
                            </button>
                        </div>
                    </div>

                    <div className="cart-modal-body">
                        <div className="modal-products-grid">
                            {filteredPickerItems.map(item => {
                                const inCart = lines.find(l => l.variant.id === item.id);
                                return (
                                    <div key={item.id} className={`modal-product-card ${!item.canOrder ? 'is-disabled' : ''}`}>
                                        <div className="modal-prod-img-wrap">
                                            {item.imageUrl ? (
                                                <img src={item.imageUrl} alt={item.shortLabel} />
                                            ) : (
                                                <Package size={28} color="#94a3b8" />
                                            )}
                                        </div>
                                        <div className="modal-prod-details">
                                            <div className="modal-prod-title-row">
                                                <strong className="modal-prod-name">{item.productName}</strong>
                                                <span className={`modal-stock-badge ${item.canOrder ? 'in-stock' : 'out-of-stock'}`}>
                                                    {item.statusLabel}
                                                </span>
                                            </div>
                                            <p className="modal-prod-variant">{item.variantName}</p>
                                            <div className="modal-prod-bottom">
                                                <strong className="modal-prod-price">{money(item.price)}</strong>
                                                <button
                                                    type="button"
                                                    className={`modal-btn-add ${justAddedId === item.id ? 'is-added' : ''}`}
                                                    disabled={!item.canOrder}
                                                    onClick={() => handleAddFromModal(item, 1)}
                                                >
                                                    {justAddedId === item.id ? (
                                                        <>
                                                            <Check size={14} /> Đã thêm
                                                        </>
                                                    ) : inCart ? (
                                                        <>
                                                            + Thêm tiếp ({inCart.quantity})
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Plus size={14} /> Thêm vào đơn
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            {filteredPickerItems.length === 0 && (
                                <div style={{ textAlign: 'center', padding: '30px 10px', color: '#64748b' }}>
                                    Không tìm thấy sản phẩm nào khớp với "{pickerSearch}".
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="cart-modal-footer">
                        <div className="modal-cart-summary">
                            <span>Đang có <strong>{lines.length}</strong> dòng sản phẩm trong đơn</span>
                            {lines.length > 0 && (
                                <span> · Tạm tính: <strong>{money(calculatedSubtotal)}</strong></span>
                            )}
                        </div>
                        <button
                            type="button"
                            className="btn-modal-done"
                            onClick={() => setPickerModalOpen(false)}
                        >
                            Hoàn tất &amp; Xem đơn hàng
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* CHECKOUT / CONFIRMATION FORM */}
        {lines.length > 0 && (
            <form className="apple-commerce-layout" onSubmit={submit}>
                <div className="apple-commerce-main">
                    {/* BƯỚC 2: ĐỊA CHỈ GIAO NHẬN */}
                    <div className="apple-step-card">
                        <div className="apple-step-head">
                            <div className="apple-step-title-group">
                                <h2 className="apple-step-title">Địa chỉ giao hàng &amp; Lắp đặt</h2>
                                <span className="apple-step-badge">
                                    <MapPin size={13} /> Bước 2: Thông tin nhận hàng
                                </span>
                            </div>
                        </div>
                        <p className="apple-step-desc">
                            Thiết bị sẽ được kỹ thuật viên AnchorBox vận chuyển trực tiếp và hỗ trợ lắp đặt tại vị trí bạn chọn.
                        </p>

                        <ResourceState {...addresses} />

                        {user && addresses.data && addresses.data.length > 0 && (
                            <div className="apple-radio-cards-grid">
                                {addresses.data.map(item => {
                                    const isSel = addressId === item.id;
                                    return (
                                        <label
                                            key={item.id}
                                            className={`apple-radio-card ${isSel ? 'is-selected' : ''}`}
                                            onClick={() => setAddressId(item.id)}
                                        >
                                            <input
                                                type="radio"
                                                name="address-choice"
                                                checked={isSel}
                                                onChange={() => setAddressId(item.id)}
                                                className="apple-radio-input"
                                            />
                                            <div className="apple-radio-indicator">
                                                <div className="apple-radio-dot" />
                                            </div>
                                            <div className="apple-radio-content">
                                                <div className="apple-radio-head">
                                                    <strong>{item.label || 'Địa chỉ nhận'}</strong>
                                                    {item.isDefault && <span className="apple-badge-default">Mặc định</span>}
                                                </div>
                                                <div className="apple-radio-recipient">{item.recipientName} · {item.phone}</div>
                                                <div className="apple-radio-line">{item.addressLine}</div>
                                                {item.installationNote && (
                                                    <div className="apple-radio-note">Lưu ý: {item.installationNote}</div>
                                                )}
                                            </div>
                                        </label>
                                    );
                                })}

                                <label
                                    className={`apple-radio-card ${addressId === '' ? 'is-selected' : ''}`}
                                    onClick={() => setAddressId('')}
                                >
                                    <input
                                        type="radio"
                                        name="address-choice"
                                        checked={addressId === ''}
                                        onChange={() => setAddressId('')}
                                        className="apple-radio-input"
                                    />
                                    <div className="apple-radio-indicator">
                                        <div className="apple-radio-dot" />
                                    </div>
                                    <div className="apple-radio-content">
                                        <div className="apple-radio-head">
                                            <strong>+ Giao đến địa chỉ mới</strong>
                                        </div>
                                        <div className="apple-radio-line">Nhập thông tin người nhận và vị trí lắp đặt riêng cho đơn này</div>
                                    </div>
                                </label>
                            </div>
                        )}

                        {(!addressId || !user || !addresses.data?.length) && (
                            <div className="apple-address-inputs-grid">
                                <div className="apple-form-group">
                                    <label className="apple-form-label">Tên người nhận (bắt buộc) *</label>
                                    <input
                                        className="apple-form-control"
                                        required
                                        maxLength={200}
                                        autoComplete="name"
                                        disabled={busy}
                                        placeholder="Nguyễn Văn A"
                                        value={recipient}
                                        onChange={e => setRecipient(e.target.value)}
                                    />
                                </div>

                                <div className="apple-form-group">
                                    <label className="apple-form-label">Số điện thoại liên hệ *</label>
                                    <input
                                        className="apple-form-control"
                                        required
                                        type="tel"
                                        pattern={phonePattern}
                                        maxLength={30}
                                        autoComplete="tel"
                                        disabled={busy}
                                        placeholder="0912 345 678"
                                        value={phone}
                                        onChange={e => setPhone(e.target.value)}
                                    />
                                </div>

                                <div className="apple-form-group apple-input-full">
                                    <label className="apple-form-label">Địa chỉ giao hàng chi tiết (bắt buộc) *</label>
                                    <textarea
                                        className="apple-form-control"
                                        maxLength={2000}
                                        required
                                        disabled={busy}
                                        placeholder="Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành phố..."
                                        value={address}
                                        onChange={e => setAddress(e.target.value)}
                                    />
                                </div>

                                <div className="apple-form-group apple-input-full">
                                    <label className="apple-form-label">Ghi chú lắp đặt &amp; Hẹn giờ thuận tiện</label>
                                    <textarea
                                        className="apple-form-control"
                                        maxLength={2000}
                                        disabled={busy}
                                        placeholder="Ví dụ: Gắn tại cổng bên trái, hẹn giao vào sáng thứ 7 hoặc gọi trước 30 phút..."
                                        value={note}
                                        onChange={e => setNote(e.target.value)}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* BƯỚC 3: PHƯƠNG THỨC THANH TOÁN */}
                    <div className="apple-step-card">
                        <div className="apple-step-head">
                            <div className="apple-step-title-group">
                                <h2 className="apple-step-title">Phương thức thanh toán</h2>
                                <span className="apple-step-badge">
                                    <CreditCard size={13} /> Bước 3: Thanh toán
                                </span>
                            </div>
                        </div>
                        <p className="apple-step-desc">
                            Lựa chọn phương thức thanh toán dự kiến. Đơn hàng sẽ được nhân viên kỹ thuật thẩm định cấu hình trước khi mở cổng thanh toán.
                        </p>

                        <div className="apple-payment-pills-grid">
                            <label
                                className={`apple-payment-pill ${paymentMethod === 'vnpay' ? 'is-selected' : ''}`}
                                onClick={() => setPaymentMethod('vnpay')}
                            >
                                <input
                                    type="radio"
                                    name="payment-method-choice"
                                    checked={paymentMethod === 'vnpay'}
                                    onChange={() => setPaymentMethod('vnpay')}
                                    className="apple-radio-input"
                                />
                                <div className="apple-radio-indicator">
                                    <div className="apple-radio-dot" />
                                </div>
                                <div className="apple-payment-pill-info">
                                    <div className="apple-payment-pill-title">
                                        <strong>VNPAY Cổng thanh toán</strong>
                                        <span className="apple-pill-tag tag-blue">Khuyên dùng</span>
                                    </div>
                                    <p>Quét mã VNPAY-QR, Thẻ ATM nội địa (Napas) hoặc thẻ quốc tế Visa / MasterCard / JCB.</p>
                                </div>
                            </label>

                            <label
                                className={`apple-payment-pill ${paymentMethod === 'cod' ? 'is-selected' : ''}`}
                                onClick={() => setPaymentMethod('cod')}
                            >
                                <input
                                    type="radio"
                                    name="payment-method-choice"
                                    checked={paymentMethod === 'cod'}
                                    onChange={() => setPaymentMethod('cod')}
                                    className="apple-radio-input"
                                />
                                <div className="apple-radio-indicator">
                                    <div className="apple-radio-dot" />
                                </div>
                                <div className="apple-payment-pill-info">
                                    <div className="apple-payment-pill-title">
                                        <strong>Thanh toán khi nghiệm thu (COD)</strong>
                                        <span className="apple-pill-tag tag-gray">Tại nhà</span>
                                    </div>
                                    <p>Thanh toán bằng tiền mặt hoặc chuyển khoản sau khi nhận hàng và kiểm tra hoạt động của tủ.</p>
                                </div>
                            </label>
                        </div>
                    </div>
                </div>

                {/* ASIDE: APPLE FROSTED GLASS ORDER SUMMARY */}
                <aside className="apple-commerce-sidebar">
                    <div className="apple-glass-summary">
                        <h3 className="apple-summary-title">Tóm tắt đơn hàng</h3>

                        {/* Mã giảm giá */}
                        <div className="apple-coupon-pill-group">
                            <input
                                className="apple-coupon-input"
                                placeholder="Nhập mã ưu đãi..."
                                value={coupon}
                                disabled={busy}
                                maxLength={100}
                                onChange={e => setCoupon(e.target.value)}
                            />
                            {appliedCoupon ? (
                                <button
                                    type="button"
                                    className="apple-coupon-btn btn-remove"
                                    disabled={busy}
                                    onClick={() => { setAppliedCoupon(''); setCoupon(''); }}
                                >
                                    Bỏ mã
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    className="apple-coupon-btn"
                                    disabled={busy || pricing.loading || !coupon.trim()}
                                    onClick={() => setAppliedCoupon(coupon.trim())}
                                >
                                    Áp dụng
                                </button>
                            )}
                        </div>

                        <ResourceState {...pricing} />

                        {pricing.data && !pricing.error && (
                            <div className="apple-summary-lines">
                                <div className="apple-summary-line">
                                    <span>Tạm tính ({lines.reduce((s, l) => s + l.quantity, 0)} sản phẩm)</span>
                                    <strong>{money(pricing.data.subtotal)}</strong>
                                </div>

                                {pricing.data.discountAmount > 0 && (
                                    <div className="apple-summary-line">
                                        <span>Ưu đãi voucher {appliedCoupon && `(${appliedCoupon})`}</span>
                                        <strong className="apple-discount-badge">−{money(pricing.data.discountAmount)}</strong>
                                    </div>
                                )}

                                <div className="apple-summary-line">
                                    <span>Giao hàng &amp; Lắp đặt</span>
                                    <span className="apple-free-badge">Miễn phí toàn quốc</span>
                                </div>

                                {pricing.data.voucherMessage && (
                                    <div style={{ fontSize: '0.8rem', color: '#00875a', fontStyle: 'italic', marginTop: 4 }}>
                                        {pricing.data.voucherMessage}
                                    </div>
                                )}

                                {pricing.data.itemDetails.filter(item => !item.inStock).map(item => (
                                    <p className="notice danger" key={item.variantId} style={{ marginTop: 8 }}>
                                        {item.productName}: không đủ hàng.
                                    </p>
                                ))}
                            </div>
                        )}

                        <div className="apple-summary-divider" />

                        <div className="apple-summary-total-row">
                            <span className="apple-total-label">Tổng thanh toán:</span>
                            <strong className="apple-total-amount">
                                {money(pricing.data?.finalTotal ?? calculatedSubtotal)}
                            </strong>
                        </div>

                        <ErrorNotice error={error} focus />

                        {unknown && (
                            <p className="notice" style={{ marginBottom: 14 }}>
                                Chưa xác định được đơn đã tạo hay chưa.{' '}
                                <Link to="/account/orders">Kiểm tra đơn hàng của tôi</Link> trước khi tạo tiếp.{' '}
                                <button type="button" disabled={busy} onClick={() => {
                                    if (user && window.confirm('Bạn đã kiểm tra lịch sử và xác nhận đơn này chưa được tạo?')) {
                                        clearPendingOrder(user.userId);
                                        setUnknown(false);
                                        setError(undefined);
                                        pricing.retry();
                                    }
                                }}>
                                    Cho phép gửi lại
                                </button>
                            </p>
                        )}

                        {user ? (
                            <button
                                type="submit"
                                className="apple-primary-cta-btn"
                                disabled={busy || unknown || !quoteReady || user.role !== 'customer' || (!addressId && (!address.trim() || !recipient.trim() || !phone.trim()))}
                            >
                                <span>{busy ? 'Đang tạo đơn hàng…' : 'Xác nhận tạo đơn hàng'}</span>
                                <ArrowRight size={18} />
                            </button>
                        ) : (
                            <Link className="apple-primary-cta-btn" to="/login?returnTo=/cart">
                                <span>Đăng nhập để tạo đơn</span>
                                <ArrowRight size={18} />
                            </Link>
                        )}

                        <p style={{ textAlign: 'center', fontSize: '0.78rem', color: '#86868b', marginTop: 14, margin: '14px 0 0' }}>
                            Thanh toán mở sau khi kỹ thuật viên xác nhận cấu hình.
                        </p>

                        <div className="apple-trust-perks">
                            <div className="apple-trust-item">
                                <ShieldCheck size={16} />
                                <span>Bảo hành chính hãng 24 tháng tận nhà</span>
                            </div>
                            <div className="apple-trust-item">
                                <Truck size={16} />
                                <span>Kỹ thuật viên giao và lắp đặt miễn phí</span>
                            </div>
                            <div className="apple-trust-item">
                                <RotateCcw size={16} />
                                <span>Đổi mới trong 30 ngày nếu phát sinh lỗi</span>
                            </div>
                        </div>
                    </div>
                </aside>
            </form>
        )}
    </section>;
}
export function Snapshot({order}:{order:OrderView}) {
 const address=order.shippingAddressSnapshot;
 return <div className="panel commerce-snapshot"><div className="commerce-section-title"><h2>Thông tin đơn hàng</h2><Status value={order.status}/></div><div className="commerce-address"><div><span className="order-caption">NGƯỜI NHẬN</span><strong>{address?.recipientName || 'Chưa cập nhật người nhận'}</strong><span>{address?.phone || 'Chưa cập nhật số điện thoại'}</span></div><div><span className="order-caption">ĐỊA CHỈ GIAO HÀNG</span><p>{address?.addressLine || order.shippingAddress || 'Chưa cập nhật địa chỉ'}</p>{address?.installationNote && <p className="muted">Ghi chú: {address.installationNote}</p>}</div></div><p className="muted commerce-order-date">Ngày đặt: {date(order.createdAt)}{order.expiresAt && ['pending','awaiting_payment','customer_decision_pending'].includes(order.status) && <> · Hạn xử lý: {date(order.expiresAt)}</>}</p><div className="table-scroll"><table><caption>Sản phẩm trong đơn</caption><thead><tr><th>Sản phẩm / cấu hình</th><th>SL</th><th>Đơn giá</th><th>Thành tiền</th></tr></thead><tbody>{order.items?.map(item=><tr key={item.id}><td><strong>{item.productName}</strong><small>{item.variantName} · {item.sku}</small></td><td>{item.quantity}</td><td>{money(item.unitPrice)}</td><td><strong>{money(item.subtotal)}</strong></td></tr>)}</tbody></table></div><dl className="commerce-totals"><div><dt>Tạm tính</dt><dd>{money(order.subtotal ?? order.total)}</dd></div>{!!order.discountAmount&&<div><dt>Giảm giá {order.voucherCode || ''}</dt><dd>−{money(order.discountAmount)}</dd></div>}<div className="commerce-total"><dt>Tổng đơn hàng</dt><dd>{money(order.total)}</dd></div></dl></div>;
}
export function Checkout() {
    const { orderId = '' } = useParams(); const { user } = useShop(); const navigate = useNavigate();
    const resource = useResource(signal => customer.order(orderId, signal), `${user?.userId}:${orderId}`);
    const mode = useResource(paymentApi.mode, 'payment-mode');
    const [error, setError] = useState<Error>(); const [busy, setBusy] = useState(false); const [terms, setTerms] = useState(false); const lock = useRef(false);
    const action = resource.data ? checkoutAction(resource.data) : 'blocked';
    const canPay = action !== 'blocked' && !resource.loading && !resource.error && !mode.error && !!mode.data && (mode.data.provider === 'vnpay' || mode.data.demoActionsEnabled);
    async function pay() {
        if (lock.current || !canPay || !terms || !resource.data) return;
        lock.current = true; setBusy(true); setError(undefined);
        try {
            const storageKey = `smartbox_checkout:${user?.userId}:${orderId}`;
            let key = sessionStorage.getItem(storageKey);
            if (!key) { key = crypto.randomUUID(); sessionStorage.setItem(storageKey, key); }
            const value = action === 'resume' ? await paymentApi.session(orderId) : await paymentApi.checkout(orderId, key);
            const destination = paymentDestination(value);
            if (destination.startsWith('/')) navigate(destination); else window.location.assign(destination);
        } catch (reason) { setError(reason as Error); resource.retry(); }
        finally { setBusy(false); lock.current = false; }
    }
    return (
        <section className="container section commerce-workspace">
            <OrderNavigation id={orderId} title="Thanh toán đơn hàng" />
            <ResourceState {...resource} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                <RefreshButton busy={resource.loading || busy} onClick={resource.retry} label="Cập nhật trạng thái" />
            </div>
            {resource.data && (
                <div className="apple-commerce-layout">
                    <div className="apple-commerce-main">
                        <Snapshot order={resource.data} />
                    </div>

                    <aside className="apple-commerce-sidebar">
                        <div className="apple-glass-summary">
                            <h3 className="apple-summary-title">Thanh toán đơn hàng</h3>

                            {resource.data.payment && <PaymentSummary order={resource.data} />}

                            <ResourceState {...mode} />

                            {mode.data && (
                                <div style={{ background: '#f5f5f7', padding: '12px 16px', borderRadius: 14, fontSize: '0.84rem', color: '#515154', marginBottom: 16 }}>
                                    {mode.data.provider === 'mock'
                                        ? 'Thanh toán mô phỏng cho đồ án kiểm thử. Không thu tiền thật.'
                                        : 'Thanh toán qua cổng VNPay Sandbox bảo mật. Môi trường kiểm thử thanh toán trực tuyến.'}
                                </div>
                            )}

                            <ErrorNotice error={error} focus />

                            {resource.data.status === 'pending' && (
                                <p className="notice" style={{ marginBottom: 16 }}>
                                    Đơn đang chờ xét duyệt cấu hình. Cổng thanh toán sẽ mở ngay khi đơn được duyệt.
                                </p>
                            )}

                            <ApprovalDecision order={resource.data} reload={resource.retry} />

                            {action !== 'blocked' && (
                                <>
                                    <label className="apple-terms-pill">
                                        <input
                                            type="checkbox"
                                            checked={terms}
                                            disabled={busy}
                                            onChange={e => setTerms(e.target.checked)}
                                        />
                                        <span>Tôi đã kiểm tra sản phẩm, địa chỉ và đồng ý thanh toán kiểm thử.</span>
                                    </label>

                                    <button
                                        type="button"
                                        className="apple-primary-cta-btn"
                                        disabled={busy || !terms || !canPay}
                                        onClick={pay}
                                    >
                                        <CreditCard size={18} />
                                        <span>
                                            {busy
                                                ? 'Đang mở phiên thanh toán…'
                                                : action === 'resume'
                                                ? 'Tiếp tục phiên thanh toán VNPAY'
                                                : 'Bắt đầu thanh toán với VNPAY →'}
                                        </span>
                                    </button>
                                </>
                            )}

                            {action !== 'blocked' && !canPay && !mode.loading && (
                                <p className="notice" style={{ marginTop: 14 }}>
                                    Máy chủ chưa sẵn sàng cho thanh toán. Hãy thử cập nhật trạng thái.
                                </p>
                            )}

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 20, paddingTop: 16, borderTop: '1px solid #f2f2f7' }}>
                                <Link className="text-link" to={`/payment/result?orderId=${orderId}`}>
                                    Kiểm tra trạng thái thanh toán →
                                </Link>
                                <Link className="text-link" to={`/account/orders/${orderId}`}>
                                    Quay lại chi tiết đơn hàng →
                                </Link>
                            </div>
                        </div>
                    </aside>
                </div>
            )}
        </section>
    );
}
export function PaymentResult() {
    const [params] = useSearchParams();
    const { id } = useParams();
    const orderId = params.get('orderId') || id || '';
    const { user } = useShop();
    const [version, setVersion] = useState(0);
    const [order, setOrder] = useState<CustomerOrder>();
    const [error, setError] = useState<Error>();
    const [ended, setEnded] = useState(false);
    useEffect(() => {
        if (!orderId)
            return;
        const controller = new AbortController();
        let timer: ReturnType<typeof setTimeout>;
        const start = Date.now();
        setOrder(undefined);
        setError(undefined);
        setEnded(false);
        const poll = async () => { if (controller.signal.aborted)
            return; if (Date.now() - start > 120000) {
            setEnded(true);
            return;
        } if (document.hidden) {
            timer = setTimeout(poll, 5000);
            return;
        } try {
            const value = await customer.order(orderId, controller.signal);
            if (controller.signal.aborted)
                return;
            setOrder(value);
            setError(undefined);
            if (['paid', 'confirmed', 'completed', 'cancelled'].includes(value.status) || ['failed', 'expired', 'refund_required', 'refunded'].includes(value.payment?.status || '')) {
                setEnded(true);
                return;
            }
        }
        catch (reason) {
            if (controller.signal.aborted)
                return;
            setError(reason as Error);
            if (reason instanceof ApiError && [401, 403, 404].includes(reason.status)) {
                setOrder(undefined);
                setEnded(true);
                return;
            }
        } timer = setTimeout(poll, Date.now() - start < 20000 ? 2000 : 5000); };
        void poll();
        return () => { controller.abort(); clearTimeout(timer); };
    }, [orderId, user?.userId, version]);
    return <section className="container section commerce-workspace"><OrderNavigation id={orderId} title="Kết quả thanh toán"/>{!orderId ? <p className="notice">Chưa có mã đơn hàng. <Link to="/account/orders">Chọn đơn hàng của bạn</Link>.</p> : <><ErrorNotice error={error} focus />{order && <div className="commerce-two-column"><Snapshot order={order}/><PaymentSummary order={order}/></div>}<p role="status">{order?.payment?.status === 'success' && ['paid', 'confirmed', 'completed'].includes(order.status) ? 'Máy chủ xác nhận đơn đã được thanh toán.' : order?.status === 'cancelled' ? 'Đơn đã hủy. Thông tin thanh toán và hoàn tiền được hiển thị theo dữ liệu máy chủ.' : ended ? 'Chưa xác định được kết quả thanh toán. Bạn có thể kiểm tra lại.' : 'Đang kiểm tra trạng thái đơn hàng…'} </p><button onClick={() => setVersion(v => v + 1)}>Kiểm tra lại</button><Link className="text-link" to={`/account/orders/${orderId}`}>Xem đơn hàng →</Link></>}</section>;
}
export function Orders() {
    const { user } = useShop();
    const [page, setPage] = useState(0);
    const [rows, setRows] = useState<OrderView[]>([]);
    const resource = useResource(signal => customer.orders(page, signal), `${user?.userId}:${page}`);
    useEffect(() => { if (resource.data)
        setRows(old => page === 0 ? resource.data!.content : [...old, ...resource.data!.content.filter(row => !old.some(x => x.id === row.id))]); }, [resource.data, page]);
    useEffect(() => { if (resource.error instanceof ApiError && [401, 403].includes(resource.error.status)) setRows([]); }, [resource.error]);
    return <section className="container section orders-page commerce-workspace"><AccountNav/>
      <div className="orders-heading"><div><p className="eyebrow">TÀI KHOẢN CỦA BẠN</p><h1>Đơn hàng của tôi</h1><p className="muted">Theo dõi tiến trình, kiểm tra thanh toán và xem chứng từ.</p></div><button disabled={resource.loading} onClick={() => { if (page !== 0) setPage(0); else resource.retry(); }}>Cập nhật danh sách</button></div>
      <ResourceState {...resource}/>
      <div className="orders-list">{rows.map(order => <article className="customer-order-card" key={order.id}><header><div><span className="order-caption">MÃ ĐƠN HÀNG</span><Link to={'/account/orders/' + order.id} className="order-code">{order.id}</Link><small>Đặt ngày {date(order.createdAt)}</small></div><Status value={order.status}/></header><div className="order-card-content"><div><strong>{order.items?.[0]?.productName || 'Sản phẩm trong đơn hàng'}</strong><p>{order.items?.length ? order.items.reduce((total, item) => total + item.quantity, 0) + ' sản phẩm · ' + order.items.length + ' dòng hàng' : 'Xem chi tiết để kiểm tra cấu hình và số lượng.'}</p></div><div className="order-card-total"><small>Tổng đơn hàng</small><strong>{money(order.total)}</strong></div></div><footer><Link className="text-link" to={'/account/orders/' + order.id + '/invoice'}>Xem / In chứng từ</Link><div>{order.status === 'awaiting_payment' && <Link className="button secondary" to={'/checkout/' + order.id}>Thanh toán</Link>}<Link className="button" to={'/account/orders/' + order.id}>Xem chi tiết →</Link></div></footer></article>)}</div>
      {resource.data?.totalElements === 0 && page === 0 && <div className="panel"><h2>Bạn chưa có đơn hàng</h2><p>Đơn hàng sẽ xuất hiện tại đây sau khi bạn gửi yêu cầu mua hàng.</p><Link className="button" to="/products">Khám phá sản phẩm</Link></div>}
      {resource.data && page + 1 < resource.data.totalPages && <button disabled={resource.loading} onClick={() => setPage(p => p + 1)}>Tải thêm đơn hàng</button>}
    </section>;
}
function PaymentSummary({order}:{order:CustomerOrder}) {
 const payment=order.payment;
 return <section className="panel commerce-payment-summary"><h2>Thanh toán</h2>{payment ? <><div className="commerce-section-title"><span>{payment.isSimulated?'Thanh toán mô phỏng':payment.provider==='vnpay'?'VNPAY Sandbox':payment.provider}</span><Status value={payment.status} context="payment"/></div><strong className="commerce-amount">{money(payment.amount)}</strong><p className="muted">{payment.paidAt ? 'Ghi nhận: '+date(payment.paidAt) : 'Chưa có thời điểm ghi nhận thanh toán'}</p>{payment.refund&&<div className="commerce-refund"><h3>Thông tin hoàn tiền</h3><Status value={payment.refund.status} context="payment"/><p>{money(payment.refund.amount)}</p>{payment.refund.completedAt&&<small>{date(payment.refund.completedAt)}</small>}</div>}</>:<p className="muted">Chưa có phiên thanh toán cho đơn hàng này.</p>}{order.paidAt&&<Link className="text-link" to={`/account/orders/${order.id}/invoice`}>Xem chứng từ →</Link>}</section>;
}
export function OrderDetail() {
    const { id = '' } = useParams();
    const { user } = useShop();
    const resource = useResource(async signal => { const detail = await customer.order(id, signal); const core = await shop.order(id, signal); return { ...detail, ticket: core.ticket }; }, `${user?.userId}:${id}`);
    const history = useResource(signal => customer.timeline(id, signal), `${user?.userId}:${id}`);
    const order = resource.data;
    const reload = () => { resource.retry(); history.retry(); };
    return <section className="container section order-workspace commerce-workspace"><OrderNavigation id={id} title="Chi tiết đơn hàng"/><ResourceState {...resource}/>{order && <>
      <OrderProgress order={order}/>
      <div className="order-detail-grid"><div className="order-main-column"><section className="order-block"><div className="order-block-heading"><h2>Sản phẩm & thông tin nhận hàng</h2><button disabled={resource.loading} onClick={reload}>Cập nhật</button></div><Snapshot order={order}/></section>
      <ApprovalDecision order={order} reload={reload}/>
      {order.status === 'pending' && <details className="order-edit-section"><summary>Chỉnh sửa hoặc hủy đơn chưa thanh toán</summary><p className="muted">Khả năng chỉnh sửa phụ thuộc trạng thái xét duyệt hiện tại.</p><DraftEditor order={order} reload={reload}/></details>}
      {order.status !== 'pending' && <DraftEditor order={order} reload={reload}/>}
      <section className="order-block"><ResourceState {...history}/>{history.data && <EventTimeline events={history.data.events} title="Các mốc của đơn hàng"/>}</section></div>
      <aside className="order-side-column"><PaymentSummary order={order}/><section className="order-block"><h2>Xét duyệt sản phẩm</h2>{order.ticket?.length ? order.ticket.map(ticket => <div key={ticket.id}><Status value={ticket.status}/><p className="muted">Kết quả được cập nhật bởi bên bán.</p></div>) : <p className="muted">Chưa có phiếu xét duyệt.</p>}<Link className="text-link" to={'/account/orders/' + id + '/ticket'}>Chi tiết xét duyệt →</Link></section>
      <section className="order-block"><h2>Giao hàng & lắp đặt</h2><p>{order.deliveryInstallation ? jobLabels[order.deliveryInstallation.status] || order.deliveryInstallation.status : 'Chưa có lịch giao và lắp đặt.'}</p><Link className="text-link" to={'/account/orders/' + id + '/installation'}>Theo dõi tiến trình →</Link></section>
      <section className="order-help-box"><h3>Cần hỗ trợ đơn hàng?</h3><p>Cung cấp mã đơn khi liên hệ để được kiểm tra thông tin.</p><Link to="/contact">Trung tâm hỗ trợ →</Link></section></aside></div>
    </>}</section>;
}
export function OrderTicket() {
    const { id = '' } = useParams();
    const { user } = useShop();
    const resource = useResource(async (signal) => { const order = await shop.order(id, signal); const ticket = order.ticket?.[0]; return { order, ticket: ticket ? await shop.ticket(ticket.id, signal) : null }; }, `${user?.userId}:${id}`);
    const [reason, setReason] = useState('');
    const [error, setError] = useState<Error>();
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState('');
    async function submit(e: FormEvent) { e.preventDefault(); if (busy || !resource.data?.ticket)
        return; setBusy(true); setError(undefined); try {
        await shop.resubmit(resource.data.ticket.id, reason.trim());
        setReason('');
        setMessage('Đã gửi giải trình để xét duyệt lại.');
        resource.retry();
    }
    catch (value) {
        setError(value as Error);
        if (value instanceof ApiError && value.status === 409)
            resource.retry();
    }
    finally {
        setBusy(false);
    } }
    return <section className="container section commerce-workspace"><OrderNavigation id={id} title="Xét duyệt sản phẩm"/><ResourceState {...resource}/>{resource.data && <><Status value={resource.data.order.status}/>{resource.data.ticket ? <div className="panel"><Status value={resource.data.ticket.status}/><p>Vòng xét duyệt: {resource.data.ticket.review_round ?? 'Chưa có dữ liệu'}</p>{resource.data.ticket.reason && <p className="notice">{resource.data.ticket.reason}</p>}<p role="status">{message}</p><ErrorNotice error={error} focus />{resource.data.ticket.status === 'RETURNED' && <form onSubmit={submit}><label>Giải trình (bắt buộc, tối đa 2.000 ký tự)<textarea value={reason} onChange={e => setReason(e.target.value)} maxLength={2000} required/></label><p>{reason.length}/2000</p><button className="button" disabled={busy || !reason.trim()}>{busy ? 'Đang gửi…' : 'Gửi giải trình'}</button><p className="muted">Giải trình của bạn sẽ được gửi đến bên bán để xét duyệt lại.</p></form>}<EventTimeline events={resource.data.ticket.history || []} title="Lịch sử xét duyệt"/></div> : <EmptyState title="Chưa có phiếu xét duyệt">Kết quả sẽ xuất hiện khi bên bán tiếp nhận đơn hàng.</EmptyState>}</>}</section>;
}
export function CheckoutRedirect() { const { user } = useShop(); return <section className="container section commerce-workspace"><h1>Chọn đơn đã được duyệt để thanh toán.</h1><Link className="button" to={user ? '/account/orders' : '/login?returnTo=/account/orders'}>Xem đơn hàng →</Link><Link className="text-link" to="/cart">Tạo đơn từ giỏ hàng →</Link></section>; }
