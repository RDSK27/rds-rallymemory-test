const http=require('http'), fs=require('fs'), path=require('path');
const root=__dirname, port=5189;
const types={'.html':'text/html','.js':'text/javascript','.png':'image/png','.json':'application/json','.jpg':'image/jpeg','.webp':'image/webp'};
http.createServer((req,res)=>{
  let p=decodeURIComponent(req.url.split('?')[0]); if(p==='/')p='/index.html';
  const fp=path.join(root,p);
  fs.readFile(fp,(e,d)=>{ if(e){res.statusCode=404;res.end('404');return;}
    res.setHeader('Content-Type', types[path.extname(fp)]||'application/octet-stream'); res.end(d); });
}).listen(port,()=>console.log('serving '+root+' on http://localhost:'+port));
