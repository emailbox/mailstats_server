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

exports.sent_vs_received = function(bodyObj, timezone_offset, threads_and_emails){
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
				var expected_hours = {};
				var today = new Date(),
					today_real = parseInt(today.getTime() / 1000, 10) - timezone_offset
					today_real_date = new Date(today_real * 1000); // in seconds

				// days
				_.range(0,7).forEach(function(val, index){
					var tmp_date = new Date((today_real - (val * 24 * 60 * 60)) * 1000),
						// day_of_month = tmp_date.getDate();
						day_of_month = tmp_date.toFormat('D-') + tmp_date.toFormat('DDD').substr(0,2);
					expected_days[ day_of_month ] = 0;
				});

				// hours
				_.range(0,24).forEach(function(val, index){
					expected_hours[ val ] = 0;
				});

				var sentDateArray = extend({},expected_days),
					receivedDateArray = extend({},expected_days)
					sentHoursArray = extend({}, expected_hours),
					receivedHoursArray = extend({}, expected_hours);

				promises.forEach(function (promise, index) {
					var tmp_val = promise.valueOf();
					// console.log('tmp_val');
					// console.log(tmp_val);

					// Iterate over emails and add to correct date in array
					tmp_val.forEach(function(emailModel){
						// Get date for email
						var old = emailModel.Email.common.date_sec,
							newtime = old - timezone_offset;
						
						var tmp_date = new Date(newtime * 1000),
							// day_of_month = tmp_date.getDate();
							day_of_month = tmp_date.toFormat('D-') + tmp_date.toFormat('DDD').substr(0,2)
							date_hours = tmp_date.getHours();

						if(index == 0){
							// Sent
							if(sentDateArray[day_of_month] == undefined){
								return; // already set possible days
							}
							sentDateArray[day_of_month]++;

							// Today? (add to hours array)
							if(today_real_date.getDate() == tmp_date.getDate()){
								sentHoursArray[date_hours]++;
							}

						} else {
							// Received
							if(receivedDateArray[day_of_month] == undefined){
								return; // already set possible days
							}
							receivedDateArray[day_of_month]++

							// Today? (add to hours array)
							if(today_real_date.getDate() == tmp_date.getDate()){
								receivedHoursArray[date_hours]++;
							}

						}

					});

				});

				// Resolve deferred
				defer.resolve({
					sent: sentDateArray, 
					received: receivedDateArray,
					hoursSent: sentHoursArray,
					hoursReceived: receivedHoursArray
				});

			})
			.fail(function(errData){
				console.log('Fail');
				console.log(errData);
				defer.reject(errData);
			});

	});

	return defer.promise;

};


exports.time_to_respond = function(bodyObj, timezone_offset, threads_and_emails){
	// Returns sent vs. received emails for each day in the past week
	// - the app can show the data in different ways

	// How long does it take to respond to an email

	// multiple time periods
	// - first response (first response in a thread)
	// - over
	// - average overall (95th percentile?)

	// Convert timezone_offset to seconds
	timezone_offset = timezone_offset * 60;

	console.log('model time_to_respond');

	var defer = Q.defer();

	process.nextTick(function(){

		// Iterate over emails in a thread and keep count of time_to_response!
		// - collect each time_to_response into different periods of time?
		var first_responses = [],
			other_responses = [];

		_.each(threads_and_emails.threads, function(thread_and_emails, thread_id){
			var first_thread = null,
				last_normal_email = null,
				first_normal_email = null,
				ignore_first_response = false,
				recorded_first_response = false;

			_.each(thread_and_emails.Emails, function(email){
				// See if \\\\Sent exists in email
				if(email.original.labels.indexOf('\\\\Sent') == -1){
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
							var first_email_time = first_normal_email.common.date_sec,
								this_email_time = email.common.date_sec;
							first_responses.push([this_email_time - first_email_time, email.common.date_sec]);
						} else {
							var last_email_time = last_normal_email.common.date_sec,
								this_email_time = email.common.date_sec;

							other_responses.push([this_email_time - last_email_time, email.common.date_sec]);
						}

					} else {
						// None have been received yet (I started the sent)
						ignore_first_response = true;
					}
					last_normal_email = null;

				}

			});

		});

		defer.resolve({
			first_responses: first_responses,
			other_responses: other_responses
		});

	});

	return defer.promise;

};


