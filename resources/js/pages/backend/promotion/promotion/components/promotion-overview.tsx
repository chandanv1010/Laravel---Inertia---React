import { Button } from '@/components/ui/button'
import { FileText } from 'lucide-react'
import CustomCard from '@/components/custom-card'
import { router } from '@inertiajs/react'
import { format } from 'date-fns'

interface PromotionOverviewProps {
    promotionName?: string
    promotionId?: number
    isEdit?: boolean
    promotionType: string
    startDate?: Date
    endDate?: Date
    noEndDate?: boolean
    formatDate: (date?: Date | string) => string
    items: Array<{
        label: string
        value: string | React.ReactNode
    }>
}

export function PromotionOverview({
    promotionName,
    promotionId,
    isEdit,
    promotionType,
    startDate,
    endDate,
    noEndDate,
    formatDate,
    items
}: PromotionOverviewProps) {
    const hasData = isEdit || promotionName || startDate

    if (!hasData) {
        return (
            <CustomCard isShowHeader={true} title="Tổng quan khuyến mại">
                <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg p-8 text-center">
                    <div className="text-muted-foreground">
                        <p className="text-sm">Chưa có thông tin chi tiết</p>
                        <p className="text-xs mt-2">Thông tin sẽ được hiển thị sau khi lưu</p>
                    </div>
                </div>
            </CustomCard>
        )
    }

    return (
        <CustomCard isShowHeader={true} title="Tổng quan khuyến mại">
            <div>
                {/* Tên chương trình */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <h3 className="text-lg font-bold text-gray-900">
                        {promotionName || 'Chưa có tên'}
                    </h3>
                </div>

                {/* Danh sách thông tin */}
                <div className="border-t border-dashed border-gray-300 pt-4">
                    <ul className="space-y-2 text-sm text-gray-700">
                        {items.map((item, index) => (
                            <li key={index} className="flex items-start gap-2">
                                <span className="text-gray-400 mt-1">•</span>
                                <span>{item.value}</span>
                            </li>
                        ))}

                        {/* Thời gian áp dụng */}
                        {startDate && (
                            <li className="flex items-start gap-2">
                                <span className="text-gray-400 mt-1">•</span>
                                <span>
                                    Áp dụng từ {(() => {
                                        if (!startDate) return 'Chưa chọn'
                                        const start = formatDate(startDate)
                                        
                                        if (noEndDate) {
                                            return `${start} (Không có ngày kết thúc)`
                                        }
                                        
                                        const end = endDate ? formatDate(endDate) : 'Chưa chọn'
                                        return `${start} đến ${end}`
                                    })()}
                                </span>
                            </li>
                        )}
                    </ul>
                </div>

                {/* Nút xem báo cáo doanh thu */}
                {isEdit && promotionId && (
                    <div className="mt-6 pt-4 border-t border-gray-200">
                        <Button
                            type="button"
                            variant="link"
                            className="text-blue-600 hover:text-blue-700 p-0 h-auto font-normal"
                            onClick={() => {
                                router.get(`/backend/promotion/promotion/${promotionId}/revenue-report`)
                            }}
                        >
                            <FileText className="w-4 h-4 mr-2" />
                            Xem báo cáo doanh thu
                        </Button>
                    </div>
                )}
            </div>
        </CustomCard>
    )
}

