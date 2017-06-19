import sys, math, multiprocessing, subprocess, os

# Usage: python3 bismark_to_bigwig_pe.py [-keep] [-sort] [-all] [-L=labels] [-p=num_proc] <chrm_sizes>  <allC_file> [allC_file]*

# NOTE: allc file contains the methylation information for all chromosomes

# Steps:
# 1. allC to bedGraph
# 2. sort bedGraph if necessary
# 3. bedGraph to BigWig
# 4. remove temporary files

NUMPROC=1

def processInputs( allCFileAr, chrmFileStr, keepTmp, labelsAr, outID, numProc, isSort, useAll ):
	print( 'Keep temp files: {:s}; Sort bedGraph: {:s}; Use all positions: {:s}'.format( str( keepTmp), str (isSort), str(useAll)))
	print( 'Begin processing files with {:d} processors'.format( numProc ) )
	pool = multiprocessing.Pool( processes=numProc )
	results = [ pool.apply_async( processFile, args=(allCFileAr[i], chrmFileStr, labelsAr[i], outID, keepTmp, isSort, useAll) ) for i in range(len(allCFileAr)) ]
	suc = [ p.get() for p in results ]

	print( 'Done' )


def processFile( allCFileStr, chrmFileStr, label, outID, keepTmp, isSort, useAll ):
	if outID == None and label == None:
		outID = allCFileStr.replace( '.tsv','' ).replace( 'allc_','' )
	elif outID == None:
		outID = label
	elif label == None:
		outID += '_' + allCFileStr.replace( '.tsv','' ).replace( 'allc_','' )
	else:
		outID += '_' + label

	print( 'Reading allC file {:s}'.format( allCFileStr ) )
	# allC to bedGraphs
	bedGraphStr =  outID + '.bedGraph'
	bedGraphAr = [bedGraphStr + '.' + x for x in ['cg','chg','chh'] ]
	readAllC( allCFileStr, bedGraphAr, useAll )

	if isSort:
		print( 'Sorting bedGraph files' )
		for b in bedGraphAr:
			sortBedFile( b )

	print( 'Converting {:s} files to BigWig'.format(bedGraphStr ) )
	# bedGraph to bigWig
	for b in bedGraphAr:
		processBedGraph( b, chrmFileStr )

	# remove temporary
	if keepTmp == False:
		print( 'Removing temporary files...' )
		for b in bedGraphAr:
			os.remove( b )
	print( 'BigWig finished for {:s}.bw.*'.format( outID ) )

def readAllC( allCFileStr, outFileAr, useAll ):

	allCFile = open( allCFileStr, 'r' )
	outFileAr = [open( outFileStr, 'w' ) for outFileStr in outFileAr]

	mTypes = [ 'CG', 'CHG', 'CHH' ]

	for line in allCFile:
		lineAr = line.rstrip().split('\t')
		# (0) chr (1) pos (2) strand (3) mC (4) C (5) Cctxt
		# (6) trintctxt
		if len(lineAr) < 7:
			continue
		elif ( useAll or int(lineAr[3])> 0 ):
			chrm = lineAr[0]
			pos = int( lineAr[1] ) - 1
			methType = decodeMethType( lineAr[5] )
			try:
				mInd = mTypes.index( methType )
			except ValueError:
				continue
			value = float( lineAr[3] ) / (float( lineAr[4] ) + float( lineAr[3]))
			# adjust for negative strand
			if lineAr[2] == '-':
				value = value * -1

			# (0) chrm (1) start (2) end (3) value
			outStr = '{:s}\t{:d}\t{:d}\t{:f}\n'.format( chrm, pos, pos+1, value )
			outFile = outFileAr[mInd]
			outFile.write( outStr )
		# end if
	# end for
	allCFile.close()
	[ outFile.close() for outFile in outFileAr ]

