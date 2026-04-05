import React from 'react';
import { Head, Link, usePage, useForm } from '@inertiajs/react';
import FrontendAuthLayout from '@/layouts/frontend-auth-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import InputError from '@/components/input-error';
import { signin, signup } from '@/routes/index';
import { LoaderCircle } from 'lucide-react';

export default function Login({ status, canResetPassword }: { status?: string; canResetPassword: boolean }) {
    const { translations } = usePage<any>().props;
    const t = translations?.frontend?.auth || {};

    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post(signin.url(), {
            onFinish: () => reset('password'),
        });
    };

    return (
        <FrontendAuthLayout 
            title={t.login_title || 'Welcome Back'} 
            description={t.login_desc || 'Please enter your account details'}
        >
            <Head title={t.login_btn || 'Log In'} />

            {status && (
                <div className="mb-6 p-4 bg-emerald-50 text-emerald-700 text-sm font-bold rounded-2xl border border-emerald-100">
                    {status}
                </div>
            )}

            <form onSubmit={submit} className="flex flex-col gap-6">
                <div className="space-y-2">
                    <Label htmlFor="email" className="text-gray-700 font-bold ml-1">{t.email || 'Email Address'}</Label>
                    <Input
                        id="email"
                        type="email"
                        value={data.email}
                        onChange={(e) => setData('email', e.target.value)}
                        className="h-12 px-4 bg-gray-50 border-gray-100 focus:bg-white focus:ring-0 focus:border-emerald-500 rounded-xl transition-all font-medium text-gray-900 placeholder:text-gray-400"
                        placeholder="your@email.com"
                        required
                        autoFocus
                    />
                    <InputError message={errors.email} className="-mt-1 ml-1" />
                </div>

                <div className="space-y-2">
                    <div className="flex items-center justify-between ml-1">
                        <Label htmlFor="password" className="text-gray-700 font-bold">{t.password || 'Password'}</Label>
                        {/* {canResetPassword && (
                            <Link
                                href={signin.url()} 
                                className="text-sm font-bold text-emerald-600 hover:text-emerald-700 transition-colors"
                            >
                                {t.forgot_password || 'Forgot password?'}
                            </Link>
                        )} */}
                    </div>
                    <Input
                        id="password"
                        type="password"
                        value={data.password}
                        onChange={(e) => setData('password', e.target.value)}
                        className="h-12 px-4 bg-gray-50 border-gray-100 focus:bg-white focus:ring-0 focus:border-emerald-500 rounded-xl transition-all font-medium text-gray-900 placeholder:text-gray-400"
                        placeholder="••••••••"
                        required
                    />
                    <InputError message={errors.password} className="-mt-1 ml-1" />
                </div>

                <div className="flex items-center gap-2 ml-1">
                    <Checkbox
                        id="remember"
                        checked={data.remember}
                        onCheckedChange={(checked) => setData('remember', !!checked)}
                        className="border-gray-300 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                    />
                    <Label htmlFor="remember" className="text-sm text-gray-600 font-medium cursor-pointer">
                        {t.remember || 'Remember me'}
                    </Label>
                </div>

                <Button
                    type="submit"
                    className="h-14 mt-2 w-full bg-gray-900 hover:bg-black text-white text-lg font-black rounded-2xl transition-all shadow-none border-none active:scale-[0.98]"
                    disabled={processing}
                >
                    {processing && (
                        <LoaderCircle className="h-5 w-5 animate-spin mr-2" />
                    )}
                    {t.login_btn || 'Log In'}
                </Button>

                <div className="mt-8 pt-8 border-t border-gray-100 text-center">
                    <p className="text-gray-500 font-medium mb-2">
                        {t.no_account || "Don't have an account?"}
                    </p>
                    <Link 
                        href={signup.url()} 
                        className="text-emerald-600 font-black hover:text-emerald-700 transition-colors inline-flex items-center gap-1 group"
                    >
                        {t.register_link || 'Register now'}
                        <span className="transform group-hover:translate-x-1 transition-transform">→</span>
                    </Link>
                </div>
            </form>
        </FrontendAuthLayout>
    );
}
