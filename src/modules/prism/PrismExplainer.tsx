import * as React from 'react';

import type { SxProps } from '@mui/joy/styles/types';
import { Box } from '@mui/joy';

import { ExplainerCarousel, ExplainerPage } from '~/common/components/ExplainerCarousel';
import { animationEnterScaleUp } from '~/common/util/animUtils';


const prismSteps: ExplainerPage[] = [
  {
    stepDigits: '',
    stepName: 'Welcome',
    titlePrefix: 'Welcome to ', titleSpark: 'Prism',
    mdContent: `
**Prism** is ABOV3 Exodus's enterprise-grade multi-model AI reasoning engine that delivers superior insights by synthesizing perspectives from multiple leading language models.

Like light passing through a prism reveals its complete spectrum, Prism reveals the full depth of AI intelligence—transforming a single query into diverse expert viewpoints, then focusing them into precise, actionable intelligence.

**Enterprise Benefits:**
- **Higher Decision Quality:** Leverage collective AI intelligence
- **Risk Mitigation:** Cross-validate outputs across model architectures
- **Accelerated Discovery:** Parallel processing reduces time-to-insight

![ABOV3 PRISM Visualization](https://abov3.com/assets/prism-scatter-viz.svg)
`,
  },
  {
    stepDigits: '01',
    stepName: 'Scatter',
    titlePrefix: 'Dispersion: ', titleSpark: 'Scatter Phase',
    mdContent: `
**Scatter Phase: Multi-Model Parallel Processing**

In the Scatter phase, your input query is simultaneously dispatched to multiple AI models, each processing independently through its unique architectural lens.

**How It Works:**
1. **Select Models:** Configure your AI model ensemble (save configurations for reuse)
2. **Activate Prism:** Deploy query across all selected models in parallel
3. **Review Outputs:** Evaluate diverse perspectives generated simultaneously
4. **Decision Point:** Continue with a single response or proceed to Gather phase

**Enterprise Considerations:**
- **Token Economics:** Parallel operations consume proportional tokens (n models × token count)
- **Best Practice:** Optimal for early-stage analysis with shorter context windows
- **Model Diversity:** Combine architectures (GPT-4, Claude, Gemini) for comprehensive coverage

**Cost-Benefit Analysis:** Higher upfront token investment yields superior output quality and reduced iteration cycles.
`,
  },
  {
    stepDigits: '02',
    stepName: 'Gather',
    titlePrefix: 'Convergence: ', titleSpark: 'Gather Phase',
    mdContent: `
**Gather Phase: Intelligent Synthesis**

The Gather phase applies advanced fusion algorithms to synthesize multiple AI outputs into a single, coherent response that captures the strengths of each contributing model.

**Fusion Strategies:**
- **Fusion Mode:** Algorithmic synthesis of complementary insights
- **Checklist Mode:** Structured comparative analysis across outputs
- **Compare Mode:** Side-by-side evaluation framework
- **Custom Mode:** Define your own synthesis methodology

**Enterprise Value:**
- **Quality Assurance:** Multi-model validation reduces hallucination risk
- **Comprehensive Coverage:** Captures nuances missed by single-model approaches
- **Audit Trail:** Transparent view of contributing models and synthesis logic

![ABOV3 PRISM Visualization](https://abov3.com/assets/prism-gather-viz.svg)

**Optimization Strategy:** Iteratively refine through Scatter-Gather cycles until output meets enterprise quality standards.
`,
  },
  {
    stepDigits: '03',
    stepName: 'Best Practices',
    titlePrefix: 'Enterprise ', titleSpark: 'Best Practices',
    mdContent: `
## PRISM Enterprise Deployment

### Strategic Use Cases
**Ideal Applications:**
- **Strategic Planning:** Early-stage ideation and option generation
- **Technical Architecture:** Multi-perspective system design
- **Risk Assessment:** Comprehensive scenario analysis
- **Research & Discovery:** Broad domain exploration

### Human-in-the-Loop Intelligence
Prism positions AI as an augmentation layer—you provide strategic direction and final judgment while AI models generate high-quality drafts for rapid evaluation and refinement.

### Resource Optimization
**Token Management:**
- Deploy Prism during early conversation stages (minimal context)
- Higher token investment yields disproportionate quality returns
- Single-model follow-up after Prism establishes direction

### Model Selection Strategy
**Recommended Ensembles:**
- **Balanced:** GPT-4 Turbo + Claude Sonnet + Gemini Pro
- **Reasoning-Heavy:** o1 + Claude Opus + GPT-4
- **Cost-Optimized:** GPT-4 Mini + Gemini Flash + Claude Haiku

[Learn more about Prism](https://abov3.com/docs/prism-multi-model-reasoning)
`,
  },
] as const;


const prismExplainerSx: SxProps = {
  // allows the content to be scrolled (all browsers)
  overflowY: 'auto',
  // actually make sure this scrolls & fills
  height: '100%',

  // style
  padding: 3, // { xs: 3, md: 3 },
  animation: `${animationEnterScaleUp} 0.2s cubic-bezier(.17,.84,.44,1)`,

  // layout
  display: 'grid',
};


export function PrismExplainer(props: {
  onWizardComplete: () => any,
}) {

  return (
    <Box
      sx={prismExplainerSx}
    >

      <ExplainerCarousel
        explainerId='prism-onboard'
        steps={prismSteps}
        onFinished={props.onWizardComplete}
      />

    </Box>

  );
}