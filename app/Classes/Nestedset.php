<?php  
namespace App\Classes;
use Illuminate\Support\Facades\DB;

class NestedSet {

    private $params;
    private $data;

    private $count;
    private $count_level;
    private $lft;
    private $rgt;
    private $level;
    private $checked;


    public function __construct(array $params = [])
    {
        $this->params = $params;
        $this->data = null;
        $this->count = 0;
        $this->count_level = 0;
        $this->lft = [];
        $this->rgt = [];
        $this->level = [];
        $this->checked = [];
    }

    public function get(){
        $table = $this->params['table'];
        $foreigKey = $this->params['foreigKey'];
        $pivotTable = $this->params['pivotTable'];

        $result = DB::table("$table as tb1")
        ->select(['tb1.id', 'tb2.name', 'tb1.parent_id', 'tb1.lft', 'tb1.rgt', 'tb1.level'])
        ->join("$pivotTable as tb2", 'tb1.id', '=', "tb2.$foreigKey")
        ->where('tb2.language_id', '=', config('app.language_id'))->whereNull('deleted_at')->orderBy('tb1.lft', 'asc')->get();
        $this->data = $result;
    }

    
    public function set(){
        $array = [];
        if(isset($this->data) && count($this->data)){
            foreach($this->data as $key => $val){
                $parentId = $val->parent_id ?? 0;
                $array[$val->id][$parentId] = 1;
                $array[$parentId][$val->id] = 1;
            }
        }
        return $array;
    }

    public function recursive($start = 0, $array = []){
        $this->lft[$start] = ++$this->count;
        $this->level[$start] = $this->count_level;
        if(isset($array) && is_array($array) && count($array)){
            foreach($array as $key => $val){
                if((isset($array[$start][$key]) || isset($array[$key][$start])) && (!isset($this->checked[$key][$start]) && !isset($this->checked[$start][$key]))){
                    $this->count_level++;
                    $this->checked[$start][$key] = 1;
                    $this->checked[$key][$start] = 1;
                    $this->recursive($key, $array);
                    $this->count_level--;
                }
            }
        }
        $this->rgt[$start] = ++$this->count;
    }

    public function action(){
        if(isset($this->lft) && is_array($this->lft) && isset($this->rgt) && is_array($this->rgt) && isset($this->level) && count($this->level)){
            $data = [];
            foreach($this->lft as $key => $val){
                if($key == 0 ) continue;
                $data[] = [
                    'id' => $key,
                    'lft' => $val,
                    'rgt' => $this->rgt[$key],
                    'level' => $this->level[$key],
                ];
            }
            if(is_array($data) && count($data)){
                DB::table($this->params['table'])->upsert($data, 'id', ['lft', 'rgt', 'level']);
            }
        }
    }

    public function dropdown(){
        $this->get();
        $temp = [];
        // Thêm [Root] vào đầu mảng để giữ thứ tự
        $temp[] = ['value' => '0', 'label' => '[Root]'];
        if(isset($this->data) && count($this->data)){
            foreach($this->data as $key => $val){
                // Trả về array thay vì object để giữ nguyên thứ tự lft asc
                $temp[] = [
                    'value' => (string)$val->id,
                    'label' => str_repeat('|-----', (($val->level > 0) ? $val->level - 1 : 0)).$val->name
                ];
            }
        }
        return $temp;
    }
}