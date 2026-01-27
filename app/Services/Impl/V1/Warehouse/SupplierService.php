<?php

namespace App\Services\Impl\V1\Warehouse;

use App\Services\Impl\V1\Cache\BaseCacheService;
use App\Services\Interfaces\Warehouse\SupplierServiceInterface;
use App\Repositories\Warehouse\SupplierRepo;
use App\Helpers\DropdownHelper;
use Illuminate\Support\Facades\Auth;
use Illuminate\Http\Request;

class SupplierService extends BaseCacheService implements SupplierServiceInterface {

    // Cache strategy: 'default' phù hợp cho suppliers vì ít thay đổi
    protected string $cacheStrategy = 'default';
    protected string $module = 'suppliers';

    protected $repository;

    protected $with = ['creators', 'responsibleUser'];
    protected $simpleFilter = ['publish', 'user_id', 'responsible_user_id'];
    protected $searchFields = ['name', 'code', 'email', 'phone', 'address'];
    protected $sort = ['id', 'desc'];

    public function __construct(
        SupplierRepo $repository
    )
    {
        $this->repository = $repository;
        parent::__construct($repository);
    }

    protected function prepareModelData(): static {
        $fillable = $this->repository->getFillable();
        $this->modelData = $this->request->only($fillable);
        $this->modelData['user_id'] = Auth::id();
        if(isset($this->modelData['code'])){
             $this->modelData['code'] = strtoupper($this->modelData['code']);
        }
        return $this;
    }

    public function getDropdown()
    {
        $request = new Request([
            'type' => 'all',
            'publish' => '2',
            'sort' => 'name,asc'
        ]);
        $records = $this->paginate($request);
        return DropdownHelper::transform($records, [
            'valueKey' => 'id',
            'labelKey' => 'name',
            'isMultipleLanguage' => false,
        ]);
    }

