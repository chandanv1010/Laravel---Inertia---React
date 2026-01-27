import React, { useState, useEffect, useRef } from 'react';
import { usePage, Link } from '@inertiajs/react';
import { ShoppingCart, ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { AddToCartButton } from '@/components/frontend/cart';
import { buildProductUrl } from '@/lib/url-helper';
import { RenderElement } from '@/components/frontend/promotional-banners';
import type { SlideElement } from '@/components/frontend/promotional-banners';
import ClientBanner from '@/components/frontend/client-banner';
import ProductItemPromotion from '@/components/frontend/product/product-item-promotion';

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
    has_variants?: boolean;
    variants?: any[];
    rating?: number;
    review_count?: number;
}

interface Banner {
    id: number;
    name: string;
    code: string;
    width?: number;
    height?: number;
    slides: BannerSlide[];
}

interface BannerSlide {
    id: number;
    name?: string;
    title: string;
    description: string;
    button_text: string;
    button_link: string;
    background_image: string;
    background_color: string;
    background_position_x?: number;
    background_position_y?: number;
    countdown_end: string | null;
    end_date?: string | null;
    elements: SlideElement[];
    url?: string;
    target?: string;
}

interface HotDealsSectionProps {
    products?: Product[];
    banner?: Banner;
}

/**
 * Hot Deals Section - Render 100% động từ database
 * Banner bên trái render elements theo vị trí X/Y như trong editor
 * Products bên phải với slider
 */
export default function HotDealsSection({ products: propProducts, banner: propBanner }: HotDealsSectionProps) {
    const { widgets, settings } = usePage<any>().props;
    const urlType = settings?.url_type || 'slug';

    const products: Product[] = propProducts || widgets?.hotDeals?.items_data || [];
    const banner: Banner | null = propBanner || widgets?.hotDealsBanner || null;
    const slide = banner?.slides?.[0] || null;

    // Slider state
    const [currentPage, setCurrentPage] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const itemsPerView = 4;
    const gap = 16; // gap-4 = 16px

    // Calculate total pages
    const totalPages = Math.ceil(products.length / itemsPerView);

    const bannerWidth = banner?.width || 400;

    const handlePrev = () => {
        setCurrentPage((prev) => Math.max(0, prev - 1));
    };

    const handleNext = () => {
        setCurrentPage((prev) => Math.min(totalPages - 1, prev + 1));
    };

    const formatPrice = (price: number) => {
        if (isNaN(price) || price === null || price === undefined) return '0 ₫';
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
            maximumFractionDigits: 0
        }).format(price);
    };

    // If no data, don't render
    if (!slide && products.length === 0) {
        return null;
    }

    // Calculate translate value:
    // Each page = itemsPerView items
    // Item width = (containerWidth - (itemsPerView - 1) * gap) / itemsPerView
    // Translate per page = itemsPerView * itemWidth + (itemsPerView - 1) * gap
    //                    = itemsPerView * ((containerWidth - 3*gap)/4) + 3*gap
    //                    = containerWidth - 3*gap + 3*gap = containerWidth
    // So we translate 100% per page + extra gaps for items outside viewport
    // Simpler: translateX = currentPage * 100%
    // But this doesn't work because items have calc(25% - 12px) width
    // Let's use calc approach: translateX = currentPage * (100% + 16px)
    // Because total width of 4 items + 3 gaps (within view) = 100% container
    // When we slide by 1 page, we need to move 4 items (each 25%-12px) + 4 gaps (16px each)
    // = 4*(25%-12px) + 4*16px = 100% - 48px + 64px = 100% + 16px

    return (
        <section className="py-6 bg-white border-t border-b border-gray-100">
            <div className="container mx-auto px-4">
                {/* Section Header */}
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-gray-900">
                        {banner?.name || 'Deal Hot Hôm Nay'}
                    </h2>

                    <div className="flex items-center gap-3">
                        <Link href="#" className="text-sm text-gray-500 hover:text-[#1c799b]">
                            Xem tất cả
                        </Link>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={handlePrev}
                                disabled={currentPage === 0}
                                className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                            >
                                <ChevronLeft className="w-4 h-4 text-gray-600" />
                            </button>
                            <button
                                onClick={handleNext}
                                disabled={currentPage >= totalPages - 1}
                                className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                            >
                                <ChevronRight className="w-4 h-4 text-gray-600" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex flex-col lg:flex-row gap-4 items-stretch">
                    {/* Banner Card */}
                    {slide && (
                        <div
                            className="shrink-0 w-full lg:w-auto min-h-[400px]"
                            style={{
                                width: bannerWidth,
                                maxWidth: '100%'
                            }}
                        >
                            <ClientBanner
                                banner={banner}
                                className="h-full rounded-2xl w-full"
                                style={{ aspectRatio: 'unset' }}
                                autoScale={true}
                            />
                        </div>
                    )}

                    {/* Products Grid */}
                    <div ref={containerRef} className="flex-1 overflow-hidden min-w-0">
                        <div className="relative h-full">
                            <div className="overflow-hidden h-full">
                                <div
                                    className="flex gap-4 transition-transform duration-500 ease-in-out h-full"
                                    style={{
                                        // Slide by full viewport: 100% + 1 gap (16px) per page
                                        transform: `translateX(calc(-${currentPage * 100}% - ${currentPage * gap}px))`
                                    }}
                                >
                                    {products.map((product) => (
                                        <div key={product.id} className="flex-shrink-0" style={{ width: `calc(25% - 12px)` }}>
                                            <ProductItemPromotion product={product} className="h-full border border-gray-100 hover:shadow-md transition-shadow bg-white" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
