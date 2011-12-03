var game = require('./Game').game;
var AStarGraph = require('./AStarGraph').AStarGraph;
var astar = require('./AStar').astar;
var util = require('util');
var BinaryHeap = require('./BinaryHeap').BinaryHeap;

var bot = {
    'onReady': function() {
		game.finishTurn();
    },
    'onTurn': function() {
	
		// initialize the astar search
		
		/*
		var _search = [];
		
		for(var r=0;r<game.config.rows;r++){
			_search[r] = [];
			for(var c=0;c<game.config.cols;c++){
				_search[r][c]=!game.passable(r,c);
			}
		}
		
		var asg = new AStarGraph(_search);
		//game.log(asg);
			
		var start = asg.nodes[8][16];
		var end = asg.nodes[0][7];
	
		*/
		//game.log(util.inspect(start));
		//game.log(util.inspect(end));
		astar.init();
		
		//var val = astar.search({"row":6,"col":6},{"row":56,"col":54});
		//game.log(util.inspect(val));
		
		
		//game.viz_setFillColor(0,0,0,1.0);
		//game.viz_setLineColor(0,0,0,1.0);
		//for(var i=0;i<val.length;i++){
		//	game.viz_tile({"row":val[i].x,"col":val[i].y},0);
		//}
		
		game.viz_setFillColor(0,0,0,1.0);
		
		
		game.log("Building an explore map");
		
		/*
		var invisibleTiles = [];
		for(var c=0;c<game.config.cols;c++){
			for(var r=0;r<game.config.rows;r++){
				//if(!game.visible(r,c))
				//	game.viz_tile({"row":r,"col":c},0);
				
				if(!game.visible(r,c) && game.map[r][c].type !== game.landTypes.WATER && (game.visible((r+1)%game.config.rows,c) || game.visible((r-1+game.config.rows)%game.config.rows,c) || game.visible(r,(c+1)%game.config.cols) || game.visible(r,(c-1+game.config.cols)%game.config.cols))){
					invisibleTiles.push({"row":r,"col":c});
					//game.viz_tile({"row":r,"col":c},0);
				}
			}
		}
		*/
		
		var reachableMap = [];
		this.buildMap(game.myAnts,reachableMap,11,true,function(val){return Math.max(0,val-1);},function(oldval,newval){return newval},function(row,col){return(game.map[row][col].type !== game.landTypes.WATER && game.map[row][col].type !== game.landTypes.UNKNOWN)});
		
		
		var invisibleTiles = [];
		for(var c=0;c<game.config.cols;c++){
			for(var r=0;r<game.config.rows;r++){
				//if(!game.visible(r,c))
				//	game.viz_tile({"row":r,"col":c},0);
				
				if(reachableMap[r][c]==0 && !game.antAtTile(r,c) && game.map[r][c].type !== game.landTypes.WATER && (reachableMap[(r+1)%game.config.rows][c]>0 || reachableMap[(r-1+game.config.rows)%game.config.rows][c]>0 || reachableMap[r][(c+1)%game.config.cols] >0 || reachableMap[r][(c-1+game.config.cols)%game.config.cols]>0)){
					invisibleTiles.push({"row":r,"col":c});
					//game.viz_tile({"row":r,"col":c},0);
				}
			}
		}
		
		if(!this.exploreMap){
			this.exploreMap = [];
		}
		
		this.buildMap(invisibleTiles,this.exploreMap,5,true,function(val){return .9*val;},function(oldval,newval){return (oldval*.333+newval*.666)},function(row,col){return(game.map[row][col].type !== game.landTypes.WATER && game.map[row][col].type !== game.landTypes.UNKNOWN && !game.antAtTile(row,col))});
		//this.buildMap(game.food,exploreMap,5,true,function(val){return Math.max(0,val-1);},function(oldval,newval){return oldval+newval},function(row,col){return(game.map[row][col].type !== game.landTypes.WATER && game.map[row][col].type !== game.landTypes.UNKNOWN)});
		
		
		
		for(var c=0;c<game.config.cols;c++){
			for(var r=0;r<game.config.rows;r++){
				//game.viz_setFillColor(55,0,0,this.exploreMap[r][c]/10.0);
				//game.viz_tile({"row":r,"col":c},0);
			}
		}
		
		
		
		var directions = ['N', 'E', 'S', 'W'];
		for (var i in game.myAnts) {
			var ant = game.myAnts[i];
			var maxScent = 0;
			var finalDir = 'N';
			for (dirI in directions) {
				var dir = directions[dirI];
				var t = game.tileInDirection(ant.row,ant.col,dir);
				//game.log(" what i'm looking for" + util.inspect(t));
				try{
				if(maxScent < this.exploreMap[t.row][t.col]){
					maxScent = this.exploreMap[t.row][t.col];
					finalDir = dir;
				}
				} catch (e){
					game.log("the error");
				}
			}
			game.issueOrder(ant.row, ant.col, finalDir);
			
		}
		/*
		var myAnts = game.myAnts();
		var directions = ['N', 'E', 'S', 'W'];
		for (var i in myAnts) {
			var ant = myAnts[i];
			for (dirI in directions) {
				var dir = directions[dirI];
				var loc = game.destination(ant.row, ant.col, dir);
				if (game.passable(loc[0], loc[1])) {
					game.issueOrder(ant.row, ant.col, dir);
					break;
				}
			}
		}*/
		game.finishTurn();
    },
    'onEnd': function() {
    
    },
	'buildMap': function(goals,maptobuild,goalsize,attractor,diffusion,blend,validtile) {
			
		var tmpMap = [];
		var multiplier = 1;
		if(!attractor){
			multiplier = -1;
		}
			
		for(var r = 0; r<game.config.rows; r++){
			for(var c = 0; c<game.config.cols; c++){
				if(c === 0){
					tmpMap[r] = [];
					
				}
				
				tmpMap[r][c] = 0;
			}
		}
		
		if(maptobuild.length === 0){
			for(var r = 0; r<game.config.rows; r++){
				for(var c = 0; c<game.config.cols; c++){
					if(c === 0){
						maptobuild[r] = [];
						
					}
					maptobuild[r][c] = 0;
				}
			}
		}
				
		var openHeap = new BinaryHeap(function(node){return goalsize-node.size;});
		var visitedTiles = {};
		
		
		for(var gI in goals){
			var g = goals[gI];
			tmpMap[g.row][g.col]=goalsize;
			openHeap.push({"row":g.row,"col":g.col,"size":goalsize});
			visitedTiles[g.row + "-" + g.col] = 1;
			//game.log("adding " + g.row + "-" + g.col + " to queue with diffusion " + goalsize);
			//game.viz_tile(g,0);
		}
		/*
		for(var i = 0; i<goals.length; i++){
			//game.log("trying..." + goals[i].row + " " + goals[i].col);
			tmpMap[goals[i].row][goals[i].col]=goalsize;
			openHeap.push({"row":goals[i].row,"col":goals[i].col,"size":goalsize});
			visitedTiles[goals[i].row + "-" + goals[i].col] = 1;
			//game.log("adding " + goals[i].row + "-" + goals[i].col + " to queue with diffusion " + goalsize);
			game.viz_tile(goals[i],0);
		} */
		
		var totalCalcs = 0;
		
		var directions = this.generateRandomDirections();
        while(openHeap.size() > 0) {
			totalCalcs++;

        	// Grab the lowest f(x) to process next.  Heap keeps this sorted for us.
            var currentNode = openHeap.pop();
			
			//game.log("processing " + currentNode.row + " " + currentNode.col + " " + currentNode.size);
			
			// get neighbors.
			// before putting neighbor on the stack, figure out his weight.
			
			for(var dirI in directions){
				var dir = directions[dirI];
				var nodeInDir = game.tileInDirection(currentNode.row,currentNode.col,dir);
				var node = {"row":nodeInDir.row,"col":nodeInDir.col, "size":0.0};
				if(!visitedTiles[node.row + "-" + node.col] && validtile(node.row, node.col)){
					for(var dirXI in directions){
						var dirX = directions[dirXI];
						var tileInDir = game.tileInDirection(node.row,node.col,dirX);
						node.size = Math.max(diffusion(tmpMap[tileInDir.row][tileInDir.col]),node.size);
					}
					if(!validtile(node.row, node.col)){
						node.size = 0;
					}
					tmpMap[node.row][node.col] = node.size;
					maptobuild[node.row][node.col] = blend(maptobuild[node.row][node.col], node.size * multiplier);
					visitedTiles[node.row + "-" + node.col] = 1;
					
					if(node.size > 0){
						//game.log("adding " + node.row + "-" + node.col + " to queue with diffusion " + node.size);
						openHeap.push(node);
					}
				}
			}
			
			
			/*
			
			
			var north = {"row":(currentNode.row-1+game.config.rows)%game.config.rows,"col":currentNode.col, "size":0};
			if(!visitedTiles[north.row + "-" + north.col] && game.map[north.row][north.col].type !== game.landTypes.WATER && game.map[north.row][north.col].type !== game.landTypes.UNKNOWN){
					// haven't seen this one yet.
					
					north.size = Math.max(diffusion(maptobuild[(north.row-1+game.config.rows)%game.config.rows][north.col]),north.size);
					north.size = Math.max(diffusion(maptobuild[(north.row+1)%game.config.rows][north.col]),north.size);
					north.size = Math.max(diffusion(maptobuild[north.row][(north.col-1+game.config.cols)%game.config.cols]),north.size);
					north.size = Math.max(diffusion(maptobuild[north.row][(north.col+1)%game.config.cols]),north.size);
					
					//game.log("adding " + north.row + "-" + north.col + " to queue with diffusion " + north.size);
					maptobuild[north.row][north.col] = north.size;
					visitedTiles[north.row + "-" + north.col] = 1;
					openHeap.push(north);
			} else if(game.map[north.row][north.col].type === game.landTypes.WATER){
				maptobuild[north.row][north.col] = 0;
			}
			
			var south = {"row":(currentNode.row+1)%game.config.rows,"col":currentNode.col, "size":0};
			if(!visitedTiles[south.row + "-" + south.col] && game.map[south.row][south.col].type !== game.landTypes.WATER && game.map[south.row][south.col].type !== game.landTypes.UNKNOWN){
					// haven't seen this one yet.
					
					south.size = Math.max(maptobuild[(south.row-1+game.config.rows)%game.config.rows][south.col]*diffusion,south.size);
					south.size = Math.max(maptobuild[(south.row+1)%game.config.rows][south.col]*diffusion,south.size);
					south.size = Math.max(maptobuild[south.row][(south.col-1+game.config.cols)%game.config.cols]*diffusion,south.size);
					south.size = Math.max(maptobuild[south.row][(south.col+1)%game.config.cols]*diffusion,south.size);
					
					//game.log("adding " + south.row + "-" + south.col + " to queue with diffusion " + south.size);
					maptobuild[south.row][south.col] = south.size;
					visitedTiles[south.row + "-" + south.col] = 1;
					openHeap.push(south);
			} else if(game.map[south.row][south.col].type === game.landTypes.WATER){
				maptobuild[south.row][south.col] = 0;
			}
			
			var east = {"row":currentNode.row,"col":(currentNode.col-1+game.config.cols)%game.config.cols, "size":0};
			if(!visitedTiles[east.row + "-" + east.col] && game.map[east.row][east.col].type !== game.landTypes.WATER && game.map[east.row][east.col].type !== game.landTypes.UNKNOWN){
					// haven't seen this one yet.
					
					east.size = Math.max(maptobuild[(east.row-1+game.config.rows)%game.config.rows][east.col]*diffusion,east.size);
					east.size = Math.max(maptobuild[(east.row+1)%game.config.rows][east.col]*diffusion,east.size);
					east.size = Math.max(maptobuild[east.row][(east.col-1+game.config.cols)%game.config.cols]*diffusion,east.size);
					east.size = Math.max(maptobuild[east.row][(east.col+1)%game.config.cols]*diffusion,east.size);
					
					//game.log("adding " + east.row + "-" + east.col + " to queue with diffusion " + east.size);
					maptobuild[east.row][east.col] = east.size;
					visitedTiles[east.row + "-" + east.col] = 1;
					openHeap.push(east);
			} else if(game.map[east.row][east.col].type === game.landTypes.WATER){
				maptobuild[east.row][east.col] = 0;
			}
			
			var west = {"row":currentNode.row,"col":(currentNode.col+1)%game.config.cols, "size":0};
			if(!visitedTiles[west.row + "-" + west.col] && game.map[west.row][west.col].type !== game.landTypes.WATER && game.map[west.row][west.col].type !== game.landTypes.UNKNOWN){
					// haven't seen this one yet.
					
					west.size = Math.max(maptobuild[(west.row-1+game.config.rows)%game.config.rows][west.col]*diffusion,west.size);
					west.size = Math.max(maptobuild[(west.row+1)%game.config.rows][west.col]*diffusion,west.size);
					west.size = Math.max(maptobuild[west.row][(west.col-1+game.config.cols)%game.config.cols]*diffusion,west.size);
					west.size = Math.max(maptobuild[west.row][(west.col+1)%game.config.cols]*diffusion,west.size);
					
					//game.log("adding " + west.row + "-" + west.col + " to queue with diffusion " + west.size);
					maptobuild[west.row][west.col] = west.size;
					visitedTiles[west.row + "-" + west.col] = 1;
					openHeap.push(west);
			} else if(game.map[west.row][west.col].type === game.landTypes.WATER){
				maptobuild[west.row][west.col] = 0;
			}
			*/
			
		}
		
		game.log("Buildmap traversed a total of " + totalCalcs + " nodes");
		return tmpMap;
	},
	"generateRandomDirections": function(){
		game.log("Generating random directions");
		var dirs = ['N','S','E','W'];
		
		
		
		var dirHeap = new BinaryHeap(function(node){return node.weight});
		var newDirs = [];
		
		for(var i = 0; i<dirs.length; i++){
			dirHeap.push({"dir":dirs[i],"weight":Math.random()*11});
		}
	
		while(dirHeap.size() > 0){
			newDirs.push(dirHeap.pop().dir);
		}
		
		game.log("Chose these directions: " + newDirs);
		
		return newDirs;
		
	
	},

}
game.start(bot);