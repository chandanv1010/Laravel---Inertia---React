import { useMemo, useState, useCallback, useEffect, useRef } from "react"
import { Link } from "@inertiajs/react"
import CustomCard from "@/components/custom-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Edit, Image as ImageIcon, Trash2, Info } from "lucide-react"
import { NumberInput } from "@/components/number-input"

/**
 * Chuẩn hóa URL ảnh - thêm / nếu là đường dẫn tương đối
 */
function normalizeImageUrl(url: string | undefined): string {
    if (!url) return ''
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/')) {
        return url
    }
    return '/' + url
}
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { VariantEditModal } from "./variant-edit-modal"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export interface WarehouseStock {
    warehouse_id: string | number
    stock_quantity: number
    storage_location?: string
}

export interface ProductVariant {
    id?: string | number // Temporary ID for frontend (string) or database ID (number)
    product_id?: number // Product ID for linking
    sku: string
    retail_price: number
    wholesale_price?: number
    cost_price?: number
    stock_quantity: number // Keep for backward compatibility, but warehouse_stocks takes precedence
    warehouse_stocks?: WarehouseStock[] // New: warehouse-specific stocks
    image?: string
    album?: string[]
    barcode?: string
    attributes: Record<string, string> // key: attribute name, value: attribute value
}

interface VariantsSectionProps {
    variants: ProductVariant[]
    onVariantsChange: (variants: ProductVariant[]) => void
    onVariantRemove?: (variant: ProductVariant) => void
    attributeNames: string[]
    warehouses?: Array<{ value: string | number; label: string }>
    defaultWarehouseId?: string | number
    managementType?: 'basic' | 'imei' | 'batch'
}

