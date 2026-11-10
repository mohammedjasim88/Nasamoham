# Oman Earth Intelligence — competition narrative

## Problem and audience

Students and local analysts can access climate data yet still confuse a change between two years with a long-term trend, or two significant trends with a significant difference. Oman Earth Intelligence makes that distinction visible through selected NASA POWER grid-point records, annual charts, uncertainty, sensitivity checks and downloadable source evidence. The intended benefit is traceable climate education; societal impact has not been measured.

## Method and bounded finding

Compare Muscat East (23.5946°N, 58.7351°E) and Al Buraimi (24.2486°N, 55.7931°E), T2M, 2000–2025. Preserve annual NASA values, examine missingness and outliers, fit OLS and Theil–Sen, inspect leave-one-out sensitivity, and report approximate Newey–West uncertainty. Analyse the concurrent annual difference to test the difference in trends.

The preserved responses yield approximately +0.298 and +0.358°C/decade. Their paired difference is +0.060°C/decade, with an approximate HAC 95% interval −0.033 to +0.153 and p≈0.197. Thus this analysis does not establish different slopes at the 0.05 threshold. No claim of equality, causality, station accuracy or governorate-wide representation follows. Reproduce these numbers with scripts/case_study_v39.mjs; never type fixed numbers into the application demonstration.

## Three-minute demo script

| Time | Action | Narration |
|---|---|---|
| 0:00–0:25 | Open Compare Locations | “Does inland Al Buraimi show a different temperature trend from coastal Muscat? We investigate two reference points, not entire regions.” |
| 0:25–0:50 | Select the case-study setup | “These are NASA POWER annual grid estimates for 2000–2025. We preserve the original observations and show their coverage.” |
| 0:50–1:15 | Show annual chart and individual slopes | “Both fitted slopes are positive. A slope describes a trend across all available years; it is different from subtracting the first year from the last.” |
| 1:15–1:45 | Open the paired HAC panel | “Two positive, individually significant trends do not prove a difference. The paired interval here includes zero, so the evidence does not establish different slopes under this model.” |
| 1:45–2:10 | Show robustness and assumptions | “Theil–Sen and leave-one-out checks reveal sensitivity. HAC allows weak serial dependence, but is approximate with 26 years. Mann–Kendall is labelled unadjusted for autocorrelation.” |
| 2:10–2:40 | Open Verification Lab; inspect and export evidence | “The Lab compares values with a new NASA request. Matching the source verifies consistency; it does not validate the grid against an independent weather station.” |
| 2:40–3:00 | End with limitations and use | “The benefit is an auditable learning workflow. We disclose source-unit questions, avoid causal claims, and keep calculations available without a generative model.” |

If a network service is unavailable, show the preserved offline evidence and explicitly state its retrieval timestamp. Never label replayed data as a successful new live request.

## Documentary benchmark

| Project | Verified public description/status | Useful comparison | What cannot be concluded |
|---|---|---|---|
| NVS-knot | NASA identifies the 2024 Galactic Impact winner and a planting-risk app using soil moisture and evapotranspiration | Strong decision-focused problem framing; our case is educational and narrower | No comparative speed, prediction skill, field impact or code-quality score |
| The CliMappers | Official team page labels it 2024 Global Nominee; team describes heat, birds, drought and farming studies | Strong local relevance and varied evidence; our focus is reproducible trend inference | Team descriptions are not independent scientific validation |
| CloudMap | Team page labels Global Finalist; team describes satellite data, predictive models and air-quality UI | Accessible explanation of complex data; our app analyses historical climate rather than forecasting | Its model accuracy and operational outcomes were not independently tested |
| Stellar Minds | Team page labels Global Finalist for customised adverse-weather queries | Question-led interaction; our deterministic annual questions have a narrower scope | Its source code, latency and scientific accuracy were not independently tested |

Across problem, methods, NASA data, creativity, visualisation, UX, usefulness, reliability, storytelling and demo quality, no overall stronger/similar/weaker ranking is defensible without running and auditing the competitors. The documented lesson is to tie a clear local question to a reproducible, bounded conclusion. No competitor branding, artwork or implementation was copied.

Sources checked on 11 November 2026:
- https://www.nasa.gov/learning-resources/stem-engagement-at-nasa/nasa-international-space-apps-challenge-announces-2024-global-winners/
- https://www.spaceappschallenge.org/nasa-space-apps-2024/find-a-team/the-climappers/
- https://www.spaceappschallenge.org/2025/find-a-team/cloudmap/
- https://www.spaceappschallenge.org/2025/find-a-team/stellar-minds5/

## Submission checklist and disclosures

- Official 2026 challenge asks for variable selection, time visualisation, what/where/how much changes and significance: https://www.spaceappschallenge.org/2026/challenges/earth-system-trend-detective/
- Official event page states 14–15 November; submission opens 14 November 09:00 and closes 15 November 23:59 local time: https://www.spaceappschallenge.org/2026/ . Check the participant portal for your actual team submission status.
- All work in this release predates the event. Disclose it as preparation and separately record changes actually made during the hackathon. Exact prior-work and AI-development eligibility rules were not verified; do not claim eligibility is settled.
- Suggested disclosure: “ChatGPT assisted with code review, implementation, documentation and automated testing. The author reviewed the project. Climate values originate from NASA POWER; the optional local language model does not create the numerical results.” Adapt to the actual work performed and the submission form.
- Legal terms require source attribution and appropriate public/open licensing of original and third-party solution materials: https://www.spaceappschallenge.org/legal/ . The repository is currently private; no visibility or ownership licence was changed. Decide the original-code licence and complete NCSI, tile, imagery, model and dependency attribution before submission.
- Include site URL, accessible source, methodology, preserved raw responses, reproducibility instructions, limitations and demo. Do not submit private-repository links as if judges can open them.
- Numerical 2026 judging weights were not verified. This package does not claim 18/20 in any category, a 90+ score or guaranteed advancement.
