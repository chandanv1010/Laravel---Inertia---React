
import { useState } from 'react'
import AppLayout from '@/layouts/app-layout'
import { Head, router, useForm } from '@inertiajs/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Edit, Trash2, Settings, PlusCircle } from 'lucide-react'
import CustomPageHeading from '@/components/custom-page-heading'
import CustomCard from '@/components/custom-card'
import CustomTable from '@/components/custom-table'
import { TableRow, TableCell } from '@/components/ui/table'
import InputError from '@/components/input-error'
import CustomConfirmDelete from '@/components/custom-confirm-delete'
import CustomPagination from '@/components/custom-pagination'
import CustomBulkAction from '@/components/custom-bulk-action'
import CustomOrderInput from '@/components/custom-order-input'
import { type BreadcrumbItem, type IPaginate, type PageConfig } from '@/types'
import useTable from '@/hooks/use-table'
import { type SwitchState } from '@/hooks/use-switch'
import { Switch } from '@/components/ui/switch'
import React from 'react'

interface SystemCatalogue {
    id: number
    name: string
    keyword: string
    sort_order: number
    publish: string
}

interface SystemCatalogueIndexProps {
    systemCatalogues: IPaginate<SystemCatalogue>
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Cấu hình chung', href: '/backend/setting/general' },
    { title: 'Cấu hình hệ thống', href: '/backend/system/catalogue' },
]

const pageConfig: PageConfig<SystemCatalogue> = {
    module: 'system/catalogue',
    heading: 'Quản lý nhóm cấu hình hệ thống',
    cardHeading: 'Danh sách nhóm cấu hình',
    cardDescription: 'Tạo và quản lý các nhóm cấu hình hệ thống (Ví dụ: Thông tin chung, SEO, Liên hệ...)',
    filters: [],
    columns: [
        { key: 'checkbox', label: '', className: 'w-[40px]', sortable: false },
        { key: 'id', label: 'ID', className: 'w-[50px]', sortable: true },
        { key: 'name', label: 'Tên nhóm', className: 'w-[250px]', sortable: false },
        { key: 'keyword', label: 'Từ khóa (Keyword)', className: 'w-[200px]', sortable: false },
        { key: 'sort_order', label: 'Thứ tự', className: 'text-center w-[100px]', sortable: false },
        { key: 'publish', label: 'Trạng thái', className: 'text-center w-[120px]', sortable: false },
        { key: 'actions', label: 'Thao tác', className: 'w-[200px] text-center', sortable: false },
    ],
    switches: ['publish'],
}

type SwitchField = NonNullable<typeof pageConfig.switches>[number]

const TableRowComponent = React.memo(({
    item,
    checked,
    onCheckItem,
    onEdit,
    switches,
    onSwitchChange,
}: {
    item: SystemCatalogue
    checked: boolean
    onCheckItem: (id: number, checked: boolean) => void
    onEdit: (catalogue: SystemCatalogue) => void
    switches: SwitchState<SwitchField>
    onSwitchChange: (id: number, field: SwitchField, currentValue: string) => void
}) => {
    const effectivePublish = switches[item.id]?.values.publish ?? item.publish
    const loading = switches[item.id]?.loading ?? false
    return (
        <TableRow key={item.id} className={`cursor-pointer ${checked ? 'bg-[#ffc]' : ''}`}>
            <TableCell className='font-medium w-[40px] whitespace-nowrap text-center'>
                <Input 
                    type="checkbox"
                    className="size-4 cursor-pointer mx-auto"
                    checked={checked}
                    onChange={(e) => onCheckItem(item.id, e.target.checked)}
                />
            </TableCell>
            <TableCell className="font-medium w-[50px] whitespace-nowrap">{item.id}</TableCell>
            <TableCell className="font-medium whitespace-nowrap">{item.name}</TableCell>
            <TableCell className="whitespace-nowrap">{item.keyword}</TableCell>
            <TableCell className="text-center whitespace-nowrap">
                <CustomOrderInput
                    id={item.id}
                    module={pageConfig.module!}
                    currentValue={item.sort_order}
                    fieldName="sort_order"
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
                        type='button' 
                        className="size-7 p-0 bg-[#0088FF] cursor-pointer rounded-[5px]"
                        onClick={() => router.get(`/backend/system/catalogue/${item.id}/systems`)}
                    >
                        <Settings className="w-4 h-4 text-white" />
                    </Button>
                    <Button 
                        type='button' 
                        className="size-7 p-0 bg-[#0088FF] cursor-pointer rounded-[5px]"
                        onClick={() => onEdit(item)}
                    >
                        <Edit className="w-4 h-4 text-white" />
                    </Button>
                    <CustomConfirmDelete
                        id={item.id}
                        module={pageConfig.module!}
                    >
                        <Button type='button' className="size-7 p-0 bg-[#ed5565] cursor-pointer rounded-[5px]">
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    </CustomConfirmDelete>
                </div>
            </TableCell>
        </TableRow>
    )
})

