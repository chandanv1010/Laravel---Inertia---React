<?php  
namespace App\Repositories\Setting;

use App\Repositories\BaseRepo;
use App\Models\Language;

class LanguageRepo extends BaseRepo {
    protected $model;

    public function __construct(
        Language $model
    )
    {
        $this->model = $model;
        parent::__construct($model);
    }


}