import { useState } from "react";
import { Loader2 } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import Cropper, { type Area, type Point } from "react-easy-crop";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Input,
} from "@/components/ui";
import { supabase } from "@/lib/supabase";
import { getCroppedBlob } from "@/lib/cropImage";
import type { UserProfile } from "@/contexts/ProfileContext";

interface EditProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User;
  profile: UserProfile | null;
  currentDisplayName: string;
  currentAvatarUrl: string | undefined;
  onSaved: (partial: Pick<UserProfile, "full_name" | "avatar_url">) => void;
}

const MAX_AVATAR_SIZE = 5 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];

function getInitials(fullName: string): string {
  return fullName
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0] ?? "")
    .join("")
    .toUpperCase();
}

export function EditProfileModal({
  open,
  onOpenChange,
  user,
  profile,
  currentDisplayName,
  currentAvatarUrl,
  onSaved,
}: EditProfileModalProps) {
  const [name, setName] = useState(currentDisplayName);

  // Raw file just picked, pending crop confirmation.
  const [rawFile, setRawFile] = useState<File | null>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [cropping, setCropping] = useState(false);

  // Confirmed crop result, ready to upload.
  const [avatarBlob, setAvatarBlob] = useState<Blob | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarRemoved, setAvatarRemoved] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const displayedAvatar = avatarPreview ?? (avatarRemoved ? "" : currentAvatarUrl);
  const nameInvalid = name.trim().length === 0;
  const isCroppingStep = cropSrc !== null;

  function resetState() {
    setName(currentDisplayName);
    setRawFile(null);
    setCropSrc(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setCropping(false);
    setAvatarBlob(null);
    setAvatarPreview(null);
    setAvatarRemoved(false);
    setSaving(false);
    setError(null);
  }

  function handleOpenChange(value: boolean) {
    if (!value) resetState();
    onOpenChange(value);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
      setError("Format non supporté — utilise un JPEG, PNG ou WebP");
      return;
    }
    if (file.size > MAX_AVATAR_SIZE) {
      setError("Image trop lourde — 5 Mo maximum");
      return;
    }
    setError(null);
    setRawFile(file);
    setCropSrc(URL.createObjectURL(file));
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
  }

  function handleCancelCrop() {
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setRawFile(null);
    setCropSrc(null);
    setCroppedAreaPixels(null);
  }

  async function handleConfirmCrop() {
    if (!cropSrc || !rawFile || !croppedAreaPixels || cropping) return;
    setCropping(true);
    setError(null);
    try {
      const blob = await getCroppedBlob(cropSrc, croppedAreaPixels, rawFile.type);
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
      setAvatarBlob(blob);
      setAvatarPreview(URL.createObjectURL(blob));
      setAvatarRemoved(false);
      URL.revokeObjectURL(cropSrc);
      setCropSrc(null);
    } catch (err) {
      console.error("EditProfileModal: failed to crop avatar", err);
      setError("Le recadrage a échoué. Réessaie.");
    } finally {
      setCropping(false);
    }
  }

  function handleRemovePhoto() {
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setRawFile(null);
    setAvatarBlob(null);
    setAvatarPreview(null);
    setAvatarRemoved(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (nameInvalid || saving) return;
    setSaving(true);
    setError(null);
    try {
      let avatarUrl = profile?.avatar_url ?? null;
      if (avatarBlob && rawFile) {
        const ext = rawFile.name.split(".").pop() ?? "jpg";
        const path = `${user.id}/avatar.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(path, avatarBlob, { upsert: true, contentType: rawFile.type });
        if (uploadError) throw uploadError;
        const {
          data: { publicUrl },
        } = supabase.storage.from("avatars").getPublicUrl(path);
        // Cache-bust: the path is fixed per user, so re-uploads reuse the same
        // URL and the browser would otherwise keep serving the old image.
        avatarUrl = `${publicUrl}?t=${Date.now()}`;
      } else if (avatarRemoved) {
        avatarUrl = null;
      }

      const trimmedName = name.trim();
      const { error: updateError } = await supabase
        .from("users")
        .update({ full_name: trimmedName, avatar_url: avatarUrl })
        .eq("id", user.id);
      if (updateError) throw updateError;

      onSaved({ full_name: trimmedName, avatar_url: avatarUrl });
      handleOpenChange(false);
    } catch (err) {
      console.error("EditProfileModal: failed to save profile", err);
      setError("Impossible d'enregistrer les modifications. Réessaie.");
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md gap-5 p-6 rounded-[var(--radius-xl)] ring-1 ring-[var(--glass-border)] shadow-[var(--shadow-glass-primary)]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold">
            Modifier le profil
          </DialogTitle>
          <DialogDescription>
            Change ton nom et ta photo de profil.
          </DialogDescription>
        </DialogHeader>

        {isCroppingStep ? (
          <div className="space-y-3">
            <div className="relative mx-auto size-56 bg-[var(--bg-input)] rounded-[var(--radius-md)] overflow-hidden">
              <Cropper
                image={cropSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={(_, pixels) => setCroppedAreaPixels(pixels)}
              />
            </div>
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              aria-label="Zoom"
              className="w-full accent-[var(--cp-accent)]"
            />
            {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={handleCancelCrop}
                disabled={cropping}
              >
                Annuler
              </Button>
              <Button
                type="button"
                variant="glass-primary"
                className="flex-1"
                onClick={() => void handleConfirmCrop()}
                disabled={cropping}
              >
                {cropping ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  "Valider le recadrage"
                )}
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
            <div className="flex items-center gap-4">
              <Avatar className="size-16 shrink-0">
                <AvatarImage src={displayedAvatar ?? ""} alt={name} />
                <AvatarFallback className="text-lg font-medium bg-gradient-to-br from-violet-400 to-purple-700 text-white rounded-full size-full flex items-center justify-center">
                  {getInitials(name || "?")}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="avatar-upload" className="cursor-pointer">
                  <Button type="button" variant="outline" size="sm" asChild>
                    <span>Changer la photo</span>
                  </Button>
                </label>
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleFileChange}
                  disabled={saving}
                />
                {displayedAvatar && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    disabled={saving}
                    className="text-xs text-[var(--text-tertiary)] hover:text-destructive transition-colors text-left disabled:opacity-40"
                  >
                    Retirer la photo
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="profile-name"
                className="pl-2 font-heading text-base font-medium text-[var(--text-primary)]"
              >
                Nom complet
              </label>
              <Input
                id="profile-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={saving}
                aria-invalid={nameInvalid}
                className="h-10 rounded-[var(--radius-md)] border-[var(--border-strong)] bg-[var(--bg-input)]"
              />
            </div>

            {error && <p className="text-sm text-[var(--danger)]">{error}</p>}

            <Button
              type="submit"
              disabled={nameInvalid || saving}
              className="w-full"
            >
              {saving ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Enregistrement…
                </>
              ) : (
                "Enregistrer"
              )}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
