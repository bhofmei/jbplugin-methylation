define( 'MethylationPlugin/View/Track/Wiggle/MethylXYPlot', [
            'dojo/_base/declare',
            'dojo/_base/array',
            'dojo/_base/Color',
            'dojo/dom-construct',
            'dojo/on',
            'JBrowse/View/Track/WiggleBase',
            'JBrowse/View/Track/_YScaleMixin',
            'JBrowse/Util',
            'JBrowse/View/Track/Wiggle/_Scale',
        ],
        function( declare, array, Color, domConstruct, on, WiggleBase, YScaleMixin, Util, Scale ) {

var XYPlot = declare( [WiggleBase, YScaleMixin],

/**
 * Wiggle track that shows data with an X-Y plot for multiple mthylation contexts
 * Adapted From: https://github.com/LyonsLab/coge/blob/master/web/js/jbrowse/plugins/CoGe/js/View/Track/Wiggle/MultiXYPlot.js
 *
 * @lends JBrowse.View.Track.Wiggle.XYPlot
 * @extends JBrowse.View.Track.WiggleBase
 */
{
    constructor: function() {
        this.inherited(arguments); // call superclass constructor

        if (typeof(this.config.style.cg_color) == "undefined")
        	this.config.style.cg_color = '#b03060';
        if (typeof(this.config.style.chg_color) == "undefined")
        	this.config.style.chg_color = '#2e8b57';
        if (typeof(this.config.style.chh_color) == "undefined")
        	this.config.style.chh_color = '#1e90ff';
        this.config.showCG = true;
        this.config.showCHG = true;
        this.config.showCHH = true;
        //console.log('methylxyplot2 constructor');
    },

    _defaultConfig: function() {
        return Util.deepUpdate(
            dojo.clone( this.inherited(arguments) ),
            {
                variance_band : false,
                logScaleOption: false,
                max_score: 1,
                min_score: -1,
                style: {
                    origin_color: 'black',
                    variance_band_color: 'gray',
                },
            }
        );
    },

    _getScaling: function( viewArgs, successCallback, errorCallback ) {

        this._getScalingStats( viewArgs, dojo.hitch(this, function( stats ) {

            //calculate the scaling if necessary
            if( ! this.lastScaling || ! this.lastScaling.sameStats( stats ) || this.trackHeightChanged ) {

                var scaling = new Scale( this.config, stats );

                // bump minDisplayed to 0 if it is within 0.5% of it
                if( Math.abs( scaling.min / scaling.max ) < 0.005 )
                    scaling.min = 0;

                // update our track y-scale to reflect it
                this.makeYScale({
                    fixBounds: true,
                    min: scaling.min,
                    max: scaling.max
                });

                // and finally adjust the scaling to match the ruler's scale rounding
                scaling.min = this.ruler.scaler.bounds.lower;
                scaling.max = this.ruler.scaler.bounds.upper;
                scaling.range = scaling.max - scaling.min;

                this.lastScaling = scaling;
            }

            successCallback( this.lastScaling );
        }), errorCallback );
    },

    updateStaticElements: function( coords ) {
        //console.log('updateStaticElements');
        this.inherited( arguments );
        this.updateYScaleFromViewDimensions( coords );
    },

    fillTooManyFeaturesMessage: function( blockIndex, block, scale ) {
        this.fillMessage(
            blockIndex,
            block,
            'Too much data to show'
                + (scale >= this.browser.view.maxPxPerBp ? '': '; zoom in to see detail')
                + '.'
        );
    },

    fillMessage: function( blockIndex, block, message, class_ ) {
        domConstruct.empty( block.domNode );
        var msgDiv = dojo.create(
            'div', {
                className: class_ || 'message',
                innerHTML: message
            }, block.domNode );
        this.heightUpdate( dojo.position(msgDiv).h, blockIndex );
    },

    renderBlock: function( args ) {
        var featureScale = this.config.style.featureScale;
        var scale = args.block.scale;
        if (scale <= featureScale) { // don't draw, too zoomed-out, modeled after HTMLFeatures
            this.fillTooManyFeaturesMessage(args.blockIndex, args.block, scale);
        }
        else { // render features
            this.inherited( arguments );
        }
    },

    _draw: function(scale, leftBase, rightBase, block, canvas, features, featureRects, dataScale, pixels, spans) {
        this._preDraw(      scale, leftBase, rightBase, block, canvas, features, featureRects, dataScale );

        this._drawFeatures( scale, leftBase, rightBase, block, canvas, features, featureRects, dataScale );

        if ( spans ) {
            this._maskBySpans( scale, leftBase, rightBase, block, canvas, pixels, dataScale, spans );
        }
        this._postDraw( scale, leftBase, rightBase, block, canvas, features, featureRects, dataScale );
    },
    /**
     * Draw a set of features on the canvas.
     * @private
     */
    _drawFeatures: function( scale, leftBase, rightBase, block, canvas, features, featureRects, dataScale ) {
        //console.log('_drawFeatures');
        var config = this.config;
        var context = canvas.getContext('2d');
        var canvasHeight = canvas.height;

        var ratio = Util.getResolution( context, this.browser.config.highResolutionMode );
        var toY = dojo.hitch( this, function( val ) {
           return canvasHeight * ( 1-dataScale.normalize(val) ) / ratio;
        });
        var originY = toY( dataScale.origin );
        var disableClipMarkers = this.config.disable_clip_markers;

        // sort features by score
        var fFeatures = [];
        dojo.forEach( features, function(f,i) {
            fFeatures.push({ feature: f, featureRect: featureRects[i] });
        });
        //console.log('draw_features '+fFeatures.length);
        dojo.forEach( fFeatures, function(pair,i) {
            var f = pair.feature;
            var fRect = pair.featureRect;
            var tmpScore = f.get('score');
            var score = this._calculateNewScore( tmpScore );
            var id = this._getIdByScore( tmpScore );

            fRect.t = toY( score );
            //console.log(fRect.t+','+canvasHeight);
            if( fRect.t <= canvasHeight && this._isShown(id) ) { // if the rectangle is visible at all
                context.fillStyle = this._getFeatureColor(id);

                if (fRect.t <= originY) // bar goes upward
                    context.fillRect( fRect.l, fRect.t, fRect.w, originY-fRect.t+1);
                else // downward
                    context.fillRect( fRect.l, originY, fRect.w, fRect.t-originY+1 );
            }
        }, this );
    },

    /**
     * Draw anything needed after the features are drawn.
     */
    _postDraw: function( scale, leftBase, rightBase, block, canvas, features, featureRects, dataScale ) {
//      console.log('_postDraw');
        var context = canvas.getContext('2d');
        var canvasHeight = canvas.height;
        var toY = dojo.hitch( this, function( val ) {
           return canvasHeight * (1-dataScale.normalize.call(this, val));
        });

        // draw the variance_band if requested
        if( this.config.variance_band ) {
            var bandPositions =
                typeof this.config.variance_band == 'object'
                    ? array.map( this.config.variance_band, function(v) { return parseFloat(v); } ).sort().reverse()
                    : [ 2, 1 ];
            this.getGlobalStats( dojo.hitch( this, function( stats ) {
                if( ('scoreMean' in stats) && ('scoreStdDev' in stats) ) {
                    var drawVarianceBand = function( plusminus, fill, label ) {
                        context.fillStyle = fill;
                        var varTop = toY( stats.scoreMean + plusminus );
                        var varHeight = toY( stats.scoreMean - plusminus ) - varTop;
                        varHeight = Math.max( 1, varHeight );
                        context.fillRect( 0, varTop, canvas.width, varHeight );
                        context.font = '12px sans-serif';
                        if( plusminus > 0 ) {
                            context.fillText( '+'+label, 2, varTop );
                            context.fillText( '-'+label, 2, varTop+varHeight );
                        }
                        else {
                            context.fillText( label, 2, varTop );
                        }
                    };

                    var maxColor = new Color( this.config.style.variance_band_color );
                    var minColor = new Color( this.config.style.variance_band_color );
                    minColor.a /= bandPositions.length;

                    var bandOpacityStep = 1/bandPositions.length;
                    var minOpacity = bandOpacityStep;

                    array.forEach( bandPositions, function( pos,i ) {
                        drawVarianceBand( pos*stats.scoreStdDev,
                                          Color.blendColors( minColor, maxColor, (i+1)/bandPositions.length).toCss(true),
                                          pos+'σ');
                    });
                    drawVarianceBand( 0, 'rgba(255,255,0,0.7)', 'mean' );
                }
            }));
        }

        // draw the origin line if it is not disabled
        var originColor = this.config.style.origin_color;
        if( typeof originColor == 'string' && !{'none':1,'off':1,'no':1,'zero':1}[originColor] ) {
            var originY = toY( dataScale.origin );
            context.fillStyle = originColor;
            context.fillRect( 0, originY, canvas.width-1, 1 );
        }
    },

    _trackMenuOptions: function() {
        var options = this.inherited(arguments);
        var track = this;

        options.push.apply(
            options,
            [
                { type: 'dijit/MenuSeparator' },
                {
                    label: 'Show CG Methylation',
                    type: 'dijit/CheckedMenuItem',
                    checked: this.config.showCG,
                    onClick: function(event) {
                        track.config.showCG = this.checked;
                        track.changed();
                    }
                },
                {
                    label: 'Show CHG Methylation',
                    type: 'dijit/CheckedMenuItem',
                    checked: this.config.showCHG,
                    onClick: function(event) {
                        track.config.showCHG = this.checked;
                        track.changed();
                    }
                },
                {
                    label: 'Show CHH Methylation',
                    type: 'dijit/CheckedMenuItem',
                    checked: this.config.showCHH,
                    onClick: function(event) {
                        track.config.showCHH = this.checked;
                        track.changed();
                    }
                }
            ]);


        return options;
    },

    /* determine if the methylation context is shown to save time when drawing */
    _isShown: function( id ){
        if( id == 'cg')
            return this.config.showCG;
        else if (id == 'chg')
            return this.config.showCHG;
        else if( id== 'chh' )
            return this.config.showCHH;
        else
            return false;
    },

    _getFeatureColor: function(id) {
        if( id == 'cg' )
            return this.config.style.cg_color;
        else if( id == 'chg' )
            return this.config.style.chg_color;
        else if( id = 'chh' )
            return this.config.style.chh_color;
        else
            return 'black';

    },

    _calculatePixelScores: function( canvasWidth, features, featureRects ) {
        // make an array of the max score at each pixel on the canvas
        var pixelValues = new Array( canvasWidth );
        var scoreType = this.config.scoreType;
        dojo.forEach( features, function( f, i ) {
            var store = f.source;
            var fRect = featureRects[i];
            var jEnd = fRect.r;
            var tmpScore = f.get(scoreType)||f.get('score');
            var score = this._calculateNewScore( tmpScore );
            for( var j = Math.round(fRect.l); j < jEnd; j++ ) {
                if ( pixelValues[j] && pixelValues[j]['lastUsedStore'] == store ) {
                    /* Note: if the feature is from a different store, the condition should fail,
                     *       and we will add to the value, rather than adjusting for overlap */
                    pixelValues[j]['score'] = Math.max( pixelValues[j]['score'], score );
                }
                else if ( pixelValues[j] ) {
                    pixelValues[j]['score'] = pixelValues[j]['score'] + score;
                    pixelValues[j]['lastUsedStore'] = store;
                }
                else {
                    pixelValues[j] = { score: score, lastUsedStore: store, feat: f };
                }
            }
        },this);
        // when done looping through features, forget the store information.
        for (var i=0; i<pixelValues.length; i++) {
            if ( pixelValues[i] ) {
                delete pixelValues[i]['lastUsedStore'];
            }
        }
        return pixelValues;
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
    },
    
    _getIdByScore: function( score ){
        if (Math.abs(score) > 2)
            return 'chh';
        else if( Math.abs(score) > 1 )
            return 'chg';
        else
            return 'cg';
    }

});

return XYPlot;
});
