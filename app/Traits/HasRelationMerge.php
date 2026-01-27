<?php  
namespace App\Traits;

trait HasRelationMerge {
    
    /**
     * Merge main relation ID vào pivot relations array
     * Ví dụ: merge post_catalogue_id vào post_catalogues array
     * 
     * @param string $mainRelationKey Tên key của main relation (ví dụ: 'post_catalogue_id')
     * @param string $pivotRelationKey Tên key của pivot relation array (ví dụ: 'post_catalogues')
     */
    protected function mergeMainRelationToPivot(string $mainRelationKey, string $pivotRelationKey): static {
        if($this->request->has($mainRelationKey) || $this->request->has($pivotRelationKey)){
            $pivotRelations = $this->request->input($pivotRelationKey, []);
            
            // Thêm main relation ID vào danh sách nếu có
            if($this->request->has($mainRelationKey) && $this->request->input($mainRelationKey)){
                $pivotRelations[] = $this->request->input($mainRelationKey);
                $pivotRelations = array_unique($pivotRelations);
            }
            
            // Merge vào request để withRelation xử lý sync
            $this->request->merge([$pivotRelationKey => $pivotRelations]);
        }
        
        return $this;
    }
}

