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
import { LoaderCircle, ArrowLeft, Package, Layers, X, Search } from 'lucide-react'
import { setPreserveState } from '@/lib/helper'
import { PriceInput } from '@/components/price-input'
import { format } from 'date-fns'
import { ProductSelectionModal } from './components/product-selection-modal'
import { CategorySelectionModal } from './components/category-selection-modal'
import { PromotionNameInput } from './components/promotion-name-input'
import { CustomerGroupSelector } from './components/customer-group-selector'
import { StoreSelector } from './components/store-selector'
import { CombinePromotionSelector } from './components/combine-promotion-selector'
import { TimeSelector } from './components/time-selector'
import { PromotionOverview } from './components/promotion-overview'
import { StatusSelector } from './components/status-selector'

interface ProductDiscountPromotion {
    id?: number
    name: string
    discount_type: 'fixed_amount' | 'percentage' | 'same_price'
    discount_value: number
    max_discount_value?: number
    apply_source: 'all' | 'product_variant' | 'product_catalogue'
    product_variant_ids?: number[]
    product_catalogue_ids?: number[]
    product_items?: Array<{ id: number; name: string; sku: string; image?: string }>
    product_catalogue_items?: Array<{ id: number; name: string; image?: string }>
    combine_with_order_discount: boolean
    combine_with_product_discount: boolean
    combine_with_free_shipping: boolean
    start_date: string
    end_date?: string
    no_end_date: boolean
    publish: string
}

interface ProductDiscountProps {
    promotion?: ProductDiscountPromotion
    customerGroups?: Array<{ value: string | number; label: string }>
    stores?: Array<{ value: string | number; label: string }>
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Quản lý Marketing', href: '/backend/promotion' },
    { title: 'Quản lý Khuyến Mãi', href: '/backend/promotion/promotion' },
    { title: 'Thêm mới chương trình giảm giá sản phẩm', href: '/' },
]

