<?php
namespace App\Http\Controllers\Frontend\Checkout;
use App\Http\Controllers\Controller;
use App\Services\Interfaces\Checkout\CheckoutServiceInterface;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use App\Http\Requests\Frontend\Checkout\StoreCheckoutRequest;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;
use App\Models\System;

class CheckoutController extends Controller
{
    protected CheckoutServiceInterface $checkoutService;

    public function __construct(CheckoutServiceInterface $checkoutService)
    {
        $this->checkoutService = $checkoutService;
    }

    /**
     * Display the checkout page.
     * 
     * @return Response
     */
    public function index(): Response
    {
        $data = $this->checkoutService->getCheckoutData();
        
        return Inertia::render('frontend/checkout/index', [
            'cart' => $data['cart'],
            'customer' => $data['customer'],
            'paymentMethods' => $data['paymentMethods'],
        ]);
    }

    public function process(StoreCheckoutRequest $request)
    {

        try {
            $result = $this->checkoutService->processOrder($request);
            
            if ($result['status'] === 'success') {
                $orderCode = $result['order_code'];
                
                // Branching logic based on result
                if ($result['redirect_to'] === 'payment') {
                    return redirect()->route('checkout.payment', $orderCode);
                }
                
                return redirect()->route('checkout.success', $orderCode);
            }
            
            return back()->with('error', $result['message']);
        } catch (\Exception $e) {
            Log::error('[CHECKOUT FAILURE] ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
                'file' => $e->getFile(),
                'line' => $e->getLine()
            ]);
            return back()->with('error', $e->getMessage());
        }
    }

    /**
     * Show payment instruction for Transfer
     * 
     * @param string $orderCode
     * @return Response
     */
    public function payment(string $orderCode): Response
    {
        $order = $this->checkoutService->getOrderByCode($orderCode);
        if (!$order) {
            abort(404);
        }

        return Inertia::render('frontend/checkout/payment', [
            'order' => $order
        ]);
    }

    /**
     * Show order success page
     * 
     * @param string $orderCode
     * @return Response
     */
    public function success(string $orderCode): Response
    {
        $order = $this->checkoutService->getOrderByCode($orderCode);
        if (!$order) {
            abort(404);
        }

        // Security check: Only the owner of the order can see this page
        if ($order->customer_id !== Auth::guard('customer')->id()) {
            abort(403, 'Bạn không có quyền truy cập trang này.');
        }

        // Get system thanks message or fallback
        $thanksSetting = System::where('keyword', 'order_thanks_msg')->first();
        $thanksMessage = $thanksSetting ? $thanksSetting->content : "Cảm ơn bạn đã mua sản phẩm tại hệ thống website của chúng tôi. Một Email xác nhận đã được gửi đến " . (Auth::guard('customer')->user()->email ?? '[email người dùng đăng ký tài khoản]') . ". Hãy kiểm tra lại thông tin email của bạn. Xin cảm ơn.";

        return Inertia::render('frontend/checkout/success', [
            'order' => $this->prepareOrderForSuccess($order),
            'thanksMessage' => $thanksMessage
        ]);
    }

    /**
     * Prepare order data for the success page (Grouping items, etc.)
     * 
     * @param mixed $order
     * @return mixed
     */
    protected function prepareOrderForSuccess($order)
    {
        // 1. Group items by combo_group_id if they belong to a combo
        $items = $order->orderItems;
        $groupedItems = [];
        $combos = [];
        $itemsSubtotal = 0;

        foreach ($items as $item) {
            // Map image for standard UI consumption
            $item->setAttribute('image', $item->variant->image ?? $item->product->image ?? null);

            if ($item->combo_group_id) {
                if (!isset($combos[$item->combo_group_id])) {
                    $combos[$item->combo_group_id] = [
                        'row_id' => 'combo_' . $item->combo_group_id,
                        'name' => 'Combo sản phẩm',
                        'image' => $item->image, // Use the mapped image
                        'total' => 0,
                        'quantity' => 1,
                        'is_combo_group' => true,
                        'child_items' => [],
                        'promotions_snapshot' => []
                    ];
                }
                $combos[$item->combo_group_id]['child_items'][] = $item;
                $combos[$item->combo_group_id]['total'] += (float)$item->total;
                
                if ($item->type === 'combo') {
                    $combos[$item->combo_group_id]['name'] = $item->product_name;
                }
            } else {
                $groupedItems[] = $item;
                $itemsSubtotal += $item->total;
            }
        }

        // Add combos to the final list and add their totals to itemsSubtotal
        foreach ($combos as $combo) {
            $groupedItems[] = $combo;
            $itemsSubtotal += $combo['total'];
        }

        // Logic fix for calculation transparency:
        // items_subtotal = Sum of rows (already has product-level discounts)
        // additional_discount = Voucher + Order-level discounts
        $snap = $order->summary_snapshot ?? [];
        $additionalDiscount = (float)($snap['order_discount'] ?? 0) + (float)($snap['voucher_discount'] ?? 0);

        $order->setAttribute('display_items', $groupedItems);
        $order->setAttribute('items_subtotal', $itemsSubtotal);
        $order->setAttribute('additional_discount', $additionalDiscount);
        
        // Force the total_amount to be logical: Subtotal + Shipping - Extra Discount
        // This ensures the math (Tạm tính + Phí ship - Chiết khấu = Tổng cộng) is always correct visually.
        $order->total_amount = max(0, $itemsSubtotal + (float)$order->shipping_fee - $additionalDiscount);

        return $order;
    }
}
