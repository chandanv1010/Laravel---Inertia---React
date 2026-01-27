
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PriceInput } from '@/components/price-input';

interface AdjustPriceModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    initialPrice: number;
    initialDiscount: number;
    initialDiscountType: 'amount' | 'percent';
    onConfirm: (price: number, discount: number, discountType: 'amount' | 'percent') => void;
}

export function AdjustPriceModal({
    open,
    onOpenChange,
    initialPrice,
    initialDiscount,
    initialDiscountType = 'amount',
    onConfirm
}: AdjustPriceModalProps) {
    const [price, setPrice] = useState(initialPrice);
    const [discount, setDiscount] = useState(initialDiscount);
    const [discountType, setDiscountType] = useState<'amount' | 'percent'>(initialDiscountType);
    const [finalPrice, setFinalPrice] = useState(0);

    useEffect(() => {
        if (open) {
            setPrice(initialPrice);
            setDiscount(initialDiscount);
            setDiscountType(initialDiscountType);
        }
    }, [open, initialPrice, initialDiscount, initialDiscountType]);

    useEffect(() => {
        let calculatedFinal = price;
        if (discountType === 'amount') {
            calculatedFinal = Math.max(0, price - discount);
        } else {
            calculatedFinal = Math.max(0, price * (1 - discount / 100));
        }
        setFinalPrice(calculatedFinal);
    }, [price, discount, discountType]);

    const handleConfirm = () => {
        onConfirm(price, discount, discountType);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Điều chỉnh giá sản phẩm</DialogTitle>
                </DialogHeader>

                <div className="grid gap-6 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="price" className="text-left font-medium">
                            Đơn giá:
                        </Label>
                        <div className="col-span-3 relative">
                            <PriceInput
                                id="price"
                                value={price}
                                onValueChange={(val) => setPrice(val || 0)}
                                className="font-bold text-blue-600 pr-8"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 pointer-events-none">đ</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-left font-medium">
                            Loại giảm giá:
                        </Label>
                        <div className="col-span-3 flex gap-2">
                            <Tabs value={discountType} onValueChange={(v) => setDiscountType(v as 'amount' | 'percent')} className="w-[120px]">
                                <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="amount">Giá trị</TabsTrigger>
                                    <TabsTrigger value="percent">%</TabsTrigger>
                                </TabsList>
                            </Tabs>
                            <div className="flex-1 relative">
                                <Input
                                    type="number"
                                    value={discount}
                                    onChange={(e) => setDiscount(Number(e.target.value))}
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                                    {discountType === 'amount' ? 'đ' : '%'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-left font-medium">
                            Giá sau giảm:
                        </Label>
                        <div className="col-span-3 text-right font-bold">
                            {finalPrice.toLocaleString('vi-VN')}đ
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Hủy</Button>
                    <Button onClick={handleConfirm} className="bg-blue-600 hover:bg-blue-700 text-white">Áp dụng</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
