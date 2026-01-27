import TopBar from './top-bar';
import SearchBar from './search-bar';
import Toolbox from './toolbox';
import CategoryDropdown from './category-dropdown';
import MainMenu from './main-menu';
import Logo from './logo';
import { Link } from '@inertiajs/react';

export default function Header() {
    return (
        <header className="w-full bg-white dark:bg-zinc-950 flex flex-col shadow-sm">
            <TopBar />

            {/* Middle Bar: Logo, Search, Toolbox */}
            <div className="border-b border-zinc-100 dark:border-zinc-800 py-6">
                <div className="container mx-auto px-4 flex items-center justify-between gap-8">
                    {/* Logo */}
                    <Logo />

                    {/* Search - Flexible width */}
                    <div className="flex-1 max-w-2xl hidden md:block">
                        <SearchBar />
                    </div>

                    {/* Toolbox */}
                    <Toolbox />
                </div>
            </div>

            {/* Bottom Bar: Categories & Menu */}
            <div className="border-b border-zinc-100 dark:border-zinc-800">
                <div className="container mx-auto px-4 flex items-center gap-8 h-12">
                    <div className="flex items-center">
                        <CategoryDropdown />
                    </div>
                    <div className="flex-1 py-2">
                        <MainMenu />
                    </div>
                </div>
            </div>
        </header>
    );
}
