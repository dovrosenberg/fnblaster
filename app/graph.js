var Graph = function Graph(canvas, settings, width, height, offsetX, offsetY) {
	// private variables
	this._canvas = canvas;
	this._offsetX = offsetX || 0;
	this._offsetY = offsetY || 0;
	this._width = width || (this._canvas.width - this._offsetX);
	this._height = height || (this._canvas.height - this._offsetY);
	this._functions = [];
	this._blockPoints = [];	// the maxX before hitting a blocker
	this._constants = {};
	this._animatingNow = false;
	
	// public properties
	this.settings = extend(object(Graph.defaultSettings), settings || {});

	// TODO: make sure that blockers+targets<=range*domain
	this._blockers = this._getLocations(this.settings.numBlockers);
	this._targets = this._getLocations(this.settings.numTargets);
	
	this._setupContext();
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
	colors: [ "red", "blue", "orange", "purple", "gray", "pink", "lightblue", "limegreen"],
	numBlockers: 3,
	numTargets: 4,
	radius: 0.5
};


Graph.hardSettings = {
	numTargets: 10,
	numBlockers: 8
};

Graph.mediumSettings = {
	numTargets: 10,
	numBlockers: 4
};

Graph.easySettings = {
	numTargets: 10,
	numBlockers: 0
};

Graph.round = function(x) {
	return Math.round(x * 4096) / 4096;
};

// is a particular point inside of a circle as defined
Graph.collisionDetect = function(x, y, circlex, circley, circleRadius) {
	return ((circlex-x)*(circlex-x)+(circley-y)*(circley-y)<=circleRadius*circleRadius);
}
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

	// returns true if any blocker is hit
	_collisionDetectBlockers: function(x,y) {
		var radius = this.settings.radius;
		
		for (var i=0; i<this._blockers.length; i++)
			if (Graph.collisionDetect(x,y,this._blockers[i][0], this._blockers[i][1], radius))
				return true;
		
		return false;
	},

	// returns index of target hit; -1 if none
	// if targets overlap, this will only return one of them
	_collisionDetectTargets: function(x,y) {
		var radius = this.settings.radius;
		
		for (var i=0; i<this._targets.length; i++)
			if (Graph.collisionDetect(x,y,this._targets[i][0], this._targets[i][1], radius))
				return i;
		
		return -1;
	},
	
	// location is an array of [x,y]
	_drawCircle: function(location, radius, filled, color) {
		var ctx = this._canvas.getContext("2d");  
		
		ctx.beginPath();
		ctx.arc(location[0],location[1],radius,0,2*Math.PI, false);
		
		if (filled) {
			ctx.fillStyle = color || 'green';
			ctx.fill();
		}
		ctx.lineWidth = 1/this.scaleX;
		ctx.strokeStyle = color || 'green';
		ctx.stroke();
	},

	_drawBlockersTargets: function() {
		var radius = this.settings.radius;
		
		for (i=0; i<this._targets.length; i++)
			this._drawCircle(this._targets[i], radius, true);
		for (i=0; i<this._blockers.length; i++)
			this._drawCircle(this._blockers[i], radius, false);
	},

	_addFunction: function(f, c) {
		var colors = this.settings.colors;
		this._functions.push({
			fn: f,
			color: c || colors[this._functions.length % colors.length]
		});
		this._blockPoints.push(this.settings.maxX + this.settings.radius);
	},

	// fast=true just draws it; false=slow animates it
	_plotFunction: function(i, fast, scoreUpdateCallback) {
		var ctx = this._canvas.getContext("2d");

		try {
			var f = this._functions[i].fn;
			var color = this._functions[i].color;
			var numTargetsHit = 0;
			
			var minX = this.settings.minX-this.settings.radius;
			var minY = this.settings.minY;
			var maxX = this._blockPoints[i];
			var maxY = this.settings.maxY;

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

			if (fast) {
				var xstep = 1 / this.scaleX;

				for (var x = minX; x <=  maxX; (x < 0 && x + xstep > 0) ? x = 0 : x += xstep) {
					var y = f(x);
					plotPoint(x, y);
				}
				ctx.stroke();
			}
			else{
				var requestAnimationFrame = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame ||
						window.oRequestAnimationFrame || window.msRequestAnimationFrame;
				
				var linearSpeed = (maxX - minX)/5;  // want it to take 5 seconds to draw entire range
				var startTime = null;
				var _this = this;
				
				// startTime is original time we started to draw (in milliseconds)
				// linearSpeed is how far x advances (in graph units) per second
				var animate = function(timestamp) {
					_this._animatingNow = true;
					
					// get new time
					if (startTime === null) startTime = timestamp;
					var time = timestamp - startTime;
					
					// get current location
					var newX = minX + (linearSpeed * time/1000);
					if (newX <= maxX) {
						var y = f(newX);
						
						var targetHit = _this._collisionDetectTargets(newX,y);
						if (targetHit!=-1) {
							numTargetsHit++;
							
							// redraw the target; for now, just change the color 
							_this._drawCircle(_this._targets[targetHit], this.settings.radius, true, _this._functions[i].color);
							
							// move the cursor back to point so plot can continue
							ctx.beginPath();
							ctx.strokeStyle = color || "black";
							first=true;
							
							// remove from target list; this will erase it when next plot is drawn
							_this._targets.splice(targetHit,1);
						}
						if (_this._collisionDetectBlockers(newX,y)) {
							plotPoint(newX,y);
							ctx.stroke();

							// stop drawing this line here in the future
							_this._blockPoints[i] = newX;
							_this._animatingNow = false;
						} else {
							plotPoint(newX,y);
							ctx.stroke();

							// request new frame
							requestAnimationFrame(animate);
						}						
					} else {
						_this._animatingNow = false;
					}
					
					if (!_this._animatingNow)
						scoreUpdateCallback(numTargetsHit);
				};
			
				first = true;
				requestAnimationFrame(animate);
			};
			
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
		var y = (devy / -scaley) + ((this._height + offsetY + settings.minY * scaley) / scaley);

		return { x:x, y:y };
	},
		
	// cleans out the space and draws the grid
	drawGrid: function() {
		var ctx = this._canvas.getContext("2d");
		
		var minX = this.settings.minX;
		var minY = this.settings.minY;
		var maxX = this.settings.maxX;
		var maxY = this.settings.maxY;
		var xstep = Graph.round(this.settings.xGridSize);
		var ystep = Graph.round(this.settings.yGridSize);

		ctx.clearRect(minX, minY, (maxX-minX), (maxY-minY));

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
		
		this._drawBlockersTargets();
	},

	plot: function(line, scoreUpdateCallback) {
		line = line.trim();
		if (line == "") return "";
		var status = "";

		// can't request new plots while animating
		if (this._animatingNow)
			return;
			
		try {
			var f = Graph.makeFunction(line);
			this._addFunction(f);

			// we refresh the grid because we need to clear destroyed targets
			this.drawGrid();
			
			// now draw all the plots; only the last one needs to be animated
			var errors = [];
			for (var i=0; i<this._functions.length; i++) {			
				try {
					this._plotFunction(i, (i!=this._functions.length-1), scoreUpdateCallback);
				}
				catch (e) {
					errors.push("Error in function " + i + ": " + e.message);
				}
			}
		}
		catch (e) {
			status = e.message;
		}
		return errors;
	}
};
