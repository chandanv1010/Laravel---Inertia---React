import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PriceInput } from '@/components/price-input';

interface DiscountModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    initialDiscount: number;
    initialDiscountType: 'amount' | 'percent';
    totalAmount: number;
    onConfirm: (discount: number, discountType: 'amount' | 'percent') => void;
}

export function DiscountModal({
    open,
    onOpenChange,
    initialDiscount,
    initialDiscountType = 'amount',
    totalAmount,
    onConfirm
}: DiscountModalProps) {
    const [discount, setDiscount] = useState(initialDiscount);
    const [discountType, setDiscountType] = useState<'amount' | 'percent'>(initialDiscountType);
    const [finalAmount, setFinalAmount] = useState(0);

    useEffect(() => {
        if (open) {
            setDiscount(initialDiscount);
            setDiscountType(initialDiscountType);
        }
    }, [open, initialDiscount, initialDiscountType]);

    useEffect(() => {
        let calculatedFinal = totalAmount;
        if (discountType === 'amount') {
            calculatedFinal = Math.max(0, totalAmount - discount);
        } else {
            calculatedFinal = Math.max(0, totalAmount * (1 - discount / 100));
        }
        setFinalAmount(calculatedFinal);
    }, [totalAmount, discount, discountType]);

    const handleConfirm = () => {
        onConfirm(discount, discountType);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Thêm giảm giá</DialogTitle>
                </DialogHeader>

                <div className="grid gap-6 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-left font-medium">
                            Tổng tiền:
                        </Label>
                        <div className="col-span-3 text-right font-bold text-blue-600">
                            {totalAmount.toLocaleString('vi-VN')}₫
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
                                {discountType === 'amount' ? (
                                    <>
                                        <PriceInput
                                            value={discount}
                                            onValueChange={(val) => setDiscount(val || 0)}
                                            placeholder="Nhập số tiền giảm"
                                            className="pr-8"
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 pointer-events-none">₫</span>
                                    </>
                                ) : (
                                    <>
                                        <Input
                                            type="number"
                                            value={discount}
                                            onChange={(e) => setDiscount(Number(e.target.value))}
                                            placeholder="Nhập % giảm"
                                            className="pr-8"
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 pointer-events-none">%</span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-left font-medium">
                            Số tiền giảm:
                        </Label>
                        <div className="col-span-3 text-right font-bold text-red-500">
                            {discountType === 'amount' 
                                ? `-${discount.toLocaleString('vi-VN')}₫`
                                : `-${(totalAmount * discount / 100).toLocaleString('vi-VN')}₫`
                            }
                        </div>
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-left font-medium">
                            Tổng sau giảm:
                        </Label>
                        <div className="col-span-3 text-right font-bold text-green-600">
                            {finalAmount.toLocaleString('vi-VN')}₫
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
