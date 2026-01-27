import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Languages } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Language {
    id: number;
    name: string;
    canonical: string;
    image: string;
}

interface SettingTranslationPopoverProps {
    fieldKey: string;
    fieldLabel: string;
    languages: Language[];
    settingsByLanguage: Record<string, Record<string | number, any>>;
    currentValue: string;
    onValueChange: (key: string, languageId: number | 'default', value: string) => void;
    fieldType?: 'text' | 'textarea' | 'email' | 'url';
    placeholder?: string;
}

export default function SettingTranslationPopover({
    fieldKey,
    fieldLabel,
    languages,
    settingsByLanguage,
    currentValue,
    onValueChange,
    fieldType = 'text',
    placeholder,
}: SettingTranslationPopoverProps) {
    const [open, setOpen] = useState(false);

    // Lấy giá trị cho từng ngôn ngữ
    const getLanguageValue = (languageId: number | 'default'): string => {
        if (languageId === 'default') {
            return currentValue || '';
        }
        return settingsByLanguage[fieldKey]?.[languageId] || '';
    };

    const handleLanguageValueChange = (languageId: number | 'default', value: string) => {
        onValueChange(fieldKey, languageId, value);
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                    }}
                >
                    <Languages className="h-4 w-4" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-96" align="end">
                <div className="space-y-4">
                    <div className="font-semibold text-sm">{fieldLabel} - Dịch</div>
                    
                    {/* Default language */}
                    <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Ngôn ngữ mặc định</Label>
                        {fieldType === 'textarea' ? (
                            <textarea
                                className="w-full min-h-[80px] px-3 py-2 text-sm border rounded-md resize-none"
                                value={getLanguageValue('default')}
                                onChange={(e) => handleLanguageValueChange('default', e.target.value)}
                                placeholder={placeholder}
                            />
                        ) : (
                            <Input
                                type={fieldType}
                                value={getLanguageValue('default')}
                                onChange={(e) => handleLanguageValueChange('default', e.target.value)}
                                placeholder={placeholder}
                                className="text-sm"
                            />
                        )}
                    </div>

                    {/* Other languages */}
                    {languages.map((language) => (
                        <div key={language.id} className="space-y-2">
                            <Label className="text-xs text-muted-foreground flex items-center gap-2">
                                {language.image && (
                                    <img 
                                        src={language.image} 
                                        alt={language.name}
                                        className="w-4 h-4 object-cover rounded"
                                    />
                                )}
                                {language.name}
                            </Label>
                            {fieldType === 'textarea' ? (
                                <textarea
                                    className="w-full min-h-[80px] px-3 py-2 text-sm border rounded-md resize-none"
                                    value={getLanguageValue(language.id)}
                                    onChange={(e) => handleLanguageValueChange(language.id, e.target.value)}
                                    placeholder={placeholder}
                                />
                            ) : (
                                <Input
                                    type={fieldType}
                                    value={getLanguageValue(language.id)}
                                    onChange={(e) => handleLanguageValueChange(language.id, e.target.value)}
                                    placeholder={placeholder}
                                    className="text-sm"
                                />
                            )}
                        </div>
                    ))}
                </div>
            </PopoverContent>
        </Popover>
    );
}

