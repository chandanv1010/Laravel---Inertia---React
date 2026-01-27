
import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Loader2, Package, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { QuickAddProductModal } from './quick-add-product-modal';

interface Product {
    id: number;
    name: string;
    sku: string;
    barcode: string | null;
    retail_price: number;
    wholesale_price: number;
    unit: string;
    image: string | null;
    management_type?: 'basic' | 'imei' | 'batch';
    variants?: Array<{
        id: number;
        sku: string;
        retail_price: number;
        wholesale_price: number;
        attributes?: Record<string, string>; // Object map: { "Màu sắc": "Đỏ", "Kích thước": "L" }
        warehouse_stocks?: Array<{
            warehouse_id: number;
            stock_quantity: number;
            storage_location?: string;
        }>;
        stock_quantity?: number;
    }>;
    warehouse_stocks?: Array<{
        warehouse_id: number;
        stock_quantity: number;
        storage_location?: string;
    }>;
    stock_quantity?: number;
}

interface ProductSearchDropdownProps {
    onSelectProduct: (product: Product, variantId?: number) => void;
    className?: string;
    catalogues?: Array<{ value: string | number; label: string }>;
    warehouseId?: number;
}

interface FlattenedProduct {
    id: number; // product id
    variantId: number | null;
    name: string;
    sku: string;
    image: string | null;
    price: number;
    importPrice: number;
    originalProduct: Product;
    attributeText: string;
    availableStock?: number; // Số lượng có thể bán
}

