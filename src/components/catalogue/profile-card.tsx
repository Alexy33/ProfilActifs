import Link from "next/link";
import { Blueprint } from "@/components/ui/blueprint";
import { Button } from "@/components/ui/button";
import { Tag } from "@/components/ui/tag";
import type { ProfileCard as ProfileCardData } from "@/server/services/profiles";
import { CardVideo } from "./card-video";
import { FavoriteButton } from "./favorite-button";

/** Carte du catalogue : identite, badge de certification, competences, actions. */
export function ProfileCard({
  profile,
  canFavorite,
  favorited,
}: {
  profile: ProfileCardData;
  canFavorite: boolean;
  favorited: boolean;
}) {
  return (
    <Blueprint as="article" className="flex flex-col gap-3.5 p-5">
      <div className="flex items-start gap-3.5">
        <div className="grid size-13 flex-none place-items-center border border-divider font-heading text-[19px] text-accent-700">
          {profile.initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="font-heading text-[21px] leading-tight">{profile.name}</div>
            {profile.certified ? (
              <Tag variant="solid" className="font-mono text-[10px] tracking-[0.08em]">
                ✓ JEB {profile.score}
              </Tag>
            ) : null}
          </div>
          <div className="mt-0.5 text-[13.5px] text-text/75">{profile.title}</div>
          <div className="mt-1.5 font-mono text-[11px] text-text/55">
            {profile.sector} · {profile.city} · {profile.views} vues
          </div>
        </div>
      </div>

      <CardVideo videoUrl={profile.videoUrl} name={profile.name} />

      <div className="flex flex-wrap gap-[5px]">
        {profile.skills.map((skill) => (
          <Tag key={skill}>{skill}</Tag>
        ))}
      </div>

      <div className="mt-0.5 flex items-center gap-2">
        <Button asChild variant="secondary" className="h-8 flex-1">
          <Link href={`/profils/${profile.id}`}>Voir le profil</Link>
        </Button>
        {canFavorite ? <FavoriteButton profileId={profile.id} favorited={favorited} /> : null}
      </div>
    </Blueprint>
  );
}
