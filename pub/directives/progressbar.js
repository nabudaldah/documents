app.directive('progressbar', function ($http) {

  var link = function (scope, element, attr, ngModel) {

    scope.name = attr.name;

    var ngDisabledChanged = function(){
      if(scope.ngDisabled) element.find('select, button, input').attr("disabled", "disabled");
      else element.find('select, button, input').removeAttr("disabled");
    };
    scope.$watch('ngDisabled', ngDisabledChanged, true);
    ngDisabledChanged();

    scope.min = 0;
    scope.max = 100;

  }

  var directive =  {
      restrict: 'E',
      require: '^ngModel',
      templateUrl: '/directives/progressbar.html',
      scope: { ngModel: '=', ngDisabled: '=' },
      transclude: true,
      link: link
  };

  return directive;

});
