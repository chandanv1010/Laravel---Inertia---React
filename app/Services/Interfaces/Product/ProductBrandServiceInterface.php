<?php 
namespace App\Services\Interfaces\Product;
use App\Services\Interfaces\BaseServiceInterface;

interface ProductBrandServiceInterface extends BaseServiceInterface{
    public function getDropdown();
}

