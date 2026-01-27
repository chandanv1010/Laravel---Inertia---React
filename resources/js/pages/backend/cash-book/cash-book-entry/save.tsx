import { useState, useRef } from 'react';
import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import { type IDateTime, type BreadcrumbItem } from '@/types';
import { Head, Form, router } from '@inertiajs/react';
import CustomPageHeading from '@/components/custom-page-heading';
import CustomCard from '@/components/custom-card';
import { Button } from "@/components/ui/button"
import { ArrowLeft, LoaderCircle } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from "@/components/ui/input"
import InputError from '@/components/input-error';
import { setPreserveState } from '@/lib/helper';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Combobox } from '@/components/ui/combobox';
import { Textarea } from '@/components/ui/textarea';
import { PriceInput } from '@/components/price-input';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: dashboard().url,
    },
    {
        title: 'Sổ quỹ',
        href: '/backend/cash-book',
    },
    {
        title: 'Thêm mới phiếu',
        href: '/',
    }
];

export interface CashBookEntry extends IDateTime {
    id?: number;
    code: string | null;
    entry_type: 'income' | 'expense' | 'transfer';
    amount: number;
    description: string | null;
    category: string | null;
    from_account_id: number | null;
    from_account?: { id: number; bank_name: string; account_number: string } | null;
    to_account_id: number | null;
    to_account?: { id: number; bank_name: string; account_number: string } | null;
    reference: string | null;
    entry_date: string;
    status: 'draft' | 'completed' | 'cancelled';
}

interface CashBookEntrySaveProps {
    record?: CashBookEntry;
    entryType?: 'income' | 'expense' | 'transfer';
    bankAccounts?: Array<{ value: string | number; label: string }>;
}

