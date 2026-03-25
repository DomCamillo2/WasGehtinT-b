"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function clampRoundedCoordinate(value: number | null, min: number, max: number) {
  if (value === null || !Number.isFinite(value)) {
    return null;
  }

  const clamped = Math.min(Math.max(value, min), max);
  return Math.round(clamped * 1000) / 1000;
}

export async function createPartyAction(
  formData: FormData,
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return;
  }

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const startsAt = String(formData.get("startsAt") ?? "");
  const endsAt = String(formData.get("endsAt") ?? "");
  const vibeId = Number(formData.get("vibeId"));
  const locationNameRaw = String(formData.get("locationName") ?? "").trim();
  const maxGuests = Number(formData.get("maxGuests"));
  const contributionCents = Math.round(Number(formData.get("contributionEur")) * 100);
  const rawLat = formData.get("publicLat") ? Number(formData.get("publicLat")) : null;
  const rawLng = formData.get("publicLng") ? Number(formData.get("publicLng")) : null;

  const startDate = new Date(startsAt);
  const endDate = new Date(endsAt);

  const publicLat = clampRoundedCoordinate(rawLat, -90, 90);
  const publicLng = clampRoundedCoordinate(rawLng, -180, 180);
  const locationName = locationNameRaw.length > 140 ? locationNameRaw.slice(0, 140) : locationNameRaw;

  if (
    !title ||
    !startsAt ||
    !endsAt ||
    !Number.isFinite(vibeId) ||
    vibeId <= 0 ||
    !Number.isFinite(maxGuests) ||
    maxGuests < 1 ||
    maxGuests > 200 ||
    Number.isNaN(startDate.getTime()) ||
    Number.isNaN(endDate.getTime()) ||
    startDate >= endDate
  ) {
    return;
  }

  const { data: party, error } = await supabase
    .from("parties")
    .insert({
      host_user_id: user.id,
      title,
      description: description || null,
      starts_at: startDate.toISOString(),
      ends_at: endDate.toISOString(),
      vibe_id: vibeId,
      max_guests: maxGuests,
      contribution_cents: Number.isFinite(contributionCents) ? Math.max(contributionCents, 0) : 0,
      public_lat: publicLat,
      public_lng: publicLng,
      location_name: locationName || null,
      status: "published",
    })
    .select("id")
    .single();

  if (error || !party) {
    return;
  }

  const itemNames = formData
    .getAll("bringItem")
    .map((value) => String(value).trim())
    .filter(Boolean);

  if (itemNames.length) {
    const bringRows = itemNames.map((itemName, index) => ({
      party_id: party.id,
      item_name: itemName,
      quantity_needed: 1,
      sort_order: index + 1,
      is_active: true,
    }));

    const { error: bringError } = await supabase.from("bring_items").insert(bringRows);
    if (bringError) {
      return;
    }
  }

  revalidatePath("/discover");
  revalidatePath("/host");
}
