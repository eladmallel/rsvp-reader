# RSVP Reader Documentation Guide

**Created**: 2026-01-21
**Last Updated**: 2026-01-21
**Status**: Active

This guide establishes standards for creating and maintaining high-quality documentation in the RSVP Reader project.

---

## Table of Contents

1. [Core Principles](#core-principles)
2. [When to Create Documentation](#when-to-create-documentation)
3. [Documentation Types](#documentation-types)
4. [Metadata Requirements](#metadata-requirements)
5. [Naming Conventions](#naming-conventions)
6. [Writing Style](#writing-style)
7. [Maintenance Schedule](#maintenance-schedule)
8. [Archiving Process](#archiving-process)

---

## Core Principles

1. **Discoverability First**: Every document must be findable in < 60 seconds via INDEX.md
2. **Single Source of Truth**: Each topic has one canonical document
3. **Cross-Reference Liberally**: Link related docs to surface context naturally
4. **Keep Current**: No document should go 90 days without review
5. **Capture Learnings Daily**: 5 minutes/day prevents knowledge loss

---

## When to Create Documentation

### Always Document

- ✅ Major architecture decisions (create ADR)
- ✅ Complex features or systems (create spec/design doc)
- ✅ Troubleshooting solutions (add to troubleshooting doc or LEARNINGS.md)
- ✅ DevOps/deployment changes (update devops/ docs)
- ✅ Security findings or changes (update SECURITY-CHECKLIST.md)

### Use Working Memory For

- ✅ Active multi-day tasks
- ✅ Complex debugging sessions
- ✅ Features requiring iteration and discovery

### Don't Document

- ❌ Temporary experiments (unless they produce learnings)
- ❌ Obvious code behavior (use code comments instead)
- ❌ Things already well-documented in linked resources

---

## Documentation Types

### 1. Planning Documents

**Location**: `/docs/`
**Examples**: PROJECT_PLAN.md, feature specs
**Purpose**: Define what to build and why
**Lifespan**: Active until feature complete, then archive

**Required sections**:

- Objective
- Background/Context
- Requirements
- Success Criteria
- Related Documentation

### 2. Architecture Decision Records (ADRs)

**Location**: `/docs/decisions/`
**Template**: `000-template.md`
**Purpose**: Document significant architectural choices
**Lifespan**: Permanent (may be deprecated but not deleted)

**When to create**: Major decisions affecting:

- System architecture
- Technology choices
- Security approach
- Data models
- User experience patterns

### 3. Working Memory

**Location**: `/docs/working-memory/`
**Template**: `_TEMPLATE.md`
**Purpose**: Track active work in progress
**Lifespan**: Temporary (archive when complete)

**When to create**:

- Multi-day tasks
- Complex features requiring iteration
- Work involving multiple files/systems

### 4. Knowledge Base

**Location**: `LEARNINGS.md`
**Purpose**: Capture accumulated project wisdom
**Lifespan**: Permanent, continuously updated

**Add learnings about**:

- Patterns that worked well
- Failed approaches (to avoid repetition)
- Tool/API quirks discovered
- Performance optimizations
- Testing strategies

### 5. Operational Documentation

**Location**: `/docs/devops/`
**Purpose**: Deployment, security, infrastructure
**Lifespan**: Permanent, regularly updated

---

## Metadata Requirements

All documentation files must include metadata at the top:

```markdown
# Document Title

**Created**: YYYY-MM-DD
**Last Updated**: YYYY-MM-DD
**Status**: Draft | Active | Complete | Deprecated | Archived
**Related Docs**: [Links to related documentation]

[Content...]
```

### Status Definitions

- **Draft**: Work in progress, not yet reviewed
- **Active**: Current and being used
- **Complete**: Finished but still relevant (e.g., completed features)
- **Deprecated**: Superseded by newer approach (keep for historical reference)
- **Archived**: No longer relevant, moved to archive/

---

## Naming Conventions

### File Names

- Use `SCREAMING_SNAKE_CASE.md` for root-level docs (AGENTS.md, README.md)
- Use `kebab-case.md` for docs in subdirectories (readwise-sync-plan.md)
- Use descriptive names that indicate content (not generic names like "doc1.md")
- Use dates for time-based docs: `deployment-review-2026-01-22.md`

### Directory Structure

```
docs/
├── INDEX.md                    # Central catalog
├── LEARNINGS.md                # Knowledge base
├── DOCUMENTATION_GUIDE.md      # This file
├── PROJECT_PLAN.md             # Main plan
├── assets/                     # Visual assets
│   ├── screenshots/
│   ├── designs/
│   └── diagrams/
├── decisions/                  # ADRs (001-title.md)
├── working-memory/             # Active work tracking
├── devops/                     # Operations docs
├── redesign/                   # Design system docs
└── archive/                    # Completed/superseded (YYYY-MM/)
```

---

## Writing Style

### Clarity

- Write in present tense
- Use active voice
- Be specific and concrete
- Avoid jargon without explanation

### Structure

- Start with clear objective/purpose
- Use headers for scanability
- Include table of contents for long docs (>500 lines)
- Add "Related Documentation" section at end

### Cross-Referencing

Every major document should link to 3+ related docs:

```markdown
## See Also

- [Documentation Index](./INDEX.md)
- [LEARNINGS.md](./LEARNINGS.md)
- [Related Feature Plan](./path/to/plan.md)
```

### Code References

When referencing code, include line numbers:

- `src/lib/readwise.ts:42` (function definition)
- `app/api/sync/route.ts:15-30` (code block)

---

## Maintenance Schedule

### Daily (5 minutes)

- ⏰ **End of day**: Add learnings to LEARNINGS.md
- ⏰ **During work**: Update working-memory files for active tasks

### Weekly (15 minutes)

- ⏰ **Friday**: Review INDEX.md for new docs
- ⏰ **Friday**: Check ADRs for needed updates
- ⏰ **Friday**: Update "Last Updated" dates on modified docs

### Monthly (30 minutes)

- ⏰ **Last Friday**: Review PROJECT_PLAN.md task status
- ⏰ **Last Friday**: Archive completed working-memory files
- ⏰ **Last Friday**: Update stale docs or mark as deprecated
- ⏰ **Last Friday**: Check for TODO sections older than 30 days

### Quarterly (2 hours)

- ⏰ **End of quarter**: Full documentation audit
- ⏰ **End of quarter**: Archive stale documents
- ⏰ **End of quarter**: Improve cross-references
- ⏰ **End of quarter**: Review all ADRs for accuracy
- ⏰ **End of quarter**: Clean up OPEN_QUESTIONS.md

---

## Archiving Process

### When to Archive

- Working-memory files: When task complete
- Planning docs: When feature shipped and stable (>30 days)
- Deprecated docs: When clearly superseded

### How to Archive

1. Move file to `/docs/archive/YYYY-MM/`
2. Add "Archived" note at top with reason and date
3. Update INDEX.md to remove or mark as archived
4. Add redirect/link in original location if referenced elsewhere

### Example Archive Note

```markdown
# [Original Title]

**ARCHIVED**: 2026-01-21
**Reason**: Superseded by [new-approach.md](../new-approach.md)
**Original Created**: 2025-11-15

For historical reference only. See [new-approach.md](../new-approach.md) for current implementation.

---

[Original content...]
```

---

## Quality Checklist

Before considering a document "done", verify:

- [ ] Metadata present (created, updated, status)
- [ ] Purpose/objective clearly stated
- [ ] Related docs linked (3+ cross-references)
- [ ] Added to INDEX.md
- [ ] No TODO sections older than 30 days
- [ ] Proper spelling and grammar
- [ ] Code references include file paths and line numbers
- [ ] Status reflects current reality

---

## Templates

Available templates:

- [Working Memory Template](./working-memory/_TEMPLATE.md)
- [ADR Template](./decisions/000-template.md)

---

## Success Metrics

We maintain high-quality documentation when:

**Quantitative**:

- ✅ Any doc findable in < 60 seconds via INDEX.md
- ✅ Every major doc has 3+ cross-references
- ✅ No doc over 90 days without review
- ✅ Zero TODO sections older than 30 days

**Qualitative**:

- ✅ New developer can understand project from docs alone
- ✅ "Why" behind every major decision is documented
- ✅ Same mistakes not repeated (learnings captured)
- ✅ Related information surfaces naturally

---

## Questions?

- See [INDEX.md](./INDEX.md) for all documentation
- See [AGENTS.md](../AGENTS.md) for development workflow
- See [LEARNINGS.md](./LEARNINGS.md) for project insights

---

**Last Review**: 2026-01-21
**Next Review**: 2026-02-21 (monthly)
