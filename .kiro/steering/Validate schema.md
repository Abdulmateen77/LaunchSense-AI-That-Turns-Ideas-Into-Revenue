# Hook: Run schema import test on schemas.py save

## Trigger
File save: `models/schemas.py`

## What this hook does
When schemas.py is saved, immediately runs:
```bash
python -c "
from models.schemas import (
    EnrichedContext, Evidence, Competitor, RedditQuote,
    MarketSignal, Offer, LandingPage, GrowthPack,
    EvalResult, GenerateRequest, ModelChoices
)
print('All schemas import OK')
"
```

If any import fails, the error is shown inline.
This catches typos and missing fields immediately.

## Why
Schema changes break every agent simultaneously.
Catching import errors on save saves debugging time.

## Additional check on save
Also verify each model has at least one field constraint:
- List fields should have max_length
- String fields for user input should have min_length
- No field should be typed as `Any`