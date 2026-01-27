import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import CustomCard from '@/components/custom-card'

interface CombinePromotionSelectorProps {
    combineOrderDiscount: boolean
    combineProductDiscount: boolean
    combineFreeShipping: boolean
    onChange: (type: 'order' | 'product' | 'shipping', value: boolean) => void
}

export function CombinePromotionSelector({
    combineOrderDiscount,
    combineProductDiscount,
    combineFreeShipping,
    onChange
}: CombinePromotionSelectorProps) {
    return (
        <CustomCard isShowHeader={true} title="Kết hợp khuyến mại">
            <div className="space-y-2">
                <p className="text-sm text-muted-foreground mb-4">
                    Chương trình khuyến mại có thể kết hợp khuyến mại với:
                </p>
                <div className="space-y-4">
                    <div className="flex items-start space-x-2">
                        <Checkbox
                            id="combine_order"
                            checked={combineOrderDiscount}
                            onCheckedChange={(checked) => onChange('order', checked as boolean)}
                        />
                        <div className="flex-1">
                            <Label htmlFor="combine_order" className="cursor-pointer font-normal">
                                Giảm giá đơn hàng
                            </Label>
                            <p className="text-sm text-muted-foreground mt-1">
                                Không có ưu đãi giảm giá đơn hàng được thiết lập để kết hợp
                            </p>
                        </div>
                    </div>
                    <div className="flex items-start space-x-2">
                        <Checkbox
                            id="combine_product"
                            checked={combineProductDiscount}
                            onCheckedChange={(checked) => onChange('product', checked as boolean)}
                        />
                        <div className="flex-1">
                            <Label htmlFor="combine_product" className="cursor-pointer font-normal">
                                Giảm giá sản phẩm
                            </Label>
                            <p className="text-sm text-muted-foreground mt-1">
                                Không có ưu đãi giảm giá sản phẩm được thiết lập để kết hợp
                            </p>
                        </div>
                    </div>
                    <div className="flex items-start space-x-2">
                        <Checkbox
                            id="combine_shipping"
                            checked={combineFreeShipping}
                            onCheckedChange={(checked) => onChange('shipping', checked as boolean)}
                        />
                        <div className="flex-1">
                            <Label htmlFor="combine_shipping" className="cursor-pointer font-normal">
                                Miễn phí vận chuyển
                            </Label>
                            <p className="text-sm text-muted-foreground mt-1">
                                Không có ưu đãi miễn phí vận chuyển được thiết lập để kết hợp
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </CustomCard>
    )
}

