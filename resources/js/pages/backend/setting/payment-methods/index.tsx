import HeadingSmall from '@/components/heading-small';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import SettingLayout from '@/layouts/setting/layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { useState, useMemo } from 'react';
import { Plus, Banknote, Wallet, Copy, Check } from 'lucide-react';
import InputError from '@/components/input-error';
import UpdateManualPaymentModal from './components/update-manual-payment-modal';
import { BANKS } from '@/constants/banks';
import { cn } from '@/lib/utils';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Phương thức thanh toán', href: '/backend/setting/payment-methods' },
];

type PaymentMethod = {
    id: number;
    name: string;
    code: string;
    type: 'integrated' | 'manual';
    status: 'active' | 'inactive';
    is_default: boolean;
    provider?: string;
    config?: Record<string, any>;
    description?: string;
    icon?: string;
    order: number;
};

type IntegratedProvider = {
    code: string;
    name: string;
    description: string;
    icon?: string;
    configFields: Array<{
        key: string;
        label: string;
        type: 'text' | 'password' | 'number';
        placeholder: string;
        required?: boolean;
    }>;
};

const INTEGRATED_PROVIDERS: IntegratedProvider[] = [
    {
        code: 'vnpay',
        name: 'VNPAY',
        description: 'Giải pháp thanh toán trực tuyến dành cho nhà bán hàng online.',
        configFields: [
            {
                key: 'mid',
                label: 'Mã số thuế (MID)*',
                type: 'text',
                placeholder: 'Nhập mã số thuế (MID)',
                required: true,
            },
        ],
    },
    {
        code: 'seapay',
        name: 'SEAPAY',
        description: 'Cổng thanh toán trực tuyến an toàn và tiện lợi.',
        configFields: [
            {
                key: 'merchant_id',
                label: 'Merchant ID*',
                type: 'text',
                placeholder: 'Nhập Merchant ID',
                required: true,
            },
            {
                key: 'api_key',
                label: 'API Key*',
                type: 'password',
                placeholder: 'Nhập API Key',
                required: true,
            },
        ],
    },
    {
        code: 'paypal',
        name: 'PAYPAL',
        description: 'Thanh toán quốc tế an toàn và nhanh chóng.',
        configFields: [
            {
                key: 'client_id',
                label: 'Client ID*',
                type: 'text',
                placeholder: 'Nhập Client ID',
                required: true,
            },
            {
                key: 'client_secret',
                label: 'Client Secret*',
                type: 'password',
                placeholder: 'Nhập Client Secret',
                required: true,
            },
        ],
    },
];

type BankAccount = {
    id: number;
    payment_method_id: number;
    bank_name: string;
    account_number: string;
    account_holder_name: string;
    note?: string;
    is_active: boolean;
    order: number;
};

interface PaymentMethodsPageProps {
    integratedMethods?: PaymentMethod[];
    manualMethods?: PaymentMethod[];
    defaultMethod?: PaymentMethod;
    bankAccounts?: BankAccount[];
    bankTransferMethodDetails?: any;
}

