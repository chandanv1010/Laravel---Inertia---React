import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import AppLayout from '@/layouts/app-layout'
import { dashboard } from '@/routes'
import { type BreadcrumbItem } from '@/types'
import { Head, Link, router } from '@inertiajs/react'
import CustomPageHeading from '@/components/custom-page-heading'
import CustomCard from '@/components/custom-card'
import { Button } from "@/components/ui/button"
import { LoaderCircle } from 'lucide-react'
import { InventoryInfo } from '../product/components/inventory-info'
import { ProductBasicInfo } from '../product/components/product-basic-info'
import CustomAlbum from '@/components/custom-album'
import CustomFeaturedImage from '@/components/custom-featured-image'
import { WarehouseStock } from '../product/components/warehouse-stock-manager'
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { PriceInput } from "@/components/price-input"
import { Info } from "lucide-react"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"

interface Product {
    id: number
    name?: string
    image?: string
    variants?: Array<{ id: number }>
    management_type?: 'basic' | 'imei' | 'batch'
    track_inventory?: boolean
    allow_negative_stock?: boolean
    low_stock_alert?: number
    expired_warning_days?: number
}

interface ProductVariant {
    id: number
    product_id: number
    sku: string
    barcode?: string
    retail_price?: number
    wholesale_price?: number
    cost_price?: number
    compare_price?: number
    stock_quantity: number
    image?: string
    album?: string[]
    attributes?: Array<{ id: number; value: string }>
    warehouse_stocks?: Array<{
        warehouse_id: number
        stock_quantity: number
        storage_location?: string
    }>
    track_inventory?: boolean
    allow_negative_stock?: boolean
    low_stock_alert?: number
    management_type?: 'basic' | 'imei' | 'batch'
    expired_warning_days?: number
}

interface VariantDetailProps {
    product: Product
    variant: ProductVariant
    warehouses?: Array<{ value: string | number; label: string }>
    tax?: {
        enabled: boolean
        price_includes_tax: boolean
        default_tax_on_sale: boolean
        default_tax_on_purchase: boolean
        sale_tax_rate: number
        purchase_tax_rate: number
    }
}

