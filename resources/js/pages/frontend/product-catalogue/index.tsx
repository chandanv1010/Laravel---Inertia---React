import React, { useState, useEffect, useCallback } from 'react';
import { Link, router } from '@inertiajs/react';
import FrontendLayout from '@/layouts/frontend-layout';
import ProductCard, { ProductCardData } from '@/components/frontend/product/product-card';
import { CurrencyInput } from '@/components/currency-input';
import { ChevronLeft, ChevronRight, SlidersHorizontal, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

import { FilterSidebar, CategoryItem, Filter } from '@/components/frontend/product/filter-sidebar';

interface Pagination {
    data: ProductCardData[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
}

interface Breadcrumb {
    name: string;
    url: string;
}

interface ProductCatalogueProps {
    catalogue: {
        id: number;
        name: string;
        description?: string;
        image?: string;
        icon?: string;
        canonical: string;
    };
    products: Pagination;
    filters: Filter;
    allCategories: CategoryItem[];
    breadcrumbs: Breadcrumb[];
    seo: {
        meta_title: string;
        meta_description: string;
        meta_keywords: string;
        meta_image: string;
    };
    currentCatalogueIds: number[];
    currentFilters: {
        sort: string;
        min_price?: string;
        max_price?: string;
        attributes: Record<string, number[]>;
    };
}

export default function ProductCatalogueIndex({
    catalogue,
    products,
    filters,
    allCategories,
    breadcrumbs,
    seo,
    currentCatalogueIds,
    currentFilters,
}: ProductCatalogueProps) {
    const [showMobileFilter, setShowMobileFilter] = useState(false);
    const [isFiltering, setIsFiltering] = useState(false);

    // Initial state from props
    const [minPrice, setMinPrice] = useState<number | undefined>(
        currentFilters.min_price ? parseInt(currentFilters.min_price) : undefined
    );
    const [maxPrice, setMaxPrice] = useState<number | undefined>(
        currentFilters.max_price ? parseInt(currentFilters.max_price) : undefined
    );
    const [selectedAttributes, setSelectedAttributes] = useState<Record<number, number[]>>(
        currentFilters.attributes || {}
    );
    const [selectedCategories, setSelectedCategories] = useState<number[]>(
        Array.isArray(currentCatalogueIds) ? currentCatalogueIds : []
    );

    // Debounce for price state to avoid rapid re-renders/fetches
    const [debouncedMinPrice, setDebouncedMinPrice] = useState(minPrice);
    const [debouncedMaxPrice, setDebouncedMaxPrice] = useState(maxPrice);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedMinPrice(minPrice);
        }, 500);
        return () => clearTimeout(handler);
    }, [minPrice]);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedMaxPrice(maxPrice);
        }, 500);
        return () => clearTimeout(handler);
    }, [maxPrice]);

    // Apply filters function
    const applyFilters = useCallback((
        categories: number[],
        attrs: Record<number, number[]>,
        min?: number,
        max?: number,
        sort?: string
    ) => {
        setIsFiltering(true);
        const params = new URLSearchParams(window.location.search);

        // Helper to set/delete params
        const updateParam = (key: string, value: any) => {
            if (value !== undefined && value !== null && value !== '' &&
                (typeof value !== 'object' || Object.keys(value).length > 0)) {
                if (typeof value === 'object') {
                    params.set(key, JSON.stringify(value));
                } else {
                    params.set(key, value.toString());
                }
            } else {
                params.delete(key);
            }
        };

        const hasCustomCategories = categories.length > 0 &&
            !(categories.length === 1 && categories[0] === catalogue.id && categories.length === currentCatalogueIds.length);
        // Simplified check: If selection is just current catalogue logic, roughly. 
        // Better: Just send if it's different from default/empty. 

        updateParam('category_ids', categories.length > 0 ? categories : null);
        updateParam('attributes', attrs);
        updateParam('min_price', min);
        updateParam('max_price', max);
        if (sort) updateParam('sort', sort);

        params.delete('page'); // Reset pagination

        router.get(`${window.location.pathname}?${params.toString()}`, {}, {
            preserveState: true,
            preserveScroll: true,
            onFinish: () => setIsFiltering(false)
        });
    }, [catalogue.id]); // Removed currentCatalogueIds dependency to avoid loop

    // Auto-trigger filter when debounced prices or selections change
    // Using a ref to skip initial mount if desired, but Inertia handles initial state.
    // However, we only want to trigger if 'something changed'.
    // Simple way: Compare current state with props. But props update after router.get.
    // So we can just rely on the user input updating state.

    // We need to avoid infinite loop. The dependencies are the *local state*.
    useEffect(() => {
        // Prevent triggering on initial mount if state matches props (optional but good)
        // For now, just trigger. Inertia is smart enough not to reload if URL is same? 
        // No, router.get ALWAYS reloads. We need to check against current props or a "dirty" flag.

        const isDirty =
            minPrice !== (currentFilters.min_price ? parseInt(currentFilters.min_price) : undefined) ||
            maxPrice !== (currentFilters.max_price ? parseInt(currentFilters.max_price) : undefined) ||
            JSON.stringify(selectedAttributes) !== JSON.stringify(currentFilters.attributes || {}) ||
            // Robust category check
            (JSON.stringify(selectedCategories.sort()) !== JSON.stringify((currentCatalogueIds || []).sort()));

        // Also check if debounced value matches current input (waiting for debounce)
        const pricesStable = minPrice === debouncedMinPrice && maxPrice === debouncedMaxPrice;

        if (isDirty && pricesStable) {
            applyFilters(selectedCategories, selectedAttributes, debouncedMinPrice, debouncedMaxPrice);
        }
    }, [debouncedMinPrice, debouncedMaxPrice, selectedAttributes, selectedCategories]);
    // Exclude applyFilters from deps to avoid re-creation issues if not memoized perfectly.

    // Handle Sort Change
    const handleSortChange = (value: string) => {
        const params = new URLSearchParams(window.location.search);
        params.set('sort', value);
        router.get(`${window.location.pathname}?${params.toString()}`, {}, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    // Recursive helper to get all descendants
    const getDescendants = (parentId: number, cats: CategoryItem[]): number[] => {
        const children = cats.filter(c => c.parent_id === parentId);
        let ids = children.map(c => c.id);
        children.forEach(child => {
            ids = [...ids, ...getDescendants(child.id, cats)];
        });
        return ids;
    };

    // Toggle Category
    const toggleCategory = (catId: number) => {
        setSelectedCategories(prev => {
            const isChecked = prev.includes(catId);
            const descendants = getDescendants(catId, allCategories);

            if (isChecked) {
                // Uncheck -> Uncheck self and all descendants
                let newSelected = prev.filter(id => id !== catId && !descendants.includes(id));

                // ALSO: Check if any ancestor needs to be unchecked
                // If I am unchecking a child, my parent is no longer "fully selected" (if that's the logic)
                // OR strict subset: if I uncheck a child, the parent scope might still be valid IF parent means "All products in Parent".
                // User said: "Nếu bỏ check tất cả các mục thì phải hiển thị tất cả sản phẩm" AND "Trong mục sữa trứng khi bỏ active 1 phần các mục con ? thì mục cha phải uncheck".
                // This means: User wants STRICT SELECTION. If Parent is checked, it implies ALL children are checked.
                // So if I uncheck a child, I MUST uncheck the Parent.

                // Find parent of current catId
                const parent = allCategories.find(c => c.id === catId)?.parent_id;
                if (parent) {
                    // Recursive uncheck upwards
                    const ancestors: number[] = [];
                    let currParentId: number | null | undefined = parent;
                    while (currParentId) {
                        ancestors.push(currParentId);
                        const pid: number = currParentId;
                        const curr = allCategories.find(c => c.id === pid);
                        currParentId = curr?.parent_id;
                    }
                    newSelected = newSelected.filter(id => !ancestors.includes(id));
                }

                return newSelected;
            } else {
                // Check -> Check self and all descendants
                const descendants = getDescendants(catId, allCategories);
                let newSelectedIds = [...new Set([...prev, catId, ...descendants])];

                // Check upwards: If all children of a parent are checked, check the parent
                let currentId = catId;
                let parentId = allCategories.find(c => c.id === currentId)?.parent_id;

                while (parentId) {
                    const parent = allCategories.find(c => c.id === parentId);
                    if (!parent) break;

                    // Get all direct children of this parent
                    const siblings = allCategories.filter(c => c.parent_id === parentId).map(c => c.id);

                    // Check if all siblings are in the newSelectedIds list
                    const allSiblingsChecked = siblings.every(id => newSelectedIds.includes(id));

                    if (allSiblingsChecked) {
                        if (!newSelectedIds.includes(parentId)) {
                            newSelectedIds.push(parentId);
                        }
                        // Continue up
                        currentId = parentId;
                        parentId = parent.parent_id;
                    } else {
                        // If this parent isn't fully checked, no need to check further up
                        break;
                    }
                }

                return newSelectedIds;
            }
        });
    };

    // Toggle Attribute
    const toggleAttribute = (groupId: number, attrId: number) => {
        setSelectedAttributes(prev => {
            const groupAttrs = prev[groupId] || [];
            const newAttrs = groupAttrs.includes(attrId)
                ? groupAttrs.filter(id => id !== attrId)
                : [...groupAttrs, attrId];

            const newSelected = { ...prev };
            if (newAttrs.length > 0) {
                newSelected[groupId] = newAttrs;
            } else {
                delete newSelected[groupId];
            }
            return newSelected;
        });
    };

    const goToPage = (page: number) => {
        const params = new URLSearchParams(window.location.search);

        // Remove 'page' from query params as it will be part of the path or default
        params.delete('page');

        // Determine base URL (remove any existing /trang-X.html suffix first to get clean root)
        let baseUrl = window.location.pathname;
        const pageMatch = baseUrl.match(/\/trang-(\d+)\.html$/);

        if (pageMatch) {
            baseUrl = baseUrl.replace(/\/trang-\d+\.html$/, '');
        }

        // If it's a category page (ends in .html), we need to handle the insertion
        // Case 1: /danh-muc.html -> /danh-muc/trang-2.html (or just /trang-2.html relative?)
        // The user requirement is /trang-2.html. 
        // If current is /do-uong.html, page 2 should probably be /do-uong/trang-2.html OR /do-uong.html?page=2 if struct is rigid.
        // BUT user said "cấu trúc là /trang-2.html". This implies a suffix.
        // Let's assume the router handles `{canonical}/trang-{page}.html`.

        // However, looking at the user's specific complaint: 
        // "impolement đường dẫn phân trang với cấu trúc là /trang-2.html"
        // This might mean `/trang-2.html` at the end of the canonical path.

        // Let's look at `ProductCatalogueController`. It usually handles `{canonical}`.
        // If we change URL to `{canonical}/trang-{page}.html`, we need ensuring the router supports it.
        // Wait, standard Laravel pagination often uses `?page=`.
        // If the user WANTS `/trang-2.html`, we need to append it.

        let targetUrl = baseUrl;

        // Strip .html if present to append /trang-X.html correctly?
        // Or is it `{canonical}/trang-{page}.html`? 
        // Example: `do-uong-nuoc-ep.html` -> `do-uong-nuoc-ep/trang-2.html`? This seems odd for a file extension style.
        // Maybe `do-uong-nuoc-ep/trang-2`?

        // Let's Re-read the user request carefully: "cấu trúc là /trang-2.html".
        // Context: `http://127.0.0.1:8000/do-uong-nuoc-ep.html`
        // Page 2: `http://127.0.0.1:8000/do-uong-nuoc-ep/trang-2.html` ?

        // Actually, often in these systems: 
        // Page 1: `.../slug.html`
        // Page 2: `.../slug/trang-2.html` 

        // Let's try to construct `.../slug/trang-2.html`.

        // Clean base url: remove .html
        let cleanBase = baseUrl;
        if (cleanBase.endsWith('.html')) {
            cleanBase = cleanBase.slice(0, -5);
        }

        if (page > 1) {
            targetUrl = `${cleanBase}/trang-${page}.html`;
        } else {
            // Page 1: Return to original canonical .html
            targetUrl = `${cleanBase}.html`;
        }

        const queryString = params.toString();
        const finalUrl = queryString ? `${targetUrl}?${queryString}` : targetUrl;

        router.get(finalUrl, {}, { preserveState: true, preserveScroll: false });
    };

    return (
        <FrontendLayout seo={seo}>
            <div className="bg-gray-50 py-3 border-b">
                <div className="container mx-auto px-4">
                    <nav className="flex items-center gap-2 text-sm">
                        {breadcrumbs.map((item, index) => (
                            <React.Fragment key={index}>
                                {index > 0 && <ChevronRight className="h-4 w-4 text-gray-400" />}
                                {index === breadcrumbs.length - 1 ? (
                                    <span className="text-gray-600">{item.name}</span>
                                ) : (
                                    <Link href={item.url} className="text-[#1a9cb0] hover:underline">
                                        {item.name}
                                    </Link>
                                )}
                            </React.Fragment>
                        ))}
                    </nav>
                </div>
            </div>

            <div className="bg-gray-100 py-6">
                <div className="container mx-auto px-4">
                    <div className="mb-6">
                        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{catalogue.name}</h1>
                        {catalogue.description && <p className="text-gray-600 mt-2">{catalogue.description}</p>}
                    </div>

                    <div className="flex flex-col lg:flex-row gap-6">
                        {/* Mobile & Desktop Sidebar */}
                        <aside className="hidden lg:block w-64 flex-shrink-0">
                            <FilterSidebar
                                allCategories={allCategories}
                                selectedCategories={selectedCategories}
                                toggleCategory={toggleCategory}
                                minPrice={minPrice}
                                setMinPrice={setMinPrice}
                                maxPrice={maxPrice}
                                setMaxPrice={setMaxPrice}
                                filters={filters}
                                selectedAttributes={selectedAttributes}
                                toggleAttribute={toggleAttribute}
                            />
                        </aside>

                        {/* Mobile Toggle (Simplified for brevity) */}
                        <div className="lg:hidden flex items-center justify-between bg-white rounded-lg p-3 shadow-sm">
                            <span className="text-sm text-gray-600">{products.total} sản phẩm</span>
                            <Button variant="outline" size="sm" onClick={() => setShowMobileFilter(true)}>
                                <SlidersHorizontal className="h-4 w-4 mr-2" /> Bộ lọc
                            </Button>
                        </div>
                        {showMobileFilter && (
                            <div className="fixed inset-0 z-50 bg-black/50 lg:hidden">
                                <div className="absolute right-0 top-0 bottom-0 w-80 bg-gray-100 overflow-y-auto">
                                    <div className="sticky top-0 bg-white p-4 flex items-center justify-between shadow-sm">
                                        <h3 className="font-semibold">Bộ lọc</h3>
                                        <Button variant="ghost" size="sm" onClick={() => setShowMobileFilter(false)}>
                                            <X className="h-5 w-5" />
                                        </Button>
                                    </div>
                                    <div className="p-4">
                                        <FilterSidebar
                                            allCategories={allCategories}
                                            selectedCategories={selectedCategories}
                                            toggleCategory={toggleCategory}
                                            minPrice={minPrice}
                                            setMinPrice={setMinPrice}
                                            maxPrice={maxPrice}
                                            setMaxPrice={setMaxPrice}
                                            filters={filters}
                                            selectedAttributes={selectedAttributes}
                                            toggleAttribute={toggleAttribute}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        <main className="flex-1 relative min-h-[400px]">
                            {/* Loading Overlay */}
                            {isFiltering && (
                                <div className="absolute inset-0 bg-white/60 z-10 flex items-center justify-center rounded-lg">
                                    <div className="flex flex-col items-center">
                                        <Loader2 className="h-8 w-8 text-[#1a9cb0] animate-spin" />
                                        <span className="text-sm text-gray-600 mt-2 font-medium">Đang lọc...</span>
                                    </div>
                                </div>
                            )}

                            <div className="bg-white rounded-lg p-4 shadow-sm mb-4 flex items-center justify-between">
                                <span className="text-sm text-gray-600">
                                    Hiển thị {products.from || 0} - {products.to || 0} / {products.total} sản phẩm
                                </span>
                                <div className="flex items-center gap-3">
                                    <Select defaultValue={currentFilters.sort} onValueChange={handleSortChange}>
                                        <SelectTrigger className="w-44 h-9 text-sm">
                                            <SelectValue placeholder="Sắp xếp" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {filters.sort_options.map((opt) => (
                                                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {products.data.length > 0 ? (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
                                    {products.data.map((product) => (
                                        <ProductCard key={product.id} product={product} />
                                    ))}
                                </div>
                            ) : (
                                <div className="bg-white rounded-lg p-12 shadow-sm text-center">
                                    <p className="text-gray-500">Không có sản phẩm nào trong danh mục này.</p>
                                </div>
                            )}

                            <PaginationComponent
                                current={products.current_page}
                                last={products.last_page}
                                goToPage={goToPage}
                            />
                        </main>
                    </div>
                </div>
            </div>
        </FrontendLayout>
    );
}



const PaginationComponent = ({ current, last, goToPage }: { current: number, last: number, goToPage: (page: number) => void }) => {
    if (last <= 1) return null;
    const pages: (number | string)[] = [];
    if (last <= 7) {
        for (let i = 1; i <= last; i++) pages.push(i);
    } else {
        if (current <= 3) {
            pages.push(1, 2, 3, 4, '...', last);
        } else if (current >= last - 2) {
            pages.push(1, '...', last - 3, last - 2, last - 1, last);
        } else {
            pages.push(1, '...', current - 1, current, current + 1, '...', last);
        }
    }
    return (
        <div className="flex items-center justify-center gap-1 mt-8">
            <Button variant="outline" size="sm" disabled={current === 1} onClick={() => goToPage(current - 1)} className="h-9 w-9 p-0">
                <ChevronLeft className="h-4 w-4" />
            </Button>
            {pages.map((page, idx) => (
                <React.Fragment key={idx}>
                    {page === '...' ? (
                        <span className="px-2 text-gray-400">...</span>
                    ) : (
                        <Button
                            variant={page === current ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => goToPage(page as number)}
                            className={`h-9 w-9 p-0 ${page === current ? 'bg-[#1a9cb0] hover:bg-[#158a9c] text-white' : ''}`}
                        >
                            {page}
                        </Button>
                    )}
                </React.Fragment>
            ))}
            <Button variant="outline" size="sm" disabled={current === last} onClick={() => goToPage(current + 1)} className="h-9 w-9 p-0">
                <ChevronRight className="h-4 w-4" />
            </Button>
        </div>
    );
};
