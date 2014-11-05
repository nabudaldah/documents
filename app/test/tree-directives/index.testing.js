var app = angular.module('app', ['ctrl']);
var ctrl = angular.module('ctrl', []);
ctrl.controller('main', function ($scope, $http, $window, $location) {

  $scope.tree = {
    "data" : "timeseries/portfolio",
    "nodes" : [ 
    {
      "data" : "timeseries/production",
      "nodes" : []
    }, 
    {
      "data" : "timeseries/consumption",
      "nodes" : [ 
      {
        "data" : "timeseries/b2b",
        "nodes" : []
      }, 
      {
        "data" : "timeseries/b2c",
        "nodes" : []
      }
      ]
    }
    ]
  };

});

// Credits: https://groups.google.com/d/msg/angular/vswXTes_FtM/umJjQuMH0-kJ
app.directive("recursive", function($compile) {
  return {
    restrict: "EACM",
    priority: 100000,
    compile: function(tElement, tAttr) {
      var contents = tElement.contents().remove();
      var compiledContents;
      return function(scope, iElement, iAttr) {
        if(!compiledContents) {
          compiledContents = $compile(contents);
        }
        iElement.append(
          compiledContents(scope, 
           function(clone) {
             return clone; }));
      };
    }
  };
});

app.directive("tree", function() {
  
  var pre = function(scope, iElem, iAttrs){
  }

  var post = function(scope, iElem, iAttrs, controller){


    console.log(iAttrs.parent)

    if(iAttrs.subnode) scope.subnode = true;

    if(scope.ngModel.weight == undefined){
      scope.ngModel.weight = 1;
    }

    scope.toggleSign = function (){
      scope.ngModel.weight = -scope.ngModel.weight;
    }

    scope.remove = function(){
      iElem.remove();
    }

    scope.add = function(){
      scope.ngModel.nodes.push({
        data: "...",
        nodes: []
      })
    }
  }

  var compile = function(tElem, tAttrs){
    return {
      pre: pre,
      post: post
    }
  };

  var directive = {
    scope: { ngModel: '=', type: '@', parent: '=' },
    templateUrl: '/comp/tree.html',
    compile: compile
  };

  return directive;
});

