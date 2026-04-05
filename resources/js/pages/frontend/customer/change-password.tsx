import React, { useState } from 'react';
import { useForm } from '@inertiajs/react';
import CustomerLayout from '@/layouts/customer-layout';
import { Lock, ShieldCheck, Eye, EyeOff, Save } from 'lucide-react';
import { toast } from 'sonner';

interface PasswordForm {
    old_password: string;
    password: string;
    password_confirmation: string;
    [key: string]: any;
}

export default function ChangePassword() {
    const [showOld, setShowOld] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const { data, setData, post, processing, errors, reset } = useForm<PasswordForm>({
        old_password: '',
        password: '',
        password_confirmation: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/customer/change-password', {
            onSuccess: () => {
                toast.success('Mật khẩu của bạn đã được thay đổi thành công!');
                reset();
            },
            onError: (err) => {
                toast.error('Có lỗi xảy ra, vui lòng kiểm tra lại thông tin.');
            }
        });
    };

    return (
        <CustomerLayout title="Đổi mật khẩu">
            <div className="max-w-xl">
                {/* Security Message */}
                <div className="mb-10 bg-slate-50 border border-zinc-100 p-6 rounded-xl flex gap-4">
                    <div className="h-10 w-10 shrink-0 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                        <ShieldCheck className="h-5 w-5" />
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-slate-900 mb-1 tracking-tight">Bảo mật tài khoản</h4>
                        <p className="text-xs text-slate-500 leading-relaxed font-medium">
                            Sử dụng ít nhất 8 ký tự, bao gồm cả chữ hoa, chữ thường và số để đảm bảo an toàn cho tài khoản của bạn.
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Old Password */}
                    <div className="space-y-2">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                            <Lock className="h-3.5 w-3.5 text-[#1C8EB8]" />
                            Mật khẩu hiện tại
                        </label>
                        <div className="relative">
                            <input 
                                type={showOld ? 'text' : 'password'}
                                value={data.old_password}
                                onChange={e => setData('old_password', e.target.value)}
                                className={`w-full h-12 px-4 pr-12 rounded-lg bg-slate-50 border border-zinc-200 focus:bg-white focus:border-[#1C8EB8] focus:ring-1 focus:ring-[#1C8EB8] transition-all duration-200 outline-none font-bold text-slate-900 ${errors.old_password ? 'border-rose-500' : ''}`}
                                placeholder="••••••••"
                            />
                            <button 
                                type="button"
                                onClick={() => setShowOld(!showOld)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 focus:outline-none transition-colors"
                            >
                                {showOld ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                        {errors.old_password && <p className="text-rose-500 text-[11px] font-bold mt-1 px-1">{errors.old_password}</p>}
                    </div>

                    <div className="h-px bg-zinc-100 my-4" />

                    {/* New Password */}
                    <div className="space-y-2">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                            <Lock className="h-3.5 w-3.5 text-[#1C8EB8]" />
                            Mật khẩu mới
                        </label>
                        <div className="relative">
                            <input 
                                type={showNew ? 'text' : 'password'}
                                value={data.password}
                                onChange={e => setData('password', e.target.value)}
                                className={`w-full h-12 px-4 pr-12 rounded-lg bg-slate-50 border border-zinc-200 focus:bg-white focus:border-[#1C8EB8] focus:ring-1 focus:ring-[#1C8EB8] transition-all duration-200 outline-none font-bold text-slate-900 ${errors.password ? 'border-rose-500' : ''}`}
                                placeholder="Tối thiểu 8 ký tự"
                            />
                            <button 
                                type="button"
                                onClick={() => setShowNew(!showNew)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 focus:outline-none transition-colors"
                            >
                                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                        {errors.password && <p className="text-rose-500 text-[11px] font-bold mt-1 px-1">{errors.password}</p>}
                    </div>

                    {/* Confirm Password */}
                    <div className="space-y-2">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                            <Lock className="h-3.5 w-3.5 text-[#1C8EB8]" />
                            Xác nhận mật khẩu mới
                        </label>
                        <div className="relative">
                            <input 
                                type={showConfirm ? 'text' : 'password'}
                                value={data.password_confirmation}
                                onChange={e => setData('password_confirmation', e.target.value)}
                                className={`w-full h-12 px-4 pr-12 rounded-lg bg-slate-50 border border-zinc-200 focus:bg-white focus:border-[#1C8EB8] focus:ring-1 focus:ring-[#1C8EB8] transition-all duration-200 outline-none font-bold text-slate-900 ${errors.password_confirmation ? 'border-rose-500' : ''}`}
                                placeholder="Nhập lại mật khẩu mới"
                            />
                            <button 
                                type="button"
                                onClick={() => setShowConfirm(!showConfirm)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 focus:outline-none transition-colors"
                            >
                                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                        {errors.password_confirmation && <p className="text-rose-500 text-[11px] font-bold mt-1 px-1">{errors.password_confirmation}</p>}
                    </div>

                    {/* Action Button */}
                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={processing}
                            className="w-full md:w-auto flex items-center justify-center gap-2.5 px-8 h-11 bg-[#1C8EB8] hover:bg-[#157294] text-white rounded-lg font-black text-[11px] uppercase tracking-widest transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm active:translate-y-0.5 cursor-pointer"
                        >
                            <Save className={`h-3.5 w-3.5 ${processing ? 'animate-pulse' : ''}`} />
                            {processing ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
                        </button>
                    </div>
                </form>
            </div>
        </CustomerLayout>
    );
}
