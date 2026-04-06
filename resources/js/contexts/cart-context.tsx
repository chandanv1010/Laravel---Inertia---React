import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';

interface CartItem {
    row_id: string;
    product_id: number;
    variant_id: number | null;
    name: string;
    image: string;
    price: number;
    quantity: number;
    options?: any;
    original_price?: number;
    product_promotions?: any[];
    is_gift?: boolean;
    promo_id?: number;
    is_combo_item?: boolean;
    combo_group_id?: string;
}

interface CartContextType {
    cartItems: CartItem[];
    cartCount: number;
    cartTotal: number;
    addToCart: (productId: number, variantId: number | null, quantity: number, promoId?: number) => Promise<any>;
    addCombo: (comboId: number) => Promise<any>;
    removeFromCart: (rowId: string) => Promise<void>;
    updateQuantity: (rowId: string, quantity: number) => Promise<void>;
    clearCart: () => Promise<void>;
    refreshCart: () => Promise<void>;
    applyVoucher: (code: string) => Promise<any>;
    isLoading: boolean;
    discountTotal: number;
    itemsSubtotal: number;
    additionalDiscount: number;
    finalTotal: number;
    voucherCode?: string;
    cart: any; // Raw cart data including eligible_rewards
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
    const [cartItems, setCartItems] = useState<CartItem[]>([]);
    const [cartCount, setCartCount] = useState(0);
    const [cartTotal, setCartTotal] = useState(0);
    const [itemsSubtotal, setItemsSubtotal] = useState(0);
    const [additionalDiscount, setAdditionalDiscount] = useState(0);
    const [discountTotal, setDiscountTotal] = useState(0);
    const [finalTotal, setFinalTotal] = useState(0);
    const [voucherCode, setVoucherCode] = useState<string | undefined>(undefined);
    const [isLoading, setIsLoading] = useState(false);
    const [cart, setCart] = useState<any>({ items: {}, summary: {}, eligible_rewards: [] });

    const refreshCart = async () => {
        try {
            const response = await axios.get('/cart');
            if (response.data.status === 'success') {
                const data = response.data.data;
                setCartItems(Object.values(data.items));
                setCartCount(data.total_quantity);
                setCartTotal(data.total_price);
                setItemsSubtotal(data.summary?.items_subtotal || data.total_price);
                setAdditionalDiscount(data.summary?.additional_discount || 0);
                setDiscountTotal(data.discount_total || 0);
                setFinalTotal(data.final_total || data.total_price);
                setVoucherCode(data.voucher_code);
                setCart(data);
            }
        } catch (error) {
            console.error('Failed to fetch cart', error);
        }
    };

    useEffect(() => {
        refreshCart();
    }, []);

    const addToCart = async (productId: number, variantId: number | null, quantity: number, promoId?: number) => {
        setIsLoading(true);
        try {
            const response = await axios.post('/cart/add', {
                product_id: productId,
                variant_id: variantId,
                quantity: quantity,
                promo_id: promoId
            });

            if (response.data.status === 'success') {
                const data = response.data.data;
                setCartItems(Object.values(data.items));
                setCartCount(data.total_quantity);
                setCartTotal(data.total_price);
                setItemsSubtotal(data.summary?.items_subtotal || data.total_price);
                setAdditionalDiscount(data.summary?.additional_discount || 0);
                setDiscountTotal(data.discount_total || 0);
                setFinalTotal(data.final_total || data.total_price);
                setVoucherCode(data.voucher_code);
                setCart(data);
                return response.data;
            }
        } catch (error) {
            console.error('Add to cart failed', error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const addCombo = async (comboId: number) => {
        setIsLoading(true);
        try {
            const response = await axios.post('/cart/add', {
                promo_id: comboId,
                quantity: 1,
                is_combo: true
            });

            if (response.data.status === 'success') {
                const data = response.data.data;
                setCartItems(Object.values(data.items));
                setCartCount(data.total_quantity);
                setCartTotal(data.total_price);
                setItemsSubtotal(data.summary?.items_subtotal || data.total_price);
                setAdditionalDiscount(data.summary?.additional_discount || 0);
                setDiscountTotal(data.discount_total || 0);
                setFinalTotal(data.final_total || data.total_price);
                setVoucherCode(data.voucher_code);
                setCart(data);
                return response.data;
            }
        } catch (error) {
            console.error('Add combo failed', error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const removeFromCart = async (rowId: string) => {
        setIsLoading(true);
        try {
            const response = await axios.delete('/cart/remove', { data: { row_id: rowId } });
            if (response.data.status === 'success') {
                const data = response.data.data;
                setCartItems(Object.values(data.items));
                setCartCount(data.total_quantity);
                setCartTotal(data.total_price);
                setItemsSubtotal(data.summary?.items_subtotal || data.total_price);
                setAdditionalDiscount(data.summary?.additional_discount || 0);
                setDiscountTotal(data.discount_total || 0);
                setFinalTotal(data.final_total || data.total_price);
                setVoucherCode(data.voucher_code);
                setCart(data);
            }
        } catch (error) {
            console.error('Remove failed', error);
        } finally {
            setIsLoading(false);
        }
    };

    const updateQuantity = async (rowId: string, quantity: number) => {
        setIsLoading(true);
        try {
            const response = await axios.put('/cart/update', { row_id: rowId, quantity });
            if (response.data.status === 'success') {
                const data = response.data.data;
                setCartItems(Object.values(data.items));
                setCartCount(data.total_quantity);
                setCartTotal(data.total_price);
                setItemsSubtotal(data.summary?.items_subtotal || data.total_price);
                setAdditionalDiscount(data.summary?.additional_discount || 0);
                setDiscountTotal(data.discount_total || 0);
                setFinalTotal(data.final_total || data.total_price);
                setVoucherCode(data.voucher_code);
                setCart(data);
            }
        } catch (error) {
            console.error('Update quantity failed', error);
        } finally {
            setIsLoading(false);
        }
    };

    const clearCart = async () => {
        setIsLoading(true);
        try {
            const response = await axios.delete('/cart/clear');
            if (response.data.status === 'success') {
                setCartItems([]);
                setCartCount(0);
                setCartTotal(0);
                setDiscountTotal(0);
                setFinalTotal(0);
                setVoucherCode(undefined);
            }
        } catch (error) {
            console.error('Clear cart failed', error);
        } finally {
            setIsLoading(false);
        }
    };

    const applyVoucher = async (code: string) => {
        setIsLoading(true);
        try {
            const response = await axios.post('/cart/apply-voucher', { code });
            if (response.data.status === 'success') {
                const data = response.data.data;
                setCartItems(Object.values(data.items));
                setCartCount(data.total_quantity);
                setCartTotal(data.total_price);
                setItemsSubtotal(data.summary?.items_subtotal || data.total_price);
                setAdditionalDiscount(data.summary?.additional_discount || 0);
                setDiscountTotal(data.discount_total || 0);
                setFinalTotal(data.final_total || data.total_price);
                setVoucherCode(data.voucher_code);
                setCart(data);
                return response.data;
            }
        } catch (error) {
            console.error('Apply voucher failed', error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <CartContext.Provider value={{
            cartItems, cartCount, cartTotal, itemsSubtotal, additionalDiscount, discountTotal, finalTotal, voucherCode, cart,
            addToCart, addCombo, removeFromCart, updateQuantity, clearCart, refreshCart, applyVoucher, isLoading
        }}>
            {children}
        </CartContext.Provider>
    );

};

export const useCart = () => {
    const context = useContext(CartContext);
    if (!context) {
        throw new Error('useCart must be used within a CartProvider');
    }
    return context;
};
