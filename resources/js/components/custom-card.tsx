import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { JSX } from 'react';

interface CustomCardProps extends React.ComponentPropsWithoutRef<typeof Card> {
    loading?: boolean,
    title?: string,
    description?: string,
    height?: string,
    isShowHeader?: boolean,
    isShowFooter?: boolean,
    children: React.ReactNode,
    footerChildren?: JSX.Element,
    headerChildren?: JSX.Element,
    className?: string,
    footerClassName?: string
}
const CustomCard = ({
    loading,
    title,
    description,
    height,
    isShowHeader,
    isShowFooter,
    children,
    footerChildren,
    headerChildren,
    className,
    footerClassName,
    ...props
}: CustomCardProps) => {
    return (
        <Card
            {...props}
            className={`relative rounded-[5px] gap-4 pt-[20px] ${className ? className : ''}`}
        >
            {isShowHeader &&
                <>
                    {headerChildren ? (
                        headerChildren
                    ) : (
                        <CardHeader className={`border-b  ${!description ? 'gap-0' : ''}`}>
                            <CardTitle className="uppercase">{title}</CardTitle>
                            <CardDescription className='pb-[20px]'>{description ? description : null}</CardDescription>
                        </CardHeader>
                    )}
                </>
            }
            <CardContent className={`${height ?? ''} ${className?.includes('!pt-0') ? '!px-0' : 'px-[20px]'}`}>
                {children}
            </CardContent>
            {isShowFooter &&
                <CardFooter className={`flex justify-center ${footerClassName || ''}`}>
                    {footerChildren}
                </CardFooter>
            }
            {loading &&
                <div className="absolute inset-0 flex items-center justify-center bg-white/70 dark:bg-block/40 z-10">
                    <Loader2 className="size-8 animate-spin text-muted-foreground" />
                </div>
            }
        </Card>
    )
}

export default CustomCard
