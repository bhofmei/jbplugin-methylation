import sys, math, glob, multiprocessing, subprocess, os, bisect, random

# Usage: python gff_to_bigwig_pe_v3.py [-q] [-h] [-keep] [-sort] [-o=out_ids]
# [-p=num_proc] [-s=gff_search_term] <chrm_sizes> <gff_fille> [gff_file]*

NUMPROC = 1
SEARCHTERM='frac'

def processInputs( gffFileAr, chrmFileStr, keepTmp, outIdAr, searchTerm, numProc, isSort, isPrint ):
	nFiles = len(gffFileAr)
	if isPrint:
		print( 'Keep temp files:', keepTmp)
		print( 'Sort bedGraph:', isSort )
		print( 'GFF notes search term:', searchTerm )
	# adjust out ids
	if len(outIdAr) == 1 and nFiles > 1:
		outIdAr = outIdAr * nFiles
	elif len(outIdAr) != nFiles:
		print( 'ERROR: number of output ids does not match number of input files' )
		exit()
	if isPrint:
		print( 'Begin processing {:d} files with {:d} processors'.format( nFiles, numProc ) )
	pool = multiprocessing.Pool( processes=numProc )
	results = [ pool.apply_async( processFile, args=(gffFileAr[i], chrmFileStr, outIdAr[i], keepTmp, searchTerm, isSort, isPrint) ) for i in range(nFiles) ]
	suc = [ p.get() for p in results ]

	if isPrint:
		print( 'Done' )

def processFile( gffFileStr, chrmFileStr, outId, keepTemp, searchTerm, isSort, isPrint ):
	# get output id
	if outId == None:
		outId = gffFileStr.replace('.gff', '' )
	if not outId.endswith( '_v3'):
		outId += '_v3'
	if isPrint:
		print( 'Reading GFF file {:s}'.format( os.path.basename( gffFileStr ) ) )
	bedGraphStr = outId + '.bedGraph'

	bedGraphAr = readGFF( gffFileStr, bedGraphStr, searchTerm )
	print(bedGraphAr)

	if len(bedGraphAr) == 0:
		print( 'ERROR: no m4C, m5C, or m6A features found in GFF file' )
		exit()

	if isSort:
		if isPrint:
			print( 'Sorting bedGraph files' )
		for b in bedGraphAr:
			sortBedFile( b )

	if isPrint:
		print( 'Converting {:s} to BigWig'.format( ', '.join(bedGraphAr) )  )

	for b in bedGraphAr:
		processBedGraph( b, chrmFileStr )

	if not keepTemp:
		if isPrint:
			print ( 'Removing temporary files' )
		for b in bedGraphAr:
			os.remove( b)

	print( 'BigWig finished for {:s}.*'.format( bedGraphStr.replace( 'bedGraph', 'bw' ) ) )

def readGFF( gffFileStr, bedGraphStr, searchTerm ):
	outTypes = ['4mc', '5mc', '6ma']
	validTypes = ['4mc', 'm4c', '5mc', 'm5c', '6ma', 'm6a']
	validOut = [0, 0, 1, 1, 2, 2]
	if not searchTerm.endswith( '=' ):
		searchTerm += '='

	bedGraphStrAr = [ bedGraphStr + '.' + x for x in  outTypes]
	bedGraphAr = [ open( x, 'w' ) for x in bedGraphStrAr ]
	isUsed = [ False for x in outTypes ]

	inFile = open( gffFileStr, 'r' )

	for line in inFile:
		line = line.rstrip()
		# (0) chrm (1) source (2) feature (3) start (4) end (5) score
		# (6) strand (7) frame (8) notes
		lineAr = line.split( '\t' )
		if line.startswith( '#' ) or len( lineAr ) < 9:
			continue
		featType = lineAr[2].lower()
		featInt = indexOf( validTypes, featType )
		if featInt == -1:
			continue
		outInt = validOut[featInt]
		chrm = lineAr[0]
		pos = int( lineAr[3] ) - 1
		# get frac value
		valueStr = searchNotes(lineAr[8], searchTerm)
		value = convertValue( valueStr, lineAr[6] )
		if value != '':
			# add to output
			# (0) chrm (1) start (2) end (3) value
			if isUsed[outInt] == False:
				isUsed[outInt] = True
			bedGraphAr[outInt].write( '{:s}\t{:d}\t{:d}\t{:s}\n'.format( chrm, pos, pos+1, value ) )

	# end for line
	inFile.close()

	# determine used files, close and remove as necessary
	outFilesAr = []
	for i in range(len(outTypes)):
		bedGraphAr[i].close()
		if isUsed[i]:
			outFilesAr += [bedGraphStrAr[i]]
		else:
			os.remove(bedGraphStrAr[i])

	# end for i
	return outFilesAr

