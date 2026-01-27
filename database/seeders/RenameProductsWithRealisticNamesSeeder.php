<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * RenameProductsWithRealisticNamesSeeder
 * 
 * Renames products with realistic Vietnamese names based on their category.
 * Does NOT modify product structure (variants, batches, etc.) - only updates names.
 */
class RenameProductsWithRealisticNamesSeeder extends Seeder
{
    /**
     * Realistic product names per category ID
     */
    protected array $productTemplates = [
        // 1: Sữa & Trứng
        1 => [
            'Sữa tươi TH True Milk 1L',
            'Sữa đặc Ông Thọ 380g',
            'Sữa chua Vinamilk không đường',
            'Trứng gà ta omega-3 (10 quả)',
            'Sữa hạt óc chó Milo 180ml',
            'Phô mai con bò cười (8 miếng)',
            'Trứng vịt muối (4 quả)',
            'Sữa bột Ensure Gold 850g',
            'Yaourt uống Probi các vị',
            'Trứng cút đã luộc (20 quả)',
        ],
        // 2: Đồ Ăn Vặt
        2 => [
            'Bánh Oreo vị Socola 133g',
            'Snack Lays khoai tây giòn',
            'Bánh gạo One One 150g',
            'Bánh quy Cosy Marie 320g',
            'Khô gà lá chanh 100g',
            'Hạt điều rang muối 200g',
            'Bánh tráng trộn sẵn',
            'Rong biển ăn liền Tao Kae Noi',
            'Bánh phồng tôm Sa Giang',
            'Đậu phộng da cá 150g',
        ],
        // 3: Thực Phẩm Đông Lạnh
        3 => [
            'Há cảo tôm thịt CP 500g',
            'Chả giò rế Vissan 500g',
            'Xúc xích tiệt trùng Vissan',
            'Bánh bao nhân thịt',
            'Cá basa fillet đông lạnh',
            'Tôm sú đông lạnh size 30-35',
            'Gà viên chiên giòn CP',
            'Sủi cảo Bibigo 350g',
            'Nem nướng Nha Trang',
            'Pizza đông lạnh 4P hải sản',
        ],
        // 4: Rau Củ Quả
        4 => [
            'Cà chua bi đỏ 500g',
            'Khoai tây Đà Lạt 1kg',
            'Cà rốt baby 300g',
            'Bắp cải trắng 1 cái',
            'Rau muống hữu cơ 300g',
            'Dưa leo baby 500g',
            'Bí đỏ Nhật 1kg',
            'Súp lơ xanh 400g',
            'Hành tây tím 500g',
            'Ớt chuông 3 màu 300g',
        ],
        // 5: Cá & Thịt
        5 => [
            'Thịt ba rọi heo 500g',
            'Cá hồi Na Uy fillet',
            'Thịt bò Úc thăn nội',
            'Cá thu một nắng',
            'Gà ta nguyên con',
            'Thịt nạc vai heo xay',
            'Cá diêu hồng tươi',
            'Sườn non heo 500g',
            'Cá bống mú fillet',
            'Thịt đùi gà góc tư',
        ],
        // 6: Bánh Ngọt
        6 => [
            'Bánh kem sinh nhật 20cm',
            'Bánh su kem nhân kem tươi',
            'Bánh tiramisu mini',
            'Cookies chocolate chip',
            'Bánh mousse xoài',
            'Bánh mì hoa cúc Pháp',
            'Donut đường phủ socola',
            'Macaron Pháp hộp 6 cái',
            'Bánh cuộn Thụy Sĩ',
            'Éclair cà phê',
        ],
        // 7: Đồ Uống & Nước Ép
        7 => [
            'Nước cam ép Teppy 1L',
            'Coca Cola lon 330ml',
            'Trà xanh C2 không đường',
            'Nước khoáng Lavie 500ml',
            'Sting dâu lon 330ml',
            'Nước dừa tươi Cocoxim',
            'Cà phê sữa Highlands lon',
            'Nước ép táo Vfresh 1L',
            'Sữa đậu nành Vinasoy',
            'Red Bull lon 250ml',
        ],
        // 8: Thức Ăn Thú Cưng
        8 => [
            'Thức ăn hạt cho chó Royal Canin',
            'Pate Whiskas cho mèo 85g',
            'Bánh thưởng cho chó Pedigree',
            'Cát vệ sinh mèo 5L',
            'Thức ăn cá cảnh Tetra',
            'Snack gà sấy cho mèo',
            'Thức ăn chó con SmartHeart',
            'Sữa tắm Pet Clean 500ml',
            'Cỏ mèo organic',
            'Thức ăn hamster 500g',
        ],
        // 9: Trái Cây Tươi
        9 => [
            'Xoài cát Hòa Lộc 1kg',
            'Dưa hấu không hạt',
            'Nho xanh Mỹ 500g',
            'Táo Envy New Zealand',
            'Chuối già Nam Mỹ 1kg',
            'Cam sành Vĩnh Long',
            'Dâu tây Đà Lạt hộp',
            'Kiwi vàng Zespri',
            'Lê Hàn Quốc',
            'Bưởi da xanh 1 trái',
        ],
        // 10: Kẹo & Socola
        10 => [
            'Socola Lindt Excellence 100g',
            'Kẹo dẻo Haribo 80g',
            'Kẹo sữa mềm Alpenliebe',
            'Socola Ferrero Rocher 16 viên',
            'Kẹo cao su Big Babol',
            'Socola KitKat 4 thanh',
            'Kẹo bạc hà Mentos',
            'Hộp socola Toblerone',
            'Kẹo mút Chupa Chups',
            'M&M đậu phộng 100g',
        ],
        // 11: Gia Vị & Nước Chấm
        11 => [
            'Nước mắm Nam Ngư 500ml',
            'Dầu ăn Neptune 1L',
            'Nước tương Maggi 700ml',
            'Hạt nêm Knorr 900g',
            'Muối i-ốt tinh Bạc Liêu',
            'Đường tinh luyện Biên Hòa',
            'Tương ớt Chinsu 500g',
            'Bột ngọt Ajinomoto 400g',
            'Giấm táo Heinz 500ml',
            'Sốt mayonnaise Kewpie',
        ],
        // 12: Mì & Bún Phở
        12 => [
            'Mì Hảo Hảo tôm chua cay',
            'Phở bò ăn liền Vifon',
            'Mì Omachi xốt bò hầm',
            'Bún khô Safoco 500g',
            'Mì udon Nhật 200g',
            'Miến dong Việt Cường',
            'Mì Ý spaghetti Barilla',
            'Cháo ăn liền Cháo Xưa',
            'Mì Kokomi đại 90g',
            'Hủ tiếu Nam Vang gói',
        ],
        // 13: Bánh Mì & Ngũ Cốc
        13 => [
            'Bánh mì sandwich Kinh Đô',
            'Ngũ cốc Nestlé Koko Krunch',
            'Bánh mì gối toàn phần',
            'Yến mạch Quaker 500g',
            'Bột ngũ cốc dinh dưỡng',
            'Bánh mì baguette tươi',
            'Granola hạt hỗn hợp 300g',
            'Bánh mì hoa cúc Hạnh Phúc',
            'Cornflakes Nestlé 275g',
            'Muesli trộn trái cây khô',
        ],
        // 14: Đồ Hộp
        14 => [
            'Cá mòi sốt cà Lilly 155g',
            'Thịt heo hầm Hạ Long',
            'Đậu Hà Lan đóng hộp 400g',
            'Ngô ngọt lon Jolly 340g',
            'Pate gan heo Vissan',
            'Dưa chuột bao tử ngâm',
            'Cá ngừ ngâm dầu 185g',
            'Sốt cà chua Hunts 400g',
            'Nấm rơm đóng hộp',
            'Bò kho đóng lon Vissan',
        ],
        // 15: Hải Sản
        15 => [
            'Tôm sú biển size 20',
            'Mực ống tươi 500g',
            'Cua biển nguyên con',
            'Nghêu lụa 500g',
            'Ốc hương sống 500g',
            'Sò điệp Nhật 200g',
            'Bạch tuộc baby',
            'Hàu sữa Pacific',
            'Cá mú đen fillet',
            'Ghẹ xanh biển',
        ],
        // 16: Thịt Bò
        16 => [
            'Thịt bò Úc thăn ngoại',
            'Bò Wagyu A5 Nhật Bản',
            'Thịt bò xay Mỹ 500g',
            'Bắp bò Úc đông lạnh',
            'Thịt bò nạm 500g',
            'Bò tái chanh đã uớp',
            'Sườn bò Úc cắt lát',
            'Thịt bò cuộn rau',
            'Gân bò hầm sẵn',
            'Bò viên tươi 500g',
        ],
        // 17: Thịt Gà
        17 => [
            'Đùi gà ta góc tư',
            'Ức gà fillet 500g',
            'Cánh gà chiên sẵn CP',
            'Gà ta nguyên con',
            'Gà rán KFC đông lạnh',
            'Chân gà rút xương',
            'Gà viên chiên giòn',
            'Gà nướng nguyên con',
            'Lòng mề gà sạch',
            'Gà ác tiềm thuốc bắc',
        ],
        // 18: Thịt Heo
        18 => [
            'Sườn non heo 500g',
            'Ba rọi heo rút xương',
            'Thịt nạc vai xay 500g',
            'Giò lụa Vissan 500g',
            'Chả lụa Ponnie 300g',
            'Thịt đùi heo 1kg',
            'Móng giò heo',
            'Thịt heo quay giòn',
            'Xương ống heo 1kg',
            'Nem chua Thanh Hóa',
        ],
        // 19: Rau Xanh
        19 => [
            'Rau muống hữu cơ 300g',
            'Cải ngọt baby 200g',
            'Xà lách Mỹ curly',
            'Rau lang organic',
            'Cải thìa Đà Lạt',
            'Rau mồng tơi 300g',
            'Cải bó xôi baby',
            'Rau nhút tươi 200g',
            'Rau dền đỏ 300g',
            'Xà lách romaine',
        ],
        // 20: Củ Quả
        20 => [
            'Khoai lang mật 1kg',
            'Củ cải trắng 500g',
            'Bí đao xanh 1kg',
            'Củ nghệ tươi 200g',
            'Su hào Đà Lạt',
            'Củ gừng già 200g',
            'Khoai môn tím 1kg',
            'Sắn dây tươi 1kg',
            'Củ đậu 500g',
            'Củ sen tươi 300g',
        ],
        // 21: Đồ Khô & Đóng Hộp
        21 => [
            'Nấm hương khô 100g',
            'Mộc nhĩ đen 50g',
            'Tôm khô loại 1 100g',
            'Cá cơm khô 200g',
            'Măng khô 200g',
            'Hạt sen khô 500g',
            'Táo đỏ khô 500g',
            'Long nhãn khô 300g',
            'Ý dĩ hạt 500g',
            'Đậu xanh nguyên vỏ',
        ],
        // 22: Mỹ Phẩm
        22 => [
            'Son môi Maybelline Superstay',
            'Mascara LOréal Lash Paradise',
            'Phấn nền Revlon ColorStay',
            'Chì kẻ mày Innisfree',
            'Phấn má hồng Etude House',
            'Son tint Romand Juicy',
            'Kem che khuyết điểm Catrice',
            'Phấn mắt Urban Decay',
            'Son dưỡng Vaseline',
            'Tẩy trang Garnier Micellar',
        ],
        // 23: Chăm Sóc Da
        23 => [
            'Kem chống nắng Anessa 60ml',
            'Sữa rửa mặt Senka 120g',
            'Serum Vitamin C Klairs',
            'Kem dưỡng ẩm Cetaphil',
            'Mặt nạ đất sét Innisfree',
            'Toner rau má Some By Mi',
            'Kem mắt Kiehl\'s Avocado',
            'Sữa tắm Dove 500ml',
            'Dầu gội Clear 650ml',
            'Kem dưỡng thể Nivea',
        ],
        // 24: Thực Phẩm Chức Năng
        24 => [
            'Vitamin C DHC 90 viên',
            'Viên uống Collagen Shiseido',
            'Omega-3 fish oil 1000mg',
            'Vitamin E 400IU Blackmores',
            'Canxi D3 bổ sung xương',
            'Viên uống tăng cường trí nhớ',
            'Kẽm hữu cơ Nature Made',
            'Vitamin tổng hợp Centrum',
            'Sữa ong chúa Royal Jelly',
            'Tảo xoắn Spirulina 500mg',
        ],
    ];

    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $languageId = config('app.language_id', 1);
        
