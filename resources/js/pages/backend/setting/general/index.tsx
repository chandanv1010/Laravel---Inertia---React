
import HeadingSmall from '@/components/heading-small';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import AppLayout from '@/layouts/app-layout';
import SettingLayout from '@/layouts/setting/layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { useState, useEffect, useMemo } from 'react';
import InputError from '@/components/input-error';
import EditorPage from '@/components/editor';
import { Separator } from '@/components/ui/separator';
import { Languages, Image as ImageIcon, X, HelpCircle } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { loadCkfinder } from "@/lib/ckfinder-loader";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Cấu hình chung', href: '/backend/setting/general' },
];

interface Language {
    id: number;
    name: string;
    canonical: string;
    image: string;
}

interface SystemValue {
    content: string;
}

interface System {
    id: number;
    label: string;
    keyword: string;
    type: string;
    description?: string;
    languages: (Language & { pivot: SystemValue })[];
    is_translatable: number;
    attributes?: any;
}

interface SystemCatalogue {
    id: number;
    name: string;
    keyword: string;
    systems: System[];
}

interface GeneralSettingPageProps {
    systemCatalogues: SystemCatalogue[];
    languages: Language[];
}

export default function SettingGeneralPage({
    systemCatalogues = [],
    languages = []
}: GeneralSettingPageProps) {
    // Filter out Vietnamese language (canonical = 'vi' or 'vn')
    const otherLanguages = languages.filter(lang => {
        const canonical = (lang.canonical || '').toLowerCase();
        return !['vi', 'vn', 'vietnamese'].includes(canonical);
    });

    // Initial data construction
    const initialData = useMemo(() => {
        const settings: Record<string, Record<string, string>> = {};

        systemCatalogues.forEach(cat => {
            cat.systems.forEach(sys => {
                settings[sys.keyword] = {};
                // Populate existing values
                sys.languages.forEach(lang => {
                    // Assuming lang.id matches pivot.language_id
                    settings[sys.keyword][lang.id] = lang.pivot.content || '';
                });

                // Ensure default (or all languages) have keys?
                // Backend expects specific language IDs AND 'default'.
                // If backend maps 'default' to ID 1, let's keep it simple: use Language IDs as keys.
                // But for "default" language in the main input, we usually use the default site language.
                // Let's assume ID 1 is default for now (or pass defaultLangId from backend).
                // If a value exists for ID 1, put it in 'default' too?
                // Actually, let's store strictly by Language ID. frontend 'default' key concept might be redundant if we just iterate languages.
                // BUT the main input (without translation modal) needs to bind to ONE language.
                const defaultLangId = 1; // HARDCODED for now.
                if (!settings[sys.keyword][defaultLangId]) settings[sys.keyword][defaultLangId] = '';

                // If we want 'default' key for semantics:
                settings[sys.keyword]['default'] = settings[sys.keyword][defaultLangId] || '';
            });
        });
        return settings;
    }, [systemCatalogues]);

    const { data, setData, put, processing, errors, reset } = useForm({
        settings: initialData
    });

    // Helper to update specific setting/language
    const updateSetting = (keyword: string, langId: string | number, value: any) => {
        const current = data.settings[keyword] || {};
        setData('settings', {
            ...data.settings,
            [keyword]: {
                ...current,
                [langId]: value
            }
        });
    };

    // Translation Modal State
    const [translationModalOpen, setTranslationModalOpen] = useState(false);
    const [currentTranslationField, setCurrentTranslationField] = useState<{ keyword: string, label: string, type: string } | null>(null);
    const [activeTranslationLang, setActiveTranslationLang] = useState<Language | null>(null);
    const [translationValue, setTranslationValue] = useState('');
    const [savingTranslation, setSavingTranslation] = useState(false);

    const openTranslation = (keyword: string, label: string, type: string, lang: Language) => {
        setCurrentTranslationField({ keyword, label, type });
        setActiveTranslationLang(lang);
        // Get current translation value for this language
        const currentValue = data.settings[keyword]?.[lang.id] || '';
        setTranslationValue(currentValue);
        setTranslationModalOpen(true);
    }

    const handleSaveTranslation = async () => {
        if (!currentTranslationField || !activeTranslationLang) return;
        
        setSavingTranslation(true);
        try {
            // Update local state immediately
            updateSetting(currentTranslationField.keyword, activeTranslationLang.id, translationValue);
            
            // Prepare settings payload - merge with existing settings
            const settingsToSave = {
                ...data.settings,
                [currentTranslationField.keyword]: {
                    ...(data.settings[currentTranslationField.keyword] || {}),
                    [activeTranslationLang.id]: translationValue
                }
            };
            
            // Save to database immediately
            router.put('/backend/setting/general', {
                settings: settingsToSave
            }, {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => {
                    setTranslationModalOpen(false);
                    setSavingTranslation(false);
                },
                onError: () => {
                    setSavingTranslation(false);
                }
            });
        } catch (error) {
            console.error('Error saving translation:', error);
            setSavingTranslation(false);
        }
    }

    // Image Finder
    const openFinder = async (keyword: string, langId: string | number) => {
        try {
            await loadCkfinder()
            const CKFinder = (window as any).CKFinder
            if (CKFinder) {
                const finder = new CKFinder();
                finder.basePath = '/plugins/ckfinder_2/';
                finder.resourceType = 'Images';
                finder.selectActionFunction = function (fileUrl: string) {
                    updateSetting(keyword, langId, fileUrl);
                }
                finder.popup();
            }
        } catch (error) {
            console.error('CKFinder error:', error)
        }
    }

    const renderFieldInput = (sys: System, langId: string | number = 1, isModal = false) => {
        const value = data.settings[sys.keyword]?.[langId] ?? '';

        switch (sys.type) {
            case 'text':
            case 'email':
            case 'hotline': // Treat custom types as text
            case 'phone':
                return (
                    <Input
                        value={value}
                        onChange={(e) => updateSetting(sys.keyword, langId, e.target.value)}
                        placeholder={`Nhập ${sys.label.toLowerCase()}...`}
                    />
                );
            case 'textarea':
                return (
                    <Textarea
                        value={value}
                        onChange={(e) => updateSetting(sys.keyword, langId, e.target.value)}
                        placeholder={`Nhập ${sys.label.toLowerCase()}...`}
                        className="min-h-[250px]"
                        rows={10}
                    />
                );
            case 'editor':
                return (
                    <EditorPage
                        name={`${sys.keyword}_${langId}`}
                        value={value}
                        onChange={(val: string) => updateSetting(sys.keyword, langId, val)}
                        height={300}
                    />
                );
            case 'select':
                // Check if options exist in attributes
                const options = sys.attributes?.options || [];

                if (options.length > 0) {
                    return (
                        <Select value={value} onValueChange={(val) => updateSetting(sys.keyword, langId, val)}>
                            <SelectTrigger>
                                <SelectValue placeholder={`Chọn ${sys.label.toLowerCase()}`} />
                            </SelectTrigger>
                            <SelectContent>
                                {options.map((opt: any, idx: number) => (
                                    <SelectItem key={idx} value={opt.value}>{opt.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )
                }

                // Fallback for hardcoded or empty
                if (sys.keyword === 'website_status') {
                    return (
                        <Select value={value} onValueChange={(val) => updateSetting(sys.keyword, langId, val)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Chọn trạng thái" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="open">Hoạt động</SelectItem>
                                <SelectItem value="maintain">Bảo trì</SelectItem>
                            </SelectContent>
                        </Select>
                    )
                }
                return <Input value={value} onChange={(e) => updateSetting(sys.keyword, langId, e.target.value)} />;

            case 'image':
                return (
                    <div className="flex flex-col gap-3">
                        <div className="flex gap-2">
                            <Input
                                value={value}
                                readOnly
                                placeholder="Đường dẫn hình ảnh..."
                                className="bg-gray-50 header-gray-500"
                            />
                            <Button type="button" variant="secondary" onClick={() => openFinder(sys.keyword, langId)}>
                                Chọn ảnh
                            </Button>
                        </div>
                        {value && (
                            <div className="relative w-max group border rounded-md p-1 bg-white">
                                <img src={value} alt="Preview" className="h-24 object-contain" />
                                <button
                                    type="button"
                                    onClick={() => updateSetting(sys.keyword, langId, '')}
                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        )}
                    </div>
                );
            default:
                return (
                    <Input
                        value={value}
                        onChange={(e) => updateSetting(sys.keyword, langId, e.target.value)}
                    />
                );
        }
    }

    const renderField = (sys: System) => {
        // Default language ID (1).
        const defaultLangId = 1;

        // Check if translatable (not image, not select? User implied images might be translatable too?)
        // "khi click vao bieu tuong dich thi phai hien thi len cac loai co... chon co nao thi bat popup"
        // This implies ALL fields could support translation if architected that way.
        // My schema supports it (system_language).

        return (
            <div key={sys.keyword} className="space-y-2">
                <div className="flex items-center gap-2">
                    <Label>{sys.label}</Label>
                    
                    {/* Description Tooltip */}
                    {sys.description && (
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <HelpCircle className="h-4 w-4 text-gray-400 cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent className="bg-black text-white max-w-xs">
                                    <p>{sys.description}</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    )}

                    {/* Translation Trigger */}
                    {otherLanguages.length > 0 && sys.is_translatable === 1 && (
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-400 hover:text-blue-500 rounded-full hover:bg-blue-50 ml-auto">
                                    <Languages size={14} />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto py-1 px-2" align="start" side="top">
                                <div className="flex flex-wrap gap-1.5">
                                    {otherLanguages.map(lang => (
                                        <TooltipProvider key={lang.id}>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <button
                                                        type="button"
                                                        onClick={() => openTranslation(sys.keyword, sys.label, sys.type, lang)}
                                                        className="hover:scale-105 transition-transform p-0.5 rounded hover:bg-gray-100 cursor-pointer border-t-0"
                                                    >
                                                        <img
                                                            src={lang.image}
                                                            alt={lang.name}
                                                            className="w-6 h-auto object-cover cursor-pointer"
                                                            style={{ margin: 0, borderRadius: 0 }}
                                                        />
                                                    </button>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p>{lang.name}</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    ))}
                                </div>
                            </PopoverContent>
                        </Popover>
                    )}
                </div>

                {renderFieldInput(sys, defaultLangId)}
            </div>
        )
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        router.put('/backend/setting/general', {
            settings: data.settings,
        }, {
            preserveScroll: true,
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Cấu hình chung" />
            <SettingLayout>
                <div className="flex items-center justify-between mb-6">
                    <HeadingSmall
                        title="Cấu hình chung"
                        description="Quản lý các thông số hệ thống linh hoạt."
                    />
                    <Button variant="outline" onClick={() => router.get('/backend/system/catalogue')}>
                        Cấu hình hệ thống
                    </Button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <Tabs defaultValue={systemCatalogues[0]?.keyword} className="w-full">
                        <TabsList className="mb-4 flex-wrap h-auto">
                            {systemCatalogues.map(cat => (
                                <TabsTrigger key={cat.id} value={cat.keyword}>
                                    {cat.name}
                                </TabsTrigger>
                            ))}
                        </TabsList>

                        {systemCatalogues.map(cat => (
                            <TabsContent key={cat.id} value={cat.keyword}>
                                <Card>
                                    <CardHeader>
                                        <CardTitle>{cat.name}</CardTitle>
                                        <CardDescription>Cập nhật thông tin {cat.name.toLowerCase()}</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        {cat.systems.map(sys => (
                                            <div key={sys.id}>
                                                {renderField(sys)}
                                                <Separator className="my-6 last:hidden" />
                                            </div>
                                        ))}
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        ))}
                    </Tabs>

                    <div className="flex justify-end gap-3 pt-4 border-t sticky bottom-0 bg-white p-4 shadow-top z-10">
                        <Button type="button" variant="outline" onClick={() => reset()} disabled={processing}>
                            Đặt lại
                        </Button>
                        <Button type="submit" disabled={processing}>
                            {processing ? 'Đang lưu...' : 'Lưu thay đổi'}
                        </Button>
                    </div>
                </form>

                {/* Translation Modal */}
                <Dialog open={translationModalOpen} onOpenChange={setTranslationModalOpen}>
                    <DialogContent className="sm:max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>
                                Dịch: {currentTranslationField?.label}
                                <span className="ml-2 text-sm font-normal text-gray-500">
                                    ({activeTranslationLang?.name})
                                </span>
                            </DialogTitle>
                        </DialogHeader>

                        <div className="py-4">
                            {currentTranslationField && activeTranslationLang && (
                                currentTranslationField.type === 'textarea' ? (
                                    <Textarea
                                        value={translationValue}
                                        onChange={(e) => setTranslationValue(e.target.value)}
                                        placeholder={`Nhập ${currentTranslationField.label.toLowerCase()}...`}
                                        className="min-h-[250px]"
                                        rows={10}
                                    />
                                ) : currentTranslationField.type === 'editor' ? (
                                    <EditorPage
                                        name={`${currentTranslationField.keyword}_${activeTranslationLang.id}`}
                                        value={translationValue}
                                        onChange={(val: string) => setTranslationValue(val)}
                                        height={300}
                                    />
                                ) : (
                                    <Input
                                        value={translationValue}
                                        onChange={(e) => setTranslationValue(e.target.value)}
                                        placeholder={`Nhập ${currentTranslationField.label.toLowerCase()}...`}
                                    />
                                )
                            )}
                        </div>

                        <DialogFooter>
                            <Button 
                                variant="outline" 
                                onClick={() => setTranslationModalOpen(false)}
                                disabled={savingTranslation}
                            >
                                Hủy
                            </Button>
                            <Button 
                                onClick={handleSaveTranslation}
                                disabled={savingTranslation}
                            >
                                {savingTranslation ? 'Đang lưu...' : 'Lưu lại'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

            </SettingLayout>
        </AppLayout>
    );
}
