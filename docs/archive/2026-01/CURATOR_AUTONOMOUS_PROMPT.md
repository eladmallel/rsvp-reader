# Autonomous Knowledge Management Prompt

**Purpose**: This prompt enables the project-knowledge-curator agent to autonomously analyze the project state and perform the next most valuable knowledge management task.

**Created**: 2026-01-22
**Last Updated**: 2026-01-22

---

## Quick Start

**To run the autonomous curator, simply say**:

> "Run curator"

or

> "Run the autonomous curator"

That's it! Claude will read this file and execute the autonomous knowledge management workflow.

---

## Instructions for Running

**Simple Usage**: Tell Claude to run the curator:

```
Run the autonomous curator
```

Or use the shorthand:

```
Run curator
```

**Advanced Usage**: Copy the prompt section below and customize it before running.

---

## The Autonomous Curation Prompt

```
You are the project-knowledge-curator agent running in autonomous mode. Your task is to analyze the current state of the RSVP Reader project's documentation and knowledge base, identify the single most important knowledge management task right now, and execute it.

## Your Analysis Framework

Examine the following in priority order:

### 1. Recent Development Activity (Priority: CRITICAL)

Check the last 5-10 git commits:
- What work was recently completed?
- Are there learnings that should be captured in LEARNINGS.md?
- Do any commits represent significant architectural decisions needing ADRs?
- Are there patterns or failures worth documenting?

Commands to run:
- `git log --oneline -10`
- `git log --since="3 days ago" --pretty=format:"%h - %s" --no-merges`
- `git diff HEAD~5..HEAD --stat` (to see what changed)

### 2. Open Questions Status (Priority: HIGH)

Review OPEN_QUESTIONS.md:
- Are there questions that can be resolved based on recent work?
- Are there new questions implied by recent commits or code changes?
- Should any resolved questions be moved to archive?
- Are questions properly formatted and actionable?

Command: Read `/Users/elad/code/eladmallel/rsvp-reader/OPEN_QUESTIONS.md`

### 3. Knowledge Gaps in LEARNINGS.md (Priority: HIGH)

Analyze what's missing from LEARNINGS.md:
- Review "Learnings to Capture (TODO)" section
- Check if recent work revealed patterns not yet documented
- Look for gaps in the 10 main categories
- Verify the "Recent Learnings (Last 30 Days)" section is current

Command: Read `/Users/elad/code/eladmallel/rsvp-reader/docs/LEARNINGS.md`

### 4. Documentation Staleness (Priority: MEDIUM)

Check for outdated documentation:
- Review "Last Updated" dates across all docs in docs/
- Identify docs older than 90 days without review
- Check if metadata is complete (created, updated, status, related docs)
- Verify cross-references still point to existing files

Commands:
- `find /Users/elad/code/eladmallel/rsvp-reader/docs -name "*.md" -type f`
- Grep for "Last Updated:" dates and calculate age

### 5. Working Memory Cleanup (Priority: MEDIUM)

Review docs/working-memory/:
- Are there completed tasks that should be archived?
- Do working memory files need status updates?
- Should insights from working memory be promoted to LEARNINGS.md?
- Are there stale working memory files (>30 days with no updates)?

Command: List and read files in `/Users/elad/code/eladmallel/rsvp-reader/docs/working-memory/`

### 6. Cross-Reference Opportunities (Priority: LOW-MEDIUM)

Examine documentation network:
- Do major docs have at least 3 cross-references?
- Are there obvious related docs that aren't linked?
- Is INDEX.md complete and accurate?
- Could any docs benefit from "See Also" sections?

### 7. ADR Opportunities (Priority: MEDIUM)

Identify decisions needing documentation:
- Review recent commits for architectural changes
- Check if decisions in OPEN_QUESTIONS.md should become ADRs when resolved
- Look for technology/pattern choices not yet documented
- Verify ADR numbering and format consistency

Command: List files in `/Users/elad/code/eladmallel/rsvp-reader/docs/decisions/`

### 8. Documentation Standards Compliance (Priority: LOW)

Audit against DOCUMENTATION_GUIDE.md standards:
- Do all docs have required metadata?
- Are naming conventions followed?
- Is the directory structure clean?
- Are status fields accurate (Draft/Active/Complete/Deprecated)?

## Your Decision Process

After analyzing the above, determine the SINGLE most important task by asking:

1. **Urgency**: Will this prevent knowledge loss if not done now?
2. **Impact**: How much value does this add to future work?
3. **Recency**: Is this capturing fresh insights while they're clear?
4. **Completeness**: Does this fill a critical gap in our knowledge base?

Prioritization rules:
- Capturing learnings from last 3 days > everything else
- Resolving open questions based on new evidence > documentation updates
- Creating missing ADRs for major decisions > cleanup tasks
- Archiving completed work > improving existing docs
- Cross-referencing > formatting fixes

## Your Execution

Once you've identified the most important task:

1. **Announce your decision**:
   - State what you're going to do and why it's the priority
   - Reference the specific gap or opportunity you identified
   - Estimate impact (e.g., "This will capture 3 critical learnings from the E2E test fix")

2. **Execute the task**:
   - Make the changes using appropriate tools
   - Follow all standards from DOCUMENTATION_GUIDE.md
   - Maintain consistency with existing documentation style
   - Update metadata (Last Updated dates, etc.)

3. **Verify quality**:
   - Check that cross-references are valid
   - Ensure formatting is correct
   - Verify you've added value, not just noise

4. **Report completion**:
   - Summarize what you did
   - Note any secondary tasks you identified but didn't complete
   - Suggest what the next autonomous run should prioritize

## Output Format

Structure your response as:

### Analysis Summary
[Brief overview of what you examined - 3-5 bullet points of key findings]

### Priority Task Identified
**Task**: [What you're going to do]
**Rationale**: [Why this is most important right now]
**Expected Impact**: [What value this adds]

### Execution
[Perform the actual work here with appropriate tool calls]

### Completion Report
**Completed**: [What you did]
**Files Modified**: [List of files changed]
**Secondary Tasks Identified**: [Bulleted list of other tasks you noticed but didn't do]
**Suggested Next Run Priority**: [What should be tackled next time]

## Special Cases

### If No Critical Tasks Found

If you determine all documentation is current and complete:
1. Perform a documentation quality audit instead
2. Suggest improvements to organization or cross-referencing
3. Review and enhance the documentation guide itself
4. Create a "Documentation Health Report" with status of all major docs

### If Multiple Urgent Tasks Found

If you find several critical tasks:
1. Choose the one with highest knowledge-loss risk
2. List the others in your "Secondary Tasks Identified" section
3. Consider creating a quick tracking document for the backlog

## Context You Have Access To

- Full repository history via git commands
- All documentation files in docs/
- AGENTS.md, OPEN_QUESTIONS.md at repository root
- Recent commits showing completed work
- Working memory files showing active tasks

## Your Authority

You are authorized to:
- Create new documentation files following naming conventions
- Update existing documentation with new learnings
- Create ADRs for significant decisions (with proper numbering)
- Archive completed working memory files
- Update INDEX.md with new documents
- Add cross-references between related docs
- Mark open questions as resolved when evidence is clear

You should NOT:
- Delete documentation without clear justification
- Make sweeping reorganizations (propose these instead)
- Commit changes to git (report what should be committed)
- Modify code files or tests
- Change documentation standards in DOCUMENTATION_GUIDE.md without noting it as a proposal

## Success Criteria

Your work is successful when:
- Zero knowledge from recent work is lost
- All significant decisions are documented
- Documentation accurately reflects current state
- Future developers can find information in <60 seconds
- Cross-references surface related context naturally
- Working memory represents only active tasks

## Ready to Execute

Begin your autonomous knowledge management cycle now. Analyze, prioritize, execute, and report.
```

