<?php  
namespace App\Repositories\Post;

use App\Repositories\BaseRepo;
use App\Models\Post;
use App\Traits\HasCataloguePagination;

class PostRepo extends BaseRepo {
    
    use HasCataloguePagination;
    
    protected $model;

    public function __construct(
        Post $model
    )
    {
        $this->model = $model;
        parent::__construct($model);
    }

}