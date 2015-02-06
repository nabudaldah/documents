app.directive('password', function ($http) {

  var link = function (scope, element, attr, ngModel) {

    scope.results     = [];
    scope.collectionlections = [];

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

    scope.hash = function(){
    	scope.executing = true;
    	
      $http.get('/v1/'+attr.collection+'/'+attr.id+'/' + attr.name + '/hash')
        .success(function(data, status, headers, config) {
          scope.message = data;
          scope.executing = false;
        })
        .error(function(data, status, headers, config){
          scope.message = data;
          scope.executing = false;
        });
    }

     $('[data-toggle="tooltip"]').tooltip();

  }

  var directive =  {
      restrict: 'E',
      require: '^ngModel',
      templateUrl: '/directives/password.html',
      scope: { ngModel: '=', ngDisabled: '=', collection: '@collection', id: '@id', name: '@name' },
      transclude: true,
      link: link
  };

  return directive;

});