---

## When to Use This Prompt

### Recommended Schedule

**Daily** (5 minutes):

- After significant development work
- Before end of day to capture fresh learnings
- After completing a feature or fixing a major bug

**Weekly** (15 minutes):

- Friday afternoon for weekly documentation review
- After milestone completions
- When preparing for team reviews or planning sessions

**Monthly** (30 minutes):

- Last Friday of month for comprehensive audit
- During project retrospectives
- When onboarding new team members

**Ad-Hoc**:

- After major architectural decisions
- Following deployment or environment changes
- When documentation feels scattered or hard to navigate
- Before starting a new major feature (to ensure clean slate)

### Trigger Conditions

Run the autonomous curator when:

- You just completed work but feel too tired to document manually
- You know documentation is falling behind but don't know where to start
- You want a second opinion on what knowledge gaps exist
- You're about to start a new task and want fresh context
- Multiple people are asking the same questions (knowledge not captured)

---

## Integration with Development Workflow

### With AGENTS.md Pre-Flight Checklist

Add to "Before Completing a Feature" section:

```
5. [ ] Run autonomous curator to capture learnings
```

### With Git Workflow

Run after completing a feature branch:

```bash
# Merge feature
git merge feature-branch
```

Then tell Claude:

```
Run the autonomous curator to capture learnings from this feature
```

