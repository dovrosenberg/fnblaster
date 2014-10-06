var MiniGame = function MiniGame() {
	// public properties;
	this.blockers = [];
	this.targets = [];
	this.moves = [];		// each move is a string showing the functional form
}

// data should be JSON for the object or null
var HiScores = function HiScores() {
	// private variables
	this._difficulty;   // the difficulty level of this set of scores  (E,M, or H)
	
	// public properties
	this.numScores = 0;		// in case there are less than the max # tracked
	this.scores = [];	// the actual scores (index 0 is the top one)
	this.names = [];
	this.miniGames = [];
};

// static properties
var HiScores.maxScores = 10;		// the number of scores to track

HiScores.prototype = {
	// private methods

	// public methods
	saveToCookie: function() {
		saveToCookie(_difficulty,JSON.stringify(this));
	},
	
	loadFromCookie: function(difficulty) {
		this._difficulty = difficulty;
		
		var data = getCookie(difficulty);
		
		// populate the fields with data;
		extend(this,JSON.parse(data));
	},
	
	// returns the number of this score (i.e. 0 if it's the new top score)
	// returns -1 if not a top score
	getScoreNum: function(score) {
		if (this.numScores == 0)
			return 0;
			
		for (var i=0; i<this.numScores; i++)
			if (score > this.scores[i])
				return i;
		
		// worse than others but there's still room
		if (this.numScores<HiScores.maxScores)
			return this.numScores;
		
		// no more room; sorry :(
		return -1;
	},
	
	insertScore: function(score, name, miniGame) {
		// find the correct spot
		var insertSpot = getScoreNum(score);
		
		if (insertSpot!=-1) {
			this.scores.splice(insertSpot,0,score);
			this.names.splice(insertSpot,0,name);
			this.miniGames.splice(insertSpot,0,miniGame);
		
			numScores++;
		}
	}
};
