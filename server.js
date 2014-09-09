var express = require('express')();
var app = express.createServer();
express.use(express.static('app'));
express.listen(process.env.PORT);