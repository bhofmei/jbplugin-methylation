import sys, math, glob, multiprocessing, subprocess, os

# Usage: python3 allc_to_bigwig_pe.py [-keep] [-no-clean] [-L=labels] [-p=num_proc] <chrm_sizes>  <allC_file> [allC_file]*

# NOTE: allc file contains the methylation information for all chromosomes

# Steps:
# 1. allC to bedGraph
# 2. sort bedGraph
# 3. bedGraph to BigWig
# 4. remove temporary files

NUMPROC=1

def processInputs( allCFileAr, chrmFileStr, keepTmp, labelsAr, outID, numProc, needClean ):
	if needClean:
		chrmList = readChrmFile( chrmFileStr )
	else:
		chrmList = None
	print( 'Begin processing files with {:d} processors'.format( numProc ) )
	pool = multiprocessing.Pool( processes=numProc )
	results = [ pool.apply_async( processFile, args=(allCFileAr[i], chrmFileStr, chrmList, labelsAr[i], outID, keepTmp) ) for i in range(len(allCFileAr)) ]
	suc = [ p.get() for p in results ]
	
	print( 'Done' )

def readChrmFile( inFileStr ):
	inFile = open( inFileStr, 'r' )
	chrmList= []
	
	for line in inFile:
		lineAr = line.rstrip().split( '\t' )
		# (0) chrm (1) length ...
		chrmList += [ lineAr[0] ]
	inFile.close()
	return chrmList

def processFile( allCFileStr, chrmFileStr, chrmList, label, outID, keepTmp ):
	if outID == None and label == None:
		outID = allCFileStr.replace( '.tsv','' ).replace( 'allc_','' )
	elif outID == None:
		outID = label
	elif label == None:
		outID += '_' + allCFileStr.replace( '.tsv','' ).replace( 'allc_','' )
	else:
		outID += '_' + label
	
	print( 'Reading allC file {:s}'.format( allCFileStr ) )
	# allC to bedGraph
	bedGraphStr =  outID + '.bedGraph'
	readAllC( allCFileStr, bedGraphStr, chrmList )
	
	print( 'Sorting bedGraph file' )
	sortBedFile( bedGraphStr )
	
	print( 'Converting {:s} file to BigWig'.format(bedGraphStr ) )
	# bedGraph to bigWig
	processBedGraph( bedGraphStr, chrmFileStr )
	
	# remove temporary
	if keepTmp == False:
		print( 'Removing temporary files...' )
		os.remove( bedGraphStr )
	print( 'BigWig finished for {:s}.bw'.format( outID ) )

def readAllC( allCFileStr, outFileStr, chrmList ):
	
	allCFile = open( allCFileStr, 'r' )
	outFile = open( outFileStr, 'w' )
	
	mTypes = [ 'CG', 'CHG', 'CHH' ]
	mTypeAdd = [0, 1, 2]
	
	for line in allCFile:
		if line.startswith( 'c' ):
			continue
		lineAr = line.rstrip().split('\t')
		# (0) chr (1) pos (2) strand (3) mc class (4) mc_count (5) total
		# (6) methylated
		if int( lineAr[6] ):
			chrm = lineAr[0]
			name = formatChrmName( chrm )
			if chrmList == None or name == False or name not in chrmList:
				continue
			else:
				chrm = name
			pos = int( lineAr[1] ) - 1
			methType = decodeMethType( lineAr[3] )
			try:
				mInd = mTypes.index( methType )
			except ValueError:
				continue
			value = float( lineAr[4] ) / float( lineAr[5] )
			# adjust for methylation type
			value = value + mTypeAdd[ mInd ]
			# adjust for negative strand
			if lineAr[2] == '-':
				value = value * -1
			
			# (0) chrm (1) start (2) end (3) value
			outStr = '{:s}\t{:d}\t{:d}\t{:f}\n'.format( chrm, pos, pos+1, value )
			outFile.write( outStr )
		# end if
	# end for
	allCFile.close()
	outFile.close()

def formatChrmName( inName ):
	
	chrm = inName.lower()
	if chrm == 'c' or chrm == 'chloroplast' or chrm == 'chrc':
		'ChrC'
	elif chrm == 'm' or chrm == 'mitochondria' or chrm == 'chrm' or chrm == 'mt':
		return 'ChrM'
	elif chrm == 'l' or chrm == 'lambda' or chrm == 'chrl':
		return 'ChrL'
	# digit only number
	elif chrm.isdigit():
		return 'Chr'+chrm
	elif chrm.startswith( 'chromosome' ):
		return chrm.replace( 'chromosome', 'Chr' )
	elif chrm.startswith( 'chrm' ):
		return chrm.replace( 'chrm', 'Chr' )
	elif chrm.startswith( 'chr' ):
		return chrm.replace( 'chr', 'Chr' )
	elif chrm.startswith( 'scaffold' ):
		return chrm
	elif chrm.startswith( 'contig' ):
		return chrm
	else:
		return chrm

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
	# Usage: python3 allc_to_bigwig_pe.py [-keep] [-no-clean] [-L=labels] [-p=num_proc] [-o=out_id] <chrm_sizes>  <allC_file> [allC_file]*
	
	keepTmp = False
	needClean = True
	labelsAr = []
	numProc = NUMPROC
	outID = None
	startInd = 0
	
	for i in range( min(7, len(argv)-2) ):
		if argv[i] == '-keep':
			keepTmp = True
			startInd += 1
		elif argv[i] == '-no-clean':
			needClean = False
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
	
	processInputs( allCFileAr, chrmFileStr, keepTmp, labelsAr, outID, numProc, needClean )

def printHelp():
	print( '-no-clean\tdoes not check chromosome names match chrm file\n\t\tnot recommended\n' )
	
if __name__ == "__main__":
	if len(sys.argv) < 3 :
		print ("Usage: python3 allc_to_bigwig_pe.py [-keep] [-L=labels] [-o=outID] [-p=num_proc] <chrm_sizes>  <allC_file> [allC_file]*")
	else:
		parseInputs( sys.argv[1:] )
