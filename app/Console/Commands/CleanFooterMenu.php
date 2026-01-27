<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Menu;
use App\Models\MenuItem;

class CleanFooterMenu extends Command
{
    protected $signature = 'menu:clean-footer';
    protected $description = 'Xóa các menu item không cần thiết khỏi footer menu';

    public function handle()
    {
        $footerMenu = Menu::where('code', 'footer-menu')->first();
        
        if (!$footerMenu) {
            $this->error('Footer menu not found');
            return 1;
        }
        
        // Tìm và xóa các item "Bóng đá"
        $itemsToDelete = MenuItem::where('menu_id', $footerMenu->id)
            ->whereNull('parent_id')
            ->where('name', 'like', '%Bóng đá%')
            ->get();
        
        foreach ($itemsToDelete as $item) {
            $this->info("Deleting: {$item->name} (ID: {$item->id})");
            
            // Xóa children trước
            foreach ($item->children as $child) {
                $child->languages()->detach();
                $child->forceDelete();
            }
            
            // Detach translations và xóa item
            $item->languages()->detach();
            $item->forceDelete();
        }
        
        $this->info('Done! Deleted ' . count($itemsToDelete) . ' items.');
        return 0;
    }
}
