import { Tag } from "@/components/ui/tag";
import { STACK } from "@/lib/stack";

/** Bandeau de pied de page : mention institutionnelle et briques techniques. */
export function SiteFooter() {
  return (
    <footer className="border-t border-divider bg-bg">
      <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-6 px-7 py-5">
        <div className="font-mono text-[10.5px] tracking-[0.1em] text-text/50 uppercase">
          Ministère du Job et Bonheur — Direction Numérique et Innovation · Démonstrateur v1.0
        </div>
        <div className="flex flex-wrap gap-1.5">
          {STACK.map((item) => (
            <Tag key={item} variant="neutral" className="font-mono text-[10px]">
              {item}
            </Tag>
          ))}
        </div>
      </div>
    </footer>
  );
}
