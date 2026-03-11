import React, { useState, useEffect } from 'react';
import { Link, usePage } from '@inertiajs/react';
import { Star } from 'lucide-react';
import { buildProductUrl } from '@/lib/url-helper';
import { AddToCartButton } from '@/components/frontend/cart';
import { ClientReviews } from '@/components/frontend/product/client-reviews';

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
    sold?: number;
    total_stock?: number;
    brand_name?: string;
    promotion_end_date?: string;
    has_variants?: boolean;
    variants?: any[];
    product_catalogues?: { name: string }[];
    category_name?: string;
    category_canonical?: string;
    created_at?: string; // Added for New badge
}

interface Props {
    product: Product;
    className?: string;
}

const CountdownTimer = ({ endDate }: { endDate: string }) => {
    const [timeLeft, setTimeLeft] = useState({
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
    });

    useEffect(() => {
        const calculateTimeLeft = () => {
            const end = new Date(endDate).getTime();
            const now = new Date().getTime();
            const difference = end - now;

            let timeLeft = { days: 0, hours: 0, minutes: 0, seconds: 0 };

            if (difference > 0) {
                timeLeft = {
                    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
                    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
                    minutes: Math.floor((difference / 1000 / 60) % 60),
                    seconds: Math.floor((difference / 1000) % 60),
                };
            }
            return timeLeft;
        };

        setTimeLeft(calculateTimeLeft());
        const timer = setInterval(() => {
            const t = calculateTimeLeft();
            setTimeLeft(t);
            if (Object.keys(t).every(k => t[k as keyof typeof t] === 0)) {
                clearInterval(timer);
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [endDate]);

    if (!endDate) return null;

    return (
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-gray-600 bg-cyan-50/50 rounded-md px-2 py-1.5 w-full justify-between sm:justify-start">
            <div className="flex flex-col items-center leading-none">
                <span className="text-emerald-600 font-bold mb-0.5">{timeLeft.days}</span>
                <span className="text-[9px] text-gray-400">Days</span>
            </div>
            <span className="text-gray-300 mx-0.5">:</span>
            <div className="flex flex-col items-center leading-none">
                <span className="text-emerald-600 font-bold mb-0.5">{timeLeft.hours}</span>
                <span className="text-[9px] text-gray-400">Hours</span>
            </div>
            <span className="text-gray-300 mx-0.5">:</span>
            <div className="flex flex-col items-center leading-none">
                <span className="text-emerald-600 font-bold mb-0.5">{timeLeft.minutes}</span>
                <span className="text-[9px] text-gray-400">Min</span>
            </div>
            <span className="text-gray-300 mx-0.5">:</span>
            <div className="flex flex-col items-center leading-none">
                <span className="text-emerald-600 font-bold mb-0.5">{timeLeft.seconds}</span>
                <span className="text-[9px] text-gray-400">Sec</span>
            </div>
        </div>
    );
};

export default function ProductItemDailyBestSell({ product, className = '' }: Props) {
    const { settings } = usePage<any>().props;
    const urlType = settings?.url_type || 'slug';
    const productUrl = buildProductUrl(product.canonical, urlType);
    const displayPrice = product.sale_price ?? product.price ?? 0;
    const originalPrice = product.original_price ?? product.price ?? 0;
    const hasSale = product.has_discount || (product.sale_price && product.sale_price < originalPrice);
    const percent = product.discount_percent || (originalPrice > 0 ? Math.round(((originalPrice - displayPrice) / originalPrice) * 100) : 0);

    // Badge Logic
    const isNew = product.created_at ? (new Date().getTime() - new Date(product.created_at).getTime()) / (1000 * 60 * 60 * 24) < 7 : false;
    const isBestSell = (product.sold || 0) > 100; // Example threshold

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
            maximumFractionDigits: 0
        }).format(price);
    };

    return (
        <div className={`bg-white border border-gray-100 rounded-xl p-4 flex gap-5 items-center hover:shadow-lg transition-shadow relative overflow-hidden group h-full ${className}`}>
            {/* Left Column: Image (50%) */}
            <div className="w-1/2 flex flex-col relative shrink-0">
                {/* Badges Container */}
                <div className="absolute -top-1 -left-1 z-10 flex flex-col gap-1 items-start">
                    {hasSale && percent > 0 && (
                        <div className="bg-red-600 text-white text-[11px] font-bold px-2.5 py-1 rounded-tl-lg rounded-br-lg shadow-sm">
                            Giảm {percent}%
                        </div>
                    )}
                    {!hasSale && isNew && (
                        <div className="bg-blue-500 text-white text-[11px] font-bold px-2.5 py-1 rounded-tl-lg rounded-br-lg shadow-sm">
                            New
                        </div>
                    )}
                    {!hasSale && !isNew && isBestSell && (
                        <div className="bg-orange-500 text-white text-[11px] font-bold px-2.5 py-1 rounded-tl-lg rounded-br-lg shadow-sm">
                            Best Sell
                        </div>
                    )}
                </div>


                {/* Image Container */}
                <Link href={productUrl} className={`w-full aspect-square flex items-center justify-center ${product.promotion_end_date ? 'mb-3' : ''}`}>
                    <img
                        src={product.image || '/images/placeholder.png'}
                        alt={product.name}
                        className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform duration-300"
                    />
                </Link>
            </div>

            {/* Right Column: Info (50%) */}
            <div className="w-1/2 flex flex-col min-w-0">
                {/* Prices */}
                <div className="flex items-baseline gap-2 mb-1 flex-wrap">
                    <span className="text-emerald-700 font-bold text-lg">
                        {formatPrice(displayPrice)}
                    </span>
                    {hasSale && originalPrice > displayPrice && (
                        <span className="text-xs text-gray-400 line-through">
                            {formatPrice(originalPrice)}
                        </span>
                    )}
                </div>

                {/* Rating */}
                <div className="mb-2">
                    <ClientReviews
                        averageRating={product.rating}
                        reviewsCount={product.review_count}
                        size="sm"
                    />
                </div>

                {/* Name */}
                <Link href={productUrl}>
                    <h3 className="text-[15px] font-bold text-gray-800 line-clamp-2 mb-1 hover:text-emerald-600 transition-colors leading-snug">
                        {product.name}
                    </h3>
                </Link>

                {/* Brand/Category */}
                <div className="text-xs text-gray-500 mb-3 flex items-center gap-1">
                    By <Link
                        href={product.category_canonical ? `/${product.category_canonical}.html` : '#'}
                        className="text-emerald-600 font-medium hover:underline cursor-pointer"
                    >
                        {product.category_name || product.product_catalogues?.[0]?.name || product.brand_name || 'Daily Sells'}
                    </Link>
                </div>

                {/* Sold Progress */}
                <div className="mb-4">
                    <div className="flex justify-between items-center text-[11px] text-gray-600 mb-1">
                        <span>Sold: <span className="font-medium text-gray-900">{product.sold || 0}/{product.total_stock || 100}</span></span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                        <div
                            className="bg-emerald-500 h-1.5 rounded-full"
                            style={{ width: `${Math.min(((product.sold || 0) / (product.total_stock || 1)) * 100, 100)}%` }}
                        ></div>
                    </div>
                </div>

                {/* Countdown & Add to Cart - Same Row */}
                <div className="mt-auto flex items-center gap-3 flex-wrap">
                    {product.promotion_end_date && (
                        <div className="flex-1 min-w-[140px]">
                            <CountdownTimer endDate={product.promotion_end_date} />
                        </div>
                    )}
                    <div className={product.promotion_end_date ? 'flex-1' : 'w-full'}>
                        <AddToCartButton
                            productId={product.id}
                            productName={product.name}
                            productPrice={displayPrice}
                            hasVariants={product.has_variants || false}
                            variants={product.variants}
                            buttonText="Thêm vào giỏ hàng"
                            className="w-full justify-center"
                            showIcon={true}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
