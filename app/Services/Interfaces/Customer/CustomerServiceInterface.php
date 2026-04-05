<?php 
namespace App\Services\Interfaces\Customer;
use App\Services\Interfaces\BaseServiceInterface;

interface CustomerServiceInterface extends BaseServiceInterface{
    public function updatePassword(\Illuminate\Http\Request $request, int $id): bool;
}
