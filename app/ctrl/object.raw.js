ctrl.controller('object.raw', function($scope, $routeParams, $http, $location, $window, messages) {

  $scope.user      = JSON.parse($window.localStorage.user || "{}");

  $scope.objectId  = $routeParams.id;
  $scope.objectCol = $location.path().split('/')[1];
  $scope.objectRef = $scope.objectCol + '/' + $scope.objectId;
  $scope.objectApi = '/v1/' + $scope.objectRef;
  $scope.objectUrl = '/' + $scope.objectRef;

  $scope.object   = {};

  $http.get($scope.objectApi + '/raw').success(function (data, status, headers, config) {
    $scope.object = data;
    $scope.text = JSON.stringify($scope.object, undefined, 2);
    $scope.ready = true;
  });

  $scope.close =function(){
    $location.path($scope.objectUrl);
  }

  $scope.save = function(){

    var json = null;
    try {
      json = JSON.parse($scope.text);
    } catch(e){
      json = null;
    }

    if(json){
      $scope.object = json;
      $http.put($scope.objectApi, $scope.object);
      $scope.editing = false;      
    } else {
      messages.add('danger', 'Invalid JSON string. Object not saved.');
    }
  };

  $scope.delete = function(){
    $http.delete($scope.objectApi);
    $location.path($scope.objectUrl);
  };

  $scope.form = function(){
    $location.path('/' + $scope.objectCol + '/' + $scope.objectId);
  }

});
