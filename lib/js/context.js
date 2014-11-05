var Fiber   = require('fibers');
var mongo   = require('mongojs');
var db      = mongo.connect('files');
var fs      = require('fs');
var request = require('request');
var esprima = require('esprima');

//console.log(JSON.stringify(esprima.parse('var answer = 42'), null, 4));

Fiber(function() {
  
  // HTTP functions (get, put and post)
  var get = function (url){
    var fiber = Fiber.current;
    var result;
    request(url, function (err, res, body) {
      if (!err) { result = body; }
      fiber.run();
    });
    Fiber.yield(result);
    return result;
  };

  var put = function(data, url){
    var fiber = Fiber.current;
    var result;
    request.put({url: url, json: data }, function (err, res, body) {
      result = err;
      fiber.run();
    });
    Fiber.yield(result);
    return result;
  };

  var post = function(data, url){
    var fiber = Fiber.current;
    var result;
    request.post({url: url, json: data }, function (err, res, body) {
      result = err;
      fiber.run();
    });
    Fiber.yield(result);
    return result;
  };

  // File functions (read, write and dir)
  var read = function(filename){
    var fiber = Fiber.current;
    var result;
    fs.readFile(filename, { encoding: 'utf8' }, function (err, data) {
      result = data;
      fiber.run();
    });      
    Fiber.yield(result);
    return result;
  };

  var write = function(data, filename){
    var fiber = Fiber.current;
    var result;
    fs.writeFile(filename, data, function (err) {
      fiber.run();
    });    
    Fiber.yield(result);
    return result;
  };

  var dir = function(path){
    var fiber = Fiber.current;
    var result;
    fs.readdir(path, function (err, files) {
      result = files;
      fiber.run();
    });
    Fiber.yield(result);
    return result;
  };

  // Database functions (list, load and save)
  var list = function(collection, query) {
    var fiber = Fiber.current;
    var result;
    var dbc = db.collection(collection);
    dbc.find(query, function (err, data) {
      result = data;
      fiber.run();
    });
    Fiber.yield(result);
    return result;
  };
  
  var load = function(collection, id) {
    var fiber = Fiber.current;
    var result;
    var dbc = db.collection(collection);
    dbc.findOne({ _id: id }, function (err, data) {
      result = data;
      fiber.run();
    });
    Fiber.yield(result);
    return result;
  };

  var save = function(collection, id, object) {
    var fiber = Fiber.current;
    var result;
    var dbc = db.collection(collection);
    dbc.update({ _id: id }, { $set: object }, { upsert: true }, function (err, data) {
      result = data;
      fiber.run();
      // if(io && io.sockets) {
      //   console.log('object changed from context.js');
      //   var ref = collection + '/' + id;
      //   io.sockets.emit(ref, 'updated')
      // };
    });
    Fiber.yield(result);
    return result;
  };

  var xmldoc = require('xmldoc');
  var moment = require('moment');
  
  try{

/* SCRIPT */
  
  } catch(e){
    console.error(e)
  }
    
  db.close();
}).run();