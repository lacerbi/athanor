---
id: example-workflows
title: Example Workflows
sidebar_position: 9
---

# 8. Example Workflows

Learn how to apply Athanor's features in real-world scenarios with these step-by-step workflow examples, from simple feature additions to complex system integrations.

## Simple Feature: Dark Mode Toggle

Let's implement a dark mode toggle for a web application.

### Step 1: Define the Task

**Task Description**:

```
Implement a dark mode toggle switch in the settings panel that saves the user's preference to localStorage and applies the theme immediately.
```

### Step 2: Smart File Selection

Instead of manually selecting files, let's use Athanor's intelligence:

1. **Don't select any files initially**
2. **Click "Autoselect"** prompt template
3. **Copy** the generated prompt to your AI assistant
4. **Paste response** back into Athanor
5. **Click "Apply AI Output"** to auto-select relevant files

The AI might suggest files like:

- `components/SettingsPanel.tsx`
- `hooks/useTheme.ts`
- `styles/globals.css`
- `contexts/ThemeContext.tsx`

### Step 3: Implement the Feature

1. **Review** the auto-selected files
2. **Click "Coder"** prompt template
3. **Copy** prompt to AI assistant
4. **Receive** implementation with proper React hooks, CSS variables, and localStorage persistence

### Step 4: Apply Changes

1. **Copy** AI response
2. **Click "Apply AI Output"**
3. **Review** each proposed change in the diff viewer
4. **Accept** changes that look correct
5. **Reject** any unwanted modifications

### Expected Outcome

- New theme toggle component
- Hook for theme management
- CSS variables for dark/light modes
- Persistent user preferences

---

## Complex Feature: Stripe Payment Integration

Let's integrate Stripe for handling monthly user subscriptions with a multi-commit approach.

### Phase 1: Architecture Planning

**Task Description**:

```
Integrate Stripe for handling monthly user subscriptions. This should include:
- Creating subscription plans
- Handling webhooks for payment success/failure
- Updating user subscription status
- Managing billing portal access
- Error handling and user feedback
```

#### Step 1: Get the Architecture Plan

1. **Click "Autoselect"** to identify relevant files
2. **Apply AI Output** to select suggested files
3. **Click "Architect"** prompt template
4. **Copy** to AI assistant for strategic planning

The AI will provide a commit-by-commit breakdown:

**Commit 1**: Setup Stripe SDK and API keys
**Commit 2**: Implement subscription plan management
**Commit 3**: Create checkout session handling
**Commit 4**: Implement webhook endpoint
**Commit 5**: Build user billing portal
**Commit 6**: Add error handling and UI feedback

#### Step 2: Copy Architecture to Context

1. **Copy** the AI's architecture response
2. **Paste** the commit plan into the **Context** field
3. This will be included in subsequent prompts

### Phase 2: Implementation (Commit by Commit)

#### Commit 1: Setup Stripe SDK

1. **Select "Commit 1" from Task Context**:
   ```
   Implement Commit 1: Setup Stripe SDK and API keys.
   Configure environment variables and initialize Stripe client.
   ```
2. **Use existing file selection** (you rarely need to rerun Autoselect)
3. **Click "Coder"** prompt
4. **Apply changes** after review

#### Commit 2: Subscription Plans

1. **Either:**
   - **Continue** in your current AI chat by telling the AI "Continue with Commit 2"; **or**
   - **Select "Commit 2" from Task Context**, click "Coder prompt" and paste in a new chat
   - This choice depends on the complexity and length of the current chat
2. **Review and apply** changes

#### Continue Pattern for Remaining Commits

Repeat the process for each commit:

- Update task context with current commit (or continue in the chat)
- Use "Coder" prompt for implementation
- Apply and test changes
- Move to next commit

### Phase 3: Integration Testing

After completing all commits:

1. **Task Description**:
   ```
   Review the complete Stripe integration implementation and provide:
   - Integration testing checklist
   - Potential security considerations
   - Performance optimization opportunities
   - Error scenarios to test
   ```
2. **Select all modified files**
3. **Use "Query"** prompt for analysis
4. **Follow AI recommendations** for testing

---

## Understanding Existing Code: Authentication Flow

Learn how to use Athanor to understand unfamiliar codebases.

### Step 1: Broad Overview

**Task Description**:

```
Explain the current user authentication flow, including:
- Token generation and validation
- Session management
- Role-based access control
- Security measures implemented
- Which files are primarily involved?
```

#### Process:

1. **Click "Autoselect"** to find auth-related files
2. **Apply AI Output** to select suggested files
3. **Click "Query"** prompt for analysis-focused output
4. **Review** AI's explanation of the authentication system

### Step 2: Deep Dive into Specific Components

Based on the AI's overview, dive deeper on the JWT token validation middleware.

#### Process:

1. **Select** specific middleware files identified in Step 1
2. Use the **copy** action from the File Manager to copy just these files in the existing chat
3. **Ask follow-up questions** in the same AI chat

### Step 3: Document Your Understanding

#### Process:

1. **Ask the AI for a Summary** of your chat
2. **Paste** the summary into the Task Description
3. **Autoselect** all authentication-related files
4. **Use "Writer"** prompt for documentation generation
5. **Apply changes** to create/update documentation files

---

## Best Practices for Workflow Success

### Planning Phase

1. **Start with Autoselect** when unsure about file selection
2. **Use Architect** for complex features requiring multiple steps
3. **Break large tasks** into smaller, manageable commits
4. **Document your plan** in the Context field

### Implementation Phase

1. **Review AI suggestions** carefully before applying
2. **Test incrementally** after each commit
3. **Use version control** to track changes
4. **Ask follow-up questions** when AI responses are unclear
5. **Stay in the chat** if the context is still relevant

### Quality Assurance

1. **Use Query prompts** to verify understanding
2. **Generate tests** for critical functionality
3. **Review security implications** of changes
4. **Document** important decisions and changes

### Team Collaboration

1. **Share custom templates** that work well for your team
2. **Use consistent commit messages** when applying changes
3. **Document workflows** that prove effective
4. **Train team members** on successful patterns

## Troubleshooting Common Workflow Issues

### AI Responses Don't Match Expectations

- **Refine task descriptions** with more specific requirements
- **Add relevant context** about coding standards or patterns
- **Include examples** of desired output format
- **Break complex requests** into smaller parts

### Changes Don't Apply Cleanly

- **Check that files haven't changed** since generating the prompt
- **Regenerate prompts** with current file state
- **Review merge conflicts** carefully
- **Apply changes in smaller batches**

### Workflow Takes Too Long

- **Use preset tasks** for common operations
- **Create custom templates** for repeated workflows
- **Leverage API integration** for simple requests
- **Batch similar operations** together

### Results Lack Project Context

- **Include `PROJECT.md` or documentation** files in selection
- **Add project-specific requirements** to task descriptions
- **Use project-specific custom templates**
- **Provide architectural context** in prompts

Ready to master Athanor? Practice these workflows with your own projects and experiment with creating custom templates that match your team's specific needs!
