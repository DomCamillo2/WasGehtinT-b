import { redirect } from "next/navigation";
import { hasSupabaseEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { BringProgress, ChatPreview, PartyCard } from "@/lib/types";

export type UserRole = "student" | "owner" | "admin";

export async function requireUser() {
  if (!hasSupabaseEnv()) {
    redirect("/?setup=1");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  return { supabase, user };
}

export async function getPublicParties() {
  const supabase = await createClient();
  const nowIso = new Date().toISOString();

  const { data, error } = await supabase
    .from("v_public_parties")
    .select("*")
    .gte("ends_at", nowIso)
    .order("starts_at", { ascending: true });

  if (error) {
    return [] as PartyCard[];
  }

  const parties = (data ?? []) as PartyCard[];
  if (!parties.length) {
    return parties;
  }

  const partyIds = parties.map((party) => party.id);
  const approvedResult = await supabase
    .from("parties")
    .select("id")
    .in("id", partyIds)
    .eq("review_status", "approved");

  if (approvedResult.error) {
    // Keep backwards compatibility until the review_status migration is applied everywhere.
    return parties;
  }

  const approvedIds = new Set((approvedResult.data ?? []).map((row) => String(row.id)));
  return parties.filter((party) => approvedIds.has(party.id));
}

export async function getUserRole(userId: string): Promise<UserRole> {
  const supabase = await createClient();
  const result = await supabase
    .from("user_profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (result.error) {
    return "student";
  }

  const role = (result.data?.role ?? "student") as string;
  if (role === "owner" || role === "admin") {
    return role;
  }

  return "student";
}

export async function getExternalEvents() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("v_external_events_public")
    .select("*")
    .order("starts_at", { ascending: true });

  if (error) {
    console.error("[getExternalEvents] Failed to fetch external events:", error.message);
    return [] as PartyCard[];
  }

  return (data ?? []) as PartyCard[];
}

export async function getCommunityHangoutsForDiscover() {
  const supabase = await createClient();
  const nowIso = new Date().toISOString();

  const { data, error } = await supabase
    .from("hangouts")
    .select("id, title, description, meetup_at, created_at, location_text, review_status, status, is_published")
    .or("review_status.eq.approved,status.eq.published,is_published.eq.true")
    .gte("meetup_at", nowIso)
    .order("meetup_at", { ascending: true });

  if (error) {
    console.error("[getCommunityHangoutsForDiscover] Failed to fetch hangouts:", error.message);
    return [] as PartyCard[];
  }

  const rows =
    (data ?? []) as Array<{
      id: string;
      title: string | null;
      description: string | null;
      meetup_at: string | null;
      created_at: string | null;
      location_text: string | null;
    }>;

  return rows
    .filter((row) => typeof row.meetup_at === "string" && row.meetup_at.length > 0)
    .map((row) => {
      const startsAt = row.meetup_at as string;
      const safeTitle = (row.title ?? "Community Event").trim() || "Community Event";
      const safeLocation = (row.location_text ?? "Community").trim() || "Community";

      const mapped: PartyCard = {
        id: `community-${row.id}`,
        title: safeTitle,
        description: row.description ?? null,
        starts_at: startsAt,
        ends_at: startsAt,
        max_guests: 99,
        contribution_cents: 0,
        public_lat: null,
        public_lng: null,
        is_external: false,
        external_link: null,
        vibe_label: "Community",
        spots_left: 99,
        location_name: safeLocation,
        source_badge: "Community",
      };

      return mapped;
    });
}

export async function getBringProgressMap(partyIds: string[]) {
  if (!partyIds.length) {
    return {} as Record<string, BringProgress[]>;
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("v_party_bring_progress")
    .select("*")
    .in("party_id", partyIds);

  const rows = (data ?? []) as Array<BringProgress & { party_id: string }>;
  return rows.reduce<Record<string, BringProgress[]>>((acc, row) => {
    if (!acc[row.party_id]) {
      acc[row.party_id] = [];
    }

    acc[row.party_id].push({
      bring_item_id: row.bring_item_id,
      item_name: row.item_name,
      quantity_needed: row.quantity_needed,
      quantity_committed: row.quantity_committed,
      quantity_open: row.quantity_open,
    });

    return acc;
  }, {});
}

export async function getBringItemsForParty(partyId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("bring_items")
    .select("id, item_name, quantity_needed")
    .eq("party_id", partyId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  return (data ?? []) as Array<{ id: string; item_name: string; quantity_needed: number }>;
}

export async function getMyRequests(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("v_my_requests")
    .select("*")
    .eq("requester_user_id", userId)
    .order("requested_at", { ascending: false });

  return (data ?? []) as Array<Record<string, string | number | null>>;
}

export async function getPartyAddressForUser(partyId: string, userId: string) {
  const supabase = await createClient();

  const [{ data: party }, { data: accepted }] = await Promise.all([
    supabase.from("parties").select("id, host_user_id, title").eq("id", partyId).maybeSingle(),
    supabase
      .from("party_requests")
      .select("id")
      .eq("party_id", partyId)
      .eq("requester_user_id", userId)
      .eq("status", "accepted")
      .maybeSingle(),
  ]);

  if (!party) {
    return null;
  }

  const isHost = party.host_user_id === userId;
  const isAcceptedGuest = Boolean(accepted);

  if (!isHost && !isAcceptedGuest) {
    return null;
  }

  const { data: location } = await supabase
    .from("party_locations")
    .select("street, house_number, postal_code, city, address_note")
    .eq("party_id", partyId)
    .maybeSingle();

  return {
    partyTitle: party.title,
    location,
  };
}

export async function getHostDashboard(userId: string) {
  const supabase = await createClient();

  const [dashboardRes, vibesRes] = await Promise.all([
    supabase
      .from("v_host_party_dashboard")
      .select("*")
      .eq("host_user_id", userId)
      .order("starts_at", { ascending: true }),
    supabase.from("party_vibes").select("id, label").eq("is_active", true),
  ]);

  const fallbackVibesRes = await (vibesRes.error
    ? supabase.from("party_vibes").select("id, label")
    : Promise.resolve({ data: null as null, error: null as null }));

  const safeVibes =
    vibesRes.error && fallbackVibesRes.data
      ? fallbackVibesRes.data
      : (vibesRes.data ?? []);

  const hostPartyIds = new Set(
    ((dashboardRes.data ?? []) as Array<{ party_id: string }>).map((party) => party.party_id),
  );

  const hostPartyIdList = Array.from(hostPartyIds);
  const requestsRes =
    hostPartyIdList.length > 0
      ? await supabase
          .from("party_requests")
          .select("id, party_id, requester_user_id, group_size, status, message, created_at, parties(title)")
          .eq("status", "pending")
          .in("party_id", hostPartyIdList)
          .order("created_at", { ascending: false })
      : ({ data: [] } as { data: Array<Record<string, unknown>> });

  const pending = (requestsRes.data ?? []) as Array<Record<string, unknown>>;

  return {
    dashboard: (dashboardRes.data ?? []) as Array<Record<string, string | number | null>>,
    pending,
    vibes: (safeVibes as Array<{ id: number; label: string | null }>)
      .filter((vibe) => typeof vibe.id === "number" && Number.isFinite(vibe.id))
      .map((vibe) => ({
        id: vibe.id,
        label: (vibe.label ?? "").trim() || `Vibe #${vibe.id}`,
      })),
  };
}

export async function getChatThreads(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("v_chat_threads_with_last_message")
    .select("*")
    .or(`host_user_id.eq.${userId},guest_user_id.eq.${userId}`)
    .order("last_message_at", { ascending: false, nullsFirst: false });

  return (data ?? []) as ChatPreview[];
}

export async function getChatMessages(threadId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("chat_messages")
    .select("id, thread_id, sender_user_id, body, created_at")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });

  return (data ?? []) as Array<{
    id: string;
    sender_user_id: string;
    body: string;
    created_at: string;
  }>;
}
