<?php   

namespace App\Http\Controllers\Backend\V1\Setting;

use App\Http\Controllers\Backend\BaseController;
use App\Http\Requests\Setting\Tax\UpdateRequest;
use App\Services\Interfaces\Setting\TaxSettingServiceInterface as TaxSettingService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Lang;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;

class TaxSettingController extends BaseController
{
    use AuthorizesRequests;

    public function __construct(
        private readonly TaxSettingService $taxSettingService
    ) {
        parent::__construct($taxSettingService);
    }

    public function index(Request $request): Response
    {
        $this->authorize('modules', 'setting_tax:index');

        return Inertia::render('backend/setting/tax/index', [
            'tax' => $this->taxSettingService->get(),
        ]);
    }

    public function update(UpdateRequest $request): RedirectResponse
    {
        $this->authorize('modules', 'setting_tax:update');

        $this->taxSettingService->update($request->validated());

        return redirect()->back()->with('success', Lang::get('messages.save_success'));
    }
}
