/**
 * Module dependencies.
 */

// Promises
var Q = require('q');

// Node-gcm (Google Cloud Messaging)
var gcm = require('node-gcm');
var gcm_sender = new gcm.Sender('AIzaSyComNH2V2K3GErqbMkriU3obkunpVzv5Wo');

// validator
var validator = require('validator');
var sanitize = validator.sanitize;

var _ = require('underscore');

exports.loginUser = function(bodyObj){
	// Check emailbox for a user based on the submitted credentials

	var defer = Q.defer();

	process.nextTick(function(){

		var user = {};

		user.access_token = bodyObj.access_token;

		console.log('access_token:');
		console.log(bodyObj.access_token);

		models.Emailbox.user(user)

			.then(function(result){
				// Did we get authenticated with Emailbox?

				if(typeof result.id != 'string'){
					defer.reject(2);
					return;
				}

				// Sweet, we have a valid user

				// Update the user_token for this user
				// - or if they don't exist in the DB, add them

				var created = new Date();
				created = created.getTime();

				// Try and insert the user and key
				models.mysql.acquire(function(err, client) {
					if (err) {
						defer.reject({code:404,msg:'mysql failure'});
						return;
					}
					client.query(
						'INSERT INTO f_users (id, emailbox_id, access_token, created) ' +
						'VALUES (?, ?, ?, ?) ' +
						'ON DUPLICATE KEY UPDATE ' +
						'access_token=?'
						,[null, result.id, bodyObj.access_token, created, bodyObj.access_token]
						, function(error, info, fields) {

							models.mysql.release(client);

							if (error) {
								defer.reject({code:101,msg:'Failed INSERT or UPDATE'});
								return false;
							}

							// Inserted anybody?
							if(info.insertId > 0){
								// Yes
							} else {
								// No
							}

							// Get the full person
							models.Api.getUser(result.id)
								.then(function(user){
									defer.resolve(user);
								})
								.fail(function(){
									defer.reject();
								});

							// Build the newUser
							// var newUser = {
							// 	id : info.insertId,
							// 	username : obj.email,
							// 	developer: developer
							// };

							// defer.resolve(info);

						}
					);

				});


			})

			.fail(function(result){
				console.log('result');
				console.log(result);
				defer.reject({code:404,msg:result});
				// jsonError(res,101,'Failed logging in user');
			});

	});

	return defer.promise;

};


exports.updateUser = function(userObj){
	// Check emailbox for a user based on the submitted credentials

	var defer = Q.defer();

	process.nextTick(function(){

		// Build user object
		var user = {
			access_token: bodyObj.access_token // used for requesting Emailbox user (later)
		};

		// Only updating:
		// - android_reg_id
		// - ios_something (todo...)
		var updating = {};

		user.android_reg_id = bodyObj.android_reg_id || null;

		// console.log('android_reg_id:');
		// console.log(bodyObj.android_reg_id);

		if(user.android_reg_id){
			// Updating android_reg_id

			// Validate android_reg_id
			if(typeof user.android_reg_id != 'string'){
				defer.reject({code: 404, msg: 'Invalid android_reg_id'});
				return;
			} else {
				updating['android_reg_id'] = user.android_reg_id;
			}
		}

		// Updating anything??
		if(!_.size(updating)){
			defer.reject({code: 404, msg:'No valid update requests provided'});
			return;
		}

		// Get the User from Emailbox
		models.Emailbox.user(user)

			.then(function(result){
				// Did we get authenticated with Emailbox?

				if(typeof result.id != 'string'){
					defer.reject(2);
					return;
				}

				// Sweet, we have a valid user

				// Update the user_token for this user
				// - or if they don't exist in the DB, add them

				var created = new Date();
				created = created.getTime();

				// Get keys to update
				var keys = [];
				for(var k in obj) keys.push(k);

				// Add user's id


				// Try and update the user's things
				models.mysql.acquire(function(err, client) {
					if (err) {
						defer.reject({code:404,msg:'mysql failure'});
						return;
					}
					client.query(
						'UPDATE * FROM f_users ' +
						'SET android_reg_id=? ' +
						'WHERE id=?'
						,[bodyObj.android_reg_id, result.id]
						, function(error, info, fields) {

							models.mysql.release(client);

							if (error) {
								defer.reject({code:101,msg:'Failed INSERT or UPDATE'});
								return false;
							}

							// Inserted anybody?
							console.log('info');
							console.log(info);

							// Check if updated
							// - expect a single entry to be updated
							defer.resolve(true);

						}
					);

				});


			})

			.fail(function(result){
				console.log('result');
				console.log(result);
				defer.reject({code:404,msg:result});
				// jsonError(res,101,'Failed logging in user');
			});

	});

	return defer.promise;

};


