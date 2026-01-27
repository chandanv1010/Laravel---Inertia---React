<?php  
namespace App\Http\Controllers\Backend;

use App\Http\Controllers\Controller;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\RedirectResponse;
use App\Enums\CommonEnum;
use Illuminate\Support\Facades\Lang;
use Illuminate\Http\Request;
use App\Http\Requests\ToggleRequest;
use App\Http\Resources\ApiResource;
use Illuminate\Http\Response;
use App\Traits\HasTracking;

class BaseController extends Controller {

    use AuthorizesRequests;

    use HasTracking;

    protected $service;



    public function __construct(
        $service
    )
    {
        $this->service = $service;
    }


    public function handleAction($request, $response, string $redirectRoute = '', ?string $editRoute = ''): RedirectResponse{
        if($response){
            if($request->input(CommonEnum::SAVE_AND_REDIRECT) && $request->input(CommonEnum::SAVE_AND_REDIRECT) === CommonEnum::REDIRECT){
                return to_route($redirectRoute)->with('success', Lang::get('messages.save_success'));
            }
            if(!empty($editRoute)){
                return to_route($editRoute, $response->id)->with('success', Lang::get('messages.save_success'));
            }
            return redirect()->back()->with('success', Lang::get('messages.save_success'));
        }
        return redirect()->back()->with('error', Lang::get('messages.save_failed'));
    }


    public function toggle(ToggleRequest $request, $id){
        $request->replace([
            $request->input('field') => $request->input('value'),
        ]);
        // Save trước, sau đó invalidate cache theo đúng strategy
        $response = $this->service->skipBeforeSave()->skipWithRelation()->skipAfterSave()->save($request, $id);
        if($response){
            // Invalidate cache SAU khi save thành công
            // invalidateCache() sẽ tự động xử lý theo cache strategy của service (dataset, hot_queries, etc.)
            $this->service->invalidateCache();
            // Invalidate paginate cache để đảm bảo dữ liệu mới được load
            $this->service->invalidatePaginateCache();
            return redirect()->back()->with('success', Lang::get('messages.save_success'));
        }
        return redirect()->back()->with('error', Lang::get('messages.save_failed'));
    }

    /**
     * Get module name from service or route
     */
    protected function getModuleName(): string
    {
        // Nếu service có method getModuleName, sử dụng nó
        if (method_exists($this->service, 'getModuleName')) {
            return $this->service->getModuleName();
        }

        // Extract từ class name của service (e.g., PostService -> post)
        if (is_object($this->service)) {
            $serviceClass = get_class($this->service);
            $className = class_basename($serviceClass);
            $moduleName = str_replace('Service', '', $className);
            return strtolower(preg_replace('/(?<!^)[A-Z]/', '_$0', $moduleName));
        }

        // Fallback: Extract từ route name
        $routeName = request()->route()?->getName() ?? '';
        $parts = explode('.', $routeName);
        return $parts[0] ?? 'unknown';
    }

    /**
     * Track view action (index page) with filters
     * DISABLED: Chỉ log CRUD operations, không log view actions
     */
    protected function trackIndex(Request $request, string $module = null): void
    {
        // Disabled - chỉ log CRUD operations
        return;
    }

    /**
     * Track show/view single record action
     * DISABLED: Chỉ log CRUD operations, không log view actions
     */
    protected function trackShow(string $module, $record): void
    {
        // Disabled - chỉ log CRUD operations
        return;
    }

    /**
     * Format filter value to string (handle arrays and nested arrays)
     */
    protected function formatFilterValue($value): string
    {
        if (is_array($value)) {
            // Flatten nested arrays
            $flattened = [];
            array_walk_recursive($value, function($item) use (&$flattened) {
                $flattened[] = $item;
            });
            return !empty($flattened) ? implode(', ', $flattened) : '';
        }
        return (string) $value;
    }

    /**
     * Extract filter parameters from request
     */
    protected function extractFilterParams(Request $request): array
    {
        $filters = [];
        
        // Common filter fields
        $filterFields = [
            'publish',
            'user_id',
            'creator_id',
            'post_catalogue_id',
            'language_id',
            'status',
            'action',
            'module',
            'robots',
            'date_from',
            'date_to',
            'created_at',
            'updated_at',
        ];

        foreach ($filterFields as $field) {
            $value = $request->input($field);
            if ($value !== null && $value !== '') {
                $filters[$field] = $value;
            }
        }

        // Handle array filters (multiple select)
        $arrayFilters = [
            'post_catalogues',
            'user_catalogues',
            'languages',
            'permissions',
        ];

        foreach ($arrayFilters as $field) {
            $value = $request->input($field);
            if (is_array($value) && !empty($value)) {
                $filters[$field] = $value;
            }
        }

        return $filters;
    }

    /**
     * Track filter/search action separately
     */
    protected function trackFilter(string $module, Request $request): void
    {
        $filters = $this->extractFilterParams($request);
        $search = $request->input('search');
        $sort = $request->input('sort');

        $description = "Lọc dữ liệu {$module}";
        $filterParts = [];

        if ($search) {
            $filterParts[] = "Tìm kiếm: {$search}";
        }

        if ($sort) {
            $filterParts[] = "Sắp xếp: {$sort}";
        }

        foreach ($filters as $key => $value) {
            if ($value !== null && $value !== '') {
                $displayValue = $this->formatFilterValue($value);
                if ($displayValue !== '') {
                    $filterParts[] = "{$key}: {$displayValue}";
                }
            }
        }

        if (!empty($filterParts)) {
            $description .= " (" . implode(', ', $filterParts) . ")";
        }

        $this->trackAction('filter', $module, null, [
            'description' => $description,
            'filter_params' => $filters,
            'search' => $search,
            'sort' => $sort,
        ]);
    }

}