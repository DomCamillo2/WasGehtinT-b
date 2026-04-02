"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type CreatePartyActionState = {
  ok: boolean;
  message: string;
};

function isMissingColumnError(code: string | undefined) {
  return code === "42703" || code === "PGRST204";
}

type AdminPartyVibesInsertClient = {
  from: (table: "party_vibes") => {
    insert: (values: { label: string; is_active: boolean }) => {
      select: (columns: "id") => {
        single: () => Promise<{ data: { id: number | string } | null }>;
      };
    };
  };
};

function clampRoundedCoordinate(value: number | null, min: number, max: number) {
  if (value === null || !Number.isFinite(value)) {
    return null;
  }

  const clamped = Math.min(Math.max(value, min), max);
  return Math.round(clamped * 1000) / 1000;
}

export async function createPartyAction(
  _prevState: CreatePartyActionState,
  formData: FormData,
): Promise<CreatePartyActionState> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const submitterNameRaw = String(formData.get("submitterName") ?? "").trim();
    const submitterName = submitterNameRaw.slice(0, 80);

    if (!user && !submitterName) {
      return { ok: false, message: "Bitte gib einen Namen an, wenn du ohne Account einreichst." };
    }

    if (user) {
      await supabase.from("user_profiles").upsert({ id: user.id });
    }

    const title = String(formData.get("title") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    const startsAt = String(formData.get("startsAt") ?? "");
    const endsAt = String(formData.get("endsAt") ?? "");
    const vibeId = Number(formData.get("vibeId"));
    const defaultVibeId = Number(formData.get("defaultVibeId"));
    const customVibeLabelRaw = String(formData.get("customVibeLabel") ?? "").trim();
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

    let resolvedVibeId = Number.isFinite(vibeId) && vibeId > 0 ? vibeId : defaultVibeId;

    if (!Number.isFinite(resolvedVibeId) || resolvedVibeId <= 0) {
      const fallbackVibeResult = await supabase
        .from("party_vibes")
        .select("id")
        .eq("is_active", true)
        .order("id", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (fallbackVibeResult.data?.id) {
        resolvedVibeId = Number(fallbackVibeResult.data.id);
      }
    }

    const customVibeLabel = customVibeLabelRaw.replace(/\s+/g, " ").slice(0, 48);
    if (customVibeLabel.length >= 2) {
      const existingResult = await supabase
        .from("party_vibes")
        .select("id")
        .ilike("label", customVibeLabel)
        .maybeSingle();

      if (existingResult.data?.id) {
        resolvedVibeId = Number(existingResult.data.id);
      } else {
        const insertWithClient = await supabase
          .from("party_vibes")
          .insert({ label: customVibeLabel, is_active: true })
          .select("id")
          .single();

        if (insertWithClient.data?.id) {
          resolvedVibeId = Number(insertWithClient.data.id);
        } else {
          try {
            const admin = getSupabaseAdmin();
            const adminInsert = await (admin as unknown as AdminPartyVibesInsertClient)
              .from("party_vibes")
              .insert({ label: customVibeLabel, is_active: true })
              .select("id")
              .single();

            if (adminInsert.data?.id) {
              resolvedVibeId = Number(adminInsert.data.id);
            }
          } catch {
            // Fall back to the selected/default vibe if admin config is unavailable.
          }
        }
      }
    }

    const shouldAutoApprove = false;
    const nextStatus = "draft";
    const nextReviewStatus = "pending";

    if (
      !title ||
      !startsAt ||
      !endsAt ||
      !Number.isFinite(resolvedVibeId) ||
      resolvedVibeId <= 0 ||
      !Number.isFinite(maxGuests) ||
      maxGuests < 1 ||
      maxGuests > 200 ||
      Number.isNaN(startDate.getTime()) ||
      Number.isNaN(endDate.getTime()) ||
      startDate >= endDate
    ) {
      return {
        ok: false,
        message: "Bitte prüfe Titel, Zeiten, Vibe und Gästezahl. Endzeit muss nach Startzeit liegen.",
      };
    }

    const baseInsert = {
      host_user_id: user?.id ?? null,
      title,
      description: description || null,
      starts_at: startDate.toISOString(),
      ends_at: endDate.toISOString(),
      vibe_id: resolvedVibeId,
      max_guests: maxGuests,
      contribution_cents: Number.isFinite(contributionCents) ? Math.max(contributionCents, 0) : 0,
      public_lat: publicLat,
      public_lng: publicLng,
      location_name: locationName || null,
      status: nextStatus,
      submitter_name: submitterName || null,
    };

    // Keep inserts on the regular server client so failures surface as RLS errors, not runtime crashes.
    const insertClient = supabase;

    let partyResult = await insertClient
      .from("parties")
      .insert({
        ...baseInsert,
        review_status: nextReviewStatus,
      })
      .select("id")
      .single();

    if (partyResult.error && isMissingColumnError(partyResult.error.code)) {
      // Backward-compatible fallback if review_status migration is not applied yet.
      partyResult = await insertClient
        .from("parties")
        .insert({
          ...baseInsert,
          submitter_name: undefined,
        })
        .select("id")
        .single();
    }

    if (partyResult.error && isMissingColumnError(partyResult.error.code)) {
      const legacyBaseInsert = {
        host_id: user?.id ?? null,
        title,
        description: description || null,
        date: startDate.toISOString(),
        location: locationName || "Tübingen",
        is_published: false,
        submitter_name: submitterName || null,
      };

      partyResult = await insertClient
        .from("parties")
        .insert({
          ...legacyBaseInsert,
          review_status: nextReviewStatus,
        })
        .select("id")
        .single();

      if (partyResult.error && isMissingColumnError(partyResult.error.code)) {
        partyResult = await insertClient
          .from("parties")
          .insert({ ...legacyBaseInsert, submitter_name: undefined })
          .select("id")
          .single();
      }
    }

    const party = partyResult.data;
    const error = partyResult.error;

    if (error) {
      console.error("[createPartyAction] Failed to insert party:", error);
      return {
        ok: false,
        message: `Event konnte nicht gespeichert werden (${error.code ?? "unknown"}). Bitte DB-Policies prüfen.`,
      };
    }

    if (!party?.id) {
      return { ok: false, message: "Event konnte nicht gespeichert werden." };
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
        console.error("[createPartyAction] Failed to insert bring items:", bringError);
        return {
          ok: false,
          message: "Event wurde erstellt, aber Mitbring-Liste konnte nicht gespeichert werden.",
        };
      }
    }

    try {
      revalidatePath("/discover");
      revalidatePath("/host");
      revalidatePath("/admin");
    } catch (err) {
      console.warn("[createPartyAction] revalidate warning:", err);
    }

    return { ok: true, message: "Event eingereicht. Es wird vor der Veröffentlichung im Admin-Panel geprüft." };
  } catch (error) {
    console.error("[createPartyAction] unexpected failure", error);
    return { ok: false, message: "Einreichen fehlgeschlagen. Bitte versuche es erneut." };
  }
}
