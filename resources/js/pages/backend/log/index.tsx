import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import { User, type BreadcrumbItem, type IPaginate } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { type PageConfig } from '@/types';
import CustomPageHeading from '@/components/custom-page-heading';
import CustomCard from '@/components/custom-card';
import { Button } from '@/components/ui/button';
import CustomFilter from '@/components/custom-filter';
import { filter } from '@/constants/filter';
import { useFilter } from '@/hooks/use-filter';
import CustomTable from '@/components/custom-table';
import React, { useState } from 'react';
import CustomActiveFilters from '@/components/custom-active-filters';
import { TableRow, TableCell } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import CustomPagination from '@/components/custom-pagination';
import { Badge } from '@/components/ui/badge';
import { Trash2, Calendar, RefreshCw } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: dashboard().url,
    },
    {
        title: 'QL Cấu Hình Chung',
        href: '/backend/log',
    },
    {
        title: 'Log Hệ Thống',
        href: '/backend/log',
    }
];

interface Log {
    id: number;
    user_id?: number;
    action: string;
    module: string;
    record_id?: number;
    record_type?: string;
    ip_address?: string;
    user_agent?: string;
    description?: string;
    old_data?: Record<string, unknown>;
    new_data?: Record<string, unknown>;
    changes?: Record<string, unknown>;
    status: 'success' | 'failed' | 'pending';
    error_message?: string;
    route?: string;
    method?: string;
    created_at: string;
    updated_at: string;
    user?: {
        id: number;
        name: string;
        email: string;
    };
}

const pageConfig: PageConfig<Log> = {
    module: 'log',
    heading: 'Log Hệ Thống',
    cardHeading: 'Bảng quản lý danh sách Log',
    cardDescription: 'Xem và quản lý các log hoạt động trên hệ thống',
    filters: [...filter],
    columns: [
        { key: 'id', label: 'ID', className: 'w-[60px]', sortable: true },
        { key: 'user', label: 'Người thực hiện', className: 'w-[150px]', sortable: false },
        { key: 'action', label: 'Hành động', className: 'w-[100px]', sortable: true },
        { key: 'module', label: 'Module', className: 'w-[120px]', sortable: true },
        { key: 'description', label: 'Mô tả', className: 'w-[300px]', sortable: false },
        { key: 'status', label: 'Trạng thái', className: 'w-[100px] text-center', sortable: true },
        { key: 'ip_address', label: 'IP Address', className: 'w-[120px]', sortable: false },
        { key: 'created_at', label: 'Thời gian', className: 'w-[150px] text-center', sortable: true },
        { key: 'details', label: 'Chi tiết', className: 'w-[100px] text-center', sortable: false },
    ],
}

const actionLabels: Record<string, string> = {
    'create': 'Tạo mới',
    'update': 'Cập nhật',
    'delete': 'Xóa',
    'view': 'Xem',
    'translate': 'Dịch',
    'restore': 'Khôi phục',
    'force_delete': 'Xóa vĩnh viễn',
};

const moduleLabels: Record<string, string> = {
    'post': 'Bài viết',
    'post_catalogue': 'Nhóm bài viết',
    'user': 'Người dùng',
    'user_catalogue': 'Nhóm người dùng',
    'permission': 'Quyền',
    'language': 'Ngôn ngữ',
    'log': 'Log',
};

