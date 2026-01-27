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
}

interface CartContextType {
    cartItems: CartItem[];
    cartCount: number;
    cartTotal: number;
    addToCart: (productId: number, variantId: number | null, quantity: number) => Promise<any>;
    removeFromCart: (rowId: string) => Promise<void>;
    updateQuantity: (rowId: string, quantity: number) => Promise<void>;
    clearCart: () => Promise<void>;
    refreshCart: () => Promise<void>;
    applyVoucher: (code: string) => Promise<any>;
    isLoading: boolean;
    discountTotal: number;
    finalTotal: number;
    voucherCode?: string;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
    const [cartItems, setCartItems] = useState<CartItem[]>([]);
    const [cartCount, setCartCount] = useState(0);
    const [cartTotal, setCartTotal] = useState(0);
    const [discountTotal, setDiscountTotal] = useState(0);
    const [finalTotal, setFinalTotal] = useState(0);
    const [voucherCode, setVoucherCode] = useState<string | undefined>(undefined);
    const [isLoading, setIsLoading] = useState(false);

    const refreshCart = async () => {
        try {
            const response = await axios.get('/cart');
            if (response.data.status === 'success') {
                const data = response.data.data;
                setCartItems(Object.values(data.items));
                setCartCount(data.total_quantity);
                setCartTotal(data.total_price); // Subtotal
                setDiscountTotal(data.discount_total || 0);
                setFinalTotal(data.final_total || data.total_price);
                setVoucherCode(data.voucher_code);
            }
        } catch (error) {
            console.error('Failed to fetch cart', error);
        }
    };

    useEffect(() => {
        refreshCart();
    }, []);

    const addToCart = async (productId: number, variantId: number | null, quantity: number) => {
        setIsLoading(true);
        try {
            const response = await axios.post('/cart/add', {
                product_id: productId,
                variant_id: variantId,
                quantity: quantity
            });

            if (response.data.status === 'success') {
                const data = response.data.data;
                setCartItems(Object.values(data.items));
                setCartCount(data.total_quantity);
                setCartItems(Object.values(data.items));
                setCartCount(data.total_quantity);
                setCartTotal(data.total_price);
                setDiscountTotal(data.discount_total || 0);
                setFinalTotal(data.final_total || data.total_price);
                setVoucherCode(data.voucher_code);
                return response.data;
            }
        } catch (error) {
            console.error('Add to cart failed', error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const removeFromCart = async (rowId: string) => {
        setIsLoading(true);
        try {
            // Fix: Use DELETE method and pass data in config object
            const response = await axios.delete('/cart/remove', { data: { row_id: rowId } });
            if (response.data.status === 'success') {
                const data = response.data.data;
                setCartItems(Object.values(data.items));
                setCartCount(data.total_quantity);
                setCartItems(Object.values(data.items));
                setCartCount(data.total_quantity);
                setCartTotal(data.total_price);
                setDiscountTotal(data.discount_total || 0);
                setFinalTotal(data.final_total || data.total_price);
                setVoucherCode(data.voucher_code);
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
            // Fix: Use PUT method
            const response = await axios.put('/cart/update', { row_id: rowId, quantity });
            if (response.data.status === 'success') {
                const data = response.data.data;
                setCartItems(Object.values(data.items));
                setCartCount(data.total_quantity);
                setCartItems(Object.values(data.items));
                setCartCount(data.total_quantity);
                setCartTotal(data.total_price);
                setDiscountTotal(data.discount_total || 0);
                setFinalTotal(data.final_total || data.total_price);
                setVoucherCode(data.voucher_code);
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
                // Reset state
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
                setDiscountTotal(data.discount_total || 0);
                setFinalTotal(data.final_total || data.total_price);
                setVoucherCode(data.voucher_code);
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
            cartItems, cartCount, cartTotal, discountTotal, finalTotal, voucherCode,
            addToCart, removeFromCart, updateQuantity, clearCart, refreshCart, applyVoucher, isLoading
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
