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
import { LoaderCircle, ArrowLeft, Layers, X, Package, Search } from 'lucide-react'
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

interface BuyXGetYVoucher {
    id?: number
    code: string
    name: string
    discount_type: 'percentage' | 'fixed_amount' | 'free'
    discount_value: number
    buy_min_quantity: number
    buy_min_order_value?: number
    buy_condition_type: 'min_quantity' | 'min_order_value'
    buy_apply_type: 'product' | 'product_catalogue'
    buy_product_ids?: number[]
    buy_product_catalogue_ids?: number[]
    buy_product_items?: Array<{ id: number; name: string; sku: string; image?: string }>
    buy_product_catalogue_items?: Array<{ id: number; name: string; image?: string }>
    get_quantity: number
    get_apply_type: 'product' | 'product_catalogue'
    get_product_ids?: number[]
    get_product_catalogue_ids?: number[]
    get_product_items?: Array<{ id: number; name: string; sku: string; image?: string }>
    get_product_catalogue_items?: Array<{ id: number; name: string; image?: string }>
    max_apply_per_order?: number
    usage_limit?: number
    limit_per_customer: boolean
    allow_multiple_use: boolean
    combine_with_order_discount: boolean
    combine_with_product_discount: boolean
    combine_with_free_shipping: boolean
    start_date: string
    end_date?: string
    no_end_date: boolean
    publish: string
    customer_group_type: 'all' | 'selected'
    customer_group_ids?: number[]
    store_type: 'all' | 'selected'
    store_ids?: number[]
}

interface BuyXGetYProps {
    voucher?: BuyXGetYVoucher
    customerGroups?: Array<{ value: string | number; label: string }>
    stores?: Array<{ value: string | number; label: string }>
    initialProducts?: Array<any>
    productCatalogues?: Array<any>
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Quản lý Marketing', href: '/backend/promotion' },
    { title: 'Quản lý Mã Voucher', href: '/backend/voucher/voucher' },
    { title: 'Thêm mới voucher Mua X Tặng Y', href: '/' },
]

