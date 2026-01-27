<?php  
namespace App\Traits;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

trait HasCatalogueFilter {
    
    /**
     * Catalogue Service Interface - cần được inject trong constructor
     * Ví dụ: PostCatalogueServiceInterface $postCatalogueService
     */
    protected $catalogueService;
    
    /**
     * LƯU Ý: Class sử dụng trait này CẦN khai báo các properties sau:
     * - protected string $catalogueFilterField = 'xxx_catalogue_id';
     * - protected string $catalogueMainRelationKey = 'xxx_catalogue_id';
     * - protected string $cataloguePivotRelationName = 'xxx_catalogues';
     * - protected string $catalogueTable = 'xxx_catalogues';
     */
    
    /**
     * Xử lý filter catalogue với nested set trong paginate
     * Hỗ trợ cả single và multiple catalogue IDs
     * Format request: 
     * - Single: post_catalogue_id=1
     * - Multiple: post_catalogue_id[id][in]=1,2,3
     * 
     * Gọi method này trong paginate() của Service
     * 
     * @param array $specifications Specifications từ specifications()
     * @return array Specifications đã được xử lý
     */
    protected function handleCatalogueFilter(array $specifications): array {
        // Kiểm tra xem có config catalogue filter không
        if(empty($this->catalogueFilterField) || empty($this->catalogueService)){
            return $specifications;
        }
        
        // Kiểm tra xem có filter catalogue không (single hoặc multiple)
        $catalogueFilterData = null;
        
        // Kiểm tra multiple filter trước (complex: post_catalogue_id[id][in]=1,2,3)
        if($this->request->has($this->catalogueFilterField)){
            $filterInput = $this->request->input($this->catalogueFilterField);
            // Format: ['id' => ['in' => '1,2,3']] hoặc ['id' => ['in' => ['1', '2', '3']]]
            if(is_array($filterInput) && isset($filterInput['id']['in'])){
                $catalogueFilterData = $filterInput['id']['in'];
                // Unset khỏi simpleFilter để tránh conflict (vì nó đã được parse vào simpleFilter bởi build())
                unset($specifications['filter']['simple'][$this->catalogueFilterField]);
            }
        }
        // Kiểm tra single filter (simple)
        elseif(isset($specifications['filter']['simple'][$this->catalogueFilterField]) && 
           $specifications['filter']['simple'][$this->catalogueFilterField]){
            $catalogueFilterData = $specifications['filter']['simple'][$this->catalogueFilterField];
            unset($specifications['filter']['simple'][$this->catalogueFilterField]);
        }
        
        if(!$catalogueFilterData){
            return $specifications;
        }
        
        // Parse catalogue IDs (có thể là single ID, comma-separated string, hoặc array)
        if(is_array($catalogueFilterData)){
            // Nếu là array, flatten và convert sang string
            $catalogueIds = [];
            array_walk_recursive($catalogueFilterData, function($value) use (&$catalogueIds) {
                if(is_string($value) || is_numeric($value)){
                    $catalogueIds[] = (string)$value;
                }
            });
            // Nếu array rỗng sau khi flatten, thử explode từ string đầu tiên
            if(empty($catalogueIds) && !empty($catalogueFilterData)){
                $firstValue = reset($catalogueFilterData);
                if(is_string($firstValue)){
                    $catalogueIds = explode(',', $firstValue);
                }
            }
        } else {
            // Nếu là string, explode bằng comma
            $catalogueIds = explode(',', (string)$catalogueFilterData);
        }
        
        // Clean và filter catalogue IDs
        $catalogueIds = array_filter(array_map(function($id) {
            return trim((string)$id);
        }, $catalogueIds), function($id) {
            return !empty($id) && $id !== '0';
        });
        
        if(empty($catalogueIds)){
            return $specifications;
        }
        
        // Lấy tất cả child catalogue IDs cho mỗi catalogue được chọn
        // Mục đích: Từ list IDs catalogue -> output tất cả IDs bao gồm chính nó và tất cả các con
        // LƯU Ý: Nếu request có nhiều hơn 1 catalogue ID, chỉ filter theo các IDs được gửi (không tự động thêm children)
        // Nếu chỉ có 1 catalogue ID và đó là parent, tự động thêm tất cả children
        $allChildCatalogueIds = [];
        
        // Nếu có nhiều hơn 1 catalogue ID, chỉ filter theo các IDs được gửi (không tự động thêm children)
        if(count($catalogueIds) > 1){
            // Chỉ sử dụng các catalogue IDs được gửi, không tự động thêm children
            $allChildCatalogueIds = $catalogueIds;
        } else {
            // Logic cũ: Tự động thêm tất cả children của parent
            foreach($catalogueIds as $catalogueId){
                // Gọi CatalogueService->show() để lấy catalogue info (tận dụng cache)
                $catalogue = $this->catalogueService->show($catalogueId);
                
                if($catalogue && isset($catalogue->lft) && isset($catalogue->rgt) && $catalogue->lft && $catalogue->rgt){
                    // Query tất cả catalogue con bằng nested set
                    // Logic nested set: 
                    // - Để lấy tất cả descendants (bao gồm chính parent): lft >= parent.lft AND rgt <= parent.rgt
                    // - Tạo request với complexFilter cho cả lft và rgt
                    $childRequest = Request::create('', 'GET', [
                        'type' => 'all', // Lấy tất cả, không phân trang
                        'lft' => ['gte' => (string)$catalogue->lft],
                        'rgt' => ['lte' => (string)$catalogue->rgt]
                    ]);
                    
                    // Gọi paginate với type=all sẽ trả về Collection (từ BaseRepo->pagination)
                    $childCatalogues = $this->catalogueService->paginate($childRequest);
                    
                    // Xử lý kết quả: có thể là Collection hoặc Paginator
                    if($childCatalogues instanceof \Illuminate\Pagination\LengthAwarePaginator){
                        // Nếu là Paginator, lấy collection
                        $childCatalogueIds = $childCatalogues->getCollection()->pluck('id')->toArray();
                    } elseif($childCatalogues instanceof \Illuminate\Support\Collection){
                        // Nếu là Collection, pluck trực tiếp
                        $childCatalogueIds = $childCatalogues->pluck('id')->toArray();
                    } else {
                        // Fallback: iterate và lấy id
                        $childCatalogueIds = [];
                        foreach($childCatalogues as $cat){
                            $childCatalogueIds[] = is_object($cat) ? $cat->id : $cat['id'];
                        }
                    }
                    
                    // Merge vào danh sách tổng (đã bao gồm chính catalogue đó và tất cả con)
                    $allChildCatalogueIds = array_merge($allChildCatalogueIds, $childCatalogueIds);
                } else {
                    // Nếu không có lft/rgt thì chỉ thêm chính catalogue đó
                    $allChildCatalogueIds[] = $catalogueId;
                }
            }
        }
        
        // Loại bỏ duplicate IDs và sắp xếp lại
        $allChildCatalogueIds = array_values(array_unique($allChildCatalogueIds));
        
        // Debug: Log để kiểm tra kết quả
        Log::info("HasCatalogueFilter - Input catalogue IDs: " . implode(',', $catalogueIds));
        Log::info("HasCatalogueFilter - Output all child catalogue IDs: " . implode(',', $allChildCatalogueIds));
        
        // Lưu childCatalogueIds và config vào request để specifications() có thể lấy được
        // Sử dụng merge để thêm vào request, không dùng forget vì Request không có method này
        $this->request->merge([
            '_catalogue_ids' => $allChildCatalogueIds,
            '_catalogue_config' => [
                $this->catalogueMainRelationKey,
                $this->cataloguePivotRelationName,
                $this->catalogueTable
            ]
        ]);
        
        return $specifications;
    }
    
