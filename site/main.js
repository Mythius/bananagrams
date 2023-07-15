const socket = io();
const canvas = obj('canvas');
const ctx = canvas.getContext('2d');
const tcanvas = obj('#tiles');
const tctx = tcanvas.getContext('2d');

var grid;
var tiles;

var letters = [];
window.onresize = resize;

class Button{
	constructor(x,y,text,callback){
		this.text = text;
		this.callback = callback;
		this.x = x;
		this.y = y;
		this.width = 80;
		this.height = 40;
	}
	draw(ctx,font_size = 30){
		ctx.font = `${font_size}px monospace`;
		this.width = this.text.length * font_size * .7;
		this.height = font_size + 10;
		ctx.fillStyle = '#222';
		ctx.strokeStyle = 'white';
		ctx.beginPath();
		ctx.rect(this.x,this.y,this.width,this.height);
		ctx.fill();
		ctx.stroke();
		ctx.fillStyle = "white";
		ctx.fillText(this.text,this.x+this.width*.1,this.y + this.height*.75);
	}
	click(x,y){
		if(x > this.x && x < this.x + this.width){
			if(y > this.y && y < this.y + this.height){
				this.callback();
			}
		}
	}
}

var trade;
var playing = false;

function setup(){
	socket.emit('bananagrams-connect');
	socket.emit('name',prompt("Enter your name"));
	grid = new Grid(50,50,25);
	tiles = new Grid(9,3,30);
	resize();
	// mouse.start(canvas);
	trade = new Button(tiles.width*tiles.scale+tiles.offsetX + 10,(tiles.height-2)*tiles.scale,' ↻ ',e=>{
		if(fc instanceof Tile && fc.letter !== ""){
			socket.emit('trade',fc.letter);
			fc.letter = "";
		}
	});
	tiles.forEach(tile=>{
		tile.color = '#222';
	});
	loop();
}

var things_to_draw = [];

function loop(){
	setTimeout(loop,1000/30);
	ctx.clearRect(-2,-2,canvas.width+2,canvas.height+2);
	tctx.clearRect(-2,-2,tcanvas.width+2,tcanvas.height+2);
	grid.draw(ctx);
	tiles.draw(tctx);
	trade.draw(tctx);
}

function resize(){
	// if(playing){
		canvas.width = window.innerWidth;
		canvas.height = window.innerHeight;
		tcanvas.width = window.innerWidth;
		tcanvas.height = 100;
		grid.offsetX = canvas.width/2 - grid.width*grid.scale/2;
		tiles.offsetX = tcanvas.width/2 - tiles.scale*tiles.width/2 - 40;
		tiles.offsetY = tcanvas.height - tiles.height*(tiles.scale+1);
		if(trade) trade.x = tiles.width*tiles.scale+tiles.offsetX + 10;
		if(trade) trade.y = (tiles.height-2)*tiles.scale;
	// }
}

function peel(){
	var all_letters = [];
	var first_tile;
	grid.forEach(tile=>{
		tile.connected = false;
		if(tile.letter !== ""){
			if(!first_tile) first_tile = tile;
			all_letters.push(tile.letter);
		}
	});
	all_letters;
	function checkTile(x,y){ // Recursive Connected Algorithm
		var tile = grid.getTileAt(x,y);
		if(!tile || tile.connected) return;
		if(tile.letter !== ""){
			all_letters.splice(all_letters.indexOf(tile.letter),1);
			tile.connected = true;
			tile.color = '#222';
			checkTile(x+1,y);
			checkTile(x-1,y);
			checkTile(x,y+1);
			checkTile(x,y-1);
		}
	}
	checkTile(first_tile.x,first_tile.y);
	var connected = all_letters.length == 0;

	var empty = true;
	tiles.forEach(tile=>{
		empty &= tile.letter == "";
	});

	var valid = colorizeBoard();

	if(connected && empty && valid){
		socket.emit('peel');
	}
}

socket.on('winner',name=>{
	alert(name+' wins!');
	playing = false;
});

socket.on('tiles',ts=>{
	obj('#menu').remove();
	playing = true;
	letters = ts;
	let counter = 0;
	tiles.forEach(tile=>{
		if(counter >= ts.length){
			tile.letter = "";
		} else {
			tile.letter = ts[counter++];
		}
	});
	grid.forEach(tile=>{
		tile.letter = "";
	});
});

socket.on('addtiles',ts=>{
	let counter = 0;
	tiles.forEach(tile=>{
		if(tile.letter == ""){
			if(ts[counter] == undefined) return true;
			tile.letter = ts[counter++];
			if(counter == ts.length) return true;
		}
	});
});

var fc;

function swapFocus(tile){
	var bgc = tile.grid == tiles ? '#222' : '#222';
	if(fc){
		if(tile.letter === ""){
			tile.letter = fc.letter; // Moved
			fc.letter = "";
			fc.color = bgc;
			fc = undefined;
			if(colorizeBoard()){
				peel();
			}
		} else {
			fc.color = bgc; // Swap
			tile.color = 'green';
			fc = undefined;
			fc = tile;
		}
	} else {
		if(tile && tile.letter !== ""){
			fc = tile; // Select
			fc.color = 'green';
		}
	}
}

