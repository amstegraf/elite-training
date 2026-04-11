# 🧠 Pool Training App – MVP Specification (Multi-Program, Miss-Only Tracking)

---

## 1) Product Goal

Build a **performance tracking system** for pool training focused on:
- precision (position + alignment)
- consistency (reducing failures per rack)
- progression over 90–180 day programs

Core principle:
> **Track only failures (miss-only input).**

---

## 2) Core Concepts

- **Training Program**: 90–180 day structured plan
- **Training Plan**: specific methodology (position / potting / pressure)
- **Session**: one play/training block
- **Rack**: one 9-ball (or custom) run
- **Miss Event**: the only required input

Unlogged shots = success

---

## 3) Multi-Program Support (Key Requirement)

### User can:
- Create multiple **Training Programs**
- Each program contains multiple **Plans / Modes**
- Switch active program anytime

### Example Programs
- Precision Program (20 → 10 cm)
- Potting Consistency Program
- Pressure / Match Simulation

---

## 4) Training Plans (Configurable)

Each plan defines:
- duration (days/weeks)
- sessions per week
- focus type:
  - position
  - alignment
  - mixed
- target constraints:
  - diameter (e.g. 20 → 15 → 10 cm)
- rules:
  - reset on 3 consecutive misses (on/off)

---

## 5) Session Engine (Miss-Only Flow)

### Start Session
User selects:
- program
- plan
- mode
- table type (8ft / 9ft)

### During Session
- play normally
- **only log when failure occurs**

### Action
- Tap: **Log Miss**

---

## 6) Miss Logging (Core UI)

### Required Fields
- **Ball Number** (auto-increment, editable)

### Miss Type (multi-select)
- [ ] Position (wrong angle / landing)
- [ ] Alignment (aim error)
- [ ] Delivery (stroke issue)
- [ ] Speed control
- [ ] Combined

### Outcome
- [ ] Pot miss
- [ ] Position breakdown (no shot available)
- [ ] Both

### Optional
- Confidence before shot:
  - High / Medium / Low

---

## 7) Special Case Support

- **“No shot due to position”** must be supported explicitly

Reason:
> critical for diagnosing pattern breakdowns

---

## 8) Derived Metrics (Auto Calculated)

### Per Rack
- balls cleared (based on miss ball)
- first miss position

### Per Session
- total racks
- total misses
- avg balls cleared per rack
- best run (max balls)

---

## 9) Key Metrics (Primary KPIs)

### A. Efficiency
- avg balls cleared per rack

### B. Failure Profile
- % Position errors
- % Alignment errors
- % Speed errors
- % Combined

### C. Pressure Indicators
- miss distribution (early vs late balls)
- confidence vs outcome

### D. Consistency
- racks without miss
- longest streak

---

## 10) Training Modes

### A. Rack Mode (default)
- full rack play
- miss-only logging

### B. Position Mode
- focus on position failures only

### C. Potting Mode
- focus on alignment/delivery misses

### D. Pressure Mode
- optional rules (resets, constraints)

---

## 11) Rules Engine

Configurable per session:
- reset after 3 consecutive misses
- warning at 2 consecutive misses
- free ball correction (optional, external to app)

---

## 12) Session Report

After session show:
- total racks
- total misses
- avg balls cleared
- best run
- miss breakdown by type
- “no shot due to position” count
- confidence correlation (optional)

---

## 13) Progress Tracking

- session history
- trends:
  - avg balls cleared over time
  - miss rate
  - type distribution
- program progression status

---

## 14) Minimal UI Design

### Main Screen
- current rack
- current ball
- **Log Miss (primary button)**

### Miss Popup
- ball number
- checkboxes (multi-select)
- confirm

### Summary Screen
- metrics
- trends

---

## 15) Data Model (MVP)

### Program
- id
- name
- durationDays
- active

### Plan
- id
- programId
- name
- focusType
- targetDiameter
- rules

### Session
- id
- planId
- dateTime
- tableType
- totalRacks
- totalMisses

### Rack
- id
- sessionId
- rackNumber
- ballsCleared

### MissEvent
- id
- rackId
- ballNumber
- types[]
- outcome
- confidence

---

## 16) MVP Scope (Build First)

1. multi-program support
2. session start/stop
3. miss logging (multi-select)
4. derived metrics
5. session report
6. history view

---

## 17) Exclusions (For Now)

- AI coaching
- automatic tracking
- complex table visualization
- social features

---

## 18) Core Principle

> Do not optimize for data volume.
> Optimize for **signal quality and usability**.

The app should answer:
- where do I fail?
- why do I fail?
- is it improving over time?