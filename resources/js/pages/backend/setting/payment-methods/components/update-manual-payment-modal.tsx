import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { MultiSelect } from '@/components/custom-multiple-select';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import InputError from '@/components/input-error';
import { useForm, router } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import { PlusCircle, Info, Trash2 } from 'lucide-react';
import AddBankAccountModal from './add-bank-account-modal';
import { Checkbox } from "@/components/ui/checkbox";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"

interface UpdateManualPaymentModalProps {
    method: any;
    details: any;
    bankAccounts: any[];
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export default function UpdateManualPaymentModal({
    method,
    details,
    bankAccounts = [],
    open,
    onOpenChange,
}: UpdateManualPaymentModalProps) {
    const [addAccountOpen, setAddAccountOpen] = useState(false);

    const { data, setData, put, processing, errors, reset, clearErrors } = useForm({
        name: '',
        payment_instructions: '',
        beneficiary_account_ids: [] as string[],
        allow_use_when_paying: true,
        create_receipt_immediately: true,
    });

    useEffect(() => {
        if (open && method) {
            // Convert beneficiary_account_ids to array of strings
            let accountIds: string[] = [];
            if (details?.beneficiary_account_ids) {
                if (Array.isArray(details.beneficiary_account_ids)) {
                    accountIds = details.beneficiary_account_ids.map((id: any) => id.toString());
                } else if (details.beneficiary_account_id) {
                    // Fallback to single account_id for backward compatibility
                    accountIds = [details.beneficiary_account_id.toString()];
                }
            } else if (details?.beneficiary_account_id) {
                accountIds = [details.beneficiary_account_id.toString()];
            }
            
            setData({
                name: method.name,
                payment_instructions: details?.payment_instructions || '',
                beneficiary_account_ids: accountIds,
                allow_use_when_paying: details?.allow_use_when_paying ?? true,
                create_receipt_immediately: details?.create_receipt_immediately ?? true,
            });
            clearErrors();
        }
    }, [open, method, details, bankAccounts]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Nếu chưa có details.id, tạo mới. Nếu có, cập nhật
        const url = details?.id 
            ? `/backend/manual-payment-methods/${details.id}`
            : '/backend/manual-payment-methods';
        const httpMethod = details?.id ? 'put' : 'post';
        
        const submitData = {
            ...data,
            payment_method_id: method.id, // Đảm bảo có payment_method_id khi tạo mới
        };

        if (httpMethod === 'post') {
            router.post(url, submitData, {
                onSuccess: () => {
                    if (data.name !== method.name) {
                        router.put(`/backend/payment-methods/${method.id}`, {
                            name: data.name
                        }, {
                            onSuccess: () => {
                                onOpenChange(false);
                                router.reload({ only: ['bankTransferMethodDetails'] });
                            }
                        });
                    } else {
                        onOpenChange(false);
                        router.reload({ only: ['bankTransferMethodDetails'] });
                    }
                },
                preserveScroll: true,
                onError: (errors) => {
                    console.error('Error saving manual payment method:', errors);
                },
            });
        } else {
            router.put(url, submitData, {
                onSuccess: () => {
                    if (data.name !== method.name) {
                        router.put(`/backend/payment-methods/${method.id}`, {
                            name: data.name
                        }, {
                            onSuccess: () => {
                                onOpenChange(false);
                                router.reload({ only: ['bankTransferMethodDetails'] });
                            }
                        });
                    } else {
                        onOpenChange(false);
                        router.reload({ only: ['bankTransferMethodDetails'] });
                    }
                },
                preserveScroll: true,
                onError: (errors) => {
                    console.error('Error updating manual payment method:', errors);
                },
            });
        }
    };

    const handleDelete = () => {
        if (confirm('Bạn có chắc chắn muốn xóa phương thức này?')) {
            router.delete(`/backend/payment-methods/${method.id}`, {
                onSuccess: () => onOpenChange(false)
            });
        }
    }

    const handleMultiSelectChange = (values: string[]) => {
        setData('beneficiary_account_ids', values);
    };

    const handleAddNewAccount = () => {
        setAddAccountOpen(true);
    };

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-[700px]">
                    <DialogHeader>
                        <DialogTitle>Cập nhật phương thức thanh toán</DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="type">Loại phương thức <span className="text-red-500">*</span></Label>
                                <Select disabled defaultValue="transfer">
                                    <SelectTrigger className="bg-gray-100 w-full">
                                        <SelectValue placeholder="Chuyển khoản" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="transfer">Chuyển khoản</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="name">Tên phương thức <span className="text-red-500">*</span></Label>
                                <Input
                                    id="name"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    placeholder="Ví dụ: Chuyển khoản"
                                />
                                <InputError message={errors.name} className="mt-1" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="beneficiary_account">Tài khoản thụ hưởng <span className="text-red-500">*</span></Label>
                            <div className="space-y-2">
                                <MultiSelect
                                    options={bankAccounts.map((account) => ({
                                        label: `${account.bank_name} - ${account.account_number}${account.account_holder_name ? ` - ${account.account_holder_name}` : ''}`,
                                        value: account.id.toString(),
                                    }))}
                                    onValueChange={handleMultiSelectChange}
                                    defaultValue={data.beneficiary_account_ids}
                                    placeholder="Chọn tài khoản thụ hưởng"
                                    maxCount={3}
                                    className="w-full"
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={handleAddNewAccount}
                                    className="w-full text-blue-600 border-blue-200 hover:bg-blue-50"
                                >
                                    <PlusCircle className="h-4 w-4 mr-2" />
                                    Thêm mới tài khoản thụ hưởng
                                </Button>
                            </div>
                            <InputError message={errors.beneficiary_account_ids} className="mt-1" />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="instructions">Hướng dẫn thanh toán</Label>
                            <Textarea
                                id="instructions"
                                value={data.payment_instructions}
                                onChange={(e) => setData('payment_instructions', e.target.value)}
                                placeholder="Nhập hướng dẫn hiển thị trên trang thanh toán của Website"
                                className="h-24 resize-none"
                            />
                            <InputError message={errors.payment_instructions} className="mt-1" />
                        </div>

                        <div className="space-y-4">
                            <TooltipProvider>
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="allow_use"
                                        checked={data.allow_use_when_paying}
                                        onCheckedChange={(checked) => setData('allow_use_when_paying', checked as boolean)}
                                    />
                                    <Label htmlFor="allow_use" className="font-normal cursor-pointer flex items-center gap-1">
                                        Cho phép sử dụng khi thanh toán
                                        <Tooltip>
                                            <TooltipTrigger type="button">
                                                <Info className="h-4 w-4 text-blue-500" />
                                            </TooltipTrigger>
                                            <TooltipContent className="bg-slate-800 text-white border-0">
                                                <p className="max-w-xs text-xs">Phương thức sẽ được hiển thị khi thanh toán đơn hàng. Lưu ý: danh sách phương thức thanh toán được sử dụng còn tùy thuộc vào tính năng của từng kênh bán hàng</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="create_receipt"
                                        checked={data.create_receipt_immediately}
                                        onCheckedChange={(checked) => setData('create_receipt_immediately', checked as boolean)}
                                    />
                                    <Label htmlFor="create_receipt" className="font-normal cursor-pointer flex items-center gap-1">
                                        Tạo phiếu thu ngay khi xác nhận thanh toán đơn hàng
                                        <Tooltip>
                                            <TooltipTrigger type="button">
                                                <Info className="h-4 w-4 text-blue-500" />
                                            </TooltipTrigger>
                                            <TooltipContent className="bg-slate-800 text-white border-0">
                                                <p className="max-w-xs text-xs">Hệ thống tự động ghi nhận nhập quỹ và tạo phiếu thu ngay khi có xác nhận thanh toán đơn hàng thành công</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </Label>
                                </div>
                            </TooltipProvider>
                        </div>

                        <DialogFooter className="flex justify-between items-center pt-6 border-t">
                            <Button
                                type="button"
                                variant="outline"
                                className="w-24 text-red-500 border-red-200 hover:bg-red-50 hover:text-red-700"
                                onClick={handleDelete}
                            >
                                Xóa
                            </Button>
                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => onOpenChange(false)}
                                    className="w-24 border-blue-500 text-blue-500 hover:bg-blue-50"
                                >
                                    Hủy
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={processing || !data.payment_instructions}
                                    className="w-24 bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Lưu
                                </Button>
                            </div>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Nested Add Bank Account Modal */}
            <AddBankAccountModal
                paymentMethodId={method.id}
                open={addAccountOpen}
                onOpenChange={(open) => {
                    setAddAccountOpen(open);
                    if (!open) {
                        // Reload page to refresh bank accounts list
                        router.reload({ only: ['bankAccounts'] });
                    }
                }}
                onSuccess={(newAccount) => {
                    // Reload page to refresh bank accounts list
                    router.reload({ only: ['bankAccounts'] });
                }}
            />
        </>
    );
}
