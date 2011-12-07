var antID = 0;

exports.Ant = function(row,col){
	this.row = row;
	this.col = col;
	this.antID = antID++;
	this.path = [];
	this.currentPathIndex = 0;
}

exports.Ant.prototype.toString = function(){
	return '' + this.antID;
}

exports.Ant.prototype.setPath = function(path){
	this.path = path;
	this.currentPathIndex = 0;
}

exports.Ant.prototype.getNextMove = function(){
	if(!this.path){
		return [];
	}
	if(this.currentPathIndex+1 >= this.path.length){
		this.currentPathIndex = 0;
		this.path.length = 0;
		return [];
	}
	
	var nextMoveDir = 'N';
	if(this.row-this.path[this.currentPathIndex].x == -1 || this.row-this.path[this.currentPathIndex].x > 1){
		nextMoveDir = 'S';
	} else if(this.row-this.path[this.currentPathIndex].x == 1 || this.row-this.path[this.currentPathIndex].x <-1) {
		nextMoveDir = 'N';
	} else if(this.col-this.path[this.currentPathIndex].y == -1 || this.col-this.path[this.currentPathIndex].y > 1) {
		nextMoveDir = 'E';
	} else if(this.col-this.path[this.currentPathIndex].y == 1 || this.col-this.path[this.currentPathIndex].y <-1) {
		nextMoveDir = 'W';
	}
	
	this.currentPathIndex++;
	
	if(this.currentPathIndex+1 == this.path.length){
		this.path = [];
		this.currentPathIndex = 0;
	}
	
	return nextMoveDir;
}

exports.Ant.prototype.getDistanceRemaining = function(){
	return this.path.length - (this.currentPathIndex);
}

exports.Ant.prototype.getDestination = function(){
	if(this.path.length > 0){
		return this.path[this.path.length-1];
	} else {
		return null;
	}

}

exports.Ant.prototype.clearPath = function(){
	this.path = [];
	this.currentPathIndex =0;
}