export default function VariantDetail({ product, variant, warehouses = [], tax }: VariantDetailProps) {
    const [images, setImages] = useState<string[]>(variant.album || [])
    const [featuredImage, setFeaturedImage] = useState<string>(variant.image || '')
    const [sku] = useState<string>(variant.sku || '')
    const [barcode] = useState<string>(variant.barcode || '')
    const [retailPrice, setRetailPrice] = useState<number>(variant.retail_price || 0)
    const [wholesalePrice] = useState<number>(variant.wholesale_price || 0)
    const [costPrice, setCostPrice] = useState<number>(variant.cost_price || 0)
    const [comparePrice, setComparePrice] = useState<number>(variant.compare_price || 0)
    // Variant có track_inventory và management_type riêng, fallback về product nếu không có
    // Mặc định track_inventory = true và management_type = 'batch' cho variant
    const [trackInventory, setTrackInventory] = useState<boolean>(
        variant.track_inventory ?? product.track_inventory ?? true
    )
    const [allowNegativeStock, setAllowNegativeStock] = useState<boolean>(
        variant.allow_negative_stock ?? product.allow_negative_stock ?? false
    )
    const [lowStockAlert, setLowStockAlert] = useState<number>(
        variant.low_stock_alert ?? product.low_stock_alert ?? 0
    )
    // Mặc định management_type = 'batch' cho variant nếu chưa có
    const [managementType, setManagementType] = useState<'basic' | 'imei' | 'batch'>(
        variant.management_type ?? product.management_type ?? 'batch'
    )
    const [expiredWarningDays, setExpiredWarningDays] = useState<number>(
        variant.expired_warning_days ?? product.expired_warning_days ?? 1
    )

    // Initialize warehouse stocks from variant prop - use function initializer to avoid recalculation
    // Ưu tiên kho mặc định (code = 'MAIN' hoặc tên chứa 'Hàng Chính') để tránh UI nhảy
    const [warehouseStocks, setWarehouseStocks] = useState<WarehouseStock[]>(() => {
        if (variant.warehouse_stocks && variant.warehouse_stocks.length > 0) {
            // Sort warehouse_stocks để kho mặc định đứng đầu
            const sorted = [...variant.warehouse_stocks].sort((a, b) => {
                const aWarehouse = warehouses.find(w => String(w.value) === String(a.warehouse_id))
                const bWarehouse = warehouses.find(w => String(w.value) === String(b.warehouse_id))
                const aIsMain = aWarehouse?.label?.toLowerCase().includes('hàng chính') || aWarehouse?.label?.toLowerCase().includes('main')
                const bIsMain = bWarehouse?.label?.toLowerCase().includes('hàng chính') || bWarehouse?.label?.toLowerCase().includes('main')
                if (aIsMain && !bIsMain) return -1
                if (!aIsMain && bIsMain) return 1
                return 0
            })
            return sorted
        }
        // Tìm kho mặc định (có tên chứa 'Hàng Chính' hoặc 'Main')
        const defaultWarehouse = warehouses.find(w =>
            w.label?.toLowerCase().includes('hàng chính') ||
            w.label?.toLowerCase().includes('main')
        ) || warehouses[0]
        if (defaultWarehouse?.value) {
            return [{
                warehouse_id: defaultWarehouse.value,
                stock_quantity: variant.stock_quantity || 0,
                storage_location: undefined
            }]
        }
        return []
    })


    // Memoize breadcrumbs to prevent re-creation on every render
    const breadcrumbs = useMemo<BreadcrumbItem[]>(() => [
        { title: 'Dashboard', href: dashboard().url },
        { title: 'Sản phẩm', href: '/backend/product' },
        { title: product.name || 'Sản phẩm', href: `/backend/product/${product.id}/edit` },
        { title: variant.sku || 'Phiên bản', href: '#' }
    ], [product.name, product.id, variant.sku])

    // Memoize variantName to prevent recalculation
    const variantName = useMemo(() => {
        return variant.attributes?.map(attr => attr.value).join(' - ') || variant.sku
    }, [variant.attributes, variant.sku])

    // Stable handler for warehouse stocks change - use useCallback with empty deps
    const handleWarehouseStocksChange = useCallback((stocks: WarehouseStock[]) => {
        setWarehouseStocks(stocks)
    }, [])

    // Sync warehouseStocks when variant prop changes - use ref to prevent infinite loop
    // Compare serialized data to detect actual changes from backend
    const prevVariantWarehouseStocksRef = useRef<string>('')
    useEffect(() => {
        const currentPropStr = JSON.stringify(variant.warehouse_stocks || [])

        // Only sync if the prop actually changed (from backend update)
        if (currentPropStr !== prevVariantWarehouseStocksRef.current) {
            if (variant.warehouse_stocks && variant.warehouse_stocks.length > 0) {
                // Sort warehouse_stocks để kho mặc định đứng đầu
                const sorted = [...variant.warehouse_stocks].sort((a, b) => {
                    const aWarehouse = warehouses.find(w => String(w.value) === String(a.warehouse_id))
                    const bWarehouse = warehouses.find(w => String(w.value) === String(b.warehouse_id))
                    const aIsMain = aWarehouse?.label?.toLowerCase().includes('hàng chính') || aWarehouse?.label?.toLowerCase().includes('main')
                    const bIsMain = bWarehouse?.label?.toLowerCase().includes('hàng chính') || bWarehouse?.label?.toLowerCase().includes('main')
                    if (aIsMain && !bIsMain) return -1
                    if (!aIsMain && bIsMain) return 1
                    return 0
                })
                setWarehouseStocks(sorted)
            } else {
                // Fallback to default warehouse if no stocks
                const defaultWarehouse = warehouses.find(w =>
                    w.label?.toLowerCase().includes('hàng chính') ||
                    w.label?.toLowerCase().includes('main')
                ) || warehouses[0]
                if (defaultWarehouse?.value) {
                    setWarehouseStocks([{
                        warehouse_id: defaultWarehouse.value,
                        stock_quantity: variant.stock_quantity || 0,
                        storage_location: undefined
                    }])
                } else {
                    setWarehouseStocks([])
                }
            }
            prevVariantWarehouseStocksRef.current = currentPropStr
        }
    }, [variant.warehouse_stocks, variant.stock_quantity, warehouses])

    // Calculate variant count from product - use useMemo to avoid recalculation
    const variantCount = useMemo(() => product.variants?.length || 0, [product.variants])

    // Calculate total stock from warehouse_stocks - use useMemo to avoid recalculation
    // Fallback to variant.stock_quantity if warehouseStocks is empty
    const totalStock = useMemo(() => {
        if (warehouseStocks && warehouseStocks.length > 0) {
            return warehouseStocks.reduce((sum, stock) => sum + (stock.stock_quantity || 0), 0)
        }
        // Fallback to variant.stock_quantity if no warehouse stocks
        return variant.stock_quantity || 0
    }, [warehouseStocks, variant.stock_quantity])

    const availableStock = totalStock // For now, available = total

    // Render tooltip helper
    const renderTooltip = useCallback((text: string) => {
        if (!text) return null
        return (
            <TooltipProvider>
                <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground cursor-help inline-block ml-1" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs bg-slate-900 text-white border-slate-900">
                        <p>{text}</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        )
    }, [])

    // Processing state for form submission
    const [processing, setProcessing] = useState(false)

    // Form submit handler using router.post with _method: 'put'
    const handleSubmit = useCallback((e: React.FormEvent) => {
                                e.preventDefault()
                                setProcessing(true)

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const formData: Record<string, any> = {
            _method: 'put',
            product_id: product.id,
                                    sku,
                                    barcode,
                                    retail_price: retailPrice,
                                    wholesale_price: wholesalePrice,
                                    cost_price: costPrice,
                                    compare_price: comparePrice,
                                    image: featuredImage,
                                    album: images,
                                    warehouse_stocks: warehouseStocks,
                                    track_inventory: trackInventory ? 1 : 0,
                                    allow_negative_stock: allowNegativeStock ? 1 : 0,
                                    low_stock_alert: lowStockAlert,
                                    management_type: managementType,
                                    expired_warning_days: expiredWarningDays,
        }

        router.post(`/backend/product_variant/${variant.id}`, formData, {
            preserveScroll: true,
                                    onFinish: () => setProcessing(false),
        })
    }, [variant.id, product.id, sku, barcode, retailPrice, wholesalePrice, costPrice, comparePrice, 
        featuredImage, images, warehouseStocks, trackInventory, allowNegativeStock, 
        lowStockAlert, managementType, expiredWarningDays])

    return (
        <AppLayout>
            <Head title={`Quản lý phiên bản: ${variantName}`} />
            <CustomPageHeading
                breadcrumbs={breadcrumbs}
                heading={variantName || 'Phiên bản sản phẩm'}
            />

            <div className="page-container">
                <div className="max-w-[1280px] ml-auto mr-auto">
                    <form onSubmit={handleSubmit}>
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {/* Left column - Sidebar */}
                                <div className="space-y-6">
                                    {/* Block 1: Product Information */}
                                    <CustomCard isShowHeader={false}>
                                        <div className="flex items-start gap-3">
                                            <div className="w-16 h-16 flex-shrink-0 rounded border border-gray-200 overflow-hidden bg-gray-50">
                                                {product.image ? (
                                                    <img
                                                        src={product.image}
                                                        alt={product.name || 'Product'}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                                                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                        </svg>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-semibold text-sm mb-1 truncate">{product.name || 'N/A'}</h3>
                                                <p className="text-xs text-muted-foreground mb-2">
                                                    {variantCount} phiên bản
                                                </p>
                                                <Link
                                                    href={`/backend/product/${product.id}/edit`}
                                                    className="text-xs text-blue-600 hover:underline"
                                                >
                                                    Trở lại sản phẩm
                                                </Link>
                                            </div>
                                        </div>
                                    </CustomCard>

                                    {/* Block 2: Variant Information */}
                                    <CustomCard isShowHeader={true} title="Phiên bản">
                                        <div className="space-y-3">
                                            <div className="flex items-start gap-3">
                                                <div className="w-16 h-16 flex-shrink-0 rounded border border-gray-200 overflow-hidden bg-gray-50">
                                                    {variant.image ? (
                                                        <img
                                                            src={variant.image}
                                                            alt={variantName}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                                                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                            </svg>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0 space-y-2">
                                                    <h4 className="font-semibold text-sm">{variantName}</h4>
                                                    <div className="text-xs text-muted-foreground">
                                                        <div className="flex items-center gap-4">
                                                            <div>
                                                                <span>Tồn kho: </span>
                                                                <span className="font-medium text-gray-900">{totalStock}</span>
                                                            </div>
                                                            <div>
                                                                <span>Có thể bán: </span>
                                                                <span className="font-medium text-gray-900">{availableStock}</span>
                                                            </div>
                                                        </div>
                                                        {managementType === 'batch' && (
                                                            <div className="mt-1">
                                                                <span>Quản lý: </span>
                                                                <span className="font-medium text-gray-900">Lô - HSD</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            {/* Variant Image Editor */}
                                            <div className="border-t pt-3">
                                                <CustomFeaturedImage
                                                    data={featuredImage}
                                                    onDataChange={setFeaturedImage}
                                                />
                                            </div>
                                        </div>
                                    </CustomCard>
                                </div>

                                {/* Right column - Main content */}
                                <div className="lg:col-span-2 space-y-6">
                                    {/* Album Images - First */}
                                    <CustomAlbum
                                        data={images}
                                        onDataChange={setImages}
                                    />

                                    {/* Product Info */}
                                    <CustomCard isShowHeader={true} title="Thông tin cơ bản">
                                        <ProductBasicInfo
                                            sku={sku}
                                            barcode={barcode}
                                            errors={{}}
                                        />
                                    </CustomCard>

                                    {/* Pricing */}
                                    <CustomCard isShowHeader={true} title="Thông tin giá">
                                        <div className="space-y-4">
                                            {/* Row 1: Giá bán (left) and Giá so sánh (right) */}
                                            <div className="flex space-x-4">
                                                <div className="w-1/2">
                                                    <div className="flex items-center mb-2">
                                                        <Label htmlFor="retail_price">Giá bán</Label>
                                                    </div>
                                                    <PriceInput
                                                        id="retail_price"
                                                        name="retail_price"
                                                        value={retailPrice}
                                                        onValueChange={(v) => setRetailPrice(v ?? 0)}
                                                        placeholder="Nhập giá bán"
                                                    />
                                                </div>
                                                <div className="w-1/2">
                                                    <div className="flex items-center mb-2">
                                                        <Label htmlFor="compare_price">Giá so sánh</Label>
                                                        {renderTooltip("Giá so sánh để hiển thị giá gốc khi có khuyến mãi")}
                                                    </div>
                                                    <PriceInput
                                                        id="compare_price"
                                                        name="compare_price"
                                                        value={comparePrice}
                                                        onValueChange={(v) => setComparePrice(v ?? 0)}
                                                        placeholder="Nhập giá so sánh sản phẩm"
                                                    />
                                                </div>
                                            </div>

                                            {/* Row 2: Giá vốn (left) */}
                                            <div className="w-1/2">
                                                <div className="flex items-center mb-2">
                                                    <Label htmlFor="cost_price">Giá vốn</Label>
                                                    {renderTooltip("Giá nhập hàng")}
                                                </div>
                                                <PriceInput
                                                    id="cost_price"
                                                    name="cost_price"
                                                    value={costPrice}
                                                    onValueChange={(v) => setCostPrice(v ?? 0)}
                                                    placeholder="Nhập giá vốn"
                                                />
                                            </div>

                                            {/* Áp dụng thuế */}
                                            <div className="border-t pt-4">
                                                <div className="flex items-center space-x-2">
                                                    <Checkbox
                                                        id="apply_tax"
                                                        checked={tax?.price_includes_tax || false}
                                                        onCheckedChange={() => {
                                                            // Tax is managed at product level, so this is just for display
                                                        }}
                                                        disabled
                                                    />
                                                    <Label htmlFor="apply_tax" className="font-normal cursor-pointer">
                                                        Áp dụng thuế
                                                    </Label>
                                                </div>
                                            </div>
                                        </div>
                                    </CustomCard>

                                    {/* Inventory - Always show, like product page */}
                                    <CustomCard isShowHeader={true} title="Thông tin kho">
                                        <InventoryInfo
                                            trackInventory={trackInventory}
                                            trackInventorySaved={product.track_inventory}
                                            allowNegativeStock={allowNegativeStock}
                                            onTrackInventoryChange={setTrackInventory}
                                            onAllowNegativeStockChange={setAllowNegativeStock}
                                            lowStockAlert={lowStockAlert}
                                            onLowStockAlertChange={setLowStockAlert}
                                            warehouses={warehouses}
                                            warehouseStocks={warehouseStocks}
                                            onWarehouseStocksChange={handleWarehouseStocksChange}
                                            productId={variant.id}
                                            isEdit={true}
                                            managementType={managementType}
                                            onManagementTypeChange={setManagementType}
                                            isVariant={true}
                                            productIdForBatches={variant.id}
                                            expiredWarningDays={expiredWarningDays}
                                            onExpiredWarningDaysChange={setExpiredWarningDays}
                                        />
                                    </CustomCard>
                                </div>
                            </div>

                            <div className="mt-6 flex justify-end gap-2">
                                <Link href={`/backend/product/${product.id}/edit`}>
                                    <Button type="button" variant="outline">
                                        Hủy
                                    </Button>
                                </Link>
                                <Button type="submit" disabled={processing}>
                                    {processing && <LoaderCircle className="h-4 w-4 animate-spin mr-2" />}
                                    Lưu lại
                                </Button>
                            </div>
                    </form>
                    </div>
                </div>
            </AppLayout>
    )
}
