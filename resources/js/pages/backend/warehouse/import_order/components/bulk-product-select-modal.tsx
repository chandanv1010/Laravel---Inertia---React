import React, { useState, useEffect, useCallback } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Loader2, Package, Check } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';

interface Product {
    id: number;
    name: string;
    sku: string;
    barcode: string | null;
    retail_price: number;
    wholesale_price: number;
    unit: string;
    image: string | null;
    variants?: Array<{
        id: number;
        sku: string;
        retail_price: number;
        wholesale_price: number;
    }>;
}

interface BulkProductSelectModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSelectProducts: (products: Array<{ product: Product; variantId?: number }>) => void;
    catalogues?: Array<{ value: string | number; label: string }>;
}

export function BulkProductSelectModal({ 
    open, 
    onOpenChange, 
    onSelectProducts,
    catalogues = []
}: BulkProductSelectModalProps) {
    const [searchValue, setSearchValue] = useState("");
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());

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

    const searchProducts = useCallback(async (query: string) => {
        if (!query.trim()) {
            setProducts([]);
            return;
        }

        setIsLoading(true);
        try {
            const response = await apiFetch(`/backend/product?keyword=${encodeURIComponent(query)}&type=all&publish=2&per_page=10`);
            if (response && response.data) {
                const productsData = Array.isArray(response.data) ? response.data : (response.data.data || []);
                setProducts(productsData);
            } else {
                setProducts([]);
            }
        } catch (error) {
            console.error("Failed to search products", error);
            setProducts([]);
        } finally {
            setIsLoading(false);
        }
    }, [apiFetch]);

    useEffect(() => {
        if (open && searchValue) {
            const timeout = setTimeout(() => {
                searchProducts(searchValue);
            }, 300);
            return () => clearTimeout(timeout);
        } else if (open && !searchValue) {
            setProducts([]);
        }
    }, [searchValue, open, searchProducts]);

    useEffect(() => {
        if (open) {
            setSelectedProducts(new Set());
        }
    }, [open]);

    const getProductKey = (productId: number, variantId?: number) => {
        return variantId ? `${productId}-${variantId}` : `${productId}`;
    };

    const toggleProduct = (product: Product, variantId?: number) => {
        const key = getProductKey(product.id, variantId);
        const newSelected = new Set(selectedProducts);
        if (newSelected.has(key)) {
            newSelected.delete(key);
        } else {
            newSelected.add(key);
        }
        setSelectedProducts(newSelected);
    };

    const isProductSelected = (product: Product, variantId?: number) => {
        return selectedProducts.has(getProductKey(product.id, variantId));
    };

    const handleConfirm = () => {
        const selected: Array<{ product: Product; variantId?: number }> = [];
        
        products.forEach(product => {
            // Check if base product is selected
            if (isProductSelected(product)) {
                selected.push({ product });
            }
            
            // Check variants
            if (product.variants) {
                product.variants.forEach(variant => {
                    if (isProductSelected(product, variant.id)) {
                        selected.push({ product, variantId: variant.id });
                    }
                });
            }
        });

        if (selected.length > 0) {
            onSelectProducts(selected);
            setSelectedProducts(new Set());
            setSearchValue("");
            setProducts([]);
            onOpenChange(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="wide-modal max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle className="font-normal">Chọn nhiều sản phẩm</DialogTitle>
                </DialogHeader>

                <div className="flex flex-col flex-1 min-h-0 space-y-4">
                    <div className="relative shrink-0">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Tìm theo tên, mã SKU, quét mã Barcode..."
                            value={searchValue}
                            onChange={(e) => setSearchValue(e.target.value)}
                            className="pl-9"
                            autoFocus
                        />
                    </div>

                    <div className="flex-1 overflow-y-auto border rounded-md">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : products.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                <p className="text-sm">Nhập từ khóa để tìm kiếm sản phẩm</p>
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
                                        <TableHead>Giá bán</TableHead>
                                        <TableHead>Giá nhập</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {products.map((product) => {
                                        const hasVariants = product.variants && product.variants.length > 0;
                                        const rowSpan = hasVariants ? product.variants.length + 1 : 1;
                                        
                                        return (
                                            <React.Fragment key={product.id}>
                                                <TableRow>
                                                    <TableCell>
                                                        <Checkbox
                                                            checked={isProductSelected(product)}
                                                            onCheckedChange={() => toggleProduct(product)}
                                                        />
                                                    </TableCell>
                                                    <TableCell rowSpan={rowSpan}>
                                                        {product.image ? (
                                                            <img 
                                                                src={product.image} 
                                                                alt={product.name}
                                                                className="w-10 h-10 object-cover rounded"
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
                                                            <TableCell>
                                                                <span className="text-sm">{product.retail_price?.toLocaleString('vi-VN') || '0'}₫</span>
                                                            </TableCell>
                                                            <TableCell>
                                                                <span className="text-sm">{product.wholesale_price?.toLocaleString('vi-VN') || '0'}₫</span>
                                                            </TableCell>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <TableCell>
                                                                <span className="text-sm text-muted-foreground">{product.sku}</span>
                                                            </TableCell>
                                                            <TableCell>
                                                                <span className="text-sm">{product.retail_price?.toLocaleString('vi-VN') || '0'}₫</span>
                                                            </TableCell>
                                                            <TableCell>
                                                                <span className="text-sm">{product.wholesale_price?.toLocaleString('vi-VN') || '0'}₫</span>
                                                            </TableCell>
                                                        </>
                                                    )}
                                                </TableRow>
                                                {hasVariants && product.variants.map((variant) => (
                                                    <TableRow key={`${product.id}-${variant.id}`}>
                                                        <TableCell>
                                                            <Checkbox
                                                                checked={isProductSelected(product, variant.id)}
                                                                onCheckedChange={() => toggleProduct(product, variant.id)}
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-sm text-muted-foreground">{variant.sku}</span>
                                                                <Badge variant="outline" className="text-xs">Variant</Badge>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <span className="text-sm">{variant.retail_price?.toLocaleString('vi-VN') || '0'}₫</span>
                                                        </TableCell>
                                                        <TableCell>
                                                            <span className="text-sm">{variant.wholesale_price?.toLocaleString('vi-VN') || '0'}₫</span>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </React.Fragment>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        )}
                    </div>

                    {selectedProducts.size > 0 && (
                        <div className="text-sm text-muted-foreground">
                            Đã chọn: {selectedProducts.size} sản phẩm
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Hủy</Button>
                    <Button 
                        onClick={handleConfirm} 
                        disabled={selectedProducts.size === 0}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                        Thêm {selectedProducts.size > 0 ? `${selectedProducts.size} ` : ''}sản phẩm
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
