# Apprentissages

## Titre d'exo
#### Exo1 : Explorer minikube et les bases de Kubernetes
Découvertes des commandes et création de namespaces

#### Exo2 : Déployer le guestbook (Pod)

#### Exo3 : Déployer le guestbook (Deployment + Service)

#### Exo4 : Déployer le guestbook (Helm Chart)

#### Exo5 : Ajouter une base de données (Redis)
Déployer Redis dans le namespace data, y connecter le guestbook via une ConfigMap, et persister les données.

#### Exo6 : Rendre l'application robuste avec les probes
Permettre à Kubernetes de détecter qu’un pod est cassé ou pas prêt, et d’agir en conséquence.

#### Exo7 : Exposer le guestbook avec un Ingress


### Problème rencontré et pourquoi il est survenu
#### Exo2 : 
le statut du guestboook était resté à "unchanged" parce que j'étais dans le namespace par défaut 

#### Exo4 : 
- mauvais chemin du chart selon le dossier courant
- helm install refusé, car my-service avait été créé à la main (pas de label managed-by: Helm) et que les templates avaient encore des noms codés en dur

#### Exo5 : 
- Après avoir mis une fausse valeur de REDIS_HOST, les pods ne se sont pas recréés : les variables d’environnement ne sont lues qu’au démarrage du conteneur, et un changement de ConfigMap ne modifie pas le Deployment.
- L’application affichait "no database connexion" alors que les pods étaient Running : la fausse valeur (redis-faux) n’avait jamais été remise. Les logs montraient lookup redis-faux.data.svc.cluster.local: no such host. Sans probes, Kubernetes ne voit pas qu’une application est cassée.
- Les messages ont été perdus après le kubectl apply du Deployment Redis avec PVC : le nouveau pod démarrait avec un volume vide.
- curl échouait avec "Failed to connect": le port-forward s’arrête quand le pod visé est recréé ou quand on ferme le terminal.

#### Exo6 : 
- Sans probes, les pods restaient Running alors que Redis était injoignable : Kubernetes ne sait pas que l’application ne fonctionne pas
- Erreur de syntaxe mapping values are not allowed in this context : les probes étaient mal indentées dans le template(pas au niveau du conteneur), et YAML dépend de l’indentation

### Solution appliquée et pourquoi cette solution fonctionne
#### Exo2 : 
je me suis placée dans le guestbook et la commande apply a fonctionné

#### Exo4 : 
lancer la commande depuis le dossier parent, remplacer les noms par {{ .Release.Name }}, supprimer les ressources manuelles avant l’installation.

#### Exo5 : 
- REDIS_HOST: redis.data.svc.cluster.local : le nom court d’un Service ne se résout que dans son propre namespace, le nom complet fonctionne depuis n’importe quel namespace
- Annotation checksum/config (hash de la ConfigMap) dans le template du pod : quand la ConfigMap change, le template change, ce qui déclenche un rolling update.
- PVC redis-data monté sur /data : le volume survit à la suppression du pod, et Redis y relit dump.rdb.
- helm upgrade --reset-values pour repartir des valeurs du chart, sans garder un ancien --set.

#### Exo6 : 
- Readiness probe httpGet /healthz (renvoie 500 quand Redis est injoignable): le pod est retiré des endpoints du Service tant qu’il n’est pas prêt
- Liveness probe tcpSocket sur le port 3000, indépendante de Redis : les pods ne redémarrent pas en boucle quand Redis tombe
- Observé avec scale deploy/redis --replicas=0 : pods 0/1, RESTARTS 0, événements Readiness probe failed (500 et context deadline exceeded), endpoints vides, Connection refused depuis un pod client. Après --replicas=1 : pods 1/1 et trafic rétabli sans intervention

### Ce que j'ai appris
#### Exo1 : 
Output : 
TP3 git:(main) ✗ kubectl create namespace guestbook
namespace/guestbook created
➜  TP3 git:(main) ✗ kubectl create namespace data     
namespace/data created
➜  TP3 git:(main) ✗ kubens guestbook
✔ Active namespace is "guestbook"
➜  TP3 git:(main) ✗ kubectl get pods
No resources found in guestbook namespace.

Déploiement du pod
Guestbook_Kubernetes git:(main) ✗ kubectl apply -f pod.yaml
pod/guestbook-pod created

#### Exo3 : 
kubectl apply -f service.yaml
service/my-service configured
➜  Guestbook_Kubernetes git:(main) ✗ kubectl get service my-service                   
NAME         TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)    AGE
my-service   ClusterIP   10.98.136.248   <none>        3000/TCP   4m41s
➜  Guestbook_Kubernetes git:(main) ✗ kubectl port-forward service/my-service 3000:3000
Forwarding from 127.0.0.1:3000 -> 3000
Forwarding from [::1]:3000 -> 3000
Handling connection for 3000

#### Exo4 :
- un chart sépare la structure (templates) des paramètres (values.yaml)
- helm template et helm lint permettent de vérifier avant de déployer
- Helm ne reprend pas les ressources qu’il n’a pas créées
- helm upgrade crée une nouvelle révision

#### Exo5 : 
- Une ConfigMap sépare la configuration du code, mais ne redémarre pas les pods toute seule
- Un Service est joignable par <service>.<namespace>.svc.cluster.local
- Le système de fichiers d’un conteneur est éphémère. Un PVC rend les données persistantes
- kubectl logs, /env et /healthz sont les premiers outils de diagnostic.

#### Exo6 : 
- /healthz ne doit pas servir de liveness, sinon une panne de Redis redémarrerait tous les pods
- kubectl port-forward service/... choisit un pod directement et ignore les endpoints : pour tester le vrai chemin, il faut passer par le Service depuis le cluster
- kubectl get events et describe expliquent les décisions de Kubernetes