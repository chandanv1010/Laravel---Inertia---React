<?php 
namespace App\Services\Interfaces\Post;
use App\Services\Interfaces\BaseServiceInterface;
use Illuminate\Http\Request;

interface PostServiceInterface extends BaseServiceInterface{
    
    /**
     * Format request data cho frontend React (hỗ trợ MultiSelect hiển thị checked state)
     * 
     * @param Request $request
     * @return array
     */
    public function formatRequestDataForFrontend(Request $request): array;
}