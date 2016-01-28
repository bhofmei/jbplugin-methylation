define('MethylationPlugin/main', [ 
      'dojo/_base/declare',
      'JBrowse/Plugin',
      './Store/SeqFeature/MethylBigWig',
      './View/Track/Wiggle/MethylXYPlot'
       ],
       function(
           declare,
           JBrowsePlugin,
           BigWig,
           MethylXYPlot
       ) {
 
return declare( JBrowsePlugin,
{
    constructor: function( args ) {
        var browser = this.browser;
        
    }
});
 
});
