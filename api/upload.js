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
  var parseXlsx = require('excel');

  // Credits: http://stackoverflow.com/a/23843746/3514414
  app.post('/api/:collection/upload', function (req, res, next) {

    var fstream;
    req.pipe(req.busboy);
    req.busboy.on('file', function (fieldname, file, filename) {
      console.log("Uploading: " + filename.split('[\/\\]').join(' '));

      //Path where image will be uploaded
      var id = uuid.v4();
      var target = config.tmp + '/' + id + '.xlsx'
      fstream = fs.createWriteStream(target);
      file.pipe(fstream);
      fstream.on('close', function () {    
        console.log("Upload Finished of " + filename + ' into ' + target);              

        parseXlsx(target, function(err, data) {
          if(err) throw err;
          console.log(data);
          res.send(data);           //where to go next
        });

      });
    });

  });

};