var fs = require("fs");
var setup = require("./setup.json");
var CALENDAR_NAME = "calendar.ics";
var MixCalendar = require('./mixcalendar');
var TweetBot = require('./tweetBot')({
  consumer_key        : process.env["TWITTER_CK"],
  consumer_secret     : process.env["TWITTER_SEC"],
  access_token        : process.env["TWITTER_AT"],
  access_token_secret : process.env["TWITTER_ATS"],
});

var communities = setup.NonMeetupBased.concat(setup.MeetupBased);


function getCalendar (err, cal ) {
  if (err) {
    console.log("Error generating calendar");
  }
  else {
    writeFile(CALENDAR_NAME, cal);
    //console.log("%j", MixCalendar.overlapping());
    TweetBot.process(MixCalendar.getEventTweets);
  }
}

function writeFile(path, data) {
  var wstream = fs.writeFileSync(path,data);
  console.log("Calendar written in " + path);
}

MixCalendar.get(communities, getCalendar);

