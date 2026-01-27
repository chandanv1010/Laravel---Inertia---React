<?php  
namespace App\Traits;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

trait HasRouter {

    protected $pivotLanguageFields = [
        'name',
        'description',
        'content',
        'canonical',
        'meta_title',
        'meta_keyword',
        'meta_description',
    ];
  
    private function handlePivotLanguageFields(){
        $request = $this->request;
        $payload = [
            config('app.language_id') => array_filter(
                [
                    ...$request->only($this->pivotLanguageFields),
                    ...(isset($this->languageFields['extends']) ? $request->only($this->languageFields['extends']) : []),
                ],
                fn($v, $k) => !in_array($k, $this->pivotFields['except'] ?? []),
                ARRAY_FILTER_USE_BOTH
            )
        ];
        $this->request->merge(['languages' => $payload]);
    }

    private function syncRouter(
        string $module = '',
        string $nextComponent = '',
        string $controller = '' // App\Http\Controllers\Frontend\Post\PostCatalogueController
    ){
        if($this->model && $this->model instanceof Model){
            $canonical = $this->request->input('canonical');
            
            // Chỉ sync router nếu có canonical
            if($canonical){
                $modelClass = get_class($this->model);
                
                $payload = [
                    'routerable_id' => $this->model->id,
                    'routerable_type' => $modelClass,
                    'module' => $module,
                    'next_component' => $nextComponent,
                    'controller' => $controller,
                    'canonical' => $canonical,
                    'language_id' => config('app.language_id'),
                ];
                
                \App\Models\Router::updateOrCreate([
                    'routerable_id' => $this->model->id,
                    'routerable_type' => $modelClass,
                    'module' => $module,
                    'language_id' => config('app.language_id'),
                ], $payload);
            }
        }
    }

    /**
     * Xóa router của model (hard delete)
     */
    protected function deleteRouter(): void
    {
        if($this->model && $this->model instanceof Model){
            // Xóa tất cả router của model này (có thể có nhiều router với các language_id khác nhau)
            \App\Models\Router::where('routerable_id', $this->model->id)
                ->where('routerable_type', get_class($this->model))
                ->delete();
        }
    }

    /**
     * Xử lý các items liên quan khi xóa catalogue (có thể tái sử dụng cho products, posts, etc.)
     * 
     * @param int $catalogueId ID của catalogue đang xóa
     * @param string $itemServiceName Tên service của items (ví dụ: 'postService', 'productService')
     * @param string $catalogueFilterField Tên field filter catalogue trong request (ví dụ: 'post_catalogue_id', 'product_catalogue_id')
     * @param string $mainRelationKey Tên field chính trong item model (ví dụ: 'post_catalogue_id', 'product_catalogue_id')
     * @param string $pivotRelationName Tên relation many-to-many (ví dụ: 'post_catalogues', 'product_catalogues')
     */
    protected function handleRelatedItemsOnCatalogueDelete(
        int $catalogueId,
        string $itemServiceName = 'postService',
        string $catalogueFilterField = 'post_catalogue_id',
        string $mainRelationKey = 'post_catalogue_id',
        string $pivotRelationName = 'post_catalogues'
    ): void
    {
        // Lấy service từ property hoặc resolve từ container nếu không có
        $itemService = $this->{$itemServiceName} ?? null;
        if(!$itemService){
            // Nếu không có trong property, resolve từ container
            try {
                $itemService = app()->make('App\Services\Interfaces\Post\PostServiceInterface');
            } catch (\Exception $e) {
                return;
            }
        }
        
        // Lấy tất cả items thuộc catalogue này - sử dụng paginate để tận dụng cache
        // Load thêm relation 'routers' và pivotRelationName để có thể xử lý
        // Sử dụng reflection để lấy $with ban đầu
        $reflection = new \ReflectionClass($itemService);
        $withProperty = $reflection->getProperty('with');
        $withProperty->setAccessible(true);
        $originalWith = $withProperty->getValue($itemService) ?? [];
        
        // Set with mới cho request này
        $itemService->setWith(['routers', $pivotRelationName]);
        
        // Tạo request để lấy items - format đúng cho HasCatalogueFilter
        $request = new \Illuminate\Http\Request([
            $catalogueFilterField => $catalogueId,
            'type' => 'all' // Để lấy tất cả items (không phân trang)
        ]);
        
        // Gọi paginate với request mới (setRequest đã được gọi trong paginate)
        $items = $itemService->paginate($request);
        
        // Restore lại $with ban đầu để không ảnh hưởng đến các request khác
        $itemService->setWith($originalWith);
        
        if($items && $items->count() > 0){
            foreach($items as $item){
                $itemId = $item->id;
                
                // Lấy các catalogue IDs khác mà item thuộc về (từ relation)
                $otherCatalogueIds = [];
                if($item->{$pivotRelationName}){
                    foreach($item->{$pivotRelationName} as $catalogue){
                        if($catalogue->id != $catalogueId && !$catalogue->deleted_at){
                            $otherCatalogueIds[] = $catalogue->id;
                        }
                    }
                }
                
                // Nếu item có mainRelationKey = catalogue đang xóa
                if($item->{$mainRelationKey} == $catalogueId){
                    if(!empty($otherCatalogueIds)){
                        // Item còn thuộc catalogue khác → cập nhật mainRelationKey thành catalogue khác (lấy đầu tiên)
                        $updateRequest = new \Illuminate\Http\Request([$mainRelationKey => $otherCatalogueIds[0]]);
                        $itemService->save($updateRequest, $itemId);
                    } else {
                        // Item chỉ thuộc catalogue đang xóa → xóa router và soft delete item
                        if($item->routers){
                            $item->routers->delete();
                        }
                        
                        $itemService->destroy($itemId);
                    }
                }
                
                // Xóa khỏi pivot table - sử dụng save với pivotRelationName
                $remainingCatalogueIds = [];
                if($item->{$pivotRelationName}){
                    foreach($item->{$pivotRelationName} as $catalogue){
                        if($catalogue->id != $catalogueId){
                            $remainingCatalogueIds[] = $catalogue->id;
                        }
                    }
                }
                $detachRequest = new \Illuminate\Http\Request([$pivotRelationName => $remainingCatalogueIds]);
                $itemService->save($detachRequest, $itemId);
            }
        }
    }

}