TableRowComponent.displayName = 'TableRowComponent'

export default function SystemCatalogueIndex({ systemCatalogues }: SystemCatalogueIndexProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [editingId, setEditingId] = useState<number | null>(null)

    const {
        switches,
        isAllChecked,
        selectedIds,
        handleCheckAll,
        handleCheckItem,
        setSelectedIds,
        handleSwitchChange
    } = useTable<SystemCatalogue>({ pageConfig, records: systemCatalogues.data })

    const { data, setData, post, put, processing, errors, reset } = useForm({
        name: '',
        keyword: '',
        sort_order: 0
    })

    const openCreate = () => {
        setEditingId(null)
        reset()
        setIsOpen(true)
    }

    const openEdit = (catalogue: SystemCatalogue) => {
        setEditingId(catalogue.id)
        setData({
            name: catalogue.name,
            keyword: catalogue.keyword,
            sort_order: catalogue.sort_order
        })
        setIsOpen(true)
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (editingId) {
            put(`/backend/system/catalogue/${editingId}`, {
                onSuccess: () => {
                    setIsOpen(false)
                    reset()
                }
            })
        } else {
            post('/backend/system/catalogue', {
                onSuccess: () => {
                    setIsOpen(false)
                    reset()
                }
            })
        }
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={pageConfig.heading} />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl page-wrapper">
                <CustomPageHeading 
                    heading={pageConfig.heading}
                    breadcrumbs={breadcrumbs}
                />

                <div className="page-container">
                    <CustomCard
                        isShowHeader={true}
                        title={pageConfig.cardHeading}
                        description={pageConfig.cardDescription}
                        isShowFooter={true}
                        footerChildren={
                            <CustomPagination 
                                links={systemCatalogues.links}
                                currentPage={systemCatalogues.current_page}
                            />
                        }
                    >
                        <div className="flex items-center justify-between mb-[10px]">
                            <div className="flex items-center justify-center">
                                {selectedIds.length > 0 &&  
                                    <CustomBulkAction 
                                        className="mr-[10px]"
                                        module={pageConfig.module!}
                                        selectedIds={selectedIds}
                                        setSelectedIds={setSelectedIds}
                                        resource="systemCatalogues"
                                    />
                                }
                            </div>
                            <Button 
                                className="bg-[#ed5565] shadow rounded-[5px] cursor-pointer hover:bg-[#ed5565]/80"
                                onClick={openCreate}
                            >
                                <PlusCircle />
                                Thêm nhóm mới
                            </Button>
                        </div>

                        <CustomTable 
                            data={systemCatalogues.data}
                            columns={[
                                {
                                    key: 'checkbox',
                                    label: (
                                        <div className="flex justify-center">
                                            <Input 
                                                type="checkbox"
                                                className="size-4 cursor-pointer"
                                                checked={isAllChecked}
                                                onChange={(e) => handleCheckAll(e.target.checked)}
                                            />
                                        </div>
                                    ),
                                    className: 'w-[40px] text-center'
                                },
                                ...(pageConfig.columns ?? []).filter(c => c.key !== 'checkbox')
                            ]}
                            render={(item: SystemCatalogue) => 
                                <TableRowComponent 
                                    key={item.id}
                                    item={item}
                                    checked={selectedIds.includes(item.id)}
                                    onCheckItem={handleCheckItem}
                                    onEdit={openEdit}
                                    switches={switches}
                                    onSwitchChange={handleSwitchChange}
                                />
                            }
                        />
                    </CustomCard>
                </div>
            </div>

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingId ? 'Cập nhật nhóm' : 'Thêm nhóm mới'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Tên nhóm</Label>
                            <Input 
                                value={data.name} 
                                onChange={e => setData('name', e.target.value)} 
                                required 
                            />
                            <InputError message={errors.name} />
                        </div>
                        <div className="space-y-2">
                            <Label>Từ khóa (Duy nhất)</Label>
                            <Input 
                                value={data.keyword} 
                                onChange={e => setData('keyword', e.target.value)} 
                                required 
                            />
                            <InputError message={errors.keyword} />
                        </div>
                        <div className="space-y-2">
                            <Label>Thứ tự</Label>
                            <Input 
                                type="number" 
                                value={data.sort_order} 
                                onChange={e => setData('sort_order', parseInt(e.target.value) || 0)} 
                            />
                            <InputError message={errors.sort_order} />
                        </div>
                        <DialogFooter>
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
