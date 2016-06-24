import sys, math, multiprocessing, subprocess, os
from io import open

# Usage: python convert_methyl_bigwig_versions.py [-p=num_proc] [-keep] <chrm_file> <bigwig_file> [bigwig_file]*

NUMPROC=1

def processInputs( inputFileAr, chrmFileStr, numProc, keepTmp ):
	
	print( 'Begin processing files with {:d} processors'.format( numProc ) )
	pool = multiprocessing.Pool( processes=numProc )
	results = [ pool.apply_async( processFile, args=(inputFileAr[i], chrmFileStr, keepTmp) ) for i in range(len(inputFileAr)) ]
	suc = [ p.get() for p in results ]

def processFile( inputFileStr, chrmFileStr, keepTmp ):
	baseName = inputFileStr.replace( '.bw', '' )
	print( 'Converting {:s} to bedGraph'.format(os.path.basename( inputFileStr ) ) )
	bedGraphStr = baseName + '.bedGraph'
	command = 'bigWigToBedGraph {:s} {:s}'.format( inputFileStr, bedGraphStr )
	subprocess.call( command, shell=True)
	
	print( 'Reading bedGraph' )
	bedGraphAr = [bedGraphStr + '.' + x for x in ['cg','chg','chh'] ]
	readBedGraph( bedGraphStr, bedGraphAr )
	
	print( 'Converting {:s} files to BigWig'.format(bedGraphStr ) )
	# bedGraph to bigWig
	for b in bedGraphAr:
		processBedGraph( b, chrmFileStr )
	
	# remove temporary
	if keepTmp == False:
		print( 'Removing temporary files...' )
		for b in bedGraphAr:
			os.remove( b )
		os.remove(bedGraphStr )
	print( 'BigWig finished for {:s}.bw.*'.format( baseName ) )

def readBedGraph( bedGraphStr, outFileAr ):
	bedGraph = open( bedGraphStr, 'r' )
	outFileAr = [open( outFileStr, 'w' ) for outFileStr in outFileAr]
	
	for line in bedGraph:
		lineAr = line.rstrip().split('\t')
		# (0) chrm (1) start (2) end (3) value
		newVal, valType = decodeValue( float(lineAr[3]) )
		lineAr[3] = str( newVal )
		outFileAr[valType].write( '\t'.join( lineAr ) + '\n' )
	# end for line
	bedGraph.close()
	[ outFile.close() for outFile in outFileAr ]

def decodeValue( n ):
	isNeg = ( n < 0 )
	m = abs( n )
	t = 0 # CG - default
	if m > 2:
		m = m - 2
		t = 2 # CHH
	elif m > 1:
		m = m - 1
		t = 1 # CHG
	k = (-1*m if isNeg else m)
	return k, t

def processBedGraph( bedGraphStr, chrmFileStr ):
	
	bigWigStr = bedGraphStr.replace( '.bedGraph', '.bw' )
	#print( bigWigStr )
	# bedGraphToBigWig in.bedGraph chrom.sizes out.bw
	command = 'bedGraphToBigWig {:s} {:s} {:s}'.format( bedGraphStr, chrmFileStr, bigWigStr )
	subprocess.call( command, shell=True)

def parseInputs( argv ):
	numProc = NUMPROC
	isSort = False
	keepTmp = False
	startInd = 0
	
	for i in range( min(2, len(argv)-2) ):
		if argv[i].startswith( '-p=' ):
			try:
				numProc = int( argv[i][3:] )
				startInd += 1
			except ValueError:
				print( 'ERROR: number of processors must be an integer' )
				exit()
		elif argv[i] == '-keep':
			keepTmp = True
			startInd += 1
		elif argv[i].startswith( '-' ):
			print( 'ERROR: {:s} is not a valid parameter'.format( argv[i] ) )
			exit()
	# end for
	
	chrmFileStr = argv[startInd]
	inputFileAr = []
	for j in range(startInd+1, len(argv) ):
		inputFileAr += [ argv[j] ]
	
	processInputs( inputFileAr, chrmFileStr, numProc, keepTmp )

if __name__ == "__main__":
	if len(sys.argv) < 3 :
		print ("Usage: python convert_methyl_bigwig_versions.py [-p=num_proc] [-keep] <chrm_file> <bigwig_file> [bigwig_file]*")
	else:
		parseInputs( sys.argv[1:] )
