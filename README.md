#Methylation Plugin
This is a JBrowse plugin
 
this plugin is to be used with whole-genome bisulfite sequencing data. Unlike almost all other browsers, this plugin allows you to see all methylation contexts on one track

##Install

For JBrowse 1.11.6+ in the _JBrowse/plugins_ folder, type:
``git clone https://github.com/bhofmei/jbplugin-methylation.git``

##Activate
Add this to jbrowse.conf:
    ``"plugins": [
        'MethylationPlugin'
    ],``

If that doesn't work, add this to jbrowse_conf.json:
    ``"plugins" : {
        "MethylationPlugin" : { "location" : "plugins/MethylationPlugin" }
    }``
