'use strict';

var fs = require('fs');

var Common = require('./common');

var TIP_SYNC_INTERVAL = 10;
var valueEnum = ['TotalNormals', 'TotalActivated', 'TotalLockedInLoops'];

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
  this.thirtyDaysStats = {};
  this.currentBlock = 0;
  this.lastBlockChecked = 1;
  this.statsSyncInProgress = false;
  this.dataDumpInProgress = false;
}

StatsController.prototype.showStatsSyncProgress = function(req, res) {
  res.jsonp({
    info: {
      chainTip: this.currentBlock,
      lastBlockChecked: this.lastBlockChecked,
      progress: Number(this.lastBlockChecked * 100 / this.currentBlock).toFixed(2),
    }
  });
};

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
    if (!self.dataDumpInProgress) {
      fs.writeFile(self.statsPath, JSON.stringify(self.cache), function (err) {
        if (err) return console.log(err);
        console.log('marmara stats file updated');
      });
    }
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
              
              if (height > 2) self.generateStatsTotals();
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
  var self = this;
  console.log(this.statsPath);

  if (!override && this.cache.marmaraAmountStat) {
    console.log('marmaraAmountStat serve from cache');
    if (callback) callback(null, this.cache.marmaraAmountStat);
  } else {
    console.log('marmaraAmountStat update triggered');
    
    this.node.services.bitcoind.marmaraAmountStat(1, 1, function(err, result) {
      if (err && callback) {
        return callback(err);
      }
      self.cache.marmaraAmountStat = result;
      if (callback) callback(null, result);
    });
  }
};

StatsController.prototype.generateStatsTotals = function() {
  var self = this;

  var blockDate = new Date(new Date(this.cache.marmaraAmountStatByBlocksDiff[this.cache.marmaraAmountStatByBlocksDiff.length - 1].time * 1000).getFullYear() + '-' + (new Date(this.cache.marmaraAmountStatByBlocksDiff[this.cache.marmaraAmountStatByBlocksDiff.length - 1].time * 1000).getMonth() + 1 < 10 ? ( '0' + (new Date(this.cache.marmaraAmountStatByBlocksDiff[this.cache.marmaraAmountStatByBlocksDiff.length - 1].time * 1000).getMonth() + 1)) : new Date(this.cache.marmaraAmountStatByBlocksDiff[this.cache.marmaraAmountStatByBlocksDiff.length - 1].time * 1000).getMonth() + 1) + '-' + new Date(this.cache.marmaraAmountStatByBlocksDiff[this.cache.marmaraAmountStatByBlocksDiff.length - 1].time * 1000).getDate()).toISOString().substr(0, 10);

  if (!this.cache.marmaraGroupBlocksByDay[blockDate]) this.cache.marmaraGroupBlocksByDay[blockDate] = [];
  this.cache.marmaraGroupBlocksByDay[blockDate].push(this.cache.marmaraAmountStatByBlocksDiff[this.cache.marmaraAmountStatByBlocksDiff.length - 1]);
  this.cache.marmaraAmountStatDaily[blockDate] = this.cache.marmaraGroupBlocksByDay[blockDate][this.cache.marmaraGroupBlocksByDay[blockDate].length - 1];
  this.generate30DaysStats();
};

StatsController.prototype.generate30DaysStats = function() {
  var dailyStatsArr = Object.keys(this.cache.marmaraAmountStatDaily);

  for (var a = 0; a < valueEnum.length; a ++) {
    var statsDateArr = [];
    var statsValueArr = [];

    for (var i = dailyStatsArr.length - 1; i > 0 && dailyStatsArr.length - 1 - i < 30; i--) {
      var date = new Date(Date.parse(dailyStatsArr[i]));
      statsDateArr.push(date.getFullYear() + '-' + (date.getMonth() + 1 < 10 ? '0' + (date.getMonth() + 1).toString() : date.getMonth() + 1) + '-' + (date.getDate() < 10 ? '0' + date.getDate() : date.getDate()));
      statsValueArr.push(this.cache.marmaraAmountStatDaily[dailyStatsArr[i]][valueEnum[a]]);
    }

    this.thirtyDaysStats[valueEnum[a]] = {
      date: statsDateArr,
      value: statsValueArr,
    };
  }
}

StatsController.prototype.show30DaysStats = function(req, res) {
  var self = this;
  var type = req.query.type;

  if (Object.keys(this.thirtyDaysStats).length) {
    if (valueEnum.indexOf(type) > -1) {
      res.jsonp({
        info: this.thirtyDaysStats[type]
      });
    } else {
      res.jsonp({
        info: {
          TotalNormals: this.thirtyDaysStats.TotalNormals,
          TotalActivated: this.thirtyDaysStats.TotalActivated,
          TotalLockedInLoops: this.thirtyDaysStats.TotalLockedInLoops
        }
      });
    }
  } else {
    res.jsonp({
      error: 'syncing stats'
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

StatsController.prototype.dumpStatsData = function() {  
  this.dataDumpInProgress = true;
  fs.writeFileSync(this.statsPath, JSON.stringify(this.cache));
  console.log('stats on node stop, dumped data');
};

module.exports = StatsController;
