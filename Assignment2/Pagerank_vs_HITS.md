# Comparative Analysis of PageRank, HITS, and HITS Variations

This document presents a numerical analysis comparing PageRank, HITS (Hyperlink-Induced Topic Search), and two variations of HITS: Randomised-HITS and Subspace-HITS. The analysis is performed on a dataset of Singapore attractions from TripAdvisor.

## Table of Contents
1. [Introduction](#introduction)
2. [Small Graph Example](#small-graph-example)
3. [Singapore TripAdvisor Dataset](#singapore-tripadvisor-dataset)
4. [Algorithm Implementations](#algorithm-implementations)
   - [PageRank](#pagerank)
   - [HITS](#hits)
   - [Randomised-HITS](#randomised-hits)
   - [Subspace-HITS](#subspace-hits)
5. [Comparative Analysis](#comparative-analysis)
   - [Performance Metrics](#performance-metrics)
   - [Correlation Analysis](#correlation-analysis)
   - [Score Distributions](#score-distributions)
6. [Top Attractions by Algorithm](#top-attractions-by-algorithm)
7. [Conclusion](#conclusion)

## Introduction

Link analysis algorithms like PageRank and HITS are fundamental to web search and recommendation systems. This analysis explores these algorithms and two HITS variations to understand their differences and similarities when applied to tourism data.

## Small Graph Example

We begin with a small directed graph of Singapore attractions to illustrate the basic concepts:

```python
import networkx as nx

G_small = nx.DiGraph()
G_small.add_edges_from([
    ("Marina Bay Sands", "Gardens by the Bay"),
    ("Gardens by the Bay", "Singapore Zoo"),
    ("Singapore Zoo", "Marina Bay Sands"),
    ("Chinatown", "Gardens by the Bay"),
    ("Sentosa", "Singapore Zoo"),
    ("Marina Bay Sands", "Sentosa"),
])

pagerank_small = nx.pagerank(G_small, alpha=0.85)
hubs_small, auth_small = nx.hits(G_small)

print("Small Graph PageRank Scores:\n", pagerank_small)
print("Small Graph Hub Scores:\n", hubs_small)
print("Small Graph Authority Scores:\n", auth_small)
```

This example demonstrates how PageRank assigns importance based on the link structure, while HITS distinguishes between hubs (pages that link to many authorities) and authorities (pages that are linked to by many hubs).

## Singapore TripAdvisor Dataset

The main analysis uses a dataset of TripAdvisor reviews for Singapore attractions:

```python
import pandas as pd, networkx as nx

wb = "SIN_TripAdvisor.xlsx"
reviews = pd.read_excel(
    wb,
    sheet_name="SIN_TripAdvisor1",
    parse_dates=["Date"],
    dtype={"Name": "string"}
)

reviews = reviews.rename(
    columns={
        "Date": "review_date",
        "Hotel Name": "attraction",
        "Name": "user_id"
    }
)

# keep users who reviewed >1 attraction
freq = reviews["user_id"].value_counts()
reviews = reviews[reviews["user_id"].isin(freq[freq > 1].index)]

# build weighted directed edges
edges = {}
for uid, grp in reviews.sort_values("review_date").groupby("user_id"):
    seq = grp["attraction"].tolist()
    for a, b in zip(seq, seq[1:]):
        edges[(a, b)] = edges.get((a, b), 0) + 1

G_sg = nx.DiGraph()
G_sg.add_weighted_edges_from([(u, v, w) for (u, v), w in edges.items()])
print(nx.number_of_nodes(G_sg), "nodes", nx.number_of_edges(G_sg), "edges")
```

The dataset is processed to create a directed graph where:
- Nodes represent attractions
- Edges represent transitions between attractions (when a user reviews one attraction after another)
- Edge weights represent the frequency of these transitions

## Algorithm Implementations

### PageRank

PageRank, developed by Google founders, models a random surfer who follows links with probability α and teleports randomly with probability (1-α):

```python
pagerank_sg = nx.pagerank(G_sg, alpha=0.85, weight="weight")
```

### HITS

HITS (Hyperlink-Induced Topic Search) computes two scores for each node:
- Hub score: measures how well a node points to good authorities
- Authority score: measures how many good hubs point to a node

```python
hubs_sg, auth_sg = nx.hits(G_sg, max_iter=200, tol=1e-8, normalized=True)
```

### Randomised-HITS

Randomised-HITS (Ng et al., 2001) adds teleportation to the authority update step, similar to PageRank:

```python
def randomised_hits(G, eps=0.15, max_iter=200, tol=1e-8):
    """Randomised‑HITS (Ng et al., 2001): authority update with teleport."""
    nodes = list(G)
    n = len(nodes)
    A = nx.to_numpy_array(G, nodelist=nodes, weight=None, dtype=float)
    # base HITS matrices
    H = A          # link matrix (hub → authority)
    AtA = A.T @ A  # authority matrix
    # add teleportation to guarantee aperiodicity / irreducibility
    AtA = (1 - eps) * AtA + (eps / n) * np.ones_like(AtA)

    x = np.ones(n) / n
    for k in range(max_iter):
        x_new = AtA @ x
        x_new /= np.linalg.norm(x_new)
        if np.linalg.norm(x_new - x, 1) < tol:
            break
        x = x_new
    auth = {nodes[i]: float(x[i]) for i in range(n)}
    return auth, k + 1
```

This variation ensures convergence by making the authority matrix aperiodic and irreducible.

### Subspace-HITS

Subspace-HITS restricts the power iteration to the dominant eigensubspace:

```python
def subspace_hits(G, k_sub=1, max_iter=200, tol=1e-8):
    """Subspace‑HITS: power iteration restricted to dominant eigensubspace."""
    nodes = list(G)
    n = len(nodes)
    A = nx.to_numpy_array(G, nodelist=nodes, weight=None, dtype=float)
    M = A.T @ A  # authority matrix
    # obtain dominant eigenvectors via Lanczos / ARPACK (k_sub largest)
    vals, vecs = np.linalg.eigh(M)
    idx = np.argsort(vals)[::-1][:k_sub]
    Q = vecs[:, idx]  # dominant subspace basis

    # project initial vector into subspace
    x = np.ones(n) / n
    x = Q @ (Q.T @ x)
    x /= np.linalg.norm(x)

    for it in range(max_iter):
        x_new = M @ x
        # re‑project to subspace and renormalise
        x_new = Q @ (Q.T @ x_new)
        x_new /= np.linalg.norm(x_new)
        if np.linalg.norm(x_new - x, 1) < tol:
            break
        x = x_new
    auth = {nodes[i]: float(x[i]) for i in range(n)}
    return auth, it + 1
```

This approach can improve convergence and stability by focusing on the most significant eigenvectors.

## Comparative Analysis

All four algorithms were run on the Singapore attractions graph:

```python
from collections import OrderedDict
import time

results = OrderedDict()

# PageRank
start = time.perf_counter()
pr = nx.pagerank(G_sg, alpha=0.85, weight="weight")
results["PageRank"] = dict(scores=pr, runtime=time.perf_counter() - start, iters="≤200")

# Original HITS (authority vector)
start = time.perf_counter()
_, auth_hits = nx.hits(G_sg, normalized=True)
results["HITS"] = dict(scores=auth_hits, runtime=time.perf_counter() - start, iters="≤200")

# Randomised‑HITS
start = time.perf_counter()
auth_rnd, rnd_iter = randomised_hits(G_sg, eps=0.15)
results["Randomised‑HITS"] = dict(scores=auth_rnd, runtime=time.perf_counter() - start, iters=rnd_iter)

# Subspace‑HITS
start = time.perf_counter()
auth_sub, sub_iter = subspace_hits(G_sg, k_sub=1)
results["Subspace‑HITS"] = dict(scores=auth_sub, runtime=time.perf_counter() - start, iters=sub_iter)
```

### Performance Metrics

For each algorithm, we recorded:
- Runtime in seconds
- Number of iterations to convergence
- Top-5 attractions by score

```python
# pretty print top‑5 for each
for name, dat in results.items():
    top5 = sorted(dat["scores"].items(), key=lambda x: x[1], reverse=True)[:5]
    print(f"{name} (time {dat['runtime']:.3f}s, iters {dat['iters']}):")
    for node, sc in top5:
        print(f"  {node}: {sc:.4f}")
```

### Correlation Analysis

We computed Spearman rank correlations between the scores from different algorithms:

```python
from scipy.stats import spearmanr

algo_names = list(results)
cor_mat = pd.DataFrame(index=algo_names, columns=algo_names, dtype=float)

for a in algo_names:
    for b in algo_names:
        scores_a = results[a]["scores"]
        scores_b = results[b]["scores"]
        common = list(set(scores_a) & set(scores_b))
        rank_a = [scores_a[n] for n in common]
        rank_b = [scores_b[n] for n in common]
        cor_mat.loc[a, b] = spearmanr(rank_a, rank_b).correlation

print(cor_mat.round(2))
```

This analysis reveals how similar the rankings produced by different algorithms are.

### Score Distributions

We visualized the score distributions for all algorithms on log-log plots:

```python
import matplotlib.pyplot as plt

# Plot score distributions for all algorithms
plt.figure(figsize=(15, 10))

for i, (algo, res) in enumerate(results.items(), 1):
    plt.subplot(2, 2, i)
    scores = sorted(res['scores'].values(), reverse=True)
    plt.loglog(range(1, len(scores) + 1), scores, marker='o')
    plt.title(f"{algo} Score Spectrum")
    plt.xlabel("Rank")
    plt.ylabel("Score")
    plt.grid(True)

plt.tight_layout()
plt.show()
```

These plots help visualize how quickly the scores decay as rank increases, revealing power-law distributions typical in network analysis.

## Top Attractions by Algorithm

Finally, we visualized the top-10 attractions according to each algorithm:

```python
import matplotlib.pyplot as plt

for name, data in results.items():
    top = sorted(data["scores"].items(), key=lambda x: x[1], reverse=True)[:10]
    labels, vals = zip(*top)
    plt.figure(figsize=(7, 3))
    plt.bar(labels, vals)
    plt.title(f"Top‑10 Attractions by {name}")
    plt.xticks(rotation=45, ha="right")
    plt.ylabel("Score")
    plt.tight_layout()
plt.show()
```

## Conclusion

This analysis demonstrates the similarities and differences between PageRank, HITS, and two HITS variations when applied to tourism data:

1. **PageRank** provides a global measure of importance based on the entire link structure.
2. **HITS** separates the concepts of hubs and authorities, providing more nuanced rankings.
3. **Randomised-HITS** improves convergence by adding teleportation, similar to PageRank.
4. **Subspace-HITS** focuses on the dominant eigensubspace for potentially faster and more stable convergence.

The correlation analysis shows which algorithms produce similar rankings, while the score distributions reveal the power-law nature of importance in the attraction network. The top attractions identified by each algorithm provide practical insights for tourism recommendations.

This comparative study helps understand the strengths and characteristics of different link analysis algorithms, which can inform their application in recommendation systems, search engines, and other network analysis tasks.
