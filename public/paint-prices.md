# EPP Paint Price List

Last updated: 2026-06-13

## Paints

| id | name | unit | price | tier | usage |
|----|------|------|-------|------|-------|
| sp-int | SW SuperPaint Interior | gal | 40 | Standard | int |
| sp-ext | SW SuperPaint Exterior | gal | 45 | Standard | ext |
| dur-int | SW Duration Interior | gal | 50 | Gold | int |
| dur-ext | SW Duration Exterior | gal | 55 | Gold | ext |
| em-int | SW Emerald Interior | gal | 60 | Platinum | int |
| em-ext | SW Emerald Exterior | gal | 65 | Platinum | ext |
| em-ute | SW Emerald Urethane Trim Enamel | gal | 65 | | |
| pm400 | SW ProMar 400 | gal | 25 | | |
| sw-gal | SW Gallery | gal | 120 | | |
| ppg-sh | PPG SpeedHide | gal | 19 | | |
| ppg-mh | PPG Manor Hall | gal | 25 | | |
| xbond | Extreme Bond Primer | gal | 45 | | |
| ren-pr | Renner Primer | gal | 75 | | |
| ren-tc | Renner Topcoat | gal | 110 | | |

## Package Defaults

| package | interior | exterior |
|---------|----------|----------|
| Standard | sp-int | sp-ext |
| Gold | dur-int | dur-ext |
| Platinum | em-int | em-ext |

## How to update

1. Edit this file (change prices, add/remove rows)
2. Keep the table format - the app parses the `|` delimited rows
3. The `id` column is the key - don't change existing IDs unless you update the app
4. `tier` and `usage` columns are optional - only needed for package auto-select
5. Redeploy: run `vercel --prod` from the project folder, or ask Claude to deploy
