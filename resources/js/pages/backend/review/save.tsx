
import AppLayout from '@/layouts/app-layout';
import CustomPageHeading from '@/components/custom-page-heading';
import { useForm, Link, Head } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from '@/components/ui/switch';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { Check, ChevronsUpDown, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { dashboard } from '@/routes';
import CustomCard from '@/components/custom-card';
import { Review } from './index';

interface ReviewSaveProps {
    record?: Review & { entity_type: string, entity_name: string };
    config: {
        method: 'create' | 'edit'
    }
}

export default function ReviewSave({ record, config }: ReviewSaveProps) {
    const isEdit = config.method === 'edit';
    const { data, setData, post, put, processing, errors } = useForm({
        fullname: record?.fullname || '',
        email: record?.email || '',
        phone: record?.phone || '',
        score: record?.score || 5,
        content: record?.content || '',
        reviewable_type: record?.entity_type || 'product',
        reviewable_id: record?.reviewable_id || '',
        publish: record?.publish ?? 2, // 2 is typically publish
    });

    const [open, setOpen] = useState(false);
    const [entities, setEntities] = useState<Array<{ value: number, label: string }>>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loadingEntities, setLoadingEntities] = useState(false);
    const [selectedEntityLabel, setSelectedEntityLabel] = useState(record?.entity_name || '');

    useEffect(() => {
        const fetchEntities = async () => {
            if (!searchTerm) {
                // setEntities([]);
                // return;
                // Maybe load defaults if empty?
            }
            setLoadingEntities(true);
            try {
                const response = await axios.get('/backend/review/search-entities', {
                    params: {
                        type: data.reviewable_type,
                        keyword: searchTerm
                    }
                });
                setEntities(response.data);
            } catch (error) {
                console.error("Failed to fetch entities", error);
            } finally {
                setLoadingEntities(false);
            }
        };

        const timeoutId = setTimeout(() => {
            if (data.reviewable_type) {
                fetchEntities();
            }
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [searchTerm, data.reviewable_type]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isEdit && record) {
            put(`/backend/review/${record.id}`);
        } else {
            post('/backend/review');
        }
    };

    const breadcrumbs = [
        {
            title: 'Dashboard',
            href: dashboard().url,
        },
        {
            title: 'Quản lý Đánh giá',
            href: '/backend/review',
        },
        {
            title: isEdit ? 'Cập nhật' : 'Thêm mới',
            href: '#',
        }
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={isEdit ? 'Cập nhật đánh giá' : 'Thêm đánh giá mới'} />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl page-wrapper">
                <CustomPageHeading
                    heading={isEdit ? 'Cập nhật đánh giá' : 'Thêm đánh giá mới'}
                    breadcrumbs={breadcrumbs}
                />

                <div className="page-container max-w-4xl mx-auto w-full">
                    <form onSubmit={handleSubmit}>
                        <CustomCard
                            title="Thông tin đánh giá"
                            description="Nhập thông tin chi tiết cho đánh giá"
                            isShowHeader={true}
                        >
                            <div className="space-y-6">
                                {/* Type Selection */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Loại đối tượng</Label>
                                        <Select
                                            value={data.reviewable_type}
                                            onValueChange={(val) => {
                                                setData('reviewable_type', val);
                                                setData('reviewable_id', '');
                                                setSelectedEntityLabel('');
                                                setSearchTerm('');
                                            }}
                                            disabled={isEdit} // Disable changing type on edit usually better
                                        >
                                            <SelectTrigger className="w-full">
                                                <SelectValue placeholder="Chọn loại" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="product">Sản phẩm</SelectItem>
                                                <SelectItem value="post">Bài viết</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        {errors.reviewable_type && <p className="text-sm text-red-500">{errors.reviewable_type}</p>}
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Đối tượng đánh giá</Label>
                                        <Popover open={open} onOpenChange={setOpen}>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    role="combobox"
                                                    aria-expanded={open}
                                                    className="w-full justify-between font-normal"
                                                    disabled={!data.reviewable_type || isEdit} // Disable on edit if we don't want re-linking
                                                >
                                                    {selectedEntityLabel || (data.reviewable_id ? "Đã chọn (ID: " + data.reviewable_id + ")" : "Tìm kiếm...")}
                                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[400px] p-0">
                                                <Command shouldFilter={false}>
                                                    <CommandInput
                                                        placeholder="Tìm kiếm..."
                                                        value={searchTerm}
                                                        onValueChange={setSearchTerm}
                                                        className="h-9"
                                                    />
                                                    <CommandList>
                                                        {loadingEntities && <div className="p-4 text-center text-sm"><Loader2 className="animate-spin h-4 w-4 mx-auto" /> Loading...</div>}
                                                        {!loadingEntities && entities.length === 0 && <CommandEmpty>Không tìm thấy kết quả.</CommandEmpty>}
                                                        <CommandGroup>
                                                            {entities.map((entity) => (
                                                                <CommandItem
                                                                    key={entity.value}
                                                                    value={String(entity.value)}
                                                                    onSelect={(currentValue) => {
                                                                        setData('reviewable_id', entity.value);
                                                                        setSelectedEntityLabel(entity.label);
                                                                        setOpen(false);
                                                                    }}
                                                                >
                                                                    {entity.label}
                                                                    <Check
                                                                        className={cn(
                                                                            "ml-auto h-4 w-4",
                                                                            Number(data.reviewable_id) === entity.value ? "opacity-100" : "opacity-0"
                                                                        )}
                                                                    />
                                                                </CommandItem>
                                                            ))}
                                                        </CommandGroup>
                                                    </CommandList>
                                                </Command>
                                            </PopoverContent>
                                        </Popover>
                                        {errors.reviewable_id && <p className="text-sm text-red-500 text-right">Vui lòng chọn đối tượng</p>}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="fullname">Họ tên</Label>
                                        <Input
                                            id="fullname"
                                            value={data.fullname}
                                            onChange={e => setData('fullname', e.target.value)}
                                        />
                                        {errors.fullname && <p className="text-sm text-red-500">{errors.fullname}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="score">Điểm đánh giá (1-5)</Label>
                                        <Select
                                            value={String(data.score)}
                                            onValueChange={(val) => setData('score', Number(val))}
                                        >
                                            <SelectTrigger className="w-full">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {[5, 4, 3, 2, 1].map(num => (
                                                    <SelectItem key={num} value={String(num)}>{num} Sao</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {errors.score && <p className="text-sm text-red-500">{errors.score}</p>}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="email">Email (tùy chọn)</Label>
                                        <Input
                                            id="email"
                                            value={data.email}
                                            onChange={e => setData('email', e.target.value)}
                                        />
                                        {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="phone">Số điện thoại (tùy chọn)</Label>
                                        <Input
                                            id="phone"
                                            value={data.phone}
                                            onChange={e => setData('phone', e.target.value)}
                                        />
                                        {errors.phone && <p className="text-sm text-red-500">{errors.phone}</p>}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="content">Nội dung đánh giá</Label>
                                    <Textarea
                                        id="content"
                                        value={data.content}
                                        onChange={e => setData('content', e.target.value)}
                                        rows={5}
                                    />
                                    {errors.content && <p className="text-sm text-red-500">{errors.content}</p>}
                                </div>

                                <div className="flex items-center space-x-2">
                                    <Switch
                                        id="publish"
                                        checked={data.publish == 2}
                                        onCheckedChange={(checked) => setData('publish', checked ? 2 : 1)}
                                    />
                                    <Label htmlFor="publish">Xuất bản</Label>
                                </div>

                                <div className="flex justify-end gap-3 pt-4 border-t">
                                    <Link href="/backend/review">
                                        <Button variant="outline" type="button">Hủy bỏ</Button>
                                    </Link>
                                    <Button type="submit" disabled={processing} className="bg-blue-600 hover:bg-blue-700">
                                        {processing && <Loader2 className="animate-spin mr-2 h-4 w-4" />}
                                        {isEdit ? 'Lưu thay đổi' : 'Tạo đánh giá'}
                                    </Button>
                                </div>
                            </div>
                        </CustomCard>
                    </form>
                </div>
            </div>
        </AppLayout>
    );
}