export default function CashBookEntrySave({ 
    record, 
    entryType = 'income',
    bankAccounts = []
}: CashBookEntrySaveProps) {
    const buttonAction = useRef("");
    const isEdit = !!record;

    const [code, setCode] = useState(record?.code || '');
    const [currentEntryType, setCurrentEntryType] = useState<'income' | 'expense' | 'transfer'>(
        record?.entry_type || entryType
    );
    const [amount, setAmount] = useState<number>(record?.amount || 0);
    const [description, setDescription] = useState(record?.description || '');
    const [category, setCategory] = useState(record?.category || '');
    const [fromAccountId, setFromAccountId] = useState(record?.from_account_id?.toString() || '');
    const [toAccountId, setToAccountId] = useState(record?.to_account_id?.toString() || '');
    const [reference, setReference] = useState(record?.reference || '');
    const [entryDate, setEntryDate] = useState<string>(
        record?.entry_date || new Date().toISOString().split('T')[0]
    );

    const getActionUrl = () => {
        if (isEdit && record) {
            return `/backend/cash-book/${record.id}`;
        }
        return '/backend/cash-book';
    };

    const getTitle = () => {
        if (isEdit) {
            return 'Cập nhật phiếu';
        }
        switch (currentEntryType) {
            case 'income':
                return 'Tạo phiếu thu';
            case 'expense':
                return 'Tạo phiếu chi';
            case 'transfer':
                return 'Chuyển quỹ nội bộ';
            default:
                return 'Thêm mới phiếu';
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={getTitle()} />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl page-wrapper">
                <CustomPageHeading
                    heading={getTitle()}
                    breadcrumbs={breadcrumbs}
                />
                <div className="page-container">
                    <div className="max-w-[1000px] ml-auto mr-auto">
                        <div className="mb-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => router.get('/backend/cash-book')}
                            >
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Quay lại
                            </Button>
                        </div>

                        <Form
                            action={getActionUrl()}
                            method="post"
                            options={{
                                preserveScroll: true,
                                preserveState: setPreserveState,
                            }}
                            transform={(data) => ({
                                ...data,
                                code: code || data.code,
                                entry_type: currentEntryType,
                                amount: amount || 0,
                                description: description || null,
                                category: category || null,
                                from_account_id: currentEntryType === 'transfer' || currentEntryType === 'expense' ? (fromAccountId || null) : null,
                                to_account_id: currentEntryType === 'transfer' || currentEntryType === 'income' ? (toAccountId || null) : null,
                                reference: reference || null,
                                entry_date: entryDate || null,
                                status: isEdit ? (record?.status || 'completed') : 'completed',
                                ...(isEdit ? { _method: 'put' } : {}),
                                save_and_redirect: buttonAction.current,
                            })}
                        >
                            {({ processing, errors }) => (
                                <div className="space-y-6">
                                    <CustomCard title="Thông tin phiếu">
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="code">Mã phiếu</Label>
                                                    <Input
                                                        id="code"
                                                        name="code"
                                                        value={code}
                                                        onChange={(e) => setCode(e.target.value)}
                                                        placeholder="Để trống để tự động tạo"
                                                    />
                                                    <InputError message={errors.code} className="mt-1" />
                                                </div>

                                                <div className="space-y-2">
                                                    <Label htmlFor="entry_type">Loại phiếu</Label>
                                                    <Select
                                                        value={currentEntryType}
                                                        onValueChange={(value: 'income' | 'expense' | 'transfer') => {
                                                            setCurrentEntryType(value);
                                                            if (value !== 'transfer') {
                                                                setFromAccountId('');
                                                                setToAccountId('');
                                                            }
                                                        }}
                                                        disabled={isEdit}
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="income">Thu</SelectItem>
                                                            <SelectItem value="expense">Chi</SelectItem>
                                                            <SelectItem value="transfer">Chuyển quỹ</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <InputError message={errors.entry_type} className="mt-1" />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="entry_date">
                                                        Ngày <span className="text-red-500">*</span>
                                                    </Label>
                                                    <Input
                                                        id="entry_date"
                                                        name="entry_date"
                                                        type="date"
                                                        value={entryDate}
                                                        onChange={(e) => setEntryDate(e.target.value)}
                                                        required
                                                    />
                                                    <InputError message={errors.entry_date} className="mt-1" />
                                                </div>

                                                <div className="space-y-2">
                                                    <Label htmlFor="amount">
                                                        Số tiền <span className="text-red-500">*</span>
                                                    </Label>
                                                    <PriceInput
                                                        id="amount"
                                                        value={amount}
                                                        onValueChange={(value) => setAmount(value || 0)}
                                                        className="w-full"
                                                        placeholder="0"
                                                        min={0}
                                                        required
                                                        autoComplete="off"
                                                    />
                                                    <input type="hidden" name="amount" value={amount} />
                                                    <InputError message={errors.amount} className="mt-1" />
                                                </div>
                                            </div>

                                            {currentEntryType === 'transfer' ? (
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <Label htmlFor="from_account_id">
                                                            Tài khoản nguồn <span className="text-red-500">*</span>
                                                        </Label>
                                                        <Combobox
                                                            options={bankAccounts.map(a => ({ label: a.label, value: a.value.toString() }))}
                                                            value={fromAccountId}
                                                            onValueChange={setFromAccountId}
                                                            placeholder="Chọn tài khoản nguồn"
                                                            name="from_account_id"
                                                        />
                                                        <InputError message={errors.from_account_id} className="mt-1" />
                                                    </div>

                                                    <div className="space-y-2">
                                                        <Label htmlFor="to_account_id">
                                                            Tài khoản đích <span className="text-red-500">*</span>
                                                        </Label>
                                                        <Combobox
                                                            options={bankAccounts.map(a => ({ label: a.label, value: a.value.toString() }))}
                                                            value={toAccountId}
                                                            onValueChange={setToAccountId}
                                                            placeholder="Chọn tài khoản đích"
                                                            name="to_account_id"
                                                        />
                                                        <InputError message={errors.to_account_id} className="mt-1" />
                                                    </div>
                                                </div>
                                            ) : currentEntryType === 'income' ? (
                                                <div className="space-y-2">
                                                    <Label htmlFor="to_account_id">
                                                        Tài khoản nhận <span className="text-red-500">*</span>
                                                    </Label>
                                                    <Combobox
                                                        options={bankAccounts.map(a => ({ label: a.label, value: a.value.toString() }))}
                                                        value={toAccountId}
                                                        onValueChange={setToAccountId}
                                                        placeholder="Chọn tài khoản nhận"
                                                        name="to_account_id"
                                                    />
                                                    <InputError message={errors.to_account_id} className="mt-1" />
                                                </div>
                                            ) : (
                                                <div className="space-y-2">
                                                    <Label htmlFor="from_account_id">
                                                        Tài khoản chi <span className="text-red-500">*</span>
                                                    </Label>
                                                    <Combobox
                                                        options={bankAccounts.map(a => ({ label: a.label, value: a.value.toString() }))}
                                                        value={fromAccountId}
                                                        onValueChange={setFromAccountId}
                                                        placeholder="Chọn tài khoản chi"
                                                        name="from_account_id"
                                                    />
                                                    <InputError message={errors.from_account_id} className="mt-1" />
                                                </div>
                                            )}

                                            <div className="space-y-2">
                                                <Label htmlFor="description">Mô tả</Label>
                                                <Textarea
                                                    id="description"
                                                    name="description"
                                                    value={description}
                                                    onChange={(e) => setDescription(e.target.value)}
                                                    placeholder="Nhập mô tả"
                                                    rows={3}
                                                />
                                                <InputError message={errors.description} className="mt-1" />
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="category">Danh mục</Label>
                                                    <Input
                                                        id="category"
                                                        name="category"
                                                        value={category}
                                                        onChange={(e) => setCategory(e.target.value)}
                                                        placeholder="Nhập danh mục (nếu có)"
                                                    />
                                                    <InputError message={errors.category} className="mt-1" />
                                                </div>

                                                <div className="space-y-2">
                                                    <Label htmlFor="reference">Tham chiếu</Label>
                                                    <Input
                                                        id="reference"
                                                        name="reference"
                                                        value={reference}
                                                        onChange={(e) => setReference(e.target.value)}
                                                        placeholder="Mã tham chiếu (nếu có)"
                                                    />
                                                    <InputError message={errors.reference} className="mt-1" />
                                                </div>
                                            </div>
                                        </div>
                                    </CustomCard>

                                    <div className="flex items-center justify-end gap-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => router.get('/backend/cash-book')}
                                        >
                                            Hủy
                                        </Button>
                                        <Button
                                            type="submit"
                                            className="w-[150px] cursor-pointer"
                                            disabled={processing}
                                            onClick={() => (buttonAction.current = '')}
                                        >
                                            {processing && (
                                                <LoaderCircle className="h-4 w-4 animate-spin" />
                                            )}
                                            {isEdit ? 'Cập nhật' : 'Tạo mới'}
                                        </Button>
                                        <Button
                                            type="submit"
                                            className="w-[150px] cursor-pointer bg-blue-500"
                                            disabled={processing}
                                            onClick={() => (buttonAction.current = 'redirect')}
                                        >
                                            {processing && (
                                                <LoaderCircle className="h-4 w-4 animate-spin" />
                                            )}
                                            Lưu và quay lại
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </Form>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}

