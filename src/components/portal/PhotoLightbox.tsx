import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { getSignedUrl } from "@/hooks/use-signed-url";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

interface PhotoLightboxProps {
  photos: string[];
  bucket: string;
  initialIndex: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PhotoLightbox({ photos, bucket, initialIndex, open, onOpenChange }: PhotoLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  useEffect(() => {
    if (!open || !photos[currentIndex]) return;
    let cancelled = false;
    setLoading(true);
    getSignedUrl(bucket, photos[currentIndex]).then((url) => {
      if (!cancelled) {
        setImageUrl(url);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [open, currentIndex, bucket, photos]);

  const goPrev = useCallback(() => {
    setCurrentIndex((i) => (i > 0 ? i - 1 : photos.length - 1));
  }, [photos.length]);

  const goNext = useCallback(() => {
    setCurrentIndex((i) => (i < photos.length - 1 ? i + 1 : 0));
  }, [photos.length]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, goPrev, goNext]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] p-2 sm:p-4 bg-black/95 border-none flex flex-col items-center justify-center">
        <VisuallyHidden>
          <DialogTitle>Visualizar foto</DialogTitle>
        </VisuallyHidden>

        {loading ? (
          <div className="w-full h-[70vh] flex items-center justify-center">
            <span className="text-white/60 animate-pulse">Carregando...</span>
          </div>
        ) : imageUrl ? (
          <img
            src={imageUrl}
            alt={`Foto ${currentIndex + 1} de ${photos.length}`}
            className="max-w-full max-h-[80vh] object-contain rounded"
          />
        ) : (
          <div className="w-full h-[70vh] flex items-center justify-center text-white/60">
            Erro ao carregar imagem
          </div>
        )}

        {photos.length > 1 && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-2 top-1/2 -translate-y-1/2 text-white hover:bg-white/20"
              onClick={goPrev}
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-white hover:bg-white/20"
              onClick={goNext}
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          </>
        )}

        <span className="text-white/50 text-sm mt-2">
          {currentIndex + 1} / {photos.length}
        </span>
      </DialogContent>
    </Dialog>
  );
}
