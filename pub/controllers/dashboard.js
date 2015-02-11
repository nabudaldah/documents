ctrl.controller('dashboard',
  ['$scope', '$routeParams', '$http', '$location', '$window', 'socket', '$timeout', 'messages',
  function ($scope, $routeParams, $http, $location, $window, socket, $timeout, messages) {

    $scope.items = [];

    $scope.add = function(){
      $scope.items.push({
        columns: 1,
        height: 100
      });
    }

    for(var i = 0; i < 60; i++) $scope.add();

}]);
