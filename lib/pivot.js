var async = require('async');

var sqldb;
var database   = "";
var collection = "";
var sqlitefile = "";
var columns    = [];
var data       = [];


function loadTemplateColumns(end){


  var mongodb = require('mongojs').connect(database, [collection]);
  mongodb[collection].find({ tags: { $all: ['template'] } } , function (err, data0){

    // Search all fields in all templates
    var templateFields = {};
    var templates = data0;
    console.log(templates);
    for(var t in templates){
      // var object = load(collection, templates[t], { template: 1 });
      var template = templates[t].template || [];
      template.map(function(x){ if(x.type == 'text') templateFields[x.name] = 1; });
    }

    // Get all objects and all fields
    console.log(templateFields);
    var fields = [];
    for(var f in templateFields) fields[fields.length] = f;
    columns = fields;
    console.log('found ' + columns.length + ' columns in ' + templates.length + ' templates: ' + columns)

    mongodb.close();
    end();
  });

}

function loadFromMongoDB(end){
  var mongodb = require('mongojs').connect(database, [collection]);
  mongodb[collection].find({}, function (err, data0){
    data = data0;
    console.log(collection + ': ' + data.length + ' objects...');
    mongodb.close();
    end();
  });
}

function saveToSQLite(end) {

  var N = data.length;
  var n = 0;
  var b = 100;
  var abort = false;

  var sqlite3 = require('sqlite3').verbose();
  sqldb = new sqlite3.Database(sqlitefile, function(err){
    if(err) {end(err); return;}

    sqldb.serialize(function() {
      
      sqldb.run("PRAGMA journal_mode = OFF");
      sqldb.run("PRAGMA synchronous  = OFF");
      sqldb.run("PRAGMA temp_store   = MEMORY");
      sqldb.run("DROP TABLE IF EXISTS `" + collection + "`;");
      var query = "CREATE TABLE `" + collection + "` (`" + columns.join('`,`') + "`);";
      console.log(query)
      sqldb.run(query);

      for(d in data){
        var object = data[d];
        var row = [];
        for(c in columns){ row.push(((object[columns[c]]||'').toString().replace(/[^a-zA-Z0-9 ]/gi,''))); }
        var query = "INSERT INTO `"+collection+"` (`" + columns.join('`,`') + "`) VALUES ('" + row.join("','") + "')";
        console.log(query);
        sqldb.run(query, function(err){
          if(err) { end(err); return; }
          if(!((++n) % Math.round(N / b))) console.log(Math.round(n / N * 100) + '% done.');
        });
      };
          
      sqldb.run("SELECT 0 WHERE 0", function(){ end(); })

    });
  });
};

exports.update = function (MongoDbDatabaseName, MongoDBCollectionName, SQLiteFile, callback){
  database   = MongoDbDatabaseName;
  collection = MongoDBCollectionName;
  sqlitefile = SQLiteFile;
  async.series([loadTemplateColumns, loadFromMongoDB, saveToSQLite], 
    function (err, results){
      sqldb.close();
      if(err) { console.log(err); }
      callback(err, results);
    });  
}

// exports.update('contracts', ["tags","customer","direction","tariff","type","volume"], '../../db/pivot.sqlite3', function(){
//   console.log('done.')
// });

// exports.templateColumns = function(templateFile, callback){
//   var fs = require('fs');
//   var columns = [];
//   fs.readFile(templateFile, { encoding: 'utf8' }, function(err, data){
//     if(err || !data) { callback(err); return; }
//     var template = JSON.parse(data);
//     for(key in template){ columns.push(key); };
//     callback(err, columns);
//   });
// };

// exports.templateColumns('./app/tmpl/countries.json', function(err, columns){
//   console.log(columns);
// });


// collection = 'parties'
// loadTemplateColumns(function(){
//   console.log('done');
// })
