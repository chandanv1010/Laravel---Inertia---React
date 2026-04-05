<?php
namespace App\Http\Controllers\Frontend\Checkout;
use App\Http\Controllers\Controller;
use App\Services\Interfaces\Checkout\CheckoutServiceInterface;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use App\Http\Requests\Frontend\Checkout\StoreCheckoutRequest;
use Illuminate\Support\Facades\Log;

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

        return Inertia::render('frontend/checkout/success', [
            'order' => $order
        ]);
    }
}
