import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useState, useEffect } from "react"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

interface StorageLocationModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    warehouseId?: string | number
    warehouses: Array<{ value: string | number; label: string }>
    location?: string
    onConfirm: (warehouseId: string | number, location: string) => void
}

const STORAGE_LOCATION_EXAMPLES = ["A-D10-K456", "A-K456", "A"]

export function StorageLocationModal({
    open,
    onOpenChange,
    warehouseId,
    warehouses,
    location = "",
    onConfirm
}: StorageLocationModalProps) {
    const [selectedWarehouseId, setSelectedWarehouseId] = useState<string | number>(warehouseId || warehouses[0]?.value || "")
    const [storageLocation, setStorageLocation] = useState(location)
    const [errors, setErrors] = useState<{ location?: string }>({})

    useEffect(() => {
        if (open) {
            setSelectedWarehouseId(warehouseId || warehouses[0]?.value || "")
            setStorageLocation(location)
            setErrors({})
        }
    }, [open, warehouseId, warehouses, location])

    const validateLocation = (value: string): boolean => {
        if (!value || value.trim() === "") {
            setErrors({})
            return true // Empty is valid (optional)
        }

        // Rule 1: Must start with 1 uppercase letter (A-Z)
        if (!/^[A-Z]/.test(value)) {
            setErrors({ location: "Phải bắt đầu bằng 1 chữ cái in hoa (A-Z)" })
            return false
        }

        // Rule 2: Each level separated by "-"
        // Rule 3: Each level consists of 1 letter (A-Z) + arbitrary numbers
        const parts = value.split("-")
        const isValidFormat = parts.every(part => {
            // Each part should match: 1 letter (A-Z) followed by optional numbers
            return /^[A-Z]\d*$/.test(part)
        })

        if (!isValidFormat) {
            setErrors({ location: "Mỗi cấp phân cách bằng dấu \"-\", mỗi cấp gồm 1 chữ cái (A-Z) + số tùy ý" })
            return false
        }

        setErrors({})
        return true
    }

    const handleLocationChange = (value: string) => {
        setStorageLocation(value)
        if (errors.location) {
            validateLocation(value)
        }
    }

    const handleExampleClick = (example: string) => {
        setStorageLocation(example)
        validateLocation(example)
    }

    const handleConfirm = () => {
        if (!selectedWarehouseId) {
            return
        }

        if (validateLocation(storageLocation)) {
            onConfirm(selectedWarehouseId, storageLocation.trim())
            onOpenChange(false)
        }
    }

    const selectedWarehouse = warehouses.find(w => w.value == selectedWarehouseId)

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="font-normal">
                        Thiết lập vị trí lưu kho {selectedWarehouse ? `tại ${selectedWarehouse.label}` : ""}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {warehouses.length > 1 && (
                        <div className="space-y-2">
                            <Label className="font-normal">Chọn kho</Label>
                            <Select
                                value={selectedWarehouseId.toString()}
                                onValueChange={(val) => setSelectedWarehouseId(val)}
                            >
                                <SelectTrigger className="font-normal">
                                    <SelectValue placeholder="Chọn kho" />
                                </SelectTrigger>
                                <SelectContent>
                                    {warehouses.map((warehouse) => (
                                        <SelectItem key={warehouse.value} value={warehouse.value.toString()}>
                                            {warehouse.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label className="font-normal">Vị trí lưu kho</Label>
                        <div className="relative">
                            <Input
                                value={storageLocation}
                                onChange={(e) => handleLocationChange(e.target.value)}
                                placeholder="Ví dụ: A-D10-K456"
                                maxLength={255}
                                className={`font-normal ${errors.location ? "border-red-500" : ""}`}
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                                {storageLocation.length}/255
                            </span>
                        </div>
                        {errors.location && (
                            <p className="text-sm text-red-500">{errors.location}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label className="font-normal text-xs">Quy tắc nhập vị trí lưu kho:</Label>
                        <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside font-normal">
                            <li>Bắt buộc bắt đầu bằng 1 chữ cái (A-Z) đại diện khu vực</li>
                            <li>Mỗi cấp phân cách bằng dấu &quot;-&quot;</li>
                            <li>Mỗi cấp gồm 1 chữ cái (A-Z) + số tùy ý</li>
                        </ul>
                        <div className="space-y-1 mt-2">
                            <Label className="font-normal text-xs">Ví dụ:</Label>
                            <div className="flex flex-wrap gap-2">
                                {STORAGE_LOCATION_EXAMPLES.map((example, index) => (
                                    <Badge
                                        key={index}
                                        variant="secondary"
                                        className="cursor-pointer hover:bg-blue-100 hover:text-blue-700 font-normal px-3 py-1"
                                        onClick={() => handleExampleClick(example)}
                                    >
                                        {example}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} className="font-normal">
                        Hủy
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={!selectedWarehouseId || !!errors.location}
                        className="font-normal"
                    >
                        Xác nhận
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
