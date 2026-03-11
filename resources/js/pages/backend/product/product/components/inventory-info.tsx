import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useCallback, useRef, useState, useEffect } from "react"
import { WarehouseStock, WarehouseStockManager } from "./warehouse-stock-manager"
import { BatchAddModal } from "./batch-add-modal"
import { BatchListModal } from "./batch-list-modal"
import { toast } from "sonner"
import { Pencil } from "lucide-react"
import { StorageLocationModal } from "@/components/storage-location-modal"
import { NumberInput } from "@/components/number-input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertTriangle } from "lucide-react"
import { BatchStockManager } from "./batch-stock-manager"


interface InventoryInfoProps {
    trackInventory?: boolean
    trackInventorySaved?: boolean
    allowNegativeStock?: boolean
    onTrackInventoryChange?: (val: boolean) => void
    onAllowNegativeStockChange?: (val: boolean) => void
    batchTracking?: boolean
    lowStockAlert?: number
    onLowStockAlertChange?: (val: number) => void
    warehouses?: Array<{ value: string | number, label: string }>
    warehouseStocks?: WarehouseStock[]
    onWarehouseStocksChange?: (stocks: WarehouseStock[]) => void
    productId?: number
    isEdit?: boolean
    managementType?: 'basic' | 'imei' | 'batch'
    onManagementTypeChange?: (val: 'basic' | 'imei' | 'batch') => void
    isVariant?: boolean
    productIdForBatches?: number // For variants, this is the parent product ID
    expiredWarningDays?: number // Số ngày cảnh báo trước khi hết hạn
    onExpiredWarningDaysChange?: (val: number) => void
    onStockHistoryRefresh?: () => void // Callback to refresh stock history after stock adjustment
}

interface Batch {
    id: number
    code: string
    manufactured_at: string | null
    expired_at: string | null
    warehouse_id: number | null // Legacy - for backward compatibility
    warehouse_name: string | null
    stock_quantity: number // Total stock across all warehouses
    is_default: boolean
    created_at: string | null
    updated_at?: string | null
    warehouse_distribution?: Array<{
        warehouse_id: number
        warehouse_name: string
        stock_quantity: number
    }>
}