export function VariantsSection({
    variants,
    onVariantsChange,
    onVariantRemove,
    attributeNames,
    warehouses = [],
    defaultWarehouseId,
    productId,
    managementType = 'basic'
}: VariantsSectionProps & { productId?: number }) {
    const [editingVariantIndex, setEditingVariantIndex] = useState<number | null>(null)
    const variantsRef = useRef<ProductVariant[]>(variants)

    useEffect(() => {
        variantsRef.current = variants
    }, [variants])

    const updateVariant = useCallback(<K extends keyof ProductVariant>(index: number, field: K, value: ProductVariant[K]) => {
        const newVariants = [...(variantsRef.current || [])]
        newVariants[index] = { ...newVariants[index], [field]: value }
        onVariantsChange(newVariants)
    }, [onVariantsChange])

    const removeVariant = useCallback((index: number) => {
        const removed = (variantsRef.current || [])[index]
        if (removed) onVariantRemove?.(removed)
        const newVariants = (variantsRef.current || []).filter((_, i) => i !== index)
        onVariantsChange(newVariants)
    }, [onVariantsChange, onVariantRemove])

    const handleSaveVariant = useCallback((updatedVariant: ProductVariant) => {
        if (editingVariantIndex !== null) {
            const newVariants = [...(variantsRef.current || [])]
            newVariants[editingVariantIndex] = updatedVariant
            onVariantsChange(newVariants)
            setEditingVariantIndex(null)
        }
    }, [editingVariantIndex, onVariantsChange])

    // Persist draft changes while modal is open (do not close modal)
    const handleDraftVariantChange = useCallback((updatedVariant: ProductVariant) => {
        if (editingVariantIndex !== null) {
            const newVariants = [...(variantsRef.current || [])]
            newVariants[editingVariantIndex] = updatedVariant
            onVariantsChange(newVariants)
        }
    }, [editingVariantIndex, onVariantsChange])

    if (variants.length === 0) return null

    return (
        <CustomCard className="mb-[20px]" data-testid="variants-section">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="font-normal">Phiên bản sản phẩm</h3>
                    <p className="text-sm text-muted-foreground font-normal">
                        Quản lý các phiên bản của sản phẩm (giá, kho, hình ảnh)
                    </p>
                </div>
            </div>

            <div className="border rounded-md -mx-6">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[50px] font-normal px-4 py-3">Ảnh</TableHead>
                            <TableHead className="font-normal px-4 py-3">Tên phiên bản</TableHead>
                            <TableHead className="font-normal px-4 py-3">
                                <div className="flex items-center gap-1">
                                    <span>Giá nhập</span>
                                    <TooltipProvider>
                                        <Tooltip delayDuration={0}>
                                            <TooltipTrigger asChild>
                                                <Info className="h-4 w-4 text-muted-foreground cursor-help inline-block" />
                                            </TooltipTrigger>
                                            <TooltipContent className="max-w-xs bg-slate-900 text-white border-slate-900">
                                                <p>Giá vốn / giá nhập hàng cho từng phiên bản</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                </div>
                            </TableHead>
                            <TableHead className="font-normal px-4 py-3">Tồn kho</TableHead>
                            <TableHead className="w-[80px] font-normal px-4 py-3"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {variants.map((variant, index) => {
                            const variantName = attributeNames.map(name => variant.attributes[name]).join(' / ')

                            return (
                                <TableRow
                                    key={variant.id || index}
                                    className="cursor-pointer hover:bg-slate-50"
                                    onMouseDown={(e) => {
                                        // Don't trigger if clicking on action buttons or inputs
                                        const target = e.target as HTMLElement
                                        if (
                                            target.closest('button') ||
                                            target.closest('input') ||
                                            target.closest('textarea') ||
                                            window.getSelection()?.toString().length > 0
                                        ) {
                                            return
                                        }
                                        e.preventDefault()
                                    }}
                                    onClick={(e) => {
                                        // Don't trigger if clicking on action buttons, inputs, or if text is selected
                                        const target = e.target as HTMLElement
                                        if (
                                            target.closest('button') ||
                                            target.closest('input') ||
                                            target.closest('textarea') ||
                                            window.getSelection()?.toString().length > 0
                                        ) {
                                            return
                                        }
                                        setEditingVariantIndex(index)
                                    }}
                                >
                                    <TableCell>
                                        <div
                                            className="w-10 h-10 bg-slate-100 rounded flex items-center justify-center border cursor-pointer hover:bg-slate-200"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                setEditingVariantIndex(index)
                                            }}
                                        >
                                            {variant.image ? (
                                                <img
                                                    src={normalizeImageUrl(variant.image)}
                                                    className="w-full h-full object-cover rounded"
                                                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                                                />
                                            ) : (
                                                <ImageIcon className="h-4 w-4 text-slate-400" />
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {variant.id && productId ? (
                                            <Link
                                                href={`/backend/product/${productId}/variants/${variant.id}`}
                                                className="cursor-pointer hover:underline text-blue-600 font-normal"
                                                onClick={(e) => {
                                                    // Prevent row click when clicking on variant name
                                                    e.stopPropagation()
                                                }}
                                            >
                                                {variantName}
                                            </Link>
                                        ) : (
                                            <span className="cursor-pointer hover:underline text-blue-600 font-normal">
                                                {variantName}
                                            </span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <div
                                            onClick={(e) => e.stopPropagation()}
                                            onMouseDown={(e) => e.stopPropagation()}
                                            onMouseMove={(e) => e.stopPropagation()}
                                        >
                                            <NumberInput
                                                value={variant.cost_price ?? 0}
                                                onValueChange={(v) => updateVariant(index, 'cost_price', v)}
                                                className="h-8 font-normal"
                                                placeholder="0"
                                            />
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {(() => {
                                            // Tính tổng stock từ warehouse_stocks
                                            const warehouseStocks = variant.warehouse_stocks || []
                                            const totalStock = warehouseStocks.length > 0
                                                ? warehouseStocks.reduce((sum, stock) => sum + (stock.stock_quantity || 0), 0)
                                                : variant.stock_quantity || 0

                                            const stocksWithQuantity = warehouseStocks.filter(ws => (ws.stock_quantity || 0) > 0)
                                            const hasDistribution = stocksWithQuantity.length > 0

                                            // Nếu là batch tracking, chỉ hiển thị (read-only)
                                            if (managementType === 'batch') {
                                                // Nếu đã phân bổ (có warehouse_stocks với stock > 0), hiển thị tooltip
                                                if (hasDistribution) {
                                                    return (
                                                        <TooltipProvider>
                                                            <Tooltip delayDuration={0}>
                                                                <TooltipTrigger asChild>
                                                                    <span className="font-medium text-gray-700 cursor-help">
                                                                        {totalStock}
                                                                    </span>
                                                                </TooltipTrigger>
                                                                <TooltipContent className="bg-gray-900 text-white p-3 max-w-xs">
                                                                    <div className="space-y-1.5">
                                                                        <div className="font-semibold mb-2">Phân bổ tồn kho:</div>
                                                                        {stocksWithQuantity.map((ws) => {
                                                                            const warehouseName = warehouses.find(w => String(w.value) === String(ws.warehouse_id))?.label || `Kho #${ws.warehouse_id}`
                                                                            return (
                                                                                <div key={ws.warehouse_id} className="flex justify-between items-center gap-4 text-sm">
                                                                                    <span>{warehouseName}</span>
                                                                                    <span className="font-medium">{ws.stock_quantity || 0}</span>
                                                                                </div>
                                                                            )
                                                                        })}
                                                                        <div className="border-t border-gray-700 pt-1.5 mt-1.5 flex justify-between items-center text-sm font-semibold">
                                                                            <span>Tổng cộng:</span>
                                                                            <span>{totalStock}</span>
                                                                        </div>
                                                                    </div>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                    )
                                                }
                                                return <span className="font-medium text-gray-700">{totalStock}</span>
                                            }

                                            // Nếu không phải batch tracking, cho phép input
                                            // Nhưng nếu đã phân bổ, vẫn hiển thị tooltip khi hover
                                            if (hasDistribution) {
                                                return (
                                                    <TooltipProvider>
                                                        <Tooltip delayDuration={0}>
                                                            <TooltipTrigger asChild>
                                                                <div
                                                                    onClick={(e) => e.stopPropagation()}
                                                                    onMouseDown={(e) => e.stopPropagation()}
                                                                    onMouseMove={(e) => e.stopPropagation()}
                                                                    className="cursor-help"
                                                                >
                                                                    <NumberInput
                                                                        value={variant.stock_quantity}
                                                                        onValueChange={(v) => updateVariant(index, 'stock_quantity', v)}
                                                                        className="h-8 font-normal"
                                                                        placeholder="0"
                                                                    />
                                                                </div>
                                                            </TooltipTrigger>
                                                            <TooltipContent className="bg-gray-900 text-white p-3 max-w-xs">
                                                                <div className="space-y-1.5">
                                                                    <div className="font-semibold mb-2">Phân bổ tồn kho:</div>
                                                                    {stocksWithQuantity.map((ws) => {
                                                                        const warehouseName = warehouses.find(w => String(w.value) === String(ws.warehouse_id))?.label || `Kho #${ws.warehouse_id}`
                                                                        return (
                                                                            <div key={ws.warehouse_id} className="flex justify-between items-center gap-4 text-sm">
                                                                                <span>{warehouseName}</span>
                                                                                <span className="font-medium">{ws.stock_quantity || 0}</span>
                                                                            </div>
                                                                        )
                                                                    })}
                                                                    <div className="border-t border-gray-700 pt-1.5 mt-1.5 flex justify-between items-center text-sm font-semibold">
                                                                        <span>Tổng cộng:</span>
                                                                        <span>{totalStock}</span>
                                                                    </div>
                                                                </div>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                )
                                            }

                                            return (
                                                <div
                                                    onClick={(e) => e.stopPropagation()}
                                                    onMouseDown={(e) => e.stopPropagation()}
                                                    onMouseMove={(e) => e.stopPropagation()}
                                                >
                                                    <NumberInput
                                                        value={variant.stock_quantity}
                                                        onValueChange={(v) => updateVariant(index, 'stock_quantity', v)}
                                                        className="h-8 font-normal"
                                                        placeholder="0"
                                                    />
                                                </div>
                                            )
                                        })()}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-blue-600 hover:text-blue-800 cursor-pointer"
                                                onClick={() => setEditingVariantIndex(index)}
                                                data-testid={`variant-edit-${index}`}
                                            >
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-red-500 hover:text-red-700 cursor-pointer"
                                                onClick={() => removeVariant(index)}
                                                data-testid={`variant-delete-${index}`}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )
                        })}
                    </TableBody>
                </Table>
            </div>

            <VariantEditModal
                open={editingVariantIndex !== null}
                onOpenChange={(open) => !open && setEditingVariantIndex(null)}
                variant={editingVariantIndex !== null ? variants[editingVariantIndex] : null}
                onSave={handleSaveVariant}
                onDraftChange={handleDraftVariantChange}
                attributeNames={attributeNames}
                warehouses={warehouses}
                defaultWarehouseId={defaultWarehouseId || warehouses[0]?.value}
            />
        </CustomCard>
    )
}
