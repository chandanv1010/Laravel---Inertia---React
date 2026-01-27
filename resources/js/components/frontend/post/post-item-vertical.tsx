import { Link } from '@inertiajs/react';
import { Post } from '@/types/frontend';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/utils'; // Assuming this utility exists or I'll use simpler date formatting

/**
 * PostItemVertical Component
 * 
 * Layout: Image Top, Information Bottom
 * 
 * Features:
 * - Full width image at the top
 * - Content area below image
 * - Displays: Title, Description, Date, Author, Category
 * - "Read More" button
 * 
 * @param {Post} post - The post data object
 * @param {string} className - Optional additional classes
 */
export default function PostItemVertical({ post, className }: { post: Post, className?: string }) {
    return (
        <div className={cn("group flex flex-col bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-300", className)}>
            {/* Image Section - Top */}
            <div className="relative aspect-video overflow-hidden">
                <Link href={post.canonical || '#'}>
                    <img
                        src={post.image}
                        alt={post.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                </Link>
                {post.post_catalogues && post.post_catalogues.length > 0 && (
                    <span className="absolute top-3 left-3 bg-primary/90 text-primary-foreground text-xs px-2 py-1 rounded-md backdrop-blur-sm">
                        {post.post_catalogues[0].name}
                    </span>
                )}
            </div>

            {/* Content Section - Bottom */}
            <div className="flex flex-col flex-1 p-5">
                {/* Meta Data */}
                <div className="flex items-center text-xs text-muted-foreground mb-3 space-x-3">
                    <div className="flex items-center">
                        <span className="font-medium text-foreground">{post.user?.name || 'Anonymous'}</span>
                    </div>
                    <span className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-600"></span>
                    <time dateTime={post.created_at}>
                        {new Date(post.created_at).toLocaleDateString()}
                    </time>
                </div>

                {/* Title */}
                <Link href={post.canonical || '#'} className="block">
                    <h3 className="text-xl font-bold mb-2 text-foreground group-hover:text-primary transition-colors line-clamp-2">
                        {post.name}
                    </h3>
                </Link>

                {/* Description */}
                <p className="text-muted-foreground text-sm mb-4 line-clamp-3 flex-1">
                    {post.description}
                </p>

                {/* Footer / Read More */}
                <div className="mt-auto pt-4 border-t border-zinc-100 dark:border-zinc-800">
                    <Link
                        href={post.canonical || '#'}
                        className="inline-flex items-center text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                    >
                        Xem chi tiết
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
