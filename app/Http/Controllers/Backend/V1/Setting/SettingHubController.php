<?php

namespace App\Http\Controllers\Backend\V1\Setting;

use App\Http\Controllers\Backend\BaseController;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SettingHubController extends BaseController
{
    use AuthorizesRequests;

    public function __construct()
    {
        parent::__construct(null);
    }

    /**
     * Hiển thị trang cài đặt chung
     *
     * @param Request $request
     * @return Response
     */
    public function general(Request $request): Response
    {
        $this->authorize('modules', 'setting:index');
        return Inertia::render('backend/setting/general/index');
    }

    /**
     * Chuyển hướng đến trang phương thức thanh toán
     *
     * @param Request $request
     * @return \Illuminate\Http\RedirectResponse
     */
    public function paymentMethods(Request $request)
    {
        return redirect()->route('payment-methods.index');
    }

    /**
     * Hiển thị trang mẫu báo giá
     *
     * @param Request $request
     * @return Response
     */
    public function quoteTemplate(Request $request): Response
    {
        $this->authorize('modules', 'setting:index');
        return Inertia::render('backend/setting/quote-template/index');
    }

    /**
     * Hiển thị trang cài đặt vận chuyển
     *
     * @param Request $request
     * @return Response
     */
    public function shipping(Request $request): Response
    {
        $this->authorize('modules', 'setting:index');
        return Inertia::render('backend/setting/shipping/index');
    }
}

