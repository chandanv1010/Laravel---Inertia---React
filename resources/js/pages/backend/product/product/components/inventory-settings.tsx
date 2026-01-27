import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"

interface InventorySettingsProps {
    managementType?: 'basic' | 'imei' | 'batch'
    trackInventory?: boolean
    allowNegativeStock?: boolean
}

export function InventorySettings({
    managementType = 'basic',
    trackInventory = true,
    allowNegativeStock = false
}: InventorySettingsProps) {
    return (
        <div className="space-y-4">
            <div>
                <Label htmlFor="management_type">Loại quản lý sản phẩm</Label>
                <Select defaultValue={managementType} name="management_type">
                    <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Chọn loại quản lý" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="basic">Sản phẩm cơ bản</SelectItem>
                        <SelectItem value="imei">Quản lý theo IMEI/Series</SelectItem>
                        <SelectItem value="batch">Quản lý theo Lô - HSD</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <div className="flex items-center space-x-2">
                    <Checkbox
                        id="track_inventory"
                        name="track_inventory"
                        defaultChecked={trackInventory}
                    />
                    <Label htmlFor="track_inventory" className="font-normal cursor-pointer">
                        Quản lý tồn kho
                    </Label>
                </div>

                <div className="flex items-center space-x-2">
                    <Checkbox
                        id="allow_negative_stock"
                        name="allow_negative_stock"
                        defaultChecked={allowNegativeStock}
                    />
                    <Label htmlFor="allow_negative_stock" className="font-normal cursor-pointer">
                        Cho phép bán âm
                    </Label>
                </div>
            </div>
        </div>
    )
}
