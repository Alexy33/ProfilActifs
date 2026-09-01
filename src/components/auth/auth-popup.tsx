"use client";

import { BriefcaseBusiness } from "lucide-react";
import { usePathname } from "next/navigation";
import {
  AnimatePresence,
  LazyMotion,
  MotionConfig,
  domAnimation,
  m,
} from "framer-motion";

import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function AuthPopup({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();

  return (
    <LazyMotion features={domAnimation}>
      <MotionConfig reducedMotion="user">
        <m.div
          layout
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            layout: { duration: 0.4, ease: "easeInOut" },
            duration: 0.4,
            ease: "easeOut",
          }}
          className="w-full"
        >
          <Card className="w-full gap-0 rounded-2xl border border-white/10 bg-white py-0 shadow-2xl shadow-black/60 ring-1 ring-black/5">
            <CardHeader className="flex items-center justify-center border-b border-zinc-100 px-8 py-6 sm:px-12">
              <div className="flex items-center gap-3 text-lg font-semibold tracking-tight text-zinc-950">
                <span className="rounded-lg bg-zinc-950 p-2.5 text-white shadow-sm">
                  <BriefcaseBusiness aria-hidden="true" className="size-5" />
                </span>
                ProfilsActifs
              </div>
            </CardHeader>

            <CardContent className="relative px-8 py-10 sm:px-12 sm:py-12">
              <AnimatePresence mode="popLayout" initial={false}>
                <m.div
                  key={pathname}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                >
                  {children}
                </m.div>
              </AnimatePresence>
            </CardContent>
          </Card>
        </m.div>
      </MotionConfig>
    </LazyMotion>
  );
}
