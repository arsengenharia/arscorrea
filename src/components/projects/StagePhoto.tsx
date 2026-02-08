import { useState, useEffect } from "react";
import { getSignedUrl } from "@/hooks/use-signed-url";

interface StagePhotoProps {
  photoPath: string;
}

export function StagePhoto({ photoPath }: StagePhotoProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadImage() {
      setLoading(true);
      const url = await getSignedUrl("stages", photoPath);
      setImageUrl(url);
      setLoading(false);
    }
    loadImage();
  }, [photoPath]);

  if (loading) {
    return (
      <div className="w-full h-32 bg-muted rounded-md flex items-center justify-center">
        <span className="text-sm text-muted-foreground">Carregando...</span>
      </div>
    );
  }

  if (!imageUrl) {
    return (
      <div className="w-full h-32 bg-muted rounded-md flex items-center justify-center">
        <span className="text-sm text-muted-foreground">Erro ao carregar</span>
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
      alt="Foto da etapa"
      className="w-full h-32 object-cover rounded-md"
    />
  );
}
