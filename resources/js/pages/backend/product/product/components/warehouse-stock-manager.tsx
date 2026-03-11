import { Label } from "@/components/ui/label"
import { NumberInput } from "@/components/number-input"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Pencil, Trash2 } from "lucide-react"
import { useState, useEffect, useCallback, useRef } from "react"
import { StorageLocationModal } from "@/components/storage-location-modal"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { router } from "@inertiajs/react"
import { toast } from "sonner"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { WarehouseBatchListModal } from "./warehouse-batch-list-modal"

export interface WarehouseStock {
    warehouse_id: string | number
    stock_quantity: number
    storage_location?: string
}

interface WarehouseStockManagerProps {
    warehouseStocks: WarehouseStock[]
    warehouses: Array<{ value: string | number; label: string }>
    defaultWarehouseId?: string | number
    onChange: (stocks: WarehouseStock[]) => void
    editMode?: "inline" | "adjust"
    showAllWarehouses?: boolean
    onStockClick?: (payload: { warehouse_id: string | number; stock_quantity: number; storage_location?: string }) => void
    productId?: number
    isEdit?: boolean
    trackInventory?: boolean
    trackInventorySaved?: boolean
    isVariant?: boolean // Flag to determine if this is for variant (use different API endpoint)
    isBatchTracking?: boolean
    onBatchRefresh?: () => void // Callback to refresh batch list after stock update
    onStockHistoryRefresh?: () => void // Callback to refresh stock history after stock adjustment
}

