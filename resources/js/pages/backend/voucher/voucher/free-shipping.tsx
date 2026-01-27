import { useState } from 'react'
import AppLayout from '@/layouts/app-layout'
import { Head, Form, router } from '@inertiajs/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import CustomPageHeading from '@/components/custom-page-heading'
import CustomCard from '@/components/custom-card'
import InputError from '@/components/input-error'
import { type BreadcrumbItem } from '@/types'
import { LoaderCircle, ArrowLeft } from 'lucide-react'
import { setPreserveState } from '@/lib/helper'
import { PriceInput } from '@/components/price-input'
import { format } from 'date-fns'
import { CustomerGroupSelector } from '../../promotion/promotion/components/customer-group-selector'
import { StoreSelector } from '../../promotion/promotion/components/store-selector'
import { CombinePromotionSelector } from '../../promotion/promotion/components/combine-promotion-selector'
import { TimeSelector } from '../../promotion/promotion/components/time-selector'
import { PromotionOverview } from '../../promotion/promotion/components/promotion-overview'
import { VoucherCodeInput } from './components/voucher-code-input'

interface FreeShippingVoucher {
    id?: number
    code: string
    name: string
    max_shipping_value?: number
    condition_type: 'none' | 'min_order_amount' | 'min_product_quantity'
    condition_value?: number
    customer_group_type: 'all' | 'selected'
    customer_group_ids?: number[]
    store_type: 'all' | 'selected'
    store_ids?: number[]
    combine_with_order_discount: boolean
    combine_with_product_discount: boolean
    combine_with_free_shipping: boolean
    usage_limit?: number
    limit_per_customer: boolean
    start_date: string
    end_date?: string
    no_end_date: boolean
    publish: string
}

interface FreeShippingProps {
    voucher?: FreeShippingVoucher
    customerGroups?: Array<{ value: string | number; label: string }>
    stores?: Array<{ value: string | number; label: string }>
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Quản lý Marketing', href: '/backend/promotion' },
    { title: 'Quản lý Mã Voucher', href: '/backend/voucher/voucher' },
    { title: 'Thêm mới voucher miễn phí vận chuyển', href: '/' },
]

