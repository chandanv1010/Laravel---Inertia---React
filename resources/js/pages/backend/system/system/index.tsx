
import { useState } from 'react'
import AppLayout from '@/layouts/app-layout'
import { Head, useForm, router } from '@inertiajs/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import CustomTable from '@/components/custom-table'
import { TableRow, TableCell } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Edit, Trash2, Plus, ArrowLeft, X } from 'lucide-react'
import CustomPageHeading from '@/components/custom-page-heading'
import CustomCard from '@/components/custom-card'
import InputError from '@/components/input-error'
import { Textarea } from '@/components/ui/textarea'
import CustomConfirmDelete from '@/components/custom-confirm-delete'
import CustomBulkAction from '@/components/custom-bulk-action'
import CustomOrderInput from '@/components/custom-order-input'
import { type BreadcrumbItem } from '@/types'
import { type PageConfig } from '@/types'
import useTable from '@/hooks/use-table'
import { type SwitchState } from '@/hooks/use-switch'
import React from 'react'

interface System {
    id: number
    label: string
    keyword: string
    type: string
    description?: string
    sort_order: number
    is_translatable: number
    publish: string
    attributes?: {
        options?: Array<{ value: string; label: string }>
    }
}

interface SystemCatalogue {
    id: number
    name: string
    keyword: string
}

interface SystemIndexProps {
    catalogue: SystemCatalogue
    systems: System[]
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Cấu hình chung', href: '/backend/setting/general' },
    { title: 'Cấu hình hệ thống', href: '/backend/system/catalogue' },
    { title: '', href: '#' },
]

const pageConfig: PageConfig<System> = {
    module: 'system/config',
    heading: `Cấu hình: `,
    cardHeading: 'Danh sách trường',
    cardDescription: 'Quản lý các trường dữ liệu trong nhóm này.',
    filters: [],
    columns: [
        { key: 'checkbox', label: '', className: 'w-[50px]', sortable: false },
        { key: 'id', label: 'ID', className: 'w-[60px]', sortable: true },
        { key: 'label', label: 'Tên trường (Label)', className: 'w-[200px]', sortable: false },
        { key: 'keyword', label: 'Từ khóa (Keyword)', className: 'w-[150px]', sortable: false },
        { key: 'type', label: 'Loại (Type)', className: 'w-[120px]', sortable: false },
        { key: 'sort_order', label: 'Thứ tự', className: 'text-center w-[100px]', sortable: true },
        { key: 'is_translatable', label: 'Dịch đa ngôn ngữ', className: 'text-center w-[150px]', sortable: false },
        { key: 'publish', label: 'Trạng thái', className: 'text-center w-[120px]', sortable: true },
        { key: 'actions', label: 'Thao tác', className: 'w-[120px] text-center', sortable: false },
    ],
    switches: ['publish', 'is_translatable'],
}

type SwitchField = NonNullable<typeof pageConfig.switches>[number]

const TableRowComponent = React.memo(({
    item,
    switches,
    checked,
    onSwitchChange,
    onCheckItem,
    onEdit
}: {
    item: System
    switches: SwitchState<SwitchField>
    checked: boolean
    onSwitchChange: (id: number, field: SwitchField, currentValue: string) => void
    onCheckItem: (id: number, checked: boolean) => void
    onEdit: (sys: System) => void
}) => {
    // Get effective values from switches state or fallback to item values
    // use-switch already converts is_translatable: 0 -> '1', 1 -> '2'
    const effectivePublish = switches[item.id]?.values.publish ?? String(item.publish)
    const effectiveIsTranslatable = switches[item.id]?.values.is_translatable ?? ((item.is_translatable === 1 || item.is_translatable === '1') ? '2' : '1')
    const loading = switches[item.id]?.loading ?? false

    return (
        <TableRow key={item.id} className={`cursor-pointer ${checked ? 'bg-[#ffc]' : ''}`}>
            <TableCell className='font-medium w-[50px] whitespace-nowrap'>
                <Input
                    type="checkbox"
                    className="size-4 cursor-pointer"
                    checked={checked}
                    onChange={e => onCheckItem(item.id, e.target.checked)}
                />
            </TableCell>
            <TableCell className="whitespace-nowrap">{item.id}</TableCell>
            <TableCell className="font-medium">{item.label}</TableCell>
            <TableCell>{item.keyword}</TableCell>
            <TableCell className="capitalize">{item.type}</TableCell>
            <TableCell className="text-center">
                <CustomOrderInput
                    id={item.id}
                    module={pageConfig.module || ''}
                    currentValue={item.sort_order}
                    fieldName="sort_order"
                />
            </TableCell>
            <TableCell className="text-center">
                <Switch
                    className="cursor-pointer"
                    checked={effectiveIsTranslatable === '2'}
                    onCheckedChange={() => {
                        onSwitchChange(item.id, "is_translatable", effectiveIsTranslatable)
                    }}
                    disabled={loading}
                />
            </TableCell>
            <TableCell className="text-center whitespace-nowrap">
                <Switch
                    className="cursor-pointer"
                    checked={effectivePublish === '2'}
                    onCheckedChange={() => onSwitchChange(item.id, "publish", effectivePublish)}
                    disabled={loading}
                />
            </TableCell>
            <TableCell className="text-center whitespace-nowrap">
                <div className="flex items-center justify-center space-x-1">
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                            e.stopPropagation()
                            onEdit(item)
                        }}
                        className="size-7 p-0 bg-[#0088FF] text-white cursor-pointer rounded-[5px] hover:bg-[#0088FF]/90"
                    >
                        <Edit className="w-4 h-4" />
                    </Button>
                    <CustomConfirmDelete
                        id={item.id}
                        module={pageConfig.module}
                    >
                        <Button
                            type='button'
                            className="size-7 p-0 bg-[#ed5565] cursor-pointer rounded-[5px]"
                        >
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    </CustomConfirmDelete>
                </div>
            </TableCell>
        </TableRow>
    )
})

