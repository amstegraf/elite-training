# pool-elite-prototype design extraction

Reference source: `pool-elite-prototype`.

## Reused patterns
- Card-first layouts with dense vertical information blocks.
- KPI emphasis through large percentage typography and secondary metadata line.
- Tier/points hero with compact progress rail.
- Session logging flow: timer -> ball select -> miss type -> outcome -> primary action.
- Bottom-tab navigation as primary orientation model.

## Applied adaptation for native implementation
- Converted web gradient/utility classes to explicit React Native theme tokens.
- Kept contrast and spacing style while simplifying for mobile runtime performance.
- Maintained bold data-first hierarchy (large values, muted supporting text).
