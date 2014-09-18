
// is a particular point inside of a circle as defined
function collisionDetect(x, y, circlex, circley, circleradius) {
	return ((circlex-x)^2+(circley-y)^2<=circleradius^2);
}



