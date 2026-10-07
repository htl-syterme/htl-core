# Threat Model - HTL / X-Trust

Version 1.0 - Octobre 2026

## 0. Conclusion critique : un bot peut-il fabriquer le score ?

Oui, dans certains modeles de deploiement. Il faut distinguer deux problemes :

1. Fabriquer ou modifier un token HTL sans posseder la cle de signature.
2. Obtenir d'un emetteur legitime un score eleve alors que le client est un bot.

HTL peut resoudre le premier probleme cryptographiquement. Il ne peut pas resoudre le second par la cryptographie.

Un token X-Trust authentifie prouve que l'emetteur qui controle la cle a produit ce payload et qu'il n'a pas ete modifie depuis. Il ne prouve pas que le score est objectivement correct, ni que la session est reellement humaine.

La valeur du standard repose sur une separation stricte :

[Observation / detection] -> [Emetteur de confiance] -> [Token HTL] -> [API / service consommateur]

## 1. Acteurs

### 1.1 Client humain honnete
Un utilisateur dont la session produit des signaux compatibles avec le modele de detection utilise par l'emetteur.

### 1.2 Client automatise honnete
Un logiciel automatise utilise avec une intention legitime : test d'API, monitoring, CI, integration backend ou crawler autorise.

### 1.3 Bot malveillant
Un agent automatise qui cherche notamment a obtenir un score artificiellement eleve, reutiliser un token valide, voler ou modifier un token, reproduire les signaux attendus, exploiter les limites du scoring ou compromettre l'emetteur.

### 1.4 Emetteur de score
Le composant qui observe une session, calcule le score et signe le token HTL. Il constitue une frontiere de confiance.

### 1.5 Consommateur HTL
Le service qui recoit X-Trust et verifie notamment la signature, kid, iat, exp et la politique de confiance applicable.

### 1.6 Attaquant reseau
Un adversaire capable d'observer, modifier ou rejouer du trafic.

### 1.7 Attaquant disposant d'une cle d'emission
Un adversaire critique. Avec une cle HMAC compromise, il peut produire des tokens valides. Avec Ed25519, la cle privee doit rester exclusivement cote emetteur.

## 2. Actifs proteges

### 2.1 Integrite du token
Toute modification de score, sub, iat, exp ou kid doit invalider la signature.

### 2.2 Non-forgeabilite
Un attaquant ne doit pas pouvoir produire un token accepte comme authentique sans disposer de la capacite de signature autorisee.

### 2.3 Fraicheur
iat et exp limitent la duree de validite. Un TTL court reduit la fenetre de replay mais ne constitue pas une protection anti-replay complete.

### 2.4 Attribution
sub associe le signal a la session, au sujet ou au contexte defini par l'emetteur. Ce n'est pas necessairement une identite civile.

### 2.5 Confidentialite
HTL ne fournit pas de chiffrement. Un payload Base64 n'est pas secret. Aucune PII n'est necessaire au protocole.

## 3. Dans le perimetre

HTL protege principalement la chaine d'authenticite du signal.

Le protocole couvre :
- le format du token ;
- l'integrite du payload ;
- l'authenticite cryptographique de l'emetteur ;
- la selection de cle via kid ;
- la verification de signature ;
- la validation temporelle ;
- la transmission du signal a travers des couches HTTP.

HTL permet de repondre a : "Ce token a-t-il bien ete signe par l'emetteur auquel je fais confiance et est-il encore valide ?"

HTL ne permet pas de repondre a : "Le score signe est-il objectivement vrai ?"

Cette seconde question appartient au systeme de scoring.

## 4. Scenario 1 - Score serveur a partir de signaux non controles par le client

Exemples : timing reseau, caracteristiques TLS, historique de session, reputation, honeypots, correlations entre requetes.

### Viabilite
C'est un modele viable et preferable a un modele ou le client declare lui-meme son comportement. Le client ne choisit pas directement les donnees fondamentales utilisees pour calculer le score.

