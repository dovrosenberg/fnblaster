var Game = function Game(graph, settings) {
	this._graph = graph;
	this.settings = extend(object(Game.defaultSettings), this.settings || {});
};

// static
Game.defaultSettings = {
	numBlockers: 3,
	numTargets: 4
};

Game.prototype = {
	startGame: function() {
		this._graph.drawGrid();
	}
};