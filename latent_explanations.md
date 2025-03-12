# Latent Interpretations and GC Content Analysis

This document provides interpretations for genomic latents based on analyzing top-20 most activating tokens, contexts, and their GC content patterns.

## Latent 22: C9orf85 / hGH poly(A) Signal Detector

**Max Activation:** 18.73  
**Most Common Tokens:** CTCCGC, TCCGCC, TCTCCG  
**GC Content:** 59% average (range: 43-70%)  
**Monosemanticity Score:** 0.56 (medium)  
**Primary Annotation:** C9orf85  
**Secondary Annotation:** hGH poly(A) signal

**Interpretation:**
This latent appears to detect sequences associated with C9orf85 and human growth hormone polyadenylation signals. It has medium monosemanticity, as it primarily detects C9orf85 but also significantly responds to hGH poly(A) signals. The GC content is moderately high (59% average), with a wide range between contexts (43-70%). The most activating tokens are highly GC-rich, suggesting this latent may be detecting GC-rich regulatory elements common to both C9orf85 and hGH poly(A) signals.

**Confidence:** Medium (0.65) - While there's a clear pattern, the dual annotation pattern suggests this latent isn't completely monosemantic.

## Latent 28: Promoter Region Detector (C9orf85/hGH)

**Max Activation:** 21.51  
**Most Common Tokens:** CCAGGC, CAGGCT, CACAAT  
**GC Content:** 55% average (range: 47-63%)  
**Monosemanticity Score:** 0.48 (low)  
**Primary Annotation:** C9orf85  
**Secondary Annotation:** hGH poly(A) signal

**Interpretation:**
This latent appears to detect promoter regions shared between C9orf85 and hGH genes. With a low monosemanticity score of 0.48, it responds almost equally to both annotations. The GC content is moderate (55% average) with a fairly consistent range (47-63%), typical of promoter regions. The most activating tokens (CCAGGC, CAGGCT) suggest it may be detecting GC-rich binding motifs common to these promoters.

**Confidence:** Medium (0.55) - The latent shows consistent patterns but isn't specific to a single genomic feature.

## Latent 52: LTR Detector (Long Terminal Repeat)

**Max Activation:** 16.89  
**Most Common Tokens:** TTGCAT, ATCCGA, GGACTC  
**GC Content:** 54% average (range: 40-63%)  
**Monosemanticity Score:** 0.50 (medium)  
**Primary Annotation:** LTR  
**Secondary Annotation:** 5' LTR

**Interpretation:**
This latent appears specialized in detecting Long Terminal Repeats (LTRs), critical elements in retroviruses and retrotransposons. The monosemanticity score of 0.50 indicates it primarily detects general LTRs, with a secondary focus on 5' LTRs specifically. The GC content varies widely (40-63%), reflecting the diversity of LTR sequences across different genetic elements. The activating tokens don't show a strong GC bias pattern, suggesting the latent is detecting structural features rather than GC-rich motifs specifically.

**Confidence:** High (0.75) - The consistent LTR annotations and clear pattern of activation for LTR-related sequences suggest this is indeed an LTR detector, though it doesn't distinguish strongly between different types of LTRs.

## Latent 947: Puromycin Resistance Gene Detector

**Max Activation:** 28.34  
**Most Common Tokens:** AGCGAT, AAGCGA, GCGATT  
**GC Content:** 57% average (range: 40-63%)  
**Monosemanticity Score:** 0.50 (medium)  
**Primary Annotation:** C9orf85  
**Secondary Annotation:** hGH poly(A) signal

**Interpretation:**
According to the dashboard's explanations, this latent is specialized on Puromycin Resistance detection, though our analysis shows strong activation for C9orf85 and hGH poly(A) signal sequences. This suggests it may be detecting a common motif shared between these genomic elements. The relatively high GC content (57% average) is consistent with coding regions and regulatory elements. The most activating tokens are GC-rich and AT-balanced (AGCGAT, AAGCGA), which are common in coding sequences.

**Confidence:** Medium (0.60) - While there's a clear pattern of activation, the dashboard annotation differs from our analysis, suggesting this latent might be detecting a structural feature common to multiple genomic elements.

## Latent 4085: SV40 Promoter Detector

**Max Activation:** 19.88  
**Most Common Tokens:** ATCTCA (all 20 top activations)  
**GC Content:** 40% average (range: 40-40%)  
**Monosemanticity Score:** 1.00 (perfect)  
**Primary Annotation:** SV40 promoter  
**Secondary Annotation:** None

**Interpretation:**
This latent shows perfect monosemanticity, detecting exclusively the SV40 promoter sequence. The GC content is consistently lower (40%) than other regulatory elements, highlighting the AT-rich nature of this specific viral promoter. The remarkable consistency in both the activated token (ATCTCA appearing in all top 20 activations) and context (all contexts are identical: "TGCAAAGCATGC |ATCTCA| ATTAGTCAGCAA") indicates an extremely specific detector for a crucial SV40 promoter motif. This suggests the latent has learned to recognize a highly conserved binding site within the SV40 promoter.

