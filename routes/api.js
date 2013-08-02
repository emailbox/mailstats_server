
// http requests
var request = require('request');

// defer
var Q = require('q');

// Querystring
var querystring = require('querystring');

// uuid
var uuid = require('node-uuid');

// Urban Airship Push Notifications
var UA = require('urban-airship');
ua = new UA(creds.ua_app_key, creds.ua_app_secret, creds.ua_app_master_secret);

// Underscore
var _ = require('underscore');

// Handle a ping from an event
function ping(req,res){
	// Handle a Ping request
	// - just respond with a true
	// - doesn't deal with auth at all? 

	// Set response Content-Type
	if(req.body.obj == 'ping'){
		res.contentType('json');
		res.send({
			ping: true
		});
		console.log('pinged');
		return true;
	}

	return false;
}

exports.test_register = function(req, res){
	// testing push notifications

	// Triggered by an Event from emailbox
	// - send a Push Notification with arbitrary text to a device we're using. 

	// Register device
	var test_token;
	ua.registerDevice(test_token, function(err) {
		if(err){
			console.log('Error w/ Push Test');
			console.log(err);
			return;
		}
		console.log('No errors registerDevice!');
	});

};

exports.test_push = function(req, res){

	var test_token = "APA91bHNcKn5YXUsAy4tONQEk7HqCKzE8vqvw-hCbtzP3BR1xyj4ZBj55uzwXT-GNBA3n6s_NiQCHvPE7SmCU3YNB7qs9nC2--GNF2ReUSB-jahZCEgZBwrCsvUSLljANqqvjJr3E605z6vrAwB0r73qeuQC-Lcuig";

	console.log('Starting registration');

	// Test pushing to User
	// exports.pushToAndroid = function(registration_id, data, collapseKey, timeToLive, numRetries){
	models.Api.pushToAndroid(test_token, {p1: 'test1'}, 'Test Collapse', null, null)
		.then(function(pushResult){
			console.log('Result');
			console.log(pushResult.result);
			if(pushResult.err){
				console.log('Error with result');
				console.log(pushResult.err);
			}
			if(!pushResult.result.success){
				// Seems to have had an error
				console.log('--result.success not 1');
			}
		});

	// ua.registerDevice(test_token, {'alias' : 'test1'}, function(err) {
	// 	if(err){
	// 		console.log('Error w/ Push Test');
	// 		console.log(err);
	// 		return;
	// 	}
	// 	console.log('No errors registerDevice!');
	// });

	res.send('done test');
	return;

	// // Send Push Notification
	// var pushData = {
	// 	"apids": [
	// 		test_token,
	// 	],
	// 	"android": {
	// 		 "alert": "Hello from Urban Airship!",
	// 		 "extra": {"a_key":"a_value"}
	// 	}
	// };
	// console.log('sending');
	// ua.pushNotification("/api/push", pushData, function(error) {
	// 	console.log('err');
	// 	console.log(error);
	// });
	// console.log('after sending');

	// res.send('done');

};

exports.login = function(req, res){
	// A user is trying to login using an emailbox access_token

	console.log('exports.login');

	// Set response Content-Type
	res.contentType('json');

	var bodyObj = req.body;
	
	if(typeof bodyObj != "object"){
		jsonError(res, 101, "Expecting object");
		return;
	}
	if(typeof bodyObj.access_token != "string"){
		jsonError(res, 101, "Expecting access_token",bodyObj);
		return;
	}

	// Request updated credentials from Emailbox
	// - via /api/user
	models.Api.loginUser(bodyObj)
		.then(function(user){
			// Succeeded in logging in the user
			// - log this person in using a cookie

			req.session.user = user; // user is OUR version of the user

			// Return success
			jsonSuccess(res,'Logged in',{
				user: {
					id: user.id
				}
			});

		})
		.fail(function(result){
			// Failed to log the user in
			jsonError(res,101,'Unable to log this user in', result);
		});

};

exports.logout = function(req, res){
	req.session.user = null;
	jsonSuccess(res,'Logged out');
};



exports.stats = function(req, res){
	// Gets stats for a person
	// - does a realtime lookup, doesn't cache anything

	var bodyObj = req.body;

	if(ping(req,res)){
		return;
	}

	var getUser = Q.defer();

	// Get the local user_id
	models.User.get_local_by_emailbox_id(bodyObj.auth.user_id)
		.then(function(local_user){;
			getUser.resolve(local_user);
		})
		.fail(function(errData){
			jsonError(res, 101, 'Failed authorizing user');
		});

	getUser.promise
		.then(function(local_user){

			// Return JSON response that we are working on it (the model gets updated)
			jsonSuccess(res, 'Working on stats update: AppMailStatsLatest._id=1');

			console.log('Perform each search');

			// Timezone offset
			var timezone_offset = parseInt(bodyObj.obj.timezone_offset, 10) || 0;

			// Perform each search
			// - not in parallel against the user's DB
			var resultsDeferred = [];

			models.Api.getLastMonthEmailsAndThreads(bodyObj, timezone_offset)
				.then(function(threads_and_emails){
					// Separate into Sent and Received
					// result.threads
					// result.emails_sent
					// result.emails_rec
					console.log('threads_and_emails');

					// Execute tally-er functions

					// 0 - sent vs received
					resultsDeferred.push(models.Stats.sent_vs_received(bodyObj, timezone_offset, threads_and_emails));

					// 1 - time to respond
					resultsDeferred.push(models.Stats.time_to_respond(bodyObj, timezone_offset, threads_and_emails));

					// 3 - contacts
					resultsDeferred.push(models.Stats.contacts(bodyObj, timezone_offset, threads_and_emails));

					// 4 - attachments
					resultsDeferred.push(models.Stats.attachments(bodyObj, timezone_offset, threads_and_emails));

					// Wait for all searches to have been performed
					Q.allResolved(resultsDeferred)
						.then(function(promises){

							console.log('resolved promises');

							// All searches complete
							// - get all of them and return along with indexKey
							var endResults = {};
							promises.forEach(function (promise, index) {
								var tmp_val = promise.valueOf();

								if(index == 0){
									endResults['sent_vs_received'] = tmp_val;
								}
								if(index == 1){
									endResults['time_to_respond'] = tmp_val;
								}
								if(index == 2){
									endResults['contacts'] = tmp_val;
								}
								if(index == 2){
									endResults['attachments'] = tmp_val;
								}


							});

							// // Return results (rip out in next version)
							// jsonSuccess(res, 'Refreshed', endResults);

							// Save the new model
							models.User.update_mailstats_latest(endResults, bodyObj.auth)
								.then(function(){
									console.log('back from update_mailstats_latest');
									// Emit update event
									var eventData = {
										event: 'MailStats.updated',
										obj: true
									};
									models.Emailbox.event(eventData, bodyObj.auth)
										.then(function(){
											console.log('Emitted event ok');
										})
										.fail(function(err){
											console.log('fail1');
											console.log(err);
										});
								});

						})
						.fail(function(data){
							// data == [ indexKey, errCode, errMsg, errData ]
							console.log('fail runEventCreate multiple');
							console.log(data);
							jsonError(res, 101, "Failed creating multiple events");
						});


				})
				.fail(function(err){
					console.log('getLastMonthEmailsAndThreads failed:');
					console.log(err);
				});


		});

};

