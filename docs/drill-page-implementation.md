Good direction. Keep the schema **minimal but extensible**. Don't over-design physics or AI fields yet.

* * * * *

✅ Drill JSON Schema (v1)
========================

```
{
  "id": "drill_001",
  "name": "3 Ball Line Control",
  "difficulty": 2,
  "category": "position_control",
  "description": "Pot balls in order with controlled cue ball movement",

  "table": {
    "type": "pool_9ft",
    "coordinateSystem": {
      "origin": "bottom_left",
      "width": 1000,
      "height": 500
    }
  },

  "balls": [
    {
      "id": "cue",
      "type": "cue",
      "x": 200,
      "y": 250
    },
    {
      "id": "1",
      "type": "object",
      "number": 1,
      "x": 500,
      "y": 250,
      "targetPocket": "top_right"
    },
    {
      "id": "2",
      "type": "object",
      "number": 2,
      "x": 700,
      "y": 250,
      "targetPocket": "top_right"
    }
  ],

  "rules": {
    "order": ["1", "2"],
    "attemptLimit": 5,
    "successCondition": "all_balls_pocketed"
  },

  "metadata": {
    "createdBy": "admin",
    "isPublic": true,
    "version": 1
  }
}

```

* * * * *

🎯 Key Design Decisions
=======================

1\. Coordinate System
---------------------

-   Use **normalized grid (0--1000 / 0--500)**

-   Device-independent

-   Easy scaling to UI

* * * * *

2\. Ball Model
--------------

Minimal but sufficient:

-   `id`

-   `type` (cue / object)

-   `x`, `y`

-   optional `targetPocket`

👉 Don't add spin/velocity/etc. yet

* * * * *

3\. Pocket Definition (standardized)
------------------------------------

Do NOT define per drill. Use enum:

```
"pockets": [
  "top_left",
  "top_middle",
  "top_right",
  "bottom_left",
  "bottom_middle",
  "bottom_right"
]

```

* * * * *

4\. Rules Block
---------------

Keep it simple:

-   `order` → required sequence

-   `attemptLimit`

-   `successCondition`

Future extensible:

-   target zones

-   position constraints

* * * * *

🧩 Optional (v1.1 later)
========================

Only add when needed:

```
"targetZones": [
  {
    "id": "zone_1",
    "x": 600,
    "y": 250,
    "radius": 50,
    "appliesAfterBall": "1"
  }
]

```

* * * * *

🛠 Admin Requirements
=====================

Create Drill
------------

-   Place balls on table (drag & drop)

-   Assign:

    -   ball number

    -   target pocket (optional)

-   Set:

    -   order

    -   attempts

* * * * *

Validate Drill
--------------

-   Must have:

    -   1 cue ball

    -   ≥1 object ball

-   Order must match existing balls

* * * * *

Store
-----

-   JSON in DB or file

-   Versioned (`version` field)

* * * * *

📦 API Shape
============

GET drills
----------

```
[
  { "id": "drill_001", "name": "...", "difficulty": 2 }
]

```

GET drill by id
---------------

→ full JSON

* * * * *

⚠️ What to avoid now
====================

-   Physics simulation fields

-   AI hints in schema

-   Shot paths

-   Too many rule types

👉 Keep drills = **static layout + simple rules**

* * * * *

🔑 Summary
==========

Minimum viable:

-   Table (normalized coords)

-   Balls (positions + optional pocket)

-   Order

-   Attempt limit

That's enough to:\
✔ render\
✔ play\
✔ validate\
✔ scale later

* * * * *

If you want next:\
👉 I can design the **admin UI (drag/drop table editor + JSON generator)** which is the critical piece.