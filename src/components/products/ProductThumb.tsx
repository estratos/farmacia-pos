import { useState } from 'react';
import { Package } from 'lucide-react';

interface ProductThumbProps {
  src?: string | null;
  name: string;
  className?: string;
  iconClassName?: string;
}

/**
 * Miniatura del producto: muestra la imagen servida por el backend (image_url)
 * o el icono de paquete como fallback. No guarda copias locales.
 */
function ProductThumb({
  src,
  name,
  className = 'w-10 h-10 rounded-lg',
  iconClassName = 'w-5 h-5',
}: ProductThumbProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <span
        className={`${className} flex items-center justify-center bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0`}
      >
        <Package className={iconClassName} />
      </span>
    );
  }

  return (
    <img
      src={src}
      alt={name}
      loading="lazy"
      onError={() => setFailed(true)}
      className={`${className} object-cover shrink-0 bg-slate-100 dark:bg-slate-700`}
    />
  );
}

export default ProductThumb;
