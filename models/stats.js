/**
 * Module dependencies.
 */

// Promises
var Q = require('q');

// xtend
var extend = require('xtend')

require('date-utils');

var _ = require('underscore');

// validator
var validator = require('validator');
var sanitize = validator.sanitize;

exports.sent_vs_received = function(bodyObj, timezone_offset){
	// Returns sent vs. received emails for each day in the past week
	// - the app can show the data in different ways

	// Convert timezone_offset to seconds
	timezone_offset = timezone_offset * 60;
	console.log(timezone_offset);

	console.log('model sent_vs_received');

	var defer = Q.defer();

	process.nextTick(function(){

		var user = {};

		var lastWeekSeconds = new Date(),
			weekInSec = 60*60*24*7;
		lastWeekSeconds = parseInt(lastWeekSeconds.getTime() / 1000, 10) - weekInSec; // exactly one week, to the second

		// Email would have \\\\Sent label
		var searchData = {
			model: 'Email',
			conditions: {},
			fields: ['common.date_sec'],
			limit: 10000
		};
		var withSent = extend(searchData,{
			conditions: {
				'original.labels' : '\\\\Sent',
				'common.date_sec' : {
					'$gt' : lastWeekSeconds
				}
			}
		});

		var withoutSent = extend(searchData,{
			conditions: {
				'original.labels' : {
					"$ne" : '\\\\Sent'
				},
				'common.date_sec' : {
					'$gt' : lastWeekSeconds
				}
			}
		});

		var resultsDeferred = [];

		// 0 - sent
		resultsDeferred.push(models.Emailbox.search(withSent, bodyObj.auth));

		// 1 - received
		resultsDeferred.push(models.Emailbox.search(withoutSent, bodyObj.auth));


		// Wait for all searches to have been performed
		Q.allResolved(resultsDeferred)
			.then(function(promises){

				console.log('Finished promises');

				// All searches complete
				// - get all of them and return along with indexKey

				// Get expected days
				var expected_days = {};
				var today = new Date(),
					today_real = parseInt(today.getTime() / 1000, 10) - timezone_offset; // in seconds

				[0,1,2,3,4,5,6].forEach(function(val, index){
					var tmp_date = new Date((today_real - (val * 24 * 60 * 60)) * 1000),
						// day_of_month = tmp_date.getDate();
						day_of_month = tmp_date.toFormat('D-') + tmp_date.toFormat('DDD').substr(0,2);
					expected_days[ day_of_month ] = 0;
				});

				var sentDateArray = extend({},expected_days),
					receivedDateArray = extend({},expected_days);

				promises.forEach(function (promise, index) {
					var tmp_val = promise.valueOf();
					// console.log('tmp_val');
					// console.log(tmp_val);

					// Iterate over emails and add to correct date in array
					tmp_val.forEach(function(emailModel){
						// Get date for email
						// console.log(emailModel.Email.common.date_sec * 1000);
						var old = emailModel.Email.common.date_sec,
							newtime = old - timezone_offset;
						
						var tmp_date = new Date(newtime * 1000),
							// day_of_month = tmp_date.getDate();
							day_of_month = tmp_date.toFormat('D-') + tmp_date.toFormat('DDD').substr(0,2);

						if(index == 0){
							// Sent
							if(sentDateArray[day_of_month] == undefined){
								return; // already set possible days
							}
							sentDateArray[day_of_month]++;
						} else {
							// Received
							if(receivedDateArray[day_of_month] == undefined){
								return; // already set possible days
							}
							receivedDateArray[day_of_month]++

						}

					});

				});

				// Resolve deferred
				defer.resolve({
					sent: sentDateArray, 
					received: receivedDateArray}
				);
			})
			.fail(function(errData){
				console.log('Fail');
				console.log(errData);
				defer.reject(errData);
			});

	});

	return defer.promise;

};


exports.time_to_respond = function(bodyObj, timezone_offset){
	// Returns sent vs. received emails for each day in the past week
	// - the app can show the data in different ways

	// How long does it take to respond to an email

	// multiple time periods
	// - first response (first response in a thread)
	// - over
	// - average overall (95th percentile?)

	// Convert timezone_offset to seconds
	timezone_offset = timezone_offset * 60;
	console.log(timezone_offset);

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
				'attributes.labels.Sent' : 1,
				'attributes.last_message_datetime_sec' : {
					'$gt' : lastMonthInSeconds
				}
			},
			fields: ['_id'],
			limit: 10000
		};
		models.Emailbox.search(threadFirstSearchData, bodyObj.auth)
			.then(function(threads){
				console.log('threads');
				console.log(threads.length);

				// Get all the thread._id's
				var thread_ids = _.map(threads, function(thread){
					return thread.Thread._id;
				});

				// Create object with thread_id as key
				var threads_obj = {};
				_.each(thread_ids, function(thread_id){
					threads_obj[thread_id] = [];
				});

				// Search for all the related emails in each Thread
				// - returning as little email data as possible, just for analysis

				var allEmails = {
					model: 'Email',
					conditions: {
						'attributes.thread_id' : {
							'$in' : thread_ids
						}
					},
					fields: ['common.date_sec','original.labels','attributes.thread_id'],
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

						// Sort emails
						emails = _.sortBy(emails, function(email){
							return parseInt(email.Email.common.date_sec, 10);
						});

						_.each(emails, function(email){
							if(threads_obj[email.Email.attributes.thread_id] == undefined){
								// somehow got a bad email with thread_id
								console.log('somehow got a bad email in stats');
								return;
							}

							threads_obj[email.Email.attributes.thread_id].push(email);

						});



						console.log('Merged threads and emails into threads_obj');

						// Iterate over emails in a thread and keep count of time_to_response!
						// - collect each time_to_response into different periods of time?
						var first_responses = [],
							other_responses = [];

						_.each(threads_obj, function(emails, thread_id){

							var first_thread = null,
								last_normal_email = null,
								first_normal_email = null,
								ignore_first_response = false,
								recorded_first_response = false;

							_.each(emails, function(email){
								// See if \\\\Sent exists in email
								if(email.Email.original.labels.indexOf('\\\\Sent') == -1){
									// Not Sent
									if(last_normal_email){
										// already have a normal_email
										// see if this is the first_normal_email (for time to 1st response)
										
									} else {
										// This is now the latest normal email
										last_normal_email = email;
										if(first_normal_email){
											// already found the first one
										} else {
											first_normal_email = email;
										}
									}


								} else {
									// It was Sent
									// - reset a bunch of the counters
									if(last_normal_email){
										// one was already received, so add to counters
										last_normal_emali = null;

										// need to calculate first reponse?
										if(!ignore_first_response && !recorded_first_response){
											recorded_first_response = true;
											var first_email_time = first_normal_email.Email.common.date_sec,
												this_email_time = email.Email.common.date_sec;
											first_responses.push([this_email_time - first_email_time, email.Email.common.date_sec]);
										} else {
											var last_email_time = last_normal_email.Email.common.date_sec,
												this_email_time = email.Email.common.date_sec;

											other_responses.push([this_email_time - last_email_time, email.Email.common.date_sec]);
										}

									} else {
										// None have been received yet (I started the sent)
										ignore_first_response = true;
									}
									last_normal_email = null;

								}


							});

						});


						console.log('done');

						// console.log();
						defer.resolve({
							first_responses: first_responses,
							other_responses: other_responses
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
