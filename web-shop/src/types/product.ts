// Product Types
export interface ProductSpec {
  name: string;
  value: string;
  category?: string;
}

export interface ProductFeature {
  title: string;
  description: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  subtitle: string;
  description: string;
  price: number;
  originalPrice?: number;
  inStock: boolean;
  stockQuantity: number;
  images: string[];
  category: 'box' | 'accessory';
  tags: string[];
  dimensions: {
    width: number; // cm
    height: number; // cm
    depth: number; // cm
    weight: number; // kg
    maxLoadWeight: number; // kg
  };
  features: ProductFeature[];
  specs: ProductSpec[];
  boxIncludes: string[];
  warrantyMonths: number;
}
