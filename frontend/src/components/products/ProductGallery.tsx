// Galerie d'images d'un produit : image principale + vignettes cliquables.
// Affiche un placeholder lorsque le produit n'a aucune image.
import { useState } from "react";
import type { ProductImage } from "../../types";

interface ProductGalleryProps {
  images: ProductImage[];
  imageUrl?: string | null;
  name: string;
}

export default function ProductGallery({ images, imageUrl, name }: ProductGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  const ordered =
    images && images.length > 0
      ? [...images].sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.position - b.position)
      : [];

  const active = ordered[activeIndex] ?? null;
  const mainSrc = active?.url ?? imageUrl ?? null;

  if (!mainSrc) {
    return (
      <div className="grid aspect-square w-full place-items-center rounded-2xl border border-slate-200 bg-slate-50 text-5xl dark:border-slate-700 dark:bg-slate-800/60">
        📦
      </div>
    );
  }

  return (
    <div>
      <div className="aspect-square w-full overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800/60">
        <img
          src={mainSrc}
          alt={name}
          className="h-full w-full object-cover"
          onClick={() => {
            if (ordered.length > 1) setActiveIndex((index) => (index + 1) % ordered.length);
          }}
        />
      </div>
      {ordered.length > 1 && (
        <div className="mt-3 grid grid-cols-4 gap-2">
          {ordered.map((image, index) => (
            <button
              key={image.id}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={`overflow-hidden rounded-lg border-2 transition-colors ${
                index === activeIndex
                  ? "border-brand-green"
                  : "border-transparent hover:border-slate-300 dark:hover:border-slate-600"
              }`}
              aria-label={name}
            >
              <img
                src={image.url}
                alt={name}
                className="aspect-square w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}