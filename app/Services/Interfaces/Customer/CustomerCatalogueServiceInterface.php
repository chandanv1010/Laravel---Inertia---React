<?php 
namespace App\Services\Interfaces\Customer;
use App\Services\Interfaces\BaseServiceInterface;

interface CustomerCatalogueServiceInterface extends BaseServiceInterface{
    public function getDropdown();
}
