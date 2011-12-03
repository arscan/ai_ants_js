exports.Tile = function(row,col){
	this.row = row;
	this.col = col;
}

exports.Tile.prototype.toString = function(){
	return '' + this.row;
}


