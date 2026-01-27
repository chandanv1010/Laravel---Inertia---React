<?php

namespace App\Http\Controllers\Backend\V1\Setting;

use App\Http\Controllers\Backend\BaseController;
use App\Http\Requests\ToggleRequest;
use App\Models\System;
use App\Models\SystemCatalogue;
use App\Services\Interfaces\Setting\LanguageServiceInterface;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Lang;

class SystemController extends BaseController
{
    public function __construct(
        private readonly LanguageServiceInterface $languageService
    ) {
        parent::__construct(null);
    }

    public function index($catalogueId)
    {
        $catalogue = SystemCatalogue::findOrFail($catalogueId);
        $systems = System::where('system_catalogue_id', $catalogueId)
            ->orderBy('sort_order')
            ->get()
            ->map(function ($system) {
                $system->publish = (string)$system->publish;
                return $system;
            });
        
        return Inertia::render('backend/system/system/index', [
            'catalogue' => $catalogue,
            'systems' => $systems,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'system_catalogue_id' => 'required|exists:system_catalogues,id',
            'label' => 'required',
            'keyword' => 'required|unique:systems,keyword',
            'type' => 'required',
            'sort_order' => 'integer',
            'is_translatable' => 'boolean',
            'attributes' => 'nullable|array'
        ]);
        $validated['description'] = $request->input('description');
        $validated['is_translatable'] = $request->boolean('is_translatable') ? 1 : 0;
        
        System::create($validated);
        return redirect()->back()->with('success', Lang::get('messages.create_success'));
    }

    public function update(Request $request, $id)
    {
        $validated = $request->validate([
            'label' => 'sometimes|required',
            'keyword' => 'sometimes|required|unique:systems,keyword,'.$id,
            'type' => 'sometimes|required',
            'sort_order' => 'sometimes|integer',
            'is_translatable' => 'sometimes|boolean',
            'attributes' => 'nullable|array'
        ]);
        
        if ($request->has('description')) {
            $validated['description'] = $request->input('description');
        }
        if ($request->has('is_translatable')) {
            $validated['is_translatable'] = $request->boolean('is_translatable') ? 1 : 0;
        }

        System::findOrFail($id)->update($validated);
        return redirect()->back()->with('success', Lang::get('messages.update_success'));
    }

    public function destroy($id)
    {
        System::findOrFail($id)->delete();
        return redirect()->back()->with('success', Lang::get('messages.delete_success'));
    }

    public function bulkDestroy(Request $request)
    {
        $ids = $request->input('ids', []);
        if (empty($ids)) {
            return redirect()->back()->with('error', 'Không có bản ghi nào được chọn');
        }
        
        System::whereIn('id', $ids)->delete();
        return redirect()->back()->with('success', Lang::get('messages.delete_success'));
    }

    public function bulkUpdate(Request $request)
    {
        $ids = $request->input('ids', []);
        if (empty($ids)) {
            return redirect()->back()->with('error', 'Không có bản ghi nào được chọn');
        }

        $updateData = [];
        
        if ($request->has('publish')) {
            $updateData['publish'] = $request->input('publish');
        }
        
        if ($request->has('is_translatable')) {
            $value = $request->input('is_translatable');
            $updateData['is_translatable'] = $value === '2' ? 1 : 0;
        }

        if (empty($updateData)) {
            return redirect()->back()->with('error', 'Không có dữ liệu để cập nhật');
        }

        System::whereIn('id', $ids)->update($updateData);
        
        return redirect()->back()->with('success', Lang::get('messages.update_success'));
    }

    public function toggle(ToggleRequest $request, $id)
    {
        $field = $request->route('field');
        $value = $request->input('value');
        
        $system = System::findOrFail($id);
        
        if ($field === 'is_translatable') {
            $dbValue = $value === '2' ? 1 : 0;
        } else {
            $dbValue = (int)$value;
        }
        
        $system->update([$field => $dbValue]);
        
        return redirect()->back()->with('success', Lang::get('messages.save_success'));
    }
}
