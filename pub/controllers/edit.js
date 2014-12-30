ctrl.controller('edit',
	['$scope', '$routeParams', '$http', '$location', '$window', 'socket', '$timeout', 'messageCenterService',
	function ($scope, $routeParams, $http, $location, $window, socket, $timeout, messageCenterService) {

  $scope.user      = JSON.parse($window.localStorage.user || "{}");

  $scope.id  = $routeParams.id;
  $scope.collection = $location.path().split('/')[1];
  $scope.reference = $scope.collection + '/' + $scope.id;
  $scope.api = '/v1/' + $scope.reference;

  $scope.doc   = {};
  $scope.doc.template = [];

  $scope.new = !$scope.id;
  //$scope.ready = true;
  $scope.editing = true;

  if($scope.new){

    $scope.editing = true;
    $scope.doc = {
      _id: $scope.collection + '-' + uuid().split('-')[0],
      tags: [$scope.collection],
      template: []
    }
    
    if($routeParams.template){
      $http.get('/v1/' + $scope.collection + '/' + $routeParams.template)
      .success(function (templateObject) {
        $scope.doc.template = templateObject.template;
        $scope.ready= true;
      }).error(function(error){
        $scope.ready = true;
      });
    } else {
      $scope.ready= true;
    }
  }

  if(!$scope.new) {

    $http.get($scope.api)
    .success(function (doc) {

      $scope.doc = doc;
      $scope.ready = true;

    }).error(function(error){
      messageCenterService.add('danger', 'Error retrieving doc "' + $scope.reference + '".');
    });

  }

  $scope.additional = function(field){
    if(field == '_id' || field == 'tags' || field == "template" || field == "data") return false;
    for(t in $scope.doc.template) if($scope.doc.template[t].name == field) return false;
    return true;
  }

  $scope.starred = false;
  $http.get('/v1/settings/' + $scope.user._id)
  .success(function (data, status, headers, config) {
    if(data && data.starred){
      if(typeof(data.starred) == 'string') data.starred = data.starred.split(',');
      $scope.starred = data.starred.indexOf($scope.reference) != -1;
    }
  }).error(function (data, status, headers, config){
      messageCenterService.add('danger', 'Error retrieving user settings "/v1/settings/' + $scope.user._id + '".');  	
  });

  $scope.edit = function(){
    $scope.editing = 1;
  }

  $scope.raw = function(){
    var url = $location.path() + '/raw';
    $location.path(url);
  }

  $scope.close = function(){
    $location.path('/' + $scope.collection);
  }

  $scope.autosave = function(property){
  	if(property == undefined || $scope.doc[property] == undefined) return;

  	var doc = {};
  	doc[property] = $scope.doc[property];
    $http.put('/v1/' + $scope.collection + '/' + $scope.doc._id, doc)
    .success(function (data, status, headers, config){
    	// all ok
    }).error(function (data, status, headers, config){
      messageCenterService.add('danger', 'Error autosaving property "' + property + '" of doc "' + $scope.doc._id + '".');
    });  	
  }

  $scope.save = function(){
    $scope.saving = !$scope.saving;
    $http.put('/v1/' + $scope.collection + '/' + $scope.doc._id, $scope.doc)
    .success(function (data, status, headers, config){
    	// all ok
    }).error(function (data, status, headers, config){
      messageCenterService.add('danger', 'Error saving doc "' + $scope.doc._id + '".');
    });
  };

  $scope.delete = function(){
    $http.delete('/v1/' + $scope.collection + '/' + $scope.doc._id)
    .success(function (data, status, headers, config){
    	$scope.close();
    }).error(function (data, status, headers, config){
      messageCenterService.add('danger', 'Error deleting document "' + $scope.doc._id + '".');
    });
  };

  $scope.create = function(){
    $scope.saving = !$scope.saving;
    var url = '/v1/' + $scope.collection;
    console.log($scope.doc)
    $http.post(url, $scope.doc)
    .success(function (data, status, headers, config){
        var url = '/' + $scope.collection + '/' + $scope.doc._id;
        $location.path(url);
    }).error(function (data, status, headers, config){
      messageCenterService.add('danger', 'Error creating doc "' + $scope.doc._id + '".');
    });
  }

  $scope.asTemplate = function(){
    if($scope.saveAsTemplate){
      $scope.doc.tags.push('template');
    } else {
      $scope.doc.tags.splice($scope.doc.tags.indexOf('template'), 1);      
    }
  }

  $scope.addProperty = function(type){
    $scope.newProperty = { type: type, name: $scope.newPropertyName, order: null } // default text field...
    if(!$scope.doc.template) $scope.doc.template = [];
    $scope.newProperty.order = $scope.doc.template.length + 1;
    $scope.doc.template.push($scope.newProperty);
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
    $scope.save();
    delete $scope.newPropertyName;
  };

  $scope.newPropertyOk = function(){
    if(!$scope.newPropertyName) return false;
    for(i in $scope.doc.template){
      if($scope.doc.template[i].name == $scope.newPropertyName) return false;
    }
    return true;
  }

  $scope.star = function(){
    $scope.starred = !$scope.starred;
    $http.get('/v1/settings/' + $scope.user._id)
    .success(function (data, status, headers, config) {
      if(data){
        if(data.starred == undefined){
          data.starred = [];
        }
        if(typeof(data.starred) == 'string') data.starred = data.starred.split(',');
        if($scope.starred) data.starred.push($scope.reference);
          else data.starred.splice(data.starred.indexOf($scope.reference), 1);
        $http.put('/v1/settings/' + $scope.user._id, {starred: data.starred});
      }
    }).error(function (data, status, headers, config){
      messageCenterService.add('danger', 'Error starring doc.');
    });
  };

  socket.on($scope.reference, function (data) {
    $scope.refresh();
  });

  $scope.$on('$locationChangeStart', function (event, next, current) {
    socket.close($scope.reference);
    $scope.doc = null;
  });

  $scope.refresh = function(){
    $http.get($scope.api).success(function (newObject) {

    	$('#main-panel').addClass('panel-update');
    	$timeout(function(){
  	  	$('#main-panel').removeClass('panel-update');
    	}, 500)

      var oldObject = $scope.doc;
      //var newObject = newObject)
      // console.log(oldObject)
      // console.log(newObject)

      var syncObject = function(oldObject, newObject){

        // console.log('---');

        /* OK */
        for(key in newObject){
          if(newObject[key] && oldObject[key]) {
            var d = JSON.stringify(newObject[key]) == JSON.stringify(oldObject[key]);
            //console.log('both: ' + key + ' (same? '+d+')');
            // if(!d) console.log('changed: ' + key)
            if(!d) oldObject[key] = newObject[key];
          }
        }

        /* OK */
        for(key in newObject){
          if(newObject[key] && !oldObject[key]) {
            oldObject[key] = newObject[key]
            // console.log('added: ' + key);
          }
        }

        /* OK */
        for(key in oldObject){
          if(!newObject[key]) {
            // console.log('removed: ' + key);
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

  $scope.columnsUp = function(){
    $scope.columns = { '6': 12, '12': 6 }[$scope.columns];
    $window.localStorage.columns = $scope.columns;
    $timeout(function(){ $(window).trigger('resize') }, 0);
  }

  $scope.$on("$destroy", function() {
    console.log('destroy')
  });

}]);
