import { getMyRequests, requireUser } from "@/lib/data";

export type RequestListItem = {
  id: string;
  partyId: string;
  partyTitle: string;
  startsAt: string;
  groupSize: number;
  totalCents: number;
  requestStatus: string;
  paymentStatus: string;
};

export type RequestsPageData = {
  userId: string;
  requests: RequestListItem[];
};

export async function loadRequestsPageData(): Promise<RequestsPageData> {
  const { user } = await requireUser();
  const rawRequests = await getMyRequests(user.id);

  const requests = rawRequests.map((request) => ({
    id: String(request.party_request_id ?? ""),
    partyId: String(request.party_id ?? ""),
    partyTitle: String(request.party_title ?? "Party"),
    startsAt: String(request.starts_at ?? ""),
    groupSize: Number(request.group_size ?? 0),
    totalCents: Number(request.total_cents ?? 0),
    requestStatus: String(request.request_status ?? ""),
    paymentStatus: String(request.payment_status ?? ""),
  }));

  return {
    userId: user.id,
    requests,
  };
}
