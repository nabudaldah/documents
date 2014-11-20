app.directive('taglist', function() {
    return {
        restrict: 'E',
        template: '<p><ul class="taglist"></ul></p>',
        scope: { tags: '@' },
        transclude: true,
        link: function (scope, element, attr, ngModel) {

          if(!attr.tags) return;
          if(!attr.tags.length) return;

          var tags = attr.tags;
          if(typeof(tags) == "string") {
            try{ tags = JSON.parse(tags); }
            catch(e){ tags = tags.trim().split(/[, ]+/gi); }
          };

          // Add items in array as <li>
          var ul = element.find('ul');
          tags.map(function(tag){
            var li = $('<li name="' + tag + '">' + tag + ' </li>');
            ul.append(li);
          });

        }
    };
});
