import React, { useEffect, useState } from 'react';
import { HeroSection } from '../components/home/HeroSection';
import { BrandTicker } from '../components/home/BrandTicker';
import { ProblemSolutionSection } from '../components/home/ProblemSolutionSection';
import { HowItWorksStepper } from '../components/home/HowItWorksStepper';
import { HardwareSpecsTable } from '../components/home/HardwareSpecsTable';
import { CoreFeaturesSection } from '../components/home/CoreFeaturesSection';
import { FaqSection } from '../components/home/FaqSection';
import { ProductCard } from '../components/product/ProductCard';
import { productApi } from '../api/productApi';
import { Product } from '../types/product';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

import { ScrollReveal } from '../components/ui/ScrollReveal';

export const HomePage: React.FC = () => {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        const data = await productApi.getFeaturedProducts();
        setFeaturedProducts(data);
      } catch (err) {
        console.error('Failed to load featured products', err);
      } finally {
        setLoading(false);
      }
    };
    fetchFeatured();
  }, []);

  return (
    <div>
      {/* 1. HERO & KEY VALUE PROPOSITIONS */}
      <HeroSection />

      {/* 1.5. RUNNING BRAND TICKER (DÒNG CHẠY NGANG) */}
      <ScrollReveal direction="up" delay={50} distance={20}>
        <BrandTicker />
      </ScrollReveal>

      {/* 2. REAL-WORLD PROBLEM & ANCHOR BOX SOLUTION */}
      <ProblemSolutionSection />

      {/* 3. HOW IT WORKS 6-STEP PROCESS */}
      <HowItWorksStepper />

      {/* 4. PRODUCTS CATALOG */}
      <section className="section" style={{ backgroundColor: 'var(--bg-surface)', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)' }}>
        <div className="container">
          <ScrollReveal direction="up">
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <h2 className="section-title">Các dòng sản phẩm Anchor Box</h2>
                <p className="section-subtitle">Lựa chọn giải pháp phù hợp với nhu cầu nhận hàng của gia đình bạn.</p>
              </div>
              <Link to="/products" className="btn btn-secondary btn-sm">
                Xem tất cả sản phẩm <ArrowRight size={14} />
              </Link>
            </div>
          </ScrollReveal>

          {loading ? (
            <LoadingSpinner message="Đang tải danh sách sản phẩm..." />
          ) : (
            <div className="product-grid">
              {featuredProducts.map((p, idx) => (
                <ScrollReveal key={p.id} direction="up" delay={idx * 100} distance={30}>
                  <ProductCard product={p} />
                </ScrollReveal>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 5. CORE FUNCTIONAL FEATURES */}
      <CoreFeaturesSection />

      {/* 6. TECHNICAL HARDWARE SPECS & SPEC TABLE */}
      <HardwareSpecsTable />

      {/* 7. FREQUENTLY ASKED QUESTIONS */}
      <FaqSection />
    </div>
  );
};
