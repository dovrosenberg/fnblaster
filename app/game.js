function Game(graph) {
	var _graph = graph;
	
	this.blockers = [];
	this.targets = [];
	
	this.blockers = getLocations(_graph, 3);
	this.targets = getLocations(_graph, 4);

	this.drawTargets = function() {
		for (i=0; i<this.targets.length; i++)
			drawTarget(_graph, this.targets[i][0], this.targets[i][1]);
	}

	this.drawBlockers = function() {
		for (i=0; i<this.blockers.length; i++)
			drawBlocker(_graph, this.blockers[i][0], this.blockers[i][1]);
	}
};