function click(dat){ // x,y,target
	if(dat.target == canvas){
		let t = grid.getTile(dat.x,dat.y);
		if(t) swapFocus(t);
	} else if(dat.target == tcanvas){
		let t = tiles.getTile(dat.x,dat.y);
		if(t){
			swapFocus(t);
		} else {
			trade.click(dat.x,dat.y);
		}
	}
}

function scroll(dat){ // dx,dy,target
	if(dat.target == canvas){
		grid.offsetX += dat.dx;
		grid.offsetY += dat.dy;
	} else if(dat.target == tcanvas){
		tiles.offsetX += dat.dx;
		trade.x += dat.dx;
	}
}

function zoom(dat){ // ct.x,ct.y,scale
	let dt = {x:dat.ct.x-grid.offsetX,y:dat.ct.y-grid.offsetY};
	dat.scale = Math.min(Math.max(10, grid.scale*dat.scale), 150)/grid.scale;
	dt.x *= dat.scale;
	dt.y *= dat.scale;
	grid.offsetX = dat.ct.x - dt.x;
	grid.offsetY = dat.ct.y - dt.y;
	grid.scale *= dat.scale;
}

Touch.init(dat=>{
	touchscreen = true;
	// if(!playing) return;
	if(dat.type == 'click'){
		click(dat);
	} else if(dat.type == 'scroll') {
		scroll(dat);
	} else if (dat.type == 'zoom'){
		zoom(dat);
	}
});


var mouse = {ox:-1,oy:-1,down:false,action:null,target:null}
document.on('mousedown',e=>{
	if(touchscreen) return;
	mouse.down = true;
	mouse.target = e.target;
	mouse.ox=e.clientX;
	mouse.oy=e.clientY;
});

document.on('mousemove',e=>{
	if(touchscreen) return;
	if(mouse.down){
		scroll({
			dx:e.movementX,
			dy:e.movementY,
			target:mouse.target
		});
		mouse.action='scroll';
	}
});

document.on('mouseup',e=>{
	if(touchscreen) return;
	mouse.down = false;
	let dx=e.clientX-mouse.ox,dy=e.clientY-mouse.oy;
	if(Math.sqrt(dx**2+dy**2)<10){
		let br = mouse.target.getBoundingClientRect();
		let dat = {
			x:e.clientX - br.x,
			y:e.clientY - br.y,
			target:mouse.target
		};
		click(dat);
	}
	mouse.action=null;
	mouse.target=null;
});

document.on('wheel',e=>{
	zoom({
		ct:{x:e.x,y:e.y},
		scale:1+(e.deltaY/-600)
	});
});

Grid.prototype.getTile = function(x,y){
	let result;
	this.forEach(tile=>{
		if(tile.hasPoint(x,y)){
			result = tile;
			return true;
		}
	});
	return result;
}

Tile.prototype.draw = function(ctx){
	let c = this.getCenter();
	this.draw_box(ctx);
	ctx.fillStyle = 'white';
	ctx.font = `${this.grid.scale}px monospace`;
	ctx.fillText(this.letter,c.x-this.grid.scale/4,c.y+this.grid.scale*.3);
}

Tile.prototype.letter = "";
Tile.prototype.connected = false;

Grid.prototype.draw = function(ctx){
	this.forEach(tile=>{
		tile.draw(ctx);
	});
}

setup();

var words;

xml('words.txt',w=>{
	words = w.split('\n').map(e=>e.trim());
});

var touchscreen = false;

function reverseColor(x,y,dx,dy,v){
	let curtile = grid.getTileAt(x,y);
	while(curtile.letter != ""){
		if(v && curtile.color != 'red'){
			curtile.color = 'blue';
		} else if(!v){
			curtile.color = 'red';
		}
		x += dx;
		y += dy;
		curtile = grid.getTileAt(x,y);
		if(!curtile) break;
	}
}

function colorizeBoard(){
	grid.forEach(tile=>{
		tile.color = '#222';
	});
	var word = "";
	var board_is_valid = true;
	for(let y=0;y<grid.height;y++){ // Check Horizontal
		for(let x=0;x<grid.width;x++){
			let t = grid.getTileAt(x,y);
			if(t.letter === "" && word.length > 1){
				var valid = checkWord(word);
				board_is_valid &= valid;
				reverseColor(x-1,y,-1,0,valid);
				word = "";
			} else if(t.letter !== ""){
				word += t.letter;
			} else word = "";
		}
		if(word.length > 1){
			var valid = checkWord(word);
			board_is_valid &= valid;
			reverseColor(grid.width-1,y,-1,0,valid);
			word = "";
		} else word = "";
	}
	for(let x=0;x<grid.width;x++){ // Check Vertical
		for(let y=0;y<grid.height;y++){
			let t = grid.getTileAt(x,y);
			if(t.letter === "" && word.length>1){
				var valid = checkWord(word);
				board_is_valid &= valid;
				reverseColor(x,y-1,0,-1,valid);
				word = "";
			} else if(t.letter !== ""){
				word += t.letter;
			} else word = "";
		}
		if(word.length > 1){
			var valid = checkWord(word);
			board_is_valid &= valid;
			reverseColor(x,grid.height-1,0,-1,valid);
			word = "";
		} else word = "";
	}
	return board_is_valid;
}

function checkWord(word){
	if(typeof words == 'object'){
		return words.includes(word.toUpperCase());
	} else console.warn('Words Not Loaded!');
	return false;
}

// document.on('dblclick',e=>{
// 	grid.scale = 25;
// 	resize();
// });