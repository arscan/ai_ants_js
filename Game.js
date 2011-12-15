var fs = require('fs');
var Ant = require('./Ant').Ant;
var util = require('util');
var path = require('path');

exports.game = {
	'bot': null,
	'currentTurn': -1,
	'config': {},
	'map': [],
	'orders': [],
	'myAntAtTile' : {},
	'enemyAntAtTile' : {},
	'myAnts': {},
	'enemyAnts':[],
	'food': [],
	'vision': false,
	'visionOffsets': false,
	'tiles':{},
	'enemyHills':{},
	'myHills':{},
	'allAnts':[],
	'offsets':{},
	'landTypes': {
		'LAND': 0,
		'DEAD': 1,
		'ANT': 2,
		'WATER': 3,
		'FOOD': 4,
		'UNKNOWN': 5
	},
	'inputHills':{},
	'debug': true,
	'viz_on':false,
	'turnStart': null,
	'logFile': null,
	'start': function(botInput) {
		if(this.debug){
			var logdir = '../ants_js_tools/game_logs/replay.0.txt';
			if(path.existsSync(logdir)){
				fs.unlinkSync(logdir);
			}
			this.logFile = fs.createWriteStream('../ants_js_tools/game_logs/replay.0.txt', {'flags': 'a'});
		}
		this.log("Writing Output");
		this.bot = botInput;
		var partialline = "";
		process.stdin.resume();
		process.stdin.setEncoding('utf8');
		var thisoutside = this;
		process.stdin.on('data', function(chunk) {
			var lines = chunk.split("\n");
			lines[0] = partialline + lines[0];
			partialline = "";
			// Complete lines will leave an empty
			// string at the end, if that is not the case
			// buffer this line until the next chunk
			if (lines[lines.length - 1] !== "") {
				partialline = lines[lines.length - 1];
				lines.splice(lines.length - 1, 1);
			}
			for (var i = 0, len = lines.length; i < len; ++i) {
				thisoutside.processLine(lines[i]);
			}
		});
		
	},
	'processLine': function(line) {
		this.vision = false;
		line = line.trim().split(' ');

		if (line[0] === 'ready') {
			for (var row = 0; row < this.config.rows; ++row) {
				for (var col = 0; col < this.config.cols; ++col) {
					if (col === 0) {
						this.map[row] = [];
					}
					this.map[row][col] = {'row': row, 'col':col,'type': this.landTypes.UNKNOWN, 'lastseen':5, 'lastreachable':5, 'reached': false};
					//this.tiles[row + '-' + col] = {'row': row, 'col':col, 'type': this.landTypes.UNKNOWN, 'lastseen':5};
				}
			}
			this.bot.onReady();
			return;
		} else if(line[0] === 'go') {
		
		
			this.enemyAntID = 0;
			this.calculateVisibility();
			
			for(var r = 0; r< this.config.rows;r++){
				for(var c = 0; c<this.config.cols;c++){
					if(this.visible(r,c)){
						if(this.map[r][c].type == this.landTypes.UNKNOWN){
							this.map[r][c].type = this.landTypes.LAND;
						}
					}
				}
			}
			
			// REMOVE ANY ENEMY HILLS THAT I DESTROYED
			for(var hI in this.enemyHills){
				var h = this.enemyHills[hI];
				if(!this.inputHills[h.row + "-" + h.col] && this.visible(h.row,h.col)){
					this.log("no more enemy hill at " + h.row + "-" + h.col);
					delete this.enemyHills[hI];
				}
				
			}
			
			for(var hI in this.myHills){
				var h = this.myHills[hI];
				if(!this.inputHills[h.row + "-" + h.col] && this.visible(h.row,h.col)){
					this.log("no more MY hill at " + h.row + "-" + h.col);
					delete this.myHills[hI];
				}
				
			}
			/*
			for(var c=0;c<this.config.cols;c++){
				for(var r=0;r<this.config.rows;r++){
					if(this.map[r][c].type == this.landTypes.UNKNOWN){
						this.viz_setFillColor(255,0,0,.7);
					} else if(this.map[r][c].type == this.landTypes.WATER){
						this.viz_setFillColor(0,255,0,.7);
					} else if(this.map[r][c].type == this.landTypes.LAND){
						this.viz_setFillColor(0,0,255,.7);
					}
					this.viz_tile({"row":r,"col":c},0);
				}
			}
			*/
			for(var eI in this.myAnts){
				this.allAnts.push(this.myAnts[eI]);
			}
			
			//try{
			this.bot.onTurn();
			//} catch (e) {
			//	this.log("couldn't do turn!");
			//}
			return;
			
		} else if(line[0] === 'end') {
			this.bot.onEnd();
			return;
		}
		if (line[0] === 'turn') {
			this.currentTurn = parseInt(line[1]);
			this.turnStart = Date.now();
			this.log("************* TURN " + this.currentTurn + " *******************");
			if (this.currentTurn > 0) {
				//Reset map except for water:
				for (var row = 0, rlen = this.map.length; row < rlen; ++row) {
					for (var col = 0, clen = this.map[row].length; col < clen; ++col) {
						if (this.map[row][col].type !== this.landTypes.WATER && this.map[row][col].type !== this.landTypes.UNKNOWN) {
							this.map[row][col].type = this.landTypes.LAND; //{'row': row, 'col':col, 'type': this.landTypes.LAND};
							this.map[row][col].lastseen += 1;
							this.map[row][col].lastreachable += 1;
							//this.tiles[row + '-' + col].type = this.landTypes.LAND;
						}
					}
				}
				this.inputHills = {};
				this.allAnts = [];
				this.food = [];
				this.dead = [];
				this.enemyAnts = [];
				this.enemyAntAtTile = {};
				this.queuedMoves = {};
			}
		} else {
			if (this.currentTurn === 0 && line[0] !== 'ready') {
				this.config[line[0]] = parseInt(line[1]);
			} else {
				var row = parseInt(line[1]);
				var col = parseInt(line[2]);
				var obj = { 'row': row, 'col': col };
				if (line[0] === 'w') {
					this.map[row][col].type = this.landTypes.WATER;
					//antMap.tiles[row + '-' + col] = {'type': this.landTypes.WATER,  'col':col, 'row':row, 'data': {}};
				} else if (line[0] === 'f') {
					this.map[row][col].type = this.landTypes.FOOD;
					//antMap.tiles[row + '-' + col] = {'type': this.landTypes.FOOD,  'col':col, 'row':row, 'data': {}};
					this.food.push(obj);
				} else {
					var owner = parseInt(line[3]);
					obj['owner'] = owner;
					if (line[0] === 'a') {
						var na = null;			
						if(owner !== 0 ){
							na = new Ant(row,col,owner,"e" + this.enemyAnts.length);//{"row":row,"col":col, "owner":owner, "antID": "e", "toString":function(){return "blah"}});
							this.enemyAnts.push(na);
							this.allAnts.push(na);
							this.enemyAntAtTile[row + "-" + col] = na;
						} else {
							if(!this.antAtTile(row,col)){
								na = this.createAnt(row,col);
							}
							
						}
						if(na){
							//this.log("created ant " + na + " at " + row + "-" + col);						
						}
					} else if (line[0] === 'd') {
						
						if(owner === 0){
							this.killAnt(this.antAtTile(row,col));
							this.log("killing my ant at " + row + " " + col);
						
						} else {
							this.map[row][col].type = this.landTypes.LAND;
						}
						this.dead.push(obj)
					} else  if (line[0] === 'h') {
						this.inputHills[obj.row + "-" + obj.col] = obj;
						if(obj.owner > 0){
							this.log("found a hill at " + util.inspect(obj));
							this.enemyHills[obj.row + "-" + obj.col] = obj;
						} else {
							this.myHills[obj.row + "-" + obj.col] = obj;
							this.log("found my hill at " + util.inspect(obj));
						}
						
					}
				}
			}
		}
	},
	'issueOrder': function(row, col, direction, depth) {
		var next = this.tileInDirection(row,col,direction);
		
		if(direction === "A"){
			return;
		}
		
		if(!depth)
			depth = 0;
		
		var qm = this.queuedMoves[this.antAtTile(row,col)];
		
		
		if(this.antAtTile(next.row,next.col)){
			this.log("somebody already at " + next.row + "-" + next.col + " so saving it for later");
			
			this.queuedMoves[this.antAtTile(next.row,next.col)] = {"row":row, "col":col, "direction":direction};
		} else if(this.unoccupied(next.row,next.col)){
			this.orders.push({
				'row': parseInt(row),
				'col': parseInt(col),
				'direction': direction
			});
			this.moveAnt(this.antAtTile(row,col),direction);
		//}
		}
		if(qm && depth < 2){
			this.issueOrder(qm.row, qm.col, qm.direction, depth+1);
			this.log("issued order on for " + qm.row + "-" + qm.col + " in dir " + qm.direction);
		}
		
	},
	'finishTurn': function() {
		
		for (var i = 0, len = this.orders.length; i < len; ++i) {
			var order = this.orders[i];
			fs.writeSync(process.stdout.fd, 'o '+order.row+' '+order.col+' '+order.direction+'\n');
		}
		this.orders = [];
		fs.writeSync(process.stdout.fd,'go\n');
		process.stdout.flush();
	},
	
	'log': function(out){
		if(this.debug){
			this.logFile.write("[" + this.timeLeft() + "] " + out + "\r\n");	
		}
	},
	
	/* PUT ALL THESE IN MAP */
	
	// PUT IN MAP
	'tileInDirection': function(row, col, direction) {
		var rowd = 0;
		var cold = 0;
		if (direction === 'A'){
			return this.map[row][col];
		}
		
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
			newrow = this.config.rows-1;
		} else if (newrow > this.config.rows-1) {
			newrow = 0;
		}
		if (newcol < 0) {
			newcol = this.config.cols-1;
		} else if (newcol > this.config.cols-1) {
			newcol = 0;
		}
		return this.map[newrow][newcol];
	},
	// PUT IN MAP
	/*
	'myHills': function() {
		var result = [];
		for (var i = 0, len = this.hills.length; i < len; ++i) {
			var hill = this.hills[i];
			if (hill.owner === 0) {
				result.push(hill);
			}
		}
		return result;
	},*/
	// PUT IN MAP
	'enemyHills': function() {
		var result = [];
		for (var i = 0, len = this.hills.length; i < len; ++i) {
			var hill = this.hills[i];
			if (hill.owner !== 0) {
				result.push(hill);
			}
		}
		return result;
	},
	// PUT IN MAP
	/*
	'myAnts': function() {
		var result = [];
		for (var i = 0, len = this.ants.length; i < len; ++i) {
			var ant = this.ants[i];
			if (ant.owner === 0) {
				result.push(ant);
			}
		}
		return result;
	},
	// PUT IN MAP
	'enemyAnts': function() {
		var result = [];
		for (var i = 0, len = this.ants.length; i < len; ++i) {
			var ant = this.ants[i];
			if (ant.owner !== 0) {
				result.push(ant);
			}
		}
		return result;
	},
	*/
	// PUT IN MAP
	'passable': function(row, col) {
		return (this.map[row][col].type !== this.landTypes.WATER);
	},
	// PUT IN MAP
	'unoccupied': function(row, col) {
		return (this.map[row][col].type === this.landTypes.LAND ||
				this.map[row][col].type === this.landTypes.DEAD);
	},
	// PUT IN MAP
	'destination': function(row, col, direction) {
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
			newrow = this.config.rows-1;
		} else if (newrow > this.config.rows-1) {
			newrow = 0;
		}
		if (newcol < 0) {
			newcol = this.config.cols-1;
		} else if (newcol > this.config.cols-1) {
			newcol = 0;
		}
		return [newrow, newcol];
	},
	// PUT IN MAP
	'distance': function(fromRow, fromCol, toRow, toCol) {
		var dr = Math.min(Math.abs(fromRow - toRow), this.config.rows - Math.abs(fromRow - toRow));
		var dc = Math.min(Math.abs(fromCol - toCol), this.config.cols - Math.abs(fromCol - toCol));
		return Math.sqrt((dr * dr) + (dc * dc));
	},
	'distance2': function(fromRow, fromCol, toRow, toCol) {
		var dr = Math.min(Math.abs(fromRow - toRow), this.config.rows - Math.abs(fromRow - toRow));
		var dc = Math.min(Math.abs(fromCol - toCol), this.config.cols - Math.abs(fromCol - toCol));
		return (dr * dr) + (dc * dc);
	},
	// PUT IN MAP
	'direction': function(fromRow, fromCol, toRow, toCol) {
		var d = [];
		fromRow = fromRow % this.config.rows;
		toRow = toRow % this.config.rows;
		fromCol = fromCol % this.config.cols;
		toCol = toCol % this.config.cols;
		
		if (fromRow < toRow) {
			if (toRow - fromRow >= this.config.rows/2) {
				d.push('N');
			}
			if (toRow - fromRow <= this.config.rows/2) {
				d.push('S');
			}
		} else if (toRow < fromRow) {
			if (fromRow - toRow >= this.config.rows/2) {
				d.push('S');
			}
			if (fromRow - toRow <= this.config.rows/2) {
				d.push('N');
			}
		}
		
		if (fromCol < toCol) {
			if (toCol - fromCol >= this.config.cols/2) {
				d.push('W');
			}
			if (toCol - fromCol <= this.config.cols/2) {
				d.push('E');
			}
		} else if (toCol < fromCol) {
			if (fromCol - toCol >= this.config.cols/2) {
				d.push('E');
			}
			if (fromCol - toCol <= this.config.cols/2) {
				d.push('W');
			}
		}
		return d;
	},
	'getOffset':function(dist2){
		if(!this.offsets[dist2]){
			this.log("generating new offset of distance2 " + dist2);
			this.offsets[dist2] = [];
			var mx = Math.floor(Math.sqrt(dist2));
			for (var dRow = -mx; dRow < mx+1; ++dRow) {
				for (var dCol = -mx; dCol < mx+1; ++dCol) {
					var d = Math.pow(dRow, 2) + Math.pow(dCol, 2);
					if (d <= dist2) {
						this.offsets[dist2].push([dRow, dCol]);
					}
				}
			}
		}
		
		return this.offsets[dist2];	
	},
	
	'evalOffset':function(location,dist2,f){
		var offset = this.getOffset(dist2);
		for (var visionOffsetI in offset) {
			var vo = offset[visionOffsetI];
			var visionRow = location.row + vo[0];
			var visionCol = location.col + vo[1];
			
			if (visionRow < 0) {
				visionRow = (this.config.rows) + visionRow;
			} else if (visionRow >= this.config.rows) {
				visionRow = visionRow - this.config.rows;
			}
			
			if (visionCol < 0) {
				visionCol = (this.config.cols) + visionCol;
			} else if (visionCol >= this.config.cols) {
				visionCol = visionCol - this.config.cols;
			}
			f(visionRow,visionCol);
			
			//this.map[visionRow][visionCol].lastseen = 0;					
			
			//this.vision[visionRow][visionCol] = true;
			
		}
	
	},
	
	'calculateVisibility': function(){
	
		//var visionOffsets = this.getOffset(this.config.viewradius2);
		/*
		if (this.visionOffsets === false) {
			this.visionOffsets = [];
			var mx = Math.floor(Math.sqrt(this.config.viewradius2));
			for (var dRow = -mx; dRow < mx+1; ++dRow) {
				for (var dCol = -mx; dCol < mx+1; ++dCol) {
					var d = Math.pow(dRow, 2) + Math.pow(dCol, 2);
					if (d <= this.config.viewradius2) {
						this.visionOffsets.push([dRow, dCol]);
					}
				}
			}
		}
		*/
		
		/*
		for (var trow = 0; trow < this.config.rows; ++trow) {
			for (var tcol = 0; tcol < this.config.cols; ++tcol) {
				if (tcol === 0) {
					this.vision[trow] = [];
				}
				this.vision[trow][tcol] = false;
			}
		}
		*/
		
		for (var antI in this.myAnts) {
			var ant = this.myAnts[antI];
			var tmpMap = this.map;
			
			this.evalOffset(ant,this.config.viewradius2,function(row,col){tmpMap[row][col].lastseen=0});
			/*
			try{
			for (var visionOffsetI in visionOffsets) {
				var vo = visionOffsets[visionOffsetI];
				var visionRow = ant.row + vo[0];
				var visionCol = ant.col + vo[1];
				
				
				if (visionRow < 0) {
					visionRow = (this.config.rows) + visionRow;
				} else if (visionRow >= this.config.rows) {
					visionRow = visionRow - this.config.rows;
				}
				
				if (visionCol < 0) {
					visionCol = (this.config.cols) + visionCol;
				} else if (visionCol >= this.config.cols) {
					visionCol = visionCol - this.config.cols;
				}
				this.map[visionRow][visionCol].lastseen = 0;					
				
				//
				
			}
			} catch (e){
			 this.log(e);
			}
			
			*/
		}
	
	},
	
	'visible': function(row,col) {
		return this.map[row][col].lastseen == 0;
	},
	
	'recentlyVisible': function(row,col) {
		return this.map[row][col].lastseen <5;
	},
	
	// PUT IN MAP
	/*
	'visible2': function(row, col) {
		if (this.vision === false || !this.vision || this.vision.length === 0) {
			this.vision = [];
			if (this.visionOffsets === false) {
				this.visionOffsets = [];
				var mx = Math.floor(Math.sqrt(this.config.viewradius2));
				for (var dRow = -mx; dRow < mx+1; ++dRow) {
					for (var dCol = -mx; dCol < mx+1; ++dCol) {
						var d = Math.pow(dRow, 2) + Math.pow(dCol, 2);
						if (d <= this.config.viewradius2) {
							this.visionOffsets.push([dRow, dCol]);
						}
					}
				}
			}
			
			for (var trow = 0; trow < this.config.rows; ++trow) {
				for (var tcol = 0; tcol < this.config.cols; ++tcol) {
					if (tcol === 0) {
						this.vision[trow] = [];
					}
					this.vision[trow][tcol] = false;
				}
			}
			this.log(this.vision.length);
			this.log(this.vision[this.vision.length-1].length);
			
			for (var antI in myAnts) {
			var ant = myAnts[antI];
				for (var visionOffsetI in this.visionOffsets) {
					var vo = this.visionOffsets[visionOffsetI];
					var visionRow = ant.row + vo[0];
					var visionCol = ant.col + vo[1];
					
					if (visionRow < 0) {
						visionRow = (this.vision.length) + visionRow;
					} else if (visionRow >= this.config.rows) {
						visionRow = visionRow - this.vision.length;
					}
					
					if (visionCol < 0) {
						visionCol = (this.vision[visionRow].length) + visionCol;
					} else if (visionCol >= this.config.cols) {
						visionCol = visionCol - this.vision[visionRow].length;
					}
					this.map[visionRow][visionCol].lastseen = 0;					
					this.vision[visionRow][visionCol] = true;
					
				}
			}
		}
		return this.vision[row][col];
	},
	*/
	
	'createAnt' : function(row,col){
		var newAnt = new Ant(row,col);
		this.myAnts[newAnt] = newAnt;
		this.myAntAtTile[row + '-' + col] = newAnt;
		return newAnt;
	},
	'killAnt' : function(ant){
	
		if(ant){			
			if(this.myAntAtTile[ant.row + '-' + ant.col])
				delete this.myAntAtTile[ant.row + '-' + ant.col];
			
			if(this.myAnts[ant])
				delete this.myAnts[ant];
			
			this.log("killing ant at " + ant.row + "-" + ant.col + " with id " + ant + " which is now " + this.myAnts[ant]);
		}
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
		delete this.myAntAtTile[ant.row + '-' + ant.col];
		ant.row = t.row;
		ant.col = t.col;
		this.myAntAtTile[ant.row + '-' + ant.col] = ant;		
		
	},
	
	"viz_setLineWidth": function(width){
		if(this.viz_on){
			fs.writeSync(process.stdout.fd,"v setLineWidth " + width + "\n");
		}
	},
	"viz_setLineColor": function(r, g, b, alpha){
		if(this.viz_on){
			fs.writeSync(process.stdout.fd,"v setLineColor " + r + " " + g + " " + b + " " + alpha + "\n");
		}
	},
	"viz_setFillColor": function(r, g, b, alpha){
		if(this.viz_on){
			fs.writeSync(process.stdout.fd,"v setFillColor " + r + " " + g + " " + b + " " + alpha + "\n");
		}
	},
	"viz_arrow": function(from, to){
		if(this.viz_on){
			fs.writeSync(process.stdout.fd,"v arrow " + from.row + " " + from.col + " " + to.row + " " + to.col + "\n");
		}

	},
	"viz_circle": function(tile, radius, fill){
		if(this.viz_on){
			fs.writeSync(process.stdout.fd,"v circle " + tile.row + " " + tile.col + " " + radius + " " + fill + "\n");
		}

	},
	"viz_line": function(from, to){
		if(this.viz_on){

			fs.writeSync(process.stdout.fd,"v line " + from.row + " " + from.col + " " + to.row + " " + to.col + "\n");
		}

	},

	"viz_rect": function(tile, width, height, fill){
		if(this.viz_on){
			fs.writeSync(process.stdout.fd,"v rect " + tile.row + " " + tile.col + " " + width + " " + height + " " + fill + "\n");
		}

	},
	"viz_star": function(tile, inner_radius, outer_radius, points, fill){
		if(this.viz_on){
			fs.writeSync(process.stdout.fd,"v star " + tile.row + " " + tile.col + " " + inner_radius + " " + outer_radius + " " + points + " " + fill + "\n");
		}
	},

	"viz_tile": function(tile){
		if(this.viz_on){
			fs.writeSync(process.stdout.fd,"v tile " + tile.row + " " + tile.col + "\n");
		}

	},

	"viz_tileBorder": function(tile, subtile){
		if(this.viz_on){
			fs.writeSync(process.stdout.fd,"v tileBorder " + tile.row + " " + tile.col + " " + subtile + "\n");    
		}	
	},

	"viz_tileSubTile": function(tile, subtile){
		if(this.viz_on){
			fs.writeSync(process.stdout.fd,"v tileSub" + tile.row + " " + tile.col + " " + subtile + "\n");    	
		}
	},
	
	"timeLeft": function(){
		return Math.min(this.config.turntime,2000) - (Date.now() - this.turnStart);
	}
};


// HELPER FUNCTIONS 



