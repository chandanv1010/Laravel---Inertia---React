import { useState, useEffect } from 'react'
import AppLayout from '@/layouts/app-layout'
import { Head, useForm, router } from '@inertiajs/react'
import { Button } from '@/components/ui/button'
import CustomPageHeading from '@/components/custom-page-heading'
import { type BreadcrumbItem } from '@/types'
import CustomCard from '@/components/custom-card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import InputError from '@/components/input-error'
import { PriceInput } from '@/components/price-input'
import { LoaderCircle, RefreshCw } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import CustomAlbum from '@/components/custom-album'
import { PartnerSearchSelect } from '@/components/partner-search-select'

interface Reason {
    value: number
    label: string
}

interface Store {
    value: number
    label: string
}

interface BankAccount {
    value: number
    label: string
}

interface Partner {
    value: number
    label: string
}

interface ReceiptProps {
    receiptReasons?: Reason[]
    stores?: Store[]
    generatedCode?: string
    bankAccounts?: BankAccount[]
    initialCustomers?: Partner[]
    initialSuppliers?: Partner[]
    initialEmployees?: Partner[]
    transaction?: any
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Sổ quỹ', href: '/backend/cash-book/transaction' },
    { title: 'Tạo phiếu thu', href: '/backend/cash-book/transaction/create-receipt' },
]

const partnerGroups = [
    { value: 'customer', label: 'Khách hàng' },
    { value: 'supplier', label: 'Nhà cung cấp' },
    { value: 'employee', label: 'Nhân viên' },
    { value: 'shipping_partner', label: 'Đối tác vận chuyển' },
    { value: 'payment_partner', label: 'Đối tác thanh toán' },
    { value: 'other', label: 'Đối tượng khác' },
]

