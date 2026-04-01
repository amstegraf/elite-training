# Pool No Error Training App — Business and Functional Plan

## 1. Purpose

The application is a web-based training tracker built around the **No Error System for Pool**.

Its purpose is to help a serious player measure and improve:

* perfect execution
* streak consistency
* breakdown points in training
* session quality over time
* conversion from good play into error-free racks

The app is not meant to be a generic practice log. It is designed specifically for **precision training**, where a rack is only considered valid if it is clean and uncompromised.

---

## 2. Core Concept

The app revolves around the idea that training quality is not measured by how long the user played or how many balls were pocketed, but by how many **perfect sequences** were completed without compromise.

The application should reinforce these principles:

* a perfect rack matters more than an average successful rack
* streaks matter more than isolated success
* small imperfections count as failures, not acceptable recovery points
* the user should be able to see where training collapses, not only where it succeeds

This makes the app a **discipline and performance accountability tool**, not just a scorekeeper.

---

## 3. Primary Users

### 3.1 Competitive Player

A player who wants to train with strict standards and track true no-error performance.

### 3.2 Advanced Amateur / Semi-Pro

A player who is already strong technically but needs better consistency, conversion, and mental discipline.

### 3.3 Coach or Self-Coached Athlete

A user who wants structured session logs, repeatable drill blocks, and trend reporting.

---

## 4. Main Business Goals

### 4.1 Standardize Training Quality

Create one consistent way to define and track perfect practice.

### 4.2 Increase Conversion

Help the user move from “almost good enough” to repeatable no-error execution.

### 4.3 Improve Awareness

Expose where errors happen most often:

* in certain blocks
* after a number of successful racks
* at certain session durations
* under streak pressure

### 4.4 Build Long-Term Performance History

Allow the player to review training sessions over time and detect whether actual precision is improving.

### 4.5 Support Honest Self-Evaluation

The application should make it difficult to hide behind vague progress. It should reward strict logging and clear outcomes.

---

## 5. Core Training Model

The application tracks training as **sessions** made up of **blocks**.

Each session should have a unique identity and represent one training event.

Each block represents a structured practice segment, for example:

* Pure Run-Out
* Positional Precision Drill
* Break & Run Simulation
* Pressure Finishing

Within each block, the user records outcomes according to No Error rules.

---

## 6. Core Metrics

The app should track at minimum the following:

### 6.1 PR — Perfect Racks

A count of racks completed with no errors according to the user’s defined standard.

### 6.2 CPR — Consecutive Perfect Racks

The highest and current streak of perfect racks achieved without interruption.

### 6.3 FR — Failed Racks

A count of racks that ended because of an error, reset, or broken no-error rule.

### 6.4 Block Count

Number of blocks completed within a session.

### 6.5 Training Time

Total training duration, plus time per block.

### 6.6 Session Count

Total number of sessions completed.

### 6.7 Session Quality Indicators

Derived indicators such as:

* PR rate
* FR rate
* longest streak in session
* average perfect racks per session
* average failed racks before first PR
* best block performance
* weakest block performance

---

## 7. Session Structure

Each session should include:

### 7.1 Session UUID

A unique identifier for each training session.

### 7.2 Session Metadata

Fields such as:

* date
* start time
* end time
* total duration
* optional notes
* optional table / venue / equipment notes
* optional focus for the day

### 7.3 Session Status

A session can be:

* created
* active
* paused
* completed
* abandoned

### 7.4 Session Summary

At the end of a session, the user should see a summary of:

* total PR
* total CPR best streak
* total FR
* total time
* blocks completed
* notes on where failure happened most

---

## 8. Training Blocks

The application should support blocks as first-class entities.

Each block should have:

* a name
* a training purpose
* a timer
* an outcome log
* target rules
* summary metrics

### 8.1 Example Blocks

#### Pure Run-Out

Goal: achieve a number of perfect racks in a row.

#### Positional Precision Drill

Goal: complete sequences where cue ball lands in defined target zones.

#### Break & Run Simulation

Goal: simulate real rack execution and log only clean break-and-run outcomes.

#### Pressure Finishing

Goal: complete end-rack patterns perfectly for a target number of repetitions.

### 8.2 Block-Level Metrics

For each block, the app should track:

* duration
* PR
* CPR
* FR
* attempts
* completion rate
* best streak
* notes

### 8.3 Custom Block Support

The user should be able to define custom blocks for personalized training while still using the same core metric system.

---

## 9. Behaviour Rules in the App

The app should reflect the strict training philosophy.

### 9.1 Perfect Means Perfect

The user should log a rack as perfect only if no error occurred.

### 9.2 Failure Ends the Attempt

A failed rack should be logged immediately as FR.

### 9.3 Streak Logic Must Be Visible

Whenever the user logs a PR or FR, the app should clearly show:

* current streak
* best streak in block
* best streak in session

### 9.4 Block Targets Should Be Explicit

Each block should show its target, for example:

* 3 perfect racks in a row
* 10 perfect finishes in a row
* 10 zone hits in sequence

### 9.5 Training Should Feel Like Accountability

The interface should reinforce seriousness and clarity rather than casual note-taking.

---

## 10. Functional Features

### 10.1 Create Session

The user can start a new training session.

Expected behavior:

* generate session UUID
* record start time
* allow selection of a training focus
* allow selecting planned blocks before starting or adding them during session

### 10.2 Manage Session State

The user can:

* start
* pause
* resume
* end
* abandon

