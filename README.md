# Apprentissages

## Titre d'exo
#### Exo1 : Explorer minikube et les bases de Kubernetes
Découvertes des commandes et création de namespaces

#### Exo2 : Déployer le guestbook (Pod)

#### Exo3 : Déployer le guestbook (Deployment + Service)

#### Exo4 : Déployer le guestbook (Helm Chart)


### Problème rencontré et pourquoi il est survenu
#### Exo2 : 
le statut du guestboook était resté à "unchanged" parce que j'étais dans le namespace par défaut 

#### Exo4 : 
- mauvais chemin du chart selon le dossier courant
- helm install refusé, car my-service avait été créé à la main (pas de label managed-by: Helm) et que les templates avaient encore des noms codés en dur


### Solution appliquée et pourquoi cette solution fonctionne
#### Exo2 : 
je me suis placée dans le guestbook et la commande apply a fonctionné

#### Exo4 : 
lancer la commande depuis le dossier parent, remplacer les noms par {{ .Release.Name }}, supprimer les ressources manuelles avant l’installation.

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