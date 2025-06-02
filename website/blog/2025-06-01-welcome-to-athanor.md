---
slug: welcome-to-athanor
title: Welcome to Athanor!
authors: [lacerbi]
tags: [athanor, announcement, development]
---

# Welcome to Athanor! 🎉

I am excited to finally share the pre-alpha release of [Athanor - AI Workbench](https://github.com/lacerbi/athanor) together with this new website.

<!-- truncate -->

## What is Athanor?

Athanor is a desktop app that sits between you and your AI assistant (ChatGPT, Claude, Gemini, etc.). Think of it as a workbench with a set of tools and knobs to make AI workflow actually practical. Athanor helps you:

- **Intelligently select** relevant files for your AI prompts
- **Generate comprehensive prompts** with proper context
- **Safely apply AI-generated changes** with full visibility and control
- **Work with any AI assistant** - no API keys required for core functionality

Athanor is an **open-source** project and you can find it [on GitHub](https://github.com/lacerbi/athanor).

## Why Athanor?

Athanor was born out of my frustration with using standard chat interfaces for AI-assisted development for code and technical writing:

- Gathering files manually was a pain, even using tools such as [`repomix`](https://github.com/yamadashy/repomix)
- Most of my workflow consisted of fairly standardized operations (planning features, requesting changes, summarizing files) that I found myself retyping constantly.
- Integrating the AI output back into a project–whether a codebase, a website, or technical writing–is painful:
  - When the AI outputs just a snippet, you need to manually copy-paste it at exactly the right place
  - When the AI outputs the entire file, it sometimes messes up or _forgets_ something else along the way–and some files are just too large, so waiting for the full output is unwieldy

Also, having already multiple AI subscriptions, I wasn't too keen on switching to a pure API workflow.

**That's how Athanor began.** And now, after months of using it to build itself, I'm ready to share it with you.

## What's on This Website

I have put together documentation that covers what I thought would be useful for a newcomer. Yes, of course I have used Athanor and various AI assistants to help me with this (but this is me writing, working from an excessively salesman-y draft of this post).

Most importantly, [**the Tutorial**](/docs/tutorial/introduction) takes you from installation to your first real workflow. It goes from basic prompts to customizing your Athanor experience to your specific needs.

## Where We're At

Athanor is in **pre-alpha**. What does that mean practically?

- It works. I have been using it daily for months (including to build Athanor itself from `v0.1.0`)
- There are rough edges. Sometimes you'll hit a weird bug
- Features are still evolving based on what actually helps vs. what seemed like a good idea
- Many features are still in the wishlist

Your feedback at this stage is gold. If something is annoying or broken, please let me know.

## Try It Out

Right now, Athanor runs in developer mode:

```bash
git clone https://github.com/lacerbi/athanor.git
cd athanor && npm install
npm run dev
```

## What's Coming

In the next few weeks, I will be focusing on basic improvements:

- Making it more stable
- Increasing test coverage (yes, I know)
- Performance improvements for larger projects (this will require making the _Smart Preview_ actually smart)
- More prompt templates based on actual use cases
- Eventually, packaged releases so you do not need to run from source

The roadmap will also depend on what you tell me.

## One More Thing

At the moment, one thing Athanor is pretty good at is building Athanor.

The Athanor codebase, after an initial old-school "copy-paste" period, has been almost entirely written with Athanor. The _almost_ is there just for academic precision–more than 99% of the code was written and integrated using Athanor. I have made a few manual changes here and here, when it was faster for me to fix a typo by hand than going through a prompt.

With this, I have experienced first-hand how development has become smoother and smoother. Having smarter models helped too, or course.

Anyhow, I think you might find Athanor useful too. Give it a try, and let me know how it goes.
You can contact me on a variety of social media or directly on Athanor's [GitHub issues](https://github.com/lacerbi/athanor/issues) or [discussions](https://github.com/lacerbi/athanor/discussions).

---

_Luigi Acerbi, building Athanor one prompt at a time_