export function ProductSearchDropdown({ onSelectProduct, className, catalogues = [], warehouseId }: ProductSearchDropdownProps) {
    const [searchValue, setSearchValue] = useState("");
    const [results, setResults] = useState<FlattenedProduct[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const [showQuickAdd, setShowQuickAdd] = useState(false);
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
    const dropdownRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

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

    const flattenProducts = (products: Product[]): FlattenedProduct[] => {
        const flattened: FlattenedProduct[] = [];

        products.forEach(product => {
            if (product.variants && product.variants.length > 0) {
                // Sản phẩm có variants - hiển thị từng variant riêng
                product.variants.forEach(variant => {
                    // Tạo tên variant từ attributes object
                    const variantNameParts: string[] = [];
                    if (variant.attributes && typeof variant.attributes === 'object') {
                        // Lấy tất cả values từ attributes object và join lại
                        variantNameParts.push(...Object.values(variant.attributes).filter(v => v && v.trim()));
                    }
                    const variantName = variantNameParts.length > 0
                        ? variantNameParts.join(' / ')
                        : '';

                    // Tên hiển thị = "Tên sản phẩm + Tên phiên bản"
                    const displayName = variantName
                        ? `${product.name} - ${variantName}`
                        : product.name;

                    // Tính tổng stock từ warehouse_stocks hoặc dùng stock_quantity
                    let availableStock = 0;
                    if (variant.warehouse_stocks && Array.isArray(variant.warehouse_stocks)) {
                        availableStock = variant.warehouse_stocks.reduce((sum: number, ws: any) => sum + (ws.stock_quantity || 0), 0);
                    } else {
                        availableStock = variant.stock_quantity || 0;
                    }

                    flattened.push({
                        id: product.id,
                        variantId: variant.id,
                        name: displayName, // Tên sản phẩm + tên phiên bản
                        sku: variant.sku || product.sku,
                        image: product.image,
                        price: variant.retail_price || product.retail_price,
                        importPrice: variant.wholesale_price || product.wholesale_price,
                        originalProduct: product,
                        attributeText: variantName, // Giữ lại để hiển thị riêng nếu cần
                        availableStock: availableStock
                    });
                });
            } else {
                // Sản phẩm không có variants
                // Tính tổng stock từ warehouse_stocks hoặc dùng stock_quantity
                let availableStock = 0;
                if (product.warehouse_stocks && Array.isArray(product.warehouse_stocks)) {
                    availableStock = product.warehouse_stocks.reduce((sum: number, ws: any) => sum + (ws.stock_quantity || 0), 0);
                } else {
                    availableStock = product.stock_quantity || 0;
                }

                flattened.push({
                    id: product.id,
                    variantId: null,
                    name: product.name,
                    sku: product.sku,
                    image: product.image,
                    price: product.retail_price,
                    importPrice: product.wholesale_price,
                    originalProduct: product,
                    attributeText: '',
                    availableStock: availableStock
                });
            }
        });

        return flattened;
    };

    const searchProducts = useCallback(async (query: string) => {
        setIsLoading(true);
        try {
            // Nếu không có query, load 10 sản phẩm mặc định
            const url = query.trim()
                ? `/backend/product?keyword=${encodeURIComponent(query)}&type=all&publish=2&per_page=20`
                : `/backend/product?type=all&publish=2&per_page=10&sort=id,desc`;

            const response = await apiFetch(url);
            if (response && response.data) {
                const productsData: Product[] = Array.isArray(response.data) ? response.data : (response.data.data || []);
                const flattened = flattenProducts(productsData);
                setResults(flattened);
                setShowDropdown(true);
            } else {
                setResults([]);
            }
        } catch (error) {
            console.error("Failed to search products", error);
            setResults([]);
        } finally {
            setIsLoading(false);
        }
    }, [apiFetch]);

    // Tính toán vị trí dropdown khi hiển thị
    useEffect(() => {
        if (showDropdown && inputRef.current) {
            const updatePosition = () => {
                const rect = inputRef.current?.getBoundingClientRect();
                if (rect) {
                    setDropdownPosition({
                        top: rect.bottom + 4,
                        left: rect.left,
                        width: rect.width
                    });
                }
            };

            updatePosition();
            // Cập nhật lại khi scroll hoặc resize
            window.addEventListener('scroll', updatePosition, true);
            window.addEventListener('resize', updatePosition);

            return () => {
                window.removeEventListener('scroll', updatePosition, true);
                window.removeEventListener('resize', updatePosition);
            };
        }
    }, [showDropdown, results]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
                inputRef.current && !inputRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showDropdown]);

    useEffect(() => {
        const timeout = setTimeout(() => {
            if (searchValue) {
                searchProducts(searchValue);
            }
            // Không clear results khi searchValue rỗng - giữ lại 10 sản phẩm mặc định
        }, 300);

        return () => clearTimeout(timeout);
    }, [searchValue, searchProducts]);

    const handleSelect = (item: FlattenedProduct) => {
        onSelectProduct(item.originalProduct, item.variantId || undefined);
        setSearchValue("");
        setShowDropdown(false);
        setResults([]);
    };

    return (
        <div className={cn("relative w-full", className)}>
            <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                <Input
                    ref={inputRef}
                    placeholder="Tìm theo tên, mã SKU, quét mã Barcode... (F3)"
                    value={searchValue}
                    onChange={(e) => {
                        setSearchValue(e.target.value);
                        if (!showDropdown && e.target.value) setShowDropdown(true);
                    }}
                    onClick={() => {
                        if (!searchValue && results.length === 0 && !isLoading) {
                            searchProducts("");
                        }
                        if (results.length > 0 || isLoading) {
                            setShowDropdown(true);
                        }
                    }}
                    onFocus={() => {
                        if (!searchValue && results.length === 0 && !isLoading) {
                            searchProducts("");
                        }
                        if (results.length > 0 || isLoading) {
                            setShowDropdown(true);
                        }
                    }}
                    className="pl-9"
                    autoComplete="off"
                />
            </div>

            {showDropdown && typeof document !== 'undefined' && createPortal(
                <div
                    ref={dropdownRef}
                    className="fixed bg-white border rounded-md shadow-lg z-[9999] max-h-[400px] overflow-y-auto"
                    style={{
                        top: `${dropdownPosition.top}px`,
                        left: `${dropdownPosition.left}px`,
                        width: `${dropdownPosition.width}px`,
                    }}
                >
                    <div className="p-2 border-b sticky top-0 bg-white z-10">
                        <Button
                            variant="ghost"
                            className="w-full justify-start text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            onClick={() => {
                                setShowQuickAdd(true);
                                setShowDropdown(false);
                            }}
                        >
                            <Plus className="mr-2 h-4 w-4" />
                            Thêm mới sản phẩm
                        </Button>
                    </div>

                    {isLoading ? (
                        <div className="flex items-center justify-center p-4">
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                    ) : results.length === 0 ? (
                        <div className="p-4 text-center text-muted-foreground text-sm">
                            Không tìm thấy sản phẩm nào
                        </div>
                    ) : (
                        <div className="py-1">
                            {results.map((item, index) => (
                                <div
                                    key={`${item.id}-${item.variantId || 'main'}-${index}`}
                                    className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer border-b last:border-0"
                                    onClick={() => handleSelect(item)}
                                >
                                    <div className="shrink-0">
                                        {item.image ? (
                                            <img
                                                src={item.image}
                                                alt={item.name}
                                                className="w-10 h-10 object-cover rounded"
                                            />
                                        ) : (
                                            <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center">
                                                <Package className="h-5 w-5 text-gray-400" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium truncate">{item.name}</div>
                                        <div className="text-xs text-muted-foreground mt-1">
                                            SKU: {item.sku}
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <div className="text-sm font-medium">{item.price?.toLocaleString('vi-VN') || '0'}₫</div>
                                        <div className="text-xs text-blue-600">
                                            Có thể bán: {item.availableStock ?? 0}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>,
                document.body
            )}

            <QuickAddProductModal
                open={showQuickAdd}
                onOpenChange={(open) => {
                    setShowQuickAdd(open);
                    // Nếu đóng modal, refresh danh sách sản phẩm
                    if (!open && !searchValue) {
                        searchProducts("");
                    }
                }}
                catalogues={catalogues}
                onProductCreated={(product) => {
                    // Sau khi tạo sản phẩm, tự động chọn nó
                    if (product && product.id) {
                        // Tạo product object để select
                        const newProduct: Product = {
                            id: product.id,
                            name: product.name || product.current_language?.name || '',
                            sku: product.sku || '',
                            barcode: product.barcode || null,
                            retail_price: product.retail_price || 0,
                            wholesale_price: product.wholesale_price || 0,
                            unit: product.unit || '',
                            image: product.image || null,
                            variants: []
                        };
                        onSelectProduct(newProduct);
                        setShowQuickAdd(false);
                    }
                }}
            />
        </div>
    );
}
