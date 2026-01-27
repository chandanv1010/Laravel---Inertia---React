import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, ChevronLeft, ChevronRight, ChevronDown, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { getCsrfHeaders } from '@/lib/helper';
import { format, startOfDay, endOfDay, subDays, subWeeks, subMonths, subYears } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { DateRange } from 'react-day-picker';
import CustomCard from '@/components/custom-card';

interface StockLog {
    id: number;
    change_stock: number;
    before_stock: number;
    after_stock: number;
    reason: string | null;
    transaction_type?: string;
    warehouse_id?: number | null;
    warehouse_name?: string | null;
    warehouse_code?: string | null;
    created_at: string | null;
    user: {
        id: number;
        name: string;
        email: string;
    } | null;
}

interface StockHistoryProps {
    productId: number;
    warehouses?: Array<{ value: string | number; label: string }>;
    refreshTrigger?: number; // Trigger to refresh data when changed (can be decimal to ensure uniqueness)
}

interface StockLogResponse {
    success: boolean
    data: StockLog[]
    current_page?: number
    last_page?: number
    total?: number
    message?: string
}

const transactionTypeLabels: Record<string, string> = {
    'import': 'Nhập hàng',
    'export': 'Xuất hàng',
    'return': 'Trả hàng',
    'adjust': 'Điều chỉnh',
    'transfer': 'Chuyển kho',
    'product': 'Sản phẩm',
    'variant': 'Biến thể',
};

