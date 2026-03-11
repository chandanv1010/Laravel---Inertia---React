import React, { useState, useEffect } from 'react';
import { Minus, Plus, ShoppingCart } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Variant {
    id: number;
    name: string;
    sku?: string;
    price: number;
    original_price?: number;
    stock?: number;
    image?: string;
    attributes?: Record<string, string>;
}

interface VariantSelectionDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (variantId: number, quantity: number) => void;
    productName: string;
    productPrice?: number;
    variants: Variant[];
}

export default function VariantSelectionDialog({
    isOpen,
    onClose,
    onSelect,
    productName,
    productPrice = 0,
    variants
}: VariantSelectionDialogProps) {
    const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);
    const [quantity, setQuantity] = useState(1);

    // Reset state when dialog opens
    useEffect(() => {
        if (isOpen) {
            setSelectedVariantId(null);
            setQuantity(1);
        }
    }, [isOpen]);

    const handleQuantityChange = (newQuantity: number) => {
        if (newQuantity < 1) return;

        // If a variant is selected, check its stock
        if (selectedVariantId) {
            const variant = variants.find(v => v.id === selectedVariantId);
            if (variant && variant.stock !== undefined && newQuantity > variant.stock) {
                setQuantity(variant.stock);
                return;
            }
        }

        setQuantity(newQuantity);
    };

    const handleAddToCart = () => {
        if (selectedVariantId) {
            onSelect(selectedVariantId, quantity);
        }
    };
    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(price);
    };

    const displayPrice = (variantPrice: number) => {
        return variantPrice > 0 ? variantPrice : productPrice;
    };

    const selectedVariant = variants.find(v => v.id === selectedVariantId);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Chọn phiên bản</DialogTitle>
                    <DialogDescription>
                        Vui lòng chọn phiên bản sản phẩm "{productName}" bạn muốn mua.
                    </DialogDescription>
                </DialogHeader>

                {/* 3-column grid for variants */}
                <div className="grid grid-cols-3 gap-3 py-4">
                    {variants.map((variant) => {
                        const isSelected = selectedVariantId === variant.id;
                        return (
                            <button
                                key={variant.id}
                                onClick={() => setSelectedVariantId(variant.id)}
                                disabled={variant.stock !== undefined && variant.stock <= 0}
                                className={cn(
                                    "flex flex-col items-center p-3 border rounded-lg transition-all text-center relative",
                                    "hover:border-[#1c799b] hover:bg-[#e0fbff]/30",
                                    isSelected ? "border-[#1c799b] bg-[#e0fbff]/40 ring-1 ring-[#1c799b]" : "border-gray-200",
                                    variant.stock !== undefined && variant.stock <= 0
                                        ? "opacity-50 cursor-not-allowed bg-gray-50"
                                        : "cursor-pointer"
                                )}
                            >
                                {isSelected && (
                                    <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-[#1c799b] flex items-center justify-center">
                                        <svg viewBox="0 0 24 24" fill="none" className="w-3 h-3 text-white" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                    </div>
                                )}
                                {/* Variant Image */}
                                <div className="w-16 h-16 mb-2 rounded overflow-hidden bg-gray-100 flex items-center justify-center">
                                    {variant.image ? (
                                        <img
                                            src={variant.image}
                                            alt={variant.name}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                                            <span className="text-gray-400 text-xs">No img</span>
                                        </div>
                                    )}
                                </div>

                                {/* Variant Name & Attributes */}
                                <p className="font-medium text-gray-900 text-sm line-clamp-2 mb-1">{variant.name}</p>

                                {variant.attributes && Object.keys(variant.attributes).length > 0 && (
                                    <div className="flex flex-wrap gap-1 justify-center mb-1">
                                        {Object.entries(variant.attributes).map(([key, value]) => (
                                            <span key={key} className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                                                {value}
                                            </span>
                                        ))}
                                    </div>
                                )}

                                {/* Stock Status */}
                                {variant.stock !== undefined && (
                                    <p className={cn(
                                        "text-xs",
                                        variant.stock <= 0 ? "text-red-500" : "text-gray-500"
                                    )}>
                                        {variant.stock <= 0 ? "Hết hàng" : `Còn ${variant.stock} sp`}
                                    </p>
                                )}

                                {/* Price */}
                                <div className="mt-1 flex flex-col items-center">
                                    <span className="text-[#1c799b] font-bold text-sm">
                                        {formatPrice(displayPrice(variant.price))}
                                    </span>
                                    {variant.original_price && variant.original_price > variant.price && (
                                        <span className="text-[10px] text-gray-400 line-through">
                                            {formatPrice(variant.original_price)}
                                        </span>
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* Quantity and Action Area */}
                <div className="flex items-end justify-between border-t border-gray-100 pt-4 mt-2">
                    <div>
                        <p className="text-sm text-gray-500 mb-2">Số lượng</p>
                        <div className="flex items-center space-x-2 bg-gray-50 border border-gray-200 rounded-lg p-1">
                            <button
                                onClick={() => handleQuantityChange(quantity - 1)}
                                disabled={quantity <= 1}
                                className="w-8 h-8 flex items-center justify-center rounded bg-white shadow-sm disabled:opacity-50 hover:bg-gray-100 transition-colors"
                            >
                                <Minus className="w-4 h-4" />
                            </button>
                            <input
                                type="number"
                                min="1"
                                max={selectedVariant?.stock ?? 999}
                                value={quantity}
                                onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 1)}
                                className="w-12 h-8 text-center text-sm font-medium bg-transparent border-none focus:ring-0 p-0"
                            />
                            <button
                                onClick={() => handleQuantityChange(quantity + 1)}
                                disabled={selectedVariant ? quantity >= (selectedVariant.stock ?? 999) : false}
                                className="w-8 h-8 flex items-center justify-center rounded bg-white shadow-sm disabled:opacity-50 hover:bg-gray-100 transition-colors"
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button variant="outline" onClick={onClose} className="h-10">
                            Hủy
                        </Button>
                        <Button
                            onClick={handleAddToCart}
                            disabled={!selectedVariantId}
                            className="bg-[#1c799b] hover:bg-[#155b75] text-white h-10 px-6 font-medium gap-2"
                        >
                            Thêm vào giỏ
                            <ShoppingCart className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
