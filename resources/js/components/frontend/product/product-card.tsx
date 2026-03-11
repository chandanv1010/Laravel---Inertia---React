import React, { useEffect } from 'react';
import { Link, usePage } from '@inertiajs/react';
import { Star } from 'lucide-react';
import { AddToCartButton } from '@/components/frontend/cart';
import { buildProductUrl } from '@/lib/url-helper';

interface AppliedPromotion {
    id: number;
    name: string;
    discount: number;
    type: string;
    value: number;
}

export interface ProductCardData {
    id: number;
    name: string;
    image: string;
    canonical?: string;
    category_name?: string;
    category_canonical?: string;
    price: number;
    original_price?: number;
    sale_price?: number;
    price_sale?: number; // Alias for compatibility
    discount_amount?: number;
    discount_percent?: number;
    applied_promotions?: AppliedPromotion[];
    is_combined_discount?: boolean;
    has_discount?: boolean;
    rating?: number;
    review_count?: number;
    sold?: number;
    total_stock?: number;
    stock?: number;
    has_variants?: boolean;
    variants?: Array<{
        id: number;
        name: string;
        price: number;
        stock?: number;
    }>;
    badge?: 'sale' | 'best_sale' | 'new' | null;
}

interface ProductCardProps {
    product: ProductCardData;
    showAddToCart?: boolean;
    className?: string;
}

/**
 * ProductCard Component
 * Component hiển thị sản phẩm dạng card - tái sử dụng từ Recommended section
 */
export default function ProductCard({
    product,
    showAddToCart = true,
    className = ''
}: ProductCardProps) {
    const { settings } = usePage<any>().props;
    const urlType = settings?.url_type || 'slug';

    // Format price in VND
    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
            maximumFractionDigits: 0
        }).format(price);
    };

    const productUrl = buildProductUrl(product.canonical, urlType);

    // Handle various price field names
    const salePrice = product.sale_price ?? product.price_sale;
    const originalPrice = product.original_price ?? product.price;
    const hasSale = product.has_discount ?? (salePrice != null && salePrice < originalPrice);

    const renderBadge = () => {
        if (product.badge === 'sale' && product.discount_percent && product.discount_percent > 0) {
            return (
                <span className="absolute top-2 left-2 z-10 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
                    Sale {product.discount_percent}%
                </span>
            );
        }
        if (product.badge === 'best_sale') {
            return (
                <span className="absolute top-2 left-2 z-10 bg-teal-600 text-white text-xs font-bold px-2 py-1 rounded">
                    Best Sale
                </span>
            );
        }
        if (product.badge === 'new') {
            return (
                <span className="absolute top-2 left-2 z-10 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded">
                    New
                </span>
            );
        }
        // Show discount badge if there's a discount but no specific badge
        if (hasSale && product.discount_percent && product.discount_percent > 0) {
            return (
                <span className="absolute top-2 left-2 z-10 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
                    -{product.discount_percent}%
                </span>
            );
        }
        return null;
    };

    useEffect(() => {
        if (product) {
            console.log(product);

        }
    }, [product])

    return (
        <div
            className={`bg-white border border-gray-200 rounded-lg overflow-hidden group hover:shadow-lg transition-shadow duration-300 flex flex-col ${className}`}
        >
            {/* Image Container */}
            <div className="relative aspect-square bg-white overflow-hidden">
                {renderBadge()}

                <Link href={productUrl} className="block w-full h-full">
                    <img
                        src={product.image || '/images/placeholder.png'}
                        alt={product.name}
                        className="w-full h-full object-contain p-4 transition-transform duration-300 group-hover:scale-105"
                    />
                </Link>
            </div>

            {/* Content */}
            <div className="p-4 flex flex-col flex-grow">
                {/* Title */}
                <Link href={productUrl}>
                    <h3 className="text-sm font-medium text-gray-900 line-clamp-2 mb-2 min-h-[40px] group-hover:text-primary transition-colors">
                        {product.name}
                    </h3>
                </Link>

                {/* Category Name */}
                {/* Category Name */}
                {(product.category_name || product.category_canonical) && (
                    <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
                        <span className="w-3 h-3 bg-teal-500 rounded-sm flex items-center justify-center">
                            <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                            </svg>
                        </span>
                        <Link
                            href={product.category_canonical ? `/${product.category_canonical}.html` : '#'}
                            className="hover:text-primary hover:underline"
                            onClick={(e) => {
                                if (!product.category_canonical) e.preventDefault();
                                e.stopPropagation();
                            }}
                        >
                            {product.category_name || 'Danh mục'}
                        </Link>
                    </div>
                )}

                {/* Price */}
                <div className="flex items-baseline gap-2 flex-wrap mb-2">
                    <span className="text-base font-bold text-gray-900">
                        {formatPrice(hasSale ? salePrice! : originalPrice)}
                    </span>
                    {hasSale && (
                        <span className="text-xs text-gray-400 line-through">
                            {formatPrice(originalPrice)}
                        </span>
                    )}
                </div>

                {/* Rating */}
                <div className="flex items-center gap-1 mb-3">
                    <span className="text-sm font-medium text-gray-700">{product.rating || 5.0}</span>
                    <Star className="w-2.5 h-2.5 text-orange-400 fill-orange-400" />
                    <span className="text-xs text-gray-400">
                        ({product.review_count ?
                            (product.review_count > 1000 ?
                                Math.round(product.review_count / 1000) + 'k' :
                                product.review_count
                            ) : '0'
                        })
                    </span>
                </div>

                {/* Add to Cart Button */}
                {showAddToCart && (
                    <div className="mt-auto">
                        <AddToCartButton
                            productId={product.id}
                            productName={product.name}
                            productPrice={hasSale ? salePrice! : originalPrice}
                            hasVariants={product.has_variants || false}
                            variants={product.variants}
                            buttonText="Thêm vào giỏ hàng"
                            showIcon={true}
                            className="w-full justify-center"
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
