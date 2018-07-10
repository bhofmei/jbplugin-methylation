define('MethylationPlugin/Store/SeqFeature/MethylBigWig', [
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/_base/array',
    'dojo/promise/all',
    'JBrowse/Store/SeqFeature',
    'JBrowse/Store/DeferredStatsMixin',
    'JBrowse/Store/DeferredFeaturesMixin',
    'JBrowse/Store/SeqFeature/BigWig'
    ],
  function (
    declare,
    lang,
    array,
    all,
    SeqFeatureStore,
    DeferredFeaturesMixin,
    DeferredStatsMixin,
    BigWig
  ) {
    return declare([SeqFeatureStore, DeferredFeaturesMixin, DeferredStatsMixin], {
      /* This file was adapted from https://github.com/cmdcolin/multibigwig */
      /**
       * Data backend for multiple bigwig files
       */
      constructor: function (args) {
        var thisB = this;
        if (args.config.context === undefined) {
          this.config.context = ['cg', 'chg', 'chh'];
        } else {
          var tmpCtx = array.map(args.config.context, function (x) {
            return x.toLowerCase();
          });
          if (args.isAnimal || args.browser.config || (args.browser.plugins.hasOwnProperty('MethylationPlugin') && args.browser.plugins.MethylationPlugin.config.isAnimal)) {
            var tmpInd = tmpCtx.indexOf('ch');
            if (tmpInd !== -1) {
              tmpCtx.splice(tmpInd, 1);
              if (tmpCtx.indexOf('chg') === -1 && tmpCtx.indexOf('chh') === -1)
                tmpCtx.push('chg', 'chh');
            }
          }
          this.config.context = tmpCtx;
        }
        var newFiles = array.map(thisB.config.context, function (m) {
          return {
            url: args.urlTemplate + '.' + m,
            name: m
          };
        });
        this.stores = array.map(newFiles, function (n) {
          return new BigWig(dojo.mixin(args, {
            urlTemplate: n.url,
            name: n.name
          }));
        });

        all(array.map(this.stores, function (store) {
          return store._deferred.features
        })).then(function () {

            thisB._deferred.features.resolve({
              success: true
            });
            thisB._deferred.stats.resolve({
              success: true
            });
            thisB._checkZoomLevels();
            //console.log(thisB.stores);
          },
          lang.hitch(this, '_failAllDeferred'));
        //console.log(this.stores);
        // get store zoom levels

        var zoomLevels = array.map(this.stores, function (store) {
          //console.log(store);
        });
        //console.log(zoomLevels);
      },

      _checkZoomLevels: function () {

        var zoomLevels = array.map(this.stores, function (store) {
          return store.numZoomLevels
        });
        var minLevels = Math.min.apply(null, zoomLevels);
        var maxLevels = Math.max.apply(null, zoomLevels);
        // if they aren't equal, remove levels
        if (minLevels !== maxLevels) {
          // loop through stores
          array.forEach(this.stores, function (store) {
            var nRemove = store.numZoomLevels - minLevels;
            if (nRemove !== 0) {
              store.zoomLevels.splice(0, nRemove);
              store.numZoomLevels = store.zoomLevels.length;
            }
          });
        }
      },

      _getFeatures: function (query, featureCallback, endCallback, errorCallback) {
        var thisB = this;
        var finished = 0;
        var finishCallback = function () {
          if (thisB.stores.length == ++finished) {
            endCallback();
          }
        }
        array.forEach(this.stores, function (store) {
          var updatedFeatureCallback = (function(name) {
            return function(feat) {
              if( !feat.data.source )
                feat.data.source = name;
              featureCallback(feat);
            }
          })(store.name)
          store._getFeatures(query,
            updatedFeatureCallback, finishCallback, errorCallback
          );
        });
      },


      _getGlobalStats: function (successCallback, errorCallback) {
        var thisB = this;
        var finished = 0;
        //var stats = { scoreMin: 100000000, scoreMax: -10000000 };
        var stats = [];

        var finishCallback = function (t) {
          /*  if(t.scoreMin < stats.scoreMin) stats.scoreMin = t.scoreMin;
            if(t.scoreMax > stats.scoreMax) stats.scoreMax = t.scoreMax;*/
          var tmpStats = stats[stats.length - 1];
          tmpStats = lang.mixin(tmpStats, t);
          if (thisB.stores.length == ++finished) {
            var fm = thisB.reformatStats(stats);
            successCallback(fm);
            //successCallback(stats);
          }
        };
        array.forEach(this.stores, function (store) {
          stats.push({
            name: store.name
          });
          store._getGlobalStats(finishCallback, errorCallback);
        });
      },

      reformatStats: function (stats) {
        var thisB = this;
        var out = {};
        var label = '';
        var totalBases = 0;
        var scoreTotal = 0;
        array.forEach(stats, function (stat) {
          label = stat.name.toUpperCase() + ' bases covered';
          out[label] = thisB._roundDecimal(stat.basesCovered, 6);
          totalBases += stat.basesCovered;
          scoreTotal += stat.scoreSum;
          label = stat.name.toUpperCase() + ' min score';
          out[label] = thisB._roundDecimal(stat.scoreMin, 6);
          label = stat.name.toUpperCase() + ' max score';
          out[label] = thisB._roundDecimal(stat.scoreMax, 6);
          label = stat.name.toUpperCase() + ' mean score';
          out[label] = thisB._roundDecimal(stat.scoreMean, 6);
        });
        out['total bases covered'] = totalBases;
        out['total mean score'] = thisB._roundDecimal(scoreTotal / totalBases, 6);
        return out;
      },

      getRegionStats: function (query, successCallback, errorCallback) {
        var thisB = this;
        var finished = 0;
        var stats = {
          scoreMin: 100000000,
          scoreMax: -10000000
        };

        var finishCallback = function (t) {
          if (t.scoreMin < stats.scoreMin) stats.scoreMin = t.scoreMin;
          if (t.scoreMax > stats.scoreMax) stats.scoreMax = t.scoreMax;
          if (thisB.stores.length == ++finished) {
            successCallback(stats);
          }
        };
        array.forEach(this.stores, function (store) {
          store.getRegionStats(query, finishCallback, errorCallback);
        });
      },

      _roundDecimal: function (number, places) {
        return +(Math.round(number + "e+" + places) + "e-" + places);
      }

    });

  });
