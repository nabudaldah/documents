app.directive("tree", function() {
  
  var link = function(scope, element, attr){

    scope.name = attr.name || null;
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

    var ngDisabledChanged = function(){
      if(scope.ngDisabled) {
        element.find('button, input').attr("disabled", "disabled");
      } else {
        element.find('button, input').removeAttr("disabled");
      }
    };
    scope.$watch('ngDisabled', ngDisabledChanged, true);
    ngDisabledChanged();

  }

  var directive = {
    scope: { ngModel: '=', ngDisabled: '=', name: '@' },
    templateUrl: '/dir/tree.html',
    link: link
  };

  return directive;
});
