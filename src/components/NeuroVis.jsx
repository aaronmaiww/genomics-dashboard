import React, { useState, useEffect, useRef, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts';

// Function to calculate GC content for a DNA sequence
function calculateGCContent(sequence) {
  if (!sequence || typeof sequence !== 'string') return 0;
  
  const cleanSequence = sequence.toUpperCase().replace(/[^ATGCN]/g, '');
  if (cleanSequence.length === 0) return 0;
  
  const gCount = (cleanSequence.match(/G/g) || []).length;
  const cCount = (cleanSequence.match(/C/g) || []).length;
  
  return (gCount + cCount) / cleanSequence.length;
}

// Add this function to your NeuroVis component to handle both data formats
function processData(data, sourceFile) {
  // Check if this is the old format (with "activations" key) or new format
  const sampleKey = Object.keys(data)[0];
  
  console.log(`Processing data from ${sourceFile}`, {
    'Number of latents': Object.keys(data).length,
    'Sample key': sampleKey,
    'Has activations key?': data[sampleKey].hasOwnProperty('activations'),
    'Is array?': Array.isArray(data[sampleKey])
  });
  
  // If the data is already in the expected format (old format), return as is
  if (data[sampleKey].hasOwnProperty('activations')) {
    console.log('Data is in expected format, using as is');
    
    // Add GC content to each activation - calculate from full context
    Object.values(data).forEach(latent => {
      latent.activations.forEach(activation => {
        const fullContext = activation.context;
        activation.gcContent = calculateGCContent(fullContext);
      });
    });
    
    return data;
  }
  
  // Otherwise, transform the new format to the expected format
  console.log('Converting data to expected format');
  const transformedData = {};
  
  Object.entries(data).forEach(([latentId, items]) => {
    transformedData[latentId] = {
      activations: items.map(item => {
        const input = item.tokens;
        const fullContext = item.context;
        return {
          input: input,
          value: item['latent-' + latentId + '-act'] || 0,
          context: fullContext,
          annotations: item.token_annotations || item.context_annotations || '',
          'e-value': item['e-value annotation'] || '[0]',
          gcContent: calculateGCContent(fullContext)
        };
      })
    };
  });
  
  return transformedData;
}



const LatentSelector = ({ latents, selectedLatents, onChange, neuronData }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchMode, setSearchMode] = useState('id'); // 'id' or 'interpretation'
  const [isOpen, setIsOpen] = useState(false);
  const [showAnnotationList, setShowAnnotationList] = useState(false);
  const dropdownRef = useRef(null);
  
  // Extract a list of monosemantic latents and their annotations
  const monosemanticity = useMemo(() => {
    if (!neuronData) return { uniqueAnnotations: [], monosemantic: {} };
    
    // Object to store monosemantic latents by annotation
    const monosemantic = {};
    
    // Set to collect all annotations that have at least one monosemantic latent
    const uniqueAnnotationsSet = new Set();
    
    // Process each latent to find monosemantic ones
    Object.entries(neuronData).forEach(([latentId, latentData]) => {
      // Skip if no activations
      const activations = latentData.activations || [];
      if (activations.length === 0) return;
      
      // Skip dead latents
      const maxVal = Math.max(...activations.map(d => d.value));
      if (maxVal === 0) return;
      
      // Calculate threshold for this latent
      const meanVal = activations.reduce((sum, d) => sum + d.value, 0) / activations.length;
      const threshold = meanVal + (maxVal - meanVal) * 0.5;
      
      // Get activations above threshold
      const significantActivations = activations.filter(item => item.value >= threshold);
      
      // Extract all unique annotations from significant activations
      const uniqueAnnotations = new Set();
      
      // Process all significant activations to collect unique annotations
      significantActivations.forEach(activation => {
        if (activation.annotations) {
          // Clean up annotation string
          const cleanedAnnotationStr = activation.annotations.toString().replace(/[\[\]'"`]/g, '');
          
          // Split into individual annotations
          const annotations = cleanedAnnotationStr.split(',')
            .map(a => a.trim())
            .filter(Boolean);
          
          // Add each to the set
          annotations.forEach(anno => uniqueAnnotations.add(anno));
        }
      });
      
      // If this latent has exactly ONE unique annotation across all significant activations
      // then it's truly monosemantic - it only responds to a single annotation
      if (uniqueAnnotations.size === 1) {
        const soleAnnotation = Array.from(uniqueAnnotations)[0];
        
        // Track this annotation
        uniqueAnnotationsSet.add(soleAnnotation);
        
        // Add this latent to the list for this annotation
        if (!monosemantic[soleAnnotation]) {
          monosemantic[soleAnnotation] = [];
        }
        
        monosemantic[soleAnnotation].push(latentId);
      }
    });
    
    // Convert the set to a sorted array
    const uniqueAnnotations = Array.from(uniqueAnnotationsSet)
      .map(annotation => ({
        text: annotation,
        count: monosemantic[annotation].length
      }))
      .sort((a, b) => b.count - a.count);
    
    return { uniqueAnnotations, monosemantic };
  }, [neuronData]);
  
  // Extract the unique annotations for the dropdown
  const allAnnotations = monosemanticity.uniqueAnnotations;

  // Filter latents based on search term and mode
  const filteredLatents = latents.filter(latent => {
    if (!searchTerm) return true;
    
    if (searchMode === 'id') {
      // When searching for a specific number like "88", we want an exact match
      if (/^\d+$/.test(searchTerm)) {
        return latent === searchTerm;
      }
      return latent.includes(searchTerm.toLowerCase());
    } else {
      // Special case: If searching for an annotation that has monosemantic latents,
      // prioritize returning those monosemantic latents first
      for (const annotation of allAnnotations) {
        if (annotation.text.toLowerCase() === searchTerm.toLowerCase()) {
          // If this latent is in the monosemantic list for this annotation, it's a match
          if (monosemanticity.monosemantic[annotation.text]?.includes(latent)) {
            return true;
          }
        }
      }
      
      // Regular search within annotations and sequences
      const activations = neuronData[latent]?.activations || [];
      if (activations.length === 0) return false;
      
      // Calculate threshold for this latent 
      const maxVal = Math.max(...activations.map(d => d.value));
      const meanVal = activations.reduce((sum, d) => sum + d.value, 0) / activations.length;
      const threshold = meanVal + (maxVal - meanVal) * 0.5;
      
      // Focus on significant activations (above threshold)
      const significantActivations = activations.filter(item => item.value >= threshold);
      
      // Check if any annotations contain the search term
      const hasMatchingSignificantAnnotation = significantActivations.some(item => {
        if (!item.annotations) return false;
        
        // Process the annotations string for better matching
        const annotationStr = item.annotations.toString();
        const cleanedAnnotationStr = annotationStr.replace(/[\[\]'"`]/g, '');
        
        // Split by comma and check each individual annotation
        const annotations = cleanedAnnotationStr.split(',')
          .map(a => a.trim())
          .filter(Boolean);
        
        // Check if any annotation matches the search term
        return annotations.some(annotation => 
          annotation.toLowerCase().includes(searchTerm.toLowerCase())
        );
      });
      
      if (hasMatchingSignificantAnnotation) return true;
      
      // Fall back to checking all activations if no significant match
      const hasMatchingAnnotation = activations.some(item => {
        if (!item.annotations) return false;
        
        // Process the annotations string for better matching
        const annotationStr = item.annotations.toString();
        const cleanedAnnotationStr = annotationStr.replace(/[\[\]'"`]/g, '');
        
        // Split by comma and check each individual annotation
        const annotations = cleanedAnnotationStr.split(',')
          .map(a => a.trim())
          .filter(Boolean);
        
        // Check if any annotation matches the search term
        return annotations.some(annotation => 
          annotation.toLowerCase().includes(searchTerm.toLowerCase())
        );
      });
      
      // Check if any of the top input sequences contain the search term
      const hasMatchingSequence = activations.some(item => 
        item.input && item.input.toLowerCase().includes(searchTerm.toLowerCase())
      );
      
      return hasMatchingAnnotation || hasMatchingSequence;
    }
  });

  // If searching by ID with specific numbers or searching by interpretation,
  // show individual latents rather than groups
  const useGrouping = !searchTerm || (searchMode === 'id' && !/\d+/.test(searchTerm));
  
  // Group latents for easier selection (just a simple numeric grouping for now)
  const groupedLatents = useGrouping 
    ? filteredLatents.reduce((acc, latent) => {
        const groupNum = Math.floor(parseInt(latent) / 100) * 100;
        const groupName = `${groupNum}-${groupNum + 99}`;
        
        if (!acc[groupName]) {
          acc[groupName] = [];
        }
        acc[groupName].push(latent);
        return acc;
      }, {})
    : { 'Search Results': filteredLatents };

  const handleToggleLatent = (latent) => {
    if (selectedLatents.includes(latent)) {
      onChange(selectedLatents.filter(l => l !== latent));
    } else {
      onChange([...selectedLatents, latent]);
    }
  };

  const handleSelectAll = () => {
    onChange(latents);
  };

  const handleSelectNone = () => {
    onChange([]);
  };
  
  const handleSelectFound = () => {
    onChange(filteredLatents);
    setIsOpen(false); // Close dropdown after selection
  };

  const handleSelectGroup = (group) => {
    const groupLatents = groupedLatents[group];
    // If all latents in this group are selected, deselect them all
    const allSelected = groupLatents.every(latent => selectedLatents.includes(latent));
    
    if (allSelected) {
      onChange(selectedLatents.filter(latent => !groupLatents.includes(latent)));
    } else {
      // Add any latents from the group that aren't already selected
      const newSelected = [...selectedLatents];
      groupLatents.forEach(latent => {
        if (!newSelected.includes(latent)) {
          newSelected.push(latent);
        }
      });
      onChange(newSelected);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="relative w-full max-w-xl mb-6" ref={dropdownRef}>
      <div 
        className="flex justify-between items-center border p-2 rounded cursor-pointer bg-white"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex-1 truncate">
          {selectedLatents.length === 0 
            ? 'Select latents...' 
            : `${selectedLatents.length} latent${selectedLatents.length > 1 ? 's' : ''} selected`}
        </div>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </div>
      
      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-white border rounded shadow-lg max-h-96 overflow-auto">
          <div className="p-2 border-b sticky top-0 bg-white">
            <div className="flex mb-2">
              <button
                className={`px-3 py-1 text-sm rounded-l-md ${searchMode === 'id' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
                onClick={() => {
                  setSearchMode('id');
                  setShowAnnotationList(false);
                }}
              >
                Search by ID
              </button>
              <button
                className={`px-3 py-1 text-sm rounded-r-md ${searchMode === 'interpretation' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
                onClick={() => {
                  setSearchMode('interpretation');
                  setShowAnnotationList(false);
                }}
              >
                Search by Content
              </button>
            </div>
            
            <div className="relative">
              <input
                type="text"
                className="w-full p-2 pl-8 border rounded"
                placeholder={searchMode === 'id' ? "Enter exact ID (e.g. 88) or partial match..." : "Search by annotations or sequences..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 absolute left-2 top-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              
              {searchMode === 'interpretation' && (
                <button
                  className="absolute right-2 top-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200"
                  onClick={() => setShowAnnotationList(!showAnnotationList)}
                >
                  {showAnnotationList ? 'Hide Examples' : 'Show Annotations'}
                </button>
              )}
            </div>
            
            {searchMode === 'interpretation' && showAnnotationList && (
              <div className="mt-2 border rounded p-2 bg-blue-50 max-h-60 overflow-y-auto">
                <div className="flex justify-between items-center mb-2">
                  <div className="text-xs font-medium text-blue-800 flex items-center gap-1">
                    Monosemantic Annotations ({allAnnotations.length})
                    <div className="relative group">
                      <div className="w-4 h-4 bg-gray-200 rounded-full flex items-center justify-center text-gray-700 cursor-help">?</div>
                      <div className="absolute left-0 bottom-full mb-2 w-64 bg-white p-2 rounded shadow-lg border border-gray-200 text-gray-700 text-xs opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity z-10">
                        These annotations are the <span className="font-bold">only</span> significant feature in at least one latent. 
                        Click any annotation to find latents that are truly monosemantic (respond only to this single feature).
                        <div className="mt-1 pt-1 border-t border-gray-100">
                          <span className="font-semibold">Example:</span> If "5 LTR" is listed, there's at least one latent that responds <em>only</em> to "5 LTR" and nothing else.
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    True single-feature detectors
                  </div>
                </div>
                
                <input
                  type="text"
                  className="w-full p-1 text-xs border rounded mb-2"
                  placeholder="Filter annotations..."
                  onChange={(e) => {
                    // This just filters the displayed annotations, not the actual search
                    // We don't need to store this in state since it only affects this UI
                    const filterElements = document.querySelectorAll('.annotation-item');
                    const filterValue = e.target.value.toLowerCase();
                    
                    filterElements.forEach(el => {
                      const shouldShow = el.textContent.toLowerCase().includes(filterValue);
                      el.style.display = shouldShow ? 'flex' : 'none';
                    });
                  }}
                />
                
                <div className="flex flex-wrap gap-1">
                  {allAnnotations.length > 0 ? (
                    allAnnotations.map((anno, idx) => (
                      <button
                        key={idx}
                        className="annotation-item flex items-center text-xs bg-white text-blue-700 px-1 py-0.5 rounded border border-blue-200 hover:bg-blue-100"
                        onClick={() => {
                          setSearchTerm(anno.text);
                          setShowAnnotationList(false);
                        }}
                        title={`${anno.count} latents respond ONLY to "${anno.text}" and nothing else`}
                      >
                        <span>{anno.text}</span>
                        <span className="ml-1 bg-purple-100 text-purple-800 px-1 rounded-full text-[10px] font-medium">
                          {anno.count}
                        </span>
                      </button>
                    ))
                  ) : (
                    <span className="text-xs text-gray-500">No annotations found</span>
                  )}
                </div>
              </div>
            )}
          </div>
          
          <div className="p-2 border-b flex gap-2">
            <button 
              className="bg-blue-500 text-white px-2 py-1 rounded text-sm"
              onClick={handleSelectAll}
            >
              Select All
            </button>
            <button 
              className="bg-gray-300 px-2 py-1 rounded text-sm"
              onClick={handleSelectNone}
            >
              Select None
            </button>
          </div>

          {searchTerm && (
            <div className="p-2 bg-blue-50 flex items-center justify-between">
              <div className="text-blue-800 text-sm">
                {filteredLatents.length} latents match your search: "{searchTerm}"
              </div>
              {filteredLatents.length > 0 && (
                <button 
                  className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                  onClick={handleSelectFound}
                >
                  Select All Found
                </button>
              )}
            </div>
          )}
          
          <div className="p-2">
            {Object.keys(groupedLatents).length > 0 ? (
              Object.entries(groupedLatents).map(([group, latents]) => (
                <div key={group} className="mb-3">
                  <div 
                    className="flex items-center font-medium text-gray-700 mb-1 cursor-pointer hover:bg-gray-100 p-1 rounded"
                    onClick={() => handleSelectGroup(group)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      {latents.every(l => selectedLatents.includes(l)) 
                        ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        : latents.some(l => selectedLatents.includes(l))
                          ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                          : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      }
                    </svg>
                    {group === 'Search Results' ? 'Search Results' : `Group ${group}`}
                  </div>
                  <div className="ml-4 space-y-1">
                    {latents.map((latent) => (
                      <div key={latent} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={`latent-${latent}`}
                          checked={selectedLatents.includes(latent)}
                          onChange={() => handleToggleLatent(latent)}
                          className="form-checkbox h-4 w-4 text-blue-600"
                        />
                        <label htmlFor={`latent-${latent}`} className="cursor-pointer flex-1">
                          {searchMode === 'interpretation' && searchTerm ? (
                            <div>
                              <div>Latent {latent}</div>
                              {neuronData[latent]?.activations[0] && (
                                <div className="text-xs text-gray-500 truncate">
                                  {neuronData[latent].activations[0].annotations.toString().replace(/[\[\]']/g, '')}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span>Latent {latent}</span>
                          )}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-2 text-gray-500">No latents found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const EnhancedChart = ({ data, title, latentId }) => {
  const [zoomDomain, setZoomDomain] = useState(null);
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [showLegend, setShowLegend] = useState(false);
  
  // Find max and min values to set Y-axis domain and reference lines
  const maxVal = Math.max(...data.map(d => d.value));
  
  // Check if the first (most activating) input has 0 activation
  const isDeadLatent = data.length > 0 && data[0].value === 0;
  
  const meanVal = data.reduce((sum, d) => sum + d.value, 0) / data.length;
  const threshold = meanVal + (maxVal - meanVal) * 0.5; // Example threshold

  const handleMouseOver = (data) => {
    setHoveredPoint(data);
  };

  const handleResetZoom = () => {
    setZoomDomain(null);
  };
  
  const toggleLegend = () => {
    setShowLegend(!showLegend);
  };

  return (
    <div className="relative">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-xl font-medium">
          {title}
        </h3>
        <div className="flex gap-2">
          <button
            className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded flex items-center gap-1 transition-colors"
            onClick={toggleLegend}
            title="Show explanation of the chart"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="16" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
            {showLegend ? 'Hide Guide' : 'Chart Guide'}
          </button>
          
          {zoomDomain && !isDeadLatent && (
            <button 
              className="text-xs bg-blue-500 text-white px-2 py-1 rounded flex items-center gap-1 hover:bg-blue-600 transition-colors"
              onClick={handleResetZoom}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                <polyline points="9 22 9 12 15 12 15 22"></polyline>
              </svg>
              Reset View
            </button>
          )}
        </div>
      </div>
      
      {showLegend && (
        <div className="mb-3 p-3 bg-gray-50 rounded border border-gray-200 text-sm">
          <div className="font-medium mb-1 text-gray-700">How to use this chart:</div>
          <ul className="list-disc list-inside text-gray-600 space-y-1">
            <li>Each point represents a DNA sequence that activates this latent</li>
            <li>Higher activation values indicate stronger response to the sequence</li>
            <li><span className="inline-block w-3 h-3 bg-purple-500 rounded-full mr-1"></span> Purple line shows activation pattern across different sequences</li>
            {LATENT_THRESHOLDS.hasOwnProperty(latentId) && (
              <li><span className="inline-block w-6 h-0 border border-dashed border-red-500 mr-1"></span> Red dashed line shows the activation threshold for this latent</li>
            )}
            <li className="font-medium text-blue-700 mt-1">Click and drag to zoom in on specific sequences</li>
          </ul>
          <div className="mt-2 pt-2 border-t border-gray-200">
            <div className="font-medium mb-1 text-gray-700">Chart axes:</div>
            <ul className="list-disc list-inside text-gray-600 space-y-1">
              <li><span className="font-semibold">X-axis (Tokens):</span> DNA sequence tokens ordered by activation strength</li>
              <li><span className="font-semibold">Y-axis (Activation):</span> How strongly the latent responds to each sequence (higher values = stronger detection)</li>
            </ul>
          </div>
          <div className="mt-2 pt-2 border-t border-gray-200">
            <div className="text-xs text-gray-600">
              <span className="font-medium">GC Content</span> is shown for each sequence in the detailed view below. It represents the percentage of G and C bases in the full genomic context.
            </div>
          </div>
        </div>
      )}
      
      <div className="h-[300px]">
        {isDeadLatent ? (
          // Display an empty chart with a message for dead latents
          <div className="h-full flex items-center justify-center bg-gray-50 rounded border border-gray-200">
            <div className="text-center">
              <div className="text-red-500 font-bold mb-2">Dead Latent</div>
              <div className="text-gray-500 text-sm">No activations found</div>
              <div className="mt-3 max-w-xs mx-auto text-xs text-gray-400">
                This latent doesn't activate for any sequence in the dataset. 
                It may have been pruned during training or specializes in features not present in the data.
              </div>
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart 
              data={data}
              margin={{ top: 10, right: 30, left: 50, bottom: 5 }}
              onMouseDown={(e) => e && e.activeCoordinate && setZoomDomain({
                x: [e.activeCoordinate.x, e.activeCoordinate.x]
              })}
              onMouseMove={(e) => {
                if (zoomDomain && e && e.activeCoordinate) {
                  setZoomDomain({
                    x: [zoomDomain.x[0], e.activeCoordinate.x]
                  });
                }
              }}
              onMouseUp={() => {
                if (zoomDomain && zoomDomain.x[0] === zoomDomain.x[1]) {
                  setZoomDomain(null);
                }
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="input" 
                domain={zoomDomain ? [
                  data[Math.max(0, Math.min(data.length - 1, Math.floor(zoomDomain.x[0] / 10)))].input, 
                  data[Math.max(0, Math.min(data.length - 1, Math.ceil(zoomDomain.x[1] / 10)))].input
                ] : ['auto', 'auto']}
                allowDataOverflow
                label={{ value: 'Tokens', position: 'insideBottom', offset: -5, style: { textAnchor: 'middle' } }}
                tick={false}
              />
              <YAxis 
                domain={[0, LATENT_THRESHOLDS.hasOwnProperty(latentId) ? 
                  Math.max(maxVal * 1.1, LATENT_THRESHOLDS[latentId] * 1.1) : 
                  maxVal * 1.1
                ]} 
                width={45}
                tickFormatter={(value) => value.toFixed(1)}
                label={{ value: 'Activation', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }}
              />
              <Tooltip 
                formatter={(value, name) => [value.toFixed(3), 'Activation']}
                labelFormatter={(label) => `Input: ${label}`}
                contentStyle={{ backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '4px' }}
              />
              
              {/* Add custom threshold line for explained latents */}
              {LATENT_THRESHOLDS.hasOwnProperty(latentId) && (
                <ReferenceLine 
                  y={LATENT_THRESHOLDS[latentId]} 
                  stroke="#ef4444" 
                  strokeWidth={2}
                  strokeDasharray="3 3" 
                  label={{ 
                    value: 'Activation Threshold', 
                    position: 'insideLeft', 
                    fill: '#ef4444',
                    fontSize: 12
                  }} 
                />
              )}
              
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke="#8b5cf6" 
                strokeWidth={2}
                dot={{ r: 2, fill: '#8b5cf6' }}
                activeDot={{ r: 8, fill: '#6d28d9', onClick: (e, data) => handleMouseOver(data) }}
                isAnimationActive={false}
                name="Activation"
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
      
      {hoveredPoint && !isDeadLatent && (
        <div className="mt-2 p-3 bg-blue-50 rounded border border-blue-200">
          <div className="flex justify-between items-center mb-2">
            <p className="font-medium text-blue-800">Selected DNA Sequence</p>
            <div className="flex gap-2">
              <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded-full">
                Activation: {hoveredPoint.payload.value.toFixed(3)}
              </span>
              <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-0.5 rounded-full">
                GC Content: {(hoveredPoint.payload.gcContent * 100).toFixed(1)}%
              </span>
            </div>
          </div>
          <div className="bg-white p-2 rounded border border-blue-100 font-mono text-sm mb-2">
            {hoveredPoint.payload.input}
          </div>
          <p className="text-xs text-gray-600">Context: <span className="text-gray-800">{hoveredPoint.payload.context}</span></p>
        </div>
      )}
    </div>
  );
};

// Thresholds for explained latents
const LATENT_THRESHOLDS = {
  "53": 11,
  "1885": 1,
  "3131": 5,
  "2298": 5,
  "947": 5,
  "3451": 4,
  "1819": 5,
  "82": 4,
  "1240": 14,
  "1265": 6,
  "1280": 4,
  "2846": 4
};

// Genomics glossary to help users understand terminology
const GENOMICS_GLOSSARY = {
  "LTR": "Long Terminal Repeat - DNA sequences found at the ends of retroviral genomes that are essential for viral integration into host DNA",
  "Promoter": "DNA sequences that initiate gene transcription by providing binding sites for RNA polymerase and transcription factors",
  "Enhancer": "DNA sequences that increase transcription of genes by helping transcription factors bind more efficiently",
  "ORI": "Origin of Replication - DNA sequences where DNA replication begins",
  "Resistance Gene": "Genes that provide resistance to antibiotics or other selective agents, often used as genetic markers",
  "CMV": "Cytomegalovirus - A virus whose promoters and enhancers are widely used in genetic engineering for strong gene expression",
  "SV40": "Simian Virus 40 - A virus whose genetic elements are commonly used in molecular biology research",
  "Transcription": "The process of creating an RNA copy of a DNA sequence, the first step in gene expression",
  "Vector": "A DNA molecule used as a vehicle to transfer foreign genetic material into a cell",
  "Selectable Marker": "A gene that allows cells containing it to be selected for in specific conditions, often antibiotic resistance",
  "GC Content": "The percentage of nucleotides in a DNA sequence that are either guanine (G) or cytosine (C). GC-rich regions often have different properties and functions from AT-rich regions, including increased thermal stability and distinctive regulatory roles."
};

const LATENT_EXPLANATIONS = {
  "53": {
    explanation: "This latent is specialised on 5' LTR. The 5' Long Terminal Repeat is a critical element of retroviruses and retrotransposons that acts as a promoter for viral gene expression and is essential for viral integration into the host genome.",
    f1Score: 0.882,
    category: "Viral Element",
    glossaryTerms: ["LTR", "Promoter", "Transcription", "GC Content"],
    wikipediaLink: "https://en.wikipedia.org/wiki/Long_terminal_repeat"
  },
  
  "1885": {
    explanation: "This latent is specialised on C9orf85. C9orf85 (Chromosome 9 Open Reading Frame 85) is a protein-coding gene in the human genome that produces a protein whose function remains largely uncharacterized but may be involved in cellular signaling pathways.",
    f1Score: 0.776,
    category: "Human Gene",
    glossaryTerms: [],
    wikipediaLink: "https://en.wikipedia.org/wiki/C9orf85"
  },
  
  "3131": {
    explanation: "This latent is specialised on CMV Enhancer. The Cytomegalovirus (CMV) enhancer is a powerful regulatory element that drives high-level gene expression in a wide range of cell types and is commonly used in molecular biology to enhance gene expression in mammalian expression vectors.",
    f1Score: 0.919,
    category: "Regulatory Element",
    glossaryTerms: ["CMV", "Enhancer", "Vector"],
    wikipediaLink: "https://en.wikipedia.org/wiki/Cytomegalovirus"
  },
  
  "2298": {
    explanation: "This latent is specialised on CMV Promoter, UL126. The CMV Promoter with UL126 represents a specific regulatory region from the human cytomegalovirus that controls strong, constitutive gene expression and is often utilized in genetic engineering for reliable transgene expression.",
    f1Score: 0.766,
    category: "Regulatory Element",
    glossaryTerms: ["CMV", "Promoter", "Transcription"],
    wikipediaLink: "https://en.wikipedia.org/wiki/Cytomegalovirus"
  },
  
  "947": {
    explanation: "This latent is specialised on Puromycin Resistance. The puromycin resistance gene encodes for puromycin N-acetyltransferase (PAC), which inactivates the antibiotic puromycin, allowing for the selection of successfully transformed cells in molecular biology experiments.",
    f1Score: 0.894,
    category: "Selectable Marker",
    glossaryTerms: ["Resistance Gene", "Selectable Marker"],
    wikipediaLink: "https://en.wikipedia.org/wiki/Puromycin"
  },
  
  "3451": {
    explanation: "This latent is specialised on SV40 Promoter. The Simian Virus 40 (SV40) promoter is a well-characterized regulatory element that drives strong gene expression in mammalian cells and is widely used in recombinant DNA technology for consistent expression of transgenes.",
    f1Score: 0.764,
    category: "Regulatory Element",
    glossaryTerms: ["SV40", "Promoter"],
    wikipediaLink: "https://en.wikipedia.org/wiki/Simian_virus_40"
  },
  
  "1819": {
    explanation: "This latent is specialised on SV40 Promoter & ORI. This sequence combines the SV40 promoter with its origin of replication (ORI), creating a functional unit that both initiates DNA replication and drives gene expression in eukaryotic cells, making it valuable for plasmid maintenance and expression.",
    f1Score: 0.729,
    category: "Regulatory Element",
    glossaryTerms: ["SV40", "Promoter", "ORI"],
    wikipediaLink: "https://en.wikipedia.org/wiki/Origin_of_replication"
  },
  
  "82": {
    explanation: "This latent is specialised on Streptomycin Resistance. The streptomycin resistance gene encodes an aminoglycoside-modifying enzyme that prevents the antibiotic from binding to bacterial ribosomes, providing a selectable marker for bacterial transformation in molecular cloning.",
    f1Score: 0.608,
    category: "Selectable Marker",
    glossaryTerms: ["Resistance Gene", "Selectable Marker"],
    wikipediaLink: "https://en.wikipedia.org/wiki/Streptomycin"
  },
  
  "1240": {
    explanation: "This latent is specialised on Chicken β-actin Promoter. The chicken beta-actin promoter drives high-level, constitutive gene expression across various cell types and tissues due to its association with the ubiquitously expressed cytoskeletal protein. This promoter is particularly effective in both avian and mammalian expression systems.",
    f1Score: 0.645,
    category: "Regulatory Element",
    glossaryTerms: ["Promoter"],
    wikipediaLink: "https://www.ncbi.nlm.nih.gov/gene/396526#:~:text=beta%2Dactin%20is%20a%20substrate,actin%20cytoskeleton%20by%20cross%2Dlinking."
  },
  
  "1265": {
    explanation: "This latent is specialised on Envelope. Viral envelope genes encode the proteins that form the outer layer of enveloped viruses, mediating viral entry into host cells through receptor binding and membrane fusion. These proteins are crucial determinants of viral tropism and are important targets for vaccine development.",
    f1Score: 0.658,
    category: "Viral Element",
    glossaryTerms: [],
    wikipediaLink: "https://en.wikipedia.org/wiki/Viral_envelope"
  },
  
  "1280": {
    explanation: "This latent is specialised on f1 ORI. The f1 origin of replication (ORI) is derived from the f1 bacteriophage and allows for the production of single-stranded DNA when the host plasmid is infected with helper phage. This feature is particularly useful in site-directed mutagenesis and DNA sequencing applications.",
    f1Score: 0.794,
    category: "Functional Element",
    glossaryTerms: ["ORI"],
    wikipediaLink: "https://en.wikipedia.org/wiki/Ff_phages"
  },
  
  "2846": {
    explanation: "This latent is specialised on ORI. The origin of replication (ORI) is an essential DNA sequence where DNA replication is initiated, allowing for autonomous plasmid maintenance and propagation in host cells. Different ORI sequences determine copy number, host range, and replication efficiency of cloning vectors.",
    f1Score: 0.739,
    category: "Functional Element",
    glossaryTerms: ["ORI", "Vector"],
    wikipediaLink: "https://en.wikipedia.org/wiki/Origin_of_replication"
  }
};

const NeuroVis = () => {
  // FIXED: All hooks are declared at the top level before any conditional returns
  const [neuronData, setNeuronData] = useState(null);
  const [selectedLatents, setSelectedLatents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null); // Moved up before any returns!

  // ONLY have this useEffect, remove the other one
useEffect(() => {
    setIsLoading(true);
    
    // Try all_latents.json first (the new data)
    fetch('/all_latents.json?v=' + Date.now())
      .then(res => {
        if (!res.ok) {
          throw new Error(`Failed to fetch all_latents.json: ${res.status}`);
        }
        return res.json();
      })
      .then(rawData => {
        console.log('Successfully loaded all_latents.json');
        
        // Process the data to ensure it's in the expected format
        const processedData = processData(rawData, 'all_latents.json');
        
        setNeuronData(processedData);
        // Default latents to display as specified
        const defaultLatents = ["53", "1885", "3131", "2298", "947", "3451", "1819", "82", "1240", "1265", "1280", "2846"];
        // Filter to only include latents that actually exist in the data
        const availableDefaultLatents = defaultLatents.filter(id => processedData.hasOwnProperty(id));
        setSelectedLatents(availableDefaultLatents);
        setIsLoading(false);
      })
      .catch(err => {
        console.error('Error with all_latents.json, trying data.json:', err);
        
        // Fall back to data.json
        fetch('/data.json?v=' + Date.now())
          .then(res => {
            if (!res.ok) {
              throw new Error(`Failed to fetch data.json: ${res.status}`);
            }
            return res.json();
          })
          .then(data => {
            console.log('Successfully loaded data.json');
            
            // Process the data to ensure it's in the expected format
            const processedData = processData(data, 'data.json');
            
            setNeuronData(processedData);
            // Default latents to display as specified
            const defaultLatents = ["53", "1885", "3131", "2298", "947", "3451", "1819", "82", "1240", "1265", "1280", "2846"];
            // Filter to only include latents that actually exist in the data
            const availableDefaultLatents = defaultLatents.filter(id => processedData.hasOwnProperty(id));
            setSelectedLatents(availableDefaultLatents);
            setIsLoading(false);
          })
          .catch(finalErr => {
            console.error('Error loading all data sources:', finalErr);
            setErrorMessage(`Failed to load data: ${finalErr.message}. Please try again later.`);
            setIsLoading(false);
          });
      });
  }, []);

  if (isLoading) return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      <span className="ml-3">Loading genomic data...</span>
    </div>
  );


  if (isLoading) return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      <span className="ml-3">Loading genomic data...</span>
    </div>
  );

  if (!neuronData) return (
    <div className="p-4 bg-red-100 text-red-700 rounded">
      <h2 className="font-bold mb-2">Error loading genomic data</h2>
      <p>{errorMessage || "Please check the data source and try again."}</p>
      <div className="mt-4 p-2 bg-red-50 text-xs font-mono">
        <p className="mb-1">Debugging information:</p>
        <ul className="list-disc list-inside">
          <li>Base URL: {import.meta.env.BASE_URL || "[empty]"}</li>This dashboard visualizes latents from a sparse autoencoder (SAE) trained on Nucleotide Transformer 50m
          activations.
          <li>Location: {window.location.href}</li>
        </ul>
      </div>
    </div>
  );

  return (
    <div className="p-4 max-w-full mx-auto">
      <h1 className="text-3xl font-bold mb-3 text-center">SAE Latent Activations Dashboard</h1>
      
      <div className="bg-blue-50 p-4 rounded-lg mb-6 border border-blue-100 shadow-sm">
        <p className="text-center text-gray-700 mb-3">
          This dashboard visualizes latents from a sparse autoencoder (SAE) trained on 
          <a 
            href="https://www.nature.com/articles/s41592-024-02523-z" 
            target="_blank" 
            rel="noopener noreferrer"
            className="font-medium text-blue-700 hover:text-blue-900 mx-1"
          >
            Nucleotide Transformer
          </a>
          50m activations. The Nucleotide Transformer is a family of BERT-style genomic Language Models. Some latents represent interpretable genomic features learned by the model.
        </p>
        
        <div className="mt-4 bg-white p-3 rounded border border-blue-200 text-gray-700 mb-4">
          <h3 className="font-medium text-blue-800 text-center mb-2">How to Use This Dashboard</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <div className="p-2 bg-blue-50 rounded">
              <div className="font-medium mb-1 flex items-center">
                <span className="bg-blue-200 text-blue-800 w-5 h-5 inline-flex items-center justify-center rounded-full mr-1">1</span>
                Select Latents
              </div>
              <p>Choose specific latents to visualize by using the search feature or by selecting from groups. Try "Random Explained Latent" to explore latents with known functions.</p>
            </div>
            <div className="p-2 bg-blue-50 rounded">
              <div className="font-medium mb-1 flex items-center">
                <span className="bg-blue-200 text-blue-800 w-5 h-5 inline-flex items-center justify-center rounded-full mr-1">2</span>
                Explore Activations
              </div>
              <p>View how strongly each latent responds to different DNA sequences. Click and drag on charts to zoom in on regions of interest. Hover over points for details.</p>
            </div>
            <div className="p-2 bg-blue-50 rounded">
              <div className="font-medium mb-1 flex items-center">
                <span className="bg-blue-200 text-blue-800 w-5 h-5 inline-flex items-center justify-center rounded-full mr-1">3</span>
                Understand Features
              </div>
              <p>Read the interpretations for each latent to understand what genomic elements it detects. Check the genomics glossary for unfamiliar terms.</p>
            </div>
          </div>
        </div>
        
        <div className="flex justify-center gap-6 text-sm flex-wrap">
          <a 
            href="https://www.nature.com/articles/s41592-024-02523-z" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
            </svg>
            Nucleotide Transformer Paper
          </a>
          <a 
            href="https://arxiv.org/error" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
            Sparse Autoencoder Paper
          </a>
          <a 
            href="https://github.com/aaronmaiww/genomics-dashboard" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
            </svg>
            GitHub Repository
          </a>
          <button
            onClick={() => {
              if (!neuronData) return;
              
              // Convert the data to CSV format
              const csvRows = [];
              
              // Header row
              csvRows.push(['Latent ID', 'Sequence', 'Activation', 'Context', 'Annotations', 'E-Value'].join(','));
              
              // Data rows
              Object.entries(neuronData).forEach(([latentId, data]) => {
                data.activations.forEach(activation => {
                  const row = [
                    latentId,
                    `"${activation.input.replace(/"/g, '""')}"`,
                    activation.value,
                    `"${activation.context.replace(/"/g, '""')}"`,
                    `"${activation.annotations.toString().replace(/"/g, '""')}"`,
                    activation['e-value']
                  ];
                  csvRows.push(row.join(','));
                });
              });
              
              // Create and download CSV file
              const csvContent = csvRows.join('\n');
              const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.setAttribute('href', url);
              link.setAttribute('download', 'genomics_latent_activations.csv');
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}
            className="flex items-center gap-1 text-gray-600 hover:text-gray-900 transition-colors cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            Download Data (CSV)
          </button>
        </div>
      </div>
      
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <h2 className="text-xl">Select Latents to Visualize</h2>
          <div className="relative group">
            <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 cursor-help text-xs">?</div>
            <div className="absolute left-0 top-full mt-2 w-80 bg-white p-3 rounded shadow-lg border border-gray-200 text-gray-700 text-sm opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity z-10">
              <p className="mb-2">Each latent latent represents a feature learned by the Sparse Autoencoder when trained on genomic data.</p>
              <p className="mb-2">
                <span className="font-semibold">Monosemantic latents</span> activate specifically for one motif or biological feature (like promoters or enhancers).
              </p>
              <ul className="list-disc list-inside text-xs space-y-1">
                <li><span className="font-medium">Search by ID</span>: Find specific latent numbers</li>
                <li><span className="font-medium">Search by Content</span>: Find latents that respond to specific genomic features</li>
              </ul>
            </div>
          </div>
        </div>
        <LatentSelector 
          latents={Object.keys(neuronData)}
          selectedLatents={selectedLatents}
          onChange={setSelectedLatents}
          neuronData={neuronData}
        />
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            {selectedLatents.length > 0 
              ? `Showing ${selectedLatents.length} selected latents`
              : 'Please select latents to visualize'
            }
          </div>
          
          <div className="flex space-x-2">
            <button 
              className="px-3 py-1 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
              onClick={() => {
                // Get all available latent IDs
                const allLatents = Object.keys(neuronData);
                
                // Choose a random latent ID
                const randomIndex = Math.floor(Math.random() * allLatents.length);
                const randomLatent = allLatents[randomIndex];
                
                // Set as the only selected latent
                setSelectedLatents([randomLatent]);
              }}
            >
              Random Latent
            </button>
            
            <button 
              className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
              onClick={() => {
                // Get explained latent IDs
                const explainedLatents = Object.keys(LATENT_EXPLANATIONS);
                
                // Make sure we have explained latents
                if (explainedLatents.length > 0) {
                  // Choose a random explained latent
                  const randomIndex = Math.floor(Math.random() * explainedLatents.length);
                  const randomExplainedLatent = explainedLatents[randomIndex];
                  
                  // Set as the only selected latent
                  setSelectedLatents([randomExplainedLatent]);
                }
              }}
            >
              Random Explained Latent
            </button>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <details className="bg-white p-4 rounded-lg border shadow-sm">
          <summary className="text-lg font-medium cursor-pointer text-blue-700 hover:text-blue-900">
            Genomics Glossary & Terminology Reference
          </summary>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(GENOMICS_GLOSSARY).map(([term, definition]) => (
              <div key={term} className="p-3 bg-gray-50 rounded border border-gray-200">
                <h4 className="font-bold text-gray-900 mb-1">{term}</h4>
                <p className="text-sm text-gray-700">{definition}</p>
              </div>
            ))}
            <div className="p-3 bg-blue-50 rounded border border-blue-200 md:col-span-2">
              <h4 className="font-bold text-blue-800 mb-1">About Latents</h4>
              <p className="text-sm text-gray-700">
                Latents are individual units in the latent space of a Sparse Autoencoder (SAE) that learn to detect specific patterns
                in the activation space of the Nucleotide Transformer model. Some latents become specialized in recognizing 
                particular genomic features, allowing us to interpret what the language model has learned about DNA sequences.
              </p>
            </div>
          </div>
        </details>
      </div>

      {selectedLatents.length > 0 ? (
        <div className="grid grid-cols-1 gap-8">
          {selectedLatents.map(latent => (
            <div key={latent} className="border rounded-lg p-4 shadow-sm bg-white relative">
              <div className="bg-blue-100 -mx-4 -mt-4 mb-4 py-2 px-4 rounded-t-lg">
                <h2 className="text-2xl font-bold text-center text-blue-800 flex items-center justify-center">
                  Latent {latent}
                  {LATENT_EXPLANATIONS.hasOwnProperty(latent) && (
                    <div className="flex items-center ml-2">
                      <span className={`px-2 py-0.5 text-sm rounded-l-full ${
                        LATENT_EXPLANATIONS[latent].category === "Regulatory Element" ? "bg-blue-50 text-blue-800 border border-blue-200" :
                        LATENT_EXPLANATIONS[latent].category === "Viral Element" ? "bg-purple-50 text-purple-800 border border-purple-200" :
                        LATENT_EXPLANATIONS[latent].category === "Selectable Marker" ? "bg-green-50 text-green-800 border border-green-200" :
                        LATENT_EXPLANATIONS[latent].category === "Human Gene" ? "bg-yellow-50 text-yellow-800 border border-yellow-200" :
                        "bg-gray-50 text-gray-800 border border-gray-200"
                      }`}>
                        {LATENT_EXPLANATIONS[latent].category}
                      </span>
                      <span className="ml-px px-2 py-0.5 text-sm bg-green-100 text-green-800 border border-green-200 rounded-r-full group relative cursor-help">
                        Domain F1: {LATENT_EXPLANATIONS[latent].f1Score.toFixed(3)}
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block w-64 p-2 bg-gray-800 text-white text-xs rounded shadow-lg z-10">
                          <p className="mb-1 font-semibold">Domain F1-Score: {LATENT_EXPLANATIONS[latent].f1Score.toFixed(3)}</p>
                          <p>Higher scores indicate this latent is more precisely tuned to its specialized genomic element with fewer false activations on other elements.</p>
                        </div>
                      </span>
                    </div>
                  )}
                </h2>
              </div>
              
              <div className="flex flex-col lg:flex-row gap-6">
                <div className="lg:w-1/2">
                  <EnhancedChart 
                    data={neuronData[latent].activations} 
                    title="Activation Pattern"
                    latentId={latent}
                  />
                  
                  <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <h3 className="text-lg font-medium mb-2 text-yellow-800">Latent Interpretation</h3>
                    {(() => {
                      const activations = neuronData[latent].activations;
                      const maxVal = Math.max(...activations.map(d => d.value));
                      
                      // Check if the first (most activating) input has 0 activation
                      if (activations.length > 0 && activations[0].value === 0) {
                        return (
                          <div className="flex flex-col items-center justify-center py-8">
                            <p className="text-xl font-bold text-red-500">Dead Latent</p>
                            <p className="text-sm text-gray-500 mt-2">
                              This latent has no activation for any input.
                            </p>
                          </div>
                        );
                      }
                      
                      // Determine threshold
                      let threshold;
                      if (LATENT_THRESHOLDS.hasOwnProperty(latent)) {
                        // Use custom threshold for explained latents
                        threshold = LATENT_THRESHOLDS[latent];
                      } else {
                        // Calculate dynamic threshold for unexplained latents
                        const meanVal = activations.reduce((sum, d) => sum + d.value, 0) / activations.length;
                        threshold = meanVal + (maxVal - meanVal) * 0.5;
                      }
                      
                      // Filter to only show items above threshold
                      const aboveThresholdActivations = activations.filter(item => item.value >= threshold);
                      
                      // Extract unique annotations and motifs from above-threshold activations
                      const thresholdAnnotations = Array.from(new Set(aboveThresholdActivations
                        .flatMap(item => item.annotations.toString().replace(/[\[\]']/g, '').split(','))
                        .map(anno => anno.trim())
                        .filter(Boolean)
                      ));
                      
                      const thresholdMotifs = Array.from(new Set(aboveThresholdActivations.map(item => item.input)));
                      
                      // Check if we have a custom explanation for this latent
                      const hasCustomExplanation = LATENT_EXPLANATIONS.hasOwnProperty(latent);
                      
                      return (
                        <>
                          {hasCustomExplanation ? (
                            <div className="text-sm text-gray-700">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                                    LATENT_EXPLANATIONS[latent].category === "Regulatory Element" ? "bg-blue-100 text-blue-800" :
                                    LATENT_EXPLANATIONS[latent].category === "Viral Element" ? "bg-purple-100 text-purple-800" :
                                    LATENT_EXPLANATIONS[latent].category === "Selectable Marker" ? "bg-green-100 text-green-800" :
                                    LATENT_EXPLANATIONS[latent].category === "Human Gene" ? "bg-yellow-100 text-yellow-800" :
                                    "bg-gray-100 text-gray-800"
                                  }`}>
                                    {LATENT_EXPLANATIONS[latent].category}
                                  </span>
                                  <p>
                                    <strong className="text-gray-900 text-base">{LATENT_EXPLANATIONS[latent].explanation.split('.')[0]}.</strong>
                                  </p>
                                </div>
                                <div className="flex items-center gap-1 group relative">
                                  <span className="text-xs text-gray-500">Domain F1-score:</span>
                                  <span className={`text-sm font-bold px-2 py-0.5 rounded ${
                                    LATENT_EXPLANATIONS[latent].f1Score >= 0.8 ? 'bg-green-100 text-green-800' : 
                                    LATENT_EXPLANATIONS[latent].f1Score >= 0.7 ? 'bg-blue-100 text-blue-800' : 
                                    'bg-yellow-100 text-yellow-800'
                                  }`}>
                                    {LATENT_EXPLANATIONS[latent].f1Score.toFixed(3)}
                                  </span>
                                  <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block w-64 p-2 bg-gray-800 text-white text-xs rounded shadow-lg z-10">
                                    <p className="mb-1 font-semibold">What is the Domain F1-score?</p>
                                    <p>The Domain F1-score measures how precisely this latent identifies its specialized genomic element. Higher scores (closer to 1.0) indicate the latent responds almost exclusively to this element and rarely to others.</p>
                                  </div>
                                </div>
                              </div>
                              
                              <p className="text-gray-700 mb-2">
                                {LATENT_EXPLANATIONS[latent].explanation.split('.').slice(1).join('.').trim()}
                              </p>
                              
                              <div className="flex justify-between items-center mt-2">
                                {LATENT_EXPLANATIONS[latent].wikipediaLink && (
                                  <a 
                                    href={LATENT_EXPLANATIONS[latent].wikipediaLink} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                      <polyline points="15 3 21 3 21 9"></polyline>
                                      <line x1="10" y1="14" x2="21" y2="3"></line>
                                    </svg>
                                    Learn more
                                  </a>
                                )}
                              </div>
                              
                              {LATENT_EXPLANATIONS[latent].glossaryTerms.length > 0 && (
                                <div className="mt-3 bg-gray-50 p-2 rounded border border-gray-200">
                                  <details>
                                    <summary className="cursor-pointer text-blue-600 hover:text-blue-800 font-medium">
                                      Genomics Glossary Terms
                                    </summary>
                                    <div className="mt-2 space-y-2">
                                      {LATENT_EXPLANATIONS[latent].glossaryTerms.map(term => (
                                        <div key={term} className="text-xs">
                                          <span className="font-bold">{term}:</span> {GENOMICS_GLOSSARY[term]}
                                        </div>
                                      ))}
                                    </div>
                                  </details>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="text-sm text-gray-700">
                              <p className="mb-2">
                                <strong className="text-gray-900">Undetermined Latent</strong> - If this latent has a meaning, we have not identified it yet.
                              </p>
                              <p className="text-xs text-gray-500">
                                It may respond to none or multiple genomic features or to features not yet analyzed in our dataset.
                              </p>
                            </div>
                          )}
                        </>
                      );
                    })()}
                    
                  </div>
                </div>
                
                <div className="lg:w-1/2">
                  {/* Check if the first (most activating) input has 0 activation */}
                  {neuronData[latent].activations.length > 0 && neuronData[latent].activations[0].value === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full bg-gray-50 p-8 rounded border border-gray-200">
                      <div className="text-red-500 text-2xl font-bold mb-4">Dead Latent</div>
                      <div className="text-gray-500 text-center">
                        <p className="mb-2">This latent does not activate for any input sequence.</p>
                        <p>It may be pruned or unused in the model.</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <h3 className="text-lg mb-2 font-medium">
                        Top {neuronData[latent].activations.length} Activating Inputs
                      </h3>
                      <div className="space-y-2 max-h-[500px] overflow-y-auto">
                        {neuronData[latent].activations.map((item, idx) => (
                          <div key={idx} className="flex flex-col p-3 bg-gray-50 rounded hover:bg-gray-100 transition-colors">
                            <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                              <div className="flex items-baseline gap-2">
                                <span className="text-xs font-semibold text-gray-500">DNA Motif:</span>
                                <span className="font-medium font-mono text-black">{item.input}</span>
                              </div>
                              <div className="flex gap-3">
                                <div className="flex flex-col items-end">
                                  <span className="text-xs font-semibold text-gray-500">Activation:</span>
                                  <span className="font-mono text-blue-600 font-bold">{item.value.toFixed(3)}</span>
                                </div>
                                <div className="flex flex-col items-end">
                                  <span className="text-xs font-semibold text-gray-500">GC Content:</span>
                                  <span className="font-mono text-green-600 font-bold">{(item.gcContent * 100).toFixed(1)}%</span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="mt-2">
                              <div className="text-xs font-semibold text-gray-500 mb-1">Genomic Context:</div>
                              <div className="text-sm mt-1 bg-white p-1 rounded border border-gray-200">
                                <span className="text-gray-500">
                                  {item.context.split('|')[0]}
                                </span>
                                <span className="font-bold text-blue-700">
                                  |{item.input}|
                                </span>
                                <span className="text-gray-500">
                                  {item.context.split('|')[2]}
                                </span>
                              </div>
                            </div>
                            
                            <div className="mt-2 grid grid-cols-2 gap-2">
                              <div>
                                <div className="text-xs font-semibold text-gray-500 mb-1">Annotations:</div>
                                <div className="text-sm text-gray-600 bg-white p-1 rounded border border-gray-200">
                                  {item.annotations}
                                </div>
                              </div>
                              <div>
                                <div className="text-xs font-semibold text-gray-500 mb-1 flex items-center gap-1">
                                  Statistical Significance:
                                  <div className="relative group">
                                    <div className="w-4 h-4 bg-gray-200 rounded-full flex items-center justify-center text-gray-700 cursor-help text-[10px]">?</div>
                                    <div className="absolute left-0 bottom-full mb-2 w-64 bg-white p-2 rounded shadow-lg border border-gray-200 text-gray-700 text-xs opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity z-10">
                                      <p className="font-semibold mb-1">E-value Explained:</p>
                                      <p>The Expectation value (E-value) describes the statistical significance of a sequence match. Lower E-values indicate stronger evidence that the match is not due to random chance.</p>
                                      <p className="mt-1"><span className="font-medium">Example:</span> An E-value of 1e-10 means you'd expect to see this match by random chance only once in 10 billion random sequences.</p>
                                    </div>
                                  </div>
                                </div>
                                <div className="text-xs bg-white p-1 rounded border border-gray-200">
                                  <span className="font-mono text-black">E-value: {item["e-value"]}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center p-8 bg-gray-50 rounded-lg">
          <p className="text-gray-600">Please select one or more latents to visualize</p>
        </div>
      )}
    </div>
  );
};

export default NeuroVis;
