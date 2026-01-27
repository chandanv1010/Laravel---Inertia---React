<?php   
namespace Tests\Fakes;

use Illuminate\Database\Eloquent\Model;

class FakeModel extends Model {

    protected $guarded = [];
    public $timestamps = false;

    public function getRelationable(){
        return [];
    }

}