var express = require('express');
var app = express();

app.use(express.static('/'));
/*app.get('/', function(req,res) {
   res.send('hello world');
});
*/

app.listen(process.env.PORT);