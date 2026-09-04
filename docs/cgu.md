# Conditions générales d'utilisation — ProfilsActifs (projet)

> **Projet de CGU**, rédigé avec le registre des traitements
> (`docs/registre-traitements.md`) et non après lui. Les deux documents se
> lisent côte à côte : mêmes données, mêmes durées, mêmes destinataires. Les
> durées annoncées ici sont celles qu'applique `src/server/services/retention.ts`
> — elles ne sont pas des intentions.
>
> Version 2026-09 · dernière mise à jour : 4 septembre 2026.

---

## 1. Objet

ProfilsActifs (JEB/DNI/2026-003) est un dispositif de valorisation des
demandeurs d'emploi : un candidat y publie un profil, éventuellement une vidéo
de présentation, passe un questionnaire de certification, et peut être contacté
par des recruteurs inscrits.

L'utilisation du service suppose d'accepter les présentes conditions.

## 2. Qui peut s'inscrire

**Le service est réservé aux personnes de 16 ans et plus.** La date de
naissance est demandée à l'inscription et vérifiée par le serveur : une
inscription qui ne la fournit pas, ou qui déclare un âge inférieur, est refusée
(cf. `docs/verification-age.md`). Elle est conservée pour la durée du compte.

Un compte se crée dans **un rôle** :

- **demandeur d'emploi** : un profil vide est créé, en attente de modération ;
- **recruteur** : l'entreprise doit être déclarée dans la même demande — raison
  sociale, SIREN, fonction occupée, adresse, secteur. Un recruteur sans
  entreprise n'existe pas, parce qu'un candidat doit savoir au nom de qui il
  est contacté.

Les comptes d'administration ne sont pas accessibles à l'inscription.

## 3. Le profil, et ce qui est public

Un profil validé par la modération est **consultable par tout le monde**, sans
compte : intitulé recherché, secteur, ville, présentation, compétences, badge
de certification et score, et la vidéo si elle a été validée.

Deux choses ne sortent jamais du service : **le nombre de vues d'un profil**,
qui n'est montré qu'à son titulaire, et **les mises en favori**, qui ne sont
jamais révélées au candidat concerné. Le catalogue ne classe pas les personnes
par audience.

## 4. La vidéo : votre accord, à tout moment révocable

Une vidéo porte votre image et votre voix. Elle n'est donc **diffusée que si
vous y consentez explicitement**, et cet accord est enregistré avec sa date et
la version du texte que vous avez accepté. Une réécriture du texte suppose un
nouvel accord.

**Vous pouvez retirer cet accord à tout moment.** Le retrait efface le fichier
du serveur dans le même geste — pas plus tard, pas sur demande. Restent
conservées, pendant **36 mois**, la date de l'accord, la version acceptée et la
date du retrait : c'est ce qui permet d'établir ce qui avait été accepté, et
quand.

Deux façons de publier une vidéo, deux conséquences différentes :

- **fichier déposé sur le service** : il est hébergé sur nos serveurs et n'est
  transmis à personne d'autre ;
- **lien YouTube ou Vimeo** : la vidéo est lue depuis le site du tiers. **Votre
  adresse IP, et celle de chaque visiteur du profil, sont alors communiquées à
  ce tiers**, selon ses propres conditions, sur lesquelles nous n'avons pas la
  main.

## 5. Modération

Toute vidéo déposée est **en attente** tant qu'elle n'a pas été examinée : elle
n'est visible que par vous et par l'équipe du dispositif, y compris par son
adresse directe. Une vidéo qui remplace une vidéo déjà validée repasse en
attente.

Un refus est motivé, et le motif vous est communiqué sur votre espace. Le
fichier refusé est effacé **30 jours** après la décision ; la décision et son
motif, eux, sont conservés.

## 6. Certification

