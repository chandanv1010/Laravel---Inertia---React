import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import { type BreadcrumbItem } from '@/types';
import { Head, useForm, router } from '@inertiajs/react';
import CustomPageHeading from '@/components/custom-page-heading';
import CustomCard from '@/components/custom-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
    Save, ArrowLeft, Plus, Image as ImageIcon,
    Type, MousePointer, Settings, X, Loader2, ZoomIn, FolderOpen,
    Minus, Square, Circle, Video, Code, Star, Sparkles, Play,
    Heart, Triangle, Pentagon, Hexagon, ArrowRight, MoveHorizontal, Copy,
    Group, Ungroup, Trash2,
    AlignLeft, AlignRight, AlignCenterVertical, AlignCenterHorizontal,
    AlignStartVertical, AlignEndVertical
} from 'lucide-react';
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { type Banner, type Slide, type SlideElement } from './index';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { loadCkfinder } from '@/lib/ckfinder-loader';
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuTrigger,
} from "@/components/ui/context-menu";

// Inject animation keyframes CSS
if (typeof document !== 'undefined' && !document.getElementById('slide-animations')) {
    const style = document.createElement('style');
    style.id = 'slide-animations';
    style.textContent = `
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeInDown { from { opacity: 0; transform: translateY(-30px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeInLeft { from { opacity: 0; transform: translateX(-30px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes fadeInRight { from { opacity: 0; transform: translateX(30px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes zoomIn { from { opacity: 0; transform: scale(0.5); } to { opacity: 1; transform: scale(1); } }
        @keyframes bounce { 0%, 20%, 50%, 80%, 100% { transform: translateY(0); } 40% { transform: translateY(-20px); } 60% { transform: translateY(-10px); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        @keyframes slideInLeft { from { transform: translateX(-100%); } to { transform: translateX(0); } }
        @keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
    `;
    document.head.appendChild(style);
}

// Helper to open CKFinder and return selected image URL
const openCKFinder = async (onSelect: (url: string) => void) => {
    try {
        await loadCkfinder();
        // @ts-ignore
        const CKFinder = (window as any).CKFinder;
        if (CKFinder) {
            // @ts-ignore
            const finder = new CKFinder();
            // @ts-ignore
            finder.basePath = '/plugins/ckfinder_2/';
            // @ts-ignore
            finder.resourceType = 'Images';
            // @ts-ignore
            finder.selectActionFunction = function (fileUrl: string) {
                onSelect(fileUrl);
            };
            // @ts-ignore
            finder.popup();
        }
    } catch (error) {
        console.error('CKFinder error:', error);
    }
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: dashboard().url },
    { title: 'Quản lý Banner', href: '/backend/banner' },
    { title: 'Thêm/Sửa Banner', href: '/' }
];

interface SlideFormData {
    id: string;
    name: string;
    background_image: string;
    background_color: string;
    background_position_x: number; // percentage 0-100, default 50 (center)
    background_position_y: number; // percentage 0-100, default 50 (center)
    elements: SlideElement[];
    url: string;
    target: string;
    publish: string;
}

const createEmptySlide = (): SlideFormData => ({
    id: `slide-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: '',
    background_image: '',
    background_color: '#f0f0f0',
    background_position_x: 50, // center
    background_position_y: 50, // center
    elements: [],
    url: '',
    target: '_self',
    publish: '2',
});

type ElementType = 'text' | 'button' | 'image' | 'icon' | 'divider' | 'shape' | 'video' | 'html' | 'countdown';

const getDefaultSize = (type: ElementType) => {
    switch (type) {
        case 'text': return { width: 300, height: 50 };
        case 'button': return { width: 150, height: 45 };
        case 'image': return { width: 200, height: 150 };
        case 'icon': return { width: 60, height: 60 };
        case 'divider': return { width: 300, height: 4 };
        case 'shape': return { width: 100, height: 100 };
        case 'video': return { width: 400, height: 225 };
        case 'html': return { width: 300, height: 100 };
        case 'countdown': return { width: 280, height: 60 };
        default: return { width: 200, height: 100 };
    }
};

const getDefaultContent = (type: ElementType) => {
    switch (type) {
        case 'text': return 'Nhập văn bản...';
        case 'button': return 'Click here';
        case 'icon': return 'star'; // default icon name
        case 'divider': return '';
        case 'shape': return '';
        case 'video': return ''; // YouTube/embed URL
        case 'html': return '<div style="padding:10px;">Custom HTML</div>';
        case 'countdown': return '86400'; // 1 day in seconds
        default: return '';
    }
};

const createEmptyElement = (type: ElementType): SlideElement => ({
    id: `el-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type,
    content: getDefaultContent(type),
    url: type === 'button' ? '#' : undefined,
    target: '_self',
    position: { x: 50, y: 50 },
    size: getDefaultSize(type),
    style: {
        fontSize: type === 'text' ? '20px' : '16px',
        fontWeight: type === 'text' ? 'bold' : 'normal',
        color: type === 'divider' ? '#ffffff' : '#ffffff',
        backgroundColor: type === 'button' ? '#3b82f6' : type === 'divider' ? '#ffffff' : type === 'shape' ? '#3b82f6' : type === 'countdown' ? '#1c799b' : 'transparent',
        borderRadius: type === 'button' ? '8px' : type === 'shape' ? '50%' : type === 'countdown' ? '4px' : '0px',
        textAlign: 'center',
    },
    zIndex: 10,
    animation: {
        type: 'none',
        duration: 500,
        delay: 0,
        easing: 'ease',
    },
    shapeType: type === 'shape' ? 'circle' : undefined,
    iconName: type === 'icon' ? 'star' : undefined,
    countdownDuration: type === 'countdown' ? 86400 : undefined, // 1 day default
});

// Get CSS animation style for preview
const getAnimationStyle = (animation: SlideElement['animation'], isPlaying: boolean): React.CSSProperties => {
    if (!isPlaying || !animation || animation.type === 'none') {
        return {};
    }

    const keyframes: Record<string, string> = {
        fadeIn: 'fadeIn',
        fadeInUp: 'fadeInUp',
        fadeInDown: 'fadeInDown',
        fadeInLeft: 'fadeInLeft',
        fadeInRight: 'fadeInRight',
        zoomIn: 'zoomIn',
        bounce: 'bounce',
        pulse: 'pulse',
        slideInLeft: 'slideInLeft',
        slideInRight: 'slideInRight',
    };

    return {
        animation: `${keyframes[animation.type]} ${animation.duration}ms ${animation.easing} ${animation.delay}ms forwards`,
    };
};

