import { useState, useEffect, useMemo, useCallback } from 'react';
import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import { type BreadcrumbItem, type IPaginate, User } from '@/types';
import { Head, router } from '@inertiajs/react';
import CustomPageHeading from '@/components/custom-page-heading';
import CustomCard from '@/components/custom-card';
import { Button } from "@/components/ui/button"
import { ArrowLeft, LoaderCircle, Package, Trash2, AlertCircle, Plus } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from "@/components/ui/input"
import { Textarea } from '@/components/ui/textarea';
import { Combobox } from '@/components/ui/combobox';
import { Checkbox } from '@/components/ui/checkbox';
import { PriceInput } from '@/components/price-input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { getCsrfHeaders } from '@/lib/helper';
import { SelectBatchModal, BatchAllocation } from '../import_order/components/select-batch-modal';
import { ProductSearchDropdown } from '../import_order/components/product-search-dropdown';

const getBreadcrumbs = (isEdit: boolean): BreadcrumbItem[] => [
    {
        title: 'Dashboard',
        href: dashboard().url,
    },
    {
        title: 'Trả hàng NCC',
        href: '/backend/return-import-order',
    },
    {
        title: isEdit ? 'Sửa đơn trả hàng' : 'Tạo đơn trả hàng',
        href: '/',
    }
];

interface ReturnItem {
    product_id: number;
    product_variant_id: number | null;
    product_name: string;
    product_image?: string | null;
    product_sku?: string;
    quantity: number;
    max_quantity: number; // Số lượng tối đa có thể trả (từ đơn nhập hoặc tồn kho)
    unit_price: number; // Đơn giá trả
    original_unit_price?: number; // Đơn giá nhập gốc
    item_discount?: number; // Chiết khấu sản phẩm
    order_discount?: number; // Chiết khấu đơn phân bổ
    discount: number;
    discount_type: 'fixed' | 'amount' | 'percent';
    batch_allocations?: BatchAllocation[]; // Lô đã chọn để trả
    import_batch_allocations?: BatchAllocation[]; // Lô đã nhập trong import order (để filter)
    total_price: number;
    management_type?: 'basic' | 'imei' | 'batch';
    returned_quantity?: number;
    remaining_quantity?: number;
}

interface ImportOrder {
    id: number;
    code: string;
    supplier_id?: number;
    supplier?: { id: number; name: string };
    warehouse_id?: number;
    warehouse?: { id: number; name: string };
    items?: Array<{
        id: number;
        product_id: number;
        product_variant_id?: number;
        product_name?: string;
        product_image?: string;
        product_sku?: string;
        quantity: number;
        unit_price: number;
        discount?: number;
        discount_type?: string;
        batch_allocations?: BatchAllocation[];
        management_type?: string;
        returned_quantity?: number;
        remaining_quantity?: number;
    }>;
}

interface ReturnImportOrder {
    id: number;
    code: string;
    import_order_id?: number | null;
    importOrder?: { id: number; code: string } | null;
    supplier_id?: number | null;
    supplier?: { id: number; name: string };
    warehouse_id?: number;
    warehouse?: { id: number; name: string };
    return_type?: 'by_order' | 'without_order';
    return_reason?: string | null;
    total_amount?: number;
    discount?: number;
    return_cost?: number;
    deduction?: number;
    refund_amount?: number;
    export_to_stock?: boolean;
    status?: 'pending' | 'completed' | 'cancelled';
    notes?: string | null;
    tags?: any;
    items?: Array<{
        id: number;
        product_id: number;
        product_variant_id?: number | null;
        product_name?: string;
        product_image?: string | null;
        product_sku?: string | null;
        variant_sku?: string | null;
        quantity: number;
        unit_price: number;
        total_price: number;
        notes?: string | null;
        discount?: number;
        discount_type?: string;
        management_type?: string;
        batch_allocations?: any;
    }>;
}

interface ReturnImportOrderSaveProps {
    record?: ReturnImportOrder;
    users?: IPaginate<User> | User[];
    suppliers?: Array<{ value: string | number; label: string }>;
    warehouses?: Array<{ value: string | number; label: string }>;
    catalogues?: Array<{ value: string | number; label: string }>;
    type?: 'by_order' | 'without_order';
    importOrder?: ImportOrder;
}

// Component for adding new return cost
function ReturnCostForm({ onAdd }: { onAdd: (cost: { name: string; amount: number }) => void }) {
    const [newCostName, setNewCostName] = useState('');
    const [newCostAmount, setNewCostAmount] = useState(0);

    const handleAdd = () => {
        if (!newCostName.trim() || newCostAmount <= 0) {
            return;
        }
        onAdd({ name: newCostName.trim(), amount: newCostAmount });
        setNewCostName('');
        setNewCostAmount(0);
    };

    return (
        <div className="border rounded-md p-4 space-y-3 bg-gray-50">
            <div className="grid grid-cols-12 gap-3">
                <div className="col-span-4">
                    <Label className="text-xs mb-2 block">Tên chi phí</Label>
                    <Input
                        placeholder="VD: Phí vận chuyển"
                        value={newCostName}
                        onChange={(e) => setNewCostName(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAdd();
                            }
                        }}
                    />
                </div>
                <div className="col-span-3">
                    <Label className="text-xs mb-2 block">Số tiền</Label>
                    <PriceInput
                        value={newCostAmount}
                        onValueChange={(val) => setNewCostAmount(val || 0)}
                        placeholder="0"
                        className="pr-8"
                        onKeyDown={(e: any) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAdd();
                            }
                        }}
                    />
                </div>
                <div className="col-span-1 flex items-end">
                    <Button
                        type="button"
                        onClick={handleAdd}
                        size="sm"
                        className="w-full"
                        disabled={!newCostName.trim() || newCostAmount <= 0}
                    >
                        <Plus className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}

