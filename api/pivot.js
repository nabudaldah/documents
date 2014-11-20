module.exports = function(app, config){

  var sqlite3 = require('sqlite3').verbose();
  var pivot   = require('../lib/pivot.js');

  console.log('Opening Sqlite3 database file...')
  try {
    var db3_create = new sqlite3.Database(config.sqlite.database);
    db3_create.close();
    var db3 = new sqlite3.Database(config.sqlite.database, sqlite3.OPEN_READONLY);
  } catch(err){
    console.log('Failed to open Sqlite3 database: ' + err)
  }

  /* Update pivot table */
  app.get('/v1/:collection/pivot-update', function(req, res){
    var collection = req.params.collection;
    pivot.update(config.mongo.database, collection, config.sqlite.database, function(err, results){
      if(err) { res.status(400).send(error('Failed to save update pivot table')); return; }
      res.end();
    });
  });

  /* Query pivot table */
  app.get('/v1/:collection/pivot', function (req, res) {

    // http://localhost/api/pivot/WorldBank?row=Region&column=Year&measure=SUM(GDP)&filter=Region='Europe',Year>2003
    var table      = req.params.collection;
    var row        = req.query.row;
    var column     = req.query.column;
    var measure    = req.query.measure;

    var where = req.query.where;
    if(where) where = where.split(',');
    else where = [];

    var dimensions = [];
    if(row) dimensions.push(row)
    if(column) dimensions.push(column);

    var select = [].concat(dimensions);
    if(measure) select.push(measure);

    var data = {
      row:       row,
      column:    column,
      rows:       [],
      columns:    [],
      dimensions: dimensions,
      measure:     measure,
      table:      [],
      list:       {}
    };

    function check(end){
      if(!table) { end('Missing table.'); return; }
      if(!select.length) { end('Missing row, column and measure.'); return; }
      end();
    };

    function fetchDimensions(end){

      function fetchDimension(dimension, end){
        var query = "SELECT DISTINCT(`" + dimension + "`) FROM `" + table + "` ORDER BY `" + dimension + "`;";
        console.log("SQL: " + query);
        db3.all(query, function(err, table) {
          if(err || !table) { end(err); return; }
          for(var r = 0; r < table.length; r++){
            if(dimension == row)    data["rows"].push(table[r][dimension]);
            if(dimension == column) data["columns"].push(table[r][dimension]);
          }
          end();
        });
      };

      function respond(err){ if(err) { end(err); return; } else { end(); } }

      async.each(dimensions, fetchDimension, respond);
    };

    function fetchData(end){
      var sql = "SELECT " + select.join(', ') + " FROM " + table + " where " + measure.match(/\([^\)]+\)/) + ' <> ""';

      if(where.length)   sql += " AND " + where.join(" AND ");
      if(dimensions.length) sql += " GROUP BY " + dimensions.join(', ');
      sql += ";"
      console.log('sql: ' + sql);
      db3.all(sql, function(err, table) {
        if(err) { end(err); return; }
        data["table"] = table;
        end();
      });
    };

    function transformData(end){
      for(var r = 0; r < data.table.length; r++){
        var id = [];
        if(row)    id.push(data.table[r][row]);
        if(column) id.push(data.table[r][column]);
        if(measure) data.list[id.join(',')] = data.table[r][measure];
        else        data.list[id.join(',')] = true;        
      };
      end();
    };

    function respond(err, results){
      if(err) res.status(400).send('Database error. ' + err);
      else res.send(data);
    };

    async.series([check, fetchDimensions, fetchData, transformData], respond);

  });
};