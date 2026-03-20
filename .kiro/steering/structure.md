# Project Structure

```
/
├── requirements.md                          # Top-level MVP functional requirements (early draft)
├── .kiro/
│   ├── specs/
│   │   └── product-launch-package/
│   │       ├── requirements.md              # Full spec requirements (source of truth)
│   │       └── .config.kiro                 # Spec metadata (specType, workflowType)
│   └── steering/
│       ├── product.md                       # Product summary
│       ├── tech.md                          # Tech stack and commands
│       └── structure.md                     # This file
```

## Notes

- `.kiro/specs/product-launch-package/requirements.md` is the authoritative requirements document — prefer it over the top-level `requirements.md`
- The spec follows a **requirements-first** workflow
- No source code exists yet; structure will expand as implementation begins
- When adding source code, update `tech.md` with the actual stack, dependencies, and build commands
