/**
 * Module dependencies.
 */

// Promises
var Q = require('q');

// validator
var validator = require('validator');
var sanitize = validator.sanitize;

var _ = require('underscore');


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


exports.get_emails = function(user_id){
	// Return a User's emails
	// - also query from Emailbox

	var defer = Q.defer();

	// Search for the User
	// - only return a single person
	models.mysql.acquire(function(err, client) {
		if (err) {
			defer.reject({code:404,msg:'mysql failure'});
			return;
		}
		client.query(
			'SELECT * FROM f_emails ' +
			'LEFT JOIN f_users ON f_users.id=f_emails.user_id ' +
			'WHERE f_emails.user_id=? ' +
			'ORDER BY f_emails.id DESC'
			,[user_id]
			, function(error, rows, fields) {

				models.mysql.release(client);

				if (error) {
					defer.reject({code:101,msg:'Failed INSERT or UPDATE'});
					return false;
				}

				var local_emails = rows;

				if(local_emails.length == 0){
					defer.resolve([]);
					return;
				}

				var email_ids = [];
				local_emails.forEach(function(email){
					email_ids.push(email.email_id);
				});

				var searchData = {
					model: 'Email',
					conditions: {
						'_id' : {
							'$in' : email_ids
						}
					},
					fields: ['original.headers','attributes','common'],
					limit: 100,
					sort: {
						'common.date_sec' : -1
					}
				};

				// Query emailbox for these email id's
				// - emails[0] contains all the user_data as well
				models.Emailbox.search(searchData,local_emails[0])
					.then(function(apiEmails){

						// Merge with our email data
						// - don't want to return user data, just emails with local data
						// - paid, etc.
						// - better way of doing this merging?
						var output = [];
						local_emails.forEach(function(local_email){
							local_email.api = {};
							apiEmails.forEach(function(apiEmail){
								if(apiEmail.Email._id == local_email.email_id){
									local_email.api = apiEmail;
								}
							});
							var tmp = {
								local: {
									paid: local_email.paid,
									paid_date: local_email.paid,
									stripe_token: local_email.stripe_token
								},
								api: local_email.api
							};
							output.push(tmp);
						});

						// Return each row, but now with api data included
						defer.resolve(output);
					})
					.fail(function(err){
						defer.resolve([]);
					});

			}
		)
	});

	return defer.promise;

};

exports.get_local_by_emailbox_id = function(emailbox_id){
	// Return a User
	var defer = Q.defer();
	
	models.mysql.acquire(function(err, client) {
		if (err) {
			return;
		} 
		client.query(
			'SELECT * from f_users ' + 
			'WHERE f_users.emailbox_id=?'
			, [emailbox_id]
			, function(error, rows, fields) {

				models.mysql.release(client);

				if(error){
					defer.reject();
					return;
				}

				try {
					if(rows.length != 1){
						// Bad user
						console.log('Bad User');
						return;
					}
				} catch(err){
					console.log('Bad user');
					defer.reject();
				}

				// Get user
				var local_user = rows[0];

				defer.resolve(local_user);

			}
		);
	});

	return defer.promise;
};


exports.update_mailstats_latest = function(updateData, userAuth){
	// Return settings for the auth'd user

	// Create deferred
	var defer = Q.defer();

	// Combine with defaultData
	var userData = {
		model: 'AppMailStatsLatest',
		conditions: {
			_id: 1
		},
		paths: {
			'$set' : updateData
		}
	};

	// Write to emailbox
	models.Emailbox.update(userData,userAuth)
		.then(function(updateCount){
			// Successfully wrote settings

			console.log('update count');
			console.log(updateCount);

			if(updateCount == 0){
				// No record exists, do a Write
				models.User.write_default_mailstats_latest(updateData, userAuth)
					.then(function(){
						console.log('wrote');
						defer.resolve(null, updateData);
					});
			} else {
				// Resolve
				defer.resolve(null, updateCount);
			}
		})
		.fail(function(err){
			console.log('Failed update');
			console.log(err);
			defer.reject(err);
			// defer.resolve(err,null);
		});

	// Return deferred
	return defer.promise;

};

exports.write_default_mailstats_latest = function(writeData, userAuth){
	// Return settings for the auth'd user

	console.log('writing');

	// Create deferred
	var defer = Q.defer();

	// Default data to save to emailbox
	writeData = _.extend(writeData, {_id: 1});

	// Combine with defaultData
	var userData = {
		model: 'AppMailStatsLatest',
		obj: writeData
	};

	// Write to emailbox
	models.Emailbox.write(userData,userAuth)
		.then(function(result){
			// Successfully wrote settings
			console.log('write ok');
			// Resolve
			// - missing createdAt and updatedAt in response
			defer.resolve(null, result);
		})
		.fail(function(err){
			console.log('Failed write');
			console.log(err);
			defer.reject(err);
		});

	// Return deferred
	return defer.promise;
}

