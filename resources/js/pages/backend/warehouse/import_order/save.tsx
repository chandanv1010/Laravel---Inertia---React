import { useMemo, useRef, useState, useEffect } from 'react';
import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import { type IDateTime, type BreadcrumbItem, type PageConfig, type IPaginate, User } from '@/types';
import { Head, Form, Link, usePage } from '@inertiajs/react';
import CustomPageHeading from '@/components/custom-page-heading';
import CustomCard from '@/components/custom-card';
import { Button } from "@/components/ui/button"
import { ArrowLeft, LoaderCircle, Search, Package, Plus, Shuffle, Trash2 } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from "@/components/ui/input"
import InputError from '@/components/input-error';
import { setPreserveState } from '@/lib/helper';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Combobox } from '@/components/ui/combobox';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ProductSearchDropdown } from './components/product-search-dropdown';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AdjustPriceModal } from './components/adjust-price-modal';
import { DiscountModal } from './components/discount-modal';
import { ImportCostModal, ImportCostItem } from './components/import-cost-modal';
import { BulkProductSelectModal } from './components/bulk-product-select-modal';
import { SelectBatchModal, BatchAllocation } from './components/select-batch-modal';
import { Checkbox } from '@/components/ui/checkbox';
import { PriceInput } from '@/components/price-input';
import { toast } from 'sonner';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: dashboard().url,
    },
    {
        title: 'Quản lý nhập hàng',
        href: '/backend/import-order',
    },
    {
        title: 'Thêm mới Đơn Nhập Hàng',
        href: '/',
    }
];

const pageConfig: PageConfig<ImportOrder> = {
    heading: 'Tạo đơn nhập hàng',
}

export interface ImportOrderItem {
    id?: number,
    product_id: number | null,
    product_variant_id: number | null,
    product_name?: string,
    product_image?: string | null,
    product_sku?: string,
    variant_sku?: string,
    quantity: number,
    unit_price: number,
    total_price: number,
    notes: string | null,
    discount?: number,
    discount_type?: 'amount' | 'percent',
    management_type?: 'basic' | 'imei' | 'batch', // Loại quản lý sản phẩm
    batch_allocations?: Array<{ // Phân bổ lô (nếu management_type = 'batch')
        batch_id: number;
        batch_code: string;
        quantity: number;
    }>;
}

export interface ImportOrder extends IDateTime {
    id: number,
    code: string | null,
    supplier_id: number | null,
    supplier?: { id: number, name: string } | null,
    warehouse_id: number | null,
    warehouse?: { id: number, name: string } | null,
    responsible_user_id: number | null,
    responsibleUser?: User | null,
    expected_import_date: string | null,
    reference: string | null,
    notes: string | null,
    tags: string | null,
    total_amount: number,
    discount: number,
    discount_type?: string,
    import_cost: number,
    import_costs?: Array<{ name: string; amount: number }>,
    amount_to_pay: number,
    status: string,
    payment_status?: string,
    payment_amount?: number,
    user_id: number | null,
    creators: User | null,
    items?: ImportOrderItem[],
}

interface ImportOrderSaveProps {
    record?: ImportOrder,
    users?: IPaginate<User> | User[],
    suppliers?: Array<{ value: string | number; label: string }>,
    warehouses?: Array<{ value: string | number; label: string }>,
    catalogues?: Array<{ value: string | number; label: string }>,
}

