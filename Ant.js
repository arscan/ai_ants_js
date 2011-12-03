var antID = 0;

exports.Ant = function(row,col){
	this.row = row;
	this.col = col;
	this.antID = antID++;
}

exports.Ant.prototype.toString = function(){
	return '' + this.antID;
}


