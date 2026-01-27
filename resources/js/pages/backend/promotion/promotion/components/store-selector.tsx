import { useState, useEffect } from 'react'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'
import CustomCard from '@/components/custom-card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'

interface StoreSelectorProps {
    value: 'all' | 'selected'
    selectedIds: number[]
    options: Array<{ value: string | number; label: string }>
    onChange: (type: 'all' | 'selected', ids: number[]) => void
}

export function StoreSelector({
    value,
    selectedIds,
    options,
    onChange
}: StoreSelectorProps) {
    const [showModal, setShowModal] = useState(false)
    const [search, setSearch] = useState('')
    const [tempSelectedIds, setTempSelectedIds] = useState<number[]>([])

    useEffect(() => {
        if (showModal) {
            setTempSelectedIds([...selectedIds])
        }
    }, [showModal, selectedIds])

    const filteredOptions = options.filter((store) => {
        if (!search.trim()) return true
        return store.label.toLowerCase().includes(search.toLowerCase())
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
            <CustomCard isShowHeader={true} title="Chi nhánh">
                <RadioGroup
                    value={value}
                    onValueChange={(newValue) => {
                        if (newValue === 'all') {
                            onChange('all', [])
                        } else {
                            onChange('selected', selectedIds)
                        }
                    }}
                    name="store_type"
                >
                    <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="all" id="store-all" />
                            <Label htmlFor="store-all" className="cursor-pointer font-normal">
                                Tất cả
                            </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="selected" id="store-selected" />
                            <Label htmlFor="store-selected" className="cursor-pointer font-normal">
                                Chi nhánh được chọn
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
                                        Đã chọn {selectedIds.length} chi nhánh
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
                        <DialogTitle>Chọn chi nhánh</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="text"
                                placeholder="Tìm kiếm theo tên chi nhánh"
                                className="pl-9"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                autoFocus
                            />
                        </div>
                        <div className="max-h-[400px] overflow-y-auto">
                            {filteredOptions && filteredOptions.length > 0 ? (
                                <div className="space-y-1">
                                    {filteredOptions.map((store) => {
                                        const storeId = Number(store.value)
                                        return (
                                            <div key={store.value} className="flex items-center space-x-3 py-2 px-1 hover:bg-gray-50 rounded">
                                                <Checkbox
                                                    id={`store-${store.value}`}
                                                    checked={tempSelectedIds.includes(storeId)}
                                                    onCheckedChange={(checked) => {
                                                        if (checked) {
                                                            setTempSelectedIds([...tempSelectedIds, storeId])
                                                        } else {
                                                            setTempSelectedIds(tempSelectedIds.filter(id => id !== storeId))
                                                        }
                                                    }}
                                                />
                                                <Label htmlFor={`store-${store.value}`} className="cursor-pointer font-normal text-sm flex-1">
                                                    {store.label}
                                                </Label>
                                            </div>
                                        )
                                    })}
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground text-center py-8">
                                    {search ? 'Không tìm thấy chi nhánh nào' : 'Chưa có chi nhánh nào'}
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

