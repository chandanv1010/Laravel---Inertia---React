import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CalendarIcon, Plus, Info } from "lucide-react"
import { format, parseISO } from "date-fns"
import { useState, useEffect } from "react"
import { Link } from "@inertiajs/react"

interface BatchItem {
    code: string
    manufactured_at?: string | null
    expired_at?: string | null
    warehouse_id?: number | null
    stock_quantity?: number
}

interface BatchAddModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    warehouses: Array<{ value: string | number; label: string }>
    currentBatchCount?: number
    maxBatchCount?: number
    onSave: (batches: BatchItem[]) => Promise<void>
}

export function BatchAddModal({
    open,
    onOpenChange,
    warehouses,
    currentBatchCount = 0,
    maxBatchCount = 50,
    onSave
}: BatchAddModalProps) {
    const [batchItems, setBatchItems] = useState<Array<{
        code: string
        manufactured_at?: Date | undefined
        expired_at?: Date | undefined
        warehouse_id?: string | number
        stock_quantity: number
    }>>([{
        code: "",
        manufactured_at: undefined,
        expired_at: undefined,
        warehouse_id: warehouses[0]?.value || "",
        stock_quantity: 0
    }])
    const [saving, setSaving] = useState(false)
    const [errors, setErrors] = useState<Record<number, { code?: string }>>({})

    useEffect(() => {
        if (open) {
            setBatchItems([{
                code: "",
                manufactured_at: undefined,
                expired_at: undefined,
                warehouse_id: warehouses[0]?.value || "",
                stock_quantity: 0
            }])
            setErrors({})
            setSaving(false)
        }
    }, [open, warehouses])

    const validate = (): boolean => {
        const newErrors: Record<number, { code?: string }> = {}
        let isValid = true

        batchItems.forEach((item, index) => {
            if (!item.code || item.code.trim() === "") {
                newErrors[index] = { code: "Mã lô là bắt buộc" }
                isValid = false
            }
        })

        setErrors(newErrors)
        return isValid
    }

    const handleAddAnother = () => {
        if (batchItems.length >= maxBatchCount) return
        setBatchItems([...batchItems, {
            code: "",
            manufactured_at: undefined,
            expired_at: undefined,
            warehouse_id: warehouses[0]?.value || "",
            stock_quantity: 0
        }])
    }

    const handleRemoveItem = (index: number) => {
        if (batchItems.length === 1) return
        setBatchItems(batchItems.filter((_, i) => i !== index))
        const newErrors = { ...errors }
        delete newErrors[index]
        setErrors(newErrors)
    }

    const handleItemChange = (index: number, field: string, value: any) => {
        const newItems = [...batchItems]
        newItems[index] = { ...newItems[index], [field]: value }
        setBatchItems(newItems)
        
        // Clear error for this field
        if (errors[index]) {
            const newErrors = { ...errors }
            delete newErrors[index]
            setErrors(newErrors)
        }
    }

    const handleSave = async () => {
        if (!validate()) return

        setSaving(true)
        try {
            const batchesToSave: BatchItem[] = batchItems.map(item => ({
                code: item.code.trim(),
                manufactured_at: item.manufactured_at ? format(item.manufactured_at, 'yyyy-MM-dd') : null,
                expired_at: item.expired_at ? format(item.expired_at, 'yyyy-MM-dd') : null,
                warehouse_id: item.warehouse_id ? Number(item.warehouse_id) : null,
                stock_quantity: item.stock_quantity || 0,
            }))
            await onSave(batchesToSave)
            onOpenChange(false)
        } catch (error) {
            console.error('Failed to save batch:', error)
        } finally {
            setSaving(false)
        }
    }

    const addedCount = batchItems.length
    const totalAfterAdd = currentBatchCount + addedCount
    const remainingCount = Math.max(0, maxBatchCount - totalAfterAdd)

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent 
                className="!max-w-[1100px] !w-[1100px] max-h-[90vh] overflow-y-auto !left-[50%] !top-[50%] !translate-x-[-50%] !translate-y-[-50%]" 
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
                <DialogHeader>
                    <DialogTitle className="font-normal">Thêm lô sản phẩm</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Info Banner */}
                    <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                            Bạn đã thêm {addedCount}/{maxBatchCount} lô. Còn có thể thêm {remainingCount} lô cho sản phẩm này.
                        </AlertDescription>
                    </Alert>

                    {/* Batch Items - Header row */}
                    <div className="grid grid-cols-12 gap-3 pb-2 border-b">
                        <div className="col-span-2">
                            <Label>
                                Mã lô <span className="text-red-500">*</span>
                            </Label>
                        </div>
                        <div className="col-span-2">
                            <Label>Ngày sản xuất</Label>
                        </div>
                        <div className="col-span-2">
                            <Label>Hạn sử dụng</Label>
                        </div>
                        <div className="col-span-3">
                            <Label>Lưu kho tại</Label>
                        </div>
                        <div className="col-span-2">
                            <Label>Số lượng</Label>
                        </div>
                        <div className="col-span-1">
                            <Label>&nbsp;</Label>
                        </div>
                    </div>

                    {/* Batch Items - Rows */}
                    {batchItems.map((item, index) => (
                        <div key={index} className="grid grid-cols-12 gap-3 items-start py-2">
                            {/* Mã lô */}
                            <div className="col-span-2 space-y-2">
                                <Input
                                    id={`batch_code_${index}`}
                                    value={item.code}
                                    onChange={(e) => handleItemChange(index, 'code', e.target.value)}
                                    placeholder="Nhập/quét mã lô"
                                    className={errors[index]?.code ? "border-red-500" : ""}
                                />
                                {errors[index]?.code && (
                                    <p className="text-sm text-red-500">{errors[index].code}</p>
                                )}
                            </div>

                            {/* Ngày sản xuất */}
                            <div className="col-span-2 space-y-2">
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className="w-full justify-start text-left font-normal text-xs"
                                        >
                                            <CalendarIcon className="mr-1 h-3 w-3" />
                                            {item.manufactured_at ? format(item.manufactured_at, 'dd/MM/yyyy') : "dd/MM/yyyy"}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar
                                            mode="single"
                                            selected={item.manufactured_at}
                                            onSelect={(date) => handleItemChange(index, 'manufactured_at', date)}
                                            captionLayout="dropdown"
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>

                            {/* Hạn sử dụng */}
                            <div className="col-span-2 space-y-2">
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className="w-full justify-start text-left font-normal text-xs"
                                        >
                                            <CalendarIcon className="mr-1 h-3 w-3" />
                                            {item.expired_at ? format(item.expired_at, 'dd/MM/yyyy') : "dd/MM/yyyy"}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar
                                            mode="single"
                                            selected={item.expired_at}
                                            onSelect={(date) => handleItemChange(index, 'expired_at', date)}
                                            captionLayout="dropdown"
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>

                            {/* Lưu kho tại */}
                            <div className="col-span-3 space-y-2">
                                <Select 
                                    value={String(item.warehouse_id || "")} 
                                    onValueChange={(v) => handleItemChange(index, 'warehouse_id', v)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Chọn kho" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {warehouses.map((warehouse) => (
                                            <SelectItem key={warehouse.value} value={String(warehouse.value)}>
                                                {warehouse.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Số lượng */}
                            <div className="col-span-2 space-y-2">
                                <Input
                                    type="number"
                                    min="0"
                                    value={item.stock_quantity}
                                    onChange={(e) => handleItemChange(index, 'stock_quantity', parseInt(e.target.value) || 0)}
                                    placeholder="0"
                                />
                            </div>

                            {/* Nút xóa */}
                            <div className="col-span-1 space-y-2">
                                {batchItems.length > 1 && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleRemoveItem(index)}
                                        className="h-9 px-2 text-red-500 hover:text-red-700"
                                    >
                                        Xóa
                                    </Button>
                                )}
                            </div>
                        </div>
                    ))}

                    {/* Thêm lô khác link */}
                    {batchItems.length < maxBatchCount && (
                        <div className="pt-2">
                            <Link
                                href="#"
                                onClick={(e) => {
                                    e.preventDefault()
                                    handleAddAnother()
                                }}
                                className="text-blue-600 hover:underline text-sm flex items-center gap-1"
                            >
                                <Plus className="h-3 w-3" />
                                Thêm lô khác
                            </Link>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={saving}
                    >
                        Hủy
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={saving || batchItems.length === 0}
                    >
                        {saving ? "Đang lưu..." : "Thêm lô"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
