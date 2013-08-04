// Simpler functions for plugins (like Models/components)

App.Plugins.MailStats = {

	login: function(){
		// Login into our server

		var dfd = $.Deferred();

		var loginData = {
			access_token: App.Credentials.access_token
		};

		var ajaxOptions = {
			url: App.Credentials.mailstats_server + '/api/login',
			type: 'POST',
			cache: false,
			data: loginData,
			dataType: 'json',
			// headers: {"Content-Type" : "application/json"},
			error: function(err){
				// Failed for some reason
				// - probably not on the internet
				console.log(2);
				if(!App.Data.online){
					alert('Unable to load a data connection (placeholder)');
				}
			},
			success: function(jData){
				// Result via Mailstats server
				// - sets cookie?

				if(jData.code != 200){
					//Failed logging in
					console.log('==failed logging in');
					dfd.reject(jData);
					return;
				}


				App.Credentials.app_user = jData.data.user;
				// clog('App.Credentials.app_user');
				// clog(App.Credentials.app_user);

				// dfd.resolve();

				// Backbone.history.loadUrl('body');

				// Resolve previous promise
				dfd.resolve(true);

				// Subscribe to push notifications
				if(useForge){
					// alert('subscribing');
					forge.partners.parse.push.subscribe('c_' + App.Credentials.app_user.id,
						function () {
							forge.logging.info("subscribed to push notifications!");
						},
						function (err) {
							forge.logging.error("error subscribing to push notifications: "+ JSON.stringify(err));
						}
					);
				}
				if(usePg){
					// todo...
				}


			}
		};

		if(useForge){
			clog('FORGE AJAX');
			window.forge.ajax(ajaxOptions);
		} else {
			$.ajax(ajaxOptions);
		}

		return dfd.promise();

	},

	getThreadAndEmails: function(thread_id){
		// Return an individual Thread, including all Emails inside (received, sent, drafts, etc.)

		// Start deferred (1st time)
		var dfd = $.Deferred();

		// Individual thread
		var query = 
		{
			"model" : "Thread",
			"conditions" : {
				"_id" : thread_id
			},
			"fields" : [], // Whole Entity
			"limit" : 1,
			"offset" : 0 // Pagination
		};

		Api.search({
			data: query,
			success: function (response){
				
				try {
					var json = $.parseJSON(response);
				} catch (err){
					alert("Failed parsing JSON");
					return;
				}

				// Check the validity
				if(json.code != 200){
					// Expecting a 200 code returned
					clog('failed getting thread');
					dfd.reject();
					return false;
				}

				// One Thread returned?
				if(json.data.length != 1){
					// Shit
					clog('Could not find Thread');
					return;
				}

				var thread = json.data[0];

				// Convert into a single Thread
				var returnThread = {
								Thread: thread.Thread,
								Email: []
							};

				// Get Emails
				// - sent, received, etc.
				var emails_query = 
				{
					model : "Email",
					conditions : {
						"attributes.thread_id" : thread.Thread._id
					},
					fields : [
								// Common
								'attributes',
								'common',
								'original',
								],
					limit : 200
				};

				Api.search({
					data: emails_query,
					success: function (response){
					
						try {
							var emails_json = $.parseJSON(response);
						} catch (err){
							alert("Failed parsing JSON");
							return;
						}

						// Check the validity
						if(emails_json.code != 200){
							// Expecting a 200 code returned
							clog('Error, not 200. emails_query');
						}

						// Sort Emails
						emails_json.data = App.Utils.sortBy(emails_json.data,'Email.common.date','asc','date');

						// Add emails to Thread
						$.each(emails_json.data,function(i,email){
							// Add to the Thread object
							returnThread.Email.push(email.Email);
						});

						dfd.resolve(returnThread);

					}
				});

			}


		});

		// Return search function
		return dfd.promise();

	},

	getDelayOptions: function(){

		var opts = [];

		// Add options depending on time of day, etc.
		// - using simple ones for now

		// opts.push({
		// 	name: "Few Seconds",
		// 	key: 'few_seconds',
		// 	wait: (5).seconds().fromNow()
		// });
		opts.push({
			name: "Few minutes",
			key: 'few_minutes',
			wait: (15).minutes().fromNow()
		});
		opts.push({
			name: "3 Hours",
			key: 'few_hours',
			wait: (3).hours().fromNow()
		});

		var nowTime = new Date.now();

		// after_lunch if it is > 7hours away (meaning it is already after lunch)
		// opts.push({
		// 	name: "After Lunch",
		// 	key: 'after_lunch',
		// 	wait: new Date.now().set({hours: 13,minutes: 0})
		// });
		// var hours_diff = (Date.today().set({hours: 13,minutes: 0}).getTime() - nowTime.getTime()) / (1000 * 60 * 60);
		// if(hours_diff < 0 || hours_diff > 7){
		// 	opts[opts.length - 1].hide = 'invisible ignore';
		// }

		// 2
		opts.push({
			name: "Tomorrow",
			key: 'tomorrow_morning',
			wait: new Date.parse('tomorrow +7 hours')
		});
		opts.push({
			name: "Friday",
			key: 'friday',
			wait: new Date.today().next().friday().add({hours: 7})
		});
		// Hide Friday if Tomorrow/both are equal (show "Tomorrow" only)
		if(opts[opts.length - 1].wait.getTime() == opts[2].wait.getTime()){
			opts[opts.length - 1].hide = 'duplicate';
		}

		// Saturday
		opts.push({
			name: "This Weekend",
			key: 'weekend',
			wait: new Date.today().next().saturday().add({hours: 7})
		});
		// Hide Saturday if Tomorrow/both are equal (show "Tomorrow" only)
		if(opts[opts.length - 1].wait.getTime() == opts[2].wait.getTime()){
			opts[opts.length - 1].hide = 'duplicate';
		}

		opts.push({
			name: "Next Week", // next monday
			key: 'next_week',
			wait: new Date.today().next().monday().add({hours: 7})
		});
		// Hide Next Week if Tomorrow/both are equal (show "Tomorrow" only)
		if(opts[opts.length - 1].wait.getTime() == opts[2].wait.getTime()){
			opts[opts.length - 1].hide = 'duplicate';
		}

		opts.push({
			name: "Next Month",
			key: 'next_month',
			wait: new Date.today().next().month().set({day: 1}).add({hours: 7})
		});
		opts.push({
			name: "3 Months",
			key: 'three_months',
			wait: new Date.today().add({months: 3}).set({day: 1}).add({hours: 7})
		});

		return opts;

	},

	updateAndroidPushRegId: function(android_reg_id){
		// Update or create AppMailStatsSettings
		// - per-user settings

		var dfd = $.Deferred();

		// See if already exists
		Api.search({
			data: {
				model: 'AppMailStatsSettings',
				conditions: {
					'_id' : 1
				},
				fields: []
			},
			success: function(response){
				response = JSON.parse(response);
				
				if(response.code != 200){
					// Shoot
					return;
				}

				// Settings already exist?
				if(response.data.length < 1){
					// Not set
					// - create w/ defaults
					// alert('Settings being created');
					App.Utils.Notification.toast('Settings being created');

					// Default data to save to emailbox
					var defaultData = {
						'_id' : 1,
						android_reg_id: android_reg_id // push.android_reg_id
					};

					Api.write({
						data: {
							model: 'AppMailStatsSettings',
							obj: defaultData
						},
						success: function(response){
							response = JSON.parse(response);
							if(response.code != 200){
								// Shoot
								alert('Settings failed to be created');
								dfd.resolve(false);
								return;
							}

							// Saved ok
							dfd.resolve(true);
						}
					});

				} else {
					// Settings already exist
					// - update them
					// alert(android_reg_id);
					Api.update({
						data: {
							model: 'AppMailStatsSettings',
							id: 1,
							paths: {
								'$set' : {
									android_reg_id: android_reg_id
								}
							}
						},
						success: function(response){
							response = JSON.parse(response);
							if(response.code != 200){
								// Shoot
								dfd.resolve(false);
								return;
							}

							// Updated ok
							dfd.resolve(true);
						}
					});

				}
			}
		});

		// Return promise
		return dfd.promise();

	},

	process_push_notification_message: function(e){
		// Processing a single Push Notification
		// - not meant for handling a bunch in a row

		if (e.foreground) {
			// Launched 
			// alert('app in foreground');

			// Go to the Thread?
			// - load the thread first?

			// Go to thread referenced?
			// alert(JSON.stringify(e.payload));
			// alert(e.payload.threadid);
			if(e.payload.threadid){
				if(confirm('New Thread. View Thread?')){
					// App.Data.Store.Thread[this.threadid] = undefined;
					Backbone.history.loadUrl('view_thread/' + e.payload.threadid);
				}
			}


			// // if the notification contains a soundname, play it.
			// var my_media = new Media("/android_asset/www/"+e.soundname);
			// my_media.play();
		} else {    
			// Launched because the user touched a notification in the notification tray.
			// alert('app NOT in foreground');

			// Go to thread referenced?
			if(e.payload.threadid){
				// if(confirm('View Thread?')){
					// App.Data.Store.Thread[this.threadid] = undefined;
					Backbone.history.loadUrl('view_thread/' + e.payload.threadid);
				// }
			}

		}

	},

	unsubscribe_from_push: function(){

		var dfd = $.Deferred();

		if(useForge){
			forge.partners.parse.push.subscribedChannels(
				function (channels) {
					// Unsubscribe from each
					forge.logging.info("subscribed to: "+JSON.stringify(channels));
					$.each(channels,function(channel){
						clog('channel');
						clog(channel);
						forge.partners.parse.push.unsubscribe(channel,function(){
								// worked OK
							},
							function(err){
								clog('==Failed unsubscribing');
								clog(err);
							}
						);
					});

					// Resolve
					// - instant, not waiting for unsubscribe to succeed (todo...)
					dfd.resolve();
				},
				function(err){
					// Failed unsubscribing
					dfd.reject();
				}
			);
		} else {
			window.setTimeout(function(){
				dfd.resolve();
			},1);
		}

		return dfd.promise();

	},

	formatDateForScroll: function(dateobj){

		var hour = parseInt(dateobj.toString('h'), 10),
			ampm = dateobj.toString('t') == 'A' ? 0 : 1;

		// must convert 12 to 0 for hours (expected by mobiscroll)
		if(hour == 12){
			hour = 0;
		}

		var tmp = [
			dateobj.toString('M') - 1, // month,
			dateobj.toString('d'),// day, 
			dateobj.toString('yyyy'),// year, 
			hour,// hour, 
			dateobj.toString('m'),// min, 
			ampm,// ampm
		];

		// Return formatted array
		return tmp;

	},

	formatTimeForScroll: function(dateobj){

		var hour = parseInt(dateobj.toString('h'), 10),
			ampm = dateobj.toString('t') == 'A' ? 0 : 1;

		// must convert 12 to 0 for hours (expected by mobiscroll)
		if(hour == 12){
			hour = 0;
		}

		var tmp = [
			hour,// hour, 
			dateobj.toString('m'),// min, 
			ampm,// ampm
		];

		// Return formatted array
		return tmp;

	},

	parseDateFromScroll: function(date_arr){
		// turn a date_arr into a js date object

		date_arr = _.map(date_arr,function(v){
			return parseInt(v,10);
		});

		var hours = date_arr[3];

		// must convert 0 to 12 for hours (output by mobiscroll)
		// if(hour == 0){
		// 	hour = 12;
		// }

		// Handle PM
		if(date_arr[5] == 1){
			hours = hours + 12;	
		}

		// year, month, day, hours, minutes, seconds, milliseconds
		var tmp = new Date(date_arr[2],date_arr[0],date_arr[1],hours,date_arr[4],0,0);

		// Return valid Date object
		return tmp;

	},

	parseTimeFromScroll: function(date_arr){
		// turn a date_arr into a js date object

		date_arr = _.map(date_arr,function(v){
			return parseInt(v,10);
		});

		var hours = date_arr[0];

		// must convert 0 to 12 for hours (output by mobiscroll)
		// if(hour == 0){
		// 	hour = 12;
		// }

		// Handle PM
		if(date_arr[2] == 1){
			hours = hours + 12;
		}

		// year, month, day, hours, minutes, seconds, milliseconds
		var tmp = new Date(2013,1,0,hours,date_arr[1],0,0);

		// Return valid Date object
		return tmp;

	}



}