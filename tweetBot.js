function TweetBot(config) {
  
  var Twit = require('twit');
  var T = new Twit(config);
  var _ = require('lodash');
  
 
  
  function _toBeTweeted (tweet) {
       
    T.post('statuses/update', { status: tweet.text }, function(err, data, response) {
      // TODO , save in log 
      console.log(data);
    });
 
  }
  
  function process (arr) {
    _.forEach(arr, function(obj) {
      _toBeTweeted(obj);
    });
  }
  
  return {
    process : process
  }
}

module.exports = function(config){
  return TweetBot(config);
};