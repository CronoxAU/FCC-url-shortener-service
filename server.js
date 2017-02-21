var express = require('express');
var app = express();
var port = process.argv[2]||process.env.PORT;
var mongo = require('mongodb').MongoClient;
var path = require("path");
var DBurl = 'mongodb://localhost:27017/url-shortener';

function getUniqueRef(){
  var uniqueRef = '';
  console.log('getting a unique ref')
  //generate a phsudo random 6 character string to use as a new refrence
  //verify it does not already exist in the database before returning it
  while(uniqueRef === '' || getUrl(uniqueRef) !== undefined){
    console.log('in loop, ref is ' + uniqueRef)
    uniqueRef = Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 6);
  }
  return uniqueRef
}

function getRef(url){
  //return the URL linked to the supplied ref
  //returns null if norhing is found
  mongo.connect(DBurl, function(err, db) {
  if (err) throw err
  var collection = db.collection('shortURLs')
  collection.find({url: +url}).toArray(function(err, data) {
       if (err) throw err
       return data.ref;
    });
    db.close();
    });
    return null;
}

function getUrl(ref, callback){
  //return the URL linked to the supplied ref
  //returns null if norhing is found
  console.log('getting URL for - ' + ref)
  var lookup = {}
  lookup.ref = ref
  mongo.connect(DBurl, function(err, db) {
  if (err) throw err
  var collection = db.collection('shortURLs')
  collection.find(lookup).toArray(function(err, data) {
      db.close();
       if (err){
         callback(err);
       } else {
         console.log('getUrl data is ' + JSON.stringify(data));
         callback(null, data[0].url);
       }
    });
    });
}

function insertNewUrl(url){
  //insert the supplied URL into the DB with a new refrence
  //returns the refrence.
  console.log('adding a new URL ' + url)
  //if the url already exists in the DB just return the existing ref
  if(getRef(url)){
    return getRef(url);
  }
  var urlJSON = {};
  urlJSON.ref = getUniqueRef();
  urlJSON.url = url
  console.log('adding new element to DB - ' + JSON.stringify(urlJSON));
  mongo.connect(DBurl, function(err, db) {
  if (err) throw err
  var collection = db.collection('shortURLs')
  collection.insert(urlJSON, function(err, data) {
    if (err) console.log('Error in insert ' + err);
    db.close()
    console.log('item added to the DB correctly ' + JSON.stringify(urlJSON));
  });
});
return urlJSON.ref;
}

function validUrl(url) {
  var pattern = "^((https|http|ftp|rtsp|mms)?://)"
        + "?(([0-9a-z_!~*'().&=+$%-]+: )?[0-9a-z_!~*'().&=+$%-]+@)?" //ftp user@
        + "(([0-9]{1,3}\.){3}[0-9]{1,3}" // IP- 199.194.52.184
        + "|" 
        + "([0-9a-z_!~*'()-]+\.)*" // www.
        + "([0-9a-z][0-9a-z-]{0,61})?[0-9a-z]\." 
        + "[a-z]{2,6})" // first level domain- .com or .museum
        + "(:[0-9]{1,4})?" // port- :80
        + "((/?)|" // a slash isn't required if there is no file name
        + "(/[0-9a-z_!~*'().;?:@&=+$,%#-]+)+/?)$";
  var re=new RegExp(pattern);
  return re.test(url);
}

app.get('/new/:input', function (req, res) {
  var input = req.params.input;
  console.log('recieved input - ' + input)
  //parse the input and verify that the supplied string is a new URL. Otherwise return the usage page
  if(validUrl(input)){
    console.log('input is a URL')
    //generate a short ref for the url, add it to the DB and display the JOSN result to the user
    var results = { "original_url": null, "short_url": null };
    results.original_url = input;
    results.short_url = insertNewUrl(input);
    console.log('sending results ' + JSON.stringify(results));
    res.send(results);
  } else {
    res.sendFile(path.join(__dirname+'/index.html'));
  }
})

app.get('/:input', function (req, res) {
  var input = req.params.input;
  console.log('recieved input - ' + input)
  //check if this input exists in our DB as a refrence, if it does redirect the user to that page. Otherwise return the usage page
  getUrl(input, function(err, url){
    if (err) console.log('Error in insert ' + err);
    console.log('url is ' + url)
    if(url !== undefined){
      console.log('input is a valid refrence, redirecting the user')
       res.redirect(url);
    } else {
      res.sendFile(path.join(__dirname+'/index.html'));
    }
  });
})

//on a request with no additional details send the index page describing usage of the service.
app.get('/', function (req, res) {
  res.sendFile(path.join(__dirname+'/index.html'));
})

app.listen(port, function () {
  console.log('URL Shortener app listening on port ' + port + '!');
})
