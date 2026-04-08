# DART Platform v3.5 — Custom Module Development Guide for Claude Code

## Document purpose

This document is a **working master guide for Claude Code** to help design and implement a new custom module for **DART Platform v3.5**.

It has 4 purposes:

1. **Technical frame**: capture the real constraints of the Dr.Dart ecosystem.
2. **Decision guide**: help choose the correct module type and category.
3. **Implementation guide**: define file structure, screens, services, DRL usage, and logic boundaries.
4. **Master prompt reference**: define exactly how Claude Code should work on this project.

---

## 1. Official context to keep in mind

### 1.1 Official stack and architecture

- A **User Module** is an app-like module running inside Dart-Platform, typically built with **React 17.0.1 / TypeScript**.
- A **Framework Module** is meant to run and interface `*.so` libraries on **Ubuntu 20.04**, typically in **C++**.
- A **Dart Module** combines both: **User Module + Framework Module**.
- Dart-Platform uses **MUI v5** for module-side UI.

### 1.2 Official tools to prioritize

- The official project creation and modification workflow goes through **VS Code + Dr.Dart-IDE VS Code Extension**.
- Doosan explicitly states that it **does not officially guarantee support for external IDEs**.
- Claude Code can still be used as a coding copilot, but **project creation, build, UI preview, packaging, and installation must remain aligned with the official Dr.Dart workflow**.

### 1.3 Important note about v3.5 / SDK5 / API v5

- The **Download Center** clearly lists **Dart-Platform v3.5.0**.
- The same Download Center also lists **sdk5**, while the public Dart-API web documentation may still be marked **“V5 UPCOMING”**.
- Therefore, for **exact API signatures in SDK5**, the source of truth must be:
  1. the local project folder `libs/dart-api`,
  2. especially files such as `dart-api.ts`,
  3. and only secondarily `https://apis.drdart.io/v5/` when the web docs are fully available and consistent.

### 1.4 Official baseline workflow

- Create the project with the Dr.Dart-IDE extension.
- Use **UI Preview** to validate rendering.
- Build through the extension.
- Install the module either:
  - from a `.dm` package,
  - or directly via IDE connection.
- Some full operations in Dart-Platform require **Supervisor / Manual Level** permissions.

---

## 2. Design decision — which module should be built?

Before writing code, Claude Code must help choose the **correct combination: technical type + functional category**.

### 2.1 The 3 technical module types

| Technical type | When to choose it | Main language | Notes |
|---|---|---:|---|
| User Module | UI, application logic, Dart API integration, DRL, Task Editor integration | TypeScript / React | Default choice for most use cases |
| Framework Module | Native logic, performance-sensitive processing, dedicated process, C/C++ library integration | C++ | Heavier to develop and maintain |
| Dart Module | UI + native/backend logic are both required | TS + C++ | Use only when clearly justified |

### 2.2 Functional categories to choose from

| Category | Typical use | Visible on Home | Good choice when… |
|---|---|---:|---|
| `Process` | Sequencing tasks inside one business app | Yes | you want a standalone application workflow |
| `Task Editor` | Custom task editing experience | Yes | you are building around Task Editor behavior |
| `Device Setting` | Device parameterization, often with user commands | Yes | you are integrating a gripper, camera, sensor, etc. |
| `User Command` | Add blocks/commands inside Task Editor | No | you mainly want reusable commands in Task Editor |
| `Jog` | Manual control / jogging features | Yes | you want manual motion or direct interaction |
| `Dashboard` | Monitoring / supervision | Yes | you want KPIs, states, diagnostics, alarms |

### 2.3 Recommended decision logic

Claude Code should use the following logic.

#### Case A — standalone application with its own main screen
Choose first:
- **Type**: `User Module`
- **Category**: `Process`, `Dashboard`, `Device Setting`, or `Jog`

#### Case B — adding commands inside Task Editor
Choose first:
- **Type**: `User Module`
- **Category**: `User Command`
- **Interface**: **`USER_COMMAND_V2`**

#### Case C — native/performance-specific or binary integration required
Choose:
- **Type**: `Dart Module` if both UI and native logic are required
- or **Framework Module** only if no UI is needed

### 2.4 Default design principle

Unless there is a clear reason not to, **start with a TypeScript/React User Module**.

Move to Framework Module or Dart Module only if one of these is truly required:

