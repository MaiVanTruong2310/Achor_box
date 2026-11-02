import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { clearSession, session, shop, type Identity, type Variant, type WarrantyPlan } from './api/shop';
export interface CartLine {
    variant: Variant;
    productName: string;
    quantity: number;
    warrantyPlan?: WarrantyPlan | null;
}
export const linePrice = (line: CartLine) => (line.variant.finalPrice ?? 0) + (line.warrantyPlan?.price ?? 0);
const Context = createContext<{
    user: Identity | null;
    lines: CartLine[];
    add: (variant: Variant, productName: string, quantity: number, warrantyPlan?: WarrantyPlan | null) => void;
    quantity: (id: string, value: number) => void;
    sync: (variants: Variant[]) => void;
    clear: () => void;
    logout: () => Promise<void>;
}>(null!);
export function ShopProvider({ children }: {
    children: ReactNode;
}) {
    const [user, setUser] = useState(session);
    const [toast, setToast] = useState('');
    useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(''), 4500); return () => clearTimeout(timer); }, [toast]);
    const previousUser = useRef(user);
    const [lines, setLines] = useState<CartLine[]>(() => { try {
        const value = JSON.parse(localStorage.getItem('smartbox_cart_v2') || '[]');
        return Array.isArray(value) ? value.filter(x => typeof x.variant?.id === 'string' && typeof x.variant?.productId === 'string' && Number.isFinite(x.variant?.stockQuantity) && Number.isInteger(x.quantity) && x.quantity > 0 && x.quantity <= 99) : [];
    }
    catch {
        return [];
    } });
    useEffect(() => { const listener = () => { const next = session(); if (previousUser.current && previousUser.current.userId !== next?.userId)
        setLines([]); previousUser.current = next; setUser(next); }; window.addEventListener('smartbox-session', listener); return () => window.removeEventListener('smartbox-session', listener); }, []);
    useEffect(() => { try { localStorage.setItem('smartbox_cart_v2', JSON.stringify(lines)); } catch { /* The in-memory cart still works when storage is unavailable. */ } }, [lines]);
    return <Context.Provider value={{ user, lines, add: (variant, productName, quantity, warrantyPlan = null) => { if (!variant.isActive || variant.stockQuantity < 1 || !Number.isInteger(quantity) || quantity < 1) return; setToast(`Đã thêm ${productName} vào giỏ hàng.`); setLines(current => { const old = current.find(x => x.variant.id === variant.id); const count = Math.min(99, variant.stockQuantity, (old?.quantity || 0) + quantity); if (!variant.isActive || count < 1)
            return current; return [...current.filter(x => x.variant.id !== variant.id), { variant, productName, quantity: count, warrantyPlan }]; }); }, quantity: (id, value) => setLines(current => current.flatMap(x => x.variant.id !== id ? [x] : value === 0 ? [] : [{ ...x, quantity: Math.max(1, Math.min(99, Math.max(1, x.variant.stockQuantity), Math.floor(value) || 1)) }])), sync: (variants) => setLines(current => { const byId = new Map(variants.map(v => [v.id, v])); let changed = false; const next = current.map(x => { const fresh = byId.get(x.variant.id); if (!fresh || (fresh.stockQuantity === x.variant.stockQuantity && fresh.finalPrice === x.variant.finalPrice && fresh.isActive === x.variant.isActive && fresh.variantName === x.variant.variantName)) return x; changed = true; return { ...x, variant: { ...x.variant, ...fresh } }; }); return changed ? next : current; }), clear: () => setLines([]), logout: async () => { try {
            await shop.logout();
        }
        finally {
            clearSession();
            setLines([]);
        } } }}>{children}{toast && <div className="shop-toast" role="status">{toast}<button aria-label="Đóng thông báo" onClick={() => setToast('')}>×</button></div>}</Context.Provider>;
}
export const useShop = () => useContext(Context);
