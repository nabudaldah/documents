
// <input type="tags" ng-model="tags"></input>

app.directive('optionlist', function() {


  var link = function (scope, element, attr, ngModel) {

    scope.name = attr.name || 'options';

    // console.log(scope.list)
    if(!scope.list) scope.list = [];
    // console.log(scope.list)

    scope.listInput = scope.list.join(', ')
    // console.log(scope.listInput)

    var ngDisabledChanged = function(){
      if(scope.ngDisabled) element.find('select, button, input').attr("disabled", "disabled");
      else element.find('select, button, input').removeAttr("disabled");
    };
    scope.$watch('ngDisabled', ngDisabledChanged, true);
    ngDisabledChanged();

    scope.update = function(){
      // console.log('update!')
      // console.log(scope.listInput)
      var newList = scope.listInput.split(/[^a-zA-Z0-9]+/)
      scope.list = [];
      newList.map(function(item){
        if(item != '') scope.list.push(item)
      })
      // console.log(scope.list)
    }

  }

  var directive =  {
      restrict: 'E',
      require: '^ngModel',
      templateUrl: '/directives/optionlist.html',
      scope: { ngModel: '=', ngDisabled: '=', name: '@', list: '=', edit: '='},
      transclude: true,
      link: link
  };

  return directive;

});
