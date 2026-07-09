import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export async function getClientId(slug) {
  const { data, error } = await supabase
    .from("clients")
    .select("id")
    .eq("slug", slug)
    .single();
  if (error) throw error;
  return data.id;
}
