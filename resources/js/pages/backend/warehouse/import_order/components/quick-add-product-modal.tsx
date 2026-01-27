import { useState, useCallback } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { PriceInput } from '@/components/price-input';
import { NumberInput } from '@/components/number-input';

interface QuickAddProductModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onProductCreated?: (product: any) => void;
    catalogues?: Array<{ value: string | number; label: string }>;
}

export function QuickAddProductModal({ 
    open, 
    onOpenChange, 
    onProductCreated,
    catalogues = []
}: QuickAddProductModalProps) {
    const [name, setName] = useState('');
    const [sku, setSku] = useState('');
    const [barcode, setBarcode] = useState('');
    const [costPrice, setCostPrice] = useState(0);
    const [quantity, setQuantity] = useState(1);
    const [retailPrice, setRetailPrice] = useState(0);
    const [productCatalogueId, setProductCatalogueId] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

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
            const errorData = await response.json().catch(() => ({}));
            throw { status: response.status, data: errorData };
        }
        return response.json();
    }, [getCookie]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Validation
        const newErrors: Record<string, string> = {};
        if (!name.trim()) {
            newErrors.name = 'Tên sản phẩm là bắt buộc';
        }
        
        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setIsSubmitting(true);
        setErrors({});

        try {
            const payload = {
                name,
                sku: sku || undefined,
                barcode: barcode || undefined,
                cost_price: costPrice,
                retail_price: retailPrice,
                wholesale_price: costPrice, // Giá nhập = giá vốn
                stock_quantity: quantity,
                product_catalogue_id: productCatalogueId || null,
                track_inventory: true,
                publish: '1',
            };

            const response = await apiFetch('/backend/product/quick-add', {
                method: 'POST',
                body: JSON.stringify(payload),
            });

            // Reset form
            setName('');
            setSku('');
            setBarcode('');
            setCostPrice(0);
            setQuantity(1);
            setRetailPrice(0);
            setProductCatalogueId('');
            setErrors({});

            // Callback với product mới
            if (onProductCreated && response && response.success && response.data) {
                onProductCreated(response.data);
            } else if (response && !response.success) {
                throw { data: { errors: response.errors || { submit: response.message || 'Không thể tạo sản phẩm' } } };
            }

            onOpenChange(false);
        } catch (error: any) {
            console.error("Failed to create product", error);
            if (error.data && error.data.errors) {
                setErrors(error.data.errors);
            } else {
                setErrors({ submit: 'Không thể tạo sản phẩm. Vui lòng thử lại.' });
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        if (!isSubmitting) {
            setName('');
            setSku('');
            setBarcode('');
            setCostPrice(0);
            setQuantity(1);
            setRetailPrice(0);
            setProductCatalogueId('');
            setErrors({});
            onOpenChange(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="wide-modal">
                <DialogHeader>
                    <DialogTitle className="font-normal">Thêm nhanh sản phẩm</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        {/* Tên sản phẩm - Full width */}
                        <div className="col-span-2 space-y-2">
                            <Label htmlFor="name" className="text-sm font-normal">
                                Tên sản phẩm <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Nhập tên sản phẩm"
                                className="font-normal"
                                required
                            />
                            {errors.name && (
                                <p className="text-xs text-red-500">{errors.name}</p>
                            )}
                        </div>

                        {/* Mã sản phẩm/SKU */}
                        <div className="space-y-2">
                            <Label htmlFor="sku" className="text-sm font-normal">
                                Mã sản phẩm/SKU
                            </Label>
                            <Input
                                id="sku"
                                value={sku}
                                onChange={(e) => setSku(e.target.value)}
                                placeholder="Nhập tay hoặc dùng máy quét"
                                className="font-normal"
                            />
                        </div>

                        {/* Mã barcode */}
                        <div className="space-y-2">
                            <Label htmlFor="barcode" className="text-sm font-normal">
                                Mã barcode
                            </Label>
                            <Input
                                id="barcode"
                                value={barcode}
                                onChange={(e) => setBarcode(e.target.value)}
                                placeholder="Nhập tay hoặc dùng máy quét"
                                className="font-normal"
                            />
                        </div>

                        {/* Giá vốn */}
                        <div className="space-y-2">
                            <Label htmlFor="cost_price" className="text-sm font-normal">
                                Giá vốn
                            </Label>
                            <div className="relative">
                                <PriceInput
                                    id="cost_price"
                                    value={costPrice}
                                    onValueChange={setCostPrice}
                                    className="font-normal pr-8"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">₫</span>
                            </div>
                        </div>

                        {/* Số lượng nhập */}
                        <div className="space-y-2">
                            <Label htmlFor="quantity" className="text-sm font-normal">
                                Số lượng nhập
                            </Label>
                            <NumberInput
                                id="quantity"
                                value={quantity}
                                onValueChange={setQuantity}
                                className="font-normal"
                                min={1}
                            />
                        </div>

                        {/* Giá bán */}
                        <div className="space-y-2">
                            <Label htmlFor="retail_price" className="text-sm font-normal">
                                Giá bán
                            </Label>
                            <div className="relative">
                                <PriceInput
                                    id="retail_price"
                                    value={retailPrice}
                                    onValueChange={setRetailPrice}
                                    className="font-normal pr-8"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">₫</span>
                            </div>
                        </div>

                        {/* Loại sản phẩm */}
                        <div className="col-span-2 space-y-2">
                            <Label htmlFor="product_catalogue_id" className="text-sm font-normal">
                                Loại sản phẩm
                            </Label>
                            <Select value={productCatalogueId} onValueChange={setProductCatalogueId}>
                                <SelectTrigger className="w-full font-normal">
                                    <SelectValue placeholder="Chọn loại sản phẩm" />
                                </SelectTrigger>
                                <SelectContent>
                                    {catalogues.map((cat) => (
                                        <SelectItem key={cat.value} value={String(cat.value)}>
                                            {cat.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {errors.submit && (
                        <p className="text-sm text-red-500">{errors.submit}</p>
                    )}

                    <div className="flex justify-end gap-2 pt-4 border-t">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleClose}
                            disabled={isSubmitting}
                        >
                            Hủy
                        </Button>
                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Đang tạo...
                                </>
                            ) : (
                                'Thêm'
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
