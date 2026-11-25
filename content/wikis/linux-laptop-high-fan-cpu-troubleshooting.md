# Linux Laptop — High Fan / CPU Troubleshooting

Quick checklist for when the laptop fan suddenly gets loud.

## 1. Check temperatures

```bash
sensors
```

Pay attention to:

```text
Package id 0
Core 0
Core 1
...
```

Rough guide:

| Temperature | Meaning |
| --- | --- |
| 40–60°C | Normal / light load |
| 60–80°C | Moderate load |
| 80–90°C | High load |
| 90–100°C | Very high — investigate |
| 100°C | Thermal limit |

---

## 2. Find processes using the most CPU

```bash
ps -eo pid,ppid,comm,%cpu,%mem --sort=-%cpu | head -20
```

Example:

```text
PID    PPID COMMAND         %CPU %MEM
7528   6786 chrome          33.0  2.2
11922  6786 chrome          16.0  1.6
2984   2911 cosmic-comp      9.9  1.1
```

The first few processes are usually the ones worth investigating.

## 3. Monitor CPU interactively

```bash
htop
```

If unavailable:

```bash
sudo apt install htop
```

Inside `htop`:

- `F6` → sort column
- Select `PERCENT_CPU`
- `F5` → tree view
- `F9` → kill selected process
- `F10` → quit

Or use:

```bash
top
```

Press `P` to sort by CPU.

## 4. Investigate a suspicious PID

Replace `<PID>` with the process ID.

```bash
ps -fp <PID>
```

Example:

```bash
ps -fp 7528
```

See the complete command used to start it:

```bash
cat /proc/<PID>/cmdline | tr '\0' ' '
```

Example:

```bash
cat /proc/7528/cmdline | tr '\0' ' '
```

## 5. If Chrome is responsible

Chrome runs tabs, extensions and other components as separate processes.

Open the **Chrome Task Manager** with `Shift + Esc` and sort by **CPU**.

Look for:

- Tabs consuming CPU
- Extensions
- Service Workers
- GPU Process
- Renderer processes

Close the problematic tab or process. Then wait about 30 seconds and check temperatures again:

```bash
sensors
```

## 6. Quick CPU + temperature diagnosis

Run these two commands:

```bash
ps -eo pid,ppid,comm,%cpu,%mem --sort=-%cpu | head -20
```

```bash
sensors
```

Usually these are enough to identify why the fan is running.

## 7. Watch temperatures continuously

```bash
watch -n 2 sensors
```

This refreshes temperatures every 2 seconds. Exit with `Ctrl+C`.

## 8. Check overall system load

```bash
uptime
```

Example:

```text
load average: 0.82, 1.10, 1.32
```

For a 6-core / 12-thread CPU, occasional load is normal. Sustained high load when the machine should be idle deserves investigation.

## Quick Routine

When the fan suddenly gets loud, check temperatures:

```bash
sensors
```

Then list the busiest processes:

```bash
ps -eo pid,ppid,comm,%cpu,%mem --sort=-%cpu | head -20
```

If Chrome is at the top, open its Task Manager with `Shift + Esc`, find the tab, and close it. Wait 30 seconds, then check temperatures again:

```bash
sensors
```

If CPU usage has dropped but temperatures remain unusually high, investigate cooling, dust, thermal paste, power profile, or fan behavior.