export default function ProductDiscount({
    promotion,
    customerGroups = [],
    stores = []
}: ProductDiscountProps) {
    const isEdit = !!promotion

    // Tách thành 2 state: loại chính (discount/same_price) và loại phụ (fixed_amount/percentage)
    const [discountMainType, setDiscountMainType] = useState<'discount' | 'same_price'>(
        promotion?.discount_type === 'same_price' ? 'same_price' : 'discount'
    )
    const [discountSubType, setDiscountSubType] = useState<'fixed_amount' | 'percentage'>(
        promotion?.discount_type === 'fixed_amount' ? 'fixed_amount' : 'percentage'
    )

    // Computed discountType để tương thích với backend
    const discountType: 'fixed_amount' | 'percentage' | 'same_price' =
        discountMainType === 'same_price' ? 'same_price' : discountSubType
    const [applySource, setApplySource] = useState<'all' | 'product_variant' | 'product_catalogue'>(
        promotion?.apply_source || 'all'
    )
    const [noEndDate, setNoEndDate] = useState(promotion?.no_end_date || false)
    const [showProductModal, setShowProductModal] = useState(false)
    const [showCategoryModal, setShowCategoryModal] = useState(false)
    const [selectedProducts, setSelectedProducts] = useState<Array<{ id: number; name: string; sku: string; image?: string }>>(
        promotion?.product_items || []
    )
    const [selectedCatalogues, setSelectedCatalogues] = useState<Array<{ id: number; name: string; image?: string }>>(
        promotion?.product_catalogue_items || []
    )
    const [productSearch, setProductSearch] = useState('')
    const [categorySearch, setCategorySearch] = useState('')
    const [tempSelectedProducts, setTempSelectedProducts] = useState<Array<{ id: number; name: string; sku: string; image?: string }>>([])
    const [tempSelectedCatalogues, setTempSelectedCatalogues] = useState<Array<{ id: number; name: string; image?: string }>>([])
    const [combineOrderDiscount, setCombineOrderDiscount] = useState(promotion?.combine_with_order_discount || false)
    const [combineProductDiscount, setCombineProductDiscount] = useState(promotion?.combine_with_product_discount || false)
    const [combineFreeShipping, setCombineFreeShipping] = useState(promotion?.combine_with_free_shipping || false)
    const [discountValue, setDiscountValue] = useState<number>(promotion?.discount_value || 0)
    const [maxDiscountValue, setMaxDiscountValue] = useState<number>(promotion?.max_discount_value || 0)
    const [startDate, setStartDate] = useState<Date | undefined>(() => {
        if (promotion?.start_date) {
            const dateStr = promotion.start_date
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
        if (promotion?.end_date) {
            const dateStr = promotion.end_date
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
        if (showProductModal) {
            setTempSelectedProducts([...selectedProducts])
        }
    }, [showProductModal, selectedProducts])

    useEffect(() => {
        if (showCategoryModal) {
            setTempSelectedCatalogues([...selectedCatalogues])
        }
    }, [showCategoryModal, selectedCatalogues])

    // Sync selectedCatalogues khi promotion thay đổi (khi edit)
    useEffect(() => {
        if (promotion?.product_catalogue_items && Array.isArray(promotion.product_catalogue_items)) {
            // Đảm bảo dữ liệu có name trước khi set
            const validItems = promotion.product_catalogue_items.filter(item => item && item.id && item.name);
            if (validItems.length > 0) {
                setSelectedCatalogues(validItems);
            }
        }
    }, [promotion?.product_catalogue_items])

    // Sync selectedProducts khi promotion thay đổi (khi edit)
    useEffect(() => {
        if (promotion?.product_items) {
            setSelectedProducts(promotion.product_items)
        }
    }, [promotion?.product_items])

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
        if (discountType === 'same_price') {
            return `Đồng giá ${formatPrice(value)}₫`
        } else if (discountType === 'fixed_amount') {
            return `Giảm ${formatPrice(value)}₫`
        } else {
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

    const getApplySourceDetails = (): string[] => {
        if (applySource === 'product_variant') {
            return selectedProducts.map(p => p.name)
        } else if (applySource === 'product_catalogue') {
            return selectedCatalogues.map(c => c.name)
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
        const currentStartDate = startDate || (isEdit && promotion?.start_date ? (() => {
            const dateStr = promotion.start_date
            if (dateStr.includes('T')) {
                const [datePart, timePart] = dateStr.split('T')
                const [year, month, day] = datePart.split('-').map(Number)
                const [hours, minutes] = timePart ? timePart.split(':').map(Number) : [0, 0]
                return new Date(year, month - 1, day, hours, minutes)
            }
            return new Date(dateStr)
        })() : undefined)
        const currentEndDate = endDate || (isEdit && promotion?.end_date && !noEndDate ? (() => {
            const dateStr = promotion.end_date!
            if (dateStr.includes('T')) {
                const [datePart, timePart] = dateStr.split('T')
                const [year, month, day] = datePart.split('-').map(Number)
                const [hours, minutes] = timePart ? timePart.split(':').map(Number) : [23, 59]
                return new Date(year, month - 1, day, hours, minutes)
            }
            return new Date(dateStr)
        })() : undefined)
        const currentNoEndDate = noEndDate || (isEdit && promotion?.no_end_date)

        const start = currentStartDate ? formatDate(currentStartDate) : 'Chưa chọn'
        if (currentNoEndDate) {
            return `Từ ${start} (Không có ngày kết thúc)`
        }
        const end = currentEndDate ? formatDate(currentEndDate) : 'Chưa chọn'
        return `Từ ${start} đến ${end}`
    }

    const [promotionName, setPromotionName] = useState(promotion?.name || '')

    const handleProductsSelected = (products: Array<{ id: number; name: string; sku: string; image?: string }>) => {
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
            <Head title={isEdit ? 'Cập nhật chương trình giảm giá sản phẩm' : 'Thêm mới chương trình giảm giá sản phẩm'} />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl page-wrapper">
                <CustomPageHeading
                    heading={isEdit ? 'Cập nhật chương trình giảm giá sản phẩm' : 'Thêm mới chương trình giảm giá sản phẩm'}
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
                        transform={(data) => {
                            // Phân tách product_ids và product_variant_ids
                            // Nếu selectedProduct có productId và id === productId thì là product không có variant
                            // Nếu selectedProduct có productId và id !== productId thì là variant
                            const productIds: number[] = [];
                            const productVariantIds: number[] = [];

                            if (applySource === 'product_variant') {
                                selectedProducts.forEach(p => {
                                    // Nếu có productId và id === productId thì là product không có variant
                                    if (p.productId && p.id === p.productId) {
                                        productIds.push(p.id);
                                    } else {
                                        // Ngược lại là variant
                                        productVariantIds.push(p.id);
                                    }
                                });
                            }

                            return {
                                ...data,
                                type: 'product_discount',
                                ...(isEdit ? { _method: 'put' } : {}),
                                apply_source: applySource,
                                product_ids: applySource === 'product_variant' ? productIds : [],
                                product_variant_ids: applySource === 'product_variant' ? productVariantIds : [],
                                product_catalogue_ids: applySource === 'product_catalogue' ? selectedCatalogues.map(c => c.id) : [],
                                no_end_date: noEndDate,
                                combine_with_order_discount: combineOrderDiscount,
                                combine_with_product_discount: combineProductDiscount,
                                combine_with_free_shipping: combineFreeShipping,
                                max_discount_value: discountType === 'percentage' ? maxDiscountValue : undefined,
                                // CRITICAL: same_price uses combo_price field, not discount_value
                                combo_price: discountType === 'same_price' ? discountValue : undefined,
                                discount_value: discountType !== 'same_price' ? discountValue : undefined,
                            };
                        }}
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

                                        {/* Giá trị khuyến mại */}
                                        <CustomCard isShowHeader={true} title="Giá trị">
                                            <div className="space-y-4">
                                                <div>
                                                    <Label className="mb-2 block">Giá trị khuyến mại</Label>
                                                    <RadioGroup
                                                        value={discountMainType}
                                                        onValueChange={(value) => {
                                                            setDiscountMainType(value as 'discount' | 'same_price')
                                                            // Nếu chuyển sang "Giảm giá" và chưa có subType, mặc định là percentage
                                                            if (value === 'discount' && discountSubType === 'percentage' && discountMainType === 'same_price') {
                                                                setDiscountSubType('percentage')
                                                            }
                                                        }}
                                                    >
                                                        <div className="flex flex-col space-y-3 mb-4">
                                                            <div className="flex items-center space-x-2">
                                                                <RadioGroupItem value="discount" id="discount-percentage" />
                                                                <Label htmlFor="discount-percentage" className="cursor-pointer font-normal">
                                                                    Giảm giá
                                                                </Label>
                                                            </div>
                                                            <div className="flex items-center space-x-2">
                                                                <RadioGroupItem value="same_price" id="discount-same-price" />
                                                                <Label htmlFor="discount-same-price" className="cursor-pointer font-normal">
                                                                    Đồng giá
                                                                </Label>
                                                            </div>
                                                        </div>
                                                    </RadioGroup>

                                                    <div className="flex items-center gap-2">
                                                        {discountMainType === 'discount' && (
                                                            <>
                                                                <Button
                                                                    type="button"
                                                                    variant={discountSubType === 'fixed_amount' ? 'default' : 'outline'}
                                                                    className={discountSubType === 'fixed_amount' ? 'bg-blue-500 hover:bg-blue-600' : ''}
                                                                    onClick={() => setDiscountSubType('fixed_amount')}
                                                                >
                                                                    Số tiền
                                                                </Button>
                                                                <Button
                                                                    type="button"
                                                                    variant={discountSubType === 'percentage' ? 'default' : 'outline'}
                                                                    className={discountSubType === 'percentage' ? 'bg-blue-500 hover:bg-blue-600' : ''}
                                                                    onClick={() => setDiscountSubType('percentage')}
                                                                >
                                                                    %
                                                                </Button>
                                                            </>
                                                        )}
                                                        {discountType === 'fixed_amount' ? (
                                                            <div className="flex items-center gap-2 flex-1">
                                                                <PriceInput
                                                                    id="discount_value"
                                                                    value={discountValue}
                                                                    onValueChange={(value) => setDiscountValue(value || 0)}
                                                                    className="flex-1"
                                                                    placeholder="0"
                                                                    min={0}
                                                                />
                                                                <span className="text-sm font-medium">₫</span>
                                                            </div>
                                                        ) : discountType === 'percentage' ? (
                                                            <div className="flex items-center gap-2">
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
                                                                    className="w-24"
                                                                    required
                                                                />
                                                                <span className="text-sm font-medium">%</span>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center gap-2 flex-1">
                                                                <PriceInput
                                                                    id="discount_value"
                                                                    value={discountValue}
                                                                    onValueChange={(value) => setDiscountValue(value || 0)}
                                                                    className="flex-1"
                                                                    placeholder="0"
                                                                    min={0}
                                                                />
                                                                <span className="text-sm font-medium">₫</span>
                                                            </div>
                                                        )}
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

                                        {/* Áp dụng cho */}
                                        <CustomCard isShowHeader={true} title="Áp dụng cho">
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

                                        {/* Kết hợp khuyến mại */}
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
                                            promotionType="product_discount"
                                            startDate={startDate || (isEdit && promotion?.start_date ? (() => {
                                                const dateStr = promotion.start_date
                                                if (dateStr.includes('T')) {
                                                    const [datePart, timePart] = dateStr.split('T')
                                                    const [year, month, day] = datePart.split('-').map(Number)
                                                    const [hours, minutes] = timePart ? timePart.split(':').map(Number) : [0, 0]
                                                    return new Date(year, month - 1, day, hours, minutes)
                                                }
                                                return new Date(dateStr)
                                            })() : undefined)}
                                            endDate={endDate || (isEdit && promotion?.end_date && !noEndDate ? (() => {
                                                const dateStr = promotion.end_date!
                                                if (dateStr.includes('T')) {
                                                    const [datePart, timePart] = dateStr.split('T')
                                                    const [year, month, day] = datePart.split('-').map(Number)
                                                    const [hours, minutes] = timePart ? timePart.split(':').map(Number) : [23, 59]
                                                    return new Date(year, month - 1, day, hours, minutes)
                                                }
                                                return new Date(dateStr)
                                            })() : undefined)}
                                            noEndDate={noEndDate || (isEdit && promotion?.no_end_date)}
                                            formatDate={formatDate}
                                            items={[
                                                { label: 'Loại khuyến mại', value: <strong>Giảm giá sản phẩm</strong> },
                                                ...(discountValue > 0 || (isEdit && promotion?.discount_value) ? [{
                                                    label: 'Giá trị',
                                                    value: (
                                                        <>
                                                            {getDiscountText()}
                                                            {discountType === 'percentage' && maxDiscountValue > 0 && (
                                                                <span> (Tối đa {formatPrice(maxDiscountValue)}₫)</span>
                                                            )}
                                                        </>
                                                    )
                                                }] : []),
                                                {
                                                    label: 'Áp dụng cho',
                                                    value: applySource === 'all'
                                                        ? 'Áp dụng cho tất cả sản phẩm'
                                                        : applySource === 'product_variant'
                                                            ? `${selectedProducts.length} sản phẩm đã chọn`
                                                            : `${selectedCatalogues.length} danh mục đã chọn`
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

            {/* Product Selection Modal */}
            <ProductSelectionModal
                open={showProductModal}
                onOpenChange={setShowProductModal}
                onConfirm={handleProductsSelected}
                initialSelectedIds={selectedProducts.map(p => p.id)}
                initialSelectedProducts={selectedProducts}
            />

            {/* Category Selection Modal */}
            <CategorySelectionModal
                open={showCategoryModal}
                onOpenChange={setShowCategoryModal}
                onConfirm={handleCataloguesSelected}
                initialSelectedIds={selectedCatalogues.map(c => c.id)}
            />
        </AppLayout>
    )
}
