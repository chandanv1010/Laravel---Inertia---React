
import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import { type BreadcrumbItem, type IPaginate } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { type PageConfig } from '@/types';
import CustomPageHeading from '@/components/custom-page-heading';
import CustomCard from '@/components/custom-card';
import { PlusCircle, Edit, Trash2, Star } from 'lucide-react';
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
import { type SwitchState } from '@/hooks/use-switch';
import useTable from '@/hooks/use-table';
import CustomActiveFilters from '@/components/custom-active-filters';
import CustomBulkAction from '@/components/custom-bulk-action';

export interface Review {
    id: number;
    fullname: string;
    email: string | null;
    phone: string | null;
    content: string;
    score: number;
    publish: number;
    reviewable_type: string;
    reviewable_id: number;
    created_at: string;
    reviewable?: {
        name: string;
        id?: number;
    };
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: dashboard().url,
    },
    {
        title: 'Quản lý Đánh giá',
        href: '/backend/review',
    }
];

const pageConfig: PageConfig<Review> = {
    module: 'review',
    heading: 'Quản lý Đánh giá',
    cardHeading: 'Danh sách Đánh giá',
    cardDescription: 'Quản lý đánh giá sản phẩm và bài viết',
    filters: [
        {
            key: 'perpage',
            placeholder: 'Chọn số bản ghi',
            defaulValue: '20',
            options: ['20', '30', '40', '50', '60', '80', '100'].map(item => ({
                label: `${item} bản ghi`,
                value: item
            })),
            className: 'w-[180px]',
            type: 'single'
        },
        {
            key: 'module',
            placeholder: 'Chọn Module',
            defaulValue: '0',
            options: [
                { label: 'Tất cả Module', value: '0' },
                { label: 'Sản phẩm', value: 'product' },
                { label: 'Bài viết', value: 'post' }
            ],
            type: 'single'
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
            type: 'single'
        }
    ],
    columns: [
        { key: 'checkbox', label: '', className: 'w-[50px]', sortable: false },
        { key: 'id', label: 'ID', className: 'w-[40px]', sortable: true },
        { key: 'info', label: 'Người đánh giá', className: '', sortable: false },
        { key: 'content', label: 'Nội dung', className: 'w-[30%]', sortable: false },
        { key: 'score', label: 'Điểm', className: 'text-center w-[100px]', sortable: true },
        { key: 'target', label: 'Đánh giá cho', className: 'w-[20%]', sortable: false },
        { key: 'publish', label: 'Trạng thái', className: 'text-center w-[100px]', sortable: true },
        { key: 'actions', label: 'Thao tác', className: 'w-[100px] text-center', sortable: false },
    ],
    switches: ['publish'],
}

type SwitchField = NonNullable<typeof pageConfig.switches>[number]

const TableRowComponent = React.memo(({
    item,
    switches,
    checked,
    onSwitchChange,
    onCheckItem,
}: {
    item: Review,
    switches: SwitchState<SwitchField>,
    checked: boolean,
    onSwitchChange: (id: number, field: SwitchField, currentValue: string) => void,
    onCheckItem: (id: number, checked: boolean) => void,
}) => {

    const effectivePublish = switches[item.id]?.values.publish ?? item.publish
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
            <TableCell>
                <div className="flex flex-col">
                    <span className="font-semibold">{item.fullname}</span>
                    <span className="text-xs text-gray-500">{item.email}</span>
                    <span className="text-xs text-gray-500">{item.phone}</span>
                </div>
            </TableCell>
            <TableCell>
                <p className="line-clamp-2 text-sm text-gray-600" title={item.content}>{item.content}</p>
            </TableCell>
            <TableCell className="text-center">
                <div className="flex items-center justify-center gap-1 text-yellow-500">
                    <span className="font-bold text-gray-700">{item.score}</span> <Star size={14} fill="currentColor" />
                </div>
            </TableCell>
            <TableCell>
                <div className="text-sm">
                    {item.reviewable?.name || 'Unknown'}
                    <div className="text-xs text-gray-400 capitalize">
                        {item.reviewable_type.split('\\').pop()}
                    </div>
                </div>
            </TableCell>
            <TableCell className="text-center whitespace-nowrap">
                <Switch
                    className="cursor-pointer"
                    checked={effectivePublish == 2} // Assuming 2 is Published
                    onCheckedChange={() => onSwitchChange(item.id, "publish", String(effectivePublish))}
                    disabled={loading}
                />
            </TableCell>
            <TableCell className="text-center whitespace-nowrap">
                <div className="flex items-center justify-center space-x-1">
                    <Link href={`/backend/review/${item.id}/edit`}>
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


interface IReviewIndexProps {
    reviews: IPaginate<Review>,
    filters: any
}

export default function ReviewIndex({ reviews, filters: serverFilters }: IReviewIndexProps) {

    const { filters } = useFilter({
        defaultFilters: pageConfig.filters,
    })
    const {
        switches,
        isAllChecked,
        selectedIds,
        handleSwitchChange,
        handleCheckAll,
        handleCheckItem,
        setSelectedIds,
    } = useTable<Review>({ pageConfig, records: reviews.data })

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
                                links={reviews.links}
                                currentPage={reviews.current_page}
                            />
                        }
                    >
                        <div className="flex flex-col mb-[10px]">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center justify-center">
                                    {selectedIds.length > 0 ? (
                                        <CustomBulkAction
                                            selectedIds={selectedIds}
                                            module={pageConfig.module!}
                                            setSelectedIds={setSelectedIds}
                                            resource="reviews"
                                        />
                                    ) : (
                                        <CustomFilter
                                            filters={filters}
                                        />
                                    )}
                                </div>
                                <Link href={`/backend/${pageConfig.module}/create`}>
                                    <Button className="bg-[#ed5565] shadow rounded-[5px] cursor-pointer hover:bg-[#ed5565]/80">
                                        <PlusCircle />
                                        Thêm đánh giá
                                    </Button>
                                </Link>
                            </div>
                            <CustomActiveFilters filters={filters} />
                        </div>
                        <CustomTable
                            data={reviews.data}
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
                            render={(item: Review) =>
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
