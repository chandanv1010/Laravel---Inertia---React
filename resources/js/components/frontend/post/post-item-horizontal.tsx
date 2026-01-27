import { Link } from '@inertiajs/react';
import { Post } from '@/types/frontend';
import { cn } from '@/lib/utils';

/**
 * PostItemHorizontal Component
 * 
 * Layout: Image Left, Information Right
 * 
 * Features:
 * - Side-by-side layout (responsive: stacks on mobile)
 * - Image occupies roughly 40-50% width
 * - Content area on the right
 * - Ideal for list views
 * 
 * @param {Post} post - The post data object
 * @param {string} className - Optional additional classes
 */
export default function PostItemHorizontal({ post, className }: { post: Post, className?: string }) {
    return (
        <div className={cn("group flex flex-col md:flex-row bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 h-full", className)}>
            {/* Image Section - Left (md) */}
            <div className="relative w-full md:w-2/5 aspect-video md:aspect-auto overflow-hidden shrink-0">
                <Link href={post.canonical || '#'} className="block h-full">
                    <img
                        src={post.image}
                        alt={post.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                </Link>
                {post.post_catalogues && post.post_catalogues.length > 0 && (
                    <span className="absolute top-3 left-3 bg-primary/90 text-primary-foreground text-xs px-2 py-1 rounded-md backdrop-blur-sm md:hidden">
                        {post.post_catalogues[0].name}
                    </span>
                )}
            </div>

            {/* Content Section - Right (md) */}
            <div className="flex flex-col flex-1 p-5">
                <div className="flex justify-between items-start mb-2">
                    {post.post_catalogues && post.post_catalogues.length > 0 && (
                        <span className="hidden md:inline-block text-xs font-semibold text-primary mb-2">
                            {post.post_catalogues[0].name}
                        </span>
                    )}
                    <time dateTime={post.created_at} className="text-xs text-muted-foreground">
                        {new Date(post.created_at).toLocaleDateString()}
                    </time>
                </div>

                <Link href={post.canonical || '#'} className="block">
                    <h3 className="text-xl font-bold mb-3 text-foreground group-hover:text-primary transition-colors line-clamp-2">
                        {post.name}
                    </h3>
                </Link>

                <p className="text-muted-foreground text-sm mb-4 line-clamp-2 md:line-clamp-3">
                    {post.description}
                </p>

                <div className="mt-auto flex items-center justify-between pt-4">
                    <div className="flex items-center text-xs text-muted-foreground">
                        <span className="font-medium mr-2">By {post.user?.name || 'Admin'}</span>
                    </div>

                    <Link
                        href={post.canonical || '#'}
                        className="inline-flex items-center text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                    >
                        Đọc tiếp
                        <svg className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M5 12h14"></path>
                            <path d="M12 5l7 7-7 7"></path>
                        </svg>
                    </Link>
                </div>
            </div>
        </div>
    );
}
