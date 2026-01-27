import React from 'react';
import { usePage } from '@inertiajs/react';
import ClientBanner from '@/components/frontend/client-banner';
import ProductItemDailyBestSell from '@/components/frontend/product/product-item-daily-best-sell';

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
}

interface DailyBestSellsProps {
    title?: string;
    products: Product[];
    banner: any;
}

export default function DailyBestSells({ title = "Daily Best Sells", products, banner }: DailyBestSellsProps) {
    return (
        <section className="py-8 bg-white">
            <div className="container mx-auto px-4">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
                </div>

                <div className="flex flex-col lg:flex-row gap-6">
                    {/* Products Grid (2/3 width) */}
                    <div className="flex-1">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
                            {products.slice(0, 4).map(product => (
                                <ProductItemDailyBestSell key={product.id} product={product} className="h-full" />
                            ))}
                        </div>
                    </div>

                    {/* Banner (1/3 width) */}
                    <div className="w-full lg:w-1/3 min-w-[300px]">
                        <div className="h-full rounded-2xl overflow-hidden relative group">
                            {banner ? (
                                <ClientBanner
                                    banner={banner}
                                    className="h-full w-full object-cover"
                                    autoScale={false}
                                />
                            ) : (
                                <div className="bg-gray-100 h-full min-h-[400px] flex items-center justify-center text-gray-400">
                                    Banner Slot
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
