var express = require('express');
var app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
var fs = require('fs');
var system = require('child_process');
var IP = require('../getip.js').ip;

var file = {
	save: function(name,text){
		fs.writeFile(name,text,e=>{
			if(e) console.log(e);
		});
	},
	read: function(name,callback){
		fs.readFile(name,(error,buffer)=>{
			if (error) console.log(error);
			else callback(buffer.toString());
		});
	}
}

var peopleInGame;

function beginGame(){
	obj('p').innerHTML = '';
	peopleInGame = [...client.all];
	generateTiles();
	tiles.sort((a,b)=>Math.random()-.5);
	for(let p of peopleInGame){
		p.tiles = tiles.splice(-15);
	}
	for(let p of peopleInGame){
		p.emit('tiles',p.tiles);
	}
	log(`Game Started: ${tiles.length} remaining!`);
}

var tiles = [];

function generateTiles(){
	tiles = [];
	let t2 = ['J','K','Q','X','Z']; 
	let t3 = ['B','C','F','H','M','P','V','W','Y'];
	let t4 = ['G'];
	let t5 = ['L'];
	let t6 = ['D','S','U'];
	let t8 = ['N'];
	let t9 = ['T','R'];
	let t11 = ['O'];
	let t12 = ['I'];
	let t13 = ['A'];
	let t18 = ['E'];

	add(t2,2);
	add(t3,3);
	add(t4,4);
	add(t5,5);
	add(t6,6);
	add(t8,8);
	add(t9,9);
	add(t11,11);
	add(t12,12);
	add(t13,13);
	add(t18,18);

	function add(arr,amount_of_each){
		for(let e of arr){
			for(let i=0;i<amount_of_each;i++){
				tiles.push(e);
			}
		}
	}
}

function peel(user){
	tiles.sort(()=>Math.random()-.5);
	if(countTiles(user)) return;
	for(let person of peopleInGame){
		person.emit('addtiles',tiles.splice(-1));
	}
	log(`${user.name} Peels! ${tiles.length} remaining!`);
}

function countTiles(user){
	if(tiles.length < peopleInGame.length){
		log(`Game Over! Winner is ${user.name}`)
		for(let person of peopleInGame){
			person.emit('winner',user.name);
		}
		return true;
	} else return false;
}

class client{
	static all = [];
	constructor(socket){
		this.socket = socket;
		this.name = null;
		this.tiles = [];
		client.all.push(this);
		socket.on('disconnect',e=>{
			let index = client.all.indexOf(this);
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
const path = __dirname+'/../';

app.use(express.static(path+'site/'));
app.get(/.*/,function(request,response){
	response.sendFile(path+'site/');
});

http.listen(port,()=>{console.log('Serving Port: '+port)});

io.on('connection',socket=>{
	var c = new client(socket);
	socket.on('name',name=>{
		console.log(name+' joined!');
		c.name = name;
		var people_in = client.all.filter(e=>e.name!==null).length;
	});
	socket.on('trade',tile=>{
		if(tiles.length == 0){
			socket.emit('addtiles',[tile]);
		}
		tiles.sort(()=>Math.random()-.5);
		socket.emit('addtiles',tiles.splice(-(Math.min(tiles.length,3))));
		tiles.push(tile);
		log(`${c.name} traded! ${tiles.length} remaining.`);
	});
	socket.on('peel',e=>{
		peel(c);
	});
});
