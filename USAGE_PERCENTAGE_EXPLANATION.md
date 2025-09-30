# Usage Percentage - What It Actually Means

## The "Low Percentage" Confusion

### What Users See:
```
Colors (8)
#ededed - 13%
#0a0a0a - 8%
#000000 - 7%
```

### What Users Think:
"Only 13% of the page uses this color? That seems low!"

### What It Actually Means:
"13% of all color declarations use this specific color value"

---

## The Math

### Example Site with 8 Colors:

**Raw Usage Counts**:
- #ededed: 147 declarations
- #0a0a0a: 98 declarations
- #000000: 82 declarations
- #eaeaea: 73 declarations
- #a1a1a1: 69 declarations
- #ffffff: 51 declarations
- #f5f5f5: 42 declarations
- #333333: 38 declarations

**Total**: 600 color declarations

**Percentage Calculation**:
- #ededed: 147 / 600 = 24.5% ✅ (This is more reasonable!)
- #0a0a0a: 98 / 600 = 16.3%
- #000000: 82 / 600 = 13.7%

---

## The Problem

Our current code in `token-curator.ts` line 124:
```typescript
token.percentage = Math.round((token.usage / totalUsage) * 100)
```

This is calculating: **"What % of this category is this token?"**

For a balanced palette with 8 colors:
- Perfect balance: each = 12.5%
- Realistic: top color = 15-25%, others = 8-15%

---

## Why It Looks Low

1. **We're filtering**: Only showing top 8 colors (line 130)
   - We're dividing by TOTAL of top 8 only
   - If we extracted 50 colors total, we're missing 42 colors' usage!

2. **We're comparing within category**:
   - Usage % relative to other colors only
   - Not relative to total CSS declarations

---

## The Fix

### Option A: Show Absolute Usage Count (Recommended)
```typescript
// Instead of showing percentage
<div>{token.usage} uses</div>

// Display:
#ededed - 147 uses
#0a0a0a - 98 uses
#000000 - 82 uses
```

**Why better**: Clear, accurate, no confusion.

### Option B: Calculate vs ALL Extracted Colors
```typescript
// Before filtering to top N, calculate total
const allColorsUsage = Array.from(colorMap.values())
  .reduce((sum, stats) => sum + stats.usage, 0)

// Then calculate percentage
token.percentage = Math.round((token.usage / allColorsUsage) * 100)
```

**Result**: Higher percentages that feel more accurate.

### Option C: Add Context with Visual Indicator
```typescript
// Show both usage count AND relative bar
<div className="flex items-center gap-2">
  <span>{token.usage} uses</span>
  <div className="flex-1 h-1 bg-grep-2 rounded-full">
    <div
      className="h-full bg-blue-500 rounded-full"
      style={{ width: `${(token.usage / maxUsage) * 100}%` }}
    />
  </div>
  <span className="text-xs text-grep-9">{token.percentage}%</span>
</div>
```

**Why better**: Visual shows relative importance, numbers show absolute.

---

## Recommended Change

**Current Display**:
```
#ededed
13% usage
```

**Proposed Display**:
```
#ededed
147 uses (13% of colors)
```

Or even better:
```
#ededed
147 declarations
████████░░ 13%
```

This shows:
1. Absolute count (147)
2. What it means (declarations/uses)
3. Relative within category (13%)
4. Visual bar for quick comparison

---

## Implementation

```typescript
// In FontPreviewCard, ColorCard, etc.:
<div className="flex items-center justify-between">
  <div className="flex items-center gap-2">
    <span className="text-xs text-grep-9">{token.usage} uses</span>
    <div className="w-12 h-1 bg-grep-2 rounded-full">
      <div
        className="h-full bg-blue-500 rounded-full transition-all"
        style={{ width: `${Math.min(100, (token.usage / maxUsageInCategory) * 100)}%` }}
      />
    </div>
  </div>
  <span className="text-[10px] text-grep-9">{token.percentage}%</span>
</div>
```

---

## Real Data Check

If you're seeing:
- Top color: 13% usage (~147 declarations)
- Second color: 8% usage (~98 declarations)

**This is actually NORMAL for a well-designed site!**

A site with 8 balanced colors would have:
- Each color: ~12.5% of color declarations
- Top color: 15-20% (primary color)
- Others: 8-15% (secondary, accents, neutrals)

The percentages ARE correct - they just need better context!