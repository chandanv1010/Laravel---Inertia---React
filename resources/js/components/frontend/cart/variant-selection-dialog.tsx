import React from 'react';
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
    price: number;
    stock?: number;
    image?: string;
}

interface VariantSelectionDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (variantId: number) => void;
    productName: string;
    variants: Variant[];
}

export default function VariantSelectionDialog({
    isOpen,
    onClose,
    onSelect,
    productName,
    variants
}: VariantSelectionDialogProps) {
    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(price);
    };

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
                    {variants.map((variant) => (
                        <button
                            key={variant.id}
                            onClick={() => onSelect(variant.id)}
                            disabled={variant.stock !== undefined && variant.stock <= 0}
                            className={cn(
                                "flex flex-col items-center p-3 border rounded-lg transition-all text-center",
                                "hover:border-[#1c799b] hover:bg-[#e0fbff]/30",
                                variant.stock !== undefined && variant.stock <= 0
                                    ? "opacity-50 cursor-not-allowed bg-gray-50"
                                    : "cursor-pointer"
                            )}
                        >
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

                            {/* Variant Name */}
                            <p className="font-medium text-gray-900 text-sm line-clamp-2 mb-1">{variant.name}</p>

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
                            <span className="text-[#1c799b] font-bold text-sm mt-1">
                                {formatPrice(variant.price)}
                            </span>
                        </button>
                    ))}
                </div>

                <div className="flex justify-end">
                    <Button variant="outline" onClick={onClose}>
                        Hủy
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
