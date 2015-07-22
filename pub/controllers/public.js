ctrl.controller('public',
  ['$scope', '$routeParams', '$http', '$location', '$window', 'socket', '$timeout', 'messages',
  function ($scope, $routeParams, $http, $location, $window, socket, $timeout, messages) {

  $scope.id         = $routeParams.id;
  $scope.collection = $location.path().split('/')[1];
  $scope.reference  = $scope.collection + '/' + $scope.id;
  $scope.api        = '/api/' + $scope.reference;

  $('[data-toggle="popover"]').popover({html: true, container: 'body', trigger: 'hover' });

  $scope.doc   = {};
  $scope.doc._template = [];

  $scope.new = !$scope.id;
  //$scope.ready = true;
  $scope.editing = true;

  $http.get($scope.api)
  .success(function (doc) {

    $scope.doc = doc;
    $scope.ready = true;

  }).error(function(error){
    messages.add('danger', 'Error retrieving doc "' + $scope.reference + '".');
    $scope.message = 'Document not found.'
  });

  $scope.additional = function(field){
    //if(field.charAt(0) == '_') return false;
    if(['_id', '_tags', '_template', '_data', '_update', '_public'].indexOf(field) != -1) return false;
    for(t in $scope.doc._template) if($scope.doc._template[t].name == field) return false;
    return true;
  }

}]);
