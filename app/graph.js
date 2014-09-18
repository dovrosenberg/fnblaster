var Graph = function Graph(_canvas, _width, _height, _offsetX, _offsetY, _settings) {
	// private variables
	var blockers = [];
	var targets = [];
	var canvas = _canvas;
	var offsetX = _offsetX || 0;
	var offsetY = _offsetY || 0;
	var width = _width || (canvas.width - offsetX);
	var height = _height || (canvas.height - offsetY);
	var scaleX, scaleY;
	var functions = [];
	var constants = {};
	var redrawCallback = null
	
	// public properties
	this.settings = extend(object(Graph.defaultSettings), _settings || {});

	// private methods
	// location is an array of [x,y]
	function drawCircle(location, radius, filled) = {
		var ctx = canvas.getContext("2d");  // TODO: can I replace this whole setup with getContext???
		ctx.save();
		
		ctx.scale(scaleX, -scaleY);
		ctx.translate(-this.settings.minX,this.settings.minY);
		ctx.beginPath();
		ctx.arc(location[0],location[1],radius,0,2*Math.PI, false);
		
		if (filled) {
			ctx.fillStyle = 'green';
			ctx.fill();
		}
		ctx.lineWidth = 1/scaleX;
		ctx.strokeStyle = '#003300';
		ctx.stroke();
		
		ctx.restore();
	},

	function drawTargets() = {
		for (i=0; i<targets.length; i++)
			drawCircle(targets[i], 0.5, true);
	};

	function drawBlockers() = {
		for (i=0; i<blockers.length; i++)
			drawCircle(targets[i], 0.5, false);
	};

	function addFunction(f, c) = {
		var colors = this.settings.colors;
		functions.push({
			fn: f,
			color: c || colors[functions.length % colors.length]
		});
	};

	function removeFunction(index) = {
		functions.splice(index, 1);
	};

	// draws a clean grid (if clean=true) and then plots all the functions on top of it
	function redraw(clean) = {
		var ctx = canvas.getContext("2d");
		
		if (clean) {
			ctx.clearRect(offsetX, offsetY, width, height);
			this.drawGrid();
		};
		
		var errors = [];
		for (var i = 0; i < functions.length; i++) {
			var f = functions[i];
			try {
				plotFunction(f.fn, f.color);
			}
			catch (e) {
				errors.push("Error in function " + i + ": " + e.message);
			}
		}

		if (redrawCallback) {
			redrawCallback(ctx);
		}

		status = errors + '\n';
		return errors;
	};

	function plotFunction(f, color) {
		var ctx = this.setupContext();

		try {
			var minX = this.settings.minX;
			var minY = this.settings.minY;
			var maxX = this.settings.maxX;
			var maxY = this.settings.maxY;
			var xstep = 1 / scaleX;
			var ystep = 1 / scaleY;

			var txstep = round(xstep);
			var tystep = round(ystep);
			if (txstep) xstep = txstep;
			if (txstep) ystep = tystep;
			var first = true;

			var param = f.param || "x";
			var to = f.to || "y";

			f = f.toJSFunction(param, constants);
			f.param = param;
			f.to = to;

			function plotPoint(x, y) {
				if (isFinite(y) && isFinite(x)) {
					if (first) {
						ctx.moveTo(x, y);
						first = false;
					}
					else {
						ctx.lineTo(x, y);
					}
				}
			}

			ctx.beginPath();
			ctx.strokeStyle = color || "black";

			// old code just looped across the whole range for x; new code has to do it according to time
			//    in order to ensure the correct speed
			var requestAnimationFrame = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame ||
					window.oRequestAnimationFrame || window.msRequestAnimationFrame;
			
			var linearSpeed = (maxX - minX)/5;  // want it to take 5 seconds to draw entire range
			var startTime = null;
			
			// startTime is original time we started to draw (in milliseconds)
			// linearSpeed is how far x advances (in graph units) per second
			var animate = function(timestamp) {
				// get new time
				if (startTime === null) startTime = timestamp;
				var time = timestamp - startTime;
				
				// get current location
				var newX = minX + (linearSpeed * time/1000);
				if (newX <= maxX) {
					var y = f(newX);
					plotPoint(newX,y);
					ctx.stroke();
					
					// request new frame
					requestAnimationFrame(animate);
				} else
					ctx.restore();
			};
			
			first = true;
			requestAnimationFrame(animate);
			
			// could handle other functional forms; for now, don't allow
			/*
			else if (param == "y") {
				for (var y = minY; y <= maxY; (y < 0 && y + ystep > 0) ? y = 0 : y += ystep) {
					var x = f(y);
					plotPoint(x, y);
				}
				if (y - ystep < maxY) {
					var x = f(maxY);
					plotPoint(x, maxY);
				}
			}
			else if (param == "t" && f.to == "r") {
				var minT = settings.minT;
				var maxT = settings.maxT;
				var tstep = Math.min(xstep, ystep);
				if ("minT" in f) minT = f.minT;
				if ("maxT" in f) maxT = f.maxT;

				for (var t = minT; t <= maxT; (t < 0 && t + tstep > 0) ? t = 0 : t += tstep) {
					var r = f(t);
					plotPoint(r * Math.cos(t), r * Math.sin(t));
				}
				if (t - tstep < maxT) {
					var r = f(maxT);
					plotPoint(r * Math.cos(maxT), r * Math.sin(maxT));
				}
			}
			else if (param == "t" && f.to == "xy") {
				var minT = settings.minParam;
				var maxT = settings.maxParam;
				var tstep = Math.min(xstep, ystep);
				if ("minT" in f) minT = f.minT;
				if ("maxT" in f) maxT = f.maxT;

				for (var t = minT; t <= maxT; (t < 0 && t + tstep > 0) ? t = 0 : t += tstep) {
					var xy = f(t);
					var x = xy[0];
					var y = xy[1];
					plotPoint(x, y);
				}
				if (t - tstep < maxT) {
					var xy = f(t);
					var x = xy[0];
					var y = xy[1];
					plotPoint(x, y);
				}

			ctx.stroke();
			}*/
		}
		finally {				
		}
	};

	function evalFunction(f) = {
		return f.evaluate(constants);
	};

	function evalExpression(expr) = {
		try {
			var f = makeFunction(expr);
		}
		catch (e) {
			throw new Error("Syntax error");
		}

		return evalFunction(f);
	};

	// privileged methods
	this.setupContext = function() {
		var ctx = canvas.getContext("2d");
		ctx.save();

		ctx.beginPath();
			ctx.moveTo(offsetX                  , offsetY);
			ctx.lineTo(offsetX + width + 1, offsetY);
			ctx.lineTo(offsetX + width + 1, offsetY + height + 1);
			ctx.lineTo(offsetX                  , offsetY + height + 1);
			ctx.lineTo(offsetX                  , offsetY);
		//ctx.stroke();
		ctx.clip();

		ctx.translate(
			offsetX - this.settings.minX * scalex,
			height + offsetY + this.settings.minY * scaley
		);
		ctx.scale(scalex, -scaley);

		ctx.lineWidth = 1 / scalex;

		return ctx;
	};

	this.drawGrid = function() {
		var ctx = this.setupContext();
		var minX = this.settings.minX;
		var minY = this.settings.minY;
		var maxX = this.settings.maxX;
		var maxY = this.settings.maxY;
		var xstep = round(this.settings.xGridSize);
		var ystep = round(this.settings.yGridSize);

		try {
			if (this.settings.showGrid) {
				ctx.strokeStyle = "lightgray";
				ctx.lineWidth = 1 / this.scaleY;
				for (var i = 0; i <= maxY; i += ystep) {
					ctx.beginPath();
						ctx.moveTo(minX, i);
						ctx.lineTo(maxX, i);
					ctx.stroke();
				}
				for (var i = -ystep; i >= minY; i -= ystep) {
					ctx.beginPath();
						ctx.moveTo(minX, i);
						ctx.lineTo(maxX, i);
					ctx.stroke();
				}

				ctx.lineWidth = 1 / this.scaleX;
				for (var i = 0; i <= maxX; i += xstep) {
					ctx.beginPath();
						ctx.moveTo(i, minY);
						ctx.lineTo(i, maxY);
					ctx.stroke();
				}
				for (var i = -xstep; i >= minX; i -= xstep) {
					ctx.beginPath();
						ctx.moveTo(i, minY);
						ctx.lineTo(i, maxY);
					ctx.stroke();
				}
			}

			if (this.settings.showAxes) {
				ctx.strokeStyle = "black";

				ctx.lineWidth = 2 / scaleY;
				ctx.beginPath();
					ctx.moveTo(minX, 0);
					ctx.lineTo(maxX, 0);
				ctx.stroke();

				ctx.lineWidth = 2 / scaleX;
				ctx.beginPath();
					ctx.moveTo(0, minY);
					ctx.lineTo(0, maxY);
				ctx.stroke();
			}
		}
		finally {
			ctx.restore();
		}
	};

	this.deletePlot = function(n) {
		if (!isNaN(n)) {
			removeFunction(n);
		}
		else {
			status = "Invalid delete";
		}
	};
	
	this.plot = function(line) {
		line = line.trim();
		if (line == "") return "";
		var status = "";

		try {
			var f = makeFunction(line);
			addFunction(f);
		}
		catch (e) {
			status = e.message;
		}
	}

	// initialization
	// TODO: make sure that blockers+targets<=range*domain
	blockers = getLocations(this.settings.numBlockers);
	targets = getLocations(this.settings.numTargets);
};

