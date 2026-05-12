"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { X, ImageIcon, Video, Loader2, AlertCircle } from "lucide-react";

const MAX_IMAGES = 10;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_VIDEO_BYTES = 100 * 1024 * 1024;

type ImageEntry = {
  id: string;
  preview: string;
  url: string | null;
  error: string | null;
  uploading: boolean;
};

type VideoEntry = {
  preview: string;
  name: string;
  url: string | null;
  error: string | null;
  uploading: boolean;
};

type Props = {
  userId: string;
  onBusyChange: (busy: boolean) => void;
};

async function uploadToSupabase(file: File, bucket: string, userId: string): Promise<string> {
  const supabase = createClient();
  const ext = file.name.split(".").pop() ?? "bin";
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file);
  if (error) throw error;
  const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path);
  return publicUrl;
}

export function MediaUploader({ userId, onBusyChange }: Props) {
  const [images, setImages] = useState<ImageEntry[]>([]);
  const [video, setVideo] = useState<VideoEntry | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const busyCount =
    images.filter((i) => i.uploading).length + (video?.uploading ? 1 : 0);

  useEffect(() => {
    onBusyChange(busyCount > 0);
  }, [busyCount, onBusyChange]);

  const handleImages = useCallback(
    async (files: FileList) => {
      const slots = MAX_IMAGES - images.length;
      if (slots <= 0) return;
      const incoming = Array.from(files).slice(0, slots);

      const entries: ImageEntry[] = incoming.map((file) => ({
        id: crypto.randomUUID(),
        preview: URL.createObjectURL(file),
        url: null,
        error: file.size > MAX_IMAGE_BYTES ? "Too large (max 5 MB)" : null,
        uploading: file.size <= MAX_IMAGE_BYTES,
      }));

      setImages((prev) => [...prev, ...entries]);

      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        if (entry.error) continue;
        try {
          const url = await uploadToSupabase(incoming[i], "listing-images", userId);
          setImages((prev) =>
            prev.map((e) => (e.id === entry.id ? { ...e, url, uploading: false } : e)),
          );
        } catch {
          setImages((prev) =>
            prev.map((e) =>
              e.id === entry.id ? { ...e, error: "Upload failed", uploading: false } : e,
            ),
          );
        }
      }

      if (imageInputRef.current) imageInputRef.current.value = "";
    },
    [images.length, userId],
  );

  const removeImage = useCallback((id: string) => {
    setImages((prev) => {
      const entry = prev.find((e) => e.id === id);
      if (entry) URL.revokeObjectURL(entry.preview);
      return prev.filter((e) => e.id !== id);
    });
  }, []);

  const handleVideo = useCallback(
    async (file: File) => {
      if (file.size > MAX_VIDEO_BYTES) {
        setVideo({
          preview: "",
          name: file.name,
          url: null,
          error: "Too large (max 100 MB)",
          uploading: false,
        });
        return;
      }
      setVideo({ preview: URL.createObjectURL(file), name: file.name, url: null, error: null, uploading: true });
      try {
        const url = await uploadToSupabase(file, "listing-videos", userId);
        setVideo((prev) => (prev ? { ...prev, url, uploading: false } : null));
      } catch {
        setVideo((prev) =>
          prev ? { ...prev, error: "Upload failed", uploading: false } : null,
        );
      }
    },
    [userId],
  );

  const removeVideo = useCallback(() => {
    setVideo((prev) => {
      if (prev?.preview) URL.revokeObjectURL(prev.preview);
      return null;
    });
    if (videoInputRef.current) videoInputRef.current.value = "";
  }, []);

  return (
    <div className="space-y-6">
      {/* Images */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="block text-sm font-medium text-gray-700">
            Photos <span className="text-red-500">*</span>
          </label>
          <span className="text-xs text-gray-400">
            {images.length}/{MAX_IMAGES}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {images.map((img, i) => (
            <div
              key={img.id}
              className="relative aspect-square overflow-hidden rounded-lg border border-gray-200 bg-gray-100"
            >
              <Image
                src={img.preview}
                alt=""
                fill
                className="object-cover"
                unoptimized
              />

              {img.uploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <Loader2 className="h-5 w-5 animate-spin text-white" />
                </div>
              )}
              {img.error && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-red-500/80 p-1">
                  <AlertCircle className="h-4 w-4 text-white" />
                  <p className="text-center text-[10px] text-white">{img.error}</p>
                </div>
              )}
              {i === 0 && !img.error && (
                <span className="absolute bottom-1 left-1 rounded bg-black/50 px-1.5 py-0.5 text-[10px] text-white">
                  Cover
                </span>
              )}

              <button
                type="button"
                onClick={() => removeImage(img.id)}
                className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
              >
                <X className="h-3 w-3" />
              </button>

              {img.url && <input type="hidden" name="imageUrls" value={img.url} />}
            </div>
          ))}

          {images.length < MAX_IMAGES && (
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-gray-300 text-gray-400 transition-colors hover:border-gray-400 hover:text-gray-600"
            >
              <ImageIcon className="h-6 w-6" />
              <span className="text-xs">Add photos</span>
            </button>
          )}
        </div>

        <input
          ref={imageInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          className="hidden"
          onChange={(e) => e.target.files?.length && handleImages(e.target.files)}
        />
        <p className="mt-1.5 text-xs text-gray-400">
          JPEG, PNG, WebP or GIF · max 5 MB each · first photo is the cover
        </p>
      </div>

      {/* Video */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">
          Video{" "}
          <span className="text-xs font-normal text-gray-400">(optional)</span>
        </label>

        {video ? (
          <div className="flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-2.5">
            <Video className="h-5 w-5 shrink-0 text-gray-400" />
            <div className="min-w-0 flex-1">
              {video.uploading && (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                  <span className="text-sm text-gray-500">Uploading…</span>
                </div>
              )}
              {video.error && (
                <p className="text-sm text-red-600">{video.error}</p>
              )}
              {video.url && (
                <>
                  <p className="truncate text-sm text-gray-700">{video.name}</p>
                  <input type="hidden" name="videoUrl" value={video.url} />
                </>
              )}
            </div>
            <button
              type="button"
              onClick={removeVideo}
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-gray-400 hover:text-gray-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => videoInputRef.current?.click()}
            className="flex items-center gap-2 rounded-lg border-2 border-dashed border-gray-300 px-4 py-3 text-sm text-gray-400 transition-colors hover:border-gray-400 hover:text-gray-600"
          >
            <Video className="h-5 w-5" />
            Add a video
          </button>
        )}

        <input
          ref={videoInputRef}
          type="file"
          accept="video/mp4,video/webm"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleVideo(e.target.files[0])}
        />
        <p className="mt-1.5 text-xs text-gray-400">MP4 or WebM · max 100 MB</p>
      </div>
    </div>
  );
}
