import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import { User, type BreadcrumbItem, type IPaginate } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { type PageConfig } from '@/types';
import CustomPageHeading from '@/components/custom-page-heading';
import CustomCard from '@/components/custom-card';
import { PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import CustomFilter from '@/components/custom-filter';
import { filter } from '@/constants/filter';
import { useFilter } from '@/hooks/use-filter';
import CustomTable from '@/components/custom-table';
import { Supplier } from './save';
import React from 'react';
import { TableRow, TableCell } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Edit, Trash2, Phone } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import CustomPagination from '@/components/custom-pagination';
import CustomConfirmDelete from '@/components/custom-confirm-delete';
import { type SwitchState } from '@/hooks/use-switch';
import useTable from '@/hooks/use-table';
import CustomBulkAction from '@/components/custom-bulk-action';
import CustomActiveFilters from '@/components/custom-active-filters';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: dashboard().url,
    },
    {
        title: 'Quản lý nhà cung cấp',
        href: '/',
    }
];

const pageConfig: PageConfig<Supplier> = {
    module: 'supplier',
    heading: 'Quản lý nhà cung cấp',
    cardHeading: 'Bảng quản lý danh sách nhà cung cấp',
    cardDescription: 'Quản lý thông tin danh sách nhà cung cấp, sử dụng các chức năng để lọc dữ liệu vv...',
    filters: [...filter],
    columns: [
        { key: 'checkbox', label: '', className: 'w-[60px] text-center' },
        { key: 'id', label: 'ID', className: 'w-[40px] text-center' },
        { key: 'code', label: 'Mã nhà cung cấp', className: 'w-[12%]' },
        { key: 'name', label: 'Tên nhà cung cấp', className: 'w-[20%]' },
        { key: 'contact', label: 'Liên hệ', className: 'w-[12%]' },
        { key: 'responsible_user', label: 'Nhân viên phụ trách', className: 'w-[15%]' },
        { key: 'creator', label: 'Người tạo', className: 'text-center whitespace-nowrap' },
        { key: 'created_at', label: 'Ngày tạo', className: 'text-center whitespace-nowrap' },
        { key: 'publish', label: 'Trạng thái', className: 'text-center' },
        { key: 'actions', label: 'Thao tác', className: 'w-[120px] text-center' },
    ],
    switches: ['publish'],
}

type SwitchField = NonNullable<typeof pageConfig.switches>[number]

const TableRowComponent = React.memo(({
    item,
    switches,
    checked,
    onSwitchChange,
    onCheckItem
}: {
    item: Supplier,
    switches: SwitchState<SwitchField>,
    checked: boolean,
    onSwitchChange: (id: number, field: SwitchField, currentValue: string) => void,
    onCheckItem: (id: number, checked: boolean) => void
}) => {

    const effectivePublish = switches[item.id]?.values.publish ?? item.publish
    const loading = switches[item.id]?.loading ?? false

    return (
        <TableRow key={item.id} className={`cursor-pointer ${checked ? 'bg-[#ffc]' : ''}`}>
            <TableCell className='w-[60px]'>
                <div className="flex items-center justify-center">
                    <Input
                        type="checkbox"
                        className="size-4 cursor-pointer"
                        checked={checked}
                        onChange={e => onCheckItem(item.id, e.target.checked)}
                    />
                </div>
            </TableCell>
            <TableCell className="text-center">{item.id}</TableCell>
            <TableCell>
                <Link
                    href={`/backend/supplier/${item.id}/info`}
                    className="font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                >
                    {item.code || '-'}
                </Link>
            </TableCell>
            <TableCell>
                <div className="flex flex-col">
                    <span className="font-medium">{item.name}</span>
                </div>
            </TableCell>
            <TableCell>
                {item.phone ? (
                    <div className="flex items-center gap-1 text-sm">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        <span>{item.phone}</span>
                    </div>
                ) : (
                    <span className="text-muted-foreground">-</span>
                )}
            </TableCell>
            <TableCell>{item.responsibleUser?.name || '-'}</TableCell>
            <TableCell className="text-center whitespace-nowrap">{item.creators?.name || '-'}</TableCell>
            <TableCell className="text-center whitespace-nowrap">{item.created_at}</TableCell>
            <TableCell className="text-center">
                <div className="flex justify-center">
                    <Switch
                        className="cursor-pointer"
                        checked={effectivePublish === '2'}
                        onCheckedChange={() => onSwitchChange(item.id, "publish", effectivePublish)}
                        disabled={loading}
                    />
                </div>
            </TableCell>
            <TableCell className="text-center">
                <div className="flex items-center justify-center space-x-1">
                    <Link href={`/backend/${pageConfig.module}/${item.id}/edit`}>
                        <Button type='button' className="size-7 p-0 bg-[#0088FF] cursor-pointer rounded-[5px]">
                            <Edit />
                        </Button>
                    </Link>
                    <CustomConfirmDelete
                        id={item.id}
                        module={pageConfig.module}
                    >
                        <Button type='button' className="size-7 p-0 bg-[#ed5565] cursor-pointer rounded-[5px]">
                            <Trash2 />
                        </Button>
                    </CustomConfirmDelete>
                </div>
            </TableCell>
        </TableRow>
    )
})

interface ISupplierIndexProps {
    users: IPaginate<User>,
    records: IPaginate<Supplier>,
}

export default function SupplierIndex({ users, records }: ISupplierIndexProps) {

    const { filters } = useFilter({ users: users.data, defaultFilters: pageConfig.filters })
    const {
        switches,
        isAllChecked,
        selectedIds,
        handleSwitchChange,
        handleCheckAll,
        handleCheckItem,
        setSelectedIds
    } = useTable<Supplier>({ pageConfig, records: records.data })


    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={pageConfig.heading} />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl  page-wrapper">
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
                                links={records.links}
                                currentPage={records.current_page}
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
                                    />
                                }
                                <CustomFilter
                                    filters={filters}
                                />
                            </div>
                            <Link href={`/backend/${pageConfig.module}/create`}>
                                <Button className="bg-[#ed5565] shadow rounded-[5px] cursor-pointer hover:bg-[#ed5565]/80">
                                    <PlusCircle />
                                    Thêm bản ghi mới
                                </Button>
                            </Link>
                        </div>
                        <CustomActiveFilters filters={filters} />
                        <CustomTable
                            data={records.data}
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
                                    className: 'w-[60px]'
                                },
                                ...(pageConfig.columns ?? []).filter(c => c.key !== 'checkbox')
                            ]}
                            render={(item: Supplier) =>
                                <TableRowComponent
                                    key={item.id}
                                    item={item}
                                    switches={switches}
                                    checked={selectedIds.includes(item.id)}
                                    onSwitchChange={handleSwitchChange}
                                    onCheckItem={handleCheckItem}
                                />
                            }
                        />

                    </CustomCard>
                </div>
            </div>
        </AppLayout>
    );
}
