"use client";

import { useEffect, useState } from "react";

type Props = {
  images: string[];
  title?: string;
};

export default function GalleryWithLightbox({ images, title }: Props) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenIdx(null);
      if (openIdx !== null && images.length > 0) {
        if (e.key === "ArrowRight") {
          setOpenIdx((prev) => (prev === null ? prev : (prev + 1) % images.length));
        } else if (e.key === "ArrowLeft") {
          setOpenIdx((prev) => (prev === null ? prev : (prev - 1 + images.length) % images.length));
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openIdx, images.length]);

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {images.map((src, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setOpenIdx(i)}
            className="group relative w-full rounded-lg border border-black/10 overflow-hidden bg-white card-surface"
            aria-label="View full image"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={(title ? `${title} - ` : "") + `Image ${i + 1}`}
              className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
          </button>
        ))}
      </div>

      {openIdx !== null && images[openIdx] && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
          onClick={() => setOpenIdx(null)}
          role="dialog"
          aria-modal="true"
        >
          <div className="relative max-w-5xl max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={images[openIdx]}
              alt={(title ? `${title} - ` : "") + "Enlarged image"}
              className="max-h-[90vh] w-auto rounded-lg shadow-lg"
            />
          </div>
        </div>
      )}
    </div>
  );
}


