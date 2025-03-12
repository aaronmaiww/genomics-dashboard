# Genomics Dashboard

A web-based visualization tool for exploring and analyzing genomic latent activations, with a focus on DNA motifs and their biological significance.

![Genomics Dashboard Screenshot](https://github.com/user-attachments/assets/e655305b-f2b5-458d-9de0-1fb8965eec71)


## About This Repository

This repository serves as the companion code to the live [Genomics Dashboard](https://interpretglm.netlify.app/) hosted on Netlify. The dashboard provides researchers with interactive visualizations of SAE (Sparse Autoencoder) latent activations in genomic data.
This repository serves as the companion code to the live [Genomics Dashboard]) hosted on Netlify. The dashboard provides researchers with interactive visualizations of SAE (Sparse Autoencoder) latent activations in genomic data.

**Live Dashboard:** [Genomics Dashboard](https://interpretglm.netlify.app/)

## Dashboard Features

The online dashboard allows researchers to:

- **Explore Latent Neurons**: Investigate hundreds of latent neurons and their activation patterns
- **Visualize DNA Motifs**: See which DNA sequences most strongly activate each neuron
- **Analyze Genomic Context**: Examine motifs within their surrounding genomic contexts
- **Review Biological Annotations**: Understand potential biological significance through associated annotations
- **Search Capabilities**: Find specific latents by ID or by searching annotation content

## Understanding the Data

The dashboard visualizes latent neuron activations on DNA motifs. Each neuron in the model has learned to respond to specific DNA patterns that may have biological significance.

### Key Observations:

- **Neuron Specialization**: Many neurons have specialized to detect specific biological elements (e.g., fluorescent proteins, promoter regions)
- **Activation Patterns**: The strength of activation indicates how strongly a neuron responds to a particular DNA motif
- **Contextual Analysis**: The surrounding genomic context provides clues about functional regions
- **Annotation Correlations**: Annotations help identify the biological function of detected patterns

## Accessing the Source Code

While this repository contains the source code for the dashboard, the primary purpose is educational and reference. The live version hosted on Netlify is the recommended way to interact with the visualization.

## Technical Implementation

The dashboard is built with:

- **React**: UI framework
- **Recharts**: Chart visualization
- **Tailwind CSS**: Styling
- **Vite**: Build tool and development server

## Questions and Feedback

For questions about the dashboard or the underlying research, please open an issue in this repository.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
