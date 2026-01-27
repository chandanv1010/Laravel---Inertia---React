import { useState, useEffect } from 'react'
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
import { PromotionNameInput } from './components/promotion-name-input'
import { CustomerGroupSelector } from './components/customer-group-selector'
import { StoreSelector } from './components/store-selector'
import { CombinePromotionSelector } from './components/combine-promotion-selector'
import { TimeSelector } from './components/time-selector'
import { PromotionOverview } from './components/promotion-overview'
import { StatusSelector } from './components/status-selector'

interface OrderDiscountPromotion {
    id?: number
    name: string
    discount_type: 'fixed_amount' | 'percentage'
    discount_value: number
    condition_type: 'none' | 'min_order_amount' | 'min_product_quantity'
    condition_value?: number
    customer_group_type: 'all' | 'selected'
    customer_group_ids?: number[]
    store_type: 'all' | 'selected'
    store_ids?: number[]
    combine_with_order_discount: boolean
    combine_with_product_discount: boolean
    combine_with_free_shipping: boolean
    start_date: string
    end_date?: string
    no_end_date: boolean
    publish: string
}

interface OrderDiscountProps {
    promotion?: OrderDiscountPromotion
    customerGroups?: Array<{ value: string | number; label: string }>
    stores?: Array<{ value: string | number; label: string }>
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Quản lý Marketing', href: '/backend/promotion' },
    { title: 'Quản lý Khuyến Mãi', href: '/backend/promotion/promotion' },
    { title: 'Thêm mới chương trình giảm giá đơn hàng', href: '/' },
]