exports.contacts = function(bodyObj, timezone_offset, threads_and_emails){
	// Frequently contacted senders
	// - individual and domain top 10s for To, Cc, Bcc separated by sent/received

	console.log('model contacts');

	var defer = Q.defer();

	process.nextTick(function(){

		var result = {
			addresses: {
				sent: {
					To: {},
					Cc: {},
					Bcc: {}
				},
				received: {
					To: {},
					Cc: {},
					Bcc: {},
					From: {}
				},
			},
			domains: {
				sent: {
					To: {},
					Cc: {},
					Bcc: {}
				},
				received: {
					To: {},
					Cc: {},
					Bcc: {},
					From: {}
				},
			},
			top10: {
				addresses: {
					sent: {
						To:[],
						Cc:[],
						Bcc:[]
					},
					received: {
						To:[],
						Cc:[],
						Bcc:[],
						From: []
					}
				},
				domains: {
					sent: {
						To:[],
						Cc:[],
						Bcc:[]
					},
					received: {
						To:[],
						Cc:[],
						Bcc:[],
						From: []
					}
				}
			}
		};

		// iterate over all Sent emails
		_.each(threads_and_emails.emails_sent, function(email){

			var addr_types = ['To','Cc','Bcc'];

			_.each(addr_types, function(addr_type){

				_.each(email.original.headers[addr_type+'_Parsed'], function(addr){
					addr = addr[1].toLowerCase();
					var domain = addr.replace(/.*@/, "").toLowerCase();
					// address
					if(result.addresses.sent[addr_type][addr] == undefined){
						result.addresses.sent[addr_type][addr] = 0;
					}
					result.addresses.sent[addr_type][addr]++;
					// domain
					if(result.domains.sent[addr_type][domain] == undefined){
						result.domains.sent[addr_type][domain] = 0;
					}
					result.domains.sent[addr_type][domain]++;
				});
				//top10
				result.top10.addresses.sent[addr_type] = _.sortBy(
					_.map(result.addresses.sent[addr_type], function(count, addr){
						return [count, addr];
					}), function(item){
					return item[0] * -1;
				}).splice(0,10);
				result.top10.domains.sent[addr_type] = _.sortBy(
					_.map(result.domains.sent[addr_type], function(count, addr){
						return [count, addr];
					}), function(item){
					return item[0] * -1;
				}).splice(0,5);
			});
		});

		// received
		_.each(threads_and_emails.emails_rec, function(email){

			var addr_types = ['To','Cc','From'];

			_.each(addr_types, function(addr_type){

				_.each(email.original.headers[addr_type+'_Parsed'], function(addr){
					addr = addr[1].toLowerCase();
					var domain = addr.replace(/.*@/, "").toLowerCase();
					// address
					if(result.addresses.received[addr_type][addr] == undefined){
						result.addresses.received[addr_type][addr] = 0;
					}
					result.addresses.received[addr_type][addr]++;
					// domain
					if(result.domains.received[addr_type][domain] == undefined){
						result.domains.received[addr_type][domain] = 0;
					}
					result.domains.received[addr_type][domain]++;
				});
				//top10
				result.top10.addresses.received[addr_type] = _.sortBy(
					_.map(result.addresses.received[addr_type], function(count, addr){
						return [count, addr];
					}), function(item){
					return item[0] * -1;
				}).splice(0,10);
				result.top10.domains.received[addr_type] = _.sortBy(
					_.map(result.domains.received[addr_type], function(count, addr){
						return [count, addr];
					}), function(item){
					return item[0] * -1;
				}).splice(0,5);
			});
		});

		defer.resolve(result.top10);

	});

	return defer.promise;

};


exports.attachments = function(bodyObj, timezone_offset, threads_and_emails){
	// Frequently contacted senders
	// - individual and domain top 10s for To, Cc, Bcc separated by sent/received

	console.log('model attachments');

	var defer = Q.defer();

	process.nextTick(function(){

		var result = {
			sent: {
				count: 0,
				size: 0
			},
			received: {
				count: 0,
				size: 0
			}
		};

		// iterate over all Sent emails
		_.each(threads_and_emails.emails_sent, function(email){

			try {
				_.each(email.original.attachments, function(attachment){
					result.sent.count++;
					result.sent.size += attachment.size;
				});	
			} catch(err){
				console.log('attachment err');
			}

		});

		// received
		_.each(threads_and_emails.emails_rec, function(email){

			try {
				_.each(email.original.attachments, function(attachment){
					result.received.count++;
					result.received.size += attachment.size;
				});	
			} catch(err){
				console.log('attachment err');
			}
			
		});

		defer.resolve(result);

	});

	return defer.promise;

};
