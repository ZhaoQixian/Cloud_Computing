# PageRank vs HITS Algorithm Comparison

## Overview

This project presents a comparative analysis of link analysis algorithms commonly used in web search and recommendation systems:
- PageRank
- HITS (Hyperlink-Induced Topic Search)
- Randomised-HITS
- Subspace-HITS

The analysis is performed on a dataset of Singapore attractions from TripAdvisor, demonstrating how these algorithms can be applied to tourism data to identify important attractions based on user review patterns.

## Algorithms Implemented

### PageRank
- Developed by Google founders
- Models a random surfer who follows links with probability α and teleports randomly with probability (1-α)
- Provides a global measure of importance based on the entire link structure

### HITS
- Computes two scores for each node:
  - Hub score: measures how well a node points to good authorities
  - Authority score: measures how many good hubs point to a node
- Separates the concepts of hubs and authorities, providing more nuanced rankings

### Randomised-HITS
- Adds teleportation to the authority update step, similar to PageRank
- Improves convergence by making the authority matrix aperiodic and irreducible

### Subspace-HITS
- Restricts the power iteration to the dominant eigensubspace
- Focuses on the most significant eigenvectors for potentially faster and more stable convergence

## Dataset

The dataset consists of TripAdvisor reviews for Singapore attractions. It is processed to create a directed graph where:
- Nodes represent attractions
- Edges represent transitions between attractions (when a user reviews one attraction after another)
- Edge weights represent the frequency of these transitions

## Analysis Components

1. **Small Graph Example**: Illustrates the basic concepts using a small directed graph of Singapore attractions
2. **Algorithm Implementations**: Detailed implementations of all four algorithms
3. **Performance Metrics**: Runtime, iterations to convergence, and top attractions by score
4. **Correlation Analysis**: Spearman rank correlations between the scores from different algorithms
5. **Score Distributions**: Visualizations of score distributions on log-log plots
6. **Top Attractions**: Visualizations of the top-10 attractions according to each algorithm
7. **Personalized PageRank**: Extension using OpenAI embeddings to personalize PageRank scores based on user queries

## Key Findings

The analysis demonstrates the similarities and differences between these algorithms when applied to tourism data:

1. PageRank provides a global measure of importance based on the entire link structure
2. HITS separates the concepts of hubs and authorities, providing more nuanced rankings
3. Randomised-HITS improves convergence by adding teleportation, similar to PageRank
4. Subspace-HITS focuses on the dominant eigensubspace for potentially faster and more stable convergence

The correlation analysis shows which algorithms produce similar rankings, while the score distributions reveal the power-law nature of importance in the attraction network.

## Extension: Personalized PageRank

The project includes an extension that demonstrates how to use node embeddings with OpenAI's API to create personalized PageRank scores based on user queries. This approach allows for context-aware recommendations tailored to specific user interests.
