define([
    'dojo/_base/declare',
    'dojo/_base/array',
    'dojo/_base/lang',
    'dojo/Deferred',
    'dojo/dom-construct',
    'dojo/dom-attr',
    'dijit/form/Button',
    'dojo/fx',
    'dojo/dom',
    'dojo/dom-style',
    'dojo/on',
    'dojo/query',
    'dojo/dom-geometry',
    "dijit/registry",
    'JBrowse/Plugin',
    'JBrowse/Util',
    'dijit/MenuItem',
    "JBrowse/Browser",
    'JBrowse/View/Dialog/SetTrackHeight',
    './View/Track/Wiggle/MethylXYPlot',
    './View/Track/Wiggle/MethylPlot',
     './View/Track/Wiggle/MethylHTMLPlot',
  './View/Dialog/MethylFilterDialog',
    './Store/SeqFeature/MethylBigWig'
],
  function (
    declare,
    array,
    lang,
    Deferred,
    domConstruct,
    domAttr,
    dijitButton,
    coreFx,
    dom,
    style,
    on,
    query,
    domGeom,
    registry,
    JBrowsePlugin,
    Util,
    dijitMenuItem,
    Browser,
    SetTrackHeightDialog,
    MethylXYPlot,
    MethylPlot,
    MethyHTMLPlot,
    MethylFilterDialog,
    MethylBigWig
  ) {

    return declare(JBrowsePlugin, {
      constructor: function (args) {
        this.config.version = '3.3.2';
        console.log('MethylationPlugin starting - v' + this.config.version);
        // create the hide/show button after genome view initialization
        var baseUrl = this._defaultConfig().baseUrl;
        var thisB = this;
        var browser = this.browser;
        this.config.isAnimal = false;
        if (browser.config.isAnimal === true || args.isAnimal === true) {
          this.config.isAnimal = true;
        }
        // if animal, extend new default config functions for MethylPlot and MethylXYPlot
        if (this.config.isAnimal) {
          lang.extend(MethylPlot, {
            _isAnimal: thisB._isAnimal
          });
          lang.extend(MethyHTMLPlot, {
            _isAnimal: thisB._isAnimal
          });
        }
        this.config.extendedMods = false;
        if (args.extendedModifications === true) {
          this.config.extendedMods = true;
        }
        if (this.config.extendedMods) {
          lang.extend(MethylPlot, {
            _extendedModConfig: thisB._extendedModConfig
          });
          lang.extend(MethyHTMLPlot, {
            _extendedModConfig: thisB._extendedModConfig
          });
        }
        // dialog demo
        this.config.dialog = false;
        if (args.dialogMode === true) {
          this.config.dialog = true;
        }
        // register the track types
        browser.registerTrackType({
          label: 'MethylPlot',
          type: 'MethylationPlugin/View/Track/Wiggle/MethylPlot'
        });
        browser.registerTrackType({
          label: 'MethylXYPlot',
          type: 'MethylationPlugin/View/Track/Wiggle/MethylXYPlot'
        });
        browser.registerTrackType({
          label: 'MethylHTMLPlot',
          type: 'MethylationPlugin/View/Track/Wiggle/MethylHTMLPlot'
        });
        //
        browser.afterMilestone('initView', function () {
          var navBox = dom.byId("navbox");
          if (thisB.config.extendedMods) {
            // dialog button
            browser.methylDialogButton = new dijitButton({
              title: "Filter methylation tracks by context",
              id: 'methyl-filter-btn',
              width: '22px',
              onClick: function () {
                new MethylFilterDialog({
                  browser: browser,
                  config: thisB.config,
                  setCallback: function (options) {
                    thisB.config = options;
                  }
                }).show();
              }
            }, domConstruct.create('button', {}, navBox))
          } else {
            browser.hideCGButton = new dijitButton({
              title: "Show/Hide CG Methylation",
              id: "hidecg-btn",
              width: "22px",
              onClick: lang.hitch(thisB, function (event) {
                browser._showCGFunction();
                dojo.stopEvent(event);
              })
            }, domConstruct.create('button', {}, navBox)); // end cg button
            if (thisB.config.isAnimal) {
              // Animal CH
              browser.hideCHButton = new dijitButton({
                title: "Show/Hide CH Methylation",
                id: "hidech-btn",
                width: "22px",
                onClick: lang.hitch(thisB, function (event) {
                  browser._showCHFunction();
                  dojo.stopEvent(event);
                })
              }, domConstruct.create('button', {}, navBox)); // end ch button
            } else {
              // Plant CHG and CHH
              browser.hideCHGButton = new dijitButton({
                title: "Show/Hide CHG Methylation",
                id: "hidechg-btn",
                width: "22px",
                onClick: lang.hitch(thisB, function (event) {
                  browser._showCHGFunction();
                  dojo.stopEvent(event);
                })
              }, domConstruct.create('button', {}, navBox)); // end chg button

              browser.hideCHHButton = new dijitButton({
                title: "Show/Hide CHH Methylation",
                id: "hidechh-btn",
                width: "22px",
                onClick: lang.hitch(thisB, function (event) {
                  browser._showCHHFunction();
                  dojo.stopEvent(event);
                })
              }, domConstruct.create('button', {}, navBox)); // end chh button
            }
          } // end else
        }); // end after milestone

        // dialog mode open dialog
        if(this.config.dialog && this.config.extendedMods){
          browser.afterMilestone('completely initialized', function(){
            if(browser.view.tracks.length < 1){
              setTimeout(function(){
            var button = registry.byId('methyl-filter-btn');
            button.onClick();
                }, 700)
            }
        }); // end milestone completely initialized
        }

        // need to add option with browser global menus
        if (browser.config.show_nav) {
          browser.afterMilestone('initView', function () {
            browser.addGlobalMenuItem('view', new dijitMenuItem({
              label: 'Resize methylation tracks',
              id: 'menubar_setmethyltrackheight',
              title: 'Set all visible methylation tracks to a new height',
              iconClass: 'jbrowseIconVerticalResize',
              onClick: function () {
                new SetTrackHeightDialog({
                  height: 50,
                  setCallback: function (height) {
                    var tracks = browser.view.visibleTracks();
                    array.forEach(tracks, function (track) {
                      // operate only MethylXYPlot and MethylPlot tracks
                      if (!(/\b(Methyl.*Plot)/.test(track.config.type))) {
                        return;
                      }
                      track.trackHeightChanged = true;
                      track.updateUserStyles({
                        height: height
                      });
                    });
                  }
                }).show();
              }
            }));
          });
        } // end browser.config.show_nav

        browser._showCGFunction = function () {
          // does the hide/show button exists yet?
          if (dom.byId('hidecg-btn') == null) return;

          var isShow = true;

          if (domAttr.has(dom.byId("hidecg-btn"), "hidden-cg")) { // if hidden, show
            domAttr.remove(dom.byId("hidecg-btn"), "hidden-cg");
            isShow = true;
          } else {
            domAttr.set(dom.byId("hidecg-btn"), "hidden-cg", ""); // if shown, hide
            isShow = false;
          }

          var tracks = browser.view.visibleTracks();
          array.forEach(tracks, function (track) {
            // operate only on XYPlot or Density tracks
            if (!(/\b(Methyl.*Plot)/.test(track.config.type)))
              return;
            track.config.showCG = isShow;
            track.changed();
            var cssLabel = track.config.label.replace(/\./g, '-');
            var mark = registry.byId(cssLabel + '-cg-checkbox');
            if (mark)
              mark.set("checked", isShow);
          });
          // protect Hide button from clicks durng animation
          domAttr.set(dom.byId("hidecg-btn"), "disabled", "");
          setTimeout(function () {
            domAttr.remove(dom.byId("hidecg-btn"), "disabled");
          }, 1000);
        }

        browser._showCHFunction = function () {
          // does the hide/show button exists yet?
          if (dom.byId('hidech-btn') == null) return;

          var isShow = true;

          if (domAttr.has(dom.byId("hidech-btn"), "hidden-ch")) { // if hidden, show
            domAttr.remove(dom.byId("hidech-btn"), "hidden-ch");
            isShow = true;
          } else {
            domAttr.set(dom.byId("hidech-btn"), "hidden-ch", ""); // if shown, hide
            isShow = false;
          }

          var tracks = browser.view.visibleTracks();
          array.forEach(tracks, function (track) {
            if (!(/\b(Methyl.*Plot)/.test(track.config.type)))
              return;
            track.config.showCHG = isShow;
            track.config.showCHH = isShow;
            track.changed();
            var cssLabel = track.config.label.replace(/\./g, '-');
            var mark;
            if (track.config.isAnimal) {
              mark = registry.byId(cssLabel + '-ch-checkbox');
              if (mark)
                mark.set("checked", isShow);
            } else {
              mark = registry.byId(cssLabel + '-chg-checkbox');
              if (mark)
                mark.set("checked", isShow);
              mark = registry.byId(cssLabel + '-chh-checkbox');
              if (mark)
                mark.set("checked", isShow);
            }
          });
          // protect Hide button from clicks durng animation
          domAttr.set(dom.byId("hidech-btn"), "disabled", "");
          setTimeout(function () {
            domAttr.remove(dom.byId("hidech-btn"), "disabled");
          }, 1000);
        }

        browser._showCHGFunction = function () {
          // does the hide/show button exists yet?
          if (dom.byId('hidechg-btn') == null) return;

          var isShow = true;

          if (domAttr.has(dom.byId("hidechg-btn"), "hidden-chg")) { // if hidden, show
            domAttr.remove(dom.byId("hidechg-btn"), "hidden-chg");
            isShow = true;
          } else {
            domAttr.set(dom.byId("hidechg-btn"), "hidden-chg", ""); // if shown, hide
            isShow = false;
          }
          var tracks = browser.view.visibleTracks();
          array.forEach(tracks, function (track) {
            // operate only on XYPlot or Density tracks
            if (!(/\b(Methyl.*Plot)/.test(track.config.type)))
              return;
            track.config.showCHG = isShow;
            track.changed();
            var cssLabel = track.config.label.replace(/\./g, '-');
            var mark;
            if (track.config.isAnimal) {
              mark = registry.byId(cssLabel + '-ch-checkbox');
              if (mark)
                mark.set("checked", isShow);
            } else {
              mark = registry.byId(cssLabel + '-chg-checkbox');
              if (mark)
                mark.set("checked", isShow);
            }
          });
          // protect Hide button from clicks durng animation
          domAttr.set(dom.byId("hidechg-btn"), "disabled", "");
          setTimeout(function () {
            domAttr.remove(dom.byId("hidechg-btn"), "disabled");
          }, 1000);
        }

        browser._showCHHFunction = function () {
          // does the hide/show button exists yet?
          if (dom.byId('hidechh-btn') == null) return;

          var isShow = true;

          if (domAttr.has(dom.byId("hidechh-btn"), "hidden-chh")) { // if hidden, show
            domAttr.remove(dom.byId("hidechh-btn"), "hidden-chh");
            isShow = true;
          } else {
            domAttr.set(dom.byId("hidechh-btn"), "hidden-chh", ""); // if shown, hide
            isShow = false;
          }
          var tracks = browser.view.visibleTracks();
          array.forEach(tracks, function (track) {
            // operate only on XYPlot or Density tracks
            if (!(/\b(Methyl.*Plot)/.test(track.config.type)))
              return;
            track.config.showCHH = isShow;
            track.changed();
            var cssLabel = track.config.label.replace(/\./g, '-');
            var mark;
            if (track.config.isAnimal) {
              mark = registry.byId(cssLabel + '-ch-checkbox');
              if (mark)
                mark.set("checked", isShow);
            } else {
              mark = registry.byId(cssLabel + '-chh-checkbox');
              if (mark)
                mark.set("checked", isShow);
            }
          });
          // protect Hide button from clicks durng animation
          domAttr.set(dom.byId("hidechh-btn"), "disabled", "");
          setTimeout(function () {
            domAttr.remove(dom.byId("hidechh-btn"), "disabled");
          }, 1000);
        }
      },

      _isAnimal: function () {
        return true;
      },

      _extendedModConfig: function () {
        return true;
      }
    });
  });
