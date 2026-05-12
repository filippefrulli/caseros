"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { updateUserAvatar } from "@/lib/actions/user";
import { Camera, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

const MAX_BYTES = 2 * 1024 * 1024;

type Props = {
  userId: string;
  currentUrl: string | null;
  displayName: string;
};

export function AvatarUploader({ userId, currentUrl, displayName }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const displayUrl = preview ?? currentUrl;
  const initials = displayName.slice(0, 2).toUpperCase();

  const handleFile = async (file: File) => {
    if (file.size > MAX_BYTES) {
      setError("Image too large (max 2 MB)");
      return;
    }

    setError(null);
    const localPreview = URL.createObjectURL(file);
    setPreview(localPreview);
    setUploading(true);

    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${userId}/${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(path);

      await updateUserAvatar(publicUrl);
      URL.revokeObjectURL(localPreview);
      setPreview(null);
      router.refresh();
    } catch {
      setError("Upload failed. Please try again.");
      URL.revokeObjectURL(localPreview);
      setPreview(null);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="group relative h-20 w-20 overflow-hidden rounded-full bg-gray-100 ring-2 ring-gray-200 ring-offset-2 transition hover:ring-gray-400 disabled:opacity-70"
      >
        {displayUrl ? (
          <Image
            src={displayUrl}
            alt={displayName}
            fill
            className="object-cover"
            unoptimized={!!preview}
            sizes="80px"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-xl font-semibold text-gray-500">
            {initials}
          </span>
        )}

        <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/30">
          {uploading ? (
            <Loader2 className="h-5 w-5 animate-spin text-white opacity-0 transition group-hover:opacity-100" />
          ) : (
            <Camera className="h-5 w-5 text-white opacity-0 transition group-hover:opacity-100" />
          )}
        </div>
      </button>

      <p className="text-xs text-gray-400">
        Click to change · JPEG, PNG or WebP · max 2 MB
      </p>
      {error && <p className="text-sm text-red-600">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />
    </div>
  );
}