a session.

Expected behavior:

* training time should reflect active time only
* pauses should not count toward active block duration unless intentionally configured

### 10.3 Add and Run Blocks

The user can add one or more blocks to a session.

Expected behavior:

* block starts independently within session timeline
* block has its own timer and counters
* block outcome updates should immediately affect block summary and session summary

### 10.4 Log Outcomes Quickly

The application should support very fast manual logging for:

* PR
* FR
* block completion
* notes

Expected behavior:

* low-friction input
* minimal clicks
* usable between racks
* clear current state after every action

### 10.5 Streak Tracking

The app should automatically calculate:

* current CPR
* best CPR in block
* best CPR in session
* historical best CPR

### 10.6 Session Notes

The user should be able to log observations such as:

* common error pattern
* emotional state
* cue ball control issue
* fatigue point
* pressure collapse point

### 10.7 Block Notes

Each block should support optional short notes, such as:

* missed after second PR
* out of line on ball 5 repeatedly
* fatigue after 20 minutes

### 10.8 Session Review

When the session ends, the app should generate a review page.

This should summarize:

* block results
* total results
* longest streak
* failed rack volume
* where most failures happened
* whether the session improved or declined over time

---

## 11. Reporting and Analytics

The application should provide session-based and historical reporting.

### 11.1 Session Reports

A session report should include:

* session UUID
* date and duration
* block list
* PR total
* FR total
* best CPR
* block-by-block performance
* notes

### 11.2 Historical Trends

The user should be able to review performance over time.

Examples:

* PR by week
* FR by week
* average CPR by week
* best CPR trend
* total training hours by week or month
* performance by block type

### 11.3 Breakdown Analysis

The app should help answer questions like:

* In which block do I fail most?
* How many failed racks happen before my first perfect rack?
* Does my quality drop after a certain amount of time?
* Do I get stronger or weaker later in sessions?

### 11.4 Consistency Reports

The app should show whether performance is:

* stable
* improving
* volatile
* streak-dependent

### 11.5 Personal Best Tracking

The system should track personal bests such as:

* best CPR ever
* most PR in one session
* longest training session
* best block completion rate
* most consecutive successful sessions with at least one PR

---

## 12. Suggested Functional Screens

### 12.1 Dashboard

A summary view showing:

* latest sessions
* current trends
* total PR / FR / CPR
* training hours
* best streaks
* quick start session

### 12.2 Session Creation Screen

A page to create and configure a session.

### 12.3 Active Session Screen

A live session tracking page showing:

* session timer
* current block
* block timer
* current PR / FR
* current CPR
* best CPR
* fast action buttons

### 12.4 Block Detail Screen

A focused view for one block with:

* rules
* target
* current stats
* notes
* result history

### 12.5 Session Summary Screen

A final overview after session completion.

### 12.6 Reports Screen

Historical reports and trend analysis.

### 12.7 Personal Bests Screen

A dedicated view of all best values.

---

## 13. Functional Rules and Calculations

### 13.1 PR Calculation

PR increases only when the user marks an attempt as perfect.

### 13.2 FR Calculation

FR increases whenever the user marks an attempt as failed.

### 13.3 CPR Calculation

CPR increases with each consecutive PR and resets when an FR is logged.

### 13.4 Best CPR

Best CPR stores the highest streak reached in a block, session, and lifetime total.

### 13.5 Time Tracking

Training time should distinguish between:

* total session time
* active training time
* block time
* paused time

### 13.6 Completion Rules

A block can be marked completed when:

* the target is reached
* the user manually ends the block
* the session ends

---

## 14. User Experience Principles

The application should feel:

* strict
* clear
* fast
* serious
* motivating through measurable discipline

It should avoid feeling like:

* a casual note app
* a generic sports tracker
* an overcomplicated data system

### UX priorities:

* quick logging
* visibility of streak pressure
* low friction between attempts
* clear summaries
* strong visual emphasis on perfection vs failure

---

## 15. Future Functional Extensions

These are optional future directions for the product:

### 15.1 Error Categories

Allow FR to be broken down into categories such as:

* miss
* bad angle
* recovery required
* wrong speed
* positional error
* mental lapse

### 15.2 Match-Day Mode

A mode that adapts no-error philosophy for real match tracking rather than training resets.

### 15.3 Drill Library

A reusable library of block templates and preset training plans.

### 15.4 Goal Programs

Examples:

* reach 3 CPR average in Pure Run-Out
* reduce FR by 20% in 30 days
* hit 10 hours of pressure finishing this month

### 15.5 Coach Review Mode

Ability to review sessions externally with comments or evaluation.

### 15.6 Comparative Session Analysis

Compare one session against another to see whether precision improved under similar conditions.

---

## 16. Success Criteria for the App

The application is successful if it helps the user:

* train with stricter honesty
* measure no-error consistency clearly
* identify real breakdown points
* increase perfect rack production over time
* improve consecutive perfect rack ability
* reduce failed racks and precision collapse

The true value of the app is not just tracking numbers. It is to create a system where the player can no longer hide from the difference between:

* decent practice
* and perfect practice.

---

## 17. Summary

This application should serve as a dedicated web-based performance tracker for the No Error System in pool.

It should organize training into sessions and blocks, assign each session a UUID, track PR / CPR / FR / time / block progress, and provide clean reporting over time.

Most importantly, it should reflect the philosophy that progress in high-level pool is not about surviving mistakes, but about reducing the existence of mistakes altogether.