        // Get products with their catalogue
        $products = DB::table('products')
            ->select('products.id', 'products.product_catalogue_id')
            ->orderBy('products.id')
            ->get();
        
        if ($products->isEmpty()) {
            $this->command->warn('No products found. Please run ProductSeeder first.');
            return;
        }

        $this->command->info("Renaming {$products->count()} products with realistic names...");

        // Track used names per category to avoid duplicates
        $usedNamesPerCategory = [];
        $categoryCounters = [];
        
        $updated = 0;
        foreach ($products as $product) {
            $catalogueId = $product->product_catalogue_id;
            
            // Initialize tracking for this category
            if (!isset($usedNamesPerCategory[$catalogueId])) {
                $usedNamesPerCategory[$catalogueId] = [];
                $categoryCounters[$catalogueId] = 0;
            }
            
            // Get available templates for this category
            $templates = $this->productTemplates[$catalogueId] ?? $this->productTemplates[1];
            $templateCount = count($templates);
            
            // Get next name (cycle through templates, add suffix for duplicates)
            $baseIndex = $categoryCounters[$catalogueId] % $templateCount;
            $cycleCount = floor($categoryCounters[$catalogueId] / $templateCount);
            
            $baseName = $templates[$baseIndex];
            $productName = $cycleCount > 0 
                ? $baseName . ' #' . ($cycleCount + 1)
                : $baseName;
            
            $categoryCounters[$catalogueId]++;
            
            // Generate new canonical
            $canonical = Str::slug($productName) . '-' . $product->id;
            
            // Update product_language table (only name, canonical, meta fields)
            DB::table('product_language')
                ->where('product_id', $product->id)
                ->where('language_id', $languageId)
                ->update([
                    'name' => $productName,
                    'canonical' => $canonical,
                    'meta_title' => $productName . ' - Giá tốt nhất',
                    'meta_keyword' => $productName . ', mua ' . strtolower($productName),
                    'meta_description' => 'Mua ' . $productName . ' chất lượng cao, giá tốt nhất. Giao hàng nhanh, đảm bảo chất lượng.',
                    'updated_at' => now(),
                ]);
            
            // Update router canonical
            DB::table('routers')
                ->where('module', 'products')
                ->where('routerable_id', $product->id)
                ->update([
                    'canonical' => $canonical,
                    'updated_at' => now(),
                ]);
            
            $updated++;
        }

        $this->command->info("✅ Renamed {$updated} products with realistic Vietnamese names!");
    }
}
