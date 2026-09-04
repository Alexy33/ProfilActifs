ALTER TABLE `profile` ADD `video_status` text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE `profile` ADD `video_review_reason` text;--> statement-breakpoint
ALTER TABLE `profile` ADD `video_reviewed_by` text REFERENCES user(id);--> statement-breakpoint
ALTER TABLE `profile` ADD `video_reviewed_at` integer;--> statement-breakpoint
-- Migration des videos existantes (R.2).
--
-- Etat choisi : `pending`. Aucune des videos deja en base n'a ete examinee par
-- l'administration ; les laisser visibles reviendrait a exempter de moderation
-- tout ce qui precede l'exigence, c'est-a-dire a ne pas la satisfaire. Elles
-- redeviennent visibles des qu'un administrateur les valide, sans que leur
-- profil ne quitte le catalogue.
--
-- L'UPDATE est redondant avec le DEFAULT ci-dessus et c'est voulu : la decision
-- doit se lire dans la migration, pas se deduire d'une valeur par defaut.
UPDATE `profile`
SET `video_status` = 'pending',
    `video_review_reason` = NULL,
    `video_reviewed_by` = NULL,
    `video_reviewed_at` = NULL
WHERE `video_url` IS NOT NULL;
