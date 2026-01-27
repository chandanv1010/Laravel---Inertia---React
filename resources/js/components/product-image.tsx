import { useState, useEffect } from 'react';
import { Package } from 'lucide-react';

interface ProductImageProps {
    src: string;
    alt: string;
}

export const ProductImage = ({ src, alt }: ProductImageProps) => {
    const [imageError, setImageError] = useState(false);

    // Reset error state when src changes
    useEffect(() => {
        setImageError(false);
    }, [src]);

    // Show fallback icon if no src or error
    if (!src || src.trim() === '' || imageError) {
        return (
            <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center">
                <Package className="h-5 w-5 text-gray-400" />
            </div>
        );
    }

    return (
        <img
            key={src}
            src={src}
            alt={alt}
            className="w-10 h-10 object-cover rounded"
            onError={() => setImageError(true)}
        />
    );
};
