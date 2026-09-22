export type BoxModel = 'base' | 'pro';
export type BoxSize = 'S' | 'M' | 'L';

export interface SizeDetails {
  size: BoxSize;
  label: string;
  capacity: string;
  dimensions: string;
  maxWeight: string;
  fitFor: string;
  basePrice: number;
  proPrice: number;
}

export interface ExplodedLayer {
  id: string;
  name: string;
  title: string;
  subtitle: string;
  description: string;
  specs: string[];
  color: string;
}

export interface AppScreen {
  id: 'dashboard' | 'devices' | 'notifications' | 'history';
  label: string;
}

export interface ComparisonRow {
  feature: string;
  base: string | boolean;
  pro: string | boolean;
  highlight?: boolean;
}
