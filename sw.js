/* RDS Rally Memory Test - Service Worker
   Prefijo de cache: rallymemory (coincide con localStorage rds_rallymemory_).
   Sube SOLO el numero de version (rallymemory-vN) en cada despliegue.

   Estrategia:
   - NAVEGACIONES / HTML  -> network-first: con red, la app instalada
     coge SIEMPRE el index.html mas reciente (y lo guarda en cache);
     sin red, usa la copia cacheada. Esto evita tener que borrar la
     cache de Safari para ver una version nueva.
   - Resto de assets del mismo origen -> cache-first.
   - Firebase/gstatic/externos -> NO se interceptan (los gestiona el
     index.html con la persistencia de Firestore + localStorage). */

var CACHE = 'rallymemory-v1';

var SHELL = [
  './',
  'index.html',
  'manifest.json',
  'apple-touch-icon.png',
  'icon-192.png',
  'icon-512.png',
  'assets/carbon.webp',
  'assets/mesh.webp',
  'assets/banner.webp',
  'assets/logo.webp'
];

self.addEventListener('install', function(event){
  self.skipWaiting();                         /* activa la version nueva sin esperar */
  event.waitUntil(
    caches.open(CACHE).then(function(c){
      return Promise.all(SHELL.map(function(u){
        return c.add(u).catch(function(){});  /* precache tolerante */
      }));
    })
  );
});

self.addEventListener('activate', function(event){
  event.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.map(function(k){
        if(k.indexOf('rallymemory-') === 0 && k !== CACHE){ return caches.delete(k); }
        return null;
      }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(event){
  var req = event.request;
  if(req.method !== 'GET') return;
  var url = new URL(req.url);
  if(url.origin !== self.location.origin) return;   /* no tocar Firebase/gstatic/externos */

  var accept = req.headers.get('accept') || '';
  var isHTML = req.mode === 'navigate' || accept.indexOf('text/html') !== -1;

  if(isHTML){
    /* network-first: lo ultimo cuando hay red; cache si no hay */
    event.respondWith(
      fetch(req).then(function(res){
        if(res && res.status === 200){
          var copy = res.clone();
          caches.open(CACHE).then(function(c){ c.put(req, copy); });
        }
        return res;
      }).catch(function(){
        return caches.match(req).then(function(m){
          return m || caches.match('index.html') || caches.match('./');
        });
      })
    );
    return;
  }

  /* resto: cache-first */
  event.respondWith(
    caches.match(req).then(function(cached){
      if(cached) return cached;
      return fetch(req).then(function(res){
        if(res && res.status === 200 && res.type === 'basic'){
          var copy = res.clone();
          caches.open(CACHE).then(function(c){ c.put(req, copy); });
        }
        return res;
      }).catch(function(){ return Response.error(); });
    })
  );
});

self.addEventListener('message', function(event){
  if(event.data && event.data.action === 'skipWaiting'){ self.skipWaiting(); }
});
