// TODO: Use http://requirejs.org/docs/start.html  to cleanup javascript dependencies

function setCookie(name, value, exdays) {
	if (exdays) {
		var d = new Date();

	d.setTime(d.getTime() + (exdays*1000*60*60*24));
		var expires = "expires=" + d.toUTCString();
		document.cookie = name + "=" + value + "; " + expires;
	} else	
		document.cookie = name + "=" + value;
	
} 

function getCookie(name) {
    name += "=";
    var cookies = document.cookie.split(';');
    for(var i=0; i<cookies.length; i++) {
        var c = cookies[i];
        while (c.charAt(0)==' ') 
			c = c.substring(1);
        if (c.indexOf(name) != -1) 
			return c.substring(name.length,c.length);
    }
    return "";
} 