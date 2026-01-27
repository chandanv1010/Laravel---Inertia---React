<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Traits\HasTracking;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;

class PasswordController extends Controller
{
    use HasTracking;
    /**
     * Show the user's password settings page.
     */
    public function edit(Request $request): Response
    {
        // Track view disabled - chỉ log CRUD operations
        // $this->trackView('password', $request->user(), [
        //     'description' => 'Xem trang đổi mật khẩu',
        // ]);
        
        return Inertia::render('settings/password');
    }

    /**
     * Update the user's password.
     */
    public function update(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'current_password' => ['required', 'current_password'],
            'password' => ['required', Password::defaults(), 'confirmed'],
        ]);

        $user = $request->user();
        $user->update([
            'password' => Hash::make($validated['password']),
        ]);
        
        // Track password change
        $this->trackAction('update', 'password', $user, [
            'description' => 'Đổi mật khẩu',
        ]);

        return back();
    }
}
