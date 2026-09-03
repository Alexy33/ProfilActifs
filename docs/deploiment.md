# Note de déploiement

Cette note décrit une cible de déploiement possible pour l'application **ProfilsActifs**, les ressources nécessaires à son fonctionnement et les éventuels échanges de données avec des services tiers.

## 1. Hébergement envisagé

L'application peut être hébergée sur un serveur Linux disposant de Docker, par exemple :

* un serveur dédié ou une machine virtuelle ;
* un VPS hébergé chez un prestataire ;
* une infrastructure interne au ministère.

Le projet fournit déjà une image Docker de production ainsi qu'un fichier `docker-compose.yml`.

L'application Next.js écoute sur le port `3000` dans le conteneur. En production, elle pourrait être placée derrière un reverse proxy HTTPS, par exemple Nginx, Caddy ou un équipement équivalent fourni par l'infrastructure d'hébergement.

Les données persistantes sont stockées dans le volume `/data` du conteneur.

Ce volume contient notamment :

* la base SQLite `profilsactifs.db` ;
* les vidéos téléversées directement par les candidats dans `/data/uploads`.

L'application est donc conçue pour fonctionner sur une infrastructure essentiellement locale et ne nécessite pas de base de données ou de stockage cloud externe pour son fonctionnement actuel.

## 2. Ressources nécessaires

Pour le démonstrateur, les besoins matériels restent faibles.

Une cible de déploiement raisonnable serait :

| Ressource    | Besoin indicatif                                    |
| ------------ | --------------------------------------------------- |
| CPU          | 1 à 2 vCPU                                          |
| Mémoire vive | 1 à 2 Go de RAM                                     |
| Stockage     | 10 Go minimum, extensible selon le nombre de vidéos |
| Système      | Linux avec Docker                                   |
| Réseau       | accès HTTP/HTTPS entrant                            |

Le principal élément pouvant augmenter les besoins de stockage est l'upload des vidéos de présentation.

Chaque vidéo téléversée directement est limitée à **100 Mo**. La capacité disque doit donc être dimensionnée en fonction du nombre de profils attendus et du nombre de vidéos conservées.

La base SQLite et les vidéos doivent être placées sur un volume persistant afin de ne pas être perdues lors du remplacement ou du redémarrage du conteneur.

## 3. Données restant dans l'infrastructure

Dans le fonctionnement normal de l'application, les principales données restent dans l'infrastructure qui héberge ProfilsActifs.

Cela comprend notamment :

* les comptes utilisateurs ;
* les profils candidats ;
* les informations de certification ;
* les réponses aux questionnaires ;
* les favoris et informations liées aux recruteurs ;
* les données d'administration ;
* les vidéos téléversées directement sur ProfilsActifs.

La base de données utilisée actuellement est SQLite et est stockée localement dans `/data/profilsactifs.db`.

Les vidéos envoyées directement sur la plateforme sont elles aussi conservées localement dans `/data/uploads`.

Aucun service externe de base de données, d'authentification ou de stockage objet n'est nécessaire dans l'architecture actuelle.

## 4. Données pouvant sortir de l'infrastructure

Le fonctionnement principal de l'application ne nécessite pas l'envoi des données de ProfilsActifs vers un service tiers.

Une exception existe cependant pour certains profils, notamment dans le jeu de données de démonstration : un profil peut utiliser une **URL vidéo externe YouTube ou Vimeo** à la place d'une vidéo téléversée directement.

Dans ce cas, la vidéo n'est pas hébergée par ProfilsActifs.

Lorsqu'un utilisateur consulte cette vidéo depuis l'interface, son navigateur communique directement avec le service externe concerné.

Selon le fournisseur et son mécanisme d'intégration, certaines informations techniques peuvent alors être transmises au tiers, par exemple :

* l'adresse IP de l'utilisateur ;
* des informations concernant son navigateur et son appareil ;
* des données techniques nécessaires au chargement du lecteur ;
* éventuellement des cookies ou autres identifiants gérés par le fournisseur externe.

ProfilsActifs ne transmet volontairement ni les réponses de certification, ni les données de compte, ni la base de données à YouTube ou Vimeo.

## 5. Services tiers concernés

Les seuls services tiers identifiés dans le fonctionnement actuel sont liés aux vidéos externes.

| Tiers            | Utilisation                                        | Données concernées                                                |
| ---------------- | -------------------------------------------------- | ----------------------------------------------------------------- |
| YouTube / Google | Lecture d'une vidéo référencée par une URL YouTube | Requête du navigateur vers YouTube lors de l'affichage du lecteur |
| Vimeo            | Lecture d'une vidéo référencée par une URL Vimeo   | Requête du navigateur vers Vimeo lors de l'affichage du lecteur   |

Ces services ne sont utilisés que lorsqu'un profil possède une URL externe correspondante.

Une vidéo téléversée directement sur ProfilsActifs reste, elle, entièrement stockée et servie par l'infrastructure de l'application.

## 6. Synthèse

L'architecture actuelle de ProfilsActifs est principalement autonome : l'application, la base SQLite et les vidéos téléversées peuvent être hébergées sur une même infrastructure Docker.

Aucune donnée métier n'a besoin d'être envoyée vers un service cloud tiers pour permettre le fonctionnement de la plateforme.

Le principal cas de sortie de l'infrastructure concerne les vidéos YouTube ou Vimeo référencées par certains profils : leur lecture provoque une connexion directe entre le navigateur de l'utilisateur et le fournisseur vidéo concerné.