// static properties
Graph.parser = new Parser();
Graph.defaultSettings = {
	showAxes: true,
	showGrid: true,
	xGridSize: 1,
	yGridSize: 1,
	minX: -10,
	maxX: 10,
	minY: -10,
	maxY: 10,
	minT: 0,
	maxT: 2 * Math.PI,
	minParam: 0,
	maxParam: 2 * Math.PI,
	colors: [ "red", "blue", "green", "orange", "purple", "gray", "pink", "lightblue", "limegreen"],
};

function getLocations (number) {
		var list = [];
		
		var domain = this.settings.maxX-graph.settings.minX;
		var range = this.settings.maxY-graph.settings.minY;
		
		// TODO: make this recalculate duplicates
		for (i=0; i<number; i++) 
			list[i] = [Math.floor(Math.random()*domain)+this.settings.minX, Math.floor(Math.random()*range)+this.settings.minY];	
		return list;	
};


function PairExpression(expr0, expr1) {
	this.expr0 = expr0;
	this.expr1 = expr1;
	this.param = expr0.param || expr1.param;
	this.to = expr0.to || expr1.to;
}
PairExpression.prototype = {
	simplify: function(vars) {
		var spe = PairExpression(this.expr0.simplify(vars), this.expr1.simplify(vars));
		spe.param = this.expr0.param;
		spe.to = this.expr0.to;
	},
	evaluate: function(vars) {
		return [this.expr0.evaluate(vars), this.expr1.evaluate(vars)];
	},
	toString: function() {
		return this.expr0 + "; " + this.expr1;
	},
	substitute: function(variable, expr) {
		var spe = PairExpression(this.expr0.substitute(variable, expr), this.expr1.substitute(variable, expr));
		spe.param = this.expr0.param;
		spe.to = this.expr0.to;
	},
	toJSFunction: function(param, variables) {
		var xf = this.expr0.toJSFunction(param, variables);
		var yf = this.expr1.toJSFunction(param, variables);
		return function(t) {
			return [xf(t), yf(t)];
		};
	},
}

