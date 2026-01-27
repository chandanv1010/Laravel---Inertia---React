<?php

namespace App\Http\Controllers\Frontend\Core;

use App\Http\Controllers\Controller;
use App\Models\Router;

/**
 * RouterController
 * Bắt canonical URL từ request, truy vấn bảng routers và điều hướng đến controller tương ứng
 */
class RouterController extends Controller
{
    /**
     * Dispatch request đến controller tương ứng dựa trên canonical
     * 
     * @param string $canonical URL canonical (không có .html)
     * @param int|null $page Số trang cho pagination (từ URL /trang-X.html)
     * @return mixed
     */
    public function dispatch(string $canonical, ?int $page = null)
    {
        // Check for pagination suffix in canonical (e.g., "slug/trang-2")
        // The .html is already stripped by the route definition: {canonical}.html
        if (preg_match('/^(.*)\/trang-(\d+)$/', $canonical, $matches)) {
            $canonical = $matches[1];
            $page = (int)$matches[2];
        }

        // Merge page into request if present
        if ($page !== null) {
            request()->merge(['page' => $page]);
        }
        

        // Tìm router record theo canonical và language
        $router = Router::where('canonical', $canonical)
            ->where('language_id', config('app.language_id', 1))
            ->first();
            
        
        if (!$router) {
            abort(404, 'Không tìm thấy trang');
        }
        
        // Kiểm tra redirect nếu có
        if ($router->redirect) {
            $redirectType = $router->redirect_type == '301' ? 301 : 302;
            return redirect($router->redirect, $redirectType);
        }
        
        // Lấy controller class từ database và gọi trực tiếp
        $controllerClass = $router->controller;
        
        if (!$controllerClass || !class_exists($controllerClass)) {
            abort(404, 'Controller không tồn tại: ' . $controllerClass);
        }
        
        // Resolve controller từ container và gọi method show với router
        $controller = app($controllerClass);
        
        return $controller->show($router);
    }
}

