/** Anonymous, public feed adapter; intentionally independent of auth/shop APIs. */
export function publicBannerFeed(): string {
  const configured = import.meta.env.VITE_PUBLIC_BANNERS_URL?.trim();
  if (!configured) return `${import.meta.env.BASE_URL}banners/home.json`;
  const url = new URL(configured, window.location.origin);
  if (url.origin !== window.location.origin && url.protocol !== 'https:') throw new Error('Nguồn banner phải dùng HTTPS hoặc cùng website.');
  if (url.username || url.password || /\/api\/content(?:\/|$)/.test(url.pathname)) throw new Error('Không dùng API quản trị làm nguồn banner công khai.');
  return url.href;
}

export async function loadPublicBanners(signal: AbortSignal): Promise<unknown> {
  const response = await fetch(publicBannerFeed(), { signal, credentials: 'omit', headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`Không tải được banner (${response.status}).`);
  return response.json();
}
