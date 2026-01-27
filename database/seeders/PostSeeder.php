<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Post;
use App\Models\PostCatalogue;
use App\Models\Language;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class PostSeeder extends Seeder
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
        }

        config(['app.language_id' => $language->id]);

        // Lấy các danh mục đã có
        $catalogues = PostCatalogue::with('current_languages')->get();
        if ($catalogues->isEmpty()) {
            $this->command->warn('Chưa có danh mục nào. Vui lòng chạy PostCatalogueSeeder trước!');
            return;
        }

        // Tạo map danh mục theo tên để dễ gán
        $catalogueMap = [];
        foreach ($catalogues as $cat) {
            $name = $cat->current_languages->first()?->pivot->name ?? 'Unknown';
            $catalogueMap[$name] = $cat->id;
        }

        // CHỈ xóa dữ liệu trong module posts
        DB::table('post_catalogue_post')->whereIn('post_id', function($query) {
            $query->select('id')->from('posts');
        })->delete();
        DB::table('routers')->where('module', 'posts')->delete();
        DB::table('post_language')->delete();
        DB::table('posts')->delete();
        $this->command->info('Cleared existing posts data only');

        // Dữ liệu bài viết mẫu về bóng đá
        $posts = [
            // Bài viết về V-League
            [
                'name' => 'V-League 2024: Đội bóng nào sẽ vô địch?',
                'description' => 'Phân tích chi tiết về các ứng viên vô địch V-League 2024',
                'content' => '<p>V-League 2024 đang diễn ra với nhiều bất ngờ. Các đội bóng hàng đầu như Hà Nội FC, Viettel, Hoàng Anh Gia Lai đang cạnh tranh quyết liệt cho chức vô địch.</p><p>Với sự đầu tư mạnh mẽ từ các nhà tài trợ, giải đấu năm nay hứa hẹn sẽ rất hấp dẫn.</p>',
                'canonical' => 'v-league-2024-doi-bong-nao-se-vo-dich',
                'meta_title' => 'V-League 2024: Dự đoán đội vô địch',
                'meta_description' => 'Phân tích và dự đoán đội bóng sẽ vô địch V-League 2024',
                'catalogues' => ['V-League', 'Giải đấu trong nước'],
                'image' => 'https://media.vov.vn/sites/default/files/styles/large/public/2024-10/phan_van_giang_1.jpg',
            ],
            [
                'name' => 'Lịch thi đấu V-League 2024 - Vòng 15',
                'description' => 'Cập nhật lịch thi đấu và kết quả vòng 15 V-League 2024',
                'content' => '<p>Vòng 15 V-League 2024 sẽ diễn ra vào cuối tuần này với nhiều trận đấu hấp dẫn.</p>',
                'canonical' => 'lich-thi-dau-v-league-2024-vong-15',
                'meta_title' => 'Lịch thi đấu V-League 2024 vòng 15',
                'meta_description' => 'Xem lịch thi đấu và kết quả các trận đấu V-League 2024 vòng 15',
                'catalogues' => ['V-League'],
                'image' => 'https://media.vov.vn/sites/default/files/styles/large/public/2024-10/phan_van_giang_1.jpg',
            ],
            // Bài viết về Đội tuyển Việt Nam
            [
                'name' => 'Đội tuyển Việt Nam chuẩn bị cho vòng loại World Cup 2026',
                'description' => 'HLV Philippe Troussier và các cầu thủ đang tích cực chuẩn bị cho vòng loại World Cup',
                'content' => '<p>Đội tuyển Việt Nam đang trong quá trình chuẩn bị kỹ lưỡng cho vòng loại World Cup 2026.</p><p>HLV Philippe Troussier đã công bố danh sách 30 cầu thủ được triệu tập.</p>',
                'canonical' => 'doi-tuyen-viet-nam-chuan-bi-cho-vong-loai-world-cup-2026',
                'meta_title' => 'Đội tuyển Việt Nam chuẩn bị World Cup 2026',
                'meta_description' => 'Tin tức mới nhất về đội tuyển Việt Nam chuẩn bị cho vòng loại World Cup 2026',
                'catalogues' => ['Đội tuyển Việt Nam', 'World Cup'],
                'image' => 'https://media.vov.vn/sites/default/files/styles/large/public/2024-10/phan_van_giang_1.jpg',
            ],
            [
                'name' => 'Nguyễn Quang Hải trở lại đội tuyển Việt Nam',
                'description' => 'Tiền vệ Nguyễn Quang Hải chính thức trở lại đội tuyển sau thời gian dài vắng mặt',
                'content' => '<p>Nguyễn Quang Hải đã có màn trình diễn ấn tượng tại CLB Pau FC và được HLV Troussier triệu tập trở lại.</p>',
                'canonical' => 'nguyen-quang-hai-tro-lai-doi-tuyen-viet-nam',
                'meta_title' => 'Nguyễn Quang Hải trở lại đội tuyển',
                'meta_description' => 'Tin tức về việc Nguyễn Quang Hải trở lại đội tuyển Việt Nam',
                'catalogues' => ['Đội tuyển Việt Nam', 'Cầu thủ Việt Nam'],
                'image' => 'https://media.vov.vn/sites/default/files/styles/large/public/2024-10/phan_van_giang_1.jpg',
            ],
            // Bài viết về Bóng đá Quốc tế
            [
                'name' => 'World Cup 2026: Các đội bóng châu Á có cơ hội nào?',
                'description' => 'Phân tích cơ hội của các đội bóng châu Á tại World Cup 2026',
                'content' => '<p>World Cup 2026 sẽ được tổ chức tại Mỹ, Canada và Mexico với 48 đội tham dự.</p><p>Các đội bóng châu Á như Nhật Bản, Hàn Quốc, Iran có cơ hội tốt để tiến xa.</p>',
                'canonical' => 'world-cup-2026-cac-doi-bong-chau-a-co-co-hoi-nao',
                'meta_title' => 'World Cup 2026: Cơ hội của các đội châu Á',
                'meta_description' => 'Phân tích cơ hội của các đội bóng châu Á tại World Cup 2026',
                'catalogues' => ['Bóng đá Quốc tế', 'World Cup'],
                'image' => 'https://media.vov.vn/sites/default/files/styles/large/public/2024-10/phan_van_giang_1.jpg',
            ],
            [
                'name' => 'Champions League 2024: Real Madrid vs Manchester City',
                'description' => 'Trận đấu tứ kết Champions League giữa Real Madrid và Manchester City',
                'content' => '<p>Real Madrid và Manchester City sẽ đối đầu trong trận tứ kết Champions League 2024.</p><p>Đây là trận đấu được mong đợi nhất vòng tứ kết.</p>',
                'canonical' => 'champions-league-2024-real-madrid-vs-manchester-city',
                'meta_title' => 'Champions League: Real Madrid vs Manchester City',
                'meta_description' => 'Tin tức và phân tích trận đấu Real Madrid vs Manchester City tại Champions League',
                'catalogues' => ['Bóng đá Quốc tế', 'Champions League'],
                'image' => 'https://media.vov.vn/sites/default/files/styles/large/public/2024-10/phan_van_giang_1.jpg',
            ],
            [
                'name' => 'Lionel Messi giành Quả bóng vàng 2024',
                'description' => 'Lionel Messi tiếp tục giành Quả bóng vàng lần thứ 8 trong sự nghiệp',
                'content' => '<p>Lionel Messi đã giành Quả bóng vàng 2024 sau mùa giải xuất sắc tại Inter Miami.</p><p>Đây là danh hiệu Quả bóng vàng thứ 8 trong sự nghiệp của anh.</p>',
                'canonical' => 'lionel-messi-gianh-qua-bong-vang-2024',
                'meta_title' => 'Lionel Messi giành Quả bóng vàng 2024',
                'meta_description' => 'Tin tức về việc Lionel Messi giành Quả bóng vàng 2024',
                'catalogues' => ['Bóng đá Quốc tế', 'Cầu thủ Quốc tế'],
                'image' => 'https://media.vov.vn/sites/default/files/styles/large/public/2024-10/phan_van_giang_1.jpg',
            ],
            [
                'name' => 'Euro 2024: Pháp đánh bại Đức trong trận mở màn',
                'description' => 'Đội tuyển Pháp đã đánh bại chủ nhà Đức với tỷ số 2-1 trong trận mở màn Euro 2024',
                'content' => '<p>Euro 2024 đã khởi tranh với trận đấu mở màn giữa Pháp và Đức.</p><p>Kylian Mbappé ghi bàn thắng quyết định giúp Pháp giành chiến thắng 2-1.</p>',
                'canonical' => 'euro-2024-phap-danh-bai-duc-trong-tran-mo-man',
                'meta_title' => 'Euro 2024: Pháp đánh bại Đức',
                'meta_description' => 'Kết quả và tin tức trận đấu mở màn Euro 2024 giữa Pháp và Đức',
                'catalogues' => ['Bóng đá Quốc tế', 'Euro'],
                'image' => 'https://media.vov.vn/sites/default/files/styles/large/public/2024-10/phan_van_giang_1.jpg',
            ],
            // Bài viết về Cầu thủ
            [
                'name' => 'Nguyễn Công Phượng: Hành trình từ làng quê đến sân cỏ quốc tế',
                'description' => 'Câu chuyện đầy cảm hứng về hành trình của Nguyễn Công Phượng',
                'content' => '<p>Nguyễn Công Phượng đã trải qua một hành trình đầy gian nan từ làng quê đến sân cỏ quốc tế.</p><p>Anh là nguồn cảm hứng cho nhiều cầu thủ trẻ Việt Nam.</p>',
                'canonical' => 'nguyen-cong-phuong-hanh-trinh-tu-lang-que-den-san-co-quoc-te',
                'meta_title' => 'Nguyễn Công Phượng: Hành trình đến sân cỏ quốc tế',
                'meta_description' => 'Câu chuyện về hành trình của Nguyễn Công Phượng từ làng quê đến sân cỏ quốc tế',
                'catalogues' => ['Cầu thủ Việt Nam'],
                'image' => 'https://media.vov.vn/sites/default/files/styles/large/public/2024-10/phan_van_giang_1.jpg',
            ],
            [
                'name' => 'Erling Haaland: Cỗ máy ghi bàn của Manchester City',
                'description' => 'Phân tích phong độ và kỹ thuật của Erling Haaland tại Manchester City',
                'content' => '<p>Erling Haaland đã trở thành cỗ máy ghi bàn không thể ngăn cản của Manchester City.</p><p>Với 50 bàn thắng trong mùa giải, anh đã phá vỡ nhiều kỷ lục.</p>',
                'canonical' => 'erling-haaland-co-may-ghi-ban-cua-manchester-city',
                'meta_title' => 'Erling Haaland: Cỗ máy ghi bàn',
                'meta_description' => 'Phân tích về phong độ và kỹ thuật của Erling Haaland tại Manchester City',
                'catalogues' => ['Cầu thủ Quốc tế'],
                'image' => 'https://media.vov.vn/sites/default/files/styles/large/public/2024-10/phan_van_giang_1.jpg',
            ],
            [
                'name' => 'Đỗ Hùng Dũng: Người đội trưởng của đội tuyển Việt Nam',
                'description' => 'Đỗ Hùng Dũng đã chứng minh mình xứng đáng là đội trưởng của đội tuyển Việt Nam',
                'content' => '<p>Đỗ Hùng Dũng đã thể hiện vai trò lãnh đạo xuất sắc trong đội tuyển Việt Nam.</p><p>Anh là trụ cột không thể thiếu của đội bóng.</p>',
                'canonical' => 'do-hung-dung-nguoi-doi-truong-cua-doi-tuyen-viet-nam',
                'meta_title' => 'Đỗ Hùng Dũng: Đội trưởng đội tuyển Việt Nam',
                'meta_description' => 'Tin tức về Đỗ Hùng Dũng - đội trưởng của đội tuyển Việt Nam',
                'catalogues' => ['Đội tuyển Việt Nam', 'Cầu thủ Việt Nam'],
                'image' => 'https://media.vov.vn/sites/default/files/styles/large/public/2024-10/phan_van_giang_1.jpg',
            ],
            // Thêm một số bài viết khác
            [
                'name' => 'Phân tích chiến thuật: Tiki-taka vs Gegenpressing',
                'description' => 'So sánh hai phong cách chơi bóng nổi tiếng: Tiki-taka và Gegenpressing',
                'content' => '<p>Tiki-taka và Gegenpressing là hai phong cách chơi bóng hoàn toàn khác biệt.</p><p>Mỗi phong cách đều có ưu và nhược điểm riêng.</p>',
                'canonical' => 'phan-tich-chien-thuat-tiki-taka-vs-gegenpressing',
                'meta_title' => 'Phân tích: Tiki-taka vs Gegenpressing',
                'meta_description' => 'So sánh và phân tích hai phong cách chơi bóng Tiki-taka và Gegenpressing',
                'catalogues' => ['Bóng đá Quốc tế'],
                'image' => 'https://media.vov.vn/sites/default/files/styles/large/public/2024-10/phan_van_giang_1.jpg',
            ],
            [
                'name' => 'VAR trong bóng đá: Lợi ích và tranh cãi',
                'description' => 'Phân tích về công nghệ VAR và những tranh cãi xung quanh nó',
                'content' => '<p>VAR đã thay đổi cách bóng đá được điều hành, nhưng cũng gây ra nhiều tranh cãi.</p>',
                'canonical' => 'var-trong-bong-da-loi-ich-va-tranh-cai',
                'meta_title' => 'VAR trong bóng đá: Lợi ích và tranh cãi',
                'meta_description' => 'Phân tích về công nghệ VAR và những ảnh hưởng của nó đến bóng đá',
                'catalogues' => ['Bóng đá Quốc tế'],
                'image' => 'https://media.vov.vn/sites/default/files/styles/large/public/2024-10/phan_van_giang_1.jpg',
            ],
            [
                'name' => 'U23 Việt Nam: Chuẩn bị cho SEA Games 2025',
                'description' => 'Đội U23 Việt Nam đang tích cực chuẩn bị cho SEA Games 2025',
                'content' => '<p>Đội U23 Việt Nam đã bắt đầu tập luyện cho SEA Games 2025.</p><p>HLV Hoàng Anh Tuấn đã công bố danh sách 23 cầu thủ.</p>',
                'canonical' => 'u23-viet-nam-chuan-bi-cho-sea-games-2025',
                'meta_title' => 'U23 Việt Nam chuẩn bị SEA Games 2025',
                'meta_description' => 'Tin tức về đội U23 Việt Nam chuẩn bị cho SEA Games 2025',
                'catalogues' => ['Đội tuyển Việt Nam'],
                'image' => 'https://media.vov.vn/sites/default/files/styles/large/public/2024-10/phan_van_giang_1.jpg',
            ],
            [
                'name' => 'Top 10 cầu thủ trẻ triển vọng nhất thế giới 2024',
                'description' => 'Danh sách 10 cầu thủ trẻ đầy triển vọng nhất thế giới năm 2024',
                'content' => '<p>Năm 2024 chứng kiến sự xuất hiện của nhiều tài năng trẻ đầy triển vọng.</p><p>Jude Bellingham, Pedri, Gavi là những cái tên nổi bật.</p>',
                'canonical' => 'top-10-cau-thu-tre-trien-vong-nhat-the-gioi-2024',
                'meta_title' => 'Top 10 cầu thủ trẻ triển vọng nhất 2024',
                'meta_description' => 'Danh sách 10 cầu thủ trẻ đầy triển vọng nhất thế giới năm 2024',
                'catalogues' => ['Cầu thủ Quốc tế'],
                'image' => 'https://media.vov.vn/sites/default/files/styles/large/public/2024-10/phan_van_giang_1.jpg',
            ],
            [
                'name' => 'Lịch sử World Cup: Những khoảnh khắc đáng nhớ',
                'description' => 'Những khoảnh khắc đáng nhớ nhất trong lịch sử World Cup',
                'content' => '<p>World Cup đã chứng kiến nhiều khoảnh khắc lịch sử đáng nhớ.</p><p>Từ bàn thắng của Maradona đến chiến thắng của Đức năm 2014.</p>',
                'canonical' => 'lich-su-world-cup-nhung-khoanh-khac-dang-nho',
                'meta_title' => 'Lịch sử World Cup: Những khoảnh khắc đáng nhớ',
                'meta_description' => 'Tổng hợp những khoảnh khắc đáng nhớ nhất trong lịch sử World Cup',
                'catalogues' => ['Bóng đá Quốc tế', 'World Cup'],
                'image' => 'https://media.vov.vn/sites/default/files/styles/large/public/2024-10/phan_van_giang_1.jpg',
            ],
            [
                'name' => 'Europa League 2024: Liverpool vs AS Roma',
                'description' => 'Trận đấu bán kết Europa League giữa Liverpool và AS Roma',
                'content' => '<p>Liverpool và AS Roma sẽ đối đầu trong trận bán kết Europa League 2024.</p>',
                'canonical' => 'europa-league-2024-liverpool-vs-as-roma',
                'meta_title' => 'Europa League: Liverpool vs AS Roma',
                'meta_description' => 'Tin tức và phân tích trận đấu Liverpool vs AS Roma tại Europa League',
                'catalogues' => ['Bóng đá Quốc tế', 'Europa League'],
                'image' => 'https://media.vov.vn/sites/default/files/styles/large/public/2024-10/phan_van_giang_1.jpg',
            ],
            [
                'name' => 'Công Phượng ký hợp đồng với CLB Nhật Bản',
                'description' => 'Nguyễn Công Phượng chính thức ký hợp đồng với CLB Yokohama FC',
                'content' => '<p>Nguyễn Công Phượng đã chính thức ký hợp đồng với CLB Yokohama FC tại J-League.</p><p>Đây là bước tiến lớn trong sự nghiệp của anh.</p>',
                'canonical' => 'cong-phuong-ky-hop-dong-voi-clb-nhat-ban',
                'meta_title' => 'Công Phượng ký hợp đồng với CLB Nhật Bản',
                'meta_description' => 'Tin tức về việc Nguyễn Công Phượng ký hợp đồng với CLB Yokohama FC',
                'catalogues' => ['Cầu thủ Việt Nam'],
                'image' => 'https://media.vov.vn/sites/default/files/styles/large/public/2024-10/phan_van_giang_1.jpg',
            ],
            [
                'name' => 'Văn Hậu: Từ Hà Nội FC đến châu Âu',
                'description' => 'Hành trình của Đoàn Văn Hậu từ Hà Nội FC đến các CLB châu Âu',
                'content' => '<p>Đoàn Văn Hậu đã có hành trình ấn tượng từ Hà Nội FC đến các CLB châu Âu.</p>',
                'canonical' => 'van-hau-tu-ha-noi-fc-den-chau-au',
                'meta_title' => 'Văn Hậu: Từ Hà Nội FC đến châu Âu',
                'meta_description' => 'Câu chuyện về hành trình của Đoàn Văn Hậu từ Hà Nội FC đến châu Âu',
                'catalogues' => ['Cầu thủ Việt Nam'],
                'image' => 'https://media.vov.vn/sites/default/files/styles/large/public/2024-10/phan_van_giang_1.jpg',
            ],
            [
                'name' => 'Phân tích: Tại sao bóng đá Việt Nam đang phát triển?',
                'description' => 'Phân tích các yếu tố giúp bóng đá Việt Nam phát triển mạnh mẽ',
                'content' => '<p>Bóng đá Việt Nam đã có những bước tiến vượt bậc trong những năm gần đây.</p><p>Đầu tư vào đào tạo trẻ, cơ sở hạ tầng và HLV nước ngoài là những yếu tố quan trọng.</p>',
                'canonical' => 'phan-tich-tai-sao-bong-da-viet-nam-dang-phat-trien',
                'meta_title' => 'Tại sao bóng đá Việt Nam đang phát triển?',
                'meta_description' => 'Phân tích các yếu tố giúp bóng đá Việt Nam phát triển mạnh mẽ',
                'catalogues' => ['Bóng đá Việt Nam'],
                'image' => 'https://media.vov.vn/sites/default/files/styles/large/public/2024-10/phan_van_giang_1.jpg',
            ],
        ];

        $createdCount = 0;
        foreach ($posts as $index => $postData) {
            // Lấy post_catalogue_id đầu tiên từ danh sách catalogues
            $postCatalogueId = null;
            $postCatalogueIds = [];
            
            foreach ($postData['catalogues'] as $catName) {
                if (isset($catalogueMap[$catName])) {
                    if (!$postCatalogueId) {
                        $postCatalogueId = $catalogueMap[$catName];
                    }
                    $postCatalogueIds[] = $catalogueMap[$catName];
                }
            }
            
            // Nếu không tìm thấy danh mục, lấy danh mục đầu tiên
            if (!$postCatalogueId && !$catalogues->isEmpty()) {
                $postCatalogueId = $catalogues->first()->id;
                $postCatalogueIds = [$postCatalogueId];
            }

            $post = Post::create([
                'post_catalogue_id' => $postCatalogueId,
                'user_id' => $user->id,
                'publish' => 2,
                'order' => $index + 1,
                'image' => $postData['image'] ?? null,
            ]);

            // Tạo dữ liệu trong post_language
            $canonical = $postData['canonical'] ?? Str::slug($postData['name']);
            
            // Kiểm tra canonical đã tồn tại chưa
            $baseCanonical = $canonical;
            $counter = 1;
            while (DB::table('post_language')->where('canonical', $canonical)->exists()) {
                $canonical = $baseCanonical . '-' . $counter;
                $counter++;
            }

            DB::table('post_language')->insert([
                'post_id' => $post->id,
                'language_id' => $language->id,
                'name' => $postData['name'],
                'canonical' => $canonical,
                'description' => $postData['description'] ?? null,
                'content' => $postData['content'] ?? null,
                'meta_title' => $postData['meta_title'] ?? $postData['name'],
                'meta_description' => $postData['meta_description'] ?? $postData['description'] ?? null,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            // Sync vào pivot table post_catalogue_post
            if (!empty($postCatalogueIds)) {
                $post->post_catalogues()->sync($postCatalogueIds);
            }

            // Tạo router cho post
            $routerableType = get_class($post);
            DB::table('routers')->updateOrInsert(
                [
                    'module' => 'posts',
                    'routerable_id' => $post->id,
                ],
                [
                    'routerable_type' => $routerableType,
                    'canonical' => $canonical,
                    'next_component' => 'PostPage',
                    'controller' => 'App\Http\Controllers\Frontend\Post\PostController',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );

            $createdCount++;
        }

        $this->command->info("Created {$createdCount} posts successfully!");
    }
}
