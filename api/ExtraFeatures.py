def get_tod(body_temp, ambient_temp, discov_h, discov_m):
    if ambient_temp < 15:
        rate = 1.1
    elif ambient_temp > 27:
        rate = 0.5
    else:
        rate = 0.83

    time_passed = (36.9 - body_temp) / rate
    death_time = discov_h + discov_m / 60 - time_passed

    day = 0
    while death_time < 0:
        death_time += 24
        day += 1

    hours = int(death_time)
    minutes = round((death_time - hours) * 60)

    if minutes == 60:
        hours += 1
        minutes = 0
    if hours >= 24:        # ← add this: handle overflow after rounding
        hours -= 24
        day -= 1

    return hours, minutes, day