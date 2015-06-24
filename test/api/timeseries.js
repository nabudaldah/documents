
var expect  = require('chai').expect;
var moment  = require('moment');
var request = require('request');
var fs      = require('fs');

var config;
var baseurl;
var vector  = [
	(Math.round(Math.random() * 1000) / 10), 
	(Math.round(Math.random() * 1000) / 10), 
	(Math.round(Math.random() * 1000) / 10)
]
var id = 'test_timeseries'
var options = { rejectUnauthorized: false };

describe('The Time Series API', function(){

	before(function(done){
    config  = JSON.parse(fs.readFileSync(process.cwd() + '/config.json', { enconding: 'utf8'}));      
    baseurl = 'https://test:test1234@' + config.host + ':' + config.port + '/api';

    var url = 'https://' + config.host + ':' + config.port + '/api';
		var user = { username: "test", name: "Test User", password: "test1234", email: "test@test.com" };
		request({ uri: url + '/signup', method: 'POST', agentOptions: options, json: user }, function (err, response, body) {
	    done();
    })
	})

	after(function(done){
		var url = baseurl + '/timeseries/' + id + '/timeseries';
		request({ uri: url, method: 'DELETE', agentOptions: options }, function (err, res, data) {
			done();
    })
	});

	it('Should allow the storage of time series', function(done){
		var timeseries = { base: "2015-01-01T00:00+01:00", interval: "1h", vector: vector };
		var url = baseurl + '/timeseries/' + id + '/timeseries';
		request({ uri: url, method: 'PUT', agentOptions: options, json: timeseries }, function (err, res, data) {
			expect(res.statusCode).to.equal(200);
			done(err);
    })
	})

	it('Should allow retrieval of time series', function(done){
		var timeseries = { base: "2015-01-01T00:00+01:00", interval: "1h", vector: vector };
		var url = baseurl + '/timeseries/' + id + '/timeseries';
		request({ uri: url, method: 'GET', agentOptions: options, json: timeseries }, function (err, res, data) {
			expect(res.statusCode).to.equal(200);
			expect(data).to.deep.equal(timeseries);
			done(err);
    })
	})

	it('Should allow retrieval of parts of time series', function(done){
		var vector1 = [vector[0], vector[1]];
		var timeseries = { base: "2015-01-01T00:00:00+01:00", interval: "1h", vector: vector1 };
		var from = "2015-01-01T00:00:00+01:00"
		var to   = "2015-01-01T01:00:00+01:00"
		var url = baseurl + '/timeseries/' + id + '/timeseries' + '?from=' + encodeURIComponent(from) + '&to=' + encodeURIComponent(to);
		request({ uri: url, method: 'GET', agentOptions: options, json: timeseries }, function (err, res, data) {
			expect(res.statusCode).to.equal(200);
			expect(data).to.deep.equal(timeseries);
			done(err);
    })
	})

	it('Should pad left and right spaces with null\'s', function(done){
		var vector1 = [null, null].concat(vector).concat([null, null]);
		var timeseries = { base: "2014-12-31T22:00:00+01:00", interval: "1h", vector: vector1 };
		var from = "2014-12-31T22:00:00+01:00"
		var to   = "2015-01-01T05:00:00+01:00"
		var url = baseurl + '/timeseries/' + id + '/timeseries' + '?from=' + encodeURIComponent(from) + '&to=' + encodeURIComponent(to);
		request({ uri: url, method: 'GET', agentOptions: options, json: timeseries }, function (err, res, data) {
			expect(res.statusCode).to.equal(200);
			expect(data).to.deep.equal(timeseries);
			done(err);
    })
	})

	it('Should allow overwriting time series', function(done){
		var timeseries = { base: "2015-01-01T03:00+01:00", interval: "1h", vector: vector };
		var url = baseurl + '/timeseries/' + id + '/timeseries';
		request({ uri: url, method: 'PUT', agentOptions: options, json: timeseries }, function (err, res, data) {
			expect(res.statusCode).to.equal(200);
			done(err);
    })
	})


	it('Should allow repeated retrieval of time series', function(done){
		var timeseries = { base: "2015-01-01T00:00+01:00", interval: "1h", vector: vector.concat(vector) };
		var url = baseurl + '/timeseries/' + id + '/timeseries';
		request({ uri: url, method: 'GET', agentOptions: options, json: timeseries }, function (err, res, data) {
			expect(res.statusCode).to.equal(200);
			expect(data).to.deep.equal(timeseries);
			done(err);
    })
	})

	it('Should reject incomplete time series', function(done){
		var timeseries = { };
		var url = baseurl + '/timeseries/' + id + '/timeseries';
		request({ uri: url, method: 'PUT', agentOptions: options, json: timeseries }, function (err, res, data) {
			expect(res.statusCode).to.equal(400);
			done(err);
    })
	})

	it('Should reject time series with invalid base date', function(done){
		var timeseries = { base: "2 september 2015 om 15 over 12", interval: "1h", vector: vector };
		var url = baseurl + '/timeseries/' + id + '/timeseries';
		request({ uri: url, method: 'PUT', agentOptions: options, json: timeseries }, function (err, res, data) {
			expect(res.statusCode).to.equal(400);
			done(err);
    })
	})

	it('Should reject time series with incompabitle interval', function(done){
		var timeseries = { base: "2015-01-01T00:00+01:00", interval: "2h", vector: vector };
		var url = baseurl + '/timeseries/' + id + '/timeseries';
		request({ uri: url, method: 'PUT', agentOptions: options, json: timeseries }, function (err, res, data) {
			expect(res.statusCode).to.equal(400);
			done(err);
    })
	})

	it('Should reject time series with empty vector', function(done){
		var timeseries = { base: "2015-01-01T00:00+01:00", interval: "1h", vector: [] };
		var url = baseurl + '/timeseries/' + id + '/timeseries';
		request({ uri: url, method: 'PUT', agentOptions: options, json: timeseries }, function (err, res, data) {
			expect(res.statusCode).to.equal(400);
			done(err);
    })
	})


	it('Should allow time series to be removed', function(done){
		var timeseries = { base: "2015-01-01T00:00+01:00", interval: "1h", vector: vector };
		var url = baseurl + '/timeseries/' + id + '/timeseries';
		request({ uri: url, method: 'DELETE', agentOptions: options, json: timeseries }, function (err, res, data) {
			expect(res.statusCode).to.equal(200);
			done(err);
    })
	})

});

