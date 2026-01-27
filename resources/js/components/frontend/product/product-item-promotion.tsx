import React from 'react';
import { Link, usePage } from '@inertiajs/react';
import { ShoppingCart, Star } from 'lucide-react';
import { buildProductUrl } from '@/lib/url-helper';
import { AddToCartButton } from '@/components/frontend/cart';

interface Product {
    id: number;
    name: string;
    image: string;
    canonical?: string;
    price: number;
    original_price?: number;
    sale_price?: number;
    discount_percent?: number;
    has_discount?: boolean;
    rating?: number;
    review_count?: number;
    sold_count?: number;
    total_stock?: number;
    has_variants?: boolean;
    variants?: any[];
}

interface ProductItemPromotionProps {
    product: Product;
    className?: string;
}

export default function ProductItemPromotion({ product, className = '' }: ProductItemPromotionProps) {
    const { settings } = usePage<any>().props;
    const urlType = settings?.url_type || 'slug';
    const productUrl = buildProductUrl(product.canonical, urlType);

    // Format price
    const formatPrice = (price: number) => {
        if (isNaN(price) || price === null || price === undefined) return '0 ₫';
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
            maximumFractionDigits: 0
        }).format(price);
    };

    // Calculate display price
    const finalPrice = product.has_discount ? (product.sale_price ?? product.price) : product.price;
    const originalPrice = product.original_price ?? (product.has_discount ? product.price : undefined);

    return (
        <div className={`bg-white rounded-xl shadow-sm overflow-hidden flex flex-col h-full group ${className}`}>
            <div className="relative p-3 flex-1 flex flex-col">
                {/* Discount Badge */}
                {product.has_discount && product.discount_percent && (
                    <div className="absolute top-3 left-3 z-10 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
                        -{product.discount_percent}%
                    </div>
                )}

                {/* Quick Add Cart Button (Top Right) */}
                <div className="absolute top-3 right-3 z-10">
                    <AddToCartButton
                        productId={product.id}
                        productName={product.name}
                        hasVariants={product.has_variants || false}
                        variants={product.variants}
                        buttonText="Thêm"
                        className="!px-3 !py-1 !text-xs !h-auto" // Resize to fit but keep colors
                        showIcon={true}
                    />
                </div>

                {/* Product Image - Validated: scale-down with padding */}
                <Link href={productUrl} className="block aspect-square w-full mb-3 flex items-center justify-center p-2">
                    <img
                        src={product.image || '/images/placeholder.png'}
                        alt={product.name}
                        className="w-full h-full object-scale-down transition-transform duration-300 group-hover:scale-105"
                    />
                </Link>

                {/* Price Info */}
                <div className="mt-auto">
                    <div className="flex items-center flex-wrap gap-2 mb-1">
                        <span className="text-red-600 font-bold text-lg">
                            {formatPrice(finalPrice)}
                        </span>
                        {originalPrice && originalPrice > finalPrice && (
                            <span className="text-gray-400 text-sm line-through decoration-gray-400">
                                {formatPrice(originalPrice)}
                            </span>
                        )}
                    </div>

                    {/* Rating - Fixed: Render actual stars based on rating */}
                    <div className="flex items-center gap-1 mb-2">
                        <span className="font-bold text-slate-700 text-sm">{product.rating || 5}</span>
                        <div className="flex items-center">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                    key={star}
                                    className={`w-2.5 h-2.5 ${star <= (product.rating || 5)
                                        ? 'fill-yellow-400 text-yellow-400'
                                        : 'text-gray-300'
                                        }`}
                                />
                            ))}
                        </div>
                        <span className="text-gray-400 text-xs">({product.review_count || 0})</span>
                    </div>

                    {/* Product Name - Increased font size */}
                    <Link href={productUrl} className="block mb-2">
                        <h3 className="font-medium text-slate-800 text-[15px] leading-snug line-clamp-2 hover:text-emerald-600 transition-colors" title={product.name}>
                            {product.name}
                        </h3>
                    </Link>

                    {/* Sold Count - Restored */}
                    <div className="mt-2 text-xs text-gray-500 bg-gray-50 rounded px-2 py-1 inline-block">
                        Đã bán: {product.sold_count || 0}/{product.total_stock || 100}
                    </div>
                </div>
            </div>
        </div>
    );
}
