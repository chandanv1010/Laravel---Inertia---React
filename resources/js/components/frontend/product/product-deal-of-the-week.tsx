import React, { useState, useEffect } from 'react';
import { Link, usePage } from '@inertiajs/react';
import { Star, ShoppingCart } from 'lucide-react';
import { AddToCartButton } from '@/components/frontend/cart';
import { buildProductUrl } from '@/lib/url-helper';

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
    has_variants?: boolean;
    variants?: any[];
}

interface ProductDealOfTheWeekProps {
    product?: Product;
    title?: string;
    className?: string;
}

export default function ProductDealOfTheWeek({
    product,
    title = "Sản phẩm nổi bật tuần này",
    className = ""
}: ProductDealOfTheWeekProps) {
    const { settings } = usePage<any>().props;
    const urlType = settings?.url_type || 'slug';

    // Countdown state
    const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
    // Random stock progress for demo (sold / total)
    const [stockProgress] = useState(() => Math.floor(Math.random() * 40) + 60); // 60-99%

    useEffect(() => {
        if (!product) return;

        // Mock end date: next 7 days
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 7);

        const updateCountdown = () => {
            const now = new Date();
            const diff = endDate.getTime() - now.getTime();

            if (diff <= 0) {
                setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
                return;
            }

            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            setTimeLeft({ days, hours, minutes, seconds });
        };

        updateCountdown();
        const interval = setInterval(updateCountdown, 1000);
        return () => clearInterval(interval);
    }, [product]);

    const formatPrice = (price: number) => {
        if (isNaN(price) || price === null || price === undefined) return '0 ₫';
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
            maximumFractionDigits: 0
        }).format(price);
    };

    if (!product) return null;

    const productUrl = buildProductUrl(product.canonical, urlType);
    const displayPrice = product.sale_price ?? product.price ?? 0;
    const originalPrice = product.original_price ?? product.price ?? 0;
    const hasSale = product.has_discount || (product.sale_price && product.sale_price < originalPrice);

    return (
        <div className={`bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-full ${className}`}>
            {/* Header */}
            <div className="px-5 pt-4 pb-3 border-b border-gray-100">
                <div className="relative">
                    <h3 className="text-[16px] font-bold text-gray-800">
                        {title}
                    </h3>
                    <div className="absolute -bottom-3 left-0 w-12 h-0.5 bg-emerald-500"></div>
                </div>
            </div>

            <div className="p-5 flex-1 flex flex-col">
                {/* Product Image */}
                <Link href={productUrl} className="block mb-4 relative group">
                    <div className="aspect-square rounded-xl overflow-hidden bg-gray-50 flex items-center justify-center p-4">
                        <img
                            src={product.image || '/images/placeholder.png'}
                            alt={product.name}
                            className="w-full h-full object-scale-down group-hover:scale-105 transition-transform duration-300"
                        />
                    </div>
                    {/* Discount Badge */}
                    {hasSale && (
                        <div className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
                            -{Math.round(((originalPrice - displayPrice) / originalPrice) * 100)}%
                        </div>
                    )}
                </Link>

                {/* Info Container - Align Left */}
                <div className="flex flex-col gap-2 mb-4">
                    {/* Price */}
                    <div className="flex items-baseline gap-2">
                        <span className="text-xl font-bold text-emerald-600">
                            {formatPrice(displayPrice)}
                        </span>
                        {hasSale && originalPrice > displayPrice && (
                            <span className="text-sm text-gray-400 line-through">
                                {formatPrice(originalPrice)}
                            </span>
                        )}
                    </div>

                    {/* Rating */}
                    <div className="flex items-center gap-1">
                        <div className="flex">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <Star
                                    key={i}
                                    className={`w-2.5 h-2.5 ${i <= Math.round(product.rating || 5) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
                                />
                            ))}
                        </div>
                        <span className="text-xs text-gray-500 ml-1">({product.review_count || 0})</span>
                    </div>

                    {/* Has Name */}
                    <Link href={productUrl} className="group-hover:text-emerald-600 transition-colors">
                        <h4 className="font-semibold text-gray-800 text-[15px] leading-snug line-clamp-2">
                            {product.name}
                        </h4>
                    </Link>

                    {/* Stock Progress */}
                    <div className="mt-1">
                        <div className="flex justify-between text-xs mb-1">
                            <span className="text-gray-500">Đã bán: <span className="font-medium text-gray-700">{Math.floor((stockProgress / 100) * (product.review_count || 50) * 10)}</span></span>
                            <span className="text-gray-500">Còn lại: <span className="text-emerald-600 font-medium">15</span></span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5">
                            <div
                                className="bg-emerald-500 h-1.5 rounded-full"
                                style={{ width: `${stockProgress}%` }}
                            ></div>
                        </div>
                    </div>

                    {/* Countdown Timer */}
                    <div className="grid grid-cols-4 gap-2 mt-2">
                        {[
                            { val: timeLeft.days, label: 'Ngày' },
                            { val: timeLeft.hours, label: 'Giờ' },
                            { val: timeLeft.minutes, label: 'Phút' },
                            { val: timeLeft.seconds, label: 'Giây' },
                        ].map((item, idx) => (
                            <div key={idx} className="bg-gray-50 rounded-lg p-1.5 text-center border border-gray-100">
                                <span className="block text-emerald-600 font-bold text-sm leading-none">{item.val}</span>
                                <span className="block text-[10px] text-gray-500 uppercase mt-0.5">{item.label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Add To Cart Button - Green Style - Borderless */}
                <div className="mt-auto">
                    <AddToCartButton
                        productId={product.id}
                        productName={product.name}
                        hasVariants={product.has_variants || false}
                        variants={product.variants}
                        buttonText="Thêm vào giỏ hàng"
                        showIcon={true}
                        className="w-full justify-center"
                    />
                </div>
            </div>
        </div>
    );
}
