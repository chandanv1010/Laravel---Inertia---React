import { useCallback, useMemo, useRef, useState } from 'react';
// import { useMemo } from 'react';
import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import { type IDateTime, type BreadcrumbItem, type PageConfig } from '@/types';
import { Head, Form } from '@inertiajs/react';
import CustomPageHeading from '@/components/custom-page-heading';
import CustomCard from '@/components/custom-card';
// import CustomNotice from '@/components/custom-notice';
import { Button } from "@/components/ui/button"
import { LoaderCircle } from 'lucide-react';
// import { Label } from '@/components/ui/label';
// import { Input } from "@/components/ui/input"
// import InputError from '@/components/input-error';
import post from '@/routes/post';
import { setPreserveState } from '@/lib/helper';
// import EditorPage from '@/components/editor';
import Seo from '@/components/custom-seo';
import CustomGeneral from '@/components/custom-general';
import { FormProvider } from '@/contexts/FormContext';
import CustomAlbum from '@/components/custom-album';
// import CustomAlbumDirectUpload from '@/components/custom-album-direct-upload';
import CustomCatalogueParent from '@/components/custom-catalogue-parent';
import type { TParentCatalogue } from '@/types';
import CustomFeaturedImage from '@/components/custom-featured-image';
import CustomSeoOptions from '@/components/custom-seo-options';
import CustomSeoScores from '@/components/custom-seo-scores';
import usePageSetup from '@/hooks/use-page-setup';
import { MultiSelect } from '@/components/custom-multiple-select';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: dashboard().url,
    },
    {
        title: 'Thêm mới Bài Viết',
        href: '/',
    }
];

const pageConfig: PageConfig<Post> = {
    heading: 'Quản lý Bài Viết',
}

export interface Post extends IDateTime{
    id: number,
    post_catalogue_id: number,
    publish: string,
    image: string,
    album?: string[],
    order?: number,
    robots?: string,
    // Language fields - flat structure
    name?: string,
    description?: string,
    content?: string,
    canonical?: string,
    meta_title?: string,
    meta_keyword?: string,
    meta_description?: string,
    // Creator fields - flat structure
    creator_id?: number,
    creator_name?: string,
    // Post catalogues
    post_catalogues?: Array<{id: number, name: string}>,
    // Translation status
    translated_language_ids?: number[]
}