export function WarehouseStockManager({
    warehouseStocks,
    warehouses,
    defaultWarehouseId,
    onChange,
    editMode = "inline",
    showAllWarehouses = false,
    onStockClick,
    productId,
    isEdit = false,
    trackInventory = false,
    trackInventorySaved,
    isVariant = false,
    isBatchTracking = false,
    onBatchRefresh,
    onStockHistoryRefresh,
}: WarehouseStockManagerProps) {
    const [stocks, setStocks] = useState<WarehouseStock[]>(warehouseStocks || [])
    const [openAdjust, setOpenAdjust] = useState(false)
    const [adjustIndex, setAdjustIndex] = useState<number>(-1)
    const [adjustDelta, setAdjustDelta] = useState<string>("0")
    const [adjustValue, setAdjustValue] = useState<string>("0") // new stock
    const [adjustReason, setAdjustReason] = useState<string>("Thực tế")
    const [storageLocationModal, setStorageLocationModal] = useState<{
        open: boolean
        stockIndex: number
        warehouseId: string | number
    }>({ open: false, stockIndex: -1, warehouseId: "" })
    const [savingStock, setSavingStock] = useState(false)
    const [showTrackInventoryWarning, setShowTrackInventoryWarning] = useState(false)
    const [warehouseBatchModal, setWarehouseBatchModal] = useState<{ open: boolean, warehouseId: string | number, warehouseName: string }>({ open: false, warehouseId: "", warehouseName: "" })

    // Transfer modal states (for basic products)
    const [openTransfer, setOpenTransfer] = useState(false)
    const [transferFromWarehouseId, setTransferFromWarehouseId] = useState<string>("")
    const [transferToWarehouseId, setTransferToWarehouseId] = useState<string>("")
    const [transferQuantity, setTransferQuantity] = useState<string>("")
    const [transferReason, setTransferReason] = useState<string>("Chuyển kho")
    const [transferring, setTransferring] = useState(false)

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

    // Ref to track previous warehouseStocks value to avoid infinite loops
    const prevWarehouseStocksRef = useRef<string>('')
    // Ref to store onChange callback to avoid dependency issues
    const onChangeRef = useRef(onChange)

    // Update ref when onChange changes - use useEffect to avoid render phase updates
    useEffect(() => {
        onChangeRef.current = onChange
    }, [onChange])

    // Sync stocks with props, preserving quantities from database
    useEffect(() => {
        // Serialize current prop for comparison
        const currentPropStr = JSON.stringify(warehouseStocks || [])

        if (!showAllWarehouses) {
            // Simple mode: just use warehouseStocks as-is
            setStocks(warehouseStocks || [])
            prevWarehouseStocksRef.current = currentPropStr
            return
        }

        // showAllWarehouses mode: merge with warehouses list while preserving DB quantities
        if (!warehouses?.length) {
            setStocks(warehouseStocks || [])
            prevWarehouseStocksRef.current = currentPropStr
            return
        }

        // IMPORTANT: build from latest props (warehouseStocks) to preserve real quantities from database
        const base = warehouseStocks || []
        const map = new Map<string, WarehouseStock>()
        // First, add all existing stocks from database (preserve quantities)
        for (const s of base) {
            map.set(String(s.warehouse_id), {
                warehouse_id: s.warehouse_id,
                stock_quantity: s.stock_quantity ?? 0, // Preserve actual quantity from DB
                storage_location: s.storage_location
            })
        }

        // Then, add missing warehouses with 0 quantity
        let addedMissingWarehouses = false
        for (const w of warehouses) {
            const key = String(w.value)
            if (!map.has(key)) {
                map.set(key, { warehouse_id: w.value, stock_quantity: 0, storage_location: undefined })
                addedMissingWarehouses = true
            }
        }

        const next = Array.from(map.values())
        setStocks(next)

        // Only notify parent when we actually added missing warehouses
        // AND when the prop hasn't changed (to avoid loops from parent updates)
        if (addedMissingWarehouses && currentPropStr === prevWarehouseStocksRef.current) {
            onChangeRef.current(next)
        }
        prevWarehouseStocksRef.current = currentPropStr
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showAllWarehouses, warehouses, warehouseStocks])

    const handleStockChange = (index: number, quantity: number | undefined) => {
        const newStocks = [...stocks]
        newStocks[index] = {
            ...newStocks[index],
            stock_quantity: quantity || 0
        }
        setStocks(newStocks)
        onChangeRef.current(newStocks)
    }

    const openAdjustModal = (index: number) => {
        // Check if trackInventory is enabled and saved
        if (isEdit && editMode === "adjust" && (!trackInventory || trackInventorySaved === false)) {
            // Show warning dialog
            setShowTrackInventoryWarning(true)
            return
        }

        setAdjustIndex(index)
        const current = Number(stocks[index]?.stock_quantity ?? 0)
        setAdjustDelta("0")
        setAdjustValue(String(current))
        setAdjustReason("Thực tế")
        setOpenAdjust(true)
    }

    const openStockAdjustment = (index: number) => {
        if ((!trackInventory || trackInventorySaved === false) && editMode === "adjust" && isEdit) {
            setShowTrackInventoryWarning(true)
            return
        }

        if (isBatchTracking) {
            // Open batch list modal
            setWarehouseBatchModal({
                open: true,
                warehouseId: stocks[index].warehouse_id,
                warehouseName: getWarehouseName(stocks[index].warehouse_id)
            })
        } else {
            // Open simple adjust modal
            openAdjustModal(index)
        }
    }

    const saveAdjust = async (e?: React.MouseEvent<HTMLButtonElement>) => {
        // Prevent form submission if button is inside a form
        if (e) {
            e.preventDefault()
            e.stopPropagation()
        }

        if (adjustIndex < 0) return
        const n = Number(adjustValue)
        if (Number.isNaN(n) || n < 0) return

        // If editing existing product (not batch), save to database immediately
        if (isEdit && productId && editMode === "adjust") {
            setSavingStock(true)
            try {
                // Only send the warehouse stock that was actually changed
                // Don't send all warehouses to avoid overwriting with 0
                const changedStock = stocks[adjustIndex]
                if (!changedStock) {
                    setSavingStock(false)
                    return
                }

                const endpoint = isVariant
                    ? `/backend/product-variant/${productId}/warehouse-stocks`
                    : `/backend/product/${productId}/warehouse-stocks`

                const response = await apiFetch(endpoint, {
                    method: "PATCH",
                    body: JSON.stringify({
                        warehouse_stocks: [{
                            warehouse_id: changedStock.warehouse_id,
                            stock_quantity: n,
                            storage_location: changedStock.storage_location
                        }],
                        reason: adjustReason || null
                    }),
                })

                if (response.ok) {
                    // Update UI state with new value
                    handleStockChange(adjustIndex, n)
                    setOpenAdjust(false)

                    // Trigger stock history refresh FIRST, before router.reload
                    // This ensures callback is called and state is updated before any reload happens
                    console.log('WarehouseStockManager: Triggering stock history refresh after stock adjustment')
                    console.log('WarehouseStockManager: onStockHistoryRefresh is', typeof onStockHistoryRefresh, onStockHistoryRefresh)
                    if (onStockHistoryRefresh) {
                        console.log('WarehouseStockManager: Calling onStockHistoryRefresh callback')
                        onStockHistoryRefresh()
                    } else {
                        console.warn('WarehouseStockManager: onStockHistoryRefresh callback is not provided!')
                    }

                    // Small delay to ensure state update is processed, then reload
                    setTimeout(() => {
                        // Reload only record/variant prop to refresh warehouse_stocks from database
                        // This preserves all form state and only updates the data
                        if (isVariant) {
                            // For variant, reload variant prop
                            router.reload({
                                only: ['variant'],
                                preserveState: true,
                                preserveScroll: true,
                            })
                        } else {
                            // For product, reload record prop
                            router.reload({
                                only: ['record'],
                                preserveState: true,
                                preserveScroll: true,
                            })
                        }
                    }, 200)
                } else {
                    // Revert UI change on error
                    const errorData = await response.json().catch(() => ({}))
                    console.error("Failed to update warehouse stock:", errorData)
                    throw new Error("Failed to update warehouse stock")
                }
            } catch (error) {
                console.error("Failed to update warehouse stock:", error)
                // Revert UI change on error
                handleStockChange(adjustIndex, stocks[adjustIndex]?.stock_quantity ?? 0)
                setOpenAdjust(false)
            } finally {
                setSavingStock(false)
            }
        } else {
            // For create mode or non-adjust mode, just update UI
            handleStockChange(adjustIndex, n)
            setOpenAdjust(false)
        }
    }

    const handleStorageLocationChange = async (index: number, location: string) => {
        const newStocks = [...stocks]
        newStocks[index] = {
            ...newStocks[index],
            storage_location: location || undefined
        }
        setStocks(newStocks)
        onChangeRef.current(newStocks)

        // If editing existing product/variant, save to database immediately
        if (isEdit && productId) {
            try {
                const endpoint = isVariant
                    ? `/backend/product-variant/${productId}/warehouse-stocks`
                    : `/backend/product/${productId}/warehouse-stocks`

                await apiFetch(endpoint, {
                    method: "PATCH",
                    body: JSON.stringify({
                        warehouse_stocks: newStocks
                    }),
                })
            } catch (error) {
                console.error("Failed to update storage location:", error)
            }
        }
    }

    const handleOpenStorageLocationModal = (index: number) => {
        setStorageLocationModal({
            open: true,
            stockIndex: index,
            warehouseId: stocks[index].warehouse_id
        })
    }

    const handleStorageLocationConfirm = (warehouseId: string | number, location: string) => {
        const newStocks = [...stocks]
        newStocks[storageLocationModal.stockIndex] = {
            ...newStocks[storageLocationModal.stockIndex],
            warehouse_id: warehouseId,
            storage_location: location || undefined
        }
        setStocks(newStocks)
        onChangeRef.current(newStocks)
        setStorageLocationModal({ open: false, stockIndex: -1, warehouseId: "" })
    }

    const getWarehouseName = (warehouseId: string | number): string => {
        return warehouses.find(w => w.value == warehouseId)?.label || ""
    }

    if (warehouses.length === 0) {
        return (
            <div className="text-sm text-muted-foreground font-normal">
                Chưa có kho nào được thiết lập
            </div>
        )
    }

    const openTransferModal = () => {
        // Mặc định chọn kho có số lượng > 0 đầu tiên
        const availableStock = stocks.find(s => (s.stock_quantity ?? 0) > 0)
        setTransferFromWarehouseId(availableStock ? String(availableStock.warehouse_id) : (stocks.length > 0 ? String(stocks[0].warehouse_id) : ""))
        setTransferToWarehouseId("")
        setTransferQuantity("")
        setTransferReason("Chuyển kho")
        setOpenTransfer(true)
    }

    const submitTransfer = async () => {
        const quantity = Number(transferQuantity)
        if (Number.isNaN(quantity) || quantity <= 0) {
            toast.error("Vui lòng nhập số lượng hợp lệ.")
            return
        }
        if (!transferFromWarehouseId) {
            toast.error("Vui lòng chọn kho chuyển từ.")
            return
        }
        if (!transferToWarehouseId) {
            toast.error("Vui lòng chọn kho chuyển đến.")
            return
        }
        if (transferFromWarehouseId === transferToWarehouseId) {
            toast.error("Không thể chuyển đến cùng kho.")
            return
        }

        // Kiểm tra số lượng tại kho nguồn
        const fromStock = stocks.find(s => String(s.warehouse_id) === transferFromWarehouseId)
        const availableStock = fromStock?.stock_quantity ?? 0
        if (quantity > availableStock) {
            toast.error(`Số lượng chuyển không được vượt quá tồn kho tại kho nguồn (${availableStock}).`)
            return
        }

        if (!productId || !isEdit) {
            toast.error("Chỉ có thể chuyển kho khi đang chỉnh sửa sản phẩm.")
            return
        }

        setTransferring(true)
        try {
            const endpoint = isVariant
                ? `/backend/product-variant/${productId}/warehouse-stocks/transfer`
                : `/backend/product/${productId}/warehouse-stocks/transfer`

            const response = await apiFetch(endpoint, {
                method: "POST",
                body: JSON.stringify({
                    from_warehouse_id: Number(transferFromWarehouseId),
                    to_warehouse_id: Number(transferToWarehouseId),
                    quantity: quantity,
                    reason: transferReason || null
                }),
            })

            if (response.ok) {
                toast.success("Chuyển kho thành công")
                setOpenTransfer(false)

                // Reload để cập nhật warehouse stocks
                router.reload({
                    only: isVariant ? ['variant'] : ['record'],
                    preserveState: true,
                    preserveScroll: true,
                    onSuccess: () => {
                        // Trigger stock history refresh after reload completes
                        console.log('Triggering stock history refresh after transfer reload')
                        setTimeout(() => {
                            onStockHistoryRefresh?.()
                        }, 500)
                    }
                })
            } else {
                const errorData = await response.json().catch(() => ({}))
                toast.error(errorData.message || "Chuyển kho thất bại")
            }
        } catch (error) {
            console.error("Failed to transfer warehouse stock:", error)
            toast.error("Có lỗi xảy ra khi chuyển kho")
        } finally {
            setTransferring(false)
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="space-y-2">
                    <Label className="font-normal">Thông tin tồn kho</Label>
                    {!showAllWarehouses && (
                        <div className="text-sm text-muted-foreground">
                            Chọn kho để thêm
                        </div>
                    )}
                </div>
                {/* Chuyển kho button - chỉ hiển thị cho sản phẩm basic (không phải batch) */}
                {editMode === "adjust" && isEdit && productId && !isBatchTracking && stocks.length > 1 && (
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={openTransferModal}
                        className="h-8 px-3 text-[12px] font-normal"
                    >
                        Chuyển kho
                    </Button>
                )}
            </div>

            {stocks.length > 0 && (
                <div className="space-y-3">
                    {editMode === "adjust" ? (
                        <div className="w-full overflow-x-auto">
                            <div className="grid grid-cols-12 gap-3 items-center pb-2 border-b text-xs text-muted-foreground">
                                <div className="col-span-4">
                                    <Label className="font-normal text-xs text-muted-foreground">Kho lưu trữ</Label>
                                </div>
                                <div className="col-span-2 flex items-center justify-center">
                                    <span className="text-center font-normal text-xs text-muted-foreground">Tồn kho</span>
                                </div>
                                <div className="col-span-2 flex items-center justify-center">
                                    <span className="text-center font-normal text-xs text-muted-foreground">Hàng đang về</span>
                                </div>
                                <div className="col-span-2 flex items-center justify-center">
                                    <span className="text-center font-normal text-xs text-muted-foreground">Đang giao dịch</span>
                                </div>
                                <div className="col-span-2 flex items-center justify-center">
                                    <span className="text-center font-normal text-xs text-muted-foreground">Có thể bán</span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-12 gap-3 items-center pb-2 border-b">
                            <div className="col-span-3">
                                <Label className="font-normal text-xs text-muted-foreground">Tên kho</Label>
                            </div>
                            <div className="col-span-3">
                                <Label className="font-normal text-xs text-muted-foreground">Tồn kho</Label>
                            </div>
                            <div className="col-span-5">
                                <Label className="font-normal text-xs text-muted-foreground">Vị trí lưu kho</Label>
                            </div>
                            <div className="col-span-1"></div>
                        </div>
                    )}

                    {stocks.map((stock, index) => (
                        editMode === "adjust" ? (
                            <div key={index} className="grid grid-cols-12 gap-3 items-center py-2">
                                <div className="col-span-4">
                                    <div className="font-normal text-sm">{getWarehouseName(stock.warehouse_id)}</div>
                                    <button
                                        type="button"
                                        className="mt-1 inline-flex items-center gap-1 text-xs text-blue-600 hover:underline cursor-pointer"
                                        onClick={() => handleOpenStorageLocationModal(index)}
                                        data-testid={`warehouse-stock-${index}-location-open-inline`}
                                    >
                                        {stock.storage_location || "Vị trí lưu kho"}
                                        <Pencil className="h-2 w-2" />
                                    </button>
                                </div>
                                <div className="col-span-2 flex justify-center">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="h-7 rounded-md px-2 text-[12px] font-normal text-slate-700 border-slate-200 bg-white hover:bg-slate-50 !cursor-pointer"
                                        onClick={() => {
                                            if (onStockClick) {
                                                console.log("onStockClick is present")
                                                onStockClick({
                                                    warehouse_id: stock.warehouse_id,
                                                    stock_quantity: stock.stock_quantity ?? 0,
                                                    storage_location: stock.storage_location,
                                                })
                                                return
                                            }
                                            openStockAdjustment(index)
                                        }}
                                        data-testid={`warehouse-stock-${index}-qty-open`}
                                        title="Điều chỉnh tồn kho"
                                    >
                                        <span className="inline-flex items-center gap-1">
                                            {stock.stock_quantity ?? 0}
                                            <Pencil className="h-2 w-2 text-slate-500" />
                                        </span>
                                    </Button>
                                </div>
                                <div className="col-span-2 flex items-center justify-center text-sm">{0}</div>
                                <div className="col-span-2 flex items-center justify-center text-sm">{0}</div>
                                <div className="col-span-2 flex items-center justify-center text-sm">{stock.stock_quantity ?? 0}</div>
                            </div>
                        ) : (
                            <div key={index} className="grid grid-cols-12 gap-3 items-center">
                                <div className="col-span-3">
                                    <div className="font-normal text-sm py-2">
                                        {getWarehouseName(stock.warehouse_id)}
                                    </div>
                                </div>
                                <div className="col-span-3">
                                    <NumberInput
                                        value={stock.stock_quantity}
                                        onValueChange={(v) => handleStockChange(index, v)}
                                        className="font-normal"
                                        placeholder="0"
                                        data-testid={`warehouse-stock-${index}-qty`}
                                    />
                                </div>
                                <div className="col-span-5 flex gap-2">
                                    <Input
                                        value={stock.storage_location || ""}
                                        readOnly
                                        placeholder="Nhập vị trí lưu kho (VD: A-D10-K456)"
                                        className="font-normal cursor-pointer"
                                        onClick={() => handleOpenStorageLocationModal(index)}
                                        data-testid={`warehouse-stock-${index}-location`}
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        onClick={() => handleOpenStorageLocationModal(index)}
                                        className="shrink-0 cursor-pointer"
                                        title="Mở modal nhập vị trí lưu kho"
                                        data-testid={`warehouse-stock-${index}-location-open`}
                                    >
                                        ...
                                    </Button>
                                </div>
                                <div className="col-span-1 flex justify-end">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        disabled
                                        className="h-9 w-9 text-red-500 opacity-50 cursor-not-allowed"
                                        title="Không hỗ trợ xoá kho ở màn này"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        )
                    ))}
                </div>
            )}

            <StorageLocationModal
                open={storageLocationModal.open}
                onOpenChange={(open) => setStorageLocationModal(prev => ({ ...prev, open }))}
                warehouseId={storageLocationModal.warehouseId}
                warehouses={warehouses}
                location={stocks[storageLocationModal.stockIndex]?.storage_location || ""}
                onConfirm={handleStorageLocationConfirm}
            />

            <AlertDialog open={showTrackInventoryWarning} onOpenChange={setShowTrackInventoryWarning}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Yêu cầu cập nhật sản phẩm</AlertDialogTitle>
                        <AlertDialogDescription>
                            Bạn cần tích vào checkbox "Quản lý số lượng tồn kho" và lưu sản phẩm trước khi có thể sửa tồn kho.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Đã hiểu</AlertDialogCancel>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <Dialog open={openAdjust} onOpenChange={setOpenAdjust}>
                <DialogContent className="max-w-[520px]">
                    <DialogHeader>
                        <DialogTitle>Điều chỉnh</DialogTitle>
                        <DialogDescription className="sr-only">
                            Nhập tồn kho mới để cập nhật tồn kho kho lưu trữ.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label className="mb-1 block text-sm font-normal">Điều chỉnh</Label>
                                <Input
                                    type="number"
                                    value={adjustDelta}
                                    onChange={(e) => {
                                        const v = e.target.value
                                        setAdjustDelta(v)
                                        const base = Number(stocks[adjustIndex]?.stock_quantity ?? 0)
                                        const d = Number(v || 0)
                                        if (Number.isNaN(d)) return
                                        setAdjustValue(String(Math.max(0, base + d)))
                                    }}
                                />
                            </div>
                            <div>
                                <Label className="mb-1 block text-sm font-normal">Tồn kho mới</Label>
                                <Input
                                    type="number"
                                    value={adjustValue}
                                    onChange={(e) => {
                                        const v = e.target.value
                                        setAdjustValue(v)
                                        const base = Number(stocks[adjustIndex]?.stock_quantity ?? 0)
                                        const n = Number(v || 0)
                                        if (Number.isNaN(n)) return
                                        setAdjustDelta(String(n - base))
                                    }}
                                    min={0}
                                />
                            </div>
                        </div>

                        <div>
                            <Label className="mb-1 block text-sm font-normal">Lý do</Label>
                            <Select value={adjustReason} onValueChange={setAdjustReason}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Chọn lý do" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Thực tế">Thực tế</SelectItem>
                                    <SelectItem value="Kiểm kê">Kiểm kê</SelectItem>
                                    <SelectItem value="Hỏng/Thất thoát">Hỏng/Thất thoát</SelectItem>
                                    <SelectItem value="Khác">Khác</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex justify-end gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    setOpenAdjust(false)
                                }}
                                disabled={savingStock}
                            >
                                Hủy
                            </Button>
                            <Button
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    saveAdjust(e)
                                }}
                                disabled={savingStock}
                            >
                                {savingStock ? "Đang lưu..." : "Lưu"}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {productId && (
                <WarehouseBatchListModal
                    open={warehouseBatchModal.open}
                    onOpenChange={(open) => setWarehouseBatchModal(prev => ({ ...prev, open }))}
                    warehouseId={warehouseBatchModal.warehouseId}
                    warehouseName={warehouseBatchModal.warehouseName}
                    productId={productId || 0}
                    isVariant={isVariant}
                    variantId={isVariant && productId ? productId : undefined}
                    onRefresh={() => {
                        // Reload page to refresh warehouse stocks if needed
                        router.reload({
                            only: isVariant ? ['variant'] : ['record'],
                            preserveState: true,
                            preserveScroll: true,
                        })
                        // Also refresh batch list in parent
                        onBatchRefresh?.()
                    }}
                />
            )}

            {/* Transfer Modal - for basic products */}
            {!isBatchTracking && (
                <Dialog open={openTransfer} onOpenChange={setOpenTransfer}>
                    <DialogContent className="max-w-[520px]">
                        <DialogHeader>
                            <DialogTitle>Chuyển kho</DialogTitle>
                            <DialogDescription className="sr-only">
                                Chuyển tồn kho từ kho này sang kho khác.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div>
                                <Label className="mb-1 block text-sm font-normal">Kho chuyển từ</Label>
                                <Select value={transferFromWarehouseId} onValueChange={setTransferFromWarehouseId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Chọn kho" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {stocks
                                            .filter(s => (s.stock_quantity ?? 0) > 0)
                                            .map(stock => (
                                                <SelectItem key={stock.warehouse_id} value={String(stock.warehouse_id)}>
                                                    {getWarehouseName(stock.warehouse_id)} (Tồn: {stock.stock_quantity ?? 0})
                                                </SelectItem>
                                            ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label className="mb-1 block text-sm font-normal">Kho chuyển đến</Label>
                                <Select value={transferToWarehouseId} onValueChange={setTransferToWarehouseId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Chọn kho" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {warehouses
                                            .filter(w => String(w.value) !== transferFromWarehouseId)
                                            .map(warehouse => (
                                                <SelectItem key={warehouse.value} value={String(warehouse.value)}>
                                                    {warehouse.label}
                                                </SelectItem>
                                            ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label className="mb-1 block text-sm font-normal">Số lượng</Label>
                                <Input
                                    type="number"
                                    value={transferQuantity}
                                    onChange={(e) => setTransferQuantity(e.target.value)}
                                    placeholder="Nhập số lượng"
                                    min="1"
                                />
                                {transferFromWarehouseId && (
                                    <div className="mt-1 text-xs text-muted-foreground">
                                        Tồn kho hiện tại: {stocks.find(s => String(s.warehouse_id) === transferFromWarehouseId)?.stock_quantity ?? 0}
                                    </div>
                                )}
                            </div>

                            <div>
                                <Label className="mb-1 block text-sm font-normal">Lý do</Label>
                                <Input
                                    value={transferReason}
                                    onChange={(e) => setTransferReason(e.target.value)}
                                    placeholder="Lý do chuyển kho"
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setOpenTransfer(false)}
                                    disabled={transferring}
                                >
                                    Hủy
                                </Button>
                                <Button
                                    type="button"
                                    onClick={submitTransfer}
                                    disabled={transferring || !transferFromWarehouseId || !transferToWarehouseId || !transferQuantity}
                                >
                                    {transferring ? "Đang xử lý..." : "Chuyển kho"}
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    )
}
