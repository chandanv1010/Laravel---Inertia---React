import { useState, useEffect } from 'react'
import AppLayout from '@/layouts/app-layout'
import { Head, Form, router } from '@inertiajs/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import CustomPageHeading from '@/components/custom-page-heading'
import CustomCard from '@/components/custom-card'
import InputError from '@/components/input-error'
import { type BreadcrumbItem } from '@/types'
import { LoaderCircle, ArrowLeft, Package, X, Plus } from 'lucide-react'
import { setPreserveState } from '@/lib/helper'
import { PriceInput } from '@/components/price-input'
import { format } from 'date-fns'
import { ProductSelectionModal } from './components/product-selection-modal'
import { PromotionNameInput } from './components/promotion-name-input'
import { CustomerGroupSelector } from './components/customer-group-selector'
import { StoreSelector } from './components/store-selector'
import { CombinePromotionSelector } from './components/combine-promotion-selector'
import { TimeSelector } from './components/time-selector'
import { PromotionOverview } from './components/promotion-overview'

interface ComboItem {
    id?: number
    product_id?: number
    product_variant_id?: number
    quantity: number
    product?: { id: number; name: string; sku?: string; image?: string }
    variant?: { id: number; name: string; sku: string; image?: string }
}

interface ComboPromotion {
    id?: number
    name: string
    combo_price: number
    combo_items?: ComboItem[]
    customer_group_type: 'all' | 'selected'
    customer_group_ids?: number[]
    store_type: 'all' | 'selected'
    store_ids?: number[]
    combine_with_order_discount?: boolean
    combine_with_product_discount?: boolean
    combine_with_free_shipping?: boolean
    start_date: string
    end_date?: string
    no_end_date: boolean
    publish: string
}

interface Product {
    id: number;
    name: string;
    sku: string;
    image?: string | null;
    album?: string[];
    retail_price?: number;
    wholesale_price?: number;
    price?: number;
    variants?: Array<{
        id: number;
        name?: string;
        sku: string;
        price?: number;
        retail_price?: number;
        wholesale_price?: number;
        attributes?: Record<string, string>;
        image?: string;
    }>;
}

interface ComboProps {
    promotion?: ComboPromotion
    customerGroups?: Array<{ value: string | number; label: string }>
    stores?: Array<{ value: string | number; label: string }>
    // Preloaded data from controller
    initialProducts?: Product[]
    productCatalogues?: Array<{ id: number; name: string; level?: number }>
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Quản lý Marketing', href: '/backend/promotion' },
    { title: 'Quản lý Khuyến Mãi', href: '/backend/promotion/promotion' },
    { title: 'Thêm mới chương trình Combo', href: '/' },
]

