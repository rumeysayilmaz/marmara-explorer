'use strict';

var fs = require('fs');

var Common = require('./common');
var helpers = require('./stats-helpers');

var TIP_SYNC_INTERVAL = 10;

function StatsController(node) {
  this.node = node;
  this.statsPath = this.node.configPath.replace('bitcore-node.json', 'marmara-stats.json');
  this.common = new Common({log: this.node.log});
  this.cache = {
    marmaraAmountStat: '',
    marmaraAmountStatByBlocks: [],
    marmaraAmountStatByBlocksDiff: [],
    marmaraAmountStatDaily: {},
  };
  this.currentBlock = 0;
  this.lastBlockChecked = 1;
  this.statsSyncInProgress = false;
}

StatsController.prototype.startSync = function() {
  var self = this;

  try {
    var localCache = fs.readFileSync(self.statsPath, 'UTF-8');
    this.cache = JSON.parse(localCache);
    this.lastBlockChecked = this.cache.marmaraAmountStatByBlocks[this.cache.marmaraAmountStatByBlocks.length - 1].BeginHeight + 1;
    if (!this.cache.hasOwnProperty('marmaraAmountStatDaily')) this.cache.marmaraAmountStatDaily = {};
  } catch (e) {
    console.log(e);
  }

  this.node.services.bitcoind.getInfo(function(err, result) {
    if (!err) {
      console.log('sync getInfo', result);
      self.currentBlock = result.blocks;
      console.log('stats sync: ' + self.statsSyncInProgress);
      if (!self.statsSyncInProgress) self.syncStatsByHeight();
    }
  });

  setInterval(() => {
    this.node.services.bitcoind.getInfo(function(err, result) {
      if (!err) {
        console.log('sync getInfo', result);
        self.currentBlock = result.blocks;
        console.log('stats sync: ' + self.statsSyncInProgress);
        if (!self.statsSyncInProgress) self.syncStatsByHeight();
      }
    });
  }, TIP_SYNC_INTERVAL * 1000);

  setInterval(() => {
    fs.writeFile(self.statsPath, JSON.stringify(self.cache), function (err) {
      if (err) return console.log(err);
      console.log('marmara stats file updated');
    });
  }, 5 * 1000);
};

StatsController.prototype.syncStatsByHeight = function() {
  var self = this;
  console.log('marmara sats sync start at ht. ' + self.lastBlockChecked);

  var checkBlock = function(height) {
    if (height < self.currentBlock) {
      self.statsSyncInProgress = true;

      self.node.services.bitcoind.getBlockOverview(height, function(err, block) {
        if (!err) {
          //console.log(block);
          
          self.node.services.bitcoind.marmaraAmountStat(height, height, function(err, result) {
            if (!err) {
              //console.log('sync marmaraAmountStat ht.' + height, result);

              self.cache.marmaraAmountStatByBlocks.push({
                BeginHeight: result.BeginHeight,
                EndHeight: result.EndHeight,
                TotalNormals: result.TotalNormals,
                TotalPayToScriptHash: result.TotalPayToScriptHash,
                TotalActivated: result.TotalActivated,
                TotalLockedInLoops: result.TotalLockedInLoops,
                TotalUnknownCC: result.TotalUnknownCC,
                SpentNormals: result.SpentNormals,
                SpentPayToScriptHash: result.SpentPayToScriptHash,
                SpentActivated: result.SpentActivated,
                SpentLockedInLoops: result.SpentLockedInLoops,
                SpentUnknownCC: result.SpentUnknownCC,
                time: block.time,
              });

              if (height > 1) {
                console.log('marmara calc stat diff at ht.cur ' + height + ' ht.prev ' + (height - 1));

                self.cache.marmaraAmountStatByBlocksDiff.push({
                  BeginHeight: result.BeginHeight,
                  EndHeight: result.EndHeight,
                  TotalNormals: self.cache.marmaraAmountStatByBlocksDiff[height - 2].TotalNormals - result.SpentNormals + result.TotalNormals,
                  TotalPayToScriptHash: self.cache.marmaraAmountStatByBlocksDiff[height - 2].TotalPayToScriptHash - result.SpentPayToScriptHash + result.TotalPayToScriptHash,
                  TotalActivated: self.cache.marmaraAmountStatByBlocksDiff[height - 2].TotalActivated - result.SpentActivated + result.TotalActivated,
                  TotalLockedInLoops: self.cache.marmaraAmountStatByBlocksDiff[height - 2].TotalLockedInLoops - result.SpentLockedInLoops + result.TotalLockedInLoops,
                  time: block.time,
                });

              } else {
                self.cache.marmaraAmountStatByBlocksDiff.push({
                  BeginHeight: result.BeginHeight,
                  EndHeight: result.EndHeight,
                  TotalNormals: result.TotalNormals,
                  TotalPayToScriptHash: result.TotalPayToScriptHash,
                  TotalActivated: result.TotalActivated,
                  TotalLockedInLoops: result.TotalLockedInLoops,
                  time: block.time,
                });
              }
              //console.log('marmara stats at ht.cur ' + height + ' ht.prev ' + (height - 1), self.cache.marmaraAmountStatByBlocksDiff[height - 1]);
              
              self.lastBlockChecked++;
              checkBlock(self.lastBlockChecked);
            }
          });
        }
      });
    } else {
      self.statsSyncInProgress = false;
    }
  }

  checkBlock(self.lastBlockChecked);
}

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

