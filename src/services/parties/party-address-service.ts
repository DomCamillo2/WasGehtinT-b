import { getPartyAddressForUser, requireUser } from "@/lib/data";

export type PartyAddressPageData = {
  partyTitle: string;
  location: {
    street: string;
    houseNumber: string;
    postalCode: string;
    city: string;
    addressNote: string | null;
  } | null;
};

export async function loadPartyAddressPageData(partyId: string): Promise<PartyAddressPageData | null> {
  const { user } = await requireUser();
  const data = await getPartyAddressForUser(partyId, user.id);

  if (!data) {
    return null;
  }

  return {
    partyTitle: data.partyTitle,
    location: data.location
      ? {
          street: data.location.street,
          houseNumber: data.location.house_number,
          postalCode: data.location.postal_code,
          city: data.location.city,
          addressNote: data.location.address_note ?? null,
        }
      : null,
  };
}
