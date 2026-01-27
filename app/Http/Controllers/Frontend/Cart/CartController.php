<?php

namespace App\Http\Controllers\Frontend\Cart;

use App\Http\Controllers\Controller;
use App\Services\Interfaces\Cart\CartServiceInterface;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class CartController extends Controller
{
    protected \App\Services\Interfaces\Product\ProductServiceInterface $productService;

    public function __construct(CartServiceInterface $cartService, \App\Services\Interfaces\Product\ProductServiceInterface $productService)
    {
        $this->cartService = $cartService;
        $this->productService = $productService;
    }

    public function view()
    {
        $promoProducts = $this->productService->getPromotionalProducts(5);
        return \Inertia\Inertia::render('frontend/cart/index', [
            'promoProducts' => $promoProducts
        ]);
    }

    public function index(): JsonResponse
    {
        $cart = $this->cartService->get();
        return response()->json([
            'status' => 'success',
            'data' => $cart
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'product_id' => 'required|integer|exists:products,id',
            'variant_id' => 'nullable|integer|exists:product_variants,id',
            'quantity' => 'required|integer|min:1'
        ]);

        try {
            $cart = $this->cartService->add(
                $request->input('product_id'),
                $request->input('variant_id'),
                $request->input('quantity')
            );

            return response()->json([
                'status' => 'success',
                'message' => 'Thêm vào giỏ hàng thành công',
                'data' => $cart
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage()
            ], 400);
        }
    }

    public function update(Request $request): JsonResponse
    {
        $request->validate([
            'row_id' => 'required|string',
            'quantity' => 'required|integer|min:0'
        ]);

        $cart = $this->cartService->update(
            $request->input('row_id'),
            $request->input('quantity')
        );

        return response()->json([
            'status' => 'success',
            'data' => $cart
        ]);
    }

    public function destroy(Request $request): JsonResponse
    {
        $request->validate([
            'row_id' => 'required|string',
        ]);

        $cart = $this->cartService->remove($request->input('row_id'));

        return response()->json([
            'status' => 'success',
            'data' => $cart
        ]);
    }

    public function clear(): JsonResponse
    {
        $this->cartService->clear();
        return response()->json([
            'status' => 'success',
            'message' => 'Đã xóa toàn bộ giỏ hàng'
        ]);
    }

    public function vouchers(Request $request): JsonResponse
    {
        $cart = $this->cartService->get();
        // Assuming we can access VoucherService directly or inject it.
        // Better to add getAvailableVouchers to CartServiceInterface or inject VoucherService here.
        // For quick implementation, I'll inject VoucherService in method or constructor.
        // Let's use the container or modify constructor. 
        // Modifying constructor is safer.
        
        $voucherService = app(\App\Services\Impl\V1\Voucher\VoucherService::class);
        $vouchers = $voucherService->getVouchersForCart($cart['items'], $cart['total_price']);

        return response()->json([
            'status' => 'success',
            'data' => $vouchers
        ]);
    }

    public function applyVoucher(Request $request): JsonResponse
    {
        $request->validate([
            'code' => 'required|string',
        ]);

        try {
            $cart = $this->cartService->applyVoucher($request->input('code'));
            return response()->json([
                'status' => 'success',
                'message' => 'Áp dụng mã giảm giá thành công',
                'data' => $cart
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage()
            ], 400);
        }
    }
}
