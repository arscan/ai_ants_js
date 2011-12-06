var game = require('./Game').game;
var AStarGraph = require('./AStarGraph').AStarGraph;
var astar = require('./AStar').astar;
var util = require('util');
var BinaryHeap = require('./BinaryHeap').BinaryHeap;

var bot = {
	'antOrders':{},
    'onReady': function() {
		game.finishTurn();
    },
    'onTurn': function() {
	
		// initialize the astar search
		
		this.antOrders = {};
		
		//var val = astar.search({"row":6,"col":6},{"row":20,"col":5}, true,12);
		//game.log(util.inspect(val));
		
				/*
				game.viz_setFillColor(255,25,0,.9);
			for(var hI in game.enemyHills){
				var h = game.enemyHills[hI];
				
				game.viz_tile({"row":h.row,"col":h.col},0);
				
			}
			
				game.viz_setFillColor(25,255,0,.9);
			for(var hI in game.myHills){
				var h = game.myHills[hI];
				
				game.viz_tile({"row":h.row,"col":h.col},0);
				
			}
		*/
		
		game.log("Building reachableMap that contains of tiles that are reachable within 10 turns");
		var directions = this.generateRandomDirections();
		
		var reachableMap = [];
		this.buildMap(game.myAnts,
					reachableMap,
					16,
					true,
					function(val){return Math.max(0,val-1);},
					function(oldval,newval){return newval},
					function(row,col){
						var retval = false;
						try{
							retval = game.map[row][col].type !== game.landTypes.WATER && game.map[row][col].type !== game.landTypes.UNKNOWN;
						} catch (e){
							game.log("error when looking up " + row + "-" + col);
						}
						return retval;
						});
		
		
		game.log("Building border of invisible tiles");
		
		var invisibleTiles = [];
		for(var c=0;c<game.config.cols;c++){
			for(var r=0;r<game.config.rows;r++){
				//if(!game.visible(r,c))
				//	game.viz_tile({"row":r,"col":c},0);
				
				if(reachableMap[r][c]<6 && !game.antAtTile(r,c) && game.map[r][c].type !== game.landTypes.WATER && (reachableMap[(r+1)%game.config.rows][c]>0 || reachableMap[(r-1+game.config.rows)%game.config.rows][c]>0 || reachableMap[r][(c+1)%game.config.cols] >0 || reachableMap[r][(c-1+game.config.cols)%game.config.cols]>0)){
					invisibleTiles.push({"row":r,"col":c});
					//game.viz_tile({"row":r,"col":c},0);
				}
			}
		}
		
		game.log("Building border of discovered tiles");
		var undiscoveredTiles = [];
		for(var c=0;c<game.config.cols;c++){
			for(var r=0;r<game.config.rows;r++){
				//if(!game.visible(r,c))
				//	game.viz_tile({"row":r,"col":c},0);
				
				var bordering = false;
				
				if(game.map[r][c].type == game.landTypes.UNKNOWN){
					for (dirI in directions) {
						var dir = directions[dirI];
						
							if(game.tileInDirection(r,c,dir).type !== game.landTypes.UNKNOWN){
								bordering = true;
							}
					}
				}
				if(bordering){
					undiscoveredTiles.push({"row":r,"col":c});
					//game.viz_tile({"row":r,"col":c},0);
				}
			}
		}
		
		if(!this.exploreMap){
			this.exploreMap = [];
		}
		
		game.log("Building map & diffusing invisible tiles to explore map");
		this.buildMap(invisibleTiles,
					this.exploreMap,
					5,
					true,
					function(val){return .9*val;},
					function(oldval,newval){return (/*oldval*.333+newval*.666*/newval)},
					function(row,col){
						var retval = false;
						try{
							retval = game.map[row][col].type !== game.landTypes.WATER && game.map[row][col].type !== game.landTypes.UNKNOWN;
						} catch (e){
							game.log("error when looking up " + row + "-" + col);
						}
						return retval;
						});
						
		
		game.log("Diffusing undiscovered tiles on explore map");
		
		this.buildMap(undiscoveredTiles,
					this.exploreMap,
					5,
					true,
					function(val){return .9*val;},
					function(oldval,newval){return (oldval+newval)},
					function(row,col){
						var retval = false;
						try{
							retval = game.map[row][col].type !== game.landTypes.WATER && game.map[row][col].type !== game.landTypes.UNKNOWN;
						} catch (e){
							game.log("error when looking up " + row + "-" + col);
						}
						return retval;
						});
						
		game.log("Diffusing enemy ant hills tiles on explore map");
		
		this.buildMap(game.enemyHills,
					this.exploreMap,
					30,
					true,
					function(val){return .9*val;},
					function(oldval,newval){return (oldval+newval)},
					function(row,col){
						var retval = false;
						try{
							retval = game.map[row][col].type !== game.landTypes.WATER && game.map[row][col].type !== game.landTypes.UNKNOWN;
						} catch (e){
							game.log("error when looking up " + row + "-" + col);
						}
						return retval;
						});
		
		game.log("figuring out which food can be reached within 10 turns by looking on the reacahble map");
		var reachableFood = [];
		
		for(var i = 0; i<game.food.length; i++){
			var f = game.food[i];
			//game.log("checking food at " +f.row + "-" + f.col + " which has a reachable val of " + reachableMap[f.row][f.col]);
			if(reachableMap[f.row][f.col] > 0){
			
				reachableFood.push(f);
				game.viz_setFillColor(255,0,0,.9);
				game.viz_tile({"row":f.row,"col":f.col},0);
			
			}
		}
		
		game.log("Found " + reachableFood.length + " food tiles that I can easily reach");
		
		game.log("building a map of reachable food so I can figuring out what ants are in the running");
		
		var reachableFoodAntMap = [];
		this.buildMap(reachableFood,
					reachableFoodAntMap,
					16,
					true,
					function(val){return Math.max(0,val-1);},
					function(oldval,newval){return newval},
					function(row,col){
						var retval = false;
						try{
							retval = game.map[row][col].type !== game.landTypes.WATER && game.map[row][col].type !== game.landTypes.UNKNOWN;
						} catch (e){
							game.log("error when looking up " + row + "-" + col);
						}
						return retval;
						});
		
		game.log("figruing out which ants are elible for food");
		
		var reachableFoodAnts = [];
		
		for (var antI in game.myAnts) {
			var ant = game.myAnts[antI];
			if(reachableFoodAntMap[ant.row][ant.col] > 0){
				reachableFoodAnts.push(ant);
				game.viz_setFillColor(0,255,0,.9);
				game.viz_tile({"row":ant.row,"col":ant.col},0);
			
			}
		}
		
		game.log("Found " + reachableFoodAnts.length + " ants elilble for food gathering duty");
		
		var foodSegments = new BinaryHeap(function(node){return node.dist});

		
		for (var antI in reachableFoodAnts) {
			var ant = reachableFoodAnts[antI];
			
			for (var foodI in reachableFood) {
				var food = reachableFood[foodI];
				var dist = game.distance(ant.row,ant.col,food.row,food.col);
				//game.log("pushing dist " + dist + " " + ant.row + "-" + ant.col + " for food " + food.row + "-" + food.col);
				foodSegments.push({"ant":ant,"food":food,"dist":dist});
			}
		}
		
		game.log("found " + foodSegments.size() + " food-ant segments");
		//game.log("shortest food segment is of distance " +foodSegments.pop().dist);
		
		var foodClaimed = {};
		var foodAntBusy = {};
		
		game.viz_setLineColor(0,0,255,1.0);
		while(foodSegments.size()>0){
			var seg = foodSegments.pop();
			
			if(!foodClaimed[seg.food.row + '-' + seg.food.col] && !foodAntBusy[seg.ant]){
				
			
				for(var oldAntOrderI in foodAntBusy){
					var oldAntOrder = foodAntBusy[oldAntOrderI];
					var checkdist = oldAntOrder.dist + game.distance(oldAntOrder.food.row,oldAntOrder.food.col,seg.food.row,seg.food.col)
					if(checkdist < seg.dist && !foodClaimed[seg.food.row + '-' + seg.food.col]){
						game.log("turns out sending somebody else to food at " + seg.food.row + "-" + seg.food.col + " is faster because " + checkdist + " is closer than " + seg.dist );	
						foodClaimed[seg.food.row + '-' + seg.food.col] = oldAntOrder.ant;
						foodAntBusy[oldAntOrder.ant] = {"ant":oldAntOrder.ant,"food":seg.food,"dist":checkdist};

						game.viz_setLineColor(0,0,255,1.0);						
						game.viz_line(seg.food,oldAntOrder.food);				
					}
				}
				
				if(!foodClaimed[seg.food.row + '-' + seg.food.col]){
					game.viz_line(seg.food,seg.ant);
					foodClaimed[seg.food.row + '-' + seg.food.col] = seg.ant;
					foodAntBusy[seg.ant] = {"ant":seg.ant,"food":seg.food,"dist":seg.dist};
					game.log("sending ant " + seg.ant + " to " + seg.food.row + '-' + seg.food.col);
					
					var curDest = seg.ant.getDestination();
					if(curDest == null || curDest.row !== seg.food.row || curDest.col !== seg.food.col){
						var path = astar.search(seg.ant,seg.food, true);	
						seg.ant.setPath(path);
						game.viz_setLineColor(255,0,255,1.0);
						game.viz_line(seg.food,seg.ant);		
					}
					
					this.antOrders[seg.ant] = seg.ant;
					
				}
			}
		
		}
		
		for(var antI in this.antOrders){
			var ant = this.antOrders[antI];
			var nextMove =ant.getNextMove();
			game.log("issuing order for ant " + ant + " at " + ant.row + "-" + ant.col + " to go " + nextMove);
			try{
			game.issueOrder(ant.row,ant.col,nextMove);
			} catch(e){
				game.log("ERROR! cound not issue order to ant!");
			}
			
		}
		
						
		//this.buildMap(game.food,exploreMap,5,true,function(val){return Math.max(0,val-1);},function(oldval,newval){return oldval+newval},function(row,col){return(game.map[row][col].type !== game.landTypes.WATER && game.map[row][col].type !== game.landTypes.UNKNOWN)});
		
		
		for(var c=0;c<game.config.cols;c++){
			for(var r=0;r<game.config.rows;r++){
				if(this.exploreMap[r][c] > 0){
				game.viz_setFillColor(55,0,0,this.exploreMap[r][c]/20.0);
				game.viz_tile({"row":r,"col":c},0);
				}
			}
		}
		
		
		for (var i in game.myAnts) {
			var ant = game.myAnts[i];
			if(!this.antOrders[ant]){
				game.log("ant at " + ant.row + "-" + ant.col + " don't have any orders yet");
				var maxScent = 0;
				var finalDir = directions[0];
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
			
		}
		
		game.finishTurn();
    },
    'onEnd': function() {
    
    },
	
	'doMoveLocation': function(ant,loc){
	
	
	},
	
	'doMoveDirection': function(ant,direction){
	
	
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
			if(!validtile(g.row, g.col)){
				tmpMap[g.row][g.col]=0;
			}
			openHeap.push({"row":g.row,"col":g.col,"size":goalsize});
			visitedTiles[g.row + "-" + g.col] = 1;
			maptobuild[g.row][g.col] = blend(maptobuild[g.row][g.col], tmpMap[g.row][g.col]);
		}
	
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
				//if(game.enemyHills[node.row + "-" + node.col]){
				//	game.log("working enemy ant hill: " + visitedTiles[node.row + "-" + node.col] + " and valid? " + validtile(node.row, node.col));
				//}
				if(!visitedTiles[node.row + "-" + node.col] && validtile(node.row, node.col)){
					for(var dirXI in directions){
						var dirX = directions[dirXI];
						var tileInDir = game.tileInDirection(node.row,node.col,dirX);
						try{
							node.size = Math.max(diffusion(tmpMap[tileInDir.row][tileInDir.col]),node.size);
						} catch (e){
							game.log("ERROR " + e + " when working on node " + node.row + "-" + node.col + " in direction " + dirX + " and tileInDir " + util.inspect(tileInDir));
						}
					}
					if(!validtile(node.row, node.col)){
						node.size = 0;
						
					}
					
					//if(game.enemyHills[node.row + "-" + node.col]){
					//	game.log("setting enemy hill to " + node.size);
					//}
					tmpMap[node.row][node.col] = node.size;
					maptobuild[node.row][node.col] = blend(maptobuild[node.row][node.col], node.size*multiplier);
					
					//if(game.enemyHills[node.row + "-" + node.col]){
					//	game.log("done setting real stuff, to " + maptobuild[node.row][node.col]);
					//}
					visitedTiles[node.row + "-" + node.col] = 1;
					
					if(node.size > 0){
						//game.log("adding " + node.row + "-" + node.col + " to queue with diffusion " + node.size);
						openHeap.push(node);
					}
				}
			}
			
		}
		
		game.log("Buildmap traversed a total of " + totalCalcs + " nodes");
		return tmpMap;
	},
	"generateRandomDirections": function(){
		var dirs = ['N','S','E','W'];
		
		var dirHeap = new BinaryHeap(function(node){return node.weight});
		var newDirs = [];
		
		for(var i = 0; i<dirs.length; i++){
			dirHeap.push({"dir":dirs[i],"weight":Math.random()*11});
		}
	
		while(dirHeap.size() > 0){
			newDirs.push(dirHeap.pop().dir);
		}
		
		return newDirs;
	
	},

}
game.start(bot);


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
		
		
		//var val = astar.search({"row":6,"col":6},{"row":56,"col":54});
		//game.log(util.inspect(val));
		
		
		//game.viz_setFillColor(0,0,0,1.0);
		//game.viz_setLineColor(0,0,0,1.0);
		//for(var i=0;i<val.length;i++){
		//	game.viz_tile({"row":val[i].x,"col":val[i].y},0);
		//}
		
		/*
		for (var antI in game.myAnts) {
			var ant = game.myAnts[antI];
			var path = astar.search(ant,{"row":64,"col":54}, true);
			game.log("sending ant " + ant.row + "-" + ant.col + " on a path of length " + path.length);
			ant.setDestination(path);
			game.viz_setLineColor(0,0,0,1.0);
			for(var i=0;i<path.length;i++){
				game.viz_tile({"row":path[i].x,"col":path[i].y},0);
			}
			
			
			game.issueOrder(ant.row, ant.col, ant.getNextMove());
		
		}
		
		
		game.finishTurn();
		return;
		
		*/