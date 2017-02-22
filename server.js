var express = require('express');
var app = express();
var port = process.argv[2] || process.env.PORT;
var mongo = require('mongodb').MongoClient;
var path = require("path");
var DBurl = 'mongodb://localhost:27017/url-shortener';
var appURL = 'https://npm-chrismclean.c9users.io/';

function getRandomRef() {
  return Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 6);
}

function getUniqueRef() {
  var uniqueRef = getRandomRef();
  console.log('getting a unique ref')
    //generate a phsudo random 6 character string to use as a new refrence
    //verify it does not already exist in the database before returning it
    //while (getUrl(uniqueRef) !== undefined) {
    //  console.log('in loop, ref is ' + uniqueRef)
    //  uniqueRef = getRandomRef();
    //}
  return uniqueRef
}

function getRef(url, callback) {
  //return the URL linked to the supplied ref
  //returns null if norhing is found
  var lookup = {}
  lookup.url = url
  mongo.connect(DBurl, function(err, db) {
    if (err) {
      callback(err);
    }
    else {
      var collection = db.collection('shortURLs')
      collection.find(lookup).toArray(function(err, data) {
        if (err) throw err;
        db.close();
        if (data.length === 0) {
          callback(null, undefined);
        }
        else {
          callback(null, data[0].ref);
        }
      });
    }
  });
}

function getUrl(ref, callback) {
  //return the URL linked to the supplied ref
  //returns null if norhing is found
  console.log('getting URL for - ' + ref)
  var lookup = {}
  lookup.ref = ref
  mongo.connect(DBurl, function(err, db) {
    if (err) {
      callback(err);
    }
    else {
      var collection = db.collection('shortURLs')
      collection.find(lookup).toArray(function(err, data) {
        if (err) {
          callback(err);
        }
        else {
          if (data.length === 0) {
            callback(null, undefined);
          }
          else {
            callback(null, data[0].url);
          }
        }
        db.close();
      });
    }
  });
}

function insertNewUrl(url, res) {
  //insert the supplied URL into the DB with a new refrence
  //returns the refrence.
  console.log('adding a new URL ' + url)
  var urlJSON = {};
  urlJSON.ref = getUniqueRef();
  urlJSON.url = url;
  console.log('adding new element to DB - ' + JSON.stringify(urlJSON));
  mongo.connect(DBurl, function(err, db) {
    if (err) throw err
    var collection = db.collection('shortURLs')
    collection.insert(urlJSON, function(err, data) {
      if (err) console.log('Error in insert ' + err);
      db.close()
      var result = {};
      result.original_url = urlJSON.url;
      result.short_url = appURL + urlJSON.ref;
      res.send(result);
    });
  });
}

function validUrl(url) {
  var pattern = "^((https|http|ftp|rtsp|mms)?://)" +
    "?(([0-9a-z_!~*'().&=+$%-]+: )?[0-9a-z_!~*'().&=+$%-]+@)?" //ftp user@
    +
    "(([0-9]{1,3}\.){3}[0-9]{1,3}" // IP- 199.194.52.184
    +
    "|" +
    "([0-9a-z_!~*'()-]+\.)*" // www.
    +
    "([0-9a-z][0-9a-z-]{0,61})?[0-9a-z]\." +
    "[a-z]{2,6})" // first level domain- .com or .museum
    +
    "(:[0-9]{1,4})?" // port- :80
    +
    "((/?)|" // a slash isn't required if there is no file name
    +
    "(/[0-9a-z_!~*'().;?:@&=+$,%#-]+)+/?)$";
  var re = new RegExp(pattern);
  return re.test(url);
}

app.get('/new/:url*', function(req, res) {
  //var input = req.params.input;
  var input = req.url.slice(5);
  console.log('recieved input - ' + input)
    //parse the input and verify that the supplied string is a new URL. Otherwise return the usage page
  if (validUrl(input)) {
    console.log('input is a URL')
      //generate a short ref for the url, add it to the DB and display the JOSN result to the user
      //add http to the start of the url if needed
    if (!input.match(/^[a-zA-Z]+:\/\//)) {
      input = 'http://' + input;
    }
    insertNewUrl(input, res);
  }
  else {
    res.sendFile(path.join(__dirname + '/index.html'));
  }
})

app.get('/:input', function(req, res) {
  var input = req.params.input;
  console.log('recieved refrence - ' + input)
    //check if this input exists in our DB as a refrence, if it does redirect the user to that page. Otherwise return the usage page
  getUrl(input, function(err, url) {
    if (err) console.log('Error getting refrence ' + err);
    if (url !== undefined) {
      console.log('refrence is valid, redirecting the user')
      res.redirect(url);
    }
    else {
      console.log('refrence is not valid, redirecting user to index')
      res.sendFile(path.join(__dirname + '/index.html'));
    }
  });
})

//on a request with no additional details send the index page describing usage of the service.
app.get('/', function(req, res) {
  res.sendFile(path.join(__dirname + '/index.html'));
})

app.listen(port, function() {
  console.log('URL Shortener app listening on port ' + port + '!');
})
