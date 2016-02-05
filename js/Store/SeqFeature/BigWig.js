define( "MethylationPlugin/Store/SeqFeature/BigWig", [
	'dojo/_base/declare',
            'dojo/_base/lang',
            'dojo/_base/array',
            'dojo/_base/url',
            'JBrowse/Store/SeqFeature',
            "JBrowse/Store/SeqFeature/BigWig",
            'JBrowse/Store/LRUCache'
    ],
    function(
		declare,
		lang,
		urlObj,
		SeqFeatureStore,
		BigWig,
		LRUCache
	) {
	return declare([BigWig, SeqFeatureStore],
{
	constructor: function() {
        this.inherited(arguments); // call superclass constructor
    },
    /*
    	overloading from SeqFeature
    */
    _getRegionStats: function( query, successCallback, errorCallback ) {
        var thisB = this;
        var cache = thisB._regionStatsCache = thisB._regionStatsCache || new LRUCache({
            name: 'regionStatsCache',
            maxSize: 1000, // cache stats for up to 1000 different regions
            sizeFunction: function( stats ) { return 1; },
            fillCallback: function( query, callback ) {
                console.log( '_getRegionStats-methylation', query );
                var s = {
                    scoreMax: -Infinity,
                    scoreMin: Infinity,
                    scoreSum: 0,
                    scoreSumSquares: 0,
                    basesCovered: query.end - query.start,
                    featureCount: 0
                };
                thisB.getFeatures( query,
                                  function( feature ) {
                                      var score = feature.get('score') || 0;
                                      var newScore = this._calculateNewScore( score );
                                      newScore = Math.abs( newScore )
                                      s.scoreMax = Math.max( newScore, s.scoreMax );
                                      s.scoreMin = Math.min( newScore, s.scoreMin );
                                      s.scoreSum += newScore;
                                      s.scoreSumSquares += newScore*newScore;
                                      s.featureCount++;
                                  },
                                  function() {
                                      s.scoreMean = s.featureCount ? s.scoreSum / s.featureCount : 0;
                                      s.scoreStdDev = thisB._calcStdFromSums( s.scoreSum, s.scoreSumSquares, s.featureCount );
                                      s.featureDensity = s.featureCount / s.basesCovered;
                                      //console.log( '_getRegionStats done', s );
                                      callback( s );
                                  },
                                  function(error) {
                                      callback( null, error );
                                  }
                                );
            }
         });

         cache.get( query,
                    function( stats, error ) {
                        if( error )
                            errorCallback( error );
                        else
                            successCallback( stats );
                    });

    },


    _calculateNewScore: function( score ){
        if(score > 2)
            return score - 2;
        else if (score < -2)
            return score + 2;
        else if( score > 1 )
            return score - 1;
        else if(score < -1)
            return score + 1;
        else
            return score;
    }
});
});