export default function Combo({
    promotion,
    customerGroups = [],
    stores = [],
    initialProducts = [],
    productCatalogues = []
}: ComboProps) {
    const isEdit = !!promotion

    const [comboPrice, setComboPrice] = useState<number>(promotion?.combo_price || 0)
    const [comboItems, setComboItems] = useState<ComboItem[]>(promotion?.combo_items || [])
    const [showProductModal, setShowProductModal] = useState(false)
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
    const [promotionName, setPromotionName] = useState(promotion?.name || '')

    // Sync comboItems khi promotion thay đổi (khi edit)
    useEffect(() => {
        if (promotion?.combo_items && Array.isArray(promotion.combo_items)) {
            setComboItems(promotion.combo_items)
        }
    }, [promotion?.combo_items])

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

    const handleProductsSelected = (products: Array<{ id: number; name: string; sku: string; image?: string; productId?: number; productName?: string }>) => {
        // Thêm các sản phẩm đã chọn vào combo items
        const newItems: ComboItem[] = products.map(p => {
            // Kiểm tra xem có phải variant không (có productId và id !== productId)
            const isVariant = p.productId && p.id !== p.productId

            return {
                product_id: isVariant ? p.productId : p.id,
                product_variant_id: isVariant ? p.id : undefined,
                quantity: 1,
                product: isVariant ? { id: p.productId!, name: p.productName || p.name } : { id: p.id, name: p.name, sku: p.sku, image: p.image },
                variant: isVariant ? { id: p.id, name: p.name, sku: p.sku, image: p.image } : undefined,
            }
        })

        setComboItems(prev => [...prev, ...newItems])
        setShowProductModal(false)
    }

    const removeComboItem = (index: number) => {
        setComboItems(prev => prev.filter((_, i) => i !== index))
    }

    const updateComboItemQuantity = (index: number, quantity: number) => {
        setComboItems(prev => prev.map((item, i) =>
            i === index ? { ...item, quantity: Math.max(1, quantity) } : item
        ))
    }

    const getComboItemsText = (): string => {
        if (comboItems.length === 0) {
            return 'Chưa chọn sản phẩm'
        }
        return `${comboItems.length} sản phẩm trong combo`
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

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={isEdit ? 'Cập nhật chương trình Combo' : 'Thêm mới chương trình Combo'} />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl page-wrapper">
                <CustomPageHeading
                    heading={isEdit ? 'Cập nhật chương trình Combo' : 'Thêm mới chương trình Combo'}
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
                            // Format combo_items để gửi lên server
                            const formattedComboItems = comboItems.map(item => ({
                                product_id: item.product_id,
                                product_variant_id: item.product_variant_id,
                                quantity: item.quantity,
                            }))

                            return {
                                ...data,
                                type: 'combo',
                                ...(isEdit ? { _method: 'put' } : {}),
                                combo_price: comboPrice,
                                combo_items: formattedComboItems,
                                customer_group_ids: customerGroupType === 'selected' ? selectedCustomerGroups : [],
                                store_ids: storeType === 'selected' ? selectedStores : [],
                                no_end_date: noEndDate,
                                combine_with_order_discount: combineOrderDiscount,
                                combine_with_product_discount: combineProductDiscount,
                                combine_with_free_shipping: combineFreeShipping,
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
                                            placeholder="VD: Combo điện thoại + tai nghe"
                                            error={errors.name}
                                            onChange={setPromotionName}
                                        />

                                        {/* Giá combo */}
                                        <CustomCard isShowHeader={true} title="Giá combo">
                                            <div className="space-y-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="combo_price">
                                                        Giá combo cố định (₫) <span className="text-red-500">*</span>
                                                    </Label>
                                                    <div className="flex items-center gap-2">
                                                        <PriceInput
                                                            id="combo_price"
                                                            value={comboPrice}
                                                            onValueChange={(value) => setComboPrice(value || 0)}
                                                            className="flex-1"
                                                            placeholder="0"
                                                            min={0}
                                                            autoComplete="off"
                                                        />
                                                        <span className="text-sm font-medium">₫</span>
                                                    </div>
                                                    <InputError message={errors.combo_price} className="mt-1" />
                                                    <input type="hidden" name="combo_price" value={comboPrice} />
                                                </div>
                                            </div>
                                        </CustomCard>

                                        {/* Sản phẩm trong combo */}
                                        <CustomCard isShowHeader={true} title="Sản phẩm trong combo">
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        onClick={() => setShowProductModal(true)}
                                                    >
                                                        <Plus className="w-4 h-4 mr-2" />
                                                        Thêm sản phẩm
                                                    </Button>
                                                </div>

                                                {comboItems.length > 0 && (
                                                    <div className="space-y-2 mt-4">
                                                        {comboItems.map((item, index) => (
                                                            <div key={index} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                                                                <div className="flex items-center gap-3 flex-1">
                                                                    <div className="h-12 w-12 bg-gray-100 rounded flex-shrink-0 overflow-hidden">
                                                                        {item.variant?.image || item.product?.image ? (
                                                                            <img
                                                                                src={item.variant?.image || item.product?.image}
                                                                                alt={item.variant?.name || item.product?.name}
                                                                                className="h-full w-full object-cover"
                                                                            />
                                                                        ) : (
                                                                            <div className="h-full w-full flex items-center justify-center text-gray-400">
                                                                                <Package className="h-6 w-6" />
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    <div className="flex-1">
                                                                        <div className="font-medium text-sm">
                                                                            {item.variant?.name || item.product?.name}
                                                                        </div>
                                                                        {item.variant && (
                                                                            <div className="text-xs text-muted-foreground">
                                                                                {item.product?.name}
                                                                            </div>
                                                                        )}
                                                                        <div className="text-xs text-muted-foreground">
                                                                            SKU: {item.variant?.sku || item.product?.sku || 'N/A'}
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        <Label className="text-sm">Số lượng:</Label>
                                                                        <Input
                                                                            type="number"
                                                                            min="1"
                                                                            value={item.quantity}
                                                                            onChange={(e) => updateComboItemQuantity(index, parseInt(e.target.value) || 1)}
                                                                            className="w-20"
                                                                        />
                                                                    </div>
                                                                </div>
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8 text-muted-foreground hover:text-red-500"
                                                                    onClick={() => removeComboItem(index)}
                                                                >
                                                                    <X className="h-4 w-4" />
                                                                </Button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                {comboItems.length === 0 && (
                                                    <div className="text-center py-8 text-muted-foreground">
                                                        Chưa có sản phẩm nào trong combo. Nhấn "Thêm sản phẩm" để bắt đầu.
                                                    </div>
                                                )}
                                            </div>
                                        </CustomCard>

                                        {/* Nhóm khách hàng */}
                                        <CustomerGroupSelector
                                            value={customerGroupType}
                                            selectedIds={selectedCustomerGroups}
                                            options={customerGroups}
                                            onChange={(type, ids) => {
                                                setCustomerGroupType(type)
                                                setSelectedCustomerGroups(ids)
                                            }}
                                        />

                                        {/* Chi nhánh */}
                                        <StoreSelector
                                            value={storeType}
                                            selectedIds={selectedStores}
                                            options={stores}
                                            onChange={(type, ids) => {
                                                setStoreType(type)
                                                setSelectedStores(ids)
                                            }}
                                        />

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

                                    {/* Phần bên phải - Sidebar */}
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
                                            promotionType="combo"
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
                                                { label: 'Loại khuyến mại', value: <strong>Combo</strong> },
                                                {
                                                    label: 'Giá combo',
                                                    value: comboPrice > 0 ? `${formatPrice(comboPrice)}₫` : 'Chưa nhập'
                                                },
                                                {
                                                    label: 'Sản phẩm trong combo',
                                                    value: getComboItemsText()
                                                },
                                                {
                                                    label: 'Kết hợp',
                                                    value: getCombineText().includes('Không kết hợp')
                                                        ? 'Không kết hợp với giảm giá khác'
                                                        : `Kết hợp với: ${getCombineText().join(', ')}`
                                                },
                                            ]}
                                        />

                                        {/* StatusSelector removed - default publish='2' */}
                                        <input type="hidden" name="publish" value="2" />
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
                initialSelectedIds={[]}
                preloadedProducts={initialProducts}
                preloadedCatalogues={productCatalogues}
            />
        </AppLayout>
    )
}

