function addPlayer(c){
	let socket = c.socket;
	if(!playing) lobby.push(c);
	socket.on('name',name=>{
		if(!host){
			host = c;
			socket.emit('host');
		}
		c.name = name;
		if(playing){
			if(tiles.length > 20){
				c.emit('tiles',tiles.splice(-15));
				peopleInGame.push(c);
				for(let p of peopleInGame){
					p.emit('message',`${c.name} joined. Tiles remaining: ${tiles.length}`);
				}
			} else {
				c.emit('message','Can\'t Join this game');
			}
		} else {
			for(let p of lobby){
				p.emit('joined',lobby.map(e=>e.name));
			}
		}
	});
	socket.on('trade',tile=>{
		if(tiles.length == 0){
			socket.emit('addtiles',[tile]);
		}
		tiles.sort(()=>Math.random()-.5);
		socket.emit('addtiles',tiles.splice(-(Math.min(tiles.length,3))));
		tiles.push(tile);
		for(let player of peopleInGame){
			player.emit('message',`${c.name} traded. ${tiles.length} tiles remaining`);
		}
	});
	socket.on('peel',e=>{
		peel(c);
	});
	socket.on('start',e=>{
		beginGame();
	});
}


var peopleInGame=[];
var host=null;
var playing=false;
var lobby = [];

function beginGame(){
	// obj('p').innerHTML = '';
	if(playing) return;
	playing = true;
	peopleInGame = [...lobby];
	lobby = [];
	generateTiles();
	tiles.sort((a,b)=>Math.random()-.5);
	tiles.sort((a,b)=>Math.random()-.5);
	tiles.sort((a,b)=>Math.random()-.5);
	for(let p of peopleInGame){
		p.tiles = tiles.splice(-15);
	}
	for(let p of peopleInGame){
		p.emit('setup');
		p.emit('tiles',p.tiles);
	}
	for(let p of peopleInGame){
		p.emit('message',`Game Started: ${tiles.length} remaining!`);
	}
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
	if(countTiles(user.name)) return;
	for(let person of peopleInGame){
		person.emit('addtiles',tiles.splice(-1));
	}
	for(let person of peopleInGame){
		person.emit('message',`${user.name} peels. ${tiles.length} tiles remaining`);
	}
}

function countTiles(user){
	if(tiles.length < peopleInGame.length){
		console.log(`Game Over! Winner is ${user}`)
		for(let person of peopleInGame){
			person.emit('message',user+' won! Good Game. Reload Page to play again')
			person.emit('winner',user);
		}
		lobby = [...peopleInGame];
		host = null;
		peopleInGame = [];
		playing = false;
		return true;
	} else return false;
}

function disconnect(client){
	if(host==client) host=null;
	if(playing){
		let ix = peopleInGame.indexOf(client);
		if(ix!=-1){
			peopleInGame.splice(ix,1);
		}
		if(peopleInGame.length==0){
			playing=false;
			lobby = [];
			console.log('Nobody Connected, Resetting Game');
		} else {
			for(let p of peopleInGame){
				p.emit('message',client.name+' disconnected');
			}
		}
	} else {
		let lx = lobby.indexOf(client);
		if(lx!=-1){
			lobby.splice(lx,1);
		}
	}
}

exports.addPlayer = addPlayer;
exports.disconnect = disconnect;