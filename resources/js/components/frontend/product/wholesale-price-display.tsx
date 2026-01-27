import React from 'react';

interface PricingTier {
    min_quantity: number;
    max_quantity: number | null;
    price: number;
}

interface WholesalePriceDisplayProps {
    tiers: PricingTier[];
    currentQuantity: number;
}

export default function WholesalePriceDisplay({ tiers, currentQuantity }: WholesalePriceDisplayProps) {
    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
    };

    // Sort tiers by min_quantity
    const sortedTiers = [...tiers].sort((a, b) => a.min_quantity - b.min_quantity);

    return (
        <div className="mb-4">
            <h3 className="text-lg font-semibold mb-2 text-gray-900">Giá mua buôn</h3>
            <p className="text-sm text-gray-600 mb-3">
                Giá theo số lượng mua
            </p>
            <div className="space-y-2">
                {sortedTiers.map((tier, index) => {
                    const isActive = currentQuantity >= tier.min_quantity &&
                        (!tier.max_quantity || currentQuantity <= tier.max_quantity);

                    return (
                        <div
                            key={index}
                            className={`p-3 rounded-lg border transition-all ${isActive
                                    ? 'border-blue-600 bg-blue-50 shadow-sm'
                                    : 'border-gray-200 bg-white'
                                }`}
                        >
                            <div className="flex justify-between items-center">
                                <span className={`text-sm ${isActive ? 'font-semibold text-blue-900' : 'text-gray-700'}`}>
                                    {tier.min_quantity} {tier.max_quantity ? `- ${tier.max_quantity}` : '+'} sản phẩm
                                </span>
                                <span className={`font-bold ${isActive ? 'text-blue-600' : 'text-gray-900'}`}>
                                    {formatPrice(tier.price)}/sp
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
