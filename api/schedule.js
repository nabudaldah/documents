module.exports = function(app, config, db, channel){

  /* Scheduler */
  console.log('Loading scheduler...');
  var schedule = require('node-schedule');
  var request = require('request');

  // Check settings
  var collection = db.collection('settings');
  collection.findOne({ _id: 'scheduler' }, function (err, data) {

    if(err)            { console.error('schedule.js: Database error.');               return; }
    if(!data) { 
      collection.insert(config.scheduler, function(err, data){
        if(err) { console.error('schedule.js: Database error while inserting default scheduler configuration.'); return; }
      });
    };

  });

  channel.subscribe('update', function(message){
    if(message == "settings/scheduler"){
      console.log('updating schedule!');
      update();
    }
  });

  var jobs = [];

  var update = function(){

    // Cancel all current jobs
    jobs.map(function(job){ job.cancel(); });
    jobs = [];

    var collection = db.collection('settings');
    collection.findOne({ _id: 'scheduler' }, function (err, data) {

      if(err)            { console.error('schedule.js: Database error.');               return; }
      if(!data)          { console.error('schedule.js: Object not found in database.'); return; }
      if(!data.schedule) { console.error('schedule.js: Schedule not found in object.'); return; }

      var lines = data.schedule.split('\n');
      lines.map(function(line){
        line = line.trim();
        if(line.charAt(0) == '#') { console.log('schedule.js: ignoring: ' + line); return; }
        if(line == '') { console.log('schedule.js: ignoring empty line '); return; }
        var column = line.split(' ');
        if(column.length != 6) { console.error('schedule.js: expected 6 elements per line "' + line + '"'); return; }
        var reference = column[5];
        var repeat  = column;
        repeat.splice(5, 1);
        repeat = repeat.join(' ');
        console.log('schedule.js: scheduling: cron ' + repeat + ' doing ' + reference);
        var job = schedule.scheduleJob(repeat, function(){
          // Execute via API
          // /v1/:collection/:id/execute/:script
          var execute = reference.split('/')[0] + '/' + reference.split('/')[1] + '/execute/' + reference.split('/')[2];
          console.log('executing "' + execute + '" ...');
          request('http://localhost:3000/v1/' + execute);
        });
        jobs.push(job);
      });

    });

  };

  // Initial schedule
  update();

};