- a native dependency not realistically portable to TypeScript,
- mandatory C++ / `.so` integration,
- heavy computation or isolated process constraints,
- platform-specific native interfacing not covered by User Module capabilities.

---

## 3. Working rules for Claude Code

Claude Code must follow the rules below.

### 3.1 Non-negotiable rules

1. **Never invent a Dart API**.
2. **Always verify types and signatures in the local project `libs/dart-api` folder**.
3. **Never break the structure expected by Dart-IDE**.
4. **Never modify the `.dart-ide` folder manually**.
5. **Import Dart API using `from 'dart-api'`, never via a relative path**.
6. **Respect all screen/service/component `id` values declared in manifests**.
7. **Keep `manifest.json`, screens, services, and React components consistent**.
8. **Generate simple, readable, testable code first, then refine**.
9. **Do not assume an SDK4 example is fully SDK5-compatible without local verification**.
10. **Preserve Dart-IDE build compatibility at all times**.

### 3.2 Expected delivery style from Claude Code

Claude Code should work incrementally and explicitly:

- step 1: analyze the requested feature,
- step 2: propose the correct module category/type,
- step 3: propose the folder structure,
- step 4: create/update manifests,
- step 5: create the UI skeleton,
- step 6: connect services,
- step 7: integrate DRL / DB / i18n if needed,
- step 8: validate imports, ids, build integrity, and test points.

### 3.3 Response format expected from Claude Code

When I ask Claude Code to implement something, it should ideally answer in this format:

```text
1. What I am going to modify
2. Why
3. Impacted files
4. Proposed code
5. Checks to perform in Dart-IDE / Dart-Platform
6. Risks or current limits
```

---

## 4. Environment preparation

### 4.1 Prerequisites

- VS Code
- **Doosan Dart-IDE** extension
- Dart-Platform v3.5.0
- Dart-Services if working without a real controller
- Robot/controller if testing on real hardware
- Docker Desktop if using Dart-Services

### 4.2 Useful network points

- Controller IP often used in documentation: `192.168.137.100`
- Dart-Services IP: `127.0.0.1`
- Recommended direct PC range: `192.168.137.xx`

### 4.3 Rule regarding SDK version

For a project targeting **DART Platform v3.5**, Claude Code must assume the following:

- **target SDK5**,
- **but confirm locally** in the project generated by the extension,
- then verify that the root `manifest.json` `sdkVersion` matches what the tool actually generated.

---

## 5. Recommended minimum project structure

### 5.1 Global structure

Claude Code should aim for a structure similar to this:

```text
my-module/
├── .dart-ide/
├── manifest.json                # project root manifest
├── my.package.name/
│   ├── manifest.json            # module manifest
│   ├── package.json
│   ├── libs/
│   │   └── dart-api/
│   ├── src/
│   │   ├── assets/
│   │   │   ├── images/
│   │   │   ├── raws/
│   │   │   └── styles/
│   │   ├── components/
│   │   ├── services/
│   │   ├── screens/
│   │   ├── usercommand/         # if Task Editor / User Command oriented
│   │   ├── db/
│   │   ├── i18n/
│   │   ├── index.tsx
│   │   ├── App.tsx
│   │   ├── index.scss
│   │   └── *.drl
│   └── webpack.config.js        # depending on generated template
└── output/
```

### 5.2 What the official User Command sample shows

The official sample `user-module-sample-user-command` shows a structure close to:

```text
com.sample.usercommand/
├── src/
│   ├── assets/
│   ├── uc/
│   │   └── task.pose.control/
│   ├── UserCommand/
│   │   ├── UserCommandScreen1.tsx
│   │   ├── UserCommandScreen2.tsx
│   │   ├── UserCommandScreen3.tsx
│   │   ├── UserCommandService.ts
│   │   ├── UserCommandDRL.drl
│   │   ├── ChannelConstants.ts
│   │   ├── SetGlobalValue.tsx
│   │   └── UserCommandScreen.scss
```

Conclusion: if the target is a **Task Editor / User Command** module, Claude Code should mirror this separation:

- `Screen` files for configuration UI,
- `Service` files for DRL generation, orchestration, and Task Editor linking,
- dedicated `DRL` files,
- centralized constants such as `ChannelConstants`.

---

## 6. The two manifests that must be mastered

