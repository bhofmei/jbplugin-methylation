define('MethylationPlugin/View/Track/Wiggle/MethylPlot', [
  'dojo/_base/declare',
  'dojo/_base/lang',
  'dojo/_base/array',
  'dojo/_base/Color',
  'dojo/dom',
  'dojo/dom-construct',
  "dijit/registry",
  'dojo/on',
  'JBrowse/View/Track/WiggleBase',
  'JBrowse/View/Track/_YScaleMixin',
  'JBrowse/Util',
  'JBrowse/View/Track/Wiggle/_Scale',
  'JBrowse/View/Track/Wiggle/XYPlot'
],
  function (
    declare,
    lang,
    array,
    Color,
    dom,
    domConstruct,
    registry,
    on,
    WiggleBase,
    YScaleMixin,
    Util,
    Scale,
    XYPlot
  ) {

    var MethylPlot = declare([XYPlot],

      /**
       * Wiggle track that shows data with an X-Y plot for multiple mthylation contexts
       * Inspired by: https://github.com/LyonsLab/coge/blob/master/web/js/jbrowse/plugins/CoGe/js/View/Track/Wiggle/MultiXYPlot.js
       * and https://github.com/cmdcolin/multibigwig
       */
      {
        constructor: function (args) {
          var thisB = this;

          // handle chg/chh vs ch color
          if (this.config.isAnimal) {
            delete this.config.style.chg_color;
            delete this.config.style.chh_color;
          } else {
            delete this.config.style.ch_color;
          }

          // handle extended mod colors and shows contexts
          if (!thisB._extendedModConfig()) {
            delete this.config.style['4mc_color'];
            delete this.config.style['5hmc_color'];
            delete this.config.style['6ma_color'];
            delete this.config.show4mC;
            delete this.config.show5hmC
            delete this.config.show6mA;
          }

          //this.config.context = this.store.config.context || this.config.context;
          if(this.store && this.store.hasOwnProperty('config') && this.store.config.hasOwnProperty('context')){
            this.config.context = this.store.config.context;
          }
          this.cssLabel = this.config.label.replace(/\./g, '-');

          array.forEach(registry.toArray(), function (x) {
            var i = x.id;
            if (i !== undefined && (i.indexOf(thisB.cssLabel) >= 0) && (/c[g|h]{1,2}-checkbox/.test(i) || /methylated-checkbox/.test(i) || /\dh?m.-checkbox/.test(i)))
              registry.byId(i).destroy();
          });
          //console.log(JSON.stringify(this.config));
        },

        _defaultConfig: function () {
          var thisB = this;
          var inher = lang.clone(this.inherited(arguments));
          var styleOmit = ['pos_color', 'neg_color', ' variance_band_color'];
          array.forEach(styleOmit, function (elt) {
            delete inher.style[elt];
          });
          var updated = {
            logScaleOption: false,
            methylatedOption: false,
            max_score: 1,
            min_score: -1,
            style: {
              origin_color: 'gray',
              cg_color: '#A36085',
              chg_color: '#0072B2',
              chh_color: '#CF8F00',
              ch_color: '#88C043',
              '4mc_color': '#5ABFA9',
              '5hmc_color': '#990623',
              '6ma_color': '#936EE7'
            },
            showCG: true,
            showCHG: true,
            showCHH: true,
            show4mC: true,
            show6mA: true,
            show5hmC: true,
            showMethylatedOnly: true,
            isAnimal: thisB._isAnimal()
          };
          return Util.deepUpdate(inher, updated);
        },

        _isAnimal: function () {
          return false;
        },

        _extendedModConfig: function () {
          return false;
        },

        _draw: function (scale, leftBase, rightBase, block, canvas, features, featureRects, dataScale, pixels, spans) {
          this._preDraw(scale, leftBase, rightBase, block, canvas, features, featureRects, dataScale);

          this._drawFeatures(scale, leftBase, rightBase, block, canvas, features, featureRects, dataScale);

          if (spans) {
            this._maskBySpans(scale, leftBase, rightBase, block, canvas, pixels, dataScale, spans);
          }
          this._postDraw(scale, leftBase, rightBase, block, canvas, features, featureRects, dataScale);
        },
        /**
         * Draw a set of features on the canvas.
         * @private
         */
        _drawFeatures: function (scale, leftBase, rightBase, block, canvas, features, featureRects, dataScale) {
          //console.log('_drawFeatures');
          var config = this.config;
          var context = canvas.getContext('2d');
          var canvasHeight = canvas.height;

          var ratio = Util.getResolution(context, this.browser.config.highResolutionMode);
          var toY = lang.hitch(this, function (val) {
            return canvasHeight * (1 - dataScale.normalize(val)) / ratio;
          });
          var originY = toY(dataScale.origin);
          var disableClipMarkers = this.config.disable_clip_markers;

          var fFeatures = [];
          array.forEach(features, function (f, i) {
            fFeatures.push({
              feature: f,
              featureRect: featureRects[i]
            });
          });
          //console.log('draw_features '+fFeatures.length);
          array.forEach(fFeatures, function (pair, i) {
            var f = pair.feature;
            var fRect = pair.featureRect;
            var score = f.get('score');
            var id = f.get('source');
            var isMethylated;
            if (config.methylatedOption) {
              if (f.get('methylated') === undefined) {
                isMethylated = this._getScoreInfo(score);
                f.set('methylated', isMethylated);
              } else {
                isMethylated = f.get('methylated');
              }
            } else {
              isMethylated = true;
            }

            fRect.t = toY(score);
            fRect.t = Math.min(canvasHeight, Math.max(fRect.t, 0));
            //console.log(fRect.t+','+canvasHeight);
            if (this._isShown(id, isMethylated)) { // if the rectangle is visible at all
              context.fillStyle = this._getFeatureColor(id);
              if (fRect.t <= originY) // bar goes upward
                context.fillRect(fRect.l, fRect.t, fRect.w, originY - fRect.t + 1);
              else // downward
                context.fillRect(fRect.l, originY, fRect.w, fRect.t - originY + 1);
            }
          }, this);
        },

        /**
         * Draw anything needed after the features are drawn.
         */
        _postDraw: function (scale, leftBase, rightBase, block, canvas, features, featureRects, dataScale) {
          //      console.log('_postDraw');
          var context = canvas.getContext('2d');
          var canvasHeight = canvas.height;

          var ratio = Util.getResolution(context, this.browser.config.highResolutionMode);
          var toY = lang.hitch(this, function (val) {
            return canvasHeight * (1 - dataScale.normalize(val)) / ratio;
          });

          // draw the origin line if it is not disabled
          var originColor = this.config.style.origin_color;
          if (typeof originColor == 'string' && !{
              'none': 1,
              'off': 1,
              'no': 1,
              'zero': 1
            }[originColor]) {
            var originY = toY(dataScale.origin);
            context.fillStyle = originColor;
            context.fillRect(0, originY, canvas.width, 1);
          }
        },

        _inList: function(inAr, search) {
          return (inAr.indexOf(search) !== -1)
        },

        _trackMenuOptions: function () {
          var options = this.inherited(arguments);
          options.splice(options.length - 1, 1)
          var track = this;
          // menu separator
          options.push({
            type: 'dijit/MenuSeparator'
          });
          var contexts = array.map(this.config.context, function (x) {
            return x.toLowerCase();
          });
          var isExtended = track._extendedModConfig();
          // m4C
          if (this._inList(contexts, '4mc')) {
            options.push({
              label: 'Show 4mC Methylation',
              type: 'dijit/CheckedMenuItem',
              checked: track.config.show4mC,
              id: track.cssLabel + '-4mc-checkbox',
              class: 'track-4mc-checkbox',
              onClick: function (event) {
                track.config.show4mC = this.checked;
                track.changed();
              }
            });
          }
          // CG
          if (this._inList(contexts, 'cg')) {
            options.push({
              label: 'Show '+(isExtended ? '5mCG' : 'CG')+' Methylation',
              type: 'dijit/CheckedMenuItem',
              checked: track.config.showCG,
              id: track.cssLabel + '-cg-checkbox',
              class: 'track-cg-checkbox',
              onClick: function (event) {
                track.config.showCG = this.checked;
                track.changed();
              }
            });
          }
          if (this.config.isAnimal && (this._inList(contexts, 'chg') || this._inList(contexts, 'chh'))) {
            options.push({
              label: 'Show '+(isExtended ? '5mCH' : 'CH')+' Methylation',
              type: 'dijit/CheckedMenuItem',
              checked: (track.config.showCHG && track.config.showCHH),
              id: track.cssLabel + '-ch-checkbox',
              class: 'track-ch-checkbox',
              onClick: function (event) {
                track.config.showCHG = this.checked;
                track.config.showCHH = this.checked;
                track.changed();
              }
            });
          } else {
            if (this._inList(contexts, 'chg')) {
              options.push({
                label: 'Show '+(isExtended ? '5mCHG' : 'CHG')+' Methylation',
                type: 'dijit/CheckedMenuItem',
                checked: track.config.showCHG,
                id: track.cssLabel + '-chg-checkbox',
                class: 'track-chg-checkbox',
                onClick: function (event) {
                  track.config.showCHG = this.checked;
                  track.changed();
                }
              });
            }
            if (this._inList(contexts, 'chh')) {
              options.push({
                label: 'Show '+(isExtended ? '5mCHH' : 'CHH')+' Methylation',
                type: 'dijit/CheckedMenuItem',
                checked: track.config.showCHH,
                id: track.cssLabel + '-chh-checkbox',
                class: 'track-chh-checkbox',
                onClick: function (event) {
                  track.config.showCHH = this.checked;
                  track.changed();
                }
              });
            }
          }
          if (this._inList(contexts, '5hmc')) {
            options.push({
              label: 'Show 5hmC Methylation',
              type: 'dijit/CheckedMenuItem',
              checked: track.config.show5hmC,
              id: track.cssLabel + '-5hmc-checkbox',
              class: 'track-5hmc-checkbox',
              onClick: function (event) {
                track.config.show5hmC = this.checked;
                track.changed();
              }
            });
          }
          if (this._inList(contexts, '6ma')) {
            options.push({
              label: 'Show 6mA Methylation',
              type: 'dijit/CheckedMenuItem',
              checked: track.config.show6mA,
              id: track.cssLabel + '-6ma-checkbox',
              class: 'track-6ma-checkbox',
              onClick: function (event) {
                track.config.show6mA = this.checked;
                track.changed();
              }
            });
          }
          if (this.config.methylatedOption) {
            options.push({
              label: 'Show Methylated Sites Only',
              type: 'dijit/CheckedMenuItem',
              checked: track.config.showMethylatedOnly,
              id: track.cssLabel + '-methylated-checkbox',
              onClick: function (event) {
                track.config.showMethylatedOnly = this.checked;
                track.changed();
              }
            });
          }
          return options;
        },

        _calculatePixelScores: function (canvasWidth, features, featureRects) {
          var thisB = this;
          var scoreType = this.config.scoreType;
          var pixelValues = new Array(canvasWidth);
          // make an array of the max score at each pixel on the canvas
          array.forEach(features, function (f, i) {
            var store = f.source;
            var id = f.get('source');
            var isMethylated;
            var score = f.get(scoreType) || f.get('score');
            if (thisB.config.methylatedOption) {
              if (f.get('methylated') === undefined) {
                isMethylated = thisB._getScoreInfo(score);
                f.set('methylated', isMethylated);
              } else {
                isMethylated = f.get('methylated');
              }
            } else {
              isMethylated = true;
            }
            var isShown = thisB._isShown(id, isMethylated);
            if (!isShown)
              return;
            var fRect = featureRects[i];
            var jEnd = fRect.r;
            for (var j = Math.round(fRect.l); j < jEnd; j++) {
              if (pixelValues[j] && pixelValues[j]['lastUsedStore'] == store) {
                /* Note: if the feature is from a different store, the condition should fail,
                 *       and we will add to the value, rather than adjusting for overlap */
                pixelValues[j]['score'] = Math.max(pixelValues[j]['score'], score);
              } else if (pixelValues[j]) {
                pixelValues[j]['score'] = pixelValues[j]['score'] + score;
                pixelValues[j]['lastUsedStore'] = store;
              } else {
                pixelValues[j] = {
                  score: score,
                  lastUsedStore: store,
                  feat: f
                };
              }
            }
          }, this);
          // when done looping through features, forget the store information.
          for (var i = 0; i < pixelValues.length; i++) {
            if (pixelValues[i]) {
              delete pixelValues[i]['lastUsedStore'];
            }
          }
          return pixelValues;
        },

        _getScoreInfo: function (inputScore) {
          var flStr = inputScore.toFixed(7);
          var isMethylated = parseInt(flStr.charAt(flStr.length - 1))
          return isMethylated;
        },

        /* determine if the methylation context is shown to save time when drawing */
        _isShown: function (id, isMethylated) {
          if (this.config.showMethylatedOnly && !isMethylated) {
            return false;
          }
          if (id == 'cg')
            return this.config.showCG;
          else if (this.config.isAnimal && (id === 'chg' || id === 'chh')) // ch
            return (this.config.showCHG && this.config.showCHH)
          else if (id == 'chg')
            return this.config.showCHG;
          else if (id == 'chh')
            return this.config.showCHH;
          else if (id === '4mc')
            return this.config.show4mC;
          else if (id === '5hmc')
            return this.config.show5hmC;
          else if (id === '6ma')
            return this.config.show6mA;
          else
            return false;
        },

        _getConfigColor: function (id) {
          if (id == 'cg')
            return this.config.style.cg_color;
          else if (this.config.isAnimal && (id === 'chg' || id === 'chh')) // ch
            return this.config.style.ch_color;
          else if (id == 'chg')
            return this.config.style.chg_color;
          else if (id == 'chh')
            return this.config.style.chh_color;
          else if (id == '4mc')
            return this.config.style['4mc_color'];
          else if (id == '5hmc')
            return this.config.style['5hmc_color'];
          else if (id == '6ma')
            return this.config.style['6ma_color'];
          else
            return 'black';
        },

        _getFeatureColor: function (id) {
          var color = new Color(this._getConfigColor(id));
          color.a = 0.8;
          return color.toString();
        }
      });

    return MethylPlot;
  });
