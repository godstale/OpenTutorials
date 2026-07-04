---
name: auto-goal
description: 'Generates an optimized prompt for the /goal command and helps the user execute it efficiently. Triggers on: /auto-goal or natural language requests to use the skill.'
---

# Auto Goal Skill

This skill assists in generating a structured, efficient prompt for the `/goal` slash command. Because the `/goal` command initiates a long-running, autonomous process, it requires a highly structured prompt to prevent hallucination, infinite loops, and scope creep.

## 🎯 Triggers

This skill can be activated in two ways:
1. **Slash Command:** The user types `/auto-goal [Your task or objective]`
2. **Natural Language:** The user explicitly asks to "use the auto-goal skill", "prepare a goal prompt", or similar requests.

## ⚙️ Execution Steps

When triggered (either via `/auto-goal` or natural language), you must:

1. **Analyze the User's Request**: Understand the user's core objective. If it's too vague, formulate the best possible structure based on context.
2. **Generate the Goal Prompt**: Create a highly structured `/goal` prompt using the exact template provided below.
3. **Present and Execute**: Output the generated prompt clearly. To allow direct execution, format your response to provide the exact `/goal [generated prompt]` command string inside a copyable code block or raw text so the user can easily execute it.


## 📝 Goal Prompt Template

When generating the prompt, use the exact structure below. Fill in the bracketed placeholders with specific, well-thought-out details relevant to the task.

```text
Please achieve the following goal. Follow the strict guidelines below to ensure safe and efficient execution.

### 🎯 Objective
[Provide a clear, specific, and actionable description of the primary task.]

### ✅ Termination Conditions (Definition of Done)
Stop execution immediately and report success ONLY when ALL of the following conditions are met:
- [Condition 1: e.g., The specific bug is resolved and confirmed via test]
- [Condition 2: e.g., The application successfully builds and starts without errors]

### 🚫 Boundary Conditions (Strict Constraints)
Under no circumstances should you do the following:
- [Constraint 1: e.g., Do not modify files outside of the target directory]
- [Constraint 2: e.g., Do not attempt to refactor unrelated code]
- [Constraint 3: e.g., Do not get stuck in a loop trying the same fix more than twice]

### 🔄 Failure & Learning Protocol
If an approach fails, a script errors, or progress is blocked:
1. **Log Failure**: Immediately document the failure reason, the exact attempted approach, and the error output in an artifact named `goal_learning_log.md`.
2. **Review**: Before attempting a new fix, strictly review `goal_learning_log.md` to ensure you do not repeat the same failed approach.
3. **Adapt**: Formulate a fundamentally different plan based on the learnings and continue execution.
```
