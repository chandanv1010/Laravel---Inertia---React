import { useState, useEffect } from 'react'
import AppLayout from '@/layouts/app-layout'
import { Head, useForm } from '@inertiajs/react'
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
import InputError from '@/components/input-error'
import { PriceInput } from '@/components/price-input'
import { LoaderCircle, RefreshCw, ArrowRight } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import CustomAlbum from '@/components/custom-album'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface Store {
    value: number
    label: string
}

interface TransferProps {
    stores: Store[]
    generatedCode: string
    transaction?: any
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Sổ quỹ', href: '/backend/cash-book/transaction' },
    { title: 'Chuyển quỹ nội bộ', href: '/backend/cash-book/transaction/create-transfer' },
]

export default function Transfer({ stores, generatedCode, transaction }: TransferProps) {
    const isEdit = !!transaction
    const [date, setDate] = useState<Date>(transaction?.transaction_date ? new Date(transaction.transaction_date) : new Date())

    const { data, setData, post, put, processing, errors } = useForm({
        transaction_type: 'transfer' as const,
        payment_method: 'cash' as const,
        store_id: transaction?.store_id || '',
        recipient_store_id: transaction?.recipient_store_id || '',
        amount: transaction?.amount || 0,
        description: transaction?.description || '',
        transaction_date: transaction?.transaction_date || format(new Date(), 'yyyy-MM-dd'),
        transaction_code: transaction?.transaction_code || generatedCode,
        reference_code: transaction?.reference_code || '',
        reason_id: transaction?.reason_id || 1, // Default reason for transfer
        attachments: transaction?.attachments || [],
        publish: transaction?.publish || '2',
    })

    useEffect(() => {
        setData('transaction_date', format(date, 'yyyy-MM-dd'))
    }, [date])

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()

        // Validate different stores
        if (data.store_id && data.recipient_store_id && data.store_id === data.recipient_store_id) {
            return
        }

        if (isEdit) {
            put(`/backend/cash-book/transaction/${transaction.id}`)
        } else {
            post('/backend/cash-book/transaction')
        }
    }

    const handleGenerateCode = () => {
        // Format: CQ-yymmdd-xxxx
        // CQ = Chuyển quỹ
        const today = new Date()
        const year = today.getFullYear().toString().slice(-2)
        const month = String(today.getMonth() + 1).padStart(2, '0')
        const day = String(today.getDate()).padStart(2, '0')
        const dateStr = `${year}${month}${day}`
        
        // Tạo 4 số ngẫu nhiên
        const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
        
        const code = `CQ-${dateStr}-${randomNum}`
        setData('transaction_code', code)
    }

    const fromStore = stores.find(s => s.value.toString() === data.store_id.toString())
    const toStore = stores.find(s => s.value.toString() === data.recipient_store_id.toString())
    const isSameStore = data.store_id && data.recipient_store_id && data.store_id === data.recipient_store_id

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={isEdit ? 'Chỉnh sửa chuyển quỹ' : 'Chuyển quỹ nội bộ'} />

            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl page-wrapper">
                <CustomPageHeading
                    heading={isEdit ? 'Chỉnh sửa chuyển quỹ' : 'Chuyển quỹ nội bộ'}
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
                                {isEdit ? 'Lưu' : 'Tạo phiếu'}
                            </Button>
                        </div>

                        {isSameStore && (
                            <Alert variant="destructive" className="mb-6">
                                <AlertDescription>
                                    Chi nhánh xuất và chi nhánh nhận phải khác nhau
                                </AlertDescription>
                            </Alert>
                        )}

                        <div className="grid grid-cols-12 gap-6">
                            {/* Left Column - 9/12 */}
                            <div className="col-span-9 space-y-6">
                                <CustomCard isShowHeader title="Thông tin chuyển quỹ">
                                    <div className="space-y-4">
                                        {/* From Store */}
                                        <div className="space-y-2">
                                            <Label>Chi nhánh xuất quỹ *</Label>
                                            <Select
                                                value={data.store_id.toString()}
                                                onValueChange={(value) => setData('store_id', parseInt(value))}
                                                disabled={isEdit}
                                            >
                                                <SelectTrigger className={`w-full ${isEdit ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
                                                    <SelectValue placeholder="Chọn chi nhánh xuất" />
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

                                        {/* Arrow Indicator */}
                                        {fromStore && toStore && !isSameStore && (
                                            <div className="flex items-center justify-center py-4 bg-blue-50 rounded-lg border border-blue-200">
                                                <div className="flex items-center gap-4">
                                                    <div className="text-center">
                                                        <div className="text-xs text-muted-foreground mb-1">Từ</div>
                                                        <div className="font-semibold text-blue-700">{fromStore.label}</div>
                                                    </div>
                                                    <ArrowRight className="w-6 h-6 text-blue-500" />
                                                    <div className="text-center">
                                                        <div className="text-xs text-muted-foreground mb-1">Đến</div>
                                                        <div className="font-semibold text-blue-700">{toStore.label}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* To Store */}
                                        <div className="space-y-2">
                                            <Label>Chi nhánh nhận quỹ *</Label>
                                            <Select
                                                value={data.recipient_store_id.toString()}
                                                onValueChange={(value) => setData('recipient_store_id', parseInt(value))}
                                                disabled={isEdit}
                                            >
                                                <SelectTrigger className={`w-full ${isEdit ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
                                                    <SelectValue placeholder="Chọn chi nhánh nhận" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {stores.map((store) => (
                                                        <SelectItem key={store.value} value={store.value.toString()}>
                                                            {store.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <InputError message={errors.recipient_store_id} />
                                        </div>

                                        {/* Amount */}
                                        <div className="space-y-2">
                                            <Label>Số tiền chuyển *</Label>
                                            <div className="flex items-center gap-2">
                                                <PriceInput
                                                    value={data.amount}
                                                    onValueChange={(value) => setData('amount', value || 0)}
                                                    placeholder="Nhập số tiền"
                                                    className="flex-1"
                                                    disabled={isEdit}
                                                />
                                                <span className="text-sm font-medium">₫</span>
                                            </div>
                                            <InputError message={errors.amount} />
                                        </div>

                                        {/* Description */}
                                        <div className="space-y-2">
                                            <Label>Lý do chuyển</Label>
                                            <Textarea
                                                value={data.description}
                                                onChange={(e) => setData('description', e.target.value)}
                                                placeholder="Nhập lý do chuyển quỹ"
                                                rows={3}
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
                                        {/* Transaction Date with Calendar */}
                                        <div className="space-y-2">
                                            <Label>Ngày chuyển *</Label>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Button
                                                        variant="outline"
                                                        disabled={isEdit}
                                                        className={cn(
                                                            "w-full justify-start text-left font-normal",
                                                            isEdit ? "cursor-not-allowed opacity-50" : "cursor-pointer",
                                                            !date && "text-muted-foreground"
                                                        )}
                                                    >
                                                        {date ? format(date, 'dd/MM/yyyy', { locale: vi }) : <span>Chọn ngày</span>}
                                                    </Button>
                                                </PopoverTrigger>
                                                {!isEdit && (
                                                    <PopoverContent className="w-auto p-0" align="start">
                                                        <Calendar
                                                            mode="single"
                                                            selected={date}
                                                            onSelect={(newDate) => newDate && setDate(newDate)}
                                                            initialFocus
                                                            locale={vi}
                                                        />
                                                    </PopoverContent>
                                                )}
                                            </Popover>
                                            <InputError message={errors.transaction_date} />
                                        </div>

                                        {/* Transaction Code with Generate Button */}
                                        <div className="space-y-2">
                                            <Label>Mã phiếu chuyển</Label>
                                            <div className="flex gap-2">
                                                <Input
                                                    value={data.transaction_code}
                                                    onChange={(e) => setData('transaction_code', e.target.value)}
                                                    placeholder="Mã tự động"
                                                    className="flex-1"
                                                    disabled={isEdit}
                                                />
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="icon"
                                                    onClick={handleGenerateCode}
                                                    title="Tạo mã mới"
                                                    disabled={isEdit}
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
                                                disabled={isEdit}
                                            />
                                        </div>
                                    </div>
                                </CustomCard>

                                {/* Summary Card */}
                                {data.amount > 0 && fromStore && toStore && !isSameStore && (
                                    <CustomCard isShowHeader title="Tóm tắt">
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-muted-foreground">Từ:</span>
                                                <span className="font-medium text-sm">{fromStore.label}</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-muted-foreground">Đến:</span>
                                                <span className="font-medium text-sm">{toStore.label}</span>
                                            </div>
                                            <div className="border-t pt-3">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-sm text-muted-foreground">Số tiền:</span>
                                                    <span className="text-lg font-bold text-blue-600">
                                                        {new Intl.NumberFormat('vi-VN').format(data.amount)}₫
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </CustomCard>
                                )}
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </AppLayout>
    )
}
