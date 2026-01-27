import { Edit2, Trash2, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface CashReason {
    id: number
    name: string
    type: 'receipt' | 'payment'
    description?: string
    is_default: boolean
    publish: string
    order: number
}

interface ReasonListProps {
    reasons: CashReason[]
    onEdit: (reason: CashReason) => void
    onDelete: (id: number) => void
}

export default function ReasonList({ reasons, onEdit, onDelete }: ReasonListProps) {
    if (reasons.length === 0) {
        return (
            <div className="text-center py-12 text-muted-foreground">
                <p>Chưa có lý do nào</p>
                <p className="text-sm mt-2">Nhấn "Thêm lý do" để tạo lý do mới</p>
            </div>
        )
    }

    return (
        <div className="space-y-2">
            {reasons.map((reason) => (
                <div
                    key={reason.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                    <div className="flex items-center gap-3 flex-1">
                        {reason.is_default && (
                            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        )}
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <h4 className="font-medium text-sm">{reason.name}</h4>
                                {reason.is_default && (
                                    <Badge variant="secondary" className="text-xs">
                                        Mặc định
                                    </Badge>
                                )}
                            </div>
                            {reason.description && (
                                <p className="text-xs text-muted-foreground mt-1">
                                    {reason.description}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onEdit(reason)}
                            className="h-8 w-8"
                        >
                            <Edit2 className="h-4 w-4" />
                        </Button>
                        {!reason.is_default && (
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => onDelete(reason.id)}
                                className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                </div>
            ))}
            <p className="text-xs text-muted-foreground text-center mt-4">
                Từ 1 đến {reasons.length} trên tổng {reasons.length}
            </p>
        </div>
    )
}
