function drawTarget(graph, x, y, radius) {
	var ctx = graph.canvas.getContext("2d");

	var scaleX = graph.scaleX;
	var scaleY = graph.scaleY;
	var offsetX = graph.offsetX;
	var offsetY = graph.offsetY;
	
	var t = graph.settings.minX;
	var s = graph.settings.minY;
	
	ctx.scale(scaleX, -scaleY);
/*	ctx.translate(
		-offsetX + graph.settings.minX * scaleX,
		graph.height + offsetY + graph.settings.minY * scaleY
	);*/
	ctx.translate(1,-1);
	ctx.beginPath();
	ctx.arc(x,y,radius,0,2*Math.PI, false);
	ctx.fillStyle = 'green';
	ctx.fill();
	ctx.lineWidth = 1/scaleX;
	ctx.strokeStyle = '#003300';
	ctx.stroke();

	return ctx;
}
