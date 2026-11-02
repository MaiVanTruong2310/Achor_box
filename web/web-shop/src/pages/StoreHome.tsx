import { useRef } from 'react';
import { useCatalog } from '../CatalogContext';
import { Hero3D } from './landing/Hero3D';
import { ProductBar } from './landing/ProductBar';
import { Backdrop } from './landing/Backdrop';
import { DeliveryStory } from './landing/DeliveryStory';
import { Highlights } from './landing/Highlights';
import { Manifesto } from './landing/Manifesto';
import { BoxExplorer } from './landing/BoxExplorer';
import { useReveal } from './landing/useScrollProgress';
import { HardwareTiles } from './landing/HardwareTiles';
import { AppShowcase } from './landing/AppShowcase';
import { Lineup, findProduct } from './landing/Lineup';
import { FinalCta, InstallSteps, LandingFaq } from './landing/ClosingSections';
import { LINEUP } from './landing/landingData';
import './landing/landing.css';

/** Landing page: fixed long scrolling (pinned nav + product bar, scroll-driven scenes), Apple Home theme. */
export function StoreHome() {
  const catalog = useCatalog();
  const products = catalog.data?.filter((product) => product.isActive) ?? [];
  const baseProduct = findProduct(products, LINEUP[0]);
  const rootRef = useRef<HTMLDivElement>(null);
  useReveal(rootRef);

  return (
    <div className="ab-landing" ref={rootRef}>
      <Backdrop />
      <ProductBar product={baseProduct} />
      <Hero3D product={baseProduct} />
      <Highlights />
      <DeliveryStory />
      <Manifesto />
      <BoxExplorer />
      <HardwareTiles />
      <AppShowcase />
      <Lineup products={products} />
      <InstallSteps />
      <LandingFaq />
      <FinalCta />
    </div>
  );
}
