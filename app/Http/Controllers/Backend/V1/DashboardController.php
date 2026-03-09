<?php

namespace App\Http\Controllers\Backend\V1;

use App\Http\Controllers\Backend\BaseController;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends BaseController
{
    use AuthorizesRequests;

    public function __construct()
    {
        parent::__construct(null);
    }

    /**
     * Hiển thị trang dashboard chính
     *
     * @return Response
     */
    public function index(): Response
    {
        // $this->authorize('modules', 'dashboard:index');


        return Inertia::render('backend/dashboard');
    }
}
