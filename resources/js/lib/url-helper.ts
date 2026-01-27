/**
 * URL Builder Helper for Frontend
 * 
 * Builds URLs based on system url_type setting (slug or silo).
 * External links (http://, https://) are returned as-is.
 * Internal links get .html suffix appended based on url_type setting.
 */

export type UrlEntityType = 'product' | 'category' | 'post' | 'page' | 'brand' | 'menu';
export type UrlMode = 'slug' | 'silo';

const SILO_PREFIXES: Record<UrlEntityType, string> = {
    product: '/san-pham',
    category: '/danh-muc',
    post: '/bai-viet',
    page: '',
    brand: '/thuong-hieu',
    menu: ''
};

export function isExternalUrl(url: string | null | undefined): boolean {
    if (!url) return false;
    return url.startsWith('http://') || url.startsWith('https://');
}

export function buildUrl(
    canonical: string | null | undefined,
    type: UrlEntityType,
    urlType: UrlMode | string = 'slug'
): string {
    if (!canonical) return '#';
    if (isExternalUrl(canonical)) return canonical;

    if (urlType === 'silo') {
        const prefix = SILO_PREFIXES[type] || '';
        return `${prefix}/${canonical}.html`;
    }

    return `/${canonical}.html`;
}

export function buildMenuUrl(
    url: string | null | undefined,
    urlType: UrlMode | string = 'slug'
): string {
    if (!url) return '#';
    if (isExternalUrl(url)) return url;
    if (url === '/' || url === '#' || url === '.') return '/';

    const cleanUrl = url.startsWith('/') ? url.slice(1) : url;
    if (!cleanUrl || cleanUrl === '.' || cleanUrl === '') return '/';
    if (cleanUrl.endsWith('.html')) return url.startsWith('/') ? url : `/${url}`;

    return `/${cleanUrl}.html`;
}

export function buildCategoryUrl(canonical: string | null | undefined, urlType: UrlMode | string = 'slug'): string {
    return buildUrl(canonical, 'category', urlType);
}

export function buildProductUrl(canonical: string | null | undefined, urlType: UrlMode | string = 'slug'): string {
    return buildUrl(canonical, 'product', urlType);
}

export function buildPostUrl(canonical: string | null | undefined, urlType: UrlMode | string = 'slug'): string {
    return buildUrl(canonical, 'post', urlType);
}
