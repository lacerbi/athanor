import type { ReactNode } from 'react';
import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

type FeatureItem = {
  title: string;
  visual: React.ComponentType<React.ComponentProps<'svg'>> | string;
  description: ReactNode;
};

const FeatureList: FeatureItem[] = [
  {
    title: 'AI Chat Integration',
    visual: require('@site/static/img/athanor_chat_integration.png').default,
    description: (
      <>
        Seamlessly work with any AI chat (ChatGPT, Claude, Gemini, etc.). Copy
        prompts from Athanor, paste responses back –
        <strong> no API keys needed</strong> for the core workflow!
      </>
    ),
  },
  {
    title: 'Smart Context Selection',
    visual: require('@site/static/img/athanor_select.png').default,
    description: (
      <>
        Effortlessly choose files & folders for your AI prompt, or let the
        "Autoselect" feature intelligently pick relevant context within your
        project.
      </>
    ),
  },
  {
    title: 'Workflow-Tailored Prompts',
    visual: require('@site/static/img/athanor_prompts.png').default,
    description: (
      <>
        Accelerate your workflow with customizable prompt templates. Whether
        querying your project, architecting new features or coding
        implementations, always start with a powerful, relevant prompt.
      </>
    ),
  },
  {
    title: 'Controlled Changes',
    visual: require('@site/static/img/athanor_controlled_changes.png').default,
    description: (
      <>
        Apply AI suggestions with full precision. Preview all proposed file
        operations in a clear visual diff viewer.{' '}
        <strong>Accept or reject</strong> each change with one click before
        anything is written to disk.
      </>
    ),
  },
];

function Feature({ title, visual, description }: FeatureItem) {
  return (
    <div className={clsx('col col--3')}>
      <div className="text--center">
        {typeof visual === 'string' ? (
          <img src={visual} className={styles.featureSvg} alt={title} />
        ) : (
          (() => {
            const VisualComponent = visual;
            return <VisualComponent className={styles.featureSvg} role="img" />;
          })()
        )}
      </div>
      <div className="text--center padding-horiz--md">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): ReactNode {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
