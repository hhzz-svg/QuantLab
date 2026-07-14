## 2026-07-15 - Task: Add QuantLab introduction poster to README

### What was done
- Added the generated QuantLab introduction poster to the repository's static assets.
- Added a poster section and relative Markdown image reference to the README introduction.

### Testing
- Confirmed `README.md` references `assets/quantlab-poster.png`.
- Confirmed the poster file exists and is a valid PNG at `1440 × 2560`.
- Confirmed `git diff --check` passes.

### Notes
- `README.md`: added the project introduction poster section.
- `assets/quantlab-poster.png`: added the generated poster asset.
- `progress.md`: recorded this task and verification evidence.
- Rollback: from the repository root, run `git clean -fd -- assets progress.md` and `git restore -- README.md`.