export default function ReturnImportOrderSave({
    record,
    suppliers = [],
    warehouses = [],
    catalogues = [],
    type = 'by_order',
    importOrder,
}: ReturnImportOrderSaveProps) {
    const isEdit = !!record;
    const isCompleted = record?.status === 'completed';
    const [loading, setLoading] = useState(false);
    const [returnType] = useState(record?.return_type || type);

    // Form state - initialize from record if editing
    const [supplierId, setSupplierId] = useState(
        record?.supplier_id?.toString() || importOrder?.supplier_id?.toString() || ''
    );
    const [warehouseId, setWarehouseId] = useState(
        record?.warehouse_id?.toString() || importOrder?.warehouse_id?.toString() || ''
    );
    const [returnReason, setReturnReason] = useState(record?.return_reason || '');
    const [notes, setNotes] = useState(record?.notes || '');
    const [exportToStock, setExportToStock] = useState(
        record?.export_to_stock ?? (type === 'by_order')
    );
    const [discount, setDiscount] = useState(record?.discount || 0);
    const [returnCosts, setReturnCosts] = useState<Array<{ name: string; amount: number }>>([]);
    const [deduction, setDeduction] = useState(record?.deduction || 0);
    const [deductionReason, setDeductionReason] = useState('');

    // Set default exportToStock based on returnType
    // by_order: default true (but user can uncheck)
    // without_order: default true (but user can uncheck)
    // exportToStock is initialized based on type (by_order = true, without_order = true by default)
    // User can change it via checkbox - no need to force it in useEffect

    // Calculate total return cost from array
    const totalReturnCost = useMemo(() => {
        return returnCosts.reduce((sum, cost) => sum + (cost.amount || 0), 0);
    }, [returnCosts]);

    // Refund state
    const [refundStatus, setRefundStatus] = useState<'received' | 'later'>('later');
    const [paymentMethod, setPaymentMethod] = useState('');
    const [refundDate, setRefundDate] = useState<Date | undefined>(new Date());
    const [refundReference, setRefundReference] = useState('');

    // Modals
    const [showDeductionModal, setShowDeductionModal] = useState(false);
    const [showReturnCostModal, setShowReturnCostModal] = useState(false);

    // Items
    const [items, setItems] = useState<ReturnItem[]>([]);

    // Batch modal
    const [showBatchModal, setShowBatchModal] = useState(false);
    const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);

    // Initialize items from record if editing
    useEffect(() => {
        if (isEdit && record?.items) {
            const returnItems: ReturnItem[] = record.items.map(item => {
                // Parse batch_allocations
                let batchAllocations: BatchAllocation[] = [];
                if (item.batch_allocations) {
                    if (typeof item.batch_allocations === 'string') {
                        try {
                            batchAllocations = JSON.parse(item.batch_allocations);
                        } catch (e) {
                            batchAllocations = [];
                        }
                    } else if (Array.isArray(item.batch_allocations)) {
                        batchAllocations = item.batch_allocations;
                    }
                }

                return {
                    product_id: item.product_id,
                    product_variant_id: item.product_variant_id || null,
                    product_name: item.product_name || 'N/A',
                    product_image: item.product_image || null,
                    product_sku: item.product_sku || undefined,
                    quantity: Number(item.quantity) || 0,
                    max_quantity: Number(item.quantity) || 0, // For edit, max is current quantity
                    unit_price: Number(item.unit_price) || 0,
                    original_unit_price: Number(item.unit_price) || 0,
                    discount: Number(item.discount) || 0,
                    discount_type: (item.discount_type as 'fixed' | 'amount' | 'percent') || 'fixed',
                    batch_allocations: batchAllocations,
                    total_price: Number(item.total_price) || 0,
                    management_type: (item.management_type as 'basic' | 'imei' | 'batch') || 'basic',
                };
            });
            setItems(returnItems);
            return;
        }

        // Initialize items from import order (for new order)
        if (returnType === 'by_order' && importOrder?.items && !isEdit) {
            const returnItems: ReturnItem[] = importOrder.items.map(item => {
                // Parse batch_allocations từ import order để biết lô nào đã được nhập
                let importBatchAllocations: BatchAllocation[] = [];
                if (item.batch_allocations) {
                    if (typeof item.batch_allocations === 'string') {
                        try {
                            importBatchAllocations = JSON.parse(item.batch_allocations);
                        } catch (e) {
                            importBatchAllocations = [];
                        }
                    } else if (Array.isArray(item.batch_allocations)) {
                        importBatchAllocations = item.batch_allocations;
                    }
                }

                // Tính toán breakdown cho đơn giá
                const originalPrice = Number(item.unit_price) || 0;
                const itemDiscount = Number(item.discount) || 0;
                const discountType = (item.discount_type as 'fixed' | 'amount' | 'percent') || 'fixed';

                // Tính chiết khấu đơn phân bổ
                let orderDiscount = 0;
                if (itemDiscount > 0 && item.quantity > 0 && discountType !== 'fixed') {
                    if (discountType === 'percent') {
                        // Nếu là phần trăm, tính số tiền chiết khấu từ giá gốc
                        orderDiscount = (originalPrice * itemDiscount) / 100;
                    } else if (discountType === 'amount') {
                        // Nếu là số tiền, chia đều cho số lượng
                        orderDiscount = itemDiscount / item.quantity;
                    }
                    // Nếu discountType = 'fixed', không có discount (orderDiscount = 0)
                }

                const returnPrice = Math.max(0, originalPrice - orderDiscount);

                // Số lượng đã trả trước đó (từ API)
                const returnedQuantity = item.returned_quantity || 0;
                // Số lượng còn lại có thể trả (từ API)
                const remainingQuantity = item.remaining_quantity || 0;

                return {
                    product_id: item.product_id,
                    product_variant_id: item.product_variant_id || null,
                    product_name: item.product_name || 'N/A',
                    product_image: item.product_image,
                    product_sku: item.product_sku,
                    quantity: 0, // Ban đầu số lượng trả là 0
                    max_quantity: remainingQuantity, // Số lượng tối đa = số lượng còn lại
                    import_quantity: item.quantity, // Số lượng nhập ban đầu
                    unit_price: returnPrice, // Đơn giá trả (mặc định = giá gốc - chiết khấu)
                    original_unit_price: originalPrice, // Đơn giá nhập gốc
                    item_discount: 0, // Chiết khấu sản phẩm (có thể điều chỉnh)
                    order_discount: orderDiscount, // Chiết khấu đơn phân bổ
                    discount: Number(item.discount) || 0,
                    discount_type: (item.discount_type as 'fixed' | 'amount' | 'percent') || 'fixed',
                    batch_allocations: [], // Luôn bắt đầu với mảng rỗng, người dùng phải chọn lại
                    import_batch_allocations: importBatchAllocations, // Lưu lại để filter trong popup
                    total_price: 0,
                    management_type: item.management_type as 'basic' | 'imei' | 'batch' || 'basic',
                    returned_quantity: returnedQuantity,
                    remaining_quantity: remainingQuantity,
                };
            });
            setItems(returnItems);
        }
    }, [returnType, importOrder, isEdit, record?.items]);

    // Calculate item total price
    const calculateItemTotal = useCallback((item: ReturnItem): number => {
        const basePrice = item.quantity * item.unit_price;
        let discountAmount = 0;

        // Nếu discount_type = 'fixed', không có discount (giá cố định)
        if (item.discount_type === 'fixed') {
            discountAmount = 0;
        } else if (item.discount_type === 'percent') {
            // Nếu là phần trăm, tính theo phần trăm của tổng giá
            discountAmount = basePrice * (item.discount / 100);
        } else if (item.discount_type === 'amount') {
            // Nếu là số tiền, nhân với số lượng
            discountAmount = item.discount * item.quantity;
        }

        return Math.max(0, basePrice - discountAmount);
    }, []);

    // Update totals when items change
    useEffect(() => {
        setItems(prev => prev.map(item => ({
            ...item,
            total_price: calculateItemTotal(item),
        })));
    }, []);

    // Calculate totals
    const totals = useMemo(() => {
        const totalAmount = items.reduce((sum, item) => sum + calculateItemTotal(item), 0);
        // Giá trị hoàn trả = Tổng - Chi phí - Giảm trừ
        const refundAmount = Math.max(0, totalAmount - totalReturnCost - deduction);
        return {
            totalAmount, // Giá trị hàng trả
            refundAmount, // Giá trị hoàn trả (locked = số tiền nhận hoàn khi đã nhận)
        };
    }, [items, totalReturnCost, deduction, calculateItemTotal]);

    // Check if has items with quantity > 0
    const hasReturnItems = useMemo(() => {
        return items.some(item => item.quantity > 0);
    }, [items]);

    // Handle quantity change
    const handleQuantityChange = (index: number, value: number) => {
        setItems(prev => prev.map((item, i) => {
            if (i !== index) return item;

            // Validate: không được vượt quá max_quantity
            let newQty = Math.max(0, value);
            if (newQty > item.max_quantity) {
                toast.error(`Số lượng trả không được vượt quá ${item.max_quantity} (số lượng đã mua)`);
                newQty = item.max_quantity;
            }

            // Nếu sản phẩm quản lý theo lô và đã chọn lô, kiểm tra số lượng lô
            if (item.management_type === 'batch' && item.batch_allocations && item.batch_allocations.length > 0) {
                const totalBatchQty = item.batch_allocations.reduce((sum: number, alloc: BatchAllocation) => sum + (alloc.quantity || 0), 0);
                if (newQty !== totalBatchQty) {
                    toast.warning(`Số lượng trả (${newQty}) không khớp với số lượng lô (${totalBatchQty}). Vui lòng chọn lại lô.`);
                }
            }

            const newItem = { ...item, quantity: newQty };
            newItem.total_price = calculateItemTotal(newItem);
            return newItem;
        }));
    };

    // Handle unit price change
    const handleUnitPriceChange = (index: number, value: number) => {
        setItems(prev => prev.map((item, i) => {
            if (i !== index) return item;
            const newItem = { ...item, unit_price: value };
            newItem.total_price = calculateItemTotal(newItem);
            return newItem;
        }));
    };

    // Remove item
    const handleRemoveItem = (index: number) => {
        setItems(prev => prev.filter((_, i) => i !== index));
    };

    // Open batch modal
    const handleOpenBatchModal = (index: number) => {
        setEditingItemIndex(index);
        setShowBatchModal(true);
    };

    // Save batch allocations
    const handleSaveBatchAllocations = (allocations: BatchAllocation[]) => {
        if (editingItemIndex !== null) {
            setItems(prev => prev.map((item, i) => {
                if (i !== editingItemIndex) return item;

                // Tính tổng số lượng lô
                const totalBatchQty = allocations.reduce((sum, alloc) => sum + (alloc.quantity || 0), 0);

                // Nếu số lượng lô khác số lượng trả, cập nhật số lượng trả = số lượng lô
                let newQuantity = item.quantity;
                if (totalBatchQty > 0 && totalBatchQty !== item.quantity) {
                    // Nếu số lượng lô > max_quantity, giới hạn ở max_quantity
                    newQuantity = Math.min(totalBatchQty, item.max_quantity);
                    toast.info(`Số lượng trả đã được cập nhật thành ${newQuantity} để khớp với số lượng lô`);
                }

                const updatedItem = {
                    ...item,
                    batch_allocations: allocations,
                    quantity: newQuantity
                };
                updatedItem.total_price = calculateItemTotal(updatedItem);

                return updatedItem;
            }));
        }
        setShowBatchModal(false);
        setEditingItemIndex(null);
    };

    // Add product (for without_order type)
    const handleAddProduct = (product: any) => {
        // Check if product already exists
        const existingIndex = items.findIndex(item =>
            item.product_id === product.id &&
            item.product_variant_id === (product.variant_id || null)
        );

        if (existingIndex >= 0) {
            toast.warning('Sản phẩm đã có trong danh sách');
            return;
        }

        const newItem: ReturnItem = {
            product_id: product.id,
            product_variant_id: product.variant_id || null,
            product_name: product.name + (product.variant_name ? ` - ${product.variant_name}` : ''),
            product_image: product.image,
            product_sku: product.sku,
            quantity: 1,
            max_quantity: product.stock_quantity || 999,
            unit_price: product.cost_price || product.wholesale_price || 0,
            discount: 0,
            discount_type: 'fixed',
            batch_allocations: [],
            total_price: 0,
            management_type: product.management_type || 'basic',
        };
        newItem.total_price = calculateItemTotal(newItem);
        setItems(prev => [...prev, newItem]);
    };

    // Format currency
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
            minimumFractionDigits: 0,
        }).format(value);
    };

    // Submit form
    const handleSubmit = async () => {
        // Validation
        if (returnType === 'without_order' && !warehouseId) {
            // Warehouse is optional for 'without_order', ignored.
        }

        if (items.length === 0) {
            toast.error('Vui lòng thêm sản phẩm trả hàng');
            return;
        }

        const validItems = items.filter(item => item.quantity > 0);
        if (validItems.length === 0) {
            toast.error('Vui lòng nhập số lượng trả cho ít nhất một sản phẩm');
            return;
        }

        // Validate batch allocations cho sản phẩm quản lý theo lô
        for (const item of validItems) {
            if (item.management_type === 'batch') {
                if (returnType === 'by_order') {
                    if (!item.batch_allocations || item.batch_allocations.length === 0) {
                        toast.error(`Sản phẩm "${item.product_name}" quản lý theo lô, vui lòng chọn lô trả hàng`);
                        return;
                    }

                    // Kiểm tra tổng số lượng lô có khớp với số lượng trả không
                    const totalBatchQty = item.batch_allocations.reduce((sum, alloc) => sum + (alloc.quantity || 0), 0);
                    if (totalBatchQty !== item.quantity) {
                        toast.error(`Sản phẩm "${item.product_name}": Số lượng lô (${totalBatchQty}) không khớp với số lượng trả (${item.quantity})`);
                        return;
                    }
                }
            }
        }

        setLoading(true);
        try {
            const payload = {
                warehouse_id: warehouseId ? parseInt(warehouseId) : (importOrder?.warehouse_id || null),
                supplier_id: supplierId ? parseInt(supplierId) : (importOrder?.supplier_id || null),
                return_reason: returnReason,
                notes: notes,
                export_to_stock: exportToStock,
                total_amount: totals.totalAmount,
                discount: discount,
                return_cost: totalReturnCost,
                return_costs: returnCosts,
                deduction: deduction,
                deduction_reason: deductionReason,
                refund_amount: totals.refundAmount,
                refund_status: refundStatus,
                payment_method: refundStatus === 'received' ? paymentMethod : null,
                refund_date: refundStatus === 'received' && refundDate ? format(refundDate, 'yyyy-MM-dd') : null,
                refund_reference: refundStatus === 'received' ? refundReference : null,
                items: validItems.map(item => ({
                    product_id: item.product_id,
                    product_variant_id: item.product_variant_id,
                    quantity: item.quantity,
                    unit_price: item.unit_price,
                    original_unit_price: item.original_unit_price,
                    item_discount: item.item_discount,
                    order_discount: item.order_discount,
                    discount: item.discount,
                    discount_type: item.discount_type,
                    batch_allocations: item.batch_allocations,
                    total_price: calculateItemTotal(item),
                    management_type: item.management_type, // Critical for backend logic
                })),
            };

            const url = returnType === 'by_order' && importOrder
                ? `/backend/return-import-order/by-order/${importOrder.id}`
                : '/backend/return-import-order/without-order';

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    ...getCsrfHeaders(),
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            if (data.success) {
                toast.success(data.message || 'Tạo đơn trả hàng thành công!');
                router.visit('/backend/return-import-order');
            } else {
                toast.error(data.message || 'Có lỗi xảy ra');
            }
        } catch (error: any) {
            toast.error(error.message || 'Có lỗi xảy ra');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AppLayout breadcrumbs={getBreadcrumbs(isEdit)}>
            <Head title={isEdit ? `Sửa đơn trả hàng ${record?.code || ''}` : "Tạo đơn trả hàng"} />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl page-wrapper">
                <CustomPageHeading
                    heading={isEdit ? `Sửa đơn trả hàng ${record?.code || ''}` : (returnType === 'by_order' ? 'Trả hàng theo đơn nhập' : 'Trả hàng không theo đơn')}
                    breadcrumbs={getBreadcrumbs(isEdit)}
                />

                <div className="page-container">
                    <div className="max-w-[1100px] mx-auto">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                            {/* Main content */}
                            <div className="lg:col-span-2 space-y-4">
                                {/* Import Order Info (if by_order) */}
                                {returnType === 'by_order' && importOrder && (
                                    <CustomCard isShowHeader={true} title="Thông tin đơn nhập">
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div>
                                                <span className="text-muted-foreground">Mã đơn nhập:</span>
                                                <span className="ml-2 font-semibold text-blue-600">{importOrder.code}</span>
                                            </div>
                                            <div>
                                                <span className="text-muted-foreground">Nhà cung cấp:</span>
                                                <span className="ml-2">{importOrder.supplier?.name || '-'}</span>
                                            </div>
                                            <div>
                                                <span className="text-muted-foreground">Kho hàng:</span>
                                                <span className="ml-2">{importOrder.warehouse?.name || '-'}</span>
                                            </div>
                                        </div>
                                    </CustomCard>
                                )}

                                {/* Product search (if without_order) */}
                                {/* Product search (if without_order) */}
                                {returnType === 'without_order' && (
                                    <CustomCard isShowHeader={true} title="Chọn sản phẩm trả">
                                        <ProductSearchDropdown
                                            warehouseId={undefined}
                                            onSelectProduct={handleAddProduct}
                                            catalogues={catalogues}
                                        />
                                    </CustomCard>
                                )}

                                {/* Items table */}
                                <CustomCard isShowHeader={true} title="Sản phẩm trả hàng">
                                    {items.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-12 text-center">
                                            <Package className="h-12 w-12 text-muted-foreground mb-3" />
                                            <p className="text-muted-foreground">
                                                {returnType === 'by_order'
                                                    ? 'Không có sản phẩm nào'
                                                    : 'Tìm và thêm sản phẩm để trả hàng'}
                                            </p>
                                        </div>
                                    ) : (
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="w-[40%]">Sản phẩm</TableHead>
                                                    <TableHead className="w-[15%] text-center">SL trả</TableHead>
                                                    <TableHead className="w-[20%] text-right">Đơn giá</TableHead>
                                                    <TableHead className="w-[20%] text-right">Thành tiền</TableHead>
                                                    <TableHead className="w-[5%]"></TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {items.map((item, index) => (
                                                    <TableRow key={index}>
                                                        <TableCell>
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-10 h-10 bg-muted rounded flex items-center justify-center overflow-hidden">
                                                                    {item.product_image ? (
                                                                        <img src={item.product_image} alt="" className="w-full h-full object-cover" />
                                                                    ) : (
                                                                        <Package className="h-5 w-5 text-muted-foreground" />
                                                                    )}
                                                                </div>
                                                                <div>
                                                                    <div className="font-medium text-sm line-clamp-2">{item.product_name}</div>
                                                                    {item.product_sku && (
                                                                        <div className="text-xs text-muted-foreground">SKU: {item.product_sku}</div>
                                                                    )}
                                                                    {item.management_type === 'batch' && (
                                                                        <div className="mt-1">
                                                                            {returnType === 'without_order' ? (
                                                                                <div className="flex items-center gap-1.5 mt-2">
                                                                                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                                                                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
                                                                                            <path fillRule="evenodd" d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14Zm3.844-8.791a.75.75 0 0 0-1.188-.918l-3.577 4.625-2.625-2.625a.75.75 0 0 0-1.06 1.06l3.125 3.125a.75.75 0 0 0 1.127-.06l4.198-5.207Z" clipRule="evenodd" />
                                                                                        </svg>
                                                                                        Phân lô tự động
                                                                                    </span>
                                                                                </div>
                                                                            ) : (
                                                                                <>
                                                                                    <Button
                                                                                        type="button"
                                                                                        variant="link"
                                                                                        size="sm"
                                                                                        className="h-auto p-0 text-xs text-blue-600"
                                                                                        onClick={() => handleOpenBatchModal(index)}
                                                                                    >
                                                                                        {item.batch_allocations && item.batch_allocations.length > 0
                                                                                            ? `${item.batch_allocations.length} lô đã chọn`
                                                                                            : 'Chọn lô trả hàng'}
                                                                                    </Button>
                                                                                    {item.batch_allocations && item.batch_allocations.length > 0 && (
                                                                                        <div className="mt-1 flex flex-wrap gap-1">
                                                                                            {item.batch_allocations.map((allocation: BatchAllocation, idx: number) => (
                                                                                                <span
                                                                                                    key={idx}
                                                                                                    className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded"
                                                                                                >
                                                                                                    {allocation.batch_code || `Lô #${allocation.batch_id}`} | SL: {allocation.quantity || 0}
                                                                                                </span>
                                                                                            ))}
                                                                                        </div>
                                                                                    )}
                                                                                </>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex flex-col items-center gap-1">
                                                                <Input
                                                                    type="number"
                                                                    min={0}
                                                                    max={item.max_quantity}
                                                                    value={item.quantity}
                                                                    onChange={(e) => {
                                                                        const val = e.target.value;
                                                                        // Chỉ cho phép số từ 0 đến max_quantity
                                                                        if (val === '' || val === '0') {
                                                                            handleQuantityChange(index, 0);
                                                                        } else {
                                                                            const numVal = parseInt(val) || 0;
                                                                            if (numVal <= item.max_quantity) {
                                                                                handleQuantityChange(index, numVal);
                                                                            } else {
                                                                                // Nếu vượt quá max, set về max và báo lỗi
                                                                                toast.error(`Số lượng trả không được vượt quá ${item.max_quantity}`);
                                                                                handleQuantityChange(index, item.max_quantity);
                                                                            }
                                                                        }
                                                                    }}
                                                                    onBlur={(e) => {
                                                                        // Đảm bảo giá trị hợp lệ khi blur
                                                                        const val = parseInt(e.target.value) || 0;
                                                                        if (val < 0) {
                                                                            handleQuantityChange(index, 0);
                                                                        } else if (val > item.max_quantity) {
                                                                            handleQuantityChange(index, item.max_quantity);
                                                                        }
                                                                    }}
                                                                    className="w-20 text-center"
                                                                />
                                                                <span className="text-xs text-muted-foreground">
                                                                    {item.quantity} / {item.max_quantity}
                                                                </span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <div className="inline-block">
                                                                        <PriceInput
                                                                            value={item.unit_price}
                                                                            onChange={(val) => handleUnitPriceChange(index, val || 0)}
                                                                            className="text-right"
                                                                        />
                                                                    </div>
                                                                </TooltipTrigger>
                                                                <TooltipContent
                                                                    className="!max-w-[300px] !p-3 !bg-gray-900 !text-white !border-0 !shadow-xl z-50 [&>svg]:!fill-gray-900"
                                                                    side="left"
                                                                    onPointerDown={(e) => e.preventDefault()}
                                                                    onClick={(e) => e.preventDefault()}
                                                                >
                                                                    <div
                                                                        className="space-y-2 text-sm text-white"
                                                                        onPointerDown={(e) => e.stopPropagation()}
                                                                        onClick={(e) => e.stopPropagation()}
                                                                    >
                                                                        <div className="font-semibold mb-2 text-white">Chi tiết đơn giá trả</div>
                                                                        <div className="flex justify-between">
                                                                            <span className="text-gray-300">Đơn giá nhập gốc:</span>
                                                                            <span className="font-medium text-white">{formatCurrency(item.original_unit_price || item.unit_price)}</span>
                                                                        </div>
                                                                        <div className="flex justify-between">
                                                                            <span className="text-gray-300">Chiết khấu sản phẩm:</span>
                                                                            <span className="font-medium text-red-300">-{formatCurrency(item.item_discount || 0)}</span>
                                                                        </div>
                                                                        <div className="flex justify-between">
                                                                            <span className="text-gray-300">Chiết khấu đơn phân bổ:</span>
                                                                            <span className="font-medium text-red-300">-{formatCurrency(item.order_discount || 0)}</span>
                                                                        </div>
                                                                        <div className="pt-2 border-t border-gray-700 flex justify-between font-semibold">
                                                                            <span className="text-white">Đơn giá trả:</span>
                                                                            <span className="text-white">{formatCurrency(item.unit_price)}</span>
                                                                        </div>
                                                                    </div>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </TableCell>
                                                        <TableCell className="text-right font-medium">
                                                            {formatCurrency(calculateItemTotal(item))}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleRemoveItem(index)}
                                                                className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    )}
                                </CustomCard>

                                {/* Hoàn tiền */}
                                <CustomCard isShowHeader={true} title="Hoàn tiền">
                                    <div className="space-y-3">
                                        <div className="flex justify-between text-sm">
                                            <span>Giá trị hàng trả:</span>
                                            <div className="text-right">
                                                <div className="font-medium">{formatCurrency(totals.totalAmount)}</div>
                                                <div className="text-xs text-muted-foreground">
                                                    {items.reduce((sum, item) => sum + item.quantity, 0)} sản phẩm
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <button
                                                type="button"
                                                onClick={() => setShowReturnCostModal(true)}
                                                disabled={!hasReturnItems}
                                                className={`text-sm text-left ${hasReturnItems ? 'text-blue-600 hover:underline cursor-pointer' : 'text-gray-400 cursor-not-allowed'}`}
                                            >
                                                Chi phí:
                                            </button>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-medium">
                                                    {totalReturnCost > 0 ? formatCurrency(totalReturnCost) : formatCurrency(0)}
                                                </span>
                                                {returnCosts.length > 0 && (
                                                    <span className="text-xs text-muted-foreground">
                                                        ({returnCosts.length} loại)
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <button
                                                type="button"
                                                onClick={() => setShowDeductionModal(true)}
                                                disabled={!hasReturnItems}
                                                className={`text-sm text-left ${hasReturnItems ? 'text-blue-600 hover:underline cursor-pointer' : 'text-gray-400 cursor-not-allowed'}`}
                                            >
                                                Giảm trừ trả hàng:
                                            </button>
                                            <div className="flex items-center gap-2">
                                                <span className={`text-sm font-medium ${deduction > 0 ? 'text-red-600' : ''}`}>
                                                    {deduction > 0 ? `-${formatCurrency(deduction)}` : formatCurrency(0)}
                                                </span>
                                            </div>
                                        </div>

                                        <hr />

                                        <div className="space-y-3">
                                            <div className="flex justify-between text-lg font-semibold">
                                                <span>Giá trị hoàn trả:</span>
                                                <span className="text-green-600">{formatCurrency(totals.refundAmount)}</span>
                                            </div>

                                            {/* Refund Status */}
                                            <RadioGroup value={refundStatus} onValueChange={(val) => setRefundStatus(val as 'received' | 'later')}>
                                                <div className="flex items-center space-x-2 p-3 bg-blue-50 rounded-lg">
                                                    <RadioGroupItem value="received" id="received" />
                                                    <Label htmlFor="received" className="cursor-pointer font-normal">
                                                        Đã nhận hoàn tiền
                                                    </Label>
                                                </div>
                                                <div className="flex items-center space-x-2 p-3 bg-blue-50 rounded-lg">
                                                    <RadioGroupItem value="later" id="later" />
                                                    <Label htmlFor="later" className="cursor-pointer font-normal">
                                                        Nhận hoàn tiền sau
                                                    </Label>
                                                </div>
                                            </RadioGroup>

                                            {/* Fields khi đã nhận hoàn tiền */}
                                            {refundStatus === 'received' && (
                                                <div className="space-y-3 pt-2 border-t">
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <Label className="text-xs mb-1.5 block">Hình thức thanh toán</Label>
                                                            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                                                                <SelectTrigger className="w-full">
                                                                    <SelectValue placeholder="Chọn hình thức thanh toán" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="cash">Tiền mặt</SelectItem>
                                                                    <SelectItem value="bank_transfer">Chuyển khoản</SelectItem>
                                                                    <SelectItem value="check">Séc</SelectItem>
                                                                    <SelectItem value="other">Khác</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        </div>

                                                        <div>
                                                            <Label className="text-xs mb-1.5 block">Số tiền nhận hoàn</Label>
                                                            <Input
                                                                value={formatCurrency(totals.refundAmount).replace('₫', '').trim()}
                                                                disabled
                                                                readOnly
                                                                className="text-right font-medium bg-gray-50"
                                                            />
                                                            <p className="text-xs text-muted-foreground mt-1">
                                                                = Giá trị hoàn trả
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <Label className="text-xs mb-1.5 block">Ngày ghi nhận</Label>
                                                            <Popover>
                                                                <PopoverTrigger asChild>
                                                                    <Button
                                                                        variant="outline"
                                                                        className="w-full justify-start text-left font-normal"
                                                                    >
                                                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                                                        {refundDate ? format(refundDate, 'dd/MM/yyyy') : 'Chọn ngày'}
                                                                    </Button>
                                                                </PopoverTrigger>
                                                                <PopoverContent className="w-auto p-0">
                                                                    <Calendar
                                                                        mode="single"
                                                                        selected={refundDate}
                                                                        onSelect={setRefundDate}
                                                                        initialFocus
                                                                    />
                                                                </PopoverContent>
                                                            </Popover>
                                                        </div>

                                                        <div>
                                                            <Label className="text-xs mb-1.5 block">Tham chiếu</Label>
                                                            <Input
                                                                value={refundReference}
                                                                onChange={(e) => setRefundReference(e.target.value)}
                                                                placeholder="Nhập mã tham chiếu"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </CustomCard>
                            </div>

                            {/* Sidebar */}
                            <div className="space-y-4">
                                <div className="lg:col-span-1 space-y-4">
                                    <CustomCard isShowHeader={true} title="Thông tin phiếu trả">
                                        <div className="space-y-4">
                                            {/* Show supplier only for without_order */}
                                            {returnType === 'without_order' && (
                                                <div className="mb-4">
                                                    <Label className="mb-2 block">Nhà cung cấp</Label>
                                                    <Combobox
                                                        options={suppliers.map(s => ({ value: String(s.value), label: s.label }))}
                                                        value={supplierId}
                                                        onValueChange={setSupplierId}
                                                        placeholder="Chọn nhà cung cấp..."
                                                    />
                                                </div>
                                            )}

                                            <div>
                                                <Label className="mb-2 block">Lý do trả hàng</Label>
                                                <Textarea
                                                    value={returnReason}
                                                    onChange={(e) => setReturnReason(e.target.value)}
                                                    placeholder="VD: Hàng lỗi, Hàng hết hạn..."
                                                    className="min-h-[80px]"
                                                />
                                            </div>

                                            <div>
                                                <Label className="mb-2 block">Ghi chú</Label>
                                                <Textarea
                                                    value={notes}
                                                    onChange={(e) => setNotes(e.target.value)}
                                                    placeholder="Ghi chú thêm..."
                                                    rows={2}
                                                />
                                            </div>

                                            <div className="flex items-center space-x-2">
                                                <Checkbox
                                                    id="exportToStock"
                                                    checked={exportToStock}
                                                    onCheckedChange={(checked) => setExportToStock(checked as boolean)}
                                                />
                                                <Label htmlFor="exportToStock" className="cursor-pointer">
                                                    Xuất kho ngay khi tạo đơn
                                                </Label>
                                            </div>
                                        </div>
                                    </CustomCard>
                                </div>

                                {!exportToStock && (
                                    <div className="flex items-start gap-2 p-3 bg-orange-50 rounded-lg text-sm">
                                        <AlertCircle className="h-4 w-4 text-orange-600 mt-0.5 shrink-0" />
                                        <span className="text-orange-700">
                                            Đơn sẽ ở trạng thái "Chờ xuất kho". Bạn có thể xuất kho sau.
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => router.visit('/backend/return-import-order')}
                                >
                                    <ArrowLeft className="mr-2 h-4 w-4" />
                                    Quay lại
                                </Button>
                                <Button
                                    type="button"
                                    className="flex-1 bg-[#ed5565] hover:bg-[#ed5565]/90"
                                    onClick={handleSubmit}
                                    disabled={loading || items.length === 0}
                                >
                                    {loading && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                                    Tạo đơn trả hàng
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>


            {/* Batch modal */}
            {
                editingItemIndex !== null && items[editingItemIndex] && (
                    <SelectBatchModal
                        open={showBatchModal}
                        onOpenChange={setShowBatchModal}
                        productId={items[editingItemIndex].product_id}
                        variantId={items[editingItemIndex].product_variant_id || undefined}
                        warehouseId={warehouseId ? parseInt(warehouseId) : (importOrder?.warehouse_id || undefined)}
                        requiredQuantity={items[editingItemIndex].quantity || 0}
                        initialAllocations={items[editingItemIndex].batch_allocations || []}
                        importBatchAllocations={items[editingItemIndex].import_batch_allocations || []}
                        onSave={handleSaveBatchAllocations}
                        onConfirm={handleSaveBatchAllocations}
                    />
                )
            }

            {/* Deduction Modal */}
            <Dialog open={showDeductionModal} onOpenChange={setShowDeductionModal}>
                <DialogContent className="max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Giảm trừ trả hàng</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div>
                            <Label className="mb-2 block">Giá trị</Label>
                            <PriceInput
                                value={deduction}
                                onValueChange={(val) => setDeduction(val || 0)}
                                className="w-full"
                            />
                        </div>
                        <div>
                            <Label className="mb-2 block">Lý do giảm trừ</Label>
                            <Input
                                value={deductionReason}
                                onChange={(e) => setDeductionReason(e.target.value)}
                                placeholder="Nhập lý do"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDeductionModal(false)}>
                            Hủy
                        </Button>
                        <Button onClick={() => setShowDeductionModal(false)}>
                            Xác nhận
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Return Cost Modal */}
            <Dialog open={showReturnCostModal} onOpenChange={setShowReturnCostModal}>
                <DialogContent className="wide-modal max-h-[90vh] overflow-hidden flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Quản lý chi phí trả hàng</DialogTitle>
                    </DialogHeader>

                    <div className="flex flex-col flex-1 min-h-0 space-y-4">
                        {/* Add new cost form */}
                        <ReturnCostForm
                            onAdd={(cost) => {
                                setReturnCosts([...returnCosts, cost]);
                            }}
                        />

                        {/* Costs list */}
                        <div className="flex-1 overflow-y-auto border rounded-md">
                            {returnCosts.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                    <p className="text-sm">Chưa có chi phí nào. Thêm chi phí ở trên.</p>
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[50px]">STT</TableHead>
                                            <TableHead>Tên chi phí</TableHead>
                                            <TableHead>Số tiền</TableHead>
                                            <TableHead className="w-[50px]"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {returnCosts.map((cost, index) => (
                                            <TableRow key={index}>
                                                <TableCell>{index + 1}</TableCell>
                                                <TableCell>
                                                    <Input
                                                        value={cost.name}
                                                        onChange={(e) => {
                                                            const newCosts = [...returnCosts];
                                                            newCosts[index].name = e.target.value;
                                                            setReturnCosts(newCosts);
                                                        }}
                                                        className="border-0 p-0 h-auto focus-visible:ring-0"
                                                        placeholder="Tên chi phí"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <div className="relative">
                                                        <PriceInput
                                                            value={cost.amount}
                                                            onValueChange={(val) => {
                                                                const newCosts = [...returnCosts];
                                                                newCosts[index].amount = val || 0;
                                                                setReturnCosts(newCosts);
                                                            }}
                                                            className="border-0 p-0 h-auto focus-visible:ring-0 text-right pr-6"
                                                        />
                                                        <span className="absolute right-0 top-1/2 -translate-y-1/2 text-xs text-gray-500 pointer-events-none">₫</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => {
                                                            setReturnCosts(returnCosts.filter((_, i) => i !== index));
                                                        }}
                                                    >
                                                        <Trash2 className="h-4 w-4 text-red-500" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </div>

                        {/* Total */}
                        <div className="border-t pt-3 flex justify-between items-center">
                            <span className="font-semibold">Tổng chi phí:</span>
                            <span className="font-bold text-lg text-blue-600">
                                {formatCurrency(totalReturnCost)}
                            </span>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowReturnCostModal(false)}>Hủy</Button>
                        <Button onClick={() => setShowReturnCostModal(false)} className="bg-blue-600 hover:bg-blue-700 text-white">Áp dụng</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout >
    );
}
