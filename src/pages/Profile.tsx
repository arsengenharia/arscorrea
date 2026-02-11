import { useState, useRef, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useProfile } from "@/hooks/use-profile";

export default function Profile() {
  const { user } = useAuth();
  const { profile, loading, saveProfile, uploadAvatar, getInitials } = useProfile();
  const [displayName, setDisplayName] = useState("");
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDisplayName(profile.displayName);
  }, [profile.displayName]);

  const handleSave = async () => {
    setSaving(true);
    await saveProfile(displayName);
    setSaving(false);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await uploadAvatar(file);
  };

  if (loading) return <Layout><div className="p-8">Carregando...</div></Layout>;

  return (
    <Layout>
      <div className="max-w-xl mx-auto p-4 md:p-8">
        <h1 className="text-2xl font-bold mb-6">Meu Perfil</h1>
        <Card>
          <CardHeader>
            <CardTitle>Informações do Perfil</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Avatar */}
            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                <Avatar className="h-24 w-24">
                  {profile.avatarUrl && <AvatarImage src={profile.avatarUrl} alt="Avatar" />}
                  <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-medium">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 rounded-full bg-primary p-1.5 text-primary-foreground shadow hover:opacity-90 transition"
                >
                  <Camera className="h-4 w-4" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
              <p className="text-xs text-muted-foreground">Clique no ícone para alterar a foto</p>
            </div>

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="displayName">Nome de exibição</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Seu nome"
              />
            </div>

            {/* Email (read-only) */}
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" value={user?.email || ""} disabled />
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
