<?php

namespace App\Http\Controllers\Backend\V1\Setting;

use App\Http\Controllers\Backend\BaseController;
use App\Http\Requests\ToggleRequest;
use App\Http\Requests\Setting\SystemCatalogue\BulkUpdateRequest;
use App\Models\SystemCatalogue;
use App\Services\Interfaces\Setting\SystemServiceInterface;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Lang;

class SystemCatalogueController extends BaseController
{
    public function __construct(
        protected SystemServiceInterface $systemService
    ) {
        parent::__construct(null);
    }

    public function index(Request $request)
    {
        $systemCatalogues = SystemCatalogue::orderBy('sort_order')->paginate(20);
        return Inertia::render('backend/system/catalogue/index', [
            'systemCatalogues' => $systemCatalogues
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required',
            'keyword' => 'required|unique:system_catalogues,keyword',
            'sort_order' => 'integer'
        ]);
        
        SystemCatalogue::create($validated);
        return redirect()->back()->with('success', Lang::get('messages.create_success'));
    }

    public function update(Request $request, $id)
    {
        $validated = $request->validate([
            'name' => 'required',
            'keyword' => 'required|unique:system_catalogues,keyword,'.$id,
            'sort_order' => 'integer'
        ]);

        SystemCatalogue::findOrFail($id)->update($validated);
        return redirect()->back()->with('success', Lang::get('messages.update_success'));
    }

    public function destroy($id)
    {
        SystemCatalogue::findOrFail($id)->delete();
        return redirect()->back()->with('success', Lang::get('messages.delete_success'));
    }

    public function bulkUpdate(BulkUpdateRequest $request)
    {
        $ids = $request->input('ids', []);
        
        $updateData = [];
        
        if ($request->has('publish')) {
            $updateData['publish'] = $request->input('publish');
        }

        if (empty($updateData)) {
            return redirect()->back()->with('error', 'Không có dữ liệu để cập nhật');
        }

        SystemCatalogue::whereIn('id', $ids)->update($updateData);
        
        return redirect()->back()->with('success', Lang::get('messages.update_success'));
    }

    public function toggle(ToggleRequest $request, $id)
    {
        $field = $request->route('field');
        $value = $request->input('value');
        
        $systemCatalogue = SystemCatalogue::findOrFail($id);
        
        $dbValue = (int)$value;
        
        $systemCatalogue->update([$field => $dbValue]);
        
        return redirect()->back()->with('success', Lang::get('messages.save_success'));
    }
}
