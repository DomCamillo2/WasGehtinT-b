import { redirect } from "next/navigation";
import { hasSupabaseEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { BringProgress, ChatPreview, PartyCard } from "@/lib/types";

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
  const { data, error } = await supabase
    .from("v_public_parties")
    .select("*")
    .order("starts_at", { ascending: true });

  if (error) {
    return [] as PartyCard[];
  }

  return (data ?? []) as PartyCard[];
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

  const [dashboardRes, requestsRes, vibesRes] = await Promise.all([
    supabase
      .from("v_host_party_dashboard")
      .select("*")
      .eq("host_user_id", userId)
      .order("starts_at", { ascending: true }),
    supabase
      .from("party_requests")
      .select("id, party_id, requester_user_id, group_size, status, message, created_at, parties(title)")
      .in("status", ["pending"]) 
      .order("created_at", { ascending: false }),
    supabase.from("party_vibes").select("id, label").eq("is_active", true),
  ]);

  const hostPartyIds = new Set(
    ((dashboardRes.data ?? []) as Array<{ party_id: string }>).map((party) => party.party_id),
  );

  const pending = ((requestsRes.data ?? []) as Array<Record<string, unknown>>).filter((row) =>
    hostPartyIds.has(String(row.party_id)),
  );

  return {
    dashboard: (dashboardRes.data ?? []) as Array<Record<string, string | number | null>>,
    pending,
    vibes: (vibesRes.data ?? []) as Array<{ id: number; label: string }>,
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
