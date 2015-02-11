ctrl.controller('raw', function($scope, $routeParams, $http, $location, $window, socket, $timeout, messages) {

  $scope.user      = JSON.parse($window.localStorage.user || "{}");

  $scope.docId  = $routeParams.id;
  $scope.docCol = $location.path().split('/')[1];
  $scope.docRef = $scope.docCol + '/' + $scope.docId;
  $scope.docApi = '/v1/' + $scope.docRef;
  $scope.docUrl = '/' + $scope.docRef;

  $scope.doc   = {};

  $scope.refresh = function(){  
    $http.get($scope.docApi + '/raw').success(function (data, status, headers, config) {

      $('#main-panel').addClass('panel-update');
      $timeout(function(){
        $('#main-panel').removeClass('panel-update');
      }, 100)

      $scope.doc   = data;
      $scope.text  = JSON.stringify($scope.doc, undefined, 2);
      $scope.ready = true;
    });
  }

  // Load data
  $scope.refresh();

  $scope.close =function(){
    $location.path($scope.docUrl);
  }

  $scope.save = function(){

    var json = null;
    try {
      json = JSON.parse($scope.text);
    } catch(e){
      json = null;
    }

    if(json){
      $scope.doc = json;
      $http.put($scope.docApi, $scope.doc);
      $scope.editing = false;      
    } else {
      messages.add('danger', 'Invalid JSON string. Object not saved.');
    }
  };

  $scope.form = function(){
    $location.path('/' + $scope.docCol + '/' + $scope.docId);
  }

  socket.on($scope.docRef, function (data) {
    $scope.refresh();
  });

  $scope.$on('$destroy', function () {
    socket.close($scope.docRef);
    $scope.doc = null;
  });

});
