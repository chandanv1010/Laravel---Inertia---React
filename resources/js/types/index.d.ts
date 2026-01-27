import { TBulkAction } from '@/components/custom-bulk-action';
import { IColumn } from '@/components/custom-table';
import { UserCatalogue } from '@/pages/backend/user/user_catalogue/save';
import { InertiaLinkProps } from '@inertiajs/react';
import { LucideIcon } from 'lucide-react';

export interface Auth {
    user: User;
}

export interface BreadcrumbItem {
    title: string;
    href: string;
}

export interface NavGroup {
    title: string;
    items: NavItem[];
}

export interface NavItem {
    title: string;
    href: NonNullable<InertiaLinkProps['href']>;
    icon?: LucideIcon | null;
    isActive?: boolean;
    items?: NavSubItem[]
}

export interface NavSubItem {
    title: string,
    url: string
}

export interface SharedData {
    name: string;
    quote: { message: string; author: string };
    auth: Auth;
    sidebarOpen: boolean;
    [key: string]: unknown;
    flash?: { success?: string, error?: string, warning?: string, info?: string },
    app: { url: string }
}

export interface User extends IDateTime {
    id: number;
    name: string;
    email: string;
    avatar?: string;
    email_verified_at: string | null;
    two_factor_enabled?: boolean;
    publish: string;
    description: string | null;
    // creators?: { name: string } | null;
    address?: string | null,
    birthday?: string | null,
    user_catalogues: UserCatalogue[];
    [key: string]: unknown; // This allows for additional properties...
}

export interface IDateTime {
    created_at: string,
    updated_at: string
}


type SwitchableFields = "publish" | "is_blocked" | "is_highlight" | "is_hot"
export interface PageConfig<T>{
    module?: string,
    heading: string,
    cardHeading?: string,
    cardDescription?: string,
    filters?: IFilter[],
    columns?: IColumn[],
    switches?: (keyof T & SwitchableFields)[],
    actions?: TBulkAction[] 
}

export interface ISelectOptionItem {
    label: string,
    value: string
}

export interface IFilter {
    key: string,
    placeholder: string,
    defaulValue?: string | string[],
    options: ISelectOptionItem[],
    className?: string,
    type: 'single' | 'multiple',
    operator?: 'equal' | 'in' | 'between' | 'gt' | 'gte' | 'lte' | 'lt',
    field?: string,
    maxCount?: number,
}

export interface ILink {
    url: string,
    label: string,
    active: boolean
}

export interface IPaginate<T> {
    current_page: number,
    last_page: number,
    per_page: number,
    total: number,
    links: ILink[],
    data: T[]
}

export type TApiMessage = {
    status: boolean,
    code: number,
    message: string,
    timestamp: string
}

export type TParentCatalogue = Array<{value: string, label: string}>


export interface IBaseLanguage {
    name: string,
    description :string,
    content: string,
    meta_title: string,
    meta_keyword: string,
    meta_description: string
}