export function StockHistory({ productId, warehouses = [], refreshTrigger = 0 }: StockHistoryProps) {
    const [logs, setLogs] = useState<StockLog[]>([]);
    const [loading, setLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [perPage, setPerPage] = useState(6);

    // Track previous refreshTrigger to detect changes
    const prevRefreshTriggerRef = useRef<number>(0);

    // Filters
    const [filterTypes, setFilterTypes] = useState<Record<string, boolean>>({
        'import': false,
        'export': false,
        'return': false,
        'adjust': false,
        'transfer': false,
        'product': false,
        'variant': false,
    });
    const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
    const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);
    const [openFilterType, setOpenFilterType] = useState(false);
    const [openFilterTime, setOpenFilterTime] = useState(false);

    const fetchLogs = useCallback(async (page?: number) => {
        if (!productId) return;

        setLoading(true);
        try {
            const params = new URLSearchParams();
            const pageToUse = page !== undefined ? page : currentPage;
            params.append('perpage', perPage.toString());
            params.append('page', pageToUse.toString());

            const selectedTypes = Object.entries(filterTypes)
                .filter(([, checked]) => checked)
                .map(([key]) => key);

            if (selectedTypes.length > 0) {
                selectedTypes.forEach(type => {
                    params.append('transaction_types[]', type);
                });
            }

            if (selectedWarehouseId) {
                params.append('warehouse_id', selectedWarehouseId);
            }

            if (dateRange?.from && dateRange?.to) {
                params.append('created_at[between]', `${format(dateRange.from, 'yyyy-MM-dd')},${format(dateRange.to, 'yyyy-MM-dd')}`);
            }

            const response = await fetch(`/backend/product/${productId}/stock-history?${params.toString()}`, {
                headers: {
                    ...getCsrfHeaders(),
                    'Accept': 'application/json',
                },
            });

            if (!response.ok) {
                return;
            }

            const data = await response.json() as StockLogResponse;

            if (data.success) {
                const logsData = Array.isArray(data.data) ? data.data : [];
                setLogs(logsData);
                const newPage = data.current_page || pageToUse || 1;
                setCurrentPage(newPage);
                setLastPage(data.last_page || 1);
                setTotal(data.total || 0);
            } else {
                setLogs([]);
            }
        } catch (error) {
            console.error('Error fetching stock history:', error);
            setLogs([]);
        } finally {
            setLoading(false);
        }
    }, [productId, currentPage, perPage, filterTypes, selectedWarehouseId, dateRange]);

    // Load data when component mounts or productId changes - reset filters and load all data
    useEffect(() => {
        if (productId) {
            // Reset filters to initial state when productId changes to ensure we load all data
            setFilterTypes({
                'import': false,
                'export': false,
                'return': false,
                'adjust': false,
                'transfer': false,
                'product': false,
                'variant': false,
            });
            setSelectedWarehouseId('');
            setDateRange(undefined);
            setCurrentPage(1);
        }
    }, [productId]);

    // Reload data when refreshTrigger changes (e.g., after stock adjustment)
    useEffect(() => {
        console.log('StockHistory: refreshTrigger effect triggered, refreshTrigger =', refreshTrigger, 'prev =', prevRefreshTriggerRef.current, 'productId =', productId)

        // Only proceed if refreshTrigger actually changed and is greater than 0
        if (productId && refreshTrigger > 0 && refreshTrigger !== prevRefreshTriggerRef.current) {
            console.log('StockHistory: refreshTrigger changed from', prevRefreshTriggerRef.current, 'to', refreshTrigger, 'fetching logs...')
            prevRefreshTriggerRef.current = refreshTrigger;

            // Reset to page 1 first
            setCurrentPage(1);

            // Use a delay to ensure server has finished processing the stock adjustment
            // and the new log entry is available in database
            const timer = setTimeout(async () => {
                console.log('StockHistory: Fetching logs with page 1, refreshTrigger =', refreshTrigger)
                if (!productId) return;

                setLoading(true);
                try {
                    const params = new URLSearchParams();
                    params.append('perpage', perPage.toString());
                    params.append('page', '1'); // Always fetch page 1

                    const selectedTypes = Object.entries(filterTypes)
                        .filter(([, checked]) => checked)
                        .map(([key]) => key);

                    if (selectedTypes.length > 0) {
                        selectedTypes.forEach(type => {
                            params.append('transaction_types[]', type);
                        });
                    }

                    if (selectedWarehouseId) {
                        params.append('warehouse_id', selectedWarehouseId);
                    }

                    if (dateRange?.from && dateRange?.to) {
                        params.append('created_at[between]', `${format(dateRange.from, 'yyyy-MM-dd')},${format(dateRange.to, 'yyyy-MM-dd')}`);
                    }

                    // Add timestamp to prevent caching
                    params.append('_t', Date.now().toString());

                    const response = await fetch(`/backend/product/${productId}/stock-history?${params.toString()}`, {
                        headers: {
                            ...getCsrfHeaders(),
                            'Accept': 'application/json',
                            'Cache-Control': 'no-cache',
                        },
                    });

                    if (!response.ok) {
                        console.error('StockHistory: Failed to fetch logs, response not ok')
                        return;
                    }

                    const data = await response.json() as StockLogResponse;

                    if (data.success) {
                        const logsData = Array.isArray(data.data) ? data.data : [];
                        console.log('StockHistory: Fetched', logsData.length, 'logs')
                        setLogs(logsData);
                        setCurrentPage(1);
                        setLastPage(data.last_page || 1);
                        setTotal(data.total || 0);
                    } else {
                        console.error('StockHistory: API returned success=false')
                        setLogs([]);
                    }
                } catch (error) {
                    console.error('StockHistory: Error fetching logs:', error);
                    setLogs([]);
                } finally {
                    setLoading(false);
                }
            }, 1000);
            return () => {
                console.log('StockHistory: Cleaning up timer for refreshTrigger =', refreshTrigger)
                clearTimeout(timer)
            }
        } else {
            // Update ref even if we don't fetch, to track the value
            if (refreshTrigger > 0) {
                prevRefreshTriggerRef.current = refreshTrigger;
            }
        }
    }, [refreshTrigger, productId, perPage, filterTypes, selectedWarehouseId, dateRange]);

    // Fetch logs when filters or pagination changes
    useEffect(() => {
        if (productId) {
            fetchLogs();
        }
    }, [productId, currentPage, perPage, filterTypes, selectedWarehouseId, dateRange, fetchLogs]);

    const handleTimeFilter = (type: string) => {
        const now = new Date();
        let range: DateRange | undefined;

        switch (type) {
            case 'Hôm nay': {
                range = { from: startOfDay(now), to: endOfDay(now) };
                break;
            }
            case 'Hôm qua': {
                const yesterday = subDays(now, 1);
                range = { from: startOfDay(yesterday), to: endOfDay(yesterday) };
                break;
            }
            case '7 ngày qua': {
                range = { from: startOfDay(subDays(now, 7)), to: endOfDay(now) };
                break;
            }
            case '30 ngày qua': {
                range = { from: startOfDay(subDays(now, 30)), to: endOfDay(now) };
                break;
            }
            case 'Tuần trước': {
                const lastWeekStart = startOfDay(subWeeks(now, 1));
                const lastWeekEnd = endOfDay(subDays(lastWeekStart, 7));
                range = { from: lastWeekStart, to: lastWeekEnd };
                break;
            }
            case 'Tuần này': {
                range = { from: startOfDay(subWeeks(now, 0)), to: endOfDay(now) };
                break;
            }
            case 'Tháng trước': {
                const lastMonthStart = startOfDay(subMonths(now, 1));
                const lastMonthEnd = endOfDay(subDays(lastMonthStart, 30));
                range = { from: lastMonthStart, to: lastMonthEnd };
                break;
            }
            case 'Tháng này': {
                range = { from: startOfDay(subMonths(now, 0)), to: endOfDay(now) };
                break;
            }
            case 'Năm trước': {
                const lastYearStart = startOfDay(subYears(now, 1));
                const lastYearEnd = endOfDay(subDays(lastYearStart, 365));
                range = { from: lastYearStart, to: lastYearEnd };
                break;
            }
            case 'Năm nay': {
                range = { from: startOfDay(subYears(now, 0)), to: endOfDay(now) };
                break;
            }
            default:
                return;
        }

        if (range && range.from && range.to) {
            setDateRange(range);
            setCurrentPage(1);
            setOpenFilterTime(false);
        }
    };

    // Check if current dateRange matches a preset
    const getActiveTimeFilterLabel = useMemo(() => {
        if (!dateRange?.from || !dateRange?.to) return null;

        const now = new Date();
        const from = dateRange.from;
        const to = dateRange.to;

        // Helper to check if dates match (only date, ignore time)
        const datesMatch = (d1: Date, d2: Date) => {
            return d1.getFullYear() === d2.getFullYear() &&
                d1.getMonth() === d2.getMonth() &&
                d1.getDate() === d2.getDate();
        };

        // Hôm nay
        if (datesMatch(from, startOfDay(now)) && datesMatch(to, endOfDay(now))) {
            return "Hôm nay";
        }

        // Hôm qua
        const yesterday = subDays(now, 1);
        if (datesMatch(from, startOfDay(yesterday)) && datesMatch(to, endOfDay(yesterday))) {
            return "Hôm qua";
        }

        // 7 ngày qua
        const sevenDaysAgo = subDays(now, 7);
        if (datesMatch(from, startOfDay(sevenDaysAgo)) && datesMatch(to, endOfDay(now))) {
            return "7 ngày qua";
        }

        // 30 ngày qua
        const thirtyDaysAgo = subDays(now, 30);
        if (datesMatch(from, startOfDay(thirtyDaysAgo)) && datesMatch(to, endOfDay(now))) {
            return "30 ngày qua";
        }

        // Tuần trước
        const lastWeekStart = startOfDay(subWeeks(now, 1));
        const lastWeekEnd = endOfDay(subDays(lastWeekStart, 7));
        if (datesMatch(from, lastWeekStart) && datesMatch(to, lastWeekEnd)) {
            return "Tuần trước";
        }

        // Tuần này
        const thisWeekStart = startOfDay(subWeeks(now, 0));
        if (datesMatch(from, thisWeekStart) && datesMatch(to, endOfDay(now))) {
            return "Tuần này";
        }

        // Tháng trước
        const lastMonthStart = startOfDay(subMonths(now, 1));
        const lastMonthEnd = endOfDay(subDays(lastMonthStart, 30));
        if (datesMatch(from, lastMonthStart) && datesMatch(to, lastMonthEnd)) {
            return "Tháng trước";
        }

        // Tháng này
        const thisMonthStart = startOfDay(subMonths(now, 0));
        if (datesMatch(from, thisMonthStart) && datesMatch(to, endOfDay(now))) {
            return "Tháng này";
        }

        // Năm trước
        const lastYearStart = startOfDay(subYears(now, 1));
        const lastYearEnd = endOfDay(subDays(lastYearStart, 365));
        if (datesMatch(from, lastYearStart) && datesMatch(to, lastYearEnd)) {
            return "Năm trước";
        }

        // Năm nay
        const thisYearStart = startOfDay(subYears(now, 0));
        if (datesMatch(from, thisYearStart) && datesMatch(to, endOfDay(now))) {
            return "Năm nay";
        }

        return null;
    }, [dateRange]);

    const handleFilterTimeOpenChange = (open: boolean) => {
        setOpenFilterTime(open);
        if (!open) {
            setShowCustomDatePicker(false);
        }
    };

    const hasActiveFilters = Object.values(filterTypes).some(v => v) || selectedWarehouseId || dateRange?.from || dateRange?.to;

    const handleClearFilters = () => {
        setFilterTypes({
            'import': false,
            'export': false,
            'return': false,
            'adjust': false,
            'transfer': false,
            'product': false,
            'variant': false,
        });
        setSelectedWarehouseId('');
        setDateRange(undefined);
        setCurrentPage(1);
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('vi-VN').format(amount);
    };

    const getChangeStockColor = (change: number) => {
        if (change > 0) return 'text-green-600 font-semibold';
        if (change < 0) return 'text-red-600 font-semibold';
        return 'text-gray-600';
    };

    const getChangeStockBadge = (change: number) => {
        if (change > 0) return <Badge className="bg-green-100 text-green-800">+{formatCurrency(change)}</Badge>;
        if (change < 0) return <Badge className="bg-red-100 text-red-800">{formatCurrency(change)}</Badge>;
        return <Badge variant="secondary">{formatCurrency(change)}</Badge>;
    };

    return (

        <div className="w-full">
            {/* Table Header Section */}
            <div className="px-[20px] py-3 border-t">
                <div className="flex items-center justify-between">
                    <div className="font-medium">Lịch sử thay đổi tồn kho</div>

                    <div className="flex items-center gap-2">
                        {hasActiveFilters && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleClearFilters}
                                className="h-8 px-3 text-[12px] font-normal"
                            >
                                <X className="h-3 w-3 mr-1" />
                                Xóa bộ lọc
                            </Button>
                        )}

                        {/* Loại giao dịch Filter */}
                        <Popover open={openFilterType} onOpenChange={setOpenFilterType}>
                            <PopoverTrigger asChild>
                                <Button type="button" variant="outline" className="h-8 px-3 text-[12px] font-normal">
                                    Loại giao dịch <ChevronDown className="ml-2 h-3 w-3" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[220px] p-3" align="end">
                                <div className="space-y-2">
                                    {Object.entries(transactionTypeLabels).map(([type, label]) => (
                                        <label key={type} className="flex items-center gap-2 text-sm font-normal cursor-pointer">
                                            <Checkbox
                                                checked={!!filterTypes[type]}
                                                onCheckedChange={(v) => {
                                                    setFilterTypes(prev => ({ ...prev, [type]: !!v }));
                                                    setCurrentPage(1);
                                                }}
                                            />
                                            <span>{label}</span>
                                        </label>
                                    ))}
                                </div>
                            </PopoverContent>
                        </Popover>

                        {/* Thời gian Filter */}
                        <Popover open={openFilterTime} onOpenChange={handleFilterTimeOpenChange}>
                            <PopoverTrigger asChild>
                                <Button type="button" variant="outline" className="h-8 px-3 text-[12px] font-normal">
                                    Thời gian <ChevronDown className="ml-2 h-3 w-3" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[260px] p-3" align="end">
                                {!showCustomDatePicker ? (
                                    <>
                                        <div className="grid grid-cols-2 gap-2">
                                            {[
                                                "Hôm nay",
                                                "Hôm qua",
                                                "7 ngày qua",
                                                "30 ngày qua",
                                                "Tuần trước",
                                                "Tuần này",
                                                "Tháng trước",
                                                "Tháng này",
                                                "Năm trước",
                                                "Năm nay",
                                                "Tùy chọn",
                                            ].map((label) => {
                                                const isActive = getActiveTimeFilterLabel === label;
                                                return (
                                                    <Button
                                                        key={label}
                                                        type="button"
                                                        variant={isActive ? "default" : "outline"}
                                                        className="h-8 text-[12px] font-normal"
                                                        onClick={() => {
                                                            if (label === "Tùy chọn") {
                                                                setShowCustomDatePicker(true);
                                                                return;
                                                            }
                                                            handleTimeFilter(label);
                                                        }}
                                                    >
                                                        {label}
                                                    </Button>
                                                );
                                            })}
                                        </div>
                                    </>
                                ) : (
                                    <div>
                                        <div className="text-xs text-muted-foreground mb-2">Khoảng thời gian tùy chọn:</div>
                                        <Calendar
                                            mode="range"
                                            selected={dateRange}
                                            onSelect={(range) => {
                                                setDateRange(range);
                                                if (range?.from && range?.to) {
                                                    setCurrentPage(1);
                                                    setOpenFilterTime(false);
                                                    setShowCustomDatePicker(false);
                                                }
                                            }}
                                            numberOfMonths={1}
                                        />
                                        <div className="mt-3 flex gap-2">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                className="flex-1 h-8 text-[12px]"
                                                onClick={() => {
                                                    setShowCustomDatePicker(false);
                                                    setDateRange(undefined);
                                                }}
                                            >
                                                Hủy
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
            ) : logs.length === 0 ? (
                <div className="text-sm text-muted-foreground px-[20px] py-4 border-t">Chưa có lịch sử.</div>
            ) : (
                <>
                    {/* Table Header */}
                    <div className="border-t">
                        <div className="grid grid-cols-12 gap-3 text-xs font-medium bg-muted/50 px-[20px] py-3 border-b">
                            <div className="col-span-2">Thời gian</div>
                            <div className="col-span-1">Kho hàng</div>
                            <div className="col-span-1">Loại</div>
                            <div className="col-span-1 text-right">Tồn trước</div>
                            <div className="col-span-1 text-right">Thay đổi</div>
                            <div className="col-span-1 text-right">Tồn sau</div>
                            <div className="col-span-3">Lý do</div>
                            <div className="col-span-2">Người thực hiện</div>
                        </div>

                        {/* Table Body */}
                        {logs.map((log) => (
                            <div key={log.id} className="grid grid-cols-12 gap-3 items-center px-[20px] py-3 border-b last:border-b-0 hover:bg-gray-50/50">
                                <div className="col-span-2 text-sm">
                                    {log.created_at ? format(new Date(log.created_at), 'dd/MM/yyyy HH:mm') : '-'}
                                </div>
                                <div className="col-span-1 text-sm">
                                    {log.warehouse_code || '-'}
                                </div>
                                <div className="col-span-1">
                                    <Badge variant="secondary" className="text-xs">
                                        {transactionTypeLabels[log.transaction_type || 'product'] || log.transaction_type}
                                    </Badge>
                                </div>
                                <div className="col-span-1 text-right text-sm">
                                    {formatCurrency(log.before_stock)}
                                </div>
                                <div className="col-span-1 text-right">
                                    {getChangeStockBadge(log.change_stock)}
                                </div>
                                <div className="col-span-1 text-right text-sm font-medium">
                                    {formatCurrency(log.after_stock)}
                                </div>
                                <div className="col-span-3 text-sm">
                                    {log.reason || '-'}
                                </div>
                                <div className="col-span-2 text-sm text-muted-foreground">
                                    {log.user?.name || '-'}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Pagination */}
                    <div className="flex items-center justify-between px-[20px] py-3 text-sm text-muted-foreground border-t">
                        <div>
                            Từ {((currentPage - 1) * perPage) + 1} đến {Math.min(currentPage * perPage, total)} trên tổng {total}
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                                <span>Hiển thị</span>
                                <select
                                    className="h-8 border rounded-md px-2 bg-white"
                                    value={perPage}
                                    onChange={(e) => {
                                        setPerPage(Number(e.target.value));
                                        setCurrentPage(1);
                                    }}
                                >
                                    <option value="6">6</option>
                                    <option value="10">10</option>
                                    <option value="20">20</option>
                                    <option value="50">50</option>
                                </select>
                                <span>Kết quả</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 w-8 px-0"
                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                    disabled={currentPage === 1 || loading}
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <Button type="button" className="h-8 w-8 px-0">
                                    {currentPage}
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 w-8 px-0"
                                    onClick={() => setCurrentPage(prev => Math.min(lastPage, prev + 1))}
                                    disabled={currentPage === lastPage || loading}
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