    /**
     * Override specifications để merge catalogue_ids và config từ request vào filter
     * Gọi method này trong specifications() của Service
     */
    protected function mergeCatalogueIdsToSpecs(array $specs): array {
        // Hỗ trợ cả 2 format: _catalogue_ids từ handleCatalogueFilter() hoặc catalogue_ids từ frontend
        $catalogueIds = $this->request->input('_catalogue_ids') ?: $this->request->input('catalogue_ids');
        
        if (!empty($catalogueIds)) {
            $specs['filter']['catalogue_ids'] = $catalogueIds;
        }
        
        // Merge config để Repo sử dụng
        if($this->request->has('_catalogue_config') && $this->request->input('_catalogue_config')){
            $specs['filter']['catalogue_config'] = $this->request->input('_catalogue_config');
        }
        
        return $specs;
    }
    
    /**
     * Lấy config để truyền vào scope filterByCatalogue trong Repo
     * 
     * @return array [mainRelationKey, pivotRelationName, catalogueTable]
     */
    protected function getCatalogueFilterConfig(): array {
        return [
            $this->catalogueMainRelationKey,
            $this->cataloguePivotRelationName,
            $this->catalogueTable
        ];
    }

    /**
     * Format request data cho frontend React (hỗ trợ MultiSelect hiển thị checked state)
     * Xử lý catalogue filter: nếu có 1 catalogue ID thì tự động thêm children (nested set)
     * 
     * @param Request $request
     * @return array Request data đã được format
     */
    public function formatRequestDataForFrontend(Request $request): array
    {
        $requestData = $request->all();
        
        // Kiểm tra xem có config catalogue filter không
        if(empty($this->catalogueFilterField) || empty($this->catalogueService)){
            return $requestData;
        }
        
        // Nếu có filter catalogue, tính toán tất cả child IDs để MultiSelect hiển thị tất cả là checked
        if($request->has($this->catalogueFilterField)){
            $catalogueFilterData = null;
            
            // Parse catalogue IDs từ request
            $filterInput = $request->input($this->catalogueFilterField);
            if(is_array($filterInput) && isset($filterInput['id']['in'])){
                $catalogueFilterData = $filterInput['id']['in'];
            } elseif(is_string($filterInput) || is_numeric($filterInput)){
                $catalogueFilterData = $filterInput;
            }
            
            if($catalogueFilterData){
                // Parse catalogue IDs (sử dụng logic đã có trong trait)
                $catalogueIds = $this->parseCatalogueIdsFromInput($catalogueFilterData);
                
                if(!empty($catalogueIds)){
                    // Nếu có nhiều hơn 1 catalogue ID, chỉ sử dụng các IDs được gửi (không tự động thêm children)
                    // Điều này cho phép frontend xóa từng child catalogue mà không bị backend tự động thêm lại
                    if(count($catalogueIds) > 1){
                        // Chỉ sử dụng các catalogue IDs được gửi
                        $requestData[$this->catalogueFilterField] = [
                            'id' => [
                                'in' => implode(',', $catalogueIds)
                            ]
                        ];
                    } else {
                        // Nếu chỉ có 1 catalogue ID, tự động thêm tất cả children (nested set)
                        $allChildCatalogueIds = $this->getCatalogueIdsWithChildren($catalogueIds[0]);
                        
                        // Merge tất cả child IDs vào request response để MultiSelect hiển thị tất cả là checked
                        if(!empty($allChildCatalogueIds)){
                            $requestData[$this->catalogueFilterField] = [
                                'id' => [
                                    'in' => implode(',', $allChildCatalogueIds)
                                ]
                            ];
                        }
                    }
                }
            }
        }
        
        return $requestData;
    }

