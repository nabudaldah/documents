app.directive('process', function () {

  var link = function (scope, element, attr, ngModel) {

    scope.user = JSON.parse(window.localStorage.user || "{}");
    scope.description = null;

    if(!scope.ngModel) scope.ngModel = [];

    scope.current = function(index){
      var item = scope.ngModel[index];
      if(item.skip   || item.done || item.fail) return false;
      if(index == 0) return true;
      var before = scope.ngModel[index - 1]; 
      if(before.skip || before.done || before.fail) return true;
    };

    scope.passed = function(index){
      var item = scope.ngModel[index];
      if(item.skip   || item.done || item.fail) return true;
      else return false;
    }

    scope.addable = function(){
      return scope.description != null && scope.description != ''; 
    }

    scope.add = function(){
      scope.ngModel.push({
        description: scope.description,
      });
      scope.description = null;
    }

    scope.sign = function(index){
      scope.ngModel[index].user = scope.user._id;
      scope.ngModel[index].time = moment().format();      
    }

    scope.skip = function(index){
      scope.ngModel[index].skip = true;
      scope.sign(index);
    };

    scope.done = function(index){
      scope.ngModel[index].done = true;
      scope.sign(index);
    };

    scope.fail = function(index){
      scope.ngModel[index].fail = true;
      scope.sign(index);
    };

    scope.remove = function(index){
      scope.ngModel.splice(index, 1);
    }

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
      templateUrl: '/directives/process.html',
      scope: { ngModel: '=', ngDisabled: '=' , name: '@name' },
      transclude: true,
      link: link
  };

  return directive;

});

// Tijdschijf MongoDB query:

// db.contracts.find({_id: /schijf/, syv: { $elemMatch: { from: { $gte: ISODate("2013-01-01"), $lte: ISODate("2014-12-31") } } } })

// db.gridpoints.find({ syv: { $elemMatch: { from: {$lte: ISODate("2014-01-31")}, to: {$gte: ISODate("2014-01-31")}} } }, { syv: { $elemMatch: { from: {$lte: ISODate("2014-01-31")}, to: {$gte: ISODate("2014-01-31")}} } })