Backbone.View.prototype.close = function (notRemove) {
	if (this.beforeClose) {
		this.beforeClose();
	}

	// Empty of HTML content, but don't remove the parent element
	// this.$el.empty();
	if(notRemove){
		// this.remove();
		clog('emptied, not removed');
		this.$el.empty();
	} else {
		this.$el.empty();
		this.remove();
	}
	this.unbind();
};


Backbone.View.prototype.garbage = function (view_list) {};



App.Views.Body = Backbone.View.extend({
	
	// el: 'body',
	className: 'main_body',

	events: {
		'click #refresh_people' : 'refresh_people',
		// 'click .logout' : 'logout',
		'click .goto_senders' : 'goto_senders',

		'click .base_header_menu .threads_change a' : 'menu_click',
		'dblclick .base_header_menu .threads_change a' : 'dblmenu_click',
		'click .base_header_menu .dk_options_inner a' : 'sub_menu_click',

		'click .base_header_menu .logo' : 'settings',

		'click .header [data-action="new_convo"]' : 'new_convo',
		'click .header h1' : 'update_conversations'

		// 'click .base_header_menu a[data-action="compose"]' : 'compose'
	},

	initialize: function() {
		var that = this;
		_.bindAll(this, 'render');

		// Start listening for update events to the counts

		App.Events.on('Main.UpdateCount',this.updateCount, this); // not yet invoked anywhere

	},

	updateCount: function(data){
		// Updates the count for one of the displayed now,due,later
		// console.log('updateCount');
		// Convert types
		if(data.type == 'delayed'){
			data.type = 'now';
		}
		if(data.type == 'later'){
			data.type = 'later';
		}
		if(data.type == 'undecided'){
			data.type = 'dunno';
		}

		// console.log(data);

		if(data.count == 10){
			data.count = "10<sup>+</sup>";
		}

		var $button = this.$('.base_header_menu .threads_change a[data-action="'+data.type+'"]');

		// Remove any previous one
		$button.find('.counter').remove();

		// Create template
		var template = App.Utils.template('t_thread_counter');

		// Add to button
		// console.log('add to button');
		// console.log(data.count);
		// console.log($button);
		$button.append(template({count: data.count}));
		
		return false;

	},


	logout: function(){
		Backbone.history.loadUrl('confirm_logout');
	},


	goto_senders: function(ev){
		// Load the senders page
		Backbone.history.loadUrl('senders');
		return false;
	},

	last_entered_contact_email: '',
	new_convo: function(ev){
		var that = this,
			elem = ev.currentTarget;

		// Start a new conversation based on a submitted email
		var email = window.prompt('What is the email address?', that.last_entered_contact_email);
		if(email == null){
			// pressed cancel
			that.last_entered_contact_email = '';
			return false;
		}

		// Validate email
		if(App.Utils.Validate.email(email) == false){
			App.Utils.Notification.toast('Enter a valid email!', 'danger');
			that.last_entered_contact_email = email;
			return false;
		}

		// Save by emitting a new event
		Api.event({
			data:  {
				event: 'Convomail.new_approval',
				obj: {
					email: email
				}
			},
			success: function(){
				// Succeeded
				console.log('succeeded emitting event');
				App.Utils.Notification.toast('Attempting to create conversation');

			},
			response: {
				'pkg.dev.convomail' : function(response){
					// Did we add the new contact or not?

					if(response.body.code == 200){
						App.Utils.Notification.toast(response.body.msg, 'success');
					} else {
						App.Utils.Notification.toast(response.body.msg, 'danger');
					}

					// trigger a refresh on the conversation
					window.setTimeout(function(){
						App.Events.trigger('refresh_conversations');
					},2000);

					// if(response.body.code == 200 && response.body.fullcontact_data.status == 200){
					//  // Got contact data ok
					//  // - set storage value
					//  App.Utils.Storage.set(email, response.body.fullcontact_data, 'fullcontact_emails');
					//  that.hidden_contact_render_contact(response.body.fullcontact_data);
					// } else {
					//  // Failed somehow
					//  // App.Utils.Storage.set(email, response.body.fullcontact_data, 'fullcontact_emails');
					//  that.hidden_contact_render_error();
					// }

				}
			}
		});

		return false;
	},

	update_conversations: function(ev){
		var that = this,
			elem = ev.currentTarget;

		// Trigger a refresh of conversations
		App.Events.trigger('refresh_conversations');
	},

	set_scroll_position: function(){
		var that = this;

		// Set last scroll position
		this.last_scroll_position = $('.threads_holder').scrollTop();
		this.$el.attr('last-scroll-position',this.last_scroll_position);

	},


	menu_click: function(ev){
		var elem = ev.currentTarget;

		// Get ID of btn
		var id = $(elem).attr('data-action');

		// Custom action for "more" option
		if(id == "more"){
			// Toggle display
			var more_dd = $(elem).parents('.base_header_menu').find('.more-dropdown');
			if(more_dd.hasClass('dk_open')){
				more_dd.removeClass('dk_open');
			} else {
				more_dd.addClass('dk_open');
			}
			return false;
		}

		// Make other buttons inactive
		this.$('.base_header_menu a').removeClass('active');

		// Activate this button
		$(elem).addClass('active');

		// Store scroll position
		this.set_scroll_position();

		// Launch router for undecided, delayed, all, leisure, collections
		Backbone.history.loadUrl(id);

		return false;

	},


	dblmenu_click: function(ev){
		// trying to figure out a "force-refresh" type of approach
		return;

		// var elem = ev.currentTarget;

		// // Get ID of btn
		// var id = $(elem).attr('data-action');

		// // Make other buttons inactive
		// this.$('.base_header_menu button').removeClass('active');

		// // Activate this button
		// $(elem).addClass('active');

		// // Store scroll position
		// this.set_scroll_position();

		// // Launch router for undecided, delayed, all, leisure, collections
		// Backbone.history.loadUrl(id);

		// return false;

	},


	sub_menu_click: function(ev){
		var that = this,
			elem = ev.currentTarget;

		// Get ID of btn
		var id = $(elem).attr('data-action');

		// Hide dropdown
		$(elem).parents('.more-dropdown').removeClass('dk_open');

		// Change active buton (if necessary)
		if(id == 'later' || id == 'now'){
			this.$('.threads_change [data-action]').removeClass('active');
			this.$('.threads_change [data-action="more"]').addClass('active');
		}

		if(id == 'compose'){
			alert('Composing is currently under development');
			return false;
		}

		// Store scroll position
		this.set_scroll_position();

		// Launch router for undecided, delayed, all, leisure, collections
		Backbone.history.loadUrl(id);

		return false;

	},

	settings: function(ev){
		// Launch settings
		// - double-tap on logo
		console.log('settings');

		var that = this,
			elem = ev.currentTarget;

		Backbone.history.loadUrl('settings');

		return false;

	},

	compose: function(ev){
		// // Compose a new email
		// var that = this,
		//  elem = ev.currentTarget;

		// // Compose a new Email

		// // Hide dropdown
		// $(elem).parents('.more-dropdown').removeClass('dk_open');

		// alert('Composing is currently under development');
		// return false;

		// // Store scroll position
		// this.set_scroll_position();

		// // Launch router for undecided, delayed, all, leisure, collections
		// Backbone.history.loadUrl('compose');

	},


	render: function() {

		var that = this;

		// Data
		// var data = this.options.accounts.UserGmailAccounts;

		// Should start the updater for accounts
		// - have a separate view for Accounts?


		// Template
		var template = App.Utils.template('t_body');

		// Write HTML
		$(this.el).html(template());

		// Fix fluid layout
		this.resize_fluid_page_elements();

		// Load the /Undecided/Dunno/New View
		// Backbone.history.loadUrl('undecided');
		var doclick = 'stats';
		// this.$('.base_header_menu a[data-action="'+doclick+'"]').addClass('active');
		Backbone.history.loadUrl(doclick);
		// this.$('.base_header_menu button[data-action="'+doclick+'"]').trigger('touchend');

		// Check for total emails
		// - should be at least 100
		Api.count({
			data: {
				model: 'Email'
			},
			cache: false,
			success: function(resp){
				resp = JSON.parse(resp);
				if(resp.code != 200 || resp.data < 100){
					// Not enough emails, show popup

					 var InsufficientEmails = new App.Views.InsufficientEmails({
					 	scanned: resp.data
					 });
					 InsufficientEmails.render();
			
				}
			}
		});

		// Launch startup tutorial if necessary

		// // Update startup tutorial settings
		// var latest_tut_num = 3;
		// App.Utils.Storage.get('startup_tutorial','critical')
		//  .then(function(tut_num){
		//      if(tut_num != latest_tut_num){
		//          // Not created, show screen

		//          var startup_tut = new App.Views.StartupTutorial();
		//          startup_tut.render();

		//          // Save as viewed
		//          App.Utils.Storage.set('startup_tutorial',latest_tut_num,'critical');
					
		//      }

		//  });

		return this;
	},


	refresh_people: function(){
		// Refresh people

		// Get the current list of people
		var that = this;
		// var dfd = $.Deferred();

		Api.count({
			data: {
				model: 'Email',
				conditions: {
					"$or" : [
						{
							"app.AppMinimalContact.version" : {
								"$lt" : App.Credentials.data_version // versioning
							}
						},
						{
							"app.AppMinimalContact.version" : {
								"$exists" : false // doesn't even exist
							}
						}
					]
				}
			},
			success: function(count_res){
				count_res = JSON.parse(count_res);
				$('#refresh_people').attr('data-total',count_res.data);
				$('#refresh_people').attr('data-togo',count_res.data);
				// dfd.resolve(count_res);
				that.search_again();
			}

		});

		return false;
	},


	search_again: function(){

		var that = this;

		// Iterate through emails
		// - one's we haven't already processed
		// - eventually, do this server-side

		// Count total emails we haven't processed
		var dfd_count = $.Deferred();

		Api.count({
			data: {
				model: 'Email',
				conditions: {
					"$or" : [
						{
							"app.AppMinimalContact.version" : {
								"$lt" : App.Credentials.data_version // versioning
							}
						},
						{
							"app.AppMinimalContact.version" : {
								"$exists" : false // doesn't even exist
							}
						}
					]
				}
			},
			success: function(count_res){
				count_res = JSON.parse(count_res);
				$('#refresh_people').attr('data-togo',count_res.data);
				dfd_count.resolve(count_res);
			}

		});
		dfd_count.promise().then(function(count_res){
			
			var possible = ['To','Delivered-To','From','Cc','Bcc','Reply-To'];
			var header_fields = [];
			$.each(possible,function(i,v){
				// header_fields.push('original.headers.' + v);
				header_fields.push('original.headers.' + v + '_Parsed');
			});

			// Iterate through all emails
			// - go backwards, use a limit
			var dfd_email_search = $.Deferred();
			var fields = ["common"].concat(header_fields);

			Api.search({
				data: {
					model: 'Email',
					conditions: {
						"$or" : [
							{
								"app.AppMinimalContact.version" : {
									"$lt" : App.Credentials.data_version // versioning
								}
							},
							{
								"app.AppMinimalContact.version" : {
									"$exists" : false // doesn't even exist
								}
							}
						]
					},
					fields: fields,
					limit: App.Credentials.email_collect_limit,
					sort: {
						"common.date_sec" : -1
					}
				},
				queue: true,
				success: function(email_res){
					dfd_email_search.resolve(email_res);
				}
			});
			dfd_email_search.then(function(email_res){

				var email_res = JSON.parse(email_res);
				if(email_res.code != 200){
					clog('Failed getting emails');
					return;
				}

				// Parse out all the people

				// Listen for another window starting the process
				// - immediately cancels anything we are saving
				// - todo...

				// Possible places addresses are held
				var addresses = [];

				$.each(email_res.data,function(i,email){

					$.each(possible,function(k,type){
						var type_parsed = type + '_Parsed';
						if (typeof email.Email.original.headers[type_parsed] == 'undefined'){
							// Not a valid one to parse
							return;
						}

						var addr = email.Email.original.headers[type_parsed];

						// Iterate through type Parsed ones now
						$.each(addr,function(j,parsedAddress){

							// Valid email address?
							var email_address = $.trim(parsedAddress[1]);
							if (/^((([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+(\.([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+)*)|((\x22)((((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(([\x01-\x08\x0b\x0c\x0e-\x1f\x7f]|\x21|[\x23-\x5b]|[\x5d-\x7e]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(\\([\x01-\x09\x0b\x0c\x0d-\x7f]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))))*(((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(\x22)))@((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))$/i.test(email_address)){
								// Passed validation
								clog('Pass: ' + email_address);
							} else {
								clog('====FAILED validation: ' + email_address);
								return;
							}
							// Add to array
							addresses.push({
								type: type,
								name: $.trim(parsedAddress[0]),
								email_address: email_address,
								email_id: email.Email._id
							});
						});

					});
				});

				// Update the users after each batch of users we process
				// - so we can show incremental process to the user (update the percentage parsed)

				// This should be handled by a model

				// Check each address against the database, determine if they should be updated or not

				var dfds = [];
				$.each(addresses,function(i,address){
					// Iterate through each
					// - ignore the names if they already match
					var dfd_find_contact = $.Deferred();
					var tmp_dfd = $.Deferred();
					Api.search({
						data: {
							model: "AppMinimalContact",
							conditions: {
								"email" : address.email_address,
								"live" : 1
							},
							fields: [],
							limit: 1
						},
						queue: true,
						success: function(contact_res){
							dfd_find_contact.resolve(contact_res);
						}
					});
					dfd_find_contact.then(function(res){
						res = JSON.parse(res);
						if(res.code != 200){
							clog('Failed finding user');
							return;
						}

						tmp_dfd.resolve();

						if(res.data.length < 1){

							// Found anyone?
							var data  = {
											model: "AppMinimalContact",
											event: "AppMinimalContact.new",
											obj: {
												name: address.name,
												email: address.email_address,
												emails: {},
												groups: [],
												approved: 0,
												live: 1
											}
										};
							// clog(address);
							data.obj.emails[address.type] = [address.email_id];

							// No one with this email
							Api.write({
								data: data,
								queue: true,
								success: function(contact_res){
									contact_res = JSON.parse(contact_res);
									if(contact_res.code != 200){
										clog('Failed saving AppMinimalContact');
										return;
									}
								}
							});
						} else {
							// Found a contact with this email
							// clog('Found contact with this email');

							// Does this type exist?
							if(typeof res.data[0].AppMinimalContact.emails[address.type] == 'undefined'){
								// Write type, with this email.id as the first referenced
								var updateData = {
											id: res.data[0].AppMinimalContact._id,
											model: 'AppMinimalContact',
											paths: {
												"$set" : {
													emails : {}
												}
											}
										};
								updateData.paths["$set"].emails[address.type] = [address.email_id]
								var dfd_update_contact = $.Deferred();
								Api.update({
									data: updateData,
									queue: true,
									success: function(update_res){
										dfd_update_contact.resolve(update_res);
									}
								});
								dfd_update_contact.then(function(update_res){
									update_res = JSON.parse(update_res);
									if(update_res.code != 200){
										clog('-- Failed updating contact');
										return;
									}
								});

								return;
							} else {
								// Type already exists
								// - see if this email_id is already in there
								clog('Finish update script in views.js!!');
							}


						}

					});
		
					// Return a promise that
					dfds.push(tmp_dfd.promise());

					// clog(addresses);
					// clog(addresses.length);

				});

				$.when.apply(this,dfds)
					.then(function(){
						// See if we need to reload anybody else
						
						// Mark these emails to the correct new version
						var email_ids = []; // extract the email ids and do an update
						$.each(email_res.data,function(i,email){
							email_ids.push(email.Email._id);
						});

						var update_dfd = $.Deferred();
						Api.update({
							data: {
								model: 'Email',
								conditions: {
									"_id" : {
										"$in" : email_ids
									}
								},
								paths: {
									"$set" : {
										"app.AppMinimalContact.version" : App.Credentials.data_version
									}
								}
							},
							success: function(update_email_res){
								update_dfd.resolve();
							}
						});

						update_dfd.promise()
							.then(function(){
								if(email_res.data.length < 1){
									clog('Got all emails!');
									that.search_reconcile();
									return;
								}

								clog('== Time to load more emails!!');
								window.setTimeout(function(){
									that.search_again();
								},2000);
							});

					});

				// After all the data for these emails is stored, go get the next batch of emails
				// Save these as completed

				// if(email_res.data.length > 0){
				//  // Keep going
				//  window.setTimeout(function(){
				//      clog('Searching Again');
				//      that.search_again();
				//  },10000);
				// }

			});



		});


		// var do_emails = true;
		// while(do_emails){

		//  var defer = $.defer();

		//  Api.search({
		//      data: {
		//          model: 'AppMinimalContact',
		//          paths: [],
		//          conditions: {},
		//          limit: 10000
		//      }
		//  })

		// }

		return false;
	},

	search_reconcile: function(){
		// Handle duplicates, etc in the AppMinimalContacts
		// - 

		// Get all contacts
		var dfd = $.Deferred();

		Api.search({
			data: {
				model: 'AppMinimalContact',
				paths: [],
				conditions: {

					"live" : 1
				},
				limit: 10000
			},
			queue: true,
			success: function(res){
				// required for a queue
				dfd.resolve(res);
			}
		});

		dfd.promise()
			.then(function(res){
				res = JSON.parse(res);
				if(res.code != 200){
					clog('failed reconciling');
					return;
				}

				var contacts = res.data;

				// 
				for(var i =0; i< contacts.length ; i++){
					for(var j=i+1; j<contacts.length;j++){
						if(i == j){
							// comparing itself
							continue;
						}
						if(contacts[i].AppMinimalContact.email == contacts[j].AppMinimalContact.email){//found matching first 2 chars

							// Merge each of the AppMinimalContact.emails fields (the _Parsed fields)
							// $.each(contacts[j].AppMinimalContact.emails,function(key,val){

							// });

							// contacts[i] = contacts[i].substring(0,3) + contacts[j].replace(/\{(.*?)\}/,"$1 ;") + contacts[i].substring(4);

							// Remove the second id from the database
							Api.remove({
								data: {
									model: 'AppMinimalContact',
									id: contacts[j].AppMinimalContact._id
								},
								success:function(res){
									res = JSON.parse(res);
									clog('Removed: ' + res.data);
								}
							});

							//remove the doup and decrease the counter so you don't skip one now that the array is shorter
							clog('dupe: ' + contacts[i].AppMinimalContact.email);
							contacts.splice(j--,1);

						}
					}
				}

				clog('Finished Reconciling');

				// $.each(contacts,function(key,val){
				//  clog(val.AppMinimalContact.email);
				// });

			});




	}
});


App.Views.Settings = Backbone.View.extend({
	
	className: 'view_settings',

	events: {
		'click .setting[data-setting-type]' : 'clicked_setting',
		'click .cancel' : 'cancel'
	},

	initialize: function(options) {
		_.bindAll(this, 'render');
		_.bindAll(this, 'beforeClose');
		_.bindAll(this, 'cancel');
		var that = this;

	},

	beforeClose: function(){
		var that = this;

		// kill any subviews
		if(this.speedtestSubView){
			this.speedtestSubView.close(); // should emit an event instead?
		}
		if(this.displayedSubview){
			this.displayedSubview.close(); // should emit an event instead?
		}

		// De-bubble this back button
		App.Utils.BackButton.debubble(this.backbuttonBind);

	},

	clicked_setting: function(ev){
		var that = this,
			elem = ev.currentTarget;

		// Activate the chosen setting
		var action = $(elem).attr('data-setting-type');
		this[action](ev); // call the action

		return false;

	},

	cancel: function(ev){
		var that = this;
		// Going back to mailbox
		// - highlight the correct row we were on? (v2)

		// Is there some way of referencing the Backbone view instead of using jquery? 

		// Re-show .main_body
		$('.main_body').removeClass('nodisplay');

		// Scroll to correct position
		var scrollTo = 0;
		if($('.main_body').attr('last-scroll-position')){
			scrollTo = $('.main_body').attr('last-scroll-position');
		}
		$('.threads_holder').scrollTop(scrollTo);

		// Close myself
		this.close();

		ev.preventDefault();
		ev.stopPropagation();
		return false;
	},

	general: function(ev){

		var that = this;

		// Launch speedtest subView
		// - should it really be a subView?

		this.displayedSubview = new App.Views.GeneralSettings();

		// Render the subView
		this.displayedSubview.render();

		// Append to View
		this.$el.after(this.displayedSubview.el); // could do this.speedtestSubView.render().el ?

		// Hide this View
		this.$el.hide();

		// Listen for subview closing
		this.displayedSubview.on('back', function(){
			// Show the parent
			// - close the guy

			this.displayedSubview.close();

			that.$el.show();

		}, this);

	},

	desktop_notifications: function(ev){
		// Turn on desktop notifications
		var that = this;
		
		var havePermission = window.webkitNotifications.checkPermission();
		if (havePermission == 0) {

		} else {
			window.webkitNotifications.requestPermission();
		}

		this.cancel();

	},

	report_bug: function(ev){

		var that = this;

		// Launch speedtest subView
		// - should it really be a subView?

		this.displayedSubview = new App.Views.ReportBug();

		// Render the subView
		this.displayedSubview.render();

		// Append to View
		this.$el.after(this.displayedSubview.el); // could do this.speedtestSubView.render().el ?

		// Hide this View
		this.$el.hide();

		// Listen for subview closing
		this.displayedSubview.on('back', function(){
			// Show the parent
			// - close the guy

			this.displayedSubview.close();

			that.$el.show();

		}, this);

	},

	stats: function(ev){

		var that = this;
		ev.stopPropagation();
		ev.preventDefault();

		// Launch stats view
		// - stats are summarized and created by the convomail server component (because it is faster)
		// - convomail will respond with an event (or emit a new event) containing the Stats we wanted

		this.displayedSubview = new App.Views.Stats();

		// Render the subView
		this.displayedSubview.render();

		// Append to View
		this.$el.after(this.displayedSubview.el); // could do this.speedtestSubView.render().el ?

		// Hide this View
		this.$el.hide();

		// Listen for subview closing
		this.displayedSubview.on('back', function(){
			// Show the parent
			// - close the guy

			this.displayedSubview.close();

			that.$el.show();

		}, this);

		return false;
	},

	sync: function(ev){
		// Triggers an inbox sync with Gmail

		var that = this;

		// trigger the sync event
		Api.event({
			data: {
				event: 'Email.sync',
				delay: 0,
				obj: {}
			}
		});

		// also synces contacts
		Api.event({
			data: {
				event: 'Contacts.sync',
				delay: 0,
				obj: {}
			}
		});

		App.Utils.Notification.toast('Update will take a minute', 'info');

		return;
	},

	tutorial: function(ev){
		var that = this;

		// Launch speedtest subView
		// - should it really be a subView?

		this.tutorial = new App.Views.StartupTutorial();

		// Render the subView
		this.tutorial.render();

		// // Append to View
		// this.$el.after(this.speedtestSubView.el); // could do this.speedtestSubView.render().el ?

		// // Hide this View
		// this.$el.hide();

		// // Listen for subview closing
		// this.speedtestSubView.on('back', function(){
		//  // Show the parent
		//  // - close the guy

		//  this.speedtestSubView.close();

		//  that.$el.show();

		// }, this);

		return;
	},

	speedtest: function(ev){
		var that = this;

		// Launch speedtest subView
		// - should it really be a subView?

		this.speedtestSubView = new App.Views.SpeedTest();

		// Render the subView
		this.speedtestSubView.render();

		console.log(this.speedtestSubView);

		// Append to View
		this.$el.after(this.speedtestSubView.el); // could do this.speedtestSubView.render().el ?

		// Hide this View
		this.$el.hide();

		// Listen for subview closing
		this.speedtestSubView.on('back', function(){
			// Show the parent
			// - close the guy

			this.speedtestSubView.close();

			that.$el.show();

		}, this);

		return;
	},

	flushcache: function(ev){
		// Flushes the cache
		// - seems to fix some problems with models/collections

		var that = this;

		var c = confirm('It might take a minute for previous emails to re-appear, as they are loaded back into the cache');
		if(c){
			// Wait for cache to flush
			App.Utils.Storage.flush()
				.then(function(){
					// worked
					alert('Cache Flushed');
				});
		}

		return;
	},

	closeapp: function(ev){
		var that = this;

		try {
			// android
			navigator.app.exitApp();
		}catch(err){

		}
		try {
			// ios?
			navigator.device.exitApp();
		}catch(err){

		}
	},

	reload: function(ev){
		var that = this;

		window.location = [location.protocol, '//', location.host, location.pathname].join('');

		return false;
	},

	logout: function(ev){
		var that = this;

		// Confirm logout
		Backbone.history.loadUrl('confirm_logout');
	},

	render: function() {
		var that = this;

		// Build from template
		var template = App.Utils.template('t_settings');

		// Settings
		var settings = [
			// {
			//  key: 'stats',
			//  text: 'Stats',
			//  subtext: 'oh so pretty'
			// },
			// {
			// 	key: 'general',
			// 	text: 'General Settings',
			// 	subtext: 'random things',
			// },
			{
				key: 'desktop_notifications',
				text: 'Turn on Desktop Notifications',
				subtext: 'tells you Sent email count',
			},
			{
				key: 'report_bug',
				text: 'Suggestions and Bugs',
				subtext: 'please!',
			},
			// {
			// 	key: 'sync',
			// 	text: 'Sync Inbox',
			// 	subtext: 'reconcile with gmail in a jiffy',
			// },
			// {
			//  key: 'theme',
			//  text: 'Theme',
			//  subtext: 'lots of pretty colors',
			// },
			// {
			// 	key: 'tutorial',
			// 	text: 'Startup Tutorial',
			// 	subtext: 'what does this button do?',
			// },
			{
				key: 'speedtest',
				text: 'Speed Test',
				subtext: 'how fast is your data connection?',
			},
			// {
			// 	key: 'flushcache',
			// 	text: 'Flush Cache',
			// 	subtext: 'fixes most problems',
			// },
			// {
			// 	key: 'reload',
			// 	text: 'Reload',
			// 	subtext: 'fixes display inconsistencies'
			// },
			{
				key: 'close',
				text: 'Exit App',
				subtext: 'in case BackButton broke'
			},
			{
				key: 'logout',
				text: 'Log out',
				subtext: 'hope to see you soon!'
			}
		];

		// Remove device-specif options
		if(usePg){
			if(device.platform == "iOS"){
				settings = _.filter(settings,function(setting){
					switch(setting.key){
						case 'close':
							return false;
						case 'desktop_notifications':
							return false;
						default:
							return true;
					}
				});
			}
		} else {
			settings = _.filter(settings,function(setting){
				switch(setting.key){
					case 'close':
						return false;
					case 'desktop_notifications':
						var havePermission = window.webkitNotifications.checkPermission();
						if (havePermission == 0) {
							return false;
						}
						return true;

					default:
						return true;
				}
			});
		}

		// Write HTML
		that.$el.html(template({
			settings: settings,
			version: App.Data.version
		}));

		// back button
		this.backbuttonBind = App.Utils.BackButton.newEnforcer(this.cancel);

		return this;

	}

});

App.Views.GeneralSettings = Backbone.View.extend({

	className: 'settings_general_view',

	events: {
		'click .cancel' : 'backButton'
	},

	initialize: function() {
		_.bindAll(this, 'render');
		_.bindAll(this, 'beforeClose');
		_.bindAll(this, 'back');

	},

	beforeClose: function(){
		// De-bubble this back button
		App.Utils.BackButton.debubble(this.backbuttonBind);
	},

	backButton: function(ev){
		var that = this,
			elem = ev.currentTarget;

		this.back();

		ev.preventDefault();
		ev.stopPropagation();
		return false;
	},

	back: function(){
		// Go back to settings page
		var that = this;

		this.trigger('back');
	},

	render: function(){
		var that = this;

		// Remove any previous one
		// $('.logout').remove();

		// Build from template
		var template = App.Utils.template('t_settings_general');

		// Get Settings from Cache
		App.Utils.Storage.get('settings', 'critical')
			.then(function(settings){
				if(!settings){
					// No settings created! 
					// - use defaults
				}
			});


		// Build settings data
		// - already loaded into the app, so just show those settings
		

		// Write HTML
		that.$el.html(template(App.Data.settings));

		// Back button
		this.backbuttonBind = App.Utils.BackButton.newEnforcer(this.back);

		return this;
	}

});

App.Views.ReportBug = Backbone.View.extend({

	className: 'settings_report_bug_view',

	events: {
		'click .cancel' : 'backButton',
		'click .submit_button' : 'send'
	},

	initialize: function() {
		_.bindAll(this, 'render');
		_.bindAll(this, 'beforeClose');
		_.bindAll(this, 'back');
		_.bindAll(this, 'cancel_sending');
		_.bindAll(this, 'after_sent');

	},

	beforeClose: function(){
		// De-bubble this back button
		App.Utils.BackButton.debubble(this.backbuttonBind);
	},

	backButton: function(ev){
		var that = this,
			elem = ev.currentTarget;

		this.back();

		ev.preventDefault();
		ev.stopPropagation();
		return false;
	},

	back: function(){
		// Go back to settings page
		var that = this;

		this.trigger('back');
	},

	cancel_sending: function(that, elem){

		$(elem).text($(elem).attr('data-original-text'));
		$(elem).attr('disabled',false);
		that.disable_buttons = false;
	},

	send: function(ev){
		var that = this,
			elem = ev.currentTarget;

		// Send an email to Emailbox through this person's email account

		var yeah = confirm('OK to send?');
		if(!yeah){
			return false;
		}

		// Disable button
		$(elem).text('Sending...');
		$(elem).attr('disabled','disabled');
		this.disable_buttons = true;

		// To
		var to = 'nick@getemailbox.com'; // hardcoded email address for support/bugs

		// Subject
		var subject = 'Convomail bug report via awesome user';

		// CC
		// - should the person be cc'd
		//      - nah, they already have a copy in Sent
		
		var from = App.Data.UserEmailAccounts.at(0).get('email');
		var textBody = $.trim(that.$('#reporting_bug').val());

		// Do a little bit of validation
		try {
			if(to.length < 1){
				alert('You need to send to somebody!');
				that.cancel_sending(that, elem);
				return false;
			}
			if(from.length < 1){
				alert('Whoops, we cannot send from your account right now');
				that.cancel_sending(that, elem);
				return false;
			}
			if(subject.length < 1){
				alert('You need to write a subject line!');
				that.cancel_sending(that, elem);
				return false;
			}
			if(textBody.length < 1){
				alert('You need to write something in your email!');
				that.cancel_sending(that, elem);
				return false;
			}

		} catch(err){
			console.error('Failed validation');
			console.error(err);
			alert('Whoops, something failed in sending. Please try again!');
			that.cancel_sending(that, elem);
			return false;

		}

		// Send return email
		var eventData = {
			event: 'Email.send.validate',
			delay: 0,
			obj: {
				To: to,
				From: from,
				Subject: subject,
				Text: textBody,
				attachments: []
			}
		};

		// Validate sending
		Api.event({
			data: eventData,
			response: {
				"pkg.native.email" : function(response){
					// Handle response (see if validated to send)
					// clog('Response');
					// clog(response);
					// clog(response.body.code);

					// Update the view code
					if(response.body.code == 200){
						// Ok, validated sending this email
						clog('Valid email to send');
					} else {
						// Failed, had an error

						alert('Sorry, Unable to send Email');

						that.cancel_sending(that, elem);
						return false;
					}

					// Get rate-limit info
					tmp_rate_limit = response.body.data;

					// Over rate limit?
					if(tmp_rate_limit.current + 1 >= tmp_rate_limit.rate_limit){

						alert('Sorry, Over the Rate Limit (25 emails per 6 hours)');

						that.cancel_sending(that, elem);
						return false;
						
					}

					// All good, SEND Email
					eventData.event = 'Email.send';

					// // Log
					// clog('sending reply Email');
					// clog(eventData);

					Api.event({
						data: eventData,
						response: {
							"pkg.native.email" : function(response){
								
								// Update the view code
								if(response.body.code == 200){
									// Sent successfully
									that.after_sent();

								} else {
									// Failed, had an error sending

									alert('Sorry, we might have failed sending this email');
									
									that.cancel_sending(that, elem);
									return false;
								}

							}
						}
					});

					// that.after_sent(); // PRETENDING IT SENT OK!!!! (remove this line and uncomment the after_sent above)



					// if validation ok, then continue to the next one
					// - resolve or call?

				}
			}
		});

	},

	after_sent: function(){
		// Sent OK

		var that = this;

		App.Events.trigger("email_compose_sent", true);

		// Toast
		App.Utils.Notification.toast('Sent Successfully, Thank You!','success');

		// Close myself
		this.trigger('back');

		return false;
	},

	render: function(){
		var that = this;

		// Remove any previous one
		// $('.logout').remove();

		// Build from template
		var template = App.Utils.template('t_settings_report_bug');     

		// Write HTML
		that.$el.html(template());

		// Back button
		this.backbuttonBind = App.Utils.BackButton.newEnforcer(this.back);

		return this;
	}

});



App.Views.Stats = Backbone.View.extend({

	className: 'settings_stats_view',

	events: {
		'click #dk_container_options .dk_toggle' : 'toggle_all',
		'click [data-action="refresh"]' : 'click_refresh',
		'click [data-action="settings"]' : 'click_settings',
		'click .stats_result h1' : 'toggle_stat'
	},

	stats: null,
	ev: _.extend({}, Backbone.Events),

	initialize: function() {
		var that = this;
		_.bindAll(this, 'render');
		_.bindAll(this, 'beforeClose');

		// this.refreshEvent();

		this.collection = new App.Collections.Stats();

		this.collection.on('reset', function(modelData){
			console.log('reset');
			console.log(modelData);
		});

		// Only get the FIRST stats model
		this.collection.once('add', function(modelData){
			console.log('add');
			console.log(modelData);

			that.stats = modelData.toJSON();
			that.ev.trigger('StatsReady');

			modelData.on('change', function(modelChangedData){
				console.log('modelChangedData');
				console.log(modelChangedData);
				that.stats = modelChangedData.toJSON();
				that.ev.trigger('StatsReady');
			});
		});
		this.collection.on('change', function(modelData){
			console.log('change');
			console.log(modelData);
		});
		this.collection.once('sync', function(collectionData){
			console.log('cd');
			console.log(collectionData);
			if(collectionData.length < 1){
				// Need to collect data the first time
				Api.event({
					data: {
						event: 'MailStats.stats',
						obj: true
					},
					success: function(successData){
						console.log('Emitted event');
					},
					error: function(failData){
						alert("Failed updating Stats, please try reloading the page!");
					}
				});
			}
		});

		this.collection.fetchDefault();



		// Listen for an update to the Stats model
		Api.Event.on({
			event: 'MailStats.updated'
		},function(result){
			// The stats have been updated by the server
			// that.stats = response.body.data;
			that.collection.fetchDefault();
		});

	},

	click_refresh: function(ev){
		var that = this,
			elem = ev.currentTarget;

		App.Utils.Notification.toast('Refreshing');

		this.refreshEvent();

	},

	click_settings: function(ev){

		Backbone.history.loadUrl('settings');

		return false;
	},

	toggle_stat: function(ev){
		var that = this,
			elem = ev.currentTarget;

		// Get next element, decide if show/hide
		var x = $(elem).next();
		if(x.hasClass('stats-closed')){
			x.removeClass('stats-closed');
		} else {
			x.addClass('stats-closed');
		}

		return false;

	},

	refreshEvent: function(){
		var that = this;

		Api.event({
			data: {
				event: 'MailStats.stats',
				obj: {
					timezone_offset: function(){
						var d = new Date();
						return d.getTimezoneOffset();
					}()
				}
			},
			response: {
				"pkg.dev.mailstats" : function(response){
					// Get stats
					if(response.body.code != 200){
						alert('Sorry, failed loading stats at this time');
						return;
					}

					console.info('Stats triggered update OK we think');

					// that.stats = response.body.data;

					// // Emit that stats are ready now
					// that.ev.trigger('StatsReady');

				}
			},
			success: function(){
				// succeeded
			}
		});

	},

	beforeClose: function(){
		// De-bubble this back button
		App.Utils.BackButton.debubble(this.backbuttonBind);
	},

	toggle_all: function(ev){
		// Show/hide options for all
		var that = this,
			elem = ev.currentTarget;

		var $parent = this.$('#dk_container_options');

		if($parent.hasClass('dk_open')){
			$parent.removeClass('dk_open');
		} else {
			$parent.addClass('dk_open');
		}

	},

	render_stat: function(stat_key){
		var that = this;

		if(this.stat == null){
			// Not ready yet
			console.warn('stats NOT ready');

			// Rendering loading
			var template = App.Utils.template('t_stats_loading');
			that.$('.stats_result').html(template());
		} else {
			console.warn('stats are ready'); // not usually?
			that.render_stat_ready();
		}

		this.ev.on('StatsReady',function(){
			// stats are ready
			// alert('stats ready');
			that.render_stat_ready();
		});

	},

	render_stat_ready: function(){
		var that = this;

		// Rendering Sent vs. Received graph

		var today = new Date();

		// Get week summary data
		var week_sent = 0,
			week_received = 0,
			today_sent = 0,
			today_received = 0;

		week_sent = _.reduce(that.stats.sent_vs_received.sent, function(item, prev){
			return item + prev;
		});
		week_received = _.reduce(that.stats.sent_vs_received.received, function(item, prev){
			return item + prev;
		});

		var tmp_today_val = today.toString('d-') + today.toString('ddd').substr(0,2);
		today_sent = that.stats.sent_vs_received.sent[ tmp_today_val ];
		today_received = that.stats.sent_vs_received.received[ tmp_today_val ];


		// Time to respond data

		// Remove any past 48 hours
		// - just too long to respond to keep it relevant
		that.stats.time_to_respond.first_responses = _.filter(that.stats.time_to_respond.first_responses, function(obj){
			if((obj[0] - 48*60*60*60) > 0){
				return false;
			}
			return true;
		});
		that.stats.time_to_respond.other_responses = _.filter(that.stats.time_to_respond.other_responses, function(obj){
			if((obj[0] - 48*60*60*60) > 0){
				return false;
			}
			return true;
		});

		var first_responses = _.map(that.stats.time_to_respond.first_responses, function(obj){
			return {
				fx: obj[1],
				fy: obj[0]
			};
		});

		var avg_first = _.reduce(that.stats.time_to_respond.first_responses, function(memo, obj){
			if(typeof memo == "object"){
				return obj[0];
			} else {
				return obj[0] + memo;
			}
		}) / that.stats.time_to_respond.first_responses.length;

		var other_responses = _.map(that.stats.time_to_respond.other_responses, function(obj){
			return {
				ox: obj[1],
				oy: obj[0]
			};
		});


		// Merge first and other _responses
		var combined_responses = first_responses.concat(other_responses);

		// Filter outliers (more than a week)
		combined_responses = _.filter(combined_responses, function(resp){
			if(resp.fy != undefined && resp.fy > 604800){ // one week = 604800 seconds
				return false;
			}
			if(resp.oy != undefined && resp.oy > 604800){
				return false;
			}
			return true;
		});


		var avg_other = _.reduce(that.stats.time_to_respond.other_responses, function(memo, obj){
			if(typeof memo == "object"){
				return obj[0];
			} else {
				return obj[0] + memo;
			}
		}) / that.stats.time_to_respond.other_responses.length;

		// Turn into minutes
		avg_first = (avg_first/(60)).toFixed(0);
		avg_other = (avg_other / (60)).toFixed(0);
		var median_first = (_.median(_.map(that.stats.time_to_respond.first_responses, function(obj){return obj[0];})) / (60*60)).toFixed(1);
		var median_other = (_.median(_.map(that.stats.time_to_respond.other_responses, function(obj){return obj[0];})) / (60*60)).toFixed(2);

		var templateData = {
			winWidth: App.Data.xy.win_width,
			max_graph_width: App.Data.xy.win_width / 2.1,
			week_received: week_received,
			week_sent: week_sent,
			today_sent: today_sent,
			today_received: today_received,
			avg_first: avg_first,
			avg_other: avg_other,
			median_first: median_first,
			median_other: median_other,

			contacts: that.stats.contacts
		};

		console.log(templateData);

		// Write Template HTML
		var template = App.Utils.template('t_stats_sent_vs_received');
		that.$('.stats_result').html(template(templateData));

		// Update timestamp
		this.$('.actual_timestamp').attr('data-livestamp',that.stats._modified);

		// Get charts to use from html
		var summaryChart = this.$('#week_summary').get(0).getContext("2d");
		var dayChartCombined = this.$('#day_by_day_combined').get(0).getContext("2d");
		// var dayChartSent = this.$('#day_by_day_sent').get(0).getContext("2d");
		// var dayChartReceived = this.$('#day_by_day_received').get(0).getContext("2d");
		var todaySummaryChart = this.$('#today_summary').get(0).getContext("2d");
		var hoursChartCombined = this.$('#hour_by_hour_combined').get(0).getContext("2d");

		// Finnagle data into chart-usable format
		var summaryData = [
			{
				value: week_sent, // sent
				color:"#F7464A"
			},
			{
				value : week_received, // received
				color : "#4D5360"
			}

		];

		var todaySummaryData = [
			{
				value: today_sent, // sent
				color:"#F7464A"
			},
			{
				value : today_received, // received
				color : "#4D5360"
			}

		];


		var dayDataSent = {
			labels : Object.keys(this.stats.sent_vs_received.sent),
			datasets : [
				{
					fillColor : "rgba(247, 70, 74, 0.5)",
					strokeColor : "rgba(247, 70, 74, 1)",
					data : _.map(that.stats.sent_vs_received.sent,function(val){return val})
				}
			]
		};

		var dayDataReceived = {
			labels : Object.keys(this.stats.sent_vs_received.received),
			datasets : [
				{
					fillColor : "rgba(77, 83, 96, 0.5)",
					strokeColor : "rgba(77, 83, 96, 1)",
					data : _.map(that.stats.sent_vs_received.received,function(val){return val})
				}
			]
		};



		var hourDataSent = {
			labels : Object.keys(this.stats.sent_vs_received.hoursSent),
			datasets : [
				{
					fillColor : "rgba(247, 70, 74, 0.5)",
					strokeColor : "rgba(247, 70, 74, 1)",
					data : _.map(that.stats.sent_vs_received.hoursSent,function(val){return val})
				}
			]
		};

		var hourDataReceived = {
			labels : Object.keys(this.stats.sent_vs_received.hoursReceived),
			datasets : [
				{
					fillColor : "rgba(77, 83, 96, 0.5)",
					strokeColor : "rgba(77, 83, 96, 1)",
					data : _.map(that.stats.sent_vs_received.hoursReceived,function(val){return val})
				}
			]
		};


		var dayCombinedData = {
			labels : _.map(Object.keys(this.stats.sent_vs_received.received), function(item, key){
				if(key == 0){
					return "Today";
				}
				if(key == 1){
					return "Yesterday";
				}
				return item;
			}),
			datasets : [
				{
					fillColor : "rgba(247, 70, 74, 0.5)",
					strokeColor : "rgba(247, 70, 74, 1)",
					data : _.map(that.stats.sent_vs_received.sent,function(val){return val})
				},
				{
					fillColor : "rgba(77, 83, 96, 0.5)",
					strokeColor : "rgba(77, 83, 96, 1)",
					data : _.map(that.stats.sent_vs_received.received,function(val){return val})
				}
			]
		};


		var hoursCombinedData = {
			labels : _.map(Object.keys(this.stats.sent_vs_received.hoursSent), function(item, key){
				// format to am/pm

				if(item == 0){
					return '12a';
				}
				if(item == 12){
					return '12p';
				}
				if(item > 11){
					item = item - 12;
					return item + 'p';
				}

				return item + 'a';
			}),
			datasets : [
				{
					fillColor : "rgba(247, 70, 74, 0.5)",
					strokeColor : "rgba(247, 70, 74, 1)",
					data : _.map(that.stats.sent_vs_received.hoursSent,function(val){return val})
				},
				{
					fillColor : "rgba(77, 83, 96, 0.5)",
					strokeColor : "rgba(77, 83, 96, 1)",
					data : _.map(that.stats.sent_vs_received.hoursReceived,function(val){return val})
				}
			]
		};

		// Options to use for each Chart
		var summaryDataOptions = {
			animation: false
		};
		var hourSummaryDataOptions = {
			animation: false
		};
		var dayDataSentOptions = {
			scaleOverlay: true,
			barStrokeWidth: 1,
			animation: false
		};
		var dayDataReceivedOptions = {
			scaleOverlay: true,
			barStrokeWidth: 1,
			animation: false
		};
		var dayDataCombinedOptions = {
			animation: false
		};

		// Render the charts
		var theSummaryChart = new Chart(summaryChart).Doughnut(summaryData, summaryDataOptions);
		var theDayCombinedChart = new Chart(dayChartCombined).Line(dayCombinedData, dayDataCombinedOptions);
		// var theDaySentChart = new Chart(dayChartSent).Bar(dayDataSent, dayDataSentOptions);
		// var theDayReceivedChart = new Chart(dayChartReceived).Bar(dayDataReceived, dayDataReceivedOptions);

		var theTodaySummaryChart = new Chart(todaySummaryChart).Doughnut(todaySummaryData, summaryDataOptions);
		var theHoursCombinedChart = new Chart(hoursChartCombined).Line(hoursCombinedData, dayDataCombinedOptions);




		// // Time to respond scatterplot
		// var graph = new Rickshaw.Graph( {
		//  element: this.$('#time_to_respond_scatter').get(0),
		//  // width: App.Data.xy.win_width - 20,
		//  width: App.Data.xy.win_width / 3,
		//  height: 360,
		//  min: 0,
		//  max: 1*24*60*60,
		//  renderer: 'scatterplot',
		//  series: [
		//      {
		//          color: "#ff9030",
		//          data: first_responses,
		//      }, {
		//          color: "rgba(247, 70, 74, 0.5)",
		//          data: other_responses,
		//      }
		//  ]
		// } );

		// graph.renderer.dotSize = 4;
		// graph.render();

		// Time to respond (using amcharts)

		var chart2;

		// XY CHART
		chart2 = new AmCharts.AmXYChart();
		// chart2.pathToImages = "http://www.amcharts.com/lib/images/";
		chart2.marginRight = 0;
		chart2.marginTop = 0;    
		chart2.autoMarginOffset = 0;
		chart2.dataProvider = combined_responses;
		chart2.startDuration = 1;

		// AXES
		// X
		var xAxis = new AmCharts.ValueAxis();
		xAxis.position = "bottom";
		xAxis.axisAlpha = 0;
		xAxis.autoGridCount = true;
		xAxis.axisAlpha = 0;
		chart2.addValueAxis(xAxis);

		// Y
		var yAxis = new AmCharts.ValueAxis();
		yAxis.position = "left";
		yAxis.axisAlpha = 0;
		yAxis.autoGridCount = true;
		chart2.addValueAxis(yAxis);

		// GRAPHS
		// triangles up            
		var graph1 = new AmCharts.AmGraph();
		graph1.lineColor = "#F7464A";
		graph1.balloonText = "x:[[x]] y:[[y]]";
		graph1.xField = "fx";
		graph1.yField = "fy";
		graph1.lineAlpha = 0;
		graph1.bullet = "triangleUp";
		chart2.addGraph(graph1);

		// triangles down 
		var graph2 = new AmCharts.AmGraph();
		graph2.lineColor = "#666";
		graph2.balloonText = "x:[[x]] y:[[y]]";
		graph2.xField = "ox";
		graph2.yField = "oy";
		graph2.lineAlpha = 0;
		graph2.bullet = "triangleDown";
		chart2.addGraph(graph2);

		// WRITE
		// chart.write(chartKey);
		chart2.write('time_to_respond_scatter');



		// People pie charts
		var contactCharts = {
			addresses_sent_to: _.map(that.stats.contacts.addresses.sent.To, function(field){
					return {
						address: field[1],
						count: field[0]
					};
				}),
			addresses_sent_cc: _.map(that.stats.contacts.addresses.sent.Cc, function(field){
					return {
						address: field[1],
						count: field[0]
					};
				}),
			addresses_received_from: _.map(that.stats.contacts.addresses.received.From, function(field){
					return {
						address: field[1],
						count: field[0]
					};
				}),
			addresses_received_cc: _.map(that.stats.contacts.addresses.received.Cc, function(field){
					return {
						address: field[1],
						count: field[0]
					};
				}),
			domains_sent_to: _.map(that.stats.contacts.domains.sent.To, function(field){
					return {
						address: field[1],
						count: field[0]
					};
				}),
			domains_sent_cc: _.map(that.stats.contacts.domains.sent.Cc, function(field){
					return {
						address: field[1],
						count: field[0]
					};
				}),
			domains_received_from: _.map(that.stats.contacts.domains.received.From, function(field){
					return {
						address: field[1],
						count: field[0]
					};
				}),
			domains_received_cc: _.map(that.stats.contacts.domains.received.Cc, function(field){
					return {
						address: field[1],
						count: field[0]
					};
				})
		};

		// console.log(chartData);

		// create charts
		
		_.each(contactCharts, function(chartData, chartKey){

			// PIE CHART
			var chart = new AmCharts.AmPieChart();
			chart.dataProvider = chartData;
			chart.titleField = "address";
			chart.valueField = "count";

			chart.labelRadius = -30;
			chart.labelText = "[[value]]";

			chart.minRadius = 100;

			// LEGEND
			var legend = new AmCharts.AmLegend();
			legend.align = "center";
			legend.position = 'right';
			legend.markerType = "bubble";
			chart.addLegend(legend);

			// WRITE
			chart.write(chartKey);
		});

		
		return false;

	},

	render: function(){
		var that = this;

		// Remove any previous one
		// $('.logout').remove();

		// Build from template
		var template = App.Utils.template('t_stats');

		var stat_choices = [
			{
				name: 'Sent vs. Received',
				key: 'sent_vs_received'
			},
			{
				name: 'Response Times',
				key: 'response_times'
			},
			// {
			//  name: 'Traffic Patterns',
			//  key: 'traffic_patterns'
			// }
		];

		// Write HTML
		that.$el.html(template({
			winWidth: App.Data.xy.win_width,
			stat_choices: stat_choices
		}));

		// Render the default stat (Sent vs. Received)
		this.render_stat('sent_vs_received');

		return this;
	}

});

App.Views.SpeedTest = Backbone.View.extend({

	className: 'speedtest_view',

	events: {
		'click #start' : 'start',
		'click .cancel' : 'backButton'
	},

	initialize: function() {
		_.bindAll(this, 'render');
		_.bindAll(this, 'beforeClose');
		_.bindAll(this, 'back');

	},

	beforeClose: function(){
		// De-bubble this back button
		App.Utils.BackButton.debubble(this.backbuttonBind);
	},

	start: function(ev){
		// Start the speedtest
		var that = this,
			elem = ev.currentTarget;

		// Hide button
		this.$('.pre_start').hide();

		// Show "running" text
		this.$('.running').show();

		// start
		var st = new SpeedTest();
		st.run({
			runCount: 5,
			imgUrl: "https://s3.amazonaws.com/emailboxv1/speedtest.jpg",
			size: 85400,
			onStart: function() {
				// alert('Before Running Speed Test');

			}

			,onEnd: function(speed_results) {

				console.log(speed_results);

				speed_results.connection_type = that.checkConnection();

				// Hide "running" text
				that.$('.running').hide();

				// Show results

				// Build template
				var template = App.Utils.template('t_speedtest_results');

				// console.info(template(speed_results));

				speed_results.KBps = speed_results.KBps.toFixed(2);
				speed_results.Kbps = speed_results.Kbps.toFixed(2);

				// Write HTML
				that.$('.results').html(template(speed_results));

				// Show results
				that.$('.results').show();

				// alert( 'Speed test complete:  ' + speed.Kbps + ' Kbps');
				// put your logic here
				if( speed_results.Kbps < 200 ){
					// alert('Your connection is too slow');
				}
			}
		});


	},

	checkConnection: function(){
		try {
			var networkState = navigator.connection.type;

			var states = {};
			states[Connection.UNKNOWN]  = 'Unknown connection';
			states[Connection.ETHERNET] = 'Ethernet connection';
			states[Connection.WIFI]     = 'WiFi connection';
			states[Connection.CELL_2G]  = 'Cell 2G connection';
			states[Connection.CELL_3G]  = 'Cell 3G connection';
			states[Connection.CELL_4G]  = 'Cell 4G connection';
			states[Connection.CELL]     = 'Cell generic connection';
			states[Connection.NONE]     = 'No network connection';

			return states[networkState];

		} catch(err){

		}

		return 'Unknown connection type';

	},

	backButton: function(ev){
		var that = this,
			elem = ev.currentTarget;

		this.back();

		ev.preventDefault();
		ev.stopPropagation();
		return false;
	},

	back: function(){
		// Go back to settings page
		var that = this;

		this.trigger('back');
	},

	render: function(){
		var that = this;

		// Remove any previous one
		// $('.logout').remove();

		// Build from template
		var template = App.Utils.template('t_speedtest');

		// Write HTML
		that.$el.html(template());

		// Back button
		this.backbuttonBind = App.Utils.BackButton.newEnforcer(this.back);

		return this;
	}

});

App.Views.Logout = Backbone.View.extend({

	className: 'logout',

	events: {
		'click #logout' : 'logout' // logging out
	},

	initialize: function() {
		_.bindAll(this, 'render');

	},

	logout: function(ev){
		// This doesn't work at all
		// - just stopped working completely for some reason

		alert('logout clicked');
		Backbone.history.loadUrl('logout');
		return false;

	},

	render: function(){
		var that = this;

		// Remove any previous one
		// $('.logout').remove();

		// Build from template
		var template = App.Utils.template('t_logout');

		// Write HTML
		that.$el.html(template());

		// Show logout
		that.$el.addClass('display');

		that.$el.transition({
			top: '150px',
			opacity: 1
		},'fast');
		
		// Just show a logout dialog box
		var p = confirm('Logout?');
		if(p){
			Backbone.history.loadUrl('logout');
		} else {
			that.close();
		}

		return this;
	}

});

App.Views.BodyLogin = Backbone.View.extend({
	
	el: 'body',

	events: {
		'click p.login button' : 'login',
		'click p.scan_login button' : 'scan_login'

	},

	initialize: function() {
		_.bindAll(this, 'render');

	},

	scan_login: function(ev){
		// Testing scan_login

		// alert('testing scanner');
		window.plugins.barcodeScanner.scan(
			function (result) { 
				// Got a barcode

				try {
					var barcode = result.text.split('+');
				} catch(err){
					alert('Failed loading barcode, please try again');
					return false;
				}

				if(barcode.length != 2){
					alert('Failed barcode test. Please try again');
					return false;
				}

				// Split into user and access_token
				var access_token = barcode[0],
					user_identifier = barcode[1];

				// Set that value to our login value

				// Try logging in with it
				// - eventually, exchange for an access_token

				App.Utils.Storage.set(App.Credentials.prefix_access_token + 'user', user_identifier, 'critical')
					.then(function(){
						// Saved user!
					});

				App.Utils.Storage.set(App.Credentials.prefix_access_token + 'access_token', access_token, 'critical')
					.then(function(){

						// Reload page, back to #home
						
						// clear body
						$('body').html('');

						// Reload page, back to #home
						window.location = [location.protocol, '//', location.host, location.pathname].join('');
					});
					
			}, 
			function (error) { 
				alert("Scanning failed: " + error); 
			} 
		);

		return false;

	},

	login: function(ev){
		// Start OAuth process
		var that = this;

		var p = {
			app_id : App.Credentials.app_key,
			callback : [location.protocol, '//', location.host, location.pathname].join('')
		};
		
		if(usePg){
			
			var p = {
				response_type: 'token',
				client_id : App.Credentials.app_key,
				redirect_uri : 'https://getemailbox.com/testback'
				// state // optional
				// x_user_id // optional    
			};
			var params = $.param(p);
			var call_url = App.Credentials.base_login_url + "/apps/authorize/?" + params;

			var ref = window.open(call_url, '_blank', 'location=no');
			ref.addEventListener('loadstart', function(event) { 
				// event.url;

				var tmp_url = event.url;

				var parser = document.createElement('a');
				parser.href = tmp_url;

				if(parser.hostname == 'getemailbox.com' && parser.pathname.substr(0,9) == '/testback'){
					
					// window.plugins.childBrowser.close();
					// alert('closing childbrowser after /testback');
					// return false;
					// alert('testback');

					// url-decode
					// alert(tmp_url);
					var url = decodeURIComponent(tmp_url);
					// alert(url);

					// var qs = App.Utils.getUrlVars();
					var oauthParams = App.Utils.getOAuthParamsInUrl(url);
					// alert(JSON.stringify(oauthParams));

					// if(typeof qs.user_token == "string"){
					if(typeof oauthParams.access_token == "string"){

						// Have an access_token
						// - save it to localStorage

						// App.Utils.Storage.set(App.Credentials.prefix_access_token + 'user', oauthParams.user_identifier);
						// App.Utils.Storage.set(App.Credentials.prefix_access_token + 'access_token', oauthParams.access_token);

						App.Utils.Storage.set(App.Credentials.prefix_access_token + 'user', oauthParams.user_identifier, 'critical')
							.then(function(){
								// Saved user!
								// alert('saved user');
							});

						App.Utils.Storage.set(App.Credentials.prefix_access_token + 'access_token', oauthParams.access_token, 'critical')
							.then(function(){
								
								// Reload page, back to #home
								// forge.logging.info('reloading');

								// alert('success');
								// window.plugins.childBrowser.close();

								// Emit save event (write file)
								App.Events.trigger('FileSave',true);
								ref.close();


								// // Reload page, back to #home
								// window.location = [location.protocol, '//', location.host, location.pathname].join('');

								$('body').html('Loading');

								// Reload page, back to #home
								window.setTimeout(function(){
									window.location = [location.protocol, '//', location.host, location.pathname].join('');
								},500);
							});

					} else {
						// Show login splash screen
						var page = new App.Views.BodyLogin();
						App.router.showView('bodylogin',page);

						alert('Problem logging in');
						// window.plugins.childBrowser.close();
						ref.close();

					}

					return;

				}

				return;

			});
			// ref.addEventListener('loadstop', function(event) { alert('stop: ' + event.url); });
			ref.addEventListener('loaderror', function(event) { console.error('Uh Oh, encountered an error: ' + event.message); });
			// ref.addEventListener('exit', function(event) { alert('exit1');alert(event.type); });

		} else {

			var p = {
				response_type: 'token',
				client_id : App.Credentials.app_key,
				redirect_uri : [location.protocol, '//', location.host, location.pathname].join('')
				// state // optional
				// x_user_id // optional    
			};
			var params = $.param(p);

			window.location = App.Credentials.base_login_url + "/apps/authorize/?" + params;

		}

		return false;

	},

	render: function() {

		var template = App.Utils.template('t_body_login');

		// Write HTML
		$(this.el).html(template({
			version: App.Data.version
		}));

		return this;
	}
});

App.Views.BodyUnreachable = Backbone.View.extend({
	
	el: 'body',

	events: {
		'click .retry' : 'reload'

	},

	initialize: function() {
		_.bindAll(this, 'render');

	},

	reload: function(){
		// Reload the page
		// - easiest way, simpler than reloading all the fetch calls
		window.location = window.location.href;
	},

	render: function() {

		var template = App.Utils.template('t_body_unreachable');

		// Write HTML
		$(this.el).html(template());

		return this;
	}
});


App.Views.InsufficientEmails = Backbone.View.extend({
	
	id: 'modalInsufficient',
	className: 'modal hide',

	events: {
		
	},

	initialize: function() {
		_.bindAll(this, 'render');

	},

	render: function() {

		// Remove any previous version
		$('#modalInsufficient').remove();

		// Build from template
		var template = App.Utils.template('t_insufficient_emails');

		this.$el.html(template({
			scanned: this.options.scanned
		}));

		// Write HTML
		$('body').append(this.el);

		// Display Modal
		$('#modalInsufficient').modal({
			backdrop_click: false
		});

		return this;
	}

});


App.Views.StartupTutorial = Backbone.View.extend({
	
	id: 'modalTutorial',
	className: 'modal hide',

	events: {
		'click .next_step' : 'next_step',
		'click .exit_tutorial' : 'exit_tutorial'
	},

	current_step: 0,
	steps: [
		't_startup_tutorial_0',
		't_startup_tutorial_1',
		't_startup_tutorial_075',
		't_startup_tutorial_05',
		// 't_startup_tutorial_2',
		// 't_startup_tutorial_3',
		't_startup_tutorial_4'
	],

	initialize: function() {
		_.bindAll(this, 'render');


		// Trigger a contacts sync
		// - this seems to be a good place to do this (on launch)
		Api.event({
			data: {
				event: 'Contacts.sync',
				obj: true
			},
			success: function(resp){
				// return from contacts sync
			}
		});
	},

	next_step: function(ev){
		// alert('Tutorial is a work-in-progress');
		// $('#modalTutorial').modal('hide');

		ev.preventDefault();

		// Increase to next step
		this.current_step++;

		// Does that step exist?
		if(this.steps.length < this.current_step){
			alert('Abrupt end to tutorial, no?');
			this.exit_tutorial();
		}

		// Build from template
		var template = App.Utils.template(this.steps[this.current_step]);

		// Write HTML
		this.$('.modal-body').html(template({
			current: this.current_step + 1,
			total: this.steps.length
		}));

		return false;
	},

	exit_tutorial: function(){
		$('#modalTutorial').modal('hide');

		// this.unbind();
		return false;
	},

	render: function() {

		// Remove any previous version
		$('#modalTutorial').remove();

		// Build from template
		var template = App.Utils.template('t_startup_tutorial');

		this.$el.html(template({
			current: 1,
			total: this.steps.length
		}));

		// Write HTML
		$('body').append(this.el);

		// Display Modal
		$('#modalTutorial').modal({
			backdrop_click: false
		});

		this.current_step = 0;

		return this;
	}

});


App.Views.Modal = Backbone.View.extend({
	
	el: 'body',

	events: {
	},

	initialize: function() {
		_.bindAll(this, 'render');
	},

	render: function() {

		// Remove any previous version
		$('#modalIntro').remove();

		// Build from template
		var template = App.Utils.template('t_modal_intro');

		// Write HTML
		$(this.el).append(template());

		// Display Modal
		$('#modalIntro').modal();

		return this;
	}

});


App.Views.Toast = Backbone.View.extend({
	
	id: 'toast',

	events: {
	},

	initialize: function() {
		_.bindAll(this, 'render');
	},

	render: function() {
		var that = this;
		// Remove any previous version
		// $('#toast').remove();

		// Build from template
		var template = App.Utils.template('t_toast');

		// Write HTML
		this.$el.html(template({
			message: this.options.message
		}));

		// Add classname
		if(this.options.type){
			this.$el.addClass('toast-' + this.options.type);
		}

		$('body').append(this.el);
		// $(this.el).append(template({
		//  message: this.options.message
		// }));

		this.$el.animate({
			opacity: 1
		},'fast');

		// Display Modal
		window.setTimeout(function(){
			that.$el.animate({
				opacity: 0
			},'fast',function(){
				// $(this).remove();
				that.close();
			});
		},3000);

		return this;
	}

});


App.Views.OnlineStatus = Backbone.View.extend({
	
	className: 'online-status nodisplay',

	events: {},

	initialize: function() {
		_.bindAll(this, 'render');

		// Render it

		// display is on or off

		this.on('online',this.hide,this);
		this.on('offline',this.show,this);
	},

	show: function(){
		this.$el.removeClass('nodisplay');
	},

	hide: function(){
		// Add nodisplay
		this.$el.addClass('nodisplay');
	},

	render: function() {

		// Add to page

		// Build from template
		var template = App.Utils.template('t_online_status');

		// Write HTML
		// - to body
		this.$el.html(template());
		$('body').append(this.$el);

		return this;
	}

});


App.Views.DebugMessages = Backbone.View.extend({
	
	el: 'body',

	events: {
	},

	initialize: function() {
		_.bindAll(this, 'render');
		// _.bindAll(this, 're_render');
		// _.bindAll(this, 'render');

		// Bind to new debug message events
		App.Events.bind('debug_messages_update',this.render);

	},

	render: function() {

		// Remove any previous version
		$('#debug-messages').remove();

		// Get debug messages
		// - already in App.Data.debug_messages

		// Get data and sort it
		// - sort by date
		// - newest item is at the bottom?
		var data = $.extend({},App.Data.debug_messages);
		data = App.Utils.sortBy({
			arr: data,
			path: 'datetime',
			direction: 'asc',
			type: 'date'
		});

		// Displaying debug output, or just a "refreshing" thing? 

		// Build from template
		var template;
		if(1==0){
			template = App.Utils.template('t_debug_messages');
		} else {
			template = App.Utils.template('t_debug_messages_production');
		}

		// Write HTML
		$(this.el).prepend(template(App.Data.debug_messages));

		// timeago
		// - crude
		// this.$('.timeago').timeago();
		
		return this;
	}

});


// Convomail prototypes
Backbone.View.prototype.resize_fluid_page_elements = function () {
	

};

Backbone.View.prototype.resize_scroller = function () {
	
};



