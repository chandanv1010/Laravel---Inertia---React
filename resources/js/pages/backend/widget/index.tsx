import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import { type BreadcrumbItem, type IPaginate, type PageConfig } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import CustomPageHeading from '@/components/custom-page-heading';
import CustomCard from '@/components/custom-card';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import CustomFilter from '@/components/custom-filter';
import { useFilter } from '@/hooks/use-filter';
import CustomTable from '@/components/custom-table';
import React from 'react';
import { TableRow, TableCell } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import CustomPagination from '@/components/custom-pagination';
import CustomConfirmDelete from '@/components/custom-confirm-delete';
import useTable from '@/hooks/use-table';
import { type SwitchState } from '@/hooks/use-switch';

export interface Widget {
    id: number;
    name: string;
    keyword: string;
    description: string;
    short_code: string;
    publish: number;
    model: string;
    created_at: string;
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: dashboard().url,
    },
    {
        title: 'Quản lý Khối (Widget)',
        href: '/backend/widget',
    }
];

const pageConfig: PageConfig<Widget> = {
    module: 'widget',
    heading: 'Quản lý Khối (Widget)',
    cardHeading: 'Danh sách Widget',
    cardDescription: 'Quản lý các khối nội dung động',
    filters: [
        {
            key: 'perpage',
            placeholder: 'Chọn số bản ghi',
            defaulValue: '20',
            options: ['20', '30', '40', '50'].map(item => ({
                label: `${item} bản ghi`,
                value: item
            })),
            className: 'w-[180px]',
            type: 'single' as const
        },
        {
            key: 'publish',
            placeholder: 'Chọn trạng thái',
            defaulValue: '0',
            options: [
                { label: 'Tất cả trạng thái', value: '0' },
                { label: 'Không hoạt động', value: '1' },
                { label: 'Hoạt động', value: '2' }
            ],
            type: 'single' as const
        }
    ],
    columns: [
        { key: 'checkbox', label: '', className: 'w-[50px]', sortable: false },
        { key: 'id', label: 'ID', className: 'w-[40px]', sortable: true },
        { key: 'name', label: 'Tên Widget', className: '', sortable: false },
        { key: 'keyword', label: 'Keyword', className: 'w-[20%]', sortable: false },
        { key: 'short_code', label: 'Shortcode', className: 'w-[20%]', sortable: false },
        { key: 'publish', label: 'Trạng thái', className: 'text-center w-[100px]', sortable: true },
        { key: 'actions', label: 'Thao tác', className: 'w-[100px] text-center', sortable: false },
    ],
    switches: ['publish'],
};

type SwitchField = NonNullable<typeof pageConfig.switches>[number];

const TableRowComponent = React.memo(({
    item,
    switches,
    checked,
    onSwitchChange,
    onCheckItem,
}: {
    item: Widget,
    switches: SwitchState<SwitchField>,
    checked: boolean,
    onSwitchChange: (id: number, field: SwitchField, currentValue: string) => void,
    onCheckItem: (id: number, checked: boolean) => void,
}) => {

    const effectivePublish = switches[item.id]?.values.publish ?? item.publish;
    const loading = switches[item.id]?.loading ?? false;

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
            <TableCell>
                <div className="flex flex-col">
                    <span className="font-semibold">{item.name}</span>
                    {item.description && (
                        <span className="text-xs text-gray-500 line-clamp-1">{item.description}</span>
                    )}
                </div>
            </TableCell>
            <TableCell>
                <code className="px-2 py-1 bg-gray-100 rounded text-xs text-pink-600 font-mono">
                    {item.keyword}
                </code>
            </TableCell>
            <TableCell>
                <code className="px-2 py-1 bg-gray-50 border rounded text-xs text-gray-600 font-mono select-all">
                    {item.short_code}
                </code>
            </TableCell>
            <TableCell className="text-center whitespace-nowrap">
                <Switch
                    className="cursor-pointer"
                    checked={effectivePublish == 2}
                    onCheckedChange={() => onSwitchChange(item.id, "publish", String(effectivePublish))}
                    disabled={loading}
                />
            </TableCell>
            <TableCell className="text-center whitespace-nowrap">
                <div className="flex items-center justify-center space-x-1">
                    <Link href={`/backend/widget/${item.id}/edit`}>
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
});

interface IWidgetIndexProps {
    widgets: IPaginate<Widget>,
}

export default function WidgetIndex({ widgets }: IWidgetIndexProps) {

    const { filters } = useFilter({
        defaultFilters: pageConfig.filters,
    });
    const {
        switches,
        isAllChecked,
        selectedIds,
        handleSwitchChange,
        handleCheckAll,
        handleCheckItem,
        setSelectedIds,
    } = useTable<Widget>({ pageConfig, records: widgets.data });

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
                                links={widgets.links}
                                currentPage={widgets.current_page}
                            />
                        }
                    >
                        <div className="flex flex-col mb-[10px]">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center justify-center">
                                    <CustomFilter filters={filters} />
                                </div>
                                <Link href={`/backend/${pageConfig.module}/create`}>
                                    <Button className="bg-[#ed5565] shadow rounded-[5px] cursor-pointer hover:bg-[#ed5565]/80">
                                        <PlusCircle />
                                        Thêm mới
                                    </Button>
                                </Link>
                            </div>
                        </div>
                        <CustomTable
                            data={widgets.data}
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
                            render={(item: Widget) =>
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
