def format_duration_ms(ms: int | float) -> str:
    ms = int(ms)
    if ms < 0:
        ms = 0
    total_sec, _ = divmod(ms, 1000)
    m, s = divmod(total_sec, 60)
    h, m = divmod(m, 60)
    if h:
        return f"{h:d}:{m:02d}:{s:02d}"
    return f"{m:d}:{s:02d}"