export default function SystemIndex({ catalogue, systems = [] }: SystemIndexProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [editingId, setEditingId] = useState<number | null>(null)

    const { data, setData, post, put, processing, errors, reset } = useForm({
        system_catalogue_id: catalogue.id,
        label: '',
        keyword: '',
        type: 'text',
        description: '',
        sort_order: 0,
        is_translatable: true,
        publish: '2',
        attributes: {}
    })

    const [selectOptions, setSelectOptions] = useState<Array<{ value: string; label: string }>>([])

    const {
        switches,
        isAllChecked,
        selectedIds,
        handleSwitchChange,
        handleCheckAll,
        handleCheckItem,
        setSelectedIds,
    } = useTable<System>({ pageConfig, records: systems })

    const openCreate = () => {
        setEditingId(null)
        reset()
        setSelectOptions([])
        setData(curr => ({
            ...curr,
            system_catalogue_id: catalogue.id,
            is_translatable: true,
            publish: '2',
            attributes: {}
        }))
        setIsOpen(true)
    }

    const openEdit = (sys: System) => {
        setEditingId(sys.id)
        const options = sys.attributes?.options || []
        setSelectOptions(options)
        setData({
            system_catalogue_id: catalogue.id,
            label: sys.label,
            keyword: sys.keyword,
            type: sys.type,
            description: sys.description || '',
            sort_order: sys.sort_order,
            is_translatable: sys.is_translatable === 1,
            publish: sys.publish || '2',
            attributes: sys.attributes || {}
        })
        setIsOpen(true)
    }

    const addSelectOption = () => {
        setSelectOptions([...selectOptions, { value: '', label: '' }])
    }

    const updateSelectOption = (index: number, field: 'value' | 'label', newValue: string) => {
        const updated = [...selectOptions]
        updated[index] = { ...updated[index], [field]: newValue }
        setSelectOptions(updated)
        setData('attributes', { options: updated })
    }

    const removeSelectOption = (index: number) => {
        const updated = selectOptions.filter((_, i) => i !== index)
        setSelectOptions(updated)
        setData('attributes', { options: updated })
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        
        // Prepare attributes for select type
        const submitData = { ...data }
        if (data.type === 'select') {
            submitData.attributes = { options: selectOptions.filter(opt => opt.value && opt.label) }
        } else {
            submitData.attributes = {}
        }
        
        if (editingId) {
            put(`/backend/system/config/${editingId}`, {
                data: submitData,
                onSuccess: () => {
                    setIsOpen(false)
                    setSelectOptions([])
                }
            })
        } else {
            post('/backend/system/config', {
                data: submitData,
                onSuccess: () => {
                    setIsOpen(false)
                    setSelectOptions([])
                }
            })
        }
    }

    const updatedBreadcrumbs = breadcrumbs.map((crumb, index) =>
        index === breadcrumbs.length - 1 ? { ...crumb, title: catalogue.name } : crumb
    )

    return (
        <AppLayout breadcrumbs={updatedBreadcrumbs}>
            <Head title={`Cấu hình: ${catalogue.name}`} />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl page-wrapper">
                <CustomPageHeading
                    heading={`${pageConfig.heading}${catalogue.name}`}
                    breadcrumbs={updatedBreadcrumbs}
                />

                <div className="page-container">
                    <CustomCard
                        isShowHeader={true}
                        title={pageConfig.cardHeading}
                        description={pageConfig.cardDescription}
                        isShowFooter={false}
                    >
                        <div className="flex flex-col mb-[10px]">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center justify-center">
                                    {selectedIds.length > 0 &&
                                        <CustomBulkAction
                                            className="mr-[10px]"
                                            module={pageConfig.module!}
                                            selectedIds={selectedIds}
                                            setSelectedIds={setSelectedIds}
                                            resource="systems"
                                            actions={[
                                                {
                                                    label: 'Bật dịch đa ngôn ngữ',
                                                    run: (ids: number[], module: string, resource: string) => {
                                                        if (ids.length) {
                                                            router.patch(`/backend/${module}`, {
                                                                ids: ids,
                                                                is_translatable: '2'
                                                            }, {
                                                                only: [resource, 'flash'],
                                                                preserveScroll: true,
                                                                preserveState: true
                                                            })
                                                        }
                                                    }
                                                },
                                                {
                                                    label: 'Tắt dịch đa ngôn ngữ',
                                                    run: (ids: number[], module: string, resource: string) => {
                                                        if (ids.length) {
                                                            router.patch(`/backend/${module}`, {
                                                                ids: ids,
                                                                is_translatable: '1'
                                                            }, {
                                                                only: [resource, 'flash'],
                                                                preserveScroll: true,
                                                                preserveState: true
                                                            })
                                                        }
                                                    }
                                                }
                                            ]}
                                        />
                                    }
                                    <Button
                                        variant="outline"
                                        onClick={() => router.get('/backend/setting/general')}
                                        className="mr-[10px]"
                                    >
                                        <ArrowLeft className="w-4 h-4 mr-2" />
                                        Quay lại
                                    </Button>
                                </div>
                                <Button onClick={openCreate} className="bg-[#ed5565] shadow rounded-[5px] cursor-pointer hover:bg-[#ed5565]/80">
                                    <Plus className="w-4 h-4 mr-2" />
                                    Thêm trường
                                </Button>
                            </div>
                        </div>

                        <CustomTable
                            data={systems}
                            columns={[
                                {
                                    key: 'checkbox',
                                    label: (
                                        <Input
                                            type="checkbox"
                                            className="size-4 cursor-pointer"
                                            checked={isAllChecked}
                                            onChange={(e) => handleCheckAll(e.target.checked)}
                                        />
                                    ),
                                    className: 'w-[50px]'
                                },
                                ...(pageConfig.columns ?? []).filter(c => c.key !== 'checkbox')
                            ]}
                            render={(item: System) =>
                                <TableRowComponent
                                    key={item.id}
                                    item={item}
                                    switches={switches}
                                    checked={selectedIds.includes(item.id)}
                                    onSwitchChange={handleSwitchChange}
                                    onCheckItem={handleCheckItem}
                                    onEdit={openEdit}
                                />
                            }
                        />
                    </CustomCard>
                </div>
            </div>

            {/* Create/Edit Modal */}
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{editingId ? 'Cập nhật trường' : 'Thêm trường mới'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Tên trường (Label)</Label>
                                <Input value={data.label} onChange={e => setData('label', e.target.value)} required />
                                <InputError message={errors.label} />
                            </div>
                            <div className="space-y-2">
                                <Label>Từ khóa (Keyword)</Label>
                                <Input value={data.keyword} onChange={e => setData('keyword', e.target.value)} required />
                                <InputError message={errors.keyword} />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Loại dữ liệu</Label>
                            <Select value={data.type} onValueChange={val => {
                                setData('type', val)
                                if (val !== 'select') {
                                    setSelectOptions([])
                                    setData('attributes', {})
                                }
                            }}>
                                <SelectTrigger className="w-[50%]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="text">Input Text</SelectItem>
                                    <SelectItem value="textarea">Textarea</SelectItem>
                                    <SelectItem value="editor">Editor (CKEditor)</SelectItem>
                                    <SelectItem value="image">Hình ảnh</SelectItem>
                                    <SelectItem value="select">Select Box</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {data.type === 'select' && (
                            <div className="space-y-2 border rounded-md p-4 bg-gray-50">
                                <div className="flex items-center justify-between mb-2">
                                    <Label>Danh sách lựa chọn</Label>
                                    <Button 
                                        type="button" 
                                        variant="outline" 
                                        size="sm"
                                        onClick={addSelectOption}
                                    >
                                        <Plus className="w-4 h-4 mr-1" />
                                        Thêm option
                                    </Button>
                                </div>
                                {selectOptions.length === 0 ? (
                                    <p className="text-sm text-gray-500 text-center py-2">
                                        Chưa có option nào. Nhấn "Thêm option" để thêm.
                                    </p>
                                ) : (
                                    <div className="space-y-2">
                                        {selectOptions.map((option, index) => (
                                            <div key={index} className="flex gap-2 items-center">
                                                <Input
                                                    placeholder="Giá trị (value)"
                                                    value={option.value}
                                                    onChange={(e) => updateSelectOption(index, 'value', e.target.value)}
                                                    className="flex-1"
                                                />
                                                <Input
                                                    placeholder="Nhãn hiển thị (label)"
                                                    value={option.label}
                                                    onChange={(e) => updateSelectOption(index, 'label', e.target.value)}
                                                    className="flex-1"
                                                />
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => removeSelectOption(index)}
                                                    className="text-red-500 hover:text-red-700"
                                                >
                                                    <X className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label>Mô tả (Helper text)</Label>
                            <Textarea value={data.description} onChange={e => setData('description', e.target.value)} className="min-h-[250px]" rows={10} />
                        </div>

                        <div className="space-y-2">
                            <Label>Thứ tự</Label>
                            <Input type="number" value={data.sort_order} onChange={e => setData('sort_order', parseInt(e.target.value) || 0)} />
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                                Hủy
                            </Button>
                            <Button type="submit" disabled={processing}>
                                {editingId ? 'Cập nhật' : 'Thêm mới'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

        </AppLayout>
    )
}
