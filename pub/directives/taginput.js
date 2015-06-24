
// <input type="tags" ng-model="tags"></input>

app.directive('taginput', function() {


  var link = function (scope, element, attr, ngModel) {

    scope.name = attr.name || 'tags';

    var ngDisabledChanged = function(){
      if(scope.ngDisabled) element.find('select, button, input').attr("disabled", "disabled");
      else element.find('select, button, input').removeAttr("disabled");
    };
    scope.$watch('ngDisabled', ngDisabledChanged, true);
    ngDisabledChanged();

    var ul = element.find('ul');

    // Make sure our model is an array
    if(!scope.ngModel || !scope.ngModel.length) scope.ngModel = [];
    if(typeof(scope.ngModel) == "string") {
      scope.ngModel = scope.ngModel.trim().split(/[, ]+/gi);
    };

    // Add tags (1 or multiple)
    var addTag = function(tags){
      tags.split(' ').map(function (tag){
        if(tag.length && scope.ngModel.indexOf(tag) == -1) scope.ngModel.push(tag);
      });
      scope.$apply();
    };

    var removeTag = function(){
      var remove = $(this);
      scope.ngModel.splice(scope.ngModel.indexOf(remove.attr('name')), 1);
      scope.$apply();
    };

    var input = element.find('input');
    input.bind('keyup', function(event){
      var key   = event.which;
      var input = $(this);
      if(key == 13){ addTag(input.val()); input.val(''); }; // enter key pressed
      if(key == 32){ addTag(input.val()); input.val(''); }; // space key pressed
    });
    input.bind('keydown', function(event){
      var key   = event.which;
      var input = $(this);
      if(key == 8 && !input.val().length){ scope.ngModel.pop(); scope.$apply(); }; // backspace
    });


    input.bind('blur', function(event){
      addTag(input.val());
      input.val('');
    });

    var listTags = function(){

      if(!scope.ngModel || !scope.ngModel.length) scope.ngModel = [];

      // Add items in array as <li>
      scope.ngModel.map(function(tag){
        if(!ul.find('[name="' + tag + '"]').length) {
          var li = $('<li name="' + tag + '">' + tag + ' </li>');
          var remove = $('<a name="' + tag + '">&times;</a>');
          remove.bind('click', removeTag);
          li.append(remove)
          ul.append(li);
        };
      });

      // Delete items not in array
      ul.children().each(function(){
        var li = $(this);
        if(scope.ngModel.indexOf(li.attr('name')) == -1) li.remove();
      });

      setDisable();
    }

    scope.$watch('ngModel', listTags, true);

    var setDisable = function(){
      if(scope.ngDisabled) {
        element.addClass("disabled");
        attr.disabled = "disabled";
        input.attr("disabled", "disabled");
        var list = element.find('li');
        list.each(function(){ var li = $(this); li.find('a').hide(); });
      } else {
        element.removeClass("disabled");
        attr.disabled = "";
        input.removeAttr("disabled");
        var list = element.find('li');
        list.each(function(){ var li = $(this); li.find('a').show(); });
      }
    };

    scope.$watch('ngDisabled', setDisable, true);

    setDisable();

  }

  var directive =  {
      restrict: 'E',
      require: '^ngModel',
      templateUrl: '/directives/taginput.html',
      scope: { ngModel: '=', ngDisabled: '=', name: '@' },
      transclude: true,
      link: link
  };

  return directive;

});
