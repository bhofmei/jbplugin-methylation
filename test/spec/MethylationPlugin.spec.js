require([
    'dojo/_base/declare',
    'dojo/_base/array',
    'JBrowse/Browser',
    'MethylationPlugin/View/Track/Wiggle/MethylPlot',
    'MethylationPlugin/Store/SeqFeature/MethylBigWig'
    ], function( 
        declare, 
        array,
        Browser,
        MethylPlot,
        MethylBigWig
    ) {
    
    describe( 'Initalize track', function() {
        var track = new MethylPlot({
            browser: new Browser({unitTestMode: true}),
            config: {
                urlTemplate: "../data/test_methyl_short_v3.bw",
                label: "testtrack"
            }
        });
        it('track', function() {
            expect(track).toBeTruthy();
        });
    });
    
    describe( 'functioning store', function(){
        var store = new MethylBigWig({
            browser: new Browser({unitTestMode: true}),
            urlTemplate: '../data/test_methyl_short_v3.bw',
            config:{}
        });
        
        // before each test, get the features
        var features = [];
        beforeEach(function(done){
            store.getFeatures({ref:'Chr5', start:1, end: 1000}, function(feature){
                features.push(feature);
            }, function(){
                done();
            }, function(){
                console.error(error);
                done();
            });
        });
        // after each test, clear feature list
        afterEach(function(){
            features = [];
        });
        
        // initialize a store
        it('init store', function(){
            expect(store).toBeTruthy();
        });
        
        // check that there are the correct number of features
        it('feature bigwig values', function(){
            var cg = array.filter(features, function(f) { return f.get('source')==="cg"; });
            //console.log(JSON.stringify(cg));
            var chg = array.filter(features, function(f) { return f.get('source')==="chg"; });
            var chh = array.filter(features, function(f) { return f.get('source')==="chh"; });
            expect(cg.length).toEqual(23);
            expect(chg.length).toEqual(12);
            expect(chh.length).toEqual(18);
            
        });
        
    });
    
    describe('test for empty features', function(){
        var store = new MethylBigWig({
            browser: new Browser({unitTestMode: true}),
            urlTemplate: '../data/test_methyl_short_v3.bw',
            config:{}
        });
        var emptyFeatures = [];
        beforeEach(function(done){
            store.getFeatures({ref:'Chr1', start:1, end: 1000}, function(feature){
                emptyFeatures.push(feature);
            }, function(){
                done();
            }, function(){
                console.error(error);
                done();
            });
        });
        it('empty features', function(){
            expect(emptyFeatures.length).toEqual(0);
        }); 
    });
    
    describe( 'context-specific store', function(){
        var store = new MethylBigWig({
            browser: new Browser({unitTestMode: true}),
            urlTemplate: '../data/test_methyl_short_v3.bw',
            config:{context:['cg','chg']}
        });
        
        // before each test, get the features
        var features = [];
        beforeEach(function(done){
            store.getFeatures({ref:'Chr5', start:1, end: 1000}, function(feature){
                features.push(feature);
            }, function(){
                done();
            }, function(){
                console.error(error);
                done();
            });
        });
        // after each test, clear feature list
        afterEach(function(){
            features = [];
        });
        
        // check that there are the correct number of features
        it('feature bigwig values', function(){
            var cg = array.filter(features, function(f) { return f.get('source')==="cg"; });
            //console.log(JSON.stringify(cg));
            var chg = array.filter(features, function(f) { return f.get('source')==="chg"; });
            var chh = array.filter(features, function(f) { return f.get('source')==="chh"; });
            expect(cg.length).toEqual(23);
            expect(chg.length).toEqual(12);
            expect(chh.length).toEqual(0);
            
        });
        
    });
    
   describe( 'non-existant store', function(){
       var store = new MethylBigWig({
        browser: new Browser({unitTestMode: true}),
        urlTemplate: '../data/line1-G3-rep1_Chr1.bw',
        config:{context:['cg','chg']}
        });
        // initialize a store
        var features = [];
        var catchError = false;
        beforeEach(function(done){
                store.getFeatures({ref:'Chr5', start:1, end: 1000}, function(feature){
                    features.push(feature);
                }, function(){
                    done();
                }, function(){
                    catchError = true;
                    done();
                });
        });
        afterEach(function(){
            features=[];
        });
        it('init store', function(){
                expect(catchError).toEqual(true);
        });
    });

});

