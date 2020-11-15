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
	socket.emit('name',prompt("Enter your name"));
	grid = new Grid(25,25,25);
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

Touch.init(dat=>{
	if(!playing) return;
	if(dat.type == 'single'){
		if(Math.abs(dat.dx) < 10 && Math.abs(dat.dy) < 10){
			// Clicked
			if(dat.target == canvas){
				let t = grid.getTile(dat.x,dat.y);
				if(t) swapFocus(t);
			} else if(dat.target == tcanvas){
				let t = tiles.getTile(dat.x,dat.y);
				if(t) swapFocus(t);
				else {
					trade.click(dat.x,dat.y);
				}
			}
		} else {
			// Scroll
			if(dat.target == canvas){
				grid.offsetX += dat.dx;
				grid.offsetY += dat.dy;
			} else if(dat.target == tcanvas){
				tiles.offsetX += dat.dx;
				trade.x += dat.dx;
			}
		}
	} else if (dat.type == 'double'){
		// Zoom
		if(Math.abs(dat.touch1.y) < Math.abs(dat.touch2.y)){
			grid.scale = grid.scale - dat.touch1.dy / grid.scale * 3;
		} else {
			grid.scale = grid.scale - dat.touch2.dy / grid.scale * 3;
		}
	}
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

document.on('dblclick',e=>{
	grid.scale = 25;
	resize();
});