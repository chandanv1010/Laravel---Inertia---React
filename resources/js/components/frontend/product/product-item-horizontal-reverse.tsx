import { Link } from '@inertiajs/react';
import { Product } from '@/types/frontend';
import { cn } from '@/lib/utils';

/**
 * ProductItemHorizontalReverse Component
 * 
 * Layout: Image Right, Information Left
 * 
 * Features:
 * - Mirror of horizontal layout
 * 
 * @param {Product} product - The product data object
 * @param {string} className - Optional additional classes
 */
export default function ProductItemHorizontalReverse({ product, className }: { product: Product, className?: string }) {
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    };

    return (
        <div className={cn("group flex flex-col md:flex-row-reverse bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-300", className)}>
            {/* Image Section - Right */}
            <div className="relative w-full md:w-1/3 aspect-square md:aspect-auto overflow-hidden shrink-0 bg-zinc-100 dark:bg-zinc-800">
                <Link href={product.canonical || '#'} className="block h-full">
                    <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                </Link>
                {product.price_sale && product.price_sale > 0 && product.price > product.price_sale && (
                    <span className="absolute top-2 right-2 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-md">
                        -{Math.round(((product.price - product.price_sale) / product.price) * 100)}%
                    </span>
                )}
            </div>

            {/* Content Section - Left */}
            <div className="flex flex-col flex-1 p-5">
                {product.product_catalogues && product.product_catalogues.length > 0 && (
                    <div className="text-xs text-muted-foreground mb-1">
                        {product.product_catalogues[0].name}
                    </div>
                )}

                <Link href={product.canonical || '#'} className="block">
                    <h3 className="text-xl font-bold mb-2 text-foreground group-hover:text-primary transition-colors line-clamp-2">
                        {product.name}
                    </h3>
                </Link>

                <p className="text-muted-foreground text-sm mb-4 line-clamp-2 flex-1">
                    {product.description}
                </p>

                {/* Price & Action */}
                <div className="mt-auto flex items-end justify-between">
                    <div>
                        {product.price_sale && product.price_sale > 0 ? (
                            <div className="flex flex-col">
                                <span className="text-lg font-bold text-red-600">
                                    {formatCurrency(product.price_sale)}
                                </span>
                                <span className="text-sm text-muted-foreground line-through ml-1">
                                    {formatCurrency(product.price)}
                                </span>
                            </div>
                        ) : (
                            <span className="text-lg font-bold text-foreground">
                                {product.price > 0 ? formatCurrency(product.price) : 'Liên hệ'}
                            </span>
                        )}
                    </div>

                    <Link
                        href={product.canonical || '#'}
                        className="inline-flex items-center justify-center py-2 px-4 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md transition-all text-sm font-medium"
                    >
                        Mua ngay
                    </Link>
                </div>
            </div>
        </div>
    );
}
