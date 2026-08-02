import { redirect } from "next/navigation";

/**
 * Student login is not released yet. Keep the route for future use,
 * but send visitors into the live product surface.
 */
export default function AuthPage() {
  redirect("/discover");
}
