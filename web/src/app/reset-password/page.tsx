import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { LegalLinks } from "@/components/layout/legal-links";

export default function ResetPasswordPage() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-6 sm:py-8">
      <div className="mb-5 text-center sm:mb-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-zinc-500">WasGehtTüb</p>
        <h1 className="mt-2 text-[1.9rem] font-bold leading-tight tracking-tight text-zinc-900 sm:text-3xl">
          Passwort zurücksetzen
        </h1>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-zinc-600">
          Setze hier ein neues Passwort für deinen Account.
        </p>
      </div>

      <ResetPasswordForm />
      <LegalLinks className="mt-4" />
    </div>
  );
}
