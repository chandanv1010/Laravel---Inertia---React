import React from 'react';
import { Head, Link, usePage, useForm } from '@inertiajs/react';
import FrontendAuthLayout from '@/layouts/frontend-auth-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import InputError from '@/components/input-error';
import { signin, signup } from '@/routes/index';
import { LoaderCircle } from 'lucide-react';

import { SharedData } from '@/types';

export default function Register() {
    const { props } = usePage<SharedData>();
    const { translations } = props;
    const t = translations?.frontend?.auth || {};

    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post(signup.url(), {
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    return (
        <FrontendAuthLayout 
            title={t.register_title || 'Create Account'} 
            description={t.register_desc || 'Join our community for a better shopping experience'}
        >
            <Head title={t.register_btn || 'Register'} />

            <form onSubmit={submit} className="flex flex-col gap-5">
                <div className="space-y-2">
                    <Label htmlFor="name" className="text-gray-700 font-bold ml-1">{t.name || 'Full Name'}</Label>
                    <Input
                        id="name"
                        name="name"
                        value={data.name}
                        onChange={(e) => setData('name', e.target.value)}
                        className="h-12 px-4 bg-gray-50 border-gray-100 focus:bg-white focus:ring-0 focus:border-emerald-500 rounded-xl transition-all font-medium text-gray-900 placeholder:text-gray-400"
                        placeholder="John Doe"
                        required
                        autoFocus
                    />
                    <InputError message={errors.name} className="-mt-1 ml-1" />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="email" className="text-gray-700 font-bold ml-1">{t.email || 'Email Address'}</Label>
                    <Input
                        id="email"
                        type="email"
                        name="email"
                        value={data.email}
                        onChange={(e) => setData('email', e.target.value)}
                        className="h-12 px-4 bg-gray-50 border-gray-100 focus:bg-white focus:ring-0 focus:border-emerald-500 rounded-xl transition-all font-medium text-gray-900 placeholder:text-gray-400"
                        placeholder="your@email.com"
                        required
                    />
                    <InputError message={errors.email} className="-mt-1 ml-1" />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="password" className="text-gray-700 font-bold ml-1">{t.password || 'Password'}</Label>
                    <Input
                        id="password"
                        type="password"
                        name="password"
                        value={data.password}
                        onChange={(e) => setData('password', e.target.value)}
                        className="h-12 px-4 bg-gray-50 border-gray-100 focus:bg-white focus:ring-0 focus:border-emerald-500 rounded-xl transition-all font-medium text-gray-900 placeholder:text-gray-400"
                        placeholder="••••••••"
                        required
                    />
                    <InputError message={errors.password} className="-mt-1 ml-1" />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="password_confirmation" className="text-gray-700 font-bold ml-1">{t.confirm_password || 'Confirm Password'}</Label>
                    <Input
                        id="password_confirmation"
                        type="password"
                        name="password_confirmation"
                        value={data.password_confirmation}
                        onChange={(e) => setData('password_confirmation', e.target.value)}
                        className="h-12 px-4 bg-gray-50 border-gray-100 focus:bg-white focus:ring-0 focus:border-emerald-500 rounded-xl transition-all font-medium text-gray-900 placeholder:text-gray-400"
                        placeholder="••••••••"
                        required
                    />
                    <InputError message={errors.password_confirmation} className="-mt-1 ml-1" />
                </div>

                <Button
                    type="submit"
                    className="h-14 mt-4 w-full bg-emerald-600 hover:bg-emerald-700 text-white text-lg font-black rounded-2xl transition-all shadow-none border-none active:scale-[0.98]"
                    disabled={processing}
                >
                    {processing && (
                        <LoaderCircle className="h-5 w-5 animate-spin mr-2" />
                    )}
                    {t.register_btn || 'Register'}
                </Button>

                <div className="mt-8 pt-8 border-t border-gray-100 text-center">
                    <p className="text-gray-500 font-medium mb-2">
                        {t.has_account || 'Already have an account?'}
                    </p>
                    <Link 
                        href={signin.url()} 
                        className="text-emerald-600 font-black hover:text-emerald-700 transition-colors inline-flex items-center gap-1 group"
                    >
                        {t.login_link || 'Log in here'}
                        <span className="transform group-hover:-translate-x-1 transition-transform">←</span>
                    </Link>
                </div>
            </form>
        </FrontendAuthLayout>
    );
}