interface PostSaveProps {
    record?: Post,
    catalogues: TParentCatalogue
}
export default function PostSave({record, catalogues}: PostSaveProps) {

    const {
        initData
    } = usePageSetup<Post>({record})

    const [images, setImages] = useState<string[]>(record?.album || [])
    const [postCatalogues, setPostCatalogues] = useState<string[]>([])
    const [postCatalogueId, setPostCatalogueId] = useState<string>('')
    // const sessionId = useMemo(() => {
    //     return record?.id ? `post_catalogue-${record.id}` : `post_catalogue-${Date.now()}`
    // }, [record?.id])

    const buttonAction = useRef("")
    const isEdit = !!record

    const availableCatalogues = useMemo(() => {
        // Backend đã trả về array với format [{value, label}] giữ nguyên thứ tự lft asc
        return Array.isArray(catalogues) ? catalogues : []
    }, [catalogues])

    const handleAlbumImagesChange = useCallback((urls: string[]) => {
        
        setImages((prev) => {
            const prevString = JSON.stringify(prev)
            const newString = JSON.stringify(urls)
            if(prevString !== newString){
                return urls
            }
            return prev
        })
    }, [])
 
  
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={pageConfig.heading} />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl page-wrapper">
                <CustomPageHeading 
                    heading={pageConfig.heading}
                    breadcrumbs={breadcrumbs}
                />
                <div className="page-container">
                    <FormProvider initData={initData}>
                        <Form 
                            options={{
                                preserveScroll: true,
                                preserveState: setPreserveState,
                            }}  
                            action={
                                isEdit ? post.update(record.id).url : post.store().url
                            }
                            method="post"
                            resetOnSuccess={['name', 'canonical', 'description', 'meta_title', 'meta_keyword', 'meta_description', 'description', 'content', 'images']}
                                
                            transform={(data) => ({ 
                                ...data,
                                ...(isEdit ? {_method: 'put'} : {}), 
                                album: [...images],
                                post_catalogues: postCatalogues,
                                // moveAlbum: true,
                                save_and_redirect: buttonAction.current
                            })}
                        >
                            {({ processing, errors }) => (
                                <div className="max-w-[1280px] ml-auto mr-auto">
                                    <div className="grid grid-cols-12 gap-4">
                                        <div className="col-span-9">
                                            <CustomGeneral 
                                                name={record?.name}
                                                description={record?.description}
                                                content={record?.content}
                                                errors={errors}
                                                className='mb-[20px]'
                                            />
                                            <CustomAlbum 
                                                data={record?.album} 
                                                onDataChange={handleAlbumImagesChange}
                                            />

                                       
                                            <Seo record={record} errors={errors} />

                                            <div className="mt-[20px]">
                                                <div className="flex space-x-2">
                                                    <Button
                                                        type="submit"
                                                        className="mt-4 w-[150px] cursor-pointer"
                                                        tabIndex={4}
                                                        disabled={processing}
                                                        onClick={() => (buttonAction.current = '')}
                                                    >
                                                        {processing && (
                                                            <LoaderCircle className="h-4 w-4 animate-spin" />
                                                        )}
                                                        Lưu lại
                                                    </Button>
                                                    <Button
                                                        type="submit"
                                                        className="mt-4 w-[150px] cursor-pointer bg-blue-500"
                                                        tabIndex={4}
                                                        disabled={processing}
                                                        onClick={() => (buttonAction.current = 'redirect')}
                                                    >
                                                        {processing && (
                                                            <LoaderCircle className="h-4 w-4 animate-spin" />
                                                        )}
                                                        Lưu lại và đóng
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="col-span-3">
                                            <CustomCard
                                                isShowHeader={true}
                                                title="Danh mục cha"
                                                className="mb-[25px]"
                                            >
                                                <CustomCatalogueParent 
                                                    name="post_catalogue_id"
                                                    data={availableCatalogues}
                                                    value={(record?.post_catalogue_id || 0).toString()}
                                                    className='mb-[10px]'
                                                    onValueChange={setPostCatalogueId}
                                                />
                                                <MultiSelect
                                                    options={
                                                        availableCatalogues.map(item => ({
                                                            value: item.value,
                                                            label: item.label.replace(/\|-----/g, '')
                                                        })).filter(item => item.value !== '0' && item.value !== postCatalogueId)}
                                                    onValueChange={(values) => setPostCatalogues(values)}
                                                    defaultValue={[]}
                                                    variant="inverted"
                                                    placeholder="Chọn Danh Mục Phụ"
                                                />
                                            </CustomCard>
                                                            
                                            <CustomCard
                                                isShowHeader={true}
                                                title="Ảnh Đại Diện"
                                                className="mb-[25px]"
                                            >
                                                <CustomFeaturedImage 
                                                    value={record?.image}
                                                />
                                            </CustomCard>

                                            <CustomCard
                                                isShowHeader={true}
                                                title="Cấu hình chung"
                                                className="mb-[25px]"
                                            >
                                                <CustomSeoOptions 
                                                    order={record?.order?.toString()}
                                                />
                                            </CustomCard>

                                            <CustomCard
                                                isShowHeader={true}
                                                title="Thông Tin Về SEO"
                                                className="mb-[25px]"
                                            >
                                                <CustomSeoScores 
                                                    
                                                />
                                            </CustomCard>

                                        </div>
                                    </div>
                                </div>
                            )}
                        </Form>
                    </FormProvider>
                </div>
                
            </div>
        </AppLayout>
    );
}
