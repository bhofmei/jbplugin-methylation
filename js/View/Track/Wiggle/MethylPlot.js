define( 'MethylationPlugin/View/Track/Wiggle/MethylPlot', [
            'dojo/_base/declare',
            'dojo/_base/array',
            'dojo/_base/Color',
            'dojo/dom',
            'dojo/dom-construct',
    "dijit/registry",
            'dojo/on',
            'JBrowse/View/Track/WiggleBase',
            'JBrowse/View/Track/_YScaleMixin',
            'JBrowse/Util',
            'JBrowse/View/Track/Wiggle/_Scale'
        ],
        function( declare, array, Color, dom, domConstruct, registry, on, WiggleBase, YScaleMixin, Util, Scale ) {

var XYPlot = declare( [WiggleBase, YScaleMixin],

/**
 * Wiggle track that shows data with an X-Y plot for multiple mthylation contexts
 * Adapted From: https://github.com/LyonsLab/coge/blob/master/web/js/jbrowse/plugins/CoGe/js/View/Track/Wiggle/MultiXYPlot.js 
 * and https://github.com/cmdcolin/multibigwig 
 *
 * @lends JBrowse.View.Track.Wiggle.XYPlot
 * @extends JBrowse.View.Track.WiggleBase
 */
{
    constructor: function() {
        var thisB = this;

        array.forEach(registry.toArray(),function(x){
            var i = x.id;
            if(i.includes(thisB.config.label ) && (/c.*-checkbox/.test(i)))
                registry.byId(i).destroy();
        });
    },

    _defaultConfig: function() {
        return Util.deepUpdate(
            dojo.clone( this.inherited(arguments) ),
            {
                logScaleOption: false,
                max_score: 1,
                min_score: -1,
                style: {
                    origin_color: 'gray',
                    cg_color:'#A36085',
                    chg_color:'#0072B2',
                    chh_color:'#CF8F00'
                },
                showCG: true,
                showCHG: true,
                showCHH: true,
                isAnimal: false
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

        var fFeatures = [];
        dojo.forEach( features, function(f,i) {
            fFeatures.push({ feature: f, featureRect: featureRects[i] });
        });
        //console.log('draw_features '+fFeatures.length);
        dojo.forEach( fFeatures, function(pair,i) {
            var f = pair.feature;
            var fRect = pair.featureRect;
            var score = f.get('score');
            var id = f.get('source');
            //var scoreID = this._getScoreInfo( tmpScore );
            //var score = scoreID[0];
            //var id = scoreID[1];

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

        var ratio = Util.getResolution( context, this.browser.config.highResolutionMode );
        var toY = dojo.hitch( this, function( val ) {
           return canvasHeight * ( 1-dataScale.normalize(val) ) / ratio;
        });
        var thisB = this;

        // draw the origin line if it is not disabled
        var originColor = this.config.style.origin_color;
        if( typeof originColor == 'string' && !{'none':1,'off':1,'no':1,'zero':1}[originColor] ) {
            var originY = toY( dataScale.origin );
            context.fillStyle = originColor;
            context.fillRect( 0, originY, canvas.width, 1 );
        }
    },

    _trackMenuOptions: function() {
        var options = this.inherited(arguments);
        var track = this;
        //console.log(track);
        options.push.apply(
            options,
            [
                { type: 'dijit/MenuSeparator' },
                {
                    label: 'Show CG Methylation',
                    type: 'dijit/CheckedMenuItem',
                    checked: track.config.showCG,
                    id: track.config.label + '-cg-checkbox',
                    class: 'track-cg-checkbox',
                    onClick: function(event) {
                        track.config.showCG = this.checked;
                        track.changed();
                    }
                }
            ]);
        if(this.config.isAnimal){
            options.push.apply(
            options,
            [{
                    label: 'Show CH Methylation',
                    type: 'dijit/CheckedMenuItem',
                    checked: (track.config.showCHG && track.config.showCHH),
                    id: track.config.label + '-ch-checkbox',
                    class: 'track-ch-checkbox',
                    onClick: function(event) {
                        track.config.showCHG = this.checked;
                        track.config.showCHH = this.checked;
                        track.changed();
                    }
                }
            ]);
        } else {
            options.push.apply(
            options,
            [ {
                    label: 'Show CHG Methylation',
                    type: 'dijit/CheckedMenuItem',
                    checked: track.config.showCHG,
                    id: track.config.label + '-chg-checkbox',
                    class: 'track-chg-checkbox',
                    onClick: function(event) {
                        track.config.showCHG = this.checked;
                        track.changed();
                    }
                },
                {
                    label: 'Show CHH Methylation',
                    type: 'dijit/CheckedMenuItem',
                    checked: track.config.showCHH,
                    id: track.config.label + '-chh-checkbox',
                    class: 'track-chh-checkbox',
                    onClick: function(event) {
                        track.config.showCHH = this.checked;
                        track.changed();
                    }
                }
            ]);
        }
        return options;
    },
    
    
    /* determine if the methylation context is shown to save time when drawing */
    _isShown: function( id ){
        if( id == 'cg')
            return this.config.showCG;
        else if(this.config.isAnimal) // ch
            return (this.config.showCHG && this.config.showCHH)
        else if (id == 'chg')
            return this.config.showCHG;
        else if( id == 'chh' )
            return this.config.showCHH;
        else
            return false;
    },

    _getConfigColor: function(id) {
        if( id == 'cg' )
            return this.config.style.cg_color;
        else if(this.config.isAnimal) // ch
            return this.config.style.ch_color;
        else if( id == 'chg' )
            return this.config.style.chg_color;
        else if( id == 'chh' )
            return this.config.style.chh_color;
        else
            return 'black';

    },
    
    _getFeatureColor: function(id){
        var color = new Color(this._getConfigColor(id));
        color.a = 0.8;
        return color.toString();
    }
});

return XYPlot;
});
