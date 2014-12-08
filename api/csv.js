module.exports = function(app, db){

  app.get('/v1/:collection/csv/:template', function(req, res){
    
    var collection = db.collection(req.params.collection);
    var selection  = {  };
    var projection = {  };
    
    collection.find(selection, projection, function (err, data) {

      if(err)   { res.status(500).send('Database error.'); return; }
      if(!data) { res.status(400).send('Object not found in database.'); return; }

      res.send(csv);
    });

  });

  app.post('/v1/:collection/csv', function(req, res){

    var selection  = { };
    var projection = req.body;
    var collection = db.collection(req.params.collection);
   
    collection.find(selection, projection, function(err, data){
      if(err)   { res.status(500).send('Database error.'); return; }
      var newline = '\n', separator = '\t';
      var header = [];
      for(p in projection){ header.push(p); };
      var csv = header.join(separator) + newline;

      for(d in data){
        var object = data[d];
        var row = [];
        for(p in projection){
          row.push(object[p]);
        };
        csv = csv + row.join(separator) + newline;
      };
      res.send(csv);
      //res.end();
    });

  });

};
