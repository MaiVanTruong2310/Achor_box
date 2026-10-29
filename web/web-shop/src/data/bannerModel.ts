/** Public-only banner data. Never copy staff credentials into this feed. */
export interface HomeBanner {
  id: string;
  title: string;
  imageUrl: string;
  targetUrl: string;
  position: 'hero_home';
  displayOrder: number;
  isActive: boolean;
  startDate?: string;
  endDate?: string;
  eyebrow?: string;
  description?: string;
  ctaLabel?: string;
  imageAlt?: string;
  theme?: 'sand' | 'ocean' | 'mint';
  layout?: 'product' | 'image';
}

export function safeBannerTarget(value: unknown): string | null {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || /[\\\u0000-\u001f]/.test(value)) return null;
  try {
    const url = new URL(value, 'https://anchorbox.invalid');
    if (url.origin !== 'https://anchorbox.invalid') return null;
    return /^\/(?:products(?:\/[^/]+)?|compare|contact|how-it-works|technology|app)?\/?$/.test(url.pathname)
      ? url.pathname + url.search + url.hash : null;
  } catch { return null; }
}

export function safeBannerImage(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim() || /[\\\u0000-\u001f]/.test(value)) return null;
  if (value.startsWith('/') && !value.startsWith('//')) return value;
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? url.href : null; }
  catch { return null; }
}

export function normalizeBanners(value: unknown, now = Date.now()): HomeBanner[] {
  const input = Array.isArray(value) ? value : (value && typeof value === 'object' && 'banners' in value ? (value as { banners: unknown }).banners : null);
  if (!Array.isArray(input)) throw new Error('Dữ liệu banner không đúng định dạng.');
  const ids = new Set<string>();
  return input.flatMap((raw): HomeBanner[] => {
    if (!raw || typeof raw !== 'object') return [];
    const r = raw as Record<string, unknown>;
    const id = typeof r.id === 'string' ? r.id : '';
    const imageUrl = safeBannerImage(r.imageUrl);
    const targetUrl = safeBannerTarget(r.targetUrl);
    if (!id || ids.has(id) || r.position !== 'hero_home' || r.isActive !== true || typeof r.title !== 'string' || !r.title.trim() || !imageUrl || !targetUrl) return [];
    const start = r.startDate ? Date.parse(String(r.startDate)) : -Infinity;
    const end = r.endDate ? Date.parse(String(r.endDate)) : Infinity;
    if (Number.isNaN(start) || Number.isNaN(end) || start > end || now < start || now >= end) return [];
    ids.add(id);
    const text = (key: string, max: number) => typeof r[key] === 'string' ? (r[key] as string).trim().slice(0, max) : undefined;
    return [{ id, title: r.title.trim().slice(0, 150), imageUrl, targetUrl, position: 'hero_home', isActive: true,
      displayOrder: typeof r.displayOrder === 'number' && Number.isFinite(r.displayOrder) ? r.displayOrder : 0,
      startDate: text('startDate', 50), endDate: text('endDate', 50), eyebrow: text('eyebrow', 60), description: text('description', 240),
      ctaLabel: text('ctaLabel', 50), imageAlt: text('imageAlt', 150), theme: r.theme === 'ocean' || r.theme === 'mint' ? r.theme : 'sand',
      layout: r.layout === 'product' ? 'product' : 'image' }];
  }).sort((a, b) => a.displayOrder - b.displayOrder || a.id.localeCompare(b.id));
}

export function nextBannerIndex(current: number, direction: number, length: number): number {
  return length > 0 ? ((current + direction) % length + length) % length : 0;
}