### Limites
Un bot peut controler indirectement une partie des observations : timings, navigateur reel, caracteristiques TLS, sessions persistantes, JavaScript ou proxies residentiels. Un bot suffisamment sophistique peut produire un comportement statistiquement proche de celui d'un humain. Les signaux serveur sont donc des observations imparfaites, pas des preuves cryptographiques.

### Verdict
Viable pour produire un signal. Non viable comme detecteur parfait de bots.

## 5. Scenario 2 - Score serveur base sur une telemetrie envoyee par le client

Exemples : mouvements de souris, frappes clavier, pauses, sequences d'interaction et evenements navigateur.

### Replay
Un bot peut enregistrer une sequence de telemetrie puis la rejouer. Une simple validation de presence des evenements ne suffit donc pas.

### Detection sans dataset labellise
Il est possible d'utiliser la detection d'anomalies, des modeles de sequences, l'entropie comportementale, la detection de repetition, des challenges non previsibles, des signaux serveur independants et des correlations inter-sessions. Mais ces methodes ne resolvent pas entierement le probleme.

Sans donnees labellisees, il est difficile d'estimer correctement les faux positifs, faux negatifs, la stabilite du modele et les performances contre des adversaires adaptatifs.

### Ce qui est necessaire
La telemetrie client ne devrait pas etre une racine de confiance. Elle doit etre combinee avec des observations que le client ne controle pas directement.

### Verdict
Viable comme signal secondaire. Insuffisant comme fondement unique d'un score de confiance eleve.

## 6. Scenario 3 - Score calcule cote client puis signe

Ce modele est disqualifie comme mecanisme de securite.

Si le client calcule le score puis produit lui-meme la signature, il possede necessairement la capacite de produire cette assertion.

Distribuer un secret HMAC au client permet au client de signer des tokens arbitraires. Distribuer une cle privee Ed25519 produit le meme probleme. Meme sans cle de signature, un score entierement calcule a partir de donnees controlees par le client reste manipulable.

### Verdict
Disqualifie comme modele de confiance. Le score doit etre calcule et signe dans une frontiere de confiance que l'attaquant ne controle pas.

## 7. Scenario 4 - Score produit par un tiers de confiance

Un tiers peut produire le score, par exemple un WAF, un systeme anti-abus ou un modele ML, puis signer le resultat. HTL devient alors une couche standardisee de transport et d'authentification cryptographique.

### Viabilite
C'est le modele le plus solide lorsque le consommateur ne possede pas les donnees necessaires pour produire lui-meme le score.

### Est-ce le seul modele viable ?
Non. HTL peut supporter un emetteur appartenant a l'application, un systeme ML interne, un WAF ou un fournisseur externe. Le point essentiel est que l'emetteur se trouve dans une frontiere de confiance distincte du client.

### Risque de confiance transitive
Une signature valide signifie que l'emetteur a produit l'assertion. Elle ne transforme pas le score en verite universelle.

### Verdict
Modele fortement viable, mais pas le seul modele viable.

## 8. Menaces principales

### Forge de signature
Defenses : HMAC-SHA256 avec secret aleatoire, Ed25519 avec cle privee protegee, rotation, kid, verification stricte du payload et distribution authentifiee des cles publiques.

### Compromission de l'emetteur
Si l'emetteur ou sa cle est compromis, HTL ne peut plus garantir la qualite du signal. Un token peut rester cryptographiquement valide tout en provenant d'un emetteur compromis.

### Replay
Un token valide peut etre copie avant expiration. Un TTL court limite la fenetre mais ne constitue pas une protection complete. Les applications necessitant une protection forte doivent ajouter une liaison a la session, un nonce ou un autre mecanisme adapte.

### Substitution d'emetteur
Un consommateur ne doit pas accepter n'importe quelle cle simplement parce qu'une signature est valide. La politique doit lier emetteur, identite de cle, kid et algorithme.

### Confusion d'algorithme
La migration HMAC-SHA256 vers Ed25519 doit definir explicitement les algorithmes autorises, les signatures, kid, rotation, coexistence et retrait de HMAC.

