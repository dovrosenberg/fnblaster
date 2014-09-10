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

var $gcanvas = $("#gcanvas");
var gcanvas = $gcanvas.get(0);
var position = new Overlay(gcanvas, 0, 0, 300, 20);

function clearContext(c) {
	c.canvas.width = c.canvas.width;
};

var graph = new Graph(gcanvas);

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

// Setup the graph
graph.commandCallback = function(command, args, info) {
	info.status = "";

	switch (command) {
	case "set":
		var settings = graph.settings;
		args = args.split(/\s+/);
		if (args.length >= 2) {
			var option = args[0].trim();
			var value = args.slice(1).join(" ").trim();

			switch (option) {
			case "axes":
			case "axis":
				settings.showAxes = onoff(value);
				break;
			case "grid":
				settings.showGrid = onoff(value);
				break;
			case "xgridsize":
			case "xgrid":
				var n = graph.evalExpression(value);
				if (isNaN(n)) info.status = "Invalid xgridsize";
				else settings.xGridSize = n;
				break;
			case "ygridsize":
			case "ygrid":
				var n = graph.evalExpression(value);
				if (isNaN(n)) info.status = "Invalid ygridsize";
				else settings.yGridSize = n;
				break;
			case "gridsize":
				var n = graph.evalExpression(value);
				if (isNaN(n)) info.status = "Invalid gridsize";
				else settings.yGridSize = settings.xGridSize = n;
				break;
			case "tmin":
				var n = graph.evalExpression(value);
				if (isNaN(n)) info.status = "Invalid tmin";
				else settings.minT = n;
				break;
			case "tmax":
				var n = graph.evalExpression(value);
				if (isNaN(n)) info.status = "Invalid tmin";
				else settings.maxT = n;
				break;
			case "pmin":
				var n = graph.evalExpression(value);
				if (isNaN(n)) info.status = "Invalid pmin";
				else settings.minParam = n;
				break;
			case "pmax":
				var n = graph.evalExpression(value);
				if (isNaN(n)) info.status = "Invalid pmin";
				else settings.maxParam = n;
				break;
			default:
				info.status = "Unrecognized option";
				break;
			}
		}
		else {
			info.status = "Invalid option";
		}
		break;
	case "view":
		var settings = graph.settings;
		if (args == "") {
			settings.minX = settings.minY = -10;
			settings.maxX = settings.maxY = 10;
		}
		else {
			args = args.split(/\s+/);
			switch (args.length) {
			default:
			case 4: settings.maxY = getNumber(args[3], settings.maxY);
			case 3: settings.minY = getNumber(args[2], settings.minY);
			case 2: settings.maxX = getNumber(args[1], settings.maxX);
			case 1: settings.minX = getNumber(args[0], settings.minX);
			}
		}
		// Fallthrough
	case "redraw":
		info.status = redraw();
		break;
	default:
		return false;
	}

	return true;
};

function onmousewheel(event) {
	var delta = 0;
	if (!event) event = window.event;

	// normalize the delta
	if (event.wheelDelta) { // IE & Opera
		delta = -event.wheelDelta;
	}
	else if (event.detail) { // W3C
		delta = event.detail;
	}
	else {
		event.preventDefault();
		return;
	}

	// FIXME: I don't think this is correct in IE
	var gtable = $("#gtable").get(0);
	var x = event.pageX - gtable.offsetLeft;
	var y = event.pageY - gtable.offsetTop;
	var p = graph.getPoint(x, y);

	var scale = 1.2;
	if (delta < 0) scale = 1 / scale;
	graph.zoom(scale, scale, p.x, p.y);
	redraw();

	event.preventDefault();
	return false;
}

if (window.addEventListener) {
	gcanvas.addEventListener('DOMMouseScroll', onmousewheel, false);
}
//for IE/Opera etc
gcanvas.onmousewheel = onmousewheel;

$gcanvas.dblclick(function(e) {
	var gtable = $("#gtable").get(0);
	var x = e.pageX - gtable.offsetLeft;
	var y = e.pageY - gtable.offsetTop;
	var p = graph.getPoint(x, y);

	graph.setCenter(p.x, p.y);
	redraw();
	$("#gcommand").focus();
	return false;
});

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
			var status = graph.processCommand(line);
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

$("#gclearmessages").click(function() {
	$("#gmessages").val("");
	$("#gcommand").focus();
	drawTarget(graph,1,1,1);
});

$("#gmessages").val("");
redraw();

});

})(jQuery);
