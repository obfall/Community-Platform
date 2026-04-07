"use client";

import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Package } from "lucide-react";

interface ProductImageCarouselProps {
  images: Array<{ id: string; file: { publicUrl: string | null } }>;
  productName: string;
}

export function ProductImageCarousel({ images, productName }: ProductImageCarouselProps) {
  const validImages = images.filter((img) => img.file.publicUrl);
  const [index, setIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);

  if (validImages.length === 0) {
    return (
      <div className="mb-4 flex aspect-square items-center justify-center rounded-lg bg-muted">
        <Package className="h-16 w-16 text-muted-foreground" />
      </div>
    );
  }

  const go = (next: number) => {
    const len = validImages.length;
    setIndex(((next % len) + len) % len);
  };

  return (
    <div className="mb-4 space-y-3">
      <div
        className="relative aspect-square overflow-hidden rounded-lg bg-muted"
        onTouchStart={(e) => {
          touchStartX.current = e.touches[0]?.clientX ?? null;
        }}
        onTouchEnd={(e) => {
          if (touchStartX.current == null) return;
          const dx = (e.changedTouches[0]?.clientX ?? 0) - touchStartX.current;
          if (Math.abs(dx) > 50) go(index + (dx < 0 ? 1 : -1));
          touchStartX.current = null;
        }}
      >
        <div
          className="flex h-full w-full transition-transform duration-300 ease-out"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {validImages.map((img) => (
            <div key={img.id} className="h-full w-full shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.file.publicUrl!}
                alt={productName}
                className="h-full w-full object-cover"
                draggable={false}
              />
            </div>
          ))}
        </div>

        {validImages.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(index - 1)}
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70"
              aria-label="前の画像"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => go(index + 1)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70"
              aria-label="次の画像"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5">
              {validImages.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIndex(i)}
                  className={`h-2 rounded-full transition-all ${
                    i === index ? "w-6 bg-white" : "w-2 bg-white/50"
                  }`}
                  aria-label={`画像 ${i + 1}`}
                />
              ))}
            </div>
            <span className="absolute right-2 top-2 rounded bg-black/60 px-2 py-0.5 text-xs text-white">
              {index + 1} / {validImages.length}
            </span>
          </>
        )}
      </div>

      {validImages.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {validImages.map((img, i) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setIndex(i)}
              className={`relative h-16 w-16 shrink-0 overflow-hidden rounded border-2 transition-colors ${
                i === index ? "border-primary" : "border-transparent"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.file.publicUrl!}
                alt=""
                className="h-full w-full object-cover"
                draggable={false}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
