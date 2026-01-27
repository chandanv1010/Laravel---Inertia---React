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
import { LoaderCircle, ArrowLeft, Package, X, Search } from 'lucide-react'
import { setPreserveState } from '@/lib/helper'
import { PriceInput } from '@/components/price-input'
import { format } from 'date-fns'
import { ProductSelectionModal } from '../../promotion/promotion/components/product-selection-modal'
import { CategorySelectionModal } from '../../promotion/promotion/components/category-selection-modal'
import { CustomerGroupSelector } from '../../promotion/promotion/components/customer-group-selector'
import { StoreSelector } from '../../promotion/promotion/components/store-selector'
import { CombinePromotionSelector } from '../../promotion/promotion/components/combine-promotion-selector'
import { TimeSelector } from '../../promotion/promotion/components/time-selector'
import { PromotionOverview } from '../../promotion/promotion/components/promotion-overview'
import { VoucherCodeInput } from './components/voucher-code-input'

interface ProductDiscountVoucher {
    id?: number
    code: string
    name: string
    discount_type: 'fixed_amount' | 'percentage'
    discount_value: number
    max_discount_value?: number
    apply_source: 'all' | 'product_variant' | 'product_catalogue'
    product_variant_ids?: number[]
    product_catalogue_ids?: number[]
    product_items?: Array<{ id: number; name: string; sku: string; image?: string; productId?: number }>
    product_catalogue_items?: Array<{ id: number; name: string; image?: string }>
    combine_with_order_discount: boolean
    combine_with_product_discount: boolean
    combine_with_free_shipping: boolean
    usage_limit?: number
    limit_per_customer: boolean
    allow_multiple_use: boolean
    start_date: string
    end_date?: string
    no_end_date: boolean
    publish: string
    customer_group_type: 'all' | 'selected'
    customer_group_ids?: number[]
    store_type: 'all' | 'selected'
    store_ids?: number[]
}

interface ProductDiscountProps {
    voucher?: ProductDiscountVoucher
    customerGroups?: Array<{ value: string | number; label: string }>
    stores?: Array<{ value: string | number; label: string }>
    initialProducts?: Array<any>
    productCatalogues?: Array<any>
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Quản lý Marketing', href: '/backend/promotion' },
    { title: 'Quản lý Mã Voucher', href: '/backend/voucher/voucher' },
    { title: 'Thêm mới voucher giảm giá sản phẩm', href: '/' },
]

