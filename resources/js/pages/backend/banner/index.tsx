import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import { User, type BreadcrumbItem, type IPaginate } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { type PageConfig } from '@/types';
import CustomPageHeading from '@/components/custom-page-heading';
import CustomCard from '@/components/custom-card';
import { PlusCircle, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import CustomFilter from '@/components/custom-filter';
import { filter } from '@/constants/filter';
import { useFilter } from '@/hooks/use-filter';
import CustomTable from '@/components/custom-table';
import React from 'react';
import { TableRow, TableCell } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Edit, Trash2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import CustomPagination from '@/components/custom-pagination';
import CustomConfirmDelete from '@/components/custom-confirm-delete';
import { type SwitchState } from '@/hooks/use-switch';
import useTable from '@/hooks/use-table';
import CustomBulkAction from '@/components/custom-bulk-action';
import CustomActiveFilters from '@/components/custom-active-filters';
import { Badge } from '@/components/ui/badge';

export interface Banner {
    id: number;
    name: string;
    code: string;
    position: string | null;
    description: string | null;
    width: number | null;
    height: number | null;
    publish: string;
    user_id: number;
    order: number;
    created_at: string;
    creator?: { name: string };
    slides?: Slide[];
}

export interface Slide {
    id: number;
    banner_id: number;
    name: string | null;
    background_image: string | null;
    background_color: string | null;
    background_position_x?: number;
    background_position_y?: number;
    elements: SlideElement[];
    url: string | null;
    target: string;
    order: number;
    publish: string;
    start_date: string | null;
    end_date: string | null;
}

export interface SlideElement {
    id: string;
    type: 'text' | 'button' | 'image' | 'icon' | 'divider' | 'shape' | 'video' | 'html' | 'countdown';
    content: string;
    url?: string;
    target?: string;
    position: { x: number; y: number };
    size: { width: number; height: number };
    style: Record<string, string>;
    zIndex: number;
    // Animation settings
    animation?: {
        type: 'none' | 'fadeIn' | 'fadeInUp' | 'fadeInDown' | 'fadeInLeft' | 'fadeInRight' | 'zoomIn' | 'bounce' | 'pulse' | 'slideInLeft' | 'slideInRight';
        duration: number; // in milliseconds
        delay: number; // in milliseconds
        easing: 'linear' | 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out';
    };
    // Shape/Icon specific
    shapeType?: 'circle' | 'rectangle' | 'triangle' | 'star' | 'ellipse' | 'line' | 'arrow' | 'polygon';
    iconName?: string;
    // Countdown specific
    countdownDuration?: number; // in seconds (e.g. 86400 = 1 day)
    countdownEndDate?: string; // ISO date string for countdown target
    // Grouping
    groupId?: string;
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: dashboard().url,
    },
    {
        title: 'Quản lý Banner',
        href: '/',
    }
];

const pageConfig: PageConfig<Banner> = {
    module: 'banner',
    heading: 'Quản lý Banner & Slide',
    cardHeading: 'Bảng quản lý danh sách Banner',
    cardDescription: 'Quản lý các banner, slider hiển thị trên website...',
    filters: [...filter],
    columns: [
        { key: 'checkbox', label: '', className: 'w-[60px] text-center' },
        { key: 'id', label: 'ID', className: 'w-[60px] text-center' },
        { key: 'name', label: 'Tên Banner', className: 'w-[25%]' },
        { key: 'code', label: 'Mã Code', className: 'w-[15%]' },
        { key: 'position', label: 'Vị trí', className: 'w-[12%]' },
        { key: 'dimensions', label: 'Kích thước', className: 'text-center' },
        { key: 'slides', label: 'Số slide', className: 'text-center' },
        { key: 'creator', label: 'Người tạo', className: 'text-center min-w-[130px]' },
        { key: 'created_at', label: 'Ngày tạo', className: 'text-center min-w-[130px]' },
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
    item: Banner,
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
                    <ImageIcon className="h-4 w-4 text-muted-foreground" />
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
                {item.width && item.height ? (
                    <span className="text-xs">{item.width}x{item.height}</span>
                ) : (
                    <span className="text-muted-foreground">-</span>
                )}
            </TableCell>
            <TableCell className="text-center">
                <Badge variant="secondary">{item.slides?.length || 0} slide</Badge>
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

interface IBannerIndexProps {
    users?: User[],
    banners: IPaginate<Banner>,
}

export default function BannerIndex({ users, banners }: IBannerIndexProps) {

    const { filters } = useFilter({ users, defaultFilters: pageConfig.filters })
    const {
        switches,
        isAllChecked,
        selectedIds,
        handleSwitchChange,
        handleCheckAll,
        handleCheckItem,
        setSelectedIds
    } = useTable<Banner>({ pageConfig, records: banners.data })


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
                                links={banners.links}
                                currentPage={banners.current_page}
                            />
                        }
                    >
                        <div className="flex items-center justify-between mb-[10px]">
                            <div className="flex items-center justify-center">
                                {selectedIds.length > 0 &&
                                    <CustomBulkAction
                                        className="mr-[10px]"
                                        module={pageConfig.module!}
                                        resource="banners"
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
                                    Thêm Banner Mới
                                </Button>
                            </Link>
                        </div>
                        <CustomActiveFilters filters={filters} />
                        <CustomTable
                            data={banners.data}
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
                            render={(item: Banner) =>
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
