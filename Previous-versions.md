## Using Methylation Tracks

- **Version 1*** is when all contexts are in a single BigWig file
    - This caused problems with zooming in the browser, so version 2 was developed as a fix.
    - Version 1 is still supported, but not recommended for use.
- **Version 2** uses three BigWig files, one for each methylation context.
    - The files need the same base name, like _my-file.bw_, and contexts are specified as additional extensions, i.e. _my-file.bw.cg_, _my-file.bw.chg_, and _my-file.bw.chh_.
    - Visualization greatly depends on if the `-all` parameter is used when converting the raw allC/bismark file
    
### File Conversion
The methylation tracks works best when the data is stored as BigWig file(s). File conversion is easy, though. Use the conversion program appropriate to your input file type. 
_bedGraphToBigWig_ and _bedSort_ (programs from UCSC) must be on your path.

#### allC Files
- allC files have these columns: chr, pos, strand, mc_class, mc_count, total, methylated
- In v2, by default, only _methylated_ positions are included. Use the `-all` option to include all non-zero positions.
- All chromosomes need to be combined into one allC file.
- You also need a file with chromosome sizes. This file should be tab-delimitated, one chromosome per line, with at least chromosome name and chromosome size. The genome's FASTA index (.fa.fai) file works well.
- For a given genome (i.e. chromosome sizes), you can specify an unlimited number of allC files to be converted. 
- Note: version 1 conversion renames reference sequences to a convention while version 2 does not.

- Conversion Version 1:

```
Usage: python3 allc_old_bigwig_pe.py [-keep] [-no-clean] [-sort] [-all] 
       [-L=labels] [-p=num_proc] <chrm_sizes>  <allC_file> [allC_file]*  
-keep           when on, keeps temporary files
-no-clean       does not check chromosome names match chrm file
-sort           calls bedSort; add this option if bigwig conversion fails
-all            use all positions with methylation not just methylated ones
-L=labels       comma-separated list of labels for incoming allC files  
-p=num_proc     number of processors to use [default 1]  
-o=outID        optional string to include in output file names
```

* Conversion Version 2:
```
Usage: python3 allc_to_bigwig_pe.py [-keep] [-sort] [-all] [-L=labels] 
       [-o=out_id] [-p=num_proc]<chrm_sizes>  <allC_file> [allC_file]*
-keep        keep intermediate files
-sort        calls bedSort; add this option if bigwig conversion fails
-all         use all positions with methylation [default methylated sites]
-allz        use all positions with coverage including 0's
-L=labels    comma-separated list of labels to use for the allC files;
             defaults to using information from the allc file name
-o=out_id    optional identifier to be added to the output file names
-p=num_proc  number of processors to use [default 1]
```

#### Bismark
* Bismark files have the following columns: chr, pos, strand, methylated reads, total reads, C context, trinucleotide context
* There is a script to convert bismark files to version 2
* *Note*: for v3, when filtering for methylated sites only, any site with at least 1 methylated read is considered "methylated"

* Conversion Version 2
```
Usage:  python3 bismark_to_bigwig_pe.py [-keep] [-sort] [-all] [-L=labels] 
        [-o=out_id] [-p=num_proc] <chrm_sizes>  <bismark_file> [bismark_file]*
-keep        keep intermediate files
-sort        calls bedSort; add this option if bigwig conversion fails
-all         use all covered positions including 0s [default only includes mC > 1]
-L=labels    comma-separated list of labels to use for the allC files;
             defaults to using information from the allc file name
-o=out_id    optional identifier to be added to the output file names
-p=num_proc  number of processors to use [default 1]
```

### JSON Track Specifications
Track specifications are very similar to those for XYPlots (see JBrowse tutorial for more information). The _label_, _type_, and _urlTemplate_ must be specified. 

#### Version 1
```
{  
  "key" : "Wild Type Methylation",
  "label" : "track_wild_type_methylation",
  "style" : { "height" : 50 },
  "storeClass" : "JBrowse/Store/SeqFeature/BigWig",
  "urlTemplate" : "path/to/bigwig_file.bw",
  "type" : "MethylationPlugin/View/Track/Wiggle/MethylXYPlot"
}
```
    
#### Version 2

_urlTemplate_ is the path and filename up-to, but not including, the context-specific extension. For example `"urlTemplate" : "path/my-file.bw"`.
```
{  
  "key" : "Wild Type Methylation",
  "label" : "track_wild_type_methylation",
  "style" : { "height" : 50 },
  "methylatedOption" : false,
  "storeClass" : "MethylationPlugin/Store/SeqFeature/MethylBigWig",
  "urlTemplate" : "path/to/bigwig_file.bw",
  "type" : "MethylationPlugin/View/Track/Wiggle/MethylPlot"
}
```

Same as Version 3 except
```
"methylatedOption" : false
```