### 6.1 Root project manifest

Example observed in the official sample:

```json
{
  "name": "sample-user-command",
  "packageName": "com.sample.usercommand",
  "version": "4.0.0",
  "sdkVersion": "4",
  "icon": "assets/images/icon.png",
  "drscModulePackageFile": "drsc_com.sample.usercommand.dm",
  "drcfModulePackageFile": ""
}
```

### 6.2 Root manifest rules

Claude Code must:

- update `sdkVersion` to the locally confirmed value,
- keep `packageName` stable,
- keep package file names aligned with the generated output,
- never guess final names without checking the generated project.

### 6.3 Module manifest

The module-level `manifest.json` is the most critical file.

It defines things such as:

- module id,
- module type,
- category,
- screens,
- services,
- entry points,
- icons/assets,
- user command metadata when applicable.

### 6.4 Manifest editing rules

Claude Code must follow these rules:

1. Edit manifest fields conservatively.
2. Reuse official sample structure whenever possible.
3. Keep identifiers stable once a module is referenced elsewhere.
4. If a field meaning is uncertain, inspect the generated template or official sample before changing it.
5. For `USER_COMMAND_V2`, use the official sample as the base reference.

---

## 7. Strong recommendation for a first implementation strategy

For a first custom module on Dart-Platform v3.5, Claude Code should prefer this order:

### Option 1 — safest path
- Start from an official sample close to the target use case.
- Rename minimally.
- Replace only the business-specific logic.

### Option 2 — controlled clean build
- Create a fresh project with Dr.Dart-IDE.
- Keep the generated structure.
- Add only the screens, services, and assets actually needed.

### Avoid initially
- mixing too many concepts in one first version,
- building a Dart Module if a User Module is enough,
- inventing abstractions before the first working version exists,
- copying older SDK4 code blindly into SDK5.

---

## 8. Specific guidance if the goal is a User Command module

If the target is to add a custom command into the Task Editor, Claude Code must assume this is the most likely path:

- **Technical type**: `User Module`
- **Functional category**: `User Command`
- **Reference interface**: `USER_COMMAND_V2`

### 8.1 Expected building blocks

Claude Code should look for and connect these blocks:

- command metadata / registration,
- one or several parameter screens,
- a service layer responsible for data transformation,
- DRL generation or DRL template usage,
- state sharing/constants,
- validation for user-entered parameters.

### 8.2 What Claude Code must check before generating code

Before writing or editing code, Claude Code must inspect locally:

- exact manifest keys for `USER_COMMAND_V2`,
- exact expected screen/service declarations,
- how DRL is linked from the service layer,
- whether SDK5 changed callback names, props, typing, or registration structure.

### 8.3 First safe implementation target

For a first iteration, Claude Code should aim for:

- one command,
- one settings screen,
- one service,
- one DRL template,
- clear validation,
- no advanced abstractions unless already needed.

---

## 9. Coding guidelines

### 9.1 General principles

- Prefer explicit code over clever code.
- Prefer small services and small components.
- Keep business logic out of UI whenever possible.
- Centralize constants, ids, channel names, and enum-like values.
- Validate all user inputs before DRL generation or execution.
- Keep types strict.

### 9.2 React guidelines

- Use functional components.
- Keep screens focused on presentation and user interaction.
- Move transformation logic into service/helper files.
- Keep state predictable and local unless sharing is necessary.
- Use MUI v5 consistently.

### 9.3 TypeScript guidelines

- Avoid `any` unless unavoidable.
- Define explicit interfaces for command parameters.
- Type all service inputs/outputs.
- Use discriminated unions or enums when categories/states are fixed.

### 9.4 DRL guidelines

- Keep DRL templates readable.
- Separate parameter preparation from DRL string/template generation.
- Document assumptions such as units, reference frames, speed/acceleration, and safety expectations.
- Never hardcode robot-sensitive values without making them visible and reviewable.

---

## 10. Validation and test checklist

Before considering the module acceptable, Claude Code must ensure the following has been checked.

### 10.1 Structural checks

- Project builds successfully in Dr.Dart-IDE.
- No broken imports.
- No inconsistent ids between manifest and code.
- No direct edits that break generated structure.

### 10.2 UI checks

- Module icon loads correctly.
- Screen navigation works.
- MUI layout is stable.
- Validation messages are clear.
- Empty/default states are handled.

