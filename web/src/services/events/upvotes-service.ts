"use client";

import { ServiceError } from "@/services/service-error";

export type TogglePartyUpvoteResult = {
  upvoted: boolean;
  upvoteCount: number;
};

export async function togglePartyUpvote(
  eventId: string,
  upvoted: boolean,
): Promise<TogglePartyUpvoteResult> {
  try {
    const response = await fetch(`/api/parties/${encodeURIComponent(eventId)}/upvote`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ upvoted }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new ServiceError("UNAUTHORIZED", "Bitte logge dich ein, um Upvotes zu vergeben.");
      }
      if (response.status === 403) {
        throw new ServiceError("FORBIDDEN", "Du darfst diese Aktion nicht ausführen.");
      }
      if (response.status === 404) {
        throw new ServiceError("NOT_FOUND", "Dieses Event wurde nicht gefunden.");
      }
      throw new ServiceError("UNAVAILABLE", "Upvote-Service ist momentan nicht erreichbar.");
    }

    const data = (await response.json()) as {
      upvoted?: boolean;
      upvoteCount?: number;
    };

    return {
      upvoted: Boolean(data.upvoted),
      upvoteCount: Math.max(0, Number(data.upvoteCount ?? 0)),
    };
  } catch (error) {
    if (error instanceof ServiceError) {
      throw error;
    }
    throw new ServiceError("NETWORK", "Netzwerkfehler beim Upvote. Bitte erneut versuchen.");
  }
}