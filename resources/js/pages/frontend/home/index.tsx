import React from 'react';
import PostItemHorizontal from '@/components/frontend/post/post-item-horizontal';
import ProductItemVertical from '@/components/frontend/product/product-item-vertical';
import { Post, Product } from '@/types/frontend';
import FrontendLayout from '@/layouts/frontend-layout';
import ClientBanner from '@/components/frontend/client-banner';
import { BannerGrid } from '@/components/frontend/banner';
import CategorySlider from '@/components/frontend/category-slider';
import FlashSaleSlider from '@/components/frontend/flash-sale/flash-sale-slider';
import { HotDealsSection } from '@/components/frontend/hot-deals';
import PromotionalBanners from '@/components/frontend/promotional-banners';
import RecommendedForYou from '@/components/frontend/recommended-for-you';
import VoucherBar from '@/components/frontend/voucher-bar';
import ProductBlock from '@/components/frontend/product/product-block';
import ProductDealOfTheWeek from '@/components/frontend/product/product-deal-of-the-week';
import DailyBestSells from '@/components/frontend/daily-best-sells';
import { SubscribeNewsletter } from '@/components/frontend/subscribe';

interface HomeProps {
    seo?: any;
    widgets?: any;
    banners?: any;
}

export default function Home({ seo, widgets, banners }: HomeProps) {
    // Dummy Data cho phần tin tức (tạm thời)
    const dummyPost: Post = {
        id: 1,
        name: 'Bí quyết mua sắm thực phẩm tươi sống',
        description: 'Hướng dẫn chi tiết cách chọn thực phẩm tươi ngon cho gia đình.',
        image: 'https://placehold.co/600x400',
        canonical: 'bi-quyet-mua-sam',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user: { id: 1, name: 'Admin' },
        post_catalogues: [{ id: 1, name: 'Mẹo hay', canonical: 'meo-hay' }]
    };

    const dummyProduct: Product = {
        id: 1,
        name: 'Dâu tây hữu cơ',
        description: 'Dâu tây tươi từ nông trại địa phương.',
        image: 'https://placehold.co/400x400',
        price: 50000,
        price_sale: 45000,
        canonical: 'dau-tay-huu-co',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        product_catalogues: [{ id: 1, name: 'Trái cây', canonical: 'trai-cay' }]
    };

    return (
        <FrontendLayout seo={seo}>
            {/* Hero Section & Category Slider */}
            <div className="container mx-auto px-4 pt-6 pb-0">
                <ClientBanner
                    banner={banners?.home_slider}
                    className="mb-6 rounded-2xl"
                />
                <CategorySlider />

                {/* 4 Banner Block - Restored */}
                {/* 4 Banner Block - Restored with ClientBanner */}
                {banners?.home_banner?.slides?.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-3 mb-[30px]">
                        {banners.home_banner.slides.slice(0, 4).map((slide: any) => (
                            <div key={slide.id} className="aspect-[370/215] rounded-xl overflow-hidden">
                                <ClientBanner
                                    banner={{ ...banners.home_banner, slides: [slide] }}
                                    className="w-full h-full"
                                    autoScale={true}
                                />
                            </div>
                        ))}
                    </div>
                )}
            </div>



            {/* Hot Deals Section with Countdown Banner */}
            <HotDealsSection />

            {/* Flash Sales Section */}
            <FlashSaleSlider products={widgets?.flashSale?.items_data} />

            {/* Voucher Bar */}
            <VoucherBar voucher={widgets?.activeVoucher} />

            <DailyBestSells
                title="Sản phẩm bán chạy trong ngày"
                products={widgets?.topSelling?.items_data?.slice(0, 4) || []}
                banner={banners?.daily_best_sells || null}
            />

            {/* Section 4 cột: Sản phẩm nổi bật, Bán chạy, Đang giảm giá, Deal tuần */}
            <section className="py-8 bg-white">
                <div className="container mx-auto px-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {/* Sản phẩm nổi bật */}
                        <ProductBlock
                            title="Sản phẩm nổi bật"
                            products={widgets?.featuredProducts?.items_data || []}
                        />

                        {/* Sản phẩm bán chạy */}
                        <ProductBlock
                            title="Sản phẩm bán chạy"
                            products={widgets?.topSelling?.items_data || []}
                        />

                        {/* Sản phẩm khuyến mãi */}
                        <ProductBlock
                            title="Sản phẩm khuyến mãi"
                            products={widgets?.onSaleProducts?.items_data || []}
                        />

                        {/* Deal tuần này */}
                        <ProductDealOfTheWeek
                            title="Deal sốc tuần này"
                            product={widgets?.dealOfTheWeek?.items_data?.[0]}
                        />
                    </div>
                </div>
            </section>

            {/* Promotional Banners with Countdown */}
            <PromotionalBanners />

            {/* Recommended for You - Category Widget */}
            <RecommendedForYou data={widgets?.recommendedCategories} />

            {/* Newsletter Subscription */}
            <SubscribeNewsletter
                title="Ở nhà & nhận nhu yếu phẩm hàng ngày từ cửa hàng của chúng tôi"
                backgroundImage="https://marketpro.template.wowtheme7.com/assets/images/thumbs/newsletter-img.png"
            />

        </FrontendLayout>
    );
}
