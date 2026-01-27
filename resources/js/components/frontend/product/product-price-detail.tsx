import React, { useState } from 'react';
import { Truck } from 'lucide-react';
import { usePricingLogic } from '@/hooks/use-pricing-logic';
import WholesalePriceDisplay from '@/components/frontend/product/wholesale-price-display';

interface ProductPriceDetailProps {
    product: any;
    selectedVariant?: {
        retail_price: number;
        stock_quantity: number;
        final_price?: number;
        discount_percent?: number;
        original_price?: number;
        display_price?: number;
        tax_amount?: number;
        tax_percent?: number;
        has_tax?: boolean;
        promotion_name?: string | null;
    } | null;
    quantity?: number;
    freeship_voucher?: {
        min_order_value: number;
        code?: string;
        description?: string;
    } | null;
}

export default function ProductPriceDetail({ product, selectedVariant, quantity = 1, freeship_voucher }: ProductPriceDetailProps) {
    const [showFreeshipTooltip, setShowFreeshipTooltip] = useState(false);

    // Price formatting helper
    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
    };

    // Use pricing logic hook to determine display mode and pricing
    const pricing = usePricingLogic(product, selectedVariant, quantity);

    // Use displayPrice (includes tax) for final display
    const displayPrice = pricing.displayPrice;
    const hasDiscount = pricing.discountPercent > 0 || pricing.originalPrice !== null;

    return (
        <div className="mb-4">
            {/* Wholesale Mode: Show tier pricing */}
            {pricing.displayMode === 'wholesale' && pricing.tiers && (
                <WholesalePriceDisplay
                    tiers={pricing.tiers}
                    currentQuantity={quantity}
                />
            )}

            {/* Retail Mode: Show retail/promotion pricing */}
            {pricing.displayMode === 'retail' && (
                <div className="space-y-2">
                    {/* Original Price on top (crossed out) - only if has discount */}
                    {hasDiscount && pricing.originalPrice && (
                        <p className="text-gray-400 line-through">
                            {formatPrice(pricing.originalPrice).replace('₫', 'đ')}
                        </p>
                    )}

                    {/* Sale Price + Discount Badge on same line */}
                    <div className="flex items-center gap-3">
                        <span className="text-2xl font-bold text-red-600">
                            {formatPrice(displayPrice).replace('₫', 'đ')}
                        </span>
                        {hasDiscount && pricing.discountPercent > 0 && (
                            <span className="bg-blue-500 text-white px-2 py-0.5 rounded text-sm font-medium">
                                -{pricing.discountPercent}%
                            </span>
                        )}
                    </div>

                    {/* Tax Label */}
                    {pricing.hasTax && pricing.taxPercent > 0 && (
                        <p className="text-sm text-gray-500">
                            (Đã bao gồm {pricing.taxPercent}% VAT)
                        </p>
                    )}

                    {/* Promotion Name */}
                    {pricing.promotionName && (
                        <div className="flex items-center gap-2 text-sm text-orange-600">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                            <span>{pricing.promotionName}</span>
                        </div>
                    )}
                </div>
            )}

            {/* Freeship Indicator (only if voucher exists) */}
            {freeship_voucher && (
                <div
                    className="relative inline-flex items-center gap-2 text-sm text-gray-700 mt-3"
                    onMouseEnter={() => setShowFreeshipTooltip(true)}
                    onMouseLeave={() => setShowFreeshipTooltip(false)}
                >
                    <Truck size={18} className="text-blue-600" />
                    <span>
                        Freeship đơn trên {new Intl.NumberFormat('vi-VN').format(freeship_voucher.min_order_value / 1000)}K
                    </span>

                    {/* Tooltip */}
                    {showFreeshipTooltip && (
                        <div className="absolute left-0 top-full mt-2 bg-gray-900 text-white text-xs rounded px-3 py-2 z-10 whitespace-nowrap">
                            {freeship_voucher.description ||
                                `Miễn phí vận chuyển cho đơn hàng từ ${formatPrice(freeship_voucher.min_order_value)}`}
                            {freeship_voucher.code && (
                                <div className="mt-1 text-gray-300">
                                    Mã: {freeship_voucher.code}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
