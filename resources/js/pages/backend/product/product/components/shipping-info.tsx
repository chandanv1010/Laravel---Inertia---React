import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

interface ShippingInfoProps {
    weight?: number
    weightUnit?: string
    length?: number
    width?: number
    height?: number
}

export function ShippingInfo({
    weight,
    weightUnit = 'g',
    length,
    width,
    height
}: ShippingInfoProps) {
    return (
        <div className="space-y-4">
            <div className="w-1/2">
                <Label className="mb-2 block">Cân nặng</Label>
                <div className="flex gap-2">
                    <Input
                        type="number"
                        name="weight"
                        defaultValue={weight}
                        placeholder="0"
                        className="flex-1"
                    />
                    <Select defaultValue={weightUnit} name="weight_unit">
                        <SelectTrigger className="w-20">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="g">g</SelectItem>
                            <SelectItem value="kg">kg</SelectItem>
                            <SelectItem value="oz">oz</SelectItem>
                            <SelectItem value="lb">lb</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="w-1/2">
                <Label className="mb-2 block">Kích thước (cm)</Label>
                <div className="grid grid-cols-3 gap-2">
                    <Input
                        type="number"
                        name="length"
                        defaultValue={length}
                        placeholder="Dài"
                    />
                    <Input
                        type="number"
                        name="width"
                        defaultValue={width}
                        placeholder="Rộng"
                    />
                    <Input
                        type="number"
                        name="height"
                        defaultValue={height}
                        placeholder="Cao"
                    />
                </div>
            </div>
        </div>
    )
}
