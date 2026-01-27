<?php  
namespace App\Traits;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;

trait HasGenerate {

    private function getStub(string $filepath = ''){
        return File::get(resource_path("stubs/{$filepath}.stub"));
    }

    private function put($destination, $content){
        if(!File::exists($destination)){
            File::put($destination, $content);
        }
    }

    private function createContent($content, ?array $extends = []){
        $newContent = str_replace(
            [
                '{{namespace}}',
                '{{module}}',
                '{{version}}',
                ...(isset($extends[0]) ? $extends[0] : [])
            ],
            [
                $this->namespace,
                $this->module,
                $this->version,
                ...(isset($extends[1]) ? $extends[1] : [])
            ],
            $content
        );

        return $newContent;
    }

    private function generateController(): static {
        $stub = $this->getStub('controller');
        $target = app_path("Http/Controllers/Backend/{$this->version}/{$this->namespace}");
        $destination = "{$target}/{$this->module}Controller.php";
        File::ensureDirectoryExists($target);
        $snake_module = Str::snake($this->module);
        $snake_namespace = Str::snake($this->namespace);

        $extends = [
            [
                '{{snake_namespace}}',
                '{{snake_module}}'
            ],
            [
                $snake_namespace,
                $snake_module
            ]
        ];

        $content = $this->createContent($stub, $extends);
        $this->put($destination, $content);
        return $this;
    }

    private function generateModel(): static {
        $stub = $this->getStub('model');
        $target = app_path("Models");
        $destination = "{$target}/{$this->module}.php";
        File::ensureDirectoryExists($target);
        
        $content = $this->createContent($stub);
        $this->put($destination, $content);

        return $this;
    }

    private function generateRepo(): static{
        $stub = $this->getStub('repository');
        $target = app_path("Repositories/{$this->namespace}");
        $destination = "{$target}/{$this->module}Repo.php";
        File::ensureDirectoryExists($target);
        
        $content = $this->createContent($stub);
        $this->put($destination, $content);
        return $this;
    }

    private function generatePermissionData(): static {
        try {
            DB::beginTransaction();
            $snake_module = Str::snake($this->module);// user_catalogue UserCatalogue user -> user
            $display_name = $this->moduleName ?: $snake_module;

            $permissions = [
                [
                    'name' => "Xem danh sách {$display_name}",
                    'canonical' => "{$snake_module}:index",
                    'publish' => 2,
                    'description' => "Cho phép xem danh sách {$display_name}",
                    'created_at' => now(),
                    'updated_at' => now(),
                    'user_id' => 33,
                ],
                [
                    'name' => "Tạo mới {$display_name}",
                    'canonical' => "{$snake_module}:store",
                    'publish' => 2,
                    'description' => "Cho phép tạo mới {$display_name}",
                    'created_at' => now(),
                    'updated_at' => now(),
                    'user_id' => 33,
                ],
                [
                    'name' => "Cập nhật {$display_name}",
                    'canonical' => "{$snake_module}:update",
                    'publish' => 2,
                    'description' => "Cho phép cập nhật {$display_name}",
                    'created_at' => now(),
                    'updated_at' => now(),
                    'user_id' => 33,
                ],
                [
                    'name' => "Xóa {$display_name}",
                    'canonical' => "{$snake_module}:delete",
                    'publish' => 2,
                    'description' => "Cho phép xóa {$display_name}",
                    'created_at' => now(),
                    'updated_at' => now(),
                    'user_id' => 33,
                ],
                [
                    'name' => "Xóa nhiều bản ghi {$display_name}",
                    'canonical' => "{$snake_module}:bulkDestroy",
                    'publish' => 2,
                    'description' => "Cho phép xóa nhiều {$display_name}",
                    'created_at' => now(),
                    'updated_at' => now(),
                    'user_id' => 33,
                ],
                [
                    'name' => "Cập nhật nhiều bản ghi {$display_name}",
                    'canonical' => "{$snake_module}:bulkUpdate",
                    'publish' => 2,
                    'description' => "Cho phép cập nhật nhiều {$display_name}",
                    'created_at' => now(),
                    'updated_at' => now(),
                    'user_id' => 33,
                ]
            ];

            DB::table('permissions')->insertOrIgnore($permissions);
            DB::commit();

        } catch (\Throwable $th) {
            $this->error("❌ Có lỗi xảy ra: ". $th->getMessage());
            DB::rollBack();
        }


        return $this;
    }

}