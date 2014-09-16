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

function redraw() {
	clearContext(gcanvas.getContext("2d"));
	var status = graph.redraw();
	
	position.update();
	return status;
}

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

var $gcanvas = $("#gcanvas");
var gcanvas = $gcanvas.get(0);
var position = new Overlay(gcanvas, 0, 0, 300, 20);

// create the graph
var graph = new Graph(gcanvas);

// create the game object
var game = new Game(graph);
game.startGame();

// draw the initial setup
game.drawTargets();
game.drawBlockers();


// Setup the graph
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

	if (line) {
		$("#gmessages").val("");

		try {
			// delete any prior plot
			try {
				graph.deletePlot(0);
			}
			catch (e) {};
			
			var status = graph.plot(line);
			if (status != "") {
				error = true;
				print(status);
			}

			status = redraw();
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

$("#gRunTest").click(function() {
	redraw();		
});

$("#gmessages").val("");
redraw();

});

})(jQuery);
