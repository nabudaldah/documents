app.directive('graph', function() {
  return {
    restrict: 'E',
    require: '^ngModel',
    scope: { ngModel: '=', name: '@' },
    templateUrl: '/dir/graph.html',
    link: function(scope, element, attr, ngModel){

      var graphId = uuid()
      element.find('div').attr('id', graphId)

      var chart;

      scope.$watch('ngModel', function(){

        if(!scope.ngModel) return;
        if(!scope.ngModel.vector) return;

        var data     = scope.ngModel.vector;
        var name     = attr.name;
        
        var pointStart  = moment(scope.ngModel.base).valueOf();
        var interval = scope.ngModel.interval;

        var delta = parseInt(interval.match(/[0-9]+/));
        var unit  = interval.match(/m|h|d/).toString();

        var pointInterval = moment.duration(delta, unit).asMilliseconds();

        if(typeof(data) == 'string') data = data.split(',');

        chart = new Highcharts.StockChart({
          credits: { enabled: false, margin: 0, spacing: [0, 0, 0, 0] },
          legend: { enabled: false },
          //xAxis: { type: 'datetime', tickLength: 0, minorTickLength: 0, minorGridLineWidth: 0, gridLineWidth: 0, labels: {enabled: true }, lineWidth: 0 },
          yAxis: { title: { text: null }, gridLineWidth: 0, labels: {enabled: false }, lineWidth: 0 },
          title: { text: null },
          // plotOptions: { line: { lineWidth: 1, animation: false, marker: { enabled: true }, series: { marker: { enabled: true }}, shadow: false, states: { hover: { lineWidth: 1 }}}},
          // yAxis: { gridLineWidth: 0 },
          // xAxix: { lineWidth: 0 },
          title: { text: name, floating: true, align: 'left', x: 4, y: 4 ,
                    style: { "color": "#333333", "fontSize": "inherit", "background-color": "white" } },
          scrollbar : { enabled : false  },
          chart: { animation: false, renderTo: graphId, zoomType: 'x' },
          credits: { enabled: false },
          series: [{ name: name, step: false, marker: {enabled: true, radius: 1 }, data: data, pointStart: pointStart, pointInterval: pointInterval }],
          rangeSelector: { enabled: false },
          navigator : { enabled : false },
          plotOptions: { series: { animation: false } }
        }); // var chart1 = ...
      }, true); // scope.$watch ...

      scope.$on('$destroy', function() {
        console.log('graph.js: destroy');
        if(chart) {
          console.log('graph.js: destroyed...')
          chart.destroy();
        }
      });

    }
  };
});