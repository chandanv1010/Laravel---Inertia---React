import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';

interface SubscribeNewsletterProps {
    title?: string;
    subtitle?: string;
    placeholder?: string;
    buttonText?: string;
    backgroundImage?: string;
    onSubscribe?: (email: string) => void;
}

/**
 * Subscribe Newsletter Template 1
 * Thiết kế với hình ảnh bên phải, form đăng ký bên trái
 */
export default function SubscribeNewsletter({
    title = "Ở nhà & nhận nhu yếu phẩm hàng ngày từ cửa hàng của chúng tôi",
    subtitle,
    placeholder = "Nhập email của bạn",
    buttonText = "Đăng ký ngay",
    backgroundImage = "/images/newsletter-basket.png",
    onSubscribe
}: SubscribeNewsletterProps) {
    const [email, setEmail] = useState('');
    const [agreed, setAgreed] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !agreed) return;

        setLoading(true);
        try {
            if (onSubscribe) {
                await onSubscribe(email);
            }
            setEmail('');
            setAgreed(false);
        } finally {
            setLoading(false);
        }
    };

    return (
        <section className="bg-gray-100 py-12 md:py-16">
            <div className="container mx-auto px-4">
                <div className="relative bg-gray-100 rounded-lg overflow-hidden">
                    <div className="flex flex-col md:flex-row items-center justify-between">
                        {/* Left Content */}
                        <div className="md:w-1/2 p-8 md:p-12 lg:p-16">
                            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-800 leading-tight mb-6">
                                {title}
                            </h2>
                            {subtitle && (
                                <p className="text-gray-600 mb-6">{subtitle}</p>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="flex gap-2">
                                    <Input
                                        type="email"
                                        placeholder={placeholder}
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="flex-1 h-12 bg-white border-gray-200 rounded-md"
                                        required
                                    />
                                    <Button
                                        type="submit"
                                        disabled={loading || !agreed}
                                        className="h-12 px-6 bg-[#1a9cb0] hover:bg-[#158a9c] text-white font-medium rounded-md"
                                    >
                                        {loading ? 'Đang gửi...' : buttonText}
                                    </Button>
                                </div>

                                <div className="flex items-center gap-2">
                                    <Checkbox
                                        id="newsletter-agree"
                                        checked={agreed}
                                        onCheckedChange={(checked) => setAgreed(checked as boolean)}
                                    />
                                    <label
                                        htmlFor="newsletter-agree"
                                        className="text-sm text-gray-500 cursor-pointer"
                                    >
                                        Tôi đồng ý rằng dữ liệu của tôi đang được thu thập và lưu trữ.
                                    </label>
                                </div>
                            </form>
                        </div>

                        {/* Right Image */}
                        <div className="md:w-1/2 hidden md:block">
                            <img
                                src={backgroundImage}
                                alt="Newsletter"
                                className="w-full h-auto object-contain"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
