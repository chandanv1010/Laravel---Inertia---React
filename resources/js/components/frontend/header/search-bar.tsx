import { Search, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { usePage } from '@inertiajs/react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Category {
    id: number;
    name: string;
    level: number;
}

export default function SearchBar() {
    const { categories } = usePage<any>().props;
    const [selectedCategory, setSelectedCategory] = useState("All Categories");
    const [isFocused, setIsFocused] = useState(false);
    const [catSearch, setCatSearch] = useState("");

    const safeCategories: Category[] = Array.isArray(categories) ? categories : [];

    const filteredCategories = safeCategories.filter(c =>
        c.name.toLowerCase().includes(catSearch.toLowerCase())
    );

    return (
        <div className="relative w-full max-w-3xl mx-auto">
            {/* Wrapper with border and roundness */}
            <div className={cn(
                "flex items-center w-full bg-white rounded-md border border-zinc-200 dark:border-zinc-800",
                "focus-within:ring-1 focus-within:ring-[#1C8EB8] transition-all"
            )}>

                {/* Category Dropdown (Searchable) */}
                <div className="relative">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="flex items-center gap-2 px-4 py-2.5 text-[13px] font-medium text-slate-600 hover:text-slate-800 border-r border-zinc-200 whitespace-nowrap outline-none h-[55px]">
                                <span className="max-w-[100px] truncate block text-left">
                                    {selectedCategory}
                                </span>
                                <ChevronDown className="h-3.5 w-3.5 opacity-50 flex-shrink-0" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-[220px] p-2">
                            {/* Search Input for Categories */}
                            <div className="mb-2">
                                <Input
                                    placeholder="Search..."
                                    value={catSearch}
                                    onChange={(e) => setCatSearch(e.target.value)}
                                    className="h-8 text-xs"
                                    onClick={(e) => e.stopPropagation()}
                                    onKeyDown={(e) => e.stopPropagation()}
                                />
                            </div>

                            <div className="max-h-[250px] overflow-y-auto">
                                <DropdownMenuItem onClick={() => setSelectedCategory("All Categories")}>
                                    All Categories
                                </DropdownMenuItem>
                                {filteredCategories.map((cat) => (
                                    <DropdownMenuItem key={cat.id} onClick={() => setSelectedCategory(cat.name)}>
                                        <span style={{ paddingLeft: (cat.level - 1) * 10 }}>
                                            {cat.name}
                                        </span>
                                    </DropdownMenuItem>
                                ))}
                                {filteredCategories.length === 0 && (
                                    <div className="p-2 text-xs text-center text-muted-foreground">No results</div>
                                )}
                            </div>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                {/* Search Input Area */}
                <div className="flex-1 relative">
                    <input
                        type="text"
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                        placeholder={isFocused ? "" : "Search for products, categories or brands..."}
                        className="w-full h-[55px] px-4 text-[13px] bg-transparent border-none outline-none text-slate-700 placeholder:text-slate-400"
                    />

                    {/* Search Button (Inside Input) */}
                    <div className="absolute right-1.5 top-1/2 -translate-y-1/2">
                        <Button
                            className="w-[64px] h-[44px] rounded-sm hover:opacity-90 transition-opacity"
                            style={{ backgroundColor: 'hsl(196, 69%, 36%)' }}
                        >
                            <Search className="h-5 w-5 text-white" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
