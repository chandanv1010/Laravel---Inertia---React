import { IDateTime } from '../';

export interface Post extends IDateTime {
    id: number;
    name: string;
    description: string;
    content?: string;
    image: string;
    canonical: string;
    user?: {
        id: number;
        name: string;
        avatar?: string;
    };
    post_catalogues?: {
        id: number;
        name: string;
        canonical: string;
    }[];
    [key: string]: any;
}

export interface Product extends IDateTime {
    id: number;
    name: string;
    description: string;
    content?: string;
    image: string;
    price: number;
    price_sale?: number;
    canonical: string;
    user?: {
        id: number;
        name: string;
        avatar?: string;
    };
    product_catalogues?: {
        id: number;
        name: string;
        canonical: string;
    }[];
    category_name?: string;
    category_canonical?: string;
    [key: string]: any;
}
