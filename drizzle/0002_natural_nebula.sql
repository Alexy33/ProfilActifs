ALTER TABLE `profile` ADD `video_status` text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE `profile` ADD `video_review_reason` text;--> statement-breakpoint
ALTER TABLE `profile` ADD `video_reviewed_by` text REFERENCES user(id);--> statement-breakpoint
ALTER TABLE `profile` ADD `video_reviewed_at` integer;--> statement-breakpoint
ALTER TABLE `profile` ADD `video_seen_before_review` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `user` ADD `birth_date` integer;--> statement-breakpoint
/* ---------------------------------------------------------------------------
 * Reprise de l'existant — mesure Cabinet du 2026-09-02, point 2.
 *
 * Le DEFAULT 'pending' ci-dessus a deja bascule TOUTES les videos deja
 * deposees en attente de validation : c'est l'effet voulu, une mesure qui ne
 * s'appliquerait qu'aux depots futurs ne protegerait personne.
 *
 * Reste la question posee par le Cabinet : que faire de celles qui ont deja
 * ete consultees par un recruteur ? Choix retenu — les RETIRER comme les
 * autres (elles sont deja en `pending`, donc plus servies) et les SIGNALER,
 * plutot que de les laisser en ligne. Une video deja vue ne peut pas etre
 * « non vue », mais la laisser accessible en attendant une revue reviendrait
 * a maintenir en ligne un contenu non valide.
 *
 * Le signalement sert deux fins : prevenir le candidat que sa video a ete vue
 * avant le retrait, et permettre a l'administration de traiter ces cas en
 * priorite. Le proxy de « deja consultee » est le compteur de vues du profil,
 * seule trace de consultation dont dispose la base.
 * ------------------------------------------------------------------------ */
UPDATE `profile`
   SET `video_seen_before_review` = true
 WHERE `video_url` IS NOT NULL
   AND `video_url` <> ''
   AND `views` > 0;
