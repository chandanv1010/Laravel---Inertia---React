import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { NumberInput } from "@/components/number-input"
import { ProductVariant } from "./variants-section"
import { useState, useEffect, useCallback, useRef } from "react"
import CustomAlbum from "@/components/custom-album"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { HelpCircle } from "lucide-react"
import { SkuInput } from "@/components/sku-input"
import { PriceInput } from "@/components/price-input"

interface VariantEditModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    variant?: ProductVariant | null
    onSave: (variant: ProductVariant) => void
    onDraftChange?: (variant: ProductVariant) => void
    attributeNames: string[]
    warehouses?: Array<{ value: string | number; label: string }>
    defaultWarehouseId?: string | number
}

export function VariantEditModal({
    open,
    onOpenChange,
    variant,
    onSave,
    onDraftChange,
    attributeNames,
    warehouses = [],
    defaultWarehouseId
}: VariantEditModalProps) {
    const [localVariant, setLocalVariant] = useState<ProductVariant | null>(null)
    const [didExplicitSave, setDidExplicitSave] = useState(false)
    const didExplicitSaveRef = useRef(false)
    const latestVariantRef = useRef<ProductVariant | null>(null)

    useEffect(() => {
        if (variant) {
            // Ensure warehouse_stocks is initialized if not present
            const updatedVariant: ProductVariant = {
                ...variant,
                warehouse_stocks: variant.warehouse_stocks || (variant.stock_quantity !== undefined ? [{
                    warehouse_id: defaultWarehouseId || warehouses[0]?.value || "",
                    stock_quantity: variant.stock_quantity || 0,
                    storage_location: undefined
                }] : [])
            }
            setLocalVariant(updatedVariant)
            latestVariantRef.current = updatedVariant
            setDidExplicitSave(false)
            didExplicitSaveRef.current = false
        }
    }, [variant, defaultWarehouseId, warehouses])

    const handleSave = () => {
        const v = latestVariantRef.current || localVariant
        if (v) {
            didExplicitSaveRef.current = true
            setDidExplicitSave(true)
            onSave(v)
            onOpenChange(false)
        }
    }

    const handleChange = useCallback(<K extends keyof ProductVariant>(field: K, value: ProductVariant[K]) => {
        setLocalVariant(prev => {
            if (!prev) return null
            const next = { ...prev, [field]: value }
            latestVariantRef.current = next
            // Immediately persist to parent state so outer "Lưu" can submit correct data
            onDraftChange?.(next)
            return next
        })
    }, [onDraftChange])

    const handleAlbumChange = useCallback((urls: string[]) => {
        setLocalVariant(prev => {
            if (!prev) return null
            const next = { ...prev, album: urls, image: urls[0] || prev.image }
            latestVariantRef.current = next
            // Immediately persist to parent state so avatar column updates right away
            onDraftChange?.(next)
            return next
        })
    }, [onDraftChange])

    if (!localVariant) return null

    const variantName = attributeNames.map(name => localVariant.attributes[name]).join(' / ')

    const handleOpenChange = (nextOpen: boolean) => {
        // If user closes modal without pressing "Lưu thay đổi", still persist draft changes
        if (!nextOpen && localVariant && !didExplicitSaveRef.current) {
            onDraftChange?.(localVariant)
        }
        onOpenChange(nextOpen)
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="max-w-[1100px] wide-modal max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="font-normal">Chỉnh sửa phiên bản: {variantName}</DialogTitle>
                    <DialogDescription>
                        Cập nhật thông tin chi tiết cho phiên bản sản phẩm này
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    <div className="space-y-4">
                        <CustomAlbum
                            data={localVariant.album || []}
                            onDataChange={handleAlbumChange}
                            hideHeader={true}
                            columns={5}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="font-normal">Mã phiên bản (SKU)</Label>
                            <SkuInput
                                value={localVariant.sku}
                                onChange={(val) => handleChange('sku', val)}
                                className="font-normal"
                                data-testid="variant-sku"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="font-normal">Barcode</Label>
                            <Input
                                value={localVariant.barcode || ''}
                                onChange={(e) => handleChange('barcode', e.target.value)}
                                className="font-normal"
                                placeholder="Nhập barcode..."
                                data-testid="variant-barcode"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <div className="flex items-center gap-1">
                                <Label className="font-normal">Giá bán lẻ</Label>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Giá bán cho khách hàng cuối cùng</p>
                                    </TooltipContent>
                                </Tooltip>
                            </div>
                            <PriceInput
                                value={localVariant.retail_price}
                                onValueChange={(v) => handleChange('retail_price', v)}
                                className="font-normal"
                            />
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center gap-1">
                                <Label className="font-normal">Giá bán buôn</Label>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Giá bán cho đại lý hoặc khách hàng mua số lượng lớn</p>
                                    </TooltipContent>
                                </Tooltip>
                            </div>
                            <PriceInput
                                value={localVariant.wholesale_price || 0}
                                onValueChange={(v) => handleChange('wholesale_price', v)}
                                className="font-normal"
                            />
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center gap-1">
                                <Label className="font-normal">Giá nhập</Label>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Giá vốn hoặc giá nhập hàng từ nhà cung cấp</p>
                                    </TooltipContent>
                                </Tooltip>
                            </div>
                            <PriceInput
                                value={localVariant.cost_price}
                                onValueChange={(v) => handleChange('cost_price', v)}
                                className="font-normal"
                                data-testid="variant-cost-price"
                            />
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="font-normal">Hủy</Button>
                    <Button type="button" onClick={handleSave} className="font-normal">Lưu thay đổi</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
