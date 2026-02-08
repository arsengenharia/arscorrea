import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook to generate signed URLs for private storage files
 * @param bucket - The storage bucket name
 * @param path - The file path within the bucket
 * @param expiresIn - Expiration time in seconds (default: 1 hour)
 */
export function useSignedUrl(bucket: string, path: string | null, expiresIn: number = 3600) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!path) {
      setSignedUrl(null);
      return;
    }

    // Check if this is already a full URL (legacy data)
    if (path.startsWith('http://') || path.startsWith('https://')) {
      setSignedUrl(path);
      return;
    }

    let cancelled = false;

    async function generateUrl() {
      setLoading(true);
      setError(null);
      
      try {
        const { data, error } = await supabase.storage
          .from(bucket)
          .createSignedUrl(path, expiresIn);
        
        if (cancelled) return;
        
        if (error) throw error;
        setSignedUrl(data?.signedUrl || null);
      } catch (err) {
        if (!cancelled) {
          setError(err as Error);
          setSignedUrl(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    generateUrl();

    return () => {
      cancelled = true;
    };
  }, [bucket, path, expiresIn]);

  return { signedUrl, loading, error };
}

/**
 * Generate a signed URL on demand (non-hook version)
 */
export async function getSignedUrl(bucket: string, path: string, expiresIn: number = 3600): Promise<string | null> {
  // Check if this is already a full URL (legacy data)
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);
  
  if (error) {
    console.error('Error generating signed URL:', error);
    return null;
  }
  
  return data?.signedUrl || null;
}
