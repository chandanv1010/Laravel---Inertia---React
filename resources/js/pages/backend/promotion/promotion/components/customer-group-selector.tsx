import { useState, useEffect } from 'react'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'
import CustomCard from '@/components/custom-card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'

interface CustomerGroupSelectorProps {
    value: 'all' | 'selected'
    selectedIds: number[]
    options: Array<{ value: string | number; label: string }>
    onChange: (type: 'all' | 'selected', ids: number[]) => void
}

export function CustomerGroupSelector({
    value,
    selectedIds,
    options,
    onChange
}: CustomerGroupSelectorProps) {
    const [showModal, setShowModal] = useState(false)
    const [search, setSearch] = useState('')
    const [tempSelectedIds, setTempSelectedIds] = useState<number[]>([])

    useEffect(() => {
        if (showModal) {
            setTempSelectedIds([...selectedIds])
        }
    }, [showModal, selectedIds])

    const filteredOptions = options.filter((group) => {
        if (!search.trim()) return true
        return group.label.toLowerCase().includes(search.toLowerCase())
    }).slice(0, 10)

    const handleConfirm = () => {
        onChange('selected', [...tempSelectedIds])
        setShowModal(false)
        setSearch('')
    }

    const handleCancel = () => {
        setTempSelectedIds([...selectedIds])
        setShowModal(false)
        setSearch('')
    }

    return (
        <>
            <CustomCard isShowHeader={true} title="Nhóm khách hàng">
                <RadioGroup
                    value={value}
                    onValueChange={(newValue) => {
                        if (newValue === 'all') {
                            onChange('all', [])
                        } else {
                            onChange('selected', selectedIds)
                        }
                    }}
                    name="customer_group_type"
                >
                    <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="all" id="customer-all" />
                            <Label htmlFor="customer-all" className="cursor-pointer font-normal">
                                Tất cả
                            </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="selected" id="customer-selected" />
                            <Label htmlFor="customer-selected" className="cursor-pointer font-normal">
                                Nhóm khách hàng đã lưu
                            </Label>
                        </div>
                        {value === 'selected' && (
                            <div className="ml-6 space-y-2">
                                <div className="flex items-center gap-2">
                                    <div className="relative flex-1">
                                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            type="text"
                                            placeholder="Tìm kiếm"
                                            className="pl-9"
                                            onClick={() => setShowModal(true)}
                                        />
                                    </div>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setShowModal(true)}
                                    >
                                        Chọn nhiều
                                    </Button>
                                </div>
                                {selectedIds.length > 0 && (
                                    <div className="text-sm text-muted-foreground">
                                        Đã chọn {selectedIds.length} nhóm khách hàng
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </RadioGroup>
            </CustomCard>

            <Dialog open={showModal} onOpenChange={(open) => {
                setShowModal(open)
                if (!open) {
                    setSearch('')
                }
            }}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Chọn nhóm khách hàng</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="text"
                                placeholder="Tìm kiếm theo tên nhóm"
                                className="pl-9"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                autoFocus
                            />
                        </div>
                        <div className="max-h-[400px] overflow-y-auto">
                            {filteredOptions && filteredOptions.length > 0 ? (
                                <div className="space-y-1">
                                    {filteredOptions.map((group) => {
                                        const groupId = Number(group.value)
                                        return (
                                            <div key={group.value} className="flex items-center space-x-3 py-2 px-1 hover:bg-gray-50 rounded">
                                                <Checkbox
                                                    id={`group-${group.value}`}
                                                    checked={tempSelectedIds.includes(groupId)}
                                                    onCheckedChange={(checked) => {
                                                        if (checked) {
                                                            setTempSelectedIds([...tempSelectedIds, groupId])
                                                        } else {
                                                            setTempSelectedIds(tempSelectedIds.filter(id => id !== groupId))
                                                        }
                                                    }}
                                                />
                                                <Label htmlFor={`group-${group.value}`} className="cursor-pointer font-normal text-sm flex-1">
                                                    {group.label}
                                                </Label>
                                            </div>
                                        )
                                    })}
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground text-center py-8">
                                    {search ? 'Không tìm thấy nhóm khách hàng nào' : 'Chưa có nhóm khách hàng nào'}
                                </p>
                            )}
                        </div>
                    </div>
                    <DialogFooter className="mt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleCancel}
                        >
                            Hủy
                        </Button>
                        <Button
                            type="button"
                            onClick={handleConfirm}
                            className="bg-blue-500 hover:bg-blue-600"
                        >
                            Áp dụng
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}