export default function ImportOrderSave({ record, users, suppliers = [], warehouses = [], catalogues = [] }: ImportOrderSaveProps) {
    const { flash } = usePage().props as any;
    const buttonAction = useRef("")
    const isEdit = !!record

    const [code, setCode] = useState(record?.code || '')
    const [supplierId, setSupplierId] = useState(record?.supplier_id?.toString() || '')
    const [supplierError, setSupplierError] = useState('')
    const [itemsError, setItemsError] = useState('')
    const [batchValidationErrors, setBatchValidationErrors] = useState<Record<number, string>>({})

    // Auto-validate batch allocations if redirected from import-to-stock with error or validate_batch query param
    useEffect(() => {
        // Check URL for validate_batch query parameter
        const urlParams = new URLSearchParams(window.location.search);
        const shouldValidateBatch = urlParams.get('validate_batch') === '1';

        if (shouldValidateBatch || (flash?.error && flash.error.includes('Số lượng lô không khớp'))) {
            // Set importToStock to true to trigger validation display
            setImportToStock(true);

            // Show toast notification when redirected from show page
            if (shouldValidateBatch) {
                toast.error('Số lượng lô không khớp số lượng nhập. Vui lòng chọn lô nhập cho các sản phẩm bên dưới.');
            }

            // Validate and set errors for batch-managed products
            const errors: Record<number, string> = {};
            items.forEach((item, index) => {
                if (item.management_type === 'batch') {
                    const batchAllocs = Array.isArray(item.batch_allocations) ? item.batch_allocations : [];
                    if (!batchAllocs || batchAllocs.length === 0) {
                        errors[index] = 'Bạn chưa chọn lô nhập';
                    } else {
                        const totalBatchQty = batchAllocs.reduce(
                            (sum, alloc) => sum + (alloc.quantity || 0),
                            0
                        );
                        if (totalBatchQty !== item.quantity) {
                            errors[index] = 'Số lượng nhập không khớp với số lượng phân bố lô đã chọn';
                        }
                    }
                }
            });
            if (Object.keys(errors).length > 0) {
                setBatchValidationErrors(errors);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [flash?.error]);

    // Get user options first to set default
    const userOptionsForDefault = useMemo(() => {
        let usersList: User[] = []
        if (users) {
            if (users && typeof users === 'object' && 'data' in users && Array.isArray((users as any).data)) {
                usersList = (users as any).data
            }
            else if (Array.isArray(users)) {
                usersList = users
            }
            else if (users && typeof users === 'object' && (users as any).data) {
                usersList = Array.isArray((users as any).data) ? (users as any).data : []
            }
        }
        return usersList
    }, [users])

    // Get default warehouse (first warehouse in list, which should be main warehouse)
    const defaultWarehouseId = useMemo(() => {
        if (warehouses && warehouses.length > 0) {
            // Use first warehouse as default (main warehouse is usually first)
            return warehouses[0].value.toString()
        }
        return ''
    }, [warehouses])

    const [warehouseId, setWarehouseId] = useState(
        record?.warehouse_id?.toString() || defaultWarehouseId
    )

    const [responsibleUserId, setResponsibleUserId] = useState(
        record?.responsible_user_id?.toString() ||
        (userOptionsForDefault.length > 0 ? userOptionsForDefault[0].id.toString() : '')
    )
    const [expectedImportDate, setExpectedImportDate] = useState<Date | undefined>(
        record?.expected_import_date ? new Date(record.expected_import_date) : undefined
    )
    // Parse batch_allocations from JSON string if needed
    const parseItems = (items: ImportOrderItem[]): ImportOrderItem[] => {
        return items.map(item => {
            let batchAllocations = item.batch_allocations;

            // If batch_allocations is a string, parse it
            if (typeof batchAllocations === 'string') {
                try {
                    batchAllocations = JSON.parse(batchAllocations);
                } catch (e) {
                    batchAllocations = [];
                }
            }

            // Ensure it's an array
            if (!Array.isArray(batchAllocations)) {
                batchAllocations = [];
            }

            return {
                ...item,
                batch_allocations: batchAllocations
            };
        });
    };

    const [items, setItems] = useState<ImportOrderItem[]>(parseItems(record?.items || []))
    const [totalAmount, setTotalAmount] = useState(record?.total_amount || 0)
    const [discount, setDiscount] = useState(record?.discount || 0)
    const [discountType, setDiscountType] = useState<'amount' | 'percent'>('amount')
    const [importCost, setImportCost] = useState(record?.import_cost || 0)
    const [importCosts, setImportCosts] = useState<ImportCostItem[]>([])

    const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
    const [showAdjustPriceModal, setShowAdjustPriceModal] = useState(false);
    const [showDiscountModal, setShowDiscountModal] = useState(false);
    const [showImportCostModal, setShowImportCostModal] = useState(false);
    const [showBulkProductModal, setShowBulkProductModal] = useState(false);
    const [showSelectBatchModal, setShowSelectBatchModal] = useState(false);
    const [selectedItemForBatch, setSelectedItemForBatch] = useState<number | null>(null); // Index of item being configured
    const [importToStock, setImportToStock] = useState(false);

    // Payment State
    const [paymentStatus, setPaymentStatus] = useState<'paid' | 'unpaid'>('unpaid');
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [paymentAmount, setPaymentAmount] = useState(0);
    const [paymentDate, setPaymentDate] = useState<Date>(new Date());
    const [paymentReference, setPaymentReference] = useState('');
    const prevPaymentStatusRef = useRef<'paid' | 'unpaid'>('unpaid');

    const getActionUrl = () => {
        if (isEdit && record) {
            return `/backend/import-order/${record.id}`
        }
        return '/backend/import-order'
    }

    const generateRandomCode = () => {
        const prefixes = ['DHN', 'IMPORT', 'PO', 'IN'];
        const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
        const randomNum = Math.floor(Math.random() * 9000) + 1000; // 1000-9999
        const randomCode = `${prefix}${randomNum}`;
        setCode(randomCode);
    }

    const userOptions = useMemo(() => {
        let usersList: User[] = []

        if (users) {
            if (users && typeof users === 'object' && 'data' in users && Array.isArray((users as any).data)) {
                usersList = (users as any).data
            }
            else if (Array.isArray(users)) {
                usersList = users
            }
            else if (users && typeof users === 'object' && (users as any).data) {
                usersList = Array.isArray((users as any).data) ? (users as any).data : []
            }
        }

        return [
            { label: 'Chọn nhân viên phụ trách', value: '' },
            ...usersList.map(user => ({
                label: user.name,
                value: user.id.toString()
            }))
        ]
    }, [users])

    const supplierOptions = useMemo(() => {
        return [
            { label: 'Chọn nhà cung cấp', value: '' },
            ...suppliers.map(s => ({
                label: s.label,
                value: s.value.toString()
            }))
        ]
    }, [suppliers])

    const warehouseOptions = useMemo(() => {
        return warehouses.map(w => ({
            label: w.label,
            value: w.value.toString()
        }))
    }, [warehouses])

    // Calculate discount amount based on type
    const discountAmount = useMemo(() => {
        if (discountType === 'amount') {
            return discount;
        } else {
            return totalAmount * discount / 100;
        }
    }, [totalAmount, discount, discountType]);

    // Calculate total import cost from list
    const totalImportCost = useMemo(() => {
        return importCosts.reduce((sum, cost) => sum + (cost.amount || 0), 0);
    }, [importCosts]);

    const amountToPay = useMemo(() => {
        return Math.max(0, totalAmount - discountAmount)
    }, [totalAmount, discountAmount])


    // Calculate total amount from items
    useEffect(() => {
        const calculatedTotal = items.reduce((sum, item) => sum + (item.total_price || 0), 0)
        setTotalAmount(calculatedTotal)
    }, [items])

    const handleUpdateItemPrice = (price: number, discount: number, discountType: 'amount' | 'percent') => {
        if (editingItemIndex === null) return;

        const updatedItems = [...items];
        const item = updatedItems[editingItemIndex];

        // Calculate new unit price after discount (effectively the cost per unit for total calc)
        // Wait, "Đơn giá" in the modal usually means the Base Import Price.
        // "Giá sau giảm" is typically what we pay.
        // Let's store base price and discount separate.
        // Total price = (Base Price - Discount) * Quantity.

        let finalUnitPrice = price;
        if (discountType === 'amount') {
            finalUnitPrice = Math.max(0, price - discount);
        } else {
            finalUnitPrice = Math.max(0, price * (1 - discount / 100));
        }

        updatedItems[editingItemIndex] = {
            ...item,
            unit_price: price, // Store base price
            discount: discount,
            discount_type: discountType,
            total_price: finalUnitPrice * item.quantity,
        };

        setItems(updatedItems);
    };

    const dynamicBreadcrumbs = useMemo(() => {
        return [
            {
                title: 'Dashboard',
                href: dashboard().url,
            },
            {
                title: 'Quản lý nhập hàng',
                href: '/backend/import-order',
            },
            {
                title: isEdit ? 'Cập nhật Đơn Nhập Hàng' : 'Thêm mới Đơn Nhập Hàng',
                href: window.location.pathname,
            }
        ]
    }, [isEdit]);

    // Handle discount modal
    const handleDiscountConfirm = (discountValue: number, discountTypeValue: 'amount' | 'percent') => {
        setDiscount(discountValue);
        setDiscountType(discountTypeValue);
    };

    // Handle import cost modal
    const handleImportCostConfirm = (costs: ImportCostItem[]) => {
        setImportCosts(costs);
        setImportCost(costs.reduce((sum, cost) => sum + (cost.amount || 0), 0));
    };

    // Handle bulk product select
    const handleBulkProductSelect = (selectedProducts: Array<{ product: any; variantId?: number }>) => {
        // Lọc bỏ các sản phẩm đã tồn tại trong danh sách
        const filteredProducts = selectedProducts.filter(({ product, variantId }) => {
            const exists = items.some(item =>
                item.product_id === product.id &&
                item.product_variant_id === (variantId || null)
            );
            return !exists;
        });

        // Thông báo số sản phẩm bị bỏ qua do trùng lặp
        const skippedCount = selectedProducts.length - filteredProducts.length;
        if (skippedCount > 0) {
            toast.warning(`${skippedCount} sản phẩm đã có trong đơn nhập hàng và đã được bỏ qua.`);
        }

        if (filteredProducts.length === 0) {
            return; // Không có sản phẩm mới nào để thêm
        }

        const newItems: ImportOrderItem[] = filteredProducts.map(({ product, variantId }) => {
            const selectedVariant = variantId && product.variants
                ? product.variants.find((v: any) => v.id === variantId)
                : null;

            // Tạo variant name từ attributes nếu có variant
            let productName = product.name;
            if (selectedVariant && selectedVariant.attributes && typeof selectedVariant.attributes === 'object') {
                const variantNameParts: string[] = [];
                Object.values(selectedVariant.attributes).forEach((value: any) => {
                    if (value && value.trim()) {
                        variantNameParts.push(value);
                    }
                });
                if (variantNameParts.length > 0) {
                    const variantName = variantNameParts.join(' / ');
                    productName = `${product.name} - ${variantName}`;
                }
            }

            return {
                product_id: product.id,
                product_variant_id: variantId || null,
                product_name: productName,
                product_image: product.image,
                product_sku: product.sku,
                variant_sku: selectedVariant?.sku || undefined,
                quantity: 1,
                unit_price: selectedVariant?.wholesale_price || product.wholesale_price || 0,
                total_price: selectedVariant?.wholesale_price || product.wholesale_price || 0,
                notes: null,
                management_type: product.management_type || 'basic',
                batch_allocations: [],
            };
        });
        setItems([...items, ...newItems]);
        setItemsError(''); // Clear error when items are added
    };

    // Auto-fill payment amount when "Đã thanh toán" is selected
    useEffect(() => {
        // Chỉ tự động điền khi chuyển từ 'unpaid' sang 'paid'
        if (paymentStatus === 'paid' && prevPaymentStatusRef.current === 'unpaid') {
            setPaymentAmount(amountToPay);
        }
        prevPaymentStatusRef.current = paymentStatus;
    }, [paymentStatus, amountToPay]);

    // Auto-select first user and main warehouse when creating new order
    useEffect(() => {
        if (!isEdit) {
            if (userOptionsForDefault.length > 0 && !responsibleUserId) {
                setResponsibleUserId(userOptionsForDefault[0].id.toString());
            }
            if (defaultWarehouseId && !warehouseId) {
                setWarehouseId(defaultWarehouseId);
            }
        }
    }, [userOptionsForDefault, defaultWarehouseId, isEdit, responsibleUserId, warehouseId]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // F6 - Discount modal (only if has items)
            if (e.key === 'F6' && items.length > 0) {
                e.preventDefault();
                setShowDiscountModal(true);
            }
            // F7 - Import cost modal (only if has items)
            if (e.key === 'F7' && items.length > 0) {
                e.preventDefault();
                setShowImportCostModal(true);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [items.length]);

    return (
        <AppLayout>
            <Head title={isEdit ? 'Chỉnh sửa đơn nhập hàng' : 'Tạo đơn nhập hàng'} />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl page-wrapper">
                <CustomPageHeading
                    heading={isEdit ? 'Chỉnh sửa đơn nhập hàng' : 'Tạo đơn nhập hàng'}
                    breadcrumbs={dynamicBreadcrumbs}
                />

                <div className="page-container">
                    <div className="max-w-[1100px] ml-auto mr-auto">
                        <div className="grid grid-cols-3 gap-6">
                            {/* Left Column - Products & Payment */}
                            <div className="col-span-2 space-y-6">
                                {/* Products Section */}
                                <CustomCard title="Sản phẩm">
                                    <div className="space-y-4">
                                        <div className="flex gap-2">
                                            <div className="flex-1 relative z-20">
                                                <ProductSearchDropdown
                                                    catalogues={catalogues}
                                                    onSelectProduct={(product, variantId) => {
                                                        // Kiểm tra xem sản phẩm đã tồn tại trong danh sách chưa
                                                        const existingItem = items.find(item =>
                                                            item.product_id === product.id &&
                                                            item.product_variant_id === (variantId || null)
                                                        );

                                                        if (existingItem) {
                                                            toast.error('Sản phẩm này đã có trong đơn nhập hàng. Vui lòng cập nhật số lượng thay vì thêm mới.');
                                                            return;
                                                        }

                                                        const selectedVariant = variantId && product.variants
                                                            ? product.variants.find(v => v.id === variantId)
                                                            : null;

                                                        // Tạo variant name từ attributes nếu có variant
                                                        let productName = product.name;
                                                        if (selectedVariant && selectedVariant.attributes && typeof selectedVariant.attributes === 'object') {
                                                            const variantNameParts: string[] = [];
                                                            Object.values(selectedVariant.attributes).forEach((value: any) => {
                                                                if (value && value.trim()) {
                                                                    variantNameParts.push(value);
                                                                }
                                                            });
                                                            if (variantNameParts.length > 0) {
                                                                const variantName = variantNameParts.join(' / ');
                                                                productName = `${product.name} - ${variantName}`;
                                                            }
                                                        }

                                                        const newItem: ImportOrderItem = {
                                                            product_id: product.id,
                                                            product_variant_id: variantId || null,
                                                            product_name: productName,
                                                            product_image: product.image,
                                                            product_sku: product.sku,
                                                            variant_sku: selectedVariant?.sku || undefined,
                                                            quantity: 1,
                                                            unit_price: selectedVariant?.wholesale_price || product.wholesale_price || 0,
                                                            total_price: selectedVariant?.wholesale_price || product.wholesale_price || 0,
                                                            notes: null,
                                                            management_type: product.management_type || 'basic',
                                                            batch_allocations: [],
                                                        };
                                                        setItems([...items, newItem]);
                                                        setItemsError(''); // Clear error when item is added
                                                    }}
                                                />
                                            </div>
                                            <Button
                                                variant="outline"
                                                type="button"
                                                onClick={() => setShowBulkProductModal(true)}
                                            >
                                                Chọn nhiều
                                            </Button>
                                        </div>

                                        {items.length === 0 ? (
                                            <div className="space-y-2">
                                                <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed rounded-lg">
                                                    <Package className="h-16 w-16 text-muted-foreground mb-4" />
                                                    <p className="text-muted-foreground mb-4">Bạn chưa thêm sản phẩm nào. Vui lòng tìm kiếm sản phẩm ở trên.</p>
                                                </div>
                                                {itemsError && (
                                                    <div className="text-xs text-red-600 mt-2">
                                                        {itemsError}
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="border rounded-md">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead>Sản phẩm</TableHead>
                                                            <TableHead>Số lượng</TableHead>
                                                            <TableHead>Đơn giá</TableHead>
                                                            <TableHead>Thành tiền</TableHead>
                                                            <TableHead className="w-[50px]"></TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {items.map((item, index) => (
                                                            <TableRow key={index}>
                                                                <TableCell>
                                                                    <div className="flex items-center gap-3">
                                                                        {item.product_image ? (
                                                                            <img
                                                                                src={item.product_image}
                                                                                alt={item.product_name || 'Product'}
                                                                                className="w-10 h-10 object-cover rounded"
                                                                            />
                                                                        ) : (
                                                                            <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center">
                                                                                <Package className="h-5 w-5 text-gray-400" />
                                                                            </div>
                                                                        )}
                                                                        <div className="flex flex-col">
                                                                            <span className="text-sm font-medium">{item.product_name || `Product #${item.product_id}`}</span>
                                                                            {item.variant_sku && (
                                                                                <span className="text-xs text-muted-foreground">SKU: {item.variant_sku}</span>
                                                                            )}
                                                                            {item.management_type === 'batch' && (
                                                                                <div className="mt-1">
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => {
                                                                                            setSelectedItemForBatch(index);
                                                                                            setShowSelectBatchModal(true);
                                                                                        }}
                                                                                        className="text-xs text-blue-600 hover:text-blue-700 underline text-left"
                                                                                    >
                                                                                        Chọn lô nhập hàng
                                                                                    </button>
                                                                                    {/* Hiển thị lỗi validation khi bấm save */}
                                                                                    {batchValidationErrors[index] && (
                                                                                        <div className="text-xs text-red-600 mt-0.5">
                                                                                            {batchValidationErrors[index]}
                                                                                        </div>
                                                                                    )}
                                                                                    {/* Hiển thị lỗi real-time nếu chưa chọn lô (chỉ khi importToStock = true) */}
                                                                                    {importToStock && (!item.batch_allocations || item.batch_allocations.length === 0) && !batchValidationErrors[index] && (
                                                                                        <div className="text-xs text-red-600 mt-0.5">
                                                                                            Bạn chưa chọn lô nhập
                                                                                        </div>
                                                                                    )}
                                                                                    {/* Hiển thị lỗi real-time nếu số lượng không khớp (chỉ khi importToStock = true) */}
                                                                                    {importToStock && Array.isArray(item.batch_allocations) && item.batch_allocations.length > 0 && !batchValidationErrors[index] && (() => {
                                                                                        const totalBatchQty = item.batch_allocations.reduce(
                                                                                            (sum, alloc) => sum + (alloc.quantity || 0),
                                                                                            0
                                                                                        );
                                                                                        if (totalBatchQty !== item.quantity) {
                                                                                            return (
                                                                                                <div className="text-xs text-red-600 mt-0.5 flex items-center gap-1">
                                                                                                    <span>⚠</span>
                                                                                                    <span>Số lượng nhập không khớp với số lượng phân bố lô đã chọn</span>
                                                                                                </div>
                                                                                            );
                                                                                        }
                                                                                        return null;
                                                                                    })()}
                                                                                    {/* Hiển thị các lô đã chọn */}
                                                                                    {Array.isArray(item.batch_allocations) && item.batch_allocations.length > 0 && (
                                                                                        <div className="flex flex-wrap gap-1 mt-1">
                                                                                            {item.batch_allocations.map((alloc) => (
                                                                                                <span
                                                                                                    key={alloc.batch_id}
                                                                                                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full border border-blue-200"
                                                                                                >
                                                                                                    <span className="font-medium">{alloc.batch_code}</span>
                                                                                                    <span className="text-blue-500">|</span>
                                                                                                    <span>SL: {alloc.quantity}</span>
                                                                                                    <button
                                                                                                        type="button"
                                                                                                        onClick={(e) => {
                                                                                                            e.stopPropagation();
                                                                                                            // Xóa lô này khỏi danh sách
                                                                                                            const updatedItems = [...items];
                                                                                                            const batchAllocs = Array.isArray(item.batch_allocations) ? item.batch_allocations : [];
                                                                                                            updatedItems[index] = {
                                                                                                                ...item,
                                                                                                                batch_allocations: batchAllocs.filter(
                                                                                                                    (a) => a.batch_id !== alloc.batch_id
                                                                                                                ),
                                                                                                            };
                                                                                                            setItems(updatedItems);
                                                                                                        }}
                                                                                                        className="ml-0.5 text-blue-400 hover:text-red-500 cursor-pointer"
                                                                                                    >
                                                                                                        ×
                                                                                                    </button>
                                                                                                </span>
                                                                                            ))}
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Input
                                                                        type="number"
                                                                        value={item.quantity}
                                                                        onChange={(e) => {
                                                                            const qty = Number(e.target.value) || 0;
                                                                            const updatedItems = [...items];

                                                                            // Re-calculate total based on existing discount logic
                                                                            let unitPrice = item.unit_price;
                                                                            if (item.discount && item.discount_type) {
                                                                                if (item.discount_type === 'amount') {
                                                                                    unitPrice = Math.max(0, item.unit_price - item.discount);
                                                                                } else {
                                                                                    unitPrice = Math.max(0, item.unit_price * (1 - item.discount / 100));
                                                                                }
                                                                            }

                                                                            updatedItems[index] = {
                                                                                ...item,
                                                                                quantity: qty,
                                                                                total_price: qty * unitPrice,
                                                                            };
                                                                            setItems(updatedItems);
                                                                            // Clear batch validation error for this item when quantity changes
                                                                            if (batchValidationErrors[index]) {
                                                                                const newErrors = { ...batchValidationErrors };
                                                                                delete newErrors[index];
                                                                                setBatchValidationErrors(newErrors);
                                                                            }
                                                                        }}
                                                                        className="w-20"
                                                                    />
                                                                </TableCell>
                                                                <TableCell>
                                                                    <div
                                                                        className="cursor-pointer hover:bg-gray-50 p-2 rounded -ml-2"
                                                                        onClick={() => {
                                                                            setEditingItemIndex(index);
                                                                            setShowAdjustPriceModal(true);
                                                                        }}
                                                                    >
                                                                        <div className="text-blue-600 font-bold">
                                                                            {Number(item.unit_price).toLocaleString('vi-VN')}₫
                                                                        </div>
                                                                        {item.discount && item.discount > 0 && (
                                                                            <div className="text-xs text-red-500">
                                                                                -{Number(item.discount).toLocaleString('vi-VN')}{item.discount_type === 'percent' ? '%' : '₫'}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <span className="text-sm font-medium">
                                                                        {Number(item.total_price).toLocaleString('vi-VN')}₫
                                                                    </span>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={() => {
                                                                            const updatedItems = items.filter((_, i) => i !== index);
                                                                            setItems(updatedItems);
                                                                        }}
                                                                    >
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </Button>
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        )}

                                        <div className="flex items-center space-x-2 pt-2">
                                            <Checkbox
                                                id="import_stock"
                                                checked={importToStock}
                                                onCheckedChange={(checked) => {
                                                    const isChecked = checked as boolean;
                                                    setImportToStock(isChecked);

                                                    // Validate batch allocations khi tích checkbox
                                                    if (isChecked) {
                                                        for (const item of items) {
                                                            if (item.management_type === 'batch') {
                                                                if (!item.batch_allocations || item.batch_allocations.length === 0) {
                                                                    const productName = item.product_name || 'N/A';
                                                                    toast.error(`Sản phẩm '${productName}' có quản lý lô và hạn sử dụng, nhưng lô chưa được chọn. Vui lòng chọn đầy đủ lô trước khi nhập kho.`);
                                                                    setImportToStock(false); // Uncheck nếu có lỗi
                                                                    return;
                                                                }

                                                                const batchAllocs = Array.isArray(item.batch_allocations) ? item.batch_allocations : [];
                                                                const totalBatchQty = batchAllocs.reduce(
                                                                    (sum, alloc) => sum + (alloc.quantity || 0),
                                                                    0
                                                                );

                                                                if (totalBatchQty !== item.quantity) {
                                                                    const productName = item.product_name || 'N/A';
                                                                    toast.error(`Sản phẩm '${productName}' có số lượng lô (${totalBatchQty}) không khớp với số lượng nhập (${item.quantity}). Vui lòng kiểm tra lại!`);
                                                                    setImportToStock(false); // Uncheck nếu có lỗi
                                                                    return;
                                                                }
                                                            }
                                                        }
                                                    }
                                                }}
                                                className="cursor-pointer"
                                            />
                                            <label
                                                htmlFor="import_stock"
                                                className="text-sm font-normal leading-none cursor-pointer peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                                style={{ fontSize: '14px' }}
                                            >
                                                Nhập kho khi tạo đơn
                                            </label>
                                        </div>

                                        <AdjustPriceModal
                                            open={showAdjustPriceModal}
                                            onOpenChange={setShowAdjustPriceModal}
                                            initialPrice={editingItemIndex !== null ? items[editingItemIndex]?.unit_price : 0}
                                            initialDiscount={editingItemIndex !== null ? (items[editingItemIndex]?.discount || 0) : 0}
                                            initialDiscountType={editingItemIndex !== null ? (items[editingItemIndex]?.discount_type || 'amount') : 'amount'}
                                            onConfirm={handleUpdateItemPrice}
                                        />

                                        <DiscountModal
                                            open={showDiscountModal}
                                            onOpenChange={setShowDiscountModal}
                                            initialDiscount={discount}
                                            initialDiscountType={discountType}
                                            totalAmount={totalAmount}
                                            onConfirm={handleDiscountConfirm}
                                        />

                                        <ImportCostModal
                                            open={showImportCostModal}
                                            onOpenChange={setShowImportCostModal}
                                            initialCosts={importCosts}
                                            onConfirm={handleImportCostConfirm}
                                        />

                                        <BulkProductSelectModal
                                            open={showBulkProductModal}
                                            onOpenChange={setShowBulkProductModal}
                                            onSelectProducts={handleBulkProductSelect}
                                            catalogues={catalogues}
                                        />

                                        {/* Select Batch Modal */}
                                        {selectedItemForBatch !== null && items[selectedItemForBatch] && (
                                            <SelectBatchModal
                                                open={showSelectBatchModal}
                                                onOpenChange={(open) => {
                                                    setShowSelectBatchModal(open);
                                                    if (!open) {
                                                        setSelectedItemForBatch(null);
                                                    }
                                                }}
                                                productId={items[selectedItemForBatch].product_id!}
                                                productVariantId={items[selectedItemForBatch].product_variant_id || null}
                                                productQuantity={items[selectedItemForBatch].quantity}
                                                initialAllocations={items[selectedItemForBatch].batch_allocations || []}
                                                onConfirm={(allocations: BatchAllocation[]) => {
                                                    const updatedItems = [...items];
                                                    updatedItems[selectedItemForBatch] = {
                                                        ...updatedItems[selectedItemForBatch],
                                                        batch_allocations: allocations,
                                                    };
                                                    setItems(updatedItems);
                                                    // Clear batch validation error for this item when batch allocations are updated
                                                    if (selectedItemForBatch !== null && batchValidationErrors[selectedItemForBatch]) {
                                                        const newErrors = { ...batchValidationErrors };
                                                        delete newErrors[selectedItemForBatch];
                                                        setBatchValidationErrors(newErrors);
                                                    }
                                                    setShowSelectBatchModal(false);
                                                    setSelectedItemForBatch(null);
                                                }}
                                            />
                                        )}
                                    </div>
                                </CustomCard>

                                {/* Payment Section */}
                                <CustomCard title="Thanh toán">
                                    <div className="space-y-4">
                                        <div className="space-y-0 pb-4 border-b">
                                            <div className="flex justify-between items-center py-2">
                                                <span className="text-sm">Tổng tiền</span>
                                                <span className="text-sm text-right">
                                                    {totalAmount > 0 ? totalAmount.toLocaleString('vi-VN') + '₫' : '--- 0₫'}
                                                </span>
                                            </div>
                                            <div
                                                className={`flex justify-between items-center py-2 ${items.length > 0
                                                        ? 'cursor-pointer hover:bg-blue-50 text-blue-600'
                                                        : 'cursor-not-allowed opacity-50'
                                                    }`}
                                                onClick={() => {
                                                    if (items.length > 0) {
                                                        setShowDiscountModal(true);
                                                    }
                                                }}
                                            >
                                                <span className="text-sm font-medium">Thêm giảm giá (F6)</span>
                                                <span className="text-sm text-right">
                                                    {discountAmount > 0
                                                        ? `-${discountAmount.toLocaleString('vi-VN')}₫`
                                                        : '--- 0₫'
                                                    }
                                                </span>
                                            </div>
                                            <div
                                                className={`flex justify-between items-center py-2 ${items.length > 0
                                                        ? 'cursor-pointer hover:bg-blue-50 text-blue-600'
                                                        : 'cursor-not-allowed opacity-50'
                                                    }`}
                                                onClick={() => {
                                                    if (items.length > 0) {
                                                        setShowImportCostModal(true);
                                                    }
                                                }}
                                            >
                                                <span className="text-sm font-medium">Chi phí nhập hàng (F7)</span>
                                                <span className="text-sm text-right">
                                                    {totalImportCost > 0
                                                        ? totalImportCost.toLocaleString('vi-VN') + '₫'
                                                        : '--- 0₫'
                                                    }
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center py-2">
                                                <span className="text-sm font-semibold">Tiền cần trả NCC</span>
                                                <span className="text-sm text-right font-semibold text-blue-600">
                                                    {amountToPay > 0 ? amountToPay.toLocaleString('vi-VN') + '₫' : '--- 0₫'}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <RadioGroup
                                                defaultValue="unpaid"
                                                value={paymentStatus}
                                                onValueChange={(val) => setPaymentStatus(val as 'paid' | 'unpaid')}
                                                className="flex gap-4"
                                            >
                                                <div className="flex items-center space-x-2">
                                                    <RadioGroupItem value="paid" id="paid" />
                                                    <Label htmlFor="paid" className="font-medium cursor-pointer">Đã thanh toán</Label>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <RadioGroupItem value="unpaid" id="unpaid" />
                                                    <Label htmlFor="unpaid" className="font-medium cursor-pointer">Thanh toán sau</Label>
                                                </div>
                                            </RadioGroup>

                                            {paymentStatus === 'paid' && (
                                                <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-2 pt-2">
                                                    <div className="col-span-1 space-y-1">
                                                        <Label className="text-xs">Hình thức thanh toán</Label>
                                                        <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                                                            <SelectTrigger className="w-full">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="cash">Tiền mặt</SelectItem>
                                                                <SelectItem value="bank_transfer">Chuyển khoản</SelectItem>
                                                                <SelectItem value="card">Thanh toán thẻ</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>

                                                    <div className="col-span-1 space-y-1">
                                                        <Label className="text-xs">Số tiền thanh toán</Label>
                                                        <div className="relative">
                                                            <PriceInput
                                                                value={paymentAmount}
                                                                onValueChange={(val) => setPaymentAmount(val || 0)}
                                                                className="w-full pl-3 pr-8"
                                                            />
                                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">đ</span>
                                                        </div>
                                                    </div>

                                                    <div className="col-span-1 space-y-1">
                                                        <Label className="text-xs">Ngày ghi nhận</Label>
                                                        <Popover>
                                                            <PopoverTrigger asChild>
                                                                <Button
                                                                    variant="outline"
                                                                    className="w-full justify-start text-left font-normal text-[13px] px-3"
                                                                >
                                                                    <CalendarIcon className="mr-2 h-3 w-3" />
                                                                    {paymentDate ? format(paymentDate, 'dd/MM/yyyy') : "Chọn ngày"}
                                                                </Button>
                                                            </PopoverTrigger>
                                                            <PopoverContent className="w-auto p-0">
                                                                <Calendar
                                                                    mode="single"
                                                                    selected={paymentDate}
                                                                    onSelect={(date) => date && setPaymentDate(date)}
                                                                />
                                                            </PopoverContent>
                                                        </Popover>
                                                    </div>

                                                    <div className="col-span-1 space-y-1">
                                                        <Label className="text-xs">Tham chiếu</Label>
                                                        <Input
                                                            placeholder="Mã GD..."
                                                            value={paymentReference}
                                                            onChange={(e) => setPaymentReference(e.target.value)}
                                                            className="w-full"
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex gap-2 pt-4 border-t mt-4">
                                            <Form
                                                action={getActionUrl()}
                                                method="post"
                                                options={{
                                                    preserveScroll: true,
                                                    preserveState: setPreserveState,
                                                }}
                                                onBefore={() => {
                                                    // Reset tất cả lỗi trước khi validate
                                                    setSupplierError('')
                                                    setItemsError('')
                                                    setBatchValidationErrors({})

                                                    let hasError = false

                                                    // Validate nhà cung cấp
                                                    if (!supplierId) {
                                                        setSupplierError('Nhà cung cấp không được để trống');
                                                        hasError = true;
                                                    }

                                                    // Validate phải có ít nhất 1 sản phẩm
                                                    if (items.length === 0) {
                                                        setItemsError('Vui lòng thêm ít nhất 1 sản phẩm vào đơn nhập hàng!');
                                                        hasError = true;
                                                    }

                                                    // Validate batch allocations nếu import_to_stock = true
                                                    if (importToStock) {
                                                        const errors: Record<number, string> = {}
                                                        for (let index = 0; index < items.length; index++) {
                                                            const item = items[index];
                                                            if (item.management_type === 'batch') {
                                                                const batchAllocs = Array.isArray(item.batch_allocations) ? item.batch_allocations : [];
                                                                const totalBatchQty = batchAllocs.reduce(
                                                                    (sum, alloc) => sum + (alloc.quantity || 0),
                                                                    0
                                                                );

                                                                if (batchAllocs.length === 0) {
                                                                    errors[index] = 'Bạn chưa chọn lô nhập';
                                                                    hasError = true;
                                                                } else if (totalBatchQty !== item.quantity) {
                                                                    errors[index] = 'Số lượng nhập không khớp với số lượng phân bố lô đã chọn';
                                                                    hasError = true;
                                                                }
                                                            }
                                                        }
                                                        if (Object.keys(errors).length > 0) {
                                                            setBatchValidationErrors(errors);
                                                        }
                                                    }

                                                    if (hasError) {
                                                        return false;
                                                    }

                                                    return true;
                                                }}
                                                transform={(data) => ({
                                                    ...data,
                                                    code: code || data.code,
                                                    supplier_id: supplierId || null,
                                                    warehouse_id: warehouseId || null,
                                                    responsible_user_id: responsibleUserId || null,
                                                    expected_import_date: expectedImportDate ? format(expectedImportDate, 'yyyy-MM-dd') : null,
                                                    total_amount: totalAmount,
                                                    discount: discount,
                                                    discount_type: discountType,
                                                    import_cost: totalImportCost,
                                                    import_costs: importCosts,
                                                    amount_to_pay: amountToPay,
                                                    items: items.map(item => ({
                                                        product_id: item.product_id,
                                                        product_variant_id: item.product_variant_id,
                                                        quantity: item.quantity,
                                                        unit_price: item.unit_price,
                                                        discount: item.discount || 0,
                                                        discount_type: item.discount_type || 'amount',
                                                        total_price: item.total_price,
                                                        notes: item.notes,
                                                        batch_allocations: item.batch_allocations || null,
                                                    })),
                                                    ...(isEdit ? { _method: 'put' } : {}),
                                                    save_and_redirect: buttonAction.current,
                                                    import_to_stock: importToStock,
                                                    payment_status: paymentStatus,
                                                    payment_method: paymentMethod,
                                                    payment_amount: paymentAmount,
                                                    payment_date: format(paymentDate, 'yyyy-MM-dd'),
                                                    payment_reference: paymentReference,
                                                })}
                                                className="flex-1"
                                            >
                                                {({ processing }) => (
                                                    <Button
                                                        type="submit"
                                                        disabled={processing}
                                                        onClick={() => buttonAction.current = 'save_and_redirect'}
                                                        className="w-full bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        {processing ? (
                                                            <>
                                                                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                                                                Đang lưu...
                                                            </>
                                                        ) : (
                                                            isEdit ? 'Cập nhật đơn nhập hàng' : 'Tạo đơn nhập hàng'
                                                        )}
                                                    </Button>
                                                )}
                                            </Form>
                                            <Link href="/backend/import-order" className="flex-1">
                                                <Button variant="outline" className="w-full">Hủy</Button>
                                            </Link>
                                        </div>
                                    </div>
                                </CustomCard>
                            </div>

                            {/* Right Column - Supplier, Warehouse, Info */}
                            <div className="space-y-6">
                                {/* Supplier Section */}
                                <CustomCard title="Nhà cung cấp">
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label className="font-bold mb-2 block">Nhà cung cấp</Label>
                                            <div className={supplierError ? 'border border-red-500 rounded-md' : ''}>
                                                <Combobox
                                                    options={supplierOptions}
                                                    value={supplierId}
                                                    onValueChange={(value) => {
                                                        setSupplierId(value);
                                                        if (value) {
                                                            setSupplierError(''); // Clear error when supplier is selected
                                                        }
                                                    }}
                                                    placeholder="Tìm theo tên, SĐT, mã NCC...(F4)"
                                                    searchPlaceholder="Tìm nhà cung cấp..."
                                                    className="w-full"
                                                />
                                            </div>
                                            {supplierError && (
                                                <InputError message={supplierError} className="text-[13px]" />
                                            )}
                                        </div>
                                    </div>
                                </CustomCard>

                                {/* Warehouse Section */}
                                <CustomCard title="Chi nhánh nhập">
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label className="font-bold mb-2 block">Chọn chi nhánh nhập</Label>
                                            <Select value={warehouseId || undefined} onValueChange={setWarehouseId}>
                                                <SelectTrigger className="w-full">
                                                    <SelectValue placeholder="Chọn chi nhánh nhập" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {warehouseOptions.filter(option => option.value !== '').map(option => (
                                                        <SelectItem key={option.value} value={option.value}>
                                                            {option.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </CustomCard>

                                {/* Additional Info Section */}
                                <CustomCard title="Thông tin bổ sung">
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label className="font-bold mb-2 block">Nhân viên phụ trách</Label>
                                            <Combobox
                                                options={userOptions}
                                                value={responsibleUserId}
                                                onValueChange={setResponsibleUserId}
                                                placeholder="Chọn nhân viên phụ trách"
                                                searchPlaceholder="Tìm nhân viên..."
                                                className="w-full"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="font-bold mb-2 block">Ngày nhập dự kiến</Label>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Button
                                                        variant="outline"
                                                        className="w-full justify-start text-left font-normal text-[14px]"
                                                    >
                                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                                        {expectedImportDate ? format(expectedImportDate, 'dd/MM/yyyy') : "Chọn ngày nhập dự kiến"}
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0">
                                                    <Calendar
                                                        mode="single"
                                                        selected={expectedImportDate}
                                                        onSelect={setExpectedImportDate}
                                                        captionLayout="dropdown"
                                                    />
                                                </PopoverContent>
                                            </Popover>
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="font-bold mb-2 block">Mã đơn nhập</Label>
                                            <div className="flex gap-2">
                                                <Input
                                                    name="code"
                                                    value={code}
                                                    onChange={(e) => {
                                                        const upperValue = e.target.value.toUpperCase();
                                                        setCode(upperValue);
                                                    }}
                                                    placeholder="Nhập mã đơn"
                                                    className="uppercase"
                                                />
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={generateRandomCode}
                                                    className="shrink-0"
                                                    title="Tạo mã đơn nhập ngẫu nhiên"
                                                >
                                                    <Shuffle className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="font-bold mb-2 block">Tham chiếu</Label>
                                            <Input
                                                name="reference"
                                                defaultValue={record?.reference || ''}
                                                placeholder="Nhập mã tham chiếu"
                                            />
                                        </div>
                                    </div>
                                </CustomCard>

                                {/* Notes Section */}
                                <CustomCard title="Ghi chú">
                                    <Textarea
                                        name="notes"
                                        defaultValue={record?.notes || ''}
                                        placeholder="VD: Chỉ nhận hàng trong giờ hành chính"
                                        className="min-h-[100px]"
                                    />
                                </CustomCard>

                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
