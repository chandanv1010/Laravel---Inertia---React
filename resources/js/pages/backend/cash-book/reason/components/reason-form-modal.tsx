import { useState, useEffect } from 'react'
import { useForm } from '@inertiajs/react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import InputError from '@/components/input-error'
import { LoaderCircle } from 'lucide-react'

interface CashReason {
    id: number
    name: string
    type: 'receipt' | 'payment'
    description?: string
    is_default: boolean
    publish: string
    order: number
}

interface ReasonFormModalProps {
    open: boolean
    onClose: () => void
    reason?: CashReason | null
    defaultType?: 'receipt' | 'payment'
}

export default function ReasonFormModal({ open, onClose, reason, defaultType = 'receipt' }: ReasonFormModalProps) {
    const isEdit = !!reason

    const { data, setData, post, put, processing, errors, reset } = useForm({
        name: reason?.name || '',
        type: reason?.type || defaultType,
        description: reason?.description || '',
        is_default: reason?.is_default || false,
        publish: reason?.publish || '2',
        order: reason?.order || 0,
    })

    useEffect(() => {
        if (open) {
            if (reason) {
                setData({
                    name: reason.name,
                    type: reason.type,
                    description: reason.description || '',
                    is_default: reason.is_default,
                    publish: reason.publish,
                    order: reason.order,
                })
            } else {
                reset()
                setData('type', defaultType)
            }
        }
    }, [open, reason, defaultType])

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()

        if (isEdit) {
            put(`/backend/cash-book/reason/${reason.id}`, {
                preserveScroll: true,
                onSuccess: () => {
                    onClose()
                    reset()
                },
            })
        } else {
            post('/backend/cash-book/reason', {
                preserveScroll: true,
                onSuccess: () => {
                    onClose()
                    reset()
                },
            })
        }
    }

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>{isEdit ? 'Chỉnh sửa lý do' : 'Thêm lý do mới'}</DialogTitle>
                        <DialogDescription>
                            {isEdit ? 'Cập nhật thông tin lý do thu/chi' : 'Tạo lý do thu/chi mới'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="type">Loại</Label>
                            <RadioGroup
                                value={data.type}
                                onValueChange={(value) => setData('type', value as 'receipt' | 'payment')}
                            >
                                <div className="flex items-center space-x-4">
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="receipt" id="type-receipt" />
                                        <Label htmlFor="type-receipt" className="font-normal cursor-pointer">
                                            Lý do thu
                                        </Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="payment" id="type-payment" />
                                        <Label htmlFor="type-payment" className="font-normal cursor-pointer">
                                            Lý do chi
                                        </Label>
                                    </div>
                                </div>
                            </RadioGroup>
                            <InputError message={errors.type} />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="name">Tên lý do *</Label>
                            <Input
                                id="name"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                placeholder="Nhập tên lý do"
                                autoFocus
                            />
                            <InputError message={errors.name} />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Mô tả</Label>
                            <Textarea
                                id="description"
                                value={data.description}
                                onChange={(e) => setData('description', e.target.value)}
                                placeholder="Nhập mô tả (tùy chọn)"
                                rows={3}
                            />
                            <InputError message={errors.description} />
                        </div>

                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="is_default"
                                checked={data.is_default}
                                onCheckedChange={(checked) => setData('is_default', !!checked)}
                            />
                            <Label htmlFor="is_default" className="font-normal cursor-pointer">
                                Đặt làm lý do mặc định
                            </Label>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="order">Thứ tự hiển thị</Label>
                            <Input
                                id="order"
                                type="number"
                                value={data.order}
                                onChange={(e) => setData('order', parseInt(e.target.value) || 0)}
                                min="0"
                            />
                            <InputError message={errors.order} />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose}>
                            Hủy
                        </Button>
                        <Button type="submit" disabled={processing} className="bg-blue-500 hover:bg-blue-600">
                            {processing && <LoaderCircle className="w-4 h-4 mr-2 animate-spin" />}
                            {isEdit ? 'Cập nhật' : 'Tạo mới'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
