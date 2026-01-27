import { useForm } from "@inertiajs/react";
import { FormEventHandler, ReactNode, useEffect } from "react";
import { useFormContext } from "@/contexts/FormContext";
import { toast } from "sonner"; // Assuming sonner is used for toasts, standard in this stack

interface FormProps {
    children: (props: {
        processing: boolean;
        errors: Record<string, string>;
        setData: (key: string | Record<string, any>, value?: any) => void;
        data: any;
    }) => ReactNode;
    action: string;
    method?: 'get' | 'post' | 'put' | 'patch' | 'delete';
    options?: any;
    transform?: (data: any) => any;
    resetOnSuccess?: string[];
}

export function Form({
    children,
    action,
    method = 'post',
    options = {},
    transform,
    resetOnSuccess = []
}: FormProps) {
    const context = useFormContext();

    // Initialize standard form data from context
    // This assumes context has all the fields we want to start with.
    // However, save.tsx also has 'initData' managing extra fields that might not be in Context? 
    // Actually Context seems comprehensive for SEO/Basic info.
    // Extra fields in save.tsx (like product_catalogue_id) are managed by local state in save.tsx and merged in transform.

    const { data, setData, processing, errors, submit, reset, clearErrors } = useForm({
        ...context // Spread all context values as initial data
    });

    // Sync Context changes to Local Form Data
    // We watch specific context fields to update form data if they change externally (e.g. via Context setters in child components)
    useEffect(() => {
        setData((prevData) => ({
            ...prevData,
            ...context
        }));
    }, [
        context.name,
        context.canonical,
        context.metaTitle,
        context.metaKeyword,
        context.metaDescription,
        context.description,
        context.content,
        context.selectedPublish,
        context.selectedRobots,
        context.image,
        context.parentId,
        context.galleryStyle,
        context.imageAspectRatio
    ]);

    const handleSubmit: FormEventHandler = (e) => {
        e.preventDefault();

        clearErrors();

        const submitOptions = {
            ...options,
            onSuccess: () => {
                if (resetOnSuccess.length > 0) {
                    reset(...resetOnSuccess as any);
                }
                toast.success("Thao tác thành công");
                if (options.onSuccess) options.onSuccess();
            },
            onError: (errors: any) => {
                console.error("Form Errors:", errors);
                toast.error("Có lỗi xảy ra, vui lòng kiểm tra lại");
                if (options.onError) options.onError(errors);
            }
        };

        // If transform is provided, we use it to prepare data before submission
        // Inertia's transform() method on useForm is for PERMANENT transformation on the instance.
        // Here we just want to transform for the request.
        // But useForm doesn't support on-the-fly transform in submit method directly in v1.0 without 'transform' helper.
        // Actually we can just manual submit.

        let dataToSubmit = data;
        if (transform) {
            dataToSubmit = transform(data);
        }

        // We use the 'method' prop to determine which Inertia method to call, but mapped to the 'action' url.
        // Inertia useForm 'submit' method signature: submit(method, url, options)

        submit(method, action, {
            ...submitOptions,
            data: dataToSubmit
        });
    };

    return (
        <form onSubmit={handleSubmit}>
            {children({ processing, errors, setData, data })}
        </form>
    );
}
