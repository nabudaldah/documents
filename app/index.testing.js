var app = angular.module('app', ['ctrl']);
var ctrl = angular.module('ctrl', []);
ctrl.controller('main', function ($scope, $http, $window, $location) {

  $scope.tree = {
    data: "base01",
    nodes: []
  };

});

app.directive("tree", function() {
  
  var link = function(scope, element, attr){
    console.log(scope.ngModel);

    if(!scope.ngModel) scope.ngModel = { data: "", nodes: [] };

    scope.remove = function(node){
      node.nodes = [];
    }

    scope.add = function(node){
      var newNode = { data: "", nodes: [] }
      if(!node) node = { data: "" };
      if(!node.nodes) node.nodes = [];
      node.nodes.push(newNode);
    }

  }

  var directive = {
    scope: { ngModel: '=' },
    templateUrl: '/comp/tree.html',
    link: link
  };

  return directive;
});

