import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import InputError from '@/components/input-error';
import { useForm, router } from '@inertiajs/react';
import { useState } from 'react';
import { Edit, Plus, Trash2 } from 'lucide-react';

type BankAccount = {
    id: number;
    payment_method_id: number;
    bank_name: string;
    account_number: string;
    account_holder_name: string;
    note?: string;
    is_active: boolean;
    order: number;
};

interface BankAccountManagerProps {
    bankAccounts: BankAccount[];
    paymentMethodId: number;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export default function BankAccountManager({
    bankAccounts = [],
    paymentMethodId,
    open,
    onOpenChange,
}: BankAccountManagerProps) {
    const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
    const [formOpen, setFormOpen] = useState(false);

    const { data, setData, post, put, delete: destroy, processing, errors, reset, clearErrors } = useForm({
        payment_method_id: paymentMethodId,
        bank_name: '',
        account_number: '',
        account_holder_name: '',
        note: '',
        is_active: true,
        order: 0,
    });

    const handleCreate = () => {
        setEditingAccount(null);
        reset();
        setData('payment_method_id', paymentMethodId);
        clearErrors();
        setFormOpen(true);
    };

    const handleEdit = (account: BankAccount) => {
        setEditingAccount(account);
        setData({
            payment_method_id: account.payment_method_id,
            bank_name: account.bank_name,
            account_number: account.account_number,
            account_holder_name: account.account_holder_name,
            note: account.note || '',
            is_active: Boolean(account.is_active),
            order: account.order,
        });
        clearErrors();
        setFormOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const onSuccess = () => {
            setFormOpen(false);
            reset();
        };

        if (editingAccount) {
            router.post(`/backend/payment-methods/bank-accounts/${editingAccount.id}`, {
                _method: 'PUT',
                ...data
            }, {
                onSuccess,
                preserveScroll: true,
            });
        } else {
            router.post('/backend/payment-methods/bank-accounts', data, {
                onSuccess,
                preserveScroll: true,
            });
        }
    };

    const handleDelete = (id: number) => {
        if (confirm('Bạn có chắc chắn muốn xóa tài khoản này?')) {
            router.delete(`/backend/payment-methods/bank-accounts/${id}`, {
                preserveScroll: true,
            });
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Quản lý tài khoản ngân hàng</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="flex justify-end">
                        <Button onClick={handleCreate} size="sm">
                            <Plus className="h-4 w-4 mr-2" />
                            Thêm tài khoản
                        </Button>
                    </div>

                    <div className="border rounded-md">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Tên ngân hàng</TableHead>
                                    <TableHead>Số tài khoản</TableHead>
                                    <TableHead>Chủ tài khoản</TableHead>
                                    <TableHead>Trạng thái</TableHead>
                                    <TableHead className="text-right">Hành động</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {bankAccounts.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                            Chưa có tài khoản ngân hàng nào
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    bankAccounts.map((account) => (
                                        <TableRow key={account.id}>
                                            <TableCell className="font-medium">{account.bank_name}</TableCell>
                                            <TableCell>{account.account_number}</TableCell>
                                            <TableCell>{account.account_holder_name}</TableCell>
                                            <TableCell>
                                                {account.is_active ? (
                                                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                                        Đang sử dụng
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                                                        Ngưng sử dụng
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleEdit(account)}
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-destructive hover:text-destructive"
                                                        onClick={() => handleDelete(account.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </DialogContent>

            {/* Form Modal */}
            <Dialog open={formOpen} onOpenChange={setFormOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {editingAccount ? 'Cập nhật tài khoản' : 'Thêm tài khoản mới'}
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <Label htmlFor="bank_name">Tên ngân hàng *</Label>
                            <Input
                                id="bank_name"
                                value={data.bank_name}
                                onChange={(e) => setData('bank_name', e.target.value)}
                                placeholder="Ví dụ: Techcombank, Vietcombank..."
                                required
                                className="mt-2"
                            />
                            <InputError message={errors.bank_name} className="mt-1" />
                        </div>
                        <div>
                            <Label htmlFor="account_number">Số tài khoản *</Label>
                            <Input
                                id="account_number"
                                value={data.account_number}
                                onChange={(e) => setData('account_number', e.target.value)}
                                placeholder="Nhập số tài khoản"
                                required
                                className="mt-2"
                            />
                            <InputError message={errors.account_number} className="mt-1" />
                        </div>
                        <div>
                            <Label htmlFor="account_holder_name">Tên chủ tài khoản</Label>
                            <Input
                                id="account_holder_name"
                                value={data.account_holder_name}
                                onChange={(e) => setData('account_holder_name', e.target.value)}
                                placeholder="Nhập tên chủ tài khoản"
                                className="mt-2"
                            />
                            <InputError message={errors.account_holder_name} className="mt-1" />
                        </div>
                        <div>
                            <Label htmlFor="note">Ghi chú</Label>
                            <Input
                                id="note"
                                value={data.note}
                                onChange={(e) => setData('note', e.target.value)}
                                placeholder="Ghi chú thêm (chi nhánh, v.v.)"
                                className="mt-2"
                            />
                            <InputError message={errors.note} className="mt-1" />
                        </div>
                        <div className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                id="is_active"
                                checked={data.is_active}
                                onChange={(e) => setData('is_active', e.target.checked)}
                                className="rounded border-gray-300 text-primary shadow-sm focus:ring-primary"
                            />
                            <Label htmlFor="is_active">Đang sử dụng</Label>
                        </div>
                        <div className="flex justify-end gap-2 pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setFormOpen(false)}
                            >
                                Hủy
                            </Button>
                            <Button type="submit" disabled={processing}>
                                {editingAccount ? 'Cập nhật' : 'Thêm mới'}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </Dialog>
    );
}
