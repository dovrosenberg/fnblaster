function object(o) {
	function F() {}
	F.prototype = o;
	return new F();
}

function extend(self, obj) {
    self = self || {};
    for (var i = 1; i < arguments.length; i++) {
        var o = arguments[i];
        if (o) {
            for (var k in o) {
                self[k] = o[k];
            }
        }
    }
    return self;
}


String.prototype.trim = function () {
    return this.replace(/^\s+|\s+$/g, "");
};

String.prototype.startsWith = function(str) {
	return this.indexOf(str) === 0;
};

String.prototype.endsWith = function(str) {
	return (this.length - str.length) == this.lastIndexOf(str);
};

if (!Array.slice) {
	Array.slice = function (a, begin, end) {
		switch (arguments.length) {
		default: return Array.prototype.slice.call(a, begin, end);
		case 2:  return Array.prototype.slice.call(a, begin);
		case 1:  return Array.prototype.slice.call(a);
		case 0:  return null;
		};
	};
}

