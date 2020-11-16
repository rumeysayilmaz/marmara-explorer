'use strict';

var Common = require('./common');

var TIP_SYNC_INTERVAL = 10;

function StatsController(node) {
  this.node = node;
  this.common = new Common({log: this.node.log});
  this.cache = {
    marmaraAmountStat: '',
  };
  this.currentBlock = 0;
}

StatsController.prototype.startSync = function() {
  var self = this;

  this.node.services.bitcoind.getInfo(function(err, result) {
    if (!err) {
      console.log('sync getInfo', result);
      self.currentBlock = result.blocks;
    }
  });

  setInterval(() => {
    this.node.services.bitcoind.getInfo(function(err, result) {
      if (!err) {
        console.log('sync getInfo', result);
        self.currentBlock = result.blocks;
      }
    });
  }, TIP_SYNC_INTERVAL * 1000);
};

StatsController.prototype.marmaraAmountStat = function(callback, override) {
  if (!override && this.cache.marmaraAmountStat) {
    console.log('marmaraAmountStat serve from cache');
    if (callback) callback(null, this.cache.marmaraAmountStat);
  } else {
    console.log('marmaraAmountStat update triggered');
    var that = this;
    
    this.node.services.bitcoind.marmaraAmountStat(function(err, result) {
      if (err && callback) {
        return callback(err);
      }
      that.cache.marmaraAmountStat = result;
      if (callback) callback(null, result);
    });
  }
};

StatsController.prototype.showStats = function(req, res) {
  var self = this;

  this.marmaraAmountStat(function(err, result) {
    if (err) {
      return self.common.handleErrors(err, res);
    }
    res.jsonp({
      info: result
    });
  });
};

module.exports = StatsController;
