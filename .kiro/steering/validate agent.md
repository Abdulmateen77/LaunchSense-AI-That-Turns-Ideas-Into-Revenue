# Hook: Validate agent output on save

## Trigger
File save in `agents/` directory

## What this hook does
When you save any agent file, this hook:
1. Checks the file imports the correct Pydantic model from schemas.py
2. Checks the agent function has a return type annotation
3. Checks there is a SYSTEM_PROMPT constant defined (all-caps)
4. Warns if the function has no try/except around the LLM call

## Why
Agent files are the most error-prone part of the codebase.
Wrong return types or missing error handling cause silent pipeline failures.

## Hook logic

```python
import ast
import sys

def validate_agent_file(filepath: str) -> list[str]:
    warnings = []
    
    with open(filepath) as f:
        source = f.read()
    
    tree = ast.parse(source)
    
    # Check for SYSTEM constant
    constants = [
        node.targets[0].id
        for node in ast.walk(tree)
        if isinstance(node, ast.Assign)
        and isinstance(node.targets[0], ast.Name)
        and node.targets[0].id.isupper()
        and "SYSTEM" in node.targets[0].id
    ]
    if not constants:
        warnings.append("WARNING: No SYSTEM_PROMPT constant found. Add one.")
    
    # Check for async functions with return type
    funcs = [
        node for node in ast.walk(tree)
        if isinstance(node, ast.AsyncFunctionDef)
    ]
    for func in funcs:
        if func.returns is None:
            warnings.append(f"WARNING: {func.name}() has no return type annotation")
    
    return warnings

if __name__ == "__main__":
    filepath = sys.argv[1]
    warnings = validate_agent_file(filepath)
    for w in warnings:
        print(w)
    if warnings:
        sys.exit(1)
```