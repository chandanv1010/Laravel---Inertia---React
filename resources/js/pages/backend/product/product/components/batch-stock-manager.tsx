import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Pencil, Star, Loader2, Trash2 } from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { format, parseISO, isBefore } from "date-fns"
import { useState, useCallback, useEffect } from "react"
import { toast } from "sonner"
import { Link } from "@inertiajs/react"

interface WarehouseDistribution {
    warehouse_id: number
    warehouse_name: string
    stock_quantity: number
}

interface Batch {
    id: number
    code: string
    manufactured_at: string | null
    expired_at: string | null
    warehouse_id: number | null
    warehouse_name: string | null
    stock_quantity: number
    warehouse_distribution?: WarehouseDistribution[]
    is_default: boolean
    created_at: string | null
    updated_at?: string | null
    status?: string // 'active' or others
}

interface BatchStockManagerProps {
    productId: number
    warehouses: Array<{ value: string | number; label: string }>
    onRefresh?: () => void
    refreshTrigger?: number
    isVariant?: boolean
    variantId?: number
}

export function BatchStockManager({ productId, warehouses, onRefresh, refreshTrigger = 0, isVariant = false, variantId }: BatchStockManagerProps) {
    const [batches, setBatches] = useState<Batch[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [openAdjust, setOpenAdjust] = useState(false)
    const [adjustBatch, setAdjustBatch] = useState<Batch | null>(null)
    const [adjustDelta, setAdjustDelta] = useState<string>("0")
    const [adjustValue, setAdjustValue] = useState<string>("0")
    const [adjustReason, setAdjustReason] = useState<string>("Thực tế")
    const [adjustWarehouseId, setAdjustWarehouseId] = useState<string | number | null>(null)
    const [savingStock, setSavingStock] = useState(false)

    // Helper to get cookie (reused from other components)
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

    const fetchBatches = useCallback(async () => {
        if (!productId) return
        setIsLoading(true)
        try {
            // Nếu là variant, PHẢI dùng endpoint variant batches
            // Khi isVariant=true, dùng productId làm variantId (vì productId được truyền là variant.id)
            const actualVariantId = variantId || productId
            const url = isVariant
                ? `/backend/product-variant/${actualVariantId}/batches?_t=${Date.now()}`
                : `/backend/product/${productId}/batches?_t=${Date.now()}`
            const response = await apiFetch(url)
            if (response.ok) {
                const data = await response.json()
                setBatches(data.data || [])
            }
        } catch (error) {
            console.error('Failed to fetch batches:', error)
        } finally {
            setIsLoading(false)
        }
    }, [productId, isVariant, variantId, apiFetch])

    useEffect(() => {
        fetchBatches()
    }, [fetchBatches, refreshTrigger])

    const getWarehouseLabel = (id: number | null) => {
        if (!id) return "---"
        return warehouses.find(w => String(w.value) === String(id))?.label || "---"
    }

    const getBatchStatus = (batch: Batch) => {
        const expiredDate = batch.expired_at ? parseISO(batch.expired_at) : null

        if (expiredDate && isBefore(expiredDate, new Date())) {
            return { label: "Hết hạn", className: "bg-red-50 text-red-700 hover:bg-red-50 border-red-200" }
        }
        return { label: "Còn hạn", className: "bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-emerald-200" }
    }

    const handleOpenAdjust = (batch: Batch) => {
        setAdjustBatch(batch)
        // Lấy warehouse đầu tiên có số lượng > 0 hoặc warehouse hiện tại
        const warehouseDist = batch.warehouse_distribution || []
        const firstWarehouse = warehouseDist.length > 0 
            ? warehouseDist[0] 
            : null
        
        const selectedWarehouseId = firstWarehouse?.warehouse_id || batch.warehouse_id || warehouses[0]?.value
        setAdjustWarehouseId(selectedWarehouseId)
        
        // Hiển thị tồn kho của kho được chọn
        const selectedWarehouseStock = warehouseDist.find(w => w.warehouse_id === selectedWarehouseId)?.stock_quantity || batch.stock_quantity
        setAdjustDelta("0")
        setAdjustValue(String(selectedWarehouseStock))
        setAdjustReason("Thực tế")
        setOpenAdjust(true)
    }

    const handleSaveAdjust = async () => {
        if (!adjustBatch) return

        if (!adjustWarehouseId) {
            toast.error('Vui lòng chọn kho')
            return
        }

        const n = Number(adjustValue)
        if (Number.isNaN(n) || n < 0) return

        setSavingStock(true)
        try {
            const response = await apiFetch(`/backend/product-batches/${adjustBatch.id}`, {
                method: "PATCH",
                body: JSON.stringify({
                    stock_quantity: n,
                    warehouse_id: adjustWarehouseId,
                    reason: adjustReason
                })
            })

            if (response.ok) {
                toast.success("Cập nhật tồn kho thành công")
                setOpenAdjust(false)
                setAdjustWarehouseId(null)
                fetchBatches()
                onRefresh?.()
            } else {
                const error = await response.json()
                toast.error(error.message || "Có lỗi xảy ra")
            }
        } catch (error) {
            console.error("Failed to update stock:", error)
            toast.error("Có lỗi xảy ra")
        } finally {
            setSavingStock(false)
        }
    }

    // Handle delete batch
    const handleDeleteBatch = async (batch: Batch) => {
        if (!confirm('Bạn có chắc chắn muốn xóa lô này?')) return

        try {
            const response = await apiFetch(`/backend/product-batches/${batch.id}`, {
                method: 'DELETE',
            })

            if (response.ok) {
                toast.success('Xóa lô thành công')
                fetchBatches()
                onRefresh?.()
            } else {
                const error = await response.json()
                toast.error(error.message || 'Có lỗi xảy ra khi xóa lô')
            }
        } catch (error) {
            console.error('Failed to delete batch:', error)
            toast.error('Có lỗi xảy ra khi xóa lô')
        }
    }

    return (
        <div className="space-y-4">
            {isLoading ? (
                <div className="flex flex-col items-center justify-center p-8">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                    <span className="text-sm text-muted-foreground mt-2">Đang tải dữ liệu...</span>
                </div>
            ) : batches.length === 0 ? (
                <div className="text-center text-muted-foreground py-8 border rounded-md bg-gray-50">
                    Chưa có lô nào. Vui lòng tạo lô mới.
                </div>
            ) : (
                <div className="border rounded-md">
                    <Table className="text-[13px]">
                        <TableHeader>
                            <TableRow className="bg-gray-50/50 hover:bg-gray-50/50">
                                <TableHead className="w-[150px]">Mã lô</TableHead>
                                <TableHead className="w-[150px]">Kho</TableHead>
                                <TableHead className="w-[120px] text-center">Trạng thái</TableHead>
                                <TableHead className="w-[120px] text-center">Ngày sản xuất</TableHead>
                                <TableHead className="w-[120px] text-center">Hạn sử dụng</TableHead>
                                <TableHead className="w-[100px] text-center">Tồn kho</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {batches.map((batch) => {
                                const status = getBatchStatus(batch)
                                const manufacturedDate = batch.manufactured_at ? parseISO(batch.manufactured_at) : undefined
                                const expiredDate = batch.expired_at ? parseISO(batch.expired_at) : undefined

                                return (
                                    <TableRow key={batch.id} className="group cursor-default">
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-2">
                                                <Link
                                                    href={`/backend/product-batches/${batch.id}/detail`}
                                                    className="text-blue-600 font-semibold hover:underline"
                                                >
                                                    {batch.code}
                                                </Link>
                                                {batch.is_default && (
                                                    <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {(() => {
                                                const warehouseDist = batch.warehouse_distribution || []
                                                const hasMultipleWarehouses = warehouseDist.length > 1
                                                const firstWarehouse = warehouseDist[0]
                                                
                                                if (!firstWarehouse && !batch.warehouse_id) {
                                                    return <span className="text-gray-500">N/A</span>
                                                }
                                                
                                                if (hasMultipleWarehouses) {
                                                    const otherCount = warehouseDist.length - 1
                                                    return (
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <span className="text-gray-700 cursor-help">
                                                                    {firstWarehouse.warehouse_name} (+{otherCount})
                                                                </span>
                                                            </TooltipTrigger>
                                                            <TooltipContent className="bg-gray-900 text-white p-3 max-w-xs">
                                                                <div className="space-y-1.5">
                                                                    <div className="font-semibold mb-2">Danh sách kho:</div>
                                                                    {warehouseDist.map((wh) => (
                                                                        <div key={wh.warehouse_id} className="flex justify-between items-center gap-4 text-sm">
                                                                            <span>{wh.warehouse_name}</span>
                                                                            <span className="font-medium">{wh.stock_quantity}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    )
                                                }
                                                
                                                return <span className="text-gray-700">{firstWarehouse?.warehouse_name || getWarehouseLabel(batch.warehouse_id)}</span>
                                            })()}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant="outline" className={`${status.className} font-normal border`}>
                                                {status.label}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-center text-muted-foreground">
                                            {manufacturedDate ? format(manufacturedDate, "dd/MM/yyyy") : "---"}
                                        </TableCell>
                                        <TableCell className="text-center text-muted-foreground">
                                            {expiredDate ? format(expiredDate, "dd/MM/yyyy") : "---"}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                {(() => {
                                                    const warehouseDist = batch.warehouse_distribution || []
                                                    const hasMultipleWarehouses = warehouseDist.length > 1
                                                    const totalStock = batch.stock_quantity
                                                    
                                                    if (hasMultipleWarehouses) {
                                                        return (
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <span className="font-medium cursor-help">
                                                                        {totalStock}
                                                                    </span>
                                                                </TooltipTrigger>
                                                                <TooltipContent className="bg-gray-900 text-white p-3 max-w-xs">
                                                                    <div className="space-y-1.5">
                                                                        <div className="font-semibold mb-2">Phân bổ tồn kho:</div>
                                                                        {warehouseDist.map((wh) => (
                                                                            <div key={wh.warehouse_id} className="flex justify-between items-center gap-4 text-sm">
                                                                                <span>{wh.warehouse_name}</span>
                                                                                <span className="font-medium">{wh.stock_quantity}</span>
                                                                            </div>
                                                                        ))}
                                                                        <div className="border-t border-gray-700 pt-1.5 mt-1.5 flex justify-between items-center text-sm font-semibold">
                                                                            <span>Tổng cộng:</span>
                                                                            <span>{totalStock}</span>
                                                                        </div>
                                                                    </div>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        )
                                                    }
                                                    
                                                    return <span className="font-medium">{totalStock}</span>
                                                })()}
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    onClick={(e) => {
                                                        e.preventDefault()
                                                        e.stopPropagation()
                                                        handleOpenAdjust(batch)
                                                    }}
                                                    title="Điều chỉnh tồn kho"
                                                >
                                                    <Pencil className="h-3 w-3 text-blue-500" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {!batch.is_default && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-muted-foreground hover:text-red-500"
                                                    onClick={() => handleDeleteBatch(batch)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                </div>
            )}

            {/* Adjust Stock Dialog */}
            <Dialog open={openAdjust} onOpenChange={setOpenAdjust}>
                <DialogContent className="max-w-[520px]">
                    <DialogHeader>
                        <DialogTitle>Điều chỉnh tồn kho theo lô</DialogTitle>
                        <DialogDescription className="sr-only">
                            Điều chỉnh số lượng tồn kho cho lô {adjustBatch?.code}
                        </DialogDescription>
                    </DialogHeader>

                    {adjustBatch && (
                        <div className="space-y-4">
                            <div className="text-sm bg-gray-50 p-3 rounded-md">
                                <div className="mb-2">
                                    <span className="text-muted-foreground">Mã lô:</span> <span className="font-medium text-blue-600">{adjustBatch.code}</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Kho:</span> <span className="font-medium">{(() => {
                                        const warehouseDist = adjustBatch.warehouse_distribution || []
                                        const selectedWarehouse = warehouseDist.find(w => w.warehouse_id === adjustWarehouseId)
                                        return selectedWarehouse?.warehouse_name || getWarehouseLabel(adjustBatch.warehouse_id)
                                    })()}</span>
                                </div>
                            </div>

                            <div>
                                <Label className="mb-1.5 block text-sm font-normal">Chọn kho</Label>
                                <Select 
                                    value={String(adjustWarehouseId || '')} 
                                    onValueChange={(value) => {
                                        const warehouseDist = adjustBatch.warehouse_distribution || []
                                        const selectedWarehouse = warehouseDist.find(w => String(w.warehouse_id) === value)
                                        setAdjustWarehouseId(value)
                                        
                                        // Cập nhật tồn kho theo kho được chọn
                                        const currentStock = selectedWarehouse?.stock_quantity || 0
                                        setAdjustValue(String(currentStock))
                                        setAdjustDelta("0")
                                    }}
                                >
                                    <SelectTrigger className="h-9 w-full">
                                        <SelectValue placeholder="Chọn kho" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {(adjustBatch.warehouse_distribution || []).map((wh) => (
                                            <SelectItem key={wh.warehouse_id} value={String(wh.warehouse_id)}>
                                                {wh.warehouse_name} ({wh.stock_quantity})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="mb-1.5 block text-sm font-normal">Điều chỉnh</Label>
                                    <Input
                                        type="number"
                                        value={adjustDelta}
                                        onChange={(e) => {
                                            const v = e.target.value
                                            setAdjustDelta(v)
                                            const warehouseDist = adjustBatch.warehouse_distribution || []
                                            const selectedWarehouse = warehouseDist.find(w => w.warehouse_id === adjustWarehouseId)
                                            const base = selectedWarehouse?.stock_quantity || 0
                                            const d = Number(v || 0)
                                            if (Number.isNaN(d)) return
                                            setAdjustValue(String(Math.max(0, base + d)))
                                        }}
                                    />
                                </div>
                                <div>
                                    <Label className="mb-1.5 block text-sm font-normal">Tồn kho mới</Label>
                                    <Input
                                        type="number"
                                        value={adjustValue}
                                        onChange={(e) => {
                                            const v = e.target.value
                                            setAdjustValue(v)
                                            const warehouseDist = adjustBatch.warehouse_distribution || []
                                            const selectedWarehouse = warehouseDist.find(w => w.warehouse_id === adjustWarehouseId)
                                            const base = selectedWarehouse?.stock_quantity || 0
                                            const n = Number(v || 0)
                                            if (Number.isNaN(n)) return
                                            setAdjustDelta(String(n - base))
                                        }}
                                        min={0}
                                    />
                                </div>
                            </div>

                            <div>
                                <Label className="mb-1.5 block text-sm font-normal">Lý do</Label>
                                <Select value={adjustReason} onValueChange={setAdjustReason}>
                                    <SelectTrigger className="w-full h-9">
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

                            <div className="flex justify-end gap-2 pt-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setOpenAdjust(false)}
                                    disabled={savingStock}
                                >
                                    Hủy
                                </Button>
                                <Button
                                    type="button"
                                    onClick={handleSaveAdjust}
                                    disabled={savingStock}
                                >
                                    {savingStock ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Đang lưu...
                                        </>
                                    ) : "Lưu"}
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}
