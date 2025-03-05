import NeuroVis from './components/NeuroVis'

function App() {
  // Use both inline styles and classes for maximum reliability
  const containerStyle = {
    padding: '2rem',
    backgroundColor: '#f9f9f9',
    minHeight: '100vh',
    fontFamily: 'sans-serif',
    color: '#333'
  };

  return (
    // Apply both inline style and Tailwind class
    <div className="p-8" style={containerStyle}>
      <NeuroVis />
    </div>
  )
}

export default App
