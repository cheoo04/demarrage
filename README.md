# Messagerie TCP — code de départ

Dans deux terminaux ouverts à la racine :

1. `npm run server`
2. `npm run client`, puis saisir `hello` et Entrée.

Aucune dépendance npm n'est nécessaire pour ce premier échange. Les deux
programmes sont en CommonJS (`require`), explicitement déclaré dans package.json.
Ils communiquent uniquement sur 127.0.0.1:8080. Ctrl+C arrête chaque programme.

Adaptation du dossier fourni `projet-partie-1-template-main` :
- suppression du `q` isolé qui empêchait le client de démarrer ;
- déclaration locale `const msg` dans le serveur au lieu d'une globale implicite ;
- indentation, commentaires et scripts de lancement ; logique hello conservée.

Ce fragment n'est PAS une messagerie complète ni un serveur robuste. Il suppose
à tort qu'un événement data contient exactement un JSON entier ; TCP est un flux
d'octets, sans frontières de messages. Les données invalides, les erreurs réseau,
le découpage et les limites des messages restent à traiter dans le projet.
Ne pas exposer ce serveur sur Internet. Le nom d'utilisateur n'authentifie personne.

L'archive originale, sans corrections, reste disponible séparément sur la page.
