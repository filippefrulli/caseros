import { createClient } from "@/lib/supabase/client";

export async function uploadToSupabase(file: File, bucket: string, userId: string): Promise<string> {
  const supabase = createClient();
  const ext = file.name.split(".").pop() ?? "bin";
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file);
  if (error) throw error;
  const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path);
  return publicUrl;
}

// For private buckets, returns the storage path, not a URL.
// Generate a signed URL server-side when displaying.
export async function uploadPrivate(file: File, bucket: string, userId: string): Promise<string> {
  const supabase = createClient();
  const ext = file.name.split(".").pop() ?? "bin";
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file);
  if (error) throw error;
  return path;
}
