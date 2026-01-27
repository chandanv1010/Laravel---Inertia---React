import React from 'react';
import { Link, usePage } from '@inertiajs/react';
import { Star } from 'lucide-react';
import { buildProductUrl } from '@/lib/url-helper';
import GenericSlider from '@/components/frontend/sliders/generic-slider';

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
}

interface ProductBlockProps {
    title: string;
    products: Product[];
    className?: string;
}

export default function ProductBlock({ title, products, className = '' }: ProductBlockProps) {
    const { settings } = usePage<any>().props;
    const urlType = settings?.url_type || 'slug';
    const sliderRef = React.useRef<any>(null);

    // Chia products thành các nhóm 5 sản phẩm
    const groupedProducts: Product[][] = [];
    const itemsPerGroup = 5;
    for (let i = 0; i < products.length; i += itemsPerGroup) {
        groupedProducts.push(products.slice(i, i + itemsPerGroup));
    }

    const formatPrice = (price: number) => {
        if (isNaN(price) || price === null || price === undefined) return '0 ₫';
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
            maximumFractionDigits: 0
        }).format(price);
    };

    const ProductItemCompact = ({ product }: { product: Product }) => {
        const productUrl = buildProductUrl(product.canonical, urlType);
        const displayPrice = product.sale_price ?? product.price ?? 0;
        const originalPrice = product.original_price ?? product.price ?? 0;
        const hasSale = product.has_discount || (product.sale_price && product.sale_price < originalPrice);

        return (
            <Link
                href={productUrl}
                className="flex items-start gap-4 group py-1"
            >
                {/* Image - Size 85x85, ensure contain */}
                <div className="w-[85px] h-[85px] flex-shrink-0 rounded-lg overflow-hidden bg-white border border-gray-100 p-1 flex items-center justify-center">
                    <img
                        src={product.image || '/images/placeholder.png'}
                        alt={product.name}
                        className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform duration-300"
                    />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 pt-0.5">
                    {/* Rating */}
                    <div className="flex items-center gap-1 mb-1">
                        <span className="text-xs font-bold text-gray-900">{product.rating || 5.0}</span>
                        <div className="flex items-center">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <Star
                                    key={i}
                                    className={`w-2.5 h-2.5 ${i <= Math.round(product.rating || 5) ? 'text-orange-400 fill-orange-400' : 'text-gray-200 fill-gray-200'}`}
                                />
                            ))}
                        </div>
                        <span className="text-xs text-gray-400">
                            ({product.review_count && product.review_count > 1000
                                ? (product.review_count / 1000).toFixed(1) + 'k'
                                : product.review_count || 0})
                        </span>
                    </div>

                    {/* Product Name */}
                    <h4 className="text-[15px] font-medium text-gray-800 line-clamp-2 leading-snug group-hover:text-emerald-600 transition-colors mb-1">
                        {product.name}
                    </h4>

                    {/* Price */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[15px] font-bold ${hasSale ? 'text-emerald-600' : 'text-gray-900'}`}>
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
    };

    const renderProductGroup = (group: Product[]) => (
        <div className="space-y-4 px-1 py-1">
            {group.map((product) => (
                <ProductItemCompact key={product.id} product={product} />
            ))}
        </div>
    );

    // Check if slider navigation is needed
    const showNav = groupedProducts.length > 1;

    return (
        <div className={`bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden h-full flex flex-col ${className}`}>
            {/* Header Style with Navigation Arrows */}
            <div className="px-5 pt-5 pb-2">
                <div className="relative border-b border-gray-100 pb-3 flex justify-between items-center">
                    <div>
                        <h3 className="text-[18px] font-bold text-gray-800">
                            {title}
                        </h3>
                        {/* Underline */}
                        <div className="absolute -bottom-[1px] left-0 w-16 h-[2px] bg-emerald-500"></div>
                    </div>

                    {/* External Navigation Arrows */}
                    {showNav && (
                        <div className="flex gap-1.5 z-10">
                            <button
                                onClick={() => sliderRef.current?.scrollTo('left')}
                                className="w-6 h-6 flex items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 transition-colors cursor-pointer"
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                            </button>
                            <button
                                onClick={() => sliderRef.current?.scrollTo('right')}
                                className="w-6 h-6 flex items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 transition-colors cursor-pointer"
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Slider Content */}
            <div className="p-5 flex-1">
                {products.length > 0 ? (
                    <GenericSlider
                        ref={sliderRef}
                        items={groupedProducts}
                        renderItem={renderProductGroup}
                        itemsPerView={1}
                        gap={0}
                        autoplay={false}
                        loop={true}
                        showArrows={false} // Disable internal arrows
                    />
                ) : (
                    <p className="text-sm text-gray-400 text-center py-8">Chưa có sản phẩm</p>
                )}
            </div>
        </div>
    );
}
