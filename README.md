#Methylation Plugin
This is a JBrowse plugin
 
this plugin is to be used with whole-genome bisulfite sequencing data. Unlike almost all other browsers, this plugin allows you to see all methylation contexts on one track

##Install

For JBrowse 1.11.6+ in the _JBrowse/plugins_ folder, type:  
``git clone https://github.com/bhofmei/jbplugin-methylation.git MethylationPlugin``

##Activate
Add this to jbrowse.conf:

    "plugins": [
        'MethylationPlugin'
    ],

If that doesn't work, add this to jbrowse_conf.json:

    "plugins" : {
        "MethylationPlugin" : { "location" : "plugins/MethylationPlugin" }
    }

##Using Methylation Tracks
###Versions
- Version 1 is when all contexts are in a single BigWig file. This caused problems with zooming in the browser, so version 2 was developed as a fix.
- Version 1 is still supported, but not recommended for use.
- Version 2 uses three BigWig files, one for each methylation context. The files need the same base name, like _my-file.bw_, and contexts are specified as additional extensions, i.e. _my-file.bw.cg_, _my-file.bw.chg_, and _my-file.bw.chh_.
- Even for animals, who are interested in CG and CH, use the three contexts specified here. CHG and CHH are combined by the plugin to form CH context.

###File Conversion
The methylation tracks works best when the data is stored as BigWig file(s). File conversion is easy, though. Use the conversion program appropriate to your input file type. 
_bedGraphToBigWig_ and _bedSort_ (programs from UCSC) must be on your path. See details below for acquiring this program.  
*allC Files*  
- allC files have these columns: chr, pos, strand, mc_class, mc_count, total, methylated
- By default, only _methylated_ positions are included. Use the `-all` option to include all non-zero positions.
- All chromosomes need to be combined into one allC file.
- You also need a file with chromosome sizes. This file should be tab-delimitated, one chromosome per line, with at least chromosome name and chromosome size. The genome's FASTA index (.fa.fai) file works well.
- For a given genome (i.e. chromosome sizes), you can specify an unlimited number of allC files to be converted. 
- Note: version 1 conversion renames reference sequences to a convention while version 2 does not.
- Conversion Version 1:
~~~~
     python3 allc_old_bigwig_pe.py [-keep] [-no-clean] [-sort] [-all] [-L=labels] [-p=num_proc] <chrm_sizes>  <allC_file> [allC_file]*  
    -keep           when on, keeps temporary files
    -no-clean       does not check chromosome names match chrm file
    -sort           calls bedSort; add this option if bigwig conversion fails
    -all            use all positions with methylation not just methylated ones
    -L=labels       comma-separated list of labels for incoming allC files  
    -p=num_proc     number of processors to use [default 1]  
    -o=outID        optional string to include in output file names
~~~~
*Conversion Version 2:
~~~~
     python3 allc_to_bigwig_pe.py [-keep] [-sort] [-all] [-L=labels] [-p=num_proc] <chrm_sizes>  <allC_file> [allC_file]*
     -keep\t\tkeep intermediate files
     -sort\tcalls bedSort; add this option if bigwig conversion fails
     -all\tuse all positions with methylation not just methylated ones
     -L=labels\tcomma-separated list of labels to use for the allC
     -o=out_id\toptional identifier to be added to the output file names
     -p=num_proc\tnumber of processors to use [default 1]
~~~~
Other file types: contact me

###JSON Track Specifications
Track specifications are very similar to those for XYPlots (see JBrowse tutorial for more information). The _label_, _type_, and _urlTemplate_ must be specified. 

Version 1

    {  
        "key" : "Wild Type Methylation",
        "label" : "track_wild_type_methylation",
        "style" : { "height" : 50 },
        "storeClass" : "JBrowse/Store/SeqFeature/BigWig",
        "urlTemplate" : "path/to/bigwig_file.bw",
        "type" : "MethylationPlugin/View/Track/Wiggle/MethylXYPlot"
    }
    
Version 2
_urlTemplate_ is the path and filename up-to, but not including, the context-specific extension. For example `"urlTemplate" : "path/my-file.bw"` from example above.

    {  
        "key" : "Wild Type Methylation",
        "label" : "track_wild_type_methylation",
        "style" : { "height" : 50 },
        "storeClass" : "MethylationPlugin/Store/SeqFeature/MethylBigWig",
        "urlTemplate" : "path/to/bigwig_file.bw",
        "type" : "MethylationPlugin/View/Track/Wiggle/MethylPlot"
    }

##Future Plans
- Animal-specific methylation coloring (CG and CH vs CG, CHG, CHH)
- corrected global statistics

##Getting bedGraphToBigWig and bedSort
Mac OSX 64-bit: <http://hgdownload.cse.ucsc.edu/admin/exe/macOSX.x86_64/>
Linux 64-bit: <http://hgdownload.cse.ucsc.edu/admin/exe/linux.x86_64/>
Older Linux/Linux server: http://hgdownload.cse.ucsc.edu/admin/exe/linux.x86_64.v287/

- Choose the appropriate web page from above. There will be a long list of programs. 
- Scroll down to find __bedGraphToBigWig__
- Save this program to computer
- In terminal, navigate to the directory with the program
- Type `chmod u+x bedGraphToBigWig`
- Move the program to the same directory as __allc_to_bigwig_pe.py__ or add to path in __.bashrc__ or __.bash_profile__
