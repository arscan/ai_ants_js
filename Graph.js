/* 	graph.js http://github.com/bgrins/javascript-astar
	MIT License
	
	Creates a Graph class used in the astar search algorithm.
	Includes Binary Heap (with modifications) from Marijn Haverbeke 
		URL: http://eloquentjavascript.net/appendix2.html
		License: http://creativecommons.org/licenses/by/3.0/
*/

var BinaryHeap = require('./BinaryHeap').binaryHeap;

if (!Array.prototype.indexOf) {
Array.prototype.indexOf = function(elt /*, from*/) {
	var len = this.length;
	var from = Number(arguments[1]) || 0;
	from = (from < 0) ? Math.ceil(from) : Math.floor(from);
	if (from < 0) {
		from += len;
	}
	for (; from < len; ++from) {
		if (from in this && this[from] === elt) {
	    	return from;
	    }
	}
	return -1;
};
}

if (!Array.prototype.remove) {
Array.prototype.remove = function(from, to) {
	var rest = this.slice((to || from) + 1 || this.length);
	this.length = from < 0 ? this.length + from : from;
	return this.push.apply(this, rest);
};
}

var GraphNodeType = { OPEN: 0, WALL: 1 };
function Graph(grid) {
	this.elements = grid;
	this.nodes = [];

	for (var x = 0, len = grid.length; x < len; ++x) {
		var row = grid[x];
		this.nodes[x] = [];
		for (var y = 0, l = row.length; y < l; ++y) {
			this.nodes[x].push(new GraphNode(x, y, row[y]));
		}
	}
}
Graph.prototype.toString = function() {
	var graphString = "\n";
	var nodes = this.nodes;
	for (var x = 0, len = nodes.length; x < len; ++x) {
		var rowDebug = "";
		var row = nodes[x];
		for (var y = 0, l = row.length; y < l; ++y) {
			rowDebug += row[y].type + " ";
		}
		graphString = graphString + rowDebug + "\n";
	}
	return graphString;
};

function GraphNode(x,y,type) {
	this.data = { };
	this.x = x;
	this.y = y;
	this.pos = {x:x, y:y};
	this.type = type;
}
GraphNode.prototype.toString = function() {
	return "[" + this.x + " " + this.y + "]";
};
GraphNode.prototype.isWall = function() {
	return this.type == GraphNodeType.WALL;
};


exports.graph = Graph;

