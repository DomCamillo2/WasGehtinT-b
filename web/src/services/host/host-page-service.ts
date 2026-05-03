import { getHostDashboard, getUserRole, requireUser } from "@/lib/data";

export type HostDashboardCard = {
  partyId: string;
  title: string;
  startsAt: string;
  pendingRequests: number;
  acceptedRequests: number;
  spotsLeft: number;
  paidTotalCents: number;
};

export type HostPendingRequest = {
  id: string;
  partyTitle: string;
  groupSize: number;
  message: string;
};

export type HostPageData = {
  isAdmin: boolean;
  vibes: Array<{ id: number; label: string }>;
  dashboard: HostDashboardCard[];
  pendingRequests: HostPendingRequest[];
};

export async function loadHostPageData(): Promise<HostPageData> {
  const { user } = await requireUser();
  const [role, hostDashboard] = await Promise.all([
    getUserRole(user.id),
    getHostDashboard(user.id),
  ]);

  const dashboard = hostDashboard.dashboard.map((row) => ({
    partyId: String(row.party_id ?? ""),
    title: String(row.title ?? "Party"),
    startsAt: String(row.starts_at ?? ""),
    pendingRequests: Number(row.pending_requests ?? 0),
    acceptedRequests: Number(row.accepted_requests ?? 0),
    spotsLeft: Number(row.spots_left ?? 0),
    paidTotalCents: Number(row.paid_total_cents ?? 0),
  }));

  const pendingRequests = hostDashboard.pending.map((request) => ({
    id: String(request.id ?? ""),
    partyTitle: String((request.parties as { title?: string } | null)?.title ?? "Party"),
    groupSize: Number(request.group_size ?? 0),
    message: String(request.message ?? ""),
  }));

  return {
    isAdmin: role === "admin",
    vibes: hostDashboard.vibes,
    dashboard,
    pendingRequests,
  };
}