export function InventoryInfo({
    trackInventory = true,
    trackInventorySaved,
    allowNegativeStock = false,
    onTrackInventoryChange,
    onAllowNegativeStockChange,
    batchTracking = false,
    lowStockAlert = 0,
    onLowStockAlertChange,
    warehouses = [],
    warehouseStocks = [],
    onWarehouseStocksChange,
    productId,
    isEdit = false,
    managementType = 'basic',
    onManagementTypeChange,
    isVariant = false,
    productIdForBatches,
    expiredWarningDays = 1,
    onExpiredWarningDaysChange,
    onStockHistoryRefresh,
}: InventoryInfoProps) {
    const isBatchTracking = batchTracking || managementType === 'batch'
    const isLowStockAlert = (lowStockAlert ?? 0) > 0
    const [openAddBatchModal, setOpenAddBatchModal] = useState(false)
    const [openBatchListModal, setOpenBatchListModal] = useState(false)
    const [batchRefreshKey, setBatchRefreshKey] = useState(0)
    const [batches, setBatches] = useState<Batch[]>([])
    const [defaultWarehouseId, setDefaultWarehouseId] = useState<string | number>(
        warehouseStocks?.[0]?.warehouse_id || warehouses[0]?.value || ''
    )
    const [storageLocationModal, setStorageLocationModal] = useState<{
        open: boolean
        warehouseId: string | number
    }>({ open: false, warehouseId: "" })
    const [expiredWarningEnabled, setExpiredWarningEnabled] = useState(expiredWarningDays > 0)
    const [hasFetchedBatches, setHasFetchedBatches] = useState(false)

    // Capture initial batch tracking state to conditionally show warning
    const [wasInitiallyBatchTracking] = useState(isBatchTracking)

    // For variants, use variant id (productId) for batches. For products, use productId
    // productIdForBatches is not used anymore - we use productId directly for both cases
    const batchProductId = productId

    // Use ref to store callback to avoid dependency issues and infinite loops
    const callbackRef = useRef(onWarehouseStocksChange)

    // Update ref when callback changes, but don't recreate the handler
    if (onWarehouseStocksChange !== callbackRef.current) {
        callbackRef.current = onWarehouseStocksChange
    }

    // Stable onChange handler - never changes, uses ref internally
    const handleWarehouseStocksChange = useCallback((stocks: WarehouseStock[]) => {
        if (callbackRef.current) {
            callbackRef.current(stocks)
        }
    }, []) // Empty deps - handler never changes

    // Get cookie helper
    const getCookie = useCallback((name: string) => {
        if (typeof document === "undefined") return ""
        const cookie = document.cookie
            .split(";")
            .map((c) => c.trim())
            .find((c) => c.startsWith(name + "="))
        if (!cookie) return ""
        const raw = cookie.substring(name.length + 1)
        try {
            return decodeURIComponent(raw)
        } catch {
            return raw
        }
    }, [])

    // API fetch helper
    const apiFetch = useCallback(async (url: string, init: RequestInit = {}) => {
        const method = (init.method || "GET").toUpperCase()
        const metaToken =
            (typeof document !== "undefined" &&
                (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement | null)
                    ?.content) ||
            ""
        const cookieToken = metaToken ? "" : getCookie("XSRF-TOKEN")
        const csrfToken = metaToken || cookieToken
        const headers = new Headers(init.headers || {})
        headers.set("Accept", "application/json")
        headers.set("X-Requested-With", "XMLHttpRequest")
        if (method !== "GET" && method !== "HEAD" && csrfToken) {
            if (metaToken) {
                headers.set("X-CSRF-TOKEN", metaToken)
            } else if (cookieToken && !headers.has("X-XSRF-TOKEN")) {
                headers.set("X-XSRF-TOKEN", cookieToken)
            }
            if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json")
        }

        return fetch(url, {
            credentials: "same-origin",
            ...init,
            headers,
        })
    }, [getCookie])

    // Fetch batches - hỗ trợ cả product và variant
    const fetchBatches = useCallback(async () => {
        if (!batchProductId) return
        try {
            // Nếu là variant, dùng endpoint variant batches
            // Thêm timestamp để bypass cache
            const timestamp = Date.now()
            const url = isVariant
                ? `/backend/product-variant/${batchProductId}/batches?_t=${timestamp}`
                : `/backend/product/${batchProductId}/batches?_t=${timestamp}`
            const response = await apiFetch(url)
            if (response.ok) {
                const data = await response.json()
                setBatches(data.data || [])
                setHasFetchedBatches(true)
            }
        } catch (error) {
            console.error('Failed to fetch batches:', error)
        }
    }, [batchProductId, isVariant, apiFetch])

    // Handle ensure default batch - hỗ trợ cả product và variant
    const handleEnsureDefaultBatch = useCallback(async () => {
        if (!batchProductId) return

        // Calculate current stock to show in message
        const currentStock = warehouseStocks && warehouseStocks.length > 0
            ? warehouseStocks.reduce((sum, stock) => sum + (stock.stock_quantity || 0), 0)
            : 0

        try {
            // Nếu là variant, dùng endpoint variant batches
            const url = isVariant
                ? `/backend/product-variant/${batchProductId}/batches/ensure-default`
                : `/backend/product/${batchProductId}/batches/ensure-default`
            const response = await apiFetch(url, {
                method: 'POST',
            })

            if (response.ok) {
                if (currentStock > 0) {
                    toast.success(`Đã tạo lô mặc định thành công. Tồn kho hiện tại (${currentStock.toLocaleString('vi-VN')}) đã được chuyển vào lô mặc định.`)
                } else {
                    toast.success('Đã tạo lô mặc định thành công')
                }
                // Refresh batches list - force refresh với timestamp mới
                setBatchRefreshKey(prev => prev + 1)
                // Delay một chút để đảm bảo cache đã được clear
                setTimeout(async () => {
                    await fetchBatches()
                }, 100)
            } else {
                const error = await response.json()
                toast.error(error.message || 'Có lỗi xảy ra khi tạo lô mặc định')
            }
        } catch (error) {
            console.error('Failed to ensure default batch:', error)
            toast.error('Có lỗi xảy ra khi tạo lô mặc định')
        }
    }, [batchProductId, isVariant, apiFetch, fetchBatches, warehouseStocks])

    // Handle save batch - hỗ trợ cả product và variant
    const handleSaveBatch = useCallback(async (batchesData: Array<{
        code: string
        manufactured_at?: string | null
        expired_at?: string | null
        warehouse_id?: number | null
    }>) => {
        if (!batchProductId) return

        try {
            // Nếu là variant, dùng endpoint variant batches
            const url = isVariant
                ? `/backend/product-variant/${batchProductId}/batches`
                : `/backend/product/${batchProductId}/batches`
            const response = await apiFetch(url, {
                method: 'POST',
                body: JSON.stringify({
                    items: batchesData
                }),
            })

            if (response.ok) {
                toast.success(`Thêm ${batchesData.length} lô thành công`)
                // Refresh batches list
                await fetchBatches()
                setBatchRefreshKey(prev => prev + 1)
            } else {
                const error = await response.json()
                toast.error(error.message || 'Có lỗi xảy ra khi thêm lô')
                throw new Error(error.message || 'Failed to save batch')
            }
        } catch (error) {
            console.error('Failed to save batch:', error)
            throw error
        }
    }, [batchProductId, isVariant, apiFetch, fetchBatches])



    // Handle default warehouse change
    const handleDefaultWarehouseChange = useCallback((value: string) => {
        setDefaultWarehouseId(value)
        // Update warehouseStocks if needed
        if (warehouseStocks && warehouseStocks.length > 0) {
            const updated = [...warehouseStocks]
            if (!updated.find(s => String(s.warehouse_id) === value)) {
                updated.push({
                    warehouse_id: value,
                    stock_quantity: 0,
                    storage_location: undefined
                })
            }
            handleWarehouseStocksChange(updated)
        } else {
            handleWarehouseStocksChange([{
                warehouse_id: value,
                stock_quantity: 0,
                storage_location: undefined
            }])
        }
    }, [warehouseStocks, handleWarehouseStocksChange])

    // Get storage location for warehouse
    const getStorageLocation = useCallback((warehouseId: string | number) => {
        const stock = warehouseStocks?.find(s => String(s.warehouse_id) === String(warehouseId))
        return stock?.storage_location || ''
    }, [warehouseStocks])

    // Handle storage location change
    const handleStorageLocationConfirm = useCallback((warehouseId: string | number, location: string) => {
        const updated = [...(warehouseStocks || [])]
        const index = updated.findIndex(s => String(s.warehouse_id) === String(warehouseId))
        if (index >= 0) {
            updated[index] = {
                ...updated[index],
                storage_location: location || undefined
            }
        } else {
            updated.push({
                warehouse_id: warehouseId,
                stock_quantity: 0,
                storage_location: location || undefined
            })
        }
        handleWarehouseStocksChange(updated)
        setStorageLocationModal({ open: false, warehouseId: "" })
    }, [warehouseStocks, handleWarehouseStocksChange])

    // Handle stock quantity change
    const handleStockQuantityChange = useCallback((warehouseId: string | number, quantity: number) => {
        const updated = [...(warehouseStocks || [])]
        const index = updated.findIndex(s => String(s.warehouse_id) === String(warehouseId))
        if (index >= 0) {
            updated[index] = {
                ...updated[index],
                stock_quantity: quantity
            }
        } else {
            updated.push({
                warehouse_id: warehouseId,
                stock_quantity: quantity,
                storage_location: undefined
            })
        }
        handleWarehouseStocksChange(updated)
    }, [warehouseStocks, handleWarehouseStocksChange])

    // Fetch batches when batch tracking is enabled - hỗ trợ cả product và variant
    useEffect(() => {
        if (isBatchTracking && batchProductId) {
            fetchBatches()
        } else {
            setBatches([])
        }
    }, [isBatchTracking, batchProductId, fetchBatches])

    // Sync warehouse stocks from batches when batches change - hỗ trợ cả product và variant
    // Sử dụng warehouse_distribution thay vì warehouse_id trực tiếp (cấu trúc database mới)
    useEffect(() => {
        if (!isBatchTracking || !hasFetchedBatches) return

        const stockMap = new Map<string, number>()
        batches.forEach(b => {
            // New structure: Use warehouse_distribution if available
            if (b.warehouse_distribution && b.warehouse_distribution.length > 0) {
                b.warehouse_distribution.forEach(wd => {
                    const wid = String(wd.warehouse_id)
                    stockMap.set(wid, (stockMap.get(wid) || 0) + Number(wd.stock_quantity || 0))
                })
            } else if (b.warehouse_id) {
                // Legacy fallback: use warehouse_id directly
                const wid = String(b.warehouse_id)
                stockMap.set(wid, (stockMap.get(wid) || 0) + Number(b.stock_quantity || 0))
            }
        })

        const currentStocks = warehouseStocks || []
        let hasChanges = false

        // Clone to avoid mutation
        const nextStocks = currentStocks.map(s => ({ ...s }))
        const processedWids = new Set<string>()

        nextStocks.forEach(stock => {
            const wid = String(stock.warehouse_id)
            processedWids.add(wid)
            const newQty = stockMap.get(wid) || 0

            // Only update if quantity differs
            if (stock.stock_quantity !== newQty) {
                stock.stock_quantity = newQty
                hasChanges = true
            }
        })

        // Add stocks for warehouses that have batches but no entry in warehouseStocks yet
        stockMap.forEach((qty, wid) => {
            if (!processedWids.has(wid)) {
                nextStocks.push({
                    warehouse_id: wid,
                    stock_quantity: qty,
                    storage_location: undefined
                })
                hasChanges = true
            }
        })

        if (hasChanges) {
            handleWarehouseStocksChange(nextStocks)
        }

    }, [batches, isBatchTracking, isVariant, hasFetchedBatches, warehouseStocks, handleWarehouseStocksChange])

    // Sync defaultWarehouseId with warehouseStocks
    useEffect(() => {
        if (warehouseStocks && warehouseStocks.length > 0) {
            setDefaultWarehouseId(warehouseStocks[0].warehouse_id)
        } else if (warehouses.length > 0) {
            setDefaultWarehouseId(warehouses[0].value)
        }
    }, [warehouseStocks, warehouses])

    return (
        <div className="space-y-4">
            {/* Nút 1: Quản lý số lượng tồn kho - không nested */}
            <div className="flex items-center space-x-2">
                <Checkbox
                    id="track_inventory"
                    checked={!!trackInventory}
                    onCheckedChange={(checked) => {
                        const v = checked as boolean
                        onTrackInventoryChange?.(v)
                    }}
                    data-testid="inventory-track"
                />
                <Label htmlFor="track_inventory" className="font-normal cursor-pointer text-blue-600">
                    Quản lý số lượng tồn kho
                </Label>
            </div>

            {/* 1.1: Cho phép bán âm - chỉ hiện khi click vào "Quản lý số lượng tồn kho" */}
            {!!trackInventory && (
                <div className="flex items-center space-x-2">
                    <Checkbox
                        id="allow_negative_stock"
                        checked={!!allowNegativeStock}
                        onCheckedChange={(checked) => {
                            const v = checked as boolean
                            onAllowNegativeStockChange?.(v)
                        }}
                        data-testid="inventory-allow-negative"
                    />
                    <Label htmlFor="allow_negative_stock" className="font-normal cursor-pointer">
                        Cho phép bán âm
                    </Label>
                </div>
            )}

            {/* Đường phân cách */}
            <div className="border-t border-gray-200 my-2"></div>

            {/* Nút 2: Quản lý sản phẩm theo lô - HSD - không nested, ngang hàng với nút 1 */}
            <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="batch_tracking"
                            name="batch_tracking"
                            checked={isBatchTracking}
                            onCheckedChange={(checked) => {
                                const v = checked as boolean
                                onManagementTypeChange?.(v ? 'batch' : 'basic')
                            }}
                        />
                        <Label htmlFor="batch_tracking" className="font-normal cursor-pointer">
                            Quản lý sản phẩm theo lô - HSD
                        </Label>
                    </div>
                    {/* Thêm lô và Danh sách lô buttons - Only show in Edit mode */}
                    {isBatchTracking && batchProductId && isEdit && (
                        <div className="flex items-center gap-3">
                            {/* Chỉ hiển thị nút "Tạo lô default" khi chưa có lô default */}
                            {!batches.some(b => b.is_default === true) && (
                                <>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <button
                                                type="button"
                                                onClick={handleEnsureDefaultBatch}
                                                className="text-blue-600 hover:underline text-[13.5px] cursor-pointer"
                                            >
                                                Tạo lô default
                                            </button>
                                        </TooltipTrigger>
                                        <TooltipContent className="bg-black text-white max-w-xs">
                                            <p>
                                                Tạo lô mặc định cho {isVariant ? 'phiên bản' : 'sản phẩm'}.
                                                {(() => {
                                                    const currentStock = warehouseStocks && warehouseStocks.length > 0
                                                        ? warehouseStocks.reduce((sum, stock) => sum + (stock.stock_quantity || 0), 0)
                                                        : 0
                                                    return currentStock > 0
                                                        ? ` Tồn kho hiện tại (${currentStock.toLocaleString('vi-VN')}) sẽ được chuyển vào lô mặc định.`
                                                        : ''
                                                })()}
                                            </p>
                                        </TooltipContent>
                                    </Tooltip>

                                    <div className="h-4 w-[1px] bg-gray-300 mx-1"></div>
                                </>
                            )}

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button
                                        type="button"
                                        onClick={() => setOpenAddBatchModal(true)}
                                        className="text-blue-600 hover:underline text-[13.5px] cursor-pointer"
                                    >
                                        Thêm lô
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent className="bg-black text-white max-w-xs">
                                    <p>Tạo lô & tồn kho theo lô sau khi tạo sản phẩm thành công tại màn chi tiết sản phẩm hoặc tại màn tạo đơn nhập hàng</p>
                                </TooltipContent>
                            </Tooltip>

                            <div className="h-4 w-[1px] bg-gray-300 mx-1"></div>

                            <button
                                type="button"
                                onClick={() => setOpenBatchListModal(true)}
                                className="text-blue-600 hover:underline text-[13.5px] cursor-pointer"
                            >
                                Danh sách lô
                            </button>
                        </div>
                    )}
                </div>

                {/* Warning Alert when disabling batch tracking in Edit mode - ONLY if it was previously enabled */}
                {isEdit && !isBatchTracking && wasInitiallyBatchTracking && (
                    <Alert className="bg-orange-50 text-orange-900 border-orange-200">
                        <AlertTriangle className="h-4 w-4 text-orange-600" />
                        <AlertDescription>
                            Toàn bộ các lô hiện có của sản phẩm sẽ bị xóa khi tắt Quản lý sản phẩm theo lô - HSD. Tồn kho các lô sẽ đưa về tổng tồn kho của sản phẩm
                        </AlertDescription>
                    </Alert>
                )}
            </div>

            {/* 2.1: Cảnh báo trước khi sản phẩm hết hạn - chỉ hiện khi click vào "Quản lý sản phẩm theo lô" */}
            {isBatchTracking && (
                <div>
                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="expired_warning"
                            checked={expiredWarningEnabled}
                            onCheckedChange={(checked) => {
                                const v = checked as boolean
                                setExpiredWarningEnabled(v)
                                onExpiredWarningDaysChange?.(v ? (expiredWarningDays > 0 ? expiredWarningDays : 1) : 0)
                            }}
                        />
                        <Label htmlFor="expired_warning" className="font-normal cursor-pointer">
                            Cảnh báo trước khi sản phẩm hết hạn
                        </Label>
                    </div>

                    {/* 2.2: Input số ngày - chỉ hiện khi click vào "Cảnh báo trước khi sản phẩm hết hạn" */}
                    {expiredWarningEnabled && (
                        <>
                            <p className="text-sm text-muted-foreground pl-6 mt-1">
                                Khi bật tính năng này, bạn có thể tùy chỉnh thời điểm xuất hiện cảnh báo
                            </p>
                            <div className="pl-6 mt-3 space-y-2">
                                <Label htmlFor="expired_warning_days" className="text-sm font-normal">
                                    Chọn khoảng thời gian xuất hiện cảnh báo
                                </Label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        id="expired_warning_days"
                                        type="number"
                                        className="w-20 text-right"
                                        value={String(expiredWarningDays ?? 1)}
                                        onChange={(e) => {
                                            const n = Number(e.target.value)
                                            if (Number.isNaN(n) || n < 1) return
                                            onExpiredWarningDaysChange?.(n)
                                        }}
                                        min={1}
                                    />
                                    <span className="text-sm text-muted-foreground">Ngày</span>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* Bảng phân bổ tồn kho - only show when track inventory is enabled */}
            {!!trackInventory && (
                <div className="border-t pt-4 mt-4">
                    {!isBatchTracking ? (
                        // Simple View (Stock-Only Mode)
                        <div className="space-y-4">
                            <h3 className="font-semibold text-sm">Bảng phân bổ tồn kho</h3>
                            <WarehouseStockManager
                                warehouseStocks={warehouseStocks || []}
                                warehouses={warehouses}
                                defaultWarehouseId={defaultWarehouseId}
                                productId={productId}
                                isVariant={isVariant}
                                onChange={(stocks) => handleWarehouseStocksChange(stocks)}
                                editMode={isEdit ? "adjust" : "inline"}
                                showAllWarehouses={true}
                                isEdit={isEdit}
                                trackInventory={trackInventory}
                                trackInventorySaved={trackInventorySaved}
                                onStockHistoryRefresh={onStockHistoryRefresh}
                            />
                        </div>
                    ) : (
                        // Tabbed View
                        <Tabs defaultValue="storage" className="w-full">
                            <TabsList className="flex w-full justify-start border-b !p-0 h-auto !bg-transparent space-x-8 !rounded-none">
                                <TabsTrigger
                                    value="storage"
                                    className="!flex-none !rounded-none !border-0 !border-b-2 border-transparent data-[state=active]:!border-blue-600 data-[state=active]:!text-blue-600 data-[state=active]:!bg-transparent data-[state=active]:!shadow-none text-muted-foreground !px-0 !py-2.5 font-medium !bg-transparent transition-none hover:text-blue-600/80 !cursor-pointer"
                                >
                                    Kho lưu trữ
                                </TabsTrigger>
                                <TabsTrigger
                                    value="batches"
                                    className="!flex-none !rounded-none !border-0 !border-b-2 border-transparent data-[state=active]:!border-blue-600 data-[state=active]:!text-blue-600 data-[state=active]:!bg-transparent data-[state=active]:!shadow-none text-muted-foreground !px-0 !py-2.5 font-medium !bg-transparent transition-none hover:text-blue-600/80 !cursor-pointer"
                                >
                                    Lô sản phẩm
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="storage" className="mt-4 space-y-4">
                                <WarehouseStockManager
                                    warehouseStocks={warehouseStocks || []}
                                    warehouses={warehouses}
                                    defaultWarehouseId={defaultWarehouseId}
                                    onChange={(stocks) => handleWarehouseStocksChange(stocks)}
                                    editMode={isEdit ? "adjust" : "inline"}
                                    showAllWarehouses={true}
                                    productId={productId}
                                    isEdit={isEdit}
                                    trackInventory={trackInventory}
                                    trackInventorySaved={trackInventorySaved}
                                    isBatchTracking={isBatchTracking}
                                    isVariant={isVariant}
                                    onBatchRefresh={() => {
                                        // Refresh batches list after stock update
                                        setBatchRefreshKey(prev => prev + 1)
                                        fetchBatches()
                                    }}
                                    onStockHistoryRefresh={onStockHistoryRefresh}
                                />
                            </TabsContent>

                            <TabsContent value="batches">
                                {batchProductId && isEdit ? (
                                    <BatchStockManager
                                        productId={batchProductId}
                                        warehouses={warehouses}
                                        onRefresh={fetchBatches}
                                        refreshTrigger={batchRefreshKey}
                                        isVariant={isVariant}
                                        variantId={isVariant ? batchProductId : undefined}
                                    />
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-8 border rounded-md bg-gray-50 text-muted-foreground min-h-[150px]">
                                        <p>Danh sách lô sẽ được hiển thị sau khi sản phẩm được tạo.</p>
                                    </div>
                                )}
                            </TabsContent>
                        </Tabs>
                    )}


                </div>
            )}

            {/* Storage Location Modal */}
            <StorageLocationModal
                open={storageLocationModal.open}
                onOpenChange={(open) => setStorageLocationModal(prev => ({ ...prev, open }))}
                warehouseId={storageLocationModal.warehouseId}
                warehouses={warehouses}
                location={getStorageLocation(storageLocationModal.warehouseId)}
                onConfirm={handleStorageLocationConfirm}
            />

            {/* Batch Add Modal */}
            {batchProductId && (
                <BatchAddModal
                    open={openAddBatchModal}
                    onOpenChange={setOpenAddBatchModal}
                    warehouses={warehouses}
                    currentBatchCount={batches.length}
                    maxBatchCount={50}
                    onSave={handleSaveBatch}
                />
            )}

            {/* BatchList Modal */}
            {batchProductId && (
                <BatchListModal
                    open={openBatchListModal}
                    onOpenChange={setOpenBatchListModal}
                    productId={batchProductId}
                    batches={batches}
                    warehouses={warehouses}
                    onRefresh={fetchBatches}
                />
            )}


        </div>
    )
}
