import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Plus, Trash2, AlertCircle, Info } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import InputError from "@/components/input-error"
import { useEffect, useMemo, useState } from "react"
import { NumberInput } from "@/components/number-input"
import { PriceInput } from "@/components/price-input"
import { usePage } from "@inertiajs/react"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"

interface PricingTier {
    min_quantity: number
    max_quantity: number | null
    price: number
}

interface PricingSectionProps {
    retailPrice?: number
    wholesalePrice?: number
    costPrice?: number
    applyTax?: boolean
    forceTaxIncluded?: boolean
    pricingTiers?: PricingTier[]
    errors?: Record<string, string>
}

type PageProps = {
    tooltips?: {
        product?: {
            cost_price?: string
            retail_price?: string
        }
    }
}

export function PricingSection({
    retailPrice,
    wholesalePrice,
    costPrice,
    applyTax = false,
    forceTaxIncluded = false,
    pricingTiers = [],
    errors
}: PricingSectionProps) {
    const { tooltips } = usePage<PageProps>().props
    const [hasWholesale, setHasWholesale] = useState(!!wholesalePrice || pricingTiers.length > 0)
    const [tiers, setTiers] = useState<PricingTier[]>(
        pricingTiers.length > 0 ? pricingTiers : []
    )
    const [retailValue, setRetailValue] = useState<number | undefined>(retailPrice ?? 0)
    const [wholesaleValue, setWholesaleValue] = useState<number | undefined>(wholesalePrice ?? 0)
    const [costValue, setCostValue] = useState<number | undefined>(costPrice ?? 0)
    const [taxEnabled, setTaxEnabled] = useState(applyTax)

    // Sync from props when editing / demo loading
    useEffect(() => {
        setRetailValue(retailPrice ?? 0)
    }, [retailPrice])

    useEffect(() => {
        setWholesaleValue(wholesalePrice ?? 0)
        setHasWholesale(!!wholesalePrice || (pricingTiers?.length ?? 0) > 0)
    }, [wholesalePrice, pricingTiers])

    useEffect(() => {
        setCostValue(costPrice ?? 0)
    }, [costPrice])

    useEffect(() => {
        setTiers(pricingTiers?.length ? pricingTiers : [])
    }, [pricingTiers])

    useEffect(() => {
        if (forceTaxIncluded) {
            setTaxEnabled(true)
        } else {
            setTaxEnabled(!!applyTax)
        }
    }, [applyTax, forceTaxIncluded])

    const addTier = () => {
        const lastTier = tiers[tiers.length - 1]
        const newMin = lastTier ? (lastTier.max_quantity || lastTier.min_quantity) + 1 : 2
        setTiers([...tiers, { min_quantity: newMin, max_quantity: null, price: 0 }])
    }

    const removeTier = (index: number) => {
        setTiers(tiers.filter((_, i) => i !== index))
    }

    const updateTier = <K extends keyof PricingTier>(index: number, field: K, value: PricingTier[K]) => {
        const newTiers = [...tiers]
        newTiers[index] = { ...newTiers[index], [field]: value }
        setTiers(newTiers)
    }

    const tierConflicts = useMemo(() => {
        const conflicts: number[] = []
        for (let i = 0; i < tiers.length; i++) {
            for (let j = i + 1; j < tiers.length; j++) {
                const a = tiers[i]
                const b = tiers[j]
                const aMax = a.max_quantity ?? Infinity
                const bMax = b.max_quantity ?? Infinity
                if (a.min_quantity <= bMax && b.min_quantity <= aMax) {
                    if (!conflicts.includes(i)) conflicts.push(i)
                    if (!conflicts.includes(j)) conflicts.push(j)
                }
            }
        }
        return conflicts
    }, [tiers])

    const renderTooltip = (text: string | undefined) => {
        if (!text) return null
        return (
            <TooltipProvider>
                <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground cursor-help inline-block ml-1" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs bg-slate-900 text-white border-slate-900">
                        <p>{text}</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex space-x-4">
                {/* Cost Price */}
                <div className="w-1/2">
                    <div className="flex items-center mb-2">
                        <Label htmlFor="cost_price">Giá nhập hàng</Label>
                        {renderTooltip(tooltips?.product?.cost_price)}
                    </div>
                    <PriceInput
                        id="cost_price"
                        name="cost_price"
                        value={costValue}
                        onValueChange={setCostValue}
                        placeholder="Nhập giá nhập"
                    />
                </div>


                {/* Retail Price */}
                <div className="w-1/2">
                    <div className="flex items-center mb-2">
                        <Label htmlFor="retail_price">Giá lẻ *</Label>
                        {renderTooltip(tooltips?.product?.retail_price)}
                    </div>
                    <PriceInput
                        id="retail_price"
                        name="retail_price"
                        value={retailValue}
                        onValueChange={setRetailValue}
                        placeholder="Nhập giá lẻ"
                    />
                    {errors?.retail_price && <InputError message={errors.retail_price} />}
                </div>
            </div>

            {/* Visual spacer for layout */}

            <div className="flex items-center space-x-2">
                <Checkbox
                    id="has_wholesale"
                    checked={hasWholesale}
                    onCheckedChange={(checked) => setHasWholesale(checked as boolean)}
                    data-testid="pricing-has-wholesale"
                />
                <Label htmlFor="has_wholesale" className="cursor-pointer">
                    Có giá buôn
                </Label>
            </div>

            {hasWholesale && (
                <div className="space-y-4 border-l-2 border-blue-200 pl-4">
                    <div className="w-1/2">
                        <Label htmlFor="wholesale_price" className="mb-2 block">Giá buôn cơ bản</Label>
                        <PriceInput
                            id="wholesale_price"
                            name="wholesale_price"
                            value={wholesaleValue}
                            onValueChange={setWholesaleValue}
                            placeholder="Nhập giá buôn"
                        />
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <Label>Chính sách giá theo số lượng</Label>
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={addTier}
                                className="cursor-pointer"
                                data-testid="pricing-add-tier"
                            >
                                <Plus className="h-4 w-4 mr-1" />
                                Thêm khoảng giá
                            </Button>
                        </div>

                        {tierConflicts.length > 0 && (
                            <div className="flex items-center gap-2 text-sm text-amber-600 mb-2">
                                <AlertCircle className="h-4 w-4" />
                                <span>Có khoảng số lượng bị xung đột!</span>
                            </div>
                        )}

                        {tiers.map((tier, index) => (
                            <div
                                key={index}
                                className={`grid grid-cols-12 gap-2 mb-2 items-center ${tierConflicts.includes(index) ? 'bg-amber-50 p-2 rounded border border-amber-200' : ''}`}
                            >
                                <div className="col-span-3">
                                    <Label className="text-xs text-muted-foreground mb-1 block">Từ</Label>
                                    <NumberInput
                                        value={tier.min_quantity}
                                        onValueChange={(v) => updateTier(index, 'min_quantity', v || 0)}
                                        name={`pricing_tiers[${index}][min_quantity]`}
                                        className="text-gray-900"
                                    />
                                </div>
                                <div className="col-span-3">
                                    <Label className="text-xs text-muted-foreground mb-1 block">Đến</Label>
                                    <NumberInput
                                        value={tier.max_quantity || ''}
                                        onValueChange={(v) => updateTier(index, 'max_quantity', v || null)}
                                        name={`pricing_tiers[${index}][max_quantity]`}
                                        placeholder="∞"
                                        className="text-gray-900"
                                    />
                                </div>
                                <div className="col-span-5">
                                    <Label className="text-xs text-muted-foreground mb-1 block">Giá</Label>
                                    <PriceInput
                                        value={tier.price}
                                        onValueChange={(v) => updateTier(index, 'price', v || 0)}
                                        name={`pricing_tiers[${index}][price]`}
                                    />
                                </div>
                                <div className="col-span-1 pt-5">
                                    <Button
                                        type="button"
                                        size="icon"
                                        variant="ghost"
                                        onClick={() => removeTier(index)}
                                        className="h-8 w-8 cursor-pointer"
                                    >
                                        <Trash2 className="h-4 w-4 text-red-500" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Tax Section - FIXED: Always show, but disabled if forced */}
            <div className="border-t pt-4">
                <div className="flex items-center gap-3">
                    <Switch
                        id="apply_tax"
                        checked={taxEnabled}
                        onCheckedChange={setTaxEnabled}
                        disabled={forceTaxIncluded}
                        name="apply_tax"
                    />
                    <div>
                        <Label htmlFor="apply_tax" className="font-normal cursor-pointer">Áp dụng thuế</Label>
                        {forceTaxIncluded && <span className="text-xs text-muted-foreground ml-2">(bắt buộc)</span>}
                    </div>
                </div>
            </div>

            {/* Hidden inputs */}
            <input type="hidden" name="retail_price" value={retailValue || 0} />
            <input type="hidden" name="wholesale_price" value={hasWholesale ? (wholesaleValue ?? 0) : 0} />
            <input type="hidden" name="cost_price" value={costValue ?? 0} />
            <input type="hidden" name="apply_tax" value={(forceTaxIncluded || taxEnabled) ? '1' : '0'} />

            {/* CRITICAL FIX: Always submit pricing_tiers to allow deletion when unchecked */}
            {!hasWholesale && (
                <input type="hidden" name="pricing_tiers" value={JSON.stringify([])} />
            )}
        </div>
    )
}