export default function Receipt({
    receiptReasons = [],
    stores = [],
    generatedCode = '',
    bankAccounts = [],
    initialCustomers = [],
    initialSuppliers = [],
    initialEmployees = [],
    transaction
}: ReceiptProps) {
    const isEdit = !!transaction
    const [date, setDate] = useState<Date>(transaction?.transaction_date ? new Date(transaction.transaction_date) : new Date())

    const { data, setData, post, put, processing, errors } = useForm({
        transaction_type: 'receipt' as const,
        payment_method: transaction?.payment_method || 'cash',
        bank_account_id: transaction?.bank_account_id || '',
        bank_account_info: transaction?.bank_account_info || '',
        partner_group: transaction?.partner_group || '',
        partner_id: transaction?.partner_id || '',
        partner_name: transaction?.partner_name || '',
        reason_id: transaction?.reason_id || '',
        amount: transaction?.amount || 0,
        description: transaction?.description || '',
        store_id: transaction?.store_id || '',
        transaction_date: transaction?.transaction_date || format(new Date(), 'yyyy-MM-dd'),
        transaction_code: transaction?.transaction_code || generatedCode,
        reference_code: transaction?.reference_code || '',
        attachments: transaction?.attachments || [],
    })

    useEffect(() => {
        setData('transaction_date', format(date, 'yyyy-MM-dd'))
    }, [date])

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()

        if (isEdit) {
            put(`/backend/cash-book/transaction/${transaction.id}`)
        } else {
            post('/backend/cash-book/transaction')
        }
    }

    const handleGenerateCode = () => {
        // Format: PT-{date}-{random}
        // PT = Phiếu thu
        // date = yymmdd (ví dụ: 251226)
        // random = 4 số ngẫu nhiên
        const today = new Date()
        const year = today.getFullYear().toString().slice(-2)
        const month = String(today.getMonth() + 1).padStart(2, '0')
        const day = String(today.getDate()).padStart(2, '0')
        const dateStr = `${year}${month}${day}`
        
        // Tạo 4 số ngẫu nhiên
        const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
        
        const code = `PT-${dateStr}-${randomNum}`
        setData('transaction_code', code)
    }

    const isPartnerInputMode = ['shipping_partner', 'payment_partner', 'other'].includes(data.partner_group)
    const isPartnerSearchMode = ['customer', 'supplier', 'employee'].includes(data.partner_group)

    const getPartnerType = (): 'customer' | 'supplier' | 'employee' | undefined => {
        switch (data.partner_group) {
            case 'customer': return 'customer'
            case 'supplier': return 'supplier'
            case 'employee': return 'employee'
            default: return undefined
        }
    }

    const getInitialData = (): Partner[] => {
        switch (data.partner_group) {
            case 'customer': return initialCustomers
            case 'supplier': return initialSuppliers
            case 'employee': return initialEmployees
            default: return []
        }
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={isEdit ? 'Chỉnh sửa phiếu thu' : 'Tạo phiếu thu'} />

            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl page-wrapper">
                <CustomPageHeading
                    heading={isEdit ? 'Chỉnh sửa phiếu thu' : 'Tạo phiếu thu'}
                    breadcrumbs={breadcrumbs}
                />

                <div className="page-container max-w-7xl mx-auto">
                    <form onSubmit={handleSubmit}>
                        <div className="flex items-center justify-end gap-3 mb-6">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => window.history.back()}
                            >
                                Hủy
                            </Button>
                            <Button
                                type="submit"
                                disabled={processing}
                                className="bg-blue-500 hover:bg-blue-600"
                            >
                                {processing && <LoaderCircle className="w-4 h-4 mr-2 animate-spin" />}
                                Tạo phiếu
                            </Button>
                        </div>

                        <div className="grid grid-cols-12 gap-6">
                            {/* Left Column - 9/12 */}
                            <div className="col-span-9 space-y-6">
                                <CustomCard isShowHeader title="Thông tin chung">
                                    <div className="space-y-4">
                                        {/* Payment Method */}
                                        <div className="space-y-2">
                                            <Label>Phương thức</Label>
                                            <RadioGroup
                                                value={data.payment_method}
                                                onValueChange={(value) => setData('payment_method', value as 'cash' | 'bank')}
                                            >
                                                <div className="flex items-center gap-6">
                                                    <div className="flex items-center space-x-2">
                                                        <RadioGroupItem value="cash" id="cash" />
                                                        <Label htmlFor="cash" className="font-normal cursor-pointer">
                                                            Tiền mặt
                                                        </Label>
                                                    </div>
                                                    <div className="flex items-center space-x-2">
                                                        <RadioGroupItem value="bank" id="bank" />
                                                        <Label htmlFor="bank" className="font-normal cursor-pointer">
                                                            Tài khoản ngân hàng
                                                        </Label>
                                                    </div>
                                                </div>
                                            </RadioGroup>
                                        </div>

                                        {/* Bank Account Selection (only show if payment_method is 'bank') */}
                                        {data.payment_method === 'bank' && (
                                            <>
                                                <div className="space-y-2">
                                                    <Label>Tài khoản ngân hàng *</Label>
                                                    <Select
                                                        value={data.bank_account_id.toString()}
                                                        onValueChange={(value) => setData('bank_account_id', parseInt(value))}
                                                    >
                                                        <SelectTrigger className="cursor-pointer w-full">
                                                            <SelectValue placeholder="Chọn tài khoản" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {bankAccounts.map((account) => (
                                                                <SelectItem key={account.value} value={account.value.toString()}>
                                                                    {account.label}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <InputError message={errors.bank_account_id} />
                                                </div>

                                                <div className="space-y-2">
                                                    <Label>Thông tin tài khoản</Label>
                                                    <Textarea
                                                        value={data.bank_account_info}
                                                        onChange={(e) => setData('bank_account_info', e.target.value)}
                                                        placeholder="Nhập thông tin tài khoản (số TK, chủ TK, ngân hàng...)"
                                                        rows={3}
                                                    />
                                                </div>
                                            </>
                                        )}

                                        {/* Partner Group & Partner on same row */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label>Nhóm đối tượng nộp</Label>
                                                <Select
                                                    value={data.partner_group}
                                                    onValueChange={(value) => {
                                                        setData('partner_group', value)
                                                        setData('partner_id', '')
                                                        setData('partner_name', '')
                                                    }}
                                                >
                                                    <SelectTrigger className="cursor-pointer w-full">
                                                        <SelectValue placeholder="Chọn nhóm" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {partnerGroups.map((group) => (
                                                            <SelectItem key={group.value} value={group.value}>
                                                                {group.label}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="space-y-2">
                                                <Label>Đối tượng nộp</Label>
                                                {isPartnerInputMode ? (
                                                    <Input
                                                        value={data.partner_name}
                                                        onChange={(e) => setData('partner_name', e.target.value)}
                                                        placeholder="Nhập tên đối tượng"
                                                        disabled={!data.partner_group}
                                                    />
                                                ) : isPartnerSearchMode && getPartnerType() ? (
                                                    <PartnerSearchSelect
                                                        value={data.partner_id}
                                                        onValueChange={(value, label) => {
                                                            setData('partner_id', value)
                                                            if (label) {
                                                                setData('partner_name', label)
                                                            }
                                                        }}
                                                        partnerType={getPartnerType()!}
                                                        placeholder="Tìm kiếm đối tượng nộp..."
                                                        disabled={!data.partner_group}
                                                        initialData={getInitialData()}
                                                    />
                                                ) : (
                                                    <Input
                                                        value=""
                                                        placeholder="Chọn nhóm đối tượng"
                                                        disabled
                                                    />
                                                )}
                                            </div>
                                        </div>

                                        {/* Reason & Amount on same row */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label>Lý do thu *</Label>
                                                <Select
                                                    value={data.reason_id.toString()}
                                                    onValueChange={(value) => setData('reason_id', parseInt(value))}
                                                    disabled={!data.partner_id && !data.partner_name}
                                                >
                                                    <SelectTrigger className="cursor-pointer w-full">
                                                        <SelectValue placeholder="Chọn lý do" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {receiptReasons.map((reason) => (
                                                            <SelectItem key={reason.value} value={reason.value.toString()}>
                                                                {reason.label}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <InputError message={errors.reason_id} />
                                            </div>

                                            <div className="space-y-2">
                                                <Label>Giá trị *</Label>
                                                <div className="flex items-center gap-2">
                                                    <PriceInput
                                                        value={data.amount}
                                                        onValueChange={(value) => setData('amount', value || 0)}
                                                        placeholder="Nhập giá trị"
                                                        className="flex-1"
                                                    />
                                                    <span className="text-sm font-medium">₫</span>
                                                </div>
                                                <InputError message={errors.amount} />
                                            </div>
                                        </div>

                                        {/* Description */}
                                        <div className="space-y-2">
                                            <Label>Diễn giải</Label>
                                            <Input
                                                value={data.description}
                                                onChange={(e) => setData('description', e.target.value)}
                                                placeholder="Nhập diễn giải"
                                            />
                                        </div>
                                    </div>
                                </CustomCard>

                                {/* Attachments */}
                                <CustomAlbum
                                    data={data.attachments}
                                    onDataChange={(urls) => setData('attachments', urls)}
                                />
                            </div>

                            {/* Right Column - 3/12 */}
                            <div className="col-span-3 space-y-6">
                                <CustomCard isShowHeader title="Thông tin bổ sung">
                                    <div className="space-y-4">
                                        {/* Store */}
                                        <div className="space-y-2">
                                            <Label>Chi nhánh nhận *</Label>
                                            <Select
                                                value={data.store_id.toString()}
                                                onValueChange={(value) => setData('store_id', parseInt(value))}
                                            >
                                                <SelectTrigger className="cursor-pointer w-full">
                                                    <SelectValue placeholder="Chọn chi nhánh" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {stores.map((store) => (
                                                        <SelectItem key={store.value} value={store.value.toString()}>
                                                            {store.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <InputError message={errors.store_id} />
                                        </div>

                                        {/* Transaction Date with Calendar */}
                                        <div className="space-y-2">
                                            <Label>Ngày nhận tiền *</Label>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Button
                                                        variant="outline"
                                                        className={cn(
                                                            "w-full justify-start text-left font-normal cursor-pointer",
                                                            !date && "text-muted-foreground"
                                                        )}
                                                    >
                                                        {date ? format(date, 'dd/MM/yyyy', { locale: vi }) : <span>Chọn ngày</span>}
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0" align="start">
                                                    <Calendar
                                                        mode="single"
                                                        selected={date}
                                                        onSelect={(newDate) => newDate && setDate(newDate)}
                                                        initialFocus
                                                        locale={vi}
                                                    />
                                                </PopoverContent>
                                            </Popover>
                                            <InputError message={errors.transaction_date} />
                                        </div>

                                        {/* Transaction Code with Generate Button */}
                                        <div className="space-y-2">
                                            <Label>Mã phiếu thu</Label>
                                            <div className="flex gap-2">
                                                <Input
                                                    value={data.transaction_code}
                                                    onChange={(e) => setData('transaction_code', e.target.value)}
                                                    placeholder="Mã tự động"
                                                    className="flex-1"
                                                />
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="icon"
                                                    onClick={handleGenerateCode}
                                                    title="Tạo mã mới"
                                                >
                                                    <RefreshCw className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Reference Code */}
                                        <div className="space-y-2">
                                            <Label>Tham chiếu</Label>
                                            <Input
                                                value={data.reference_code}
                                                onChange={(e) => setData('reference_code', e.target.value)}
                                                placeholder="Nhập tham chiếu"
                                            />
                                        </div>
                                    </div>
                                </CustomCard>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </AppLayout>
    )
}
