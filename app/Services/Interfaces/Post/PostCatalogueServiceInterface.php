<?php 
namespace App\Services\Interfaces\Post;
use App\Services\Interfaces\BaseServiceInterface;

interface PostCatalogueServiceInterface extends BaseServiceInterface{
    public function initNestedset(array $params = []);
    public function getNestedsetDropdown();
}