import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { SkuInput } from "@/components/sku-input"
import InputError from "@/components/input-error"

interface ProductBasicInfoProps {
    sku?: string
    barcode?: string
    unit?: string
    errors?: Record<string, string>
}

export function ProductBasicInfo({
    sku,
    barcode,
    unit,
    errors
}: ProductBasicInfoProps) {
    return (
        <div className="space-y-4">
            {/* SKU, Barcode, Unit row */}
            <div className="grid grid-cols-3 gap-4">
                <div>
                    <Label htmlFor="sku" className="mb-2 block">SKU/Mã sản phẩm</Label>
                    <SkuInput
                        id="sku"
                        name="sku"
                        defaultValue={sku}
                        placeholder="Nhập mã SKU"
                    />
                    {errors?.sku && <InputError message={errors.sku} />}
                </div>

                <div>
                    <Label htmlFor="barcode" className="mb-2 block">Barcode</Label>
                    <Input
                        id="barcode"
                        name="barcode"
                        defaultValue={barcode}
                        placeholder="Nhập barcode"
                    />
                    {errors?.barcode && <InputError message={errors.barcode} />}
                </div>

                <div>
                    <Label htmlFor="unit" className="mb-2 block">Đơn vị tính</Label>
                    <Input
                        id="unit"
                        name="unit"
                        defaultValue={unit || 'cái'}
                        placeholder="VD: cái, hộp, kg"
                    />
                    {errors?.unit && <InputError message={errors.unit} />}
                </div>
            </div>

            {/* Management Type - Radio buttons evenly spaced with smaller font */}
            <div className="border-t pt-4">
                <div className="grid grid-cols-3 gap-4">
                    <label className="flex items-center gap-2 cursor-pointer p-3 border rounded hover:bg-gray-50">
                        <input
                            type="radio"
                            name="management_type"
                            value="basic"
                            defaultChecked
                            className="w-4 h-4 text-blue-600"
                        />
                        <span className="text-sm">Sản phẩm cơ bản</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer p-3 border rounded hover:bg-gray-50">
                        <input
                            type="radio"
                            name="management_type"
                            value="imei"
                            className="w-4 h-4 text-blue-600"
                        />
                        <span className="text-sm">Quản lý theo IMEI/Series</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer p-3 border rounded hover:bg-gray-50">
                        <input
                            type="radio"
                            name="management_type"
                            value="batch"
                            className="w-4 h-4 text-blue-600"
                        />
                        <span className="text-sm">Quản lý theo Lô - HSD</span>
                    </label>
                </div>
            </div>
        </div>
    )
}
