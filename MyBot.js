var game = require('./Game').game;
var AStarGraph = require('./AStarGraph').AStarGraph;
var astar = require('./AStar').astar;
var util = require('util');
var BinaryHeap = require('./BinaryHeap').BinaryHeap;

var bot = {
	'antOrders':{},
	'proposedMoves':{},
	'proposedMovesMap':[],
    'onReady': function() {
		game.finishTurn();
    },
    'onTurn': function() {
	
		// initialize the astar search
		
		this.antOrders = {};
		
		//this.init();
		game.log("cleaning out ant distributions");
		for(var antI in game.allAnts){
			var ant = game.allAnts[antI];
			ant.distro = {"A":1,"N":1,"W":1,"E":1,"S":1,"count":5};
		}
		
		this.aStarRun = false;
	
		
		game.log("Initializing Map of Proposed Moves");
		
		for(var r=0;r<game.config.rows;r++){
			for(var c=0;c<game.config.cols;c++){
				if(c==0){
					this.proposedMovesMap[r] = [];
				}
				this.proposedMovesMap[r][c]=null;
			}
		}
		
		this.proposedMoves = {};
		for(var antI in game.allAnts){
			var ant = game.allAnts[antI];
			//this.proposedMovesMap[ant.row][ant.col]=ant;
			this.proposeMove(ant,"A");
		}
		
		
		
		if(game.timeLeft() < 100){
			this.executeMoves();
			game.log("Bailing because we only have " + game.timeLeft() + " time left");
			game.finishTurn();
			return;
		};
		
		
		var directions = this.generateRandomDirections();
		game.log("Building hillmap that defines areas near my hills");
		
		
		if(!this.myHillMap || game.currentTurn%3 == 0){
			this.myHillMap = [];
			this.buildMap(game.myHills,
						this.myHillMap,
						12,
						true,
						function(val){return Math.max(0,val-1);},
						function(oldval,newval){return newval},
						function(row,col){
							var retval = false;
							try{
								retval = game.map[row][col].type !== game.landTypes.WATER && game.map[row][col].type !== game.landTypes.UNKNOWN;
								if(game.enemyAntAtTile[row + "-" + col]){
									game.log("found enemy near base at " + row + "-" + col);
									
								}
							} catch (e){
								game.log("error when looking up " + row + "-" + col);
							}
							return retval;
							});
		}
		
		var myHillMap = this.myHillMap;
		
		if(!this.reachableMap || !this.unreachableTiles || game.currentTurn%2 == 0){
			game.log("Building reachableMap that contains of tiles that are reachable within 10 turns");
			this.reachableMap = [];
			this.buildMap(game.myAnts,
						this.reachableMap,
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
							},
						null,
						function(row,col,val){
							if(val > 5){
								game.map[row][col].reached = true;
							}
						});
							
			
			
			
			if(game.timeLeft() < 100){
				this.executeMoves();
				game.log("Bailing because we only have " + game.timeLeft() + " time left");
				game.finishTurn();
				return;
			};
			game.log("updating map to contain how recently something has been reachable");
			
			
			
			for(var c=0;c<game.config.cols;c++){
				for(var r=0;r<game.config.rows;r++){
					
					game.map[r][c].lastreachable = Math.min(5,game.map[r][c].lastreachable);
					
					if(this.reachableMap[r][c]>6){
						game.map[r][c].lastreachable = 0;
					}
					//game.viz_setFillColor(game.map[r][c].lastreachable*10,game.map[r][c].lastreachable*10,game.map[r][c].lastreachable*10,.5);
					//game.viz_tile({"row":r,"col":c},0);
				}
			}
				
		
			if(game.timeLeft() < 100){
				this.executeMoves();
				game.log("Bailing because we only have " + game.timeLeft() + " time left");
				game.finishTurn();
				return;
			};

			game.log("Building border of not reachable tiles");
			
			this.unreachableTiles = [];
			var cols = game.config.cols;
			var rows = game.config.rows;
			var bordering = false;
			for(var c=0;c<game.config.cols;c++){
				for(var r=0;r<game.config.rows;r++){
					//if(!game.visible(r,c))
					//	game.viz_tile({"row":r,"col":c},0);
					
					bordering = false;
					
					if(game.map[r][c].lastreachable > 2 && game.map[r][c].type !== game.landTypes.WATER){
					
						if(game.map[(r+1)%rows][c].lastreachable <3){
							bordering = true;
						} else if(game.map[(r-1+rows)%rows][c].lastreachable<3){
							bordering = true;
						} else if(game.map[r][(c+1)%cols].lastreachable<3){
							bordering = true;
						} else if(game.map[r][(c-1+cols)%cols].lastreachable<3){
							bordering = true;
						}	
						/*
						for (var dirI = 0; dirI<4;dirI++){
							var dir = directions[dirI];
							if(game.tileInDirection(r,c,dir).lastreachable < 3){
								bordering = true;
							}
						}
						*/
					}
					if(bordering && myHillMap[r][c]===0){
						if(Math.random() < .5)
							this.unreachableTiles.push({"row":r,"col":c});
						//game.viz_setFillColor(55,55,55,.7);
						//game.viz_tile({"row":r,"col":c},0);
					} else if(bordering && myHillMap[r][c]>0){
						//game.viz_setFillColor(55,55,55,.7);
						//game.viz_tile({"row":r,"col":c},0);
						game.food.push({"row":r,"col":c});
					}
				}
			}
		}
		if(!this.undiscoveredTiles || game.currentTurn%3 == 1){
			game.log("Building border of discovered tiles");
			this.undiscoveredTiles = [];
			var rows = game.config.rows;
			var cols = game.config.cols;
			for(var c=0;c<cols;c++){
				for(var r=0;r<rows;r++){
					//if(!game.visible(r,c))
					//	game.viz_tile({"row":r,"col":c},0);
					
					bordering = false;
					
					if(game.map[r][c].reached){
					
					
						if(!game.map[(r+1)%rows][c].reached && game.map[(r+1)%rows][c].type !== game.landTypes.WATER){
							bordering = true;
						} else if(!game.map[(r-1+rows)%rows][c].reached && game.map[(r-1+rows)%rows][c].type !== game.landTypes.WATER){
							bordering = true;
						} else if(!game.map[r][(c+1)%cols].reached && game.map[r][(c+1)%cols].type !== game.landTypes.WATER){
							bordering = true;
						} else if(!game.map[r][(c-1+cols)%cols].reached && game.map[r][(c-1+cols)%cols].type !== game.landTypes.WATER){
							bordering = true;
						}	
					}
					if(bordering){
						this.undiscoveredTiles.push({"row":r,"col":c});
						//game.viz_setFillColor(55,55,55,.7);
						//game.viz_tile({"row":r,"col":c},0);
					}
				}
			}
		}
		
		
		
		if(game.timeLeft() < 100){
			this.executeMoves();
			game.log("Bailing because we only have " + game.timeLeft() + " time left");
			game.finishTurn();
			return;
		};

		if(!this.exploreMap){
			this.exploreMap = [];
		}
		game.log("putting things that i want onto the exploregoaltiles");
		var exploregoaltiles = {};
		for(var tI in this.unreachableTiles){
			var t= this.unreachableTiles[tI];
			exploregoaltiles[t.row +"-" +t.col] = {"row":t.row,"col":t.col,"goalsize":5};		
		}
		for(var tI in game.enemyHills){
			var t=  game.enemyHills[tI];
			exploregoaltiles[t.row +"-" +t.col] = {"row":t.row,"col":t.col,"goalsize":500};		
		}
		for(var tI in game.enemyAnts){
			var t= game.enemyAnts[tI];
			exploregoaltiles[t.row +"-" +t.col] = {"row":t.row,"col":t.col,"goalsize":5};		
		}
		for(var tI in this.undiscoveredTiles){
			var t= this.undiscoveredTiles[tI];
			exploregoaltiles[t.row +"-" +t.col] = {"row":t.row,"col":t.col,"goalsize":50};		
		}
		game.log("Building explore map");
		this.buildMap(exploregoaltiles,
					this.exploreMap,
					0,
					true,
					function(val, row, col){return .95*val;},
					function(oldval,newval){return (newval)},
					function(row,col){
						var retval = false;
						try{
							retval = game.map[row][col].type !== game.landTypes.WATER && game.map[row][col].reached;
						} catch (e){
							game.log("error when looking up " + row + "-" + col);
						}
						return retval;
						},
					function(row,col){
						if(myHillMap[row][col] == 2){
							return .1;
							//return null;
						} else {
							return null;
						}
					
						
					});
		
		
		/*
		game.log("Building map & diffusing invisible tiles to explore map");
		this.buildMap(this.unreachableTiles,
					this.exploreMap,
					5,
					true,
					function(val, row, col){return .9*val;},
					function(oldval,newval){return (oldval*.1+newval*.9)},
					function(row,col){
						var retval = false;
						try{
							retval = game.map[row][col].type !== game.landTypes.WATER && game.map[row][col].type !== game.landTypes.UNKNOWN;
						} catch (e){
							game.log("error when looking up " + row + "-" + col);
						}
						return retval;
						},
					function(row,col){
						if(myHillMap[row][col] == 2){
							return .1;
							//return null;
						} else {
							return null;
						}
					
						
					});
		
		if(game.timeLeft() < 100){
			this.executeMoves();
			game.log("Bailing because we only have " + game.timeLeft() + " time left");
			game.finishTurn();
			return;
		};

		game.log("Diffusing enemy ant hills tiles on explore map");
		
		this.buildMap(game.enemyHills,
					this.exploreMap,
					30,
					true,
					function(val, row, col){return .9*val;},
					function(oldval,newval){return (oldval+newval)},
					function(row,col){
						var retval = false;
						try{
							retval = game.map[row][col].type !== game.landTypes.WATER && game.map[row][col].type !== game.landTypes.UNKNOWN;
						} catch (e){
							game.log("error when looking up " + row + "-" + col);
						}
						return retval;
						},
					function(row,col){
						if(myHillMap[row][col] == 2){
							return .1;
							//return null;
						} else {
							return null;
						}
					});
		
		*/
		
		
		//PRINTMAP
		/*
		for(var c=0;c<game.config.cols;c++){
			for(var r=0;r<game.config.rows;r++){
				if(this.exploreMap[r][c] > 0){
				game.viz_setFillColor(55,0,0,this.exploreMap[r][c]/10.0);
				game.viz_tile({"row":r,"col":c},0);
				}
			}
		}			
		*/
		if(game.timeLeft() < 100){
			this.executeMoves();
			game.log("Bailing because we only have " + game.timeLeft() + " time left");
			game.finishTurn();
			return;
		};

		game.log("figuring out which food can be reached within 10 turns by looking on the reacahble map");
		var reachableFood = [];
		
		for(var i = 0; i<game.food.length; i++){
			var f = game.food[i];
			//game.log("checking food at " +f.row + "-" + f.col + " which has a reachable val of " + reachableMap[f.row][f.col]);
			if(this.reachableMap[f.row][f.col] > 0){
			
				reachableFood.push(f);
				//game.viz_setFillColor(255,0,0,.9);
				//game.viz_tile({"row":f.row,"col":f.col},0);
			
			}
		}
		
		game.log("Found " + reachableFood.length + " food tiles that I can easily reach");
		
		if(game.timeLeft() < 100){
			game.log("Bailing because we only have " + game.timeLeft() + " time left");
			game.finishTurn();
			return;
		};

		
		if(!this.reachableFoodAntMap || !this.reachableFoodAnts || game.currentTurn%2 == 1){
			game.log("building a map of reachable food so I can figuring out what ants are in the running");
			
			this.reachableFoodAntMap = [];
			this.buildMap(reachableFood,
						this.reachableFoodAntMap,
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
			
			this.reachableFoodAnts = [];
			
			for (var antI in game.myAnts) {
				var ant = game.myAnts[antI];
				if(this.reachableFoodAntMap[ant.row][ant.col] > 0){
					this.reachableFoodAnts.push(ant);
					//game.viz_setFillColor(0,255,0,.9);
					//game.viz_tile({"row":ant.row,"col":ant.col},0);
				
				}
			}
			
		

			game.log("Found " + this.reachableFoodAnts.length + " ants elilble for food gathering duty");
		}
		
		if(game.timeLeft() < 100){
			this.executeMoves();
			game.log("Bailing because we only have " + game.timeLeft() + " time left");
			game.finishTurn();
			return;
		};
		var foodSegments = new BinaryHeap(function(node){return node.dist});

		
		for (var antI in this.reachableFoodAnts) {
			var ant = this.reachableFoodAnts[antI];
			
			for (var foodI in reachableFood) {
				var food = reachableFood[foodI];
				var dist = game.distance(ant.row,ant.col,food.row,food.col);
				//game.log("pushing dist " + dist + " " + ant.row + "-" + ant.col + " for food " + food.row + "-" + food.col);
				foodSegments.push({"ant":ant,"food":food,"dist":dist});
			}
		}
		
		if(game.timeLeft() < 100){
			this.executeMoves();
			game.log("Bailing because we only have " + game.timeLeft() + " time left");
			game.finishTurn();
			return;
		};

		game.log("found " + foodSegments.size() + " food-ant segments");
		//game.log("shortest food segment is of distance " +foodSegments.pop().dist);
		
		var foodClaimed = {};
		var foodAntBusy = {};
		
		//game.viz_setLineColor(0,0,255,1.0);
		while(foodSegments.size()>0){
			var seg = foodSegments.pop();
			
			//game.log("checking food segment with food at " + seg.food.row + '-' + seg.food.col);
			
			if(!foodClaimed[seg.food.row + '-' + seg.food.col] && !foodAntBusy[seg.ant] && game.myAntAtTile[seg.ant.row + "-" + seg.ant.col]){
				
			
				for(var oldAntOrderI in foodAntBusy){
					var oldAntOrder = foodAntBusy[oldAntOrderI];
					var checkdist = oldAntOrder.dist + game.distance(oldAntOrder.food.row,oldAntOrder.food.col,seg.food.row,seg.food.col)
					if(checkdist < seg.dist && !foodClaimed[seg.food.row + '-' + seg.food.col]){
						//game.log("turns out sending somebody else to food at " + seg.food.row + "-" + seg.food.col + " is faster because " + checkdist + " is closer than " + seg.dist );	
						foodClaimed[seg.food.row + '-' + seg.food.col] = oldAntOrder.ant;
						foodAntBusy[oldAntOrder.ant] = {"ant":oldAntOrder.ant,"food":seg.food,"dist":checkdist};

						//game.viz_setLineColor(0,0,255,1.0);						
						//game.viz_line(seg.food,oldAntOrder.food);				
					}
				}
				
				if(!foodClaimed[seg.food.row + '-' + seg.food.col]){
					//game.viz_line(seg.food,seg.ant);
					foodClaimed[seg.food.row + '-' + seg.food.col] = seg.ant;
					foodAntBusy[seg.ant] = {"ant":seg.ant,"food":seg.food,"dist":seg.dist};
					//game.log("sending ant " + seg.ant + " to " + seg.food.row + '-' + seg.food.col);
					
					var curDest = seg.ant.getDestination();
					if(curDest == null || curDest.row !== seg.food.row || curDest.col !== seg.food.col){
						game.log("setting path for this segment");
						if(!this.aStarRun){
							astar.init();
							this.aStarRun = true;
						}
						var path = astar.search(seg.ant,seg.food, true);	
						game.log("done setting path for this segment");
						seg.ant.setPath(path);
						//game.viz_setLineColor(255,0,255,1.0);
						//game.viz_line(seg.food,seg.ant);		
					}
					
					this.antOrders[seg.ant] = seg.ant;
					
				}
			}
		
		}
		
		if(game.timeLeft() < 100){
			this.executeMoves();
			game.log("Bailing because we only have " + game.timeLeft() + " time left");
			game.finishTurn();
			return;
		};

		for(var antI in this.antOrders){
			var ant = this.antOrders[antI];
			var nextMove =ant.getNextMove();
			if(this.validMove(ant,nextMove)){
				//game.log("issuing order for ant " + ant + " at " + ant.row + "-" + ant.col + " to go " + nextMove);
				this.proposeMove(ant,nextMove);
				//game.viz_tile(this.proposedMoves[ant].nexttile,0);
			} else {
				delete this.antOrders[antI];
				ant.clearPath();
				game.log("food move direction order was no good for ant " + ant + " at " + ant.row + "-" + ant.col + " to go " + nextMove);
			}
			
		}
		
						
		//this.buildMap(game.food,exploreMap,5,true,function(val){return Math.max(0,val-1);},function(oldval,newval){return oldval+newval},function(row,col){return(game.map[row][col].type !== game.landTypes.WATER && game.map[row][col].type !== game.landTypes.UNKNOWN)});
		
		
		
		
		if(game.timeLeft() < 100){
			this.executeMoves();
			game.log("Bailing because we only have " + game.timeLeft() + " time left");
			game.finishTurn();
			return;
		};

		game.log("Proposing moves based on hill climbing");
		
		var bestDir = [directions[0]];
		for (var i in game.myAnts) {
			var ant = game.myAnts[i];
			if(!this.antOrders[ant]){
				var maxScent = 0;
				bestDir = [directions[0]];
				for (dirI in directions) {
					var dir = directions[dirI];
					var t = game.tileInDirection(ant.row,ant.col,dir);
					//game.log(" what i'm looking for" + util.inspect(t));
					try{
					if(maxScent < this.exploreMap[t.row][t.col] && this.validMove(ant,dir)){
						maxScent = this.exploreMap[t.row][t.col];
						bestDir = [dir];
					} else if (maxScent === this.exploreMap[t.row][t.col] && this.validMove(ant,dir)){
						bestDir.push(dir);
					}
					} catch (e){
						game.log("the error");
					}
				}
				ant.clearPath();
				
				this.proposeMove(ant, bestDir[Math.floor(Math.random()*(bestDir.length))]);
				
				//game.viz_tile(this.proposedMoves[ant].nexttile,0);
	
				
				//game.issueOrder(ant.row, ant.col, finalDir);
			}
			
		}
	
		
		
		
		
		if(game.timeLeft() < 100){
			this.executeMoves();
			game.log("Bailing because we only have " + game.timeLeft() + " time left");
			game.finishTurn();
			return;
		};

		game.log("Calculating ants that may be in battle");
		
		var potentialBattleAnts = this.calculatePotentialBattleAnts();
		var potentialBattleAntsSize = 0;
		for(var pA in potentialBattleAnts){
			potentialBattleAntsSize++;
		}
		
		
		if(game.timeLeft() < 100){
			this.executeMoves();
			game.log("Bailing because we only have " + game.timeLeft() + " time left");
			game.finishTurn();
			return;
		};

		game.log("Adding proposed moves for enemy ants");
		
		/*
		for(var pA in potentialBattleAnts){
			var p = potentialBattleAnts[pA];
			if(p.ant.owner > 0){
				this.proposeMove(p.ant,"A");
			}
			
		}
		*/
		// moving some enemy ants for the heck of it
		for(var eI in game.enemyAnts){
			var e = game.enemyAnts[eI];
			
			//game.log("checking " + e);
			if(this.reachableMap[e.row][e.col] > 8){
				
				var maxScent = 0;
				var finalDir = directions[0];
				for (dirI in directions) {
					var dir = directions[dirI];
					var t = game.tileInDirection(e.row,e.col,dir);
					
					
					if(maxScent < this.reachableMap[t.row][t.col]){
						maxScent = this.reachableMap[t.row][t.col];
						finalDir = dir;
					}
					
				}
				
				var t = game.tileInDirection(e.row,e.col,finalDir);
				//e.row = t.row;
				//e.col = t.col;
				
				
				this.proposeMove(e,finalDir);
				game.viz_tile(this.proposedMoves[e].nexttile,0);
			}
		}
		
		if(game.timeLeft() < 50){
			this.executeMoves();
			game.log("Bailing because we only have " + game.timeLeft() + " time left");
			game.finishTurn();
			return;
		};
		
		game.log("Calculating initial battles");
				
		this.conflicts = {};
		
		for(var pA in potentialBattleAnts){
			var p = potentialBattleAnts[pA];

			// only need to add my guys becuase this will automatically add my enemies
			if(p.ant.owner == 0){
				this.addAntToConflict(p);		
			}
		}
		
		
		if(game.timeLeft() < 50){
			this.executeMoves();
			game.log("Bailing because we only have " + game.timeLeft() + " time left");
			game.finishTurn();
			return;
		};

		game.log("building enemy and hill heat");
		// calculating enemy heat stuffs
		var dangermap = [];
		this.buildMap(game.enemyAnts,
					dangermap,
					(Math.floor(Math.sqrt(game.config.attackradius2))+4),
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
					
		this.buildMap(game.enemyHills,
					dangermap,
					30,
					true,
					function(val){return Math.max(0,val-10);},
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
		
		/*
		for(var cI in this.conflicts){
			var c = this.conflicts[cI];
			
			if(c.length){
			
				var p = potentialBattleAnts[cI];
				game.log("checking conflict " + p.ant);
				var result = this.calculateLocalBattleOutcome(p.ant);
				game.log("conflict for ant " + p.ant.debugString() + "results in " + result.friends + " friend deaths and " + result.enemies + " enemy deaths");
			}
			
		}
		
		for(var pA in potentialBattleAnts){
			var p = potentialBattleAnts[pA];
			
				if(this.conflicts[p.ant] && this.conflicts[p.ant].length > 0){
					var oldConflict = this.conflicts[p.ant][0];
					game.log("attempting to remove " + p.ant + " from conflict");
					game.log("checking 1 conflict this guy had... that guy had this many conflicts: " + this.conflicts[oldConflict].length);
					this.removeAntFromConflicts(p.ant);		
					
					game.log("do we still have an old conflict? " + this.conflicts[p.ant]);
					game.log("how many does that old guy have?" + this.conflicts[oldConflict].length);
					
				}
		}
		*/
		
		if(game.timeLeft() < 50){
			this.executeMoves();
			game.log("Bailing because we only have " + game.timeLeft() + " time left");
			game.finishTurn();
			return;
		};

		var convergedBattleAnts = {};
		
		var evalCount = 0;
		var directions =["A","N","S","E","W"];
		
		var continueRunning = true;
		
		var directions = ["A","N","S","E","W"];
				
		while(/*evalCount < 100 &&  */game.timeLeft()>75 && continueRunning){
			
			var rk = randomKey(potentialBattleAnts);
			
			if(!rk){
			 continueRunning = false;
			}
						
			if(continueRunning){
				// choose my ant;
				var ant = potentialBattleAnts[rk].ant;
				evalCount++;
				
				//game.log("trying ant " + ant.debugString());
				
			
				var currentBattleOutcome = this.calculateLocalBattleOutcome(ant);
				var currentDirection = this.proposedMoves[ant].dir;
				
				var maxScore = -100000;
				
				if(ant.owner > 0)
					maxScore = currentBattleOutcome.enemies * 10000 - currentBattleOutcome.friends*8000 + this.reachableMap[this.proposedMoves[ant].nexttile.row][this.proposedMoves[ant].nexttile.col];
				else 
					maxScore =  currentBattleOutcome.enemies * 8000 - currentBattleOutcome.friends*10000 + dangermap[this.proposedMoves[ant].nexttile.row][this.proposedMoves[ant].nexttile.col];
				
				/*
				if(currentBattleOutcome.enemies > currentBattleOutcome.friends){
					for(var aI in currentBattleOutcome.affected){
						var a = currentBattleOutcome.affected[aI];
						if(a.owner === ant.owner && a != ant){
							var pa = this.proposedMoves[a];
							//game.log("this guy (" + a + ") helped me (" + ant + ") out.  giving him props by adding stuff to his distro " + pa.dir);
							a.distro[pa.dir] += 1;		
							a.distro.count+=1;	
						}
					}
				}
				*/
				
				var maxScoreDir = [currentDirection];
				
				for(var dI in directions){
					
					var d= directions[dI];
				
					if(this.validMove(ant,d) && d != currentDirection){
						//game.log("trying direction " + d);
						this.removeAntFromConflicts(ant);
						this.proposeMove(ant,d);
						this.addAntToConflict(potentialBattleAnts[ant]);
						var newBattleOutcome = this.calculateLocalBattleOutcome(ant);
						var score = 0;
						if(ant.owner > 0)
							score = newBattleOutcome.enemies * 10000 - newBattleOutcome.friends*8000 + this.reachableMap[this.proposedMoves[ant].nexttile.row][this.proposedMoves[ant].nexttile.col];
						else 
							score =  newBattleOutcome.enemies * 8000 - newBattleOutcome.friends*10000 + dangermap[this.proposedMoves[ant].nexttile.row][this.proposedMoves[ant].nexttile.col];
							
						if(newBattleOutcome.enemies > newBattleOutcome.friends){
							for(var aI in newBattleOutcome.affected){
								var a = newBattleOutcome.affected[aI];
								if(a.owner === ant.owner && a != ant){
									var pa = this.proposedMoves[a];
									//game.log("this guy (" + a + ") helped me (" + ant + ") out.  giving him props by adding stuff to his distro " + pa.dir);
									a.distro[pa.dir] += 1;		
									a.distro.count+=1;
								}
							}
						}
						
						//game.log("Ant: " + ant.debugString() + " Score for direction " + d + " was " + score);
						if(score === maxScore){
							maxScoreDir.push(d);
						} else if(score >= maxScore){
							maxScoreDir = [d];
							maxScore = score;
						}
						
					}
					
				}
				
				
				
				for(var dI in maxScoreDir){
					var d = maxScoreDir[dI];
					ant.distro.count +=1;
					ant.distro[d] +=1;
				}
				
				//game.log("best direction was " + util.inspect(maxScoreDir) + " with score " + maxScore + " new distro " + util.inspect(ant.distro));
				//game.log("distro count " + ant.distro.count);
			
				// CHOOSE A RANDOM FROM THE SAMPLE
				
				var theCount = Math.floor(Math.random()*(ant.distro.count));
				//game.log("randomly chose " + theCount);
				var moveDir="W";
				for(var dI in directions){
					var d= directions[dI];
					
					theCount -= ant.distro[d];
					//game.log("count down to " + theCount);
					if(theCount < 0){
						moveDir = d;
						break;
						
					}
				}
				
				//game.log("randomly chose to go " + moveDir);
				this.removeAntFromConflicts(ant);
				this.proposeMove(ant,moveDir);
				this.addAntToConflict(potentialBattleAnts[ant]);
				
			}
			
			
		 }
		 
		if(game.timeLeft() < 20){
			this.executeMoves();
			game.log("Bailing because we only have " + game.timeLeft() + " time left");
			game.finishTurn();
			return;
		};

		 game.log("was able to burn through " + evalCount + " evals for " + potentialBattleAntsSize + " ants at a rate of " + (evalCount/potentialBattleAntsSize) + " evals per ant");
	 	
		
		for(var antI in potentialBattleAnts){
			var realMoveScore = -10000;
			var realMoveDir = "N";
			var ant = potentialBattleAnts[antI].ant;
			for(var dI in ant.distro){
				
				if(dI != "count"){
					if(ant.distro[dI] > realMoveScore){
						realMoveDir = dI;
						realMoveScore = ant.distro[dI];
					} else if (ant.distro[dI] == realMoveScore){
						if(Math.random()>.5){
							realMoveDir = dI;
							realMoveScore = ant.distro[dI];
						}
					}
				}
			}
			if(this.validMove(ant,realMoveDir)){
			
				this.removeAntFromConflicts(ant);
				this.proposeMove(ant,realMoveDir);
				this.addAntToConflict(potentialBattleAnts[ant]);	
			}
		}
		for(var antI in potentialBattleAnts){
			var realMoveScore = -10000;
			var realMoveDir = "N";
			var ant = potentialBattleAnts[antI].ant;
			for(var dI in ant.distro){
				
				if(dI != "count"){
					if(ant.distro[dI] > realMoveScore){
						realMoveDir = dI;
						realMoveScore = ant.distro[dI];
					} else if (ant.distro[dI] == realMoveScore){
						if(Math.random()>.5){
							realMoveDir = dI;
							realMoveScore = ant.distro[dI];
						}
					}
				}
			}
			if(this.validMove(ant,realMoveDir)){
			
				//game.log("decided to move ant to " + realMoveDir + " in the end with a score of " + realMoveScore);
				this.removeAntFromConflicts(ant);
				this.proposeMove(ant,realMoveDir);
				this.addAntToConflict(potentialBattleAnts[ant]);	
			}
		}
		game.viz_setFillColor(255,255,0,.5);
		for(var pA in potentialBattleAnts){
			var ant = potentialBattleAnts[pA].ant;
			game.viz_tile(this.proposedMoves[ant].nexttile,0);
			game.log("Proposed Move Distro for ant " + ant + " at " + ant.row + "-" + ant.col + " is " + util.inspect(ant.distro) + " but ended up chosing " + this.proposedMoves[ant].dir);
		}
		// for(var antI in activeFriendAnts){
		//	var ant = activeFriendAnts[antI];
		//	game.log("Proposed Move Distro for ant " + ant + " at " + ant.row + "-" + ant.col + " is " + util.inspect(ant.distro) + " but ended up chosing " + this.proposedMoves[ant].dir);
		//}
		
		
		/*
		
		
		
		// BATTLE RESOLUTION UPDATE
		
		//1) Figure out what enemy ants there are that are within my range
		//game.viz_setFillColor(55,255,255,.9);
		
		game.log("finding enemy ants and moving them towards my guys");
		
		var activeEnemyAnts = [];
		for(var eI in game.enemyAnts){
			var e = game.enemyAnts[eI];
			
			if(reachableMap[e.row][e.col] > 8){
				
				
				var maxScent = 0;
				var finalDir = directions[0];
				for (dirI in directions) {
					var dir = directions[dirI];
					var t = game.tileInDirection(e.row,e.col,dir);
					//game.log(" what i'm looking for" + util.inspect(t));
					
					if(maxScent < reachableMap[t.row][t.col]){
						maxScent = reachableMap[t.row][t.col];
						finalDir = dir;
					}
					
				}
				
				var t = game.tileInDirection(e.row,e.col,finalDir);
				e.row = t.row;
				e.col = t.col;
				
				game.viz_tile(e,0);
				
				activeEnemyAnts.push(e);
			}
		}
		
		game.log("figuring otu which of my friends are in the path of this mofo " + (Math.floor(Math.sqrt(game.config.attackradius2))+2));
		
		
		var activeFriendAnts = [];
		var dangermap = [];
		var myProposedMap = this.proposedMovesMap;
		this.buildMap(activeEnemyAnts,
					dangermap,
					(Math.floor(Math.sqrt(game.config.attackradius2))+4),
					true,
					function(val){return Math.max(0,val-1);},
					function(oldval,newval){return newval},
					function(row,col){return true});
					
		for(moveI in this.proposedMoves){
			var move = this.proposedMoves[moveI];
			if(dangermap[move.nexttile.row][move.nexttile.col] > 0){
				game.log("adding " + move.ant + " who is right now at " + move.ant.row + "-" + move.ant.col + " but plans to go to " + move.dir);
				activeFriendAnts.push(move.ant);
				move.ant.clearPath();
			}
		}
		
	
		game.log("running simulations");
		
		
		var evalCount = 0;
		var directions =["A","N","S","E","W"];
		
		
		 while(game.timeLeft()>50 & activeFriendAnts.length > 0){
			evalCount++;
			
			var randomAnt = Math.floor(Math.random()*(activeFriendAnts.length));
			// choose an ant to do this for
			var myAnt = activeFriendAnts[randomAnt];
			var maxScore = -1000000;
			var maxScoreDir = ["A"];
			var maxScoreDirFinal = "A";
			//game.log("Evaluating myAnt for ant " + myAnt + " at " + myAnt.row + " with count of " + myAnt.distro.count + " at index of " + randomAnt);
			
			for(var dI in directions){
					
				var d= directions[dI];
			
				if(this.validMove(myAnt,d)){
					this.proposeMove(myAnt,d);
					var score = 0; //Math.random();
				
				
					// GENERATE SCORE
								
					
					var friendsInRangeOfEnemy = {"length":0};
					var enemiesInRangeOfFriend = {"length":0};
					
					var totalDistance = 0;
					
					for(var eI in activeEnemyAnts){
						var e = activeEnemyAnts[eI];
						for(var fI in activeFriendAnts){
							var f = activeFriendAnts[fI];
							var nextmove = this.proposedMoves[f];
							
							var distBetwix = game.distance2(e.row,e.col,nextmove.nexttile.row,nextmove.nexttile.col);
							if(distBetwix < 15){
								totalDistance += distBetwix;	
							} else {
								totalDistance +=15;
							}
							if(distBetwix <= game.config.attackradius2){
							
								if(evalCount < 10){
									//game.log("found a case where there is going to be an attack between enemy at " + e.row + "-" + e.col + " and friend " + nextmove.nexttile.row + "-" + nextmove.nexttile.col);
								}
								if(!friendsInRangeOfEnemy[e.row + "-" + e.col]){
									friendsInRangeOfEnemy[e.row + "-" + e.col] = {"length":0};
								}
								if(!friendsInRangeOfEnemy[e.row + "-" + e.col][nextmove.nexttile.row + "-" + nextmove.nexttile.col]){
									friendsInRangeOfEnemy[e.row + "-" + e.col][nextmove.nexttile.row + "-" + nextmove.nexttile.col] = 1;
									friendsInRangeOfEnemy[e.row + "-" + e.col]["length"] +=1;
								}

								if(!enemiesInRangeOfFriend[nextmove.nexttile.row + "-" + nextmove.nexttile.col]){
									enemiesInRangeOfFriend[nextmove.nexttile.row + "-" + nextmove.nexttile.col] = {"length":0};
								}
								if(!enemiesInRangeOfFriend[nextmove.nexttile.row + "-" + nextmove.nexttile.col][e.row + "-" + e.col]){								
									enemiesInRangeOfFriend[nextmove.nexttile.row + "-" + nextmove.nexttile.col][e.row + "-" + e.col] = e;
									enemiesInRangeOfFriend[nextmove.nexttile.row + "-" + nextmove.nexttile.col]["length"] +=1;
								}
							}
						}
					}
					
					var deadFriends = {"length":0};
					var deadEnemies = {"length":0};
					
					for(fI in activeFriendAnts){
						var f = activeFriendAnts[fI];
						var nextmove = this.proposedMoves[f];
						if(enemiesInRangeOfFriend[nextmove.nexttile.row + "-" + nextmove.nexttile.col]){
							for(var eI in enemiesInRangeOfFriend[nextmove.nexttile.row + "-" + nextmove.nexttile.col]){
								if(eI !== "length"){
									var e = enemiesInRangeOfFriend[nextmove.nexttile.row + "-" + nextmove.nexttile.col][eI];
									
									if(enemiesInRangeOfFriend[nextmove.nexttile.row + "-" + nextmove.nexttile.col].length > friendsInRangeOfEnemy[e.row + '-' + e.col].length){
										if(!deadFriends[nextmove.nexttile.row + "-" + nextmove.nexttile.col]){
											deadFriends[nextmove.nexttile.row + "-" + nextmove.nexttile.col] = 1;
											deadFriends.length +=1;
											if(evalCount < 10){
												//game.log("friend at " + nextmove.nexttile.row + "-" + nextmove.nexttile.col + " slated to die");
											}
										}
									} else if (enemiesInRangeOfFriend[nextmove.nexttile.row + "-" + nextmove.nexttile.col].length < friendsInRangeOfEnemy[e.row + '-' + e.col].length){
										if(!deadEnemies[e.row + '-' + e.col]){
											deadEnemies[e.row + '-' + e.col] = 1;
											deadEnemies.length +=1;
											if(evalCount < 10){
												//game.log("enemy at " + e.row + '-' + e.col + " slated to die");
											}
										}
									} else {
										if(evalCount < 10){
											//game.log("both friend and enemy dies");
										}
										if(!deadFriends[nextmove.nexttile.row + "-" + nextmove.nexttile.col]){
											deadFriends[nextmove.nexttile.row + "-" + nextmove.nexttile.col] = 1;
											deadFriends.length +=1;
										}
										if(!deadEnemies[e.row + '-' + e.col]){
											deadEnemies[e.row + '-' + e.col] = 1;
											deadEnemies.length +=1;
										}
									}
								}
								
							}
						
						}
					
					}
					
					score = deadEnemies.length * 8000 - totalDistance - deadFriends.length*10000;
					
					//if(evalCount < 10){
					//	game.log("the outcome of this move by " + myAnt + " in the direction of " + d + "would be " + deadFriends.length + " dead friends and " + deadEnemies.length + " dead enemies ");
					//	game.log("the current max score is " + maxScore + " and this will generate a score of " + score);	
					//}
					
					
					
					//game.log("if we went " + d + " we would have a score of " + score);
					if(score == maxScore){
						maxScoreDir.push(d);
					} else if(score > maxScore){
						maxScoreDir = [d];
						maxScore = score;
					}
				}
			}
			
			//game.log("best score is " + maxScore + " in teh direction of " + maxScoreDir);
			
			var r = Math.floor(Math.random()*maxScoreDir.length);
			
			var maxScoreDirFinal = maxScoreDir[r];
			
			//game.log("ended up choosing " + maxScoreDirFinal + " with index of " + r);

			
			// UPDATE DISTRO
			myAnt.distro.count +=1;
			myAnt.distro[maxScoreDirFinal] +=1;
			
			//game.log("distro count " + myAnt.distro.count);
			
			// CHOOSE A RANDOM FROM THE SAMPLE
			
			var theCount = Math.floor(Math.random()*(myAnt.distro.count));
			//game.log("randomly chose " + theCount);
			var moveDir="W";
			for(var dI in directions){
				var d= directions[dI];
				
				theCount -= myAnt.distro[d];
				//game.log("count down to " + theCount);
				if(theCount < 0){
					moveDir = d;
					break;
					
				}
			}
			
			//game.log("randomly chose to go " + d);
			this.proposeMove(myAnt,moveDir);
		 
		 
		 }
		
		game.log("had time to evaluate " + evalCount + " scenarios");
		
		*/

		this.executeMoves();
		//for(var antI in activeFriendAnts){
		//	var ant = activeFriendAnts[antI];
		//	game.log("Proposed Move Distro for ant " + ant + " at " + ant.row + "-" + ant.col + " is " + util.inspect(ant.distro) + " but ended up chosing " + this.proposedMoves[ant].dir);
		//}
		
		game.finishTurn();
    },
    'onEnd': function() {
    
    },
	
	'executeMoves': function(){
		game.log("Executing the moves now");
		for(var moveI in this.proposedMoves){
			var move = this.proposedMoves[moveI];
			if(move.ant.owner == 0){
				try{
			
					//game.log("issuing if i can send ant " + move.ant + " at " + move.ant.row + "-" + move.ant.col + " in the direction of " + move.dir);
				
					game.issueOrder(move.ant.row,move.ant.col,move.dir);	
				} catch (e){
					game.log("error executing move");
				}
			}
		}
		
	},
	
	'buildMap': function(goals,maptobuild,goalsize,attractor,diffusion,blend,validtile, forceValue, exec) {
			
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
			if(g.goalsize){
				goalsize = g.goalsize;
			}
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
					if(forceValue && forceValue(node.row,node.col)) {
						tmpMap[node.row][node.col] = forceValue(node.row,node.col);
					} else {
						tmpMap[node.row][node.col] = node.size;
					}
					maptobuild[node.row][node.col] = blend(maptobuild[node.row][node.col], node.size*multiplier);
					
					//if(game.enemyHills[node.row + "-" + node.col]){
					//	game.log("done setting real stuff, to " + maptobuild[node.row][node.col]);
					//}
					visitedTiles[node.row + "-" + node.col] = 1;
					
					if(exec)
						exec(node.row,node.col, node.size);
						
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
	"calculateLocalBattleOutcome": function(ant, ignore){
		var results = {"friends":0,"enemies":0, "affected":[]};
		
		//game.log("calculating local battle outcome for ant " + ant.debugString());
		
		if(!ignore){
			ignore = {};
		}
		
		ignore[ant] = 1;
		
				
		var antConflicts = this.conflicts[ant];
		var myFocus = (antConflicts ? antConflicts.length : 0 );
		var dead = false;
		
		results.affected.push(ant);
		
		for(var eI in antConflicts){
			var e = antConflicts[eI];
			
			var nextConflict = this.conflicts[e];
			//game.log("I have " + myFocus + " while ant " + e.debugString() + " has " + nextConflict.length);
			if(myFocus >= nextConflict.length){
				dead = true;
			}
			
			if(!ignore[e]){
				var res = this.calculateLocalBattleOutcome(e,ignore);
				results.friends+= res.enemies;
				results.enemies+= res.friends;
				for(aI in res.affected){
					results.affected.push(res.affected[aI]);
				}
			}
		}
		
		if(dead){
			results.friends += 1;
			//game.log("ant " + ant.debugString() + " will die ");
		} else {
			
			//game.log("ant " + ant.debugString() + " will live ");
		}
		
		return results; 
		
	},
	"calculatePotentialBattleAnts": function(){
		
		var potentialBattleAnts = {};
		for(var antI in game.myAnts){
			var ant = game.myAnts[antI];
			if(ant.path.length === 0){
				game.evalOffset(this.proposedMoves[ant].nexttile, game.config.attackradius2 + 20, function(row,col){
						var enemyAnt = game.enemyAntAtTile[row + "-" + col];
						if(enemyAnt){
						
							if(!potentialBattleAnts[enemyAnt]){
								potentialBattleAnts[enemyAnt] = {"ant":enemyAnt,"enemies":[]};
							}
							potentialBattleAnts[enemyAnt].enemies.push(ant);
							if(!potentialBattleAnts[ant]){
								potentialBattleAnts[ant] =  {"ant":ant,"enemies":[]};
							}
							potentialBattleAnts[ant].enemies.push(enemyAnt);
						}
					
					});
			}
		}

		game.viz_setLineColor(255,0,0,.5);

		for(var antI in potentialBattleAnts){
			var ant = potentialBattleAnts[antI].ant;
			for(eI in potentialBattleAnts[antI].enemies){
				var e = potentialBattleAnts[antI].enemies[eI];
						
				game.viz_line(e,ant);
				
			}
		
		}

		return potentialBattleAnts;
	
	},
	
	
	"addAntToConflict" : function(potentialBattleAnt){
		//game.log("checking potential battle for ant " + potentialBattleAnt.ant.debugString());
		this.conflicts[potentialBattleAnt.ant] = [];
		var an = this.proposedMoves[potentialBattleAnt.ant].nexttile;
		
		for(var peI in potentialBattleAnt.enemies){
			var pe=potentialBattleAnt.enemies[peI];
			var pen = this.proposedMoves[pe].nexttile;
			//game.log("-- checking against  " + pen.row + " " + pen.col + " " + "---" + an.row + " " + an.col);
			
			
			if(game.distance2(pen.row,pen.col, an.row, an.col) <= game.config.attackradius2){
			//	game.log("--- found a battle between " + pe + " and " + potentialBattleAnt.ant);
				
				this.conflicts[potentialBattleAnt.ant].push(pe);
				
				if(!this.conflicts[pe]){
						this.conflicts[pe] = [];
				}
				
				this.conflicts[pe].push(potentialBattleAnt.ant);

			} else {
				//game.log("--- its too far " + game.distance2(pen.row,pen.col, an.row, an.col));
			}
		}
	},
	
	"removeAntFromConflicts": function(ant){
		if(this.conflicts[ant] && this.conflicts[ant].length > 0){
			
			for(var cI in this.conflicts[ant]){
				var c = this.conflicts[ant][cI];
				
				var indexOfMe = this.conflicts[c].indexOf(ant);
				if(indexOfMe!=-1){
					this.conflicts[c].splice(indexOfMe,1);
				}
				
			}
			delete this.conflicts[ant];
		}
	},
	/*
	"commitMove":function(ant,direction){
		
		ant.distro.direction +=1;
		ant.distro.count +=1;
		
		this.proposeMove(ant,direction);
	},
	*/
	"proposeMove":function(ant,direction){
		//game.log("proposeMove: proposing if i can send ant " + ant + " at " + ant.row + "-" + ant.col + " in the direction of " + direction);
		//if(this.proposedMove[ant])delete this.proposedMove[ant];

		var tileInDir = game.tileInDirection(ant.row,ant.col,direction);
		this.proposedMoves[ant]=({"ant":ant,"dir":direction,"nexttile":{"col":tileInDir.col,"row":tileInDir.row}});
		
		this.proposedMovesMap[tileInDir.row][tileInDir.col] = ant;
		this.proposedMovesMap[ant.row][ant.col] = null;

	},
	
	"validMove":function(ant,direction){
	
		try{
			//game.log("checking if i can send ant " + ant + " at " + ant.row + "-" + ant.col + " in the direction of " + direction);
			var tileInDir = game.tileInDirection(ant.row,ant.col,direction);
			return (this.proposedMovesMap[tileInDir.row][tileInDir.col] == null || this.proposedMovesMap[tileInDir.row][tileInDir.col] == ant) && game.map[tileInDir.row][tileInDir.col].type === game.landTypes.LAND;
		} catch (e){
			game.log("ERRRORRRR");
		}
		return false;

	},

}
game.start(bot);

function randomKey(obj) {
    var ret;
    var c = 0;
    for (var key in obj)
        if (Math.random() < 1/++c)
           ret = key;
    return ret;
}


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
		