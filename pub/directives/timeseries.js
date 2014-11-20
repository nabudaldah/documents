app.directive('timeseries', function($http, socket) {

  var link = function (scope, element, attr, ngModel) {

    scope.showGraph = true;
    scope.showData  = false;

    scope.name = attr.timeseries;
    var isdirty = false; 

    scope.timeseries = {
      base: moment().startOf('day').format(),
      interval: "1h",
      vector: []
    }

    /* Bind inputs (for increased control of UX) */
    element.find('input#base').change(function(event){
      isdirty = true; 
      scope.timeseries.base = $(this).val().trim();
      bind();
      scope.$apply();
    });

    element.find('select#interval').change(function(event){
      isdirty = true; 
      scope.timeseries.interval = $(this).val().trim();
      bind();
      scope.$apply();
    });

    element.find('select#format').change(function(event){
      scope.format = $(this).val();
      view();
      //bind();
      //scope.$apply();
    });

    element.find('textarea#csv').change(function(event){
      isdirty = true; 
      scope.timeseries.vector = $(this).val().trim().split('\n').map(function(x){ return parseFloat(x); });
      bind();
      scope.$apply();
    });

    element.find('select#show').val("All data");
    scope.show = "All data";
    element.find('select#show').change(function(event){
      scope.show = $(this).val();
      load();
    });

    scope.offset = 0;

    scope.offsetUp = function(){
      scope.offset += 1;
      load();
    }

    scope.offsetDown = function(){
      scope.offset -= 1;
      load()
    }

    scope.span = function(unit){
      scope.unit = unit;
      load();
    }

    var load = function(){
      var url = '/v1/' + attr.collection + '/' + attr.id + '/timeseries/' + attr.timeseries;

      var from, to;
      if(scope.unit){
        from = moment().startOf(scope.unit).add(scope.offset, scope.unit);
        to   = moment().startOf(scope.unit).add(scope.offset + 1, scope.unit).subtract(1, 'second');        
      }

      var query = "";
      if(from && to) query = "?from=" + encodeURIComponent(from.format()) + "&to=" + encodeURIComponent(to.format());
      $http.get(url + query).success(function(data){ 
        scope.timeseries = data;
        view();
      });
    }

    var view = function(){
      element.find('input#base').val(scope.timeseries.base);
      element.find('select#interval').val(scope.timeseries.interval);
      element.find('textarea#csv').val(scope.timeseries.vector.map(function(x){ return parseFloat(x); }).join('\n'));
      // if(scope.format){
      //   element.find('textarea#csv').val(scope.timeseries.vector.map(function(x){ return parseFloat(x); }).join('\n'));
      // }
      //scope.$apply();
    };

    scope.offset = 0;

    var bind = function(){
      if(scope.new){ scope.ngModel = scope.timeseries; }
    }

    scope.new = scope.$eval(attr.new);
    if(scope.new){ bind(); }
      else { load(); }

    /* Enable and disable inputs */
    scope.$watch('ngDisabled', function(){
      if(scope.ngDisabled)  element.find('textarea, select, button, input').attr("disabled", "disabled");
        else                element.find('textarea, select, button, input').removeAttr("disabled");
    });

    /* Listen for save data call from parent controller */
    if(!scope.new){
      scope.$watch('saving', function(){
        if(isdirty) save();
      });
    }

    var save = function(){
      var url = '/v1/' + attr.collection + '/' + attr.id + '/timeseries/' + attr.timeseries;
      $http.put(url, scope.timeseries);        
    }

    view();

    /* Socket.io bindings */
    var ref = attr.collection + '/' + attr.id + '/' + attr.timeseries;
    socket.on(ref, function (data) {
      load();
    });
    
    scope.$on('$locationChangeStart', function (event, next, current) {
      socket.close(ref);
      scope.timeseries = undefined;
    });

  }

  var directive =  {
      restrict: 'E',
      templateUrl: '/directives/timeseries.html',
      scope: { ngModel: '=', ngDisabled: '=', saving: '=', collection: '@', id: '@', timeseries: '@' },
      transclude: true,
      link: link
  };

  // = ... bi-directional data binding
  // & ... one-way data and call binding (from directive to controller) 

  return directive;

});
