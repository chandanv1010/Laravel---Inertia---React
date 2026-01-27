<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Traits\HasGenerate;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;

class GenerateSingleModule extends Command
{

    use HasGenerate;

    private $module;
    private $namespace;
    private $version;
    private $table;
    private $moduleName;

    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'make:crud {module} {--namespace=: The namespace CRUD struture} {--v=: Module Version} {--table=:} {--name=:}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Command description';

    /**
     * Execute the console command.
     */

    protected function setModule(string $module = ''): static {
        $this->module = $module;
        return $this;
    }

    protected function setNamespace(string $namespace = ''): static {
        $this->namespace = $namespace;
        return $this;
    }

    protected function setVersion(string $version = 'V1'): static {
        $this->version = $version;
        return $this;
    }

    protected function setTable(string $table = ''): static {
        $this->table = $table;
        return $this;
    }

    protected function setModuleName(string $name = ''): static {
        $this->moduleName = $name;
        return $this;
    }

    public function handle()
    {
        try {
            
            $this->setModule($this->argument('module'))
            ->setNamespace($this->option('namespace'))
            ->setVersion($this->option('v'))
            ->setTable($this->option('table'))
            ->setModuleName($this->option('name'))
            ->generateController()
            ->generateModel()
            ->generateRequest()
            ->generateService()
            ->generateServiceInterface()
            ->generateRepo()
            ->generateView()
            ->generateMigrationFile()
            ->generatePermissionData();

            $this->line("🎉 Đã tạo thành công các file cho module: {$this->module}");
            $this->line("📁 Namespace: {$this->namespace}");

        } catch (\Throwable $th) {
            $this->error("❌ Có lỗi xảy ra: ". $th->getMessage());
            return Command::FAILURE;
        }
    }


    private function generateRequest(): static {
        $target = app_path("Http/Requests/{$this->namespace}/{$this->module}");
        File::ensureDirectoryExists($target);

        $stubs = [
            'bulk-destroy-request' => 'BulkDestroyRequest',
            'bulk-update-request' => 'BulkUpdateRequest',
            'store-request' => 'StoreRequest',
            'update-request' => 'UpdateRequest'
        ];

        $snake_module = Str::snake($this->module);
        $extends = [
            [
                '{{snake_module}}'
            ],
            [
                $snake_module
            ]
        ];

        foreach($stubs as $key =>  $filename){
            $stub = $this->getStub("common/{$key}");
            $destination = "{$target}/{$filename}.php";
            $content = $this->createContent($stub, $extends);
            $this->put($destination, $content);
        }
        return $this;
    }
    
    public function generateService(): static {
        $filename = 'common/service';
        $stub = $this->getStub($filename);
        $target = app_path("Services/Impl/{$this->version}/{$this->namespace}");
        $destination = "{$target}/{$this->module}Service.php";
        File::ensureDirectoryExists($target);
        $content = $this->createContent($stub);
        $this->put($destination, $content);
        return $this;
    }

    public function generateServiceInterface(): static {
        $filename = 'common/service-interface';
        $stub = $this->getStub($filename);
        $target = app_path("Services/Interfaces/{$this->namespace}");
        File::ensureDirectoryExists($target);
        $destination = "{$target}/{$this->module}ServiceInterface.php";
        $content = $this->createContent($stub);
        $this->put($destination, $content);

        return $this;
    }

    public function generateView(): static {
        $snake_module = Str::snake($this->module);
        $snake_namespace = Str::snake($this->namespace);
        $target = resource_path("js/pages/backend/{$snake_namespace}/{$snake_module}");
        File::ensureDirectoryExists($target);

        $stubs = ['index', 'save'];
        $extends = [
            [
                '{{snake_module}}',
                '{{module_name}}'
            ],
            [
                $snake_module,
                $this->moduleName
            ]
        ];

        foreach($stubs as $key => $filename){
            $stub = $this->getStub("common/{$filename}");
            $destination = "{$target}/{$filename}.tsx";
            $content = $this->createContent($stub, $extends);
            $this->put($destination, $content);
        }

        return $this;
    }

    public function generateMigrationFile(): static {
        $filename = 'common/migration';
        $stub = $this->getStub($filename);
        $timestamp = date('Y_m_d_His');
        $migrationName = "create_{$this->table}_table";
        $migrationFileName = "{$timestamp}_{$migrationName}.php";
        $target = database_path("migrations");
        $destination = "{$target}/{$migrationFileName}";
        File::ensureDirectoryExists($target);
        $extends = [
            [
                '{{snake_module}}'
            ],
            [
                Str::snake($this->module)
            ]
        ];
        $content = $this->createContent($stub, $extends);
        $this->put($destination, $content);
        return $this;
    }

}

// php artisan app:generate-single-module Product --namespace=Product --version=V1