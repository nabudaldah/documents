

var should = require('should');
var expect  = require('chai').expect;
var Timeseries = require('../../lib/Timeseries.js');
var moment = require('moment');

describe('The Time Series Library', function(){

	describe('#overlay()', function(){
		it('should overwrite data points at correct location in vector', function(){
			var ts0 = { "base" : "2013-01-01T00:00:00+01:00", "interval" : "1h", "vector" : [ 1, 1, 1, 1 ] };
			var ts1 = { "base" : "2013-01-01T02:00:00+01:00", "interval" : "1h", "vector" : [ 2, 2, 2, 2 ] };
			var ts = new Timeseries(ts0).overlay(ts1);
			ts.vector.toString().should.equal("1,1,2,2,2,2");
		})
	})

	describe('#isValid()', function(){
		it('should test if object is valid timeseries', function(){
			var ts = new Timeseries({ base: '2014-01-01T00:00+01:00', interval: '15m', vector: [1,2,3,4] });
			ts.isValid().should.be.ok;
		})
	})

	describe('#length()', function(){
		it('should calculate correct hourly length', function(){
			Timeseries.prototype.length("2003-12-31T00:00+01:00", "2004-01-01T00:00+01:00", "1h").should.equal(25);
		})
		it('should calculate correct hourly uneven-minute length', function(){
			Timeseries.prototype.length("2003-12-31T00:00+01:00", "2004-01-01T23:59+01:00", "1h").should.equal(48);
		})
		it('should calculate correct zero length', function(){
			Timeseries.prototype.length("2004-02-01T00:00+01:00", "2004-01-01T00:00+01:00", "1h").should.equal(0);
		})
		it('should calculate correct hourly uneven-minute length (2)', function(){
			Timeseries.prototype.length("2004-02-01T00:00+01:00", "2004-02-01T23:59+01:00", "1h").should.equal(24);
		})
		it('should calculate correct 6 hourly length', function(){
			Timeseries.prototype.length("2014-01-01T00:00+01:00", "2014-01-01T23:59+01:00", "6h").should.equal(4);
		})
	})

	describe('#slice()', function(){
		it('calculate correct slice of array', function(){
			var ts = new Timeseries({ id: "ts", base: "2014-01-01T00:00+01:00", interval: "1d", vector: [1,2,3] })
			ts.slice("2013-12-31", "2014-01-02").toString().should.equal("0,2");
		})
	})

	describe('#roundUp()', function(){
		it('should correctly round up to nearest interval', function(){
			var base = "2014-01-01T" +     "00:01:00"    + "+01:00";
			var interval = '4m';
			var date = "2013-01-04T" +     "00:04:00"    + "+01:00";
			var ts = new Timeseries({base:base, interval:interval, vector:[]});
			moment("2013-01-04T00:05:00+01:00").isSame(ts.roundUp(date)).should.be.ok;
		})
	})

	describe('#roundDown()', function(){
		it('should correctly round down to nearest interval', function(){
			var base = "2014-01-01T" +     "00:01:00"    + "+01:00";
			var interval = '4m';
			var date = "2013-01-04T" +     "00:04:00"    + "+01:00";
			var ts = new Timeseries({base:base, interval:interval, vector:[]});
			moment("2013-01-04T00:01:00+01:00").isSame(ts.roundDown(date)).should.be.ok;
		})
	})

	describe('#toCSV()', function(){
		it('should export correct CSV text in 15min interval', function(){
			var base = "2014-01-01T00:00:00+01:00";
			var interval = '15m';
			var ts = new Timeseries({base:base, interval:interval, vector:[1,2,3]});
			ts.toCSV().should.equal("2014-01-01T00:00:00+01:00,1\n2014-01-01T00:15:00+01:00,2\n2014-01-01T00:30:00+01:00,3");
		});

		it('should export correct CSV text in hourly interval', function(){
			var base = "2014-01-01T00:00:00+01:00";
			var interval = '1h';
			var ts = new Timeseries({base:base, interval:interval, vector:[1,2,3]});
			ts.toCSV().should.equal("2014-01-01T00:00:00+01:00,1\n2014-01-01T01:00:00+01:00,2\n2014-01-01T02:00:00+01:00,3");
		});
	})

	// versioning 
	describe('#reconstruct()', function(){
		it('should reconstruct timeseries vector from all changes', function(){

			var ts0 = new Timeseries({
				base: "2015-01-01T00:00+01:00",
				interval: "15m",
				vector: []
			});

			ts0.change({ base: "2015-01-01T00:00+01:00", interval: "1m", vector: [ 0,  1,  2,  3,  4 ] });
			ts0.change({ base: "2015-01-01T00:05+01:00", interval: "1m", vector: [ 5,  6,  7,  8,  9 ] });
			ts0.change({ base: "2015-01-01T00:10+01:00", interval: "1m", vector: [10, 11, 12, 13, 14 ] });

			ts0.reconstruct()

			moment(ts0.base).isSame('2015-01-01T00:00+01:00').should.be.ok;
			ts0.interval.should.equal('1m')
			ts0.vector.join(',').should.equal([ 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14 ].join(','));
		})
	})

	// padding 
	describe('#pad()', function(){
		it('should padd timeseries with null value over a period', function(){

			var ts0 = new Timeseries({
				base: "2015-01-01T00:00+01:00",
				interval: "1h",
				vector: [1,2,3]
			});

			var ts1 = ts0.pad("2014-12-31T22:00+01:00", "2015-01-01T05:00+01:00")

			expect(ts1.vector).to.deep.equal([NaN, NaN, 1, 2, 3, NaN, NaN]);
			expect(ts1.vector.length).to.equal(7);
		})
	})

})

