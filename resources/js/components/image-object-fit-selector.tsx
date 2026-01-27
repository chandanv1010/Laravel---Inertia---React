import React from 'react';
import { cn } from '@/lib/utils';
import { ImageIcon } from 'lucide-react';

interface ImageObjectFitSelectorProps {
    value: 'cover' | 'scale-down' | 'auto' | 'contain';
    onChange: (value: 'cover' | 'scale-down' | 'auto' | 'contain') => void;
    label?: string;
}

const objectFitOptions = [
    {
        value: 'contain' as const,
        label: 'Contain',
        description: 'Giữ tỷ lệ',
        icon: (
            <svg className="w-10 h-10" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="2" y="2" width="36" height="36" rx="1" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 2" opacity="0.3" />
                <rect x="8" y="8" width="24" height="24" rx="1" fill="currentColor" opacity="0.15" />
                <rect x="8" y="8" width="24" height="24" rx="1" stroke="currentColor" strokeWidth="1.5" />
            </svg>
        )
    },
    {
        value: 'cover' as const,
        label: 'Cover',
        description: 'Phủ đầy',
        icon: (
            <svg className="w-10 h-10" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="2" y="2" width="36" height="36" rx="1" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 2" opacity="0.3" />
                <rect x="-4" y="6" width="48" height="28" rx="1" fill="currentColor" opacity="0.15" />
                <rect x="-4" y="6" width="48" height="28" rx="1" stroke="currentColor" strokeWidth="1.5" />
            </svg>
        )
    },
    {
        value: 'scale-down' as const,
        label: 'Scale Down',
        description: 'Thu nhỏ',
        icon: (
            <svg className="w-10 h-10" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="2" y="2" width="36" height="36" rx="1" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 2" opacity="0.3" />
                <rect x="12" y="12" width="16" height="16" rx="1" fill="currentColor" opacity="0.15" />
                <rect x="12" y="12" width="16" height="16" rx="1" stroke="currentColor" strokeWidth="1.5" />
            </svg>
        )
    },
    {
        value: 'auto' as const,
        label: 'Auto',
        description: 'Kéo dãn',
        icon: (
            <svg className="w-10 h-10" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="2" y="2" width="36" height="36" rx="1" fill="currentColor" opacity="0.15" />
                <rect x="2" y="2" width="36" height="36" rx="1" stroke="currentColor" strokeWidth="1.5" />
            </svg>
        )
    }
];

export default function ImageObjectFitSelector({ value, onChange, label = 'kiểu hiển thị ảnh' }: ImageObjectFitSelectorProps) {
    return (
        <div>
            <label className="text-sm font-normal text-gray-700 mb-2 block">{label}</label>
            <div className="grid grid-cols-4 gap-2">
                {objectFitOptions.map((option) => (
                    <button
                        key={option.value}
                        type="button"
                        onClick={() => onChange(option.value)}
                        title={`${option.label} - ${option.description}`}
                        className={cn(
                            "flex items-center justify-center p-3 rounded-md border transition-all text-gray-600 cursor-pointer",
                            value === option.value
                                ? "border-blue-600 bg-blue-50 text-blue-600"
                                : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                        )}
                    >
                        {option.icon}
                    </button>
                ))}
            </div>
            {/* Hidden input to submit value with form */}
            <input type="hidden" name="image_object_fit" value={value} />
        </div>
    );
}
