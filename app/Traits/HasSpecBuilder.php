<?php  
namespace App\Traits;

trait HasSpecBuilder{

    //['publish', '..']
    protected function build($filter = []){
        $conditions = [];
        if(is_array($filter) && count($filter)){
            foreach($filter as $key => $val){
                if($this->request->has($val)){
                    $conditions[$val] = $this->request->input($val);
                }
            }
        }
        return $conditions;
    }

    protected function specifications(): array {
        return [
            'all' => $this->request->input('type') === 'all',
            'perpage' => $this->request->input('perpage') ?? $this->perpage,
            'sort' => $this->request->input('sort') 
                ? (is_array($this->request->input('sort')) ? $this->request->input('sort') : explode(',', $this->request->input('sort')))
                : $this->sort,
            'filter' => [
                'simple' => $this->build($this->simpleFilter),
                'keyword' => [
                    'q' => $this->request->input('keyword'),
                    'fields' => $this->searchFields,
                    'isMultipleLanguage' => $this->isMultipleLanguage ?? false,
                    'pivotTable' => $this->pivotTable ?? null, // Tên bảng pivot từ Service
                    'pivotForeignKey' => $this->pivotForeignKey ?? null, // Foreign key từ Service
                ],
                'complex' => $this->build($this->complexFilter),
                'date' => $this->build($this->dateFilter),
                'with' => $this->build($this->withFilters)
            ],
            'with' => $this->with
        ];
    }


}
