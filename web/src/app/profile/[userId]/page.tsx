import { redirect } from "next/navigation";

/** Public profiles ship with login — not in the current release. */
export default function PublicProfilePage() {
  redirect("/discover");
}
