// Type declarations for @/routes module
declare module '@/routes' {
    import type { RouteDefinition, RouteQueryOptions } from '../wayfinder'
    
    export const dashboard: {
        (options?: RouteQueryOptions): RouteDefinition<'get'>
        url: (options?: RouteQueryOptions) => string
        definition: {
            methods: ['get', 'head']
            url: string
        }
        get: (options?: RouteQueryOptions) => RouteDefinition<'get'>
        head: (options?: RouteQueryOptions) => RouteDefinition<'head'>
        form: {
            (options?: RouteQueryOptions): {
                action: string
                method: 'get'
            }
            get: (options?: RouteQueryOptions) => {
                action: string
                method: 'get'
            }
            head: (options?: RouteQueryOptions) => {
                action: string
                method: 'get'
            }
        }
    }
    
    // Add other route exports as needed
    export const login: {
        (options?: RouteQueryOptions): RouteDefinition<'get'>
        url: (options?: RouteQueryOptions) => string
        definition: {
            methods: ['get', 'head']
            url: string
        }
        get: (options?: RouteQueryOptions) => RouteDefinition<'get'>
        head: (options?: RouteQueryOptions) => RouteDefinition<'head'>
        form: {
            (options?: RouteQueryOptions): {
                action: string
                method: 'get'
            }
            get: (options?: RouteQueryOptions) => {
                action: string
                method: 'get'
            }
            head: (options?: RouteQueryOptions) => {
                action: string
                method: 'get'
            }
        }
    }
    
    export const logout: {
        (options?: RouteQueryOptions): RouteDefinition<'post'>
        url: (options?: RouteQueryOptions) => string
        definition: {
            methods: ['post']
            url: string
        }
        post: (options?: RouteQueryOptions) => RouteDefinition<'post'>
        form: {
            (options?: RouteQueryOptions): {
                action: string
                method: 'post'
            }
            post: (options?: RouteQueryOptions) => {
                action: string
                method: 'post'
            }
        }
    }
    
    export const home: {
        (options?: RouteQueryOptions): RouteDefinition<'get'>
        url: (options?: RouteQueryOptions) => string
        definition: {
            methods: ['get', 'head']
            url: string
        }
        get: (options?: RouteQueryOptions) => RouteDefinition<'get'>
        head: (options?: RouteQueryOptions) => RouteDefinition<'head'>
        form: {
            (options?: RouteQueryOptions): {
                action: string
                method: 'get'
            }
            get: (options?: RouteQueryOptions) => {
                action: string
                method: 'get'
            }
            head: (options?: RouteQueryOptions) => {
                action: string
                method: 'get'
            }
        }
    }
    
    export const register: {
        (options?: RouteQueryOptions): RouteDefinition<'get'>
        url: (options?: RouteQueryOptions) => string
        definition: {
            methods: ['get', 'head']
            url: string
        }
        get: (options?: RouteQueryOptions) => RouteDefinition<'get'>
        head: (options?: RouteQueryOptions) => RouteDefinition<'head'>
        form: {
            (options?: RouteQueryOptions): {
                action: string
                method: 'get'
            }
            get: (options?: RouteQueryOptions) => {
                action: string
                method: 'get'
            }
            head: (options?: RouteQueryOptions) => {
                action: string
                method: 'get'
            }
        }
    }
}

