import { useState, useEffect, useCallback } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Loader2, Package } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

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

interface ProductSearchModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSelectProduct: (product: Product, variantId?: number) => void;
}

export function ProductSearchModal({ open, onOpenChange, onSelectProduct }: ProductSearchModalProps) {
    const [searchValue, setSearchValue] = useState("");
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(false);

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
            const response = await apiFetch(`/backend/product?keyword=${encodeURIComponent(query)}&type=all&publish=2&per_page=20`);
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

    const handleSelectProduct = (product: Product, variantId?: number) => {
        onSelectProduct(product, variantId);
        setSearchValue("");
        setProducts([]);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="wide-modal max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle className="font-normal">Tìm kiếm sản phẩm</DialogTitle>
                </DialogHeader>

                <div className="flex flex-col flex-1 min-h-0 space-y-4">
                    <div className="relative shrink-0">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Tìm theo tên, mã SKU, quét mã Barcode... (F3)"
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
                                        <TableHead className="w-[50px]">Hình</TableHead>
                                        <TableHead>Tên sản phẩm</TableHead>
                                        <TableHead>SKU</TableHead>
                                        <TableHead>Giá bán</TableHead>
                                        <TableHead>Giá nhập</TableHead>
                                        <TableHead className="w-[100px]">Thao tác</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {products.map((product) => (
                                        <TableRow key={product.id}>
                                            <TableCell>
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
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{product.name}</span>
                                                    {product.variants && product.variants.length > 0 && (
                                                        <div className="flex gap-1 mt-1">
                                                            {product.variants.map((variant) => (
                                                                <Badge 
                                                                    key={variant.id} 
                                                                    variant="outline"
                                                                    className="text-xs cursor-pointer hover:bg-blue-50"
                                                                    onClick={() => handleSelectProduct(product, variant.id)}
                                                                >
                                                                    {variant.sku}
                                                                </Badge>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <span className="text-sm text-muted-foreground">{product.sku}</span>
                                            </TableCell>
                                            <TableCell>
                                                <span className="text-sm">{product.retail_price?.toLocaleString('vi-VN') || '0'}₫</span>
                                            </TableCell>
                                            <TableCell>
                                                <span className="text-sm">{product.wholesale_price?.toLocaleString('vi-VN') || '0'}₫</span>
                                            </TableCell>
                                            <TableCell>
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleSelectProduct(product)}
                                                >
                                                    Chọn
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
