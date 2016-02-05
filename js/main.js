define('MethylationPlugin/main',[ 
      'dojo/_base/declare',
    'dojo/_base/array',
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
        var browser = this.browser;
        
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
        //browser.renderGlobalMenu( 'view', {text: 'View'}, browser.menuBar );
        });
        }
    }
});
});