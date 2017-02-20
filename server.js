var express = require('express');
var app = express();
var port = process.argv[2]||process.env.PORT;
var results = {};


app.get('/', function (req, res) {

})

app.listen(port, function () {
  console.log('URL Shortener app listening on port ' + port + '!');
})
