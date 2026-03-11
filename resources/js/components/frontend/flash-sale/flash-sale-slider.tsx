import React from 'react';
import { Link, usePage } from '@inertiajs/react';
import { Star } from 'lucide-react';
import { AddToCartButton } from '@/components/frontend/cart';
import GenericSlider from '@/components/frontend/sliders/generic-slider';
import { buildProductUrl } from '@/lib/url-helper';

interface Product {
    id: number;
    name: string;
    image: string;
    canonical?: string;
    price: number;
    original_price?: number;
    sale_price?: number;
    discount_amount?: number;
    discount_percent?: number;
    has_discount?: boolean;
    badge?: 'sale' | 'best_sale' | 'new' | null;
    rating?: number;
    review_count?: number;
    sold?: number;
    total_stock?: number;
    has_variants?: boolean;
    variants?: Array<{
        id: number;
        name: string;
        price: number;
        stock?: number;
    }>;
}

interface Props {
    products?: Product[];
    itemsPerView?: number;
    autoplay?: boolean;
    autoplayInterval?: number;
    loop?: boolean;
}

export default function FlashSaleSlider({
    products: propProducts,
    itemsPerView = 6,
    autoplay = false,
    autoplayInterval = 4000,
    loop = true,
}: Props) {
    const { widgets, settings } = usePage<any>().props;
    const urlType = settings?.url_type || 'slug';
    const products: Product[] = propProducts || widgets?.flashSale?.items_data || [];

    // Format price in VND
    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
            maximumFractionDigits: 0
        }).format(price);
    };

    if (!products || products.length === 0) {
        return null;
    }

    const renderProductCard = (product: Product) => {
        const productUrl = buildProductUrl(product.canonical, urlType);

        return (
            <div className="border border-gray-200 rounded-xl p-3 flex flex-col relative group bg-white hover:shadow-lg transition-shadow duration-300 h-full">
                {/* Sale Badge - Top Left */}
                {product.has_discount && product.discount_percent && product.discount_percent > 0 && (
                    <div className="absolute top-3 left-3 z-10">
                        <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
                            -{product.discount_percent}%
                        </span>
                    </div>
                )}

                {/* Add to Cart Button - Top Right */}
                <div className="absolute top-3 right-3 z-10">
                    <AddToCartButton
                        productId={product.id}
                        productName={product.name}
                        productPrice={product.sale_price ?? product.price}
                        hasVariants={product.has_variants || false}
                        variants={product.variants}
                        buttonText="Thêm"
                        className="px-3 h-7 text-xs"
                    />
                </div>

                {/* Image - Linked */}
                <Link href={productUrl} className="relative w-full aspect-square mb-3 flex items-center justify-center">
                    <img
                        src={product.image || '/images/placeholder.png'}
                        alt={product.name}
                        className="w-full h-full object-contain p-2 transition-transform duration-300 group-hover:scale-105"
                    />
                </Link>

                {/* Content */}
                <div className="flex flex-col flex-grow">
                    {/* Price */}
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-base font-bold text-red-600">
                            {formatPrice(product.sale_price ?? product.price)}
                        </span>
                        {product.original_price && product.original_price > (product.sale_price ?? product.price) && (
                            <span className="text-xs text-gray-400 line-through">
                                {formatPrice(product.original_price)}
                            </span>
                        )}
                    </div>

                    {/* Rating */}
                    <div className="flex items-center gap-1 mb-2">
                        <Star className="w-2.5 h-2.5 text-orange-400 fill-orange-400" />
                        <span className="text-xs font-bold text-gray-700">{product.rating || 5.0}</span>
                        <span className="text-xs text-gray-400">
                            ({product.review_count ? (product.review_count > 1000 ? (product.review_count / 1000).toFixed(0) + 'k' : product.review_count) : '0'})
                        </span>
                    </div>

                    {/* Title - Linked */}
                    <Link href={productUrl}>
                        <h3 className="text-sm font-medium text-[#121535] line-clamp-2 mb-3 group-hover:text-primary transition-colors cursor-pointer" title={product.name}>
                            {product.name}
                        </h3>
                    </Link>

                    {/* Progress Bar - stock based */}
                    <div className="mt-auto">
                        <div className="w-full bg-gray-100 rounded-full h-1.5 mb-1.5 overflow-hidden">
                            <div
                                className="h-full rounded-full"
                                style={{
                                    width: `${product.total_stock && product.total_stock > 0 ? ((product.sold || 0) / product.total_stock) * 100 : 0}%`,
                                    backgroundColor: 'rgb(28, 121, 155)'
                                }}
                            />
                        </div>
                        <div className="text-xs text-slate-500 font-medium">
                            Đã bán: {product.sold || 0}/{product.total_stock || 0}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <section className="py-8">
            <div className="container mx-auto px-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-[#121535]">Giảm Giá Hôm Nay</h2>
                    <Link href="/khuyen-mai" className="text-sm font-medium text-slate-600 hover:text-primary transition-colors">
                        Xem tất cả
                    </Link>
                </div>

                {/* Slider */}
                <GenericSlider
                    items={products}
                    renderItem={renderProductCard}
                    itemsPerView={itemsPerView}
                    gap={16}
                    autoplay={autoplay}
                    autoplayInterval={autoplayInterval}
                    loop={loop}
                    showArrows={true}
                />
            </div>
        </section>
    );
}