const TableRowComponent = React.memo(({
    item,
}: {
    item: Log;
}) => {
    const [showDetails, setShowDetails] = useState(false);

    const actionLabel = actionLabels[item.action] || item.action;
    const moduleLabel = moduleLabels[item.module] || item.module;

    const statusColors: Record<string, string> = {
        'success': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
        'failed': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
        'pending': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    };

    return (
        <TableRow key={item.id}>
            <TableCell className="whitespace-nowrap">{item.id}</TableCell>
            <TableCell className="whitespace-nowrap">
                {item.user ? (
                    <div>
                        <div className="font-medium">{item.user.name}</div>
                        <div className="text-xs text-muted-foreground">{item.user.email}</div>
                    </div>
                ) : (
                    <span className="text-muted-foreground">System</span>
                )}
            </TableCell>
            <TableCell>
                <Badge variant="outline">{actionLabel}</Badge>
            </TableCell>
            <TableCell>
                <Badge variant="secondary">{moduleLabel}</Badge>
            </TableCell>
            <TableCell className="max-w-[300px] truncate" title={item.description || ''}>
                {item.description || 'N/A'}
            </TableCell>
            <TableCell className="text-center">
                <Badge className={statusColors[item.status] || ''}>
                    {item.status === 'success' ? 'Thành công' : 
                     item.status === 'failed' ? 'Thất bại' : 
                     'Đang chờ'}
                </Badge>
            </TableCell>
            <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                {item.ip_address || 'N/A'}
            </TableCell>
            <TableCell className="text-center whitespace-nowrap">{item.created_at}</TableCell>
            <TableCell className="text-center">
                <Dialog open={showDetails} onOpenChange={setShowDetails}>
                    <DialogTrigger asChild>
                        <Button 
                            type="button" 
                            variant="outline" 
                            size="sm"
                            className="rounded-[5px] cursor-pointer"
                        >
                            Xem
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Chi tiết Log #{item.id}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 mt-4">
                            <div>
                                <h4 className="font-semibold mb-2">Thông tin cơ bản</h4>
                                <div className="space-y-2 text-sm">
                                    <div><strong>Người thực hiện:</strong> {item.user?.name || 'System'}</div>
                                    <div><strong>Hành động:</strong> {actionLabel}</div>
                                    <div><strong>Module:</strong> {moduleLabel}</div>
                                    <div><strong>Trạng thái:</strong> 
                                        <Badge className={`ml-2 ${statusColors[item.status] || ''}`}>
                                            {item.status === 'success' ? 'Thành công' : 
                                             item.status === 'failed' ? 'Thất bại' : 
                                             'Đang chờ'}
                                        </Badge>
                                    </div>
                                    <div><strong>Thời gian:</strong> {item.created_at}</div>
                                    <div><strong>IP Address:</strong> {item.ip_address || 'N/A'}</div>
                                    <div><strong>Method:</strong> {item.method || 'N/A'}</div>
                                    <div><strong>Route:</strong> {item.route || 'N/A'}</div>
                                </div>
                            </div>
                            
                            {item.description && (
                                <div>
                                    <h4 className="font-semibold mb-2">Mô tả</h4>
                                    <p className="text-sm">{item.description}</p>
                                </div>
                            )}

                            {item.error_message && (
                                <div>
                                    <h4 className="font-semibold mb-2 text-red-600">Lỗi</h4>
                                    <p className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 p-2 rounded">
                                        {item.error_message}
                                    </p>
                                </div>
                            )}

                            {item.changes && Object.keys(item.changes).length > 0 && (
                                <div>
                                    <h4 className="font-semibold mb-2">Thay đổi</h4>
                                    <pre className="text-xs bg-muted p-3 rounded overflow-auto">
                                        {JSON.stringify(item.changes, null, 2)}
                                    </pre>
                                </div>
                            )}

                            {item.old_data && Object.keys(item.old_data).length > 0 && (
                                <div>
                                    <h4 className="font-semibold mb-2">Dữ liệu cũ</h4>
                                    <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-[200px]">
                                        {JSON.stringify(item.old_data, null, 2)}
                                    </pre>
                                </div>
                            )}

                            {item.new_data && Object.keys(item.new_data).length > 0 && (
                                <div>
                                    <h4 className="font-semibold mb-2">Dữ liệu mới</h4>
                                    <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-[200px]">
                                        {JSON.stringify(item.new_data, null, 2)}
                                    </pre>
                                </div>
                            )}

                            {item.user_agent && (
                                <div>
                                    <h4 className="font-semibold mb-2">User Agent</h4>
                                    <p className="text-xs break-all">{item.user_agent}</p>
                                </div>
                            )}
                        </div>
                    </DialogContent>
                </Dialog>
            </TableCell>
        </TableRow>
    );
});

interface ILogIndexProps {
    users: User[];
    records: IPaginate<Log>;
}

