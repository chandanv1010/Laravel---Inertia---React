import React, { ReactNode } from 'react';
import Header from '@/components/frontend/header/index';
import Footer from '@/components/frontend/footer';
import { Head, usePage } from '@inertiajs/react';
import { Toaster } from 'sonner';

interface SeoConfig {
    meta_title?: string;
    meta_description?: string;
    meta_image?: string;
    meta_keywords?: string;
    meta_robots?: string; // Added meta_robots
    canonical_url?: string;
    [key: string]: string | undefined;
}

interface FrontendLayoutProps {
    children: ReactNode;
    seo?: SeoConfig;
    title?: string;
}

export default function FrontendLayout({ children, seo, title }: FrontendLayoutProps) {
    const { app } = usePage().props as any;
    const baseUrl = app?.url || '';

    const siteTitle = seo?.meta_title || title || 'Laravel Inertia App';
    const description = seo?.meta_description || '';
    const image = seo?.meta_image ? (seo.meta_image.startsWith('http') ? seo.meta_image : baseUrl + seo.meta_image) : '';
    const canonicalUrl = seo?.canonical_url || '';
    const keywords = seo?.meta_keywords || '';
    const robots = seo?.meta_robots || 'index, follow'; // Dynamic robots

    return (
        <div className="min-h-screen flex flex-col bg-background font-sans antialiased text-foreground">
            <Head>
                <title>{siteTitle}</title>

                {/* Basic Meta */}
                <meta name="description" content={description} />
                {keywords && <meta name="keywords" content={keywords} />}
                <meta name="robots" content={robots} />
                <meta name="author" content={siteTitle} />

                {/* Canonical */}
                {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}

                {/* Open Graph / Facebook */}
                <meta property="og:type" content="website" />
                <meta property="og:site_name" content={siteTitle} />
                <meta property="og:title" content={siteTitle} />
                <meta property="og:description" content={description} />
                {image && <meta property="og:image" content={image} />}
                {canonicalUrl && <meta property="og:url" content={canonicalUrl} />}
                <meta property="og:locale" content="vi_VN" />

                {/* Twitter Card */}
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content={siteTitle} />
                <meta name="twitter:description" content={description} />
                {image && <meta name="twitter:image" content={image} />}

                {/* Schema.org / JSON-LD would go in a script tag if needed */}
            </Head>

            <Header />

            <main className="flex-1 w-full">
                {children}
            </main>

            <Footer />
            <Toaster position="top-right" richColors />
        </div>
    );
}
