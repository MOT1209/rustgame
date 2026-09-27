"""Pretty-print scripts/bench.sh JSONL output as a markdown table."""
import sys, json
rows = []
for line in sys.stdin:
    line = line.strip()
    if not line:
        continue
    d = json.loads(line)
    if isinstance(d, str):
        d = json.loads(d)
    rows.append(d)
cols = [('scenario', 'Scenario'), ('fps', 'FPS'), ('frameMs', 'Frame ms'), ('low1Fps', '1% low'),
        ('cpuMs', 'CPU ms'), ('cpuP95Ms', 'CPU p95'), ('drawCalls', 'Draw calls'), ('triangles', 'Tris'),
        ('objects', 'Objects'), ('visible', 'Visible'), ('geometries', 'Geometries'), ('programs', 'Programs'),
        ('heapMB', 'Heap MB'), ('firstFrameMs', 'Setup stall ms')]
print('| ' + ' | '.join(c[1] for c in cols) + ' |')
print('|' + '---|' * len(cols))
for d in rows:
    print('| ' + ' | '.join(str(d.get(k, '')) for k, _ in cols) + ' |')
