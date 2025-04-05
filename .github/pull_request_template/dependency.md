---
name: Dependency Update
about: Submit a PR that updates project dependencies
title: '[DEPS]'
labels: 'dependencies'
assignees: ''
---

## Dependencies Updated
<!-- List the dependencies that were updated -->
I.E.:

| Package | From Version | To Version | Type | Breaking Changes? |
|---------|--------------|------------|------|-------------------|
| pkg1    | 1.0.0        | 1.1.0      | prod | No                |
| pkg2    | 0.5.0        | 0.6.0      | dev  | Yes               |

## Reason for Update
<!-- Why are these dependencies being updated? -->

## Breaking Changes and Mitigations
<!-- If there are breaking changes, how were they addressed? -->

## TypeScript Version Impact
<!-- If TypeScript was updated, what new features/fixes are relevant? -->

## Checklist:
- [ ] All tests pass with updated dependencies
- [ ] Package-lock.json or yarn.lock has been updated
- [ ] Breaking changes have been addressed in the code
- [ ] Type definitions remain compatible
- [ ] Documentation has been updated if necessary