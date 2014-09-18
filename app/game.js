var Game = function Game(graph) {
	var _graph = graph;
	
	var _defaultSettings = {
		numBlockers: 3,
		numTargets: 4
	};
	
	// XXX: Changes to Game._defaultSettings will affect existing Game objects. Is that the Right Thing?
	this.settings = extend(object(Game._defaultSettings), this.settings || {});
	
	this.startGame = function() {
		graph.loadBlockersTargets(this.settings.numBlockers, this.settings.numTargets);
	};
	
};

