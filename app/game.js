(function($) {

function makeCanvas(w, h) {
	var c = document.createElement("canvas");
	c.width = w;
	c.height = h;
	c.style.width = w + "px";
	c.style.height = h + "px";
	return c;
}

function Overlay(canvas, x, y, w, h) {
	this.canvas = canvas;
	this.x = x;
	this.y = y;
	this.width = w;
	this.height = h;
	this.imageData = null;
	this.overlayCanvas = makeCanvas(w, h);
}

Overlay.prototype = {
	getContext: function() {
		return this.overlayCanvas.getContext("2d");
	},

	update: function() {
		var ctx = this.canvas.getContext("2d");
		if (ctx.getImageData && ctx.putImageData) {
			this.imageData = ctx.getImageData(this.x, this.y, this.width, this.height);
			ctx.save();
				ctx.setTransform(1, 0, 0, 1, 0, 0);
				ctx.drawImage(this.overlayCanvas, this.x, this.y);
			ctx.restore();
		}
	},

	erase: function() {
		var ctx = this.canvas.getContext("2d");
		if (this.imageData && ctx.putImageData) {
			ctx.putImageData(this.imageData, this.x, this.y);
		}
	},
};

$(function() {

function clearContext(c) {
	c.canvas.width = c.canvas.width;
};

function round(n, scale) {
	if (!scale) scale = 1/(n-1);
	scale = 1 / scale;
	return Math.round(scale * Math.round(n / scale) * 1e8) / 1e8;
}

function updatePosition(x, y) {
	var ctx = position.getContext();

	if (ctx.fillText || ctx.mozDrawText) {
		var spos = "(" + round(x, graph.scaleX) + ", " + round(y, graph.scaleY) + ")";
		position.erase();

		clearContext(ctx);

		ctx.save();
			if (ctx.fillText) {
				ctx.fillText(spos, 4, 14, position.width);
			}
			else {
				ctx.translate(4, 14);
				ctx.fillStyle = "black";
				ctx.mozDrawText(spos);
			}
		ctx.restore();

		position.update();
	}
}

function getNumber(s, def) {
	var x = parseFloat(s.trim());
	return isNaN(x) ? def : x;
}

function onoff(s) {
	return s == "on" || s == "1" || s == "true";
}

var score = 0;

function addToScore(numhits, fn) {
	score += (Math.pow(2,numhits)-1)*100;
	$("#score").text("Score: " + score);
}

var $gcanvas = $("#gcanvas");
var gcanvas = $gcanvas.get(0);
var position = new Overlay(gcanvas, 0, 0, 300, 20);

// create the graph and hiscores objects
var difficulty = location.search.replace(/^.*?\=/, '');

var diffSettings;

if (difficulty=="E")
	diffSettings = Graph.easySettings;
else if (difficulty=="M")
	diffSettings = Graph.mediumSettings;
else	
	diffSettings = Graph.hardSettings;
	
var hiScores = new HiScores(difficulty);

	// create the graph and setup the gameOverCallBack
var graph = new Graph(gcanvas, diffSettings, 
	function(miniGame) {
		// see if we have a high score
		if (hiScores.getScoreNum(score)!=-1) {
			//  if so, get their name and add it
			var name = window.prompt("Congratulations!  You have a high score!  Please enter your name.","");
			
			//  then update the cookies
			hiScores.insertScore(score,name,miniGame);
			hiScores.saveToCookie();
		}
	});
graph.drawGrid();

// hookup the location sensors
$gcanvas.mousemove(function(e) {
	var gtable = $("#gtable").get(0);
	var x = e.pageX - gtable.offsetLeft;
	var y = e.pageY - gtable.offsetTop;
	var p = graph.getPoint(x, y);

	updatePosition(p.x, p.y);
});

function print() {
	var args = Array.slice(arguments, 0).join(" ");
	var $gmessages = $("#gmessages");
	$gmessages.val($gmessages.val() + "\n" + args);
}

$("#gform").submit(function(event) {
	var line = $("#gcommand").val();
	var error = false;
	var numTargetsHit = {};

	if (line) {
		$("#gmessages").val("");

		try {			
			var status = graph.plot(line,addToScore);
			if (status != "") {
				error = true;
				print(status);
			}

			if (!error) {
				$("#gcommand").val("");
			}
		}
		catch (e) {
			print("Caught Exception: " + e.message);
			event.stopPropagation();
			event.preventDefault();
			return false;
		}
	}

	event.stopPropagation();
	event.preventDefault();
	$("#gcommand").focus();
	return false;
});

$("#gmessages").val("");

});

})(jQuery);
