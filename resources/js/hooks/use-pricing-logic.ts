import { useMemo } from 'react';

interface PricingTier {
    min_quantity: number;
    max_quantity: number | null;
    price: number;
}

interface AppliedPromotion {
    id: number;
    name: string;
    discount: number;
    type: string;
    value: number;
}

interface Product {
    retail_price: number;
    wholesale_price?: number;
    pricing_tiers?: PricingTier[];
    // From backend ProductResource
    final_price?: number;
    sale_price?: number;
    original_price?: number;
    discount_amount?: number;
    discount_percent?: number;
    has_discount?: boolean;
    applied_promotions?: AppliedPromotion[];
    promotion_id?: number | null;
    promotion_name?: string | null;
    promotion_type?: string | null;
}

interface Variant {
    retail_price: number;
    wholesale_price?: number;
    // From backend ProductResource
    final_price?: number;
    sale_price?: number;
    original_price?: number;
    discount_percent?: number;
    discount_amount?: number;
    display_price?: number;
    tax_amount?: number;
    tax_percent?: number;
    has_tax?: boolean;
    promotion_id?: number | null;
    promotion_name?: string | null;
    promotion_type?: string | null;
    applied_promotions?: AppliedPromotion[];
}

interface PricingResult {
    displayMode: 'wholesale' | 'retail';
    finalPrice: number;
    displayPrice: number; // With tax
    originalPrice: number | null;
    discountPercent: number;
    discountAmount: number;
    taxAmount: number;
    taxPercent: number;
    hasTax: boolean;
    tiers: PricingTier[] | null;
    promotionId?: number | null;
    promotionName?: string | null;
}

/**
 * Central pricing logic hook
 * 
 * Priority order:
 * 1. Same Price (Đồng giá) - Absolute priority
 * 2. Wholesale pricing tiers (if exists)
 * 3. Variant pricing with other promotions
 * 4. Product retail pricing (fallback)
 */
export function usePricingLogic(
    product: Product,
    selectedVariant?: Variant | null,
    quantity: number = 1
): PricingResult {
    return useMemo(() => {
        // Prepare base data based on selection
        const target = selectedVariant || product;
        const retailPrice = target.retail_price;
        
        // 1. ABSOLUTE PRIORITY: Same Price (Đồng giá)
        // Check if there is a same_price promotion applied from backend
        const hasSamePrice = !!(target.promotion_type === 'same_price' || 
                             target.applied_promotions?.some(p => p.type === 'same_price'));

        if (hasSamePrice) {
            const finalPrice = target.final_price ?? target.sale_price ?? retailPrice;
            const originalPrice = target.original_price ?? retailPrice;
            const discountAmount = target.discount_amount ?? 0;
            const discountPercent = target.discount_percent ?? 0;
            const displayPrice = (target as any).display_price ?? finalPrice;
            const taxAmount = (target as any).tax_amount ?? 0;
            const taxPercent = (target as any).tax_percent ?? 0;
            const hasTax = (target as any).has_tax ?? false;

            return {
                displayMode: 'retail',
                finalPrice,
                displayPrice,
                originalPrice: originalPrice > finalPrice ? originalPrice : null,
                discountPercent,
                discountAmount,
                taxAmount,
                taxPercent,
                hasTax,
                tiers: null,
                promotionId: target.promotion_id,
                promotionName: target.promotion_name,
            };
        }

        // 2. PRIORITY 2: Wholesale pricing tiers
        const hasPricingTiers = product.pricing_tiers && product.pricing_tiers.length > 0;
        if (hasPricingTiers) {
            const applicableTier = findApplicableTier(product.pricing_tiers!, quantity);

            return {
                displayMode: 'wholesale',
                finalPrice: applicableTier.price,
                displayPrice: applicableTier.price, // No tax on wholesale normally
                originalPrice: retailPrice > applicableTier.price ? retailPrice : null,
                discountPercent: retailPrice > 0 ? Math.round(((retailPrice - applicableTier.price) / retailPrice) * 100) : 0,
                discountAmount: Math.max(0, retailPrice - applicableTier.price),
                taxAmount: 0,
                taxPercent: 0,
                hasTax: false,
                tiers: product.pricing_tiers!,
                promotionId: null,
                promotionName: null,
            };
        }

        // 3. PRIORITY 3: Standard promotions (Percentage/Fixed)
        const finalPrice = target.final_price ?? target.sale_price ?? retailPrice;
        const originalPrice = target.original_price ?? retailPrice;
        const discountPercent = target.discount_percent ?? 0;
        const discountAmount = target.discount_amount ?? 0;
        const displayPrice = (target as any).display_price ?? finalPrice;
        const taxAmount = (target as any).tax_amount ?? 0;
        const taxPercent = (target as any).tax_percent ?? 0;
        const hasTax = (target as any).has_tax ?? false;

        return {
            displayMode: 'retail',
            finalPrice,
            displayPrice,
            originalPrice: discountPercent > 0 ? originalPrice : null,
            discountPercent,
            discountAmount,
            taxAmount,
            taxPercent,
            hasTax,
            tiers: null,
            promotionId: target.promotion_id,
            promotionName: target.promotion_name,
        };
    }, [product, selectedVariant, quantity]);
}

/**
 * Find the applicable pricing tier based on quantity
 */
function findApplicableTier(tiers: PricingTier[], quantity: number): PricingTier {
    // Sort tiers by min_quantity ascending
    const sortedTiers = [...tiers].sort((a, b) => a.min_quantity - b.min_quantity);

    // Find the first tier where quantity falls within the range
    for (const tier of sortedTiers) {
        if (quantity >= tier.min_quantity) {
            // Check if quantity is within max_quantity (or unlimited if null)
            if (tier.max_quantity === null || quantity <= tier.max_quantity) {
                return tier;
            }
        }
    }

    // If no tier matches, return the last tier (highest quantity tier)
    return sortedTiers[sortedTiers.length - 1];
}
