app.directive("tree", function() {
  
  var link = function(scope, element, attr){

    scope.name = attr.name || null;
    if(!scope.ngModel) scope.ngModel = { data: "", nodes: [], factor: 1 };
    scope.ngModel.top  = true;
    scope.ngModel.open = true;

    scope.prune = function(tree){
      console.log('pruning: ' + tree.data)
      if(!tree) return;
      if(!tree.nodes) return tree;
      var nodes = [];
      tree.nodes.map(function(node){ 
        if(node.remove) return;
        var prunedNode = scope.prune(node);
        nodes.push(prunedNode);
      });
      tree.nodes = nodes;
      return(tree)
    }

    scope.remove = function(node, index){
      node.remove = true;
      scope.ngModel = scope.prune(scope.ngModel);
    }

    scope.add = function(node){
      var newNode = { data: "", nodes: [], factor: 1 }
      if(!node) node = { data: "" };
      if(!node.nodes) node.nodes = [];
      node.nodes.splice(0, 0, newNode);
      node.open = true;
    }

    scope.openAll = function(){
      scope.open(scope.ngModel)
    }

    scope.open = function(node){
      console.log()
      node.open = true;
      node.nodes.map(function(node){
        scope.open(node)
      });
    }

    scope.closeAll = function(){
      scope.close(scope.ngModel);
    }

    scope.close = function(node){
      node.open = undefined;
      node.nodes.map(function(node){
        scope.close(node)
      });
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
    templateUrl: '/directives/tree.html',
    link: link
  };

  return directive;
});
