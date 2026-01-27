import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Search, Trash2, Star, CalendarIcon, Info, Loader2 } from "lucide-react"
// import { Link } from "@inertiajs/react"
import { format, parseISO, isBefore } from "date-fns"
import { useState, useMemo, useCallback, useEffect, useRef } from "react"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { toast } from "sonner"

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
}

interface BatchListModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    batches: Batch[]
    warehouses: Array<{ value: string | number; label: string }>
    onDelete?: (batchId: number) => Promise<void>
    onBatchClick?: (batchId: number) => void
    onRefresh?: () => void // Callback to refresh batches list
    isLoading?: boolean
    productId: number
}

export function BatchListModal({
    open,
    onOpenChange,
    batches,
    // warehouses,
    onDelete,
    onBatchClick,
    onRefresh,
    isLoading = false
}: BatchListModalProps) {
    const [searchQuery, setSearchQuery] = useState("")
    const [statusFilter, setStatusFilter] = useState<string>("all")
    const [updatingBatchId, setUpdatingBatchId] = useState<number | null>(null)
    const [optimisticBatches, setOptimisticBatches] = useState<Batch[]>(batches)
    const pendingDefaultId = useRef<number | null>(null) // To track pending optimistic update

    // Sync optimisticBatches when props.batches changes
    useEffect(() => {
        // Only sync if we are NOT waiting for a specific batch to become default
        // OR if the incoming batches match our pending expectation
        if (pendingDefaultId.current !== null) {
            const pendingBatch = batches.find(b => b.id === pendingDefaultId.current)
            if (pendingBatch && pendingBatch.is_default) {
                // The pending update has arrived! Sync and clear ref.
                pendingDefaultId.current = null
                setOptimisticBatches(batches)
            }
            // Else: The props update is 'stale' or unrelated (e.g. from previous click). Ignore it to keep UI optimistic.
        } else {
            // No pending update, just sync normally
            setOptimisticBatches(batches)
        }
    }, [batches])

    // Get warehouse name by ID
    // const getWarehouseName = (warehouseId: number | null) => {
    //     if (!warehouseId) return 'N/A'
    //     const warehouse = warehouses.find(w => Number(w.value) === Number(warehouseId))
    //     return warehouse?.label || 'N/A'
    // }

    // Get batch status - Còn hạn hoặc Hết hạn dựa trên hạn sử dụng
    const getBatchStatus = (batch: Batch): { label: string; className: string } => {
        if (!batch.expired_at) {
            return {
                label: "Còn hạn",
                className: "bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100"
            }
        }
        try {
            const expiredDate = parseISO(batch.expired_at)
            if (isBefore(expiredDate, new Date())) {
                return {
                    label: "Hết hạn",
                    className: "bg-red-50 text-red-600 border-red-100 hover:bg-red-100"
                }
            }
            return {
                label: "Còn hạn",
                className: "bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100"
            }
        } catch {
            return {
                label: "Còn hạn",
                className: "bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100"
            }
        }
    }

    // API fetch helper
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

    // Handle update batch date
    const handleUpdateBatchDate = useCallback(async (batchId: number, field: 'manufactured_at' | 'expired_at', date: Date | undefined) => {
        setUpdatingBatchId(batchId)
        try {
            const response = await apiFetch(`/backend/product-batches/${batchId}`, {
                method: 'PATCH',
                body: JSON.stringify({
                    [field]: date ? format(date, 'yyyy-MM-dd') : null
                }),
            })

            if (response.ok) {
                toast.success('Cập nhật thành công')
                onRefresh?.()
            } else {
                const error = await response.json()
                toast.error(error.message || 'Có lỗi xảy ra khi cập nhật')
            }
        } catch (error) {
            console.error('Failed to update batch date:', error)
            toast.error('Có lỗi xảy ra khi cập nhật')
        } finally {
            setUpdatingBatchId(null)
        }
    }, [apiFetch, onRefresh])

    // Handle set default batch (Optimistic UI)
    const handleSetDefaultBatch = useCallback(async (batchId: number) => {
        // Track this as the pending default
        pendingDefaultId.current = batchId

        // Store previous state for rollback
        const previousBatches = [...optimisticBatches]

        // Optimistic update
        setOptimisticBatches(prev => prev.map(b => ({
            ...b,
            is_default: b.id === batchId
        })))

        try {
            const response = await apiFetch(`/backend/product-batches/${batchId}`, {
                method: 'PATCH',
                body: JSON.stringify({ is_default: true }),
            })

            if (response.ok) {
                toast.success('Đã chuyển lô mặc định thành công')
                onRefresh?.()
            } else {
                // Rollback on API error
                setOptimisticBatches(previousBatches)
                pendingDefaultId.current = null // Clear pending on error
                const error = await response.json()
                toast.error(error.message || 'Có lỗi xảy ra khi chuyển lô mặc định')
            }
        } catch (error) {
            // Rollback on network error
            setOptimisticBatches(previousBatches)
            pendingDefaultId.current = null // Clear pending on error
            console.error('Failed to set default batch:', error)
            toast.error('Có lỗi xảy ra khi chuyển lô mặc định')
        }
    }, [apiFetch, onRefresh, optimisticBatches]) // Added optimisticBatches to dependency

    // Filter batches
    const filteredBatches = useMemo(() => {
        let filtered = optimisticBatches

        // Search filter
        if (searchQuery.trim()) {
            filtered = filtered.filter(batch =>
                batch.code.toLowerCase().includes(searchQuery.toLowerCase())
            )
        }

        // Status filter
        if (statusFilter !== "all") {
            filtered = filtered.filter(batch => {
                const status = getBatchStatus(batch)
                if (statusFilter === "expired") {
                    return status.label === "Hết hạn"
                }
                if (statusFilter === "valid") {
                    return status.label === "Còn hạn"
                }
                return true
            })
        }

        return filtered
    }, [optimisticBatches, searchQuery, statusFilter])

    const handleDelete = async (batchId: number) => {
        if (window.confirm("Bạn có chắc chắn muốn xóa lô này?")) {
            await onDelete?.(batchId)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="!max-w-[1100px] !w-[1100px] max-h-[90vh] flex flex-col overflow-hidden !left-[50%] !top-[50%] !translate-x-[-50%] !translate-y-[-50%] p-0 gap-0"
                style={{
                    left: '50% !important',
                    top: '50% !important',
                    transform: 'translate(-50%, -50%) !important',
                    width: '1100px !important',
                    maxWidth: '1100px !important',
                    marginLeft: '0 !important',
                    marginTop: '0 !important'
                } as React.CSSProperties}
            >
                <DialogHeader className="p-6 border-b">
                    <DialogTitle>Danh sách lô</DialogTitle>
                </DialogHeader>

                <div className="flex flex-col min-h-0 overflow-hidden">
                    {/* Search and Filter */}
                    <div className="flex items-center gap-3 px-6 py-4 shrink-0">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Tìm kiếm theo mã lô"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 h-10 border-blue-500"
                            />
                        </div>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-[150px] h-10">
                                <SelectValue placeholder="Trạng thái" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Tất cả</SelectItem>
                                <SelectItem value="valid">Còn hạn</SelectItem>
                                <SelectItem value="expired">Hết hạn</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Batch List Table */}
                    <div className="flex-1 overflow-auto border-t">
                            <Table>
                                <TableHeader>
                                <TableRow className="bg-gray-50 hover:bg-gray-50 sticky top-0 z-10 border-b">
                                    <TableHead className="font-semibold text-gray-900 pl-6 h-12 text-sm">Mã lô</TableHead>
                                    <TableHead className="font-semibold text-gray-900 h-12 text-sm">Kho</TableHead>
                                    <TableHead className="font-semibold text-gray-900 h-12 text-sm">Ngày tạo</TableHead>
                                    <TableHead className="font-semibold text-gray-900 h-12 text-sm">Trạng thái</TableHead>
                                    <TableHead className="font-semibold text-gray-900 h-12 text-sm">Ngày sản xuất</TableHead>
                                    <TableHead className="font-semibold text-gray-900 h-12 text-sm">Hạn sử dụng</TableHead>
                                    <TableHead className="font-semibold text-gray-900 text-right h-12 text-sm">Tổng tồn kho</TableHead>
                                    <TableHead className="font-semibold text-gray-900 text-right h-12 text-sm">
                                        <div className="flex items-center justify-end gap-1">
                                                Mặc định
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Info className="h-4 w-4 text-blue-500 cursor-help" />
                                                    </TooltipTrigger>
                                                    <TooltipContent className="bg-black text-white max-w-xs">
                                                        <p>Lô mặc định là lô được hệ thống chọn khi không xác định được lô để thêm vào giao dịch hoặc điều chỉnh số lượng. Mặc định hệ thống chọn lô đầu tiên của sản phẩm, bạn có thể thay đổi nếu cần.</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </div>
                                        </TableHead>
                                    <TableHead className="w-[50px] pr-6 h-12"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading && filteredBatches.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={9} className="h-40 text-center">
                                                <div className="flex flex-col items-center justify-center gap-2">
                                                    <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                                                    <span className="text-sm text-muted-foreground">Đang tải dữ liệu...</span>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : filteredBatches.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">
                                                Không tìm thấy lô nào
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredBatches.map((batch) => {
                                            const status = getBatchStatus(batch)
                                            const manufacturedDate = batch.manufactured_at ? parseISO(batch.manufactured_at) : undefined
                                            const expiredDate = batch.expired_at ? parseISO(batch.expired_at) : undefined
                                            // Parse created_at safely - handle both ISO and d/m/Y H:i formats
                                            let createdDate: Date | undefined = undefined
                                            if (batch.created_at) {
                                                try {
                                                    // Try ISO format first
                                                    createdDate = parseISO(batch.created_at)
                                                    // If parseISO returns Invalid Date, try parsing d/m/Y H:i format
                                                    if (isNaN(createdDate.getTime())) {
                                                        const parts = batch.created_at.match(/(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})/)
                                                        if (parts) {
                                                            createdDate = new Date(
                                                                parseInt(parts[3]), // year
                                                                parseInt(parts[2]) - 1, // month (0-indexed)
                                                                parseInt(parts[1]), // day
                                                                parseInt(parts[4]), // hour
                                                                parseInt(parts[5]) // minute
                                                            )
                                                        }
                                                    }
                                                } catch {
                                                    createdDate = undefined
                                                }
                                            }

                                            // Determine default values for display if null
                                            const defaultManufacturedText = 'dd/MM/yyyy'
                                            const defaultExpiredText = 'dd/MM/yyyy'

                                            return (
                                                <TableRow key={batch.id} className="border-b hover:bg-gray-50/50">
                                                    <TableCell className="pl-6 py-4">
                                                        {onBatchClick ? (
                                                            <button
                                                                onClick={() => onBatchClick(batch.id)}
                                                                className="font-bold text-blue-600 hover:underline"
                                                            >
                                                                {batch.code}
                                                            </button>
                                                        ) : (
                                                            <a
                                                                href={`/backend/product-batches/${batch.id}/detail`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="font-bold text-blue-600 hover:underline"
                                                            >
                                                                {batch.code}
                                                            </a>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="py-4">
                                                        {(() => {
                                                            const warehouseDist = batch.warehouse_distribution || []
                                                            const hasMultipleWarehouses = warehouseDist.length > 1
                                                            const firstWarehouse = warehouseDist[0]
                                                            
                                                            if (!firstWarehouse) {
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
                                                                                {warehouseDist.map((wh, idx) => (
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
                                                            
                                                            return <span className="text-gray-700">{firstWarehouse.warehouse_name}</span>
                                                        })()}
                                                    </TableCell>
                                                    <TableCell className="py-4 text-gray-700">
                                                        {createdDate ? format(createdDate, 'dd/MM/yyyy HH:mm') : 'N/A'}
                                                    </TableCell>
                                                    <TableCell className="py-4">
                                                        <Badge
                                                            variant="outline"
                                                            className={`rounded-full px-3 py-1 font-normal border ${status.className}`}
                                                        >
                                                            {status.label}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="py-4">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="text-gray-700">
                                                                {manufacturedDate ? format(manufacturedDate, 'dd/MM/yyyy') : defaultManufacturedText}
                                                            </span>
                                                        <Popover>
                                                            <PopoverTrigger asChild>
                                                                    <button
                                                                        className="text-gray-400 hover:text-gray-600 p-0.5"
                                                                    disabled={updatingBatchId === batch.id}
                                                                >
                                                                        <CalendarIcon className="h-3.5 w-3.5" />
                                                                    </button>
                                                            </PopoverTrigger>
                                                            <PopoverContent className="w-auto p-0">
                                                                <Calendar
                                                                    mode="single"
                                                                    selected={manufacturedDate}
                                                                    onSelect={(date) => {
                                                                        if (date) {
                                                                            handleUpdateBatchDate(batch.id, 'manufactured_at', date)
                                                                        }
                                                                    }}
                                                                    captionLayout="dropdown"
                                                                />
                                                            </PopoverContent>
                                                        </Popover>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="py-4">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="text-gray-700">
                                                                {expiredDate ? format(expiredDate, 'dd/MM/yyyy') : defaultExpiredText}
                                                            </span>
                                                        <Popover>
                                                            <PopoverTrigger asChild>
                                                                    <button
                                                                        className="text-gray-400 hover:text-gray-600 p-0.5"
                                                                    disabled={updatingBatchId === batch.id}
                                                                >
                                                                        <CalendarIcon className="h-3.5 w-3.5" />
                                                                    </button>
                                                            </PopoverTrigger>
                                                            <PopoverContent className="w-auto p-0">
                                                                <Calendar
                                                                    mode="single"
                                                                    selected={expiredDate}
                                                                    onSelect={(date) => {
                                                                        if (date) {
                                                                            handleUpdateBatchDate(batch.id, 'expired_at', date)
                                                                        }
                                                                    }}
                                                                    captionLayout="dropdown"
                                                                />
                                                            </PopoverContent>
                                                        </Popover>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="py-4 text-right">
                                                        {(() => {
                                                            const warehouseDist = batch.warehouse_distribution || []
                                                            const hasMultipleWarehouses = warehouseDist.length > 1
                                                            const totalStock = batch.stock_quantity
                                                            
                                                            if (hasMultipleWarehouses) {
                                                                return (
                                                                    <Tooltip>
                                                                        <TooltipTrigger asChild>
                                                                            <span className="text-gray-700 cursor-help font-medium">
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
                                                            
                                                            return <span className="text-gray-700 font-medium">{totalStock}</span>
                                                        })()}
                                                    </TableCell>
                                                    <TableCell className="py-4 text-right">
                                                        <button
                                                            type="button"
                                                            onClick={() => !batch.is_default && handleSetDefaultBatch(batch.id)}
                                                            className="cursor-pointer inline-flex justify-center"
                                                            disabled={batch.is_default}
                                                            title={batch.is_default ? 'Lô mặc định' : 'Click để đặt làm lô mặc định'}
                                                        >
                                                            {batch.is_default ? (
                                                                <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
                                                            ) : (
                                                                <Star className="h-5 w-5 text-gray-200 hover:text-amber-500" />
                                                            )}
                                                        </button>
                                                    </TableCell>
                                                    <TableCell className="pr-6 py-4 text-right">
                                                        {onDelete && (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => handleDelete(batch.id)}
                                                                className="h-8 w-8 text-gray-400 hover:text-red-500 hover:bg-red-50"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            )
                                        })
                                    )}
                                </TableBody>
                            </Table>
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4">
                        <div className="text-sm text-gray-700">
                            Tổng cộng: {filteredBatches.length} lô
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}

