function MixCalendar () {
  var _ = require("lodash");
  var Rx = require("rx");
  var ical = require("ical-generator");
  var icalImporter = require('ical');
  var moment = require('moment');
  
  moment.locale('es');
  var uri_pattern = /\b((?:[a-z][\w-]+:(?:\/{1,3}|[a-z0-9%])|www\d{0,3}[.]|[a-z0-9.\-]+[.][a-z]{2,4}\/)(?:[^\s()<>]+|\(([^\s()<>]+|(\([^\s()<>]+\)))*\))+(?:\(([^\s()<>]+|(\([^\s()<>]+\)))*\)|[^\s`!()\[{};:'".,<>?«»“”‘’]|\]|\?))/ig

  
  var overlap = {};
  var EventTweets = [];
  
  var now = moment();
  var DAYS_LEFT = 7;
  
  var CALENDAR_NAME = "calendar.ics";
  var cal = ical({
    domain: 'comunidadestecnologicas.info',
    prodId: {company: 'comunidadestecnologicas.info', product: 'ical-generator'},
    name: 'Calendario Común',
    timezone : 'Europe/Madrid'
  });

  function _generateMeetupIcsUrl (community) {
    return  "http://www.meetup.com/" + community + "/events/ical/";
  }
  
  function getIcalUrls (data) {
    return _.isObject(data) 
      ? data
      : { icsUrl : _generateMeetupIcsUrl(data),
          community : data
      };
  }



  function store(obj) {
    var current = moment(obj.start).format("YYYYMMDD");
    if(_.has(overlap, current)) {
      overlap[current].push({
        url: obj.url,
        start: obj.start
      });

    } else {
      overlap[current] = [
        {
          url: obj.url,
          start: obj.start
        }
      ];
    }
  }

  function CreateSeq ( arrOps ) {

    var hit = Rx.Observable.fromNodeCallback(icalImporter.fromURL);
    
  
    return Rx.Observable.generateWithRelativeTime(
      arrOps,
      function checkLimit ( task) {
        return task.length > 0;
      },
      function increment (task) {
        task.shift();
        return task;

      },
      function(task) {
          return task[0];
      },
      function(x) {
        return 200;
      }
    ).flatMap(function (obj) {
      
      return hit(obj.icsUrl, {}).map(function (res) {
        return _.assign(res, { community : obj.community });
      });
    }).filter( function (result) {
      return validIcs(result);
    }).map( function (result) {
      var com = result.community;  
      return _.map(_.filter(result , { type: "VEVENT"}), function(res) {
        return _.assign(res, { community : com });
      });
    }).filter( function (arr) {
        return !_.isEmpty(arr);
    });

  }

  function validIcs(obj) {
    return !_.isEmpty(obj) && !_.keys(obj).join("").match(/unauthorized/);
  }

  function normalizeEvent (obj) {
    
    var normalized = {};
    if (_.has(obj,"description") && obj.description.match(/URL/)) {
      normalized.url = obj.description.match(uri_pattern)[0];
    }
    normalized.description = _.has(obj,"description") && obj.description.replace(/\n/g," ");
    return _.extend(obj,normalized);

  }

  function _checkTweetCandidate(date) {
    var currentDate = moment(date);
    return currentDate.isAfter(now) && currentDate.diff(now, 'days') < DAYS_LEFT;
  }
  
  function createEvents (arr) {
    _.map(arr, function(obj) {
      var normalized = normalizeEvent(obj);
      cal.createEvent(normalized);
      if (_checkTweetCandidate(obj.start)) {
        prepareToBeTweeted(obj);
      }
      store(obj);
    });
  }
  function _composeTweet(event) {
    return "" + moment(event.start).format('[El próximo] dddd DD [a las] HH:mm') + " " + event.community + " organiza: " + event.url ;
  }
  
  function prepareToBeTweeted (event) {
    
    EventTweets.push({
      community : event.community,
      text : _composeTweet(event) 
    });  
  }
  
  function watchSeq (obs , cb) {

    seq = obs.subscribe(
      function (events) {
        createEvents(events);
      },
      function (err) {
        cb(true, null);
      },
      function() {
        cb(null , cal.toString());
      }
    );
  }
  
  return {
    get: function( coms, cb) {

      var list = _.map(coms, getIcalUrls);
      return watchSeq(CreateSeq(list), cb);
    },
    overlapping: function() {
      return _.filter( _.map(overlap, function( v,k ) {
        if (v.length > 1) {
          return { date : k, events: v};
        }
      }), function (obj) {
        return obj;
      });
    },
    getEventTweets : EventTweets
  }
}

module.exports = MixCalendar();