### Manipulation du score
Un token peut etre parfaitement signe tout en contenant un score mal classifie. La cryptographie authentifie l'assertion ; elle ne valide pas la qualite du scoring.

## 9. HORS perimetre

HTL ne garantit pas :
- qu'un utilisateur est reellement humain ;
- qu'un score est statistiquement correct ;
- qu'un bot avance sera detecte ;
- qu'une telemetrie n'a jamais ete rejouee ;
- qu'un navigateur headless sera identifie ;
- qu'une IP appartient a une personne unique ;
- qu'une session est legitime ;
- qu'une ferme humaine sera detectee.

HTL n'est pas un CAPTCHA, un KYC, un systeme d'identite, un moteur antifraude complet, un mecanisme d'autorisation ou une preuve cryptographique qu'un humain a produit une requete.

## 10. Hypotheses

1. La cle de signature de l'emetteur est correctement protegee.
2. Le consommateur connait l'emetteur auquel il fait confiance.
3. Les algorithmes acceptes sont strictement controles.
4. iat et exp sont verifies.
5. Les tokens sont transmis via un canal protege, typiquement HTTPS.
6. Les donnees du payload ne sont pas considerees comme secretes.
7. Le systeme de scoring n'est pas entierement controle par l'attaquant.
8. Le consommateur ne transforme pas arbitrairement le score en verite binaire.
9. Les limites statistiques du scoring sont reconnues.
10. La rotation et la revocation des cles sont correctement gerees.
11. La distribution des cles publiques est authentifiee.
12. Un TTL court n'est pas presente comme une protection complete contre le replay.

## 11. Ce qui doit etre vrai pour que HTL ait de la valeur

### Le score doit provenir d'une frontiere de confiance
Le client ne doit pas etre capable de choisir directement son propre score.

### La cryptographie doit proteger l'assertion
Une signature signifie : "This issuer produced this score." Elle ne signifie pas : "This score is objectively true."

### Le score doit rester un signal
Le standard doit eviter une semantique universelle du type 0.80 = humain et 0.79 = bot. Un score n'a de sens que relativement a son emetteur, sa methode, sa version et son contexte.

### Le consommateur doit connaitre l'emetteur
Un token signe par une entite inconnue ne doit pas etre traite comme fiable simplement parce que la cryptographie est correcte.

### Les emetteurs doivent pouvoir changer leur modele
HTL doit standardiser le transport et la verification, pas imposer un detecteur unique.

### Les consommateurs doivent accepter l'incertitude
Le score peut etre combine avec rate limits, autorisation, reputation et contexte de requete. Il ne doit pas devenir une cle d'autorisation universelle.

## 12. Doctrine de securite

Annotate, never block.

HTL transporte un signal. Il ne decide pas seul qui est autorise, qui est malveillant ou qui doit etre bloque. Le consommateur reste responsable de la politique appliquee au signal.

## 13. Modele de confiance recommande

Observation layer -> Trusted issuer -> X-Trust token -> HTL consumer -> Application policy

La frontiere critique se situe entre le client et l'emetteur. La cryptographie protege la frontiere entre l'emetteur et le consommateur.

## 14. Conclusion

HTL ne resout pas le probleme general "est-ce vraiment un humain ?" par lui-meme.

Un bot peut parfois obtenir un score eleve. Une telemetrie peut etre rejouee. Un navigateur headless peut etre suffisamment realiste. Une ferme humaine peut produire un comportement reellement humain. Un modele ML peut se tromper.

Ces limites definissent ce que HTL peut et ne peut pas standardiser.

La propriete fondamentale recherchee est :

trusted issuer -> authenticated assertion -> X-Trust token -> consumer

HTL garantit l'integrite et l'authenticite de cette assertion dans les limites de son modele cryptographique.

La qualite du score reste une propriete de l'emetteur.
La decision d'utilisation reste une propriete du consommateur.

Le protocole doit donc etre presente comme un standard de transport et d'authentification de signaux de comportement, et non comme un mecanisme permettant de prouver qu'un utilisateur est humain.