function round(x) {
	return Math.round(x * 4096) / 4096;
}

function makeFunction(expr) {
	expr = expr.trim();

	try {
		var param = "x";
		var range = "y";
		if (/^f\(x\)\s*=.*$/.test(expr) || /^y\s*=.*$/.test(expr)) {
			expr = expr.substring(expr.indexOf("=") + 1).trim();
		}
		else if (/^f\(y\)\s*=.*$/.test(expr) || /^x\s*=.*$/.test(expr)) {
			expr = expr.substring(expr.indexOf("=") + 1).trim();
			param = "y";
			range = "x";
		}
		else if (/^r\s*=.*$/.test(expr)) {
			expr = expr.substring(expr.indexOf("=") + 1).trim();
			param = "t";
			range = "r";
		}
		else if (/^x\s*,\s*y\s*=.*$/.test(expr) || /^\[.+,.+\]$/.test(expr)) {
			expr = expr.substring(expr.indexOf("=") + 1).trim();
			param = "t";
			range = "xy";
		}
		else if (expr.indexOf(";") != -1) {
			var exprs = expr.split(";");
			var expr0 = Graph.parser.parse(exprs[0]).simplify();
			var expr1 = Graph.parser.parse(exprs[1]).simplify();
			var f = new PairExpression(expr0, expr1);
			f.param = "t";
			f.to = "xy";
			return f;
		}

		var f = Graph.parser.parse(expr).simplify();
		f.param = param;
		f.to = range;
		return f;
	}
	catch (e) {
		throw new Error("Syntax error");
	}
}

// public methods and properties
Graph.prototype = {
	get scaleX() {
		var userWidth = this.settings.maxX - this.settings.minX;
		return this.width / userWidth;
	},

	get scaleY() {
		var userHeight = this.settings.maxY - this.settings.minY;
		return this.height / userHeight;
	},

	getPoint: function(devx, devy) {
		var settings = this.settings;
		var scalex = this.scaleX;
		var scaley = this.scaleY;
		var offsetX = this.offsetX;
		var offsetY = this.offsetY;

		var x = (devx /  scalex) - ((              offsetX - settings.minX * scalex) / scalex);
		var y = (devy / -scaley) + ((this.height + offsetY + settings.minY * scaley) / scaley);

		return { x:x, y:y };
	}
};
