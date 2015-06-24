app.directive('datatable', function () {

  var link = function (scope, element, attr, ngModel) {

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
      templateUrl: '/directives/datatable.html',
      scope: { ngModel: '=', ngDisabled: '=' , name: '@name' },
      link: link
  };

  return directive;

});

// Tijdschijf MongoDB query:

// db.contracts.find({_id: /schijf/, syv: { $elemMatch: { from: { $gte: ISODate("2013-01-01"), $lte: ISODate("2014-12-31") } } } })

// db.gridpoints.find({ syv: { $elemMatch: { from: {$lte: ISODate("2014-01-31")}, to: {$gte: ISODate("2014-01-31")}} } }, { syv: { $elemMatch: { from: {$lte: ISODate("2014-01-31")}, to: {$gte: ISODate("2014-01-31")}} } })