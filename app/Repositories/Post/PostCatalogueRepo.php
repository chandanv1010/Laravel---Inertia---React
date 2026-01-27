<?php  
namespace App\Repositories\Post;

use App\Repositories\BaseRepo;
use App\Models\PostCatalogue;

class PostCatalogueRepo extends BaseRepo {
    protected $model;

    public function __construct(
        PostCatalogue $model
    )
    {
        $this->model = $model;
        parent::__construct($model);
    }


}