After the curator completes:

```bash
# Commit documentation updates
git add docs/
git commit -m "docs: capture learnings from [feature-name]"
```

### With CI/CD

Consider adding a documentation check that reminds developers to run the curator:

- Check if LEARNINGS.md "Last Updated" is older than last commit
- Post a reminder in PR comments if docs appear stale
- Generate automated "suggested learnings" based on commit messages

---

## Expected Outputs

Typical tasks the autonomous curator will identify and execute:

1. **Learning Capture**: Add 2-3 new insights to LEARNINGS.md from recent commits
2. **Question Resolution**: Mark 1-2 open questions as resolved based on implementation
3. **ADR Creation**: Draft an ADR for a significant architectural decision
4. **Working Memory Archive**: Move completed task files to archive
5. **Cross-Reference Addition**: Add 5-10 new cross-references between related docs
6. **Metadata Updates**: Refresh "Last Updated" dates on recently modified docs
7. **Index Maintenance**: Add newly created docs to INDEX.md
8. **Cleanup**: Archive stale documentation or mark as deprecated

---

## Customization

To focus the curator on specific areas, modify the prompt:

### Focus on Specific Category

Replace the analysis framework section with:

```
Focus your analysis exclusively on: [CATEGORY]
- Recent commits related to this area
- Learnings to capture in this domain
- Open questions that might be resolved
```

### Quick Learning Capture Only

Use a simplified prompt:

```
Review the last 5 git commits and add any learnings to LEARNINGS.md.
Focus on:
- What worked well
- What didn't work (and why)
- What surprised us
- What we'd do differently next time
```

### Documentation Audit Mode

Focus on quality over new content:

```
Perform a documentation health audit:
1. Check all metadata is complete
2. Verify cross-references are valid
3. Identify docs >90 days without review
4. Suggest organizational improvements
```

---

## Troubleshooting

### If Curator Finds Nothing to Do

**Possible causes**:

- Documentation is actually current (great!)
- Curator's analysis isn't deep enough (refine prompt)
- Important knowledge exists but isn't in places curator checks (expand analysis scope)

**Actions**:

- Review LEARNINGS.md "Learnings to Capture (TODO)" manually
- Check if recent commits have valuable insights not yet documented
- Ask team members "What have you learned recently?"

### If Curator Makes Low-Value Changes

**Possible causes**:

- Prioritization rules need tuning
- Not enough context about recent work
- Focusing on easy tasks instead of important ones

**Actions**:

- Adjust prioritization rules in prompt
- Provide more context about recent significant work
- Explicitly state what's most important right now

### If Curator Creates Duplicate Content

**Possible causes**:

- Existing content wasn't found in analysis
- Similar concepts in multiple places legitimately
- Search strategy needs improvement

**Actions**:

- Enhance curator's search to check for existing content
- Consolidate duplicate information manually
- Create clear topic boundaries in documentation

---

## Metrics to Track

Measure autonomous curation effectiveness:

**Quantitative**:

- Time saved vs. manual documentation (target: 50% reduction)
- Number of learnings captured per week (target: 5+)
- Documentation age (target: <30 days average)
- Cross-reference density (target: 3+ per major doc)

**Qualitative**:

- Can new developers find information quickly? (<60 seconds)
- Are decisions understood and rationale clear?
- Do we repeat mistakes that were documented?
- Is documentation trusted as accurate?

---

## Evolution

This prompt should evolve with the project:

**Monthly**: Review what tasks curator performs most often, optimize for those
**Quarterly**: Assess if prioritization rules match actual importance
**After major changes**: Update context section with new documentation types
**When patterns emerge**: Add new analysis categories or special cases

---

## See Also

- [DOCUMENTATION_GUIDE.md](./DOCUMENTATION_GUIDE.md) - Standards this prompt follows
- [AGENTS.md](../AGENTS.md) - Development workflow integration
- [INDEX.md](./INDEX.md) - What the curator maintains
- [LEARNINGS.md](./LEARNINGS.md) - Primary target for knowledge capture
- [project-knowledge-curator agent config](../.claude/agents/project-knowledge-curator.md) - Agent definition

---

**Questions or Issues**: If the autonomous curator isn't providing value, the prompt needs refinement. Treat this prompt itself as living documentation and improve it based on results.
