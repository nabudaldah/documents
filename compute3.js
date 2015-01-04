var async = require('async');
var mongo = require('mongojs');
var db    = mongo.connect('documents');

function compute3(){

  var verbose = false;

  var query  = { tags: { $in: ["computation", "data"] } };
  var fields = { _id: 1, tags: 1, update: 1, dependencies: 1, computation: 1 };

  function getDocuments(callback){
    var t0 = new Date();
    db.collection('computations').find(query, fields, function(err, data) {
      documentsList = data;
      if(verbose) console.log('compute3: getDocuments: ' + (new Date() - t0))
      callback();
    });
  };

  function sortDocuments(callback){
    var t0 = new Date();
    for(d in documentsList){
      var doc = documentsList[d];
      documents[doc._id] = doc;
      if(doc.tags[0] = "computation") computationDocuments[doc._id] = doc;
      if(doc.tags[0] = "data")        dataDocuments[doc._id] = doc;
    }
    if(verbose) console.log('compute3: sortDocuments: ' + (new Date() - t0))
    callback();
  };

  function listComputations(callback){
    var t0 = new Date();
    for(c in computationDocuments){
      var parent = computationDocuments[c];
      if(!parent.dependencies) continue;
      var id = parent.dependencies.split('/')[1];
      var child = documents[id];
      if(new Date(parent.update) < new Date(child.update))
        computations.push(parent);
    }
    if(verbose) console.log('compute3: listComputations: ' + (new Date() - t0))
    callback();
  };

  function queueComputations(callback){
    computations.map(function(computation){
      var init   = 'context <- list(collection="' + 'computations' + '", id="' + computation._id + '");\n';
      var script = computation.computation;
      run(init + script);
    })
  };

  function finish(err){
    if(verbose) console.log('compute3: done. need ' + computations.length + ' computations');
    //db.close();
  };

  var documentsList = [];
  var documents     = {};
  var computationDocuments = {};
  var dataDocuments = {}; 
  var computations  = [];
  async.series([getDocuments, sortDocuments, listComputations], finish);

}

compute3();