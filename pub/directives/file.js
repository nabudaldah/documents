app.directive('file', function ($http) {

  var link = function (scope, element, attr, ngModel) {

    scope.results     = [];
    scope.collections = [];

    if(!scope.ngModel) scope.ngModel = '';

    scope.name = attr.name;

    var ngDisabledChanged = function(){
      if(scope.ngDisabled) {
        element.find('select, button, input').attr("disabled", "disabled");
      } else {
        element.find('select, button, input').removeAttr("disabled");
      }
    };
    scope.$watch('ngDisabled', ngDisabledChanged, true);
    ngDisabledChanged();

  }

  var directive =  {
      restrict: 'E',
      require: '^ngModel',
      templateUrl: '/directives/file.html',
      scope: { ngModel: '=', ngDisabled: '=' },
      transclude: true,
      link: link
  };

  return directive;

});
