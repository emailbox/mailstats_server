# Mailstats  
Displays stats on your email inbox such as Sent vs. Received 

## Run client app  
You can modify and run the basic stand-alone client app (that communicates to the default MailStats server) by cloning the repo and visiting the /public/app directory (try using localhost).  

## Run Server  
1. Register as an emailbox developer at http://getemailbox.com/login/first
1. Fork this repo
1. Rename `credentials.example.json` to `credentials.json` and enter your MySQL credentials  
1. Create MySQL table using https://github.com/emailbox/minimail_nodeserver/blob/master/mysql_schema.sql  
1. Deploy to heroku (https://devcenter.heroku.com/articles/nodejs) and note the newly-created app name (agile-something-389 or similar)
1. Modify the manifest.json (change package name, all URLs should point use your heroku subdomain)
1. Create a new app on emailbox: https://getemailbox.com/developers and copy/paste your manifest.json
1. Modify the mobile app's creds.js (https://github.com/emailbox/minimail_mobileapp) to use your heroku app (piggyback on heroku's ssl)

## What the server does 
- Accept incoming stats creation requests  
- serves the stats app from /public/app  

## Current status  
- It works.



