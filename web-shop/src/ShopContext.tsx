import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { clearSession, session, shop, type Identity, type Variant } from './api/shop';
export interface CartLine {
    variant: Variant;
    productName: string;
    quantity: number;
}
const Context = createContext<{
    user: Identity | null;
    lines: CartLine[];
    add: (variant: Variant, productName: string, quantity: number) => void;
    quantity: (id: string, value: number) => void;
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
    return <Context.Provider value={{ user, lines, add: (variant, productName, quantity) => { if (!variant.isActive || variant.stockQuantity < 1 || !Number.isInteger(quantity) || quantity < 1) return; setToast(`Đã thêm ${productName} vào giỏ hàng.`); setLines(current => { const old = current.find(x => x.variant.id === variant.id); const count = Math.min(99, variant.stockQuantity, (old?.quantity || 0) + quantity); if (!variant.isActive || count < 1)
            return current; return [...current.filter(x => x.variant.id !== variant.id), { variant, productName, quantity: count }]; }); }, quantity: (id, value) => setLines(current => current.flatMap(x => x.variant.id !== id ? [x] : value === 0 ? [] : [{ ...x, quantity: Math.max(1, Math.min(99, x.variant.stockQuantity, Math.floor(value) || 1)) }])), clear: () => setLines([]), logout: async () => { try {
            await shop.logout();
        }
        finally {
            clearSession();
            setLines([]);
        } } }}>{children}{toast && <div className="shop-toast" role="status">{toast}<button aria-label="Đóng thông báo" onClick={() => setToast('')}>×</button></div>}</Context.Provider>;
}
export const useShop = () => useContext(Context);
