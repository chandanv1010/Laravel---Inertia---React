
import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import { type User,  type BreadcrumbItem, type IPaginate } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { type PageConfig } from '@/types';
import CustomPageHeading from '@/components/custom-page-heading';
import CustomCard from '@/components/custom-card';
import { PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import CustomFilter from '@/components/custom-filter';
import { filter } from '@/constants/filter';
// import { useEffect, useMemo } from 'react';
import { useFilter } from '@/hooks/use-filter';
import CustomTable from '@/components/custom-table';
import React, {  } from 'react';
import { TableRow, TableCell } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Edit, Trash2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import CustomPagination from '@/components/custom-pagination';
import CustomConfirmDelete from '@/components/custom-confirm-delete';
import { type SwitchState } from '@/hooks/use-switch';
import useTable from '@/hooks/use-table';
import CustomBulkAction from '@/components/custom-bulk-action';
import { UserCatalogue } from '../user_catalogue/save';
import { useMemo } from 'react';
import { IFilter } from '@/types';
import CustomActiveFilters from '@/components/custom-active-filters';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: dashboard().url,
    },
    {
        title: 'Quản lý ',
        href: '/',
    }
];


const pageConfig: PageConfig<User> = {
    module: 'user',
    heading: 'Quản lý Thành Viên',
    cardHeading: 'Bảng quản lý danh sách Thành Viên',
    cardDescription: 'Quản lý thông tin danh sách Thành Viên, sử dụng các chức năng để lọc dữ liệu vv...',
    filters: [...filter],
    columns: [
        { key: 'checkbox', label: '', className: 'w-[60px]' },
        { key: 'id', label: 'ID', className: 'w-[60px]' },
        { key: 'name', label: 'Tên thành viên', className: 'w-[15%]' },
        { key: 'email', label: 'Email', className: 'w-[10%]' },
        { key: 'user_catalogues', label: 'Nhóm thành viên', className: 'w-[15%]' },
        { key: 'created_at', label: 'Ngày tạo', className: 'text-center' },
        { key: 'updated_at', label: 'Ngày sửa', className: 'text-center' },
        { key: 'publish', label: 'Trạng thái', className: 'text-center' },
        { key: 'actions', label: 'Thao tác', className: 'w-[120px] text-center' },
    ],
    switches: ['publish'] as const,
}

type SwitchField = NonNullable<typeof pageConfig.switches>[number]

const TableRowComponent = React.memo(({
    item,
    switches,
    checked,
    onSwitchChange,
    onCheckItem
}: {
    item: User,
    switches: SwitchState<SwitchField>,
    checked: boolean,
    onSwitchChange: (id: number, field: SwitchField, currentValue: string) => void,
    onCheckItem: (id: number, checked: boolean) => void

}) => {

    const effectivePublish = switches[item.id]?.values.publish ?? item.publish
    const loading = switches[item.id]?.loading ?? false

    return (
        <TableRow key={item.id} className={`cursor-pointer ${checked ? 'bg-[#ffc]' : ''}`}>
            <TableCell className='font-medium'>
                <Input 
                    type="checkbox" 
                    className="size-4 cursor-pointer" 
                    checked={checked}
                    onChange={e => onCheckItem(item.id, e.target.checked)}
                />
            </TableCell>
            <TableCell>{item.id}</TableCell>
            <TableCell>{item.name}</TableCell>
            <TableCell>{item.email}</TableCell>
            <TableCell>
                {item.user_catalogues.map(catalogue => (
                    <span
                        key={catalogue.id}
                        className="inline-block px-2 py-1 text-xs rounded-[5px] bg-gray-200 text-gray-700 mr-1"
                    >{catalogue.name}</span>
                ))}
            </TableCell>
            <TableCell className="text-center">{item.created_at}</TableCell>
            <TableCell className="text-center">{item.updated_at}</TableCell>
            <TableCell className="text-center">
                <Switch 
                    className="cursor-pointer" 
                    checked={effectivePublish === '2'} 
                    onCheckedChange={() => onSwitchChange(item.id, "publish", effectivePublish)}
                    disabled={loading}
                />
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


interface IUserIndexProps {
    users: User[],
    records: IPaginate<User>,
    userCatalogues: UserCatalogue[]
}
export default function UserIndex({users, records, userCatalogues}: IUserIndexProps) {

    const { filters: baseFilters } = useFilter({users, defaultFilters: pageConfig.filters, isShowCreatorFilter: false})
    
    const filters = useMemo<IFilter[]>(() => {
        return [
            ...baseFilters,
            {
                key: 'user_catalogues',
                placeholder: 'Chọn nhóm thành viên',
                options: [
                    ...userCatalogues.map(catalogue => ({
                        label: catalogue.name,
                        value: catalogue.id.toString()
                    }))
                ],
                defaulValue: [],
                type: 'multiple',
                operator: 'in',
                field: 'id'
            }
        ]    


    }, [userCatalogues, baseFilters])



    const {
        switches, 
        isAllChecked,
        selectedIds,
        handleSwitchChange,
        handleCheckAll,
        handleCheckItem,
        setSelectedIds
    } = useTable<User>({pageConfig, records: records.data})
    

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
                            render={(item: User) => 
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