    /**
     * Parse catalogue IDs từ input (hỗ trợ nhiều format)
     * Tách riêng để tái sử dụng
     * 
     * @param mixed $catalogueFilterData
     * @return array
     */
    protected function parseCatalogueIdsFromInput($catalogueFilterData): array
    {
        $catalogueIds = [];
        
        if(is_array($catalogueFilterData)){
            array_walk_recursive($catalogueFilterData, function($value) use (&$catalogueIds) {
                if(is_string($value) || is_numeric($value)){
                    $catalogueIds[] = (string)$value;
                }
            });
            
            if(empty($catalogueIds) && !empty($catalogueFilterData)){
                $firstValue = reset($catalogueFilterData);
                if(is_string($firstValue)){
                    $catalogueIds = explode(',', $firstValue);
                }
            }
        } else {
            $catalogueIds = explode(',', (string)$catalogueFilterData);
        }
        
        // Clean và filter catalogue IDs
        return array_values(array_filter(array_map(function($id) {
            return trim((string)$id);
        }, $catalogueIds), function($id) {
            return !empty($id) && $id !== '0';
        }));
    }

    /**
     * Lấy catalogue ID và tất cả children IDs (nested set)
     * Tách riêng để tái sử dụng
     * 
     * @param string|int $catalogueId
     * @return array
     */
    protected function getCatalogueIdsWithChildren($catalogueId): array
    {
        $catalogue = $this->catalogueService->show($catalogueId);
        
        if(!$catalogue || !isset($catalogue->lft) || !isset($catalogue->rgt) || !$catalogue->lft || !$catalogue->rgt){
            return [$catalogueId];
        }
        
        // Query tất cả catalogue con bằng nested set
        $childRequest = Request::create('', 'GET', [
            'type' => 'all',
            'lft' => ['gte' => (string)$catalogue->lft],
            'rgt' => ['lte' => (string)$catalogue->rgt]
        ]);
        
        $childCatalogues = $this->catalogueService->paginate($childRequest);
        
        $childCatalogueIds = [];
        if($childCatalogues instanceof \Illuminate\Pagination\LengthAwarePaginator){
            $childCatalogueIds = $childCatalogues->getCollection()->pluck('id')->toArray();
        } elseif($childCatalogues instanceof \Illuminate\Support\Collection){
            $childCatalogueIds = $childCatalogues->pluck('id')->toArray();
        } else {
            foreach($childCatalogues as $cat){
                $childCatalogueIds[] = is_object($cat) ? $cat->id : $cat['id'];
            }
        }
        
        // Loại bỏ duplicate IDs và sắp xếp lại
        return array_values(array_unique($childCatalogueIds));
    }
}