**Confidence:** Very High (0.95) - The perfect monosemanticity score, combined with the complete consistency of activating tokens and contexts, provides extremely strong evidence that this latent is a precise detector for a specific SV40 promoter element.

## Latent 183: C9orf85 Enriched Detector

**Max Activation:** 10.91  
**Most Common Tokens:** TGGCTC, CTTGGC, GTGGCA  
**GC Content:** 56% average (range: 40-63%)  
**Monosemanticity Score:** 0.88 (high)  
**Primary Annotation:** C9orf85  
**Secondary Annotation:** hGH poly(A) signal

**Interpretation:**
This latent has high monosemanticity for C9orf85 sequences (88%), with minimal activation for hGH poly(A) signals. The GC content is moderately high (56% average), typical of gene regulatory regions. Unlike other C9orf85 latents, this one shows stronger specificity, suggesting it may be detecting a more specific motif within the C9orf85 gene. The diverse activating tokens indicate it may be responding to a structural feature rather than a specific nucleotide sequence.

**Confidence:** High (0.80) - The high monosemanticity and consistent annotation pattern indicate this latent has learned to specifically detect C9orf85-related sequences.

## Latent 197: CaMKII Promoter/tRNA Detector

**Max Activation:** 13.14  
**Most Common Tokens:** GCAGGG, ACCGTG, CTTAAA  
**GC Content:** 42% average (range: 27-60%)  
**Monosemanticity Score:** 0.67 (medium-high)  
**Primary Annotation:** CaMKII promoter  
**Secondary Annotation:** tRNA

**Interpretation:**
This latent primarily detects CaMKII promoter elements (67%) with secondary activation for tRNA sequences. The wide GC content range (27-60%) reflects the diverse sequence contexts of these elements. The lower average GC content (42%) is characteristic of many eukaryotic promoters, which often contain AT-rich regions for transcription initiation. The presence of both CaMKII promoter and tRNA annotations suggests this latent may be detecting a shared structural feature between these different RNA polymerase binding sites.

**Confidence:** Medium (0.70) - The moderately high monosemanticity combined with the consistent activation pattern for promoter elements indicates this latent has likely learned to detect specific transcription-associated motifs.

## Latent 328: Antibiotic Resistance Gene Detector

**Max Activation:** 15.68  
**Most Common Tokens:** GGTCTG, ATTTAT, TATTAG  
**GC Content:** 43% average (range: 23-77%)  
**Monosemanticity Score:** 0.44 (low)  
**Primary Annotation:** LYS2  
**Secondary Annotations:** KanR, kanMX

**Interpretation:**
This latent appears to detect antibiotic resistance gene elements, particularly kanamycin resistance (KanR and kanMX) along with the LYS2 gene. The extremely wide GC content range (23-77%) suggests it's detecting diverse sequence contexts associated with these genes. The lower monosemanticity score (0.44) indicates this latent is not specific to a single gene but may be detecting a common feature shared among various resistance genes. The AT-rich activating tokens (ATTTAT, TATTAG) might correspond to regulatory elements that control expression of these resistance genes.

**Confidence:** Medium-Low (0.50) - The low monosemanticity score and diverse annotation pattern suggest this latent is detecting a broader class of sequence features rather than a specific gene element.

## Summary of GC Content Patterns

Across the analyzed latents, we observe several patterns related to GC content:

1. **Highly Specific Viral Element Detectors:** Latents like 4085 (SV40 promoter) show consistent, low GC content (40%) with minimal variation, reflecting the conserved nature of viral regulatory elements.

2. **Regulatory Element Detectors:** Latents detecting promoters and regulatory elements (like latents 22, 28, 183) tend to have moderate to high GC content (55-59%), consistent with the GC-rich nature of many regulatory regions.

3. **Structural Element Detectors:** Latents detecting structural elements like LTRs (latent 52) show more variable GC content (wider ranges), reflecting the diversity of these elements across different genomic contexts.

4. **Coding Sequence Detectors:** Latents potentially detecting coding sequences (like latent 947) show balanced GC content consistent with codon usage patterns.

5. **Multi-Feature Detectors:** Latents with low monosemanticity (like 328) tend to have extremely wide GC content ranges (23-77%), indicating they're detecting a diverse set of sequence features.

The GC content analysis provides an additional dimension for understanding what genomic features each latent might be detecting, complementing the annotation and token pattern analysis. Generally, latents with narrower GC content ranges show higher monosemanticity and more consistent detection of specific genomic elements.

## Implications for Interpreting Genomic Language Models

This analysis suggests that latents in genomic language models are learning meaningful biological features with varying degrees of specificity. Some latents (like 4085) become highly specialized detectors for specific sequence motifs, while others detect broader classes of genomic elements. The correlation between monosemanticity and GC content consistency indicates that models may be identifying biologically relevant patterns related to nucleotide composition and sequence conservation.

The identification of latents with perfect monosemanticity (like the SV40 promoter detector) provides strong evidence that sparse autoencoders can successfully isolate interpretable features from complex genomic language models. Future work could focus on using GC content analysis to identify latents corresponding to known biological features with characteristic nucleotide compositions.