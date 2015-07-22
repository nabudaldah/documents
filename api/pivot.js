module.exports = function(context){

  var stdout   = context.stdout;
  var stderr   = context.stderr;
  var config   = context.config;
  var db       = context.db;
  var app      = context.app;
  var channel  = context.channel;
  var trigger  = context.trigger;

  stdout('Initializing pivot API ... ');

  app.post('/api/:collection/pivot', function(req, res){

    var collection = db.collection(req.params.collection)

    var pivot = req.body;
    if(!pivot){ stderr('Missing request body.'); res.status(400).send('Missing request body.'); return }

    var match
    if(pivot.tags && pivot.tags.length) match = { "_tags": { "$all": pivot.tags } }

    var group = { _id: null, 'count': { '$sum': 1 } }
    if(pivot.by) {      
      for(index in pivot.by) {
        var field = pivot.by[index]
        if(!group._id) group._id = {}
        group._id[field] = { '$ifNull': [ '$' + field, 'NA' ] }
      }
    }

    if(pivot.measures && pivot.measures.length) {
      group['count'] = { '$sum': 1 }
      for(index in pivot.measures){
        var opp   = pivot.measures[index][0]
        var field = pivot.measures[index][1]
        var agg = {}; agg['$' + opp] = '$' + field
        group[opp + '_' + field] = agg
      }
    }

    var pipeline = []
    if(match)
      pipeline.push({ "$match": match });

    pipeline.push({ "$group": group })

    collection.aggregate(pipeline, function(err, data){
      if(err) { res.status(500).send(err); stderr(err) }
      else res.send(data)
    })

  })

};