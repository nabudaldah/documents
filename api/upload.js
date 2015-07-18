module.exports = function(context){

  var stdout   = context.stdout;
  var stderr   = context.stderr;
  var config   = context.config;
  var db       = context.db;
  var app      = context.app;
  var channel  = context.channel;
  var trigger  = context.trigger;

  stdout('Initializing upload API ... ');

  var moment    = require('moment'); require('twix');
  var busboy    = require('connect-busboy');
  var path      = require('path');
  var fs        = require('fs-extra');
  var uuid      = require('node-uuid');
  var XLSX      = require('xlsx')

  // Credits: http://stackoverflow.com/a/23843746/3514414
  app.post('/api/:collection/upload', function (req, res, next) {

    var fstream;
    req.pipe(req.busboy);
    req.busboy.on('file', function (fieldname, file, filename) {

      //Path where image will be uploaded
      var id = uuid.v4();
      var target = config.tmp + '/' + id + '.xlsx'
      fstream = fs.createWriteStream(target);
      file.pipe(fstream);
      fstream.on('close', function () {    

        var wb = XLSX.readFile(target);
        var wsNames = []; for(s in wb.Sheets) wsNames.push(s);
        var ws = wb.Sheets[wsNames[0]]
        var json = XLSX.utils.sheet_to_json(ws)

        res.send(json)

      });
    });

  });

};