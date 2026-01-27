import React, { useMemo, useState } from 'react';
import { Head, Link, usePage, router } from '@inertiajs/react';
import FrontendLayout from '@/layouts/frontend-layout';
import ThumbnailGallery from '@/components/frontend/product/thumbnail-gallery';
import ProductInfo from '@/components/frontend/product/product-info';
import ProductHeader from '@/components/frontend/product/product-header';
import ProductDescription from '@/components/frontend/product/product-description';
import ProductPriceDetail from '@/components/frontend/product/product-price-detail';
import VoucherList from '@/components/frontend/product/product-voucher-list';
import ProductVariantSelector from '@/components/frontend/product/product-variant-selector';

// Interfaces
interface Product {
    id: number;
    name: string;
    image: string;
    album: string | string[]; // JSON string or array
    price: number;
    retail_price: number;
    wholesale_price: number;
    sale_price?: number;
    description: string;
    content: string;
    variants: any[];
    gallery_style?: 'vertical' | 'horizontal';
    image_aspect_ratio?: string;
    image_object_fit?: 'cover' | 'scale-down' | 'auto' | 'contain';
    iframe?: string;
    script?: string;
    qrcode?: string;
    reviews_count?: number;
    average_rating?: number;
    current_language?: {
        name: string;
        description?: string;
        content?: string;
    };
    attribute_catalogues?: any[]; // Added for variant selector
}

interface ProductDetailProps {
    product: Product;
    relatedProducts: any[];
    promotionalWidget: any;
    suggestedProducts: any;
    breadcrumbs: any[];
    seo: any;
    catalogue: any;
    product_catalogue_breadcrumb?: any[]; // Added based on instruction
    vouchers?: any[];
    freeship_voucher?: any;
}

