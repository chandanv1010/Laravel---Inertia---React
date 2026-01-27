import { Link } from '@inertiajs/react';
import { Post } from '@/types/frontend';
import { cn } from '@/lib/utils';

/**
 * PostItemVerticalReverse Component
 * 
 * Layout: Information Top, Image Bottom
 * 
 * Features:
 * - Content displayed above the image
 * - Useful for magazine style layouts or emphasizing headlines first
 * 
 * @param {Post} post - The post data object
 * @param {string} className - Optional additional classes
 */
export default function PostItemVerticalReverse({ post, className }: { post: Post, className?: string }) {
    return (
        <div className={cn("group flex flex-col bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-300", className)}>

            {/* Content Section - Top */}
            <div className="flex flex-col flex-1 p-5 pb-4">
                {/* Meta Data */}
                <div className="flex items-center text-xs text-muted-foreground mb-3 space-x-3">
                    {post.post_catalogues && post.post_catalogues.length > 0 && (
                        <span className="text-primary font-medium">{post.post_catalogues[0].name}</span>
                    )}
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
                <p className="text-muted-foreground text-sm mb-4 line-clamp-3">
                    {post.description}
                </p>

                <div className="flex items-center text-xs text-muted-foreground mt-auto">
                    <span>{post.user?.name || 'Anonymous'}</span>
                </div>
            </div>

            {/* Image Section - Bottom */}
            <div className="relative aspect-video overflow-hidden mt-auto">
                <Link href={post.canonical || '#'}>
                    <img
                        src={post.image}
                        alt={post.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                </Link>
            </div>
        </div>
    );
}
