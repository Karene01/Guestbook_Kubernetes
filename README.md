# Apprentissages

## Titre d'exo
#### Exo1 : Explorer minikube et les bases de Kubernetes
Découvertes des commandes et création de namespaces

#### Exo2 : Déployer le guestbook (Pod)
Déployer l'image 'guestbook:v0.1.0' (port 3000) sur Kubernetes avec un Pod minimal, dans le namespace guestbook

#### Exo3 : Déployer le guestbook (Deployment + Service)
Remplacer le Pod isolé par un Deployment (2 replicas) et l'exposer avec un Service pour avoir un point d'entrée unique

#### Exo4 : Déployer le guestbook (Helm Chart)
Packager le Deployment et le Service dans un chart Helm paramétrable par 'values.yaml', puis l'installer et le mettre à jour avec Helm dans le namespace guestbook


#### Exo5 : Ajouter une base de données (Redis)
Déployer Redis dans le namespace data, y connecter le guestbook via une ConfigMap, et persister les données.

#### Exo6 : Rendre l'application robuste avec les probes
Permettre à Kubernetes de détecter qu’un pod est cassé ou pas prêt, et d’agir en conséquence.

#### Exo7 : Exposer le guestbook avec un Ingress
Rendre l’application accessible par un nom de domaine sans kubectl port-forward. 

#### Exo8 : Faire monter en charge automatiquement (HPA)
Ajuster automatiquement le nombre de pods du guestbook selon la charge CPU, et le vérifier avec un test de charge k6 lancé depuis le cluster

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

#### Exo8 : 
- kubectl top pods répondait Metrics API not available juste après l’activation du metrics-server : il doit démarrer et collecter une première série de mesures
- Le HPA affichait cpu: <unknown>/50% au début : pas encore de métriques pour les nouveaux pods, et le HPA exige des resources.requests.cpu pour calculer un pourcentage
- Mes modifications du chart n’étaient pas appliquées au premier essai (helm template ne montrait ni resources ni HPA): les fichiers n’avaient pas été modifiés
- kubectl create configmap ... --from-file=load-test.js échouait : le fichier n’existait pas dans le dossier courant.

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

#### Exo8 : 
- minikube addons enable metrics-server, puis attente de AVAILABLE True sur l’APIService
- requests (50m CPU, 32Mi) et limits dans values.yaml, et retrait de replicas du Deployment quand autoscaling.enabled : sinon chaque helm upgrade écraserait le nombre de replicas choisi par le HPA
- HPA autoscaling/v2 (min 2, max 6, cible 50 % de CPU), templaté dans le chart.
- Script k6 en ramping-arrival-rate (200 requêtes/s), monté depuis une ConfigMap et lancé par un Job qui joint le Service guestbook:3000. La charge passe par le Service et se répartit sur tous les pods, ce qu’un port-forward ne ferait pas
 
 Résutltat : 
 2 -> 3 -> 6 pods environ 1 à 2 minutes après le début de la charge, retour à 2 pods environ 6 minutes après la fin (stabilisation de 5 minutes avant la réduction).
k6 : 96 418 requêtes, 0 % d’erreurs, p(95) = 1,03 ms. Les deux thresholds sont respectés, 90 itérations abandonnées (dropped_iterations) au démarrage.

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

#### Exo6 : 
- Un Ingress est seulement une règle de routage, c’est le controller qui l’applique.
- Chemin d’une requête : navigateur -> résolution du nom (/etc/hosts -> 127.0.0.1) -> tunnel -> Ingress controller (choisit la règle selon le host et le chemin) -> Service guestbook (ClusterIP, via ses endpoints) -> un des pods Ready
- ingressClassName indique quel controller doit traiter la règle.
- Les conditions Helm (if) permettent d’activer ou désactiver une ressource depuis values.yaml

#### Exo8 : 
- Le HPA calcule l’utilisation en pourcentage des requests, pas des limits : sans requests, pas d’autoscaling.
- Il met du temps à réagir (période de mesure, démarrage des pods) et plus encore à réduire (fenêtre de stabilisation)
