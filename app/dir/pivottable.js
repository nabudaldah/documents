
//  <pivottable ng-model="pivot"></pivottable>

app.directive('pivottable', function() {
    return {
        restrict: 'E',
        require: '^ngModel',
        template: '<table></table>',
        scope: { ngModel: '=', ngDisabled: '=' },
        transclude: true,
        link: function (scope, element, attr, ngModel, filter) {

          function v(value){
            // return value;
            return value?numeral(value).format('0.0a'):'-';
          }

          var table = element.find('table');

          var renderTable = function(){

            if(!scope.ngModel || !scope.ngModel.list) return;

            table.empty();

            var list = scope.ngModel.list;

            var measure = scope.ngModel.measure;

            var row     = scope.ngModel.row;
            var column  = scope.ngModel.column;

            var rows    = scope.ngModel.rows;
            var columns = scope.ngModel.columns;

            if(measure && !row && !column){
              var tr = $('<tr></tr>');
              var value = v(list[""]);
              var td = $('<td>' + value + '</td>');
              tr.append(td);
              table.append(tr);
            };

            if(measure && row && !column){
              rows.map(function(r){
                var value = v(list[r]);
                var tr = $('<tr></tr>');
                tr.append($('<th>' + r + '</th>'));
                tr.append($('<td>' + value + '</td>'));
                table.append(tr);
              });
            };

            if(measure && row && column){

              var tr = $('<tr></tr>');
              var td = $('<th></th>');
              tr.append(td);
              columns.map(function(c){
                tr.append($('<th>' + c + '</th>'));
              });
              table.append(tr);

              rows.map(function(row){
                var tr = $('<tr></tr>');
                var td = $('<th>' + row + '</th>');
                tr.append(td);
                columns.map(function(column){
                  var id = [];
                  if(row) id.push(row);
                  if(column) id.push(column);
                  var value = v(list[id.join(',')]);
                  var td = $('<td>' + value + '</td>');
                  tr.append(td);
                });
                table.append(tr);
              });
            };
          
          }; // function renderTable()

          scope.$watch('ngModel', renderTable, true);

        }
    };
});
