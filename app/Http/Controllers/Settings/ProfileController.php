<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Traits\HasTracking;
use App\Http\Requests\Settings\ProfileUpdateRequest;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    use HasTracking;

    /**
     * Show the user's profile settings page.
     */
    public function edit(Request $request): Response
    {
        // Track view disabled - chỉ log CRUD operations
        // $this->trackView('profile', $request->user(), [
        //     'description' => 'Xem trang chỉnh sửa profile',
        // ]);
        
        return Inertia::render('settings/profile', [
            'mustVerifyEmail' => $request->user() instanceof MustVerifyEmail,
            'status' => $request->session()->get('status'),
        ]);
    }

    /**
     * Update the user's profile settings.
     */
    public function update(ProfileUpdateRequest $request): RedirectResponse
    {
        $user = $request->user();
        $oldData = $user->getAttributes();
        
        $user->fill($request->validated());

        if ($user->isDirty('email')) {
            $user->email_verified_at = null;
        }

        $user->save();
        
        // Track profile update
        $this->trackAction('update', 'profile', $user, [
            'description' => 'Cập nhật profile',
            'old_data' => $oldData,
            'new_data' => $user->getAttributes(),
            'changes' => $user->getChanges(),
        ]);

        return to_route('profile.edit');
    }

    /**
     * Delete the user's account.
     */
    public function destroy(Request $request): RedirectResponse
    {
        $request->validate([
            'password' => ['required', 'current_password'],
        ]);

        $user = $request->user();
        $userData = $user->getAttributes();

        // Track account deletion before logout and delete
        $this->trackAction('delete', 'profile', $user, [
            'description' => 'Xóa tài khoản',
            'old_data' => $userData,
        ]);

        Auth::logout();

        $user->delete();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/');
    }
}
