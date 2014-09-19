var Graph = function Graph(canvas, width, height, offsetX, offsetY, settings) {
	// private variables
	this._blockers = [];
	this._targets = [];
	this._canvas = canvas;
	this._offsetX = offsetX || 0;
	this._offsetY = offsetY || 0;
	this._width = width || (this._canvas.width - this._offsetX);
	this._height = height || (this._canvas.height - this._offsetY);
	this._functions = [];
	this._constants = {};
	this._redrawCallback = null;
	
	// public properties
	this.settings = extend(object(Graph.defaultSettings), settings || {});

	// initialization
	// TODO: make sure that blockers+targets<=range*domain
	_blockers = this._getLocations(this.settings.numBlockers);
	_targets = this._getLocations(this.settings.numTargets);
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

// static properties and functions
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

Graph.round = function(x) {
	return Math.round(x * 4096) / 4096;
};

Graph.makeFunction = function(expr) {
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
};

Graph.prototype = {
	// private methods
	_getLocations: function(number) {
		var list = [];
		
		var domain = this.settings.maxX-this.settings.minX;
		var range = this.settings.maxY-this.settings.minY;
		
		// TODO: make this recalculate duplicates
		for (i=0; i<number; i++) 
			list[i] = [Math.floor(Math.random()*domain)+this.settings.minX, Math.floor(Math.random()*range)+this.settings.minY];	
		return list;	
	},

	// location is an array of [x,y]
	_drawCircle: function(location, radius, filled) {
		var ctx = this._canvas.getContext("2d");  // TODO: can I replace this whole setup with getContext???
		ctx.save();
		
		ctx.scale(this.scaleX, -this.scaleY);
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

	_drawTargets: function() {
		for (i=0; i<this._targets.length; i++)
			this._drawCircle(this._targets[i], 0.5, true);
	},

	_drawBlockers: function() {
		for (i=0; i<this._blockers.length; i++)
			this._drawCircle(this._blockers[i], 0.5, false);
	},

	_addFunction: function(f, c) {
		var colors = this.settings.colors;
		this._functions.push({
			fn: f,
			color: c || colors[this._functions.length % colors.length]
		});
	},

	_removeFunction: function(index) {
		this._functions.splice(index, 1);
	},

	_plotFunction: function(f, color) {
		var ctx = this._setupContext();

		try {
			var minX = this.settings.minX;
			var minY = this.settings.minY;
			var maxX = this.settings.maxX;
			var maxY = this.settings.maxY;
			var xstep = 1 / this.scaleX;
			var ystep = 1 / this.scaleY;

			var txstep = Graph.round(xstep);
			var tystep = Graph.round(ystep);
			if (txstep) xstep = txstep;
			if (txstep) ystep = tystep;
			var first = true;

			var param = f.param || "x";
			var to = f.to || "y";

			f = f.toJSFunction(param, this._constants);
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
	},

	_evalFunction: function(f) {
		return f.evaluate(this._constants);
	},

	_evalExpression: function(expr) {
		try {
			var f = Graph.makeFunction(expr);
		}
		catch (e) {
			throw new Error("Syntax error");
		}

		return this._evalFunction(f);
	},

	_setupContext: function() {
		var ctx = this._canvas.getContext("2d");
		ctx.save();

		ctx.beginPath();
			ctx.moveTo(this._offsetX                  , this._offsetY);
			ctx.lineTo(this._offsetX + this._width + 1, this._offsetY);
			ctx.lineTo(this._offsetX + this._width + 1, this._offsetY + this._height + 1);
			ctx.lineTo(this._offsetX                  , this._offsetY + this._height + 1);
			ctx.lineTo(this._offsetX                  , this._offsetY);
		//ctx.stroke();
		ctx.clip();

		ctx.translate(
			this._offsetX - this.settings.minX * this.scaleX,
			this._height + this._offsetY + this.settings.minY * this.scaleY
		);
		ctx.scale(this.scaleX, -this.scaleY);

		ctx.lineWidth = 1 / this.scaleX;

		return ctx;
	},


	// public methods
	get scaleX() {
		var userWidth = this.settings.maxX - this.settings.minX;
		return this._width / userWidth;
	},

	get scaleY() {
		var userHeight = this.settings.maxY - this.settings.minY;
		return this._height / userHeight;
	},

	getPoint: function(devx, devy) {
		var settings = this.settings;
		var scalex = this.scaleX;
		var scaley = this.scaleY;
		var offsetX = this._offsetX;
		var offsetY = this._offsetY;

		var x = (devx /  scalex) - ((              offsetX - settings.minX * scalex) / scalex);
		var y = (devy / -scaley) + ((this.height + offsetY + settings.minY * scaley) / scaley);

		return { x:x, y:y };
	},
		
	// draws a clean grid (if clean=true) and then plots all the functions on top of it
	redraw: function(clean) {
		var ctx = this._canvas.getContext("2d");
		
		if (clean) {
			ctx.clearRect(this._offsetX, this._offsetY, this._width, this._height);
			this.drawGrid();
		};
		
		var errors = [];
		for (var i = 0; i < this._functions.length; i++) {
			var f = this._functions[i];
			try {
				this._plotFunction(f.fn, f.color);
			}
			catch (e) {
				errors.push("Error in function " + i + ": " + e.message);
			}
		}

		if (this._redrawCallback) {
			this._redrawCallback(ctx);
		}

		status = errors + '\n';
		return errors;
	},

	drawGrid: function() {
		var ctx = this._setupContext();
		var minX = this.settings.minX;
		var minY = this.settings.minY;
		var maxX = this.settings.maxX;
		var maxY = this.settings.maxY;
		var xstep = Graph.round(this.settings.xGridSize);
		var ystep = Graph.round(this.settings.yGridSize);

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

				ctx.lineWidth = 2 / this.scaleY;
				ctx.beginPath();
					ctx.moveTo(minX, 0);
					ctx.lineTo(maxX, 0);
				ctx.stroke();

				ctx.lineWidth = 2 / this.scaleX;
				ctx.beginPath();
					ctx.moveTo(0, minY);
					ctx.lineTo(0, maxY);
				ctx.stroke();
			}
		}
		finally {
			ctx.restore();
		}
	},

	deletePlot: function(n) {
		if (!isNaN(n)) {
			this._removeFunction(n);
		}
		else {
			status = "Invalid delete";
		}
	},
	
	plot: function(line) {
		line = line.trim();
		if (line == "") return "";
		var status = "";

		try {
			var f = Graph.makeFunction(line);
			this._addFunction(f);
		}
		catch (e) {
			status = e.message;
		}
	}
};
