import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Loader2, Package } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from '@/components/ui/pagination';
import { useDebounce } from '@/hooks/use-debounce';
import { ProductImage } from '@/components/product-image';



interface Product {
    id: number;
    name: string;
    sku: string;
    image?: string | null;
    album?: string[];
    retail_price?: number;
    wholesale_price?: number;
    price?: number;
    variants?: Array<{
        id: number;
        name?: string;
        sku: string;
        price?: number;
        retail_price?: number;
        wholesale_price?: number;
        attributes?: Record<string, string>;
        image?: string;
    }>;
}

interface ProductSelectionModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: (selectedProducts: Array<{ id: number; name: string; sku: string; image?: string; productId?: number; productName?: string }>) => void;
    initialSelectedIds?: number[];
    initialSelectedProducts?: Array<{ id: number; name: string; sku: string; image?: string; productId?: number; productName?: string }>;
    title?: string;
    description?: string;
    showPrice?: boolean;
    priceLabel?: string;
    // Preloaded data from controller to avoid API calls
    preloadedProducts?: Product[];
    preloadedCatalogues?: Array<{ id: number; name: string; level?: number }>;
}

export function ProductSelectionModal({
    open,
    onOpenChange,
    onConfirm,
    initialSelectedIds = [],
    initialSelectedProducts = [],
    title = 'Chọn sản phẩm',
    description = 'Tìm kiếm theo tên sản phẩm hoặc phiên bản',
    showPrice = true,
    priceLabel = 'Giá bán',
    preloadedProducts,
    preloadedCatalogues
}: ProductSelectionModalProps) {
    const [keyword, setKeyword] = useState('');
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
    // Lưu trữ full product objects đã chọn để giữ lại khi chuyển trang
    const [selectedProductsMap, setSelectedProductsMap] = useState<Map<string, { id: number; name: string; sku: string; image?: string; productId?: number; productName?: string }>>(new Map());
    const [catalogueId, setCatalogueId] = useState<string>('all');
    const [catalogues, setCatalogues] = useState<Array<{ id: number; name: string }>>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [perPage] = useState(20);

    const debouncedKeyword = useDebounce(keyword, 500);

    const getCookie = useCallback((name: string): string => {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop()?.split(';').shift() || '';
        return '';
    }, []);

    const apiFetch = useCallback(async (url: string, init: RequestInit = {}) => {
        const method = (init.method || "GET").toUpperCase();
        const metaToken =
            (typeof document !== "undefined" &&
                (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement | null)
                    ?.content) ||
            "";
        const cookieToken = metaToken ? "" : getCookie("XSRF-TOKEN");
        const csrfToken = metaToken || cookieToken;
        const headers = new Headers(init.headers || {});
        headers.set("Accept", "application/json");
        headers.set("X-Requested-With", "XMLHttpRequest");
        if (method !== "GET" && method !== "HEAD" && csrfToken) {
            if (metaToken) {
                headers.set("X-CSRF-TOKEN", metaToken);
            } else if (cookieToken && !headers.has("X-XSRF-TOKEN")) {
                headers.set("X-XSRF-TOKEN", cookieToken);
            }
            if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
        }

        const response = await fetch(url, {
            credentials: "same-origin",
            ...init,
            headers,
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    }, [getCookie]);

    // Memoize fetchCatalogues để tránh recreate mỗi lần render
    const fetchCatalogues = useCallback(async () => {
        try {
            // Fetch tất cả danh mục với per_page lớn để lấy hết
            const response = await apiFetch('/backend/product_catalogue?per_page=1000&publish=2');

            // Kiểm tra cấu trúc response - có thể là response.data hoặc response.data.data
            let data = [];
            if (response) {
                if (Array.isArray(response)) {
                    // Nếu response là array trực tiếp
                    data = response;
                } else if (response.data) {
                    // Nếu response có data property
                    if (Array.isArray(response.data)) {
                        data = response.data;
                    } else if (response.data.data && Array.isArray(response.data.data)) {
                        data = response.data.data;
                    } else if (response.data.items && Array.isArray(response.data.items)) {
                        // Paginator có thể trả về items
                        data = response.data.items;
                    }
                } else if (response.items && Array.isArray(response.items)) {
                    data = response.items;
                }
            }

            if (!data || data.length === 0) {
                setCatalogues([]);
                return;
            }

            // Map và format tên danh mục với level để hiển thị phân cấp
            const formattedCatalogues = data.map((c: any) => {
                const name = c.current_language?.name || c.name || '';
                // Nếu có level, thêm indent để hiển thị phân cấp với ký hiệu |---
                const indent = c.level && c.level > 1 ? '|---'.repeat(c.level - 1) + ' ' : '';
                return {
                    id: c.id,
                    name: indent + name,
                };
            });

            setCatalogues(formattedCatalogues);
        } catch (error) {
            console.error("Failed to fetch catalogues", error);
            setCatalogues([]);
        }
    }, [apiFetch]);

    // Sử dụng useMemo để memoize initial data và chỉ update khi cần thiết
    const initialDataKey = useMemo(() => {
        return JSON.stringify({
            ids: initialSelectedIds,
            products: initialSelectedProducts?.map(p => ({ id: p.id, name: p.name }))
        });
    }, [initialSelectedIds, initialSelectedProducts]);

    useEffect(() => {
        if (open) {
            // Khởi tạo selected products từ initialSelectedIds và initialSelectedProducts
            const initialSet = new Set<string>();
            const initialMap = new Map<string, { id: number; name: string; sku: string; image?: string; productId?: number; productName?: string }>();

            // Nếu có initialSelectedProducts, ưu tiên dùng để giữ lại full data
            if (initialSelectedProducts && initialSelectedProducts.length > 0) {
                initialSelectedProducts.forEach(product => {
                    const key = String(product.id);
                    initialSet.add(key);
                    initialMap.set(key, product);
                });
            } else if (initialSelectedIds && initialSelectedIds.length > 0) {
                // Nếu chỉ có IDs, tạo map với IDs
                initialSelectedIds.forEach(id => {
                    const key = String(id);
                    initialSet.add(key);
                    // Tạo object tạm với id, sẽ được cập nhật khi load products
                    initialMap.set(key, {
                        id: id,
                        name: `Product ${id}`,
                        sku: '',
                    });
                });
            }

            setSelectedProducts(initialSet);
            setSelectedProductsMap(initialMap);
            setCurrentPage(1);

            // Nếu có preloadedCatalogues, sử dụng trực tiếp thay vì fetch API
            if (preloadedCatalogues && preloadedCatalogues.length > 0) {
                const formattedCatalogues = preloadedCatalogues.map((c) => {
                    const indent = c.level && c.level > 1 ? '|---'.repeat(c.level - 1) + ' ' : '';
                    return {
                        id: c.id,
                        name: indent + c.name,
                    };
                });
                setCatalogues(formattedCatalogues);
            } else {
                fetchCatalogues();
            }
        }
    }, [open, fetchCatalogues, initialDataKey, preloadedCatalogues]); // Depend vào memoized key thay vì arrays trực tiếp

    // Memoize fetchProducts để tránh recreate mỗi lần render
    const fetchProducts = useCallback(async (page: number = 1) => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams({
                page: String(page),
                per_page: String(perPage),
                type: 'all',
                publish: '2',
            });

            if (debouncedKeyword && debouncedKeyword.trim()) {
                params.append('keyword', debouncedKeyword.trim());
            }

            // Sử dụng format product_catalogue_id[id][in]=8 để filter đúng với HasCatalogueFilter trait
            if (catalogueId !== 'all') {
                params.append('product_catalogue_id[id][in]', catalogueId);
            }

            const response = await apiFetch(`/backend/product?${params.toString()}`);
            const data = response.data || [];
            const pagination = response.pagination || response.meta || {};

            setProducts(data);
            // Tính totalPages từ pagination hoặc từ total và perPage
            const total = pagination.total || data.length;
            const lastPage = pagination.last_page || pagination.total_pages || Math.ceil(total / perPage) || 1;
            setTotalPages(lastPage);
        } catch (error) {
            console.error("Failed to fetch products", error);
            setProducts([]);
        } finally {
            setIsLoading(false);
        }
    }, [debouncedKeyword, catalogueId, perPage, apiFetch]);

    useEffect(() => {
        if (open) {
            // Nếu có preloadedProducts và chưa search/filter, sử dụng trực tiếp
            if (preloadedProducts && preloadedProducts.length > 0 && !debouncedKeyword && catalogueId === 'all' && currentPage === 1) {
                setProducts(preloadedProducts);
                setTotalPages(1); // Preloaded data không có pagination
            } else {
                if (currentPage === 1) {
                    fetchProducts(1);
                } else {
                    setCurrentPage(1);
                }
            }
        }
    }, [debouncedKeyword, catalogueId, open, fetchProducts, preloadedProducts, currentPage]);

    useEffect(() => {
        if (open && currentPage > 1) {
            fetchProducts(currentPage);
        }
    }, [currentPage, open, fetchProducts]);

    const getProductKey = (productId: number, variantId?: number) => {
        return variantId ? `${productId}-${variantId}` : `${productId}`;
    };

    const toggleProduct = (product: Product, variantId?: number) => {
        const key = getProductKey(product.id, variantId);
        const newSelected = new Set(selectedProducts);
        const newMap = new Map(selectedProductsMap);

        if (newSelected.has(key)) {
            // Bỏ chọn
            newSelected.delete(key);
            newMap.delete(key);
        } else {
            // Chọn
            newSelected.add(key);

            if (variantId) {
                // Variant được chọn
                const variantNameParts: string[] = [];
                const variant = product.variants?.find(v => v.id === variantId);
                if (variant?.attributes && typeof variant.attributes === 'object') {
                    variantNameParts.push(...Object.values(variant.attributes).filter(v => v != null).map(v => String(v).trim()).filter(v => v));
                }
                const variantName = variantNameParts.length > 0
                    ? variantNameParts.join(' / ')
                    : '';

                const displayName = variantName
                    ? `${product.name} - ${variantName}`
                    : product.name;

                newMap.set(key, {
                    id: variantId,
                    name: displayName,
                    sku: variant?.sku || product.sku,
                    image: variant?.image || product.image || (product.album && product.album[0]) || undefined,
                    productId: product.id,
                    productName: product.name,
                });
            } else {
                // Product base được chọn
                newMap.set(key, {
                    id: product.id,
                    name: product.name,
                    sku: product.sku,
                    image: product.image || (product.album && product.album[0]) || undefined,
                    productId: product.id,
                    productName: product.name,
                });
            }
        }

        setSelectedProducts(newSelected);
        setSelectedProductsMap(newMap);
    };

    const isProductSelected = (product: Product, variantId?: number) => {
        return selectedProducts.has(getProductKey(product.id, variantId));
    };

    const handleConfirm = () => {
        // Lấy tất cả sản phẩm đã chọn từ map (bao gồm cả những sản phẩm không có trong trang hiện tại)
        const selected: Array<{ id: number; name: string; sku: string; image?: string; productId?: number; productName?: string }> = [];

        // Cập nhật map với các sản phẩm từ trang hiện tại
        const updatedMap = new Map(selectedProductsMap);

        products.forEach(product => {
            // Check if base product is selected (no variants or product itself)
            if (isProductSelected(product) && (!product.variants || product.variants.length === 0)) {
                const key = String(product.id);
                updatedMap.set(key, {
                    id: product.id,
                    name: product.name,
                    sku: product.sku,
                    image: product.image || (product.album && product.album[0]) || undefined,
                    productId: product.id,
                    productName: product.name,
                });
            }

            // Check variants
            if (product.variants) {
                product.variants.forEach(variant => {
                    if (isProductSelected(product, variant.id)) {
                        // Tạo tên variant từ attributes
                        const variantNameParts: string[] = [];
                        if (variant.attributes && typeof variant.attributes === 'object') {
                            variantNameParts.push(...Object.values(variant.attributes).filter(v => v != null).map(v => String(v).trim()).filter(v => v));
                        }
                        const variantName = variantNameParts.length > 0
                            ? variantNameParts.join(' / ')
                            : '';

                        const displayName = variantName
                            ? `${product.name} - ${variantName}`
                            : product.name;

                        const key = getProductKey(product.id, variant.id);
                        updatedMap.set(key, {
                            id: variant.id,
                            name: displayName,
                            sku: variant.sku || product.sku,
                            image: variant.image || product.image || (product.album && product.album[0]) || undefined,
                            productId: product.id,
                            productName: product.name,
                        });
                    }
                });
            }
        });

        // Chỉ lấy các sản phẩm đang được selected trong selectedProducts Set
        selectedProducts.forEach(key => {
            const product = updatedMap.get(key);
            if (product) {
                selected.push(product);
            }
        });

        if (selected.length > 0) {
            onConfirm(selected);
            setSelectedProducts(new Set());
            setSelectedProductsMap(new Map());
            setKeyword('');
            setProducts([]);
            onOpenChange(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="!max-w-[1100px] !w-[1100px] max-h-[90vh] flex flex-col overflow-hidden !left-[50%] !top-[50%] !translate-x-[-50%] !translate-y-[-50%]"
                style={{
                    left: '50% !important',
                    top: '50% !important',
                    transform: 'translate(-50%, -50%) !important',
                    width: '1100px !important',
                    maxWidth: '1100px !important',
                    marginLeft: '0 !important',
                    marginTop: '0 !important'
                } as React.CSSProperties}
            >
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>

                <div className="flex flex-col flex-1 min-h-0 space-y-4">
                    <div className="flex gap-2 shrink-0">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Tìm kiếm theo tên sản phẩm, phiên bản hoặc mã SKU..."
                                value={keyword}
                                onChange={(e) => setKeyword(e.target.value)}
                                className="pl-9"
                                autoFocus
                            />
                        </div>
                        <Select value={catalogueId} onValueChange={setCatalogueId}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder={catalogues.length > 0 ? "Danh mục" : "Đang tải..."} />
                            </SelectTrigger>
                            <SelectContent className="max-h-[300px]">
                                <SelectItem value="all">Tất cả danh mục</SelectItem>
                                {catalogues.length > 0 ? (
                                    catalogues.map(cat => (
                                        <SelectItem key={cat.id} value={String(cat.id)}>
                                            {cat.name}
                                        </SelectItem>
                                    ))
                                ) : (
                                    <SelectItem value="loading" disabled>
                                        Đang tải danh mục...
                                    </SelectItem>
                                )}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex-1 overflow-y-auto border rounded-md min-h-0">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : products.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                <p className="text-sm">
                                    {keyword.trim() ? 'Không tìm thấy sản phẩm nào' : 'Nhập từ khóa để tìm kiếm sản phẩm'}
                                </p>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[50px]">
                                            <Checkbox
                                                checked={products.length > 0 && products.every(p => {
                                                    if (p.variants && p.variants.length > 0) {
                                                        return p.variants.every(v => isProductSelected(p, v.id));
                                                    }
                                                    return isProductSelected(p);
                                                })}
                                                onCheckedChange={(checked) => {
                                                    const newSelected = new Set(selectedProducts);
                                                    products.forEach(product => {
                                                        if (product.variants && product.variants.length > 0) {
                                                            product.variants.forEach(variant => {
                                                                const key = getProductKey(product.id, variant.id);
                                                                if (checked) {
                                                                    newSelected.add(key);
                                                                } else {
                                                                    newSelected.delete(key);
                                                                }
                                                            });
                                                        } else {
                                                            const key = getProductKey(product.id);
                                                            if (checked) {
                                                                newSelected.add(key);
                                                            } else {
                                                                newSelected.delete(key);
                                                            }
                                                        }
                                                    });
                                                    setSelectedProducts(newSelected);
                                                }}
                                            />
                                        </TableHead>
                                        <TableHead className="w-[50px]">Hình</TableHead>
                                        <TableHead>Tên sản phẩm</TableHead>
                                        <TableHead>SKU</TableHead>
                                        {showPrice && (
                                            <>
                                                <TableHead>{priceLabel}</TableHead>
                                            </>
                                        )}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {products.map((product) => {
                                        const hasVariants = product.variants && product.variants.length > 0;
                                        const rowSpan = hasVariants ? (product.variants?.length ?? 0) + 1 : 1;

                                        return (
                                            <React.Fragment key={product.id}>
                                                <TableRow
                                                    className="cursor-pointer hover:bg-muted/50"
                                                    onClick={() => toggleProduct(product)}
                                                >
                                                    <TableCell onClick={(e) => e.stopPropagation()} className="cursor-pointer">
                                                        <Checkbox
                                                            checked={isProductSelected(product)}
                                                            onCheckedChange={() => toggleProduct(product)}
                                                            className="cursor-pointer"
                                                        />
                                                    </TableCell>
                                                    <TableCell rowSpan={rowSpan} onClick={(e) => e.stopPropagation()}>
                                                        {product.image || (product.album && product.album[0]) ? (
                                                            <ProductImage
                                                                src={product.image || product.album![0]}
                                                                alt={product.name}
                                                            />
                                                        ) : (
                                                            <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center">
                                                                <Package className="h-5 w-5 text-gray-400" />
                                                            </div>
                                                        )}
                                                    </TableCell>
                                                    <TableCell rowSpan={rowSpan}>
                                                        <span className="font-medium">{product.name}</span>
                                                    </TableCell>
                                                    {hasVariants ? (
                                                        <>
                                                            <TableCell>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-sm text-muted-foreground">{product.sku}</span>
                                                                    <Badge variant="outline" className="text-xs">Base</Badge>
                                                                </div>
                                                            </TableCell>
                                                            {showPrice && (
                                                                <TableCell>
                                                                    <span className="text-sm">
                                                                        {(product.retail_price || product.price || 0).toLocaleString('vi-VN')}₫
                                                                    </span>
                                                                </TableCell>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <>
                                                            <TableCell>
                                                                <span className="text-sm text-muted-foreground">{product.sku}</span>
                                                            </TableCell>
                                                            {showPrice && (
                                                                <TableCell>
                                                                    <span className="text-sm">
                                                                        {(product.retail_price || product.price || 0).toLocaleString('vi-VN')}₫
                                                                    </span>
                                                                </TableCell>
                                                            )}
                                                        </>
                                                    )}
                                                </TableRow>
                                                {hasVariants && product.variants?.map((variant) => (
                                                    <TableRow
                                                        key={`${product.id}-${variant.id}`}
                                                        className="cursor-pointer hover:bg-muted/50"
                                                        onClick={() => toggleProduct(product, variant.id)}
                                                    >
                                                        <TableCell onClick={(e) => e.stopPropagation()} className="cursor-pointer">
                                                            <Checkbox
                                                                checked={isProductSelected(product, variant.id)}
                                                                onCheckedChange={() => toggleProduct(product, variant.id)}
                                                                className="cursor-pointer"
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-sm text-muted-foreground">{variant.sku}</span>
                                                                <Badge variant="outline" className="text-xs">Variant</Badge>
                                                            </div>
                                                        </TableCell>
                                                        {showPrice && (
                                                            <TableCell>
                                                                <span className="text-sm">
                                                                    {(variant.retail_price || variant.price || 0).toLocaleString('vi-VN')}₫
                                                                </span>
                                                            </TableCell>
                                                        )}
                                                    </TableRow>
                                                ))}
                                            </React.Fragment>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        )}
                    </div>

                    {totalPages > 1 && (
                        <div className="shrink-0 flex justify-center">
                            <Pagination>
                                <PaginationContent>
                                    <PaginationItem>
                                        <PaginationPrevious
                                            onClick={() => currentPage > 1 && setCurrentPage(currentPage - 1)}
                                            className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                                        />
                                    </PaginationItem>
                                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                                        // Chỉ hiển thị một số trang xung quanh trang hiện tại
                                        if (
                                            page === 1 ||
                                            page === totalPages ||
                                            (page >= currentPage - 1 && page <= currentPage + 1)
                                        ) {
                                            return (
                                                <PaginationItem key={page}>
                                                    <PaginationLink
                                                        onClick={() => setCurrentPage(page)}
                                                        isActive={currentPage === page}
                                                        className="cursor-pointer"
                                                    >
                                                        {page}
                                                    </PaginationLink>
                                                </PaginationItem>
                                            );
                                        } else if (
                                            page === currentPage - 2 ||
                                            page === currentPage + 2
                                        ) {
                                            return (
                                                <PaginationItem key={page}>
                                                    <span className="px-2">...</span>
                                                </PaginationItem>
                                            );
                                        }
                                        return null;
                                    })}
                                    <PaginationItem>
                                        <PaginationNext
                                            onClick={() => currentPage < totalPages && setCurrentPage(currentPage + 1)}
                                            className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                                        />
                                    </PaginationItem>
                                </PaginationContent>
                            </Pagination>
                        </div>
                    )}

                    {selectedProducts.size > 0 && (
                        <div className="text-sm text-muted-foreground shrink-0">
                            Đã chọn: {selectedProducts.size} sản phẩm
                        </div>
                    )}
                </div>

                <DialogFooter className="shrink-0">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Hủy
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={selectedProducts.size === 0}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                        Áp dụng ({selectedProducts.size})
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

