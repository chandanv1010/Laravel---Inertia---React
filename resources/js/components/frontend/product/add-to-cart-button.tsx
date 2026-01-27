import React from 'react';
import { ShoppingCart } from 'lucide-react';
import { usePage } from '@inertiajs/react';

interface Props {
    productId: number;
    productName: string;
    hasVariants?: boolean;
    variants?: any[];
    buttonText?: string;
    className?: string;
    showIcon?: boolean;
    onClick?: (e: React.MouseEvent) => void;
}

export default function AddToCartButton({
    productId,
    productName,
    hasVariants,
    variants,
    buttonText = "Thêm vào giỏ hàng",
    className,
    showIcon = true,
    onClick
}: Props) {
    // Note: detailed cart logic (addToCart function) can be connected here or passed via onClick.
    // For now, we focus on the UI component as requested, reusing the style from DailyBestSells.

    const handleClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (onClick) {
            onClick(e);
        } else {
            // Dispatch generic cart event or log for now if no handler provided
            console.log(`Add to cart: ${productName} (${productId})`);
        }
    };

    return (
        <button
            onClick={handleClick}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200 border border-emerald-100 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white hover:shadow-md cursor-pointer ${className || ''}`}
        >
            {showIcon && <ShoppingCart className="w-4 h-4" />}
            {buttonText}
        </button>
    );
}
