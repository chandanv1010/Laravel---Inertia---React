<?php

namespace App\Http\Controllers\Frontend\Auth\Customer;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Services\Interfaces\Customer\CustomerServiceInterface;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules;
use Inertia\Inertia;
use Inertia\Response;
use App\Services\Interfaces\Cart\CartServiceInterface;

class RegisterController extends Controller
{
    protected $customerService;
    protected $cartService;

    public function __construct(
        CustomerServiceInterface $customerService,
        CartServiceInterface $cartService
    ) {
        $this->customerService = $customerService;
        $this->cartService = $cartService;
    }

    /**
     * Show the customer registration page.
     */
    public function show(): Response
    {
        return Inertia::render('frontend/auth/register');
    }

    /**
     * Handle an incoming registration request for customers.
     *
     * @throws \Illuminate\Validation\ValidationException
     */
    public function register(Request $request): RedirectResponse
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|lowercase|email|max:255|unique:'.Customer::class,
            'password' => ['required', 'confirmed', 'min:6'],
        ]);

        $parts = explode(' ', $request->name, 2);
        $firstName = $parts[0];
        $lastName = $parts[1] ?? '';

        $request->merge([
            'first_name' => $firstName,
            'last_name' => $lastName,
            'publish' => 2,
            'password' => $request->password,
        ]);

        $customer = $this->customerService->save($request);

        if (!$customer) {
            return back()->with('error', 'Có lỗi xảy ra trong quá trình đăng ký. Vui lòng thử lại.');
        }

        event(new Registered($customer));

        Auth::guard('customer')->login($customer);

        // ✅ ĐỒNG BỘ GIỎ HÀNG VÀO DATABASE
        $this->cartService->mergeGuestCartToDatabase();

        return redirect()->intended(route('home'))->with('success', 'Đăng ký tài khoản thành công! Chào mừng bạn.');
    }
}
