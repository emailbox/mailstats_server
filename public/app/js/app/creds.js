
var tmp_credentials = {
	//base_api_url: "https://cryptic-everglades-7993.herokuapp.com",
	base_login_url: "https://getemailbox.com",
	base_api_url: "https://api.getemailbox.com",
	base_listen_url: "https://listen.getemailbox.com",

	encryption_key: "blowfish_key",

	app_key: "pkg.dev.mailstats",
	prefix_access_token : 'mailstats_',

	data_version : 7,
	email_collect_limit: 5,

	filepicker_key: 'ANmCrulqRQcympGJ9kxmEz',
	embedly_key: '6c06d768f7a511e0ae3d4040d3dc5c07',
	s3_bucket: "https://s3.amazonaws.com/emailboxv1/",

	thread_move_x_threshold: 0.2,
	thread_move_y_threshold: 50, 
	
	convomail_server: 'http://mailstats.getemailbox.com',

	usePatching: false, // emailbox diff/patch
	useCache: true // backbone.cache to localStorage

};