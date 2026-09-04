import { AuthPopup } from "@/components/auth/auth-popup";
import { BlocMarque } from "@/components/layout/bloc-marque";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <main className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-[#ebf0f7] px-4 py-8 text-[#22334D] sm:px-6">
      <div aria-hidden="true" className="absolute inset-0 -z-20 bg-[#ebf0f7]" />
      <div
        aria-hidden="true"
        className="absolute -left-32 top-[-12rem] -z-10 size-[32rem] rounded-full bg-[#A8C5E0]/35 blur-[120px]"
      />
      <div
        aria-hidden="true"
        className="absolute -bottom-64 -right-32 -z-10 size-[38rem] rounded-full bg-[#4A6B8A]/20 blur-[140px]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(235,240,247,0.72)_72%)] backdrop-blur-sm"
      />

      {/* Bloc-marque en haut a gauche (charte R.10). Pose en absolu pour ne pas
          decentrer la carte, et au-dessus des halos decoratifs — la charte
          interdit de poser la marque sur une image, le fond opaque du bloc
          garantit qu'aucun degrade ne passe dessous. */}
      <div className="absolute left-6 top-6 z-10">
        <BlocMarque />
      </div>

      <section className="w-full max-w-[540px]">
        <AuthPopup>{children}</AuthPopup>
      </section>
    </main>
  );
}