export default function ProductDetail({
    product,
    relatedProducts,
    promotionalWidget,
    suggestedProducts,
    breadcrumbs,
    seo,
    catalogue,
    vouchers = [],
    freeship_voucher
}: ProductDetailProps) {
    // State for selected variant, stock status, and quantity
    const [selectedVariant, setSelectedVariant] = useState<any | null>(null);
    const [allOutOfStock, setAllOutOfStock] = useState(false);
    const [quantity, setQuantity] = useState(1);

    // Gallery images based on selected variant
    const galleryImages = useMemo(() => {
        let images: string[] = [];

        // Priority 1: variant album (if variant is selected and has album)
        if (selectedVariant?.album && selectedVariant.album.length > 0) {
            try {
                const variantAlbum = typeof selectedVariant.album === 'string'
                    ? JSON.parse(selectedVariant.album)
                    : selectedVariant.album;

                if (Array.isArray(variantAlbum) && variantAlbum.length > 0) {
                    images = variantAlbum;
                }
            } catch (e) {
                console.error("Failed to parse variant album", e);
            }
        }

        // Priority 2: Add variant image if exists and not in album
        if (selectedVariant?.image && !images.includes(selectedVariant.image)) {
            images.unshift(selectedVariant.image);
        }

        // Fallback: product album if no variant images
        if (images.length === 0) {
            images = [product.image];
            if (product.album) {
                try {
                    const album = typeof product.album === 'string' ? JSON.parse(product.album) : product.album;
                    if (Array.isArray(album)) {
                        images = [...images, ...album];
                    }
                } catch (e) {
                    console.error("Failed to parse product album", e);
                }
            }
        }

        // Deduplicate and filter out empty strings
        return Array.from(new Set(images)).filter(img => !!img);
    }, [product, selectedVariant]);

    return (
        <FrontendLayout>
            <Head>
                <title>{seo?.meta_title}</title>
                <meta name="description" content={seo?.meta_description} />
                <meta name="keywords" content={seo?.meta_keywords} />
                {seo?.canonical && <link rel="canonical" href={`/${seo.canonical}.html`} />}
                <meta name="robots" content={seo?.meta_robots || 'index, follow'} />
            </Head>

            <div className="bg-white pb-12">
                <div className="max-w-[1280px] mx-auto px-6 py-8">
                    {/* Breadcrumbs */}
                    <div className="mb-6 text-sm text-gray-500">
                        {breadcrumbs.map((item, index) => (
                            <span key={index}>
                                {index > 0 && <span className="mx-2">/</span>}
                                {item.url ? (
                                    <Link href={item.url} className={index === breadcrumbs.length - 1 ? 'font-semibold text-gray-800' : 'hover:text-primary transition-colors'}>
                                        {item.name}
                                    </Link>
                                ) : (
                                    <span className="font-semibold text-gray-800">{item.name}</span>
                                )}
                            </span>
                        ))}
                    </div>

                    {/* Main Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 mb-16">
                        {/* Left: Gallery (6 cols - 50%) */}
                        <div className="lg:col-span-6">
                            <ThumbnailGallery
                                images={galleryImages}
                                productName={product.name}
                                galleryStyle={product.gallery_style || 'vertical'}
                                aspectRatio={product.image_aspect_ratio || '16:9'}
                                imageObjectFit={product.image_object_fit || 'contain'}
                                video={product.iframe || product.script} // Pass video
                                qrCode={product.qrcode} // Pass QR Code
                            />
                        </div>

                        {/* Right: Info (6 cols - 50%) */}
                        <div className="lg:col-span-6">
                            {/* Product Header (Name + Rating + Share) */}
                            <ProductHeader
                                product={{
                                    name: product.name,
                                    reviews_count: product.reviews_count,
                                    average_rating: product.average_rating
                                }}
                            />

                            {/* Product Description */}
                            <ProductDescription content={product.description} />

                            {/* Price Detail */}
                            <ProductPriceDetail
                                product={product}
                                selectedVariant={selectedVariant}
                                quantity={quantity}
                                freeship_voucher={freeship_voucher}
                            />

                            {/* Variant Selector */}
                            {product.attribute_catalogues && product.attribute_catalogues.length > 0 && (
                                <ProductVariantSelector
                                    attributeCatalogues={product.attribute_catalogues}
                                    variants={product.variants || []}
                                    onVariantChange={setSelectedVariant}
                                    onStockStatusChange={setAllOutOfStock}
                                />
                            )}

                            {/* Voucher List */}
                            <VoucherList vouchers={vouchers} />

                            {/* Product Info (Variants, Quantity, Add to Cart) */}
                            <ProductInfo
                                product={product}
                                catalogue={catalogue}
                                selectedVariant={selectedVariant}
                                allOutOfStock={allOutOfStock}
                                quantity={quantity}
                                onQuantityChange={setQuantity}
                            />
                        </div>
                    </div>

                    {/* Product Content / Description */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        <div className="lg:col-span-9">
                            <div className="bg-white border rounded-xl p-6 mb-8">
                                <h2 className="text-xl font-bold mb-4 pb-2 border-b">Mô tả sản phẩm</h2>
                                <div
                                    className="prose max-w-none text-gray-700 leading-relaxed"
                                    dangerouslySetInnerHTML={{ __html: product.description }}
                                />
                                {product.content && (
                                    <div
                                        className="prose max-w-none text-gray-700 leading-relaxed mt-6"
                                        dangerouslySetInnerHTML={{ __html: product.content }}
                                    />
                                )}
                            </div>
                        </div>

                        {/* Sidebar / Related (Placeholder for now) */}
                        <div className="lg:col-span-3">
                            {/* Maybe 'San pham goi y' here later */}
                        </div>
                    </div>

                    {/* Related Products */}
                    {relatedProducts && relatedProducts.length > 0 && (
                        <div className="mt-12">
                            <h2 className="text-2xl font-bold mb-6">Sản phẩm liên quan</h2>
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                {relatedProducts.map((related) => (
                                    <div key={related.id} className="bg-white border border-gray-100 rounded-lg p-4 hover:shadow-lg transition-shadow">
                                        <Link href={related.canonical ? `/${related.canonical}.html` : '#'} className="block h-48 mb-4 overflow-hidden rounded">
                                            <img src={related.image} alt={related.name} className="w-full h-full object-contain" />
                                        </Link>
                                        <h3 className="font-medium text-sm mb-2 line-clamp-2 min-h-[40px]">
                                            <Link href={related.canonical ? `/${related.canonical}.html` : '#'} className="text-gray-900 hover:text-primary">
                                                {related.name}
                                            </Link>
                                        </h3>
                                        <div className="font-bold text-red-600">
                                            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(related.price)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </FrontendLayout>
    );
}
