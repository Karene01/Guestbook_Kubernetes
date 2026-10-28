# Apprentissages

## Titre d'exo
#### Exo1 Explorer minikube et les bases de Kubernetes
Découvertes des commandes et création de namespaces

### Problème rencontré et pourquoi il est survenu

### Solution appliquée et pourquoi cette solution fonctionne

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