    /**
     * Get supplier info with debt calculation and import history
     */
    public function getSupplierInfo(int $supplierId, Request $request): array
    {
        $supplier = $this->repository->getModel()->findOrFail($supplierId);
        
        // Date filtering
        $dateFrom = $request->get('date_from');
        $dateTo = $request->get('date_to');
        
        // Default to current month if not specified
        if (!$dateFrom) {
            $dateFrom = now()->startOfMonth()->format('Y-m-d');
        }
        if (!$dateTo) {
            $dateTo = now()->endOfMonth()->format('Y-m-d');
        }
        
        // Base query with date filter
        $importOrdersQuery = \App\Models\ImportOrder::where('supplier_id', $supplierId)
            ->whereDate('created_at', '>=', $dateFrom)
            ->whereDate('created_at', '<=', $dateTo);
        
        // Stats calculation
        $allImportOrders = (clone $importOrdersQuery)->get();
        $completedImportOrders = (clone $importOrdersQuery)->where('status', 'completed')->get();
        
        // Import orders stats
        $importOrderCount = $allImportOrders->count();
        $importOrderTotalRaw = $allImportOrders->sum('total_amount'); // Tổng giá trị đơn (trước giảm giá)
        
        // Tính tổng giảm giá thực tế (xét cả discount_type: percent hoặc amount)
        $importOrderDiscount = $allImportOrders->sum(function($order) {
            $discount = floatval($order->discount ?? 0);
            if ($discount <= 0) return 0;
            
            $discountType = $order->discount_type ?? 'amount';
            if ($discountType === 'percent') {
                // Nếu là phần trăm, tính số tiền thực tế
                return $order->total_amount * $discount / 100;
            }
            // Nếu là số tiền trực tiếp
            return $discount;
        });
        
        $importOrderCost = $allImportOrders->sum('import_cost'); // Chi phí nhập hàng
        $importOrderTotal = $allImportOrders->sum('amount_to_pay'); // Số tiền thực tế cần trả
        
        // Unpaid import orders (completed but not fully paid)
        $unpaidImportOrders = $completedImportOrders->filter(function($order) {
            $paid = $order->payment_amount ?? 0;
            return $paid < $order->amount_to_pay;
        });
        $unpaidImportCount = $unpaidImportOrders->count();
        $unpaidImportTotalToPay = $unpaidImportOrders->sum('amount_to_pay'); // Tổng cần thanh toán
        $unpaidImportPaid = $unpaidImportOrders->sum('payment_amount'); // Đã thanh toán
        $unpaidImportTotal = $unpaidImportTotalToPay - $unpaidImportPaid; // Còn lại
        
        // Return orders stats (if exists)
        $returnOrdersQuery = \App\Models\ReturnImportOrder::where('supplier_id', $supplierId)
            ->whereDate('created_at', '>=', $dateFrom)
            ->whereDate('created_at', '<=', $dateTo);
        
        $returnOrders = $returnOrdersQuery->get();
        $returnOrderCount = $returnOrders->count();
        $returnOrderTotalRaw = $returnOrders->sum('total_amount'); // Tổng giá trị hàng trả
        $returnOrderDiscount = $returnOrders->sum('discount'); // Giảm giá
        $returnOrderDeduction = $returnOrders->sum('deduction'); // Giảm trừ
        $returnOrderTotal = $returnOrders->sum('refund_amount'); // Số tiền NCC cần hoàn
        
        // Unpaid return orders = đơn trả chưa nhận hoàn tiền
        // refund_status = 'later' hoặc null = chưa nhận hoàn
        // refund_status = 'received' = đã nhận hoàn đủ
        $unpaidReturnOrders = $returnOrders->filter(function($order) {
            $refundStatus = $order->refund_status;
            $refundAmount = floatval($order->refund_amount ?? 0);
            // Chỉ lấy đơn có tiền hoàn > 0 và chưa nhận hoàn
            return $refundAmount > 0 && !in_array($refundStatus, ['received', 'refunded']);
        });
        $unpaidReturnCount = $unpaidReturnOrders->count();
        $unpaidReturnTotalRaw = $unpaidReturnOrders->sum('total_amount'); // Tổng giá trị hàng
        $unpaidReturnDiscount = $unpaidReturnOrders->sum('discount'); // Giảm giá
        $unpaidReturnDeduction = $unpaidReturnOrders->sum('deduction'); // Giảm trừ
        $unpaidReturnTotal = $unpaidReturnOrders->sum('refund_amount'); // Tổng tiền chờ hoàn
        
        // Total debt calculation (all time, not filtered by date)
        $allCompletedOrders = \App\Models\ImportOrder::where('supplier_id', $supplierId)
            ->where('status', 'completed')
            ->get();
        
        $totalDebt = $allCompletedOrders->sum('amount_to_pay');
        $totalPaid = $allCompletedOrders->sum(function($order) {
            return $order->payment_amount ?? 0;
        });
        $currentDebt = $totalDebt - $totalPaid;
        
        // Lấy lịch sử nhập hàng + trả hàng (combined and sorted)
        $perPage = $request->get('perpage', 10);
        $page = $request->get('page', 1);
        
        // Get import orders
        $importOrders = \App\Models\ImportOrder::where('supplier_id', $supplierId)
            ->whereDate('created_at', '>=', $dateFrom)
            ->whereDate('created_at', '<=', $dateTo)
            ->with(['history' => function($query) {
                $query->where('action', 'payment')->orderBy('created_at', 'asc');
            }])
            ->get()
            ->map(function($order) {
                // Lấy chi tiết các lần thanh toán từ history
                $paymentDetails = $order->history->map(function($h) {
                    $data = is_array($h->data) ? $h->data : json_decode($h->data, true);
                    return [
                        'date' => $h->created_at->format('d/m/Y H:i'),
                        'amount' => $data['amount'] ?? 0,
                        'note' => $data['note'] ?? '',
                    ];
                })->values()->toArray();
                
                return [
                    'id' => $order->id,
                    'code' => $order->code,
                    'created_at' => $order->created_at->format('Y-m-d H:i:s'),
                    'total_amount' => $order->total_amount,
                    'amount_to_pay' => $order->amount_to_pay,
                    'payment_amount' => $order->payment_amount ?? 0,
                    'payment_status' => $order->payment_status,
                    'status' => $order->status,
                    'type' => 'import',
                    'payment_details' => $paymentDetails, // Chi tiết các lần thanh toán
                ];
            });
        
        // Get return orders
        $returnOrdersHistory = \App\Models\ReturnImportOrder::where('supplier_id', $supplierId)
            ->whereDate('created_at', '>=', $dateFrom)
            ->whereDate('created_at', '<=', $dateTo)
            ->get()
            ->map(function($order) {
                return [
                    'id' => $order->id,
                    'code' => $order->code,
                    'created_at' => $order->created_at->format('Y-m-d H:i:s'),
                    'total_amount' => $order->total_amount,
                    'amount_to_pay' => $order->total_amount,
                    'payment_amount' => $order->refund_amount ?? 0,
                    'payment_status' => $order->refund_status ?? 'pending',
                    'status' => $order->status ?? 'completed',
                    'type' => 'return',
                ];
            });
        
        // Combine and sort by created_at descending
        $combinedHistory = $importOrders->concat($returnOrdersHistory)
            ->sortByDesc('created_at')
            ->values();
        
        // Manual pagination
        $total = $combinedHistory->count();
        $lastPage = (int) ceil($total / $perPage);
        $offset = ($page - 1) * $perPage;
        $items = $combinedHistory->slice($offset, $perPage)->values();
        
        // Build pagination links
        $links = [];
        $links[] = ['url' => $page > 1 ? url()->current() . '?page=' . ($page - 1) : null, 'label' => '&laquo; Previous', 'active' => false];
        for ($i = 1; $i <= $lastPage; $i++) {
            $links[] = ['url' => url()->current() . '?page=' . $i, 'label' => (string)$i, 'active' => $i == $page];
        }
        $links[] = ['url' => $page < $lastPage ? url()->current() . '?page=' . ($page + 1) : null, 'label' => 'Next &raquo;', 'active' => false];
        
        $importHistory = [
            'data' => $items->all(),
            'current_page' => (int)$page,
            'last_page' => $lastPage,
            'per_page' => $perPage,
            'total' => $total,
            'links' => $links,
        ];
        
        // Get unpaid import orders for debt management
        $unpaidImportOrders = \App\Models\ImportOrder::where('supplier_id', $supplierId)
            ->where('status', 'completed')
            ->whereRaw('(payment_amount IS NULL OR payment_amount < amount_to_pay)')
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function($order) {
                return [
                    'id' => $order->id,
                    'code' => $order->code,
                    'created_at' => $order->created_at,
                    'amount_to_pay' => $order->amount_to_pay,
                    'payment_amount' => $order->payment_amount ?? 0,
                    'remaining_debt' => $order->amount_to_pay - ($order->payment_amount ?? 0),
                    'type' => 'import',
                ];
            });
        
