import React, { useState } from 'react';
import { ShoppingCart, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import VariantSelectionDialog from './variant-selection-dialog';
import { cn } from '@/lib/utils';

interface AddToCartButtonProps {
    productId: number;
    productName?: string;
    hasVariants?: boolean;
    variants?: Array<{
        id: number;
        name: string;
        price: number;
        stock?: number;
        image?: string;
    }>;
    className?: string;
    buttonText?: string;
    showIcon?: boolean;
    size?: 'sm' | 'default' | 'lg';
}

export default function AddToCartButton({
    productId,
    productName = 'Sản phẩm',
    hasVariants = false,
    variants = [],
    className,
    buttonText = 'Thêm vào giỏ',
    showIcon = true,
    size = 'sm'
}: AddToCartButtonProps) {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const handleClick = () => {
        if (hasVariants && variants.length > 0) {
            // Open variant selection dialog
            setIsDialogOpen(true);
        } else {
            // Add to cart directly (show notification for now)
            addToCart(productId, null);
        }
    };

    const addToCart = (productId: number, variantId: number | null) => {
        setIsLoading(true);

        // Simulate API call - will be replaced with real logic later
        setTimeout(() => {
            setIsLoading(false);
            toast({
                title: "Đã thêm vào giỏ hàng!",
                description: `${productName} đã được thêm vào giỏ hàng của bạn.`,
            });
            setIsDialogOpen(false);
        }, 500);
    };

    const handleVariantSelect = (variantId: number) => {
        addToCart(productId, variantId);
    };

    return (
        <>
            <Button
                variant="secondary"
                size={size}
                onClick={handleClick}
                disabled={isLoading}
                className={cn(
                    "bg-[hsl(196,69%,93.6%)] text-[#1c799b] border border-[#1c799b]/30 hover:bg-[#1c799b] hover:text-white rounded-full font-normal gap-1 transition-colors h-10",
                    className
                )}
            >
                {isLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                    <>
                        {buttonText}
                        {showIcon && <ShoppingCart className="w-3.5 h-3.5" />}
                    </>
                )}
            </Button>

            {hasVariants && (
                <VariantSelectionDialog
                    isOpen={isDialogOpen}
                    onClose={() => setIsDialogOpen(false)}
                    onSelect={handleVariantSelect}
                    productName={productName}
                    variants={variants}
                />
            )}
        </>
    );
}
