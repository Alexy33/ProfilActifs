"use client";

import { BriefcaseBusiness, LogOut } from "lucide-react";
import Link from "next/link";
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
          <Card className="w-full gap-0 rounded-3xl border-0 bg-[#ebf0f7] py-0 shadow-[14px_14px_28px_#c5d1e0,-14px_-14px_28px_#ffffff] ring-1 ring-[#1B3A6B]/10">
            <CardHeader className="flex flex-row items-center justify-between border-b border-[#2d3748]/10 px-8 py-6 sm:px-12">
              <div className="flex items-center gap-3 text-lg font-semibold tracking-tight text-[#2d3748]">
                <span className="rounded-lg bg-[#1B3A6B] p-2.5 text-white shadow-sm">
                  <BriefcaseBusiness aria-hidden="true" className="size-5" />
                </span>
                ProfilsActifs
              </div>
              <Link
                href="/"
                aria-label="Retourner à l'accueil"
                title="Retourner à l'accueil"
                className="flex size-9 items-center justify-center rounded-xl bg-[#ebf0f7] text-[#273D4F] shadow-[4px_4px_8px_#c5d1e0,-4px_-4px_8px_#ffffff] transition-all hover:text-[#1B3A6B] hover:shadow-[inset_3px_3px_6px_#c5d1e0,inset_-3px_-3px_6px_#ffffff] active:scale-95"
              >
                <LogOut aria-hidden="true" className="size-4" />
              </Link>
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
