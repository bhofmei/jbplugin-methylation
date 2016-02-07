require({cache:{
'JBrowse/Plugin':function(){
define("JBrowse/Plugin", [
           'dojo/_base/declare',
           'JBrowse/Component'
       ],
       function( declare, Component ) {
return declare( Component,
{
    constructor: function( args ) {
        this.name = args.name;
        this.cssLoaded = args.cssLoaded;
        this._finalizeConfig( args.config );
    },

    _defaultConfig: function() {
        return {
            baseUrl: '/plugins/'+this.name
        };
    }
});
});
}}});
define('MethylationPlugin/main',[ 
      'dojo/_base/declare',
    'dojo/_base/array',
    'dojo/_base/lang',
            'dojo/Deferred',
            'dojo/dom-construct',
            'dijit/form/Button',
            'dojo/fx',
            'dojo/dom',
            'dojo/dom-style',
            'dojo/on',
            'dojo/query',
            'dojo/dom-geometry',
      'JBrowse/Plugin',
    'dijit/MenuItem',
    "JBrowse/Browser",
    'JBrowse/View/Dialog/SetTrackHeight',
      './Store/SeqFeature/MethylBigWig',
      './View/Track/Wiggle/MethylXYPlot'
       ],
       function(
           declare,
            array,
            lang,
           Deferred,
           domConstruct,
           dijitButton,
           coreFx,
           dom,
           style,
           on,
           query,
           domGeom,
           JBrowsePlugin,
            dijitMenuItem,
            Browser,
            SetTrackHeightDialog,
           BigWig,
           MethylXYPlot
       ){
 
return declare( JBrowsePlugin,
{
    constructor: function( args ) {
        
        // create the hide/show button after genome view initialization
        
        var baseUrl = this._defaultConfig().baseUrl;
        var thisB = this;
        var browser = this.browser;
        browser.afterMilestone( 'initView', function() {

            var navBox = dojo.byId("navbox");

            browser.hideCGButton = new dijitButton(
            {
                title: "Show/Hide CG Methylation",
                id: "hidecg-btn",
                width: "22px",
                onClick: dojo.hitch( thisB, function(event) {
                    browser.showCGFunction();
                    dojo.stopEvent(event);
                })
            }, dojo.create('button',{},navBox)); // end cg button
            
            browser.hideCHGButton = new dijitButton(
            {
                title: "Show/Hide CHG Methylation",
                id: "hidechg-btn",
                width: "22px",
                onClick: dojo.hitch( thisB, function(event) {
                    browser.showCHGFunction();
                    dojo.stopEvent(event);
                })
            }, dojo.create('button',{},navBox)); // end chg button
            
            browser.hideCHHButton = new dijitButton(
            {
                title: "Show/Hide CHH Methylation",
                id: "hidechh-btn",
                width: "22px",
                onClick: dojo.hitch( thisB, function(event) {
                    browser.showCHHFunction();
                    dojo.stopEvent(event);
                })
            }, dojo.create('button',{},navBox)); // end chh button
        }); // end after milestone
        
        // need to add option with browser global menus
        if(browser.config.show_nav){
        browser.afterMilestone('initView',  function() {
        browser.addGlobalMenuItem( 'view', new dijitMenuItem({
                label: 'Resize methylation tracks',
                id: 'menubar_setmethyltrackheight',
                title: 'Set all visible methylation tracks to a new height',
                iconClass: 'jbrowseIconVerticalResize',
                onClick: function() {
                    new SetTrackHeightDialog({
                        height: 50,
                        setCallback: function( height ) {
                            var tracks = browser.view.visibleTracks();
                            array.forEach( tracks, function( track ) {
                                // operate only on XYPlot or Density tracks
                                if( ! /\b(MethylXYPlot)/.test( track.config.type ) ){
                                    return;
                                }
                                track.trackHeightChanged=true;
                                track.updateUserStyles({ height: height });
                            });
                        }
                    }).show();
                }
            }));
        });
        }   // end browser.config.show_nav

        browser.showCGFunction = function() {
            // does the hide/show button exists yet?
            if (dojo.byId('hidecg-btn')==null) return;

            var isShow = true;

            if (dojo.hasAttr(dom.byId("hidecg-btn"),"hidden-cg")) {     // if hidden, show
                dojo.removeAttr(dom.byId("hidecg-btn"),"hidden-cg");
                isShow = true;
            }else {
                dojo.attr(dom.byId("hidecg-btn"),"hidden-cg","");       // if shown, hide
                isShow = false;
            }
            
            var tracks = browser.view.visibleTracks();
            array.forEach( tracks, function( track ) {
                // operate only on XYPlot or Density tracks
                if( ! /\b(MethylXYPlot)/.test( track.config.type ) )
                return;
                track.config.showCG = isShow;
                track.changed();
            });
            // protect Hide button from clicks durng animation
            dojo.attr(dom.byId("hidecg-btn"),"disabled","");
            setTimeout(function(){
                dojo.removeAttr(dom.byId("hidecg-btn"),"disabled");
            }, 1000);
        }
        
        browser.showCHGFunction = function() {
            // does the hide/show button exists yet?
            if (dojo.byId('hidechg-btn')==null) return;
            
            var isShow = true;

            if (dojo.hasAttr(dom.byId("hidechg-btn"),"hidden-chg")) {     // if hidden, show
                dojo.removeAttr(dom.byId("hidechg-btn"),"hidden-chg");
                isShow = true;
            }else {
                dojo.attr(dom.byId("hidechg-btn"),"hidden-chg","");       // if shown, hide
                isShow = false;
            }
            var tracks = browser.view.visibleTracks();
            array.forEach( tracks, function( track ) {
                // operate only on XYPlot or Density tracks
                if( ! /\b(MethylXYPlot)/.test( track.config.type ) )
                return;
                track.config.showCHG = isShow;
                track.changed();
            });
            // protect Hide button from clicks durng animation
            dojo.attr(dom.byId("hidechg-btn"),"disabled","");
            setTimeout(function(){
                dojo.removeAttr(dom.byId("hidechg-btn"),"disabled");
            }, 1000);
        }
        
        browser.showCHHFunction = function() {
            // does the hide/show button exists yet?
            if (dojo.byId('hidechh-btn')==null) return;
            
            var isShow = true;

            if (dojo.hasAttr(dom.byId("hidechh-btn"),"hidden-chh")) {     // if hidden, show
                dojo.removeAttr(dom.byId("hidechh-btn"),"hidden-chh");
                isShow = true;
            }else {
                dojo.attr(dom.byId("hidechh-btn"),"hidden-chh","");       // if shown, hide
                isShow = false;
            }
            var tracks = browser.view.visibleTracks();
            array.forEach( tracks, function( track ) {
                // operate only on XYPlot or Density tracks
                if( ! /\b(MethylXYPlot)/.test( track.config.type ) )
                return;
                track.config.showCHH = isShow;
                track.changed();
            });
            // protect Hide button from clicks durng animation
            dojo.attr(dom.byId("hidechh-btn"),"disabled","");
            setTimeout(function(){
                dojo.removeAttr(dom.byId("hidechh-btn"),"disabled");
            }, 1000);
        }
    }
});
});