export default function OrderDiscount({ 
    promotion,
    customerGroups = [],
    stores = []
}: OrderDiscountProps) {
    const isEdit = !!promotion

    const [discountType, setDiscountType] = useState<'fixed_amount' | 'percentage'>(
        promotion?.discount_type || 'fixed_amount'
    )
    const [conditionType, setConditionType] = useState<'none' | 'min_order_amount' | 'min_product_quantity'>(
        promotion?.condition_type || 'none'
    )
    const [conditionValue, setConditionValue] = useState<number>(
        promotion?.condition_value || 0
    )
    const [customerGroupType, setCustomerGroupType] = useState<'all' | 'selected'>(
        promotion?.customer_group_type || 'all'
    )
    const [storeType, setStoreType] = useState<'all' | 'selected'>(
        promotion?.store_type || 'all'
    )
    const [noEndDate, setNoEndDate] = useState(promotion?.no_end_date || false)
    const [selectedCustomerGroups, setSelectedCustomerGroups] = useState<number[]>(
        promotion?.customer_group_ids || []
    )
    const [selectedStores, setSelectedStores] = useState<number[]>(
        promotion?.store_ids || []
    )
    const [combineOrderDiscount, setCombineOrderDiscount] = useState(promotion?.combine_with_order_discount || false)
    const [combineProductDiscount, setCombineProductDiscount] = useState(promotion?.combine_with_product_discount || false)
    const [combineFreeShipping, setCombineFreeShipping] = useState(promotion?.combine_with_free_shipping || false)
    const [discountValue, setDiscountValue] = useState<number>(promotion?.discount_value || 0)
    const [startDate, setStartDate] = useState<Date | undefined>(() => {
        if (promotion?.start_date) {
            // Parse date string từ backend (format: Y-m-d\TH:i)
            // Đảm bảo parse đúng local time, không bị timezone shift
            const dateStr = promotion.start_date
            if (dateStr.includes('T')) {
                // Parse theo local time bằng cách tách date và time
                const [datePart, timePart] = dateStr.split('T')
                const [year, month, day] = datePart.split('-').map(Number)
                const [hours, minutes] = timePart ? timePart.split(':').map(Number) : [0, 0]
                // Tạo date object với local time
                return new Date(year, month - 1, day, hours, minutes)
            }
            return new Date(dateStr)
        }
        return undefined
    })
    const [endDate, setEndDate] = useState<Date | undefined>(() => {
        if (promotion?.end_date) {
            // Parse date string từ backend (format: Y-m-d\TH:i)
            // Đảm bảo parse đúng local time, không bị timezone shift
            const dateStr = promotion.end_date
            if (dateStr.includes('T')) {
                // Parse theo local time bằng cách tách date và time
                const [datePart, timePart] = dateStr.split('T')
                const [year, month, day] = datePart.split('-').map(Number)
                const [hours, minutes] = timePart ? timePart.split(':').map(Number) : [23, 59]
                // Tạo date object với local time
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

    const getDiscountText = (): string => {
        const value = discountValue > 0 ? discountValue : (promotion?.discount_value || 0)
        if (discountType === 'fixed_amount') {
            return `Giảm ${formatPrice(value)}₫`
        } else {
            return `Giảm ${value}%`
        }
    }

    const getConditionText = (): string => {
        if (conditionType === 'none') {
            return 'Không có điều kiện'
        } else if (conditionType === 'min_order_amount') {
            const value = conditionValue > 0 ? conditionValue : (promotion?.condition_value || 0)
            return `Đơn hàng tối thiểu: ${formatPrice(value)}₫`
        } else {
            const value = conditionValue > 0 ? conditionValue : (promotion?.condition_value || 0)
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

    const getCustomerGroupDetails = (): string[] => {
        if (customerGroupType === 'selected') {
            const selected = customerGroups.filter(g => selectedCustomerGroups.includes(Number(g.value)))
            return selected.map(g => g.label)
        }
        return []
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

    const getStoreDetails = (): string[] => {
        if (storeType === 'selected') {
            const selected = stores.filter(s => selectedStores.includes(Number(s.value)))
            return selected.map(s => s.label)
        }
        return []
    }

    const getPublishStatus = (): { text: string; color: string; icon: React.ReactNode } => {
        const publishValue = promotion?.publish || '2'
        if (publishValue === '1') {
            return {
                text: 'Đang hoạt động',
                color: 'text-green-600 bg-green-50 border-green-200',
                icon: <CheckCircle2 className="w-4 h-4" />
            }
        }
        return {
            text: 'Tạm dừng',
            color: 'text-gray-600 bg-gray-50 border-gray-200',
            icon: <XCircle className="w-4 h-4" />
        }
    }

    const getCombineText = (): string[] => {
        const combines: string[] = []
        const orderDiscount = combineOrderDiscount || (isEdit && promotion?.combine_with_order_discount)
        const productDiscount = combineProductDiscount || (isEdit && promotion?.combine_with_product_discount)
        const freeShipping = combineFreeShipping || (isEdit && promotion?.combine_with_free_shipping)
        
        if (orderDiscount) combines.push('Giảm giá đơn hàng')
        if (productDiscount) combines.push('Giảm giá sản phẩm')
        if (freeShipping) combines.push('Miễn phí vận chuyển')
        return combines.length > 0 ? combines : ['Không kết hợp']
    }

    const getTimeText = (): string => {
        const currentStartDate = startDate || (isEdit && promotion?.start_date ? new Date(promotion.start_date) : undefined)
        const currentEndDate = endDate || (isEdit && promotion?.end_date && !noEndDate ? new Date(promotion.end_date) : undefined)
        const currentNoEndDate = noEndDate || (isEdit && promotion?.no_end_date)
        
        const start = currentStartDate ? formatDate(currentStartDate) : 'Chưa chọn'
        if (currentNoEndDate) {
            return `Từ ${start} (Không có ngày kết thúc)`
        }
        const end = currentEndDate ? formatDate(currentEndDate) : 'Chưa chọn'
        return `Từ ${start} đến ${end}`
    }

    // Track promotion name for overview
    const [promotionName, setPromotionName] = useState(promotion?.name || '')


    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={isEdit ? 'Cập nhật chương trình giảm giá đơn hàng' : 'Thêm mới chương trình giảm giá đơn hàng'} />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl page-wrapper">
                <CustomPageHeading 
                    heading={isEdit ? 'Cập nhật chương trình giảm giá đơn hàng' : 'Thêm mới chương trình giảm giá đơn hàng'}
                    breadcrumbs={breadcrumbs}
                />

                <div className="page-container">
                    <Form
                        action={isEdit ? `/backend/promotion/promotion/${promotion.id}` : '/backend/promotion/promotion'}
                        method={isEdit ? 'put' : 'post'}
                        options={{
                            preserveScroll: true,
                            preserveState: setPreserveState,
                        }}
                        transform={(data) => ({
                            ...data,
                            type: 'order_discount',
                            ...(isEdit ? { _method: 'put' } : {}),
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
                                        onClick={() => router.get('/backend/promotion/promotion')}
                                        className="mb-4"
                                    >
                                        <ArrowLeft className="w-4 h-4 mr-2" />
                                        Quay lại
                                    </Button>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    {/* Phần bên trái - Form chính */}
                                    <div className="lg:col-span-2 space-y-6">
                                        {/* Khối 1: Thông tin chung */}
                                        <PromotionNameInput
                                                    name="name"
                                                    defaultValue={promotion?.name}
                                                    placeholder="VD: Chương trình khuyến mại T6"
                                            error={errors.name}
                                            onChange={setPromotionName}
                                                />

                                        <CustomCard isShowHeader={true} title="Giá trị">
                                            <div className="space-y-4">
                                                <div>
                                                    <Label className="mb-2 block">Giá trị khuyến mại</Label>
                                                    <div className="flex items-center gap-2">
                                                        <Button
                                                            type="button"
                                                            variant={discountType === 'fixed_amount' ? 'default' : 'outline'}
                                                            className={discountType === 'fixed_amount' ? 'bg-blue-500 hover:bg-blue-600' : ''}
                                                            onClick={() => setDiscountType('fixed_amount')}
                                                        >
                                                            Số tiền
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant={discountType === 'percentage' ? 'default' : 'outline'}
                                                            className={discountType === 'percentage' ? 'bg-blue-500 hover:bg-blue-600' : ''}
                                                            onClick={() => setDiscountType('percentage')}
                                                        >
                                                            %
                                                        </Button>
                                                        <div className="flex items-center gap-2 flex-1">
                                                            {discountType === 'fixed_amount' ? (
                                                                <PriceInput
                                                                    id="discount_value"
                                                                    value={discountValue}
                                                                    onValueChange={(value) => setDiscountValue(value || 0)}
                                                                    className="flex-1"
                                                                    placeholder="0"
                                                                    min={0}
                                                                />
                                                            ) : (
                                                                <Input
                                                                    id="discount_value"
                                                                    name="discount_value"
                                                                    type="number"
                                                                    value={discountValue}
                                                                    onChange={(e) => {
                                                                        const val = parseFloat(e.target.value) || 0
                                                                        const clampedVal = Math.min(Math.max(val, 0), 100)
                                                                        setDiscountValue(clampedVal)
                                                                    }}
                                                                    onBlur={(e) => {
                                                                        const val = parseFloat(e.target.value) || 0
                                                                        const clampedVal = Math.min(Math.max(val, 0), 100)
                                                                        if (clampedVal !== val) {
                                                                            setDiscountValue(clampedVal)
                                                                        }
                                                                    }}
                                                                    placeholder="0"
                                                                    min="0"
                                                                    max="100"
                                                                    className="flex-1"
                                                                    required
                                                                />
                                                            )}
                                                            {discountType === 'fixed_amount' && (
                                                                <span className="text-sm font-medium">₫</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <input type="hidden" name="discount_type" value={discountType} />
                                                    <input type="hidden" name="discount_value" value={discountValue} />
                                                    <InputError message={errors.discount_value} className="mt-1" />
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
                                                            Không có
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
                                                            Tổng số lượng sản phẩm được khuyến mại tối thiểu
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
                                            promotionName={promotionName || promotion?.name}
                                            promotionId={promotion?.id}
                                            isEdit={isEdit}
                                            promotionType="order_discount"
                                            startDate={startDate || (isEdit && promotion?.start_date ? new Date(promotion.start_date) : undefined)}
                                            endDate={endDate || (isEdit && promotion?.end_date && !noEndDate ? new Date(promotion.end_date) : undefined)}
                                            noEndDate={noEndDate || (isEdit && promotion?.no_end_date)}
                                            formatDate={formatDate}
                                            items={[
                                                { label: 'Loại khuyến mại', value: <strong>Giảm giá đơn hàng</strong> },
                                                ...(discountValue > 0 || (isEdit && promotion?.discount_value) ? [{ label: 'Giá trị', value: getDiscountText() }] : []),
                                                { 
                                                    label: 'Điều kiện', 
                                                    value: conditionType !== 'none' && (conditionValue > 0 || (isEdit && promotion?.condition_value)) 
                                                        ? getConditionText() 
                                                        : 'Không có điều kiện' 
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
                                        onClick={() => router.get('/backend/promotion/promotion')}
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