def sortBedFile( bedFileStr ):
	command = 'bedSort {:s} {:s}'.format( bedFileStr, bedFileStr )
	subprocess.call( command, shell=True )

def processBedGraph( bedGraphStr, chrmFileStr ):

	bigWigStr = bedGraphStr.replace( '.bedGraph', '.bw' )
	# bedGraphToBigWig in.bedGraph chrom.sizes out.bw
	command = 'bedGraphToBigWig {:s} {:s} {:s}'.format( bedGraphStr, chrmFileStr, bigWigStr )
	subprocess.call( command, shell=True)

def indexOf( inAr, search ):
	try:
		i = inAr.index( search )
		return i
	except ValueError:
		return -1

def searchNotes( notesStr, searchStr ):
	index = notesStr.find( searchStr )
	if index == -1:
		return ''
	adIndex = index + len( searchStr )
	endIndex = notesStr[adIndex:].find( ';' )
	if endIndex == -1:
		return notesStr[adIndex:]
	else:
		newIndex = endIndex+adIndex
		return notesStr[adIndex:newIndex]

def convertValue( valueStr, strand ):
	try:
		# convert to float
		value = float( valueStr )
		if value > 1:
			value = value / 100
		if strand == '-':
			value = value * -1
		# convert to string and return
		return '{:.6f}{:d}'.format( value, 1 )
	except ValueError:
		return ''

def parseInputs( argv ):
	numProc = NUMPROC
	outIdAr = [None]
	keepTmp = False
	isSort = False
	isPrint = True
	searchTerm = SEARCHTERM
	startInd = 0

	for i in range( min(5, len(argv)-2) ):
		if argv[i] in [ '-h', '--help', '-help']:
			printHelp()
			exit()
		elif argv[i] == '-q':
			isPrint = False
			startInd += 1
		elif argv[i] == '-keep':
			keepTmp = True
			startInd += 1
		elif argv[i] == '-sort':
			isSort = True
			startInd += 1
		elif argv[i].startswith( '-s=' ):
			searchTerm = argv[i][3:]
			startInd += 1
		elif argv[i].startswith( '-o=' ):
			outIdAr = argv[i][3:].split(',')
			startInd += 1
		elif argv[i].startswith( '-p=' ):
			try:
				numProc = int( argv[i][3:] )
			except ValueError:
				print( 'WARNING: number of processors must be integer...using default', NUMPROC )
				numProc = NUMPROC
			startInd += 1
		elif argv[i].startswith( '-' ):
			print( 'ERROR: {:s} is not a valid parameter...use -h for help'.format( argv[i] ) )
			exit()
	# end for i

	chrmFileStr = argv[startInd]
	gffFileAr = []
	allCFileAr = []
	for j in range(startInd+1, len(argv) ):
		gffFileAr += [ argv[j] ]

	processInputs( gffFileAr, chrmFileStr, keepTmp, outIdAr, searchTerm, numProc, isSort, isPrint )

def printHelp():
	print()
	print( 'Usage:\tpython3 gff_to_bigwig_pe_v3.py [-q] [-h] [-keep] [-sort] [-o=out_ids]\n\t[-p=num_proc] [-s=gff_search_term] <chrm_sizes> <gff_fille> [gff_file]*' )
	print()
	print( 'Converts GFF files to context-specific BigWig files' )
	print( 'Note: bedGraphToBigWig and bedSort programs must be in the path' )
	print()
	print( 'Required:' )
	print( 'chrm_file\ttab-delimited file with chromosome names and lengths,\n\t\ti.e. fasta index file' )
	print( 'gff_file\tgff file with 4mC and/or 6mA positions on all chrms' )
	print()
	print( 'Optional:' )
	print( '-keep\t\tkeep intermediate files' )
	print( '-sort\t\tcalls bedSort; add this option if bigwig conversion fails' )
	print( '-s=gff_search\tGFF attribute which has methylation level\n\t\t[default "frac"]' )
	print( '-o=out_id\toptional ID for output files [default from input file name]\n\t\tif one ID specified, applied to all input GFFs\n\t\tcomma-separated list IDs for multiple GFFs' )
	print( '-p=num_proc\tnumber of processors to use [default 1]' )

if __name__ == "__main__":
	if len(sys.argv) < 3 :
		printHelp()
	else:
		parseInputs( sys.argv[1:] )
