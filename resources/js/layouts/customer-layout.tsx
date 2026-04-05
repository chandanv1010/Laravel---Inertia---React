import React from 'react';
import { usePage, Link } from '@inertiajs/react';
import { SidebarProvider, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
import { CustomerSidebar } from '@/components/customer-sidebar';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { ChevronLeft, Home } from 'lucide-react';
import { Head } from '@inertiajs/react';
import { Toaster } from 'sonner';

interface CustomerLayoutProps {
    children: React.ReactNode;
    title: string;
}

import { SharedData } from '@/types';

const CustomerLayout: React.FC<CustomerLayoutProps> = ({ children, title }) => {
    const { props } = usePage<SharedData>();
    const { auth } = props;
    const customer = auth?.customer;

    return (
        <SidebarProvider defaultOpen={true}>
            <Head title={title} />
            <Toaster position="top-right" closeButton richColors />
            <div className="flex min-h-screen w-full bg-zinc-50/50">
                {/* Standalone Sidebar */}
                <CustomerSidebar />
                
                {/* Main Content Area */}
                <SidebarInset className="flex-1 flex flex-col min-h-screen bg-white md:bg-zinc-50/50">
                    {/* Dashboard Header - No site-wide header conflict here */}
                    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-zinc-200 bg-white px-4 md:px-8 shadow-sm">
                        <div className="flex items-center gap-2 md:gap-4">
                            <SidebarTrigger className="-ml-1" />
                            <div className="h-4 w-px bg-zinc-200 mx-1 hidden sm:block" />
                            <Breadcrumb className="hidden sm:block">
                                <BreadcrumbList>
                                    <BreadcrumbItem>
                                        <BreadcrumbLink href="/" className="text-slate-500 font-medium text-xs hover:text-[#1C8EB8] transition-colors">Trang chủ</BreadcrumbLink>
                                    </BreadcrumbItem>
                                    <BreadcrumbSeparator />
                                    <BreadcrumbItem>
                                        <BreadcrumbPage className="text-[#1C8EB8] font-black text-xs uppercase tracking-tight">{title}</BreadcrumbPage>
                                    </BreadcrumbItem>
                                </BreadcrumbList>
                            </Breadcrumb>
                        </div>

                        {/* Return to Store Link - Prominent for users */}
                        <div className="flex items-center gap-4">
                            <Link 
                                href="/" 
                                className="group flex items-center gap-2 px-4 py-2 rounded-full border border-zinc-200 bg-white text-xs font-black text-slate-700 hover:border-[#1C8EB8] hover:text-[#1C8EB8] transition-all duration-300 shadow-sm"
                            >
                                <Home className="h-3.5 w-3.5" />
                                <span className="hidden md:inline">Quay lại website</span>
                                <ChevronLeft className="h-3.5 w-3.5 group-hover:-translate-x-1 transition-transform md:hidden" />
                            </Link>
                            
                            <div className="hidden lg:flex flex-col items-end leading-none mr-2">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Đang đăng nhập</span>
                                <span className="text-xs font-bold text-slate-700 underline decoration-[#1C8EB8]/30">{customer?.email}</span>
                            </div>
                        </div>
                    </header>
                    
                    {/* Dashboard Content */}
                    <main className="flex-1 overflow-y-auto p-4 md:p-10">
                        <div className="max-w-4xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {/* Page Heading Section */}
                            <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-zinc-100 pb-8">
                                <div>
                                    <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-3">
                                        {title}
                                    </h1>
                                    <div className="flex items-center gap-2">
                                        <div className="h-1.5 w-12 bg-[#1C8EB8] rounded-full" />
                                        <div className="h-1.5 w-1.5 bg-[#1C8EB8]/40 rounded-full" />
                                        <div className="h-1.5 w-1.5 bg-[#1C8EB8]/20 rounded-full" />
                                    </div>
                                </div>
                                <div className="text-[11px] font-black text-slate-400 uppercase tracking-[0.25em] bg-zinc-100/80 px-4 py-2 rounded-full border border-zinc-200/50">
                                    Customer Dashboard
                                </div>
                            </div>
                            
                            {/* The Actual Content Card */}
                            <div className="bg-white rounded-2xl border border-zinc-200/60 shadow-xl shadow-zinc-200/20 p-6 md:p-10 min-h-[400px]">
                                {children}
                            </div>
                        </div>
                    </main>
                    
                    {/* Dashboard Footer */}
                    <footer className="py-6 px-10 border-t border-zinc-50 bg-white mt-auto">
                        <div className="max-w-4xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-slate-400 font-medium text-[11px]">
                            <p>© {new Date().getFullYear()} - Cổng thông tin khách hàng chuyên nghiệp.</p>
                            <div className="flex items-center gap-6">
                                <Link href="/contact" className="hover:text-[#1C8EB8]">Hỗ trợ</Link>
                                <Link href="/policy" className="hover:text-[#1C8EB8]">Chính sách</Link>
                                <Link href="/terms" className="hover:text-[#1C8EB8]">Điều khoản</Link>
                            </div>
                        </div>
                    </footer>
                </SidebarInset>
            </div>
        </SidebarProvider>
    );
};

export default CustomerLayout;
