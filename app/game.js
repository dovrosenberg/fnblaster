var Game = function Game(graph) {
	var _graph = graph;
	
	var _defaultSettings = {
		numBlockers: 3,
		numTargets: 4
	};
	
	// XXX: Changes to Game._defaultSettings will affect existing Game objects. Is that the Right Thing?
	this.settings = extend(object(Game._defaultSettings), this.settings || {});
	
	var _blockers = [];
	var _targets = [];
	
	this.startGame = function() {
		_blockers = getLocations(_graph, this.settings.numBlockers);
		_targets = getLocations(_graph, this.settings.numTargets);
	};

	this.drawTargets = function() {
		for (i=0; i<_targets.length; i++)
			drawTarget(_graph, _targets[i][0], _targets[i][1]);
	};

	this.drawBlockers = function() {
		for (i=0; i<_blockers.length; i++)
			drawBlocker(_graph, _blockers[i][0], _blockers[i][1]);
	};
};

