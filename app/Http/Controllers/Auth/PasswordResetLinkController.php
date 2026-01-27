<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Traits\HasTracking;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Password;
use Inertia\Inertia;
use Inertia\Response;

class PasswordResetLinkController extends Controller
{
    use HasTracking;
    /**
     * Show the password reset link request page.
     */
    public function create(Request $request): Response
    {
        // Track view disabled - chỉ log CRUD operations
        // $this->trackView('auth', null, [
        //     'description' => 'Xem trang quên mật khẩu',
        // ]);
        
        return Inertia::render('backend/auth/forgot-password', [
            'status' => $request->session()->get('status'),
        ]);
    }

    /**
     * Handle an incoming password reset link request.
     *
     * @throws \Illuminate\Validation\ValidationException
     */
    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'email' => 'required|email',
        ]);

        // Track forgot password request
        $this->trackAction('forgot_password', 'auth', null, [
            'description' => "Yêu cầu reset mật khẩu cho email: {$request->email}",
        ]);

        Password::sendResetLink(
            $request->only('email')
        );

        return back()->with('status', __('A reset link will be sent if the account exists.'));
    }
}
