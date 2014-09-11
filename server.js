var express = require('express');
var app = express();

//app.use(express.static('__dirname'));
/*app.get('/', function(req,res) {
   res.send('hello world');
});
*/

//app.listen(process.env.PORT);

app.configure(function() {
	app.set('port', process.env.PORT || 3000);
	app.set('view options', {layout: false});
	app.engine('html', require('ejs').renderFile);
	app.use(app.router);
});