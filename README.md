# Mailstats  
Displays stats on your email inbox such as Sent vs. Received 

Screenshot (8/4/2013): https://dl.dropboxusercontent.com/u/6673634/Screenshots/Mail%20Stats.png  

## Currently supported stats  
- Received vs. Sent summary, today (with hours) and 7-day  
- Response times  
- Top 10 Contacts: Sent To, Received From, and CC'd (sent and received)  
- Top 5 Domains: Sent To, Received From, and CC'd (sent and received)  


## Upcoming Stats 
- attachments per email
     - attachment senders, and recipients
     - file size sent (in MB), total and across a chat
- labels
     - total labels used, all the labels, 10 most frequent labels
- email activity
     - across the week (already done?)
     - in hourly slots on each day
          - On Mondays it is, On Tues it is…
          - For an average day it is…
- 5 slowest responses
     - in same category as time-to-respond


## Running client app  
You can modify and run the basic stand-alone client app (that communicates to the default MailStats server) by cloning the repo and visiting the /public/app directory (try using localhost).  

## Running Server  
1. Register as an emailbox developer at http://getemailbox.com/login/first
1. Fork this repo
1. Rename `credentials.example.json` to `credentials.json` and enter your MySQL credentials  
1. Create MySQL table using https://github.com/emailbox/mailstats_server/blob/master/mysql_schema.sql  
1. Deploy to heroku (https://devcenter.heroku.com/articles/nodejs) and note the newly-created app name (agile-something-389 or similar)
1. Modify the manifest.json (change package name, all URLs should point use your heroku subdomain)
1. Create a new app on emailbox: https://getemailbox.com/developers and copy/paste your manifest.json
1. Modify the mobile app's creds.js (https://github.com/emailbox/mailstats_server) to use your heroku app (piggyback on heroku's ssl)

## What the server does 
- Accept incoming stats creation requests  
- serves the stats app from /public/app  

