'use strict';

// ref: https://stackoverflow.com/questions/4413590/javascript-get-array-of-dates-between-2-dates
var getDaysArray = function(start, end) {
  for (var arr = [], dt = new Date(start); dt <= end; dt.setDate(dt.getDate() + 1)) {
    arr.push(new Date(dt).toUTCString());
  }
  return arr;
};

// ref: https://stackoverflow.com/questions/8842732/how-to-get-30-days-prior-to-current-date
var monthDays = function() {
  var today = new Date();
  var priorDate = new Date().setDate(today.getDate() - 30);

  return new Date(priorDate);
}

var get30DaysStamps = function() {
  var today = new Date().getFullYear() + '-' + (new Date().getMonth() < 10 ? '0' + new Date().getMonth() : new Date().getMonth()) + '-' + new Date().getDate();
  var thirtyDaysBack = monthDays().getFullYear() + '-' + (monthDays().getMonth() < 10 ? '0' + monthDays().getMonth() : monthDays().getMonth()) + '-' + monthDays().getDate();

  return {
    today: today,
    thirtyDaysBack: thirtyDaysBack,
    days: getDaysArray(new Date(thirtyDaysBack), new Date(today)),
  };
}

module.exports = {
  getDaysArray,
  monthDays,
  get30DaysStamps,
};