
var expect  = require('chai').expect;
var request = require('request');
var fs      = require('fs');

var config  = {};
var baseurl = '';

// var options = { rejectUnauthorized: false, 'auth': { 'bearer': 'bearerToken' } };
var options = { rejectUnauthorized: false };

describe('The Authentication API', function(){

	before(function(done){
    config  = JSON.parse(fs.readFileSync(process.cwd() + '/config.json', { enconding: 'utf8'}));      
    baseurl = 'https://' + config.host + ':' + config.port + '';

    var url = 'https://admin:admin@' + config.host + ':' + config.port + '';
		request({ uri: url + '/API/users/test', method: 'DELETE', agentOptions: options }, function (error, response, body) {
			request({ uri: url + '/API/users/tenant2', method: 'DELETE', agentOptions: options }, function (error, response, body) {
		    done();
			});
		});
	})

	it('Should allow users to sign-up', function(done){
		var user = { username: "test", name: "Test User", password: "test1234", email: "test@test.com" };
		request({ uri: baseurl + '/signup', method: 'POST', agentOptions: options, json: user }, function (error, response, body) {
			expect(response.statusCode).to.equal(200);
			done(error);
    })
	})

	it('Should allow users to login', function(done){
		var user = { username: "test", password: "test1234" };
		request({ uri: baseurl + '/login', method: 'POST', agentOptions: options, json: user }, function (error, response, body) {
			expect(response.statusCode).to.equal(200);
			expect(response.body.token).to.exist();
			expect(response.body.profile._id).to.equal(user.username);
			done(error);
    })
	})

	it('Should reject invalid login credentials', function(done){
		var user = { username: "test", password: "1234test" };
		request({ uri: baseurl + '/login', method: 'POST', agentOptions: options, json: user }, function (error, response, body) {
			expect(response.statusCode).to.equal(401);
			expect(response.body.token).to.not.exist();
			done(error);
    })
	})

	it('Should allow a 2nd tenant to sign-up', function(done){
		var user = { username: "tenant2", name: "2nd Tenant User", password: "tenant1234", email: "tenant2@tenant2.com" };
		request({ uri: baseurl + '/signup', method: 'POST', agentOptions: options, json: user }, function (error, response, body) {
			expect(response.statusCode).to.equal(200);
			done(error);
    })
	})

	it('Should restrict access to data of other tenants', function(done){
    var url = 'https://tenant2:tenant1234@' + config.host + ':' + config.port + '';
		request({ uri: url + '/api/users/test', method: 'GET', agentOptions: options }, function (error, response, body) {
			expect(response.statusCode).to.equal(400);
			done(error);
    })
	})

});

