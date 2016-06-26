define( 'MethylationPlugin/Store/SeqFeature/MethylBigWig',[
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/_base/array',
    'dojo/promise/all',
    'dojo/request/xhr',
    'JBrowse/Store/SeqFeature',
    'JBrowse/Store/DeferredStatsMixin',
    'JBrowse/Store/DeferredFeaturesMixin',
    'JBrowse/Store/SeqFeature/BigWig'
    ],
    function(
        declare,
        lang,
        array,
        all,
        xhr,
        SeqFeatureStore,
        DeferredFeaturesMixin,
        DeferredStatsMixin,
        BigWig
    ){
return declare([ SeqFeatureStore, DeferredFeaturesMixin, DeferredStatsMixin ],
{
    /* This file was adapted from https://github.com/cmdcolin/multibigwig */
    /**
     * Data backend for multiple bigwig files 
     */
    constructor: function( args ) {
        var thisB = this;
        if(args.config.context === undefined){
            this.config.context = ['cg','chg','chh'];
        }else{
            this.config.context = array.map(args.config.context, function(x){return x.toLowerCase()})
        }
        var newFiles = array.map(thisB.config.context,function(m){
            return {url: args.urlTemplate + '.' + m, name: m};
        });
        
        this.stores = array.map( newFiles, function( n ) {
            return new BigWig( dojo.mixin(args, {urlTemplate: n.url, name: n.name}) );
        });
        all( array.map( this.stores, function(store) {
            return store._deferred.features
        })).then( function() {
            thisB._deferred.features.resolve({success: true});
            thisB._deferred.stats.resolve({success: true});
        },
            lang.hitch( this, '_failAllDeferred' )
        );
    },

    _getFeatures: function( query, featureCallback, endCallback, errorCallback ) {
        var thisB = this;
        var finished = 0;
        var finishCallback = function() {
            if(thisB.stores.length == ++finished) {
                endCallback();
            }
        }
        array.forEach( this.stores, function(store) {
            store._getFeatures( query,
                featureCallback, finishCallback, errorCallback
            );
        });
    },


    _getGlobalStats: function( successCallback, errorCallback ) {
        var thisB = this;
        var finished = 0;
        var stats = { scoreMin: 100000000, scoreMax: -10000000 };

        var finishCallback = function(t) {
            if(t.scoreMin < stats.scoreMin) stats.scoreMin = t.scoreMin;
            if(t.scoreMax > stats.scoreMax) stats.scoreMax = t.scoreMax;
            if(thisB.stores.length == ++finished) {
                successCallback( stats );
            }
        };
        array.forEach( this.stores, function(store) {
            store._getGlobalStats( finishCallback, errorCallback );
        });
    },
    getRegionStats: function( query, successCallback, errorCallback ) {
        var thisB = this;
        var finished = 0;
        var stats = { scoreMin: 100000000, scoreMax: -10000000 };

        var finishCallback = function(t) {
            if(t.scoreMin < stats.scoreMin) stats.scoreMin = t.scoreMin;
            if(t.scoreMax > stats.scoreMax) stats.scoreMax = t.scoreMax;
            if(thisB.stores.length == ++finished) {
                successCallback( stats );
            }
        };
        array.forEach( this.stores, function(store) {
            store.getRegionStats( query, finishCallback, errorCallback );
        });
    }

});

});
