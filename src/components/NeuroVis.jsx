import React, { useState, useEffect, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts';

const LatentSelector = ({ latents, selectedLatents, onChange, neuronData }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchMode, setSearchMode] = useState('id'); // 'id' or 'interpretation'
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

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
      // Search within annotations and sequences
      const activations = neuronData[latent]?.activations || [];
      if (activations.length === 0) return false;
      
      // Check if any annotations contain the search term
      const hasMatchingAnnotation = activations.some(item => 
        item.annotations && 
        item.annotations.toString().toLowerCase().includes(searchTerm.toLowerCase())
      );
      
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
                onClick={() => setSearchMode('id')}
              >
                Search by ID
              </button>
              <button
                className={`px-3 py-1 text-sm rounded-r-md ${searchMode === 'interpretation' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
                onClick={() => setSearchMode('interpretation')}
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
            </div>
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
  
  // Find max and min values to set Y-axis domain and reference lines
  const maxVal = Math.max(...data.map(d => d.value));
  const meanVal = data.reduce((sum, d) => sum + d.value, 0) / data.length;
  const threshold = meanVal + (maxVal - meanVal) * 0.5; // Example threshold

  const handleMouseOver = (data) => {
    setHoveredPoint(data);
  };

  const handleResetZoom = () => {
    setZoomDomain(null);
  };

  return (
    <div className="relative">
      <h3 className="text-xl mb-2 font-medium">
        {title}
      </h3>
      
      {zoomDomain && (
        <button 
          className="absolute top-0 right-0 z-10 bg-blue-500 text-white px-2 py-1 rounded text-sm"
          onClick={handleResetZoom}
        >
          Reset Zoom
        </button>
      )}
      
      <div className="h-[300px]">
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
              hide
            />
            <YAxis 
              domain={[0, maxVal * 1.1]} 
              width={45}
              tickFormatter={(value) => value.toFixed(1)}
            />
            <Tooltip 
              formatter={(value, name) => [value.toFixed(3), 'Activation']}
              labelFormatter={(label) => `Input: ${label}`}
            />
            <ReferenceLine 
              y={meanVal} 
              stroke="green" 
              strokeDasharray="3 3" 
              label={{ 
                value: 'Mean', 
                position: 'insideLeft',
                offset: 10,
                fill: 'green', 
                fontSize: 12 
              }} 
            />
            <ReferenceLine 
              y={threshold} 
              stroke="red" 
              strokeDasharray="3 3" 
              label={{ 
                value: 'Threshold', 
                position: 'insideLeft', 
                offset: 10,
                fill: 'red', 
                fontSize: 12
              }} 
            />
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke="#8884d8" 
              activeDot={{ r: 8, onClick: (e, data) => handleMouseOver(data) }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      {hoveredPoint && (
        <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200">
          <p className="font-medium">Selected Point: {hoveredPoint.payload.input}</p>
          <p className="text-sm">Value: {hoveredPoint.payload.value.toFixed(3)}</p>
          <p className="text-sm">Context: {hoveredPoint.payload.context}</p>
        </div>
      )}
    </div>
  );
};

const NeuroVis = () => {
  const [neuronData, setNeuronData] = useState(null);
  const [selectedLatents, setSelectedLatents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    fetch('/latents_data.json')
      .then(res => res.json())
      .then(data => {
        setNeuronData(data);
        // Extract initial latent keys (limited to first 5 for better initial performance)
        const allLatents = Object.keys(data);
        setSelectedLatents(allLatents.slice(0, 5));
        setIsLoading(false);
      })
      .catch(err => {
        console.error('Error loading data:', err);
        setIsLoading(false);
      });
  }, []);

  if (isLoading) return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      <span className="ml-3">Loading genomic data...</span>
    </div>
  );

  if (!neuronData) return (
    <div className="p-4 bg-red-100 text-red-700 rounded">
      Error loading genomic data. Please check the data source and try again.
    </div>
  );

  return (
    <div className="p-4 max-w-full mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-center">SAE Latent Activations Dashboard</h1>
      
      <div className="mb-6">
        <h2 className="text-xl mb-2">Select Latents to Visualize</h2>
        <LatentSelector 
          latents={Object.keys(neuronData)}
          selectedLatents={selectedLatents}
          onChange={setSelectedLatents}
          neuronData={neuronData}
        />
        <div className="text-sm text-gray-500">
          {selectedLatents.length > 0 
            ? `Showing ${selectedLatents.length} selected latents`
            : 'Please select latents to visualize'
          }
        </div>
      </div>

      {selectedLatents.length > 0 ? (
        <div className="grid grid-cols-1 gap-8">
          {selectedLatents.map(latent => (
            <div key={latent} className="border rounded-lg p-4 shadow-sm bg-white relative">
              <div className="bg-blue-100 -mx-4 -mt-4 mb-4 py-2 px-4 rounded-t-lg">
                <h2 className="text-2xl font-bold text-center text-blue-800">Latent {latent}</h2>
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
                      const meanVal = activations.reduce((sum, d) => sum + d.value, 0) / activations.length;
                      const threshold = meanVal + (maxVal - meanVal) * 0.5;
                      
                      // Filter to only show items above threshold
                      const aboveThresholdActivations = activations.filter(item => item.value >= threshold);
                      
                      // Extract unique annotations and motifs from above-threshold activations
                      const thresholdAnnotations = Array.from(new Set(aboveThresholdActivations
                        .flatMap(item => item.annotations.toString().replace(/[\[\]']/g, '').split(','))
                        .map(anno => anno.trim())
                        .filter(Boolean)
                      ));
                      
                      const thresholdMotifs = Array.from(new Set(aboveThresholdActivations.map(item => item.input)));
                      
                      // Get top annotations and motifs for summary
                      const topAnnotations = thresholdAnnotations.slice(0, 2).join(', ');
                      const topMotifs = thresholdMotifs.slice(0, 3).join(', ');
                      
                      return (
                        <>
                          <p className="text-sm text-gray-700">
                            This latent appears to be detecting patterns related to <strong className="text-gray-900">{topAnnotations || 'unknown functions'}</strong>. 
                            The significant motifs activating this latent are <strong className="text-gray-900 font-mono">{topMotifs || 'not clearly defined'}</strong>.
                          </p>
                          
                          <div className="mt-2 p-2 bg-white rounded border border-yellow-100">
                            <div className="flex justify-between items-center mb-1">
                              <div className="text-xs font-medium text-gray-500">Significant Annotations (above threshold):</div>
                              <div className="text-xs text-gray-400">Threshold: {threshold.toFixed(2)}</div>
                            </div>
                            <div className="flex flex-wrap gap-1 mb-2">
                              {thresholdAnnotations.length > 0 ? (
                                thresholdAnnotations.map((annotation, idx) => (
                                  <span key={idx} className="text-xs bg-blue-100 text-blue-800 px-1 rounded">
                                    {annotation}
                                  </span>
                                ))
                              ) : (
                                <span className="text-xs text-gray-500">No annotations above threshold</span>
                              )}
                            </div>
                            <div className="text-xs font-medium text-gray-500 mb-1">Significant Motifs (above threshold):</div>
                            <div className="flex flex-wrap gap-1">
                              {thresholdMotifs.length > 0 ? (
                                thresholdMotifs.map((seq, idx) => (
                                  <span key={idx} className="text-xs bg-green-100 text-green-800 px-1 rounded font-mono">
                                    {seq}
                                  </span>
                                ))
                              ) : (
                                <span className="text-xs text-gray-500">No motifs above threshold</span>
                              )}
                            </div>
                          </div>
                        </>
                      );
                    })()}
                    
                  </div>
                </div>
                
                <div className="lg:w-1/2">
                  <h3 className="text-lg mb-2 font-medium">
                    All Activating Inputs ({neuronData[latent].activations.length})
                  </h3>
                  <div className="space-y-2 max-h-[500px] overflow-y-auto">
                    {neuronData[latent].activations.map((item, idx) => (
                      <div key={idx} className="flex flex-col p-3 bg-gray-50 rounded hover:bg-gray-100 transition-colors">
                        <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                          <div className="flex items-baseline gap-2">
                            <span className="text-xs font-semibold text-gray-500">DNA Motif:</span>
                            <span className="font-medium font-mono text-black">{item.input}</span>
                          </div>
                          <div className="flex flex-col items-end">
                            <span className="text-xs font-semibold text-gray-500">Activation:</span>
                            <span className="font-mono text-blue-600 font-bold">{item.value.toFixed(3)}</span>
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
                            <div className="text-xs font-semibold text-gray-500 mb-1">Statistical Significance:</div>
                            <div className="text-xs bg-white p-1 rounded border border-gray-200">
                              <span className="font-mono text-black">E-value: {item["e-value"]}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
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