Le questionnaire produit un score et, au-delà d'un seuil fixé par
l'administration, un badge affiché sur votre profil public. Vos réponses et vos
scores sont conservés **24 mois** après chaque passage ; une tentative
commencée puis abandonnée est effacée au bout de **30 jours**. Une modification
du seuil ne remet pas en cause les certifications déjà délivrées.

## 7. Prise de contact

Un recruteur inscrit peut vous adresser un message ; vous en êtes informé par
une notification. Le message, son statut de suivi et l'identité du recruteur
sont conservés **24 mois** après le dernier échange. Reprendre l'échange fait
repartir ce délai.

Les notifications sont conservées **12 mois**.

## 8. Combien de temps vos données sont conservées

| Ce qui est conservé | Durée |
| --- | --- |
| Votre compte, votre profil, vos compétences, votre entreprise | **24 mois** après votre dernière connexion, puis suppression complète |
| Journal de connexion (adresse IP, navigateur, dates) | **6 mois** |
| Vidéo déposée | Tant que votre compte existe et que votre accord tient. Effacée **immédiatement** au retrait |
| Preuve du consentement retiré (date, version, date de retrait) | **36 mois** après le retrait |
| Vidéo refusée par la modération | **30 jours** après la décision |
| Prises de contact | **24 mois** après le dernier échange |
| Favoris | **24 mois** |
| Notifications | **12 mois** |
| Tentatives de certification soumises | **24 mois** |
| Tentative de certification abandonnée | **30 jours** |
| Jetons de vérification | **30 jours** après expiration |

Ces suppressions sont **automatiques** : elles s'exécutent tous les jours, sans
intervention ni demande de votre part.

## 9. Qui voit vos données

- **Tout le monde** : votre profil une fois publié, et votre vidéo une fois
  validée (§3).
- **Les recruteurs inscrits** : la même chose, plus la possibilité de vous
  mettre en favori et de vous contacter.
- **L'équipe du dispositif** : l'ensemble, pour la modération et l'assistance.
- **YouTube ou Vimeo**, uniquement si un profil consulté renvoie vers une vidéo
  hébergée chez eux (§4).

**Il n'y a personne d'autre.** Aucune mesure d'audience tierce, aucune régie
publicitaire, aucun cookie tiers, aucun transfert hors Union européenne. Le
seul cookie déposé est celui qui vous garde connecté ; il est strictement
nécessaire au service. Vos données ne sont ni vendues ni cédées.

## 10. Vos droits

Depuis votre espace personnel, sans demande préalable ni délai :

- **consulter** ce qui est stocké — votre espace montre exactement le contenu
  enregistré, statut de modération et nombre de vues compris ;
- **corriger** votre profil et votre entreprise à tout moment ;
- **retirer votre consentement** à la diffusion de votre vidéo, ce qui efface
  le fichier immédiatement ;
- **supprimer votre compte**, ce qui efface définitivement votre profil, votre
  vidéo, votre entreprise, vos sessions, vos notifications, vos tentatives de
  certification, vos favoris et vos prises de contact.

La suppression du compte est **immédiate et sans retour** : le service ne
conserve pas de copie différée.

## 11. Ce que vous vous engagez à ne pas publier

Vous ne publiez que du contenu dont vous disposez : une vidéo où apparaît ou
s'entend **une autre personne** suppose son accord. La modération refuse tout
contenu qui porte atteinte à un tiers, ainsi que les propos illicites. Le
dispositif peut retirer un profil ou une vidéo sur ce fondement, en motivant sa
décision.

## 12. Disponibilité

ProfilsActifs est un démonstrateur. Le service est fourni sans garantie de
disponibilité continue, et son contenu — un profil, une vidéo — ne constitue ni
un engagement d'embauche ni une garantie de mise en relation.

## 13. Modification des présentes conditions

Toute modification est publiée avec une nouvelle version datée. Une réécriture
du texte de consentement à la diffusion vidéo **impose un nouvel accord** : un
accord donné sur une version antérieure ne vaut pas pour la suivante.
