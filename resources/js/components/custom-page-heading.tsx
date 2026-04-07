import { Link } from "@inertiajs/react"
import { type BreadcrumbItem } from '@/types';
interface CustomerPageHeadingProps {
    heading: string,
    breadcrumbs: BreadcrumbItem[],
    action?: React.ReactNode
}
const CustomPageHeading = ({
    heading,
    breadcrumbs,
    action
}: CustomerPageHeadingProps) => {
    return (
        <div className="border-b border-[#e7eaec] page-heading px-[20px] py-[25px] bg-white">
            <div className="flex items-center justify-between mb-[5px]">
                <h2 className="text-[24px] uppercase font-normal">{heading}</h2>
                {action && <div>{action}</div>}
            </div>
            <ol className="custom-breadcrumb flex flex-1">
                {breadcrumbs.map(item => 
                    <li key={item.title}><Link href={item.href}>{item.title}</Link></li>
                )}
            </ol>
        </div>
    )
}


export default CustomPageHeading