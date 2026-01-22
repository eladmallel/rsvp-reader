# Autonomous Curator Quick Start

**What**: Automated knowledge management that analyzes your project and updates documentation
**When**: After completing work, weekly reviews, or when docs feel scattered
**Time Saved**: 50-70% compared to manual documentation

---

## One-Minute Usage

1. Copy the prompt from [CURATOR_AUTONOMOUS_PROMPT.md](./CURATOR_AUTONOMOUS_PROMPT.md)
2. Start a conversation with the project-knowledge-curator agent
3. Paste the prompt
4. The agent will analyze, identify priority task, execute it, and report results

---

## What It Does

The autonomous curator will:

1. Check recent git commits for uncaptured learnings
2. Review OPEN_QUESTIONS.md for resolution opportunities
3. Identify gaps in LEARNINGS.md
4. Find stale documentation (>90 days without update)
5. Look for working memory files to archive
6. Suggest cross-references between related docs
7. Identify decisions needing ADRs

Then it will execute the SINGLE most important task right now.

---

## Example Output

```
### Analysis Summary
- Found 3 recent commits with security improvements not documented
- Identified 2 open questions that can be resolved based on E2E test fixes
- LEARNINGS.md last updated yesterday, current
- Working memory has 1 completed task ready for archive

### Priority Task Identified
Task: Capture E2E test environment fix learnings in LEARNINGS.md
Rationale: Critical security insights from recent work, high knowledge-loss risk
Expected Impact: Document test isolation strategy preventing future contamination

### Execution
[Agent updates LEARNINGS.md with new section...]

### Completion Report
Completed: Added comprehensive E2E test environment learnings
Files Modified: docs/LEARNINGS.md
Secondary Tasks Identified:
- Archive reading-position-persistence.md working memory file
- Resolve "Readwise List Endpoint" open question with API exploration
- Create ADR for local Supabase decision
Suggested Next Run Priority: Create ADR-004 for local development environment
```

---

## Recommended Schedule

**Daily** (saves 5 min):

```bash
# After completing work
claude-agent project-knowledge-curator < docs/CURATOR_AUTONOMOUS_PROMPT.md
```

**Weekly** (saves 15 min):

```bash
# Friday afternoon
claude-agent project-knowledge-curator < docs/CURATOR_AUTONOMOUS_PROMPT.md
```

**Monthly** (saves 30 min):

```bash
# Last Friday of month
claude-agent project-knowledge-curator < docs/CURATOR_AUTONOMOUS_PROMPT.md
```

---

## Integration with Git

Capture learnings after feature completion:

```bash
# Complete your feature work
git add .
git commit -m "feat: add new feature"

# Capture knowledge
claude-agent project-knowledge-curator < docs/CURATOR_AUTONOMOUS_PROMPT.md

# Commit documentation updates based on curator's changes
git add docs/
git commit -m "docs: capture learnings from feature work

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Customization

### Quick Learning Capture Only

Instead of full prompt, use:

```
Review the last 5 git commits and add learnings to LEARNINGS.md.
Focus on what worked, what didn't, what surprised us, what we'd do differently.
```

### Documentation Audit Only

```
Perform documentation health audit:
1. Check all metadata complete
2. Verify cross-references valid
3. Find docs >90 days old
4. Suggest improvements
```

### Specific Focus

```
Analyze recent work and update documentation focusing on: [SECURITY/TESTING/ARCHITECTURE/etc.]
```

---

## Troubleshooting

**"Curator found nothing to do"**

- This is good - documentation is current!
- Or manually check LEARNINGS.md TODO section
- Or ask team "What did you learn this week?"

**"Curator made trivial changes"**

- Adjust priorities in main prompt
- Provide context about recent significant work
- Run after major work, not during routine tasks

**"Changes were duplicate/redundant"**

- Curator missed existing content
- Consolidate duplicates manually
- Report issue to improve search strategy

---

## Full Documentation

See [CURATOR_AUTONOMOUS_PROMPT.md](./CURATOR_AUTONOMOUS_PROMPT.md) for:

- Complete prompt text
- Detailed analysis framework
- Customization options
- Metrics to track
- Evolution guidelines

---

## Success Indicators

You're getting value when:

- Documentation stays current without manual effort
- Learnings from last 3 days are always captured
- Team can find any information in <60 seconds
- You don't repeat documented mistakes
- New developers can self-onboard from docs

---

**Pro Tip**: Run the curator before starting a new task. Fresh, current documentation provides better context and prevents duplicate work.