export default function BuyXGetY({
    voucher,
    customerGroups = [],
    stores = [],
    initialProducts = [],
    productCatalogues = []
}: BuyXGetYProps) {
    const isEdit = !!voucher

    const [code, setCode] = useState(voucher?.code || '')
    const [buyMinQuantity, setBuyMinQuantity] = useState<number>(voucher?.buy_min_quantity || 1)
    const [buyConditionType, setBuyConditionType] = useState<'min_quantity' | 'min_order_value'>(
        voucher?.buy_condition_type || 'min_quantity'
    )
    const [buyMinOrderValue, setBuyMinOrderValue] = useState<number>(voucher?.buy_min_order_value || 0)
    const [buyApplyType, setBuyApplyType] = useState<'product' | 'product_catalogue'>(
        voucher?.buy_apply_type || 'product'
    )
    const [buySelectedProducts, setBuySelectedProducts] = useState<Array<{ id: number; name: string; sku: string; image?: string }>>(
        voucher?.buy_product_items || []
    )
    const [buySelectedCatalogues, setBuySelectedCatalogues] = useState<Array<{ id: number; name: string; image?: string }>>(
        voucher?.buy_product_catalogue_items || []
    )
    const [showBuyProductModal, setShowBuyProductModal] = useState(false)
    const [showBuyCategoryModal, setShowBuyCategoryModal] = useState(false)

    const [getQuantity, setGetQuantity] = useState<number>(voucher?.get_quantity || 1)
    const [getApplyType, setGetApplyType] = useState<'product' | 'product_catalogue'>(
        voucher?.get_apply_type || 'product'
    )
    const [getSelectedProducts, setGetSelectedProducts] = useState<Array<{ id: number; name: string; sku: string; image?: string }>>(
        voucher?.get_product_items || []
    )
    const [getSelectedCatalogues, setGetSelectedCatalogues] = useState<Array<{ id: number; name: string; image?: string }>>(
        voucher?.get_product_catalogue_items || []
    )
    const [showGetProductModal, setShowGetProductModal] = useState(false)
    const [showGetCategoryModal, setShowGetCategoryModal] = useState(false)

    const [discountType, setDiscountType] = useState<'percentage' | 'fixed_amount' | 'free'>(
        voucher?.discount_type || 'free'
    )
    const [discountValue, setDiscountValue] = useState<number>(voucher?.discount_value || 0)
    const [maxApplyPerOrder, setMaxApplyPerOrder] = useState<number | undefined>(voucher?.max_apply_per_order)
    const [hasMaxApplyLimit, setHasMaxApplyLimit] = useState<boolean>(!!voucher?.max_apply_per_order)
    const [usageLimit, setUsageLimit] = useState<number | undefined>(voucher?.usage_limit)
    const [hasUsageLimit, setHasUsageLimit] = useState(!!voucher?.usage_limit)
    const [limitPerCustomer, setLimitPerCustomer] = useState(voucher?.limit_per_customer || false)
    const [allowMultipleUse, setAllowMultipleUse] = useState(voucher?.allow_multiple_use ?? true)

    const [noEndDate, setNoEndDate] = useState(voucher?.no_end_date || false)
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
    const [combineOrderDiscount, setCombineOrderDiscount] = useState(voucher?.combine_with_order_discount || false)
    const [combineProductDiscount, setCombineProductDiscount] = useState(voucher?.combine_with_product_discount || false)
    const [combineFreeShipping, setCombineFreeShipping] = useState(voucher?.combine_with_free_shipping || false)
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

    const [voucherName, setVoucherName] = useState(voucher?.name || '')

    useEffect(() => {
        if (voucher?.buy_product_items && Array.isArray(voucher.buy_product_items)) {
            const validItems = voucher.buy_product_items.filter(item => item && item.id && item.name)
            if (validItems.length > 0) {
                setBuySelectedProducts(validItems)
            }
        }
    }, [voucher?.buy_product_items])

    useEffect(() => {
        if (voucher?.buy_product_catalogue_items && Array.isArray(voucher.buy_product_catalogue_items)) {
            const validItems = voucher.buy_product_catalogue_items.filter(item => item && item.id && item.name)
            if (validItems.length > 0) {
                setBuySelectedCatalogues(validItems)
            }
        }
    }, [voucher?.buy_product_catalogue_items])

    useEffect(() => {
        if (voucher?.get_product_items && Array.isArray(voucher.get_product_items)) {
            const validItems = voucher.get_product_items.filter(item => item && item.id && item.name)
            if (validItems.length > 0) {
                setGetSelectedProducts(validItems)
            }
        }
    }, [voucher?.get_product_items])

    useEffect(() => {
        if (voucher?.get_product_catalogue_items && Array.isArray(voucher.get_product_catalogue_items)) {
            const validItems = voucher.get_product_catalogue_items.filter(item => item && item.id && item.name)
            if (validItems.length > 0) {
                setGetSelectedCatalogues(validItems)
            }
        }
    }, [voucher?.get_product_catalogue_items])

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
        if (discountType === 'free') {
            return 'Miễn phí'
        } else if (discountType === 'fixed_amount') {
            return `Giảm ${formatPrice(value)}₫ cho mỗi sản phẩm`
        } else {
            return `Giảm ${value}% cho mỗi sản phẩm`
        }
    }

    const getBuyConditionText = (): string => {
        if (buyConditionType === 'min_quantity') {
            const qty = buyMinQuantity > 0 ? buyMinQuantity : (voucher?.buy_min_quantity || 1)
            return `Mua tối thiểu ${qty} sản phẩm`
        } else {
            const value = buyMinOrderValue > 0 ? buyMinOrderValue : (voucher?.buy_min_order_value || 0)
            return `Giá trị đơn hàng tối thiểu: ${formatPrice(value)}₫`
        }
    }

    const getBuyApplyText = (): string => {
        if (buyApplyType === 'product') {
            if (buySelectedProducts.length > 0) {
                return `${buySelectedProducts.length} sản phẩm đã chọn`
            }
            return 'Chưa chọn sản phẩm'
        } else {
            if (buySelectedCatalogues.length > 0) {
                return `${buySelectedCatalogues.length} danh mục đã chọn`
            }
            return 'Chưa chọn danh mục'
        }
    }

    const getGetApplyText = (): string => {
        const qty = getQuantity > 0 ? getQuantity : (voucher?.get_quantity || 1)
        if (getApplyType === 'product') {
            if (getSelectedProducts.length > 0) {
                return `Tặng ${qty} sản phẩm từ ${getSelectedProducts.length} sản phẩm đã chọn`
            }
            return `Tặng ${qty} sản phẩm (chưa chọn)`
        } else {
            if (getSelectedCatalogues.length > 0) {
                return `Tặng ${qty} sản phẩm từ ${getSelectedCatalogues.length} danh mục đã chọn`
            }
            return `Tặng ${qty} sản phẩm (chưa chọn danh mục)`
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

    const removeBuyProduct = (id: number) => {
        setBuySelectedProducts(prev => prev.filter(p => p.id !== id))
    }

    const removeBuyCatalogue = (id: number) => {
        setBuySelectedCatalogues(prev => prev.filter(c => c.id !== id))
    }

    const removeGetProduct = (id: number) => {
        setGetSelectedProducts(prev => prev.filter(p => p.id !== id))
    }

    const removeGetCatalogue = (id: number) => {
        setGetSelectedCatalogues(prev => prev.filter(c => c.id !== id))
    }

    const handleBuyProductsSelected = (products: Array<{ id: number; name: string; sku: string; image?: string; productId?: number; productName?: string }>) => {
        setBuySelectedProducts(products)
        setShowBuyProductModal(false)
    }

    const handleBuyCataloguesSelected = (catalogues: Array<{ id: number; name: string; image?: string }>) => {
        setBuySelectedCatalogues(catalogues)
        setShowBuyCategoryModal(false)
    }

    const handleGetProductsSelected = (products: Array<{ id: number; name: string; sku: string; image?: string; productId?: number; productName?: string }>) => {
        setGetSelectedProducts(products)
        setShowGetProductModal(false)
    }

    const handleGetCataloguesSelected = (catalogues: Array<{ id: number; name: string; image?: string }>) => {
        setGetSelectedCatalogues(catalogues)
        setShowGetCategoryModal(false)
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={isEdit ? 'Cập nhật voucher Mua X Tặng Y' : 'Thêm mới voucher Mua X Tặng Y'} />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl page-wrapper">
                <CustomPageHeading
                    heading={isEdit ? 'Cập nhật voucher Mua X Tặng Y' : 'Thêm mới voucher Mua X Tặng Y'}
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
                            type: 'buy_x_get_y',
                            ...(isEdit ? { _method: 'put' } : {}),
                            code: code || undefined,
                            usage_limit: hasUsageLimit ? (usageLimit || null) : null,
                            limit_per_customer: limitPerCustomer,
                            allow_multiple_use: allowMultipleUse,
                            customer_group_ids: customerGroupType === 'selected' ? selectedCustomerGroups : [],
                            store_ids: storeType === 'selected' ? selectedStores : [],
                            no_end_date: noEndDate,
                            combine_with_order_discount: combineOrderDiscount,
                            combine_with_product_discount: combineProductDiscount,
                            combine_with_free_shipping: combineFreeShipping,
                            buy_min_quantity: buyMinQuantity,
                            buy_condition_type: buyConditionType,
                            buy_min_order_value: buyConditionType === 'min_order_value' ? buyMinOrderValue : null,
                            buy_apply_type: buyApplyType,
                            buy_product_ids: buyApplyType === 'product' ? buySelectedProducts.map(p => p.id) : [],
                            buy_product_catalogue_ids: buyApplyType === 'product_catalogue' ? buySelectedCatalogues.map(c => c.id) : [],
                            get_quantity: getQuantity,
                            get_apply_type: getApplyType,
                            get_product_ids: getApplyType === 'product' ? getSelectedProducts.map(p => p.id) : [],
                            get_product_catalogue_ids: getApplyType === 'product_catalogue' ? getSelectedCatalogues.map(c => c.id) : [],
                            discount_type: discountType,
                            discount_value: discountType === 'free' ? 0 : discountValue,
                            max_apply_per_order: hasMaxApplyLimit ? maxApplyPerOrder : null,
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

                                        <CustomCard isShowHeader={true} title="Mua X Tặng Y">
                                            <div className="space-y-6">
                                                <div>
                                                    <h3 className="text-sm font-semibold mb-4">Mua X (Sản phẩm mua)</h3>
                                                    <div className="space-y-4">
                                                        <div>
                                                            <Label className="mb-3 block">Điều kiện</Label>
                                                            <RadioGroup value={buyConditionType} onValueChange={(value: 'min_quantity' | 'min_order_value') => setBuyConditionType(value)}>
                                                                <div className="space-y-3">
                                                                    <div className="flex items-center space-x-2">
                                                                        <RadioGroupItem value="min_quantity" id="buy_min_quantity" />
                                                                        <Label htmlFor="buy_min_quantity" className="cursor-pointer font-normal">Số lượng sản phẩm tối thiểu</Label>
                                                                    </div>
                                                                    {buyConditionType === 'min_quantity' && (
                                                                        <div className="ml-6">
                                                                            <Input
                                                                                type="number"
                                                                                min="1"
                                                                                value={buyMinQuantity}
                                                                                onChange={(e) => setBuyMinQuantity(Number(e.target.value) || 1)}
                                                                                className="w-48"
                                                                                placeholder="Nhập số lượng"
                                                                            />
                                                                        </div>
                                                                    )}
                                                                    <div className="flex items-center space-x-2">
                                                                        <RadioGroupItem value="min_order_value" id="buy_min_order_value" />
                                                                        <Label htmlFor="buy_min_order_value" className="cursor-pointer font-normal">Giá trị sản phẩm trong đơn tối thiểu</Label>
                                                                    </div>
                                                                    {buyConditionType === 'min_order_value' && (
                                                                        <div className="ml-6">
                                                                            <div className="flex items-center gap-2">
                                                                                <PriceInput
                                                                                    value={buyMinOrderValue}
                                                                                    onValueChange={(value) => setBuyMinOrderValue(value || 0)}
                                                                                    className="w-48"
                                                                                    placeholder="Nhập giá trị"
                                                                                    autoComplete="off"
                                                                                />
                                                                                <span className="text-sm font-medium">₫</span>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </RadioGroup>
                                                        </div>

                                                        <div>
                                                            <Label className="mb-4 block font-bold">Áp dụng cho</Label>
                                                            <RadioGroup value={buyApplyType} onValueChange={(value: 'product' | 'product_catalogue') => setBuyApplyType(value)}>
                                                                <div className="space-y-3">
                                                                    <div className="flex items-center space-x-2">
                                                                        <RadioGroupItem value="product" id="buy_product" />
                                                                        <Label htmlFor="buy_product" className="cursor-pointer font-normal">Sản phẩm</Label>
                                                                    </div>
                                                                    {buyApplyType === 'product' && (
                                                                        <div className="ml-6 space-y-2">
                                                                            <div className="flex items-center gap-2">
                                                                                <div className="relative flex-1">
                                                                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                                                    <Input
                                                                                        type="text"
                                                                                        placeholder="Tìm kiếm"
                                                                                        className="pl-9"
                                                                                        onClick={() => setShowBuyProductModal(true)}
                                                                                        readOnly
                                                                                    />
                                                                                </div>
                                                                                <Button
                                                                                    type="button"
                                                                                    variant="outline"
                                                                                    onClick={() => setShowBuyProductModal(true)}
                                                                                >
                                                                                    Chọn nhiều
                                                                                </Button>
                                                                            </div>
                                                                            {buySelectedProducts.length > 0 && (
                                                                                <div className="space-y-2 mt-2">
                                                                                    {buySelectedProducts.map(product => (
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
                                                                                                onClick={() => removeBuyProduct(product.id)}
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
                                                                        <RadioGroupItem value="product_catalogue" id="buy_catalogue" />
                                                                        <Label htmlFor="buy_catalogue" className="cursor-pointer font-normal">Danh mục sản phẩm</Label>
                                                                    </div>
                                                                    {buyApplyType === 'product_catalogue' && (
                                                                        <div className="ml-6 space-y-2">
                                                                            <div className="flex items-center gap-2">
                                                                                <div className="relative flex-1">
                                                                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                                                    <Input
                                                                                        type="text"
                                                                                        placeholder="Tìm kiếm"
                                                                                        className="pl-9"
                                                                                        onClick={() => setShowBuyCategoryModal(true)}
                                                                                        readOnly
                                                                                    />
                                                                                </div>
                                                                                <Button
                                                                                    type="button"
                                                                                    variant="outline"
                                                                                    onClick={() => setShowBuyCategoryModal(true)}
                                                                                >
                                                                                    Chọn nhiều
                                                                                </Button>
                                                                            </div>
                                                                            {buySelectedCatalogues.length > 0 && (
                                                                                <div className="space-y-2 mt-2">
                                                                                    {buySelectedCatalogues.map(catalogue => (
                                                                                        <div key={catalogue.id} className="flex items-center justify-between p-2 border rounded-lg hover:bg-gray-50">
                                                                                            <div className="flex items-center gap-3">
                                                                                                <div className="h-10 w-10 bg-gray-100 rounded flex-shrink-0 overflow-hidden">
                                                                                                    {catalogue.image ? (
                                                                                                        <img src={catalogue.image} alt="" className="h-full w-full object-cover" />
                                                                                                    ) : (
                                                                                                        <div className="h-full w-full flex items-center justify-center text-gray-400">
                                                                                                            <Layers className="h-5 w-5" />
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
                                                                                                onClick={() => removeBuyCatalogue(catalogue.id)}
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
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="border-t border-gray-200"></div>

                                                <div>
                                                    <h3 className="text-sm font-semibold mb-4">Tặng Y (Sản phẩm được khuyến mại)</h3>
                                                    <div className="space-y-4">
                                                        <div>
                                                            <Label className="mb-3 block">Số lượng sản phẩm</Label>
                                                            <Input
                                                                type="number"
                                                                min="1"
                                                                value={getQuantity}
                                                                onChange={(e) => setGetQuantity(Number(e.target.value) || 1)}
                                                                className="w-48"
                                                                placeholder="Nhập số lượng"
                                                            />
                                                        </div>

                                                        <div>
                                                            <Label className="mb-4 block font-bold">Áp dụng cho</Label>
                                                            <RadioGroup value={getApplyType} onValueChange={(value: 'product' | 'product_catalogue') => setGetApplyType(value)}>
                                                                <div className="space-y-3">
                                                                    <div className="flex items-center space-x-2">
                                                                        <RadioGroupItem value="product" id="get_product" />
                                                                        <Label htmlFor="get_product" className="cursor-pointer font-normal">Sản phẩm</Label>
                                                                    </div>
                                                                    {getApplyType === 'product' && (
                                                                        <div className="ml-6 space-y-2">
                                                                            <div className="flex items-center gap-2">
                                                                                <div className="relative flex-1">
                                                                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                                                    <Input
                                                                                        type="text"
                                                                                        placeholder="Tìm kiếm"
                                                                                        className="pl-9"
                                                                                        onClick={() => setShowGetProductModal(true)}
                                                                                        readOnly
                                                                                    />
                                                                                </div>
                                                                                <Button
                                                                                    type="button"
                                                                                    variant="outline"
                                                                                    onClick={() => setShowGetProductModal(true)}
                                                                                >
                                                                                    Chọn nhiều
                                                                                </Button>
                                                                            </div>
                                                                            {getSelectedProducts.length > 0 && (
                                                                                <div className="space-y-2 mt-2">
                                                                                    {getSelectedProducts.map(product => (
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
                                                                                                onClick={() => removeGetProduct(product.id)}
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
                                                                        <RadioGroupItem value="product_catalogue" id="get_catalogue" />
                                                                        <Label htmlFor="get_catalogue" className="cursor-pointer font-normal">Danh mục sản phẩm</Label>
                                                                    </div>
                                                                    {getApplyType === 'product_catalogue' && (
                                                                        <div className="ml-6 space-y-2">
                                                                            <div className="flex items-center gap-2">
                                                                                <div className="relative flex-1">
                                                                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                                                    <Input
                                                                                        type="text"
                                                                                        placeholder="Tìm kiếm"
                                                                                        className="pl-9"
                                                                                        onClick={() => setShowGetCategoryModal(true)}
                                                                                        readOnly
                                                                                    />
                                                                                </div>
                                                                                <Button
                                                                                    type="button"
                                                                                    variant="outline"
                                                                                    onClick={() => setShowGetCategoryModal(true)}
                                                                                >
                                                                                    Chọn nhiều
                                                                                </Button>
                                                                            </div>
                                                                            {getSelectedCatalogues.length > 0 && (
                                                                                <div className="space-y-2 mt-2">
                                                                                    {getSelectedCatalogues.map(catalogue => (
                                                                                        <div key={catalogue.id} className="flex items-center justify-between p-2 border rounded-lg hover:bg-gray-50">
                                                                                            <div className="flex items-center gap-3">
                                                                                                <div className="h-10 w-10 bg-gray-100 rounded flex-shrink-0 overflow-hidden">
                                                                                                    {catalogue.image ? (
                                                                                                        <img src={catalogue.image} alt="" className="h-full w-full object-cover" />
                                                                                                    ) : (
                                                                                                        <div className="h-full w-full flex items-center justify-center text-gray-400">
                                                                                                            <Layers className="h-5 w-5" />
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
                                                                                                onClick={() => removeGetCatalogue(catalogue.id)}
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
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="border-t border-gray-200"></div>

                                                <div>
                                                    <h3 className="text-sm font-semibold mb-4">Loại giảm giá</h3>
                                                    <RadioGroup value={discountType} onValueChange={(value: 'percentage' | 'fixed_amount' | 'free') => setDiscountType(value)}>
                                                        <div className="space-y-3">
                                                            <div className="flex items-center space-x-2">
                                                                <RadioGroupItem value="percentage" id="discount_percentage" />
                                                                <Label htmlFor="discount_percentage" className="cursor-pointer font-normal">Phần trăm</Label>
                                                            </div>
                                                            {discountType === 'percentage' && (
                                                                <div className="ml-6">
                                                                    <div className="flex items-center gap-2">
                                                                        <Input
                                                                            type="number"
                                                                            min="0"
                                                                            max="100"
                                                                            value={discountValue}
                                                                            onChange={(e) => setDiscountValue(Number(e.target.value) || 0)}
                                                                            className="w-32"
                                                                            placeholder="0"
                                                                        />
                                                                        <span>%</span>
                                                                    </div>
                                                                </div>
                                                            )}

                                                            <div className="flex items-center space-x-2">
                                                                <RadioGroupItem value="fixed_amount" id="discount_fixed" />
                                                                <Label htmlFor="discount_fixed" className="cursor-pointer font-normal">Giá trị giảm cho mỗi sản phẩm</Label>
                                                            </div>
                                                            {discountType === 'fixed_amount' && (
                                                                <div className="ml-6">
                                                                    <div className="flex items-center gap-2">
                                                                        <PriceInput
                                                                            value={discountValue}
                                                                            onValueChange={(value) => setDiscountValue(value || 0)}
                                                                            className="w-48"
                                                                            placeholder="0"
                                                                            autoComplete="off"
                                                                        />
                                                                        <span className="text-sm font-medium">₫</span>
                                                                    </div>
                                                                </div>
                                                            )}

                                                            <div className="flex items-center space-x-2">
                                                                <RadioGroupItem value="free" id="discount_free" />
                                                                <Label htmlFor="discount_free" className="cursor-pointer font-normal">Miễn phí</Label>
                                                            </div>
                                                        </div>
                                                    </RadioGroup>
                                                </div>
                                            </div>
                                        </CustomCard>

                                        <CustomCard isShowHeader={true} title="Giới hạn">
                                            <div className="space-y-4">
                                                <div className="flex items-center space-x-2">
                                                    <Checkbox
                                                        id="max_apply_limit"
                                                        checked={hasMaxApplyLimit}
                                                        onCheckedChange={(checked) => {
                                                            setHasMaxApplyLimit(!!checked)
                                                            if (!checked) {
                                                                setMaxApplyPerOrder(undefined)
                                                            }
                                                        }}
                                                    />
                                                    <Label htmlFor="max_apply_limit" className="cursor-pointer font-normal">
                                                        Giới hạn số lần áp dụng tối đa trong đơn
                                                    </Label>
                                                </div>
                                                {hasMaxApplyLimit && (
                                                    <div className="ml-6">
                                                        <Input
                                                            type="number"
                                                            min="1"
                                                            value={maxApplyPerOrder || ''}
                                                            onChange={(e) => setMaxApplyPerOrder(Number(e.target.value) || undefined)}
                                                            placeholder="Nhập số lần tối đa"
                                                            className="w-48"
                                                        />
                                                    </div>
                                                )}
                                            </div>
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
                                            promotionType="buy_x_get_y"
                                            startDate={startDate || (isEdit && voucher?.start_date ? new Date(voucher.start_date) : undefined)}
                                            endDate={endDate || (isEdit && voucher?.end_date && !noEndDate ? new Date(voucher.end_date) : undefined)}
                                            noEndDate={noEndDate || (isEdit && voucher?.no_end_date)}
                                            formatDate={formatDate}
                                            items={[
                                                { label: 'Loại voucher', value: <strong>Mua X Tặng Y</strong> },
                                                { label: 'Mã voucher', value: <span className="font-mono font-semibold">{code || 'Chưa có mã'}</span> },
                                                { label: 'Điều kiện mua', value: getBuyConditionText() },
                                                { label: 'Sản phẩm mua', value: getBuyApplyText() },
                                                { label: 'Sản phẩm tặng', value: getGetApplyText() },
                                                { label: 'Loại giảm giá', value: getDiscountText() },
                                                {
                                                    label: 'Giới hạn trong đơn',
                                                    value: hasMaxApplyLimit && maxApplyPerOrder
                                                        ? `${maxApplyPerOrder} lần`
                                                        : 'Không giới hạn'
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

            <ProductSelectionModal
                open={showBuyProductModal}
                onOpenChange={setShowBuyProductModal}
                onConfirm={handleBuyProductsSelected}
                initialSelectedIds={buySelectedProducts.map(p => p.id)}
                initialSelectedProducts={buySelectedProducts}
                preloadedProducts={initialProducts}
                preloadedCatalogues={productCatalogues}
                title="Chọn sản phẩm mua"
                description="Chọn các sản phẩm khách hàng cần mua để được tặng"
            />

            <CategorySelectionModal
                open={showBuyCategoryModal}
                onOpenChange={setShowBuyCategoryModal}
                onConfirm={handleBuyCataloguesSelected}
                initialSelectedIds={buySelectedCatalogues.map(c => c.id)}
                preloadedCatalogues={productCatalogues}
            />

            <ProductSelectionModal
                open={showGetProductModal}
                onOpenChange={setShowGetProductModal}
                onConfirm={handleGetProductsSelected}
                initialSelectedIds={getSelectedProducts.map(p => p.id)}
                initialSelectedProducts={getSelectedProducts}
                preloadedProducts={initialProducts}
                preloadedCatalogues={productCatalogues}
                title="Chọn sản phẩm tặng"
                description="Chọn các sản phẩm sẽ được tặng cho khách hàng"
            />

            <CategorySelectionModal
                open={showGetCategoryModal}
                onOpenChange={setShowGetCategoryModal}
                onConfirm={handleGetCataloguesSelected}
                initialSelectedIds={getSelectedCatalogues.map(c => c.id)}
                preloadedCatalogues={productCatalogues}
            />
        </AppLayout>
    )
}