StatsController.prototype.generateStatsTotals = function() {
  var groupStatsByBlocks = [];
  var startDate = new Date(new Date(this.cache.marmaraAmountStatByBlocksDiff[0].time * 1000).getFullYear() + '-' + (new Date(this.cache.marmaraAmountStatByBlocksDiff[0].time * 1000).getMonth() + 1 < 10 ? ( '0' + (new Date(this.cache.marmaraAmountStatByBlocksDiff[0].time * 1000).getMonth() + 1)) : new Date(this.cache.marmaraAmountStatByBlocksDiff[0].time * 1000).getMonth() + 1) + '-' + new Date(this.cache.marmaraAmountStatByBlocksDiff[0].time * 1000).getDate());
  var endDate = new Date(new Date(this.cache.marmaraAmountStatByBlocksDiff[this.cache.marmaraAmountStatByBlocksDiff.length - 1].time * 1000).getFullYear() + '-' + (new Date(this.cache.marmaraAmountStatByBlocksDiff[this.cache.marmaraAmountStatByBlocksDiff.length - 1].time * 1000).getMonth() + 1 < 10 ? ( '0' + (new Date(this.cache.marmaraAmountStatByBlocksDiff[this.cache.marmaraAmountStatByBlocksDiff.length - 1].time * 1000).getMonth() + 1)) : new Date(this.cache.marmaraAmountStatByBlocksDiff[this.cache.marmaraAmountStatByBlocksDiff.length - 1].time * 1000).getMonth() + 1) + '-' + new Date(this.cache.marmaraAmountStatByBlocksDiff[this.cache.marmaraAmountStatByBlocksDiff.length - 1].time * 1000).getDate());
  var daylist = helpers.getDaysArray(startDate, endDate);

  for (var i = 0; i < daylist.length; i++) {
    if (daylist[i + 1]) {
      groupStatsByBlocks[Date.parse(daylist[i])] = [];

      for (var j = 0; j < this.cache.marmaraAmountStatByBlocksDiff.length; j++) {
        if (this.cache.marmaraAmountStatByBlocksDiff[j].time < Date.parse(daylist[i + 1]) / 1000 &&
            this.cache.marmaraAmountStatByBlocksDiff[j].time >= Date.parse(daylist[i]) / 1000) {
          groupStatsByBlocks[Date.parse(daylist[i])].push(this.cache.marmaraAmountStatByBlocksDiff[j]);
        }
      }

      this.cache.marmaraAmountStatDaily[daylist[i]] = groupStatsByBlocks[Date.parse(daylist[i])][groupStatsByBlocks[Date.parse(daylist[i])].length - 1];
    }
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
