let http = require('http');
let url = require('url');
let fs = require('fs');
let api = require("./api");


let extensions = {
    '.html':'text/html',
    '.jpeg':'image/jpeg',
    '.jpg':'image/jpeg',
    '.css':'text/css',
    '.js':'text/javascript',
    '.png':'image/png',
    '.svg':'image/svg+xml; charset=utf-8',
};

http.createServer((req,res)=>{

    let parsedUrl = url.parse(req.url, true);
    let q = parsedUrl.query;
    let path = parsedUrl.pathname; 

    if (req.url == '/favicon.ico') {
        // return empty (no icon) instead of 400
        res.writeHead(204); // No Content
        res.end();
        return;
    }


    if(path.startsWith("/api/")){
        path = path.substring(5);
        if(!api.hasOwnProperty(path)){
            res.writeHead(404);
            res.end();
            return;
        }
        api[path](req,res,q);
    }else{
        if(path == '/') path = '/index.html';
        let indexOfDot = path.lastIndexOf('.');
        if (indexOfDot == -1){
            res.writeHead(400);
            res.end();
            return;
        }
        let extention = path.substring(indexOfDot);
        if (!extensions.hasOwnProperty(extention)){
            res.writeHead(400);
            res.end();
            return;
        }        
        fs.readFile('files' + path,(err,data)=>{
            if(err){
                res.writeHead(404);
                res.end();
                return;
            }
            res.writeHead(200,{'Content-Type':extensions[extention]});
            res.end(data);
        });
    }
}).listen(3000, ()=>{console.log("Server listening on port 3000...");});