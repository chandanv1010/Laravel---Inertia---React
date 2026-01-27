<?php  
namespace App\Services\Interfaces;
use Illuminate\Http\Request;

interface BaseServiceInterface {
    public function save(Request $request, ?int $id = null);
    public function findById(int $id);
    public function paginate(Request $request);
    public function destroy($id);
    public function show(int $id);
    public function bulkDestroy(Request $request);
    public function bulkUpdate(Request $request);
    public function setWith(array $with = []): static;
}
