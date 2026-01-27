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
import React from 'react';
import { TableRow, TableCell } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Edit, Trash2, Menu as MenuIcon } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import CustomPagination from '@/components/custom-pagination';
import CustomConfirmDelete from '@/components/custom-confirm-delete';
import { type SwitchState } from '@/hooks/use-switch';
import useTable from '@/hooks/use-table';
import CustomBulkAction from '@/components/custom-bulk-action';
import CustomActiveFilters from '@/components/custom-active-filters';
import { Badge } from '@/components/ui/badge';

export interface Menu {
    id: number;
    name: string;
    code: string;
    position: string | null;
    description: string | null;
    publish: string;
    user_id: number;
    order: number;
    created_at: string;
    creator?: { name: string };
    items?: MenuItem[];
}

export interface MenuItem {
    id: number;
    menu_id: number;
    parent_id: number | null;
    name: string;
    url: string | null;
    target: string;
    icon: string | null;
    linkable_type: string | null;
    linkable_id: number | null;
    publish: string;
    order: number;
    children?: MenuItem[];
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: dashboard().url,
    },
    {
        title: 'Quản lý Menu',
        href: '/',
    }
];

const pageConfig: PageConfig<Menu> = {
    module: 'menu',
    heading: 'Quản lý Menu',
    cardHeading: 'Bảng quản lý danh sách Menu',
    cardDescription: 'Quản lý các menu hiển thị trên website như Header, Footer, Sidebar...',
    filters: [...filter],
    columns: [
        { key: 'checkbox', label: '', className: 'w-[60px] text-center' },
        { key: 'id', label: 'ID', className: 'w-[60px] text-center' },
        { key: 'name', label: 'Tên Menu', className: 'w-[25%]' },
        { key: 'code', label: 'Mã Menu', className: 'w-[15%]' },
        { key: 'position', label: 'Vị trí', className: 'w-[15%]' },
        { key: 'items', label: 'Số mục', className: 'text-center' },
        { key: 'creator', label: 'Người tạo', className: 'text-center min-w-[140px] whitespace-nowrap' },
        { key: 'created_at', label: 'Ngày tạo', className: 'text-center min-w-[150px] whitespace-nowrap' },
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
    item: Menu,
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
                <div className="flex items-center gap-2">
                    <MenuIcon className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{item.name}</span>
                </div>
            </TableCell>
            <TableCell>
                <code className="text-xs bg-gray-100 px-2 py-1 rounded">{item.code}</code>
            </TableCell>
            <TableCell>
                {item.position ? (
                    <Badge variant="outline">{item.position}</Badge>
                ) : (
                    <span className="text-muted-foreground">-</span>
                )}
            </TableCell>
            <TableCell className="text-center">
                <Badge variant="secondary">{item.items?.length || 0} mục</Badge>
            </TableCell>
            <TableCell className="text-center">{item.creator?.name || '-'}</TableCell>
            <TableCell className="text-center">{item.created_at}</TableCell>
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

interface IMenuIndexProps {
    users?: User[],
    menus: IPaginate<Menu>,
}

export default function MenuIndex({ users, menus }: IMenuIndexProps) {

    const { filters } = useFilter({ users, defaultFilters: pageConfig.filters })
    const {
        switches,
        isAllChecked,
        selectedIds,
        handleSwitchChange,
        handleCheckAll,
        handleCheckItem,
        setSelectedIds
    } = useTable<Menu>({ pageConfig, records: menus.data })


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
                                links={menus.links}
                                currentPage={menus.current_page}
                            />
                        }
                    >
                        <div className="flex items-center justify-between mb-[10px]">
                            <div className="flex items-center justify-center">
                                {selectedIds.length > 0 &&
                                    <CustomBulkAction
                                        className="mr-[10px]"
                                        module={pageConfig.module!}
                                        resource="menus"
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
                                    Thêm Menu Mới
                                </Button>
                            </Link>
                        </div>
                        <CustomActiveFilters filters={filters} />
                        <CustomTable
                            data={menus.data}
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
                                    className: 'w-[60px] text-center'
                                },
                                ...(pageConfig.columns ?? []).filter(c => c.key !== 'checkbox')
                            ]}
                            render={(item: Menu) =>
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
