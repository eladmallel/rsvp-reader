# RSVP Reader Documentation Index

**Last Updated**: 2026-01-22
**Purpose**: Central catalog of all project documentation for quick discovery

> **Automation**: Use the [Autonomous Curator](./CURATOR_AUTONOMOUS_PROMPT.md) to keep documentation current automatically

---

## Quick Start

**New to the project?** Start here:

- [README.md](../README.md) - Project overview and setup instructions
- [AGENTS.md](../AGENTS.md) - Development workflow and working guidelines

---

## Project Management

### Planning & Tasks

- [PROJECT_PLAN.md](./PROJECT_PLAN.md) - Main project plan and task breakdown
- [ROADMAP.md](./ROADMAP.md) - **Current priorities and roadmap** ⭐
- [OPEN_QUESTIONS.md](../OPEN_QUESTIONS.md) - Active questions and decisions needed
- [DOCUMENTATION_IMPROVEMENT_PLAN.md](./DOCUMENTATION_IMPROVEMENT_PLAN.md) - This documentation improvement initiative

### Knowledge Base

- [LEARNINGS.md](./LEARNINGS.md) - Project insights and accumulated wisdom
- [DOCUMENTATION_GUIDE.md](./DOCUMENTATION_GUIDE.md) - Documentation standards and maintenance
- [CURATOR_AUTONOMOUS_PROMPT.md](./CURATOR_AUTONOMOUS_PROMPT.md) - Autonomous knowledge management prompt
- [CURATOR_QUICK_START.md](./CURATOR_QUICK_START.md) - Quick guide to automated documentation

---

## Architecture & Design

### Design System

- [DESIGN_REVAMP_PLAN.md](./redesign/DESIGN_REVAMP_PLAN.md) - Comprehensive design revamp strategy
- [IMPLEMENTATION_PLAN.md](./redesign/IMPLEMENTATION_PLAN.md) - Design implementation roadmap

### Architecture Decisions (ADRs)

- [ADR Template](./decisions/000-template.md) - Template for architecture decision records
- [ADR-001: Supabase Local Development](./decisions/001-supabase-local-development.md) - Why we use local Supabase for testing
- [ADR-002: Environment Separation Strategy](./decisions/002-environment-separation-strategy.md) - Strict dev/test/prod isolation
- [ADR-003: E2E Test Resilience Patterns](./decisions/003-e2e-test-resilience-patterns.md) - Testing across variable backend speeds
- [ADR-004: Design-First Development Workflow](./decisions/004-design-first-development-workflow.md) - Mandatory design prototyping before implementation ⭐

---

## DevOps & Operations

### Deployment & Infrastructure

- [DEPLOYMENT-REVIEW-SUMMARY.md](./devops/DEPLOYMENT-REVIEW-SUMMARY.md) - Comprehensive deployment review
- [deployment-review-2026-01-22.md](./devops/deployment-review-2026-01-22.md) - Detailed deployment findings
- [e2e-test-environment-fixes.md](./devops/e2e-test-environment-fixes.md) - E2E test environment improvements

### Security & Compliance

- [SECURITY-CHECKLIST.md](./devops/SECURITY-CHECKLIST.md) - Security requirements and status
- [secret-rotation.md](./devops/secret-rotation.md) - Secret management procedures
- [IMMEDIATE-ACTIONS.md](./devops/IMMEDIATE-ACTIONS.md) - Critical security actions

---

## Feature Planning & Specifications

### Readwise Integration

- [readwise-sync-plan.md](./readwise-sync-plan.md) - Automated Readwise sync architecture
- [MANUAL_READWISE_SYNC_PLAN.md](./MANUAL_READWISE_SYNC_PLAN.md) - Manual sync implementation
- [readwise-api-exploration.md](./readwise-api-exploration.md) - Readwise API investigation
- [reader-archive-sync-plan.md](./reader-archive-sync-plan.md) - Archive handling strategy

### Troubleshooting

- [SYNC_TROUBLESHOOTING.md](./SYNC_TROUBLESHOOTING.md) - Debugging sync issues

---

## Working Memory

**Active task tracking** (temporary, archived when complete):

- [Working Memory Template](./working-memory/_TEMPLATE.md) - Template for tracking active work
- [reading-position-persistence.md](./working-memory/reading-position-persistence.md) - Reading position feature work
- [readwise-sync-reliability.md](./working-memory/readwise-sync-reliability.md) - Sync reliability improvements
- [README.md](./working-memory/README.md) - Working memory system overview

---

## Visual Assets

### Screenshots

- [UI Reference](./assets/screenshots/ui-reference/) - Current UI screenshots
- [Design Mockups](./assets/screenshots/design-mockups/) - Design proposals and mockups

### Designs & Diagrams

- [Design Files](./assets/designs/) - Design system files
- [Architecture Diagrams](./assets/diagrams/) - System architecture visualizations

_Detailed asset catalog coming soon_

---

## Workflows & Automation

- [.agent/workflows/deploy.md](../.agent/workflows/deploy.md) - Deployment workflow automation

---

## Agent Configuration

- [devops-optimizer.md](../.claude/agents/devops-optimizer.md) - DevOps agent configuration
- [project-knowledge-curator.md](../.claude/agents/project-knowledge-curator.md) - Knowledge curator agent
  - [Autonomous Curation Prompt](./CURATOR_AUTONOMOUS_PROMPT.md) - Run curator autonomously

---

## Archive

Completed or superseded documentation:

- [2026-01/](./archive/2026-01/) - January 2026 archived docs

---

## Documentation Quick Reference

### By Purpose

- **Getting Started**: README.md
- **Working on Tasks**: AGENTS.md, PROJECT_PLAN.md, working-memory/
- **Understanding Decisions**: decisions/ (ADRs), LEARNINGS.md
- **Design & UX**: redesign/
- **DevOps & Security**: devops/
- **Troubleshooting**: SYNC_TROUBLESHOOTING.md, OPEN_QUESTIONS.md

### By Status

- **Active**: PROJECT_PLAN.md, OPEN_QUESTIONS.md, working-memory/
- **Reference**: AGENTS.md, ADRs, LEARNINGS.md
- **Historical**: archive/

---

## Maintenance Schedule

**Daily**: Update working-memory files and LEARNINGS.md
**Weekly**: Review and update INDEX.md for new docs
**Monthly**: Archive completed working-memory, update PROJECT_PLAN.md
**Quarterly**: Full documentation audit and cleanup

---

**Navigation**:

- [Project Plan](./PROJECT_PLAN.md)
- [Working Guidelines](../AGENTS.md)
- [Documentation Standards](./DOCUMENTATION_GUIDE.md)
