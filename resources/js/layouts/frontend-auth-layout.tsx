import AppLogoIcon from '@/components/app-logo-icon';
import { Head, Link, usePage } from '@inertiajs/react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import React from 'react';

interface FrontendAuthLayoutProps {
    children: React.ReactNode;
    title: string;
    description?: string;
}

import { SharedData } from '@/types';

const FrontendAuthLayout: React.FC<FrontendAuthLayoutProps> = ({ children, title, description }) => {
    const { props } = usePage<SharedData>();
    const { flash } = props;
    
    return (
        <div className="flex min-h-screen bg-white overflow-hidden">
            <Head title={title} />
            
            {/* Left Column: Hero Image (Hidden on mobile) */}
            <div className="hidden lg:flex lg:w-5/12 relative bg-gray-50 border-r border-gray-100">
                <img 
                    src="/images/auth/login-hero.png" 
                    alt="Auth Hero" 
                    className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/5" /> {/* Very subtle overlay to soften the image if needed */}
                
                {/* Branding on top of image */}
                <div className="absolute top-12 left-12 z-10">
                    <Link href="/" className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-flat border border-gray-100">
                            <AppLogoIcon className="w-6 h-6 text-emerald-600 fill-current" />
                        </div>
                        <span className="text-xl font-black text-white drop-shadow-sm tracking-tight">HTVIETNAM</span>
                    </Link>
                </div>
                
                {/* Optional Tagline */}
                <div className="absolute bottom-12 left-12 right-12 z-10">
                    <h2 className="text-3xl font-black text-white leading-tight drop-shadow-md">
                        Nâng tầm trải nghiệm <br /> mua sắm của bạn.
                    </h2>
                </div>
            </div>

            {/* Right Column: Auth Form */}
            <div className="w-full lg:w-7/12 flex items-center justify-center p-8 md:p-12 lg:p-20 bg-white">
                <div className="w-full max-w-md">
                    {/* Mobile Branding (Show only on small screens) */}
                    <div className="lg:hidden flex justify-center mb-10">
                        <Link href="/" className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center border border-gray-100">
                                <AppLogoIcon className="w-7 h-7 text-emerald-600 fill-current" />
                            </div>
                        </Link>
                    </div>

                    {/* Flash Messages Display */}
                    {flash && Object.keys(flash).map((key) => {
                        const message = flash[key];
                        if (!message) return null;
                        
                        const isError = key === 'error';
                        const isSuccess = key === 'success';
                        
                        return (
                            <div 
                                key={key}
                                className={`mb-8 p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300 ${
                                    isError ? 'bg-red-50 text-red-700 border border-red-100' : 
                                    isSuccess ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                                    'bg-blue-50 text-blue-700 border border-blue-100'
                                }`}
                            >
                                {isSuccess ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
                                <span className="font-bold text-sm leading-tight text-center lg:text-left">{message}</span>
                            </div>
                        );
                    })}

                    <div className="mb-10 text-center lg:text-left">
                        <h1 className="text-3xl font-black text-gray-900 tracking-tight mb-2">
                            {title}
                        </h1>
                        {description && (
                            <p className="text-gray-500 font-medium">
                                {description}
                            </p>
                        )}
                    </div>

                    {children}
                </div>
            </div>
        </div>
    );
};

export default FrontendAuthLayout;
