app.directive('reference', function ($http) {

  var link = function (scope, element, attr, ngModel) {

    scope.results     = [];
    scope.collections = [];

    if(!scope.ngModel){
      scope.object     = '';
      scope.collection = '';
      scope.ngModel    = '';
    } else {
      scope.collection = scope.ngModel.split('/')[0];
      scope.object     = scope.ngModel.split('/')[1];
    }

    $http.get('/v1/' + 'settings' + '?query=' + 'collection').
      success(function(data){
        scope.collections = data;
        if(!scope.collection) scope.collection = data[0]._id || '';
      })

    scope.name = attr.name;

    // scope.selectObject = function(object){
    //   scope.object  = object;
    //   scope.ngModel = scope.collection + '/' + scope.object;
    //   scope.results = [];
    //   scope.search()
    // }

    scope.select = function(item){
      var p = scope.ngModel.split('/');
      p[p.length - 1] = item;
      scope.ngModel = p.join('/');
      if(p.length < 3) scope.ngModel = scope.ngModel + '/'
      scope.search();
    }

    scope.search = function(){

      var collection = scope.ngModel.split('/').length>0?scope.ngModel.split('/')[0]:null;
      if(collection != null){
        scope.level = 'collections';
        $http.get('/v1/settings?query=collection').success(function (data) { 
          scope.results = data.map(function(c){
            if((new RegExp(scope.ngModel.split('/')[0])).test(c._id)) return c._id;
            else return undefined;
          });
          scope.results = _.without(scope.results, undefined);
        });
      };

      var object     = scope.ngModel.split('/').length>1?scope.ngModel.split('/')[1]:null;
      if(object != null){
        scope.level = 'documents';
        $http.get('/v1/' + collection + '?query=' + object + '&limit=10').success(function (data) { 
          scope.results = data.map(function(c){ return c._id; });
        });
      };

      var property   = scope.ngModel.split('/').length>2?scope.ngModel.split('/')[2]:null;
      if(property != null){
        scope.level = 'properties';
        $http.get('/v1/' + collection + '/' + object).success(function (data) { 
          if(!data.template) return [];
          scope.results = data.template.map(function(c){
            if((new RegExp(scope.ngModel.split('/')[2])).test(c.name)) return c.name;
            else return undefined;
          });
          scope.results = _.without(scope.results, undefined)
        });
      };
    };

    scope.search();

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
      templateUrl: '/comp/reference.html',
      scope: { ngModel: '=', ngDisabled: '=' },
      transclude: true,
      link: link
  };

  return directive;

});
