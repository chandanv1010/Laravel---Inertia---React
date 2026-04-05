import React, { useState, useEffect } from 'react';
import { usePage, router, Head } from '@inertiajs/react';
import CustomerLayout from '@/layouts/customer-layout';
import { User, Phone, Mail, Save, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

import { SharedData } from '@/types';

interface ProfileForm {
    first_name: string;
    last_name: string;
    phone: string;
    email: string;
    [key: string]: any;
}

export default function Profile() {
    const { props } = usePage<SharedData>();
    const { auth, errors: pageErrors } = props;
    const customer = auth?.customer;

    // Use local state instead of hook useForm
    const [formData, setFormData] = useState<ProfileForm>({
        first_name: customer?.first_name || '',
        last_name: customer?.last_name || '',
        phone: customer?.phone || '',
        email: customer?.email || '',
    });
    
    const [processing, setProcessing] = useState(false);
    const [localErrors, setLocalErrors] = useState<Partial<Record<keyof ProfileForm, string>>>({});

    // Sync validation errors from Inertia props
    useEffect(() => {
        if (pageErrors) {
            setLocalErrors(pageErrors as Partial<Record<keyof ProfileForm, string>>);
        }
    }, [pageErrors]);

    const handleChange = (field: keyof ProfileForm, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        // Clear error when typing
        if (localErrors[field]) {
            setLocalErrors(prev => {
                const updated = { ...prev };
                delete updated[field];
                return updated;
            });
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setProcessing(true);
        
        router.post('/customer/profile', formData, {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('Thông tin cá nhân đã được cập nhật thành công!');
                setProcessing(false);
            },
            onError: (err) => {
                setLocalErrors(err as Partial<Record<keyof ProfileForm, string>>);
                toast.error('Có lỗi xảy ra, vui lòng kiểm tra lại thông tin.');
                setProcessing(false);
            },
            onFinish: () => {
                setProcessing(false);
            }
        });
    };

    return (
        <CustomerLayout title="Thông tin cá nhân">
            <div className="max-w-2xl">
                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Grid for Name Fields */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Last Name */}
                        <div className="space-y-2">
                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                <User className="h-3.5 w-3.5 text-[#1C8EB8]" />
                                Họ đệm
                            </label>
                            <input 
                                type="text"
                                name="last_name"
                                value={formData.last_name}
                                onChange={e => handleChange('last_name', e.target.value)}
                                className={`w-full h-12 px-4 rounded-lg bg-slate-50 border border-zinc-200 focus:bg-white focus:border-[#1C8EB8] focus:ring-1 focus:ring-[#1C8EB8] transition-all duration-200 outline-none font-bold text-slate-900 ${localErrors.last_name ? 'border-rose-500' : ''}`}
                                placeholder="Nguyễn Văn"
                            />
                            {localErrors.last_name && <p className="text-rose-500 text-[11px] font-bold mt-1 px-1">{localErrors.last_name}</p>}
                        </div>

                        {/* First Name */}
                        <div className="space-y-2">
                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                <User className="h-3.5 w-3.5 text-[#1C8EB8]" />
                                Tên
                            </label>
                            <input 
                                type="text"
                                name="first_name"
                                value={formData.first_name}
                                onChange={e => handleChange('first_name', e.target.value)}
                                className={`w-full h-12 px-4 rounded-lg bg-slate-50 border border-zinc-200 focus:bg-white focus:border-[#1C8EB8] focus:ring-1 focus:ring-[#1C8EB8] transition-all duration-200 outline-none font-bold text-slate-900 ${localErrors.first_name ? 'border-rose-500' : ''}`}
                                placeholder="A"
                            />
                            {localErrors.first_name && <p className="text-rose-500 text-[11px] font-bold mt-1 px-1">{localErrors.first_name}</p>}
                        </div>
                    </div>

                    {/* Email (Disabled) */}
                    <div className="space-y-2">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                            <Mail className="h-3.5 w-3.5 text-[#1C8EB8]" />
                            Email (Không thể thay đổi)
                        </label>
                        <div className="relative">
                            <input 
                                type="email"
                                value={formData.email}
                                disabled
                                className="w-full h-12 px-4 pr-12 rounded-lg bg-zinc-100 border border-zinc-200 text-slate-400 font-bold opacity-70 cursor-not-allowed"
                            />
                            <AlertCircle className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                        </div>
                    </div>

                    {/* Phone Number */}
                    <div className="space-y-2">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                            <Phone className="h-3.5 w-3.5 text-[#1C8EB8]" />
                            Số điện thoại
                        </label>
                        <input 
                            type="text"
                            name="phone"
                            value={formData.phone}
                            onChange={e => handleChange('phone', e.target.value)}
                            className={`w-full h-12 px-4 rounded-lg bg-slate-50 border border-zinc-200 focus:bg-white focus:border-[#1C8EB8] focus:ring-1 focus:ring-[#1C8EB8] transition-all duration-200 outline-none font-bold text-slate-900 ${localErrors.phone ? 'border-rose-500' : ''}`}
                            placeholder="0123 456 789"
                        />
                        {localErrors.phone && <p className="text-rose-500 text-[11px] font-bold mt-1 px-1">{localErrors.phone}</p>}
                    </div>

                    {/* Action Button */}
                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={processing}
                            className="w-full md:w-auto flex items-center justify-center gap-2.5 px-8 h-11 bg-[#1C8EB8] hover:bg-[#157294] text-white rounded-lg font-black text-[11px] uppercase tracking-widest transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm active:translate-y-0.5 cursor-pointer"
                        >
                            <Save className={`h-3.5 w-3.5 ${processing ? 'animate-pulse' : ''}`} />
                            {processing ? 'Đang lưu...' : 'Lưu thông tin'}
                        </button>
                    </div>
                </form>
            </div>
        </CustomerLayout>
    );
}
