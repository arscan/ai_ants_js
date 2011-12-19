/* BASED OFF THE FOLLOWING: */

/* 	astar.js http://github.com/bgrins/javascript-astar
	MIT License
	
	Implements the astar search algorithm in javascript using a binary heap
	**Requires graph.js**

	Example Usage:
		var graph = new Graph([
			[0,0,0,0],
			[1,0,0,1],
			[1,1,0,0]
		]);
		var start = graph.nodes[0][0];
		var end = graph.nodes[1][2];
		astar.search(graph.nodes, start, end);
*/

var util = require('util');
var AStarGraph = require('./AStarGraph').AStarGraph;

var BinaryHeap = require('./BinaryHeap').BinaryHeap;
var game = require('./Game').game;

var astar = {
	
	init:function(){
		
		this.grid = new AStarGraph(game.map);
	
	},
    
    search: function(s, e, allowUnknown, maxdist, heuristic) {
        if(!maxdist){
			maxdist = 1000;
		}
		game.log("running a*");
		//game.log("maxdist is " + maxdist);
		heuristic = heuristic || astar.manhattan;
		if(!allowUnknown){
			allowUnknown = false;
		} else {
			allowUnknown = true;
		}
		
		
		game.log("initializing stuff");
		//game.log(this.grid);
		
		
		game.log("initializing stuff2");	
		for(var x = 0, xl = this.grid.nodes.length; x < xl; x++) {
            for(var y = 0, yl = this.grid.nodes[x].length; y < yl; y++) {
            	var node = this.grid.nodes[x][y];
                node.f = 0;
                node.g = 0;
                node.h = 0;
                node.visited = false;
                node.closed = false;
                node.debug = "";
                node.parent = null;
            }
        }
		
		
		var start = this.grid.nodes[s.row][s.col];
		var end = this.grid.nodes[e.row][e.col];

		var openHeap = new BinaryHeap(function(node){return node.f;});
		openHeap.push(start);
		
		//game.log("AStarring at " + util.inspect(start));
		//game.log("Heap: " + util.inspect(openHeap,10));

        while(openHeap.size() > 0) {

        	// Grab the lowest f(x) to process next.  Heap keeps this sorted for us.
            var currentNode = openHeap.pop();
			//game.log("AStarring to " + currentNode);

		    // End case -- result has been found, return the traced path
		    if(currentNode === end) {
				//game.log("Done AStarring! " + end);
			    var curr = currentNode;
			    var ret = [];
				curr.row = curr.x;
				curr.col = curr.y;
			    while(curr.parent) {
				    ret.push(curr);
				    curr = curr.parent;
			    }
			    return ret.reverse();
		    }

		    // Normal case -- move currentNode from open to closed, process each of its neighbors
		    currentNode.closed = true;

			//game.log("A Starring: looking for neighbors " + util.inspect(neighbors,10));
			////game.log("grid: " + util.inspect(grid,10));
		    var neighbors = astar.neighbors(this.grid, currentNode);
			//game.log("A Starring: found neighbors " + util.inspect(neighbors,10));
		    for(var i=0, il = neighbors.length; i < il; i++) {
			    var neighbor = neighbors[i];
				
				//game.log("Checking Neighbor: " + util.inspect(neighbor,3));

			    if(neighbor.closed || neighbor.isWall()) {
				    // not a valid node to process, skip to next neighbor
					//game.log("neighbor closed or is a wall " + util.inspect(neighbor,3));
				    continue;
			    }

			    // g score is the shortest distance from start to current node, we need to check if
			    //   the path we have arrived at this neighbor is the shortest one we have seen yet
			    // 1 is the distance from a node to it's neighbor.  This could be variable for weighted paths.
			    var gScore = currentNode.g + 1;
			    var beenVisited = neighbor.visited;

			    if(gScore < maxdist && (!beenVisited || gScore < neighbor.g )) {

					//game.log("gscore is less... " + gScore + " than maxdist " + maxdist);
				    // Found an optimal (so far) path to this node.  Take score for node to see how good it is.
				    neighbor.visited = true;
				    neighbor.parent = currentNode;
				    neighbor.h = neighbor.h || heuristic(neighbor.pos, end.pos);
				    neighbor.g = gScore;
				    neighbor.f = neighbor.g + neighbor.h;
				    neighbor.debug = "F: " + neighbor.f + "<br />G: " + neighbor.g + "<br />H: " + neighbor.h;

				    if (!beenVisited) {
				    	// Pushing to heap will put it in proper place based on the 'f' value.
				    	openHeap.push(neighbor);
						
						//game.log("Pushing Neighbor " + util.inspect(neighbor,3));
				    }
				    else {
				    	// Already seen the node, but since it has been rescored we need to reorder it in the heap
						//game.log("Rescoring Neighbor " + util.inspect(neighbor,3));
				    	openHeap.rescoreElement(neighbor);
				    }
				}
		    }
        }

        // No result was found -- empty array signifies failure to find path
        return [];
    },
    manhattan: function(pos0, pos1) {
    	// See list of heuristics: http://theory.stanford.edu/~amitp/GameProgramming/Heuristics.html

        var d1 = Math.abs (pos1.x - pos0.x);
        var d2 = Math.abs (pos1.y - pos0.y);
        return Math.min(d1, game.config.cols - d1) + Math.min(d2, game.config.rows - d2);
    },
    neighbors: function(grid, node) {
        var ret = [];
	    var x = node.x;
	    var y = node.y;
		
		//this.game.log("------------");
		//this.game.log("trying at node: " + util.inspect(node));
		//this.game.log(util.inspect(grid));
		
		//this.game.log("grid.nodes[x-1] " + grid.nodes[x-1]);
		//  if(grid.nodes[x-1]) this.game.log("grid.nodes[x-1][y] " + grid.nodes[x-1][y]);
	    //if(grid.nodes[x-1] && grid.nodes[x-1][y]) {
		    ret.push(grid.nodes[((x-1)+grid.nodes.length)%grid.nodes.length][y]);
			
	    //}
		//this.game.log("grid.nodes[x+1] " + grid.nodes[x+1]);
		//if(grid.nodes[x+1]) this.game.log("grid.nodes[x+1][y] " + grid.nodes[x+1][y]);
	    //if(grid.nodes[x+1] && grid.nodes[x+1][y]) {
		    ret.push(grid.nodes[(x+1)%grid.nodes.length][y]);
			
	    //}
		//this.game.log("grid.nodes[x] " + grid.nodes[x]);
		//if(grid.nodes[x])this.game.log("grid.nodes[x][y-1] " + grid.nodes[x][y-1]);
	    //if(grid.nodes[x] && grid.nodes[x][y-1]) {
		    ret.push(grid.nodes[x][((y-1)+grid.nodes[x].length)%grid.nodes[x].length]);
			
	    //}
		//this.game.log("grid.nodes[x] " + grid.nodes[x]);
		//if(grid.nodes[x]) this.game.log("grid.nodes[x][y+1] " + grid.nodes[x][y+1]);
	    //if(grid.nodes[x] && grid.nodes[x][y+1]) {
		    ret.push(grid.nodes[x][(y+1)%grid.nodes[x].length]);
			
	    //}
	    return ret;
    }
};

exports.astar = astar;