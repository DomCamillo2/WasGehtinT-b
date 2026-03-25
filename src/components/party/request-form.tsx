import { createRequestAction } from "@/app/actions/requests";
import { PrimaryButton } from "@/components/ui/primary-button";

type BringItem = {
  id: string;
  item_name: string;
  quantity_needed: number;
};

type Props = {
  partyId: string;
  bringItems: BringItem[];
};

export function RequestForm({ partyId, bringItems }: Props) {
  return (
    <form action={createRequestAction} className="mt-3 space-y-2 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
      <input type="hidden" name="partyId" value={partyId} />
      <div className="grid grid-cols-3 gap-2">
        <input
          name="groupSize"
          type="number"
          min={1}
          max={20}
          defaultValue={1}
          className="col-span-1 h-10 rounded-lg border border-zinc-200 bg-white px-2 text-sm"
        />
        <input
          name="message"
          type="text"
          placeholder="Kurze Nachricht"
          className="col-span-2 h-10 rounded-lg border border-zinc-200 bg-white px-3 text-sm"
        />
      </div>

      {bringItems.length ? (
        <div className="space-y-1">
          <p className="text-xs font-medium text-zinc-600">Ich kann mitbringen:</p>
          <div className="grid grid-cols-1 gap-1">
            {bringItems.map((item) => (
              <label key={item.id} className="flex items-center gap-2 text-xs text-zinc-700">
                <input type="checkbox" name="bringItemId" value={item.id} />
                <span>
                  {item.item_name} (benötigt: {item.quantity_needed})
                </span>
              </label>
            ))}
          </div>
        </div>
      ) : null}

      <PrimaryButton type="submit" className="w-full">
        Als Gruppe anfragen
      </PrimaryButton>
    </form>
  );
}
