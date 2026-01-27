import { useMemo } from 'react';

interface PricingTier {
    min_quantity: number;
    max_quantity: number | null;
    price: number;
}

interface Product {
    retail_price: number;
    wholesale_price?: number;
    pricing_tiers?: PricingTier[];
}

interface Variant {
    retail_price: number;
    wholesale_price?: number;
    // NEW: Backend-calculated fields
    final_price?: number;
    original_price?: number;
    discount_percent?: number;
    discount_amount?: number;
    display_price?: number;
    tax_amount?: number;
    tax_percent?: number;
    has_tax?: boolean;
    promotion_id?: number | null;
    promotion_name?: string | null;
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
 * 1. Wholesale pricing tiers (if exists) - overrides everything
 * 2. Variant pricing with promotions (if variant selected)
 * 3. Product retail pricing (fallback)
 */
export function usePricingLogic(
    product: Product,
    selectedVariant?: Variant | null,
    quantity: number = 1
): PricingResult {
    return useMemo(() => {
        // 1. Check if product has wholesale tiers
        const hasPricingTiers = product.pricing_tiers && product.pricing_tiers.length > 0;

        // 2. If wholesale pricing exists, use it (overrides all promotions and variants)
        if (hasPricingTiers) {
            const applicableTier = findApplicableTier(product.pricing_tiers!, quantity);

            return {
                displayMode: 'wholesale',
                finalPrice: applicableTier.price,
                displayPrice: applicableTier.price, // No tax on wholesale
                originalPrice: null,
                discountPercent: 0,
                discountAmount: 0,
                taxAmount: 0,
                taxPercent: 0,
                hasTax: false,
                tiers: product.pricing_tiers!,
                promotionId: null,
                promotionName: null,
            };
        }

        // 3. Use variant pricing if variant is selected
        if (selectedVariant) {
            const finalPrice = selectedVariant.final_price ?? selectedVariant.retail_price;
            const originalPrice = selectedVariant.original_price ?? selectedVariant.retail_price;
            const discountPercent = selectedVariant.discount_percent ?? 0;
            const displayPrice = selectedVariant.display_price ?? finalPrice;
            const taxAmount = selectedVariant.tax_amount ?? 0;
            const taxPercent = selectedVariant.tax_percent ?? 0;
            const hasTax = selectedVariant.has_tax ?? false;

            return {
                displayMode: 'retail',
                finalPrice,
                displayPrice,
                originalPrice: discountPercent > 0 ? originalPrice : null,
                discountPercent,
                discountAmount: selectedVariant.discount_amount ?? 0,
                taxAmount,
                taxPercent,
                hasTax,
                tiers: null,
                promotionId: selectedVariant.promotion_id,
                promotionName: selectedVariant.promotion_name,
            };
        }

        // 4. Fallback to product retail pricing
        return {
            displayMode: 'retail',
            finalPrice: product.retail_price,
            displayPrice: product.retail_price,
            originalPrice: null,
            discountPercent: 0,
            discountAmount: 0,
            taxAmount: 0,
            taxPercent: 0,
            hasTax: false,
            tiers: null,
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
