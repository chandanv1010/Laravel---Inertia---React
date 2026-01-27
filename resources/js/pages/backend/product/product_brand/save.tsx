import { useEffect, useRef } from 'react';
import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import { type IDateTime, type BreadcrumbItem, type PageConfig, User } from '@/types';
import { Head, Form } from '@inertiajs/react';
import CustomPageHeading from '@/components/custom-page-heading';
import CustomCard from '@/components/custom-card';
import { Button } from "@/components/ui/button"
import { LoaderCircle } from 'lucide-react';
import product_brand from '@/routes/product_brand';
import { setPreserveState } from '@/lib/helper';
import Seo from '@/components/custom-seo';
import CustomGeneral from '@/components/custom-general';
import { FormProvider } from '@/contexts/FormContext';
import type { IBaseLanguage } from '@/types';
import CustomFeaturedImage from '@/components/custom-featured-image';
import CustomSeoOptions from '@/components/custom-seo-options';
import usePageSetup from '@/hooks/use-page-setup';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: dashboard().url,
    },
    {
        title: 'Thêm mới Thương Hiệu',
        href: '/',
    }
];

const pageConfig: PageConfig<ProductBrand> = {
    heading: 'Quản lý Thương Hiệu',
}

export interface ProductBrand extends IDateTime{
    translated_language_ids?: number[]
    id: number,
    publish: string,
    album?: string[],
    image?: string,
    order?: number,
    robots?: string,
    creators?: User,
    current_language?: IBaseLanguage,
    // Legacy flat structure
    name?: string,
    description?: string,
    content?: string,
    canonical?: string,
    meta_title?: string,
    meta_keyword?: string,
    meta_description?: string,
}

interface ProductBrandSaveProps {
    record?: ProductBrand,
}

export default function ProductBrandSave({record}: ProductBrandSaveProps) {

    const {
        initData
    } = usePageSetup<ProductBrand>({record})

    const buttonAction = useRef("")
    const isEdit = !!record
 
   useEffect(() => {
    console.log(record);
    
   }, [record])
  
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
                                isEdit ? product_brand.update(record.id) : product_brand.store()
                            }
                            method="post"
                            resetOnSuccess={['name', 'canonical', 'description', 'meta_title', 'meta_keyword', 'meta_description']}
                                
                            transform={(data) => ({ 
                                ...data,
                                ...(isEdit ? {_method: 'put'} : {}), 
                                save_and_redirect: buttonAction.current
                            })}
                        >
                            {({ processing, errors }) => (
                                <div className="max-w-[1280px] ml-auto mr-auto">
                                    <div className="grid grid-cols-12 gap-4">
                                        <div className="col-span-9">
                                            <CustomGeneral 
                                                name={record?.current_language?.name || record?.name}
                                                description={record?.current_language?.description || record?.description}
                                                content={record?.current_language?.content || record?.content}
                                                errors={errors}
                                                isShowContent={false}
                                                className='mb-[20px]'
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
                                                    hidden={['type']}
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

