// AI Summary: Defines the Athanor website homepage, including header, feature sections,
// installation instructions, and community links. Uses 'yet-another-react-lightbox' with
// the Captions plugin to display images with titles. Lightbox carousel padding is increased
// to make images appear slightly smaller.
import type { ReactNode } from 'react';
import React from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import HomepageFeatures from '@site/src/components/HomepageFeatures';
import Heading from '@theme/Heading';
import athanorSnapshotImageUrl from '@site/static/img/athanor_snapshot.png';
import athanorSnapshotApplyChangesImageUrl from '@site/static/img/athanor_snapshot_apply_changes.png';
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import Captions from "yet-another-react-lightbox/plugins/captions";
import "yet-another-react-lightbox/plugins/captions.css";

import styles from './index.module.css';

function HomepageHeader() {
  const { siteConfig } = useDocusaurusContext();
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <Heading as="h1" className="hero__title">
          The AI Workbench
        </Heading>
        <p className="hero__subtitle">{siteConfig.tagline}</p>
        <div className={styles.buttons}>
          <Link
            className="button button--secondary button--lg"
            to="/docs/tutorial/introduction"
          >
            Read Quick Tutorial
          </Link>
          <Link
            className="button button--secondary button--lg"
            href="https://github.com/lacerbi/athanor"
            style={{ marginLeft: '1rem' }}
          >
            View on GitHub
          </Link>
        </div>
      </div>
    </header>
  );
}

export default function Home(): ReactNode {
  const { siteConfig } = useDocusaurusContext();
  const [open, setOpen] = React.useState(false);
  const [currentIndex, setCurrentIndex] = React.useState(0);

  const slides = [
    { 
      src: athanorSnapshotImageUrl, 
      alt: "Athanor Interface: File explorer and prompt generation",
      title: "Athanor's interface: File explorer (left), task management and prompt generation (right)"
    },
    { 
      src: athanorSnapshotApplyChangesImageUrl, 
      alt: "Athanor Apply Changes: Review and accept/reject diffs generated using any AI chat assistant",
      title: "'Apply Changes' panel: Review and accept/reject diffs generated using any AI chat assistant"
    }
  ];

  return (
    <Layout
      title={`${siteConfig.title}`}
      description="The AI Workbench where modern alchemists cook"
    >
      <HomepageHeader />
      <main>
        <HomepageFeatures />

        <section className={styles.section}>
          <div className="container">
            <Heading as="h2">Why Athanor?</Heading>
            <p className={styles.sectionText}>
              <strong>
                We built Athanor to eliminate the painful parts of working with
                AI assistants—hunting for files, reconstructing file changes,
                and losing control of modifications.
              </strong>{' '}
              It's a tool that makes AI-assisted development actually work:
              easily select the right context, review every change, stay in
              control—all through your existing AI subscriptions, no API keys
              needed.
            </p>
            <p className={clsx(styles.sectionText, styles.proofHighlight)}>
              <em>
                <strong>The proof?</strong> From <code>v0.1.0</code>, Athanor
                was built entirely using Athanor itself.
              </em>
            </p>
          </div>
        </section>

        <section className={styles.section}>
          <div className="container">
            <Heading as="h2">How It Works</Heading>
            <p className={styles.sectionText}>
              Athanor streamlines your AI-assisted development with a simple
              four-step workflow:
            </p>
            <div className={styles.workflowSteps}>
              <div className={styles.workflowStep}>
                <strong>1. Select Files:</strong> Choose relevant files and
                folders from your project
              </div>
              <div className={styles.workflowStep}>
                <strong>2. Generate Prompt:</strong> Use default or custom
                templates to create detailed AI prompts
              </div>
              <div className={styles.workflowStep}>
                <strong>3. Use AI:</strong> Copy prompt to your favorite AI
                assistant (ChatGPT, Claude, Gemini)
              </div>
              <div className={styles.workflowStep}>
                <strong>4. Apply Changes:</strong> Review and selectively apply
                AI-generated modifications
              </div>
            </div>
            <div className={styles.imageContainer}>
              <img
                src={athanorSnapshotImageUrl}
                alt="Athanor Interface: File explorer and prompt generation"
                className={`${styles.sectionImage} ${styles.clickableImage}`}
                onClick={() => {
                  setCurrentIndex(0);
                  setOpen(true);
                }}
              />
              <p className={styles.imageCaption}>
                Athanor's interface: File explorer (left), task management and
                prompt generation (right)
              </p>
            </div>
            <div className={styles.imageContainer}>
              <img
                src={athanorSnapshotApplyChangesImageUrl}
                alt="Athanor Apply Changes: Review and accept/reject diffs generated using any AI chat assistant"
                className={`${styles.sectionImage} ${styles.clickableImage}`}
                onClick={() => {
                  setCurrentIndex(1);
                  setOpen(true);
                }}
              />
              <p className={styles.imageCaption}>
                'Apply Changes' panel: Review and accept/reject diffs generated
                using any AI chat assistant
              </p>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <div className="container">
            <Heading as="h2">Quick Installation</Heading>
            <p className={styles.sectionText}>
              Get started with Athanor in minutes. Currently available in
              developer mode.
            </p>
            <div className={styles.installationSteps}>
              <div className={styles.installationStep}>
                <strong>Prerequisites:</strong> Node.js (latest LTS version,
                v18.x+)
              </div>
              <div className={styles.installationStep}>
                <strong>1. Clone:</strong>{' '}
                <code>git clone https://github.com/lacerbi/athanor.git</code>
              </div>
              <div className={styles.installationStep}>
                <strong>2. Install:</strong>{' '}
                <code>cd athanor && npm install</code>
              </div>
              <div className={styles.installationStep}>
                <strong>3. Run:</strong> <code>npm run dev</code>
              </div>
            </div>
            <p className={styles.sectionText}>
              For detailed installation instructions and troubleshooting,{' '}
              <Link to="/docs/tutorial/introduction">
                check out our tutorial
              </Link>
              .
            </p>
          </div>
        </section>

        <section className={styles.section}>
          <div className="container">
            <Heading as="h2">Community and Feedback</Heading>
            <p className={styles.sectionText}>
              Athanor is <strong>open source</strong> and you can explore its
              codebase on GitHub. In this pre-alpha development phase, your
              feedback, bug reports, and feature ideas are crucial!
            </p>
            <div className={styles.feedbackLinks}>
              <Link
                className="button button--primary button--lg"
                href="https://github.com/lacerbi/athanor/issues"
                style={{ marginRight: '1rem', marginBottom: '1rem' }}
              >
                Report Bugs & Request Features
              </Link>
              <Link
                className="button button--secondary button--lg"
                href="https://github.com/lacerbi/athanor/discussions"
                style={{ marginBottom: '1rem' }}
              >
                Join Discussions
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Lightbox
        open={open}
        close={() => setOpen(false)}
        slides={slides}
        index={currentIndex}
        plugins={[Captions]}
        carousel={{ padding: 60 }}
      />
    </Layout>
  );
}
