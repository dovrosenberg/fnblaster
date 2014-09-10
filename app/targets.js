function drawTarget(graph, x, y) {
	drawCircle(graph, x, y, 0.5, true);
}

function drawBlocker(graph, x, y) {
	drawCircle(graph, x, y, 0.5, false);
}

function drawCircle(graph, x, y, radius, filled) {
	var ctx = graph.canvas.getContext("2d");
	ctx.save();
	
//	var offsetX = graph.offsetX;
//	var offsetY = graph.offsetY;
	
	ctx.scale(graph.scaleX, -graph.scaleY);
	ctx.translate(-graph.settings.minX,graph.settings.minY);
	ctx.beginPath();
	ctx.arc(x,y,radius,0,2*Math.PI, false);
	
	if (filled) {
		ctx.fillStyle = 'green';
		ctx.fill();
	}
	ctx.lineWidth = 1/graph.scaleX;
	ctx.strokeStyle = '#003300';
	ctx.stroke();
	
	ctx.restore();
}

// is a particular point inside of a circle as defined
function collisionDetect(x, y, circlex, circley, circleradius) {
	return ((circlex-x)^2+(circley-y)^2<=circleradius^2);
}