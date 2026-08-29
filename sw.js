/* RDS Rally Memory Test - Service Worker
   Estrategia: NETWORK-FIRST para TODO lo del mismo origen (HTML, CSS, JS e imagenes).
   - Con internet: siempre se descarga la version mas reciente y se refresca la copia
     en cache. Cualquier cambio que subas (index.html, logo.webp, banner.webp, iconos...)
     se ve la proxima vez que abras la app, SIN borrar nada ni subir el numero de version.
   - Sin internet: se sirve la ultima copia cacheada (la app sigue funcionando offline).
   - Firebase / gstatic / dominios externos: NO se interceptan (los gestiona el index.html
     con Firestore + localStorage).

   Nota: la limpieza de cache solo borra las cache con prefijo 'rallymemory-' para no
   afectar a otras apps RDS publicadas en el mismo dominio (rdsk27.github.io). */

var CACHE = 'rallymemory-v9';

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
  self.skipWaiting();                          /* activa la version nueva sin esperar */
  event.waitUntil(
    caches.open(CACHE).then(function(c){
      return Promise.all(SHELL.map(function(u){
        return c.add(u).catch(function(){});   /* precache tolerante (offline base) */
      }));
    })
  );
});

self.addEventListener('activate', function(event){
  event.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.map(function(k){
        /* borra cache vieja de ESTA app (deja intactas las de otras apps RDS) */
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

  /* NETWORK-FIRST para todo el mismo origen: lo ultimo cuando hay red, cache si no hay */
  event.respondWith(
    fetch(req).then(function(res){
      if(res && res.status === 200 && (res.type === 'basic' || res.type === 'default')){
        var copy = res.clone();
        caches.open(CACHE).then(function(c){ c.put(req, copy).catch(function(){}); });
      }
      return res;
    }).catch(function(){
      return caches.match(req).then(function(m){
        if(m) return m;
        if(req.mode === 'navigate'){ return caches.match('index.html').then(function(x){ return x || caches.match('./'); }); }
        return Response.error();
      });
    })
  );
});

self.addEventListener('message', function(event){
  if(event.data && event.data.action === 'skipWaiting'){ self.skipWaiting(); }
});
