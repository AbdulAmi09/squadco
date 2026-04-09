export default function OnboardingPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-4xl items-center px-6 py-16">
      <div className="w-full rounded-[32px] border border-[var(--line)] bg-[var(--panel)] p-8 shadow-panel">
        <h1 className="text-4xl font-semibold">Onboarding</h1>
        <p className="mt-3 text-sm text-[var(--muted)]">Complete company profile, country, and initial sandbox setup here. This route is ready for a full self-serve signup flow.</p>
      </div>
    </main>
  );
}
