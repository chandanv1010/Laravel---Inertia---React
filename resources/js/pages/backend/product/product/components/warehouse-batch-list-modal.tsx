
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Search, Pencil, Loader2 } from "lucide-react"
import { format, parseISO, isBefore } from "date-fns"
import { useState, useMemo, useCallback, useEffect } from "react"
import { toast } from "sonner"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

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
}

interface WarehouseBatchListModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    warehouseId: string | number
    warehouseName: string
    productId: number
    onRefresh?: () => void
    isVariant?: boolean
    variantId?: number
}

export function WarehouseBatchListModal({
    open,
    onOpenChange,
    warehouseId,
    warehouseName,
    productId,
    onRefresh,
    isVariant = false,
    variantId
}: WarehouseBatchListModalProps) {
    const [searchQuery, setSearchQuery] = useState("")
    const [batches, setBatches] = useState<Batch[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [editingBatchId, setEditingBatchId] = useState<number | null>(null)
    const [adjustValue, setAdjustValue] = useState<string>("")
    const [adjustDelta, setAdjustDelta] = useState<string>("0")
    const [adjustReason, setAdjustReason] = useState<string>("Thực tế")
    const [adjustWarehouseId, setAdjustWarehouseId] = useState<string | number | null>(null)
    const [saving, setSaving] = useState(false)

    // Helper to get cookie
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

    // Fetch batches
    const fetchBatches = useCallback(async () => {
        if (!productId) return
        setIsLoading(true)
        try {
            // Nếu là variant, PHẢI dùng endpoint variant batches
            // Khi isVariant=true, dùng productId làm variantId (vì productId được truyền là variant.id)
            const actualVariantId = variantId || productId
            // Fetch all batches for the product/variant, we'll filter by warehouse locally
            const url = isVariant
                ? `/backend/product-variant/${actualVariantId}/batches?_t=${Date.now()}`
                : `/backend/product/${productId}/batches?_t=${Date.now()}`
            const response = await apiFetch(url)
            if (response.ok) {
                const data = await response.json()
                const allBatches = data.data || []
                // Filter by warehouse: hiển thị batches có stock trong kho này
                // Với cấu trúc mới, dùng warehouse_distribution để check
                const warehouseBatches = allBatches.filter((b: Batch) => {
                    // New structure: check warehouse_distribution
                    if (b.warehouse_distribution && b.warehouse_distribution.length > 0) {
                        return b.warehouse_distribution.some(
                            wd => String(wd.warehouse_id) === String(warehouseId) && wd.stock_quantity > 0
                        )
                    }
                    // Legacy fallback: check warehouse_id directly
                    return b.warehouse_id === null || String(b.warehouse_id) === String(warehouseId)
                })
                setBatches(warehouseBatches)
            }
        } catch (error) {
            console.error('Failed to fetch batches:', error)
            toast.error('Không thể tải danh sách lô')
        } finally {
            setIsLoading(false)
        }
    }, [productId, warehouseId, apiFetch, isVariant, variantId])

    useEffect(() => {
        if (open) {
            fetchBatches()
        }
    }, [open, fetchBatches, isVariant, variantId])

    // Helper: status
    const getBatchStatus = (batch: Batch) => {
        if (!batch.expired_at) return { label: "Còn hạn", className: "bg-emerald-50 text-emerald-600 border-emerald-100" }
        try {
            const expired = parseISO(batch.expired_at)
            if (isBefore(expired, new Date())) return { label: "Hết hạn", className: "bg-red-50 text-red-600 border-red-100" }
            return { label: "Còn hạn", className: "bg-emerald-50 text-emerald-600 border-emerald-100" }
        } catch {
            return { label: "Còn hạn", className: "bg-emerald-50 text-emerald-600 border-emerald-100" }
        }
    }

    const filteredBatches = useMemo(() => {
        if (!searchQuery.trim()) return batches
        const q = searchQuery.toLowerCase()
        return batches.filter(b => b.code.toLowerCase().includes(q))
    }, [batches, searchQuery])

    // Adjust Logic
    const handleOpenAdjust = (batch: Batch) => {
        setEditingBatchId(batch.id)
        // Lấy warehouse đầu tiên có số lượng > 0 hoặc warehouse hiện tại
        const warehouseDist = batch.warehouse_distribution || []
        const firstWarehouse = warehouseDist.length > 0 
            ? warehouseDist[0] 
            : null
        
        const selectedWarehouseId = firstWarehouse?.warehouse_id || batch.warehouse_id || warehouseId
        setAdjustWarehouseId(selectedWarehouseId)
        
        // Hiển thị tồn kho của kho được chọn
        const selectedWarehouseStock = warehouseDist.find(w => w.warehouse_id === selectedWarehouseId)?.stock_quantity || batch.stock_quantity
        setAdjustValue(String(selectedWarehouseStock))
        setAdjustDelta("0")
        setAdjustReason("Thực tế")
    }

    const handleSaveAdjust = async (batchId: number) => {
        const batch = batches.find(b => b.id === batchId)
        if (!batch) return

        if (!adjustWarehouseId) {
            toast.error('Vui lòng chọn kho')
            return
        }

        const n = Number(adjustValue)
        if (Number.isNaN(n) || n < 0) return

        setSaving(true)
        try {
            const response = await apiFetch(`/backend/product-batches/${batchId}`, {
                method: 'PATCH',
                body: JSON.stringify({
                    stock_quantity: n,
                    warehouse_id: adjustWarehouseId,
                    reason: adjustReason
                }),
            })

            if (response.ok) {
                toast.success('Cập nhật tồn kho thành công')
                setEditingBatchId(null)
                setAdjustWarehouseId(null)
                await fetchBatches()
                onRefresh?.() // Notify parent to refresh general layout if needed
            } else {
                const error = await response.json()
                toast.error(error.message || 'Có lỗi xảy ra')
            }
        } catch (error) {
            console.error('Failed to update stock:', error)
            toast.error('Có lỗi xảy ra')
        } finally {
            setSaving(false)
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
                    <DialogTitle>Điều chỉnh tồn kho theo lô</DialogTitle>
                </DialogHeader>

                <div className="flex flex-col min-h-0 overflow-hidden">
                    {/* Controls & Filter */}
                    <div className="px-6 py-4 space-y-3 shrink-0">
                        <div className="flex items-center gap-4">
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input
                                    placeholder="Tìm kiếm theo mã lô"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    className="pl-9 h-10 rounded-md border-gray-300"
                                />
                            </div>
                            <div className="text-sm text-gray-600 whitespace-nowrap">
                                Chi nhánh: {warehouseName}
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <Badge
                                variant="secondary"
                                className="bg-blue-50 text-blue-700 hover:bg-blue-50 rounded-full px-3 py-1 font-normal border-0"
                            >
                                Chi nhánh: {warehouseName}
                            </Badge>
                        </div>
                    </div>

                    {/* Table - Full Width */}
                    <div className="flex-1 overflow-auto border-t">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-gray-100 hover:bg-gray-100 sticky top-0 z-10">
                                    <TableHead className="font-bold text-gray-900 pl-6 h-10 text-[13px]">Mã lô</TableHead>
                                    <TableHead className="font-bold text-gray-900 h-10 text-[13px]">Chi nhánh</TableHead>
                                    <TableHead className="font-bold text-gray-900 h-10 text-[13px]">Trạng thái</TableHead>
                                    <TableHead className="font-bold text-gray-900 text-right h-10 text-[13px]">Tồn kho</TableHead>
                                    <TableHead className="w-[50px] pr-6 h-10"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-40 text-center">
                                            <div className="flex flex-col justify-center items-center gap-2">
                                                <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                                                <span className="text-muted-foreground text-sm">Đang tải...</span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : filteredBatches.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                                            Không có lô nào trong kho này
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredBatches.map(batch => {
                                        const status = getBatchStatus(batch)
                                        return (
                                            <TableRow key={batch.id} className="hover:bg-gray-50/50">
                                                <TableCell className="font-medium text-blue-600 pl-6 py-3">{batch.code}</TableCell>
                                                <TableCell className="py-3 max-w-[200px] truncate" title={warehouseName}>{warehouseName}</TableCell>
                                                <TableCell className="py-3">
                                                    <Badge variant="outline" className={`rounded-full px-3 font-normal border ${status.className}`}>
                                                        {status.label}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right py-3">
                                                    {(() => {
                                                        // Hiển thị tồn kho cho kho đang xem
                                                        if (batch.warehouse_distribution && batch.warehouse_distribution.length > 0) {
                                                            const warehouseStock = batch.warehouse_distribution.find(
                                                                wd => String(wd.warehouse_id) === String(warehouseId)
                                                            )
                                                            return warehouseStock?.stock_quantity || 0
                                                        }
                                                        // Legacy fallback
                                                        return batch.stock_quantity
                                                    })()}
                                                </TableCell>
                                                <TableCell className="pr-6 py-3">
                                                    <Popover open={editingBatchId === batch.id} onOpenChange={(open) => {
                                                        if (open) handleOpenAdjust(batch)
                                                        else setEditingBatchId(null)
                                                    }}>
                                                        <PopoverTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 !cursor-pointer">
                                                                <Pencil className="h-4 w-4 text-gray-400" />
                                                            </Button>
                                                        </PopoverTrigger>
                                                        <PopoverContent className="w-80" align="end">
                                                            <div className="space-y-4">
                                                                <div>
                                                                    <div className="text-sm text-gray-600 mb-1">
                                                                        <span className="text-blue-600 font-medium">{batch.code}</span>
                                                                    </div>
                                                                    <div className="text-xs text-gray-500">
                                                                        Kho: {(() => {
                                                                            const warehouseDist = batch.warehouse_distribution || []
                                                                            const selectedWarehouse = warehouseDist.find(w => w.warehouse_id === adjustWarehouseId)
                                                                            return selectedWarehouse?.warehouse_name || batch.warehouse_name || 'Chưa xác định'
                                                                        })()}
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    <Label className="text-xs mb-1.5 block">Chọn kho</Label>
                                                                    <Select 
                                                                        value={String(adjustWarehouseId || '')} 
                                                                        onValueChange={(value) => {
                                                                            const warehouseDist = batch.warehouse_distribution || []
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
                                                                            {(batch.warehouse_distribution || []).map((wh) => (
                                                                                <SelectItem key={wh.warehouse_id} value={String(wh.warehouse_id)}>
                                                                                    {wh.warehouse_name} ({wh.stock_quantity})
                                                                                </SelectItem>
                                                                            ))}
                                                                        </SelectContent>
                                                                    </Select>
                                                                </div>
                                                                <div className="grid grid-cols-2 gap-4">
                                                                    <div>
                                                                        <Label className="text-xs mb-1.5 block">Điều chỉnh</Label>
                                                                        <Input
                                                                            type="number"
                                                                            value={adjustDelta}
                                                                            onChange={e => {
                                                                                const v = e.target.value
                                                                                setAdjustDelta(v)
                                                                                const warehouseDist = batch.warehouse_distribution || []
                                                                                const selectedWarehouse = warehouseDist.find(w => w.warehouse_id === adjustWarehouseId)
                                                                                const currentStock = selectedWarehouse?.stock_quantity || 0
                                                                                const newStock = Math.max(0, currentStock + Number(v))
                                                                                setAdjustValue(String(newStock))
                                                                            }}
                                                                        />
                                                                    </div>
                                                                    <div>
                                                                        <Label className="text-xs mb-1.5 block">Tồn kho mới</Label>
                                                                        <Input
                                                                            type="number"
                                                                            value={adjustValue}
                                                                            onChange={e => {
                                                                                const v = e.target.value
                                                                                setAdjustValue(v)
                                                                                const warehouseDist = batch.warehouse_distribution || []
                                                                                const selectedWarehouse = warehouseDist.find(w => w.warehouse_id === adjustWarehouseId)
                                                                                const currentStock = selectedWarehouse?.stock_quantity || 0
                                                                                setAdjustDelta(String(Number(v) - currentStock))
                                                                            }}
                                                                            min={0}
                                                                        />
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    <Label className="text-xs mb-1.5 block">Lý do</Label>
                                                                    <Select value={adjustReason} onValueChange={setAdjustReason}>
                                                                        <SelectTrigger className="h-9 w-full">
                                                                            <SelectValue />
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
                                                                    <Button variant="outline" size="sm" onClick={() => {
                                                                        setEditingBatchId(null)
                                                                        setAdjustWarehouseId(null)
                                                                    }}>Hủy</Button>
                                                                    <Button size="sm" onClick={() => handleSaveAdjust(batch.id)} disabled={saving}>
                                                                        {saving ? 'Lưu...' : 'Lưu'}
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        </PopoverContent>
                                                    </Popover>
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>
                    {/* Footer */}
                    <div className="px-6 py-4 border-t bg-gray-50/50">
                        <div className="text-xs text-muted-foreground font-medium">
                            Từ 1 đến {filteredBatches.length} trên tổng {filteredBatches.length}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
