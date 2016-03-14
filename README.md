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
###File Conversions
The methylation tracks works best when the data is stored as a BigWig file. File conversion is easy, though. Use the conversion program appropriate to your input file type. 
_bedGraphToBigWig_ (a program from UCSC) must be on your path. See details below for acquiring this program.  
*allC Files*  
- allC files have these columns: chr, pos, strand, mc_class, mc_count, total, methylated
- All chromosomes need to be combined into one allC file.
- You also need a file with chromosome sizes. This file should be tab-delimitated, one chromosome per line, with at least chromosome name and chromosome size. The genome's FASTA index (.fa.fai) file works well.
- For a given genome (i.e. chromosome sizes), you can specify an unlimited number of allC files to be converted.
- Using the program:
~~~~
    python3 [-keep] [-L=labels] [-p=num_proc] [-o=outID] <chrm_sizes> <allC_file> [allC_file]*   
    -keep           when on, keeps temporary files  
    -L=labels       comma-separated list of labels for incoming allC files  
    -p=num_proc     number of processors to use [default 1]  
    -o=outID        optional string to include in output file names
~~~~

Other file types: contact me

###JSON Track Specifications
Track specifications are very similar to those for XYPlots (see JBrowse tutorial for more information). The _label_, _type_, and _urlTemplate_ must be specified. The other settings are optional, but suggested  

    {  
        "key" : "Wild Type Methylation",
        "label" : "track_wild_type_methylation",
        "style" : { "height" : 50 },
        "storeClass" : "JBrowse/Store/SeqFeature/BigWig",
        "urlTemplate" : "path/to/bigwig_file.bw",
        "type" : "MethylationPlugin/View/Track/Wiggle/MethylXYPlot"
    }

##Future Plans
- Animal-specific methylation coloring (CG and CH vs CG, CHG, CHH)
- corrected global statistics

##Getting bedGraphToBigWig
Mac OSX 64-bit: <http://hgdownload.cse.ucsc.edu/admin/exe/macOSX.x86_64/>
Linux 64-bit: <http://hgdownload.cse.ucsc.edu/admin/exe/linux.x86_64/>
Older Linux/Linux server: http://hgdownload.cse.ucsc.edu/admin/exe/linux.x86_64.v287/

- Choose the appropriate web page from above. There will be a long list of programs. 
- Scroll down to find __bedGraphToBigWig__
- Save this program to computer
- In terminal, navigate to the directory with the program
- Type `chmod u+x bedGraphToBigWig`
- Move the program to the same directory as __allc_to_bigwig_pe.py__ or add to path in __.bashrc__ or __.bash_profile__