export default function FreeShipping({
    voucher,
    customerGroups = [],
    stores = []
}: FreeShippingProps) {
    const isEdit = !!voucher

    const [code, setCode] = useState(voucher?.code || '')
    const [maxShippingValue, setMaxShippingValue] = useState<number | undefined>(voucher?.max_shipping_value)
    const [conditionType, setConditionType] = useState<'none' | 'min_order_amount' | 'min_product_quantity'>(
        voucher?.condition_type || 'none'
    )
    const [conditionValue, setConditionValue] = useState<number>(
        voucher?.condition_value || 0
    )
    const [customerGroupType, setCustomerGroupType] = useState<'all' | 'selected'>(
        voucher?.customer_group_type || 'all'
    )
    const [storeType, setStoreType] = useState<'all' | 'selected'>(
        voucher?.store_type || 'all'
    )
    const [noEndDate, setNoEndDate] = useState(voucher?.no_end_date || false)
    const [selectedCustomerGroups, setSelectedCustomerGroups] = useState<number[]>(
        voucher?.customer_group_ids || []
    )
    const [selectedStores, setSelectedStores] = useState<number[]>(
        voucher?.store_ids || []
    )
    const [combineOrderDiscount, setCombineOrderDiscount] = useState(voucher?.combine_with_order_discount || false)
    const [combineProductDiscount, setCombineProductDiscount] = useState(voucher?.combine_with_product_discount || false)
    const [combineFreeShipping, setCombineFreeShipping] = useState(voucher?.combine_with_free_shipping || false)
    const [usageLimit, setUsageLimit] = useState<number | undefined>(voucher?.usage_limit)
    const [hasUsageLimit, setHasUsageLimit] = useState(!!voucher?.usage_limit)
    const [limitPerCustomer, setLimitPerCustomer] = useState(voucher?.limit_per_customer || false)
    const [startDate, setStartDate] = useState<Date | undefined>(() => {
        if (voucher?.start_date) {
            const dateStr = voucher.start_date
            if (dateStr.includes('T')) {
                const [datePart, timePart] = dateStr.split('T')
                const [year, month, day] = datePart.split('-').map(Number)
                const [hours, minutes] = timePart ? timePart.split(':').map(Number) : [0, 0]
                return new Date(year, month - 1, day, hours, minutes)
            }
            return new Date(dateStr)
        }
        return undefined
    })
    const [endDate, setEndDate] = useState<Date | undefined>(() => {
        if (voucher?.end_date) {
            const dateStr = voucher.end_date
            if (dateStr.includes('T')) {
                const [datePart, timePart] = dateStr.split('T')
                const [year, month, day] = datePart.split('-').map(Number)
                const [hours, minutes] = timePart ? timePart.split(':').map(Number) : [23, 59]
                return new Date(year, month - 1, day, hours, minutes)
            }
            return new Date(dateStr)
        }
        return undefined
    })

    const formatDateForInput = (date?: string | Date) => {
        if (!date) return ''
        const d = date instanceof Date ? date : new Date(date)
        if (isNaN(d.getTime())) return ''
        const year = d.getFullYear()
        const month = String(d.getMonth() + 1).padStart(2, '0')
        const day = String(d.getDate()).padStart(2, '0')
        const hours = String(d.getHours()).padStart(2, '0')
        const minutes = String(d.getMinutes()).padStart(2, '0')
        return `${year}-${month}-${day}T${hours}:${minutes}`
    }

    const formatPrice = (value: number): string => {
        return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
    }

    const formatDate = (date?: Date | string): string => {
        if (!date) return ''
        const d = date instanceof Date ? date : new Date(date)
        if (isNaN(d.getTime())) return ''
        return format(d, 'dd/MM/yyyy HH:mm')
    }

    const getConditionText = (): string => {
        if (conditionType === 'none') {
            return 'Không có điều kiện'
        } else if (conditionType === 'min_order_amount') {
            const value = conditionValue > 0 ? conditionValue : (voucher?.condition_value || 0)
            return `Đơn hàng tối thiểu: ${formatPrice(value)}₫`
        } else {
            const value = conditionValue > 0 ? conditionValue : (voucher?.condition_value || 0)
            return `Số lượng sản phẩm tối thiểu: ${value}`
        }
    }

    const getCustomerGroupText = (): string => {
        if (customerGroupType === 'all') {
            return 'Tất cả nhóm khách hàng'
        } else {
            const selected = customerGroups.filter(g => selectedCustomerGroups.includes(Number(g.value)))
            if (selected.length === 0) {
                return 'Chưa chọn nhóm khách hàng'
            }
            return `${selected.length} nhóm khách hàng đã chọn`
        }
    }

    const getStoreText = (): string => {
        if (storeType === 'all') {
            return 'Tất cả chi nhánh'
        } else {
            const selected = stores.filter(s => selectedStores.includes(Number(s.value)))
            if (selected.length === 0) {
                return 'Chưa chọn chi nhánh'
            }
            return `${selected.length} chi nhánh đã chọn`
        }
    }

    const getCombineText = (): string[] => {
        const combines: string[] = []
        const orderDiscount = combineOrderDiscount || (isEdit && voucher?.combine_with_order_discount)
        const productDiscount = combineProductDiscount || (isEdit && voucher?.combine_with_product_discount)
        const freeShipping = combineFreeShipping || (isEdit && voucher?.combine_with_free_shipping)

        if (orderDiscount) combines.push('Giảm giá đơn hàng')
        if (productDiscount) combines.push('Giảm giá sản phẩm')
        if (freeShipping) combines.push('Miễn phí vận chuyển')
        return combines.length > 0 ? combines : ['Không kết hợp']
    }

    const getTimeText = (): string => {
        const currentStartDate = startDate || (isEdit && voucher?.start_date ? new Date(voucher.start_date) : undefined)
        const currentEndDate = endDate || (isEdit && voucher?.end_date && !noEndDate ? new Date(voucher.end_date) : undefined)
        const currentNoEndDate = noEndDate || (isEdit && voucher?.no_end_date)

        const start = currentStartDate ? formatDate(currentStartDate) : 'Chưa chọn'
        if (currentNoEndDate) {
            return `Từ ${start} (Không có ngày kết thúc)`
        }
        const end = currentEndDate ? formatDate(currentEndDate) : 'Chưa chọn'
        return `Từ ${start} đến ${end}`
    }

    const [voucherName, setVoucherName] = useState(voucher?.name || '')

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={isEdit ? 'Cập nhật voucher miễn phí vận chuyển' : 'Thêm mới voucher miễn phí vận chuyển'} />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl page-wrapper">
                <CustomPageHeading
                    heading={isEdit ? 'Cập nhật voucher miễn phí vận chuyển' : 'Thêm mới voucher miễn phí vận chuyển'}
                    breadcrumbs={breadcrumbs}
                />

                <div className="page-container">
                    <Form
                        action={isEdit ? `/backend/voucher/voucher/${voucher.id}` : '/backend/voucher/voucher'}
                        method={isEdit ? 'put' : 'post'}
                        options={{
                            preserveScroll: true,
                            preserveState: setPreserveState,
                        }}
                        transform={(data) => ({
                            ...data,
                            type: 'free_shipping',
                            ...(isEdit ? { _method: 'put' } : {}),
                            code: code || undefined,
                            max_shipping_value: maxShippingValue || null,
                            usage_limit: hasUsageLimit ? (usageLimit || null) : null,
                            limit_per_customer: limitPerCustomer,
                            customer_group_ids: customerGroupType === 'selected' ? selectedCustomerGroups : [],
                            store_ids: storeType === 'selected' ? selectedStores : [],
                            no_end_date: noEndDate,
                            combine_with_order_discount: combineOrderDiscount,
                            combine_with_product_discount: combineProductDiscount,
                            combine_with_free_shipping: combineFreeShipping,
                        })}
                    >
                        {({ processing, errors }) => (
                            <div className="max-w-[1400px] ml-auto mr-auto">
                                <div className="mb-4">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => router.get('/backend/voucher/voucher')}
                                        className="mb-4"
                                    >
                                        <ArrowLeft className="w-4 h-4 mr-2" />
                                        Quay lại
                                    </Button>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    <div className="lg:col-span-2 space-y-6">
                                        {/* Hidden name field - backend will auto-generate */}
                                        <input type="hidden" name="name" value={voucherName || ''} />

                                        <CustomCard isShowHeader={true} title="Mã voucher">
                                            <VoucherCodeInput
                                                code={code}
                                                onCodeChange={setCode}
                                                error={errors.code}
                                            />
                                        </CustomCard>

                                        <CustomCard isShowHeader={true} title="Giá trị">
                                            <div className="space-y-4">
                                                <div>
                                                    <Label htmlFor="max_shipping_value">Miễn phí tối đa</Label>
                                                    <div className="flex items-center gap-2 mt-2">
                                                        <PriceInput
                                                            id="max_shipping_value"
                                                            name="max_shipping_value"
                                                            value={maxShippingValue || 0}
                                                            onValueChange={(value) => setMaxShippingValue(value)}
                                                            placeholder="Nhập giá trị miễn phí tối đa"
                                                            autoComplete="off"
                                                        />
                                                        <span className="text-sm font-medium">₫</span>
                                                    </div>
                                                    <InputError message={errors.max_shipping_value} className="mt-1" />
                                                    <p className="text-sm text-muted-foreground mt-2">
                                                        Để trống nếu không giới hạn giá trị miễn phí vận chuyển
                                                    </p>
                                                </div>
                                            </div>
                                        </CustomCard>

                                        <CustomCard isShowHeader={true} title="Điều kiện áp dụng">
                                            <RadioGroup
                                                value={conditionType}
                                                onValueChange={(value) => setConditionType(value as typeof conditionType)}
                                                name="condition_type"
                                            >
                                                <div className="space-y-3">
                                                    <div className="flex items-center space-x-2">
                                                        <RadioGroupItem value="none" id="condition-none" />
                                                        <Label htmlFor="condition-none" className="cursor-pointer font-normal">
                                                            Không có điều kiện
                                                        </Label>
                                                    </div>
                                                    <div className="flex items-center space-x-2">
                                                        <RadioGroupItem value="min_order_amount" id="condition-amount" />
                                                        <Label htmlFor="condition-amount" className="cursor-pointer font-normal">
                                                            Tổng giá trị đơn hàng tối thiểu
                                                        </Label>
                                                    </div>
                                                    {conditionType === 'min_order_amount' && (
                                                        <div className="ml-6">
                                                            <div className="flex items-center gap-2">
                                                                <PriceInput
                                                                    value={conditionValue}
                                                                    onValueChange={(value) => setConditionValue(value || 0)}
                                                                    className="flex-1"
                                                                    placeholder="Nhập giá trị tối thiểu"
                                                                    autoComplete="off"
                                                                />
                                                                <span className="text-sm font-medium">₫</span>
                                                            </div>
                                                            <input type="hidden" name="condition_value" value={conditionValue} />
                                                            <InputError message={errors.condition_value} className="mt-1" />
                                                        </div>
                                                    )}
                                                    <div className="flex items-center space-x-2">
                                                        <RadioGroupItem value="min_product_quantity" id="condition-quantity" />
                                                        <Label htmlFor="condition-quantity" className="cursor-pointer font-normal">
                                                            Tổng số lượng sản phẩm tối thiểu
                                                        </Label>
                                                    </div>
                                                    {conditionType === 'min_product_quantity' && (
                                                        <div className="ml-6">
                                                            <Input
                                                                name="condition_value"
                                                                type="number"
                                                                value={conditionValue}
                                                                onChange={(e) => setConditionValue(parseInt(e.target.value) || 0)}
                                                                placeholder="Nhập số lượng tối thiểu"
                                                                min="1"
                                                            />
                                                            <InputError message={errors.condition_value} className="mt-1" />
                                                        </div>
                                                    )}
                                                </div>
                                            </RadioGroup>
                                        </CustomCard>

                                        <CustomCard isShowHeader={true} title="Giới hạn sử dụng">
                                            <div className="space-y-4">
                                                <div className="flex items-center space-x-2">
                                                    <Checkbox
                                                        id="has_usage_limit"
                                                        checked={hasUsageLimit}
                                                        onCheckedChange={(checked) => {
                                                            setHasUsageLimit(!!checked)
                                                            if (!checked) {
                                                                setUsageLimit(undefined)
                                                            }
                                                        }}
                                                    />
                                                    <Label htmlFor="has_usage_limit" className="cursor-pointer font-normal">
                                                        Giới hạn sử dụng (tổng số lần)
                                                    </Label>
                                                </div>
                                                {hasUsageLimit && (
                                                    <div className="ml-6">
                                                        <Input
                                                            id="usage_limit"
                                                            name="usage_limit"
                                                            type="number"
                                                            value={usageLimit || ''}
                                                            onChange={(e) => setUsageLimit(parseInt(e.target.value) || undefined)}
                                                            placeholder="Nhập số lần sử dụng tối đa"
                                                            min="1"
                                                        />
                                                        <InputError message={errors.usage_limit} className="mt-1" />
                                                    </div>
                                                )}
                                                <div className="flex items-center space-x-2">
                                                    <Checkbox
                                                        id="limit_per_customer"
                                                        checked={limitPerCustomer}
                                                        onCheckedChange={(checked) => setLimitPerCustomer(!!checked)}
                                                    />
                                                    <Label htmlFor="limit_per_customer" className="cursor-pointer font-normal">
                                                        Giới hạn mỗi khách hàng chỉ được sử dụng mã giảm giá này 1 lần
                                                    </Label>
                                                </div>
                                            </div>
                                        </CustomCard>

                                        <CustomerGroupSelector
                                            value={customerGroupType}
                                            selectedIds={selectedCustomerGroups}
                                            options={customerGroups}
                                            onChange={(type, ids) => {
                                                setCustomerGroupType(type)
                                                setSelectedCustomerGroups(ids)
                                            }}
                                        />

                                        <StoreSelector
                                            value={storeType}
                                            selectedIds={selectedStores}
                                            options={stores}
                                            onChange={(type, ids) => {
                                                setStoreType(type)
                                                setSelectedStores(ids)
                                            }}
                                        />

                                        <CombinePromotionSelector
                                            combineOrderDiscount={combineOrderDiscount}
                                            combineProductDiscount={combineProductDiscount}
                                            combineFreeShipping={combineFreeShipping}
                                            onChange={(type, value) => {
                                                if (type === 'order') setCombineOrderDiscount(value)
                                                else if (type === 'product') setCombineProductDiscount(value)
                                                else if (type === 'shipping') setCombineFreeShipping(value)
                                            }}
                                        />
                                    </div>

                                    <div className="lg:col-span-1 space-y-6">
                                        <TimeSelector
                                            startDate={startDate}
                                            endDate={endDate}
                                            noEndDate={noEndDate}
                                            startDateError={errors.start_date}
                                            endDateError={errors.end_date}
                                            onStartDateChange={setStartDate}
                                            onEndDateChange={setEndDate}
                                            onNoEndDateChange={(value) => {
                                                setNoEndDate(value)
                                                if (value) {
                                                    setEndDate(undefined)
                                                }
                                            }}
                                            formatDateForInput={formatDateForInput}
                                        />

                                        <PromotionOverview
                                            promotionName={voucherName || voucher?.name}
                                            promotionId={voucher?.id}
                                            isEdit={isEdit}
                                            promotionType="free_shipping"
                                            startDate={startDate || (isEdit && voucher?.start_date ? new Date(voucher.start_date) : undefined)}
                                            endDate={endDate || (isEdit && voucher?.end_date && !noEndDate ? new Date(voucher.end_date) : undefined)}
                                            noEndDate={noEndDate || (isEdit && voucher?.no_end_date)}
                                            formatDate={formatDate}
                                            items={[
                                                { label: 'Loại voucher', value: <strong>Miễn phí vận chuyển</strong> },
                                                { label: 'Mã voucher', value: <span className="font-mono font-semibold">{code || 'Chưa có mã'}</span> },
                                                {
                                                    label: 'Điều kiện',
                                                    value: conditionType !== 'none' && (conditionValue > 0 || (isEdit && voucher?.condition_value))
                                                        ? getConditionText()
                                                        : 'Không có điều kiện'
                                                },
                                                {
                                                    label: 'Giới hạn sử dụng',
                                                    value: hasUsageLimit && usageLimit
                                                        ? `${usageLimit} lần`
                                                        : 'Không giới hạn'
                                                },
                                                {
                                                    label: 'Giới hạn khách hàng',
                                                    value: limitPerCustomer
                                                        ? 'Mỗi khách hàng chỉ dùng 1 lần'
                                                        : 'Không giới hạn'
                                                },
                                                {
                                                    label: 'Nhóm khách hàng',
                                                    value: customerGroupType === 'all'
                                                        ? 'Áp dụng cho tất cả khách hàng'
                                                        : getCustomerGroupText()
                                                },
                                                {
                                                    label: 'Chi nhánh',
                                                    value: storeType === 'all'
                                                        ? 'Áp dụng cho tất cả chi nhánh'
                                                        : getStoreText()
                                                },
                                                {
                                                    label: 'Kết hợp',
                                                    value: getCombineText().includes('Không kết hợp')
                                                        ? 'Không kết hợp với giảm giá khác'
                                                        : `Kết hợp với: ${getCombineText().join(', ')}`
                                                },
                                            ]}
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end gap-4 mt-6">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => router.get('/backend/voucher/voucher')}
                                    >
                                        Hủy
                                    </Button>
                                    <Button type="submit" disabled={processing} className="bg-blue-500 hover:bg-blue-600">
                                        {processing && <LoaderCircle className="w-4 h-4 mr-2 animate-spin" />}
                                        {isEdit ? 'Cập nhật' : 'Tạo mới'}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </Form>
                </div>
            </div>
        </AppLayout>
    )
}

