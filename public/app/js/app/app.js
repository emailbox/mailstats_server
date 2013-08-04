//forge.debug = true;

var debugging_mode = true;
var clog = function(v){
	if(debugging_mode){
		window.console.log(v);
	}
};

var App = {
	Models:      {},
	Collections: {},
	Views:       {},
	Utils:       {},
	Plugins:     {},
	Events: 	 _.extend({}, Backbone.Events),
	Data: 		 {
		version: "0.0.13",
		InMemory: {},
		online: true,
		LoggedIn: false, // Logged into mailstats servers
		notifications_queue: [],
		paused: false,
		was_paused: false,
		pushNotification: null,
		Keys: {},
		debug_messages: {},
		backbutton_functions: [],
		menubutton_functions: [],
		settings: {},
		default_settings: {
			debug: true
		},
		xy: {
			win_height: 0, // by default, starts in portrait mode and as orientation changes this will update (portrait only)
			win_width: 0,
			mode: 'portrait' // landscape
		},
		timers: {},
		timerbucket: {},
		Store: { // a temporary data store

			ModelCache: {},
			CollectionCache: {},

			// Models on server
			Thread: {},
			Email: {},

			// Not Models on server (local only, sync later)
			ThreadsRecentlyViewed: [],
			ThreadsRecentlyActedOn: [],
			ContactsRecentlyViewed: [],

			// Local only (don't sync?)
			Attachment: {},
			Contacts: [], // usePg=collection, browser=array
			ContactsParsed: [],
			Contact: {},
			Link: {}
		},
		PermaViews: {
			all: null,
			dunno: null,
			due: null,
			later: null,
			leisure: null,
			contacts: null
		},
		GlobalViews: {
			OnlineStatus: null
		}
	},
	Credentials: tmp_credentials,

	// Called once, at app startup
	init: function () {

		// Measurements
		App.Data.xy.win_height = $(window).height();
		App.Data.xy.win_width = $(window).width();

		var currentUrl = window.location.href;

		// Embedly
		$.embedly.defaults.key = App.Credentials.embedly_key;

		// Key presses watching
		App.Data.Keys.ctrl = false;
		$(window).keydown(function(evt) {
			if (evt.ctrlKey) { // ctrl
				App.Data.Keys.ctrl = true;
			}
			if (evt.shiftKey) { // shift
				App.Data.Keys.shift = true;
			}
			if (evt.altKey) { // alt
				App.Data.Keys.alt = true;
			}
			if (evt.metaKey) { // meta/command
				App.Data.Keys.meta = true;
			}
		}).keyup(function(evt) {
			if (evt.ctrlKey) { // ctrl
				App.Data.Keys.ctrl = true;
			} else {
				App.Data.Keys.ctrl = false;
			}
			if (evt.shiftKey) { // shift
				App.Data.Keys.shift = true;
			} else {
				App.Data.Keys.shift = false;
			}
			if (evt.altKey) { // alt
				App.Data.Keys.alt = true;
			} else {
				App.Data.Keys.alt = false;
			}
			if (evt.metaKey) { // meta/command
				App.Data.Keys.meta = true;
			} else {
				App.Data.Keys.meta = false;
			}
		});


		// Update in-memory store with localStorage/Prefs
		App.Utils.Storage.get('AppDataStore')
			.then(function(store){
				if(store != null){
					// Make sure all the default keys exist
					App.Data.Store = $.extend(App.Data.Store,store);
					// console.log('AppDataStore');
					// console.log(App.Data.Store);
				} else {
					console.log('null AppDataStore');
				}
			});

		// Update local settings
		// - use default settings if no local ones
		App.Utils.Storage.get('settings','critical')
			.then(function(settings){
				if(!settings){
					// Not created, create them
					settings = $.extend({}, App.Data.default_settings);

					// Save them
					App.Utils.Storage.set('settings',settings,'critical');
						// .then();
				}

				// Set to global
				App.Data.settings = settings;

			});


		App.Utils.Storage.init()
			.then(function(){

				console.log('Loaded Storage.init');

				// init Router
				// - not sure if this actually launches the "" position...
				App.router = new App.Router();

				// Get access_token if it exists
				var oauthParams = App.Utils.getOAuthParamsInUrl();
				if(typeof oauthParams.access_token == "string"){

					// Have an access_token
					// - save it to localStorage
					App.Utils.Storage.set(App.Credentials.prefix_access_token + 'user', oauthParams.user_identifier, 'critical');
					App.Utils.Storage.set(App.Credentials.prefix_access_token + 'access_token', oauthParams.access_token, 'critical');

					// Save
					App.Events.trigger('saveAppDataStore',true);

					// Reload page, back to #
					window.location = [location.protocol, '//', location.host, location.pathname].join('');
					return;
				}

				// Continue loading router
				Backbone.history.start({silent: true}); // Launches "" router
				App.router.navigate('',true);

				// Debug messages
				// - add to body
				var debug_messages = new App.Views.DebugMessages();
				debug_messages.render();

				// Get user and set to app global
				App.Utils.Storage.get(App.Credentials.prefix_access_token + 'user', 'critical')
					.then(function(user){
						App.Credentials.user = user;
					});

				// Start gathering contacts
				// window.setTimeout(function(){
				// 	App.Data.Store.Contacts = new App.Collections.Contacts();
				// 	App.Data.Store.Contacts.fetch();
				// },10000);

				// Get access_token, set to app global, login to mailstats server (doesn't allow offline access yet)
				// - switch to be agnostic to online state (if logged in, let access offline stored data: need better storage/sync mechanisms)
				App.Utils.Storage.get(App.Credentials.prefix_access_token + 'access_token', 'critical')
					.then(function(access_token){

						console.log('Stored access_token:' + access_token);	

						// Make available to requests
						App.Credentials.access_token = access_token;

						// Run login script from body_login page if not logged in
						if(typeof App.Credentials.access_token != 'string' || App.Credentials.access_token.length < 1){
							// App.router.navigate("body_login", true);
							Backbone.history.loadUrl('body_login')
							return;
						}

						// Validate credentials with mailstats server and emailbox 
						// - make an api request to load my email address

						var dfd = $.Deferred();

						// Logged in on mailstats server
						App.Data.LoggedIn = true;

						App.Plugins.MailStats.login()
							.then(function(){
								// Good, logged into mailstats

								// // Trigger a contacts sync
								// Api.event({
								// 	data: {
								// 		event: 'Contacts.sync',
								// 		obj: true
								// 	},
								// 	success: function(resp){
								// 		// return from contacts sync
								// 	}
								// });

							}) // end .then
							.fail(function(failInfo){
								// Failed MailStats login
								// - already started the process of opening windows, so we put the brakes on that, then totally log the person out

								// 
								try {
									if(failInfo.data.code == 404){
										// Unable to reach emailbox
										// - emailbox returning 404
										console.log('Emailbox server is down');

										// Render "unreachable" display
										// - it includes a "try again" button
										Backbone.history.loadUrl('body_unreachable_server')
										return;
									}

								} catch(err){

								}

								// Might have failed if the API was unreachable
								console.log('Failed MailStats login');

								// localStorage.setItem(App.Credentials.prefix_access_token + 'access_token',null);
								// 
								App.Utils.Storage.set(App.Credentials.prefix_access_token + 'access_token', 'critical')
									.then(function(){
										App.Credentials.access_token = null;
										Backbone.history.loadUrl('body_login')
									});

							});


							// Get our Email Accounts
							App.Data.UserEmailAccounts = new App.Collections.UserEmailAccounts();

							App.Data.UserEmailAccounts.on('reset',function(accounts){
								accounts.each(EmailAccountAdd, this);
							}, this);

							App.Data.UserEmailAccounts.on('add',function(account){
								EmailAccountAdd(account);
							}, this);

							App.Data.UserEmailAccounts.on('remove',function(account){
								// Shit, should not be removing anything, ever
								console.error('Should never be removing from the email account');
							}, this);

							App.Data.UserEmailAccounts.on('change',function(accounts){
								console.log('eh, got a change on the Email Account, maybe the name changed?');
							}, this);

							function EmailAccountAdd(account){
								// Accepts an UserEmailAccount
								// - separate because both reset and add need it
								App.Data.UserEmailAccounts_Quick = _.map(App.Data.UserEmailAccounts.toJSON(),function(acct){
									return acct.email;
								});
							}

							// Fetch all email accounts
							App.Data.UserEmailAccounts.fetchAll();

							// Load login
							Api.Event.start_listening();
							Backbone.history.loadUrl('body');

							// Api.search({
							// 	data: {
							// 		model: 'UserGmailAccounts',
							// 		fields: [],
							// 		conditions: {},
							// 		limit: 1
							// 	},
							// 	success: function(res){
									
							// 		var res = JSON.parse(res);
							// 		if(res.code != 200){
							// 			dfd.reject();
										
							// 			App.Utils.Storage.set(App.Credentials.prefix_access_token + 'access_token',null)
							// 				.then(function(){
							// 					App.Credentials.access_token = null;
							// 					Backbone.history.loadUrl('body_login')
							// 				});
							// 				return;
							// 		}

							// 		var loginData = {
							// 			access_token: App.Credentials.access_token
							// 		};

							// 		// Set EmailAccountData
							// 		App.Data.UserEmailAccounts = res.data[0].UserGmailAccounts;
							// 		App.Data.UserEmailAccounts_Quick = _.map(App.Data.UserEmailAccounts.accounts,function(acct){
							// 			return acct.email;
							// 		});

							// 		Api.Event.start_listening();
							// 		Backbone.history.loadUrl('body');
							
							// Listener for Sent email (for adam)

							Api.Event.on({
								event: 'Email.new'
							},function(result){

								// See if that was a "Sent" email
								// - only care if it was
								
								var havePermission = window.webkitNotifications.checkPermission();
								if (havePermission == 0) {

									Api.count({
										data: {
											model: 'Email',
											conditions: {
												_id: result.data._id,
												'original.labels' : '\\\\Sent'
											}
										},
										success: function(result){
											result = JSON.parse(result);
											if(result.code != 200 || result.data != 1){
												// whoops
												return;
											}

											// It was a sent email! 

											// Fetch emails sent today
											// 0 is PERMISSION_ALLOWED

											// Get emails sent today
											var ndate = new Date();
											var tdate = new Date(ndate.getFullYear(), ndate.getMonth(), ndate.getDate(), 0, 0, 0 ,0);
											var today_in_seconds = parseInt(tdate.getTime() / 1000, 10);

											var countData = {
												model: 'Email',
												conditions: {
													'$and' : [
														{
															'original.labels' : '\\\\Sent'
														},
														{
															'common.date_sec' : {
																'$gte' : today_in_seconds
															}
														}
													]
												}
											};

											// Run count
											Api.count({
												data: countData,
												success: function(result){
													result = JSON.parse(result);
													if(result.code !== 200){
														// Failed getting count
														return;
													}
													var count = result.data;
													var title = '';
													title += count.toString();
													if(count > 1){
														title += ' emails';
													} else {
														title += ' email'
													}
													title += ' sent today';

													var notification = window.webkitNotifications.createNotification(
														'http://i.stack.imgur.com/dmHl0.png',
														title,
														''
													);

													// Close in 3 seconds, or on Click
													window.setTimeout(function(){
														notification.close();
													}, 5000);
													notification.onclick = function () {
														// window.open("https://getemailbox.com");
														notification.close();
													}
													notification.show();

												}
											});

										}

									});

								}

							});

					});


				// Phonegap/cordova Push Notifications
				if(usePg){

					// Push notifications
					try { 
						App.Data.pushNotification = window.plugins.pushNotification;
						if (device.platform == 'android' || device.platform == 'Android') {
							// alert('android push');

							App.Data.pushNotification.register(function(result){
								// alert('success w/ Push Notifications');
								App.Utils.Notification.debug.temporary('Push Setup OK'); // not actually ok, not registering, nothing sending to it

							}, function(err){
								// alert('failed Push Notifications');
								App.Utils.Notification.debug.temporary('Failed Push Notification Setup');
								// console.log(err);
								// alert(err);
							}, 
							{
								"senderID":"312360250527",
								"ecb":"onNotificationGCM"
							});
						} else {
							// // alert('not');
							// pushNotification.register(tokenHandler, errorHandler, {"badge":"true","sound":"true","alert":"true","ecb":"onNotificationAPN"});
						}
					}
					catch(err) { 
						// txt="There was an error on this page.\n\n"; 
						// txt+="Error description: " + err.message + "\n\n"; 
						// alert(txt); 
						// alert('Push Error');
						App.Utils.Notification.debug.temporary('Push Error');
					}

					// Pausing (exiting)
					document.addEventListener("pause", function(){
						// Mark as Paused
						// - this prevents Push Notifications from activating all at once when Resuming

						App.Data.paused = true;
						App.Data.was_paused = true;

					}, false);

					// Resume
					// - coming back to application
					document.addEventListener("resume", function(){
						// Gather existing Push Notifications and see if we should summarize them, or show individually (confirm, etc.)
						
						App.Data.paused = false;
						App.Data.was_paused = true;

						// Run 1 second after returning
						// - collecting all the Push Notifications into a queue
						// - enough time for all Push events to be realized
						setTimeout(function(){

							App.Data.paused = false;
							App.Data.was_paused = false;

							// Get queue
							// - more than 1 item in queue?
							// - different types of items?
							switch (App.Data.notifications_queue.length){
								case 0:
									// No messages
									break;
								case 1:
									// Only a single message, use normal
									App.Plugins.MailStats.process_push_notification_message(App.Data.notifications_queue.pop());
									break;
								default:
									// Multiple notifications
									// - get last added
									alert('Multiple Push Notifications Received. Latest Processed');
									App.Plugins.MailStats.process_push_notification_message(App.Data.notifications_queue.pop());
									App.Data.notifications_queue = [];
									break;
							}
							var queue = App.Data.notifications_queue.concat([]);

							// - assuming 1 type of Push Notification only at this time

						},1000);

					}, false);


					// Init MENU button on Android (not always there?)
					document.addEventListener("menubutton", function(){
						// - only launches the settings if we're on the main view
						Backbone.history.loadUrl('launch_settings');
					}, false);
				
					// Init BACK button on Android
					// - disable default first
					document.addEventListener("backbutton", function(killa){
						// Any entries in the list?
						if(App.Data.backbutton_functions.length < 1){

							var a = confirm('Close Email Stats? ');
							if(a){
								navigator.app.exitApp();
							}
							return;
						} else {
							// Run the highest-bubbled function
							App.Data.backbutton_functions[0].func();
						}
					}, false);

					// Online/Offline state

					//Create the View
					// - render too
					App.Data.GlobalViews.OnlineStatus = new App.Views.OnlineStatus();
					App.Data.GlobalViews.OnlineStatus.render();

					// Online
					// - remove "not online"
					document.addEventListener("online", function(){
						// Am now online
						// - emit an event?
						App.Data.GlobalViews.OnlineStatus.trigger('online');

					}, false);
					document.addEventListener("offline", function(){
						// Am now online
						// - emit an event?
						App.Data.GlobalViews.OnlineStatus.trigger('offline');

					}, false);


				}

		}); // end App.Utils.Storage.init().then...

	}

	
};

