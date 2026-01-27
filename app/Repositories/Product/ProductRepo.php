<?php  
namespace App\Repositories\Product;

use App\Repositories\BaseRepo;
use App\Models\Product;
use App\Traits\HasCataloguePagination;

class ProductRepo extends BaseRepo {
    
    use HasCataloguePagination;
    
    protected $model;
    protected $relationable = ['product_catalogues', 'languages', 'tags'];
    
    // Catalogue filter config - được dùng bởi HasCataloguePagination trait
    protected string $catalogueMainRelationKey = 'product_catalogue_id';
    protected string $cataloguePivotRelationName = 'product_catalogues';
    protected string $catalogueTable = 'product_catalogues';

    public function __construct(Product $model)
    {
        $this->model = $model;
        parent::__construct($model);
    }

    public function getRelationable(): array {
        return $this->relationable;
    }
}
