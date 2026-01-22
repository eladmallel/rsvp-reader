# ADR-004: Design-First Development Workflow

**Status**: Accepted
**Date**: 2026-01-22
**Deciders**: Engineering Team
**Impact**: High - Affects all future feature development

---

## Context

During initial development of the RSVP Reader application, we jumped directly into implementation without creating design prototypes first. This led to several significant problems:

### Problems Identified

1. **Poor UX Outcomes**: The RSVP player was built and shipped, but the reading experience was not enjoyable
2. **Wasted Development Time**: Had to plan a redesign after already implementing features
3. **Missed Opportunities**: Could have iterated on design much faster in prototype form
4. **Higher Change Cost**: Changing designs in production code is much more expensive than in prototypes
5. **Lost Context**: Design decisions made during implementation weren't documented or validated

### Root Cause

The anti-pattern of "build first, design later" emerged from:

- Eagerness to see working features quickly
- Underestimating the value of design prototyping
- Assumption that designs could be refined during implementation
- Lack of process guardrails requiring design validation

---

## Decision

**We will adopt a mandatory design-first development workflow for all new features and significant UI changes.**

### Workflow Steps

1. **Design Prototyping Phase**
   - Create interactive prototypes (HTML/CSS/JS, Figma, or similar)
   - Build multiple variations to explore design space
   - Test prototypes with real content and realistic scenarios
   - Iterate rapidly without touching production code

2. **Design Review & Planning**
   - Document design decisions and rationale
   - Create detailed redesign/implementation plan
   - Identify technical requirements and constraints
   - Get stakeholder/user feedback on prototypes

3. **Implementation Phase**
   - Build feature screen-by-screen following validated design
   - Compare implementation to prototype continuously
   - Ensure UX goals from design phase are met
   - Document any deviations and reasons

4. **Validation Phase**
   - Test implementation against design criteria
   - Gather user feedback on actual implementation
   - Iterate if needed (minor tweaks only)

### When Design Prototyping is Required

**Mandatory for**:

- New screens or major UI components
- Significant UX changes to existing features
- Complex interactions or workflows
- Mobile-first designs that need touch interaction validation

**Optional for**:

- Bug fixes that don't change UX
- Minor text or style tweaks
- Backend-only changes

---

## Consequences

### Positive

✅ **Better UX Outcomes**: Designs are validated before implementation
✅ **Faster Iteration**: Design changes in prototypes are 10-100x faster than in code
✅ **Less Rework**: Build the right thing the first time
✅ **Better Documentation**: Design decisions are captured explicitly
✅ **Improved Communication**: Prototypes enable better feedback from users/stakeholders
✅ **Reduced Risk**: Validate assumptions before committing development time

### Negative

⚠️ **Upfront Time Investment**: Design phase adds time before coding starts
⚠️ **Requires Discipline**: Team must resist urge to "just build it quickly"
⚠️ **Additional Artifacts**: Must maintain prototypes alongside code
⚠️ **Potential Context Switching**: Designers and developers may work at different paces

### Mitigation Strategies

**For Time Investment**:

- Time saved in implementation and rework far exceeds prototyping time
- Use rapid prototyping tools to minimize design phase duration
- Reuse design components and patterns across prototypes

**For Discipline**:

- Make design review a required step in PR/approval process
- Celebrate design improvements and learnings
- Track and communicate time savings from avoided rework

**For Artifact Maintenance**:

- Keep prototypes lightweight (HTML/CSS/JS preferred over heavy design tools)
- Archive prototypes after implementation (don't maintain both)
- Extract design tokens and reusable patterns into code

---

## Examples

### Example 1: RSVP Player Redesign (Current)

**What Happened**: Built RSVP player without prototyping → poor reading experience → needed redesign

**New Approach**:

1. Create multiple RSVP player design prototypes
2. Test different layouts, controls, word display treatments
3. Build redesign plan based on best-performing prototype
4. Implement validated design screen-by-screen

**Expected Outcome**: Much better reading experience without rework

### Example 2: Future Chat Feature

**Old Way** (What NOT to do):

1. Build chat UI component
2. Integrate with LLM API
3. Test with users
4. Discover UI is confusing
5. Redesign and rebuild

**New Way** (Design-First):

1. Prototype chat UI variations (bubble style, input placement, etc.)
2. Test prototypes with realistic conversations
3. Create implementation plan for validated design
4. Build once, correctly

**Time Saved**: Estimated 3-5 days of rework avoided

---

## Implementation

### Immediate Actions

- [x] Document this ADR
- [x] Update LEARNINGS.md with design-first insights
- [x] Create ROADMAP.md prioritizing RSVP player redesign
- [ ] Add design review checklist to PR template
- [ ] Create design prototype template/starter kit
- [ ] Document design prototyping tools and process

### Process Integration

**In Planning Phase**:

- Identify features requiring design prototyping
- Allocate time for design phase in estimates
- Create design acceptance criteria

**In Design Phase**:

- Build prototypes using agreed tools (HTML/CSS/JS preferred)
- Test prototypes with real content
- Document design decisions in implementation plan

**In Code Review**:

- Verify implementation matches approved design
- Check for undocumented design deviations
- Validate UX goals from design phase

---

## References

- [LEARNINGS.md](../LEARNINGS.md) - Section 6: Things That Didn't Work
- [ROADMAP.md](../ROADMAP.md) - Priority 2: RSVP Player UI Redesign
- [DESIGN_REVAMP_PLAN.md](../redesign/DESIGN_REVAMP_PLAN.md) - Comprehensive redesign strategy

---

## Revision History

- **2026-01-22**: Initial version - Established design-first workflow after RSVP player redesign learning
