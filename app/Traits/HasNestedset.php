<?php   
namespace App\Traits;
use App\Classes\NestedSet;

trait HasNestedset {

    protected $nestedset;

    public function initNestedset(array $params = []){
        $this->nestedset = new NestedSet($params);
    }

    public function getNestedsetDropdown(){
        return $this->nestedset->dropdown();
    }

    public function runNestedSet(){
        $this->nestedset->get();
        $this->nestedset->recursive(0, $this->nestedset->set());
        $this->nestedset->action();
    }


}