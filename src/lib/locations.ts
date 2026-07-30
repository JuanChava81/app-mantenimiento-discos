import { MOCK_LOCATIONS } from "./mock-data";
import { supabase, supabaseConfigured } from "./supabase";
import { Location } from "./types";

export async function fetchLocations(): Promise<{ locations: Location[]; source: "supabase" | "mock" }> {
  if (!supabaseConfigured || !supabase) {
    return { locations: MOCK_LOCATIONS, source: "mock" };
  }

  const { data, error } = await supabase
    .from("locations")
    .select("id, chain, number, name, address")
    .order("chain")
    .order("number");

  if (error || !data || data.length === 0) {
    return { locations: MOCK_LOCATIONS, source: "mock" };
  }

  return { locations: data as Location[], source: "supabase" };
}
