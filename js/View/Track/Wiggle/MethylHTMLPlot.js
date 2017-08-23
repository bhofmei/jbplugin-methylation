define("MethylationPlugin/View/Track/Wiggle/MethylHTMLPlot", [
  'dojo/_base/declare',
  'dojo/_base/array',
  'dojo/_base/lang',
  'dojo/promise/all',
  'dojo/dom-construct',
  'dojo/dom-class',
  'dojo/Deferred',
  'dijit/registry',
  'JBrowse/Util',
  'MethylationPlugin/View/MethylRectLayout',
  'JBrowse/View/Track/HTMLFeatures',
  'JBrowse/View/Track/_YScaleMixin'
],
  function (
    declare,
    array,
    lang,
    all,
    domConstruct,
    domClass,
    Deferred,
    registry,
    Util,
    Layout,
    HTMLFeatures,
    YScaleMixin
  ) {

    return declare([HTMLFeatures, YScaleMixin], {

      constructor: function (args) {
        this.height = this.config.maxHeight;
        var thisB = this;
        array.forEach(registry.toArray(), function (x) {
          var i = x.id;
          if (i !== undefined && ( i.indexOf(thisB.config.label) >=0 ) && (/c.*-checkbox/.test(i) || /methylated-checkbox/.test(i)))
            registry.byId(i).destroy();
        });
      },

      _defaultConfig: function () {
        var thisB = this;
        var inher = dojo.clone(this.inherited(arguments));
        var omit = ['maxFeatureSizeForUnderlyingRefSeq', 'maxFeatureScreenDensity', 'menuTemplate', 'events'];
        var styleOmit = ['centerChildrenVertically', 'label', 'description', '_defaultHistScale', '_defaultLabelScale', '_defaultDescriptionScale', 'arrowheadClass', 'minSubfeatureWidth', 'maxDescriptionLength', 'showLabels'];
        array.forEach(omit, function (elt) {
          delete inher[elt];
        });
        array.forEach(styleOmit, function (elt) {
          delete inher.style[elt];
        });
        var updated = {
          showCG: true,
          showCHG: true,
          showCHH: true,
          showMethylatedOnly: true,
          isAnimal: thisB._isAnimal(),
          methylatedOption: false,
          maxHeight: 100,
          style: {
            className: 'feature-methyl',
            origin_color: 'black',
            cg_color: '#A36085'
          },
          yScalePosition: 'center'
        };
        if(thisB._isAnimal()){
          updated.style.ch_color = '#88C043'
        } else {
          updated.style.chg_color = '#0072B2';
          updated.style.chh_color = '#CF8F00';
        }
        return Util.deepUpdate(inher, updated);
      },

      _isAnimal: function(){
        return false;
      },

      /* Functions from html tracks that need to be changed for small-rna specific purposes */
      _getLayout: function (scale) {
        if (!this.layout || this._layoutpitchX != 4 / scale) {
          // if no layoutPitchY configured, calculate it from the
          // height and marginBottom (parseInt in case one or both are functions), or default to 3 if the
          // calculation didn't result in anything sensible.
          var pitchY = this.getConf('layoutPitchY') || 1;
          this.layout = new Layout({
            pitchX: 4 / scale,
            maxHeight: this.getConf('maxHeight')
          });
          this._layoutpitchX = 4 / scale;
        }

        return this.layout;
      },

      addFeatureToBlock: function (feature, uniqueId, block, scale,
        containerStart, containerEnd) {

        var featDiv = this.renderFeature(feature, uniqueId, block, scale,
          containerStart, containerEnd);
        if (!featDiv)
          return null;
        block.domNode.appendChild(featDiv);

        return featDiv;
      },

      renderFilter: function (feature) {
        var isMethylated;
        var score = feature.get('score');
        var source = feature.get('source');

        if (this.config.methylatedOption) {
          if (feature.get('methylated') === undefined) {
            isMethylated = this._getScoreInfo(score);
            feature.set('methylated', isMethylated);
          } else {
            isMethylated = feature.get('methylated');
          }
        } else {
          isMethylated = true;
        }

        if (this.config.showMethylatedOnly && !isMethylated)
          return false;

        if (source == 'cg')
          return this.config.showCG;
        else if (this.config.isAnimal) // ch
          return (this.config.showCHG && this.config.showCHH);
        else if (source == 'chg')
          return this.config.showCHG;
        else if (source === 'chh')
          return this.config.showCHH;
        else
          return false;

      },

      _getScoreInfo: function (inputScore) {
        var flStr = inputScore.toFixed(7);
        var isMethylated = parseInt(flStr.charAt(flStr.length - 1))
        return isMethylated;
      },

      fillFeatures: function (args) {
        var blockIndex = args.blockIndex;
        var block = args.block;
        var leftBase = args.leftBase;
        var rightBase = args.rightBase;
        var scale = args.scale;
        var stats = args.stats;
        var containerStart = args.containerStart;
        var containerEnd = args.containerEnd;
        var finishCallback = args.finishCallback;
        var browser = this.browser;


        this.scale = scale;

        block.featureNodes = {};

        //determine the glyph height, arrowhead width, label text dimensions, etc.

        var curTrack = this;

        var featCallback = dojo.hitch(this, function (feature) {
          var uniqueId = feature.id();
          if (!this._featureIsRendered(uniqueId)) {
            if (this.filterFeature(feature)) {

              // hook point
              var render = true;
              if (typeof this.renderFilter === 'function')
                render = this.renderFilter(feature);

              if (render) {
                this.addFeatureToBlock(feature, uniqueId, block, scale, containerStart, containerEnd);
              }
            }
          }
        });

        this.store.getFeatures({
            ref: this.refSeq.name,
            start: leftBase,
            end: rightBase
          },
          featCallback,
          function (args) {
            curTrack.heightUpdate(curTrack._getLayout(scale).getTotalHeight(),
              blockIndex);
            if (args && args.maskingSpans) {
              //note: spans have to be inverted
              var invSpan = [];
              invSpan[0] = {
                start: leftBase
              };
              var i = 0;
              for (var span in args.maskingSpans) {
                if (args.maskingSpans.hasOwnProperty(span)) {
                  span = args.maskingSpans[span];
                  invSpan[i].end = span.start;
                  i++;
                  invSpan[i] = {
                    start: span.end
                  };
                }
              }
              invSpan[i].end = rightBase;
              if (invSpan[i].end <= invSpan[i].start) {
                invSpan.splice(i, 1);
              }
              if (invSpan[0].end <= invSpan[0].start) {
                invSpan.splice(0, 1);
              }
              curTrack.maskBySpans(invSpan, args.maskingSpans);
            }
            curTrack.renderOrigin(block, curTrack.layout.getOriginY());
            curTrack.removeYScale();
            curTrack.makeYScale({
              min: -1,
              max: 1
            });
            finishCallback();
          },
          function (error) {
            console.error(error, error.stack);
            curTrack.fillBlockError(blockIndex, block, error);
            finishCallback();
          }
        );
      },

      renderFeature: function (feature, uniqueId, block, scale, containerStart, containerEnd) {

        var featureEnd = feature.get('end');
        var featureStart = feature.get('start');
        if (typeof featureEnd == 'string')
          featureEnd = parseInt(featureEnd);
        if (typeof featureStart == 'string')
          featureStart = parseInt(featureStart);
        var layoutStart = featureStart;
        var layoutEnd = featureEnd;

        var score = feature.get('score');
        var source = feature.get('source');
        var strand = (score >= 0 ? 1 : -1);
        feature.set('strand', strand);

        layoutEnd += Math.max(1, this.padding / scale);

        var layoutData = this._getLayout(scale)
          .addRect(uniqueId,
            layoutStart,
            layoutEnd,
            score,
            feature);
        var top = layoutData.top;
        var featHeight = layoutData.height;

        var featDiv = this.config.hooks.create(this, feature);
        //this._connectFeatDivHandlers(featDiv);
        // NOTE ANY DATA SET ON THE FEATDIV DOM NODE NEEDS TO BE
        // MANUALLY DELETED IN THE cleanupBlock METHOD BELOW
        featDiv.track = this;
        featDiv.feature = feature;
        featDiv.layoutEnd = layoutEnd;

        // border values used in positioning boolean subfeatures, if any.
        featDiv.featureEdges = {
          s: Math.max(featDiv.feature.get('start'), containerStart),
          e: Math.min(featDiv.feature.get('end'), containerEnd)
        };

        // (callbackArgs are the args that will be passed to callbacks
        // in this feature's context menu or left-click handlers)
        featDiv.callbackArgs = [this, featDiv.feature, featDiv];

        block.featureNodes[uniqueId] = featDiv;

        // record whether this feature protrudes beyond the left and/or right side of the block
        if (layoutStart < block.startBase) {
          if (!block.leftOverlaps) block.leftOverlaps = [];
          block.leftOverlaps.push(uniqueId);
        }
        if (layoutEnd > block.endBase) {
          if (!block.rightOverlaps) block.rightOverlaps = [];
          block.rightOverlaps.push(uniqueId);
        }
        // update
        domClass.add(featDiv, "feature");
        var className = this.config.style.className;
        domClass.add(featDiv, className);

        var displayStart = Math.max(featureStart, containerStart);
        var displayEnd = Math.min(featureEnd, containerEnd);
        var blockWidth = block.endBase - block.startBase;
        var featColor = this._getConfigColor(source);
        var featwidth = 100 * ((displayEnd - displayStart) / blockWidth);
        featDiv.style.cssText =
          "left:" + (100 * (displayStart - block.startBase) / blockWidth) + "%;" +
          "top:" + top + "px;" +
          " width:" + featwidth + "%;" +
          " height:" + Math.min(featHeight, 50) + "px;" +
          " background-color:" + featColor + ";";

        // Store the containerStart/End so we can resolve the truncation
        // when we are updating static elements
        featDiv._containerStart = containerStart;
        featDiv._containerEnd = containerEnd;

        // fill in the template parameters in the featDiv and also for the labelDiv (see below)
        var context = lang.mixin({
          track: this,
          feature: feature,
          callbackArgs: [this, feature]
        });

        return featDiv;
      },

      renderOrigin: function (block, originY) {
        var originColor = this.config.style.origin_color;
        if (typeof originColor == 'string' && !{
            'none': 1,
            'off': 1,
            'no': 1,
            'zero': 1
          }[originColor]) {
          var origin = domConstruct.create('div', {
            style: {
              background: originColor,
              height: '1px',
              width: '100%',
              top: originY + 'px'
            },
            className: 'feature methyl-origin'
          }, block.domNode);
        }
      },

      _getConfigColor: function (id) {
        if (id == 'cg')
          return this.config.style.cg_color;
        else if (this.config.isAnimal) // ch
          return this.config.style.ch_color;
        else if (id == 'chg')
          return this.config.style.chg_color;
        else if (id == 'chh')
          return this.config.style.chh_color;
        else
          return 'black';

      },

      _trackMenuOptions: function () {
        var options = this.inherited(arguments);
        options.splice(options.length - 2, 2);
        //console.log(options);
        var track = this;
        //console.log(track);
        options.push.apply(
          options, [
            {
              type: 'dijit/MenuSeparator'
              },
            {
              label: 'Show CG Methylation',
              type: 'dijit/CheckedMenuItem',
              checked: track.config.showCG,
              id: track.config.label + '-cg-checkbox',
              class: 'track-cg-checkbox',
              onClick: function (event) {
                track.config.showCG = this.checked;
                track.changed();
              }
                }
            ]);
        if (this.config.isAnimal) {
          options.push.apply(
            options, [{
                label: 'Show CH Methylation',
                type: 'dijit/CheckedMenuItem',
                checked: (track.config.showCHG && track.config.showCHH),
                id: track.config.label + '-ch-checkbox',
                class: 'track-ch-checkbox',
                onClick: function (event) {
                  track.config.showCHG = this.checked;
                  track.config.showCHH = this.checked;
                  track.changed();
                }
                }
            ]);
        } else {
          options.push.apply(
            options, [{
                label: 'Show CHG Methylation',
                type: 'dijit/CheckedMenuItem',
                checked: track.config.showCHG,
                id: track.config.label + '-chg-checkbox',
                class: 'track-chg-checkbox',
                onClick: function (event) {
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
                onClick: function (event) {
                  track.config.showCHH = this.checked;
                  track.changed();
                }
                }
            ]);
        }
        if (this.config.methylatedOption) {
          options.push.apply(
            options, [
              {
                label: 'Show Methylated Sites Only',
                type: 'dijit/CheckedMenuItem',
                checked: track.config.showMethylatedOnly,
                id: track.config.label + '-methylated-checkbox',
                //class: 'track-cg-checkbox',
                onClick: function (event) {
                  track.config.showMethylatedOnly = this.checked;
                  track.changed();
                }
                }
            ]);
        }
        return options;
      }

    });
  });