### 10.3 Functional checks

- Parameters are captured correctly.
- Service logic transforms parameters correctly.
- Generated DRL matches the intended command behavior.
- Task Editor integration behaves as expected.
- Data persistence/global shared values work if used.

### 10.4 Platform checks

- Module installs correctly on Dart-Platform.
- Module appears in the expected category/location.
- Required permissions/level restrictions are understood.
- Behavior is tested in UI Preview first, then on target runtime.

---

## 11. Common pitfalls to avoid

Claude Code must actively avoid the following mistakes:

1. Treating public docs as more authoritative than the generated local SDK types.
2. Renaming ids without updating manifest references.
3. Mixing screen responsibilities and service responsibilities.
4. Hardcoding assumptions about SDK4 into SDK5.
5. Creating too many generic abstractions too early.
6. Breaking the official project structure.
7. Using relative imports to Dart API.
8. Building a native module when a User Module is enough.

---

## 12. Master instruction block for Claude Code

Use the following as the default instruction block when asking Claude Code to work on the module.

```text
You are helping me build a custom module for DART Platform v3.5.

Your rules are:
- Never invent Dr.Dart APIs.
- Always verify signatures and typings from the local generated project, especially libs/dart-api.
- Keep the structure compatible with Dr.Dart-IDE.
- Do not manually modify .dart-ide.
- Prefer the smallest working implementation first.
- Reuse official samples whenever appropriate.
- If the target is Task Editor integration, use the official USER_COMMAND_V2 sample structure as the baseline.
- Separate UI, service logic, constants, and DRL generation cleanly.
- When you propose code, also explain the impacted files, required checks, and remaining uncertainties.

Your expected workflow is:
1. Analyze the requested feature.
2. Confirm the most appropriate module type and category.
3. List the files to create or modify.
4. Propose the implementation.
5. Highlight what must be verified locally in the generated SDK project.
6. Keep the first version simple and build-safe.
```

---

## 13. Practical prompt templates for Claude Code

### 13.1 Prompt to start a new module

```text
Help me create a new custom module for DART Platform v3.5.
Goal: [describe the module goal].
Constraints: [list constraints].

Start by:
1. recommending the best module technical type,
2. recommending the best functional category,
3. listing the expected project structure,
4. identifying which official sample is the best starting point,
5. telling me what must be verified first in the locally generated SDK project.
```

### 13.2 Prompt to implement a first working version

```text
Implement a first minimal working version of this module.
Rules:
- keep it simple,
- keep it compatible with Dr.Dart-IDE,
- verify all Dart API usage against the local libs/dart-api typings,
- do not invent manifest fields,
- explain all impacted files.
```

### 13.3 Prompt for a User Command module

```text
I want to build a custom User Command module for DART Platform v3.5.
Please work from the official USER_COMMAND_V2 sample structure.

First:
1. identify the required manifest fields,
2. identify the required screen/service/DRL structure,
3. propose a minimal one-command implementation,
4. list what must be checked locally for SDK5 compatibility.
```

---

## 14. What must be filled in for the actual project

The following project-specific items must be defined before final implementation:

### Functional definition
- Module name:
- Package name:
- Main purpose:
- Target users:
- Real robot vs simulation:
- Category chosen:
- Technical type chosen:

### UX definition
- Main screens:
- Parameters to expose:
- Validation rules:
- Default values:
- Error messages:

### Technical definition
- SDK version actually generated locally:
- Required Dart APIs:
- Required DRL templates:
- Need for DB storage:
- Need for i18n:
- Need for assets/icons:
- Need for controller connectivity:

### Deployment definition
- Target Dart-Platform version:
- Local preview strategy:
- Packaging strategy:
- Installation strategy:
- Acceptance test checklist:

---

## 15. Final recommendation

For a first DART Platform v3.5 custom module, the best practical strategy is usually:

1. create the project with **Dr.Dart-IDE**,
2. confirm the actual SDK version locally,
3. inspect the generated `libs/dart-api` folder,
4. start from the closest official sample,
5. build a **small working User Module first**,
6. only then extend the module with more advanced logic.

When in doubt, Claude Code must favor:
- local SDK truth over assumptions,
- smaller scope over broader scope,
- compatibility over elegance,
- working structure over premature abstraction.
