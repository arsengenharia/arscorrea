import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { toast } from "sonner";

interface Profile {
  displayName: string;
  avatarUrl: string | null;
}

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile>({ displayName: "", avatarUrl: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("display_name, avatar_url")
      .eq("id", user.id)
      .maybeSingle();

    setProfile({
      displayName: data?.display_name || "",
      avatarUrl: data?.avatar_url || null,
    });
    setLoading(false);
  };

  const saveProfile = async (displayName: string) => {
    if (!user) return;
    const { error } = await supabase
      .from("profiles")
      .upsert({
        id: user.id,
        display_name: displayName,
        avatar_url: profile.avatarUrl,
      });

    if (error) {
      toast.error("Erro ao salvar perfil");
      return;
    }

    setProfile((prev) => ({ ...prev, displayName }));
    toast.success("Perfil salvo com sucesso");
  };

  const uploadAvatar = async (file: File) => {
    if (!user) return;
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      toast.error("Erro ao enviar foto");
      return;
    }

    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;

    const { error: updateError } = await supabase
      .from("profiles")
      .upsert({ id: user.id, display_name: profile.displayName, avatar_url: avatarUrl });

    if (updateError) {
      toast.error("Erro ao atualizar foto do perfil");
      return;
    }

    setProfile((prev) => ({ ...prev, avatarUrl }));
    toast.success("Foto atualizada com sucesso");
  };

  const getInitials = () => {
    if (profile.displayName) {
      return profile.displayName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    if (user?.email) {
      return user.email.slice(0, 2).toUpperCase();
    }
    return "U";
  };

  return { profile, loading, saveProfile, uploadAvatar, getInitials };
}