export default function ProductDiscount({
    voucher,
    customerGroups = [],
    stores = [],
    initialProducts = [],
    productCatalogues = []
}: ProductDiscountProps) {
    const isEdit = !!voucher

    const [code, setCode] = useState(voucher?.code || '')
    const [discountType, setDiscountType] = useState<'fixed_amount' | 'percentage'>(
        voucher?.discount_type || 'fixed_amount'
    )
    const [applySource, setApplySource] = useState<'all' | 'product_variant' | 'product_catalogue'>(
        voucher?.apply_source || 'all'
    )
    const [noEndDate, setNoEndDate] = useState(voucher?.no_end_date || false)
    const [showProductModal, setShowProductModal] = useState(false)
    const [showCategoryModal, setShowCategoryModal] = useState(false)
    const [selectedProducts, setSelectedProducts] = useState<Array<{ id: number; name: string; sku: string; image?: string; productId?: number }>>(
        voucher?.product_items || []
    )
    const [selectedCatalogues, setSelectedCatalogues] = useState<Array<{ id: number; name: string; image?: string }>>(
        voucher?.product_catalogue_items || []
    )
    const [combineOrderDiscount, setCombineOrderDiscount] = useState(voucher?.combine_with_order_discount || false)
    const [combineProductDiscount, setCombineProductDiscount] = useState(voucher?.combine_with_product_discount || false)
    const [combineFreeShipping, setCombineFreeShipping] = useState(voucher?.combine_with_free_shipping || false)
    const [discountValue, setDiscountValue] = useState<number>(voucher?.discount_value || 0)
    const [maxDiscountValue, setMaxDiscountValue] = useState<number>(voucher?.max_discount_value || 0)
    const [usageLimit, setUsageLimit] = useState<number | undefined>(voucher?.usage_limit)
    const [hasUsageLimit, setHasUsageLimit] = useState(!!voucher?.usage_limit)
    const [limitPerCustomer, setLimitPerCustomer] = useState(voucher?.limit_per_customer || false)
    const [allowMultipleUse, setAllowMultipleUse] = useState(voucher?.allow_multiple_use ?? true)
    const [customerGroupType, setCustomerGroupType] = useState<'all' | 'selected'>(
        voucher?.customer_group_type || 'all'
    )
    const [storeType, setStoreType] = useState<'all' | 'selected'>(
        voucher?.store_type || 'all'
    )
    const [selectedCustomerGroups, setSelectedCustomerGroups] = useState<number[]>(
        voucher?.customer_group_ids || []
    )
    const [selectedStores, setSelectedStores] = useState<number[]>(
        voucher?.store_ids || []
    )
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

    useEffect(() => {
        if (voucher?.product_catalogue_items && Array.isArray(voucher.product_catalogue_items)) {
            const validItems = voucher.product_catalogue_items.filter(item => item && item.id && item.name)
            if (validItems.length > 0) {
                setSelectedCatalogues(validItems)
            }
        }
    }, [voucher?.product_catalogue_items])

    useEffect(() => {
        if (voucher?.product_items) {
            setSelectedProducts(voucher.product_items)
        }
    }, [voucher?.product_items])

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
        const value = discountValue > 0 ? discountValue : (voucher?.discount_value || 0)
        if (discountType === 'fixed_amount') {
            return `Giảm ${formatPrice(value)}₫`
        } else {
            const maxValue = maxDiscountValue > 0 ? maxDiscountValue : (voucher?.max_discount_value || 0)
            if (maxValue > 0) {
                return `Giảm ${value}% (tối đa ${formatPrice(maxValue)}₫)`
            }
            return `Giảm ${value}%`
        }
    }

    const getApplySourceText = (): string => {
        if (applySource === 'all') {
            return 'Tất cả sản phẩm'
        } else if (applySource === 'product_variant') {
            return `${selectedProducts.length} sản phẩm đã chọn`
        } else {
            return `${selectedCatalogues.length} danh mục đã chọn`
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

    const handleProductsSelected = (products: Array<{ id: number; name: string; sku: string; image?: string; productId?: number; productName?: string }>) => {
        setSelectedProducts(products)
        setShowProductModal(false)
    }

    const handleCataloguesSelected = (catalogues: Array<{ id: number; name: string; image?: string }>) => {
        setSelectedCatalogues(catalogues)
        setShowCategoryModal(false)
    }

    const removeProduct = (id: number) => {
        setSelectedProducts(prev => prev.filter(p => p.id !== id))
    }

    const removeCatalogue = (id: number) => {
        setSelectedCatalogues(prev => prev.filter(c => c.id !== id))
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={isEdit ? 'Cập nhật voucher giảm giá sản phẩm' : 'Thêm mới voucher giảm giá sản phẩm'} />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl page-wrapper">
                <CustomPageHeading
                    heading={isEdit ? 'Cập nhật voucher giảm giá sản phẩm' : 'Thêm mới voucher giảm giá sản phẩm'}
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
                        transform={(data) => {
                            const productIds: number[] = []
                            const productVariantIds: number[] = []

                            if (applySource === 'product_variant') {
                                selectedProducts.forEach(p => {
                                    if (p.productId && p.id === p.productId) {
                                        productIds.push(p.id)
                                    } else {
                                        productVariantIds.push(p.id)
                                    }
                                })
                            }

                            return {
                                ...data,
                                type: 'product_discount',
                                ...(isEdit ? { _method: 'put' } : {}),
                                code: code || undefined,
                                usage_limit: hasUsageLimit ? (usageLimit || null) : null,
                                limit_per_customer: limitPerCustomer,
                                allow_multiple_use: allowMultipleUse,
                                apply_source: applySource,
                                product_ids: applySource === 'product_variant' ? productIds : [],
                                product_variant_ids: applySource === 'product_variant' ? productVariantIds : [],
                                product_catalogue_ids: applySource === 'product_catalogue' ? selectedCatalogues.map(c => c.id) : [],
                                customer_group_ids: customerGroupType === 'selected' ? selectedCustomerGroups : [],
                                store_ids: storeType === 'selected' ? selectedStores : [],
                                no_end_date: noEndDate,
                                combine_with_order_discount: combineOrderDiscount,
                                combine_with_product_discount: combineProductDiscount,
                                combine_with_free_shipping: combineFreeShipping,
                                max_discount_value: discountType === 'percentage' ? maxDiscountValue : undefined,
                            }
                        }}
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
                                                                    autoComplete="off"
                                                                />
                                                            ) : (
                                                                <>
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
                                                                        placeholder="0"
                                                                        min="0"
                                                                        max="100"
                                                                        className="w-24"
                                                                        required
                                                                    />
                                                                    <span className="text-sm font-medium">%</span>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {discountType === 'percentage' && (
                                                        <div className="mt-4">
                                                            <Label className="mb-2 block">Giá trị giảm tối đa (₫)</Label>
                                                            <div className="flex items-center gap-2">
                                                                <PriceInput
                                                                    value={maxDiscountValue}
                                                                    onValueChange={(value) => setMaxDiscountValue(value || 0)}
                                                                    className="flex-1"
                                                                    placeholder="0"
                                                                    min={0}
                                                                    autoComplete="off"
                                                                />
                                                                <span className="text-sm font-medium">₫</span>
                                                            </div>
                                                            <input type="hidden" name="max_discount_value" value={maxDiscountValue} />
                                                        </div>
                                                    )}
                                                    <input type="hidden" name="discount_type" value={discountType} />
                                                    <input type="hidden" name="discount_value" value={discountValue} />
                                                    <InputError message={errors.discount_value} className="mt-1" />
                                                </div>
                                            </div>
                                        </CustomCard>

                                        <CustomCard isShowHeader={true} title="Áp dụng cho">
                                            <Label className="mb-4 block font-bold">Áp dụng cho</Label>
                                            <RadioGroup
                                                value={applySource}
                                                onValueChange={(value) => setApplySource(value as typeof applySource)}
                                                name="apply_source"
                                            >
                                                <div className="space-y-3">
                                                    <div className="flex items-center space-x-2">
                                                        <RadioGroupItem value="all" id="apply-all" />
                                                        <Label htmlFor="apply-all" className="cursor-pointer font-normal">
                                                            Tất cả sản phẩm
                                                        </Label>
                                                    </div>
                                                    <div className="flex items-center space-x-2">
                                                        <RadioGroupItem value="product_variant" id="apply-product" />
                                                        <Label htmlFor="apply-product" className="cursor-pointer font-normal">
                                                            Sản phẩm
                                                        </Label>
                                                    </div>
                                                    {applySource === 'product_variant' && (
                                                        <div className="ml-6 space-y-2">
                                                            <div className="flex items-center gap-2">
                                                                <div className="relative flex-1">
                                                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                                    <Input
                                                                        type="text"
                                                                        placeholder="Tìm kiếm"
                                                                        className="pl-9"
                                                                        onClick={() => setShowProductModal(true)}
                                                                        readOnly
                                                                    />
                                                                </div>
                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    onClick={() => setShowProductModal(true)}
                                                                >
                                                                    Chọn nhiều
                                                                </Button>
                                                            </div>
                                                            {selectedProducts.length > 0 && (
                                                                <div className="space-y-2 mt-2">
                                                                    {selectedProducts.map(product => (
                                                                        <div key={product.id} className="flex items-center justify-between p-2 border rounded-lg hover:bg-gray-50">
                                                                            <div className="flex items-center gap-3">
                                                                                <div className="h-10 w-10 bg-gray-100 rounded flex-shrink-0 overflow-hidden">
                                                                                    {product.image ? (
                                                                                        <img src={product.image} alt="" className="h-full w-full object-cover" />
                                                                                    ) : (
                                                                                        <div className="h-full w-full flex items-center justify-center text-gray-400">
                                                                                            <Package className="h-5 w-5" />
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                                <div>
                                                                                    <div className="font-medium text-sm">{product.name}</div>
                                                                                    <div className="text-xs text-muted-foreground">{product.sku}</div>
                                                                                </div>
                                                                            </div>
                                                                            <Button
                                                                                type="button"
                                                                                variant="ghost"
                                                                                size="icon"
                                                                                className="h-8 w-8 text-muted-foreground hover:text-red-500"
                                                                                onClick={() => removeProduct(product.id)}
                                                                            >
                                                                                <X className="h-4 w-4" />
                                                                            </Button>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                    <div className="flex items-center space-x-2">
                                                        <RadioGroupItem value="product_catalogue" id="apply-catalogue" />
                                                        <Label htmlFor="apply-catalogue" className="cursor-pointer font-normal">
                                                            Danh mục sản phẩm
                                                        </Label>
                                                    </div>
                                                    {applySource === 'product_catalogue' && (
                                                        <div className="ml-6 space-y-2">
                                                            <div className="flex items-center gap-2">
                                                                <div className="relative flex-1">
                                                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                                    <Input
                                                                        type="text"
                                                                        placeholder="Tìm kiếm"
                                                                        className="pl-9"
                                                                        onClick={() => setShowCategoryModal(true)}
                                                                        readOnly
                                                                    />
                                                                </div>
                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    onClick={() => setShowCategoryModal(true)}
                                                                >
                                                                    Chọn nhiều
                                                                </Button>
                                                            </div>
                                                            {selectedCatalogues.length > 0 && (
                                                                <div className="space-y-2 mt-2">
                                                                    {selectedCatalogues.map(catalogue => (
                                                                        <div key={catalogue.id} className="flex items-center justify-between p-2 border rounded-lg hover:bg-gray-50">
                                                                            <div className="flex items-center gap-3">
                                                                                <div className="h-10 w-10 bg-gray-100 rounded flex-shrink-0 overflow-hidden">
                                                                                    {catalogue.image ? (
                                                                                        <img src={catalogue.image} alt="" className="h-full w-full object-cover" />
                                                                                    ) : (
                                                                                        <div className="h-full w-full flex items-center justify-center text-gray-400">
                                                                                            <Package className="h-5 w-5" />
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                                <div className="font-medium text-sm">{catalogue.name}</div>
                                                                            </div>
                                                                            <Button
                                                                                type="button"
                                                                                variant="ghost"
                                                                                size="icon"
                                                                                className="h-8 w-8 text-muted-foreground hover:text-red-500"
                                                                                onClick={() => removeCatalogue(catalogue.id)}
                                                                            >
                                                                                <X className="h-4 w-4" />
                                                                            </Button>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
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
                                                <div className="flex items-center space-x-2">
                                                    <Checkbox
                                                        id="allow_multiple_use"
                                                        checked={allowMultipleUse}
                                                        onCheckedChange={(checked) => setAllowMultipleUse(!!checked)}
                                                    />
                                                    <Label htmlFor="allow_multiple_use" className="cursor-pointer font-normal">
                                                        Cho phép khách hàng sử dụng nhiều lần trong cùng một đơn hàng
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
                                            promotionType="product_discount"
                                            startDate={startDate || (isEdit && voucher?.start_date ? new Date(voucher.start_date) : undefined)}
                                            endDate={endDate || (isEdit && voucher?.end_date && !noEndDate ? new Date(voucher.end_date) : undefined)}
                                            noEndDate={noEndDate || (isEdit && voucher?.no_end_date)}
                                            formatDate={formatDate}
                                            items={[
                                                { label: 'Loại voucher', value: <strong>Giảm giá sản phẩm</strong> },
                                                { label: 'Mã voucher', value: <span className="font-mono font-semibold">{code || 'Chưa có mã'}</span> },
                                                ...(discountValue > 0 || (isEdit && voucher?.discount_value) ? [{ label: 'Giá trị', value: getDiscountText() }] : []),
                                                { label: 'Áp dụng cho', value: getApplySourceText() },
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

            <ProductSelectionModal
                open={showProductModal}
                onOpenChange={setShowProductModal}
                onConfirm={handleProductsSelected}
                initialSelectedIds={selectedProducts.map(p => p.id)}
                initialSelectedProducts={selectedProducts}
                preloadedProducts={initialProducts}
                preloadedCatalogues={productCatalogues}
                title="Chọn sản phẩm"
                description="Chọn các sản phẩm sẽ được áp dụng voucher giảm giá"
            />

            <CategorySelectionModal
                open={showCategoryModal}
                onOpenChange={setShowCategoryModal}
                onConfirm={handleCataloguesSelected}
                initialSelectedIds={selectedCatalogues.map(c => c.id)}

                preloadedCatalogues={productCatalogues}
            />
        </AppLayout>
    )
}