const BankCard = ({ account }: { account: any }) => {
    const [copied, setCopied] = useState(false);

    // Find bank logo and color
    const bank = BANKS.find(b =>
        b.shortName === account.bank_name ||
        b.name === account.bank_name ||
        b.code === account.bank_name
    );

    const handleCopy = (e: React.MouseEvent) => {
        e.stopPropagation();
        navigator.clipboard.writeText(account.account_number);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Determine card background style based on bank color
    // We keep the background subtle so text is always readable
    const cardStyle = bank?.color
        ? {
            background: `linear-gradient(135deg, white 0%, ${bank.color}08 100%)`,
            borderColor: `${bank.color}40`,
        }
        : {};

    // Bottom stripe color
    const stripeStyle = bank?.color
        ? { background: `linear-gradient(to right, ${bank.color}, ${bank.color}80)` }
        : {};

    return (
        <div
            className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-slate-50 to-white border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 w-full sm:w-[320px]"
            style={cardStyle}
        >
            {/* Background Pattern - Decorative only */}
            <div
                className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full opacity-50 group-hover:scale-110 transition-transform duration-500 ease-out pointer-events-none"
                style={{ background: bank?.color ? `${bank.color}15` : '#eff6ff' }}
            ></div>
            <div
                className="absolute bottom-0 left-0 -ml-8 -mb-8 w-24 h-24 rounded-full opacity-50 group-hover:scale-110 transition-transform duration-500 ease-out pointer-events-none"
                style={{ background: bank?.color ? `${bank.color}10` : '#f8fafc' }}
            ></div>

            <div className="relative p-5">
                <div className="flex items-center justify-between mb-4">
                    <div className="h-10 w-auto min-w-[3rem] bg-white rounded-lg p-1.5 shadow-sm border border-slate-100 flex items-center justify-center">
                        {bank ? (
                            <img src={bank.logo} alt={bank.shortName} className="h-full w-full object-contain" />
                        ) : (
                            <Banknote className="h-6 w-6 text-slate-400" />
                        )}
                    </div>
                    {/* Badge: Use brand color for border/bg tint, but keep text dark for readability */}
                    <Badge
                        variant="secondary"
                        className="bg-white/90 backdrop-blur-sm font-normal text-[10px] uppercase tracking-wider border shadow-sm text-slate-600"
                        style={{
                            borderColor: bank?.color ? `${bank.color}30` : undefined,
                            color: bank?.color ? bank.color : undefined, // Keep logo/name colored if desired, but ensure it's not too light.
                            // Actually, user said text difficult to read. 
                            // Let's stick to slate-600 for safety or use a darker filter if possible.
                            // For now, I will trust that the bank name (usually short) might be okay in brand color 
                            // IF it's dark enough. But PVCombank yellow is bad.
                            // Let's force dark text for better UX as requested.
                        }}
                    >
                        <span style={{ color: '#475569' /* slate-600 */ }}>{account.bank_name}</span>
                    </Badge>
                </div>

                <div className="space-y-1 mb-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        Số tài khoản
                    </p>
                    <div className="flex items-center gap-2 group/copy cursor-pointer" onClick={handleCopy}>
                        <h4
                            className="text-xl font-bold tabular-nums tracking-tight font-mono transition-colors text-slate-800"
                        >
                            {account.account_number}
                        </h4>
                        {copied ? (
                            <Check className="h-4 w-4 animate-in zoom-in text-green-500" />
                        ) : (
                            <Copy className="h-4 w-4 text-slate-300 opacity-0 group-hover/copy:opacity-100 transition-opacity" />
                        )}
                    </div>
                </div>

                <div className="space-y-0.5">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        Chủ tài khoản
                    </p>
                    <p className="text-sm font-semibold uppercase truncate text-slate-700">
                        {account.account_holder_name}
                    </p>
                </div>
            </div>

            {/* Card Footer Stripe */}
            <div
                className="h-1 w-full bg-gradient-to-r from-blue-500 to-indigo-500"
                style={stripeStyle}
            ></div>
        </div>
    );
};

export default function PaymentMethodsSettingPage({
    integratedMethods = [],
    manualMethods = [],
    defaultMethod,
    bankAccounts = [],
    bankTransferMethodDetails,
}: PaymentMethodsPageProps) {
    const [connectModalOpen, setConnectModalOpen] = useState(false);
    const [selectedProvider, setSelectedProvider] = useState<IntegratedProvider | null>(null);
    const [updateManualModalOpen, setUpdateManualModalOpen] = useState(false);

    const { data, setData, post, processing, errors, reset } = useForm({
        code: '',
        provider: '',
        config: {} as Record<string, string>,
    });



    const handleConnect = (provider: IntegratedProvider) => {
        setSelectedProvider(provider);
        setData({
            code: provider.code,
            provider: provider.name.toUpperCase(),
            config: {},
        });
        setConnectModalOpen(true);
    };

    const handleSubmitConnect = (e: React.FormEvent) => {
        e.preventDefault();
        post('/backend/payment-methods/connect', {
            onSuccess: () => {
                setConnectModalOpen(false);
                reset();
                setSelectedProvider(null);
            },
        });
    };

    const handleDisconnect = (id: number) => {
        if (confirm('Bạn có chắc chắn muốn ngắt kết nối phương thức thanh toán này?')) {
            router.post(`/backend/payment-methods/${id}/disconnect`, {}, {
                preserveScroll: true,
            });
        }
    };

    const handleSetDefault = (id: number) => {
        router.post(`/backend/payment-methods/${id}/set-default`, {}, {
            preserveScroll: true,
        });
    };



    const handleDeleteManual = (id: number) => {
        if (confirm('Bạn có chắc chắn muốn xóa phương thức thanh toán này?')) {
            router.delete(`/backend/payment-methods/${id}`, {
                preserveScroll: true,
            });
        }
    };

    const isConnected = (code: string) => {
        return integratedMethods.some(m => m.code === code && m.status === 'active');
    };

    const getConnectedMethod = (code: string) => {
        return integratedMethods.find(m => m.code === code);
    };

    // Find the Bank Transfer method
    const bankTransferMethod = useMemo(() => {
        return manualMethods.find(m => m.code === 'bank_transfer');
    }, [manualMethods]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Phương thức thanh toán" />
            <SettingLayout>
                <div className="flex items-center justify-between mb-4">
                    <HeadingSmall
                        title="Phương thức thanh toán"
                        description="Quản lý các phương thức thanh toán tích hợp và thủ công"
                    />
                </div>

                {/* Phương thức thanh toán tích hợp */}
                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle className="text-base">Phương thức thanh toán tích hợp</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {INTEGRATED_PROVIDERS.map((provider) => {
                                const connected = isConnected(provider.code);
                                const method = getConnectedMethod(provider.code);
                                const isDefault = defaultMethod?.id === method?.id;

                                return (
                                    <div
                                        key={provider.code}
                                        className="flex items-start justify-between p-4 border rounded-lg"
                                    >
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <h3 className="font-semibold">{provider.name}</h3>
                                                {connected && (
                                                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                                        Đã kết nối
                                                    </Badge>
                                                )}
                                                {isDefault && (
                                                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                                        Mặc định
                                                    </Badge>
                                                )}
                                            </div>
                                            <p className="text-sm text-muted-foreground mb-2">{provider.description}</p>
                                            {connected && method?.config && (
                                                <div className="text-xs text-muted-foreground">
                                                    {Object.keys(method.config).map((key) => (
                                                        <div key={key}>
                                                            {key}: {method.config?.[key] ? '***' : 'Chưa cấu hình'}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {connected ? (
                                                <>
                                                    {!isDefault && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => handleSetDefault(method!.id)}
                                                        >
                                                            Đặt mặc định
                                                        </Button>
                                                    )}
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleDisconnect(method!.id)}
                                                    >
                                                        Ngắt kết nối
                                                    </Button>
                                                </>
                                            ) : (
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleConnect(provider)}
                                                >
                                                    Kết nối
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>

                {/* Phương thức thanh toán thủ công */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-base">Phương thức thanh toán thủ công</CardTitle>

                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y">
                            {manualMethods.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-8">
                                    Chưa có phương thức thanh toán thủ công nào
                                </p>
                            ) : (
                                manualMethods.map((method) => {
                                    const isDefault = defaultMethod?.id === method.id;

                                    if (method.code === 'bank_transfer') {
                                        return (
                                            <div
                                                key={method.id}
                                                className="flex flex-col p-6 hover:bg-gray-50 transition-colors cursor-pointer gap-4"
                                                onClick={() => setUpdateManualModalOpen(true)}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg shadow-sm">
                                                            <Banknote className="h-5 w-5" />
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <h3 className="font-semibold text-lg">{method.name}</h3>
                                                                {method.status === 'active' ? (
                                                                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                                                                        Đang sử dụng
                                                                    </Badge>
                                                                ) : (
                                                                    <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200 font-normal">
                                                                        Ngưng sử dụng
                                                                    </Badge>
                                                                )}
                                                                {isDefault && (
                                                                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                                                        Mặc định
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                            <p className="text-sm text-slate-500 mt-0.5">
                                                                Cập nhật thông tin tài khoản để thanh toán bằng mã VietQR động dễ dàng hơn.
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        {!isDefault && (
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleSetDefault(method.id);
                                                                }}
                                                            >
                                                                Đặt mặc định
                                                            </Button>
                                                        )}
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setUpdateManualModalOpen(true);
                                                            }}
                                                        >
                                                            Cập nhật
                                                        </Button>
                                                    </div>
                                                </div>

                                                {/* Bank Accounts List - Premium UI */}
                                                <div className="mt-2 pl-[52px]">
                                                    {bankTransferMethodDetails?.beneficiary_accounts && bankTransferMethodDetails.beneficiary_accounts.length > 0 ? (
                                                        <div className="flex flex-wrap gap-4">
                                                            {bankTransferMethodDetails.beneficiary_accounts.map((acc: any) => (
                                                                <BankCard key={acc.id} account={acc} />
                                                            ))}
                                                        </div>
                                                    ) : bankTransferMethodDetails?.beneficiary_account && (
                                                        <div className="flex flex-wrap gap-4">
                                                            <BankCard account={bankTransferMethodDetails.beneficiary_account} />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    }

                                    // Others methods
                                    return (
                                        <div
                                            key={method.id}
                                            className="flex items-center justify-between p-6 hover:bg-gray-50 transition-colors"
                                        >
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div className="p-2 bg-gray-100 rounded-md">
                                                        <Wallet className="h-4 w-4" />
                                                    </div>
                                                    <h3 className="font-semibold">{method.name}</h3>
                                                    {method.status === 'active' && (
                                                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                                            Đang sử dụng
                                                        </Badge>
                                                    )}
                                                    {isDefault && (
                                                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                                            Mặc định
                                                        </Badge>
                                                    )}
                                                </div>
                                                {method.description && (
                                                    <p className="text-sm text-muted-foreground">{method.description}</p>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {!isDefault && (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleSetDefault(method.id)}
                                                    >
                                                        Đặt mặc định
                                                    </Button>
                                                )}
                                                <Button
                                                    size="sm"
                                                    variant="destructive"
                                                    onClick={() => handleDeleteManual(method.id)}
                                                >
                                                    Xóa
                                                </Button>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Modal kết nối */}
                <Dialog open={connectModalOpen} onOpenChange={setConnectModalOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Kết nối {selectedProvider?.name}</DialogTitle>
                        </DialogHeader>
                        {selectedProvider && (
                            <form onSubmit={handleSubmitConnect} className="space-y-4">
                                <div className="text-sm text-muted-foreground mb-4">
                                    {selectedProvider.description}
                                </div>
                                {selectedProvider.configFields.map((field) => (
                                    <div key={field.key}>
                                        <Label htmlFor={field.key}>{field.label}</Label>
                                        <Input
                                            id={field.key}
                                            type={field.type}
                                            placeholder={field.placeholder}
                                            value={data.config[field.key] || ''}
                                            onChange={(e) =>
                                                setData('config', {
                                                    ...data.config,
                                                    [field.key]: e.target.value,
                                                })
                                            }
                                            required={field.required}
                                            className="mt-2"
                                        />
                                        <InputError message={errors[`config.${field.key}`]} className="mt-1" />
                                    </div>
                                ))}
                                <div className="flex justify-end gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => {
                                            setConnectModalOpen(false);
                                            reset();
                                        }}
                                    >
                                        Hủy
                                    </Button>
                                    <Button type="submit" disabled={processing}>
                                        Kết nối
                                    </Button>
                                </div>
                            </form>
                        )}
                    </DialogContent>
                </Dialog>



                {/* Update Manual Payment Modal (mainly for Bank Transfer) */}
                {bankTransferMethod && (
                    <UpdateManualPaymentModal
                        method={bankTransferMethod}
                        details={bankTransferMethodDetails}
                        bankAccounts={bankAccounts}
                        open={updateManualModalOpen}
                        onOpenChange={setUpdateManualModalOpen}
                    />
                )}
            </SettingLayout>
        </AppLayout>
    );
}
