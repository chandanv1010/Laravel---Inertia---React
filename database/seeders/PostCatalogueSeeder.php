<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\PostCatalogue;
use App\Models\Language;
use App\Models\Router;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use App\Classes\NestedSet;

class PostCatalogueSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $user = User::first();
        if (!$user) {
            $user = User::create([
                'name' => 'Admin',
                'email' => 'admin@example.com',
                'password' => bcrypt('password'),
            ]);
        }

        $language = Language::where('canonical', config('app.locale', 'vi'))->first();
        if (!$language) {
            $language = Language::first();
        }
        if (!$language) {
            $language = Language::create([
                'name' => 'Tiếng Việt',
                'canonical' => 'vi',
                'image' => 'vi.png',
                'description' => 'Ngôn ngữ Tiếng Việt',
                'publish' => 1,
                'user_id' => $user->id,
            ]);
            $this->command->info('Created default language: ' . $language->name);
        }

        config(['app.language_id' => $language->id]);

        // CHỈ insert dữ liệu mới vào module PostCatalogue
        // KHÔNG xóa dữ liệu cũ để tránh ảnh hưởng đến các module khác

        $categories = [
            // Level 1 - Chuyên mục chính
            ['name' => 'Bóng đá Việt Nam', 'parent_id' => null, 'description' => 'Tin tức bóng đá Việt Nam, V-League, đội tuyển quốc gia'],
            ['name' => 'Bóng đá Quốc tế', 'parent_id' => null, 'description' => 'Tin tức bóng đá thế giới, các giải đấu quốc tế'],
            ['name' => 'Giải đấu', 'parent_id' => null, 'description' => 'Các giải đấu bóng đá trong nước và quốc tế'],
            ['name' => 'Cầu thủ', 'parent_id' => null, 'description' => 'Tin tức về các cầu thủ nổi tiếng'],
            
            // Level 2 - Bóng đá Việt Nam
            ['name' => 'V-League', 'parent_id' => 1, 'description' => 'Giải bóng đá vô địch quốc gia Việt Nam'],
            ['name' => 'Đội tuyển Quốc gia', 'parent_id' => 1, 'description' => 'Tin tức đội tuyển bóng đá quốc gia Việt Nam'],
            ['name' => 'U23 Việt Nam', 'parent_id' => 1, 'description' => 'Tin tức đội tuyển U23 Việt Nam'],
            ['name' => 'Bóng đá Nữ', 'parent_id' => 1, 'description' => 'Tin tức bóng đá nữ Việt Nam'],
            
            // Level 2 - Bóng đá Quốc tế
            ['name' => 'Premier League', 'parent_id' => 2, 'description' => 'Giải bóng đá Ngoại hạng Anh'],
            ['name' => 'La Liga', 'parent_id' => 2, 'description' => 'Giải bóng đá Tây Ban Nha'],
            ['name' => 'Serie A', 'parent_id' => 2, 'description' => 'Giải bóng đá Ý'],
            ['name' => 'Bundesliga', 'parent_id' => 2, 'description' => 'Giải bóng đá Đức'],
            ['name' => 'Ligue 1', 'parent_id' => 2, 'description' => 'Giải bóng đá Pháp'],
            
            // Level 2 - Giải đấu
            ['name' => 'World Cup', 'parent_id' => 3, 'description' => 'Giải vô địch bóng đá thế giới'],
            ['name' => 'Euro', 'parent_id' => 3, 'description' => 'Giải vô địch bóng đá châu Âu'],
            ['name' => 'Champions League', 'parent_id' => 3, 'description' => 'UEFA Champions League'],
            ['name' => 'Europa League', 'parent_id' => 3, 'description' => 'UEFA Europa League'],
            
            // Level 2 - Cầu thủ
            ['name' => 'Cầu thủ Việt Nam', 'parent_id' => 4, 'description' => 'Tin tức về các cầu thủ Việt Nam'],
            ['name' => 'Cầu thủ Quốc tế', 'parent_id' => 4, 'description' => 'Tin tức về các cầu thủ quốc tế'],
        ];

        $insertedIds = [];
        $parentMap = [null => 0];

        foreach ($categories as $index => $category) {
            $parentId = $category['parent_id'] ? ($parentMap[$category['parent_id']] ?? 0) : 0;
            
            $postCatalogue = PostCatalogue::create([
                'parent_id' => $parentId,
                'user_id' => $user->id,
                'publish' => 2,
                'type' => 'default',
                'order' => $index + 1,
            ]);

            $insertedIds[] = $postCatalogue->id;
            $parentMap[$index + 1] = $postCatalogue->id;

            $canonical = Str::slug($category['name']);
            
            // Kiểm tra canonical đã tồn tại chưa, nếu có thì thêm suffix
            $baseCanonical = $canonical;
            $counter = 1;
            while (DB::table('post_catalogue_language')->where('canonical', $canonical)->exists()) {
                $canonical = $baseCanonical . '-' . $counter;
                $counter++;
            }
            
            DB::table('post_catalogue_language')->updateOrInsert(
                [
                    'post_catalogue_id' => $postCatalogue->id,
                    'language_id' => $language->id,
                ],
                [
                    'name' => $category['name'],
                    'canonical' => $canonical,
                    'description' => $category['description'],
                    'content' => $category['description'],
                    'meta_title' => $category['name'] . ' - Tin tức bóng đá',
                    'meta_keyword' => $category['name'] . ', bóng đá, tin tức',
                    'meta_description' => $category['description'],
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );

            $routerableType = get_class($postCatalogue);
            Router::updateOrCreate(
                [
                    'module' => 'post_catalogues',
                    'routerable_id' => $postCatalogue->id,
                ],
                [
                    'canonical' => $canonical,
                    'routerable_type' => $routerableType,
                    'next_component' => 'PostCataloguePage',
                    'controller' => 'App\Http\Controllers\Frontend\Post\PostCatalogueController',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );
        }

        $this->command->info('Created ' . count($categories) . ' post catalogues');

        $this->runNestedSet();

        $this->command->info('NestedSet calculated successfully!');
    }

    private function runNestedSet()
    {
        $nestedset = new NestedSet([
            'table' => 'post_catalogues',
            'foreigKey' => 'post_catalogue_id',
            'pivotTable' => 'post_catalogue_language'
        ]);

        $nestedset->get();
        $nestedset->recursive(0, $nestedset->set());
        $nestedset->action();
    }
}