// GCM = Google Cloud Messag[something]
function onNotificationGCM(e){
	
	App.Utils.Notification.debug.temp('New Notification: ' + e.event);

	switch( e.event ){
		case 'registered':
			// Registered with GCM
			if ( e.regid.length > 0 ) {
				// Your GCM push server needs to know the regID before it can push to this device
				// here is where you might want to send it the regID for later use.
				// alert('registration id: ' + e.regid);
				App.Utils.Notification.debug.temp('Reg ID:' + e.regid.substr(0,25) + '...');

				// Got the registration ID
				// - we're assuming this happens before we've done alot of other stuff
				App.Credentials.android_reg_id = e.regid;

				// Write the key
				// - see if the user is logged in
				var i = 0;
				var pushRegInterval = function(){
					window.setTimeout(function(){
						// See if logged in
						if(App.Data.LoggedIn){
							// Sweet, logged in, update remote
							App.Plugins.MailStats.updateAndroidPushRegId(App.Credentials.android_reg_id);
						} else {
							// Run again
							App.Utils.Notification.debug.temp('NLI - try again' + i);
							i++;
							pushRegInterval();
						}
					},3000);
				};
				pushRegInterval();

			}
		break;

		case 'message':
			// if this flag is set, this notification happened while we were in the foreground.
			// you might want to play a sound to get the user's attention, throw up a dialog, etc.

			// alert('message received');
			// alert(JSON.stringify(e.payload));

			// Capture and then wait for a half-second to see if any other messages are incoming
			// - don't want to overload the person
			
			if (e.foreground){
				// We were in the foreground when it was incoming
				// - process right away
				App.Plugins.MailStats.process_push_notification_message(e);
			} else {
				// Not in the foreground
				// - they clicked the notification
				// - process all of them at once
				if (e.coldstart){
					// App wasn't previously running, so it is starting up
				} else {
					// App is probably already displaying some other page
				}

				// add to process queue
				App.Data.notifications_queue.push(e);

			}

			// if(App.Data.was_paused){
			// 	// Was just paused, add to queue
			// 	App.Data.notifications_queue.push(e);
			// } else {
			// 	// Not paused, immediately take action on the item
			// 	App.Plugins.MailStats.process_push_notification_message(e);
			// }

		break;

		case 'error':
			alert('GCM error');
			alert(e.msg);
		break;

		default:
			alert('An unknown GCM event has occurred');
		break;
	}
};

jQuery.fn.reverse = [].reverse;
$.whenall = function(arr) { return $.when.apply($, arr); };
