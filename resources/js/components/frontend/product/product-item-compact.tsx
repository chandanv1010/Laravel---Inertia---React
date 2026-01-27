import React from 'react';
import { Link, usePage } from '@inertiajs/react';
import { Star } from 'lucide-react';
import { buildProductUrl } from '@/lib/url-helper';

interface ProductItemCompactProps {
    product: {
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
    };
    showRating?: boolean;
}

/**
 * Format giá tiền VND - xử lý NaN
 */
function formatPrice(price: number): string {
    if (isNaN(price) || price === null || price === undefined) {
        return '0 ₫';
    }
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0
    }).format(price);
}

/**
 * Component hiển thị sản phẩm dạng compact (nhỏ gọn)
 * Ảnh bên trái (60px), thông tin bên phải
 * Sử dụng cho: Featured Products, Top Selling, On-sale Products widgets
 */
export default function ProductItemCompact({ product, showRating = true }: ProductItemCompactProps) {
    const { settings } = usePage<any>().props;
    const urlType = settings?.url_type || 'slug';
    const productUrl = buildProductUrl(product.canonical, urlType);

    // Sử dụng sale_price nếu có, ngược lại dùng price - giống FlashSaleSlider
    const displayPrice = product.sale_price ?? product.price ?? 0;
    const originalPrice = product.original_price ?? product.price ?? 0;
    const hasSale = product.has_discount || (product.sale_price && product.sale_price < originalPrice);

    const formatReviewCount = (count: number) => {
        if (count >= 1000) {
            return Math.floor(count / 1000) + 'k';
        }
        return count?.toString() || '0';
    };

    return (
        <Link
            href={productUrl}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors group"
        >
            {/* Ảnh sản phẩm */}
            <div className="w-14 h-14 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                <img
                    src={product.image || '/images/placeholder.png'}
                    alt={product.name}
                    className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                />
            </div>

            {/* Thông tin sản phẩm */}
            <div className="flex-1 min-w-0">
                {/* Rating */}
                {showRating && (
                    <div className="flex items-center gap-1 mb-0.5">
                        <span className="text-xs font-medium text-gray-700">
                            {product.rating?.toFixed(1) || '5.0'}
                        </span>
                        <Star className="w-2.5 h-2.5 text-orange-400 fill-orange-400" />
                        <span className="text-xs text-gray-400">
                            ({formatReviewCount(product.review_count || 0)})
                        </span>
                    </div>
                )}

                {/* Tên sản phẩm */}
                <h4 className="text-sm font-medium text-gray-900 line-clamp-1 group-hover:text-[#1c799b] transition-colors">
                    {product.name}
                </h4>

                {/* Giá */}
                <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-sm font-bold text-gray-900">
                        {formatPrice(displayPrice)}
                    </span>
                    {hasSale && originalPrice > displayPrice && (
                        <span className="text-xs text-gray-400 line-through">
                            {formatPrice(originalPrice)}
                        </span>
                    )}
                </div>
            </div>
        </Link>
    );
}
