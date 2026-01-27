<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Illuminate\Support\Facades\App;
use App\Models\Language;
use Illuminate\Support\Facades\Config;

class SetBackendLocale
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $defaultLocale = config('app.locale', 'vn');
        $locale = session('app_locale', $defaultLocale);
        
        // Validate locale exists in database, otherwise fallback to default
        $languageId = cache()->rememberForever('language_id_'.$locale, function() use ($locale){
            return Language::where('canonical', $locale)->value('id');
        });
        
        // If language not found for session locale, reset to default
        if (!$languageId && $locale !== $defaultLocale) {
            $locale = $defaultLocale;
            session(['app_locale' => $locale]);
            cache()->forget('language_id_'.$locale);
            $languageId = cache()->rememberForever('language_id_'.$locale, function() use ($locale){
                return Language::where('canonical', $locale)->value('id');
            });
        }
        
        App::setlocale($locale);
        Config::set('app.language_id', $languageId ?? (int)config('app.language_id', 1));
        
        return $next($request);
    }
}
