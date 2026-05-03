import { BringProgress, PartyCard } from "@/lib/types";

type BringItemRow = {
  id: string;
  item_name: string;
  quantity_needed: number;
};

export type PartyCardViewModel = {
  id: string;
  title: string;
  description: string | null;
  startsAt: string;
  maxGuests: number;
  contributionCents: number;
  isExternal: boolean;
  vibeLabel: string;
  spotsLeft: number;
};

export type PartyBringProgressItem = {
  bringItemId: string;
  itemName: string;
  quantityNeeded: number;
  quantityCommitted: number;
  quantityOpen: number;
};

export type RequestFormBringItem = {
  id: string;
  itemName: string;
  quantityNeeded: number;
};

export function mapPartyCardToViewModel(party: PartyCard): PartyCardViewModel {
  return {
    id: party.id,
    title: party.title,
    description: party.description,
    startsAt: party.starts_at,
    maxGuests: party.max_guests,
    contributionCents: party.contribution_cents,
    isExternal: party.is_external,
    vibeLabel: party.vibe_label,
    spotsLeft: party.spots_left,
  };
}

export function mapBringProgressToViewModels(
  bringProgress: BringProgress[],
): PartyBringProgressItem[] {
  return bringProgress.map((item) => ({
    bringItemId: item.bring_item_id,
    itemName: item.item_name,
    quantityNeeded: item.quantity_needed,
    quantityCommitted: item.quantity_committed,
    quantityOpen: item.quantity_open,
  }));
}

export function mapBringItemsToViewModels(
  bringItems: BringItemRow[],
): RequestFormBringItem[] {
  return bringItems.map((item) => ({
    id: item.id,
    itemName: item.item_name,
    quantityNeeded: item.quantity_needed,
  }));
}
