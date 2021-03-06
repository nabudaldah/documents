ctrl.controller('edit',
  ['$scope', '$routeParams', '$http', '$location', '$window', 'socket', '$timeout', 'messages',
  function ($scope, $routeParams, $http, $location, $window, socket, $timeout, messages) {

  // Autosave time every 10 seconds (milliseconds)
  var autosaveTime = 10000;

  $scope.user      = JSON.parse($window.localStorage.user || "{}");

  $scope.id         = $routeParams.id;
  $scope.collection = $location.path().split('/')[1];
  $scope.reference  = $scope.collection + '/' + $scope.id;
  $scope.api        = '/api/' + $scope.reference;
  $scope.baseurl    = $location.protocol() + '://' + $location.host() + ':' + $location.port() + '';

  $('[data-toggle="popover"]').popover({html: true, container: 'body', trigger: 'hover' });

  $scope.doc   = {};

  $scope.new = !$scope.id;
  //$scope.ready = true;
  $scope.editing = true;

  if($scope.new){

    $scope.editing = true;
    $scope.doc = {
      _id: uuid().split('-')[0],
      _tags: ['by:' + $scope.user._id, 'date:' + moment().format('YYYY-MM-DD'), 'time:' + moment().format('HH:mm')]
    }
    
    if($routeParams.template){
      $http.get('/api/' + $scope.collection + '/' + $routeParams.template)
      .success(function (templateObject) {
        if(templateObject._tags && templateObject._tags.indexOf('template') != -1) {
          var index = templateObject._tags.indexOf('template');
          templateObject._tags.splice(index, 1);
        }
        $scope.template      = templateObject._template;
        $scope.doc           = templateObject;
        $scope.doc._id       = uuid().split('-')[0],
        $scope.doc._template = $routeParams.template;
        $scope.hasTemplate   = false;
        $scope.ready         = true;
      }).error(function(error){
        $scope.ready         = true;
      });
      
    } else {

      $scope.ready = true;
      $scope.template = [];
      $scope.doc._template = [];

    }
  }

  if(!$scope.new) {

    $http.get($scope.api)
    .success(function (doc) {

      $scope.doc = doc;
      $scope.ready = true;

      // If object has an referenced template (indicated by a string refereing to ID of template object), take that objects template as template here
      if(typeof($scope.doc._template) == 'string'){

        $http.get('/api/' + $scope.collection + '/' + $scope.doc._template)
        .success(function (templateObject) {
          if(templateObject._tags && templateObject._tags.indexOf('template') != -1) {
            var index = templateObject._tags.indexOf('template');
            templateObject._tags.splice(index, 1);
          }
          $scope.template      = templateObject._template;
          $scope.hasTemplate   = false;
          $scope.ready         = true;
        }).error(function(error){
          $scope.ready         = true;
        });

      }

      if(typeof($scope.doc._template) == 'object'){
        $scope.template = $scope.doc._template;
        $scope.hasTemplate = true;
      }


    }).error(function(error){
      messages.add('danger', 'Error retrieving doc "' + $scope.reference + '".');
    });

  }

  $scope.additional = function(field){
    //if(field.charAt(0) == '_') return false;
    if(['_id', '_tags', '_template', '_data', '_update', '_public', '_script'].indexOf(field) != -1) return false;
    for(t in $scope.template) if($scope.template[t].name == field) return false;
    for(t in $scope.doc._template) if($scope.doc._template[t].name == field) return false;
    return true;
  }

  $scope.starred = false;
  $http.get('/api/users/' + $scope.user._id)
  .success(function (data, status, headers, config) {
    if(data && data.starred){
      if(typeof(data.starred) == 'string') data.starred = data.starred.split(',');
      $scope.starred = data.starred.indexOf($scope.reference) != -1;
    }
  }).error(function (data, status, headers, config){
      messages.add('danger', 'Error retrieving user "/api/users/' + $scope.user._id + '".');    
  });

  $scope.edit = function(){
    $scope.editing = 1;
  }

  $scope.raw = function(){
    var url = $location.path() + '/raw';
    $location.path(url);
  }

  $scope.script = function(){
    var url = $location.path() + '/script';
    $location.path(url);
  }

  $scope.close = function(){
    $location.path('/' + $scope.collection);
  }

  $scope.changedProperties = {};
  $scope.changedTimers     = {};
  $scope.autosaveEventually = function(property){

    if(property == undefined || $scope.doc[property] == undefined) return;

    $scope.changedProperties[property] = true;

    // Clear already running timers
    if($scope.changedTimers[property]){
      clearTimeout($scope.changedTimers[property]);
      $scope.changedTimers[property] = null;
      delete $scope.changedTimers[property]; 
    }

    // Autosave every second...
    $scope.changedTimers[property] = setTimeout(function(){
      $scope.autosave(property);
    }, autosaveTime);      

  };

  $scope.autosaveNow = function(property){
    if($scope.changedTimers[property]){
      clearTimeout($scope.changedTimers[property]);
      $scope.changedTimers[property] = null;
      delete $scope.changedTimers[property];
    };
    if($scope.changedProperties[property]){
      $scope.autosave(property);
    };
  };

  $scope.autosave = function(property){

    if(property == undefined || $scope.doc[property] == undefined) return;

    var doc = {};
    doc[property] = $scope.doc[property];
    $http.put('/api/' + $scope.collection + '/' + $scope.doc._id, doc)
    .success(function (data, status, headers, config){
      // Success
      $('#save').addClass('btn-success');
      $timeout(function(){
        $('#save').removeClass('btn-success');
      }, 100)

      $scope.changedProperties[property] = null;
      delete $scope.changedProperties[property];
    }).error(function (data, status, headers, config){
      messages.add('danger', 'Error autosaving property "' + property + '" of doc "' + $scope.doc._id + '".');
    });   
  }

  $scope.save = function(){
    $scope.saving = !$scope.saving;
    $http.put('/api/' + $scope.collection + '/' + $scope.doc._id, $scope.doc)
    .success(function (data, status, headers, config){
      // all ok
    }).error(function (data, status, headers, config){
      messages.add('danger', 'Error saving doc "' + $scope.doc._id + '".');
    });
  };

  $scope.delete = function(){
    $http.delete('/api/' + $scope.collection + '/' + $scope.doc._id)
    .success(function (data, status, headers, config){
      $scope.close();
    }).error(function (data, status, headers, config){
      messages.add('danger', 'Error deleting document "' + $scope.doc._id + '".');
    });
  };

  $scope.create = function(){
    $scope.saving = !$scope.saving;
    var url = '/api/' + $scope.collection;
    $http.post(url, $scope.doc)
    .success(function (data, status, headers, config){
        var url = '/' + $scope.collection + '/' + $scope.doc._id;
        $location.path(url);
    }).error(function (data, status, headers, config){
      messages.add('danger', 'Error creating doc "' + $scope.doc._id + '".');
    });
  }

  $scope.createTemplate = function(){
    $scope.doc._tags.push('template');
    $scope.create();
  }

  $scope.addProperty = function(type){
    // if($scope.hasTemplate == false);
    $scope.newProperty = { type: type, name: $scope.newPropertyName } // default text field...
    if(!$scope.doc._template) $scope.doc._template = [];
    $scope.doc._template.push($scope.newProperty);
    if(type == 'googlemaps'){
      $scope.doc[$scope.newPropertyName] = {
        center: {
          latitude: 45,
          longitude: -73
        },
        zoom: 8,
        options: {
          // draggable: false,
          // disableDoubleClickZoom: true,
          // scrollwheel: false,
          disableDefaultUI: true
        }
      };
    }
    // Auto save after adding property
    delete $scope.newPropertyName;
    $scope.template = $scope.doc._template;
    if(!$scope.new) $scope.save();
  };

  $scope.newPropertyOk = function(){
    if(!$scope.newPropertyName) return false;
    for(i in $scope.doc._template){
      if($scope.doc._template[i].name == $scope.newPropertyName) return false;
    }
    return true;
  }

  $scope.star = function(){
    $scope.starred = !$scope.starred;
    $http.get('/api/users/' + $scope.user._id)
    .success(function (data, status, headers, config) {
      if(data){
        if(data.starred == undefined){
          data.starred = [];
        }
        if(typeof(data.starred) == 'string') data.starred = data.starred.split(',');
        if($scope.starred) data.starred.push($scope.reference);
          else data.starred.splice(data.starred.indexOf($scope.reference), 1);
        $http.put('/api/users/' + $scope.user._id, {starred: data.starred});
      }
    }).error(function (data, status, headers, config){
      messages.add('danger', 'Error starring doc.');
    });
  };

  socket.on($scope.reference, function (data) {
    $scope.refresh();
  });

  $scope.$on('$destroy', function () {
    socket.close($scope.reference);
    $scope.doc = null;
  });

  $scope.refresh = function(){
    $http.get($scope.api).success(function (newObject) {
/*
      $('#main-panel').addClass('panel-update');
      $timeout(function(){
        $('#main-panel').removeClass('panel-update');
      }, 100)
*/
      $('#refresh').addClass('btn-success');
      $timeout(function(){
        $('#refresh').removeClass('btn-success');
      }, 100)

      var oldObject = $scope.doc;
      //var newObject = newObject)

      var syncObject = function(oldObject, newObject){


        /* OK */
        for(key in newObject){
          if(newObject[key] && oldObject[key]) {
            var d = JSON.stringify(newObject[key]) == JSON.stringify(oldObject[key]);
            if(!d) oldObject[key] = newObject[key];
          }
        }

        /* OK */
        for(key in newObject){
          if(newObject[key] && !oldObject[key]) {
            oldObject[key] = newObject[key]
          }
        }

        /* OK */
        for(key in oldObject){
          if(!newObject[key]) {
            //delete oldObject[key];
          }
        }  

        return oldObject;
      }

      //$scope.doc = 
      syncObject(oldObject, newObject);
      //syncObject($scope.doc, doc);
      delete oldObject;
      
    });    
  };

  if($window.localStorage.columns) {
    $scope.columns = parseInt($window.localStorage.columns);
  } else {
    $scope.columns = 12
  }

  $scope.editTemplateStart = function(){
    $scope.editTemplate = true;
    $scope.bindFields();
  }

  $scope.editTemplateStop = function(){
    $scope.editTemplate = false;
    $scope.autosave('_template');
    $(".templateField").draggable("option", "disabled", true);
  }

  $scope.widthTemplateField = function(index, width){
    if(index < 0 || index > $scope.doc._template.length - 1) return;
    $scope.doc._template[index].width = width;    
    $scope.autosave('_template');
  }

  $scope.shiftTemplateField = function(index, shift){

    // Credits: http://stackoverflow.com/a/5306832
    Array.prototype.move = function (old_index, new_index) {
      if (new_index >= this.length) {
        var k = new_index - this.length;
        while ((k--) + 1) {
          this.push(undefined);
        }
      }
      this.splice(new_index, 0, this.splice(old_index, 1)[0]);
      return this; // for testing purposes
    };

    if(index < 0 || index > $scope.doc._template.length - 1) return;

    $scope.doc._template.move(index, index + shift);

    $scope.autosave('_template');

  }

  $scope.removeTemplateField = function(index){

    if(index < 0 || index > $scope.doc._template.length - 1) return;
    $scope.doc._template.splice(index, 1);
    $scope.autosave('_template');

  }

  $scope.columnsUp = function(){
    $scope.columns = { '6': 12, '12': 6 }[$scope.columns];
    $window.localStorage.columns = $scope.columns;
    $timeout(function(){ $(window).trigger('resize') }, 0);
  }

  // $scope.$on("$destroy", function() {
  // });

  // autosave every attribute?
  // $scope.$watch('doc', function(oldDoc, newDoc) {
  //   console.log(oldDoc, newDoc);
  //   if(oldDoc == newDoc){
  //     console.log('nothing really changed...')
  //   } else {
  //     console.log('hey, doc has changed!');      
  //   }
  // }, true);


  $scope.bindField = function(name){

    var id = nameId(name);


    // Anonymous function to copy id, instead of referencing it: credits: http://stackoverflow.com/a/5226333
    (function(id){
      setTimeout(function(){

        //Set the draggable elements
        $("#" + id).draggable({
          helper: 'clone',
          appendTo: 'body',
          start: function(){
            $(this).css({display: 'none'});
            $scope.dragging = fieldById(this.id);
            $scope.$apply();
          },
          stop: function(){
            $(this).css({display: 'block'});
            $scope.squeezeBefore($scope.dragging, $scope.hovering);
            $scope.$apply();
          }
        });

        $("#" + id).droppable({
          over: function (event, ui) {
            //$(this).css('border', '1px solid red');
            $scope.hovering = fieldById(this.id);
            $scope.previewBefore($scope.dragging, $scope.hovering);
            $scope.$apply();

          },
          out: function(event, ui ) {
            // $(this).css('border', '2px solid blue');
            $scope.$apply();
          }
        });

      }, 10);
    })(id);

  }

  var fieldIndex = function(id){
    for(var i = 0; i < $scope.doc._template.length; i++)
      if(nameId($scope.doc._template[i].name) == id) return(i);      
    return(null);
  }

  var fieldById = function(id){
    var i = fieldIndex(id);
    if(i != null) return($scope.doc._template[i]);
    else return(null);
  }

  $scope.moveItem = function(fromId, toId){

    if(!fromId || !toId) return;

    var fromIdx  = fieldIndex(fromId);
    var fromItem = fieldById(fromId);

    $scope.doc._template.splice(fromIdx, 1);

    //var toIdx    = fieldIndex(toId) + 1;
    var toIdx    = fieldIndex(toId);
    $scope.doc._template.splice(toIdx, 0, fromItem);

  }

  var nameId = function(name){
    return('field-' + name);
  }

  $scope.previewBefore = function(dragging, hovering){
    if(!dragging || !hovering) return;
    $('.before-field').css('display', 'none');
    var before = $('#before-' + nameId(hovering.name));
    before.css('display', 'block');
    before.addClass('col-md-' + dragging.width);
    before.css('height', 150 + 'px');
  }

  $scope.squeezeBefore = function(dragging, hovering){
    $('.before-field').css('display', 'none');      
    if(!dragging || !hovering) return;
    $scope.moveItem(nameId(dragging.name), nameId(hovering.name));
    $('.before-field').css('display', 'none');      
  }


  $scope.bindFields = function(){
    $scope.doc._template.map(function(field){
      // $scope.addItem(field.name);
      $scope.bindField(field.name);
    })
  }

  $scope.share = function(){

    if($scope.doc._public){

      var url = $scope.api + '/public';
      console.log(url)
      $http.delete(url)
      .success(function (data, status, headers, config){
        $scope.doc._public = ""
        $scope.save();
      }).error(function (data, status, headers, config){
        messages.add('danger', 'Error creating doc "' + $scope.doc._id + '".');
        console.log('failed')
      });

    } else {

      var url = $scope.api + '/public';
      console.log(url)
      $http.post(url, {})
      .success(function (data, status, headers, config){
        $scope.doc._public = data
        $scope.save();
      }).error(function (data, status, headers, config){
        messages.add('danger', 'Error creating doc "' + $scope.doc._id + '".');
        console.log('failed')
      });

    }

  }

  $scope.compute = function(){
    $scope.message = "Computing..."
    $scope.computing = true;
    $http.get($scope.api + '/compute/_script')
    .success(function(data, status, headers, config) {
        $scope.message = data;
        $scope.computing = false;
        $scope.refresh();
    }).error(function(data, status, headers, config){
        $scope.message = data;
        $scope.computing = false;
    });
  };


}]);