exports.getUser = function(emailbox_id){
	// Return a User
	var defer = Q.defer();

	// Search for the User
	// - only return a single person
	models.mysql.acquire(function(err, client) {
		if (err) {
			defer.reject({code:404,msg:'mysql failure'});
			return;
		}
		client.query(
			'SELECT * FROM f_users ' +
			'WHERE f_users.emailbox_id=?'
			,[emailbox_id]
			, function(error, rows, fields) {

				models.mysql.release(client);

				if (error) {
					defer.reject({code:101,msg:'Failed INSERT or UPDATE'});
					return false;
				}

				if(rows.length < 1){
					// Unable to find User
					defer.reject();
					return;
				}

				// Resolve with single user
				defer.resolve(rows[0]);
			}
		)
	});

	return defer.promise;


};

exports.getLastMonthEmailsAndThreads = function(bodyObj, timezone_offset){
	// Returns last month of Emails (and Threads)

	// Convert timezone_offset to seconds
	timezone_offset = timezone_offset * 60;

	console.log('model time_to_respond');

	var defer = Q.defer();

	process.nextTick(function(){

		var user = {};

		var today = new Date(),
			todayInSec = parseInt(today.getTime() / 1000, 10),
			weekInSec = 60*60*24*7,
			monthInSec = weekInSec * 4,
			lastWeekSeconds = todayInSec - weekInSec,
			lastMonthInSeconds = todayInSec - monthInSec; // exactly one week, to the second


		// Get all Threads that include a Sent email (to know we responded)
		// Email would have \\\\Sent label
		var threadFirstSearchData = {
			model: 'Thread',
			conditions: {
				'attributes.last_message_datetime_sec' : {
					'$gt' : lastMonthInSeconds
				}
			},
			fields: [
				'_id'

			],
			limit: 10000
		};
		models.Emailbox.search(threadFirstSearchData, bodyObj.auth)
			.then(function(threads){
				console.log('threads');
				console.log(threads.length);

				// Get all the thread._id's
				var thread_ids = [],
					threadsObj = {};
				console.log(1);
				try {
					_.each(threads, function(thread){
						thread_ids.push(thread.Thread._id);
						threadsObj[thread.Thread._id] = {
							Thread: thread.Thread,
							Emails: []
						}
					});
				}catch(er){
					console.log(er);
					sys.exit();
				}

				console.log(2);

				// Search for all the related emails in each Thread
				// - returning as little email data as possible, just for analysis

				var allEmails = {
					model: 'Email',
					conditions: {
						'attributes.thread_id' : {
							'$in' : thread_ids
						}
					},
					fields: [
						'common.date_sec',
						'original.headers.To_Parsed',
						'original.headers.Cc_Parsed',
						'original.headers.Bcc_Parsed',
						'original.headers.From_Parsed',
						'original.attachments.size',
						'original.labels',
						'attributes.thread_id'
					],
					sort: {
						_id : -1
					},
					limit: 10000
				};
				console.log('allemails');
				models.Emailbox.search(allEmails, bodyObj.auth)
					.then(function(emails){
						// Match emails with threads

						console.log('Got all emails');
						console.log(emails.length);

						// Sort emails
						emails = _.sortBy(emails, function(email){
							return parseInt(email.Email.common.date_sec, 10);
						});

						var emails_sent = [],
							emails_received = [];

						_.each(emails, function(email){
							if(threadsObj[email.Email.attributes.thread_id] == undefined){
								// somehow got a bad email with thread_id
								console.log('somehow got a bad email in stats');
								return;
							}

							// Sent or received?
							if(email.Email.original.labels.indexOf('\\\\Sent') == -1){
								emails_received.push(email.Email);
							} else {
								emails_sent.push(email.Email);
							}

							// Add to emails
							threadsObj[email.Email.attributes.thread_id].Emails.push(email.Email);

						});

						defer.resolve({
							threads: threadsObj,
							emails_sent: emails_sent,
							emails_rec: emails_received
						});


					})
					.fail(function(err){
						console.log('Failed getting emails');
						console.log(err);
					});


			});


	});

	return defer.promise;

};


exports.pushToAndroid = function(registration_id, data, collapseKey, timeToLive, numRetries){
	// Send a Push Message to a user

	// Create deferred
	var defer = Q.defer();

	data = data || {};
	collapseKey = collapseKey || 'New Alerts';
	timeToLive = timeToLive || 10;
	numRetries = numRetries || 4;

	// Android Push
	// - everybody, for now
	var message = new gcm.Message();
	var registrationIds = [];

	// Optional
	Object.keys(data).forEach(function(key) {
		message.addData(key, data[key]);
	});
	message.collapseKey = collapseKey;
	// message.delayWhileIdle = true; // delay if not visible on the app? 
	message.timeToLive = timeToLive;

	// Add to registrationIds array
	// - at least one required
	registrationIds.push(registration_id);

	// Parameters: message-literal, registrationIds-array, No. of retries, callback-function

	// process.nextTick(function(){
	// 	var err = null,
	// 		result = "imposter";
	gcm_sender.send(message, registrationIds, numRetries, function (err, result) {

		/*
		Example result:
		{ multicast_id: 6673058968507728000,
		  success: 1,
		  failure: 0,
		  canonical_ids: 0,
		  results: [ { message_id: '0:1363393659420351%b678d5c0002efde3' } ] }
		 */

		// Result deferred
		defer.resolve({
			err: err,
			result: result
		});

	});

	// Return promise
	return defer.promise;

};