        // Get unpaid return orders (not yet fully refunded)
        // refund_amount = số tiền NCC cần hoàn cho mình
        // received_refund_amount = số tiền đã nhận hoàn (nếu có field này)
        $unpaidReturnOrdersList = \App\Models\ReturnImportOrder::where('supplier_id', $supplierId)
            ->where('refund_amount', '>', 0) // Chỉ lấy đơn có tiền cần hoàn
            ->where(function($query) {
                $query->whereNull('refund_status')
                      ->orWhere('refund_status', 'later')
                      ->orWhere('refund_status', 'partial');
            })
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function($order) {
                // refund_amount = số tiền cần hoàn từ NCC
                $refundNeeded = floatval($order->refund_amount ?? 0);
                // received_refund_amount = số tiền đã nhận hoàn (nếu chưa có field, mặc định = 0)
                $receivedAmount = floatval($order->received_refund_amount ?? 0);
                // remaining = số tiền còn chờ hoàn
                $remainingRefund = $refundNeeded - $receivedAmount;
                
                return [
                    'id' => $order->id,
                    'code' => $order->code,
                    'created_at' => $order->created_at,
                    'amount_to_pay' => $refundNeeded, // Tổng tiền cần hoàn
                    'payment_amount' => $receivedAmount, // Đã nhận hoàn
                    'remaining_debt' => $remainingRefund, // Chờ hoàn
                    'type' => 'return',
                ];
            })
            ->filter(function($order) {
                return $order['remaining_debt'] > 0; // Chỉ giữ đơn còn chờ hoàn
            })
            ->values();
        
        // Combine both lists
        $unpaidOrdersList = $unpaidImportOrders->concat($unpaidReturnOrdersList)->values();
        
        // Get users for responsible user dropdown
        $users = \App\Models\User::select('id', 'name')->get();
        
        // Payment history - Import orders that have been paid (partially or fully)
        $paymentHistory = \App\Models\ImportOrder::where('supplier_id', $supplierId)
            ->where('status', 'completed')
            ->where('payment_amount', '>', 0)
            ->with(['history' => function($query) {
                $query->where('action', 'payment')->orderBy('created_at', 'asc');
            }])
            ->orderBy('updated_at', 'desc')
            ->get()
            ->map(function($order) {
                // Lấy chi tiết các lần thanh toán từ history
                $paymentDetails = $order->history->map(function($h) {
                    $data = is_array($h->data) ? $h->data : json_decode($h->data, true);
                    return [
                        'date' => $h->created_at->format('d/m/Y H:i'),
                        'amount' => $data['amount'] ?? 0,
                        'note' => $data['note'] ?? '',
                    ];
                })->values()->toArray();
                
                return [
                    'id' => $order->id,
                    'order_id' => $order->id,
                    'order_code' => $order->code,
                    'amount' => $order->payment_amount,
                    'total_amount' => $order->amount_to_pay,
                    'payment_date' => $order->updated_at->format('Y-m-d H:i:s'),
                    'note' => $order->payment_note ?? '',
                    'type' => 'payment',
                    'payment_details' => $paymentDetails, // Chi tiết các lần thanh toán
                ];
            });
        
        // Refund history - Return orders that have been refunded (only those with refund_status = 'received')
        $refundHistory = \App\Models\ReturnImportOrder::where('supplier_id', $supplierId)
            ->where('refund_amount', '>', 0)
            ->where('refund_status', 'received') // Chỉ lấy đơn đã thực sự nhận hoàn tiền
            ->orderBy('updated_at', 'desc')
            ->get()
            ->map(function($order) {
                return [
                    'id' => $order->id,
                    'order_id' => $order->id,
                    'order_code' => $order->code,
                    'amount' => $order->refund_amount, // Số tiền thực nhận hoàn
                    'total_amount' => $order->total_amount, // Tổng giá trị hàng trả
                    'original_amount' => $order->total_amount, // Số tiền gốc trước khi trừ
                    'discount' => $order->discount ?? 0, // Giảm giá
                    'deduction' => $order->deduction ?? 0, // Giảm trừ
                    'deduction_reason' => $order->deduction_reason ?? '',
                    'return_cost' => $order->return_cost ?? 0, // Chi phí trả hàng
                    'payment_date' => $order->updated_at->format('Y-m-d H:i:s'),
                    'note' => $order->refund_note ?? '',
                    'type' => 'refund',
                ];
            });
        
        return [
            'supplier' => $supplier,
            'totalDebt' => $totalDebt,
            'totalPaid' => $totalPaid,
            'currentDebt' => $currentDebt,
            'importHistory' => $importHistory,
            'stats' => [
                'importOrderCount' => $importOrderCount,
                'importOrderTotalRaw' => $importOrderTotalRaw, // Tổng giá trị đơn
                'importOrderDiscount' => $importOrderDiscount, // Giảm giá/khuyến mãi  
                'importOrderCost' => $importOrderCost, // Chi phí nhập hàng
                'importOrderTotal' => $importOrderTotal, // Thực tế cần trả
                'unpaidImportCount' => $unpaidImportCount,
                'unpaidImportTotalToPay' => $unpaidImportTotalToPay, // Tổng cần trả
                'unpaidImportPaid' => $unpaidImportPaid, // Đã trả
                'unpaidImportTotal' => $unpaidImportTotal, // Còn lại
                'returnOrderCount' => $returnOrderCount,
                'returnOrderTotalRaw' => $returnOrderTotalRaw, // Tổng giá trị hàng trả
                'returnOrderDiscount' => $returnOrderDiscount, // Giảm giá
                'returnOrderDeduction' => $returnOrderDeduction, // Giảm trừ
                'returnOrderTotal' => $returnOrderTotal, // Thực tế cần hoàn
                'unpaidReturnCount' => $unpaidReturnCount,
                'unpaidReturnTotalRaw' => $unpaidReturnTotalRaw, // Tổng giá trị hàng
                'unpaidReturnDiscount' => $unpaidReturnDiscount, // Giảm giá
                'unpaidReturnDeduction' => $unpaidReturnDeduction, // Giảm trừ
                'unpaidReturnTotal' => $unpaidReturnTotal, // Thực tế chờ hoàn
            ],
            'unpaidOrders' => $unpaidOrdersList,
            'paymentHistory' => $paymentHistory,
            'refundHistory' => $refundHistory,
            'users' => $users,
            'dateFrom' => $dateFrom,
            'dateTo' => $dateTo,
        ];
    }
}
