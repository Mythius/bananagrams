var express = require('express');
var app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
var bananagrams = require('./bananagrams.js');

class client{
	static all = [];
	constructor(socket){
		this.socket = socket;
		this.name = null;
		this.tiles = [];
		client.all.push(this);
		socket.on('disconnect',e=>{
			let index = client.all.indexOf(this);
			bananagrams.disconnect(this);
			if(index != -1){
				client.all.splice(index,1);
			}
		});
	}
	emit(name,dat){
		this.socket.emit(name,dat);
	}
}

const port = 80;
const path = __dirname+'/';

app.use(express.static(path+'site/'));
app.get(/.*/,function(request,response){
	response.sendFile(path+'site/');
});

http.listen(port,()=>{console.log('Serving Port: '+port)});

io.on('connection',socket=>{
	var c = new client(socket);
	socket.on('bananagrams-connect',e=>{
		bananagrams.addPlayer(c);
	})
});
