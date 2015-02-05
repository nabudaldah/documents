app.directive('timeseries', function($http, socket) {

  var link = function (scope, element, attr, ngModel) {

    // Context
    scope.collection = attr.collection;
    scope.id         = attr.id;
    scope.timeseries = attr.timeseries;

    // Variables
    scope.changed    = false; 
    scope.offset     = 0;

    // Default object
    scope.ts = {
      base: moment().startOf('day').format(),
      interval: "1h",
      vector: []
    }

    // New object?
    scope.new = scope.$eval(attr.new); // because this might not be simply "true" or "false", but an expression ...

    scope.shiftOffset = function(d){ scope.offset += d; scope.fetchData();}

    scope.nextUnit = function(){
      var next = { "hour": "day", "day": "week", "week": "month", "month": "quarter", "quarter": "year", "year": "hour" };
      if(!scope.unit) scope.unit = "hour";
      else scope.unit = next[scope.unit];
      scope.fetchData();
    }

    scope.fetchData = function(){
      var code = { "hour": "H", "day": "D", "week": "W", "month": "M", "quarter": "Q", "year": "Y" };
      if(scope.unit) scope.unitCode = code[scope.unit];
      else scope.unitCode = code["hour"];
      var url = '/v1/' + attr.collection + '/' + attr.id + '/timeseries/' + attr.timeseries;
      var from, to;
      if(scope.unit){
        from = moment().startOf(scope.unit).add(scope.offset, scope.unit);
        to   = moment().startOf(scope.unit).add(scope.offset + 1, scope.unit).subtract(1, 'second');        
      }

      var query = "";
      if(from && to) query = "?from=" + encodeURIComponent(from.format()) + "&to=" + encodeURIComponent(to.format());
      $http.get(url + query).success(function(data){ 
        scope.ts = data;
        scope.csv        = data.vector.join('\n');
      });
    }

    /* Enable and disable inputs */
    scope.$watch('ngDisabled', function(){
      if(scope.ngDisabled)  element.find('textarea, select, button, input').attr("disabled", "disabled");
        else                element.find('textarea, select, button, input').removeAttr("disabled");
    });

    // New objects are not yet saved, so no data to retrieve ... while existing objects need to be "watched" for updates
    if(scope.new) scope.ngModel = scope.ts;
    else {
      scope.fetchData();
      scope.$watch('saving', function(){ if(scope.changed) save(); });  // Socket.io
    }

    var save = function(){
      var url = '/v1/' + attr.collection + '/' + attr.id + '/timeseries/' + attr.timeseries;
      $http.put(url, scope.ts);        
    }

    /* Socket.io bindings */
    var ref = attr.collection + '/' + attr.id + '/' + attr.timeseries;
    socket.on(ref, function (data) {
      scope.fetchData();
    });
    
    // Free memory (garbage collect) when closing scope
    scope.$on('$locationChangeStart', function (event, next, current) {
      socket.close(ref);
      scope.ts = undefined;
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
