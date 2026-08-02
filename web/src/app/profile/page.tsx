import { redirect } from "next/navigation";

/**
 * Profiles ship with login. Until then, avoid blank pages.
 */
export default function ProfilePage() {
  redirect("/discover");
}