export default function LogIndex({ users, records }: ILogIndexProps) {
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deleteType, setDeleteType] = useState<'months' | 'days' | null>(null);
    const [deleteValue, setDeleteValue] = useState<number>(6);

    const { request } = usePage().props as { request?: Record<string, unknown> };
    
    // Parse date range from request để pass vào CustomFilter
    const dateRange = React.useMemo(() => {
        if (request?.created_at) {
            const dateData = request.created_at as Record<string, unknown>;
            if (typeof dateData === 'object' && dateData !== null) {
                const betweenValue = dateData.between as string;
                if (betweenValue) {
                    const dates = betweenValue.split(',');
                    if (dates.length === 2) {
                        return {
                            from: dates[0].trim(),
                            to: dates[1].trim(),
                        };
                    }
                }
            }
        }
        return null;
    }, [request]);

    const { filters } = useFilter({
        users,
        defaultFilters: pageConfig.filters,
    });

    // Date range giờ được xử lý trong CustomFilter form, không cần handleDateRangeChange nữa

    const handleDeleteOlderThan = (months: number) => {
        router.post(
            '/backend/log/delete-older-than',
            { months },
            {
                onSuccess: () => {
                    setDeleteDialogOpen(false);
                },
                preserveScroll: true,
            }
        );
    };

    const handleDeleteLastNDays = (days: number) => {
        router.post(
            '/backend/log/delete-last-n-days',
            { days },
            {
                onSuccess: () => {
                    setDeleteDialogOpen(false);
                },
                preserveScroll: true,
            }
        );
    };

    const handleRefreshCache = () => {
        router.post(
            '/backend/log/refresh-cache',
            {},
            {
                onSuccess: () => {
                    // Reload lại trang sau khi clear cache
                    router.reload({ only: ['records'] });
                },
                preserveScroll: true,
            }
        );
    };

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
                                links={records.links}
                                currentPage={records.current_page}
                            />
                        }
                    >
                        <div className="flex flex-col mb-[10px]">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center justify-center">
                                    <CustomFilter 
                                        filters={filters}
                                        dateRangePicker={{
                                            title: "Chọn khoảng thời gian",
                                            name: "created_at",
                                            defaultValue: dateRange || undefined
                                        }}
                                    />
                                </div>
                                <div className="flex items-center justify-center">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="mr-2 rounded-[5px] cursor-pointer"
                                        onClick={handleRefreshCache}
                                    >
                                        <RefreshCw className="w-4 h-4 mr-2" />
                                        Làm mới
                                    </Button>
                                    <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                                        <DialogTrigger asChild>
                                            <Button
                                                type="button"
                                                variant="destructive"
                                                size="sm"
                                                className="ml-2 rounded-[5px] cursor-pointer"
                                                onClick={() => {
                                                    setDeleteDialogOpen(true);
                                                    setDeleteType(null);
                                                    setDeleteValue(6);
                                                }}
                                            >
                                                <Trash2 className="w-4 h-4 mr-2" />
                                                Xóa Log
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader>
                                                <DialogTitle>Xóa Log</DialogTitle>
                                            </DialogHeader>
                                            <div className="space-y-4 mt-4">
                                                <div>
                                                    <label className="block text-sm font-medium mb-2">
                                                        Chọn phương thức xóa:
                                                    </label>
                                                    <div className="space-y-2">
                                                        <Button
                                                            type="button"
                                                            variant={deleteType === 'months' ? 'default' : 'outline'}
                                                            className="w-full justify-start rounded-[5px] cursor-pointer"
                                                            onClick={() => {
                                                                setDeleteType('months');
                                                                setDeleteValue(6);
                                                            }}
                                                        >
                                                            <Calendar className="w-4 h-4 mr-2" />
                                                            Xóa logs cũ hơn N tháng (1-12)
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant={deleteType === 'days' ? 'default' : 'outline'}
                                                            className="w-full justify-start rounded-[5px] cursor-pointer"
                                                            onClick={() => {
                                                                setDeleteType('days');
                                                                setDeleteValue(7);
                                                            }}
                                                        >
                                                            <Calendar className="w-4 h-4 mr-2" />
                                                            Xóa logs trong N ngày gần nhất (1-30)
                                                        </Button>
                                                    </div>
                                                </div>

                                                {deleteType && (
                                                    <div>
                                                        <label className="block text-sm font-medium mb-2">
                                                            {deleteType === 'months' ? 'Số tháng:' : 'Số ngày:'}
                                                        </label>
                                                        <Input
                                                            type="number"
                                                            min={deleteType === 'months' ? 1 : 1}
                                                            max={deleteType === 'months' ? 12 : 30}
                                                            value={deleteValue}
                                                            onChange={(e) => setDeleteValue(parseInt(e.target.value) || 1)}
                                                        />
                                                    </div>
                                                )}

                                                {deleteType && (
                                                    <div className="flex justify-end space-x-2">
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            className="rounded-[5px] cursor-pointer"
                                                            onClick={() => setDeleteDialogOpen(false)}
                                                        >
                                                            Hủy
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant="destructive"
                                                            className="rounded-[5px] cursor-pointer"
                                                            onClick={() => {
                                                                if (deleteType === 'months') {
                                                                    handleDeleteOlderThan(deleteValue);
                                                                } else {
                                                                    handleDeleteLastNDays(deleteValue);
                                                                }
                                                            }}
                                                        >
                                                            Xác nhận xóa
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        </DialogContent>
                                    </Dialog>
                                </div>
                            </div>
                            <CustomActiveFilters filters={filters} />
                        </div>

                        <CustomTable
                            data={records.data}
                            columns={pageConfig.columns ?? []}
                            render={(item: Log) => (
                                <TableRowComponent key={item.id} item={item} />
                            )}
                        />
                    </CustomCard>
                </div>
            </div>
        </AppLayout>
    );
}

