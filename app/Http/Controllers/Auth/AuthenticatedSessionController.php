<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Traits\HasTracking;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Inertia\Response;
use Laravel\Fortify\Features;
use Illuminate\Support\Str;

class AuthenticatedSessionController extends Controller
{
    use HasTracking;
    /**
     * Show the login page.
     */
    public function create(Request $request): Response
    {
        // Track view disabled - chỉ log CRUD operations
        // $this->trackView('auth', null, [
        //     'description' => 'Xem trang đăng nhập',
        // ]);
        
        return Inertia::render('backend/auth/login', [
            'canResetPassword' => Route::has('password.request'),
            'status' => $request->session()->get('status'),
        ]);
    }

    /**
     * Handle an incoming authentication request.
     */
    public function store(LoginRequest $request): RedirectResponse
    {
        $user = $request->validateCredentials();
        if (Features::enabled(Features::twoFactorAuthentication()) && $user->hasEnabledTwoFactorAuthentication()) {
            $request->session()->put([
                'login.id' => $user->getKey(),
                'login.remember' => $request->boolean('remember'),
            ]);

            return to_route('two-factor.login');
        }
        Auth::login($user, $request->boolean('remember'));
        $request->session()->regenerate();
        $user->load(['user_catalogues.permissions']);
        
        // Track login success (SAU khi login để có user)
        $this->trackAction('login', 'auth', $user, [
            'description' => "Đăng nhập thành công: {$user->email}",
        ]);
        
        $permissions = $user->user_catalogues
        ->flatMap(fn ($catalogue) => $catalogue->permissions)
        ->pluck('canonical')
        ->filter(fn ($perm) => str_starts_with($perm, 'ckfinder:'))
        ->unique()
        ->values()
        ->toArray();
        // dd($permissions);

        $username = Str::before($user->email, '@');
        $encodedPermissions = base64_encode(json_encode($permissions));

        $expired = time() + (10 * 365 * 24 * 60 * 60); // 10 năm
        setcookie('CKFINDER_USER', $username, $expired, '/');
        setcookie('CKFINDER_PERMISSION', $encodedPermissions, $expired, '/');


        return redirect()->intended(route('dashboard', absolute: false));
    }

    /**
     * Destroy an authenticated session.
     */
    public function destroy(Request $request): RedirectResponse
    {
        $user = Auth::user();
        
        // Track logout before logout
        if ($user) {
            $this->trackAction('logout', 'auth', $user, [
                'description' => "Đăng xuất: {$user->email}",
            ]);
        }
        
        Auth::guard('web')->logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/');
    }
}