def decodeMethType( mStr ):

	if mStr.startswith( 'CG' ):
		return 'CG'
	elif mStr.endswith( 'G' ):
		return 'CHG'
	elif mStr == 'CNN':
		return 'CNN'
	else:
		return 'CHH'

def sortBedFile( bedFileStr ):
	command = 'bedSort {:s} {:s}'.format( bedFileStr, bedFileStr )
	subprocess.call( command, shell=True )

def processBedGraph( bedGraphStr, chrmFileStr ):

	bigWigStr = bedGraphStr.replace( '.bedGraph', '.bw' )
	#print( bigWigStr )
	# bedGraphToBigWig in.bedGraph chrom.sizes out.bw
	command = 'bedGraphToBigWig {:s} {:s} {:s}'.format( bedGraphStr, chrmFileStr, bigWigStr )
	subprocess.call( command, shell=True)


def parseInputs( argv ):
	# Usage: python3 bismark_to_bigwig_pe.py [-keep] [-sort] [-all] [-L=labels] [-p=num_proc] <chrm_sizes>  <allC_file> [allC_file]*

	keepTmp = False
	labelsAr = []
	numProc = NUMPROC
	isSort = False
	useAll = False
	outID = None
	startInd = 0

	for i in range( min(5, len(argv)-2) ):
		if argv[i] == '-keep':
			keepTmp = True
			startInd += 1
		elif argv[i] == '-sort':
			isSort = True
			startInd += 1
		elif argv[i] == '-all':
			useAll = True
			startInd += 1
		elif argv[i].startswith( '-L=' ):
			labelsAr = argv[i][3:].split( ',' )
			startInd += 1
		elif argv[i].startswith( '-o=' ):
			outID = argv[i][3:]
			startInd += 1
		elif argv[i].startswith( '-p=' ):
			try:
				numProc = int( argv[i][3:] )
				startInd += 1
			except ValueError:
				print( 'ERROR: number of processors must be an integer' )
				exit()
		elif argv[i] in [ '-h', '--help', '-help']:
			printHelp()
			exit()
		elif argv[i].startswith( '-' ):
			print( 'ERROR: {:s} is not a valid parameter'.format( argv[i] ) )
			exit()

	chrmFileStr = argv[startInd]
	allCFileAr = []
	for j in range(startInd+1, len(argv) ):
		allCFileAr += [ argv[j] ]

	if len(labelsAr) == 0:
		labelsAr = [None] * len(allCFileAr)
	elif len(labelsAr) != len(allCFileAr):
		print( "ERROR: number of labels doesn't match number of allC files" )
		exit()

	processInputs( allCFileAr, chrmFileStr, keepTmp, labelsAr, outID, numProc, isSort, useAll )

def printHelp():
	print ("Usage: python3 bismark_to_bigwig_pe.py [-keep] [-sort] [-all] [-L=labels] [-o=out_id] [-p=num_proc] <chrm_sizes>  <bismark_file> [bismark_file]*")
	print( 'Converts bismark files to context-specific BigWig files' )
	print( 'Note: bedGraphToBigWig and bedSort programs must be in the path' )
	print( 'Required:' )
	print( 'chrm_file\ttab-delimited file with chromosome names and lengths,\n\t\ti.e. fasta index file' )
	print( 'bismark_file\tbismark file with all chrms and contexts' )
	print( 'Optional:' )
	print( '-keep\t\tkeep intermediate files' )
	print( '-sort\t\tcalls bedSort; add this option if bigwig conversion fails' )
	print( '-all\t\tuse all covered positions including 0s [default only includes mC > 1]' )
	print( '-L=labels\tcomma-separated list of labels to use for the allC files;\n\t\tdefaults to using information from the allc file name' )
	print( '-o=out_id\toptional identifier to be added to the output file names' )
	print( '-p=num_proc\tnumber of processors to use [default 1]' )

if __name__ == "__main__":
	if len(sys.argv) < 3 :
		printHelp()
	else:
		parseInputs( sys.argv[1:] )
