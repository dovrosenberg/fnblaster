var express = require('express');
var app = express();

app.get('/', function(req,res) {
   res.send('hello world');
});

/*express.use(express.static('app'));*/
app.listen(process.env.PORT);