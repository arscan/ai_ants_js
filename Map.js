
var Ant = require('./Ant').Ant;


/*
var antID = 0;

function Ant(row,col){
	this.row = row;
	this.col = col;
	this.antID = antID++;
}

Ant.prototype.toString = function(){
	return '' + antID;
}
*/

exports.antMap = {
	'map': [],
	'orders': [],
	'ants': [],
	'myAnts': {},
	'myAntAtTile' : {},
	'food': [],
	'tiles': {},
	'vision': false,
	'visionOffsets': false,
	'game':null,
	'landTypes': {
		'LAND': 0,
		'DEAD': 1,
		'ANT': 2,
		'WATER': 3,
		'FOOD': 4
	},
	'createAnt' : function(row,col){
		var newAnt = new Ant(row,col);
		this.myAnts[newAnt] = newAnt;
		this.myAntAtTile[row + '-' + col] = newAnt;
	},
	'killAnt' : function(ant){
		this.myAntAtTile[ant.row + '-' + ant.col] = null;
		this.myAnts[ant] = null;
	},
	'antAtTile' : function(row,col){
		return this.myAntAtTile[row + '-' + col];
	},
	
	'moveAnt' : function(ant,direction){
		//this.game.log("moving ant " + ant + " to " + direction);
		var t = this.tileInDirection(ant.row, ant.col, direction);
		//this.game.viz_setLineColor(0,0,0,1.0);
		//this.game.viz_arrow({"col":ant.col,"row":ant.row},t);
		//this.game.log("found the tile I am going to move at " + t.row + "-" + t.col + " which is " + t.type);
		this.myAntAtTile[ant.row + '-' + ant.col] = null;
		ant.row = t.row;
		ant.col = t.col;
		this.myAntAtTile[ant.row + '-' + ant.col] = ant;		
		
	},
	
	'tileInDirection': function(row, col, direction) {
		var rowd = 0;
		var cold = 0;
		if (direction === 'N') {
			rowd = -1;
		} else if (direction === 'E') {
			cold = 1;
		} else if (direction === 'S') {
			rowd = 1;
		} else if (direction === 'W') {
			cold = -1;
		}
		var newrow = row + rowd;
		var newcol = col + cold;
		if (newrow < 0) {
			newrow = this.game.config.rows-1;
		} else if (newrow > this.game.config.rows-1) {
			newrow = 0;
		}
		if (newcol < 0) {
			newcol = this.game.config.cols-1;
		} else if (newcol > this.game.config.cols-1) {
			newcol = 0;
		}
		return this.tiles[newrow + '-' + newcol];
	},

}