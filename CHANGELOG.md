# Release Notes for Methylation Plugin

## [Unreleased]
- FIXED error with canvas methylation not displaying
- UPDATED allc to bigwig script to handle gzip allc files

## [v3.3.2f] - 2018-10-09
- Fungi Methylome specific coloring

## [v3.3.2] - 2018-07-10
- ADDED dialog mode which opens dialog immediately after loading tracks
  - useful for screenshots
- FIXED error where no methylation was shown
  - caused by change in JBrowse which didn't store BigWig source during feature creation
  - added source information after feature is created if not already specified

## [v3.3.1] - 2017-09-15
- ADDED 5hmC to extended modifications

## [v3.3.0] - 2017-09-07
- FIXED issue with animal configuration coloring when coloring was track specific
- FIXED issue not showing fully methylated positions
- UPDATED track menu to only include checkboxes for contexts present
- ADDED "extended modifications" option which supports m4C and m6A
  - additional bigwig files
  - even when activated, CG/CHG/CHH are the default contexts
  - to include m4C and/or m6A, must be included in the "context" property of track configuration
  - nav bar has single button that opens a dialog to filter sequence contexts
- UPDATED test data to include context combinations and animal coloring
- UPDATED bigwig so users can use "CH" context when specifying context in trackList, and converts to "CHG" and "CHH"

## [v3.2.0] - 2017-08-29
- UPDATED stats for tracks
  - context specific bases covered, min, max, and mean
  - overall bases covered and mean

## [v3.1.2] - 2017-08-22
- FIXED bug with animal coloring

## [v3.1.1] - 2017-08-17
- minor bug fixes

## [v3.1.0] - 2017-08-08
- ADDED HTML style methylation tracks
    - each feature is now a html div element not painted to the canvas
    - this will be beneficial for screenshots since html div elements are editable in pdf/svg format

## [v3.0.3] - 2017-08-02
- minor bug fix with methylated option checkbox not being destroyed on chrm change

## [v3.0.2] - 2017-07-13
- FIXED error where the String method "includes" was not being supported by phantomJS

## [v3.0.1] - 2017-06-20
- Changed default of MethylPlot to only show methylated positions by default
- Added print statement to plugin constructor

## [v3.0.0] - 2017-06-19
- Updated MethylPlot with a "ShowMethylatedOnly" option, when checked, it only shows "methylated" sites
    - Methylated sites are determined by the value in the bigwig file
    - Methylated sites have "1" in the 7th decimal position; unmethylated sites have "0"
    - This only works when bigwig files have been converted using `allc_to_bigwig_pe_v3.py` option
    - When this option is used for bigwig files converted with a different script, results will be incorrect.
- For tracks converted with "allc_to_bigwig_pe_v3.py", use the "methylatedOption = true" in the configuration file.
- Also updated to score mouseover score values are only shown for visible sites

## [v2.3.1] - 2017-04-12
- ADDED testing with jasmine

## [v2.3.1] - 2016-10-03
- FIXED issue with track checkbox id's

## [v2.3.0] - 2016-08-26
- ADDED animal-specific coloring

## [v2.2.1] -2016-08-04
- FIXED bug where specifying methylation contexts was ignored

## [v2.2.0] - 2016-08-03
- MethylBigWig uses lowest common zoom level between the contexts of the same track
  - previously, contexts could appear very different at certain zooms because they had different number of zoom levels

## [v2.1.2] - 2016-07-22
- showCG, showCHG, showCHH are part of default configs 
- this change is important for the screenshot plugin to work properly

## [v2.1.1] - 2016-06-26
- FIXED error with track checkboxes id when changing reference sequences

## [v2.1.0] - 2016-06-26
- Additional configuration option "context" that searches only for the specified contexts
  - necessary when not all (CG, CHG, CHH) are present
  - necessary when file extensions are not exactly '.bw.cg', '.bw.chg', '.bw.chh'
  - if not specified and file is missing, error is displayed on screen rather than ignoring the context

## [v2.0.1] - 2016-06-24
- REMOVED flag colors because they didn't work well with overlapping features

## [v2.0.0‘ - 2016-06-24
- Prefered methylation visualization track type "MethylPlot" which uses the "MethylBigWig" Store
  - MethylBigWig looks for three separate BigWig files based on context
  - Fixes the issues with context for zooming
- Older methylation track is still supported as the MethylXYPlot using BigWig store.
- New methylation track also uses color in mouseover value flags

## [v1.2.2] - 2016-05-19
- corrected track menu check boxes so it agrees with the toolbar enable/disable
- track menu checkboxes have color that indicate methylation context 

## [v1.2.1] - 2016-02-15
- UPDATED the methylation colors and buttons to be red-green color blind friendly
- UPDATED allc_to_bigwig_pe.py script that renames chromosomes

## [v1.2.0] - 2016-02-07
- ADDED toolbar buttons to turn on/off methylation contexts for all tracks

## [v1.1.0] - 2016-02-05
- ADDED allC_to_bigwig.py script to be able to convert allC files
- ADDED menu option to be able to change the height of all methylation tracks at once

## [v1.0.0] - 2016-01-24
- Initial release
- Allows context-specific methylation data to be displayed in JBrowse
