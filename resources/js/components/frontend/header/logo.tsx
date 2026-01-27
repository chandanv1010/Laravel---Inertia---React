import { Link, usePage } from '@inertiajs/react';
import { cn } from '@/lib/utils';

export default function Logo({ className }: { className?: string }) {
    const { settings } = usePage<any>().props;
    const logoUrl = settings?.website_logo;

    return (
        <Link href="/" className={cn("flex-shrink-0 flex items-center", className)}>
            {logoUrl ? (
                <img
                    src={logoUrl}
                    alt={settings?.website_name || "Logo"}
                    className="h-12 w-auto object-contain" // Adjustable height
                />
            ) : (
                <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-cyan-800 dark:text-cyan-500">Logo demo</span>
                </div>
            )}
        </Link>
    );
}
