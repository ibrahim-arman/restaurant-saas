export const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
export const assetUrl = path => path?.startsWith('/') ? `${process.env.NEXT_PUBLIC_STOREFRONT_URL || 'http://localhost:3000'}${path}` : path;

export async function api(path, opts = {}) {
  const token = typeof window === 'undefined' ? null : localStorage.getItem('token');
  const firstSegment = typeof window === 'undefined' ? '' : window.location.pathname.split('/').filter(Boolean)[0] || '';
  const storeSlug = firstSegment && firstSegment !== 'login' ? firstSegment : '';
  const response = await fetch(API + path, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...(storeSlug && { 'X-Store-Slug': storeSlug }),
      ...opts.headers,
    },
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
  return data;
}
