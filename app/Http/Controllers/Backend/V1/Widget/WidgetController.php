<?php

namespace App\Http\Controllers\Backend\V1\Widget;

use App\Http\Controllers\Backend\BaseController;
use App\Services\Interfaces\Widget\WidgetServiceInterface as WidgetService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class WidgetController extends BaseController
{
    protected $widgetService;

    public function __construct(WidgetService $widgetService)
    {
        $this->widgetService = $widgetService;
    }

    public function index(Request $request)
    {
        $widgets = $this->widgetService->paginate($request);
        return Inertia::render('backend/widget/index', [
            'widgets' => $widgets
        ]);
    }

    public function create()
    {
        $availableModels = [
            'App\Models\Post' => 'Bài viết',
            'App\Models\Product' => 'Sản phẩm',
            'App\Models\PostCatalogue' => 'Danh mục bài viết',
            'App\Models\ProductCatalogue' => 'Danh mục sản phẩm',
        ];

        return Inertia::render('backend/widget/save', [
            'availableModels' => $availableModels
        ]);
    }

    public function store(Request $request)
    {
        try {
            $this->widgetService->create($request);
            return redirect()->route('widget.index')->with('success', 'Thêm mới thành công');
        } catch (\Exception $e) {
            return redirect()->back()->with('error', $e->getMessage());
        }
    }

    public function edit($id)
    {
        $widget = $this->widgetService->show($id);
        
        $availableModels = [
            'App\Models\Post' => 'Bài viết',
            'App\Models\Product' => 'Sản phẩm',
            'App\Models\PostCatalogue' => 'Danh mục bài viết',
            'App\Models\ProductCatalogue' => 'Danh mục sản phẩm',
        ];

        // Load selected items for display
        $selectedItems = $widget->items;

        return Inertia::render('backend/widget/save', [
            'widget' => $widget,
            'availableModels' => $availableModels,
            'selectedItems' => $selectedItems
        ]);
    }

    public function update(Request $request, $id)
    {
        try {
            $this->widgetService->update($id, $request);
            return redirect()->route('widget.index')->with('success', 'Cập nhật thành công');
        } catch (\Exception $e) {
            return redirect()->back()->with('error', $e->getMessage());
        }
    }

    public function destroy($id)
    {
        try {
            $this->widgetService->delete($id);
            return redirect()->route('widget.index')->with('success', 'Xóa thành công');
        } catch (\Exception $e) {
            return redirect()->back()->with('error', $e->getMessage());
        }
    }

    /**
     * API to search for items within a model
     */
    public function searchModel(Request $request)
    {
        $model = $request->input('model');
        $keyword = $request->input('term') ?? $request->input('q');
        
        $items = $this->widgetService->searchModel($model, $keyword);
        
        return response()->json([
            'results' => $items->map(function($item) {
                return [
                    'id' => $item->id,
                    'text' => $item->name,
                    'name' => $item->name,
                    'image' => $item->image ?? null
                ];
            })
        ]);
    }
}
