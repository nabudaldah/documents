
// <input type="tags" ng-model="tags"></input>

app.directive('figure', function() {

  console.log('hoi figure')

  var link = function (scope, element, attr, ngModel) {

    console.log(scope.name)

    scope.name = attr.name || 'options';

    var ngDisabledChanged = function(){
      if(scope.ngDisabled) element.find('select, button, input').attr("disabled", "disabled");
      else element.find('select, button, input').removeAttr("disabled");
    };
    scope.$watch('ngDisabled', ngDisabledChanged, true);
    ngDisabledChanged();

    var update = function(){
      console.log('update!')
    }

    scope.$watch('ngModel', update, true)

  }

  var directive =  {
      restrict: 'E',
      require: '^ngModel',
      templateUrl: '/directives/figure.html',
      scope: { ngModel: '=', ngDisabled: '=', name: '@', edit: '='},
      transclude: true,
      link: link
  };

  return directive;

});
