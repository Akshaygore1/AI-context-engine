# Issue tracker: GitHub

Issues and specifications live in `Akshaygore1/AI-context-engine` on GitHub. Use the `gh` CLI with an explicit repository argument.

- Publish a spec with `gh issue create`, passing multiline content using `--body-file`.
- Read tickets with `gh issue view <number> --comments` and inspect their labels.
- List tickets with `gh issue list` and filter by the relevant triage label.
- Apply labels with `gh issue edit <number> --add-label <label>`.
- Publishing a specification means creating a GitHub issue, not only a local document.

PRs as a request surface: no.

The repository remote and existing GitHub Issues support determined this default during spec synthesis.
