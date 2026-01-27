import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import InputError from '@/components/input-error';
import { useForm, router } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import { BankSelect } from '@/components/bank-select';
import { BANKS } from '@/constants/banks';

interface AddBankAccountModalProps {
    paymentMethodId: number;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: (newAccount: any) => void;
}

export default function AddBankAccountModal({
    paymentMethodId,
    open,
    onOpenChange,
    onSuccess,
}: AddBankAccountModalProps) {
    const { data, setData, post, processing, errors, reset, clearErrors } = useForm({
        payment_method_id: paymentMethodId,
        bank_name: '',
        bank_bin: '', // Store BIN for VietQR lookup if needed, or mapping
        account_number: '',
        account_holder_name: '',
        note: '',
        is_active: true,
        order: 0,
    });

    useEffect(() => {
        if (open) {
            reset();
            setData('payment_method_id', paymentMethodId);
            clearErrors();
        }
    }, [open, paymentMethodId]);

    const handleBankSelect = (bin: string) => {
        const bank = BANKS.find(b => b.bin === bin);
        if (bank) {
            // Set từng field riêng để đảm bảo Inertia form update đúng
            setData('bank_bin', bin);
            setData('bank_name', bank.shortName); // Using ShortName as primary display name
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        post('/backend/payment-methods/bank-accounts', {
            preserveScroll: true,
            onSuccess: (page) => {
                onOpenChange(false);
                reset();
                // Reload page to refresh bank accounts list
                router.reload({ only: ['bankAccounts'] });
                if (onSuccess) {
                    onSuccess(null);
                }
            },
            onError: (errors) => {
                // Errors sẽ tự động được set vào errors object từ useForm
                // Không cần console.log, chỉ cần để Inertia xử lý
            },
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    {/* Added Back arrow icon if needed <ChevronLeft ... /> */}
                    <DialogTitle>Thêm tài khoản thụ hưởng</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="bank_bin">Ngân hàng thụ hưởng <span className="text-red-500">*</span></Label>
                            <BankSelect
                                value={data.bank_bin}
                                onChange={handleBankSelect}
                            />
                            <InputError message={errors.bank_name || errors.bank_bin} className="mt-1" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="account_number">Số tài khoản <span className="text-red-500">*</span></Label>
                            <Input
                                id="account_number"
                                value={data.account_number}
                                onChange={(e) => setData('account_number', e.target.value)}
                                placeholder="Nhập số tài khoản thụ hưởng"
                                className="h-10"
                            />
                            <InputError message={errors.account_number} className="mt-1" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="account_holder_name">Tên chủ tài khoản <span className="text-red-500">*</span></Label>
                            <Input
                                id="account_holder_name"
                                value={data.account_holder_name}
                                onChange={(e) => setData('account_holder_name', e.target.value)}
                                placeholder="Nhập tên chủ tài khoản"
                                className="h-10"
                            />
                            <InputError message={errors.account_holder_name} className="mt-1" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="note">Ghi chú</Label>
                            <Input
                                id="note"
                                value={data.note}
                                onChange={(e) => setData('note', e.target.value)}
                                placeholder="Nhập ghi chú"
                                className="h-10"
                            />
                            <InputError message={errors.note} className="mt-1" />
                        </div>
                    </div>

                    <DialogFooter className="pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            className="h-10 px-8 border-blue-500 text-blue-500 hover:bg-blue-50"
                        >
                            Hủy
                        </Button>
                        <Button type="submit" disabled={processing} className="h-10 px-8 bg-blue-500 hover:bg-blue-600">
                            Lưu
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
