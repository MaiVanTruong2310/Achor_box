import { createContext, useContext, type ReactNode } from 'react';
import { shop, type CatalogProduct } from './api/shop';
import { useResource } from './components/ShopUi';

type CatalogState = { data?: CatalogProduct[]; loading: boolean; error?: Error; retry: () => void };
const CatalogContext = createContext<CatalogState>(null!);
export function CatalogProvider({ children }: { children: ReactNode }) {
  const resource = useResource(async signal => {
    const products = await shop.products(signal);
    // Keep the active admin catalog visible; buying still requires an active SKU.
    return products.filter(p => p.name?.trim());
  }, 'storefront-catalog');
  return <CatalogContext.Provider value={resource}>{children}</CatalogContext.Provider>;
}
export const useCatalog = () => useContext(CatalogContext);