// Draggable Element Component
const DraggableElement = ({
    element,
    isSelected,
    onSelect,
    onUpdate,
    onDelete,
    canvasRef,
    canvasScale = 1,
    isPreviewPlaying = false,
    canvasWidth = 1500,
    canvasHeight = 500,
    hideRing = false,
    onGroupDrag,
}: {
    element: SlideElement;
    isSelected: boolean;
    hideRing?: boolean;
    onSelect: (ctrlKey: boolean, isDoubleClick?: boolean) => void;
    onUpdate: (updated: SlideElement) => void;
    onDelete: () => void;
    canvasRef: React.RefObject<HTMLDivElement | null>;
    canvasScale?: number;
    isPreviewPlaying?: boolean;
    canvasWidth?: number;
    canvasHeight?: number;
    onGroupDrag?: (deltaX: number, deltaY: number) => void;
}) => {
    const elementRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [resizeDirection, setResizeDirection] = useState<string | null>(null);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    const handleMouseDown = (e: React.MouseEvent) => {
        e.stopPropagation();

        // Only process left-click
        if (e.button !== 0) return;

        onSelect(e.ctrlKey || e.metaKey);

        const target = e.target as HTMLElement;
        if (target.classList.contains('resize-handle')) {
            setIsResizing(true);
            setResizeDirection(target.dataset.direction || 'br');
        } else {
            setIsDragging(true);
        }
        setDragStart({ x: e.clientX, y: e.clientY });
    };

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!canvasRef.current) return;

        // Divide by canvasScale because canvas uses CSS transform:scale()
        // Mouse movement is in screen pixels, but we need canvas pixels
        const deltaX = (e.clientX - dragStart.x) / canvasScale;
        const deltaY = (e.clientY - dragStart.y) / canvasScale;

        if (isDragging) {
            // If onGroupDrag is provided (element is part of a selected group), use it
            if (onGroupDrag) {
                onGroupDrag(deltaX, deltaY);
                setDragStart({ x: e.clientX, y: e.clientY });
            } else {
                // Single element drag - calculate new position
                let newX = element.position.x + deltaX;
                let newY = element.position.y + deltaY;

                // Clamp position to canvas bounds
                // Element cannot go outside left/top bounds
                newX = Math.max(0, newX);
                newY = Math.max(0, newY);
                // Element cannot extend beyond right/bottom bounds
                newX = Math.min(canvasWidth - element.size.width, newX);
                newY = Math.min(canvasHeight - element.size.height, newY);

                onUpdate({
                    ...element,
                    position: { x: newX, y: newY }
                });
                setDragStart({ x: e.clientX, y: e.clientY });
            }
        } else if (isResizing && resizeDirection) {
            let newX = element.position.x;
            let newY = element.position.y;
            let newWidth = element.size.width;
            let newHeight = element.size.height;

            // Handle resize based on direction
            if (resizeDirection.includes('l')) {
                // Left side - move position and shrink width
                newX = element.position.x + deltaX;
                newWidth = element.size.width - deltaX;
            }
            if (resizeDirection.includes('r')) {
                // Right side - just grow width
                newWidth = element.size.width + deltaX;
            }
            if (resizeDirection.includes('t')) {
                // Top side - move position and shrink height
                newY = element.position.y + deltaY;
                newHeight = element.size.height - deltaY;
            }
            if (resizeDirection.includes('b')) {
                // Bottom side - just grow height
                newHeight = element.size.height + deltaY;
            }

            // Enforce minimum size
            newWidth = Math.max(20, newWidth);
            newHeight = Math.max(20, newHeight);

            // Clamp position to canvas bounds (left/top)
            newX = Math.max(0, newX);
            newY = Math.max(0, newY);

            // Clamp size to not exceed canvas bounds (right/bottom)
            if (newX + newWidth > canvasWidth) {
                newWidth = canvasWidth - newX;
            }
            if (newY + newHeight > canvasHeight) {
                newHeight = canvasHeight - newY;
            }

            onUpdate({
                ...element,
                position: { x: newX, y: newY },
                size: { width: newWidth, height: newHeight },
            });
            setDragStart({ x: e.clientX, y: e.clientY });
        }
    }, [isDragging, isResizing, resizeDirection, dragStart, element, onUpdate, canvasRef, canvasScale, canvasWidth, canvasHeight]);

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
        setIsResizing(false);
        setResizeDirection(null);
    }, []);

    useEffect(() => {
        if (isDragging || isResizing) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            return () => {
                window.removeEventListener('mousemove', handleMouseMove);
                window.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [isDragging, isResizing, handleMouseMove, handleMouseUp]);

    return (
        <div
            ref={elementRef}
            className={`absolute cursor-move select-none ${isSelected && !hideRing ? 'ring-2 ring-blue-500' : ''}`}
            style={{
                left: element.position.x,
                top: element.position.y,
                width: element.size.width,
                height: element.size.height,
                zIndex: element.zIndex,
                ...getAnimationStyle(element.animation, isPreviewPlaying),
            }}
            onMouseDown={handleMouseDown}
            onClick={(e) => {
                // Stop propagation to prevent canvas from clearing selection
                // Selection is already handled in onMouseDown
                e.stopPropagation();
            }}
            onDoubleClick={(e) => {
                e.stopPropagation();
                // Double-click to select individual element (Figma-like behavior)
                onSelect(false, true);
            }}
            onContextMenu={(e) => {
                // Allow context menu without changing selection
                e.stopPropagation();
            }}
        >
            {/* Element Content */}
            <div
                className={`w-full h-full pointer-events-none ${element.type !== 'text' ? 'flex items-center justify-center' : ''}`}
                style={{
                    fontSize: element.style.fontSize,
                    fontWeight: element.style.fontWeight,
                    fontStyle: element.style.fontStyle,
                    fontFamily: element.style.fontFamily,
                    lineHeight: element.style.lineHeight,
                    letterSpacing: element.style.letterSpacing,
                    color: element.style.color,
                    backgroundColor: element.style.backgroundColor,
                    borderRadius: element.style.borderRadius,
                    textAlign: element.style.textAlign as any,
                    userSelect: 'none',
                    padding: element.type === 'text' ? '4px 8px' : undefined,
                    display: element.type === 'text' ? 'flex' : undefined,
                    alignItems: element.type === 'text' ? 'center' : undefined,
                }}
            >
                {element.type === 'text' && <span style={{ width: '100%' }}>{element.content}</span>}
                {element.type === 'button' && (
                    <span className="px-4 py-2">{element.content}</span>
                )}
                {element.type === 'image' && element.content && (
                    <img
                        src={element.content}
                        alt=""
                        className="w-full h-full object-cover"
                        draggable={false}
                        onDragStart={(e) => e.preventDefault()}
                    />
                )}
                {element.type === 'image' && !element.content && (
                    <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-500">
                        <ImageIcon className="w-8 h-8" />
                    </div>
                )}
                {element.type === 'icon' && (
                    <div className="w-full h-full flex items-center justify-center" style={{ color: element.style.color }}>
                        {element.iconName === 'star' && <Star className="w-full h-full" />}
                        {element.iconName === 'heart' && <Heart className="w-full h-full" />}
                        {element.iconName === 'sparkles' && <Sparkles className="w-full h-full" />}
                        {element.iconName === 'circle' && <Circle className="w-full h-full" fill="currentColor" />}
                        {element.iconName === 'check' && (
                            <svg className="w-full h-full" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                        )}
                        {element.iconName === 'x' && <X className="w-full h-full" />}
                        {element.iconName === 'arrow' && <ArrowRight className="w-full h-full" />}
                        {!element.iconName && <Star className="w-full h-full" />}
                    </div>
                )}
                {element.type === 'divider' && (
                    <div className="w-full h-full" style={{ backgroundColor: element.style.backgroundColor || '#fff' }} />
                )}
                {element.type === 'shape' && (
                    <>
                        {element.shapeType === 'rectangle' && (
                            <div
                                className="w-full h-full"
                                style={{
                                    backgroundColor: element.style.backgroundColor,
                                    borderRadius: element.style.borderRadius || '0px',
                                }}
                            />
                        )}
                        {element.shapeType === 'circle' && (
                            <div
                                className="w-full h-full"
                                style={{
                                    backgroundColor: element.style.backgroundColor,
                                    borderRadius: '50%',
                                }}
                            />
                        )}
                        {element.shapeType === 'ellipse' && (
                            <div
                                className="w-full h-full"
                                style={{
                                    backgroundColor: element.style.backgroundColor,
                                    borderRadius: '50%',
                                }}
                            />
                        )}
                        {element.shapeType === 'triangle' && (
                            <svg viewBox="0 0 100 100" className="w-full h-full">
                                <polygon points="50,0 100,100 0,100" fill={element.style.backgroundColor || '#3b82f6'} />
                            </svg>
                        )}
                        {element.shapeType === 'line' && (
                            <div className="w-full h-full flex items-center">
                                <div className="w-full h-0.5" style={{ backgroundColor: element.style.backgroundColor || '#3b82f6' }} />
                            </div>
                        )}
                        {element.shapeType === 'arrow' && (
                            <svg viewBox="0 0 100 50" className="w-full h-full">
                                <polygon points="0,15 70,15 70,0 100,25 70,50 70,35 0,35" fill={element.style.backgroundColor || '#3b82f6'} />
                            </svg>
                        )}
                        {element.shapeType === 'star' && (
                            <svg viewBox="0 0 24 24" className="w-full h-full" fill={element.style.backgroundColor || '#3b82f6'}>
                                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                            </svg>
                        )}
                        {element.shapeType === 'polygon' && (
                            <svg viewBox="0 0 100 100" className="w-full h-full">
                                <polygon points="50,0 93.3,25 93.3,75 50,100 6.7,75 6.7,25" fill={element.style.backgroundColor || '#3b82f6'} />
                            </svg>
                        )}
                        {!element.shapeType && (
                            <div
                                className="w-full h-full"
                                style={{
                                    backgroundColor: element.style.backgroundColor,
                                    borderRadius: element.style.borderRadius || '50%',
                                }}
                            />
                        )}
                    </>
                )}
                {element.type === 'video' && (
                    <div className="w-full h-full flex items-center justify-center bg-gray-800 text-white">
                        <Video className="w-12 h-12" />
                    </div>
                )}
                {element.type === 'html' && (
                    <div
                        className="w-full h-full overflow-hidden text-xs"
                        dangerouslySetInnerHTML={{ __html: element.content }}
                    />
                )}
                {element.type === 'countdown' && (
                    <div
                        className="w-full h-full flex items-center justify-center gap-1 px-2"
                        style={{ backgroundColor: element.style.backgroundColor || '#1c799b', borderRadius: element.style.borderRadius || '4px' }}
                    >
                        {/* Preview countdown display */}
                        {['D', 'H', 'M', 'S'].map((label, i) => (
                            <React.Fragment key={label}>
                                <div className="bg-white/20 text-white px-2 py-1 rounded text-xs font-bold min-w-[35px] text-center">
                                    {i === 0 ? Math.floor((element.countdownDuration || 86400) / 86400) :
                                        i === 1 ? Math.floor(((element.countdownDuration || 86400) % 86400) / 3600) :
                                            i === 2 ? Math.floor(((element.countdownDuration || 86400) % 3600) / 60) :
                                                (element.countdownDuration || 86400) % 60} {label}
                                </div>
                                {i < 3 && <span className="text-white font-bold">:</span>}
                            </React.Fragment>
                        ))}
                    </div>
                )}
            </div>

            {/* Resize Handles - Corners and Edges - hidden when part of group selection */}
            {isSelected && !hideRing && (
                <>
                    {/* Corner Handles */}
                    {/* Top-Left */}
                    <div
                        data-direction="tl"
                        className="resize-handle absolute -top-1 -left-1 w-2.5 h-2.5 bg-white border-2 border-blue-500 cursor-nwse-resize z-10"
                    />
                    {/* Top-Right */}
                    <div
                        data-direction="tr"
                        className="resize-handle absolute -top-1 -right-1 w-2.5 h-2.5 bg-white border-2 border-blue-500 cursor-nesw-resize z-10"
                    />
                    {/* Bottom-Left */}
                    <div
                        data-direction="bl"
                        className="resize-handle absolute -bottom-1 -left-1 w-2.5 h-2.5 bg-white border-2 border-blue-500 cursor-nesw-resize z-10"
                    />
                    {/* Bottom-Right */}
                    <div
                        data-direction="br"
                        className="resize-handle absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-white border-2 border-blue-500 cursor-nwse-resize z-10"
                    />

                    {/* Edge Handles */}
                    {/* Top Edge */}
                    <div
                        data-direction="t"
                        className="resize-handle absolute -top-1 left-1/2 -translate-x-1/2 w-6 h-2 bg-white border-2 border-blue-500 cursor-ns-resize z-10 rounded-sm"
                    />
                    {/* Bottom Edge */}
                    <div
                        data-direction="b"
                        className="resize-handle absolute -bottom-1 left-1/2 -translate-x-1/2 w-6 h-2 bg-white border-2 border-blue-500 cursor-ns-resize z-10 rounded-sm"
                    />
                    {/* Left Edge */}
                    <div
                        data-direction="l"
                        className="resize-handle absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-6 bg-white border-2 border-blue-500 cursor-ew-resize z-10 rounded-sm"
                    />
                    {/* Right Edge */}
                    <div
                        data-direction="r"
                        className="resize-handle absolute top-1/2 -right-1 -translate-y-1/2 w-2 h-6 bg-white border-2 border-blue-500 cursor-ew-resize z-10 rounded-sm"
                    />
                </>
            )}
        </div>
    );
};

// Element Properties Panel
const ElementPropertiesPanel = ({
    element,
    onUpdate,
}: {
    element: SlideElement | null;
    onUpdate: (updated: SlideElement) => void;
}) => {
    if (!element) {
        return (
            <div className="p-4 text-center text-muted-foreground">
                Chọn một element để chỉnh sửa
            </div>
        );
    }

    return (
        <div className="p-4 space-y-4">
            <h4 className="font-semibold text-sm">Thuộc tính Element</h4>

            {/* Content */}
            <div>
                <Label className="text-xs">Nội dung</Label>
                {element.type === 'image' ? (
                    <div className="flex gap-2 mt-1">
                        <Input
                            value={element.content}
                            onChange={(e) => onUpdate({ ...element, content: e.target.value })}
                            placeholder="Chưa chọn ảnh"
                            className="flex-1"
                            readOnly
                        />
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => openCKFinder((url) => onUpdate({ ...element, content: url }))}
                        >
                            <FolderOpen className="w-4 h-4" />
                        </Button>
                    </div>
                ) : (
                    <Input
                        value={element.content}
                        onChange={(e) => onUpdate({ ...element, content: e.target.value })}
                        className="mt-1"
                    />
                )}
            </div>

            {/* URL (for buttons) */}
            {element.type === 'button' && (
                <div>
                    <Label className="text-xs">URL</Label>
                    <Input
                        value={element.url || ''}
                        onChange={(e) => onUpdate({ ...element, url: e.target.value })}
                        placeholder="https://..."
                        className="mt-1"
                    />
                </div>
            )}

            {/* Countdown Settings */}
            {element.type === 'countdown' && (
                <div className="border-t pt-4 mt-4 space-y-3">
                    <h4 className="font-semibold text-sm">⏱️ Countdown Settings</h4>

                    {/* Duration Input (Days/Hours/Minutes/Seconds) */}
                    <div className="grid grid-cols-4 gap-1">
                        <div>
                            <Label className="text-xs">Ngày</Label>
                            <Input
                                type="number"
                                min="0"
                                value={Math.floor((element.countdownDuration || 0) / 86400)}
                                onChange={(e) => {
                                    const days = parseInt(e.target.value) || 0;
                                    const currentDuration = element.countdownDuration || 0;
                                    const remaining = currentDuration % 86400;
                                    onUpdate({ ...element, countdownDuration: days * 86400 + remaining });
                                }}
                                className="mt-1 text-center"
                            />
                        </div>
                        <div>
                            <Label className="text-xs">Giờ</Label>
                            <Input
                                type="number"
                                min="0"
                                max="23"
                                value={Math.floor(((element.countdownDuration || 0) % 86400) / 3600)}
                                onChange={(e) => {
                                    const hours = Math.min(23, parseInt(e.target.value) || 0);
                                    const currentDuration = element.countdownDuration || 0;
                                    const days = Math.floor(currentDuration / 86400);
                                    const mins = Math.floor((currentDuration % 3600) / 60);
                                    const secs = currentDuration % 60;
                                    onUpdate({ ...element, countdownDuration: days * 86400 + hours * 3600 + mins * 60 + secs });
                                }}
                                className="mt-1 text-center"
                            />
                        </div>
                        <div>
                            <Label className="text-xs">Phút</Label>
                            <Input
                                type="number"
                                min="0"
                                max="59"
                                value={Math.floor(((element.countdownDuration || 0) % 3600) / 60)}
                                onChange={(e) => {
                                    const mins = Math.min(59, parseInt(e.target.value) || 0);
                                    const currentDuration = element.countdownDuration || 0;
                                    const days = Math.floor(currentDuration / 86400);
                                    const hours = Math.floor((currentDuration % 86400) / 3600);
                                    const secs = currentDuration % 60;
                                    onUpdate({ ...element, countdownDuration: days * 86400 + hours * 3600 + mins * 60 + secs });
                                }}
                                className="mt-1 text-center"
                            />
                        </div>
                        <div>
                            <Label className="text-xs">Giây</Label>
                            <Input
                                type="number"
                                min="0"
                                max="59"
                                value={(element.countdownDuration || 0) % 60}
                                onChange={(e) => {
                                    const secs = Math.min(59, parseInt(e.target.value) || 0);
                                    const currentDuration = element.countdownDuration || 0;
                                    const days = Math.floor(currentDuration / 86400);
                                    const hours = Math.floor((currentDuration % 86400) / 3600);
                                    const mins = Math.floor((currentDuration % 3600) / 60);
                                    onUpdate({ ...element, countdownDuration: days * 86400 + hours * 3600 + mins * 60 + secs });
                                }}
                                className="mt-1 text-center"
                            />
                        </div>
                    </div>

                    <p className="text-xs text-muted-foreground">
                        Tổng: {element.countdownDuration || 0} giây
                    </p>

                    {/* Countdown Style Options */}
                    <div className="border-t pt-3 mt-3 space-y-3">
                        <h5 className="font-medium text-xs text-muted-foreground">🎨 Style</h5>

                        {/* Background Color */}
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <Label className="text-xs">Màu nền</Label>
                                <div className="flex items-center gap-2 mt-1">
                                    <input
                                        type="color"
                                        value={element.style.backgroundColor || '#1c799b'}
                                        onChange={(e) => onUpdate({
                                            ...element,
                                            style: { ...element.style, backgroundColor: e.target.value }
                                        })}
                                        className="w-8 h-8 rounded cursor-pointer border"
                                    />
                                    <Input
                                        value={element.style.backgroundColor || '#1c799b'}
                                        onChange={(e) => onUpdate({
                                            ...element,
                                            style: { ...element.style, backgroundColor: e.target.value }
                                        })}
                                        className="flex-1 h-8 text-xs"
                                    />
                                </div>
                            </div>
                            <div>
                                <Label className="text-xs">Màu chữ</Label>
                                <div className="flex items-center gap-2 mt-1">
                                    <input
                                        type="color"
                                        value={element.style.color || '#ffffff'}
                                        onChange={(e) => onUpdate({
                                            ...element,
                                            style: { ...element.style, color: e.target.value }
                                        })}
                                        className="w-8 h-8 rounded cursor-pointer border"
                                    />
                                    <Input
                                        value={element.style.color || '#ffffff'}
                                        onChange={(e) => onUpdate({
                                            ...element,
                                            style: { ...element.style, color: e.target.value }
                                        })}
                                        className="flex-1 h-8 text-xs"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Border Color & Radius */}
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <Label className="text-xs">Border Color</Label>
                                <div className="flex items-center gap-2 mt-1">
                                    <input
                                        type="color"
                                        value={element.style.borderColor || 'rgba(255,255,255,0.3)'}
                                        onChange={(e) => onUpdate({
                                            ...element,
                                            style: { ...element.style, borderColor: e.target.value }
                                        })}
                                        className="w-8 h-8 rounded cursor-pointer border"
                                    />
                                    <Input
                                        value={element.style.borderColor || 'rgba(255,255,255,0.3)'}
                                        onChange={(e) => onUpdate({
                                            ...element,
                                            style: { ...element.style, borderColor: e.target.value }
                                        })}
                                        className="flex-1 h-8 text-xs"
                                    />
                                </div>
                            </div>
                            <div>
                                <Label className="text-xs">Bo góc</Label>
                                <Input
                                    value={element.style.borderRadius || '4px'}
                                    onChange={(e) => onUpdate({
                                        ...element,
                                        style: { ...element.style, borderRadius: e.target.value }
                                    })}
                                    placeholder="4px"
                                    className="mt-1 h-8 text-xs"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Size */}
            <div className="grid grid-cols-2 gap-2">
                <div>
                    <Label className="text-xs">Rộng</Label>
                    <Input
                        type="number"
                        value={element.size.width}
                        onChange={(e) => onUpdate({
                            ...element,
                            size: { ...element.size, width: parseInt(e.target.value) || 50 }
                        })}
                        className="mt-1"
                    />
                </div>
                <div>
                    <Label className="text-xs">Cao</Label>
                    <Input
                        type="number"
                        value={element.size.height}
                        onChange={(e) => onUpdate({
                            ...element,
                            size: { ...element.size, height: parseInt(e.target.value) || 30 }
                        })}
                        className="mt-1"
                    />
                </div>
            </div>

            {/* Position */}
            <div className="grid grid-cols-2 gap-2">
                <div>
                    <Label className="text-xs">X</Label>
                    <Input
                        type="number"
                        value={element.position.x}
                        onChange={(e) => onUpdate({
                            ...element,
                            position: { ...element.position, x: parseInt(e.target.value) || 0 }
                        })}
                        className="mt-1"
                    />
                </div>
                <div>
                    <Label className="text-xs">Y</Label>
                    <Input
                        type="number"
                        value={element.position.y}
                        onChange={(e) => onUpdate({
                            ...element,
                            position: { ...element.position, y: parseInt(e.target.value) || 0 }
                        })}
                        className="mt-1"
                    />
                </div>
            </div>

            {/* Typography - Figma Style */}
            {(element.type === 'text' || element.type === 'button') && (
                <div className="border-t pt-4 mt-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-sm">Typography</h4>
                        <button type="button" className="text-gray-400 hover:text-gray-600">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <circle cx="12" cy="12" r="1" /><circle cx="12" cy="5" r="1" /><circle cx="12" cy="19" r="1" />
                            </svg>
                        </button>
                    </div>

                    {/* Font Family */}
                    <Select
                        value={element.style.fontFamily || 'Inter'}
                        onValueChange={(v) => onUpdate({
                            ...element,
                            style: { ...element.style, fontFamily: v }
                        })}
                    >
                        <SelectTrigger className="h-8 w-full">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Inter">Inter</SelectItem>
                            <SelectItem value="Arial, sans-serif">Arial</SelectItem>
                            <SelectItem value="'Times New Roman', serif">Times New Roman</SelectItem>
                            <SelectItem value="Georgia, serif">Georgia</SelectItem>
                            <SelectItem value="'Courier New', monospace">Courier New</SelectItem>
                            <SelectItem value="Roboto, sans-serif">Roboto</SelectItem>
                            <SelectItem value="'Open Sans', sans-serif">Open Sans</SelectItem>
                            <SelectItem value="Montserrat, sans-serif">Montserrat</SelectItem>
                        </SelectContent>
                    </Select>

                    {/* Weight + Size Row */}
                    <div className="grid grid-cols-2 gap-2">
                        <Select
                            value={element.style.fontWeight || 'normal'}
                            onValueChange={(v) => onUpdate({
                                ...element,
                                style: { ...element.style, fontWeight: v }
                            })}
                        >
                            <SelectTrigger className="h-8">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="normal">Regular</SelectItem>
                                <SelectItem value="300">Light</SelectItem>
                                <SelectItem value="500">Medium</SelectItem>
                                <SelectItem value="600">Semibold</SelectItem>
                                <SelectItem value="bold">Bold</SelectItem>
                                <SelectItem value="800">Extra Bold</SelectItem>
                            </SelectContent>
                        </Select>
                        <Input
                            type="number"
                            value={parseInt(element.style.fontSize || '16')}
                            onChange={(e) => onUpdate({
                                ...element,
                                style: { ...element.style, fontSize: `${e.target.value}px` }
                            })}
                            className="h-8 text-center text-sm"
                        />
                    </div>

                    {/* Line Height + Letter Spacing Row */}
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <Label className="text-xs text-gray-500">Line height</Label>
                            <div className="relative mt-1">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">A</span>
                                <Input
                                    type="number"
                                    step="0.1"
                                    value={parseFloat(element.style.lineHeight || '1.5')}
                                    onChange={(e) => onUpdate({
                                        ...element,
                                        style: { ...element.style, lineHeight: e.target.value }
                                    })}
                                    className="h-8 text-center pl-6 text-sm"
                                />
                            </div>
                        </div>
                        <div>
                            <Label className="text-xs text-gray-500">Letter spacing</Label>
                            <div className="relative mt-1">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">|A|</span>
                                <Input
                                    value={element.style.letterSpacing || '0%'}
                                    onChange={(e) => onUpdate({
                                        ...element,
                                        style: { ...element.style, letterSpacing: e.target.value }
                                    })}
                                    className="h-8 text-center pl-7 text-sm"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Alignment Row */}
                    <div>
                        <Label className="text-xs text-gray-500">Alignment</Label>
                        <div className="flex items-center gap-1 mt-1">
                            <Button
                                type="button"
                                variant={element.style.textAlign === 'left' || !element.style.textAlign ? 'default' : 'ghost'}
                                size="sm"
                                className="flex-1"
                                onClick={() => onUpdate({
                                    ...element,
                                    style: { ...element.style, textAlign: 'left' }
                                })}
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeWidth="2" d="M3 6h18M3 12h12M3 18h18" />
                                </svg>
                            </Button>
                            <Button
                                type="button"
                                variant={element.style.textAlign === 'center' ? 'default' : 'ghost'}
                                size="sm"
                                className="flex-1"
                                onClick={() => onUpdate({
                                    ...element,
                                    style: { ...element.style, textAlign: 'center' }
                                })}
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeWidth="2" d="M3 6h18M6 12h12M3 18h18" />
                                </svg>
                            </Button>
                            <Button
                                type="button"
                                variant={element.style.textAlign === 'right' ? 'default' : 'ghost'}
                                size="sm"
                                className="flex-1"
                                onClick={() => onUpdate({
                                    ...element,
                                    style: { ...element.style, textAlign: 'right' }
                                })}
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeWidth="2" d="M3 6h18M9 12h12M3 18h18" />
                                </svg>
                            </Button>
                            <Button
                                type="button"
                                variant={element.style.textAlign === 'justify' ? 'default' : 'ghost'}
                                size="sm"
                                className="flex-1"
                                onClick={() => onUpdate({
                                    ...element,
                                    style: { ...element.style, textAlign: 'justify' }
                                })}
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeWidth="2" d="M3 6h18M3 12h18M3 18h18" />
                                </svg>
                            </Button>
                        </div>
                    </div>

                    {/* Color */}
                    <div>
                        <Label className="text-xs text-gray-500">Color</Label>
                        <div className="flex gap-2 mt-1">
                            <input
                                type="color"
                                value={element.style.color || '#000000'}
                                onChange={(e) => onUpdate({
                                    ...element,
                                    style: { ...element.style, color: e.target.value }
                                })}
                                className="w-10 h-9 border rounded cursor-pointer"
                            />
                            <Input
                                value={element.style.color || '#000000'}
                                onChange={(e) => onUpdate({
                                    ...element,
                                    style: { ...element.style, color: e.target.value }
                                })}
                                className="flex-1"
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Background Color */}
            {element.type === 'button' && (
                <div>
                    <Label className="text-xs">Màu nền</Label>
                    <div className="flex gap-2 mt-1">
                        <input
                            type="color"
                            value={element.style.backgroundColor || '#3b82f6'}
                            onChange={(e) => onUpdate({
                                ...element,
                                style: { ...element.style, backgroundColor: e.target.value }
                            })}
                            className="w-10 h-10 border rounded cursor-pointer"
                        />
                        <Input
                            value={element.style.backgroundColor || '#3b82f6'}
                            onChange={(e) => onUpdate({
                                ...element,
                                style: { ...element.style, backgroundColor: e.target.value }
                            })}
                        />
                    </div>
                </div>
            )}

            {/* Z-Index */}
            <div>
                <Label className="text-xs">Layer (zIndex)</Label>
                <Input
                    type="number"
                    value={element.zIndex}
                    onChange={(e) => onUpdate({ ...element, zIndex: parseInt(e.target.value) || 10 })}
                    className="mt-1"
                />
            </div>

            {/* Animation Settings */}
            <div className="border-t pt-4 mt-4">
                <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Hiệu ứng (Animation)
                </h4>

                <div className="space-y-3">
                    {/* Animation Type + Easing on same row */}
                    <div className="flex gap-2">
                        <div className="flex-1" style={{ position: 'relative', zIndex: 20 }}>
                            <Label className="text-xs">Loại Animation</Label>
                            <Select
                                value={element.animation?.type || 'none'}
                                onValueChange={(value) => onUpdate({
                                    ...element,
                                    animation: {
                                        ...element.animation!,
                                        type: value as any,
                                    }
                                })}
                            >
                                <SelectTrigger className="mt-1 h-8">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent position="popper" sideOffset={4}>
                                    <SelectItem value="none">Không có</SelectItem>
                                    <SelectItem value="fadeIn">Fade In</SelectItem>
                                    <SelectItem value="fadeInUp">Fade In Up</SelectItem>
                                    <SelectItem value="fadeInDown">Fade In Down</SelectItem>
                                    <SelectItem value="fadeInLeft">Fade In Left</SelectItem>
                                    <SelectItem value="fadeInRight">Fade In Right</SelectItem>
                                    <SelectItem value="zoomIn">Zoom In</SelectItem>
                                    <SelectItem value="bounce">Bounce</SelectItem>
                                    <SelectItem value="pulse">Pulse</SelectItem>
                                    <SelectItem value="slideInLeft">Slide In Left</SelectItem>
                                    <SelectItem value="slideInRight">Slide In Right</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex-1" style={{ position: 'relative', zIndex: 19 }}>
                            <Label className="text-xs">Easing</Label>
                            <Select
                                value={element.animation?.easing || 'ease'}
                                onValueChange={(value) => onUpdate({
                                    ...element,
                                    animation: {
                                        ...element.animation!,
                                        easing: value as any,
                                    }
                                })}
                            >
                                <SelectTrigger className="mt-1 h-8">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent position="popper" sideOffset={4}>
                                    <SelectItem value="linear">Linear</SelectItem>
                                    <SelectItem value="ease">Ease</SelectItem>
                                    <SelectItem value="ease-in">Ease In</SelectItem>
                                    <SelectItem value="ease-out">Ease Out</SelectItem>
                                    <SelectItem value="ease-in-out">Ease In Out</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Duration + Delay */}
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <Label className="text-xs">Thời gian (ms)</Label>
                            <Input
                                type="number"
                                value={element.animation?.duration || 500}
                                onChange={(e) => onUpdate({
                                    ...element,
                                    animation: {
                                        ...element.animation!,
                                        duration: parseInt(e.target.value) || 500,
                                    }
                                })}
                                className="mt-1"
                                min={100}
                                step={100}
                            />
                        </div>
                        <div>
                            <Label className="text-xs">Trì hoãn (ms)</Label>
                            <Input
                                type="number"
                                value={element.animation?.delay || 0}
                                onChange={(e) => onUpdate({
                                    ...element,
                                    animation: {
                                        ...element.animation!,
                                        delay: parseInt(e.target.value) || 0,
                                    }
                                })}
                                className="mt-1"
                                min={0}
                                step={100}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Slide Builder Component
const SlideBuilder = ({
    slide,
    onUpdate,
    bannerWidth,
    bannerHeight,
}: {
    slide: SlideFormData;
    onUpdate: (updated: SlideFormData) => void;
    bannerWidth: number;
    bannerHeight: number;
}) => {
    const canvasRef = useRef<HTMLDivElement>(null);
    const canvasContainerRef = useRef<HTMLDivElement>(null);
    const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
    const [zoomLevel, setZoomLevel] = useState<number>(50); // Default 50%
    const [isInitialized, setIsInitialized] = useState(false);

    const selectedElement = slide.elements.find(el => el.id === selectedElementId) || null;

    const addElement = (type: ElementType, options?: { shapeType?: string; iconName?: string }) => {
        const newElement = createEmptyElement(type);
        if (options?.shapeType) {
            (newElement as any).shapeType = options.shapeType;
            // Adjust borderRadius based on shape type
            if (options.shapeType === 'rectangle') newElement.style.borderRadius = '0px';
            else if (options.shapeType === 'circle') newElement.style.borderRadius = '50%';
            else if (options.shapeType === 'triangle') newElement.style.borderRadius = '0px';
        }
        if (options?.iconName) {
            (newElement as any).iconName = options.iconName;
        }
        onUpdate({
            ...slide,
            elements: [...slide.elements, newElement],
        });
        setSelectedElementId(newElement.id);
    };

    const updateElement = (updated: SlideElement) => {
        onUpdate({
            ...slide,
            elements: slide.elements.map(el => el.id === updated.id ? updated : el),
        });
    };

    const deleteElement = (id: string) => {
        onUpdate({
            ...slide,
            elements: slide.elements.filter(el => el.id !== id),
        });
        if (selectedElementId === id) {
            setSelectedElementId(null);
        }
    };

    // Container dimensions
    const containerWidth = 800;
    const containerHeight = 500;
    const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);

    // Safe banner dimensions
    const safeWidth = bannerWidth || 1200;
    const safeHeight = bannerHeight || 500;

    // Calculate fit scale to ensure banner fits in container
    const getFitScale = () => {
        const scaleX = containerWidth / safeWidth;
        const scaleY = containerHeight / safeHeight;
        return Math.min(scaleX, scaleY, 1) * 100; // Return as percentage
    };

    const fitScalePercent = Math.round(getFitScale());
    const canvasScale = zoomLevel / 100;
    const displayWidth = safeWidth * canvasScale;
    const displayHeight = safeHeight * canvasScale;

    // Ctrl + Scroll zoom handler function - used as onWheel prop
    // Use ref to track zoom level synchronously for event handlers
    const zoomLevelRef = useRef(zoomLevel);

    // Sync ref when state changes
    useEffect(() => {
        zoomLevelRef.current = zoomLevel;
    }, [zoomLevel]);

    // Ctrl + Scroll zoom handler - DOCUMENT LEVEL with CAPTURE to intercept before browser zoom
    useEffect(() => {
        const container = canvasContainerRef.current;
        if (!container) return;

        const handleWheel = (e: WheelEvent) => {
            // Only handle if Ctrl is pressed
            if (!e.ctrlKey) return;

            // Check if mouse is over the canvas container
            const rect = container.getBoundingClientRect();
            const isOverContainer =
                e.clientX >= rect.left &&
                e.clientX <= rect.right &&
                e.clientY >= rect.top &&
                e.clientY <= rect.bottom;

            if (!isOverContainer) return;

            // CRITICAL: Prevent browser's native zoom
            e.preventDefault();
            e.stopPropagation();

            // Figma-like smooth zoom - very low sensitivity for gradual zoom
            const ZOOM_SENSITIVITY = 0.05;
            const delta = -e.deltaY * ZOOM_SENSITIVITY;

            // Use ref value for calculation
            const currentZoom = zoomLevelRef.current;
            const newZoom = Math.max(10, Math.min(200, currentZoom + delta));

            // Update ref immediately
            zoomLevelRef.current = newZoom;
            setZoomLevel(newZoom);
        };

        // CRITICAL: Use capture phase to intercept BEFORE browser handles it
        document.addEventListener('wheel', handleWheel, { passive: false, capture: true });
        return () => document.removeEventListener('wheel', handleWheel, { capture: true });
    }, [isInitialized]);

    // Auto-fit on mount (only once)
    useEffect(() => {
        if (!isInitialized && safeWidth > 0 && safeHeight > 0) {
            setZoomLevel(fitScalePercent);
            setIsInitialized(true);
        }
    }, [safeWidth, safeHeight, isInitialized, fitScalePercent]);

    // Multi-select support
    const [selectedElementIds, setSelectedElementIds] = useState<string[]>([]);

    // Undo/Redo history stack
    const [history, setHistory] = useState<SlideElement[][]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const isUndoRedoAction = useRef(false);

    // Push current state to history (called before making changes)
    const pushToHistory = useCallback(() => {
        if (isUndoRedoAction.current) {
            isUndoRedoAction.current = false;
            return;
        }
        const currentElements = JSON.parse(JSON.stringify(slide.elements));
        setHistory(prev => {
            // Remove any future states if we're not at the end
            const newHistory = prev.slice(0, historyIndex + 1);
            // Add current state and limit to 50 entries
            const updated = [...newHistory, currentElements].slice(-50);
            return updated;
        });
        setHistoryIndex(prev => Math.min(prev + 1, 49));
    }, [slide.elements, historyIndex]);

    // Undo function
    const undo = useCallback(() => {
        if (historyIndex > 0) {
            isUndoRedoAction.current = true;
            const previousState = history[historyIndex - 1];
            setHistoryIndex(prev => prev - 1);
            onUpdate({ ...slide, elements: previousState });
        }
    }, [history, historyIndex, slide, onUpdate]);

    // Redo function
    const redo = useCallback(() => {
        if (historyIndex < history.length - 1) {
            isUndoRedoAction.current = true;
            const nextState = history[historyIndex + 1];
            setHistoryIndex(prev => prev + 1);
            onUpdate({ ...slide, elements: nextState });
        }
    }, [history, historyIndex, slide, onUpdate]);

    // Initialize history with current state on mount
    useEffect(() => {
        if (history.length === 0 && slide.elements.length > 0) {
            setHistory([JSON.parse(JSON.stringify(slide.elements))]);
            setHistoryIndex(0);
        }
    }, []);

    // Track changes to push to history (debounced)
    const lastElementsRef = useRef<string>('');
    useEffect(() => {
        const currentElementsStr = JSON.stringify(slide.elements);
        if (lastElementsRef.current && lastElementsRef.current !== currentElementsStr && !isUndoRedoAction.current) {
            pushToHistory();
        }
        lastElementsRef.current = currentElementsStr;
    }, [slide.elements]);

    // Handle element selection (with Ctrl for multi-select, double-click for individual)
    const handleElementSelect = (elementId: string, ctrlKey: boolean = false, isDoubleClick: boolean = false) => {
        const safeElements = Array.isArray(slide.elements) ? slide.elements : [];
        const clickedElement = safeElements.find(el => el.id === elementId);

        if (!clickedElement) return;

        // Double-click: select only this element (enter "edit mode" for group)
        if (isDoubleClick) {
            setSelectedElementIds([elementId]);
            setSelectedElementId(elementId);
            return;
        }

        // Single click on grouped element: select entire group
        if (clickedElement.groupId && !ctrlKey) {
            const groupElementIds = safeElements
                .filter(el => el.groupId === clickedElement.groupId)
                .map(el => el.id);
            setSelectedElementIds(groupElementIds);
            setSelectedElementId(elementId);
            return;
        }

        // Ctrl+click: multi-select toggle
        if (ctrlKey) {
            setSelectedElementIds(prev => {
                if (prev.includes(elementId)) {
                    return prev.filter(id => id !== elementId);
                } else {
                    return [...prev, elementId];
                }
            });
            setSelectedElementId(elementId);
        } else {
            // Single select non-grouped element
            setSelectedElementIds([elementId]);
            setSelectedElementId(elementId);
        }
    };

    // Move selected elements by delta
    const moveSelectedElements = (deltaX: number, deltaY: number) => {
        const idsToMove = selectedElementIds.length > 0 ? selectedElementIds : (selectedElementId ? [selectedElementId] : []);
        if (idsToMove.length === 0) return;

        const safeElements = Array.isArray(slide.elements) ? slide.elements : [];
        const updatedElements = safeElements.map(el => {
            if (idsToMove.includes(el.id)) {
                // Calculate new position with clamping
                let newX = el.position.x + deltaX;
                let newY = el.position.y + deltaY;

                // Clamp to canvas bounds
                newX = Math.max(0, Math.min(safeWidth - el.size.width, newX));
                newY = Math.max(0, Math.min(safeHeight - el.size.height, newY));

                return {
                    ...el,
                    position: { x: newX, y: newY }
                };
            }
            return el;
        });

        onUpdate({ ...slide, elements: updatedElements });
    };

    // Keyboard handler: Delete + Arrow keys
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Don't handle if we're in an input field
            const activeElement = document.activeElement;
            if (activeElement?.tagName === 'INPUT' || activeElement?.tagName === 'TEXTAREA') {
                return;
            }

            const hasSelection = selectedElementId || selectedElementIds.length > 0;

            // Ctrl+Z - Undo
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                undo();
                return;
            }

            // Ctrl+Y or Ctrl+Shift+Z - Redo
            if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
                e.preventDefault();
                redo();
                return;
            }

            // Delete key
            if (e.key === 'Delete' && hasSelection) {
                const idsToDelete = selectedElementIds.length > 0 ? selectedElementIds : [selectedElementId!];
                idsToDelete.forEach(id => deleteElement(id));
                setSelectedElementIds([]);
                return;
            }

            // Arrow keys - move element 1px (or 10px with Shift)
            if (hasSelection && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                e.preventDefault();
                const step = e.shiftKey ? 10 : 1;

                switch (e.key) {
                    case 'ArrowUp':
                        moveSelectedElements(0, -step);
                        break;
                    case 'ArrowDown':
                        moveSelectedElements(0, step);
                        break;
                    case 'ArrowLeft':
                        moveSelectedElements(-step, 0);
                        break;
                    case 'ArrowRight':
                        moveSelectedElements(step, 0);
                        break;
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedElementId, selectedElementIds, slide.elements, undo, redo]);

    // Group selected elements
    const groupSelectedElements = () => {
        const idsToGroup = selectedElementIds.length > 0 ? selectedElementIds : (selectedElementId ? [selectedElementId] : []);
        if (idsToGroup.length < 2) return; // Need at least 2 elements to group

        const groupId = `group-${Date.now()}`;
        const safeElements = Array.isArray(slide.elements) ? slide.elements : [];
        const updatedElements = safeElements.map(el => {
            if (idsToGroup.includes(el.id)) {
                return { ...el, groupId };
            }
            return el;
        });

        onUpdate({ ...slide, elements: updatedElements });
    };

    // Ungroup selected elements
    const ungroupSelectedElements = () => {
        const idsToUngroup = selectedElementIds.length > 0 ? selectedElementIds : (selectedElementId ? [selectedElementId] : []);
        if (idsToUngroup.length === 0) return;

        const safeElements = Array.isArray(slide.elements) ? slide.elements : [];

        // Get the groupId from one of the selected elements
        const selectedElement = safeElements.find(el => idsToUngroup.includes(el.id));
        const groupIdToRemove = selectedElement?.groupId;

        if (!groupIdToRemove) return;

        // Remove groupId from all elements in that group
        const updatedElements = safeElements.map(el => {
            if (el.groupId === groupIdToRemove) {
                const { groupId, ...rest } = el;
                return rest as typeof el;
            }
            return el;
        });

        onUpdate({ ...slide, elements: updatedElements });
    };

    // Check if current selection has groupable elements (need 2 or more)
    const canGroup = selectedElementIds.length >= 2;

    // Check if current selection can be ungrouped (any selected element has groupId)
    const safeElementsList = Array.isArray(slide.elements) ? slide.elements : [];
    const currentSelectedElement = selectedElementId ? safeElementsList.find(el => el.id === selectedElementId) : null;
    const canUngroup = selectedElementIds.some(id => {
        const el = safeElementsList.find(e => e.id === id);
        return el?.groupId != null;
    }) || currentSelectedElement?.groupId != null;

    // Calculate group bounding box for selected group
    const getGroupBoundingBox = () => {
        if (selectedElementIds.length < 2) return null;

        // Check if all selected elements have the same groupId
        const selectedElements = safeElementsList.filter(el => selectedElementIds.includes(el.id));
        const groupIds = [...new Set(selectedElements.map(el => el.groupId).filter(Boolean))];

        // Only show bounding box if all selected elements are from the same group
        if (groupIds.length !== 1) return null;

        // Calculate bounding box
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        selectedElements.forEach(el => {
            minX = Math.min(minX, el.position.x);
            minY = Math.min(minY, el.position.y);
            maxX = Math.max(maxX, el.position.x + el.size.width);
            maxY = Math.max(maxY, el.position.y + el.size.height);
        });

        return {
            x: minX - 4,
            y: minY - 4,
            width: maxX - minX + 8,
            height: maxY - minY + 8,
        };
    };

    const groupBoundingBox = getGroupBoundingBox();
    // Check if we're in group selection mode (should hide individual rings)
    const isGroupSelectionMode = groupBoundingBox !== null;

    // Preview animation handler
    const playPreviewAnimation = () => {
        setIsPreviewPlaying(true);
        // Reset after all animations complete
        const maxDuration = Math.max(...slide.elements.map(el =>
            (el.animation?.duration || 500) + (el.animation?.delay || 0)
        ), 1000);
        setTimeout(() => setIsPreviewPlaying(false), maxDuration + 100);
    };

    // Position alignment functions - align selected elements/group to canvas
    const getSelectedElementsForAlignment = () => {
        const idsToAlign = selectedElementIds.length > 0 ? selectedElementIds : (selectedElementId ? [selectedElementId] : []);
        return safeElementsList.filter(el => idsToAlign.includes(el.id));
    };

    const alignToLeft = () => {
        const elementsToAlign = getSelectedElementsForAlignment();
        if (elementsToAlign.length === 0) return;

        // Find the leftmost position in the group
        const minX = Math.min(...elementsToAlign.map(el => el.position.x));

        // Move all elements so the leftmost edge is at x=0
        const deltaX = -minX;
        const updatedElements = safeElementsList.map(el => {
            if (elementsToAlign.some(e => e.id === el.id)) {
                return { ...el, position: { ...el.position, x: el.position.x + deltaX } };
            }
            return el;
        });
        onUpdate({ ...slide, elements: updatedElements });
    };

    const alignToRight = () => {
        const elementsToAlign = getSelectedElementsForAlignment();
        if (elementsToAlign.length === 0) return;

        // Find the rightmost edge
        const maxXEdge = Math.max(...elementsToAlign.map(el => el.position.x + el.size.width));

        // Move all elements so the rightmost edge is at canvas right
        const deltaX = safeWidth - maxXEdge;
        const updatedElements = safeElementsList.map(el => {
            if (elementsToAlign.some(e => e.id === el.id)) {
                return { ...el, position: { ...el.position, x: el.position.x + deltaX } };
            }
            return el;
        });
        onUpdate({ ...slide, elements: updatedElements });
    };

    const alignToTop = () => {
        const elementsToAlign = getSelectedElementsForAlignment();
        if (elementsToAlign.length === 0) return;

        const minY = Math.min(...elementsToAlign.map(el => el.position.y));
        const deltaY = -minY;
        const updatedElements = safeElementsList.map(el => {
            if (elementsToAlign.some(e => e.id === el.id)) {
                return { ...el, position: { ...el.position, y: el.position.y + deltaY } };
            }
            return el;
        });
        onUpdate({ ...slide, elements: updatedElements });
    };

    const alignToBottom = () => {
        const elementsToAlign = getSelectedElementsForAlignment();
        if (elementsToAlign.length === 0) return;

        const maxYEdge = Math.max(...elementsToAlign.map(el => el.position.y + el.size.height));
        const deltaY = safeHeight - maxYEdge;
        const updatedElements = safeElementsList.map(el => {
            if (elementsToAlign.some(e => e.id === el.id)) {
                return { ...el, position: { ...el.position, y: el.position.y + deltaY } };
            }
            return el;
        });
        onUpdate({ ...slide, elements: updatedElements });
    };

    const alignToCenterH = () => {
        const elementsToAlign = getSelectedElementsForAlignment();
        if (elementsToAlign.length === 0) return;

        // Calculate group bounding box
        const minX = Math.min(...elementsToAlign.map(el => el.position.x));
        const maxXEdge = Math.max(...elementsToAlign.map(el => el.position.x + el.size.width));
        const groupWidth = maxXEdge - minX;
        const groupCenterX = minX + groupWidth / 2;

        // Calculate center offset
        const canvasCenterX = safeWidth / 2;
        const deltaX = canvasCenterX - groupCenterX;

        const updatedElements = safeElementsList.map(el => {
            if (elementsToAlign.some(e => e.id === el.id)) {
                return { ...el, position: { ...el.position, x: el.position.x + deltaX } };
            }
            return el;
        });
        onUpdate({ ...slide, elements: updatedElements });
    };

    const alignToCenterV = () => {
        const elementsToAlign = getSelectedElementsForAlignment();
        if (elementsToAlign.length === 0) return;

        const minY = Math.min(...elementsToAlign.map(el => el.position.y));
        const maxYEdge = Math.max(...elementsToAlign.map(el => el.position.y + el.size.height));
        const groupHeight = maxYEdge - minY;
        const groupCenterY = minY + groupHeight / 2;

        const canvasCenterY = safeHeight / 2;
        const deltaY = canvasCenterY - groupCenterY;

        const updatedElements = safeElementsList.map(el => {
            if (elementsToAlign.some(e => e.id === el.id)) {
                return { ...el, position: { ...el.position, y: el.position.y + deltaY } };
            }
            return el;
        });
        onUpdate({ ...slide, elements: updatedElements });
    };

    const hasSelectedElements = selectedElementIds.length > 0 || selectedElementId != null;

    return (
        <div className="flex gap-4">
            {/* Canvas Area - min-w-0 is critical for flex item to shrink */}
            <div className="flex-1 min-w-0 overflow-hidden">
                {/* Toolbar */}
                <div className="flex items-center justify-between gap-2 mb-4 p-2 bg-gray-100 rounded-lg">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium mr-2">Thêm:</span>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => addElement('text')}
                            title="Text"
                        >
                            <Type className="w-4 h-4 mr-1" />
                            Text
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => addElement('button')}
                            title="Button"
                        >
                            <MousePointer className="w-4 h-4 mr-1" />
                            Button
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => addElement('image')}
                            title="Image"
                        >
                            <ImageIcon className="w-4 h-4 mr-1" />
                            Image
                        </Button>
                        {/* Icon Dropdown */}
                        <Select
                            onValueChange={(iconName) => addElement('icon', { iconName })}
                        >
                            <SelectTrigger className="w-[100px] h-8 text-sm">
                                <Star className="w-4 h-4 mr-1" />
                                <span>Icon</span>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="star">⭐ Star</SelectItem>
                                <SelectItem value="heart">❤️ Heart</SelectItem>
                                <SelectItem value="sparkles">✨ Sparkles</SelectItem>
                                <SelectItem value="circle">⚫ Circle</SelectItem>
                                <SelectItem value="check">✔️ Check</SelectItem>
                                <SelectItem value="x">❌ X Mark</SelectItem>
                                <SelectItem value="arrow">➡️ Arrow</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => addElement('divider')}
                            title="Divider"
                        >
                            <Minus className="w-4 h-4 mr-1" />
                            Divider
                        </Button>
                        {/* Shape Dropdown */}
                        <Select
                            onValueChange={(shapeType) => addElement('shape', { shapeType })}
                        >
                            <SelectTrigger className="w-[100px] h-8 text-sm">
                                <Circle className="w-4 h-4 mr-1" />
                                <span>Shape</span>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="rectangle">▢ Rectangle</SelectItem>
                                <SelectItem value="circle">○ Circle</SelectItem>
                                <SelectItem value="ellipse">⬭ Ellipse</SelectItem>
                                <SelectItem value="triangle">△ Triangle</SelectItem>
                                <SelectItem value="line">━ Line</SelectItem>
                                <SelectItem value="arrow">→ Arrow</SelectItem>
                                <SelectItem value="star">☆ Star</SelectItem>
                                <SelectItem value="polygon">⬡ Polygon</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => addElement('video')}
                            title="Video"
                        >
                            <Video className="w-4 h-4 mr-1" />
                            Video
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => addElement('html')}
                            title="HTML"
                        >
                            <Code className="w-4 h-4 mr-1" />
                            HTML
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => addElement('countdown')}
                            title="Countdown Timer"
                            className="bg-orange-50 border-orange-300 hover:bg-orange-100"
                        >
                            ⏱️ Countdown
                        </Button>

                        {/* Separator */}
                        <div className="w-px h-6 bg-gray-300 mx-1" />

                        {/* Position Alignment */}
                        <span className="text-sm font-medium mr-1">Căn:</span>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={alignToLeft}
                            disabled={!hasSelectedElements}
                            title="Căn trái (canvas)"
                            className="px-2"
                        >
                            <AlignLeft className="w-4 h-4" />
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={alignToCenterH}
                            disabled={!hasSelectedElements}
                            title="Căn giữa ngang"
                            className="px-2"
                        >
                            <AlignCenterHorizontal className="w-4 h-4" />
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={alignToRight}
                            disabled={!hasSelectedElements}
                            title="Căn phải (canvas)"
                            className="px-2"
                        >
                            <AlignRight className="w-4 h-4" />
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={alignToTop}
                            disabled={!hasSelectedElements}
                            title="Căn trên (canvas)"
                            className="px-2"
                        >
                            <AlignStartVertical className="w-4 h-4" />
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={alignToCenterV}
                            disabled={!hasSelectedElements}
                            title="Căn giữa dọc"
                            className="px-2"
                        >
                            <AlignCenterVertical className="w-4 h-4" />
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={alignToBottom}
                            disabled={!hasSelectedElements}
                            title="Căn dưới (canvas)"
                            className="px-2"
                        >
                            <AlignEndVertical className="w-4 h-4" />
                        </Button>
                    </div>

                    {/* Zoom Controls + Preview */}
                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            variant="default"
                            size="sm"
                            onClick={playPreviewAnimation}
                            disabled={isPreviewPlaying}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            <Play className="w-4 h-4 mr-1" />
                            Preview
                        </Button>
                        <ZoomIn className="w-4 h-4 text-gray-500" />
                        <Select
                            value={zoomLevel.toString()}
                            onValueChange={(v) => {
                                if (v === 'fit') {
                                    setZoomLevel(fitScalePercent);
                                } else {
                                    setZoomLevel(parseInt(v) || 50);
                                }
                            }}
                        >
                            <SelectTrigger className="w-[100px] h-8">
                                <SelectValue>{Math.round(zoomLevel)}%</SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="fit">Vừa khung ({fitScalePercent}%)</SelectItem>
                                <SelectItem value="200">200%</SelectItem>
                                <SelectItem value="150">150%</SelectItem>
                                <SelectItem value="125">125%</SelectItem>
                                <SelectItem value="100">100%</SelectItem>
                                <SelectItem value="90">90%</SelectItem>
                                <SelectItem value="80">80%</SelectItem>
                                <SelectItem value="75">75%</SelectItem>
                                <SelectItem value="70">70%</SelectItem>
                                <SelectItem value="60">60%</SelectItem>
                                <SelectItem value="50">50%</SelectItem>
                                <SelectItem value="40">40%</SelectItem>
                                <SelectItem value="30">30%</SelectItem>
                                <SelectItem value="25">25%</SelectItem>
                                <SelectItem value="20">20%</SelectItem>
                                <SelectItem value="15">15%</SelectItem>
                                <SelectItem value="10">10%</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Scrollable Canvas Container - Ctrl+Scroll to zoom */}
                <ContextMenu>
                    <ContextMenuTrigger asChild>
                        <div
                            ref={canvasContainerRef}
                            className="border-2 border-dashed border-gray-300 bg-gray-200 rounded-lg overflow-auto"
                            style={{
                                width: '100%',
                                maxHeight: containerHeight + 40,
                                minHeight: 400,
                                padding: '20px',
                            }}
                        >
                            {/* Canvas wrapper - sized to match scaled canvas for proper centering */}
                            <div
                                style={{
                                    width: safeWidth * canvasScale,
                                    height: safeHeight * canvasScale,
                                    flexShrink: 0,
                                    position: 'relative',
                                    margin: '0 auto', // Center horizontally
                                }}
                            >
                                {/* Canvas - uses CSS transform for uniform scaling */}
                                <div
                                    ref={canvasRef}
                                    className="relative overflow-hidden"
                                    style={{
                                        width: safeWidth,
                                        height: safeHeight,
                                        backgroundColor: slide.background_color || '#f0f0f0',
                                        backgroundImage: slide.background_image ? `url(${slide.background_image})` : undefined,
                                        backgroundSize: 'cover',
                                        backgroundPosition: `${slide.background_position_x ?? 50}% ${slide.background_position_y ?? 50}%`,
                                        transform: `scale(${canvasScale})`,
                                        transformOrigin: 'top left',
                                    }}
                                    onClick={(e) => {
                                        // Only clear selection on left-click on empty canvas area
                                        if (e.button === 0) {
                                            setSelectedElementId(null);
                                            setSelectedElementIds([]);
                                        }
                                    }}
                                    onContextMenu={(e) => {
                                        // Prevent right-click from clearing selection
                                        // Context menu will handle selection
                                    }}
                                >
                                    {/* Grid overlay - 1 cell = 20px */}
                                    <div
                                        className="absolute inset-0 pointer-events-none opacity-20"
                                        style={{
                                            backgroundImage: 'linear-gradient(#ccc 1px, transparent 1px), linear-gradient(90deg, #ccc 1px, transparent 1px)',
                                            backgroundSize: '20px 20px',
                                        }}
                                    />

                                    {/* Elements - rendered at original scale, CSS transform handles zoom */}
                                    {slide.elements.map((element) => {
                                        // Check if this element is part of the currently selected group
                                        const isInSelectedGroup = isGroupSelectionMode && selectedElementIds.includes(element.id);

                                        return (
                                            <DraggableElement
                                                key={element.id}
                                                element={element}
                                                isSelected={selectedElementId === element.id || selectedElementIds.includes(element.id)}
                                                hideRing={isGroupSelectionMode && selectedElementIds.includes(element.id)}
                                                onSelect={(ctrlKey: boolean, isDoubleClick?: boolean) => handleElementSelect(element.id, ctrlKey, isDoubleClick)}
                                                onUpdate={(updated) => {
                                                    // Convert mouse movement back to original scale
                                                    updateElement(updated);
                                                }}
                                                onDelete={() => deleteElement(element.id)}
                                                canvasRef={canvasRef}
                                                canvasScale={canvasScale}
                                                isPreviewPlaying={isPreviewPlaying}
                                                canvasWidth={safeWidth}
                                                canvasHeight={safeHeight}
                                                // Pass group drag handler when element is part of a selected group
                                                onGroupDrag={isInSelectedGroup ? (deltaX, deltaY) => {
                                                    moveSelectedElements(deltaX, deltaY);
                                                } : undefined}
                                            />
                                        );
                                    })}

                                    {/* Group bounding box overlay */}
                                    {groupBoundingBox && (
                                        <div
                                            className="absolute pointer-events-none border-2 border-blue-500 bg-blue-500/5"
                                            style={{
                                                left: groupBoundingBox.x,
                                                top: groupBoundingBox.y,
                                                width: groupBoundingBox.width,
                                                height: groupBoundingBox.height,
                                                zIndex: 9999,
                                            }}
                                        >
                                            {/* Corner handles for group */}
                                            <div className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-white border-2 border-blue-500" />
                                            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-white border-2 border-blue-500" />
                                            <div className="absolute -bottom-1 -left-1 w-2.5 h-2.5 bg-white border-2 border-blue-500" />
                                            <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-white border-2 border-blue-500" />
                                        </div>
                                    )}

                                    {/* Empty state */}
                                    {slide.elements.length === 0 && (
                                        <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                                            <div className="text-center">
                                                <Plus className="w-12 h-12 mx-auto mb-2" />
                                                <p>Thêm elements từ toolbar bên trên</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </ContextMenuTrigger>
                    <ContextMenuContent>
                        <ContextMenuItem
                            onClick={groupSelectedElements}
                            disabled={!canGroup}
                            className={!canGroup ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                        >
                            <Group className="w-4 h-4 mr-2" />
                            Nhóm elements (Group)
                        </ContextMenuItem>
                        <ContextMenuItem
                            onClick={ungroupSelectedElements}
                            disabled={!canUngroup}
                            className={!canUngroup ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                        >
                            <Ungroup className="w-4 h-4 mr-2" />
                            Bỏ nhóm (Ungroup)
                        </ContextMenuItem>
                        <ContextMenuSeparator />
                        <ContextMenuItem
                            onClick={() => {
                                const idsToDelete = selectedElementIds.length > 0 ? selectedElementIds : (selectedElementId ? [selectedElementId] : []);
                                idsToDelete.forEach(id => deleteElement(id));
                                setSelectedElementIds([]);
                            }}
                            disabled={!selectedElementId && selectedElementIds.length === 0}
                            className="text-red-600 focus:text-red-600"
                        >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Xóa element
                        </ContextMenuItem>
                    </ContextMenuContent>
                </ContextMenu>

                <p className="text-xs text-muted-foreground mt-2">
                    Canvas: {safeWidth}x{safeHeight}px | Hiển thị: {zoomLevel}% | Ctrl+Scroll để zoom
                </p>
            </div>

            {/* Properties Panel */}
            <div className="w-64 border rounded-lg bg-white">
                <div className="p-3 border-b bg-gray-50 font-medium text-sm">
                    <Settings className="w-4 h-4 inline mr-2" />
                    Cài Đặt
                </div>
                <ElementPropertiesPanel
                    element={selectedElement}
                    onUpdate={updateElement}
                />
            </div>
        </div>
    );
};

interface IBannerSaveProps {
    banner: Banner | null;
}

export default function BannerSave({ banner }: IBannerSaveProps) {
    const isEdit = !!banner;

    const { data, setData, processing, errors } = useForm({
        name: banner?.name || '',
        code: banner?.code || '',
        position: banner?.position || '',
        description: banner?.description || '',
        width: banner?.width || 1200,
        height: banner?.height || 500,
        publish: banner?.publish || '2',
    });

    const [slides, setSlides] = useState<SlideFormData[]>(
        banner?.slides?.map(s => {
            // Parse elements if it's a string (JSON from DB)
            let parsedElements = [];
            if (s.elements) {
                if (typeof s.elements === 'string') {
                    try {
                        parsedElements = JSON.parse(s.elements);
                    } catch (e) {
                        parsedElements = [];
                    }
                } else if (Array.isArray(s.elements)) {
                    parsedElements = s.elements;
                }
            }

            return {
                id: s.id.toString(),
                name: s.name || '',
                background_image: s.background_image || '',
                background_color: s.background_color || '#f0f0f0',
                background_position_x: s.background_position_x ?? 50,
                background_position_y: s.background_position_y ?? 50,
                elements: parsedElements,
                url: s.url || '',
                target: s.target || '_self',
                publish: s.publish || '2',
            };
        }) || []
    );
    const [activeSlideIndex, setActiveSlideIndex] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        const formData = {
            ...data,
            slides: slides,
        };

        const options = {
            onSuccess: () => {
                router.visit('/backend/banner');
            },
            onError: () => {
                setIsSubmitting(false);
            },
            onFinish: () => {
                setIsSubmitting(false);
            },
        };

        if (isEdit) {
            router.put(`/backend/banner/${banner.id}`, formData as any, options);
        } else {
            router.post('/backend/banner', formData as any, options);
        }
    };

    const addSlide = () => {
        setSlides(prev => [...prev, createEmptySlide()]);
        setActiveSlideIndex(slides.length);
    };

    const removeSlide = (index: number) => {
        setSlides(prev => prev.filter((_, i) => i !== index));
        if (activeSlideIndex >= slides.length - 1) {
            setActiveSlideIndex(Math.max(0, slides.length - 2));
        }
    };

    const duplicateSlide = (index: number) => {
        const slideToDuplicate = slides[index];
        const newSlide: SlideFormData = {
            ...slideToDuplicate,
            id: `slide-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: slideToDuplicate.name ? `${slideToDuplicate.name} (Copy)` : '',
            elements: slideToDuplicate.elements.map(el => ({
                ...el,
                id: `el-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            })),
        };
        setSlides(prev => {
            const newSlides = [...prev];
            newSlides.splice(index + 1, 0, newSlide);
            return newSlides;
        });
        setActiveSlideIndex(index + 1);
    };

    const updateSlide = (index: number, updated: SlideFormData) => {
        setSlides(prev => {
            const newSlides = [...prev];
            newSlides[index] = updated;
            return newSlides;
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={isEdit ? 'Sửa Banner' : 'Thêm Banner'} />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl page-wrapper">
                <CustomPageHeading
                    heading={isEdit ? 'Sửa Banner' : 'Thêm Banner Mới'}
                    breadcrumbs={breadcrumbs}
                />

                <form onSubmit={handleSubmit} className="page-container">
                    {/* Banner Info */}
                    <CustomCard
                        isShowHeader={true}
                        title="Thông tin Banner"
                        description="Cấu hình cơ bản cho banner"
                    >
                        <div className="grid grid-cols-12 gap-4">
                            <div className="col-span-3">
                                <Label htmlFor="name">Tên Banner <span className="text-red-500">*</span></Label>
                                <Input
                                    id="name"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    placeholder="VD: Homepage Hero Slider"
                                    className="mt-1"
                                />
                                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                            </div>
                            <div className="col-span-2">
                                <Label htmlFor="code">Mã Code</Label>
                                <Input
                                    id="code"
                                    value={data.code}
                                    onChange={(e) => setData('code', e.target.value)}
                                    placeholder="homepage-hero"
                                    className="mt-1"
                                />
                            </div>
                            <div className="col-span-2">
                                <Label htmlFor="position">Vị trí</Label>
                                <Select
                                    value={data.position}
                                    onValueChange={(value) => setData('position', value)}
                                >
                                    <SelectTrigger className="mt-1">
                                        <SelectValue placeholder="Chọn vị trí" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="homepage">Trang chủ</SelectItem>
                                        <SelectItem value="sidebar">Sidebar</SelectItem>
                                        <SelectItem value="footer">Footer</SelectItem>
                                        <SelectItem value="category">Trang danh mục</SelectItem>
                                        <SelectItem value="popup">Popup</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="col-span-1">
                                <Label htmlFor="width">Rộng (px)</Label>
                                <Input
                                    id="width"
                                    type="number"
                                    value={data.width}
                                    onChange={(e) => setData('width', parseInt(e.target.value) || 1200)}
                                    className="mt-1"
                                />
                            </div>
                            <div className="col-span-1">
                                <Label htmlFor="height">Cao (px)</Label>
                                <Input
                                    id="height"
                                    type="number"
                                    value={data.height}
                                    onChange={(e) => setData('height', parseInt(e.target.value) || 500)}
                                    className="mt-1"
                                />
                            </div>
                            <div className="col-span-3 flex items-end">
                                <div className="flex items-center gap-4">
                                    <Label htmlFor="publish" className="text-sm">Kích hoạt</Label>
                                    <Switch
                                        id="publish"
                                        checked={data.publish === '2'}
                                        onCheckedChange={(checked) => setData('publish', checked ? '2' : '1')}
                                    />
                                </div>
                            </div>
                        </div>
                    </CustomCard>

                    {/* Slides Management */}
                    <CustomCard
                        isShowHeader={true}
                        title="Quản lý Slides"
                        description="Thêm và thiết kế các slide với drag-and-drop"
                        className="mt-4"
                    >
                        {/* Slide Tabs */}
                        <div className="flex items-center gap-2 mb-4 p-2 bg-gray-50 rounded-lg overflow-x-auto">
                            {slides.map((slide, index) => (
                                <div
                                    key={slide.id}
                                    className={`flex items-center gap-1 px-3 py-2 rounded cursor-pointer whitespace-nowrap ${activeSlideIndex === index ? 'bg-blue-500 text-white' : 'bg-white hover:bg-gray-100'
                                        }`}
                                    onClick={() => setActiveSlideIndex(index)}
                                >
                                    <span>Slide {index + 1}</span>
                                    {/* Duplicate button */}
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            duplicateSlide(index);
                                        }}
                                        className="ml-1 hover:text-green-500"
                                        title="Nhân bản slide"
                                    >
                                        <Copy className="w-4 h-4" />
                                    </button>
                                    {slides.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                removeSlide(index);
                                            }}
                                            className="hover:text-red-500"
                                            title="Xóa slide"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            ))}
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={addSlide}
                            >
                                <Plus className="w-4 h-4 mr-1" />
                                Thêm Slide
                            </Button>
                        </div>

                        {/* Slide Settings */}
                        {slides[activeSlideIndex] && (
                            <div className="mb-4 p-4 border rounded-lg bg-gray-50">
                                <div className="grid grid-cols-12 gap-4">
                                    <div className="col-span-3">
                                        <Label className="text-xs">Tên Slide</Label>
                                        <Input
                                            value={slides[activeSlideIndex].name}
                                            onChange={(e) => updateSlide(activeSlideIndex, {
                                                ...slides[activeSlideIndex],
                                                name: e.target.value,
                                            })}
                                            placeholder="Slide 1"
                                            className="mt-1"
                                        />
                                    </div>
                                    <div className="col-span-3">
                                        <Label className="text-xs">Background Image</Label>
                                        <div className="flex gap-2 mt-1">
                                            <Input
                                                value={slides[activeSlideIndex].background_image}
                                                placeholder="Chưa chọn ảnh nền"
                                                className="flex-1 text-xs"
                                                readOnly
                                            />
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => openCKFinder((url) => updateSlide(activeSlideIndex, {
                                                    ...slides[activeSlideIndex],
                                                    background_image: url,
                                                }))}
                                            >
                                                <FolderOpen className="w-4 h-4" />
                                            </Button>
                                            {slides[activeSlideIndex].background_image && (
                                                <Button
                                                    type="button"
                                                    variant="destructive"
                                                    size="sm"
                                                    onClick={() => updateSlide(activeSlideIndex, {
                                                        ...slides[activeSlideIndex],
                                                        background_image: '',
                                                    })}
                                                >
                                                    <X className="w-4 h-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                    <div className="col-span-2">
                                        <Label className="text-xs">Background Color</Label>
                                        <div className="flex gap-2 mt-1">
                                            <input
                                                type="color"
                                                value={slides[activeSlideIndex].background_color}
                                                onChange={(e) => updateSlide(activeSlideIndex, {
                                                    ...slides[activeSlideIndex],
                                                    background_color: e.target.value,
                                                })}
                                                className="w-10 h-9 border rounded cursor-pointer"
                                            />
                                            <Input
                                                value={slides[activeSlideIndex].background_color}
                                                onChange={(e) => updateSlide(activeSlideIndex, {
                                                    ...slides[activeSlideIndex],
                                                    background_color: e.target.value,
                                                })}
                                            />
                                        </div>
                                    </div>
                                    <div className="col-span-1">
                                        <Label className="text-xs">Vị trí X (%)</Label>
                                        <div className="flex gap-1 mt-1">
                                            <Input
                                                type="number"
                                                min={0}
                                                max={100}
                                                value={slides[activeSlideIndex].background_position_x}
                                                onChange={(e) => {
                                                    const val = parseInt(e.target.value);
                                                    updateSlide(activeSlideIndex, {
                                                        ...slides[activeSlideIndex],
                                                        background_position_x: isNaN(val) ? 50 : Math.max(0, Math.min(100, val)),
                                                    });
                                                }}
                                                className="w-full"
                                            />
                                        </div>
                                    </div>
                                    <div className="col-span-1">
                                        <Label className="text-xs">Vị trí Y (%)</Label>
                                        <div className="flex gap-1 mt-1">
                                            <Input
                                                type="number"
                                                min={0}
                                                max={100}
                                                value={slides[activeSlideIndex].background_position_y}
                                                onChange={(e) => {
                                                    const val = parseInt(e.target.value);
                                                    updateSlide(activeSlideIndex, {
                                                        ...slides[activeSlideIndex],
                                                        background_position_y: isNaN(val) ? 50 : Math.max(0, Math.min(100, val)),
                                                    });
                                                }}
                                                className="w-full"
                                            />
                                        </div>
                                    </div>
                                    <div className="col-span-2">
                                        <Label className="text-xs">Link khi click slide</Label>
                                        <Input
                                            value={slides[activeSlideIndex].url}
                                            onChange={(e) => updateSlide(activeSlideIndex, {
                                                ...slides[activeSlideIndex],
                                                url: e.target.value,
                                            })}
                                            placeholder="https://..."
                                            className="mt-1"
                                        />
                                    </div>
                                    <div className="col-span-2 flex items-end">
                                        <div className="flex items-center gap-2">
                                            <Label className="text-xs">Hiển thị</Label>
                                            <Switch
                                                checked={slides[activeSlideIndex].publish === '2'}
                                                onCheckedChange={(checked) => updateSlide(activeSlideIndex, {
                                                    ...slides[activeSlideIndex],
                                                    publish: checked ? '2' : '1',
                                                })}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Slide Builder */}
                        {slides[activeSlideIndex] ? (
                            <SlideBuilder
                                key={slides[activeSlideIndex].id}
                                slide={slides[activeSlideIndex]}
                                onUpdate={(updated) => updateSlide(activeSlideIndex, updated)}
                                bannerWidth={data.width}
                                bannerHeight={data.height}
                            />
                        ) : (
                            <div className="text-center py-12 text-gray-500">
                                <p className="mb-4">Chưa có slide nào</p>
                                <Button type="button" variant="outline" onClick={addSlide}>
                                    <Plus className="w-4 h-4 mr-2" />
                                    Thêm Slide Đầu Tiên
                                </Button>
                            </div>
                        )}
                    </CustomCard>

                    {/* Actions */}
                    <div className="flex gap-2 mt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => router.visit('/backend/banner')}
                        >
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Quay lại
                        </Button>
                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            {isSubmitting ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                                <Save className="h-4 w-4 mr-2" />
                            )}
                            {isSubmitting ? 'Đang lưu...' : 'Lưu Banner'}
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
