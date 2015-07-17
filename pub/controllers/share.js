ctrl.controller('share',
  ['$scope', '$routeParams', '$http', '$location', '$window', 'socket', '$timeout', 'messages',
  function ($scope, $routeParams, $http, $location, $window, socket, $timeout, messages) {

    $scope.user      = JSON.parse($window.localStorage.user || "{}");

    $scope.id         = $routeParams.id;
    $scope.collection = $location.path().split('/')[1];
    $scope.reference  = $scope.collection + '/' + $scope.id;
    $scope.api        = '/api/' + $scope.reference;

 
    $scope.shared = [
        { doc: 'Document001', exposure: 'public' }
    ]

  }]);
