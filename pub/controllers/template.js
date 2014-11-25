ctrl.controller('edit',
	['$scope', '$routeParams', '$http', '$location', '$window', 'socket', '$timeout', 'messageCenterService',
	function ($scope, $routeParams, $http, $location, $window, socket, $timeout, messageCenterService) {

  $scope.user      = JSON.parse($window.localStorage.user || "{}");

  $scope.objectId  = $routeParams.id;
  $scope.objectCol = $location.path().split('/')[1];
  $scope.objectRef = $scope.objectCol + '/' + $scope.objectId;
  $scope.objectApi = '/v1/' + $scope.objectRef;
  $scope.objectUrl = '/' + $scope.objectRef;

  $scope.object   = {};
  $scope.object.template = [];

  $scope.new = !$scope.objectId;
  //$scope.ready = true;
  $scope.editing = true;

  if($scope.new){

    $scope.editing = true;
    $scope.object = {
      _id: $scope.objectCol + '-' + uuid().split('-')[0],
      tags: [$scope.objectCol],
      template: []
    }
    
    if($routeParams.template){
      $http.get('/v1/' + $scope.objectCol + '/' + $routeParams.template)
      .success(function (templateObject) {
        $scope.object.template = templateObject.template;
        $scope.ready= true;
      }).error(function(error){
        $scope.ready = true;
      });
    } else {
      $scope.ready= true;
    }
  }

  if(!$scope.new) {

    $http.get($scope.objectApi)
    .success(function (object) {

      $scope.object = object;
      $scope.ready = true;

    }).error(function(error){
      messageCenterService.add('danger', 'Error retrieving object "' + $scope.objectRef + '".');
    });

  }

  $scope.additional = function(field){
    if(field == '_id' || field == 'tags' || field == "template" || field == "data") return false;
    for(t in $scope.object.template) if($scope.object.template[t].name == field) return false;
    return true;
  }

  $scope.starred = false;
  $http.get('/v1/settings/' + $scope.user._id)
  .success(function (data, status, headers, config) {
    if(data && data.starred){
      if(typeof(data.starred) == 'string') data.starred = data.starred.split(',');
      $scope.starred = data.starred.indexOf($scope.objectRef) != -1;
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
    $location.path('/' + $scope.objectCol);
  }

  $scope.save = function(){
    $scope.saving = !$scope.saving;
    $http.put('/v1/' + $scope.objectCol + '/' + $scope.object._id, $scope.object)
    .success(function (data, status, headers, config){
    	// all ok
    }).error(function (data, status, headers, config){
      messageCenterService.add('danger', 'Error saving object "' + $scope.object._id + '".');
    });
  };

  $scope.create = function(){
    $scope.saving = !$scope.saving;
    var url = '/v1/' + $scope.objectCol;
    console.log($scope.object)
    $http.post(url, $scope.object)
    .success(function (data, status, headers, config){
        var url = '/' + $scope.objectCol + '/' + $scope.object._id;
        $location.path(url);
    }).error(function (data, status, headers, config){
      messageCenterService.add('danger', 'Error creating object "' + $scope.object._id + '".');
    });
  }

  $scope.asTemplate = function(){
    if($scope.saveAsTemplate){
      $scope.object.tags.push('template');
    } else {
      $scope.object.tags.splice($scope.object.tags.indexOf('template'), 1);      
    }
  }

  $scope.addProperty = function(type){
    $scope.newProperty = { type: type, name: $scope.newPropertyName, order: null } // default text field...
    if(!$scope.object.template) $scope.object.template = [];
    $scope.newProperty.order = $scope.object.template.length + 1;
    $scope.object.template.push($scope.newProperty);
    if(type == 'googlemaps'){
      $scope.object[$scope.newPropertyName] = {
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
    delete $scope.newPropertyName;
  };

  $scope.newPropertyOk = function(){
    if(!$scope.newPropertyName) return false;
    for(i in $scope.object.template){
      if($scope.object.template[i].name == $scope.newPropertyName) return false;
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
        if($scope.starred) data.starred.push($scope.objectRef);
          else data.starred.splice(data.starred.indexOf($scope.objectRef), 1);
        $http.put('/v1/settings/' + $scope.user._id, {starred: data.starred});
      }
    }).error(function (data, status, headers, config){
      messageCenterService.add('danger', 'Error starring object.');
    });
  };

  socket.on($scope.objectRef, function (data) {
    $scope.refresh();
  });

  $scope.$on('$locationChangeStart', function (event, next, current) {
    socket.close($scope.objectRef);
    $scope.object = null;
  });

  $scope.refresh = function(){
    $http.get($scope.objectApi).success(function (newObject) {

    	$('#main-panel').addClass('panel-update');
    	$timeout(function(){
  	  	$('#main-panel').removeClass('panel-update');
    	}, 500)

      var oldObject = $scope.object;
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

      //$scope.object = 
      syncObject(oldObject, newObject);
      //syncObject($scope.object, object);
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
